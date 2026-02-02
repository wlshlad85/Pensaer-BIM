/**
 * Built-in Command Handlers
 *
 * Essential terminal commands for basic operations.
 * These commands are local and don't require MCP calls.
 */

import {
  registerCommand,
  getAllCommands,
  dispatchCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useHistoryStore } from "../../stores/historyStore";
import { useMacroStore } from "../../stores/macroStore";

// ============================================
// APP VERSION INFO
// ============================================

const APP_VERSION = "0.1.0";
const APP_PHASE = "Phase 1 Foundation";
const KERNEL_VERSION = "0.1.0";

// ============================================
// HELP COMMAND
// ============================================

async function helpHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const specificCommand = args.command as string | undefined;

  // If a specific command is requested, show detailed help
  if (specificCommand) {
    const commands = getAllCommands();
    const cmd = commands.find(
      (c) => c.name.toLowerCase() === specificCommand.toLowerCase()
    );

    if (!cmd) {
      return {
        success: false,
        message: `Unknown command: ${specificCommand}`,
        data: {
          available_commands: commands.map((c) => c.name).join(", "),
        },
      };
    }

    return {
      success: true,
      message: `Help for '${cmd.name}'`,
      data: {
        name: cmd.name,
        description: cmd.description,
        usage: cmd.usage,
        examples: cmd.examples,
      },
    };
  }

  // Show all commands grouped by category
  const commands = getAllCommands();

  // Group commands by category
  const builtinCommands = ["help", "clear", "status", "version", "echo", "macro", "undo", "redo"];
  const elementCommands = ["wall", "floor", "roof", "room", "door", "window", "delete", "get", "list"];
  const analysisCommands = ["detect-rooms", "analyze", "clash", "clash-between"];

  const categorized = {
    builtin: commands.filter((c) => builtinCommands.includes(c.name)),
    elements: commands.filter((c) => elementCommands.includes(c.name)),
    analysis: commands.filter((c) => analysisCommands.includes(c.name)),
    other: commands.filter(
      (c) =>
        !builtinCommands.includes(c.name) &&
        !elementCommands.includes(c.name) &&
        !analysisCommands.includes(c.name)
    ),
  };

  return {
    success: true,
    message: "Available commands",
    data: {
      total_commands: commands.length,
      builtin: categorized.builtin.map((c) => ({
        name: c.name,
        description: c.description,
      })),
      elements: categorized.elements.map((c) => ({
        name: c.name,
        description: c.description,
      })),
      analysis: categorized.analysis.map((c) => ({
        name: c.name,
        description: c.description,
      })),
      other: categorized.other.map((c) => ({
        name: c.name,
        description: c.description,
      })),
      tip: "Use 'help <command>' for detailed help on a specific command",
    },
  };
}

// ============================================
// CLEAR COMMAND
// ============================================

async function clearHandler(
  _args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  // The actual clearing is handled by the Terminal component
  // This handler signals the intent to clear
  return {
    success: true,
    message: "__CLEAR_TERMINAL__",
    data: {
      action: "clear_terminal",
    },
  };
}

// ============================================
// STATUS COMMAND
// ============================================

async function statusHandler(
  _args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  const elements = useModelStore.getState().elements;
  const levels = useModelStore.getState().levels;
  const historyState = useHistoryStore.getState();

  // Count elements by type
  const elementCounts: Record<string, number> = {};
  for (const el of elements) {
    elementCounts[el.type] = (elementCounts[el.type] || 0) + 1;
  }

  // Count issues across all elements
  let totalIssues = 0;
  let issuesByPriority: Record<string, number> = {};
  for (const el of elements) {
    if (el.issues) {
      totalIssues += el.issues.length;
      for (const issue of el.issues) {
        const priority = issue.priority || "unknown";
        issuesByPriority[priority] = (issuesByPriority[priority] || 0) + 1;
      }
    }
  }

  // Count AI suggestions
  let totalSuggestions = 0;
  for (const el of elements) {
    if (el.aiSuggestions) {
      totalSuggestions += el.aiSuggestions.length;
    }
  }

  return {
    success: true,
    message: "Model status",
    data: {
      total_elements: elements.length,
      elements_by_type: elementCounts,
      levels: levels.length,
      selected: context.selectedIds.length,
      history: {
        undo_available: historyState.undoStack?.length || 0,
        redo_available: historyState.redoStack?.length || 0,
        last_action: historyState.lastAction || "None",
      },
      issues: {
        total: totalIssues,
        by_priority: issuesByPriority,
      },
      ai_suggestions: totalSuggestions,
    },
  };
}

// ============================================
// VERSION COMMAND
// ============================================

async function versionHandler(
  _args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  // Get build timestamp (if available in env)
  const buildTime = new Date().toISOString().split("T")[0];

  return {
    success: true,
    message: "Pensaer BIM Platform",
    data: {
      version: APP_VERSION,
      phase: APP_PHASE,
      kernel: `pensaer-geometry ${KERNEL_VERSION}`,
      client: "React 19 + TypeScript",
      mcp_mode: import.meta.env.VITE_MCP_MODE || "mock",
      build_date: buildTime,
      environment: import.meta.env.MODE || "development",
    },
  };
}

// ============================================
// ECHO COMMAND
// ============================================

async function echoHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  // Get text from args or join remaining arguments
  const text = args.text as string | undefined;
  const rawArgs = args._raw as string[] | undefined;

  let outputText = text || "";
  if (!outputText && rawArgs) {
    outputText = rawArgs.join(" ");
  }

  if (!outputText) {
    return {
      success: true,
      message: "",
      data: { output: "" },
    };
  }

  return {
    success: true,
    message: outputText,
    data: { output: outputText },
  };
}

