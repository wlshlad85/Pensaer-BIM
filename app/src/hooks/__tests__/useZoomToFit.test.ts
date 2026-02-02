/**
 * Tests for useZoomToFit — bounding box computation and camera framing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import {
  computeBoundingBox,
  frameBoundingBox,
  dispatchZoomToFit,
} from "../useZoomToFit";
import type { Element } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeElement(overrides: Partial<Element> = {}): Element {
  return {
    id: "el-1",
    type: "wall",
    name: "Wall 1",
    x: 100,
    y: 50,
    width: 400,
    height: 20,
    rotation: 0,
    zIndex: 0,
    level: "level-0",
    properties: {},
    relationships: {},
    ...overrides,
  } as Element;
}

// Minimal OrbitControls stand-in
function makeControls() {
  return {
    target: new THREE.Vector3(),
    update: vi.fn(),
  } as unknown as import("three/addons/controls/OrbitControls.js").OrbitControls;
}

// ---------------------------------------------------------------------------
// computeBoundingBox
// ---------------------------------------------------------------------------

describe("computeBoundingBox", () => {
  it("returns null for an empty element list", () => {
    expect(computeBoundingBox([])).toBeNull();
  });

  it("computes correct min/max for a single wall", () => {
    const wall = makeElement({ x: 100, y: 50, width: 400, height: 20 });
    const box = computeBoundingBox([wall])!;

    // x0 = 100*0.01 + (-3) = -2,  x1 = x0 + 400*0.01 = 2
    expect(box.min.x).toBeCloseTo(-2);
    expect(box.max.x).toBeCloseTo(2);

    // z0 = 50*0.01 + (-2.5) = -2,  z1 = z0 + 20*0.01 = -1.8
    expect(box.min.z).toBeCloseTo(-2);
    expect(box.max.z).toBeCloseTo(-1.8);

    // wall → wallHeight = 3
    expect(box.min.y).toBe(0);
    expect(box.max.y).toBe(3);
  });

  it("expands to cover multiple elements", () => {
    const elements = [
      makeElement({ x: 0, y: 0, width: 100, height: 100 }),
      makeElement({ x: 500, y: 500, width: 100, height: 100, type: "room" }),
    ];
    const box = computeBoundingBox(elements)!;

    // Rightmost point: (500+100)*0.01 + (-3) = 3
    expect(box.max.x).toBeCloseTo(3);
    // Leftmost: 0*0.01 + (-3) = -3
    expect(box.min.x).toBeCloseTo(-3);
  });

  it("accounts for roof height above wallHeight", () => {
    const elements = [
      makeElement({ type: "roof", x: 0, y: 0, width: 400, height: 400 }),
    ];
    const box = computeBoundingBox(elements)!;
    // roof → wallHeight + wallHeight*0.6 = 3 + 1.8 = 4.8
    expect(box.max.y).toBeCloseTo(4.8);
  });
});

// ---------------------------------------------------------------------------
// frameBoundingBox
// ---------------------------------------------------------------------------

describe("frameBoundingBox", () => {
  it("moves the camera to frame the box and updates controls target", () => {
    const box = new THREE.Box3(
      new THREE.Vector3(-5, 0, -5),
      new THREE.Vector3(5, 3, 5),
    );
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const controls = makeControls();

    frameBoundingBox(box, camera, controls);

    // Camera should not be at origin
    expect(camera.position.length()).toBeGreaterThan(5);

    // Controls target should be at centre of box
    const center = new THREE.Vector3();
    box.getCenter(center);
    expect(controls.target.x).toBeCloseTo(center.x);
    expect(controls.target.y).toBeCloseTo(center.y);
    expect(controls.target.z).toBeCloseTo(center.z);

    expect(controls.update).toHaveBeenCalled();
  });

  it("respects custom padding", () => {
    const box = new THREE.Box3(
      new THREE.Vector3(-1, 0, -1),
      new THREE.Vector3(1, 1, 1),
    );
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

    const controls1 = makeControls();
    frameBoundingBox(box, camera, controls1, { padding: 1.0 });
    const dist1 = camera.position.length();

    camera.position.set(0, 0, 0); // reset
    const controls2 = makeControls();
    frameBoundingBox(box, camera, controls2, { padding: 2.0 });
    const dist2 = camera.position.length();

    expect(dist2).toBeGreaterThan(dist1);
  });
});

// ---------------------------------------------------------------------------
// dispatchZoomToFit (custom event)
// ---------------------------------------------------------------------------

describe("dispatchZoomToFit", () => {
  it("dispatches a pensaer:zoom-to-fit CustomEvent on window", () => {
    // Provide a minimal window/CustomEvent polyfill for Node environment
    const listeners: Array<() => void> = [];
    const origWindow = globalThis.window;
    const origCustomEvent = globalThis.CustomEvent;

    // @ts-expect-error - test polyfill
    globalThis.window = {
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: vi.fn(),
      dispatchEvent: () => { listeners.forEach((fn) => fn()); },
    };
    // @ts-expect-error - test polyfill
    globalThis.CustomEvent = class { constructor(public type: string) {} };

    const handler = vi.fn();
    window.addEventListener("pensaer:zoom-to-fit", handler);
    dispatchZoomToFit();
    expect(handler).toHaveBeenCalledTimes(1);

    // Restore
    globalThis.window = origWindow;
    globalThis.CustomEvent = origCustomEvent;
  });
});
