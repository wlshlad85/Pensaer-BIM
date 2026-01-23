/**
 * IFC Mapper Type Definitions
 *
 * Defines the interfaces and types for IFC-to-Pensaer element mapping.
 */

import type { Element, ElementType, Relationships } from "../../../types";

// IFC Entity type constants from web-ifc
export const IFC_TYPES = {
  // Walls
  IFCWALL: 2391406946,
  IFCWALLSTANDARDCASE: 3512223829,
  IFCWALLTYPE: 1898987631,
  IFCCURTAINWALL: 844818557,

  // Doors
  IFCDOOR: 395920057,
  IFCDOORSTANDARDCASE: 3242481149,
  IFCDOORTYPE: 526551008,

  // Windows
  IFCWINDOW: 3304561284,
  IFCWINDOWSTANDARDCASE: 486154966,
  IFCWINDOWTYPE: 4009809668,

  // Slabs/Floors
  IFCSLAB: 1529196076,
  IFCSLABSTANDARDCASE: 3027962421,
  IFCSLABTYPE: 2315554128,

  // Spaces/Rooms
  IFCSPACE: 3856911033,
  IFCSPACETYPE: 3812236995,

  // Roofs
  IFCROOF: 2016517767,
  IFCROOFTYPE: 2781568857,

  // Columns
  IFCCOLUMN: 843113511,
  IFCCOLUMNSTANDARDCASE: 905975707,
  IFCCOLUMNTYPE: 300633059,

  // Beams
  IFCBEAM: 753842376,
  IFCBEAMSTANDARDCASE: 2906023776,
  IFCBEAMTYPE: 819618141,

  // Stairs
  IFCSTAIR: 331165859,
  IFCSTAIRFLIGHT: 4252922144,
  IFCSTAIRTYPE: 338393293,

  // Openings
  IFCOPENINGELEMENT: 3588315303,

  // Relationships
  IFCRELVOIDSELEMENT: 1401173127,
  IFCRELFILLSELEMENT: 3940055652,
  IFCRELCONTAINEDINSPATIALSTRUCTURE: 3242617779,
  IFCRELSPACEBOUNDARY: 3451746338,

  // Property Sets
  IFCPROPERTYSET: 1451395588,
  IFCPROPERTYSINGLEVALUE: 3290496277,
  IFCQUANTITYSET: 2090586900,
} as const;

/**
 * Map of IFC type IDs to Pensaer ElementTypes
 */
export const IFC_TYPE_MAP: Record<number, ElementType> = {
  [IFC_TYPES.IFCWALL]: "wall",
  [IFC_TYPES.IFCWALLSTANDARDCASE]: "wall",
  [IFC_TYPES.IFCCURTAINWALL]: "wall",
  [IFC_TYPES.IFCDOOR]: "door",
  [IFC_TYPES.IFCDOORSTANDARDCASE]: "door",
  [IFC_TYPES.IFCWINDOW]: "window",
  [IFC_TYPES.IFCWINDOWSTANDARDCASE]: "window",
  [IFC_TYPES.IFCSLAB]: "floor",
  [IFC_TYPES.IFCSLABSTANDARDCASE]: "floor",
  [IFC_TYPES.IFCSPACE]: "room",
  [IFC_TYPES.IFCROOF]: "roof",
  [IFC_TYPES.IFCCOLUMN]: "column",
  [IFC_TYPES.IFCCOLUMNSTANDARDCASE]: "column",
  [IFC_TYPES.IFCBEAM]: "beam",
  [IFC_TYPES.IFCBEAMSTANDARDCASE]: "beam",
  [IFC_TYPES.IFCSTAIR]: "stair",
  [IFC_TYPES.IFCSTAIRFLIGHT]: "stair",
};

/**
 * Reverse map: Pensaer types to primary IFC types (for export)
 */
