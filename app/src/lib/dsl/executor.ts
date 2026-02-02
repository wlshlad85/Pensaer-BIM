/**
 * DSL Command Executor
 *
 * Executes parsed DSL commands by dispatching them to the MCP tool servers
 * via the command dispatcher service.
 *
 * This bridges the DSL parser (AST) to the command execution layer.
 */

import { parse } from "./parser";
import {
  type Command,
  type ParseResult,
  commandToMcpArgs,
  VariableRef,
} from "./ast";
import { formatParseErrors, ANSI } from "./errorFormatter";
import {
  dispatchCommand,
  type CommandResult,
} from "../../services/commandDispatcher";

// =============================================================================
// Types
// =============================================================================

export interface ExecutionContext {
  /** ID of the last created element (for $last reference) */
  lastElementId?: string;
  /** IDs of currently selected elements (for $selected reference) */
  selectedIds?: string[];
  /** ID of a specific wall element (for $wall reference) */
  wallId?: string;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  /** Results from each command executed */
  commandResults: CommandResult[];
  /** IDs of elements created during execution */
  createdElementIds: string[];
  /** Any warnings generated during execution */
  warnings: string[];
  /** Formatted output for terminal display */
  terminalOutput: string[];
}

// =============================================================================
// Command Type to MCP Tool Mapping
// =============================================================================

const COMMAND_TO_TOOL: Record<string, string> = {
  CreateWall: "wall",
  CreateRectWalls: "__rect_walls__", // Handled specially in executeCommand
  ModifyWall: "modify",
  PlaceDoor: "door",
  ModifyDoor: "modify",
  PlaceWindow: "window",
  ModifyWindow: "modify",
  CreateOpening: "opening",
  CreateFloor: "floor",
  CreateRoof: "roof",
  CreateRoom: "room",
  Help: "help",
};

// =============================================================================
// Variable Resolution
// =============================================================================

/**
 * Resolve a variable reference to an actual element ID
 */
function resolveVariable(
  variable: VariableRef,
  context: ExecutionContext
): string | undefined {
  switch (variable) {
    case VariableRef.LAST:
      return context.lastElementId;
    case VariableRef.SELECTED:
      return context.selectedIds?.[0];
    case VariableRef.WALL:
      return context.wallId;
    default:
      return undefined;
  }
}

/**
 * Resolve variable references in command arguments
 */
function resolveVariablesInArgs(
  args: Record<string, unknown>,
  context: ExecutionContext
): Record<string, unknown> {
  const resolved = { ...args };

  // Check for wall_id that might be a variable
  if (resolved.wall_id === undefined && resolved._wallRef) {
    const wallRef = resolved._wallRef as { variable?: VariableRef; uuid?: string };
    if (wallRef.variable) {
      resolved.wall_id = resolveVariable(wallRef.variable, context);
    } else if (wallRef.uuid) {
      resolved.wall_id = wallRef.uuid;
    }
    delete resolved._wallRef;
  }

  // Check for host_id that might be a variable
  if (resolved.host_id === undefined && resolved._hostRef) {
    const hostRef = resolved._hostRef as { variable?: VariableRef; uuid?: string };
    if (hostRef.variable) {
      resolved.host_id = resolveVariable(hostRef.variable, context);
    } else if (hostRef.uuid) {
      resolved.host_id = hostRef.uuid;
    }
    delete resolved._hostRef;
  }

  return resolved;
}

// =============================================================================
// Single Command Execution
// =============================================================================

/**
 * Execute a single parsed command
 */
