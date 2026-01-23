/**
 * @vitest-environment jsdom
 */

/**
 * Pensaer BIM Platform - Virtualization Hook Tests
 *
 * Tests for viewport culling, spatial indexing, and LOD utilities.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useVirtualization,
  elementTo3DBounds,
  isVisibleToCamera,
  calculateLOD,
  getLODGeometryMultiplier,
  createLoadingBatches,
  type Viewport,
} from "../useVirtualization";
import type { Element } from "../../types";

// ============================================
// TEST DATA
// ============================================

function createTestElement(
  id: string,
  type: string,
  x: number,
  y: number,
  width: number,
  height: number
): Element {
  return {
    id,
    type: type as Element["type"],
    name: `Test ${type} ${id}`,
    x,
    y,
    width,
    height,
    properties: {},
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };
}

function createTestElements(count: number): Element[] {
  const elements: Element[] = [];
  for (let i = 0; i < count; i++) {
    // Distribute elements across a 2000x1500 canvas
    const x = (i % 20) * 100;
    const y = Math.floor(i / 20) * 100;
    const types: Element["type"][] = ["wall", "door", "window", "room"];
    const type = types[i % types.length];
    elements.push(createTestElement(`el-${i}`, type, x, y, 80, 60));
  }
  return elements;
}

const DEFAULT_VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  zoom: 1,
  panX: 0,
  panY: 0,
};

// ============================================
// HOOK TESTS
// ============================================

describe("useVirtualization", () => {
  describe("basic functionality", () => {
    it("returns all elements when model is small", () => {
      const elements = createTestElements(10);
      const { result } = renderHook(() =>
        useVirtualization(elements, DEFAULT_VIEWPORT)
      );

      expect(result.current.totalCount).toBe(10);
      expect(result.current.visibleCount).toBe(10);
      expect(result.current.budgetExceeded).toBe(false);
    });

    it("returns correct total and visible counts", () => {
      const elements = createTestElements(100);
      const { result } = renderHook(() =>
        useVirtualization(elements, DEFAULT_VIEWPORT)
      );

      expect(result.current.totalCount).toBe(100);
      // Visible count depends on viewport culling
      expect(result.current.visibleCount).toBeGreaterThan(0);
      expect(result.current.visibleCount).toBeLessThanOrEqual(100);
    });

    it("provides query functions", () => {
      const elements = createTestElements(50);
      const { result } = renderHook(() =>
        useVirtualization(elements, DEFAULT_VIEWPORT)
      );

      expect(typeof result.current.queryBounds).toBe("function");
      expect(typeof result.current.queryPoint).toBe("function");
      expect(typeof result.current.rebuildIndex).toBe("function");
    });
  });

  describe("viewport culling", () => {
    it("filters elements outside viewport", () => {
      // Create elements far outside the viewport
      const elements: Element[] = [
        createTestElement("visible", "wall", 100, 100, 80, 60),
        createTestElement("far-right", "wall", 5000, 100, 80, 60),
        createTestElement("far-bottom", "wall", 100, 5000, 80, 60),
      ];

      const { result } = renderHook(() =>
        useVirtualization(elements, DEFAULT_VIEWPORT)
      );

      // At least the visible element should be included
      const visibleIds = result.current.visibleElements.map((el) => el.id);
      expect(visibleIds).toContain("visible");
    });

    it("includes elements at viewport edges with buffer", () => {
      // Element at the edge of viewport
      const elements: Element[] = [
        createTestElement("edge", "wall", 750, 550, 80, 60),
      ];

      const { result } = renderHook(() =>
        useVirtualization(elements, DEFAULT_VIEWPORT)
      );

      // Edge elements should be included due to buffer zone
      expect(result.current.visibleElements.length).toBeGreaterThan(0);
    });
  });

  describe("spatial queries", () => {
    it("queryBounds returns elements in specified region", () => {
      const elements = createTestElements(100);
      const { result } = renderHook(() =>
        useVirtualization(elements, DEFAULT_VIEWPORT)
      );

      // Query a small region
      const found = result.current.queryBounds({
        x: 0,
        y: 0,
        width: 200,
        height: 200,
      });

      // Should find elements in that region
      expect(found.length).toBeGreaterThan(0);

      // All found elements should actually be in/intersect the region
      found.forEach((el) => {
        expect(el.x).toBeLessThanOrEqual(200);
        expect(el.y).toBeLessThanOrEqual(200);
      });
    });

    it("queryPoint returns elements within radius", () => {
      const elements: Element[] = [
        createTestElement("center", "wall", 100, 100, 50, 50),
        createTestElement("nearby", "wall", 130, 130, 50, 50),
        createTestElement("far", "wall", 500, 500, 50, 50),
      ];

      const { result } = renderHook(() =>
        useVirtualization(elements, DEFAULT_VIEWPORT)
      );

      // Query near the first two elements
      const found = result.current.queryPoint(125, 125, 100);

      expect(found.length).toBe(2);
      const foundIds = found.map((el) => el.id);
      expect(foundIds).toContain("center");
      expect(foundIds).toContain("nearby");
      expect(foundIds).not.toContain("far");
    });
  });

  describe("render budget", () => {
    it("respects maxElements limit", () => {
      const elements = createTestElements(15000);
      const { result } = renderHook(() =>
        useVirtualization(elements, DEFAULT_VIEWPORT, {
          maxElements: 1000,
          typePriority: { wall: 1, door: 2, window: 2, room: 3 },
          progressiveLoading: true,
        })
      );

      expect(result.current.visibleCount).toBeLessThanOrEqual(1000);
      expect(result.current.budgetExceeded).toBe(true);
    });

    it("prioritizes elements by type", () => {
      const elements: Element[] = [
        ...Array(500).fill(null).map((_, i) =>
          createTestElement(`room-${i}`, "room", i * 10, 100, 80, 60)
        ),
        ...Array(500).fill(null).map((_, i) =>
          createTestElement(`wall-${i}`, "wall", i * 10, 200, 80, 60)
        ),
      ];

      const { result } = renderHook(() =>
        useVirtualization(elements, DEFAULT_VIEWPORT, {
          maxElements: 100,
          typePriority: { wall: 1, room: 3 },
          progressiveLoading: false,
        })
      );

      // Walls should be prioritized over rooms
      const walls = result.current.visibleElements.filter(
        (el) => el.type === "wall"
      );
      const rooms = result.current.visibleElements.filter(
        (el) => el.type === "room"
      );

      expect(walls.length).toBeGreaterThanOrEqual(rooms.length);
    });
  });
});

// ============================================
// 3D BOUNDS TESTS
// ============================================

describe("elementTo3DBounds", () => {
  it("converts 2D element to 3D bounds with correct scale", () => {
    const element = createTestElement("test", "wall", 100, 200, 300, 12);
    const bounds = elementTo3DBounds(element, 0.01, 0, 0, 3);

    expect(bounds.minX).toBe(1); // 100 * 0.01
    expect(bounds.minZ).toBe(2); // 200 * 0.01
    expect(bounds.maxX).toBe(4); // (100 + 300) * 0.01
    expect(bounds.maxZ).toBe(2.12); // (200 + 12) * 0.01
    expect(bounds.maxY).toBe(3); // Wall height
  });

  it("applies offset correctly", () => {
    const element = createTestElement("test", "room", 0, 0, 100, 100);
    const bounds = elementTo3DBounds(element, 0.01, -5, -5, 3);

    expect(bounds.minX).toBe(-5);
    expect(bounds.minZ).toBe(-5);
    expect(bounds.maxX).toBe(-4);
    expect(bounds.maxZ).toBe(-4);
  });

  it("sets correct height for different element types", () => {
    const wall = createTestElement("wall", "wall", 0, 0, 100, 12);
    const door = createTestElement("door", "door", 0, 0, 90, 24);
    const window = createTestElement("window", "window", 0, 0, 100, 24);
    const room = createTestElement("room", "room", 0, 0, 500, 400);

    expect(elementTo3DBounds(wall).maxY).toBe(3);
    expect(elementTo3DBounds(door).maxY).toBe(2.1);
    expect(elementTo3DBounds(window).maxY).toBe(1.2);
    expect(elementTo3DBounds(room).maxY).toBe(0.05);
  });
});

// ============================================
// CAMERA VISIBILITY TESTS
// ============================================

describe("isVisibleToCamera", () => {
  it("returns true for objects within view distance", () => {
    const bounds = {
      minX: 0,
      minY: 0,
      minZ: 0,
      maxX: 1,
      maxY: 1,
      maxZ: 1,
    };
    const camera = { x: 5, y: 5, z: 5 };

    expect(isVisibleToCamera(bounds, camera, 100)).toBe(true);
  });

  it("returns false for objects beyond view distance", () => {
    const bounds = {
      minX: 100,
      minY: 100,
      minZ: 100,
      maxX: 101,
      maxY: 101,
      maxZ: 101,
    };
    const camera = { x: 0, y: 0, z: 0 };

    expect(isVisibleToCamera(bounds, camera, 10)).toBe(false);
  });

  it("accounts for object size in visibility check", () => {
    const largeBounds = {
      minX: 40,
      minY: 0,
      minZ: 40,
      maxX: 60,
      maxY: 20,
      maxZ: 60,
    };
    const camera = { x: 0, y: 0, z: 0 };

    // Large object with radius ~17 at distance ~70 should be within viewDistance 100
    expect(isVisibleToCamera(largeBounds, camera, 100)).toBe(true);
  });
});

// ============================================
// LOD TESTS
// ============================================

describe("calculateLOD", () => {
  it("returns 'high' for close distances", () => {
    expect(calculateLOD(5)).toBe("high");
    expect(calculateLOD(15)).toBe("high");
  });

  it("returns 'medium' for medium distances", () => {
    expect(calculateLOD(25)).toBe("medium");
    expect(calculateLOD(40)).toBe("medium");
  });

  it("returns 'low' for far distances", () => {
    expect(calculateLOD(60)).toBe("low");
    expect(calculateLOD(90)).toBe("low");
  });

  it("returns 'hidden' for very far distances", () => {
    expect(calculateLOD(150)).toBe("hidden");
    expect(calculateLOD(200)).toBe("hidden");
  });

  it("respects custom thresholds", () => {
    const customThresholds = { medium: 5, low: 10, hidden: 20 };

    expect(calculateLOD(3, customThresholds)).toBe("high");
    expect(calculateLOD(7, customThresholds)).toBe("medium");
    expect(calculateLOD(15, customThresholds)).toBe("low");
    expect(calculateLOD(25, customThresholds)).toBe("hidden");
  });
});

describe("getLODGeometryMultiplier", () => {
  it("returns correct multipliers for each LOD level", () => {
    expect(getLODGeometryMultiplier("high")).toBe(1.0);
    expect(getLODGeometryMultiplier("medium")).toBe(0.5);
    expect(getLODGeometryMultiplier("low")).toBe(0.25);
    expect(getLODGeometryMultiplier("hidden")).toBe(0);
  });
});

// ============================================
// PROGRESSIVE LOADING TESTS
// ============================================

describe("createLoadingBatches", () => {
  it("splits elements into correct batch sizes", () => {
    const elements = createTestElements(250);
    const batches = createLoadingBatches(elements, 100);

    expect(batches.length).toBe(3);
    expect(batches[0].length).toBe(100);
    expect(batches[1].length).toBe(100);
    expect(batches[2].length).toBe(50);
  });

  it("returns single batch for small element sets", () => {
    const elements = createTestElements(50);
    const batches = createLoadingBatches(elements, 100);

    expect(batches.length).toBe(1);
    expect(batches[0].length).toBe(50);
  });

  it("prioritizes elements by type in batches", () => {
    const elements: Element[] = [
      createTestElement("room1", "room", 0, 0, 100, 100),
      createTestElement("wall1", "wall", 0, 0, 100, 12),
      createTestElement("room2", "room", 100, 0, 100, 100),
      createTestElement("wall2", "wall", 100, 0, 100, 12),
    ];

    const batches = createLoadingBatches(elements, 2);

    // First batch should contain walls (higher priority)
    const firstBatchTypes = batches[0].map((el) => el.type);
    expect(firstBatchTypes).toContain("wall");
  });

  it("returns empty array for empty input", () => {
    const batches = createLoadingBatches([], 100);
    expect(batches).toEqual([]);
  });
});
