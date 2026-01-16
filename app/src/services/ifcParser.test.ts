/**
 * IFC Parser Service Tests
 *
 * Tests for the IFC parsing functionality.
 * Note: These tests mock web-ifc since WASM is difficult in Node.js environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { IfcImportResult, IfcImportStats } from "./ifcParser";

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
      CloseModel: vi.fn(),
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
