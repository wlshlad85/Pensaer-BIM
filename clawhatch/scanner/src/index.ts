#!/usr/bin/env node

/**
 * Clawhatch CLI — Security scanner for OpenClaw AI agents.
 *
 * Usage:
 *   npx clawhatch scan                     # Basic scan
 *   npx clawhatch scan --workspace .       # Include workspace files
 *   npx clawhatch scan --json              # Machine-readable output
 *   npx clawhatch scan --fix               # Auto-fix safe issues
 *   npx clawhatch scan --deep              # Deep scan (full session logs)
 */

import { Command } from "commander";
import chalk from "chalk";
import { scan } from "./scanner.js";
import { reportFindings, reportJson } from "./reporter.js";
import { applyFixes } from "./fixer.js";
import { sanitizeFindings } from "./sanitize.js";

const program = new Command();

program
  .name("clawhatch")
  .description("Security scanner for OpenClaw AI agents")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan your OpenClaw installation for security issues")
  .option("-p, --path <path>", "OpenClaw installation path", "~/.openclaw")
  .option("-w, --workspace <path>", "Workspace path (for SOUL.md, skills, etc.)")
  .option("--json", "Output JSON instead of formatted text")
  .option("--fix", "Auto-apply safe fixes (prompts for behavioral changes)")
  .option("--deep", "Deep scan — full session log analysis (slower)")
  .option("--upload", "Upload results to Clawhatch dashboard (requires login)")
  .action(async (options) => {
    if (!options.json) {
      console.log(chalk.cyan("\n  Clawhatch Security Scanner v0.1.0\n"));
    }

    const result = await scan({
      openclawPath: options.path,
      workspacePath: options.workspace,
      autoFix: !!options.fix,
      deep: !!options.deep,
      json: !!options.json,
      upload: !!options.upload,
    });

    // Output results
    if (options.json) {
      // Sanitize before JSON output
      result.findings = sanitizeFindings(result.findings);
      result.suggestions = sanitizeFindings(result.suggestions);
      reportJson(result);
    } else {
      reportFindings(result);
    }

    // Auto-fix if requested
    if (options.fix && result.findings.some((f) => f.autoFixable)) {
      const configPath = result.findings.find((f) => f.file)?.file ?? null;
      // We need the openclaw dir — derive from path option
      const { findOpenClawDir } = await import("./discover.js");
      const openclawDir = await findOpenClawDir(options.path);
      if (openclawDir) {
        await applyFixes(result.findings, configPath, openclawDir);
      }
    }

    // Upload placeholder
    if (options.upload) {
      console.log(
        chalk.yellow(
          "\n  --upload is not yet available. Coming in v0.2.0 (TASKSEC-02.06).\n"
        )
      );
    }

    // Exit code: 1 if critical findings, 0 otherwise
    const hasCritical = result.findings.some(
      (f) => f.severity === "CRITICAL"
    );
    process.exit(hasCritical ? 1 : 0);
  });

program.parse();
