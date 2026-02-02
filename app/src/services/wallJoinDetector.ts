/**
 * Wall Join Detection Service (P1-008)
 *
 * Detects T-joins, L-joins, cross-joins, and butt-joins between walls
 * after wall creation, and updates wall relationships accordingly.
 *
 * Join types:
 * - **L-join**: Two wall endpoints meet at ~90°
 * - **T-join**: One wall's endpoint meets another wall's midpoint
 * - **Cross-join**: Two walls cross each other at their interiors
 * - **Butt-join**: Two collinear walls meet end-to-end
 * - **Miter-join**: Two wall endpoints meet at an arbitrary angle
 */

import type { Element } from "../types";

// ============================================
// TYPES
// ============================================

export type JoinType = "L" | "T" | "cross" | "butt" | "miter";

export interface Point2D {
  x: number;
  y: number;
}

export interface WallSegment {
  id: string;
  start: Point2D;
  end: Point2D;
}

export interface DetectedJoin {
  /** Type of join detected */
  type: JoinType;
  /** Point where the join occurs */
  point: Point2D;
  /** IDs of walls involved */
  wallIds: [string, string];
  /** Angle between walls in radians (0 to PI) */
  angle: number;
}

export interface JoinDetectionResult {
  /** All detected joins involving the new wall */
  joins: DetectedJoin[];
  /** Map of wall ID -> list of wall IDs it now joins with */
  relationshipUpdates: Map<string, string[]>;
}

// ============================================
// CONSTANTS
// ============================================

/** Distance tolerance for point coincidence (in model units = meters * SCALE) */
const ENDPOINT_TOLERANCE = 15; // 15px ≈ 0.15m at SCALE=100

/** Distance tolerance for T-join detection (endpoint near edge) */
const T_JOIN_TOLERANCE = 15;

/** Angle tolerance for classifying join types (radians, ~5°) */
const ANGLE_TOLERANCE = 0.09;

const SCALE = 100;

// ============================================
// GEOMETRY HELPERS
// ============================================

