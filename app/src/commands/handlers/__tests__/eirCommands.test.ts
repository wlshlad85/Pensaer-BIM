/**
 * Tests for EIR/BEP command handlers and validation engine.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  validateElementRequirement,
  validateAgainstEIR,
  buildElementComplianceMap,
  formatEIRReport,
  inferGeometryDetail,
  inferInformationDetail,
  validateProperty,
} from "../../../utils/eirValidation";
import { generateBEP, formatBEPSummary } from "../../../utils/bepGenerator";
import { SAMPLE_OFFICE_EIR } from "../../../data/sampleEIR";
import { useEIRStore } from "../../../stores/eirStore";
import type { Element } from "../../../types/elements";
import type {
  EIRTemplate,
  ElementRequirement,
  RequiredProperty,
} from "../../../types/eir";

// ============================================
// TEST HELPERS
// ============================================

function makeWall(overrides: Partial<Element> = {}): Element {
  return {
    id: `wall-${Math.random().toString(36).slice(2, 8)}`,
    type: "wall",
    name: "Test Wall",
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    properties: {
      thickness: 200,
      height: 3000,
      isExternal: true,
      material: "Concrete",
      fireRating: "60min",
    },
    relationships: {},
    issues: [],
    aiSuggestions: [],
    ...overrides,
  } as Element;
}

function makeFloor(overrides: Partial<Element> = {}): Element {
  return {
    id: `floor-${Math.random().toString(36).slice(2, 8)}`,
    type: "floor",
    name: "Test Floor",
    x: 0,
    y: 0,
    width: 500,
    height: 500,
    properties: {
      area: 1500,
      level: "Level 1",
      thickness: 300,
    },
    relationships: {},
    issues: [],
    aiSuggestions: [],
    ...overrides,
  } as Element;
}

function makeRoom(overrides: Partial<Element> = {}): Element {
  return {
    id: `room-${Math.random().toString(36).slice(2, 8)}`,
    type: "room",
    name: "Test Room",
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    properties: {
      area: 120,
      function: "Office",
    },
    relationships: {},
    issues: [],
    aiSuggestions: [],
    ...overrides,
  } as Element;
}

// ============================================
// SAMPLE EIR TEMPLATE TESTS
// ============================================

describe("Sample EIR Template", () => {
  it("has valid structure", () => {
    expect(SAMPLE_OFFICE_EIR.version).toBe("1.0.0");
    expect(SAMPLE_OFFICE_EIR.id).toBeTruthy();
    expect(SAMPLE_OFFICE_EIR.projectName).toContain("Office");
    expect(SAMPLE_OFFICE_EIR.standards.length).toBeGreaterThan(0);
    expect(SAMPLE_OFFICE_EIR.dataDrops.length).toBe(3);
    expect(SAMPLE_OFFICE_EIR.globalRequirements.length).toBeGreaterThan(0);
  });

  it("has progressive data drops", () => {
    const drops = SAMPLE_OFFICE_EIR.dataDrops;
    expect(drops[0].stage).toBe("2-concept-design");
    expect(drops[1].stage).toBe("3-spatial-coordination");
    expect(drops[2].stage).toBe("4-technical-design");
  });

  it("data drop requirements increase over stages", () => {
    const drops = SAMPLE_OFFICE_EIR.dataDrops;
    // DD1 has fewer requirements than DD2
    expect(drops[0].requirements.length).toBeLessThanOrEqual(drops[1].requirements.length);
  });
});

// ============================================
// PROPERTY VALIDATION TESTS
// ============================================

describe("validateProperty", () => {
  const element = makeWall();

  it("passes when required property exists", () => {
    const req: RequiredProperty = {
      name: "thickness",
      label: "Thickness",
      valueType: "number",
      required: true,
    };
    expect(validateProperty(element, req).ok).toBe(true);
  });

  it("fails when required property is missing", () => {
    const req: RequiredProperty = {
      name: "nonexistent",
      label: "Nonexistent",
      valueType: "string",
      required: true,
    };
    const result = validateProperty(element, req);
    expect(result.ok).toBe(false);
    expect(result.issue).toContain("Missing required property");
  });

  it("passes when optional property is missing", () => {
    const req: RequiredProperty = {
      name: "nonexistent",
      label: "Optional",
      valueType: "string",
      required: false,
    };
    expect(validateProperty(element, req).ok).toBe(true);
  });

  it("validates regex constraint on string", () => {
    const req: RequiredProperty = {
      name: "fireRating",
      label: "Fire Rating",
      valueType: "string",
      required: true,
      constraint: "^(30|60|90|120)min$",
    };
    expect(validateProperty(element, req).ok).toBe(true);

    const badElement = makeWall({ properties: { ...element.properties, fireRating: "bad" } });
    expect(validateProperty(badElement, req).ok).toBe(false);
  });
});

// ============================================
// GEOMETRY DETAIL INFERENCE TESTS
// ============================================

describe("inferGeometryDetail", () => {
  it("returns none for empty properties", () => {
    const el = makeWall({ properties: {} });
    expect(inferGeometryDetail(el)).toBe("none");
  });

  it("returns schematic for single dimension", () => {
    const el = makeWall({ properties: { width: 100 } });
    expect(inferGeometryDetail(el)).toBe("schematic");
  });

  it("returns approximate or higher for multiple dimensions", () => {
    const el = makeWall({ properties: { width: 100, height: 200, thickness: 50 } });
    const detail = inferGeometryDetail(el);
    expect(["approximate", "detailed", "manufacturer"]).toContain(detail);
  });
});

// ============================================
// INFORMATION DETAIL INFERENCE TESTS
// ============================================

describe("inferInformationDetail", () => {
  it("returns basic for no required props", () => {
    const el = makeWall();
    expect(inferInformationDetail(el, [])).toBe("basic");
  });

  it("returns as-built when all required props filled", () => {
    const el = makeWall();
    const reqs: RequiredProperty[] = [
      { name: "thickness", label: "t", valueType: "number", required: true },
    ];
    expect(inferInformationDetail(el, reqs)).toBe("as-built");
  });

  it("returns none when no required props filled", () => {
    const el = makeWall({ properties: {} });
    const reqs: RequiredProperty[] = [
      { name: "thickness", label: "t", valueType: "number", required: true },
      { name: "material", label: "m", valueType: "string", required: true },
    ];
    expect(inferInformationDetail(el, reqs)).toBe("none");
  });
});

// ============================================
// ELEMENT REQUIREMENT VALIDATION TESTS
// ============================================

describe("validateElementRequirement", () => {
  it("passes when elements meet all requirements", () => {
    const walls = Array.from({ length: 4 }, () => makeWall());
    const req: ElementRequirement = {
      elementType: "wall",
      minCount: 4,
      levelOfInformationNeed: {
        geometry: "schematic",
        information: "basic",
        documentation: "none",
      },
      requiredProperties: [
        { name: "thickness", label: "Thickness", valueType: "number", required: true },
      ],
    };

    const result = validateElementRequirement(walls, req, "test");
    expect(result.status).toBe("pass");
    expect(result.foundCount).toBe(4);
  });

  it("fails when count is below minimum", () => {
    const walls = [makeWall()];
    const req: ElementRequirement = {
      elementType: "wall",
      minCount: 5,
      levelOfInformationNeed: {
        geometry: "none",
        information: "none",
        documentation: "none",
      },
      requiredProperties: [],
    };

    const result = validateElementRequirement(walls, req, "test");
    expect(result.status).toBe("fail");
    expect(result.details).toContain("Expected at least 5");
  });

  it("fails when required properties are missing", () => {
    const walls = [makeWall({ properties: {} })];
    const req: ElementRequirement = {
      elementType: "wall",
      minCount: 1,
      levelOfInformationNeed: {
        geometry: "none",
        information: "none",
        documentation: "none",
      },
      requiredProperties: [
        { name: "thickness", label: "Thickness", valueType: "number", required: true },
      ],
    };

    const result = validateElementRequirement(walls, req, "test");
    expect(result.status).toBe("fail");
    expect(result.propertyIssues.length).toBeGreaterThan(0);
  });
});

// ============================================
// FULL EIR VALIDATION TESTS
// ============================================

describe("validateAgainstEIR", () => {
  const minimalEIR: EIRTemplate = {
    version: "1.0.0",
    id: "test-eir",
    projectName: "Test Project",
    appointingParty: "Test Client",
    createdDate: "2025-01-01T00:00:00Z",
    standards: ["ISO 19650"],
    globalRequirements: [
      {
        elementType: "wall",
        minCount: 1,
        levelOfInformationNeed: { geometry: "none", information: "none", documentation: "none" },
        requiredProperties: [],
      },
    ],
    dataDrops: [
      {
        id: "dd1",
        name: "Drop 1",
        deadline: "2025-06-01",
        stage: "2-concept-design",
        description: "Test drop",
        requirements: [
          {
            elementType: "floor",
            minCount: 2,
            levelOfInformationNeed: { geometry: "schematic", information: "basic", documentation: "none" },
            requiredProperties: [
              { name: "area", label: "Area", valueType: "number", required: true },
            ],
          },
        ],
      },
    ],
  };

  it("generates report with correct summary", () => {
    const elements = [makeWall(), makeFloor(), makeFloor()];
    const report = validateAgainstEIR(elements, minimalEIR);

    expect(report.eirId).toBe("test-eir");
    expect(report.items.length).toBe(2); // 1 global + 1 data drop
    expect(report.summary.total).toBe(2);
  });

  it("can filter by data drop", () => {
    const elements = [makeWall(), makeFloor()];
    const report = validateAgainstEIR(elements, minimalEIR, "dd1");

    // Only dd1 requirements + global
    expect(report.dataDropId).toBe("dd1");
  });

  it("reports failures correctly", () => {
    const elements: Element[] = []; // Empty model
    const report = validateAgainstEIR(elements, minimalEIR);

    expect(report.summary.failed).toBeGreaterThan(0);
  });
});

// ============================================
// COMPLIANCE MAP TESTS
// ============================================

describe("buildElementComplianceMap", () => {
  it("maps non-compliant elements", () => {
    const elements = [makeWall({ id: "w1" as any, properties: {} })];
    const eir: EIRTemplate = {
      version: "1.0.0",
      id: "test",
      projectName: "Test",
      appointingParty: "Client",
      createdDate: "2025-01-01",
      standards: [],
      globalRequirements: [
        {
          elementType: "wall",
          minCount: 1,
          levelOfInformationNeed: { geometry: "none", information: "none", documentation: "none" },
          requiredProperties: [
            { name: "thickness", label: "t", valueType: "number", required: true },
          ],
        },
      ],
      dataDrops: [],
    };

    const report = validateAgainstEIR(elements, eir);
    const map = buildElementComplianceMap(report);

    expect(map["w1"]).toBeDefined();
    expect(map["w1"].status).toBe("fail");
  });
});

// ============================================
// REPORT FORMATTING TESTS
// ============================================

describe("formatEIRReport", () => {
  it("produces readable output", () => {
    const elements = [makeWall(), makeFloor()];
    const eir: EIRTemplate = {
      version: "1.0.0",
      id: "fmt-test",
      projectName: "Format Test",
      appointingParty: "Client",
      createdDate: "2025-01-01",
      standards: [],
      globalRequirements: [],
      dataDrops: [
        {
          id: "dd1",
          name: "Drop 1",
          deadline: "2025-06-01",
          stage: "2-concept-design",
          description: "Test",
          requirements: [
            {
              elementType: "wall",
              minCount: 1,
              levelOfInformationNeed: { geometry: "none", information: "none", documentation: "none" },
              requiredProperties: [],
            },
          ],
        },
      ],
    };

    const report = validateAgainstEIR(elements, eir);
    const formatted = formatEIRReport(report);

    expect(formatted).toContain("EIR COMPLIANCE REPORT");
    expect(formatted).toContain("fmt-test");
    expect(formatted).toContain("wall");
  });
});

// ============================================
// BEP GENERATION TESTS
// ============================================

describe("generateBEP", () => {
  it("generates BEP from EIR and elements", () => {
    const elements = [makeWall(), makeFloor(), makeRoom()];
    const bep = generateBEP(SAMPLE_OFFICE_EIR, elements);

    expect(bep.eirId).toBe(SAMPLE_OFFICE_EIR.id);
    expect(bep.projectName).toBe(SAMPLE_OFFICE_EIR.projectName);
    expect(bep.projectTeam.length).toBeGreaterThan(0);
    // Global + 3 data drops
    expect(bep.dataDropResponses.length).toBe(4);
    expect(bep.softwarePlatforms).toContain("Pensaer BIM Platform v0.1.0");
  });

  it("uses custom org name", () => {
    const bep = generateBEP(SAMPLE_OFFICE_EIR, [], "Acme Architects");
    expect(bep.leadAppointedParty).toBe("Acme Architects");
  });

  it("notes existing elements in delivery approaches", () => {
    const walls = Array.from({ length: 3 }, () => makeWall());
    const bep = generateBEP(SAMPLE_OFFICE_EIR, walls);

    // Find any response that has a wall delivery approach with notes about existing elements
    const allApproaches = bep.dataDropResponses.flatMap((r) => r.deliveryApproaches);
    const wallApproach = allApproaches.find(
      (a) => a.elementType === "wall" && a.notes && a.notes.includes("already in model")
    );
    expect(wallApproach).toBeDefined();
    expect(wallApproach!.notes).toContain("3 element(s) already in model");
  });
});

describe("formatBEPSummary", () => {
  it("produces readable output", () => {
    const bep = generateBEP(SAMPLE_OFFICE_EIR, []);
    const summary = formatBEPSummary(bep);

    expect(summary).toContain("BIM EXECUTION PLAN");
    expect(summary).toContain(SAMPLE_OFFICE_EIR.projectName.substring(0, 30));
  });
});

// ============================================
// EIR STORE TESTS
// ============================================

describe("useEIRStore", () => {
  beforeEach(() => {
    useEIRStore.setState({
      loadedEIR: null,
      loadedBEP: null,
      validationReport: null,
      isValidating: false,
      elementComplianceMap: {},
      elementComplianceMessages: {},
    });
  });

  it("loads and clears EIR", () => {
    const store = useEIRStore.getState();
    store.loadEIR(SAMPLE_OFFICE_EIR);
    expect(useEIRStore.getState().loadedEIR).toBe(SAMPLE_OFFICE_EIR);

    store.clearEIR();
    expect(useEIRStore.getState().loadedEIR).toBeNull();
  });

  it("tracks element compliance", () => {
    const store = useEIRStore.getState();
    store.setElementCompliance("w1", "fail", ["Missing thickness"]);

    const state = useEIRStore.getState();
    expect(state.elementComplianceMap["w1"]).toBe("fail");
    expect(state.elementComplianceMessages["w1"]).toEqual(["Missing thickness"]);
  });

  it("clears compliance on new EIR load", () => {
    const store = useEIRStore.getState();
    store.setElementCompliance("w1", "fail", ["err"]);
    store.loadEIR(SAMPLE_OFFICE_EIR);

    expect(useEIRStore.getState().elementComplianceMap).toEqual({});
  });
});
