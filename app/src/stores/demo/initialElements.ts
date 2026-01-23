/**
 * Demo Initial Elements
 *
 * Sample BIM data for demonstrating Pensaer features.
 * This data represents a simple residential building with two rooms.
 */

import type { Element } from "../../types";

/**
 * Create initial demo elements for a simple residential layout
 */
export function createInitialElements(): Element[] {
  return [
    // === ROOMS ===
    {
      id: "room-001",
      type: "room",
      name: "Living Room",
      x: 300,
      y: 200,
      width: 500,
      height: 350,
      properties: {
        area: "17.5 m²",
        height: "2800mm",
        occupancy: "Residential",
        finishFloor: "Hardwood",
        finishCeiling: "Painted",
        finishWalls: "Painted",
        level: "Level 1",
      },
      relationships: {
        boundedBy: ["wall-north", "wall-south", "wall-west", "wall-east"],
        accessVia: ["door-001"],
      },
      issues: [],
      aiSuggestions: [
        {
          icon: "fa-couch",
          text: "Space supports L-shaped sofa + coffee table",
          priority: "info",
        },
      ],
    },
    {
      id: "room-002",
      type: "room",
      name: "Bedroom",
      x: 800,
      y: 200,
      width: 400,
      height: 350,
      properties: {
        area: "14.0 m²",
        height: "2800mm",
        occupancy: "Residential",
        finishFloor: "Carpet",
        finishCeiling: "Painted",
        finishWalls: "Painted",
        level: "Level 1",
      },
      relationships: {
        boundedBy: [
          "wall-bedroom-north",
          "wall-bedroom-south",
          "wall-east",
          "wall-bedroom-east",
        ],
        accessVia: ["door-002"],
        connectedTo: ["room-001"],
      },
      issues: [],
      aiSuggestions: [
        {
          icon: "fa-bed",
          text: "Fits queen bed + wardrobe + desk",
          priority: "info",
        },
      ],
    },

    // === WALLS ===
    {
      id: "wall-north",
      type: "wall",
      name: "North Wall",
      x: 300,
      y: 200,
      width: 500,
      height: 12,
      properties: {
        thickness: "200mm",
        height: "2800mm",
        material: "Concrete",
        fireRating: "60 min",
        structural: true,
        level: "Level 1",
      },
      relationships: {
        hosts: ["window-001"],
        joins: ["wall-west", "wall-east"],
        bounds: ["room-001"],
      },
      issues: [],
      aiSuggestions: [],
    },
    {
      id: "wall-south",
      type: "wall",
      name: "South Wall",
      x: 300,
      y: 538,
      width: 500,
      height: 12,
      properties: {
        thickness: "200mm",
        height: "2800mm",
        material: "Concrete",
        fireRating: "60 min",
        structural: true,
        level: "Level 1",
      },
      relationships: {
        hosts: ["door-001"],
        joins: ["wall-west", "wall-east"],
        bounds: ["room-001"],
      },
      issues: [],
      aiSuggestions: [],
    },
    {
      id: "wall-west",
      type: "wall",
      name: "West Wall",
      x: 300,
      y: 200,
      width: 12,
      height: 350,
      properties: {
        thickness: "200mm",
        height: "2800mm",
        material: "Concrete",
        fireRating: "60 min",
        structural: true,
        level: "Level 1",
      },
      relationships: {
        hosts: [],
        joins: ["wall-north", "wall-south"],
        bounds: ["room-001"],
      },
      issues: [],
      aiSuggestions: [],
    },
    {
      id: "wall-east",
      type: "wall",
      name: "East Wall (Shared)",
      x: 788,
      y: 200,
      width: 12,
      height: 350,
      properties: {
        thickness: "200mm",
        height: "2800mm",
        material: "Concrete",
        fireRating: "60 min",
        structural: true,
        level: "Level 1",
      },
      relationships: {
        hosts: ["door-002"],
        joins: [
          "wall-north",
          "wall-south",
          "wall-bedroom-north",
          "wall-bedroom-south",
        ],
        bounds: ["room-001", "room-002"],
      },
      issues: [],
      aiSuggestions: [
        {
          icon: "fa-volume-mute",
          text: "Add acoustic insulation between rooms",
          priority: "medium",
        },
      ],
    },
    {
      id: "wall-bedroom-east",
      type: "wall",
      name: "Bedroom East Wall",
      x: 1188,
      y: 200,
      width: 12,
      height: 350,
      properties: {
        thickness: "200mm",
        height: "2800mm",
        material: "Concrete",
        fireRating: "60 min",
        structural: true,
        level: "Level 1",
      },
      relationships: {
        hosts: [],
        joins: ["wall-bedroom-north", "wall-bedroom-south"],
        bounds: ["room-002"],
      },
      issues: [],
      aiSuggestions: [],
    },
    {
      id: "wall-bedroom-north",
      type: "wall",
      name: "Bedroom North Wall",
      x: 800,
      y: 200,
      width: 400,
      height: 12,
      properties: {
        thickness: "200mm",
        height: "2800mm",
        material: "Concrete",
        fireRating: "60 min",
        structural: true,
        level: "Level 1",
      },
      relationships: {
        hosts: ["window-002"],
        joins: ["wall-east", "wall-bedroom-east"],
        bounds: ["room-002"],
      },
      issues: [],
      aiSuggestions: [],
    },
    {
      id: "wall-bedroom-south",
      type: "wall",
      name: "Bedroom South Wall",
      x: 800,
      y: 538,
      width: 400,
      height: 12,
      properties: {
        thickness: "200mm",
        height: "2800mm",
        material: "Concrete",
        fireRating: "60 min",
        structural: true,
        level: "Level 1",
      },
      relationships: {
        hosts: [],
        joins: ["wall-east", "wall-bedroom-east"],
        bounds: ["room-002"],
      },
      issues: [],
      aiSuggestions: [],
    },

    // === DOORS ===
    {
      id: "door-001",
      type: "door",
      name: "Main Entry",
      x: 500,
      y: 530,
      width: 90,
      height: 24,
      properties: {
        width: "900mm",
        height: "2100mm",
        material: "Wood",
        fireRating: "30 min",
        swingDirection: "Inward",
        handleSide: "Right",
        level: "Level 1",
      },
      relationships: {
        hostedBy: "wall-south",
        leadsTo: ["room-001", "exterior"],
      },
      issues: [],
      aiSuggestions: [
        {
          icon: "fa-lock",
          text: "Add smart lock for keyless entry",
          priority: "low",
        },
      ],
    },
    {
      id: "door-002",
      type: "door",
      name: "Interior Door",
      x: 788,
      y: 350,
      width: 24,
      height: 80,
      properties: {
        width: "800mm",
        height: "2100mm",
        material: "Wood",
        fireRating: "None",
        swingDirection: "Inward",
        handleSide: "Left",
        level: "Level 1",
      },
      relationships: {
        hostedBy: "wall-east",
        leadsTo: ["room-001", "room-002"],
      },
      issues: [],
      aiSuggestions: [],
    },

    // === WINDOWS ===
    {
      id: "window-001",
      type: "window",
      name: "Living Room Window",
      x: 450,
      y: 194,
      width: 120,
      height: 24,
      properties: {
        width: "1200mm",
        height: "1500mm",
        sillHeight: "900mm",
        glazingType: "Double",
        uValue: "1.4 W/m²K",
        openingType: "Casement",
        frame: "Aluminum",
        level: "Level 1",
      },
      relationships: {
        hostedBy: "wall-north",
        facesRoom: "room-001",
      },
      issues: [],
      aiSuggestions: [
        {
          icon: "fa-sun",
          text: "North-facing - good for diffused light",
          priority: "info",
        },
      ],
    },
    {
      id: "window-002",
      type: "window",
      name: "Bedroom Window",
      x: 950,
      y: 194,
      width: 100,
      height: 24,
      properties: {
        width: "1000mm",
        height: "1200mm",
        sillHeight: "900mm",
        glazingType: "Double",
        uValue: "1.4 W/m²K",
        openingType: "Casement",
        frame: "Aluminum",
        level: "Level 1",
      },
      relationships: {
        hostedBy: "wall-bedroom-north",
        facesRoom: "room-002",
      },
      issues: [],
      aiSuggestions: [
        {
          icon: "fa-moon",
          text: "Add blackout blinds for better sleep",
          priority: "low",
        },
      ],
    },

    // === FLOOR SLAB ===
    {
      id: "floor-001",
      type: "floor",
      name: "Ground Floor Slab",
      x: 300,
      y: 200,
      width: 900,
      height: 350,
      properties: {
        thickness: "150mm",
        elevation: 0,
        material: "Concrete",
        finish: "Polished",
        structural: true,
        level: "Level 1",
      },
      relationships: {
        supports: ["room-001", "room-002"],
        supportedBy: [],
      },
      issues: [],
      aiSuggestions: [
        {
          icon: "fa-layer-group",
          text: "150mm slab adequate for residential loads",
          priority: "info",
        },
      ],
    },

    // === ROOF ===
    {
      id: "roof-001",
      type: "roof",
      name: "Main Roof",
      x: 290,
      y: 190,
      width: 920,
      height: 370,
      properties: {
        material: "Metal Standing Seam",
        slope: "4:12",
        insulation: "R-30",
        roof_type: "gable",
        level: "Level 1",
      },
      relationships: {
        supportedBy: [
          "wall-north",
          "wall-south",
          "wall-west",
          "wall-east",
          "wall-bedroom-east",
          "wall-bedroom-north",
          "wall-bedroom-south",
        ],
        covers: ["room-001", "room-002"],
      },
      issues: [],
      aiSuggestions: [
        {
          icon: "fa-solar-panel",
          text: "South-facing slope ideal for solar panels",
          priority: "medium",
        },
      ],
    },
  ];
}
