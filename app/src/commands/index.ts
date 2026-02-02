/**
 * Pensaer Commands Module
 *
 * Exports command handlers and initialization functions.
 */

export { registerElementCommands } from "./handlers/elementCommands";
export { registerBuiltinCommands } from "./handlers/builtinCommands";
export { registerCDECommands } from "./handlers/cdeCommands";

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
import { registerCDECommands as _registerCDECommands } from "./handlers/cdeCommands";

/**
 * Initialize all command handlers
 * Call this during app startup
 */
export function initializeCommands(): void {
  // Register built-in commands (help, clear, status, version, echo)
  _registerBuiltinCommands();

  // Register element commands (wall, floor, roof, etc.)
  _registerElementCommands();

  // Register CDE workflow commands (share, publish, archive, cde status)
  _registerCDECommands();
}
