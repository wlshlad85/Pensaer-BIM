/**
 * Pensaer BIM Platform - Relationship Type Definitions
 *
 * IFC-inspired relationship interfaces for connecting BIM elements.
 * These relationships define how elements interact spatially and functionally.
 *
 * @module types/relationships
 */

import type { ElementId } from "./elements";

// ============================================
// RELATIONSHIP INTERFACES
// ============================================

/**
 * Relationships between BIM elements following IFC patterns.
 *
 * All relationship properties are optional since not all elements
 * have all relationship types.
 *
 * @example
 * ```ts
 * // A door hosted by a wall, leading to two rooms
 * const doorRelations: Relationships = {
 *   hostedBy: 'wall-1' as ElementId,
 *   leadsTo: ['room-1' as ElementId, 'room-2' as ElementId]
 * };
 * ```
 */
export interface Relationships {
  // ========== HOST RELATIONSHIPS ==========

  /**
   * Element that hosts this element.
   * Example: A door is hosted by a wall.
   * IFC equivalent: IfcRelVoidsElement (inverse)
   */
  hostedBy?: ElementId;

  /**
   * Elements hosted by this element.
   * Example: A wall hosts multiple doors and windows.
   * IFC equivalent: IfcRelVoidsElement
   */
  hosts?: ElementId[];

  // ========== SPATIAL RELATIONSHIPS ==========

  /**
   * Elements that bound/define this space.
   * Example: A room is bounded by walls.
   * IFC equivalent: IfcRelSpaceBoundary (inverse)
   */
  boundedBy?: ElementId[];

  /**
   * Spaces that this element bounds/defines.
   * Example: A wall bounds multiple rooms.
   * IFC equivalent: IfcRelSpaceBoundary
   */
  bounds?: ElementId[];

  // ========== CONNECTION RELATIONSHIPS ==========

  /**
   * Elements that this element connects to.
   * Example: A wall joins to other walls at corners.
   * IFC equivalent: IfcRelConnectsElements
   */
  joins?: ElementId[];

  // ========== ACCESS RELATIONSHIPS ==========

  /**
   * Spaces accessible through this element.
   * Example: A door leads to adjacent rooms.
   * Custom relationship for navigation.
   */
  leadsTo?: ElementId[];

  /**
   * Elements providing access to this space.
   * Example: A room is accessed via multiple doors.
   * Inverse of leadsTo.
   */
  accessVia?: ElementId[];

  // ========== VIEW RELATIONSHIPS ==========

  /**
   * Room that a window faces into.
   * Example: A window faces a living room.
   * Custom relationship for daylighting analysis.
   */
  facesRoom?: ElementId;

  // ========== ROOF RELATIONSHIPS ==========

  /**
   * Rooms covered by this roof element.
   * Example: A roof section covers multiple rooms.
   * IFC equivalent: IfcRelCoversSpaces
   */
  coversRooms?: ElementId[];

  /**
   * Elements that support this roof.
   * Example: A roof is supported by walls/columns.
   * IFC equivalent: IfcRelConnectsStructuralMember
   */
  supportedBy?: ElementId[];

  /**
   * Floors or spaces covered by this element.
   * Example: A roof covers the top floor.
   * Generic covering relationship.
   */
  covers?: ElementId[];

  // ========== ADJACENCY RELATIONSHIPS ==========

  /**
   * Spaces connected to this space (adjacent rooms).
   * Example: A room is connected to adjacent rooms via doors.
   * Derived from access relationships.
   */
  connectedTo?: ElementId[];

  // ========== STRUCTURAL RELATIONSHIPS ==========

  /**
   * Structural elements that support this element.
   * Example: A floor is supported by beams.
   * IFC equivalent: IfcRelConnectsStructuralMember
   */
  structuralSupports?: ElementId[];

  /**
   * Elements that this structural element supports.
   * Example: A column supports beams and floors.
   * Inverse of structuralSupports.
   */
  supports?: ElementId[];

  // ========== CONTAINMENT RELATIONSHIPS ==========

  /**
   * The level/floor that contains this element.
   * Example: All elements on Level 1.
   * IFC equivalent: IfcRelContainedInSpatialStructure
   */
  containedIn?: ElementId;

  /**
   * Elements contained within this spatial element.
   * Example: A level contains all its elements.
   * Inverse of containedIn.
   */
  contains?: ElementId[];
}

// ============================================
// RELATIONSHIP TYPES
// ============================================

/**
 * Types of relationships that can exist between elements.
 */
export type RelationshipType =
  | "hosts"
  | "hostedBy"
  | "bounds"
  | "boundedBy"
  | "joins"
  | "leadsTo"
  | "accessVia"
  | "facesRoom"
  | "coversRooms"
  | "supportedBy"
  | "covers"
  | "connectedTo"
  | "structuralSupports"
  | "supports"
  | "containedIn"
  | "contains";

/**
 * Relationship metadata for more detailed relationship tracking.
 */
export interface RelationshipMeta {
  /** Source element ID */
  readonly sourceId: ElementId;

  /** Target element ID */
  readonly targetId: ElementId;

  /** Type of relationship */
  readonly type: RelationshipType;

  /** When this relationship was created */
  readonly createdAt: number;

  /** Additional metadata */
  properties?: Record<string, unknown>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the inverse relationship type.
 *
 * @example
 * ```ts
 * getInverseRelationType('hosts') // returns 'hostedBy'
 * getInverseRelationType('bounds') // returns 'boundedBy'
 * ```
 */
export function getInverseRelationType(
  type: RelationshipType
): RelationshipType | undefined {
  const inverses: Partial<Record<RelationshipType, RelationshipType>> = {
    hosts: "hostedBy",
    hostedBy: "hosts",
    bounds: "boundedBy",
    boundedBy: "bounds",
    leadsTo: "accessVia",
    accessVia: "leadsTo",
    supportedBy: "supports",
    supports: "supportedBy",
    structuralSupports: "supports",
    containedIn: "contains",
    contains: "containedIn",
  };

  return inverses[type];
}
