/**
 * Pensaer BIM Platform - Validation Type Definitions
 *
 * Interfaces for validation issues and AI-generated suggestions.
 * Used throughout the application for quality checking and recommendations.
 *
 * @module types/validation
 */

import type { ElementId } from "./elements";

// ============================================
// ISSUE TYPES
// ============================================

/**
 * Classification of issue severity.
 */
export type IssueType = "error" | "warning" | "info";

/**
 * Priority level for issues, determining urgency of resolution.
 */
export type IssueSeverity = "critical" | "high" | "medium" | "low";

/**
 * Categories of validation issues.
 */
export type IssueCategory =
  | "geometry"      // Invalid geometry, dimensions
  | "relationship"  // Missing or invalid relationships
  | "compliance"    // Code/regulation violations
  | "performance"   // Energy, acoustic, thermal issues
  | "accessibility" // ADA/accessibility violations
  | "clash"         // Element collision/clash detection
  | "structural"    // Structural integrity issues
  | "fire-safety"   // Fire safety violations
  | "general";      // Other issues

/**
 * A validation issue detected on an element.
 *
 * @example
 * ```ts
 * const issue: Issue = {
 *   id: 'issue-1',
 *   type: 'error',
 *   severity: 'critical',
 *   category: 'fire-safety',
 *   code: 'FIRE-001',
 *   message: 'Fire door required - exit route exceeds 30m',
 *   fixable: true,
 *   fix: {
 *     description: 'Change door type to fire door',
 *     action: 'update',
 *     properties: { isFireDoor: true, fireRating: 60 }
 *   }
 * };
 * ```
 */
export interface Issue {
  /** Unique identifier for the issue */
  id?: string;

  /** Issue type classification */
  type: IssueType;

  /** Human-readable message describing the issue */
  message: string;

  /** Severity level for prioritization */
  severity?: IssueSeverity;

  /** Issue category for filtering */
  category?: IssueCategory;

  /**
   * Unique issue code for reference.
   * Format: CATEGORY-NUMBER (e.g., 'FIRE-001', 'CLASH-002')
   */
  code?: string;

  /** Whether this issue can be automatically fixed */
  fixable?: boolean;

  /** Automatic fix details, if available */
  fix?: IssueFix;

  /** Related element IDs involved in the issue */
  relatedElements?: ElementId[];

  /** Source of the validation (manual, automated, AI) */
  source?: "manual" | "automated" | "ai";

  /** Timestamp when issue was detected */
  detectedAt?: number;
}

/**
 * Automatic fix for a validation issue.
 */
export interface IssueFix {
  /** Human-readable description of the fix */
  description: string;

  /** Type of fix action */
  action: "update" | "delete" | "add" | "move" | "resize";

  /** Properties to update (for update action) */
  properties?: Record<string, unknown>;

  /** Estimated time to apply fix */
  estimatedTime?: number;

  /** Confidence level of the fix (0-1) */
  confidence?: number;
}

// ============================================
// AI SUGGESTION TYPES
// ============================================

/**
 * Priority level for AI suggestions.
 */
export type SuggestionPriority = "high" | "medium" | "low" | "info";

/**
 * Categories of AI suggestions.
 */
export type SuggestionCategory =
  | "optimization"   // Performance improvements
  | "compliance"     // Regulatory suggestions
  | "design"         // Design improvements
  | "cost"           // Cost-saving suggestions
  | "sustainability" // Environmental suggestions
  | "accessibility"  // Accessibility improvements
  | "workflow";      // Workflow optimizations

/**
 * An AI-generated suggestion for element improvement.
 *
 * @example
 * ```ts
 * const suggestion: Suggestion = {
 *   id: 'sug-1',
 *   icon: 'lightbulb',
 *   text: 'Consider adding a window for natural light',
 *   priority: 'medium',
 *   category: 'design',
 *   confidence: 0.85,
 *   reasoning: 'Room has no windows and faces south'
 * };
 * ```
 */
export interface Suggestion {
  /** Unique identifier for the suggestion */
  id?: string;

  /** Icon identifier for display */
  icon: string;

  /** Human-readable suggestion text */
  text: string;

  /** Priority level */
  priority: SuggestionPriority;

  /** Suggestion category */
  category?: SuggestionCategory;

  /** Confidence score (0-1) from AI model */
  confidence?: number;

  /** AI reasoning explanation */
  reasoning?: string;

  /** Action function to apply the suggestion */
  action?: () => void;

  /** Whether this suggestion has been dismissed */
  dismissed?: boolean;

  /** Timestamp when suggestion was generated */
  generatedAt?: number;
}

// ============================================
// VALIDATION RESULT TYPES
// ============================================

/**
 * Result of a validation run.
 */
export interface ValidationResult {
  /** Whether validation passed (no errors) */
  passed: boolean;

  /** Total number of issues found */
  issueCount: number;

  /** Breakdown by severity */
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };

  /** Breakdown by category */
  byCategory: Partial<Record<IssueCategory, number>>;

  /** All issues found */
  issues: Issue[];

  /** Timestamp of validation run */
  timestamp: number;

  /** Duration of validation in ms */
  duration: number;
}

/**
 * Configuration for validation runs.
 */
export interface ValidationConfig {
  /** Categories to check */
  categories?: IssueCategory[];

  /** Minimum severity to report */
  minSeverity?: IssueSeverity;

  /** Whether to include AI suggestions */
  includeSuggestions?: boolean;

  /** Maximum issues to return */
  maxIssues?: number;

  /** Specific element IDs to validate */
  elementIds?: ElementId[];
}
