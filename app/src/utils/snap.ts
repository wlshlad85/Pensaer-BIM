/**
 * Pensaer BIM Platform - Snap System
 *
 * Provides snapping functionality for precise element placement.
 */

import type { Element } from "../types";
import {
  distance,
  getWallEndpoints,
  lineAngle,
  type Point,
  type Bounds,
  type Line,
} from "./geometry";

export interface SnapResult {
  point: Point;
  snapped: boolean;
  snapType: SnapType | null;
  snapTargetId: string | null;
}

export type SnapType =
  | "grid"
  | "endpoint"
  | "midpoint"
  | "center"
  | "edge"
  | "intersection"
  | "perpendicular";

export interface SnapOptions {
  gridSize: number;
  tolerance: number;
  enableGrid: boolean;
  enableEndpoint: boolean;
  enableMidpoint: boolean;
  enableCenter: boolean;
  enableEdge: boolean;
  enablePerpendicular: boolean;
  /** Reference point for perpendicular snapping (the drawing start point) */
  perpendicularReference?: Point;
  /** Angle tolerance in degrees for perpendicular detection (default: 5) */
  perpendicularTolerance?: number;
}

/** Result of a perpendicular snap including guide line information */
export interface PerpendicularSnapResult extends SnapResult {
  /** Guide line for visual feedback (from reference to snap point along perpendicular) */
  guideLine?: { start: Point; end: Point };
  /** The wall direction angle in radians */
  wallAngle?: number;
}

const DEFAULT_OPTIONS: SnapOptions = {
  gridSize: 50,
  tolerance: 10,
  enableGrid: true,
  enableEndpoint: true,
  enableMidpoint: true,
  enableCenter: true,
  enableEdge: true,
  enablePerpendicular: false,
  perpendicularTolerance: 5,
};

// ============================================
// MAIN SNAP FUNCTION
// ============================================

export function snapPoint(
  point: Point,
  elements: Element[],
  options: Partial<SnapOptions> = {},
): SnapResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let bestSnap: SnapResult = {
    point,
    snapped: false,
    snapType: null,
    snapTargetId: null,
  };
  let bestDistance = opts.tolerance;

  // Try element snaps first (they take priority over grid)
  for (const element of elements) {
    // Rooms only support midpoint snapping (for boundary edges)
    const isRoom = element.type === "room";

    // Endpoint snap (not for rooms - they use boundary midpoints instead)
    if (opts.enableEndpoint && !isRoom) {
      const endpoints = getElementEndpoints(element);
      for (const endpoint of endpoints) {
        const d = distance(point, endpoint);
        if (d < bestDistance) {
          bestDistance = d;
          bestSnap = {
            point: endpoint,
            snapped: true,
            snapType: "endpoint",
            snapTargetId: element.id,
          };
        }
      }
    }

    // Midpoint snap (for walls and other elements) - checked before center for specificity
    if (opts.enableMidpoint) {
      const midpoints = getElementMidpoints(element);
      for (const midpoint of midpoints) {
        const d = distance(point, midpoint);
        if (d < bestDistance) {
          bestDistance = d;
          bestSnap = {
            point: midpoint,
            snapped: true,
            snapType: "midpoint",
            snapTargetId: element.id,
          };
        }
      }
    }

    // Center snap (not for rooms)
    if (opts.enableCenter && !isRoom) {
      const center = getElementCenter(element);
      const d = distance(point, center);
      if (d < bestDistance) {
        bestDistance = d;
        bestSnap = {
          point: center,
          snapped: true,
          snapType: "center",
          snapTargetId: element.id,
        };
      }
    }
  }

  // If no element snap found, try grid snap
  if (!bestSnap.snapped && opts.enableGrid) {
    const gridSnap = snapToGrid(point, opts.gridSize);
    const d = distance(point, gridSnap);
    if (d < opts.tolerance) {
      bestSnap = {
        point: gridSnap,
        snapped: true,
        snapType: "grid",
        snapTargetId: null,
      };
    }
  }

  return bestSnap;
}

// ============================================
// GRID SNAP
// ============================================

export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

// ============================================
// ELEMENT SNAP HELPERS
// ============================================

