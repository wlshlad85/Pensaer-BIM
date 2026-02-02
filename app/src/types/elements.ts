/**
 * Pensaer BIM Platform - Element Type Definitions
 *
 * Core interfaces for BIM elements following IFC-inspired patterns.
 * Uses discriminated unions for type-safe element handling.
 *
 * @module types/elements
 */

import type { Relationships } from "./relationships";
import type { Issue, Suggestion } from "./validation";

// ============================================
// BRANDED TYPES
// ============================================

/**
 * Branded type for Element IDs.
 * Provides type-safety to prevent mixing element IDs with other strings.
 *
 * @example
 * ```ts
 * const elementId = 'wall-123' as ElementId;
 * ```
 */
export type ElementId = string & { readonly __brand: "ElementId" };

/**
 * Branded type for Level IDs.
 */
export type LevelId = string & { readonly __brand: "LevelId" };

/**
 * Helper function to create an ElementId from a string.
 */
export function createElementId(id: string): ElementId {
  return id as ElementId;
}

/**
 * Helper function to create a LevelId from a string.
 */
export function createLevelId(id: string): LevelId {
  return id as LevelId;
}

// ============================================
// ELEMENT TYPES
// ============================================

/**
 * All possible element types in the BIM model.
 * Used as discriminator for the Element union type.
 */
export type ElementType =
  | "wall"
  | "door"
  | "window"
  | "room"
  | "floor"
  | "roof"
  | "column"
  | "beam"
  | "stair";

// ============================================
// ISO 19650-5 SECURITY CLASSIFICATION
// ============================================

/**
 * Security classification levels per ISO 19650-5.
 * Used for security triage of built asset information.
 */
export type SecurityClassification =
  | "Official"
  | "OfficialSensitive"
  | "Secret"
  | "TopSecret";

/**
 * Access control metadata for elements with elevated security.
 */
export interface AccessControl {
  /** Whether access is restricted to need-to-know basis */
  needToKnow: boolean;
  /** List of roles/persons with access */
  restrictedTo: string[];
}

/**
 * Check if a security classification is elevated (above Official).
 */
export function isElevatedSecurity(classification: SecurityClassification): boolean {
  return classification !== "Official";
}

/**
 * Get display label for a security classification.
 */
export function getSecurityLabel(classification: SecurityClassification): string {
  const labels: Record<SecurityClassification, string> = {
    Official: "OFFICIAL",
    OfficialSensitive: "OFFICIAL-SENSITIVE",
    Secret: "SECRET",
    TopSecret: "TOP SECRET",
  };
  return labels[classification];
}

/**
 * Parse a CLI-friendly security level string to SecurityClassification.
 */
export function parseSecurityLevel(level: string): SecurityClassification | null {
  const map: Record<string, SecurityClassification> = {
    official: "Official",
    "official-sensitive": "OfficialSensitive",
    officialsensitive: "OfficialSensitive",
    secret: "Secret",
    "top-secret": "TopSecret",
    topsecret: "TopSecret",
  };
  return map[level.toLowerCase()] ?? null;
}

// ============================================
// BASE ELEMENT INTERFACE
// ============================================

/**
 * Base properties shared by all BIM elements.
 * Extended by specific element types with type-specific properties.
 */
export interface BaseElement {
  /** Unique identifier for the element */
  readonly id: ElementId;

  /** Human-readable name for the element */
  name: string;

  /** X coordinate in model space (mm) */
  x: number;

  /** Y coordinate in model space (mm) */
  y: number;

  /** Width of the element bounding box (mm) */
  width: number;

  /** Height of the element bounding box (mm) */
  height: number;

  /** Rotation angle in degrees (0-360) */
  rotation?: number;

  /** IFC-inspired relationships to other elements */
  relationships: Relationships;

  /** Validation issues detected on this element */
  issues: Issue[];

  /** AI-generated suggestions for improvements */
  aiSuggestions: Suggestion[];

  /** Level/floor this element belongs to */
  level?: LevelId;

  /** Timestamp when element was created */
  readonly createdAt?: number;

  /** Timestamp when element was last modified */
  modifiedAt?: number;

  /** ISO 19650-5 security classification. Defaults to Official. */
  securityClassification?: SecurityClassification;

  /** Access control metadata for elements with elevated security */
  accessControl?: AccessControl;
}