export async function executeCommand(
  command: Command,
  context: ExecutionContext = {}
): Promise<CommandResult> {
  // Handle Passthrough commands — route directly to command handler registry
  if (command.type === "Passthrough") {
    return executePassthrough(command as import("./ast").PassthroughCommand, context);
  }

  const toolName = COMMAND_TO_TOOL[command.type];

  if (!toolName) {
    return {
      success: false,
      message: `Unknown command type: ${command.type}`,
    };
  }

  // Handle CreateRectWalls by expanding to 4 wall commands
  if (command.type === "CreateRectWalls") {
    return executeRectWalls(command as import("./ast").CreateRectWallsCommand, context);
  }

  // Convert AST command to MCP arguments
  let args = commandToMcpArgs(command);

  // Add variable reference info for later resolution
  if ("wallRef" in command && command.wallRef) {
    const wallRef = command.wallRef as { variable?: VariableRef; uuid?: string };
    if (wallRef.variable) {
      args = { ...args, _wallRef: wallRef };
    }
  }

  // Resolve any variable references
  args = resolveVariablesInArgs(args, context);

  // Map DSL arg names to command handler arg names
  // DSL produces wall_id, command handler expects wall
  if (args.wall_id && !args.wall) {
    args.wall = args.wall_id;
  }

  // Check for unresolved required references
  if (
    (command.type === "PlaceDoor" || command.type === "PlaceWindow") &&
    !args.wall_id && !args.wall
  ) {
    return {
      success: false,
      message: `Cannot resolve wall reference. Use an explicit wall ID or create a wall first (for $last).`,
    };
  }

  // Dispatch to command handler
  return dispatchCommand(toolName, args);
}

/**
 * Execute CreateRectWalls by creating 4 individual walls
 */
async function executeRectWalls(
  command: import("./ast").CreateRectWallsCommand,
  context: ExecutionContext
): Promise<CommandResult> {
  const { minPoint, maxPoint, height, thickness } = command;

  // Define 4 walls: bottom, right, top, left
  const walls: Array<{ start: number[]; end: number[] }> = [
    { start: [minPoint.x, minPoint.y], end: [maxPoint.x, minPoint.y] }, // bottom
    { start: [maxPoint.x, minPoint.y], end: [maxPoint.x, maxPoint.y] }, // right
    { start: [maxPoint.x, maxPoint.y], end: [minPoint.x, maxPoint.y] }, // top
    { start: [minPoint.x, maxPoint.y], end: [minPoint.x, minPoint.y] }, // left
  ];

  const createdIds: string[] = [];
  for (const w of walls) {
    const result = await dispatchCommand("wall", {
      start: w.start,
      end: w.end,
      height,
      thickness,
    });
    if (!result.success) {
      return {
        success: false,
        message: `Failed creating rect wall: ${result.message}`,
        data: { created_so_far: createdIds },
      };
    }
    if (result.elementCreated) {
      createdIds.push(result.elementCreated.id);
      context.lastElementId = result.elementCreated.id;
      context.wallId = result.elementCreated.id;
    }
  }

  return {
    success: true,
    message: `Created 4 walls forming rectangle`,
    data: { wall_ids: createdIds, count: 4 },
    elementCreated: createdIds.length > 0
      ? { id: createdIds[createdIds.length - 1], type: "wall" }
      : undefined,
  };
}

// =============================================================================
// Passthrough Command Execution
// =============================================================================

/**
 * Execute a passthrough command by dispatching to the command handler registry.
 * This enables non-DSL commands (list, delete, status, etc.) to flow through
 * the unified DSL pipeline while still getting variable resolution.
 */
async function executePassthrough(
  command: import("./ast").PassthroughCommand,
  context: ExecutionContext
): Promise<CommandResult> {
  const args = { ...command.parsedArgs };

  // Resolve $last, $selected, $wall in raw args and inject into parsed args
  // Check for variable refs that might be element IDs
  for (const rawArg of command.rawArgs) {
    if (rawArg === "$last" && context.lastElementId) {
      // If no explicit element_id/wall arg, inject $last
      if (!args.element_id && !args.wall && !args.element_ids) {
        args.element_id = context.lastElementId;
      }
    } else if (rawArg === "$selected" && context.selectedIds?.length) {
      if (!args.element_ids && !args.element_id) {
        args.element_ids = context.selectedIds;
        if (context.selectedIds.length === 1) {
          args.element_id = context.selectedIds[0];
        }
      }
    } else if (rawArg === "$wall" && context.wallId) {
      if (!args.wall && !args.wall_id) {
        args.wall = context.wallId;
      }
    }
  }

  // Positional args (non-flag args that aren't variable refs)
  const positional = command.rawArgs.filter(
    (a) => !a.startsWith("--") && !a.startsWith("$")
  );
  if (positional.length > 0 && !args._positional) {
    args._positional = positional;
  }

  return dispatchCommand(command.commandName, args);
}

