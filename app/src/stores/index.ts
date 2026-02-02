/**
 * Pensaer BIM Platform - Store Exports
 */

export { useModelStore } from "./modelStore";
export { useSelectionStore } from "./selectionStore";
export { useUIStore } from "./uiStore";
export {
  useHistoryStore,
  initializeHistory,
  handleUndoRedo,
} from "./historyStore";
export { useTokenStore } from "./tokenStore";
export { useMacroStore } from "./macroStore";
export {
  useNamingStore,
  TYPE_CODES,
  DISCIPLINE_CODES,
  ELEMENT_DISCIPLINE_MAP,
  levelToCode,
  padNumber,
  type NamingConfig,
  type IsoName,
} from "./namingStore";

// ISO 19650 naming middleware
export { initializeNamingMiddleware } from "./namingMiddleware";

// Self-healing utilities
export {
  validateElement,
  sanitizeNumber,
  sanitizeCoordinate,
  sanitizeDimension,
  safeFilter,
  safeFind,
  dedupeStrings,
  removeByIds,
  checkElementIntegrity,
  repairElementRelationships,
  safeJsonParse,
  safeJsonStringify,
  safeDeepClone,
  logHealing,
  getHealingLog,
  clearHealingLog,
  type HealingLogEntry,
} from "./selfHealing";

// Expose stores globally for testing/debugging (development only)
if (typeof window !== "undefined") {
  import("./modelStore").then(
    (m) =>
      ((window as unknown as Record<string, unknown>).modelStore =
        m.useModelStore),
  );
  import("./selectionStore").then(
    (m) =>
      ((window as unknown as Record<string, unknown>).selectionStore =
        m.useSelectionStore),
  );
  import("./uiStore").then(
    (m) =>
      ((window as unknown as Record<string, unknown>).uiStore = m.useUIStore),
  );
}