function getElementEndpoints(element: Element): Point[] {
  const { x, y, width, height } = element;

  if (element.type === "wall") {
    const { start, end } = getWallEndpoints(x, y, width, height);
    return [start, end];
  }

  // For other elements, return corners
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

function getElementCenter(element: Element): Point {
  return {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
}

/**
 * Get midpoints of element edges for snapping.
 * - Walls: single midpoint along the wall line
 * - Rooms: midpoints of all four boundary edges
 * - Other elements: midpoints of all four edges
 */
function getElementMidpoints(element: Element): Point[] {
  const { x, y, width, height } = element;

  // For walls, return the midpoint of the wall line
  if (element.type === "wall") {
    const { start, end } = getWallEndpoints(x, y, width, height);
    return [
      {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
      },
    ];
  }

  // For rooms and other rectangular elements, return midpoints of all four edges
  // This includes floors, etc.
  return [
    // Top edge midpoint
    { x: x + width / 2, y },
    // Right edge midpoint
    { x: x + width, y: y + height / 2 },
    // Bottom edge midpoint
    { x: x + width / 2, y: y + height },
    // Left edge midpoint
    { x, y: y + height / 2 },
  ];
}

// ============================================
// SNAP INDICATOR
// ============================================

export function getSnapIndicatorStyle(snapType: SnapType): {
  color: string;
  size: number;
  shape: "circle" | "square" | "diamond" | "cross";
} {
  switch (snapType) {
    case "endpoint":
      return { color: "#22c55e", size: 8, shape: "square" };
    case "midpoint":
      return { color: "#3b82f6", size: 8, shape: "diamond" };
    case "center":
      return { color: "#a855f7", size: 8, shape: "circle" };
    case "grid":
      return { color: "#6b7280", size: 6, shape: "circle" };
    case "edge":
      return { color: "#f59e0b", size: 6, shape: "square" };
    case "intersection":
      return { color: "#ef4444", size: 10, shape: "circle" };
    case "perpendicular":
      return { color: "#06b6d4", size: 8, shape: "cross" };
    default:
      return { color: "#6b7280", size: 6, shape: "circle" };
  }
}

/**
 * Get human-readable label for a snap type.
 */
export function getSnapTypeLabel(snapType: SnapType): string {
  switch (snapType) {
    case "endpoint":
      return "Endpoint";
    case "midpoint":
      return "Midpoint";
    case "center":
      return "Center";
    case "grid":
      return "Grid";
    case "edge":
      return "Edge";
    case "intersection":
      return "Intersect";
    case "perpendicular":
      return "Perp";
    default:
      return "";
  }
}

// ============================================
// ALIGNMENT HELPERS
// ============================================

export function findAlignmentGuides(
  point: Point,
  elements: Element[],
  tolerance: number = 5,
): { horizontal: number | null; vertical: number | null } {
  let horizontal: number | null = null;
  let vertical: number | null = null;

  for (const element of elements) {
    if (element.type === "room") continue;

    const center = getElementCenter(element);
    const bounds: Bounds = {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };

    // Check horizontal alignment (same Y)
    if (Math.abs(point.y - center.y) < tolerance) {
      horizontal = center.y;
    }
    if (Math.abs(point.y - bounds.y) < tolerance) {
      horizontal = bounds.y;
    }
    if (Math.abs(point.y - (bounds.y + bounds.height)) < tolerance) {
      horizontal = bounds.y + bounds.height;
    }

    // Check vertical alignment (same X)
    if (Math.abs(point.x - center.x) < tolerance) {
      vertical = center.x;
    }
    if (Math.abs(point.x - bounds.x) < tolerance) {
      vertical = bounds.x;
    }
    if (Math.abs(point.x - (bounds.x + bounds.width)) < tolerance) {
      vertical = bounds.x + bounds.width;
    }
  }

  return { horizontal, vertical };
}

// ============================================
// PERPENDICULAR SNAP
// ============================================

/**
 * Get the direction vector of a wall element.
 */
function getWallDirection(element: Element): Point {
  const { x, y, width, height } = element;
  const { start, end } = getWallEndpoints(x, y, width, height);
  const len = distance(start, end);
  if (len === 0) return { x: 1, y: 0 };
  return {
    x: (end.x - start.x) / len,
    y: (end.y - start.y) / len,
  };
}

/**
 * Get perpendicular direction (90 degrees rotated).
 */
function getPerpendicular(direction: Point): Point {
  // Rotate 90 degrees counter-clockwise
  return { x: -direction.y, y: direction.x };
}

/**
 * Project a point onto a line defined by a point and direction.
 * Returns the projected point on the line.
 */
function projectPointOntoLine(
  point: Point,
  linePoint: Point,
  direction: Point,
): Point {
  // Vector from linePoint to point
  const v = { x: point.x - linePoint.x, y: point.y - linePoint.y };
  // Project v onto direction
  const dot = v.x * direction.x + v.y * direction.y;
  return {
    x: linePoint.x + direction.x * dot,
    y: linePoint.y + direction.y * dot,
  };
}

/**
 * Calculate the distance from a point to a line defined by point and direction.
 */
function distanceToLine(point: Point, linePoint: Point, direction: Point): number {
  const projected = projectPointOntoLine(point, linePoint, direction);
  return distance(point, projected);
}

/**
 * Find perpendicular snap points from a reference point to walls.
 * Returns snap candidates where the drawing direction would be perpendicular to a wall.
 */
export function findPerpendicularSnaps(
  point: Point,
  referencePoint: Point,
  elements: Element[],
  tolerance: number = 10,
  angleTolerance: number = 5,
): PerpendicularSnapResult[] {
  const results: PerpendicularSnapResult[] = [];
  const walls = elements.filter((el) => el.type === "wall");
  const angleToleranceRad = (angleTolerance * Math.PI) / 180;

  for (const wall of walls) {
    const { x, y, width, height } = wall;
    const { start, end } = getWallEndpoints(x, y, width, height);

    // Get wall direction and perpendicular direction
    const wallDir = getWallDirection(wall);
    const perpDir = getPerpendicular(wallDir);
    const wallAngle = lineAngle({ start, end } as Line);

    // Calculate the direction from reference to current point
    const drawDir = {
      x: point.x - referencePoint.x,
      y: point.y - referencePoint.y,
    };
    const drawLen = Math.sqrt(drawDir.x * drawDir.x + drawDir.y * drawDir.y);

    if (drawLen < 1) continue; // Too close to reference point

    // Normalize draw direction
    const drawDirNorm = {
      x: drawDir.x / drawLen,
      y: drawDir.y / drawLen,
    };

    // Check if draw direction is close to perpendicular to wall
    // Dot product with wall direction should be close to 0 for perpendicular
    const dotWithWall = Math.abs(
      drawDirNorm.x * wallDir.x + drawDirNorm.y * wallDir.y,
    );

    // Also check if it's aligned with the perpendicular direction
    const dotWithPerp = Math.abs(
      drawDirNorm.x * perpDir.x + drawDirNorm.y * perpDir.y,
    );

    // We want dot with wall to be ~0 (perpendicular) or dot with perp to be ~1 (aligned)
    // Using angle tolerance: dot product = cos(angle), so for small angles cos(angle) ≈ 1
    const isPerpendicular = dotWithWall < Math.sin(angleToleranceRad) ||
      dotWithPerp > Math.cos(angleToleranceRad);

    if (!isPerpendicular) continue;

    // Project the point onto the perpendicular line from reference
    // Find the closest point that's along the perpendicular direction from reference
    const projectedOnPerp = projectPointOntoLine(point, referencePoint, perpDir);

    // Also try the opposite perpendicular direction
    const oppPerpDir = { x: -perpDir.x, y: -perpDir.y };
    const projectedOnOppPerp = projectPointOntoLine(point, referencePoint, oppPerpDir);

    // Use the projection that's closer to the cursor
    const distToPerp = distance(point, projectedOnPerp);
    const distToOppPerp = distance(point, projectedOnOppPerp);
    const snappedPoint = distToPerp < distToOppPerp ? projectedOnPerp : projectedOnOppPerp;
    const usedDir = distToPerp < distToOppPerp ? perpDir : oppPerpDir;
    const snapDist = Math.min(distToPerp, distToOppPerp);

    if (snapDist <= tolerance) {
      results.push({
        point: snappedPoint,
        snapped: true,
        snapType: "perpendicular",
        snapTargetId: wall.id,
        guideLine: {
          start: referencePoint,
          end: snappedPoint,
        },
        wallAngle,
      });
    }
  }

  // Sort by distance to current point (closest first)
  results.sort((a, b) => distance(point, a.point) - distance(point, b.point));

  return results;
}

/**
 * Extended snap function that includes perpendicular snapping.
 * Use this when drawing elements (walls) to get perpendicular snap support.
 */
export function snapPointWithPerpendicular(
  point: Point,
  elements: Element[],
  options: Partial<SnapOptions> = {},
): PerpendicularSnapResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // First try regular snapping
  const regularSnap = snapPoint(point, elements, opts);

  // If perpendicular snap is enabled and we have a reference point
  if (opts.enablePerpendicular && opts.perpendicularReference) {
    const perpSnaps = findPerpendicularSnaps(
      point,
      opts.perpendicularReference,
      elements,
      opts.tolerance,
      opts.perpendicularTolerance ?? 5,
    );

    if (perpSnaps.length > 0) {
      const bestPerpSnap = perpSnaps[0];
      const perpDist = distance(point, bestPerpSnap.point);
      const regularDist = regularSnap.snapped
        ? distance(point, regularSnap.point)
        : Infinity;

      // Perpendicular snap wins if it's closer
      if (perpDist < regularDist) {
        return bestPerpSnap;
      }
    }
  }

  return regularSnap;
}
