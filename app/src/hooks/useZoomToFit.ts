/**
 * useZoomToFit — Compute bounding box of all model elements and
 * reposition the camera + OrbitControls to frame them.
 *
 * Keyboard shortcut: F (like Blender)
 * Also exported as a standalone utility for programmatic use (e.g. DemoRunner).
 */

import { useCallback, useEffect } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Element } from "../types";

// ============================================
// PURE UTILITY (testable without React)
// ============================================

/**
 * Compute an axis-aligned bounding box that encloses every element.
 * Coordinates use the same conventions as Canvas3D:
 *   scale = 0.01, offsetX = -3, offsetZ = -2.5, wallHeight = 3
 * Returns null when the element list is empty.
 */
export function computeBoundingBox(
  elements: Element[],
  { scale = 0.01, offsetX = -3, offsetZ = -2.5, wallHeight = 3 } = {},
): THREE.Box3 | null {
  if (elements.length === 0) return null;

  const box = new THREE.Box3(
    new THREE.Vector3(Infinity, Infinity, Infinity),
    new THREE.Vector3(-Infinity, -Infinity, -Infinity),
  );

  for (const el of elements) {
    const x0 = el.x * scale + offsetX;
    const z0 = el.y * scale + offsetZ;
    const w = el.width * scale;
    const d = el.height * scale;

    // Bottom-left corner
    box.min.x = Math.min(box.min.x, x0);
    box.min.z = Math.min(box.min.z, z0);
    box.min.y = Math.min(box.min.y, 0);

    // Top-right corner
    box.max.x = Math.max(box.max.x, x0 + w);
    box.max.z = Math.max(box.max.z, z0 + d);

    // Height depends on type
    if (el.type === "wall") {
      box.max.y = Math.max(box.max.y, wallHeight);
    } else if (el.type === "roof") {
      // Roof peak can be above wallHeight
      box.max.y = Math.max(box.max.y, wallHeight + wallHeight * 0.6);
    } else {
      box.max.y = Math.max(box.max.y, wallHeight);
    }
  }

  return box;
}

/**
 * Position a perspective camera to frame a bounding box with padding.
 * Mutates camera and controls in-place.
 */
export function frameBoundingBox(
  box: THREE.Box3,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  { padding = 1.3 } = {},
): void {
  const center = new THREE.Vector3();
  box.getCenter(center);

  const size = new THREE.Vector3();
  box.getSize(size);

  // Sphere radius that encloses the whole box
  const radius = size.length() / 2;

  // Distance so the sphere fits within the camera frustum
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const dist = (radius * padding) / Math.sin(fovRad / 2);

  // Place camera at a 45° / 30° viewing angle (isometric-ish)
  const direction = new THREE.Vector3(1, 0.75, 1).normalize();
  camera.position.copy(center).addScaledVector(direction, dist);

  // Point controls at the centre of the bounding box
  controls.target.copy(center);
  controls.update();
}

// ============================================
// CUSTOM EVENT (cross-component signalling)
// ============================================

/** Fire this to request a zoom-to-fit from anywhere (e.g. DemoRunner). */
export function dispatchZoomToFit(): void {
  window.dispatchEvent(new CustomEvent("pensaer:zoom-to-fit"));
}

// ============================================
// REACT HOOK
// ============================================

export interface UseZoomToFitOptions {
  camera: THREE.PerspectiveCamera | null;
  controls: OrbitControls | null;
  elements: Element[];
}

/**
 * Hook that returns a `zoomToFit` callback and binds the F keyboard shortcut
 * + listens for the `pensaer:zoom-to-fit` custom event.
 */
export function useZoomToFit({ camera, controls, elements }: UseZoomToFitOptions) {
  const zoomToFit = useCallback(() => {
    if (!camera || !controls) return;
    const box = computeBoundingBox(elements);
    if (!box) return;
    frameBoundingBox(box, camera, controls);
  }, [camera, controls, elements]);

  // Keyboard shortcut: F
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input / textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        zoomToFit();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [zoomToFit]);

  // Listen for programmatic event (from DemoRunner etc.)
  useEffect(() => {
    const handler = () => zoomToFit();
    window.addEventListener("pensaer:zoom-to-fit", handler);
    return () => window.removeEventListener("pensaer:zoom-to-fit", handler);
  }, [zoomToFit]);

  return zoomToFit;
}
