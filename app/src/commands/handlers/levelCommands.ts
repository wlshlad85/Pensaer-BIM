/**
 * Level Command Handlers
 *
 * Terminal commands for managing building levels/floors.
 */

import {
  registerCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useUiStore } from "../../stores/uiStore";
import { createLevelId } from "../../types/elements";
import type { Level } from "../../types/store";

// ============================================
// LEVEL COMMAND HANDLER
// ============================================

async function levelHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const subcommand = args.subcommand as string | undefined;
  const action = subcommand?.toLowerCase();

  if (!action) {
    return showActiveLevel();
  }

  switch (action) {
    case "list":
      return levelList();
    case "add":
      return levelAdd(args);
    case "delete":
      return levelDelete(args);
    case "active":
      return levelSetActive(args);
    default:
      return {
        success: false,
        message: `Unknown level subcommand: ${action}`,
        data: {
          valid_subcommands: ["list", "add", "delete", "active"],
        },
      };
  }
}

// ============================================
// SHOW ACTIVE LEVEL
// ============================================

function showActiveLevel(): CommandResult {
  const activeLevel = useUiStore.getState().activeLevel;
  const store = useModelStore.getState();
  const level = store.getLevelByName(activeLevel);

  if (level) {
    return {
      success: true,
      message: `Active level: ${level.name}`,
      data: {
        name: level.name,
        id: level.id,
        elevation: level.elevation,
        height: level.height,
      },
    };
  }

  return {
    success: true,
    message: `Active level: ${activeLevel}`,
    data: { name: activeLevel },
  };
}

// ============================================
// LIST LEVELS
// ============================================

function levelList(): CommandResult {
  const store = useModelStore.getState();
  const levels = store.getLevelsOrdered();
  const activeLevel = useUiStore.getState().activeLevel;

  if (levels.length === 0) {
    return {
      success: true,
      message: "No levels defined.",
      data: { levels: [], total: 0 },
    };
  }

  const levelData = levels.map((l) => ({
    name: l.name,
    elevation: l.elevation,
    height: l.height,
    elements: store.getElementsByLevel(l.id).length,
    active: l.name === activeLevel ? "◀" : "",
  }));

  return {
    success: true,
    message: `${levels.length} level(s)`,
    data: { levels: levelData, total: levels.length },
  };
}

// ============================================
// ADD LEVEL
// ============================================

function levelAdd(args: Record<string, unknown>): CommandResult {
  const name = args.name as string | undefined;
  const elevation = args.elevation as number | undefined;
  const height = args.height as number | undefined;

  if (!name) {
    return {
      success: false,
      message: 'Usage: level add <name> [--elevation <m>] [--height <m>]',
    };
  }

  const store = useModelStore.getState();

  // Check for duplicate name
  if (store.getLevelByName(name)) {
    return {
      success: false,
      message: `Level "${name}" already exists.`,
    };
  }

  const newLevel: Level = {
    id: createLevelId(`level-${Date.now()}`),
    name,
    elevation: elevation ?? 0,
    height: height ?? 3000,
    visible: true,
  };

  store.addLevel(newLevel);

  return {
    success: true,
    message: `Level "${name}" created.`,
    data: {
      name: newLevel.name,
      id: newLevel.id,
      elevation: newLevel.elevation,
      height: newLevel.height,
    },
  };
}

// ============================================
// DELETE LEVEL
// ============================================

function levelDelete(args: Record<string, unknown>): CommandResult {
  const target = args.name as string | undefined;

  if (!target) {
    return {
      success: false,
      message: "Usage: level delete <name-or-id>",
    };
  }

  const store = useModelStore.getState();
  const level =
    store.getLevelByName(target) ?? store.getLevelById(target);

  if (!level) {
    return {
      success: false,
      message: `Level "${target}" not found.`,
    };
  }

  const elements = store.getElementsByLevel(level.id);
  if (elements.length > 0) {
    return {
      success: false,
      message: `Cannot delete "${level.name}": ${elements.length} element(s) still assigned. Move or delete them first.`,
      data: { elements: elements.length },
    };
  }

  store.deleteLevel(level.id);

  return {
    success: true,
    message: `Level "${level.name}" deleted.`,
  };
}

// ============================================
// SET ACTIVE LEVEL
// ============================================

function levelSetActive(args: Record<string, unknown>): CommandResult {
  const target = args.name as string | undefined;

  if (!target) {
    return {
      success: false,
      message: "Usage: level active <name-or-id>",
    };
  }

  const store = useModelStore.getState();
  const level =
    store.getLevelByName(target) ?? store.getLevelById(target);

  if (!level) {
    return {
      success: false,
      message: `Level "${target}" not found.`,
    };
  }

  useUiStore.getState().setActiveLevel(level.name);

  return {
    success: true,
    message: `Active level set to "${level.name}".`,
    data: {
      name: level.name,
      elevation: level.elevation,
    },
  };
}

// ============================================
// REGISTER
// ============================================

export function registerLevelCommands(): void {
  registerCommand({
    name: "level",
    description: "Manage building levels/floors",
    usage: "level [list|add|delete|active] [args]",
    examples: [
      "level",
      "level list",
      'level add "Level 2" --elevation 3000 --height 3000',
      "level delete Level 2",
      "level active Level 1",
    ],
    handler: levelHandler,
  });
}
