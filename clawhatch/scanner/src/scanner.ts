/**
 * Main scanner orchestrator.
 *
 * Pipeline:
 * 1. Discover files
 * 2. Parse config, env, markdown
 * 3. Run all check categories
 * 4. Score results
 * 5. Sanitize findings
 * 6. Separate findings from suggestions (by confidence)
 * 7. Return ScanResult
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import chalk from "chalk";
import { findOpenClawDir, discoverFiles } from "./discover.js";
import { parseConfig, readConfigRaw } from "./parsers/config.js";
import { parseEnv } from "./parsers/env.js";
import { runIdentityChecks } from "./checks/identity.js";
import { runNetworkChecks } from "./checks/network.js";
import { runSandboxChecks } from "./checks/sandbox.js";
import { runSecretChecks } from "./checks/secrets.js";
import { runModelChecks } from "./checks/model.js";
import { runCloudSyncCheck } from "./checks/cloud-sync.js";
import { calculateScore } from "./scoring.js";
import { sanitizeFindings } from "./sanitize.js";
import type { Finding, ScanOptions, ScanResult } from "./types.js";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

const TOTAL_CHECKS = 51;

/**
 * Detect OpenClaw version by running `openclaw --version`.
 */
async function detectVersion(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("openclaw", ["--version"], {
      timeout: 5000,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Run the full security scan.
 */
export async function scan(options: ScanOptions): Promise<ScanResult> {
  const startTime = Date.now();

  // Use stderr for progress messages when JSON output is requested
  const log = options.json
    ? (...args: unknown[]) => console.error(...args)
    : (...args: unknown[]) => console.log(...args);

  // Step 0: Find OpenClaw installation
  const openclawDir = await findOpenClawDir(options.openclawPath);
  if (!openclawDir) {
    console.error(chalk.red("\n  OpenClaw installation not found."));
    console.error(chalk.dim("  Try: clawhatch scan --path /custom/path"));
    console.error(chalk.dim("  Common locations:"));
    if (process.platform === "win32") {
      console.error(chalk.dim("    Windows: %APPDATA%\\openclaw"));
    }
    console.error(chalk.dim("    macOS/Linux: ~/.openclaw"));
    process.exit(1);
  }

  // Step 0.5: Detect version
  const version = await detectVersion();
  if (version) {
    log(chalk.dim(`  OpenClaw version: ${version}`));
  }

  // Step 1: Discover files
  log(chalk.dim("  Discovering files..."));
  const { files, symlinkWarnings } = await discoverFiles(
    openclawDir,
    options.workspacePath ?? null
  );

  // Report symlink warnings
  for (const warning of symlinkWarnings) {
    log(chalk.yellow(`  Warning: ${warning}`));
  }

  let filesScanned = 0;
  if (files.configPath) filesScanned++;
  if (files.envPath) filesScanned++;
  filesScanned += files.credentialFiles.length;
  filesScanned += files.authProfileFiles.length;
  filesScanned += files.sessionLogFiles.length;
  filesScanned += files.workspaceMarkdownFiles.length;
  filesScanned += files.skillFiles.length;

  if (!files.configPath) {
    log(
      chalk.yellow(
        "  Warning: openclaw.json not found — config-based checks will be limited"
      )
    );
  }

  if (!options.workspacePath) {
    log(
      chalk.dim(
        "  Tip: Run with --workspace <path> for full scan including SOUL.md, skills, etc."
      )
    );
  }

  // Step 2: Parse files
  log(chalk.dim("  Parsing configuration..."));
  const config = files.configPath
    ? await parseConfig(files.configPath)
    : null;
  const configRaw = files.configPath
    ? await readConfigRaw(files.configPath)
    : null;

  // Step 3: Run all checks
  log(chalk.dim("  Running 51 security checks..."));
  const allFindings: Finding[] = [];

  if (config) {
    // Identity & Access (checks 1-15)
    const identityFindings = await runIdentityChecks(config, {
      credentialFiles: files.credentialFiles,
      authProfileFiles: files.authProfileFiles,
    });
    allFindings.push(...identityFindings);

    // Network Exposure (checks 16-25)
    const networkFindings = await runNetworkChecks(config);
    allFindings.push(...networkFindings);

    // Sandbox Configuration (checks 26-33)
    const sandboxFindings = await runSandboxChecks(config);
    allFindings.push(...sandboxFindings);
  }

  // Secret Scanning (checks 34-43)
  if (config || files.workspaceMarkdownFiles.length > 0) {
    const secretFindings = await runSecretChecks(
      config || {},
      configRaw,
      files,
      options.deep
    );
    allFindings.push(...secretFindings);
  }

  // Model Security (checks 44-50)
  if (config) {
    const soulMdPath = files.workspaceMarkdownFiles.find((f) =>
      f.toLowerCase().endsWith("soul.md")
    ) ?? null;
    const modelFindings = await runModelChecks(config, soulMdPath);
    allFindings.push(...modelFindings);
  }

  // Cloud Sync Detection (check 51)
  const cloudFindings = await runCloudSyncCheck(openclawDir);
  allFindings.push(...cloudFindings);

  // Step 4: Separate findings from suggestions
  const findings = allFindings.filter((f) => f.confidence !== "low");
  const suggestions = allFindings.filter((f) => f.confidence === "low");

  // Step 5: Sanitize (strip any accidental secret values)
  const sanitizedFindings = sanitizeFindings(findings);
  const sanitizedSuggestions = sanitizeFindings(suggestions);

  // Step 6: Calculate score (only high-confidence findings count)
  const score = calculateScore(sanitizedFindings);

  const duration = Date.now() - startTime;

  return {
    timestamp: new Date().toISOString(),
    openclawVersion: version,
    score,
    findings: sanitizedFindings,
    suggestions: sanitizedSuggestions,
    filesScanned,
    checksRun: TOTAL_CHECKS,
    checksPassed: TOTAL_CHECKS - sanitizedFindings.length,
    duration,
    platform: process.platform,
  };
}
