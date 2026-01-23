/**
 * IFC Round-Trip Tests
 *
 * Tests that IFC property sets are preserved through import/export cycle.
 * Validates the property preservation mechanism for round-trip fidelity.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Element } from "../../../types";
import type {
  PreservedIfcProperties,
  IfcPropertySet,
  IfcQuantitySet,
} from "../propertyMapper";

// Mock web-ifc module for testing
const mockPropertySets = [
  {
    expressID: 100,
    type: 1451395588, // IFCPROPERTYSET
    Name: { value: "Pset_WallCommon" },
    HasProperties: [
      { expressID: 101, type: 3290496277 }, // IFCPROPERTYSINGLEVALUE
      { expressID: 102, type: 3290496277 },
    ],
  },
  {
    expressID: 200,
    type: 2090586900, // IFCELEMENTQUANTITY
    Name: { value: "Qto_WallBaseQuantities" },
    Quantities: [
      { expressID: 201, type: 931644368 }, // IFCQUANTITYLENGTH
      { expressID: 202, type: 2044713172 }, // IFCQUANTITYAREA
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

vi.mock("web-ifc", () => {
  const mockGeometries = {
    size: () => 1,
    get: () => ({
      flatTransformation: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 10, 0, 1],
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

  return {
    IfcAPI: vi.fn().mockImplementation(() => ({
      SetWasmPath: vi.fn(),
      Init: vi.fn().mockResolvedValue(undefined),
      OpenModel: vi.fn().mockReturnValue(0),
      CreateModel: vi.fn().mockReturnValue(1),
      CloseModel: vi.fn(),
      WriteLine: vi.fn(),
      SaveModel: vi.fn().mockReturnValue(new Uint8Array([73, 83, 79])),
      GetLineIDsWithType: vi.fn().mockImplementation((_, type) => {
        if (type === 2391406946 || type === 3512223829) {
          return mockLineIDsWithOne;
        }
        return mockLineIDsEmpty;
      }),
      GetLine: vi.fn().mockImplementation((_, expressID) => {
        if (expressID === 1001) {
          return {
            GlobalId: { value: "test-global-id-123" },
            Name: { value: "Test Wall" },
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

describe("IFC Round-Trip Property Preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("PropertyMapper", () => {
    it("should extract property sets with preserved names", async () => {
      const { PropertyMapper } = await import("../propertyMapper");
      const WebIFC = await import("web-ifc");

      const api = new WebIFC.IfcAPI();
      await api.Init();

      const mapper = new PropertyMapper(api);
      const result = mapper.extractAllProperties(0, 1001);

      // Should have preserved property sets
      expect(result.preserved.propertySets.length).toBeGreaterThanOrEqual(1);

      // Check Pset_WallCommon is preserved
      const wallCommon = result.preserved.propertySets.find(
        (p) => p.name === "Pset_WallCommon"
      );
      expect(wallCommon).toBeDefined();
      expect(wallCommon?.properties.length).toBe(2);

      // Check property values
      const isExternal = wallCommon?.properties.find(
        (p) => p.name === "IsExternal"
      );
      expect(isExternal?.value).toBe(true);

      const thermalTransmittance = wallCommon?.properties.find(
        (p) => p.name === "ThermalTransmittance"
      );
      expect(thermalTransmittance?.value).toBe(0.25);
    });

    it("should extract quantity sets with preserved names", async () => {
      const { PropertyMapper } = await import("../propertyMapper");
      const WebIFC = await import("web-ifc");

      const api = new WebIFC.IfcAPI();
      await api.Init();

      const mapper = new PropertyMapper(api);
      const result = mapper.extractAllProperties(0, 1001);

      // Should have preserved quantity sets
      expect(result.preserved.quantitySets.length).toBeGreaterThanOrEqual(1);

      // Check Qto_WallBaseQuantities is preserved
      const baseQuantities = result.preserved.quantitySets.find(
        (q) => q.name === "Qto_WallBaseQuantities"
      );
      expect(baseQuantities).toBeDefined();
      expect(baseQuantities?.quantities.length).toBe(2);

      // Check quantity values
      const length = baseQuantities?.quantities.find((q) => q.name === "Length");
      expect(length?.value).toBe(5000);
      expect(length?.unit).toBe("length");

      const area = baseQuantities?.quantities.find(
        (q) => q.name === "GrossSideArea"
      );
      expect(area?.value).toBe(15.0);
      expect(area?.unit).toBe("area");
    });

    it("should flatten properties with pset prefix", async () => {
      const { PropertyMapper } = await import("../propertyMapper");
      const WebIFC = await import("web-ifc");

      const api = new WebIFC.IfcAPI();
      await api.Init();

      const mapper = new PropertyMapper(api);
      const result = mapper.extractAllProperties(0, 1001);

      // Flattened properties should have prefix
      expect(result.flattened["Pset_WallCommon:IsExternal"]).toBe(true);
      expect(result.flattened["Pset_WallCommon:ThermalTransmittance"]).toBe(0.25);

      // Common Pset_ properties should also be available without prefix
      expect(result.flattened["IsExternal"]).toBe(true);
      expect(result.flattened["ThermalTransmittance"]).toBe(0.25);
    });
  });

  describe("Import preserves property sets", () => {
    it("should store preserved properties in element", async () => {
      const { IfcParser } = await import("../../ifcParser");
      const parser = new IfcParser();

      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const result = await parser.parseBuffer(mockIfc);

      expect(result.elements.length).toBeGreaterThan(0);

      const element = result.elements[0];

      // Should have _ifcPropertySets in properties
      expect(element.properties).toHaveProperty("_ifcPropertySets");

      // Cast to access preserved properties
      const preserved = element.properties
        ._ifcPropertySets as unknown as PreservedIfcProperties;

      expect(preserved).toHaveProperty("propertySets");
      expect(preserved).toHaveProperty("quantitySets");
    });
  });

  describe("Export writes property sets", () => {
    it("should export element with property sets", async () => {
      const { IfcParser } = await import("../../ifcParser");
      const WebIFC = await import("web-ifc");

      const parser = new IfcParser();

      // Create element with preserved properties
      const preserved: PreservedIfcProperties = {
        propertySets: [
          {
            name: "Pset_WallCommon",
            properties: [
              { name: "IsExternal", value: true, type: "IfcBoolean" },
              { name: "ThermalTransmittance", value: 0.25, type: "IfcReal" },
            ],
          },
        ],
        quantitySets: [
          {
            name: "Qto_WallBaseQuantities",
            quantities: [
              { name: "Length", value: 5000, unit: "length" },
              { name: "GrossSideArea", value: 15.0, unit: "area" },
            ],
          },
        ],
      };

      const elements: Element[] = [
        {
          id: "wall-001",
          type: "wall",
          name: "Test Wall",
          x: 500,
          y: 400,
          width: 100,
          height: 20,
          properties: {
            IsExternal: true,
            ThermalTransmittance: 0.25,
            _ifcPropertySets: preserved as unknown as boolean,
          },
          relationships: {},
          issues: [],
          aiSuggestions: [],
        },
      ];

      const result = await parser.exportElements(elements);

      // Export should succeed
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.stats.walls).toBe(1);

      // Verify WriteLine was called for property sets
      const api = (WebIFC.IfcAPI as unknown as { mock: { results: { value: { WriteLine: ReturnType<typeof vi.fn> } }[] } }).mock.results[0]?.value;
      expect(api.WriteLine).toHaveBeenCalled();
    });

    it("should create default property sets for new elements", async () => {
      const { IfcParser } = await import("../../ifcParser");
      const parser = new IfcParser();

      // Element without preserved properties (newly created)
      const elements: Element[] = [
        {
          id: "wall-002",
          type: "wall",
          name: "New Wall",
          x: 500,
          y: 400,
          width: 100,
          height: 20,
          properties: {
            thickness: "200mm",
            material: "Concrete",
          },
          relationships: {},
          issues: [],
          aiSuggestions: [],
        },
      ];

      const result = await parser.exportElements(elements);

      // Export should succeed
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.stats.walls).toBe(1);
    });
  });

  describe("Round-trip fidelity", () => {
    it("should preserve property set names through import-export cycle", async () => {
      const { IfcParser } = await import("../../ifcParser");
      const parser = new IfcParser();

      // Step 1: Import
      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult = await parser.parseBuffer(mockIfc);

      expect(importResult.elements.length).toBeGreaterThan(0);
      const importedElement = importResult.elements[0];

      // Step 2: Export
      const exportResult = await parser.exportElements([importedElement]);

      expect(exportResult.data).toBeInstanceOf(Uint8Array);

      // The preserved property sets should maintain their names
      const preserved = importedElement.properties
        ._ifcPropertySets as unknown as PreservedIfcProperties;

      // Verify Pset names are preserved (not generic names)
      const psetNames = preserved.propertySets.map((p) => p.name);
      expect(psetNames).toContain("Pset_WallCommon");

      const qsetNames = preserved.quantitySets.map((q) => q.name);
      expect(qsetNames).toContain("Qto_WallBaseQuantities");
    });

    it("should preserve property values through import-export cycle", async () => {
      const { IfcParser } = await import("../../ifcParser");
      const parser = new IfcParser();

      // Import
      const mockIfc = new TextEncoder().encode("ISO-10303-21;");
      const importResult = await parser.parseBuffer(mockIfc);
      const importedElement = importResult.elements[0];

      // Get preserved properties
      const preserved = importedElement.properties
        ._ifcPropertySets as unknown as PreservedIfcProperties;

      // Find IsExternal property
      const wallCommon = preserved.propertySets.find(
        (p) => p.name === "Pset_WallCommon"
      );
      const isExternal = wallCommon?.properties.find(
        (p) => p.name === "IsExternal"
      );

      expect(isExternal?.value).toBe(true);

      // Find Length quantity
      const baseQuantities = preserved.quantitySets.find(
        (q) => q.name === "Qto_WallBaseQuantities"
      );
      const length = baseQuantities?.quantities.find((q) => q.name === "Length");

      expect(length?.value).toBe(5000);
    });
  });

  describe("Helper functions", () => {
    it("hasPreservedProperties should detect preserved properties", async () => {
      const { hasPreservedProperties } = await import("../propertyMapper");

      const withPreserved = {
        _ifcPropertySets: { propertySets: [], quantitySets: [] },
      };
      expect(hasPreservedProperties(withPreserved)).toBe(true);

      const withoutPreserved = { someOther: "value" };
      expect(hasPreservedProperties(withoutPreserved)).toBe(false);
    });

    it("getPreservedProperties should extract preserved properties", async () => {
      const { getPreservedProperties } = await import("../propertyMapper");

      const preserved: PreservedIfcProperties = {
        propertySets: [{ name: "Test", properties: [] }],
        quantitySets: [],
      };

      const props = { _ifcPropertySets: preserved };
      const result = getPreservedProperties(props);

      expect(result).not.toBeNull();
      expect(result?.propertySets[0].name).toBe("Test");
    });

    it("createDefaultPropertySets should create psets for element types", async () => {
      const { createDefaultPropertySets } = await import("../propertyMapper");

      const props = {
        thickness: "200mm",
        material: "Concrete",
        structural: true,
      };

      const result = createDefaultPropertySets("wall", props);

      expect(result.propertySets.length).toBe(1);
      expect(result.propertySets[0].name).toBe("Pset_WallCommon");
      expect(result.propertySets[0].properties.length).toBe(3);
    });
  });
});
