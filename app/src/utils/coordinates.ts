/**
 * Pensaer BIM Platform - Coordinate Transform Utilities
 *
 * Functions for converting between screen coordinates and model coordinates.
 * Essential for accurate picking and element placement in 2D/3D views.
 */

import type { Point } from "./geometry";

// ============================================
// TYPES
// ============================================

/**
 * Viewport configuration for coordinate transforms
 */
export interface Viewport2D {
  /** Current zoom level (1.0 = 100%) */
  zoom: number;
  /** Pan offset in screen coordinates */
  panX: number;
  panY: number;
  /** Viewport dimensions */
  width: number;
  height: number;
}

/**
 * 3D viewport configuration
 */
export interface Viewport3D {
  /** Camera position */
  cameraPosition: { x: number; y: number; z: number };
  /** Camera target/look-at point */
  cameraTarget: { x: number; y: number; z: number };
  /** Field of view in degrees */
  fov: number;
  /** Viewport dimensions */
  width: number;
  height: number;
  /** Near/far clipping planes */
  near: number;
  far: number;
}

/**
 * 3D point
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// ============================================
// 2D TRANSFORMS
// ============================================

/**
 * Convert screen coordinates to model coordinates (2D)
 *
 * @param screenPoint - Point in screen/pixel coordinates
 * @param viewport - Current viewport configuration
 * @returns Point in model coordinates (mm)
 */
export function screenToModel(screenPoint: Point, viewport: Viewport2D): Point {
  // Calculate center of viewport
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;

  // Transform: offset from center, account for pan, then scale by zoom
  return {
    x: (screenPoint.x - centerX - viewport.panX) / viewport.zoom,
    y: (screenPoint.y - centerY - viewport.panY) / viewport.zoom,
  };
}

/**
 * Convert model coordinates to screen coordinates (2D)
 *
 * @param modelPoint - Point in model coordinates (mm)
 * @param viewport - Current viewport configuration
 * @returns Point in screen/pixel coordinates
 */
export function modelToScreen(modelPoint: Point, viewport: Viewport2D): Point {
  // Calculate center of viewport
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;

  // Transform: scale by zoom, add pan, offset to center
  return {
    x: modelPoint.x * viewport.zoom + viewport.panX + centerX,
    y: modelPoint.y * viewport.zoom + viewport.panY + centerY,
  };
}

/**
 * Convert a distance in screen pixels to model units
 *
 * @param screenDistance - Distance in pixels
 * @param zoom - Current zoom level
 * @returns Distance in model units (mm)
 */
export function screenDistanceToModel(
  screenDistance: number,
  zoom: number
): number {
  return screenDistance / zoom;
}

/**
 * Convert a distance in model units to screen pixels
 *
 * @param modelDistance - Distance in model units (mm)
 * @param zoom - Current zoom level
 * @returns Distance in pixels
 */
export function modelDistanceToScreen(
  modelDistance: number,
  zoom: number
): number {
  return modelDistance * zoom;
}

/**
 * Get the visible model bounds for the current viewport
 *
 * @param viewport - Current viewport configuration
 * @returns Bounds in model coordinates
 */
export function getVisibleBounds(viewport: Viewport2D): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  const topLeft = screenToModel({ x: 0, y: 0 }, viewport);
  const bottomRight = screenToModel(
    { x: viewport.width, y: viewport.height },
    viewport
  );

  return {
    minX: topLeft.x,
    minY: topLeft.y,
    maxX: bottomRight.x,
    maxY: bottomRight.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

/**
 * Check if a model point is within the visible viewport
 *
 * @param modelPoint - Point in model coordinates
 * @param viewport - Current viewport configuration
 * @param margin - Optional margin in model units
 * @returns True if point is visible
 */
export function isPointVisible(
  modelPoint: Point,
  viewport: Viewport2D,
  margin = 0
): boolean {
  const bounds = getVisibleBounds(viewport);
  return (
    modelPoint.x >= bounds.minX - margin &&
    modelPoint.x <= bounds.maxX + margin &&
    modelPoint.y >= bounds.minY - margin &&
    modelPoint.y <= bounds.maxY + margin
  );
}

// ============================================
// 3D TRANSFORMS (simplified)
// ============================================

/**
 * Project a 3D point to 2D screen coordinates (simplified perspective projection)
 *
 * @param point3D - Point in 3D model space
 * @param viewport - 3D viewport configuration
 * @returns Point in screen coordinates, or null if behind camera
 */
export function project3DToScreen(
  point3D: Point3D,
  viewport: Viewport3D
): Point | null {
  // Calculate view direction
  const dx = point3D.x - viewport.cameraPosition.x;
  const dy = point3D.y - viewport.cameraPosition.y;
  const dz = point3D.z - viewport.cameraPosition.z;

  // Simple perspective: project onto view plane
  // Note: This is a simplified projection; real 3D uses full matrix transforms
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (distance < viewport.near || distance > viewport.far) {
    return null; // Outside clipping planes
  }

  // Basic perspective division
  const fovRad = (viewport.fov * Math.PI) / 180;
  const scale = viewport.height / (2 * Math.tan(fovRad / 2) * distance);

  return {
    x: viewport.width / 2 + dx * scale,
    y: viewport.height / 2 - dz * scale, // Flip Y for screen coords
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Clamp a point to viewport bounds
 *
 * @param screenPoint - Point in screen coordinates
 * @param viewport - Viewport dimensions
 * @returns Clamped point
 */
export function clampToViewport(
  screenPoint: Point,
  viewport: { width: number; height: number }
): Point {
  return {
    x: Math.max(0, Math.min(screenPoint.x, viewport.width)),
    y: Math.max(0, Math.min(screenPoint.y, viewport.height)),
  };
}

/**
 * Get mouse position relative to an element
 *
 * @param event - Mouse event
 * @param element - Target element (e.g., canvas)
 * @returns Point in element-relative coordinates
 */
export function getRelativeMousePosition(
  event: MouseEvent,
  element: HTMLElement
): Point {
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

/**
 * Calculate zoom level to fit bounds within viewport
 *
 * @param bounds - Model bounds to fit
 * @param viewport - Viewport dimensions
 * @param padding - Padding in pixels
 * @returns Zoom level to fit bounds
 */
export function calculateZoomToFit(
  bounds: { width: number; height: number },
  viewport: { width: number; height: number },
  padding = 50
): number {
  const availableWidth = viewport.width - padding * 2;
  const availableHeight = viewport.height - padding * 2;

  const scaleX = availableWidth / bounds.width;
  const scaleY = availableHeight / bounds.height;

  return Math.min(scaleX, scaleY, 10); // Cap at 10x zoom
}

/**
 * Round coordinates to snap grid
 *
 * @param point - Point to snap
 * @param gridSize - Grid cell size in model units
 * @returns Snapped point
 */
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}
