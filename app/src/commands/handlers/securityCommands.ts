/**
 * Security Command Handlers — ISO 19650-5 Security Classification
 *
 * Implements security triage commands for classifying built asset information
 * per ISO 19650-5 requirements.
 */

import {
  registerCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useHistoryStore } from "../../stores/historyStore";
import {
  parseSecurityLevel,
  getSecurityLabel,
  isElevatedSecurity,
  type SecurityClassification,
  type AccessControl,
} from "../../types/elements";

// ============================================
// SECURITY CLASSIFY COMMAND
// ============================================

async function securityHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  const positional = args._positional as unknown[] | undefined;
  const subcommand = positional?.[0] as string | undefined;

  switch (subcommand) {
    case "classify":
      return classifyHandler(args, context);
    case "audit":
      return auditHandler();
    case "report":
      return reportHandler();
    default:
      return {
        success: false,
        message:
          "Usage: security <classify|audit|report>\n" +
          "  security classify <id> --level <official|official-sensitive|secret|top-secret>\n" +
          "  security audit — show elements with elevated classification\n" +
          "  security report — generate security assessment summary",
      };
  }
}

async function classifyHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  const positional = args._positional as unknown[] | undefined;
  // positional[0] = "classify", positional[1] = element id
  const elementId =
    (positional?.[1] as string) ??
    (context.selectedIds.length === 1 ? context.selectedIds[0] : undefined);

  if (!elementId) {
    return {
      success: false,
      message: "Missing element ID. Usage: security classify <id> --level <level>",
    };
  }

  const levelStr = args.level as string | undefined;
  if (!levelStr) {
    return {
      success: false,
      message: "Missing --level. Options: official, official-sensitive, secret, top-secret",
    };
  }

  const classification = parseSecurityLevel(levelStr);
  if (!classification) {
    return {
      success: false,
      message: `Invalid security level: "${levelStr}". Options: official, official-sensitive, secret, top-secret`,
    };
  }

  const store = useModelStore.getState();
  const element = store.getElementById(elementId);
  if (!element) {
    return { success: false, message: `Element not found: ${elementId}` };
  }

  // Build access control defaults for elevated classifications
  const accessControl: AccessControl | undefined = isElevatedSecurity(classification)
    ? {
        needToKnow: classification === "Secret" || classification === "TopSecret",
        restrictedTo: (args.restrictedTo as string[]) ?? [],
      }
    : undefined;

  store.updateElement(elementId, {
    securityClassification: classification,
    accessControl,
  });

  useHistoryStore
    .getState()
    .recordAction(
      `Classify ${element.name} as ${getSecurityLabel(classification)}`
    );

  return {
    success: true,
    message: `🔒 ${element.name} classified as ${getSecurityLabel(classification)}`,
    data: {
      id: elementId,
      classification,
      label: getSecurityLabel(classification),
      accessControl,
    },
  };
}

function auditHandler(): CommandResult {
  const elements = useModelStore.getState().elements;
  const elevated = elements.filter(
    (el) =>
      el.securityClassification && isElevatedSecurity(el.securityClassification)
  );

  if (elevated.length === 0) {
    return {
      success: true,
      message: "✅ No elements with elevated security classification.",
      data: { count: 0, elements: [] },
    };
  }

  const lines = elevated.map(
    (el) =>
      `  🔒 ${el.name} (${el.id}) — ${getSecurityLabel(el.securityClassification!)}`
  );

  return {
    success: true,
    message: `⚠️ ${elevated.length} element(s) with elevated security:\n${lines.join("\n")}`,
    data: {
      count: elevated.length,
      elements: elevated.map((el) => ({
        id: el.id,
        name: el.name,
        type: el.type,
        classification: el.securityClassification,
        label: getSecurityLabel(el.securityClassification!),
        accessControl: el.accessControl,
      })),
    },
  };
}

function reportHandler(): CommandResult {
  const elements = useModelStore.getState().elements;
  const total = elements.length;

  const counts: Record<SecurityClassification, number> = {
    Official: 0,
    OfficialSensitive: 0,
    Secret: 0,
    TopSecret: 0,
  };

  for (const el of elements) {
    const cls = el.securityClassification ?? "Official";
    counts[cls]++;
  }

  const needToKnowCount = elements.filter(
    (el) => el.accessControl?.needToKnow
  ).length;

  const elevated = total - counts.Official;
  const riskLevel =
    counts.TopSecret > 0
      ? "CRITICAL"
      : counts.Secret > 0
        ? "HIGH"
        : counts.OfficialSensitive > 0
          ? "MODERATE"
          : "LOW";

  const report = [
    "═══════════════════════════════════════",
    "  ISO 19650-5 SECURITY ASSESSMENT",
    "═══════════════════════════════════════",
    "",
    `  Total elements:          ${total}`,
    `  OFFICIAL:                ${counts.Official}`,
    `  OFFICIAL-SENSITIVE:      ${counts.OfficialSensitive}`,
    `  SECRET:                  ${counts.Secret}`,
    `  TOP SECRET:              ${counts.TopSecret}`,
    "",
    `  Elevated classifications: ${elevated}`,
    `  Need-to-know restricted:  ${needToKnowCount}`,
    `  Overall risk level:       ${riskLevel}`,
    "",
    "═══════════════════════════════════════",
  ].join("\n");

  return {
    success: true,
    message: report,
    data: {
      total,
      counts,
      elevated,
      needToKnowCount,
      riskLevel,
    },
  };
}

// ============================================
// REGISTRATION
// ============================================

export function registerSecurityCommands(): void {
  registerCommand({
    name: "security",
    description: "ISO 19650-5 security classification management",
    usage:
      "security <classify|audit|report>\n" +
      "  security classify <id> --level <official|official-sensitive|secret|top-secret>\n" +
      "  security audit\n" +
      "  security report",
    examples: [
      'security classify wall-001 --level official-sensitive',
      "security audit",
      "security report",
    ],
    handler: securityHandler,
  });
}