// =============================================================================
// Multi-Command Execution
// =============================================================================

/**
 * Execute multiple commands in sequence, updating context between them
 */
export async function executeCommands(
  commands: Command[],
  initialContext: ExecutionContext = {}
): Promise<ExecutionResult> {
  const context = { ...initialContext };
  const commandResults: CommandResult[] = [];
  const createdElementIds: string[] = [];
  const warnings: string[] = [];
  const terminalOutput: string[] = [];

  for (const command of commands) {
    const result = await executeCommand(command, context);
    commandResults.push(result);

    if (result.success) {
      // Update context with created element
      if (result.elementCreated) {
        context.lastElementId = result.elementCreated.id;
        createdElementIds.push(result.elementCreated.id);

        // If it's a wall, also update wallId
        if (result.elementCreated.type === "wall") {
          context.wallId = result.elementCreated.id;
        }

        terminalOutput.push(
          `${ANSI.GREEN}✓${ANSI.RESET} Created ${result.elementCreated.type} ${ANSI.CYAN}${result.elementCreated.id}${ANSI.RESET}`
        );
      } else {
        terminalOutput.push(`${ANSI.GREEN}✓${ANSI.RESET} ${result.message}`);
      }

      // Collect warnings
      if (result.warnings) {
        warnings.push(...result.warnings);
        result.warnings.forEach((w) => {
          terminalOutput.push(`${ANSI.YELLOW}⚠${ANSI.RESET} ${w}`);
        });
      }
    } else {
      // Stop on first error
      terminalOutput.push(`${ANSI.RED}✗${ANSI.RESET} ${result.message}`);
      return {
        success: false,
        message: result.message,
        commandResults,
        createdElementIds,
        warnings,
        terminalOutput,
      };
    }
  }

  return {
    success: true,
    message: `Executed ${commands.length} command(s)`,
    commandResults,
    createdElementIds,
    warnings,
    terminalOutput,
  };
}

// =============================================================================
// Main Entry Point: Execute DSL Input
// =============================================================================

/**
 * Parse and execute DSL input string.
 *
 * This is the main entry point for executing DSL commands from the terminal.
 *
 * @param input - The DSL command string to parse and execute
 * @param context - Execution context with variable references
 * @returns Execution result with terminal-friendly output
 *
 * @example
 * ```typescript
 * const result = await executeDsl('wall (0, 0) (5, 0) height 3');
 * if (result.success) {
 *   console.log('Created elements:', result.createdElementIds);
 * }
 * ```
 */
export async function executeDsl(
  input: string,
  context: ExecutionContext = {}
): Promise<ExecutionResult> {
  // Parse the input
  const parseResult: ParseResult = parse(input);

  // Handle parse errors
  if (!parseResult.success || (parseResult.errors && parseResult.errors.length > 0)) {
    const errorOutput = formatParseErrors(parseResult, input);
    return {
      success: false,
      message: "Parse error",
      commandResults: [],
      createdElementIds: [],
      warnings: [],
      terminalOutput: errorOutput || [],
    };
  }

  // Handle empty input
  if (parseResult.commands.length === 0) {
    return {
      success: true,
      message: "No commands to execute",
      commandResults: [],
      createdElementIds: [],
      warnings: [],
      terminalOutput: [],
    };
  }

  // Execute the parsed commands
  return executeCommands(parseResult.commands, context);
}

// =============================================================================
// Exports
// =============================================================================

export default {
  executeCommand,
  executeCommands,
  executeDsl,
};
