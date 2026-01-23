/**
 * Command Dispatcher Service
 *
 * Central dispatcher that routes terminal commands to MCP client
 * and manages async execution with loading states.
 *
 * Features:
 * - Command registry pattern for extensible command handling
 * - Quoted argument parsing (single and double quotes)
 * - Context-aware command execution with selected elements
 * - Comprehensive logging for debugging
 */

import { mcpClient, type MCPToolResult } from "./mcpClient";
import { useSelectionStore } from "../stores/selectionStore";
import { useModelStore } from "../stores/modelStore";
import { useMacroStore } from "../stores/macroStore";

// ============================================
// TYPES
// ============================================

export interface CommandContext {
  /** Currently selected element IDs */
  selectedIds: string[];
  /** All element IDs in the model */
  allElementIds: string[];
  /** Current element count by type */
  elementCounts: Map<string, number>;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  warnings?: string[];
  elementCreated?: {
    id: string;
    type: string;
  };
}

// ============================================
// COMMAND LOGGING
// ============================================

export interface CommandLogEntry {
  timestamp: number;
  command: string;
  args: Record<string, unknown>;
  result: CommandResult;
  durationMs: number;
  context?: CommandContext;
}

// In-memory command log (circular buffer)
const MAX_LOG_SIZE = 100;
const commandLog: CommandLogEntry[] = [];
let loggingEnabled = true;

/**
 * Enable or disable command logging
 */
export function setLoggingEnabled(enabled: boolean): void {
  loggingEnabled = enabled;
}

/**
 * Check if logging is enabled
 */
export function isLoggingEnabled(): boolean {
  return loggingEnabled;
}

/**
 * Get the command log (most recent first)
 */
export function getCommandLog(): ReadonlyArray<CommandLogEntry> {
  return [...commandLog].reverse();
}

/**
 * Clear the command log
 */
export function clearCommandLog(): void {
  commandLog.length = 0;
}

/**
 * Add an entry to the command log
 */
function logCommand(entry: CommandLogEntry): void {
  if (!loggingEnabled) return;

  commandLog.push(entry);

  // Circular buffer: remove oldest entries if over limit
  while (commandLog.length > MAX_LOG_SIZE) {
    commandLog.shift();
  }

  // Also log to console in development
  if (import.meta.env?.DEV) {
    const status = entry.result.success ? "✓" : "✗";
    console.log(
      `[Command] ${status} ${entry.command} (${entry.durationMs}ms)`,
      { args: entry.args, result: entry.result }
    );
  }
}

// ============================================
// COMMAND PARSING
// ============================================

/**
 * Parse a command string into command name and arguments.
 * Handles quoted strings (single and double quotes).
 *
 * @example
 * parseCommandString('wall --name "My Wall" --start 0,0')
 * // Returns: { command: 'wall', rawArgs: ['--name', 'My Wall', '--start', '0,0'] }
 */
export function parseCommandString(input: string): {
  command: string;
  rawArgs: string[];
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { command: "", rawArgs: [] };
  }

  const tokens: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escapeNext = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    // Handle escape character
    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    // Handle quotes
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    // Handle whitespace (token separator when not in quotes)
    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  // Push final token
  if (current) {
    tokens.push(current);
  }

  const [command, ...rawArgs] = tokens;
  return { command: command || "", rawArgs };
}

/**
 * Parse raw arguments into a key-value map.
 * Supports --key value, --key=value, and positional arguments.
 *
 * @example
 * parseArguments(['--start', '0,0', '--name', 'Wall', '--height=3.0'])
 * // Returns: { start: [0, 0], name: 'Wall', height: 3.0 }
 */
export function parseArguments(rawArgs: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const positional: unknown[] = [];
  let i = 0;

  while (i < rawArgs.length) {
    const arg = rawArgs[i];

    if (arg.startsWith("--")) {
      const keyPart = arg.slice(2);

      // Handle --key=value syntax
      if (keyPart.includes("=")) {
        const [key, ...valueParts] = keyPart.split("=");
        const valueStr = valueParts.join("="); // Rejoin in case value had = in it
        result[key] = parseValue(valueStr);
      }
      // Handle --key value syntax
      else if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith("--")) {
        result[keyPart] = parseValue(rawArgs[i + 1]);
        i++;
      }
      // Handle --flag (boolean true)
      else {
        result[keyPart] = true;
      }
    }
    // Positional argument
    else {
      positional.push(parseValue(arg));
    }

    i++;
  }

  // Add positional arguments if any
  if (positional.length > 0) {
    result._positional = positional;
  }

  return result;
}

/**
 * Parse a value string to appropriate type.
 * Handles numbers, booleans, coordinate pairs, and strings.
 */
export function parseValue(v: string): unknown {
  // Check for coordinate pairs like "0,0" or "5,5,0"
  if (/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?)+$/.test(v)) {
    return v.split(",").map(Number);
  }

  // Check for numbers
  if (/^-?\d+(\.\d+)?$/.test(v)) {
    return Number(v);
  }

  // Check for booleans
  if (v.toLowerCase() === "true") return true;
  if (v.toLowerCase() === "false") return false;

  return v;
}

export type CommandHandler = (
  args: Record<string, unknown>,
  context: CommandContext
) => Promise<CommandResult>;

/**
 * Reconstruct a command string from command name and arguments
 * Used for macro recording
 */
