/**
 * Persistence Services
 *
 * Centralized data persistence utilities.
 */

export {
  loadCommandHistory,
  saveCommandHistory,
  addToHistory,
  clearCommandHistory,
  loadLegacyMacros,
  saveLegacyMacros,
  migrateLegacyMacros,
  type LegacyMacro,
} from "./terminalPersistence";
