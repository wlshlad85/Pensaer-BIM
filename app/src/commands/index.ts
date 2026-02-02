/**
 * Pensaer Commands Module
 *
 * Exports command handlers and initialization functions.
 */

export { registerElementCommands } from "./handlers/elementCommands";
export { registerBuiltinCommands } from "./handlers/builtinCommands";
export { registerSelectionCommands } from "./handlers/selectionCommands";
export { registerMoveModifyCommands } from "./handlers/moveModifyCommands";

// Re-export dispatcher types and functions
export {
  // Core dispatch
  dispatchCommand,
  dispatchCommandWithContext,

  // Registry
  getCommand,
  getAllCommands,

  // Context
  getCommandContext,

  // Parsing
  parseCommandString,
  parseArguments,
  parseValue,

  // Logging
  setLoggingEnabled,
  isLoggingEnabled,
  getCommandLog,
  clearCommandLog,

  // Types
  type CommandContext,
  type CommandResult,
  type CommandHandler,
  type CommandDefinition,
  type DispatchOptions,
  type CommandLogEntry,
} from "../services/commandDispatcher";

import { registerBuiltinCommands as _registerBuiltinCommands } from "./handlers/builtinCommands";
import { registerElementCommands as _registerElementCommands } from "./handlers/elementCommands";
import { registerSelectionCommands as _registerSelectionCommands } from "./handlers/selectionCommands";
import { registerMoveModifyCommands as _registerMoveModifyCommands } from "./handlers/moveModifyCommands";

/**
 * Initialize all command handlers
 * Call this during app startup
 */
export function initializeCommands(): void {
  // Register built-in commands (help, clear, status, version, echo)
  _registerBuiltinCommands();

  // Register element commands (wall, floor, roof, etc.)
  _registerElementCommands();

  // Register selection commands (select, deselect)
  _registerSelectionCommands();

  // Register move/modify commands (P1-006)
  _registerMoveModifyCommands();
}
