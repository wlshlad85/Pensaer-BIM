/**
 * Sample EIR Template — Typical Office Building Project
 *
 * This is a reference EIR template following ISO 19650 principles
 * for a multi-storey office building project.
 */

import type { EIRTemplate } from "../types/eir";

export const SAMPLE_OFFICE_EIR: EIRTemplate = {
  version: "1.0.0",
  id: "eir-office-2025-001",
  projectName: "Phoenix House — 8-Storey Office Development",
  appointingParty: "Meridian Properties Ltd",
  createdDate: "2025-01-15T00:00:00Z",
  description:
    "Exchange Information Requirements for a new-build 8-storey commercial office " +
    "building in central London. GIA ~12,000m². BREEAM Excellent target.",
  standards: [
    "ISO 19650-1:2018",
    "ISO 19650-2:2018",
    "BS EN 17412-1:2020 (Level of Information Need)",
    "UK BIM Framework",
  ],

  // ──────────────────────────────────────────
  // GLOBAL REQUIREMENTS (apply to all stages)
  // ──────────────────────────────────────────
  globalRequirements: [
    {
      elementType: "wall",
      minCount: 1,
      levelOfInformationNeed: {
        geometry: "schematic",
        information: "basic",
        documentation: "none",
      },
      requiredProperties: [
        {
          name: "thickness",
          label: "Wall Thickness",
          valueType: "number",
          required: true,
          description: "Nominal wall thickness in mm",
        },
      ],
      notes: "All walls must have at minimum a thickness property at every stage",
    },
  ],

  // ──────────────────────────────────────────
  // DATA DROPS
  // ──────────────────────────────────────────
  dataDrops: [
    // ── DD1: Concept Design ──
    {
      id: "dd1-concept",
      name: "Data Drop 1 — Concept Design",
      deadline: "2025-04-01T00:00:00Z",
      stage: "2-concept-design",
      description:
        "Concept-level model showing overall massing, floor plates, " +
        "core positions, and principal structural grid.",
      requirements: [
        {
          elementType: "floor",
          minCount: 8,
          levelOfInformationNeed: {
            geometry: "approximate",
            information: "basic",
            documentation: "none",
          },
          requiredProperties: [
            {
              name: "area",
              label: "Floor Area",
              valueType: "number",
              required: true,
              description: "Gross internal area in m²",
            },
            {
              name: "level",
              label: "Level",
              valueType: "string",
              required: true,
              description: "Level/storey identifier",
            },
          ],
          notes: "One floor slab per storey minimum",
        },
        {
          elementType: "wall",
          minCount: 4,
          levelOfInformationNeed: {
            geometry: "approximate",
            information: "preliminary",
            documentation: "none",
          },
          requiredProperties: [
            {
              name: "thickness",
              label: "Wall Thickness",
              valueType: "number",
              required: true,
            },
            {
              name: "height",
              label: "Wall Height",
              valueType: "number",
              required: true,
            },
            {
              name: "isExternal",
              label: "External Wall",
              valueType: "boolean",
              required: true,
              description: "Whether this is an external envelope wall",
            },
          ],
          notes: "Core walls and principal external walls",
        },
        {
          elementType: "column",
          minCount: 4,
          levelOfInformationNeed: {
            geometry: "approximate",
            information: "basic",
            documentation: "none",
          },
          requiredProperties: [
            {
              name: "width",
              label: "Column Width",
              valueType: "number",
              required: true,
            },
            {
              name: "height",
              label: "Column Height",
              valueType: "number",
              required: true,
            },
          ],
          notes: "Primary structural columns showing grid layout",
        },
        {
          elementType: "room",
          minCount: 2,
          levelOfInformationNeed: {
            geometry: "schematic",
            information: "basic",
            documentation: "none",
          },
          requiredProperties: [
            {
              name: "area",
              label: "Room Area",
              valueType: "number",
              required: true,
            },
            {
              name: "function",
              label: "Room Function",
              valueType: "string",
              required: true,
              description: "Primary function (e.g. Office, Core, Reception)",
            },
          ],
          notes: "Key spaces identified with function and area",
        },
      ],
    },

    // ── DD2: Spatial Coordination ──
    {
      id: "dd2-spatial",
      name: "Data Drop 2 — Spatial Coordination",
      deadline: "2025-07-01T00:00:00Z",
      stage: "3-spatial-coordination",
      description:
        "Coordinated model with all building elements positioned, " +
        "openings located, and principal services routes identified.",
      requirements: [
        {
          elementType: "wall",
          minCount: 10,
          levelOfInformationNeed: {
            geometry: "detailed",
            information: "detailed",
            documentation: "reference",
          },
          requiredProperties: [
            {
              name: "thickness",
              label: "Wall Thickness",
              valueType: "number",
              required: true,
            },
            {
              name: "height",
              label: "Wall Height",
              valueType: "number",
              required: true,
            },
            {
              name: "isExternal",
              label: "External Wall",
              valueType: "boolean",
              required: true,
            },
            {
              name: "material",
              label: "Material",
              valueType: "string",
              required: true,
              description: "Primary construction material",
            },
            {
              name: "fireRating",
              label: "Fire Rating",
              valueType: "string",
              required: true,
              constraint: "^(30|60|90|120)min$",
              description: "Fire resistance rating",
            },
          ],
        },
        {
          elementType: "door",
          minCount: 5,
          levelOfInformationNeed: {
            geometry: "detailed",
            information: "detailed",
            documentation: "linked",
          },
          requiredProperties: [
            {
              name: "width",
              label: "Door Width",
              valueType: "number",
              required: true,
            },
            {
              name: "height",
              label: "Door Height",
              valueType: "number",
              required: true,
            },
            {
              name: "fireRating",
              label: "Fire Rating",
              valueType: "string",
              required: false,
            },
          ],
        },
        {
          elementType: "window",
          minCount: 5,
          levelOfInformationNeed: {
            geometry: "detailed",
            information: "preliminary",
            documentation: "reference",
          },
          requiredProperties: [
            {
              name: "width",
              label: "Window Width",
              valueType: "number",
              required: true,
            },
            {
              name: "height",
              label: "Window Height",
              valueType: "number",
              required: true,
            },
            {
              name: "uValue",
              label: "U-Value",
              valueType: "number",
              required: true,
              description: "Thermal transmittance W/(m²·K)",
            },
          ],
        },
        {
          elementType: "stair",
          minCount: 2,
          levelOfInformationNeed: {
            geometry: "detailed",
            information: "preliminary",
            documentation: "none",
          },
          requiredProperties: [
            {
              name: "width",
              label: "Stair Width",
              valueType: "number",
              required: true,
            },
            {
              name: "riserCount",
              label: "Number of Risers",
              valueType: "number",
              required: true,
            },
          ],
        },
        {
          elementType: "floor",
          minCount: 8,
          levelOfInformationNeed: {
            geometry: "detailed",
            information: "detailed",
            documentation: "reference",
          },
          requiredProperties: [
            {
              name: "area",
              label: "Floor Area",
              valueType: "number",
              required: true,
            },
            {
              name: "thickness",
              label: "Slab Thickness",
              valueType: "number",
              required: true,
            },
            {
              name: "material",
              label: "Material",
              valueType: "string",
              required: true,
            },
          ],
        },
        {
          elementType: "roof",
          minCount: 1,
          levelOfInformationNeed: {
            geometry: "detailed",
            information: "preliminary",
            documentation: "reference",
          },
          requiredProperties: [
            {
              name: "area",
              label: "Roof Area",
              valueType: "number",
              required: true,
            },
            {
              name: "uValue",
              label: "U-Value",
              valueType: "number",
              required: false,
            },
          ],
        },
      ],
    },

    // ── DD3: Technical Design ──
    {
      id: "dd3-technical",
      name: "Data Drop 3 — Technical Design",
      deadline: "2025-10-01T00:00:00Z",
      stage: "4-technical-design",
      description:
        "Fully detailed model ready for construction documentation. " +
        "All elements with manufacturer data where applicable.",
      requirements: [
        {
          elementType: "wall",
          minCount: 20,
          levelOfInformationNeed: {
            geometry: "manufacturer",
            information: "as-built",
            documentation: "embedded",
          },
          requiredProperties: [
            {
              name: "thickness",
              label: "Wall Thickness",
              valueType: "number",
              required: true,
            },
            {
              name: "height",
              label: "Wall Height",
              valueType: "number",
              required: true,
            },
            {
              name: "isExternal",
              label: "External Wall",
              valueType: "boolean",
              required: true,
            },
            {
              name: "material",
              label: "Material",
              valueType: "string",
              required: true,
            },
            {
              name: "fireRating",
              label: "Fire Rating",
              valueType: "string",
              required: true,
              constraint: "^(30|60|90|120)min$",
            },
            {
              name: "acousticRating",
              label: "Acoustic Rating (dB)",
              valueType: "number",
              required: true,
            },
            {
              name: "manufacturer",
              label: "Manufacturer",
              valueType: "string",
              required: true,
            },
          ],
        },
        {
          elementType: "door",
          minCount: 20,
          levelOfInformationNeed: {
            geometry: "manufacturer",
            information: "as-built",
            documentation: "embedded",
          },
          requiredProperties: [
            {
              name: "width",
              label: "Door Width",
              valueType: "number",
              required: true,
            },
            {
              name: "height",
              label: "Door Height",
              valueType: "number",
              required: true,
            },
            {
              name: "fireRating",
              label: "Fire Rating",
              valueType: "string",
              required: true,
              constraint: "^(FD30|FD60|FD90|FD120)$",
            },
            {
              name: "manufacturer",
              label: "Manufacturer",
              valueType: "string",
              required: true,
            },
            {
              name: "productReference",
              label: "Product Reference",
              valueType: "string",
              required: true,
            },
          ],
        },
      ],
    },
  ],
};
