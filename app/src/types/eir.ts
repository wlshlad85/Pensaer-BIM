/**
 * Pensaer BIM Platform - EIR/BEP Type Definitions
 *
 * Exchange Information Requirements (EIR) and BIM Execution Plan (BEP)
 * schemas per ISO 19650 series.
 *
 * @module types/eir
 */

import type { ElementType } from "./elements";

// ============================================
// PROJECT STAGES (ISO 19650 / RIBA)
// ============================================

export type ProjectStage =
  | "0-strategic-definition"
  | "1-preparation-and-briefing"
  | "2-concept-design"
  | "3-spatial-coordination"
  | "4-technical-design"
  | "5-manufacturing-and-construction"
  | "6-handover"
  | "7-use";

// ============================================
// LEVEL OF INFORMATION NEED (ISO 19650-1)
// ============================================

/**
 * Geometry detail level — how much geometric fidelity is required.
 * Roughly maps to traditional LOD (Level of Detail/Development).
 */
export type GeometryDetailLevel =
  | "none"           // No geometry required
  | "schematic"      // Simple 2D / symbolic representation
  | "approximate"    // Approximate 3D massing
  | "detailed"       // Detailed geometry with key dimensions
  | "manufacturer";  // Manufacturer-specific / as-built geometry

/**
 * Information detail level — how much alphanumeric data is required.
 */
export type InformationDetailLevel =
  | "none"
  | "basic"          // Type & name only
  | "preliminary"    // Key performance properties
  | "detailed"       // Full specification data
  | "as-built";      // Verified as-installed data

/**
 * Documentation level — what documents must be attached/linked.
 */
export type DocumentationLevel =
  | "none"
  | "reference"      // Reference to external docs
  | "linked"         // Links to product datasheets
  | "embedded";      // Full documentation embedded/attached

/**
 * Combined Level of Information Need for an element requirement.
 */
export interface LevelOfInformationNeed {
  geometry: GeometryDetailLevel;
  information: InformationDetailLevel;
  documentation: DocumentationLevel;
}

// ============================================
// EIR — EXCHANGE INFORMATION REQUIREMENTS
// ============================================

/**
 * A single required property on an element type.
 */
export interface RequiredProperty {
  /** Property name (must exist on the element's `properties` map) */
  name: string;
  /** Human-readable label */
  label: string;
  /** Expected value type */
  valueType: "string" | "number" | "boolean";
  /** If true, property must be present and non-empty */
  required: boolean;
  /** Optional regex or range constraint */
  constraint?: string;
  /** Description of what this property represents */
  description?: string;
}

/**
 * Requirements for a specific element type within a project stage.
 */
export interface ElementRequirement {
  /** The element type this requirement applies to */
  elementType: ElementType;
  /** Minimum count of this element type (0 = optional but if present must comply) */
  minCount: number;
  /** Maximum count (undefined = no limit) */
  maxCount?: number;
  /** Required Level of Information Need */
  levelOfInformationNeed: LevelOfInformationNeed;
  /** Required properties on each element of this type */
  requiredProperties: RequiredProperty[];
  /** Human-readable notes */
  notes?: string;
}

/**
 * A data drop / milestone defining what must be delivered and when.
 */
export interface DataDrop {
  /** Unique identifier for this data drop */
  id: string;
  /** Display name */
  name: string;
  /** ISO date string for the deadline */
  deadline: string;
  /** Which project stage this drop belongs to */
  stage: ProjectStage;
  /** Description of deliverables */
  description: string;
  /** Element requirements specific to this data drop */
  requirements: ElementRequirement[];
}

/**
 * The full EIR template document.
 */
export interface EIRTemplate {
  /** Schema version */
  version: string;
  /** EIR document identifier */
  id: string;
  /** Project name */
  projectName: string;
  /** Appointing party (client) */
  appointingParty: string;
  /** Date created (ISO string) */
  createdDate: string;
  /** Description */
  description?: string;
  /** Standards referenced */
  standards: string[];
  /** Data drops / milestones */
  dataDrops: DataDrop[];
  /** Global requirements that apply across all data drops */
  globalRequirements: ElementRequirement[];
}

// ============================================
// BEP — BIM EXECUTION PLAN
// ============================================

/**
 * How a specific element requirement will be delivered.
 */
export interface DeliveryApproach {
  /** Reference to the element requirement */
  elementType: ElementType;
  /** Who is responsible */
  responsibleParty: string;
  /** Software/tool to be used */
  authoringTool: string;
  /** Planned Level of Information Need (should meet or exceed EIR) */
  plannedLOIN: LevelOfInformationNeed;
  /** Additional notes on delivery method */
  notes?: string;
}

/**
 * Response to a specific data drop.
 */
export interface DataDropResponse {
  /** ID of the data drop being responded to */
  dataDropId: string;
  /** Delivery approaches per element type */
  deliveryApproaches: DeliveryApproach[];
  /** Planned delivery date (ISO string) */
  plannedDeliveryDate: string;
  /** Notes */
  notes?: string;
}

/**
 * The full BEP document.
 */
export interface BEPTemplate {
  /** Schema version */
  version: string;
  /** BEP document identifier */
  id: string;
  /** Reference to the EIR this responds to */
  eirId: string;
  /** Project name */
  projectName: string;
  /** Lead appointed party */
  leadAppointedParty: string;
  /** Date created */
  createdDate: string;
  /** Appointed parties / team members */
  projectTeam: {
    role: string;
    organisation: string;
    contact?: string;
  }[];
  /** Responses to each data drop */
  dataDropResponses: DataDropResponse[];
  /** Information delivery strategy */
  informationDeliveryStrategy?: string;
  /** Federated model strategy */
  federationStrategy?: string;
  /** Clash detection approach */
  clashDetectionApproach?: string;
  /** Software platforms */
  softwarePlatforms: string[];
}

// ============================================
// VALIDATION RESULTS
// ============================================

export type EIRComplianceStatus = "pass" | "fail" | "warning" | "not-applicable";

/**
 * Result of checking one element requirement.
 */
export interface EIRValidationItem {
  /** Which requirement this result is for */
  requirement: ElementRequirement;
  /** Which data drop (or 'global') */
  dataDropId: string;
  /** Overall status */
  status: EIRComplianceStatus;
  /** Pass/fail details */
  details: string;
  /** Element IDs that are non-compliant */
  nonCompliantElementIds: string[];
  /** Specific property issues */
  propertyIssues: {
    elementId: string;
    propertyName: string;
    issue: string;
  }[];
  /** Count found vs required */
  foundCount: number;
  requiredCount: number;
}

/**
 * Full validation report.
 */
export interface EIRValidationReport {
  /** When the validation was run */
  timestamp: string;
  /** EIR being validated against */
  eirId: string;
  /** Data drop being validated (or 'all') */
  dataDropId: string;
  /** Individual validation items */
  items: EIRValidationItem[];
  /** Summary counts */
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    notApplicable: number;
  };
}
