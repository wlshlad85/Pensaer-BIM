/**
 * Level Command Handlers
 *
 * Command handlers for building level (storey) management.
 * P0-002: level add/list/delete/set-active
 */

import {
  registerCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useUIStore } from "../../stores/uiStore";
import { useHistoryStore } from "../../stores/historyStore";
import { createLevelId } from "../../types/elements";
import type { Level } from "../../types";

// ============================================
// LEVEL ADD
// ============================================

export async function levelAddHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const positional = args._positional as unknown[] | undefined;
  const name = (args.name as string) || (positional && positional[0] ? String(positional[0]) : undefined);

  if (!name) {
    return {
      success: false,
      message: 'Missing level name. Usage: level add "Level 2" --elevation 3.0 --height 3.0',
    };
  }

  const existing = useModelStore.getState().getLevelByName(name);
  if (existing) {
    return {
      success: false,
      message: `Level with name "${name}" already exists (id: ${existing.id})`,
    };
  }

  const elevation = (args.elevation as number) ?? 0;
  const height = (args.height as number) ?? 3.0;

  // CLI uses metres, store uses mm
  const elevationMm = elevation * 1000;
  const heightMm = height * 1000;

  const id = createLevelId(`level-${crypto.randomUUID().slice(0, 8)}`);

  const level: Level = {
    id,
    name,
    elevation: elevationMm,
    height: heightMm,
  };

  useModelStore.getState().addLevel(level);
  useHistoryStore.getState().recordAction(`Add level "${name}"`);

  return {
    success: true,
    message: `Created level "${name}" (elevation: ${elevation}m, height: ${height}m)`,
    data: { id, name, elevation, height },
  };
}

// ============================================
// LEVEL LIST
// ============================================

export async function levelListHandler(
  _args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const levels = useModelStore.getState().getLevelsOrdered();
  const activeLevel = useUIStore.getState().activeLevel;

  if (levels.length === 0) {
    return {
      success: true,
      message: "No levels defined.",
      data: { levels: [], count: 0 },
    };
  }

  const rows = levels.map((l) => ({
    id: l.id,
    name: l.name,
    elevation: `${(l.elevation / 1000).toFixed(2)}m`,
    height: `${(l.height / 1000).toFixed(2)}m`,
    active: l.id === activeLevel || l.name === activeLevel ? "◀" : "",
  }));

  const summary = levels
    .map(
      (l) =>
        `  ${l.id === activeLevel || l.name === activeLevel ? "▸ " : "  "}${l.name} (${(l.elevation / 1000).toFixed(2)}m)`
    )
    .join("\n");

  return {
    success: true,
    message: `${levels.length} level(s):\n${summary}`,
    data: { levels: rows, count: levels.length },
  };
}

// ============================================
// LEVEL DELETE
// ============================================

export async function levelDeleteHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const positional = args._positional as unknown[] | undefined;
  const id = (args.id as string) || (positional && positional[0] ? String(positional[0]) : undefined);

  if (!id) {
    return {
      success: false,
      message: "Missing level ID. Usage: level delete <id>",
    };
  }

  const level = useModelStore.getState().getLevelById(id);
  if (!level) {
    return {
      success: false,
      message: `Level not found: ${id}`,
    };
  }

  const elements = useModelStore.getState().getElementsByLevel(id);
  if (elements.length > 0) {
    return {
      success: false,
      message: `Cannot delete level "${level.name}": ${elements.length} element(s) are assigned to it. Reassign or delete them first.`,
    };
  }

  useModelStore.getState().deleteLevel(id);
  useHistoryStore.getState().recordAction(`Delete level "${level.name}"`);

  return {
    success: true,
    message: `Deleted level "${level.name}"`,
    data: { id, name: level.name },
  };
}

// ============================================
// LEVEL SET-ACTIVE
// ============================================

export async function levelSetActiveHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const positional = args._positional as unknown[] | undefined;
  const id = (args.id as string) || (positional && positional[0] ? String(positional[0]) : undefined);

  if (!id) {
    return {
      success: false,
      message: "Missing level ID. Usage: level set-active <id>",
    };
  }

  const level = useModelStore.getState().getLevelById(id);
  if (!level) {
    return {
      success: false,
      message: `Level not found: ${id}`,
    };
  }

  useUIStore.getState().setActiveLevel(id);

  return {
    success: true,
    message: `Active level set to "${level.name}"`,
    data: { id, name: level.name },
  };
}

// ============================================
// LEVEL ROUTER (sub-command dispatch)
// ============================================

const subcommands: Record<
  string,
  (args: Record<string, unknown>, context: CommandContext) => Promise<CommandResult>
> = {
  add: levelAddHandler,
  list: levelListHandler,
  delete: levelDeleteHandler,
  "set-active": levelSetActiveHandler,
};

async function levelRouter(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  const positional = (args._positional as unknown[]) || [];
  const sub = positional[0] ? String(positional[0]) : undefined;

  if (!sub || !subcommands[sub]) {
    const available = Object.keys(subcommands).join(", ");
    return {
      success: false,
      message: `Usage: level <${available}> [...args]\nExamples:\n  level add "Level 2" --elevation 3.0 --height 3.0\n  level list\n  level delete <id>\n  level set-active <id>`,
    };
  }

  const subArgs = {
    ...args,
    _positional: positional.slice(1),
  };

  return subcommands[sub](subArgs, context);
}

// ============================================
// REGISTER
// ============================================

export function registerLevelCommands(): void {
  registerCommand({
    name: "level",
    description: "Manage building levels (add, list, delete, set-active)",
    usage: 'level <add|list|delete|set-active> [...args]',
    examples: [
      'level add "Level 2" --elevation 3.0 --height 3.0',
      "level list",
      "level delete level-2",
      "level set-active level-2",
    ],
    handler: levelRouter,
  });
}
