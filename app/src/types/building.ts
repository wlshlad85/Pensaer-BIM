/**
 * Pensaer BIM Platform - Building Type Definitions
 *
 * Types for tower/building modeling including:
 * - Building (top-level container)
 * - Grid (structural grid system)
 * - Core (vertical circulation)
 *
 * @module types/building
 */

import type { ElementId, LevelId, BaseElement } from "./elements";

// ============================================
// BUILDING ELEMENT
// ============================================

/**
 * Building element - top-level container for a complete building.
 * Groups all levels and provides building-wide properties.
 *
 * @example
 * ```ts
 * const tower: BuildingElement = {
 *   id: createElementId('building-1'),
 *   type: 'building',
 *   name: 'Tower A',
 *   x: 0, y: 0,
 *   width: 30000, height: 20000,
 *   buildingHeight: 150000, // 150m tall
 *   levelCount: 40,
 *   footprintArea: 600,
 *   grossFloorArea: 24000,
 *   relationships: {},
 *   issues: [],
 *   aiSuggestions: [],
 *   properties: {}
 * };
 * ```
 */
export interface BuildingElement extends BaseElement {
  readonly type: "building";

  /** Total building height in mm */
  buildingHeight: number;

  /** Number of levels/floors */
  levelCount: number;

  /** Ground floor footprint area in m² */
  footprintArea?: number;

  /** Total gross floor area (GFA) in m² */
  grossFloorArea?: number;

  /** Building use/occupancy type */
  occupancyType?: "residential" | "commercial" | "mixed" | "industrial" | "institutional";

  /** Structural system type */
  structuralSystem?: "core-outrigger" | "tube" | "diagrid" | "bundled-tube" | "frame";

  /** Core configuration */
  coreType?: "central" | "peripheral" | "dual" | "distributed";

  /** Ground level elevation relative to datum in mm */
  baseElevation?: number;

  /** IDs of all levels in this building */
  levelIds?: LevelId[];

  /** IDs of grids associated with this building */
  gridIds?: ElementId[];

  /** IDs of cores in this building */
  coreIds?: ElementId[];
}

// ============================================
// GRID ELEMENT
// ============================================

/**
 * Grid axis direction
 */
export type GridDirection = "horizontal" | "vertical";

/**
 * Grid line definition within a grid system
 */
export interface GridLine {
  /** Grid line identifier (e.g., "A", "B", "1", "2") */
  id: string;

  /** Position along the perpendicular axis in mm */
  position: number;

  /** Optional offset from the grid position in mm */
  offset?: number;

  /** Whether this line extends beyond the grid bounds */
  extended?: boolean;
}

/**
 * Grid element - structural grid system for systematic placement.
 * Provides coordinate axes for columns, beams, and walls.
 *
 * @example
 * ```ts
 * const grid: GridElement = {
 *   id: createElementId('grid-1'),
 *   type: 'grid',
 *   name: 'Structural Grid',
 *   x: 0, y: 0,
 *   width: 30000, height: 20000,
 *   horizontalLines: [
 *     { id: 'A', position: 0 },
 *     { id: 'B', position: 8000 },
 *     { id: 'C', position: 16000 },
 *   ],
 *   verticalLines: [
 *     { id: '1', position: 0 },
 *     { id: '2', position: 10000 },
 *     { id: '3', position: 20000 },
 *   ],
 *   relationships: {},
 *   issues: [],
 *   aiSuggestions: [],
 *   properties: {}
 * };
 * ```
 */
export interface GridElement extends BaseElement {
  readonly type: "grid";

  /** Horizontal grid lines (typically lettered: A, B, C...) */
  horizontalLines: GridLine[];

  /** Vertical grid lines (typically numbered: 1, 2, 3...) */
  verticalLines: GridLine[];

  /** Default spacing for horizontal lines in mm */
  horizontalSpacing?: number;

  /** Default spacing for vertical lines in mm */
  verticalSpacing?: number;

  /** Grid bubble size in mm (for display) */
  bubbleSize?: number;

  /** Whether to show grid bubbles */
  showBubbles?: boolean;

  /** Grid line color (hex) */
  lineColor?: string;

  /** Associated building ID */
  buildingId?: ElementId;
}

// ============================================
// CORE ELEMENT
// ============================================

/**
 * Core type - vertical circulation and services
 */
export type CoreType = "elevator" | "stair" | "service" | "combined";

/**
 * Core element - vertical circulation and service shaft.
 * Represents elevator cores, stair cores, or combined cores.
 *
 * @example
 * ```ts
 * const core: CoreElement = {
 *   id: createElementId('core-1'),
 *   type: 'core',
 *   name: 'Main Core',
 *   x: 12000, y: 8000,
 *   width: 8000, height: 8000,
 *   coreType: 'combined',
 *   elevatorCount: 4,
 *   stairCount: 2,
 *   fromLevel: 'level-1',
 *   toLevel: 'level-40',
 *   relationships: {},
 *   issues: [],
 *   aiSuggestions: [],
 *   properties: {}
 * };
 * ```
 */
export interface CoreElement extends BaseElement {
  readonly type: "core";