function dist(a: Point2D, b: Point2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function dot(a: Point2D, b: Point2D): number {
  return a.x * b.x + a.y * b.y;
}

function sub(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

function length(v: Point2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function cross2D(a: Point2D, b: Point2D): number {
  return a.x * b.y - a.y * b.x;
}

function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Angle between two direction vectors in [0, PI].
 */
function angleBetween(a: Point2D, b: Point2D): number {
  const la = length(a);
  const lb = length(b);
  if (la < 1e-10 || lb < 1e-10) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot(a, b) / (la * lb)));
  return Math.acos(cosAngle);
}

/**
 * Classify an endpoint join by angle.
 */
function classifyEndpointJoin(angle: number): JoinType {
  if (angle < ANGLE_TOLERANCE || Math.abs(angle - Math.PI) < ANGLE_TOLERANCE) {
    return "butt";
  }
  if (Math.abs(angle - Math.PI / 2) < ANGLE_TOLERANCE) {
    return "L";
  }
  return "miter";
}

/**
 * Project point onto a line segment. Returns parameter t in [0,1] and distance.
 */
function projectPointOnSegment(
  p: Point2D,
  segStart: Point2D,
  segEnd: Point2D
): { t: number; distance: number; closest: Point2D } {
  const d = sub(segEnd, segStart);
  const lenSq = d.x * d.x + d.y * d.y;
  if (lenSq < 1e-20) {
    return { t: 0, distance: dist(p, segStart), closest: segStart };
  }
  const t = Math.max(0, Math.min(1, dot(sub(p, segStart), d) / lenSq));
  const closest: Point2D = {
    x: segStart.x + d.x * t,
    y: segStart.y + d.y * t,
  };
  return { t, distance: dist(p, closest), closest };
}

/**
 * Check if two segments cross (proper interior intersection).
 */
function segmentIntersection(
  a1: Point2D,
  a2: Point2D,
  b1: Point2D,
  b2: Point2D
): { intersects: boolean; point?: Point2D; t?: number; u?: number } {
  const d1 = sub(a2, a1);
  const d2 = sub(b2, b1);
  const cross = cross2D(d1, d2);

  if (Math.abs(cross) < 1e-10) {
    return { intersects: false }; // Parallel
  }

  const d3 = sub(a1, b1);
  const t = cross2D(d3, d2) / -cross;
  const u = cross2D(d1, d3) / cross;

  const margin = 0.01; // Small margin to exclude endpoints
  if (t > margin && t < 1 - margin && u > margin && u < 1 - margin) {
    return {
      intersects: true,
      point: { x: a1.x + d1.x * t, y: a1.y + d1.y * t },
      t,
      u,
    };
  }

  return { intersects: false };
}

// ============================================
// WALL SEGMENT EXTRACTION
// ============================================

/**
 * Extract a WallSegment from an Element, using startPoint/endPoint properties
 * or falling back to bounding box geometry.
 */
export function extractWallSegment(element: Element): WallSegment | null {
  if (element.type !== "wall") return null;

  const props = element.properties;

  // Prefer explicit start/end points
  if (
    props.start_x != null &&
    props.start_y != null &&
    props.end_x != null &&
    props.end_y != null
  ) {
    return {
      id: element.id,
      start: {
        x: Number(props.start_x) * SCALE,
        y: Number(props.start_y) * SCALE,
      },
      end: {
        x: Number(props.end_x) * SCALE,
        y: Number(props.end_y) * SCALE,
      },
    };
  }

  // Fallback: derive from bounding box (less accurate for rotated walls)
  const isHorizontal = element.width >= element.height;
  if (isHorizontal) {
    return {
      id: element.id,
      start: { x: element.x, y: element.y + element.height / 2 },
      end: { x: element.x + element.width, y: element.y + element.height / 2 },
    };
  } else {
    return {
      id: element.id,
      start: { x: element.x + element.width / 2, y: element.y },
      end: { x: element.x + element.width / 2, y: element.y + element.height },
    };
  }
}

// ============================================
// JOIN DETECTION
// ============================================

/**
 * Detect endpoint-to-endpoint joins between two wall segments.
 */
function detectEndpointJoin(a: WallSegment, b: WallSegment): DetectedJoin | null {
  const endpoints = [
    { pa: a.start, ea: "start" as const, pb: b.start, eb: "start" as const },
    { pa: a.start, ea: "start" as const, pb: b.end, eb: "end" as const },
    { pa: a.end, ea: "end" as const, pb: b.start, eb: "start" as const },
    { pa: a.end, ea: "end" as const, pb: b.end, eb: "end" as const },
  ];

  for (const { pa, ea, pb, eb } of endpoints) {
    if (dist(pa, pb) <= ENDPOINT_TOLERANCE) {
      // Direction vectors pointing AWAY from join
      const dirA =
        ea === "start" ? sub(a.end, a.start) : sub(a.start, a.end);
      const dirB =
        eb === "start" ? sub(b.end, b.start) : sub(b.start, b.end);
      const angle = angleBetween(dirA, dirB);
      const type = classifyEndpointJoin(angle);

      return {
        type,
        point: midpoint(pa, pb),
        wallIds: [a.id, b.id],
        angle,
      };
    }
  }
  return null;
}

/**
 * Detect T-join: endpoint of one wall near the interior of another.
 */
function detectTJoin(a: WallSegment, b: WallSegment): DetectedJoin | null {
  // Check a's endpoints against b's interior
  for (const pt of [a.start, a.end]) {
    const proj = projectPointOnSegment(pt, b.start, b.end);
    // Must be interior (not at endpoints)
    const segLen = dist(b.start, b.end);
    const margin = ENDPOINT_TOLERANCE / segLen;
    if (proj.t > margin && proj.t < 1 - margin && proj.distance <= T_JOIN_TOLERANCE) {
      const dirA = sub(a.end, a.start);
      const dirB = sub(b.end, b.start);
      const angle = angleBetween(dirA, dirB);
      return {
        type: "T",
        point: proj.closest,
        wallIds: [a.id, b.id],
        angle,
      };
    }
  }

  // Check b's endpoints against a's interior
  for (const pt of [b.start, b.end]) {
    const proj = projectPointOnSegment(pt, a.start, a.end);
    const segLen = dist(a.start, a.end);
    const margin = ENDPOINT_TOLERANCE / segLen;
    if (proj.t > margin && proj.t < 1 - margin && proj.distance <= T_JOIN_TOLERANCE) {
      const dirA = sub(a.end, a.start);
      const dirB = sub(b.end, b.start);
      const angle = angleBetween(dirA, dirB);
      return {
        type: "T",
        point: proj.closest,
        wallIds: [b.id, a.id], // The wall whose endpoint touches comes first
        angle,
      };
    }
  }

  return null;
}

/**
 * Detect cross-join: two walls crossing at their interiors.
 */
function detectCrossJoin(a: WallSegment, b: WallSegment): DetectedJoin | null {
  const result = segmentIntersection(a.start, a.end, b.start, b.end);
  if (result.intersects && result.point) {
    const dirA = sub(a.end, a.start);
    const dirB = sub(b.end, b.start);
    const angle = angleBetween(dirA, dirB);
    return {
      type: "cross",
      point: result.point,
      wallIds: [a.id, b.id],
      angle,
    };
  }
  return null;
}

/**
 * Detect all joins between two wall segments.
 * Priority: endpoint > T-join > cross-join
 */
function detectJoinBetween(a: WallSegment, b: WallSegment): DetectedJoin | null {
  return detectEndpointJoin(a, b) ?? detectTJoin(a, b) ?? detectCrossJoin(a, b);
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Detect all joins for a newly created wall against existing walls.
 *
 * @param newWall - The newly created wall element
 * @param existingWalls - All existing wall elements in the model
 * @returns Detection result with joins and relationship updates
 */
export function detectWallJoins(
  newWall: Element,
  existingWalls: Element[]
): JoinDetectionResult {
  const newSeg = extractWallSegment(newWall);
  if (!newSeg) {
    return { joins: [], relationshipUpdates: new Map() };
  }

  const joins: DetectedJoin[] = [];

  for (const existing of existingWalls) {
    if (existing.id === newWall.id) continue;
    const existingSeg = extractWallSegment(existing);
    if (!existingSeg) continue;

    const join = detectJoinBetween(newSeg, existingSeg);
    if (join) {
      joins.push(join);
    }
  }

  // Build relationship updates
  const updates = new Map<string, string[]>();
  for (const join of joins) {
    for (const wallId of join.wallIds) {
      const otherId = join.wallIds.find((id) => id !== wallId)!;
      const existing = updates.get(wallId) ?? [];
      if (!existing.includes(otherId)) {
        existing.push(otherId);
      }
      updates.set(wallId, existing);
    }
  }

  return { joins, relationshipUpdates: updates };
}

/**
 * Detect ALL joins between all walls in a model.
 * Useful for full model recomputation.
 */
export function detectAllWallJoins(walls: Element[]): DetectedJoin[] {
  const segments = walls
    .map(extractWallSegment)
    .filter((s): s is WallSegment => s !== null);

  const joins: DetectedJoin[] = [];
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const join = detectJoinBetween(segments[i], segments[j]);
      if (join) {
        joins.push(join);
      }
    }
  }
  return joins;
}

/**
 * Apply join detection results to the model store.
 * Updates `relationships.joins` on all affected walls.
 *
 * @param result - Detection result from detectWallJoins
 * @param updateElement - Function to update an element (from model store)
 * @param getElementById - Function to get an element by ID
 */
export function applyJoinUpdates(
  result: JoinDetectionResult,
  updateElement: (id: string, updates: Partial<Element>) => void,
  getElementById: (id: string) => Element | undefined
): void {
  for (const [wallId, joinedIds] of result.relationshipUpdates) {
    const element = getElementById(wallId);
    if (!element) continue;

    // Merge with existing joins (avoid duplicates)
    const existingJoins = element.relationships.joins ?? [];
    const mergedJoins = [...new Set([...existingJoins, ...joinedIds])];

    updateElement(wallId, {
      relationships: {
        ...element.relationships,
        joins: mergedJoins,
      },
    });
  }
}
