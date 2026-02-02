/**
 * Tests for Wall Join Detection Service (P1-008)
 */

import { describe, it, expect } from "vitest";
import {
  detectWallJoins,
  detectAllWallJoins,
  applyJoinUpdates,
  extractWallSegment,
  type DetectedJoin,
} from "../wallJoinDetector";
import type { Element } from "../../types";

// Scale factor matching the app
const SCALE = 100;

/**
 * Helper to create a wall element with start/end points (in meters).
 */
function makeWall(
  id: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): Element {
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const isHorizontal = Math.abs(dx) >= Math.abs(dy);

  return {
    id,
    type: "wall",
    name: `Wall ${id}`,
    x: startX * SCALE,
    y: startY * SCALE,
    width: isHorizontal ? len * SCALE : 0.2 * SCALE * 60,
    height: isHorizontal ? 0.2 * SCALE * 60 : len * SCALE,
    properties: {
      start_x: startX,
      start_y: startY,
      end_x: endX,
      end_y: endY,
      thickness: "200mm",
      height: "3000mm",
      material: "Concrete",
    },
    relationships: { joins: [] },
    issues: [],
    aiSuggestions: [],
  } as unknown as Element;
}

// ============================================
// SEGMENT EXTRACTION
// ============================================

describe("extractWallSegment", () => {
  it("extracts segment from wall with start/end properties", () => {
    const wall = makeWall("w1", 0, 0, 5, 0);
    const seg = extractWallSegment(wall);
    expect(seg).not.toBeNull();
    expect(seg!.start).toEqual({ x: 0, y: 0 });
    expect(seg!.end).toEqual({ x: 500, y: 0 });
  });

  it("returns null for non-wall elements", () => {
    const door = { ...makeWall("d1", 0, 0, 1, 0), type: "door" } as unknown as Element;
    expect(extractWallSegment(door)).toBeNull();
  });
});

// ============================================
// L-JOIN DETECTION
// ============================================

describe("L-join detection", () => {
  it("detects L-join at 90° corner", () => {
    const wall1 = makeWall("w1", 0, 0, 5, 0);
    const wall2 = makeWall("w2", 5, 0, 5, 4);

    const result = detectWallJoins(wall2, [wall1]);
    expect(result.joins).toHaveLength(1);
    expect(result.joins[0].type).toBe("L");
    expect(result.joins[0].wallIds).toContain("w1");
    expect(result.joins[0].wallIds).toContain("w2");
    // Angle should be ~90°
    expect(Math.abs(result.joins[0].angle - Math.PI / 2)).toBeLessThan(0.1);
  });

  it("detects 4 L-joins in a rectangle", () => {
    const walls = [
      makeWall("w1", 0, 0, 10, 0),
      makeWall("w2", 10, 0, 10, 8),
      makeWall("w3", 10, 8, 0, 8),
      makeWall("w4", 0, 8, 0, 0),
    ];

    const joins = detectAllWallJoins(walls);
    const lJoins = joins.filter((j) => j.type === "L");
    expect(lJoins).toHaveLength(4);
  });
});

// ============================================
// T-JOIN DETECTION
// ============================================

describe("T-join detection", () => {
  it("detects T-join when wall endpoint meets another wall's midpoint", () => {
    // Horizontal wall from (0,0) to (10,0)
    const wall1 = makeWall("w1", 0, 0, 10, 0);
    // Vertical wall from (5,5) ending at (5,0) - meets wall1's midpoint
    const wall2 = makeWall("w2", 5, 5, 5, 0);

    const result = detectWallJoins(wall2, [wall1]);
    expect(result.joins).toHaveLength(1);
    expect(result.joins[0].type).toBe("T");
  });

  it("detects T-join from the other direction", () => {
    // Vertical wall from (5,-3) to (5,0) approaching from below
    const wall1 = makeWall("w1", 0, 0, 10, 0);
    const wall2 = makeWall("w2", 5, -3, 5, 0);

    const result = detectWallJoins(wall2, [wall1]);
    expect(result.joins).toHaveLength(1);
    expect(result.joins[0].type).toBe("T");
  });
});