  /** Type of core */
  coreType: CoreType;

  /** Number of elevators (if applicable) */
  elevatorCount?: number;

  /** Number of stairs (if applicable) */
  stairCount?: number;

  /** Core wall thickness in mm */
  wallThickness?: number;

  /** Whether this is a fire-rated core */
  isFireRated?: boolean;

  /** Fire rating in minutes */
  fireRating?: number;

  /** Starting level ID */
  fromLevel?: LevelId;

  /** Ending level ID */
  toLevel?: LevelId;

  /** Whether core is pressurized (for fire safety) */
  isPressurized?: boolean;

  /** Associated building ID */
  buildingId?: ElementId;

  /** Shaft openings per level */
  shaftOpenings?: {
    levelId: LevelId;
    openingType: "elevator" | "stair" | "door";
    position: "north" | "south" | "east" | "west";
  }[];
}

// ============================================
// SLAB ELEMENT (Extended Floor for towers)
// ============================================

/**
 * Slab edge condition for floor slabs
 */
export type SlabEdgeCondition = "flush" | "setback" | "cantilever" | "curtainwall";

/**
 * Extended slab properties for tower floors
 */
export interface TowerSlabProperties {
  /** Slab perimeter outline (array of [x, y] points in mm) */
  outline?: number[][];

  /** Setback from building perimeter in mm */
  perimeterSetback?: number;

  /** Edge conditions by direction */
  edgeConditions?: {
    north?: SlabEdgeCondition;
    south?: SlabEdgeCondition;
    east?: SlabEdgeCondition;
    west?: SlabEdgeCondition;
  };

  /** Openings/voids in the slab (core penetrations) */
  openings?: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    coreId?: ElementId;
  }[];

  /** Post-tensioned slab */
  isPostTensioned?: boolean;

  /** Slab type */
  slabType?: "flat" | "waffle" | "ribbed" | "composite";
}

// ============================================
// TOWER GENERATION CONFIG
// ============================================

/**
 * Configuration for generating a tower building
 */
export interface TowerConfig {
  /** Tower name */
  name: string;

  /** Base position (x, y) in mm */
  position: { x: number; y: number };

  /** Footprint dimensions in mm */
  footprint: {
    width: number;
    depth: number;
    shape?: "rectangular" | "square" | "L-shaped" | "circular" | "triangular";
  };

  /** Number of floors */
  floorCount: number;

  /** Floor-to-floor height in mm (default 3500 for commercial, 3000 for residential) */
  floorHeight?: number;

  /** Ground floor height in mm (often taller) */
  groundFloorHeight?: number;

  /** Building type */
  buildingType?: "residential" | "commercial" | "mixed";

  /** Structural grid configuration */
  grid?: {
    /** X-direction bay spacing in mm */
    xSpacing: number;
    /** Y-direction bay spacing in mm */
    ySpacing: number;
    /** Start labels */
    xLabels?: string;  // e.g., "1" for numeric, "A" for alpha
    yLabels?: string;
  };

  /** Core configuration */
  core?: {
    type: CoreType;
    position: "center" | "north" | "south" | "east" | "west";
    width: number;
    depth: number;
    elevatorCount?: number;
    stairCount?: number;
  };

  /** Facade type */
  facade?: {
    type: "curtainwall" | "punched" | "precast" | "mixed";
    /** For curtain wall: horizontal divisions per floor */
    panelsPerFloor?: number;
    /** For curtain wall: panel width in mm */
    panelWidth?: number;
    /** Glass type */
    glassType?: "clear" | "tinted" | "reflective" | "low-e" | "fritted";
  };

  /** Whether to auto-generate columns at grid intersections */
  generateColumns?: boolean;

  /** Whether to auto-generate floor slabs */
  generateSlabs?: boolean;

  /** Whether to auto-generate facade */
  generateFacade?: boolean;
}

/**
 * Result of tower generation
 */
export interface TowerGenerationResult {
  /** Generated building element */
  building: BuildingElement;

  /** Generated levels */
  levels: import("./store").Level[];

  /** Generated grid */
  grid?: GridElement;

  /** Generated core(s) */
  cores: CoreElement[];

  /** Generated columns */
  columns: import("./elements").ColumnElement[];

  /** Generated floor slabs */
  floors: import("./elements").FloorElement[];

  /** Generated curtain walls */
  curtainWalls: import("./elements").CurtainWallElement[];

  /** Summary statistics */
  stats: {
    totalElements: number;
    totalLevels: number;
    grossFloorArea: number; // m²
    buildingHeight: number; // mm
    estimatedCost?: number; // USD
  };
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard to check if an element is a BuildingElement.
 */
export function isBuilding(element: unknown): element is BuildingElement {
  return (element as BuildingElement)?.type === "building";
}

/**
 * Type guard to check if an element is a GridElement.
 */
export function isGrid(element: unknown): element is GridElement {
  return (element as GridElement)?.type === "grid";
}

/**
 * Type guard to check if an element is a CoreElement.
 */
export function isCore(element: unknown): element is CoreElement {
  return (element as CoreElement)?.type === "core";
}
