/**
 * CDE Workflow Command Handlers (ISO 19650)
 *
 * Commands for managing CDE lifecycle states:
 * - share <id> --code S1|S2|S3|S4 — WIP → Shared
 * - publish <id> — Shared → Published
 * - archive <id> — Published → Archived
 * - cde status — show counts by state
 */

import {
  registerCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useHistoryStore } from "../../stores/historyStore";
import type { CDEState, SuitabilityCode, CDETransitionRecord } from "../../types/cde";
import { SUITABILITY_CODES, isValidTransition } from "../../types/cde";

const CDE_USER = "designer"; // Default user; in production this would come from auth

/**
 * Create a CDE transition record.
 */
function createTransitionRecord(
  fromState: CDEState,
  toState: CDEState,
  suitabilityCode?: SuitabilityCode,
  reason?: string
): CDETransitionRecord {
  return {
    fromState,
    toState,
    suitabilityCode,
    timestamp: new Date().toISOString(),
    user: CDE_USER,
    reason,
  };
}

/**
 * Resolve element ID from args or selection context.
 */
function resolveElementId(
  args: Record<string, unknown>,
  context: CommandContext
): string | undefined {
  const positional = args._positional as unknown[] | undefined;
  if (positional && positional.length > 0) {
    return String(positional[0]);
  }
  if (context.selectedIds.length === 1) {
    return context.selectedIds[0];
  }
  return undefined;
}

// ============================================
// SHARE COMMAND: WIP → Shared
// ============================================

async function shareHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  const elementId = resolveElementId(args, context);
  if (!elementId) {
    return { success: false, message: "Usage: share <element_id> --code S1|S2|S3|S4" };
  }

  const element = useModelStore.getState().getElementById(elementId);
  if (!element) {
    return { success: false, message: `Element not found: ${elementId}` };
  }

  const cdeState = element.cdeState || "WIP";
  if (!isValidTransition(cdeState, "Shared")) {
    return {
      success: false,
      message: `Cannot share: element is in '${cdeState}' state (must be WIP)`,
    };
  }

  const code = (args.code as string)?.toUpperCase() as SuitabilityCode | undefined;
  if (!code || !SUITABILITY_CODES[code]) {
    return {
      success: false,
      message: `Missing or invalid suitability code. Use --code S1|S2|S3|S4`,
    };
  }

  const record = createTransitionRecord(cdeState, "Shared", code);
  const history = [...(element.cdeHistory || []), record];

  useModelStore.getState().updateElement(elementId, {
    cdeState: "Shared",
    suitabilityCode: code,
    cdeHistory: history,
    modifiedAt: Date.now(),
  } as Partial<typeof element>);

  useHistoryStore.getState().recordAction(`Share ${elementId} (${code})`);

  return {
    success: true,
    message: `Shared ${element.name} with code ${code} (${SUITABILITY_CODES[code]})`,
    data: { element_id: elementId, state: "Shared", suitability_code: code },
  };
}

// ============================================
// PUBLISH COMMAND: Shared → Published
// ============================================

async function publishHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  const elementId = resolveElementId(args, context);
  if (!elementId) {
    return { success: false, message: "Usage: publish <element_id>" };
  }

  const element = useModelStore.getState().getElementById(elementId);
  if (!element) {
    return { success: false, message: `Element not found: ${elementId}` };
  }

  const cdeState = element.cdeState || "WIP";
  if (!isValidTransition(cdeState, "Published")) {
    return {
      success: false,
      message: `Cannot publish: element is in '${cdeState}' state (must be Shared)`,
    };
  }

  const record = createTransitionRecord(cdeState, "Published");
  const history = [...(element.cdeHistory || []), record];

  useModelStore.getState().updateElement(elementId, {
    cdeState: "Published",
    cdeHistory: history,
    modifiedAt: Date.now(),
  } as Partial<typeof element>);

  useHistoryStore.getState().recordAction(`Publish ${elementId}`);

  return {
    success: true,
    message: `Published ${element.name}`,
    data: { element_id: elementId, state: "Published" },
  };
}

// ============================================
// ARCHIVE COMMAND: Published → Archived
// ============================================

async function archiveHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  const elementId = resolveElementId(args, context);
  if (!elementId) {
    return { success: false, message: "Usage: archive <element_id>" };
  }

  const element = useModelStore.getState().getElementById(elementId);
  if (!element) {
    return { success: false, message: `Element not found: ${elementId}` };
  }

  const cdeState = element.cdeState || "WIP";
  if (!isValidTransition(cdeState, "Archived")) {
    return {
      success: false,
      message: `Cannot archive: element is in '${cdeState}' state (must be Published)`,
    };
  }

  const record = createTransitionRecord(cdeState, "Archived");
  const history = [...(element.cdeHistory || []), record];

  useModelStore.getState().updateElement(elementId, {
    cdeState: "Archived",
    cdeHistory: history,
    modifiedAt: Date.now(),
  } as Partial<typeof element>);

  useHistoryStore.getState().recordAction(`Archive ${elementId}`);

  return {
    success: true,
    message: `Archived ${element.name}`,
    data: { element_id: elementId, state: "Archived" },
  };
}

// ============================================
// CDE STATUS COMMAND
// ============================================

async function cdeStatusHandler(
  _args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const elements = useModelStore.getState().elements;

  const counts: Record<CDEState, number> = {
    WIP: 0,
    Shared: 0,
    Published: 0,
    Archived: 0,
  };

  for (const el of elements) {
    const state = (el.cdeState || "WIP") as CDEState;
    counts[state] = (counts[state] || 0) + 1;
  }

  const total = elements.length;
  const lines = [
    `CDE Status (${total} elements):`,
    `  🟡 WIP:       ${counts.WIP}`,
    `  🔵 Shared:    ${counts.Shared}`,
    `  🟢 Published: ${counts.Published}`,
    `  ⚪ Archived:  ${counts.Archived}`,
  ];

  return {
    success: true,
    message: lines.join("\n"),
    data: { counts, total },
  };
}

// ============================================
// REGISTER ALL CDE COMMANDS
// ============================================

export function registerCDECommands(): void {
  registerCommand({
    name: "share",
    description: "Share an element (WIP → Shared) with a suitability code per ISO 19650",
    usage: "share <element_id> --code S1|S2|S3|S4",
    examples: [
      "share wall-001 --code S1",
      "share wall-001 --code S3",
    ],
    handler: shareHandler,
  });

  registerCommand({
    name: "publish",
    description: "Publish an element (Shared → Published) per ISO 19650",
    usage: "publish <element_id>",
    examples: ["publish wall-001"],
    handler: publishHandler,
  });

  registerCommand({
    name: "archive",
    description: "Archive an element (Published → Archived) per ISO 19650",
    usage: "archive <element_id>",
    examples: ["archive wall-001"],
    handler: archiveHandler,
  });

  registerCommand({
    name: "cde",
    description: "Show CDE workflow status — element counts by state",
    usage: "cde status",
    examples: ["cde status"],
    handler: cdeStatusHandler,
  });
}