function reconstructCommandString(
  commandName: string,
  args: Record<string, unknown>
): string {
  const parts = [commandName];

  for (const [key, value] of Object.entries(args)) {
    // Skip internal/meta keys
    if (key.startsWith("_")) continue;

    if (value === true) {
      // Boolean flags
      parts.push(`--${key}`);
    } else if (Array.isArray(value)) {
      // Arrays (e.g., coordinates)
      parts.push(`--${key}`, value.join(","));
    } else if (typeof value === "string" && value.includes(" ")) {
      // Quoted strings
      parts.push(`--${key}`, `"${value}"`);
    } else if (value !== undefined && value !== null && value !== false) {
      parts.push(`--${key}`, String(value));
    }
  }

  return parts.join(" ");
}

export interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  examples: string[];
  handler: CommandHandler;
}

// ============================================
// CONTEXT HELPER
// ============================================

/**
 * Get the current command execution context
 */
export function getCommandContext(): CommandContext {
  const selectedIds = useSelectionStore.getState().selectedIds;
  const elements = useModelStore.getState().elements;

  const elementCounts = new Map<string, number>();
  for (const el of elements) {
    elementCounts.set(el.type, (elementCounts.get(el.type) || 0) + 1);
  }

  return {
    selectedIds,
    allElementIds: elements.map((e) => e.id),
    elementCounts,
  };
}

// ============================================
// MCP TOOL WRAPPERS
// ============================================

/**
 * Call MCP tool and convert result to CommandResult
 */
export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<CommandResult> {
  try {
    const result = await mcpClient.callTool({
      tool: toolName,
      arguments: args,
    });

    return mcpResultToCommandResult(result, toolName);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Convert MCP result to CommandResult
 */
function mcpResultToCommandResult(
  result: MCPToolResult,
  toolName: string
): CommandResult {
  if (result.success) {
    // Extract element ID if created
    let elementCreated: CommandResult["elementCreated"] | undefined;
    if (result.data) {
      const idKeys = ["wall_id", "floor_id", "room_id", "roof_id", "door_id", "window_id"];
      for (const key of idKeys) {
        if (result.data[key]) {
          elementCreated = {
            id: result.data[key] as string,
            type: key.replace("_id", ""),
          };
          break;
        }
      }
    }

    return {
      success: true,
      message: `${toolName} completed successfully`,
      data: result.data,
      warnings: result.warnings,
      elementCreated,
    };
  }

  return {
    success: false,
    message: result.error?.message || `${toolName} failed`,
    data: result.error?.data,
  };
}

// ============================================
// COMMAND REGISTRY
// ============================================

const commandRegistry = new Map<string, CommandDefinition>();

/**
 * Register a command handler
 */
export function registerCommand(definition: CommandDefinition): void {
  commandRegistry.set(definition.name, definition);
}

/**
 * Get a registered command
 */
export function getCommand(name: string): CommandDefinition | undefined {
  return commandRegistry.get(name);
}

/**
 * Get all registered commands
 */
export function getAllCommands(): CommandDefinition[] {
  return Array.from(commandRegistry.values());
}

// ============================================
// COMMAND DISPATCHER
// ============================================

export interface DispatchOptions {
  /** Callback when command starts (for loading indicator) */
  onStart?: () => void;
  /** Callback when command completes */
  onComplete?: (result: CommandResult) => void;
  /** Callback when command errors */
  onError?: (error: Error) => void;
}

/**
 * Dispatch a command by name with arguments
 */
export async function dispatchCommand(
  commandName: string,
  args: Record<string, unknown>,
  options?: DispatchOptions
): Promise<CommandResult> {
  const startTime = Date.now();
  const command = commandRegistry.get(commandName);

  if (!command) {
    const result: CommandResult = {
      success: false,
      message: `Unknown command: ${commandName}`,
    };

    logCommand({
      timestamp: startTime,
      command: commandName,
      args,
      result,
      durationMs: Date.now() - startTime,
    });

    return result;
  }

  options?.onStart?.();

  try {
    const context = getCommandContext();
    const result = await command.handler(args, context);

    logCommand({
      timestamp: startTime,
      command: commandName,
      args,
      result,
      durationMs: Date.now() - startTime,
      context,
    });

    // Record command if macro recording is active (but not macro commands themselves)
    if (result.success && !commandName.startsWith("macro")) {
      const macroState = useMacroStore.getState();
      if (macroState.isRecording) {
        // Reconstruct the command string for playback
        const cmdString = reconstructCommandString(commandName, args);
        macroState.recordCommand(cmdString);
      }
    }

    options?.onComplete?.(result);
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const result: CommandResult = {
      success: false,
      message: err.message,
    };

    logCommand({
      timestamp: startTime,
      command: commandName,
      args,
      result,
      durationMs: Date.now() - startTime,
    });

    options?.onError?.(err);
    return result;
  }
}

/**
 * Dispatch a command with context-aware defaults
 * Automatically injects selected elements when relevant
 */
export async function dispatchCommandWithContext(
  commandName: string,
  args: Record<string, unknown>,
  options?: DispatchOptions
): Promise<CommandResult> {
  const context = getCommandContext();

  // Inject selected elements for commands that support it
  const contextAwareCommands = ["delete", "clash", "get"];
  if (contextAwareCommands.includes(commandName)) {
    if (!args.element_ids && context.selectedIds.length > 0) {
      args.element_ids = context.selectedIds;
    }
    if (!args.element_id && context.selectedIds.length === 1) {
      args.element_id = context.selectedIds[0];
    }
  }

  return dispatchCommand(commandName, args, options);
}

export default {
  // Core dispatch
  callMcpTool,
  dispatchCommand,
  dispatchCommandWithContext,

  // Registry
  registerCommand,
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
};
