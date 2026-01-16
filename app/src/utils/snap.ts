/**
 * Pensaer BIM Platform - Snap System
 *
 * Provides snapping functionality for precise element placement.
 */

import type { Element } from "../types";
import {
  distance,
  getWallEndpoints,
  type Point,
  type Bounds,
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
  | "intersection";

export interface SnapOptions {
  gridSize: number;
  tolerance: number;
  enableGrid: boolean;
  enableEndpoint: boolean;
  enableMidpoint: boolean;
  enableCenter: boolean;
  enableEdge: boolean;
}

const DEFAULT_OPTIONS: SnapOptions = {
  gridSize: 50,
  tolerance: 10,
  enableGrid: true,
  enableEndpoint: true,
  enableMidpoint: true,
  enableCenter: true,
  enableEdge: true,
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
    // Skip rooms (virtual elements)
    if (element.type === "room") continue;

    // Endpoint snap
    if (opts.enableEndpoint) {
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

    // Center snap
    if (opts.enableCenter) {
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

    // Midpoint snap (for walls)
    if (opts.enableMidpoint && element.type === "wall") {
      const midpoints = getWallMidpoints(element);
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

function getWallMidpoints(element: Element): Point[] {
  const { x, y, width, height } = element;
  const { start, end } = getWallEndpoints(x, y, width, height);

  // Midpoint of the wall line
  return [
    {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    },
  ];
}

// ============================================
// SNAP INDICATOR
// ============================================

export function getSnapIndicatorStyle(snapType: SnapType): {
  color: string;
  size: number;
  shape: "circle" | "square" | "diamond";
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
    default:
      return { color: "#6b7280", size: 6, shape: "circle" };
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
