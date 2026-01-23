/**
 * Terminal Persistence Service
 *
 * Handles localStorage persistence for terminal-related data.
 * Centralizes all terminal persistence logic.
 */

// Storage keys
const STORAGE_KEYS = {
  COMMAND_HISTORY: "pensaer-terminal-history",
  MACROS: "pensaer-terminal-macros",
} as const;

// Limits
const MAX_HISTORY_SIZE = 100;

/**
 * Load command history from localStorage
 */
export function loadCommandHistory(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.COMMAND_HISTORY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((cmd): cmd is string => typeof cmd === "string");
      }
    }
  } catch (error) {
    console.warn("Failed to load command history:", error);
  }
  return [];
}

/**
 * Save command history to localStorage
 */
export function saveCommandHistory(history: string[]): void {
  try {
    // Trim to max size
    const trimmed = history.slice(-MAX_HISTORY_SIZE);
    localStorage.setItem(
      STORAGE_KEYS.COMMAND_HISTORY,
      JSON.stringify(trimmed)
    );
  } catch (error) {
    console.warn("Failed to save command history:", error);
  }
}

/**
 * Add a command to history (deduplicates consecutive duplicates)
 */
export function addToHistory(history: string[], command: string): string[] {
  const trimmedCommand = command.trim();
  if (!trimmedCommand) return history;

  // Don't add duplicate of last command
  if (history.length > 0 && history[history.length - 1] === trimmedCommand) {
    return history;
  }

  const newHistory = [...history, trimmedCommand];

  // Trim to max size
  if (newHistory.length > MAX_HISTORY_SIZE) {
    return newHistory.slice(-MAX_HISTORY_SIZE);
  }

  return newHistory;
}

/**
 * Clear command history
 */
export function clearCommandHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.COMMAND_HISTORY);
  } catch (error) {
    console.warn("Failed to clear command history:", error);
  }
}

// ============================================
// LEGACY MACRO SUPPORT
// ============================================
// Note: These are kept for backward compatibility.
// New code should use useMacroStore from stores/macroStore.ts

export interface LegacyMacro {
  name: string;
  commands: string[];
}

/**
 * Load macros from localStorage (legacy format)
 * @deprecated Use useMacroStore instead
 */
export function loadLegacyMacros(): LegacyMacro[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.MACROS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (m): m is LegacyMacro =>
            typeof m === "object" &&
            typeof m.name === "string" &&
            Array.isArray(m.commands)
        );
      }
    }
  } catch (error) {
    console.warn("Failed to load legacy macros:", error);
  }
  return [];
}

/**
 * Save macros to localStorage (legacy format)
 * @deprecated Use useMacroStore instead
 */
export function saveLegacyMacros(macros: LegacyMacro[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MACROS, JSON.stringify(macros));
  } catch (error) {
    console.warn("Failed to save legacy macros:", error);
  }
}

/**
 * Migrate legacy macros to the new store format
 */
export function migrateLegacyMacros(): {
  migrated: number;
  macros: LegacyMacro[];
} {
  const legacyMacros = loadLegacyMacros();
  if (legacyMacros.length === 0) {
    return { migrated: 0, macros: [] };
  }

  // Return the macros for the caller to import into the store
  return { migrated: legacyMacros.length, macros: legacyMacros };
}