// ============================================
// CROSS-JOIN DETECTION
// ============================================

describe("Cross-join detection", () => {
  it("detects cross-join when walls intersect at interiors", () => {
    const wall1 = makeWall("w1", 0, 0, 10, 0);
    const wall2 = makeWall("w2", 5, -3, 5, 3);

    const result = detectWallJoins(wall2, [wall1]);
    expect(result.joins).toHaveLength(1);
    expect(result.joins[0].type).toBe("cross");
    // Intersection near (5,0)
    expect(Math.abs(result.joins[0].point.x - 500)).toBeLessThan(50);
    expect(Math.abs(result.joins[0].point.y - 0)).toBeLessThan(50);
  });
});

// ============================================
// BUTT-JOIN DETECTION
// ============================================

describe("Butt-join detection", () => {
  it("detects butt-join for collinear walls", () => {
    const wall1 = makeWall("w1", 0, 0, 5, 0);
    const wall2 = makeWall("w2", 5, 0, 10, 0);

    const result = detectWallJoins(wall2, [wall1]);
    expect(result.joins).toHaveLength(1);
    expect(result.joins[0].type).toBe("butt");
  });
});

// ============================================
// NO JOIN
// ============================================

describe("No join detection", () => {
  it("returns no joins for distant walls", () => {
    const wall1 = makeWall("w1", 0, 0, 5, 0);
    const wall2 = makeWall("w2", 100, 100, 105, 100);

    const result = detectWallJoins(wall2, [wall1]);
    expect(result.joins).toHaveLength(0);
  });

  it("returns no joins for parallel non-touching walls", () => {
    const wall1 = makeWall("w1", 0, 0, 10, 0);
    const wall2 = makeWall("w2", 0, 5, 10, 5);

    const result = detectWallJoins(wall2, [wall1]);
    expect(result.joins).toHaveLength(0);
  });
});

// ============================================
// RELATIONSHIP UPDATES
// ============================================

describe("Relationship updates", () => {
  it("builds correct relationship map for L-join", () => {
    const wall1 = makeWall("w1", 0, 0, 5, 0);
    const wall2 = makeWall("w2", 5, 0, 5, 4);

    const result = detectWallJoins(wall2, [wall1]);
    expect(result.relationshipUpdates.get("w1")).toContain("w2");
    expect(result.relationshipUpdates.get("w2")).toContain("w1");
  });

  it("applyJoinUpdates merges joins without duplicates", () => {
    const wall1 = makeWall("w1", 0, 0, 5, 0);
    const wall2 = makeWall("w2", 5, 0, 5, 4);

    // Simulate existing join
    (wall1.relationships as any).joins = ["w0"];

    const result = detectWallJoins(wall2, [wall1]);

    const elements = new Map<string, Element>();
    elements.set("w1", wall1);
    elements.set("w2", wall2);

    const updates: Array<{ id: string; updates: Partial<Element> }> = [];
    applyJoinUpdates(
      result,
      (id, upd) => updates.push({ id, updates: upd }),
      (id) => elements.get(id)
    );

    const w1Update = updates.find((u) => u.id === "w1");
    expect(w1Update).toBeDefined();
    const joins = (w1Update!.updates.relationships as any)?.joins as string[];
    expect(joins).toContain("w0"); // Preserved existing
    expect(joins).toContain("w2"); // Added new
    // No duplicates
    expect(new Set(joins).size).toBe(joins.length);
  });
});

// ============================================
// MULTIPLE JOINS
// ============================================

describe("Multiple joins", () => {
  it("detects joins with multiple existing walls", () => {
    const wall1 = makeWall("w1", 0, 0, 5, 0);
    const wall2 = makeWall("w2", 10, 0, 5, 0);
    // New wall connects both
    const wall3 = makeWall("w3", 5, 0, 5, 4);

    const result = detectWallJoins(wall3, [wall1, wall2]);
    // Should detect joins with both wall1 and wall2
    expect(result.joins.length).toBeGreaterThanOrEqual(1);
    const involvedWalls = new Set(result.joins.flatMap((j) => j.wallIds));
    expect(involvedWalls.has("w3")).toBe(true);
  });
});
