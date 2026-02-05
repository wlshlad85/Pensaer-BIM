/**
 * File discovery for OpenClaw installations.
 *
 * Finds all relevant files to scan, handling:
 * - Default and custom paths
 * - Symlink detection and boundary checking
 * - Windows/macOS/Linux path differences
 * - Graceful missing-file handling
 */

import { stat, lstat, readlink, readdir, access, constants } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";
import { glob } from "glob";
import type { DiscoveredFiles } from "./types.js";

/** Common alternative locations for OpenClaw installations */
function getAlternativePaths(): string[] {
  const home = homedir();
  const paths = [join(home, ".openclaw")];

  if (platform() === "win32") {
    const appdata = process.env.APPDATA;
    if (appdata) {
      paths.push(join(appdata, "openclaw"));
    }
    paths.push(join(home, "AppData", "Roaming", "openclaw"));
  }

  return paths;
}

/**
 * Resolve ~ to home directory.
 */
function expandHome(p: string): string {
  if (p.startsWith("~")) {
    return join(homedir(), p.slice(1));
  }
  return p;
}

/**
 * Check if a path is a symlink and if it stays within expected boundaries.
 * Returns the resolved real path, or null if it's suspicious.
 */
async function safeResolvePath(
  filePath: string,
  expectedRoot: string
): Promise<{ path: string; isSymlink: boolean; outsideBoundary: boolean }> {
  try {
    const lstats = await lstat(filePath);
    if (lstats.isSymbolicLink()) {
      const target = await readlink(filePath);
      const resolved = resolve(filePath, "..", target);
      const outsideBoundary = !resolved
        .toLowerCase()
        .startsWith(expectedRoot.toLowerCase());
      return { path: resolved, isSymlink: true, outsideBoundary };
    }
    return { path: filePath, isSymlink: false, outsideBoundary: false };
  } catch {
    return { path: filePath, isSymlink: false, outsideBoundary: false };
  }
}

/**
 * Auto-detect OpenClaw installation path.
 */
export async function findOpenClawDir(
  customPath?: string
): Promise<string | null> {
  if (customPath) {
    const expanded = expandHome(customPath);
    try {
      await access(expanded, constants.R_OK);
      return expanded;
    } catch {
      return null;
    }
  }

  for (const candidate of getAlternativePaths()) {
    try {
      await access(candidate, constants.R_OK);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Discover all scannable files in an OpenClaw installation.
 */
export async function discoverFiles(
  openclawDir: string,
  workspaceDir: string | null
): Promise<{ files: DiscoveredFiles; symlinkWarnings: string[] }> {
  const symlinkWarnings: string[] = [];
  const resolvedRoot = resolve(openclawDir);

  const files: DiscoveredFiles = {
    configPath: null,
    envPath: null,
    credentialFiles: [],
    authProfileFiles: [],
    sessionLogFiles: [],
    workspaceMarkdownFiles: [],
    skillFiles: [],
    openclawDir: resolvedRoot,
    workspaceDir: workspaceDir ? resolve(workspaceDir) : null,
  };

  // Config file
  const configCandidate = join(resolvedRoot, "openclaw.json");
  try {
    const resolved = await safeResolvePath(configCandidate, resolvedRoot);
    if (resolved.isSymlink && resolved.outsideBoundary) {
      symlinkWarnings.push(
        `Symlink: ${configCandidate} -> ${resolved.path} (outside OpenClaw directory)`
      );
    } else {
      await access(resolved.path, constants.R_OK);
      files.configPath = resolved.path;
    }
  } catch {
    // No config file
  }

  // .env file
  const envCandidate = join(resolvedRoot, ".env");
  try {
    await access(envCandidate, constants.R_OK);
    files.envPath = envCandidate;
  } catch {
    // No .env
  }

  // Credential files
  try {
    const credDir = join(resolvedRoot, "credentials");
    const resolved = await safeResolvePath(credDir, resolvedRoot);
    if (resolved.isSymlink && resolved.outsideBoundary) {
      symlinkWarnings.push(
        `Symlink: credentials/ -> ${resolved.path} (outside OpenClaw directory)`
      );
    } else {
      try {
        const credFiles = await readdir(credDir);
        for (const f of credFiles) {
          if (f.endsWith(".json")) {
            files.credentialFiles.push(join(credDir, f));
          }
        }
      } catch {
        // No credentials dir
      }
    }
  } catch {
    // Can't stat
  }

  // Auth profile files (agents/*/auth-profiles.json)
  try {
    const matches = await glob("agents/*/auth-profiles.json", {
      cwd: resolvedRoot,
      absolute: true,
    });
    files.authProfileFiles = matches;
  } catch {
    // glob failed
  }

  // Session log files (agents/*/sessions/*.jsonl)
  try {
    const matches = await glob("agents/*/sessions/*.jsonl", {
      cwd: resolvedRoot,
      absolute: true,
    });
    files.sessionLogFiles = matches;
  } catch {
    // glob failed
  }

  // Skill files (managed)
  try {
    const matches = await glob("skills/*/SKILL.md", {
      cwd: resolvedRoot,
      absolute: true,
    });
    files.skillFiles = matches;
  } catch {
    // glob failed
  }

  // Workspace files
  if (workspaceDir) {
    const wsResolved = resolve(workspaceDir);
    const mdFiles = ["SOUL.md", "AGENTS.md", "TOOLS.md", "MEMORY.md"];

    for (const md of mdFiles) {
      const candidate = join(wsResolved, md);
      try {
        await access(candidate, constants.R_OK);
        files.workspaceMarkdownFiles.push(candidate);
      } catch {
        // File doesn't exist
      }
    }

    // memory/*.md
    try {
      const matches = await glob("memory/*.md", {
        cwd: wsResolved,
        absolute: true,
      });
      files.workspaceMarkdownFiles.push(...matches);
    } catch {
      // glob failed
    }

    // Workspace skills
    try {
      const matches = await glob("skills/*/SKILL.md", {
        cwd: wsResolved,
        absolute: true,
      });
      files.skillFiles.push(...matches);
    } catch {
      // glob failed
    }
  }

  return { files, symlinkWarnings };
}