// ============================================
// SPECIFIC ELEMENT TYPES
// ============================================

/**
 * Wall element - primary structural element for defining spaces.
 *
 * @example
 * ```ts
 * const wall: WallElement = {
 *   id: createElementId('wall-1'),
 *   type: 'wall',
 *   name: 'Exterior Wall',
 *   x: 0, y: 0,
 *   width: 5000, height: 3000,
 *   thickness: 200,
 *   wallHeight: 3000,
 *   material: 'concrete',
 *   isExterior: true,
 *   relationships: {},
 *   issues: [],
 *   aiSuggestions: []
 * };
 * ```
 */
export interface WallElement extends BaseElement {
  readonly type: "wall";

  /** Wall thickness in mm */
  thickness: number;

  /** Wall height (floor-to-ceiling) in mm */
  wallHeight: number;

  /** Material type */
  material?: "concrete" | "brick" | "drywall" | "glass" | "wood";

  /** Whether this is an exterior wall */
  isExterior?: boolean;

  /** Fire rating in minutes (0, 30, 60, 90, 120) */
  fireRating?: number;

  /** Acoustic rating in dB */
  acousticRating?: number;

  /** Start point coordinates */
  startPoint?: { x: number; y: number };

  /** End point coordinates */
  endPoint?: { x: number; y: number };
}

/**
 * Door element - opening in a wall for access.
 */
export interface DoorElement extends BaseElement {
  readonly type: "door";

  /** Door width in mm */
  doorWidth: number;

  /** Door height in mm */
  doorHeight: number;

  /** Door swing direction */
  swing?: "left" | "right" | "double";

  /** Whether door opens inward or outward */
  openDirection?: "inward" | "outward";

  /** Door type/style */
  doorType?: "single" | "double" | "sliding" | "pocket" | "bi-fold";

  /** Whether this is a fire door */
  isFireDoor?: boolean;

  /** Fire rating in minutes */
  fireRating?: number;

  /** Whether door is accessible (ADA compliant) */
  isAccessible?: boolean;
}

/**
 * Window element - opening in a wall for light and ventilation.
 */
export interface WindowElement extends BaseElement {
  readonly type: "window";

  /** Window width in mm */
  windowWidth: number;

  /** Window height in mm */
  windowHeight: number;

  /** Sill height from floor in mm */
  sillHeight: number;

  /** Window type/style */
  windowType?: "fixed" | "casement" | "sliding" | "awning" | "double-hung";

  /** Glass type */
  glassType?: "single" | "double" | "triple" | "laminated" | "tempered";

  /** U-value for thermal performance */
  uValue?: number;

  /** Whether window is operable */
  operable?: boolean;
}

/**
 * Room element - enclosed space defined by bounding walls.
 */
export interface RoomElement extends BaseElement {
  readonly type: "room";

  /** Room function/purpose */
  roomType?:
    | "living"
    | "bedroom"
    | "bathroom"
    | "kitchen"
    | "office"
    | "corridor"
    | "storage"
    | "utility"
    | "other";

  /** Floor area in square meters */
  area?: number;

  /** Perimeter length in mm */
  perimeter?: number;

  /** Room volume in cubic meters */
  volume?: number;

  /** Ceiling height in mm */
  ceilingHeight?: number;

  /** Required minimum area for this room type */
  requiredArea?: number;

  /** Occupancy count */
  occupancy?: number;

  /** Finish floor level relative to building datum */
  finishFloorLevel?: number;
}

/**
 * Floor element - horizontal surface/slab.
 */
export interface FloorElement extends BaseElement {
  readonly type: "floor";

  /** Floor thickness in mm */
  thickness: number;

  /** Floor area in square meters */
  area?: number;

  /** Floor finish material */
  finishMaterial?:
    | "concrete"
    | "tile"
    | "wood"
    | "carpet"
    | "vinyl"
    | "stone";

  /** Elevation relative to building datum */
  elevation?: number;

  /** Load capacity in kN/m² */
  loadCapacity?: number;
}

/**
 * Roof element - top covering of a building.
 */
export interface RoofElement extends BaseElement {
  readonly type: "roof";

  /** Roof pitch in degrees */
  pitch?: number;

  /** Roof type/style */
  roofType?: "flat" | "gable" | "hip" | "shed" | "mansard" | "gambrel";

  /** Roof thickness in mm */
  thickness?: number;

