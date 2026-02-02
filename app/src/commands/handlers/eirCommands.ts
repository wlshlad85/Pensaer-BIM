/**
 * EIR/BEP Command Handlers
 *
 * Terminal commands for ISO 19650 EIR/BEP workflow:
 *   eir load <file>   — load an EIR template
 *   eir validate      — validate model against loaded EIR
 *   eir report        — generate compliance report
 *   bep generate      — auto-generate BEP from current project
 */

import {
  registerCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useEIRStore } from "../../stores/eirStore";
import { SAMPLE_OFFICE_EIR } from "../../data/sampleEIR";
import {
  validateAgainstEIR,
  buildElementComplianceMap,
  formatEIRReport,
} from "../../utils/eirValidation";
import { generateBEP, formatBEPSummary } from "../../utils/bepGenerator";
import type { EIRTemplate } from "../../types/eir";

// ============================================
// EIR COMMAND
// ============================================

async function eirHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const subcommand = (args._positional as string[] | undefined)?.[0] ?? "";
  const eirStore = useEIRStore.getState();
  const elements = useModelStore.getState().elements;

  switch (subcommand) {
    case "load": {
      const file = (args._positional as string[])?.[1] ?? "";

      // Built-in templates
      if (file === "sample" || file === "office" || file === "sample-office") {
        eirStore.loadEIR(SAMPLE_OFFICE_EIR);
        return {
          success: true,
          message: `Loaded sample EIR: "${SAMPLE_OFFICE_EIR.projectName}"`,
          data: {
            id: SAMPLE_OFFICE_EIR.id,
            dataDrops: SAMPLE_OFFICE_EIR.dataDrops.length,
            globalRequirements: SAMPLE_OFFICE_EIR.globalRequirements.length,
            standards: SAMPLE_OFFICE_EIR.standards,
          },
        };
      }

      // Try parsing as JSON string (for testing/pasting)
      if (file.startsWith("{")) {
        try {
          const parsed = JSON.parse(file) as EIRTemplate;
          eirStore.loadEIR(parsed);
          return {
            success: true,
            message: `Loaded EIR: "${parsed.projectName}"`,
            data: { id: parsed.id },
          };
        } catch {
          return {
            success: false,
            message: "Failed to parse EIR JSON",
          };
        }
      }

      if (!file) {
        return {
          success: false,
          message:
            'Usage: eir load <file|sample>\n' +
            'Available templates: sample, office, sample-office\n' +
            'Or paste a JSON EIR document.',
        };
      }

      return {
        success: false,
        message: `File loading not yet supported in browser. Use "eir load sample" for the built-in template.`,
      };
    }

    case "validate": {
      const eir = eirStore.loadedEIR;
      if (!eir) {
        return {
          success: false,
          message: 'No EIR loaded. Run "eir load sample" first.',
        };
      }

      eirStore.setIsValidating(true);
      try {
        const dataDropId = (args._positional as string[])?.[1];
        const report = validateAgainstEIR(elements, eir, dataDropId);
        eirStore.setValidationReport(report);

        // Update per-element compliance
        eirStore.clearCompliance();
        const complianceMap = buildElementComplianceMap(report);
        for (const [eid, info] of Object.entries(complianceMap)) {
          eirStore.setElementCompliance(eid, info.status, info.messages);
        }

        // Mark passing elements
        for (const el of elements) {
          if (!complianceMap[el.id]) {
            eirStore.setElementCompliance(el.id, "pass", []);
          }
        }

        return {
          success: true,
          message:
            `EIR Validation Complete — ` +
            `✅ ${report.summary.passed} pass, ` +
            `❌ ${report.summary.failed} fail, ` +
            `⚠️ ${report.summary.warnings} warnings`,
          data: {
            summary: report.summary,
            totalRequirements: report.items.length,
          },
        };
      } finally {
        eirStore.setIsValidating(false);
      }
    }

    case "report": {
      const report = eirStore.validationReport;
      if (!report) {
        return {
          success: false,
          message:
            'No validation report available. Run "eir validate" first.',
        };
      }

      const formatted = formatEIRReport(report);
      return {
        success: true,
        message: formatted,
        data: { summary: report.summary },
      };
    }

    case "status": {
      const eir = eirStore.loadedEIR;
      if (!eir) {
        return {
          success: true,
          message: "No EIR loaded.",
          data: { loaded: false },
        };
      }
      return {
        success: true,
        message: `EIR loaded: "${eir.projectName}" (${eir.dataDrops.length} data drops)`,
        data: {
          loaded: true,
          id: eir.id,
          projectName: eir.projectName,
          dataDrops: eir.dataDrops.map((d) => d.id),
          hasReport: !!eirStore.validationReport,
        },
      };
    }

    case "clear": {
      eirStore.clearEIR();
      return {
        success: true,
        message: "EIR cleared.",
      };
    }

    default:
      return {
        success: false,
        message:
          "EIR commands:\n" +
          "  eir load <file|sample>  — Load an EIR template\n" +
          "  eir validate [drop-id]  — Validate model against EIR\n" +
          "  eir report              — Show compliance report\n" +
          "  eir status              — Show loaded EIR info\n" +
          "  eir clear               — Unload EIR",
      };
  }
}

