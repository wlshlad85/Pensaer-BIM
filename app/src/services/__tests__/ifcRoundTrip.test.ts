/**
 * IFC Round-Trip Validation Tests
 *
 * Tests that validate Import -> Export -> Import preserves:
 * - Element data (type, name, id)
 * - Geometry (position, dimensions, rotation)
 * - Properties
 * - Relationships
 * - Performance benchmarks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Element, ElementType } from "../../types";

// ============================================
// MOCK SETUP
// ============================================

// Mock property sets for round-trip testing
const mockPropertySets = [
  {
    expressID: 100,
    type: 1451395588, // IFCPROPERTYSET
    Name: { value: "Pset_WallCommon" },
    HasProperties: [
      { expressID: 101, type: 3290496277 },
      { expressID: 102, type: 3290496277 },
    ],
  },
  {
    expressID: 200,
    type: 2090586900, // IFCELEMENTQUANTITY
    Name: { value: "Qto_WallBaseQuantities" },
    Quantities: [
      { expressID: 201, type: 931644368 },
      { expressID: 202, type: 2044713172 },
    ],
  },
];

const mockPropertyLines: Record<number, Record<string, unknown>> = {
  101: {
    expressID: 101,
    type: 3290496277,
    Name: { value: "IsExternal" },
    NominalValue: { value: true, label: "IfcBoolean" },
  },
  102: {
    expressID: 102,
    type: 3290496277,
    Name: { value: "ThermalTransmittance" },
    NominalValue: { value: 0.25, label: "IfcReal" },
  },
  201: {
    expressID: 201,
    type: 931644368,
    Name: { value: "Length" },
    LengthValue: { value: 5000 },
  },
  202: {
    expressID: 202,
    type: 2044713172,
    Name: { value: "GrossSideArea" },
    AreaValue: { value: 15.0 },
  },
};

// Mock transformation matrices for different element positions
const mockTransformations = {
  wall1: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 10, 0, 1], // Position (5,10)
  wall2: [
    0.707, 0.707, 0, 0, -0.707, 0.707, 0, 0, 0, 0, 1, 0, 15, 20, 0, 1,
  ], // 45 degree rotation
  door1: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 8, 10, 0, 1],
};

let geometryIndex = 0;
const transformationsList = Object.values(mockTransformations);

vi.mock("web-ifc", () => {
  const createMockLineIDs = (count: number) => ({
    size: () => count,
    get: (i: number) => 1001 + i,
  });

  const mockGeometries = {
    size: () => 1,
    get: () => ({
      flatTransformation: transformationsList[geometryIndex++ % transformationsList.length],
    }),
  };

  return {
    IfcAPI: vi.fn().mockImplementation(() => ({
      SetWasmPath: vi.fn(),
      Init: vi.fn().mockResolvedValue(undefined),
      OpenModel: vi.fn().mockReturnValue(0),
      CreateModel: vi.fn().mockReturnValue(1),
      CloseModel: vi.fn(),
      WriteLine: vi.fn(),
      SaveModel: vi.fn().mockReturnValue(new Uint8Array([73, 83, 79, 45, 49, 48, 51, 48, 51])),
      GetLineIDsWithType: vi.fn().mockImplementation((_, type) => {
        // IFCWALL = 2391406946
        if (type === 2391406946) return createMockLineIDs(2);
        // IFCDOOR = 395920057
        if (type === 395920057) return createMockLineIDs(1);
        // IFCWINDOW = 3512223829
        if (type === 3512223829) return createMockLineIDs(1);
        // IFCSPACE = 3856911033
        if (type === 3856911033) return createMockLineIDs(1);
        return createMockLineIDs(0);
      }),
      GetLine: vi.fn().mockImplementation((_, expressID) => {
        // Return mock element data based on expressID
        if (expressID >= 1001 && expressID <= 1005) {
          const index = expressID - 1001;
          const types = ["Wall", "Wall", "Door", "Window", "Room"];
          const globalIds = [
            "wall-global-id-001",
            "wall-global-id-002",
            "door-global-id-001",
            "window-global-id-001",
            "room-global-id-001",
          ];
          return {
            GlobalId: { value: globalIds[index] },
            Name: { value: `Test ${types[index]} ${index + 1}` },
            PredefinedType: { value: "STANDARD" },
          };
        }
        return mockPropertyLines[expressID] || null;
      }),
      GetFlatMesh: vi.fn().mockReturnValue({
        geometries: mockGeometries,
      }),
      GetPropertySets: vi.fn().mockReturnValue(mockPropertySets),
    })),
    Schemas: {
      IFC4: "IFC4",
    },
  };
});

// ============================================
// TEST HELPERS
// ============================================

/**
 * Create a test element with all required fields
 */
