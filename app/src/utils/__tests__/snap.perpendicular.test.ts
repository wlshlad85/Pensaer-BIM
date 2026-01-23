/**
 * Tests for perpendicular snapping functionality
 */

import { describe, it, expect } from "vitest";
import {
  findPerpendicularSnaps,
  snapPointWithPerpendicular,
} from "../snap";
import type { Element } from "../../types";

// Helper to create a wall element
function createWall(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Element {
  return {
    id,
    type: "wall",
    name: `Wall-${id}`,
    x,
    y,
    width,
    height,
    properties: {},
    relationships: { hosts: [], joins: [] },
    issues: [],
    aiSuggestions: [],
  };
}

describe("findPerpendicularSnaps", () => {
  it("finds perpendicular snap to horizontal wall", () => {
    // Horizontal wall at y=100
    const walls = [createWall("wall-1", 0, 94, 200, 12)]; // 200 long, 12 thick

    // Reference point at wall endpoint
    const reference = { x: 0, y: 100 };

    // Point moving perpendicular (straight up or down from reference)
    const point = { x: 5, y: 200 }; // Slightly off perpendicular

    const results = findPerpendicularSnaps(point, reference, walls, 15, 10);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snapType).toBe("perpendicular");
    // Snapped point should be on perpendicular line (x should match reference)
    expect(Math.abs(results[0].point.x - reference.x)).toBeLessThan(1);
  });

  it("finds perpendicular snap to vertical wall", () => {
    // Vertical wall at x=100
    const walls = [createWall("wall-1", 94, 0, 12, 200)]; // 12 thick, 200 tall

    // Reference point at wall endpoint
    const reference = { x: 100, y: 0 };

    // Point moving perpendicular (left or right from reference)
    const point = { x: 200, y: 5 }; // Slightly off perpendicular

    const results = findPerpendicularSnaps(point, reference, walls, 15, 10);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snapType).toBe("perpendicular");
    // Snapped point should be on perpendicular line (y should match reference)
    expect(Math.abs(results[0].point.y - reference.y)).toBeLessThan(1);
  });

  it("returns empty when not near perpendicular angle", () => {
    // Horizontal wall
    const walls = [createWall("wall-1", 0, 94, 200, 12)];

    const reference = { x: 0, y: 100 };

    // Point at 45 degrees - not perpendicular
    const point = { x: 100, y: 200 };

    const results = findPerpendicularSnaps(point, reference, walls, 15, 5);

    // Should not snap at 45 degrees with 5 degree tolerance
    expect(results.length).toBe(0);
  });

  it("provides guide line in result", () => {
    const walls = [createWall("wall-1", 0, 94, 200, 12)];
    const reference = { x: 0, y: 100 };
    const point = { x: 3, y: 200 };

    const results = findPerpendicularSnaps(point, reference, walls, 15, 10);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].guideLine).toBeDefined();
    expect(results[0].guideLine?.start).toEqual(reference);
    expect(results[0].guideLine?.end).toBeDefined();
  });

  it("handles multiple walls and returns sorted by distance", () => {
    const walls = [
      createWall("wall-1", 0, 94, 200, 12), // Horizontal at y=100
      createWall("wall-2", 94, 0, 12, 200), // Vertical at x=100
    ];

    const reference = { x: 50, y: 50 };
    // Point that's closer to perpendicular with horizontal wall
    const point = { x: 52, y: 150 };

    const results = findPerpendicularSnaps(point, reference, walls, 15, 10);

    if (results.length > 1) {
      // Results should be sorted by distance (closest first)
      const dist0 = Math.hypot(
        point.x - results[0].point.x,
        point.y - results[0].point.y,
      );
      const dist1 = Math.hypot(
        point.x - results[1].point.x,
        point.y - results[1].point.y,
      );
      expect(dist0).toBeLessThanOrEqual(dist1);
    }
  });
});

describe("snapPointWithPerpendicular", () => {
  it("returns perpendicular snap when enabled", () => {
    const walls = [createWall("wall-1", 0, 94, 200, 12)];
    const reference = { x: 0, y: 100 };
    const point = { x: 3, y: 200 };

    const result = snapPointWithPerpendicular(point, walls, {
      enablePerpendicular: true,
      perpendicularReference: reference,
      perpendicularTolerance: 10,
      tolerance: 15,
      enableGrid: false,
      enableEndpoint: false,
      enableMidpoint: false,
      enableCenter: false,
      enableEdge: false,
    });

    expect(result.snapped).toBe(true);
    expect(result.snapType).toBe("perpendicular");
  });

  it("prefers endpoint snap over perpendicular when closer", () => {
    const walls = [createWall("wall-1", 0, 94, 200, 12)];
    const reference = { x: 0, y: 100 };

    // Point very close to wall endpoint (0, 100)
    const point = { x: 2, y: 102 };

    const result = snapPointWithPerpendicular(point, walls, {
      enablePerpendicular: true,
      perpendicularReference: reference,
      perpendicularTolerance: 10,
      tolerance: 15,
      enableGrid: false,
      enableEndpoint: true,
      enableMidpoint: false,
      enableCenter: false,
      enableEdge: false,
    });

    // Endpoint should win because it's closer
    expect(result.snapped).toBe(true);
    expect(result.snapType).toBe("endpoint");
  });

  it("falls back to regular snap when perpendicular disabled", () => {
    const walls = [createWall("wall-1", 0, 94, 200, 12)];

    const point = { x: 3, y: 200 };

    const result = snapPointWithPerpendicular(point, walls, {
      enablePerpendicular: false,
      enableGrid: true,
      gridSize: 50,
      tolerance: 15,
    });

    // Should snap to grid, not perpendicular
    expect(result.snapType).not.toBe("perpendicular");
  });

  it("returns unsnapped point when nothing matches", () => {
    const walls: Element[] = [];
    const point = { x: 123, y: 456 };

    const result = snapPointWithPerpendicular(point, walls, {
      enablePerpendicular: true,
      perpendicularReference: { x: 0, y: 0 },
      tolerance: 5,
      enableGrid: false,
      enableEndpoint: false,
      enableMidpoint: false,
      enableCenter: false,
      enableEdge: false,
    });

    expect(result.snapped).toBe(false);
    expect(result.point).toEqual(point);
  });
});
