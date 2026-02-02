/**
 * History Command Handlers
 *
 * Terminal commands for undo and redo operations.
 * Delegates to historyStore which manages snapshots and state restoration.
 */

import {
  registerCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useHistoryStore } from "../../stores/historyStore";

// ============================================
// UNDO COMMAND
// ============================================

async function undoHandler(
  _args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const historyStore = useHistoryStore.getState();

  if (!historyStore.canUndo()) {
    return {
      success: false,
      message: "Nothing to undo",
    };
  }

  const description = historyStore.getUndoDescription();
  historyStore.undo();

  return {
    success: true,
    message: `Undo: ${description || "last action"}`,
    data: {
      undone: description,
      can_undo: useHistoryStore.getState().canUndo(),
      can_redo: useHistoryStore.getState().canRedo(),
      history_position: useHistoryStore.getState().currentIndex,
    },
  };
}

// ============================================
// REDO COMMAND
// ============================================

async function redoHandler(
  _args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const historyStore = useHistoryStore.getState();

  if (!historyStore.canRedo()) {
    return {
      success: false,
      message: "Nothing to redo",
    };
  }

  const description = historyStore.getRedoDescription();
  historyStore.redo();

  return {
    success: true,
    message: `Redo: ${description || "next action"}`,
    data: {
      redone: description,
      can_undo: useHistoryStore.getState().canUndo(),
      can_redo: useHistoryStore.getState().canRedo(),
      history_position: useHistoryStore.getState().currentIndex,
    },
  };
}

// ============================================
// REGISTER COMMANDS
// ============================================

export function registerHistoryCommands(): void {
  registerCommand({
    name: "undo",
    description: "Undo the last action",
    usage: "undo",
    examples: ["undo"],
    handler: undoHandler,
  });

  registerCommand({
    name: "redo",
    description: "Redo the last undone action",
    usage: "redo",
    examples: ["redo"],
    handler: redoHandler,
  });
}