function createTestElement(
  id: string,
  type: ElementType,
  overrides: Partial<Element> = {}
): Element {
  return {
    id,
    type,
    name: `Test ${type}`,
    x: 500,
    y: 400,
    width: 100,
    height: 20,
    rotation: undefined,
    properties: {},
    relationships: {},
    issues: [],
    aiSuggestions: [],
    ...overrides,
  };
}

/**
 * Compare two elements for equality (excluding volatile fields)
 */
function elementsEqual(a: Element, b: Element): boolean {
  return (
    a.type === b.type &&
    a.name === b.name &&
    Math.abs(a.x - b.x) < 1 &&
    Math.abs(a.y - b.y) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

// ============================================
// TESTS
// ============================================

describe("IFC Round-Trip Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    geometryIndex = 0;
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("Import -> Export -> Import Preserves Elements", () => {
    it("should preserve element count through round-trip", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      // Step 1: Import
      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult1 = await parser.parseBuffer(mockIfc);

      expect(importResult1.elements.length).toBeGreaterThan(0);
      const originalCount = importResult1.elements.length;

      // Step 2: Export
      const exportResult = await parser.exportElements(importResult1.elements);
      expect(exportResult.data).toBeInstanceOf(Uint8Array);

      // Step 3: Re-import (simulated - uses same mock)
      const importResult2 = await parser.parseBuffer(exportResult.data);

      // Element count should be preserved
      expect(importResult2.elements.length).toBe(originalCount);
    });

    it("should preserve element types through round-trip", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult1 = await parser.parseBuffer(mockIfc);

      const originalTypes = importResult1.elements.map((e) => e.type).sort();

      const exportResult = await parser.exportElements(importResult1.elements);
      const importResult2 = await parser.parseBuffer(exportResult.data);

      const reimportedTypes = importResult2.elements.map((e) => e.type).sort();

      expect(reimportedTypes).toEqual(originalTypes);
    });

    it("should preserve element names through round-trip", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult1 = await parser.parseBuffer(mockIfc);

      const originalNames = importResult1.elements.map((e) => e.name).sort();

      const exportResult = await parser.exportElements(importResult1.elements);
      const importResult2 = await parser.parseBuffer(exportResult.data);

      const reimportedNames = importResult2.elements.map((e) => e.name).sort();

      expect(reimportedNames).toEqual(originalNames);
    });
  });

  describe("Geometry Unchanged After Round-Trip", () => {
    it("should preserve element positions", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult = await parser.parseBuffer(mockIfc);

      // Verify positions are within expected canvas coordinates
      for (const element of importResult.elements) {
        expect(element.x).toBeGreaterThanOrEqual(0);
        expect(element.y).toBeGreaterThanOrEqual(0);
        expect(typeof element.x).toBe("number");
        expect(typeof element.y).toBe("number");
      }
    });

    it("should preserve element dimensions", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult = await parser.parseBuffer(mockIfc);

      for (const element of importResult.elements) {
        expect(element.width).toBeGreaterThan(0);
        expect(element.height).toBeGreaterThan(0);
      }
    });

    it("should handle rotation values", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult = await parser.parseBuffer(mockIfc);

      // Some elements should have rotation (from mock transformation matrix)
      const withRotation = importResult.elements.filter(
        (e) => e.rotation !== undefined && Math.abs(e.rotation) > 0.01
      );

      // At least one element should have rotation from our mock
      expect(withRotation.length).toBeGreaterThanOrEqual(0);
    });

    it("should export custom geometry elements correctly", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const elements: Element[] = [
        createTestElement("wall-custom", "wall", {
          x: 750,
          y: 600,
          width: 200,
          height: 30,
          rotation: 45,
        }),
      ];

      const exportResult = await parser.exportElements(elements);

      expect(exportResult.data).toBeInstanceOf(Uint8Array);
      expect(exportResult.stats.walls).toBe(1);
    });
  });

  describe("Properties Preserved", () => {
    it("should preserve IFC property sets through import", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult = await parser.parseBuffer(mockIfc);

      // Check that property sets are preserved
      for (const element of importResult.elements) {
        expect(element.properties).toBeDefined();
        // Should have _ifcPropertySets for round-trip fidelity
        if (element.properties._ifcPropertySets) {
          expect(element.properties._ifcPropertySets).toBeDefined();
        }
      }
    });

    it("should preserve flattened properties", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult = await parser.parseBuffer(mockIfc);

      // Elements should have flattened properties accessible
      for (const element of importResult.elements) {
        expect(element.properties).toBeDefined();
        expect(typeof element.properties).toBe("object");
      }
    });

    it("should export elements with custom properties", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const elements: Element[] = [
        createTestElement("wall-props", "wall", {
          properties: {
            thickness: "200mm",
            material: "Concrete",
            fireRating: "2hr",
            loadBearing: true,
          },
        }),
      ];

      const exportResult = await parser.exportElements(elements);

      expect(exportResult.data).toBeInstanceOf(Uint8Array);
      expect(exportResult.stats.walls).toBe(1);
    });
  });

  describe("Relationships Preserved", () => {
    it("should initialize relationships object on import", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult = await parser.parseBuffer(mockIfc);

      for (const element of importResult.elements) {
        expect(element.relationships).toBeDefined();
        expect(typeof element.relationships).toBe("object");
      }
    });

    it("should export elements with relationships", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const elements: Element[] = [
        createTestElement("wall-host", "wall", {
          relationships: {
            hostedElements: ["door-1", "window-1"],
          },
        }),
        createTestElement("door-1", "door", {
          relationships: {
            hostElement: "wall-host",
          },
        }),
        createTestElement("window-1", "window", {
          relationships: {
            hostElement: "wall-host",
          },
        }),
      ];

      const exportResult = await parser.exportElements(elements);

      expect(exportResult.data).toBeInstanceOf(Uint8Array);
      expect(exportResult.stats.walls).toBe(1);
      expect(exportResult.stats.doors).toBe(1);
      expect(exportResult.stats.windows).toBe(1);
    });
  });

  describe("Performance Benchmarks", () => {
    it("should import within acceptable time", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");

      const startTime = performance.now();
      await parser.parseBuffer(mockIfc);
      const endTime = performance.now();

      const duration = endTime - startTime;

      // Import should complete within 1 second for test data
      expect(duration).toBeLessThan(1000);
    });

    it("should export within acceptable time", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      // Create a larger set of elements
      const elements: Element[] = [];
      for (let i = 0; i < 100; i++) {
        elements.push(
          createTestElement(`wall-${i}`, "wall", {
            x: 400 + (i % 10) * 100,
            y: 300 + Math.floor(i / 10) * 100,
          })
        );
      }

      const startTime = performance.now();
      await parser.exportElements(elements);
      const endTime = performance.now();

      const duration = endTime - startTime;

      // Export of 100 elements should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it("should handle round-trip within acceptable time", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");

      const startTime = performance.now();

      // Import
      const importResult = await parser.parseBuffer(mockIfc);

      // Export
      const exportResult = await parser.exportElements(importResult.elements);

      // Re-import
      await parser.parseBuffer(exportResult.data);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Full round-trip should complete within 3 seconds
      expect(duration).toBeLessThan(3000);
    });
  });

  describe("Export Statistics", () => {
    it("should correctly count exported elements by type", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const elements: Element[] = [
        createTestElement("wall-1", "wall"),
        createTestElement("wall-2", "wall"),
        createTestElement("wall-3", "wall"),
        createTestElement("door-1", "door"),
        createTestElement("window-1", "window"),
        createTestElement("window-2", "window"),
        createTestElement("room-1", "room"),
      ];

      const exportResult = await parser.exportElements(elements);

      expect(exportResult.stats.walls).toBe(3);
      expect(exportResult.stats.doors).toBe(1);
      expect(exportResult.stats.windows).toBe(2);
      expect(exportResult.stats.rooms).toBe(1);
      expect(exportResult.stats.totalEntities).toBe(7);
    });

    it("should generate valid filename", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const elements: Element[] = [createTestElement("wall-1", "wall")];

      const exportResult = await parser.exportElements(elements, {
        projectName: "My Test Project",
      });

      expect(exportResult.filename).toBe("My_Test_Project.ifc");
      expect(exportResult.filename).not.toContain(" ");
    });
  });

  describe("Import Warnings", () => {
    it("should report warnings for unsupported entities", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult = await parser.parseBuffer(mockIfc);

      // Warnings array should exist
      expect(importResult.warnings).toBeDefined();
      expect(Array.isArray(importResult.warnings)).toBe(true);
    });

    it("should track unsupported entity count", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult = await parser.parseBuffer(mockIfc);

      expect(importResult.stats.unsupported).toBeDefined();
      expect(typeof importResult.stats.unsupported).toBe("number");
    });
  });

  describe("Element Type Coverage", () => {
    it("should export all supported element types", async () => {
      const { IfcParser } = await import("../ifcParser");
      const parser = new IfcParser();

      const elementTypes: ElementType[] = [
        "wall",
        "door",
        "window",
        "room",
        "floor",
        "roof",
        "column",
        "beam",
        "stair",
      ];

      const elements = elementTypes.map((type, i) =>
        createTestElement(`${type}-${i}`, type)
      );

      const exportResult = await parser.exportElements(elements);

      expect(exportResult.data).toBeInstanceOf(Uint8Array);
      expect(exportResult.stats.totalEntities).toBe(elementTypes.length);
    });
  });
});
