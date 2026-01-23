/**
 * Canvas Utilities
 *
 * Re-exports all canvas-related utilities.
 */

export {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BOUNDARY_PADDING,
  MIN_X,
  MIN_Y,
  MAX_X,
  MAX_Y,
  clampToBoundary,
  isWithinBoundary,
  isElementWithinBoundary,
} from "./boundary";

export {
  findWallAtPoint,
  calculateHostedElementPosition,
  getWallEndpoints,
  findWallsToJoin,
} from "./wallDetection";
