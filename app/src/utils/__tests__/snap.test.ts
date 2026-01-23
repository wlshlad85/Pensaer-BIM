/**
 * Tests for core snapping functionality
 */

import { describe, it, expect } from "vitest";
import {
  snapPoint,
  snapToGrid,
  getSnapIndicatorStyle,
  getSnapTypeLabel,
  findAlignmentGuides,
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
  } as Element;
}

// Helper to create a room element
function createRoom(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Element {
  return {
    id,
    type: "room",
    name: `Room-${id}`,
    x,
    y,
    width,
    height,
    properties: {},
    relationships: { boundedBy: [] },
    issues: [],
    aiSuggestions: [],
  } as Element;
}

// Helper to create a floor element
function createFloor(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Element {
  return {
    id,
    type: "floor",
    name: `Floor-${id}`,
    x,
    y,
    width,
    height,
    properties: {},
    relationships: {},
    issues: [],
    aiSuggestions: [],
  } as Element;
}

describe("snapToGrid", () => {
  it("snaps point to nearest grid intersection", () => {
    const result = snapToGrid({ x: 47, y: 53 }, 50);
    expect(result).toEqual({ x: 50, y: 50 });
  });

  it("snaps point already on grid", () => {
    const result = snapToGrid({ x: 100, y: 150 }, 50);
    expect(result).toEqual({ x: 100, y: 150 });
  });

  it("handles negative coordinates", () => {
    const result = snapToGrid({ x: -47, y: -53 }, 50);
    expect(result).toEqual({ x: -50, y: -50 });
  });

  it("handles different grid sizes", () => {
    const result = snapToGrid({ x: 17, y: 23 }, 10);
    expect(result).toEqual({ x: 20, y: 20 });
  });

  it("rounds to nearest (not floor or ceiling)", () => {
    // 24 is closer to 20 than 30 with grid size 10
    expect(snapToGrid({ x: 24, y: 24 }, 10)).toEqual({ x: 20, y: 20 });
    // 26 is closer to 30 than 20 with grid size 10
    expect(snapToGrid({ x: 26, y: 26 }, 10)).toEqual({ x: 30, y: 30 });
  });
});

describe("snapPoint", () => {
  describe("endpoint snapping", () => {
    it("snaps to wall endpoint when close", () => {
      const walls = [createWall("wall-1", 0, 0, 100, 10)];
      const result = snapPoint({ x: 3, y: 5 }, walls, {
        enableEndpoint: true,
        enableGrid: false,
        tolerance: 10,
      });

      expect(result.snapped).toBe(true);
      expect(result.snapType).toBe("endpoint");
      expect(result.snapTargetId).toBe("wall-1");
    });

    it("does not snap to endpoint when too far", () => {
      const walls = [createWall("wall-1", 0, 0, 100, 10)];
      const result = snapPoint({ x: 50, y: 50 }, walls, {
        enableEndpoint: true,
        enableGrid: false,
        tolerance: 10,
      });

      expect(result.snapped).toBe(false);
    });

    it("snaps to closer endpoint when multiple exist", () => {
      const walls = [
        createWall("wall-1", 0, 0, 100, 10),
        createWall("wall-2", 200, 0, 100, 10),
      ];
      const result = snapPoint({ x: 2, y: 3 }, walls, {
        enableEndpoint: true,
        enableGrid: false,
        tolerance: 10,
      });

      expect(result.snapTargetId).toBe("wall-1");
    });
  });

  describe("midpoint snapping", () => {
    it("snaps to wall midpoint", () => {
      const walls = [createWall("wall-1", 0, 0, 100, 10)];
      // Wall midpoint should be at (50, 5) for a horizontal wall
      const result = snapPoint({ x: 52, y: 7 }, walls, {
        enableMidpoint: true,
        enableEndpoint: false,
        enableGrid: false,
        tolerance: 10,
      });

      expect(result.snapped).toBe(true);
      expect(result.snapType).toBe("midpoint");
      expect(result.snapTargetId).toBe("wall-1");
    });

    it("snaps to room boundary midpoints", () => {
      const rooms = [createRoom("room-1", 0, 0, 100, 100)];
      // Top edge midpoint should be at (50, 0)
      const result = snapPoint({ x: 52, y: 2 }, rooms, {
        enableMidpoint: true,
        enableEndpoint: false,
        enableCenter: false,
        enableGrid: false,
        tolerance: 10,
      });

      expect(result.snapped).toBe(true);
      expect(result.snapType).toBe("midpoint");
      expect(result.snapTargetId).toBe("room-1");
    });
  });

  describe("center snapping", () => {
    it("snaps to element center", () => {
      const walls = [createWall("wall-1", 0, 0, 100, 20)];
      // Center should be at (50, 10)
      const result = snapPoint({ x: 52, y: 12 }, walls, {
        enableCenter: true,
        enableEndpoint: false,
        enableMidpoint: false,
        enableGrid: false,
        tolerance: 10,
      });

      expect(result.snapped).toBe(true);
      expect(result.snapType).toBe("center");
      expect(result.snapTargetId).toBe("wall-1");
    });

    it("does not snap rooms to center (only midpoints)", () => {
      const rooms = [createRoom("room-1", 0, 0, 100, 100)];
      // Center would be at (50, 50) but rooms don't support center snap
      const result = snapPoint({ x: 52, y: 52 }, rooms, {
        enableCenter: true,
        enableEndpoint: true,
        enableMidpoint: false,
        enableGrid: false,
        tolerance: 10,
      });

      // Should not snap to center since rooms don't support it
      expect(result.snapType !== "center" || result.snapTargetId !== "room-1").toBe(true);
    });
  });

  describe("grid snapping", () => {
    it("falls back to grid snap when no element snap", () => {
      const walls = [createWall("wall-1", 1000, 1000, 100, 10)];
      const result = snapPoint({ x: 47, y: 53 }, walls, {
        enableGrid: true,
        gridSize: 50,
        enableEndpoint: false,
        enableMidpoint: false,
        enableCenter: false,
        tolerance: 10,
      });

      expect(result.snapped).toBe(true);
      expect(result.snapType).toBe("grid");
      expect(result.snapTargetId).toBeNull();
      expect(result.point).toEqual({ x: 50, y: 50 });
    });

    it("prefers element snap over grid snap when closer", () => {
      const walls = [createWall("wall-1", 0, 0, 100, 10)];
      // Point close to wall endpoint (0, 5)
      const result = snapPoint({ x: 3, y: 7 }, walls, {
        enableGrid: true,
        gridSize: 50,
        enableEndpoint: true,
        tolerance: 10,
      });

      expect(result.snapType).toBe("endpoint");
    });
  });

  describe("priority ordering", () => {
    it("returns unsnapped point when nothing matches", () => {
      const point = { x: 123, y: 456 };
      const result = snapPoint(point, [], {
        enableGrid: false,
        enableEndpoint: false,
        tolerance: 5,
      });

      expect(result.snapped).toBe(false);
      expect(result.point).toEqual(point);
      expect(result.snapType).toBeNull();
    });
  });
});

describe("getSnapIndicatorStyle", () => {
  it("returns correct style for endpoint", () => {
    const style = getSnapIndicatorStyle("endpoint");
    expect(style.shape).toBe("square");
    expect(style.color).toBe("#22c55e"); // green
  });

  it("returns correct style for midpoint", () => {
    const style = getSnapIndicatorStyle("midpoint");
    expect(style.shape).toBe("diamond");
    expect(style.color).toBe("#3b82f6"); // blue
  });

  it("returns correct style for center", () => {
    const style = getSnapIndicatorStyle("center");
    expect(style.shape).toBe("circle");
    expect(style.color).toBe("#a855f7"); // purple
  });

  it("returns correct style for grid", () => {
    const style = getSnapIndicatorStyle("grid");
    expect(style.shape).toBe("circle");
    expect(style.color).toBe("#6b7280"); // gray
  });

  it("returns correct style for perpendicular", () => {
    const style = getSnapIndicatorStyle("perpendicular");
    expect(style.shape).toBe("cross");
    expect(style.color).toBe("#06b6d4"); // cyan
  });
});

describe("getSnapTypeLabel", () => {
  it("returns correct labels for all snap types", () => {
    expect(getSnapTypeLabel("endpoint")).toBe("Endpoint");
    expect(getSnapTypeLabel("midpoint")).toBe("Midpoint");
    expect(getSnapTypeLabel("center")).toBe("Center");
    expect(getSnapTypeLabel("grid")).toBe("Grid");
    expect(getSnapTypeLabel("edge")).toBe("Edge");
    expect(getSnapTypeLabel("intersection")).toBe("Intersect");
    expect(getSnapTypeLabel("perpendicular")).toBe("Perp");
  });
});

describe("findAlignmentGuides", () => {
  it("finds horizontal alignment with element center", () => {
    const elements = [createWall("wall-1", 100, 100, 50, 20)];
    // Element center is at (125, 110)
    const result = findAlignmentGuides({ x: 200, y: 110 }, elements, 5);

    expect(result.horizontal).toBe(110);
  });

  it("finds vertical alignment with element center", () => {
    const elements = [createWall("wall-1", 100, 100, 50, 20)];
    // Element center is at (125, 110)
    const result = findAlignmentGuides({ x: 125, y: 200 }, elements, 5);

    expect(result.vertical).toBe(125);
  });

  it("finds alignment with element bounds", () => {
    const elements = [createWall("wall-1", 100, 100, 50, 20)];
    // Element bounds: x=100 to 150, y=100 to 120
    const result = findAlignmentGuides({ x: 100, y: 200 }, elements, 5);

    expect(result.vertical).toBe(100); // Left edge
  });

  it("returns null when no alignment found", () => {
    const elements = [createWall("wall-1", 100, 100, 50, 20)];
    const result = findAlignmentGuides({ x: 500, y: 500 }, elements, 5);

    expect(result.horizontal).toBeNull();
    expect(result.vertical).toBeNull();
  });

  it("ignores rooms in alignment calculation", () => {
    const elements = [createRoom("room-1", 100, 100, 50, 50)];
    // Room center is at (125, 125) but rooms should be ignored
    const result = findAlignmentGuides({ x: 125, y: 200 }, elements, 5);

    expect(result.vertical).toBeNull();
  });
});
