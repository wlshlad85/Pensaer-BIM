/**
 * Self-Healing Utilities for Zustand Stores
 *
 * Provides defensive programming patterns for store operations:
 * - Input validation and sanitization
 * - Safe defaults for missing values
 * - Error recovery helpers
 * - Store integrity checks
 */

import type { Element, ElementType } from "../types";

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate and sanitize an element before adding to store.
 * Fills in missing required fields with sensible defaults.
 */
export function validateElement(element: Partial<Element>): Element {
  const now = Date.now();
  const type = element.type || "unknown";

  return {
    id: element.id || `${type}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    type: type as ElementType,
    name: element.name || `${type} ${now.toString().slice(-4)}`,
    x: sanitizeNumber(element.x, 0),
    y: sanitizeNumber(element.y, 0),
    width: sanitizeNumber(element.width, 100, 1),
    height: sanitizeNumber(element.height, 100, 1),
    properties: element.properties || {},
    relationships: element.relationships || {},
    issues: element.issues || [],
    aiSuggestions: element.aiSuggestions || [],
  };
}

/**
 * Sanitize a number value with bounds and default.
 */
export function sanitizeNumber(
  value: number | undefined | null,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return defaultValue;
  }
  let result = value;
  if (min !== undefined) {
    result = Math.max(min, result);
  }
  if (max !== undefined) {
    result = Math.min(max, result);
  }
  return result;
}

/**
 * Sanitize coordinate value (clamp to reasonable BIM range).
 */
export function sanitizeCoordinate(value: number | undefined): number {
  const MAX_COORD = 100000; // 100km reasonable limit
  return sanitizeNumber(value, 0, -MAX_COORD, MAX_COORD);
}

/**
 * Sanitize dimension value (must be positive).
 */
export function sanitizeDimension(
  value: number | undefined,
  defaultValue: number = 100
): number {
  return sanitizeNumber(value, defaultValue, 0.001);
}

// ============================================
// ARRAY HELPERS
// ============================================

/**
 * Safe array filter that handles undefined/null.
 */
export function safeFilter<T>(
  array: T[] | undefined | null,
  predicate: (item: T) => boolean
): T[] {
  if (!Array.isArray(array)) return [];
  return array.filter(predicate);
}

/**
 * Safe array find with type guard.
 */
export function safeFind<T>(
  array: T[] | undefined | null,
  predicate: (item: T) => boolean
): T | undefined {
  if (!Array.isArray(array)) return undefined;
  return array.find(predicate);
}

/**
 * Remove duplicates from string array.
 */
export function dedupeStrings(array: string[]): string[] {
  return [...new Set(array)];
}

/**
 * Remove items from array by IDs.
 */
export function removeByIds<T extends { id: string }>(
  array: T[],
  idsToRemove: string[]
): T[] {
  const removeSet = new Set(idsToRemove);
  return array.filter((item) => !removeSet.has(item.id));
}

// ============================================
// STORE INTEGRITY
// ============================================

/**
 * Check for orphaned relationships in elements.
 * Returns list of issues found.
 */
export function checkElementIntegrity(elements: Element[]): string[] {
  const issues: string[] = [];
  const allIds = new Set(elements.map((e) => e.id));

  for (const element of elements) {
    // Check hostedBy reference
    if (element.relationships.hostedBy) {
      if (!allIds.has(element.relationships.hostedBy)) {
        issues.push(
          `${element.id}: hostedBy references non-existent ${element.relationships.hostedBy}`
        );
      }
    }

    // Check hosts array
    for (const hostId of element.relationships.hosts || []) {
      if (!allIds.has(hostId)) {
        issues.push(
          `${element.id}: hosts references non-existent ${hostId}`
        );
      }
    }

    // Check joins array
    for (const joinId of element.relationships.joins || []) {
      if (!allIds.has(joinId)) {
        issues.push(
          `${element.id}: joins references non-existent ${joinId}`
        );
      }
    }

    // Check bounds/boundedBy
    for (const boundId of element.relationships.bounds || []) {
      if (!allIds.has(boundId)) {
        issues.push(
          `${element.id}: bounds references non-existent ${boundId}`
        );
      }
    }
    for (const boundedById of element.relationships.boundedBy || []) {
      if (!allIds.has(boundedById)) {
        issues.push(
          `${element.id}: boundedBy references non-existent ${boundedById}`
        );
      }
    }
  }

  return issues;
}

/**
 * Repair orphaned relationships by removing invalid references.
 */
export function repairElementRelationships(elements: Element[]): Element[] {
  const allIds = new Set(elements.map((e) => e.id));

  return elements.map((element) => {
    const relationships = { ...element.relationships };

    // Filter hostedBy
    if (relationships.hostedBy && !allIds.has(relationships.hostedBy)) {
      delete relationships.hostedBy;
    }

    // Filter array relationships
    if (relationships.hosts) {
      relationships.hosts = relationships.hosts.filter((id) => allIds.has(id));
    }
    if (relationships.joins) {
      relationships.joins = relationships.joins.filter((id) => allIds.has(id));
    }
    if (relationships.bounds) {
      relationships.bounds = relationships.bounds.filter((id) => allIds.has(id));
    }
    if (relationships.boundedBy) {
      relationships.boundedBy = relationships.boundedBy.filter((id) =>
        allIds.has(id)
      );
    }
    if (relationships.leadsTo) {
      relationships.leadsTo = relationships.leadsTo.filter(
        (id) => allIds.has(id) || id === "exterior"
      );
    }
    if (relationships.accessVia) {
      relationships.accessVia = relationships.accessVia.filter((id) =>
        allIds.has(id)
      );
    }
    if (relationships.connectedTo) {
      relationships.connectedTo = relationships.connectedTo.filter((id) =>
        allIds.has(id)
      );
    }
    if (relationships.supports) {
      relationships.supports = relationships.supports.filter((id) =>
        allIds.has(id)
      );
    }
    if (relationships.supportedBy) {
      relationships.supportedBy = relationships.supportedBy.filter((id) =>
        allIds.has(id)
      );
    }
    if (relationships.covers) {
      relationships.covers = relationships.covers.filter((id) =>
        allIds.has(id)
      );
    }

    // Filter facesRoom
    if (relationships.facesRoom && !allIds.has(relationships.facesRoom)) {
      delete relationships.facesRoom;
    }

    return { ...element, relationships };
  });
}

// ============================================
// ERROR RECOVERY
// ============================================

/**
 * Safe JSON parse with fallback.
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn("Failed to parse JSON, using fallback");
    return fallback;
  }
}

/**
 * Safe JSON stringify with error handling.
 */
export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (e) {
    console.error("Failed to stringify value:", e);
    return "{}";
  }
}

/**
 * Deep clone with fallback for non-clonable values.
 */
export function safeDeepClone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    console.warn("Failed to deep clone, returning shallow copy");
    if (Array.isArray(value)) {
      return [...value] as T;
    }
    if (typeof value === "object" && value !== null) {
      return { ...value };
    }
    return value;
  }
}

// ============================================
// LOGGING
// ============================================

/**
 * Self-healing operation log entry.
 */
export interface HealingLogEntry {
  timestamp: number;
  operation: string;
  original: unknown;
  healed: unknown;
  reason: string;
}

const healingLog: HealingLogEntry[] = [];
const MAX_LOG_SIZE = 100;

/**
 * Log a self-healing operation.
 */
export function logHealing(
  operation: string,
  original: unknown,
  healed: unknown,
  reason: string
): void {
  const entry: HealingLogEntry = {
    timestamp: Date.now(),
    operation,
    original,
    healed,
    reason,
  };

  healingLog.push(entry);
  if (healingLog.length > MAX_LOG_SIZE) {
    healingLog.shift();
  }

  if (process.env.NODE_ENV === "development") {
    console.debug(`[SelfHealing] ${operation}: ${reason}`, { original, healed });
  }
}

/**
 * Get recent healing log entries.
 */
export function getHealingLog(): readonly HealingLogEntry[] {
  return healingLog;
}

/**
 * Clear the healing log.
 */
export function clearHealingLog(): void {
  healingLog.length = 0;
}
