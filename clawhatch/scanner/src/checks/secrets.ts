/**
 * Secret Scanning checks (34-43).
 *
 * Checks for hardcoded API keys, .env handling, file permissions,
 * secrets in markdown files, and session log leakage.
 */

import { Severity, type Finding, type OpenClawConfig, type DiscoveredFiles } from "../types.js";
import { stat, access, constants, readFile } from "node:fs/promises";
import { platform } from "node:os";
import { join, basename } from "node:path";
import { scanMarkdown } from "../parsers/markdown.js";
import { parseJsonl } from "../parsers/jsonl.js";

/** Patterns that suggest an API key value (not a ${VAR} reference) */
const API_KEY_PATTERNS = [
  /sk-[a-zA-Z0-9]{32,}/,
  /sk-ant-[a-zA-Z0-9\-]{32,}/,
  /AIza[a-zA-Z0-9_\-]{35}/,
  /AKIA[A-Z0-9]{16}/,
  /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/,
  /(?:sk|pk)_(?:live|test)_[a-zA-Z0-9]{20,}/,
  /xox[bpras]-[a-zA-Z0-9\-]{10,}/,
];

export async function runSecretChecks(
  config: OpenClawConfig,
  configRaw: string | null,
  files: DiscoveredFiles,
  deep: boolean
): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Check 34: No API keys in openclaw.json (use ${VAR} substitution)
  if (configRaw) {
    for (const pattern of API_KEY_PATTERNS) {
      const match = pattern.exec(configRaw);
      if (match) {
        const preview = match[0].slice(0, 8) + "..." + match[0].slice(-4);
        findings.push({
          id: "SECRET-001",
          severity: Severity.Critical,
          confidence: "high",
          category: "Secret Scanning",
          title: "API key found in openclaw.json",
          description: `Hardcoded API key detected (${preview})`,
          risk: "Key will be exposed if config is shared, committed, or backed up",
          remediation: "Move key to .env file and use ${VAR_NAME} substitution in config",
          autoFixable: false,
          file: files.configPath ?? undefined,
        });
        break; // One finding per config file is enough
      }
    }
  }

  // Check 35: .env files exist and not in git (.gitignore check)
  if (files.envPath) {
    // Check if .gitignore exists and includes .env
    const gitignorePath = join(files.openclawDir, ".gitignore");
    try {
      const gitignore = await readFile(gitignorePath, "utf-8");
      if (!gitignore.includes(".env")) {
        findings.push({
          id: "SECRET-002",
          severity: Severity.High,
          confidence: "high",
          category: "Secret Scanning",
          title: ".env not in .gitignore",
          description: ".env file exists but is not listed in .gitignore",
          risk: "Secrets in .env could be accidentally committed to git",
          remediation: "Add .env to .gitignore",
          autoFixable: true,
          fixType: "safe",
          file: gitignorePath,
        });
      }
    } catch {
      // No .gitignore — flag it
      findings.push({
        id: "SECRET-002",
        severity: Severity.High,
        confidence: "high",
        category: "Secret Scanning",
        title: "No .gitignore found",
        description: "No .gitignore file in OpenClaw directory — .env and credentials may be committed",
        risk: "Secrets could be accidentally committed to git",
        remediation: "Create a .gitignore with: .env, credentials/, *.key",
        autoFixable: true,
        fixType: "safe",
      });
    }
  }

  // Checks 36-39: File permissions (Unix only, graceful skip on Windows)
  if (platform() === "win32") {
    findings.push({
      id: "SECRET-003",
      severity: Severity.Low,
      confidence: "medium",
      category: "Secret Scanning",
      title: "File permission checks skipped on Windows",
      description: "Unix file permission checks (chmod 600/700) cannot be verified on Windows",
      risk: "Windows ACLs should be reviewed manually to restrict access to OpenClaw files",
      remediation: "Verify that only your user account has access to ~/.openclaw/ via Windows Security settings",
      autoFixable: false,
    });
  } else {
    // Check 36: ~/.openclaw/ directory permissions = 700
    try {
      const s = await stat(files.openclawDir);
      const mode = s.mode & 0o777;
      if (mode !== 0o700) {
        findings.push({
          id: "SECRET-003",
          severity: Severity.High,
          confidence: "high",
          category: "Secret Scanning",
          title: "OpenClaw directory has loose permissions",
          description: `~/.openclaw/ has permissions ${mode.toString(8)} (should be 700)`,
          risk: "Other users on this system can read your OpenClaw configuration and secrets",
          remediation: 'Run: chmod 700 ~/.openclaw/',
          autoFixable: true,
          fixType: "safe",
          file: files.openclawDir,
        });
      }
    } catch {
      // Can't stat
    }

    // Check 37: openclaw.json permissions = 600
    if (files.configPath) {
      try {
        const s = await stat(files.configPath);
        const mode = s.mode & 0o777;
        if (mode !== 0o600) {
          findings.push({
            id: "SECRET-004",
            severity: Severity.High,
            confidence: "high",
            category: "Secret Scanning",
            title: "Config file has loose permissions",
            description: `openclaw.json has permissions ${mode.toString(8)} (should be 600)`,
            risk: "Other users can read your agent configuration",
            remediation: 'Run: chmod 600 ~/.openclaw/openclaw.json',
            autoFixable: true,
            fixType: "safe",
            file: files.configPath,
          });
        }
      } catch {
        // Can't stat
      }
    }

    // Check 38: credentials/*.json permissions = 600
    for (const credFile of files.credentialFiles) {
      try {
        const s = await stat(credFile);
        const mode = s.mode & 0o777;
        if (mode !== 0o600) {
          findings.push({
            id: "SECRET-005",
            severity: Severity.High,
            confidence: "high",
            category: "Secret Scanning",
            title: `Credential file has loose permissions`,
            description: `${basename(credFile)} has permissions ${mode.toString(8)} (should be 600)`,
            risk: "Other users can read your credentials",
            remediation: `Run: chmod 600 "${credFile}"`,
            autoFixable: true,
            fixType: "safe",
            file: credFile,
          });
        }
      } catch {
        // Can't stat
      }
    }

    // Check 39: auth-profiles.json permissions = 600
    for (const authFile of files.authProfileFiles) {
      try {
        const s = await stat(authFile);
        const mode = s.mode & 0o777;
        if (mode !== 0o600) {
          findings.push({
            id: "SECRET-006",
            severity: Severity.High,
            confidence: "high",
            category: "Secret Scanning",
            title: "Auth profile has loose permissions",
            description: `${basename(authFile)} has permissions ${mode.toString(8)} (should be 600)`,
            risk: "Other users can read your API keys",
            remediation: `Run: chmod 600 "${authFile}"`,
            autoFixable: true,
            fixType: "safe",
            file: authFile,
          });
        }
      } catch {
        // Can't stat
      }
    }
  }

  // Checks 40-42: Secrets in markdown files
  const mdFilesToScan: Array<{ path: string; name: string; checkId: string }> = [];

  for (const mdFile of files.workspaceMarkdownFiles) {
    const name = basename(mdFile).toUpperCase();
    let checkId = "SECRET-010";
    if (name === "SOUL.MD") checkId = "SECRET-007";
    else if (name === "AGENTS.MD") checkId = "SECRET-008";
    else if (name === "TOOLS.MD") checkId = "SECRET-009";
    mdFilesToScan.push({ path: mdFile, name, checkId });
  }

  for (const { path, name, checkId } of mdFilesToScan) {
    try {
      const result = await scanMarkdown(path);
      if (result.secretMatches.length > 0) {
        const firstMatch = result.secretMatches[0];
        findings.push({
          id: checkId,
          severity: name === "TOOLS.MD" ? Severity.Critical : Severity.High,
          confidence: "high",
          category: "Secret Scanning",
          title: `Secret found in ${name}`,
          description: `${result.secretMatches.length} potential secret(s) detected — first: ${firstMatch.pattern} at line ${firstMatch.line}`,
          risk: `Secrets in ${name} may be exposed via git, cloud sync, or agent output`,
          remediation: `Move secrets from ${name} to .env file and use environment variable references`,
          autoFixable: false,
          file: path,
          line: firstMatch.line,
        });
      }
    } catch {
      // Can't read file
    }
  }

  // Check 43: Session logs don't contain leaked keys (sample scan)
  for (const logFile of files.sessionLogFiles.slice(0, 5)) {
    // Only scan first 5 log files
    try {
      const result = await parseJsonl(logFile, deep);
      if (result.truncated) {
        const sizeMB = (result.totalSizeBytes / (1024 * 1024)).toFixed(1);
        findings.push({
          id: "SECRET-011",
          severity: Severity.Low,
          confidence: "medium",
          category: "Secret Scanning",
          title: `Large session log (${sizeMB}MB) — sampled`,
          description: `${basename(logFile)} is ${sizeMB}MB — only first 1MB was scanned`,
          risk: "Secrets in later portions of the log may be missed",
          remediation: "Run with --deep for full session log scanning",
          autoFixable: false,
          file: logFile,
        });
      }

      // Scan entries for API key patterns
      for (const entry of result.entries) {
        const content = entry.content || "";
        for (const pattern of API_KEY_PATTERNS) {
          if (pattern.test(content)) {
            findings.push({
              id: "SECRET-012",
              severity: Severity.High,
              confidence: "high",
              category: "Secret Scanning",
              title: "API key leaked in session log",
              description: `Potential API key found in session log ${basename(logFile)}`,
              risk: "Session logs with leaked keys may be backed up or synced to cloud",
              remediation: "Rotate the exposed key immediately and clear session logs",
              autoFixable: false,
              file: logFile,
            });
            break; // One finding per file
          }
        }
      }
    } catch {
      // Can't read file
    }
  }

  return findings;
}
