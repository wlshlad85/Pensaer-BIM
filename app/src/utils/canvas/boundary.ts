/**
 * Canvas Boundary Utilities
 *
 * Functions for managing element placement within canvas bounds.
 */

// Canvas dimensions
export const CANVAS_WIDTH = 2000;
export const CANVAS_HEIGHT = 1500;

// Building boundary with padding
export const BOUNDARY_PADDING = 50;
export const MIN_X = BOUNDARY_PADDING;
export const MIN_Y = BOUNDARY_PADDING;
export const MAX_X = CANVAS_WIDTH - BOUNDARY_PADDING;
export const MAX_Y = CANVAS_HEIGHT - BOUNDARY_PADDING;

/**
 * Clamp a point to stay within the building boundary.
 */
export function clampToBoundary(point: { x: number; y: number }): {
  x: number;
  y: number;
} {
  return {
    x: Math.max(MIN_X, Math.min(MAX_X, point.x)),
    y: Math.max(MIN_Y, Math.min(MAX_Y, point.y)),
  };
}

/**
 * Check if a point is within the building boundary.
 */
export function isWithinBoundary(point: { x: number; y: number }): boolean {
  return (
    point.x >= MIN_X &&
    point.x <= MAX_X &&
    point.y >= MIN_Y &&
    point.y <= MAX_Y
  );
}

/**
 * Check if an element rectangle is fully within the building boundary.
 */
export function isElementWithinBoundary(
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  return (
    x >= MIN_X && y >= MIN_Y && x + width <= MAX_X && y + height <= MAX_Y
  );
}
