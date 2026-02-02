/**
 * ISO 19650 Naming Command Handlers
 *
 * Terminal commands for managing ISO 19650 information naming conventions.
 *
 * Commands:
 *   naming config --project PRJ01 --originator PEN
 *   naming show <id>
 *   naming list
 */

import {
  registerCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useNamingStore, TYPE_CODES, DISCIPLINE_CODES } from "../../stores/namingStore";
import { useModelStore } from "../../stores/modelStore";

// ============================================
// NAMING CONFIG
// ============================================

async function namingConfigHandler(
  args: Record<string, unknown>,
  _context: CommandContext,
): Promise<CommandResult> {
  const store = useNamingStore.getState();

  const project = args.project as string | undefined;
  const originator = args.originator as string | undefined;
  const volume = args.volume as string | undefined;
  const type = args.type as string | undefined;

  if (!project && !originator && !volume && !type) {
    // Show current config
    const cfg = store.config;
    return {
      success: true,
      message: [
        "📋 ISO 19650 Naming Configuration",
        `  Project:    ${cfg.project}`,
        `  Originator: ${cfg.originator}`,
        `  Volume:     ${cfg.defaultVolume}`,
        `  Type:       ${cfg.defaultType}`,
        "",
        "Type codes: " + Object.entries(TYPE_CODES).map(([k, v]) => `${k}=${v}`).join(", "),
        "Discipline codes: " + Object.entries(DISCIPLINE_CODES).map(([k, v]) => `${k}=${v}`).join(", "),
      ].join("\n"),
    };
  }

  const updates: Record<string, string> = {};
  if (project) updates.project = project;
  if (originator) updates.originator = originator;
  if (volume) updates.defaultVolume = volume;
  if (type) updates.defaultType = type;

  store.setConfig(updates);

  return {
    success: true,
    message: `✅ Naming config updated: ${Object.entries(updates).map(([k, v]) => `${k}=${v}`).join(", ")}`,
  };
}

// ============================================
// NAMING SHOW
// ============================================

async function namingShowHandler(
  args: Record<string, unknown>,
  _context: CommandContext,
): Promise<CommandResult> {
  const positional = args._positional as unknown[] | undefined;
  const elementId = (args.id as string) || (positional && positional[0] as string);

  if (!elementId) {
    return { success: false, message: "Usage: naming show <element-id>" };
  }

  const naming = useNamingStore.getState();
  const model = useModelStore.getState();
  const element = model.getElementById(elementId);

  if (!element) {
    return { success: false, message: `Element not found: ${elementId}` };
  }

  let isoName = naming.getName(elementId);
  if (!isoName) {
    // Generate on-the-fly
    const level = element.level || (element.properties.level as string) || "Level 1";
    isoName = naming.generateName(elementId, element.type, level);
  }

  return {
    success: true,
    message: [
      `📋 ISO 19650 Name for ${element.name} (${elementId})`,
      `  Full Name: ${isoName.fullName}`,
      "",
      `  Project:    ${isoName.fields.project}`,
      `  Originator: ${isoName.fields.originator}`,
      `  Volume:     ${isoName.fields.volume}`,
      `  Level:      ${isoName.fields.level}`,
      `  Type:       ${isoName.fields.type}`,
      `  Discipline: ${isoName.fields.discipline} (${DISCIPLINE_CODES[isoName.fields.discipline] || "Unknown"})`,
      `  Number:     ${isoName.fields.number}`,
    ].join("\n"),
  };
}

// ============================================
// NAMING LIST
// ============================================

async function namingListHandler(
  _args: Record<string, unknown>,
  _context: CommandContext,
): Promise<CommandResult> {
  const naming = useNamingStore.getState();
  const model = useModelStore.getState();
  const elements = model.elements;

  if (elements.length === 0) {
    return { success: true, message: "No elements in model." };
  }

  // Ensure all elements have names
  for (const el of elements) {
    if (!naming.getName(el.id)) {
      const level = el.level || (el.properties.level as string) || "Level 1";
      naming.generateName(el.id, el.type, level);
    }
  }

  const lines: string[] = ["📋 ISO 19650 Element Names", ""];
  for (const el of elements) {
    const name = naming.getName(el.id);
    if (name) {
      lines.push(`  ${name.fullName}  ←  ${el.name} (${el.id})`);
    }
  }
  lines.push("", `Total: ${elements.length} elements`);

  return { success: true, message: lines.join("\n") };
}

// ============================================
// REGISTRATION
// ============================================

export function registerNamingCommands(): void {
  registerCommand({
    name: "naming",
    description: "ISO 19650 information naming conventions",
    usage: "naming <config|show|list> [options]",
    handler: async (args, context) => {
      const positional = args._positional as unknown[] | undefined;
      const subcommand = positional?.[0] as string;

      switch (subcommand) {
        case "config":
          return namingConfigHandler(args, context);
        case "show": {
          // Shift positional so the show handler gets the id
          const newArgs = { ...args, _positional: positional?.slice(1) };
          return namingShowHandler(newArgs, context);
        }
        case "list":
          return namingListHandler(args, context);
        default:
          return {
            success: false,
            message: [
              "Usage: naming <subcommand>",
              "",
              "Subcommands:",
              "  config                      Show current naming config",
              "  config --project PRJ01      Set project code",
              "  config --originator PEN     Set originator code",
              "  show <element-id>           Show ISO name for element",
              "  list                        List all elements with ISO names",
            ].join("\n"),
          };
      }
    },
  });
}
