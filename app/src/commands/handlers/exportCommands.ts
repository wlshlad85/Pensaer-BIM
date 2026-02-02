/**
 * Export Command Handlers
 *
 * Command handlers for exporting the BIM model to various formats.
 * P2-010: IFC Export via terminal command.
 */

import {
  registerCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { exportToIfc, downloadIfcFile } from "../../services/ifc";
import type { IfcExportOptions } from "../../services/ifc";

// ============================================
// EXPORT IFC HANDLER
// ============================================

export async function exportIfcHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const elements = useModelStore.getState().elements;

  if (elements.length === 0) {
    return {
      success: false,
      message: "No elements in model. Nothing to export.",
    };
  }

  // Parse options
  const options: IfcExportOptions = {};

  // IFC version: --version IFC2X3 or --version IFC4 (default IFC4)
  const version = args.version as string | undefined;
  if (version) {
    const upper = version.toUpperCase().replace(/\s+/g, "");
    if (upper === "IFC2X3" || upper === "2X3") {
      options.ifcVersion = "IFC2X3";
    } else if (upper === "IFC4" || upper === "4") {
      options.ifcVersion = "IFC4";
    } else {
      return {
        success: false,
        message: `Unsupported IFC version: ${version}. Use IFC2X3 or IFC4.`,
      };
    }
  }

  if (args.project) options.projectName = String(args.project);
  if (args.author) options.author = String(args.author);
  if (args.organization || args.org) {
    options.organization = String(args.organization || args.org);
  }

  // --dry-run: just validate and report stats without downloading
  const dryRun = args["dry-run"] === true || args.dryrun === true;

  try {
    if (dryRun) {
      // Export to get stats but don't trigger download
      const result = await exportToIfc(elements, options);
      return {
        success: true,
        message: `IFC export validated (${options.ifcVersion || "IFC4"}). ${result.stats.totalEntities} IFC entities from ${elements.length} elements. File size: ${(result.data.byteLength / 1024).toFixed(1)} KB.`,
        data: {
          filename: result.filename,
          fileSize: result.data.byteLength,
          ifcVersion: options.ifcVersion || "IFC4",
          stats: result.stats as unknown as Record<string, unknown>,
        },
      };
    }

    // Full export with browser download
    await downloadIfcFile(elements, options);

    // Also get stats for the result message
    const result = await exportToIfc(elements, options);

    return {
      success: true,
      message: `Exported ${elements.length} elements to ${result.filename} (${options.ifcVersion || "IFC4"}, ${(result.data.byteLength / 1024).toFixed(1)} KB)`,
      data: {
        filename: result.filename,
        fileSize: result.data.byteLength,
        ifcVersion: options.ifcVersion || "IFC4",
        elementCount: elements.length,
        stats: result.stats as unknown as Record<string, unknown>,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `IFC export failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================
// REGISTRATION
// ============================================

export function registerExportCommands(): void {
  registerCommand({
    name: "export",
    description: "Export model to IFC format (IFC2X3 or IFC4)",
    usage:
      "export ifc [--version IFC2X3|IFC4] [--project name] [--author name] [--org name] [--dry-run]",
    examples: [
      "export ifc",
      "export ifc --version IFC2X3",
      "export ifc --version IFC4 --project \"My Building\"",
      "export ifc --author \"Jane Smith\" --org \"ACME Corp\"",
      "export ifc --dry-run",
    ],
    handler: async (args, context) => {
      // The first positional arg should be "ifc"
      const positional = args._positional as unknown[] | undefined;
      const subcommand =
        (positional && positional.length > 0 ? String(positional[0]) : "") ||
        "";

      if (subcommand.toLowerCase() !== "ifc") {
        return {
          success: false,
          message: `Unknown export format: '${subcommand || "(none)"}'. Supported: ifc`,
        };
      }

      return exportIfcHandler(args, context);
    },
  });
}