  /** Roof material */
  material?: "asphalt" | "metal" | "tile" | "slate" | "membrane" | "green";

  /** Overhang distance in mm */
  overhang?: number;

  /** Roof area in square meters */
  area?: number;
}

/**
 * Column element - vertical structural support.
 */
export interface ColumnElement extends BaseElement {
  readonly type: "column";

  /** Column cross-section shape */
  shape?: "rectangular" | "circular" | "H" | "I" | "custom";

  /** Column depth in mm */
  depth: number;

  /** Column material */
  material?: "concrete" | "steel" | "wood" | "composite";

  /** Fire protection thickness in mm */
  fireProtection?: number;

  /** Base elevation in mm */
  baseElevation?: number;

  /** Top elevation in mm */
  topElevation?: number;
}

/**
 * Beam element - horizontal structural support.
 */
export interface BeamElement extends BaseElement {
  readonly type: "beam";

  /** Beam cross-section shape */
  shape?: "rectangular" | "I" | "T" | "L" | "custom";

  /** Beam depth in mm */
  depth: number;

  /** Beam material */
  material?: "concrete" | "steel" | "wood" | "composite";

  /** Fire protection thickness in mm */
  fireProtection?: number;

  /** Span length in mm */
  span?: number;
}

/**
 * Stair element - vertical circulation.
 */
export interface StairElement extends BaseElement {
  readonly type: "stair";

  /** Number of risers */
  risers: number;

  /** Riser height in mm */
  riserHeight: number;

  /** Tread depth in mm */
  treadDepth: number;

  /** Stair width in mm */
  stairWidth: number;

  /** Stair type/configuration */
  stairType?: "straight" | "L-shaped" | "U-shaped" | "spiral" | "curved";

  /** Whether stair has handrails */
  hasHandrails?: boolean;

  /** Whether stair is enclosed (fire stair) */
  isEnclosed?: boolean;
}

// ============================================
// DISCRIMINATED UNION
// ============================================

/**
 * Union type of all possible BIM elements.
 * Uses discriminated union pattern with 'type' field.
 *
 * @example
 * ```ts
 * function processElement(element: Element) {
 *   switch (element.type) {
 *     case 'wall':
 *       console.log('Wall thickness:', element.thickness);
 *       break;
 *     case 'door':
 *       console.log('Door swing:', element.swing);
 *       break;
 *     // ... other cases
 *   }
 * }
 * ```
 */
export type Element =
  | WallElement
  | DoorElement
  | WindowElement
  | RoomElement
  | FloorElement
  | RoofElement
  | ColumnElement
  | BeamElement
  | StairElement;

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard to check if an element is a WallElement.
 */
export function isWall(element: Element): element is WallElement {
  return element.type === "wall";
}

/**
 * Type guard to check if an element is a DoorElement.
 */
export function isDoor(element: Element): element is DoorElement {
  return element.type === "door";
}

/**
 * Type guard to check if an element is a WindowElement.
 */
export function isWindow(element: Element): element is WindowElement {
  return element.type === "window";
}

/**
 * Type guard to check if an element is a RoomElement.
 */
export function isRoom(element: Element): element is RoomElement {
  return element.type === "room";
}

/**
 * Type guard to check if an element is a FloorElement.
 */
export function isFloor(element: Element): element is FloorElement {
  return element.type === "floor";
}

/**
 * Type guard to check if an element is a RoofElement.
 */
export function isRoof(element: Element): element is RoofElement {
  return element.type === "roof";
}

/**
 * Type guard to check if an element is a ColumnElement.
 */
export function isColumn(element: Element): element is ColumnElement {
  return element.type === "column";
}

/**
 * Type guard to check if an element is a BeamElement.
 */
export function isBeam(element: Element): element is BeamElement {
  return element.type === "beam";
}

/**
 * Type guard to check if an element is a StairElement.
 */
export function isStair(element: Element): element is StairElement {
  return element.type === "stair";
}

/**
 * Type guard to check if an element hosts other elements (walls).
 */
export function isHostElement(
  element: Element
): element is WallElement | FloorElement | RoofElement {
  return element.type === "wall" || element.type === "floor" || element.type === "roof";
}

/**
 * Type guard to check if an element can be hosted (doors, windows).
 */
export function isHostedElement(
  element: Element
): element is DoorElement | WindowElement {
  return element.type === "door" || element.type === "window";
}