export const PENSAER_TO_IFC_TYPE: Record<ElementType, number> = {
  wall: IFC_TYPES.IFCWALLSTANDARDCASE,
  door: IFC_TYPES.IFCDOOR,
  window: IFC_TYPES.IFCWINDOW,
  floor: IFC_TYPES.IFCSLAB,
  room: IFC_TYPES.IFCSPACE,
  roof: IFC_TYPES.IFCROOF,
  column: IFC_TYPES.IFCCOLUMN,
  beam: IFC_TYPES.IFCBEAM,
  stair: IFC_TYPES.IFCSTAIR,
};

/**
 * Raw IFC entity data extracted from web-ifc
 */
export interface IfcEntityData {
  expressID: number;
  type: number;
  GlobalId?: { value: string } | string;
  Name?: { value: string } | string;
  Description?: { value: string } | string;
  ObjectType?: { value: string } | string;
  Tag?: { value: string } | string;
  [key: string]: unknown;
}

/**
 * Geometry data extracted from IFC
 */
export interface IfcGeometry {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotation?: number;
  boundingBox?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

/**
 * Property data from IFC property sets
 */
export interface IfcPropertyData {
  psetName: string;
  properties: Record<string, string | number | boolean>;
}

/**
 * Opening data (voids in walls for doors/windows)
 */
export interface IfcOpeningData {
  expressID: number;
  hostId: number;
  geometry: IfcGeometry;
  filledBy?: number; // Door or window that fills this opening
}

/**
 * Context passed to mappers during import
 */
export interface MapperContext {
  modelID: number;
  allEntities: Map<number, IfcEntityData>;
  openings: Map<number, IfcOpeningData>;
  relationships: {
    voids: Map<number, number[]>; // host -> opening IDs
    fills: Map<number, number>; // opening -> filling element
    containment: Map<number, number[]>; // space -> contained elements
    boundaries: Map<number, number[]>; // space -> boundary elements
  };
  scale: number; // Unit conversion factor to mm
}

/**
 * Result of mapping a single IFC entity
 */
export interface MapperResult {
  element: Element;
  warnings?: string[];
}

/**
 * Base interface for all IFC type mappers
 */
export interface IIfcMapper {
  /** IFC type IDs this mapper handles */
  readonly ifcTypes: readonly number[];

  /** Pensaer element type this mapper produces */
  readonly elementType: ElementType;

  /** Display name for logging/debugging */
  readonly name: string;

  /**
   * Check if this mapper can handle the given IFC type
   */
  canHandle(ifcType: number): boolean;

  /**
   * Map an IFC entity to a Pensaer element
   */
  map(entity: IfcEntityData, geometry: IfcGeometry, context: MapperContext): MapperResult;

  /**
   * Extract type-specific properties from IFC property sets
   */
  extractProperties(
    entity: IfcEntityData,
    propertySets: IfcPropertyData[],
    context: MapperContext
  ): Record<string, string | number | boolean>;

  /**
   * Build relationships for this element
   */
  buildRelationships(
    entity: IfcEntityData,
    context: MapperContext
  ): Relationships;
}

/**
 * Default properties for each element type
 */
export const DEFAULT_PROPERTIES: Record<ElementType, Record<string, string | number | boolean>> = {
  wall: {
    thickness: "200mm",
    height: "2800mm",
    material: "Concrete",
    structural: true,
  },
  door: {
    width: "900mm",
    height: "2100mm",
    material: "Wood",
    swingDirection: "Inward",
  },
  window: {
    width: "1200mm",
    height: "1500mm",
    sillHeight: "900mm",
    glazingType: "Double",
  },
  room: {
    height: "2800mm",
    occupancy: "Residential",
  },
  floor: {
    thickness: "150mm",
    material: "Concrete",
    structural: true,
  },
  roof: {
    material: "Metal",
    insulation: "R-30",
  },
  column: {
    material: "Concrete",
    structural: true,
  },
  beam: {
    material: "Concrete",
    structural: true,
  },
  stair: {
    riserHeight: "175mm",
    treadDepth: "280mm",
    material: "Concrete",
  },
};
