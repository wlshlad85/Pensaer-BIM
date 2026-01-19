/**
 * IFC Parser Types
 *
 * TypeScript interfaces for IFC import/export operations.
 */

import type { ElementType } from "../../types";
import {
  IFCWALL,
  IFCWALLSTANDARDCASE,
  IFCDOOR,
  IFCWINDOW,
  IFCSLAB,
  IFCSPACE,
  IFCROOF,
  IFCCOLUMN,
  IFCBEAM,
  IFCSTAIR,
} from "./constants";

// ============================================
// IMPORT TYPES
// ============================================

export interface IfcImportResult {
  elements: import("../../types").Element[];
  stats: IfcImportStats;
  warnings: string[];
}

export interface IfcImportStats {
  totalEntities: number;
  walls: number;
  doors: number;
  windows: number;
  rooms: number;
  floors: number;
  roofs: number;
  columns: number;
  beams: number;
  stairs: number;
  openings: number;
  unsupported: number;
}

// ============================================
// EXPORT TYPES
// ============================================

export interface IfcExportResult {
  data: Uint8Array;
  filename: string;
  stats: IfcExportStats;
}

export interface IfcExportStats {
  totalEntities: number;
  walls: number;
  doors: number;
  windows: number;
  rooms: number;
  floors: number;
  roofs: number;
  columns: number;
  beams: number;
  stairs: number;
}

export interface IfcExportOptions {
  projectName?: string;
  author?: string;
  organization?: string;
  ifcVersion?: "IFC2X3" | "IFC4";
}

// ============================================
// TYPE MAPPINGS
// ============================================

/**
 * Map IFC entity types to Pensaer element types
 */
export const ifcTypeMap: Record<number, ElementType> = {
  [IFCWALL]: "wall",
  [IFCWALLSTANDARDCASE]: "wall",
  [IFCDOOR]: "door",
  [IFCWINDOW]: "window",
  [IFCSLAB]: "floor",
  [IFCSPACE]: "room",
  [IFCROOF]: "roof",
  [IFCCOLUMN]: "column",
  [IFCBEAM]: "beam",
  [IFCSTAIR]: "stair",
};

/**
 * Reverse map: Pensaer types to IFC types (for export)
 */
export const pensaerToIfcType: Record<ElementType, number> = {
  wall: IFCWALLSTANDARDCASE,
  door: IFCDOOR,
  window: IFCWINDOW,
  floor: IFCSLAB,
  room: IFCSPACE,
  roof: IFCROOF,
  column: IFCCOLUMN,
  beam: IFCBEAM,
  stair: IFCSTAIR,
};

// ============================================
// INTERNAL TYPES
// ============================================

export interface IfcHeaderIds {
  ownerHistoryId: number;
  projectId: number;
  siteId: number;
  buildingId: number;
  storeyId: number;
  nextId: number;
}

export interface ExtractedGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}
