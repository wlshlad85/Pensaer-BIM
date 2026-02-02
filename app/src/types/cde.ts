/**
 * CDE (Common Data Environment) Workflow States per ISO 19650
 *
 * Every information container follows: WIP → Shared → Published → Archived
 *
 * @module types/cde
 */

// ============================================
// CDE STATE ENUM
// ============================================

/**
 * CDE lifecycle states per ISO 19650.
 * - WIP: Work in Progress — element is being authored
 * - Shared: Shared for coordination/review
 * - Published: Approved and published
 * - Archived: No longer active, retained for record
 */
export type CDEState = "WIP" | "Shared" | "Published" | "Archived";

/**
 * All valid CDE states in lifecycle order.
 */
export const CDE_STATES: readonly CDEState[] = [
  "WIP",
  "Shared",
  "Published",
  "Archived",
] as const;

// ============================================
// SUITABILITY CODES
// ============================================

/**
 * Suitability codes per ISO 19650 for Shared state.
 * - S0: Work in Progress (initial sharing)
 * - S1: For coordination
 * - S2: For information
 * - S3: For review and comment
 * - S4: For stage approval
 */
export type SuitabilityCode = "S0" | "S1" | "S2" | "S3" | "S4";

/**
 * All valid suitability codes with descriptions.
 */
export const SUITABILITY_CODES: Record<SuitabilityCode, string> = {
  S0: "Work in Progress",
  S1: "For Coordination",
  S2: "For Information",
  S3: "For Review & Comment",
  S4: "For Stage Approval",
} as const;

// ============================================
// VALID TRANSITIONS
// ============================================

/**
 * Valid CDE state transitions.
 * WIP → Shared, Shared → Published, Published → Archived
 * (Shared → WIP is also allowed as a rejection/rework path)
 */
export const VALID_TRANSITIONS: Record<CDEState, CDEState[]> = {
  WIP: ["Shared"],
  Shared: ["Published", "WIP"],
  Published: ["Archived"],
  Archived: [],
};

/**
 * Check if a state transition is valid.
 */
export function isValidTransition(
  from: CDEState,
  to: CDEState
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

// ============================================
// AUDIT TRAIL
// ============================================

/**
 * A single CDE state transition record.
 */
export interface CDETransitionRecord {
  /** Previous state */
  fromState: CDEState;
  /** New state */
  toState: CDEState;
  /** Suitability code (if transitioning to Shared) */
  suitabilityCode?: SuitabilityCode;
  /** ISO timestamp of the transition */
  timestamp: string;
  /** User who performed the transition */
  user: string;
  /** Optional reason/comment */
  reason?: string;
}

// ============================================
// CDE VISUAL CONFIG
// ============================================

/**
 * Colour configuration for CDE state visual indicators.
 */
export const CDE_STATE_COLOURS: Record<CDEState, { fill: string; stroke: string; label: string }> = {
  WIP: { fill: "rgba(234, 179, 8, 0.25)", stroke: "#eab308", label: "WIP" },
  Shared: { fill: "rgba(59, 130, 246, 0.25)", stroke: "#3b82f6", label: "SHR" },
  Published: { fill: "rgba(34, 197, 94, 0.25)", stroke: "#22c55e", label: "PUB" },
  Archived: { fill: "rgba(156, 163, 175, 0.25)", stroke: "#9ca3af", label: "ARC" },
};
