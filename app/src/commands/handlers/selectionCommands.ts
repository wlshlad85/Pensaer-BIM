/**
 * Selection Command Handlers
 *
 * Terminal commands for selecting/deselecting BIM elements.
 * Wires into the existing selectionStore.
 */

import {
  registerCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useSelectionStore } from "../../stores/selectionStore";
import { useModelStore } from "../../stores/modelStore";

// ============================================
// SELECT COMMAND
// ============================================

async function selectHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const positional = args._positional as unknown[] | undefined;
  const type = args.type as string | undefined;
  const all = args.all as boolean | undefined;

  const modelStore = useModelStore.getState();
  const selectionStore = useSelectionStore.getState();

  // select --all
  if (all) {
    const allIds = modelStore.elements.map((el) => el.id);
    if (allIds.length === 0) {
      return { success: true, message: "No elements in model" };
    }
    selectionStore.selectAll(allIds);
    return {
      success: true,
      message: `Selected all ${allIds.length} element(s)`,
      data: { count: allIds.length, ids: allIds },
    };
  }

  // select --type <type>
  if (type) {
    const typeLower = type.toLowerCase();
    const matching = modelStore.elements.filter(
      (el) => el.type.toLowerCase() === typeLower
    );
    if (matching.length === 0) {
      return {
        success: false,
        message: `No elements of type "${type}" found`,
      };
    }
    const ids = matching.map((el) => el.id);
    selectionStore.selectMultiple(ids);
    return {
      success: true,
      message: `Selected ${ids.length} ${type}(s)`,
      data: { count: ids.length, ids, type },
    };
  }

  // select <id> [<id2> ...]
  if (positional && positional.length > 0) {
    const ids = positional.map(String);
    // Validate all IDs exist
    const missing = ids.filter((id) => !modelStore.getElementById(id));
    if (missing.length > 0) {
      return {
        success: false,
        message: `Element(s) not found: ${missing.join(", ")}`,
      };
    }
    selectionStore.selectMultiple(ids);
    return {
      success: true,
      message: ids.length === 1
        ? `Selected ${ids[0]}`
        : `Selected ${ids.length} element(s)`,
      data: { count: ids.length, ids },
    };
  }

  return {
    success: false,
    message: "Usage: select <id> | select --type <type> | select --all",
  };
}

// ============================================
// DESELECT COMMAND
// ============================================

async function deselectHandler(
  _args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const selectionStore = useSelectionStore.getState();
  const count = selectionStore.selectedIds.length;
  selectionStore.clearSelection();
  return {
    success: true,
    message: count > 0
      ? `Deselected ${count} element(s)`
      : "Nothing was selected",
  };
}

// ============================================
// REGISTER
// ============================================

export function registerSelectionCommands(): void {
  registerCommand({
    name: "select",
    description: "Select elements by ID, type, or all",
    usage: "select <id> | select --type <type> | select --all",
    examples: [
      "select wall-001",
      "select wall-001 door-002",
      "select --type wall",
      "select --all",
    ],
    handler: selectHandler,
  });

  registerCommand({
    name: "deselect",
    description: "Clear the current selection",
    usage: "deselect",
    examples: ["deselect"],
    handler: deselectHandler,
  });
}