// ============================================
// BEP COMMAND
// ============================================

async function bepHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const subcommand = (args._positional as string[] | undefined)?.[0] ?? "";
  const eirStore = useEIRStore.getState();
  const elements = useModelStore.getState().elements;

  switch (subcommand) {
    case "generate": {
      const eir = eirStore.loadedEIR;
      if (!eir) {
        return {
          success: false,
          message: 'No EIR loaded. Run "eir load sample" first.',
        };
      }

      const org = (args.org as string) ?? "Pensaer Design Ltd";
      const bep = generateBEP(eir, elements, org);
      eirStore.loadBEP(bep);

      const summary = formatBEPSummary(bep);
      return {
        success: true,
        message: `BEP generated successfully.\n\n${summary}`,
        data: {
          id: bep.id,
          eirId: bep.eirId,
          dataDropResponses: bep.dataDropResponses.length,
          teamSize: bep.projectTeam.length,
        },
      };
    }

    case "show": {
      const bep = eirStore.loadedBEP;
      if (!bep) {
        return {
          success: false,
          message: 'No BEP generated. Run "bep generate" first.',
        };
      }
      return {
        success: true,
        message: formatBEPSummary(bep),
        data: { id: bep.id },
      };
    }

    case "export": {
      const bep = eirStore.loadedBEP;
      if (!bep) {
        return {
          success: false,
          message: 'No BEP generated. Run "bep generate" first.',
        };
      }
      return {
        success: true,
        message: "BEP JSON:\n" + JSON.stringify(bep, null, 2),
        data: { id: bep.id },
      };
    }

    case "clear": {
      eirStore.clearBEP();
      return {
        success: true,
        message: "BEP cleared.",
      };
    }

    default:
      return {
        success: false,
        message:
          "BEP commands:\n" +
          "  bep generate [--org <name>] — Generate BEP from loaded EIR\n" +
          "  bep show                    — Show current BEP summary\n" +
          "  bep export                  — Export BEP as JSON\n" +
          "  bep clear                   — Clear BEP",
      };
  }
}

// ============================================
// REGISTRATION
// ============================================

export function registerEIRCommands(): void {
  registerCommand({
    name: "eir",
    description: "Exchange Information Requirements (ISO 19650) — load, validate, report",
    usage: "eir <load|validate|report|status|clear> [args]",
    examples: [
      'eir load sample',
      'eir validate',
      'eir validate dd1-concept',
      'eir report',
      'eir status',
    ],
    handler: eirHandler,
  });

  registerCommand({
    name: "bep",
    description: "BIM Execution Plan — generate and manage BEP responses to EIR",
    usage: "bep <generate|show|export|clear> [args]",
    examples: [
      'bep generate',
      'bep generate --org "Acme Architects"',
      'bep show',
      'bep export',
    ],
    handler: bepHandler,
  });
}
