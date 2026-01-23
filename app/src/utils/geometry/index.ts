/**
 * Geometry Utilities
 *
 * Re-exports all geometry-related utilities.
 */

export {
  parseThickness,
  parseHeight,
  parseRoofType,
  parseRoofSlope,
  type RoofType,
} from "./parsers";

export {
  createFlatRoofGeometry,
  createGableRoofGeometry,
  createHipRoofGeometry,
  createRoofGeometry,
} from "./roofBuilder";

export {
  findWallJoints,
  getWallsBoundingBox,
  type WallJoint,
} from "./wallUtils";
