/**
 * IFC Parser Service Tests
 *
 * Tests for the IFC parsing functionality.
 * Note: These tests mock web-ifc since WASM is difficult in Node.js environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { IfcImportResult, IfcImportStats, IfcExportResult, IfcExportStats } from "./ifcParser";
import type { Element } from "../types";

// Mock web-ifc module for testing
vi.mock("web-ifc", () => {
  const mockGeometries = {
    size: () => 1,
    get: () => ({
      flatTransformation: [
        1, 0, 0, 0, // row 0
        0, 1, 0, 0, // row 1
        0, 0, 1, 0, // row 2
        5, 10, 0, 1, // row 3 (translation x=5, y=10)
      ],
    }),
  };

  const mockLineIDsEmpty = {
    size: () => 0,
    get: () => 0,
  };

  const mockLineIDsWithOne = {
    size: () => 1,
    get: () => 1001,
  };

  let lineIDsCallCount = 0;

  return {
    IfcAPI: vi.fn().mockImplementation(() => ({
      SetWasmPath: vi.fn(),
      Init: vi.fn().mockResolvedValue(undefined),
      OpenModel: vi.fn().mockReturnValue(0),
      CreateModel: vi.fn().mockReturnValue(1),
      CloseModel: vi.fn(),
      WriteLine: vi.fn(),
      SaveModel: vi.fn().mockReturnValue(new Uint8Array([73, 83, 79])), // "ISO" bytes
      GetLineIDsWithType: vi.fn().mockImplementation((_, type) => {
        // Return walls for IFCWALL type
        if (type === 2391406946 || type === 3512223829) {
          return mockLineIDsWithOne;
        }
        return mockLineIDsEmpty;
      }),
      GetLine: vi.fn().mockReturnValue({
        GlobalId: { value: "test-global-id-123" },
        Name: { value: "Test Wall" },
      }),
      GetFlatMesh: vi.fn().mockReturnValue({
        geometries: mockGeometries,
      }),
      GetPropertySets: vi.fn().mockReturnValue([]),
    })),
    Schemas: {
      IFC4: "IFC4",
    },
  };
});

describe("IfcParser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("IfcParser class", () => {
    it("should initialize without errors", async () => {
      const { IfcParser } = await import("./ifcParser");
      const parser = new IfcParser();

      await expect(parser.init()).resolves.not.toThrow();
    });

    it("should parse buffer and return result", async () => {
      const { IfcParser } = await import("./ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const result = await parser.parseBuffer(mockIfc);

      expect(result).toHaveProperty("elements");
      expect(result).toHaveProperty("stats");
      expect(result).toHaveProperty("warnings");
      expect(Array.isArray(result.elements)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("should extract wall elements", async () => {
      const { IfcParser } = await import("./ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const result = await parser.parseBuffer(mockIfc);

      // Should have found 1 wall from mock
      expect(result.stats.walls).toBeGreaterThanOrEqual(1);
    });

    it("should create valid Element objects", async () => {
      const { IfcParser } = await import("./ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const result = await parser.parseBuffer(mockIfc);

      if (result.elements.length > 0) {
        const element = result.elements[0];

        // Check required Element properties
        expect(element).toHaveProperty("id");
        expect(element).toHaveProperty("type");
        expect(element).toHaveProperty("name");
        expect(element).toHaveProperty("x");
        expect(element).toHaveProperty("y");
        expect(element).toHaveProperty("width");
        expect(element).toHaveProperty("height");
        expect(element).toHaveProperty("properties");
        expect(element).toHaveProperty("relationships");
        expect(element).toHaveProperty("issues");
        expect(element).toHaveProperty("aiSuggestions");

        // Type should be valid
        expect(["wall", "door", "window", "room", "floor", "roof", "column", "beam", "stair"]).toContain(element.type);
      }
    });

    it("should clean up on dispose", async () => {
      const { IfcParser } = await import("./ifcParser");
      const parser = new IfcParser();

      await parser.init();
      parser.dispose();

      // Should be able to init again after dispose
      await expect(parser.init()).resolves.not.toThrow();
    });
  });

  describe("parseIfcString", () => {
    it("should parse IFC content string", async () => {
      const { parseIfcString } = await import("./ifcParser");

      const mockIfcContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('test.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
ENDSEC;
END-ISO-10303-21;`;

      const result = await parseIfcString(mockIfcContent);

      expect(result).toHaveProperty("elements");
      expect(result).toHaveProperty("stats");
    });
  });

  describe("getIfcParser", () => {
    it("should return singleton instance", async () => {
      const { getIfcParser } = await import("./ifcParser");

      const parser1 = getIfcParser();
      const parser2 = getIfcParser();

      expect(parser1).toBe(parser2);
    });
  });

  describe("IfcImportStats", () => {
    it("should have correct structure", () => {
      const stats: IfcImportStats = {
        totalEntities: 0,
        walls: 0,
        doors: 0,
        windows: 0,
        rooms: 0,
        floors: 0,
        roofs: 0,
        columns: 0,
        beams: 0,
        stairs: 0,
        openings: 0,
        unsupported: 0,
      };

      expect(stats.totalEntities).toBe(0);
      expect(stats.walls).toBe(0);
      expect(stats.doors).toBe(0);
    });
  });

  describe("IfcImportResult", () => {
    it("should have correct structure", () => {
      const result: IfcImportResult = {
        elements: [],
        stats: {
          totalEntities: 10,
          walls: 5,
          doors: 2,
          windows: 3,
          rooms: 0,
          floors: 0,
          roofs: 0,
          columns: 0,
          beams: 0,
          stairs: 0,
          openings: 0,
          unsupported: 0,
        },
        warnings: ["Test warning"],
      };

      expect(result.elements).toHaveLength(0);
      expect(result.stats.totalEntities).toBe(10);
      expect(result.warnings).toContain("Test warning");
    });
  });
});

describe("IFC Element Type Mapping", () => {
  it("should map IFC types to Pensaer types correctly", async () => {
    // This tests the type mapping conceptually
    const expectedMappings = {
      IfcWall: "wall",
      IfcWallStandardCase: "wall",
      IfcDoor: "door",
      IfcWindow: "window",
      IfcSlab: "floor",
      IfcSpace: "room",
      IfcRoof: "roof",
      IfcColumn: "column",
      IfcBeam: "beam",
      IfcStair: "stair",
    };

    // Verify all element types are valid Pensaer types
    const validTypes = ["wall", "door", "window", "room", "floor", "roof", "column", "beam", "stair"];

    for (const pensaerType of Object.values(expectedMappings)) {
      expect(validTypes).toContain(pensaerType);
    }
  });
});

// ============================================
// EXPORT TESTS
// ============================================

describe("IFC Export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("exportElements", () => {
    it("should export elements and return result", async () => {
      const { IfcParser } = await import("./ifcParser");
      const parser = new IfcParser();

      const elements: Element[] = [
        {
          id: "wall-001",
          type: "wall",
          name: "Test Wall",
          x: 500,
          y: 400,
          width: 100,
          height: 20,
          properties: {},
          relationships: {},
          issues: [],
          aiSuggestions: [],
        },
      ];

      const result = await parser.exportElements(elements);

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("filename");
      expect(result).toHaveProperty("stats");
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.filename).toContain(".ifc");
    });

    it("should track export stats correctly", async () => {
      const { IfcParser } = await import("./ifcParser");
      const parser = new IfcParser();

      const elements: Element[] = [
        {
          id: "wall-001",
          type: "wall",
          name: "Wall 1",
          x: 500,
          y: 400,
          width: 100,
          height: 20,
          properties: {},
          relationships: {},
          issues: [],
          aiSuggestions: [],
        },
        {
          id: "door-001",
          type: "door",
          name: "Door 1",
          x: 550,
          y: 400,
          width: 90,
          height: 24,
          properties: {},
          relationships: {},
          issues: [],
          aiSuggestions: [],
        },
      ];

      const result = await parser.exportElements(elements);

      expect(result.stats.walls).toBe(1);
      expect(result.stats.doors).toBe(1);
      expect(result.stats.totalEntities).toBe(2);
    });

    it("should use custom project name", async () => {
      const { IfcParser } = await import("./ifcParser");
      const parser = new IfcParser();

      const elements: Element[] = [];

      const result = await parser.exportElements(elements, {
        projectName: "My Custom Project",
      });

      expect(result.filename).toBe("My_Custom_Project.ifc");
    });

    it("should handle empty elements array", async () => {
      const { IfcParser } = await import("./ifcParser");
      const parser = new IfcParser();

      const result = await parser.exportElements([]);

      expect(result.stats.totalEntities).toBe(0);
      expect(result.data).toBeInstanceOf(Uint8Array);
    });
  });

  describe("exportToIfc convenience function", () => {
    it("should export elements using convenience function", async () => {
      const { exportToIfc } = await import("./ifcParser");

      const elements: Element[] = [
        {
          id: "window-001",
          type: "window",
          name: "Window 1",
          x: 500,
          y: 200,
          width: 120,
          height: 24,
          properties: {},
          relationships: {},
          issues: [],
          aiSuggestions: [],
        },
      ];

      const result = await exportToIfc(elements);

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("stats");
      expect(result.stats.windows).toBe(1);
    });
  });

  describe("IfcExportStats", () => {
    it("should have correct structure", () => {
      const stats: IfcExportStats = {
        totalEntities: 10,
        walls: 4,
        doors: 2,
        windows: 3,
        rooms: 1,
        floors: 0,
        roofs: 0,
        columns: 0,
        beams: 0,
        stairs: 0,
      };

      expect(stats.totalEntities).toBe(10);
      expect(stats.walls).toBe(4);
      expect(stats.doors).toBe(2);
      expect(stats.windows).toBe(3);
      expect(stats.rooms).toBe(1);
    });
  });

  describe("IfcExportResult", () => {
    it("should have correct structure", () => {
      const result: IfcExportResult = {
        data: new Uint8Array([1, 2, 3]),
        filename: "test.ifc",
        stats: {
          totalEntities: 5,
          walls: 2,
          doors: 1,
          windows: 2,
          rooms: 0,
          floors: 0,
          roofs: 0,
          columns: 0,
          beams: 0,
          stairs: 0,
        },
      };

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.filename).toBe("test.ifc");
      expect(result.stats.totalEntities).toBe(5);
    });
  });
});