// ============================================
// MACRO COMMAND
// ============================================

async function macroHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const subcommand = args.subcommand as string | undefined;
  const name = args.name as string | undefined;
  const macroStore = useMacroStore.getState();

  // Parse subcommand from first argument
  const action = subcommand?.toLowerCase();

  if (!action) {
    // Show help if no subcommand
    return {
      success: true,
      message: "Macro commands",
      data: {
        subcommands: [
          "macro record <name> - Start recording a new macro",
          "macro stop - Stop recording and save",
          "macro play <name> - Play a saved macro",
          "macro list - List all saved macros",
          "macro delete <name> - Delete a macro",
        ],
        recording: macroStore.isRecording ? macroStore.recordingMacroName : null,
        playing: macroStore.isPlaying ? macroStore.playbackState?.macroName : null,
      },
    };
  }

  switch (action) {
    case "record": {
      if (!name) {
        return {
          success: false,
          message: "Usage: macro record <name>",
        };
      }
      const result = macroStore.startRecording(name);
      return {
        success: result.success,
        message: result.message,
        data: result.success ? { macro_name: name, status: "recording" } : undefined,
      };
    }

    case "stop": {
      const result = macroStore.stopRecording();
      return {
        success: result.success,
        message: result.message,
        data: result.macro
          ? {
              macro_name: result.macro.name,
              commands: result.macro.commands.length,
              status: "saved",
            }
          : undefined,
      };
    }

    case "cancel": {
      if (!macroStore.isRecording) {
        return {
          success: false,
          message: "Not currently recording.",
        };
      }
      macroStore.cancelRecording();
      return {
        success: true,
        message: "Macro recording cancelled.",
      };
    }

    case "play": {
      if (!name) {
        return {
          success: false,
          message: "Usage: macro play <name>",
        };
      }
      const result = macroStore.startPlayback(name);

      if (result.success && result.commands) {
        // Execute commands sequentially with delays
        const executeCommands = async () => {
          for (let i = 0; i < result.commands!.length; i++) {
            const state = useMacroStore.getState();
            if (!state.isPlaying) break; // Playback was stopped
            if (state.playbackState?.isPaused) {
              // Wait while paused
              await new Promise((resolve) => setTimeout(resolve, 100));
              i--; // Retry this command
              continue;
            }

            const cmd = result.commands![i];
            macroStore.updatePlaybackProgress(i);

            // Execute the command
            try {
              await dispatchCommand(cmd, {});
            } catch (error) {
              console.warn(`Macro command failed: ${cmd}`, error);
            }

            // Small delay between commands for visual feedback
            if (i < result.commands!.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          }
          macroStore.stopPlayback();
        };

        // Start execution in background
        executeCommands();

        return {
          success: true,
          message: result.message,
          data: {
            macro_name: name,
            commands: result.commands.length,
            status: "playing",
          },
        };
      }

      return {
        success: result.success,
        message: result.message,
      };
    }

    case "list": {
      const macroNames = macroStore.getMacroNames();
      const stats = macroStore.getStats();

      if (macroNames.length === 0) {
        return {
          success: true,
          message: "No macros saved. Use \"macro record <name>\" to create one.",
          data: { macros: [], total: 0 },
        };
      }

      const macroList = macroNames.map((n) => {
        const macro = macroStore.getMacro(n);
        return {
          name: n,
          commands: macro?.commands.length || 0,
          plays: macro?.playCount || 0,
          created: macro?.createdAt
            ? new Date(macro.createdAt).toLocaleDateString()
            : "Unknown",
        };
      });

      return {
        success: true,
        message: `${macroNames.length} macro(s) saved`,
        data: {
          macros: macroList,
          total: stats.totalMacros,
          total_commands: stats.totalCommands,
        },
      };
    }

    case "delete": {
      if (!name) {
        return {
          success: false,
          message: "Usage: macro delete <name>",
        };
      }
      const result = macroStore.deleteMacro(name);
      return {
        success: result.success,
        message: result.message,
      };
    }

    case "export": {
      const json = macroStore.exportMacros();
      return {
        success: true,
        message: "Macros exported",
        data: { json, macro_count: macroStore.getMacroNames().length },
      };
    }

    default:
      return {
        success: false,
        message: `Unknown macro subcommand: ${action}`,
        data: {
          valid_subcommands: ["record", "stop", "cancel", "play", "list", "delete", "export"],
        },
      };
  }
}

// ============================================
// REGISTER ALL COMMANDS
// ============================================

export function registerBuiltinCommands(): void {
  registerCommand({
    name: "help",
    description: "Show available commands and usage",
    usage: "help [command]",
    examples: ["help", "help wall", "help door"],
    handler: helpHandler,
  });

  registerCommand({
    name: "clear",
    description: "Clear the terminal screen",
    usage: "clear",
    examples: ["clear"],
    handler: clearHandler,
  });

  registerCommand({
    name: "status",
    description: "Show model statistics and status",
    usage: "status",
    examples: ["status"],
    handler: statusHandler,
  });

  registerCommand({
    name: "version",
    description: "Show application version information",
    usage: "version",
    examples: ["version"],
    handler: versionHandler,
  });

  registerCommand({
    name: "echo",
    description: "Print text to the terminal (for testing)",
    usage: "echo <text>",
    examples: ["echo Hello World", "echo Test message"],
    handler: echoHandler,
  });

  registerCommand({
    name: "macro",
    description: "Record, play, and manage command macros",
    usage: "macro <subcommand> [name]",
    examples: [
      "macro record my-building",
      "macro stop",
      "macro play my-building",
      "macro list",
      "macro delete my-building",
    ],
    handler: macroHandler,
  });
}
