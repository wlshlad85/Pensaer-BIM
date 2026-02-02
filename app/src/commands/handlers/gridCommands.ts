/**
 * Grid Line Command Handlers
 *
 * Commands for managing structural grid lines in the BIM model.
 * Grid lines are reference/datum lines used for structural layout.
 *
 * Commands:
 *   grid add <label> --axis x|y --position <meters>
 *   grid list
 *   grid delete <id>
 */

import {
  registerCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useHistoryStore } from "../../stores/historyStore";
import type { Element } from "../../types";

// Scale factor: 100 pixels per meter (matches elementCommands.ts)
const SCALE = 100;

// Canvas extent for grid lines (large enough to span typical models)
const GRID_LINE_EXTENT = 10000; // pixels

// ============================================
// GRID ADD COMMAND
// ============================================

async function gridHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const positional = args._positional as unknown[] | undefined;
  const subcommand = positional?.[0] as string | undefined;

  if (!subcommand) {
    return {
      success: false,
      message: "Usage: grid <add|list|delete> [args]. Run 'help grid' for details.",
    };
  }

  switch (subcommand) {
    case "add":
      return gridAddHandler(args, positional);
    case "list":
      return gridListHandler();
    case "delete":
      return gridDeleteHandler(args, positional);
    default:
      return {
        success: false,
        message: `Unknown grid subcommand: ${subcommand}. Use add, list, or delete.`,
      };
  }
}

// ============================================
// GRID ADD
// ============================================

async function gridAddHandler(
  args: Record<string, unknown>,
  positional: unknown[] | undefined
): Promise<CommandResult> {
  const label = positional?.[1] as string | undefined;

  if (!label) {
    return {
      success: false,
      message: "Missing grid line label. Usage: grid add <label> --axis x|y --position <meters>",
    };
  }

  const axis = args.axis as string | undefined;
  if (!axis || (axis !== "x" && axis !== "y")) {
    return {
      success: false,
      message: "Missing or invalid --axis. Must be 'x' or 'y'.",
    };
  }

  const position = args.position as number | undefined;
  if (position === undefined || position === null || isNaN(Number(position))) {
    return {
      success: false,
      message: "Missing or invalid --position (meters).",
    };
  }

  // Check for duplicate label among existing grid lines
  const elements = useModelStore.getState().elements;
  const duplicate = elements.find(
    (el) => el.type === "gridline" && (el as any).label === label
  );
  if (duplicate) {
    return {
      success: false,
      message: `Grid line with label '${label}' already exists (${duplicate.id}).`,
    };
  }

  const gridId = `gridline-${label.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;

  // Grid lines span the full canvas extent
  // For axis "x": vertical line at x=position (label typically alphabetic: A, B, C)
  // For axis "y": horizontal line at y=position (label typically numeric: 1, 2, 3)
  const posPixels = position * SCALE;

  let x: number, y: number, width: number, height: number;

  if (axis === "x") {
    // Vertical line
    x = posPixels;
    y = -GRID_LINE_EXTENT / 2;
    width = 1;
    height = GRID_LINE_EXTENT;
  } else {
    // Horizontal line
    x = -GRID_LINE_EXTENT / 2;
    y = posPixels;
    width = GRID_LINE_EXTENT;
    height = 1;
  }

  const gridElement: Element = {
    id: gridId,
    type: "gridline",
    name: `Grid ${label}`,
    label,
    axis: axis as "x" | "y",
    position: Number(position),
    x,
    y,
    width,
    height,
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };

  useModelStore.getState().addElement(gridElement);
  useHistoryStore.getState().recordAction(`Add grid line ${label}`);

  return {
    success: true,
    message: `Added grid line '${label}' on ${axis}-axis at position ${position}m`,
    data: {
      id: gridId,
      label,
      axis,
      position,
    },
    elementCreated: { id: gridId, type: "gridline" },
  };
}

// ============================================
// GRID LIST
// ============================================

async function gridListHandler(): Promise<CommandResult> {
  const elements = useModelStore.getState().elements;
  const gridLines = elements.filter((el) => el.type === "gridline");

  if (gridLines.length === 0) {
    return {
      success: true,
      message: "No grid lines defined.",
      data: { gridLines: [], count: 0 },
    };
  }

  // Sort: x-axis lines first (alphabetic), then y-axis (numeric)
  const sorted = [...gridLines].sort((a, b) => {
    const ga = a as any;
    const gb = b as any;
    if (ga.axis !== gb.axis) return ga.axis === "x" ? -1 : 1;
    return ga.position - gb.position;
  });

  const lines = sorted.map((el) => {
    const g = el as any;
    return {
      id: el.id,
      label: g.label,
      axis: g.axis,
      position: g.position,
    };
  });

  const summary = sorted
    .map((el) => {
      const g = el as any;
      return `  ${g.label} (${g.axis}-axis, ${g.position}m)`;
    })
    .join("\n");

  return {
    success: true,
    message: `Grid lines (${gridLines.length}):\n${summary}`,
    data: { gridLines: lines, count: gridLines.length },
  };
}

// ============================================
// GRID DELETE
// ============================================

async function gridDeleteHandler(
  _args: Record<string, unknown>,
  positional: unknown[] | undefined
): Promise<CommandResult> {
  const target = positional?.[1] as string | undefined;

  if (!target) {
    return {
      success: false,
      message: "Missing grid line ID or label. Usage: grid delete <id|label>",
    };
  }

  const elements = useModelStore.getState().elements;

  // Find by ID or label
  const gridLine = elements.find(
    (el) =>
      el.type === "gridline" &&
      (el.id === target || (el as any).label === target)
  );

  if (!gridLine) {
    return {
      success: false,
      message: `Grid line not found: ${target}`,
    };
  }

  useModelStore.getState().deleteElements([gridLine.id]);
  useHistoryStore.getState().recordAction(`Delete grid line ${(gridLine as any).label}`);

  return {
    success: true,
    message: `Deleted grid line '${(gridLine as any).label}' (${gridLine.id})`,
    data: { deleted: gridLine.id, label: (gridLine as any).label },
  };
}

// ============================================
// REGISTER GRID COMMANDS
// ============================================

export function registerGridCommands(): void {
  registerCommand({
    name: "grid",
    description: "Manage structural grid lines",
    usage: "grid <add|list|delete> [args]",
    examples: [
      'grid add A --axis x --position 0',
      'grid add B --axis x --position 6',
      'grid add 1 --axis y --position 0',
      'grid add 2 --axis y --position 4',
      "grid list",
      "grid delete A",
      "grid delete gridline-a-abc123",
    ],
    handler: gridHandler,
  });
}
