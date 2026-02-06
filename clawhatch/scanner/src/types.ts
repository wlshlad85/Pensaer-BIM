/**
 * Core types for Clawhatch security scanner.
 */

export enum Severity {
  Critical = "CRITICAL",
  High = "HIGH",
  Medium = "MEDIUM",
  Low = "LOW",
}

export type Confidence = "high" | "medium" | "low";

export type FixType = "safe" | "behavioral";

export interface Finding {
  id: string;
  severity: Severity;
  confidence: Confidence;
  category: string;
  title: string;
  description: string;
  risk: string;
  remediation: string;
  autoFixable: boolean;
  fixType?: FixType;
  references?: string[];
  /** File path where the issue was found */
  file?: string;
  /** Line number in the file */
  line?: number;
}

export interface ScanOptions {
  openclawPath: string;
  workspacePath?: string;
  autoFix: boolean;
  deep: boolean;
  json: boolean;
  upload: boolean;
}

export interface ScanResult {
  timestamp: string;
  openclawVersion: string | null;
  score: number;
  findings: Finding[];
  suggestions: Finding[];
  filesScanned: number;
  checksRun: number;
  checksPassed: number;
  duration: number;
  platform: NodeJS.Platform;
}

export interface FixResult {
  finding: Finding;
  applied: boolean;
  backupPath?: string;
  description: string;
  skippedReason?: string;
}

/** Parsed OpenClaw config (openclaw.json). Loosely typed since the format may vary. */
export interface OpenClawConfig {
  [key: string]: unknown;
  gateway?: {
    bind?: string;
    port?: number;
    auth?: {
      mode?: string;
      token?: string;
    };
    trustedProxies?: string[];
    allowInsecureAuth?: boolean;
    dangerouslyDisableDeviceAuth?: boolean;
  };
  channels?: Record<
    string,
    {
      dmPolicy?: string;
      allowFrom?: string[];
      groupPolicy?: string;
      groupAllowFrom?: string[];
      requireMention?: boolean;
      mentionPatterns?: string[];
      dmScope?: string;
      accounts?: Record<string, unknown>[];
    }
  >;
  sandbox?: {
    mode?: string;
    scope?: string;
    workspaceAccess?: string;
    docker?: {
      network?: string;
      socketMounted?: boolean;
    };
    browser?: {
      allowHostControl?: boolean;
    };
  };
  tools?: {
    elevated?: string[];
    useAccessGroups?: boolean;
  };
  pairing?: {
    storeTTL?: number;
  };
  model?: {
    default?: string;
    fallbackOrder?: string[];
  };
  reasoning?: {
    enabled?: boolean;
  };
  verbose?: {
    enabled?: boolean;
  };
  identityLinks?: unknown[];
  commands?: {
    useAccessGroups?: boolean;
  };
  agents?: Record<string, unknown>[];
}

/** Parsed .env file as key-value pairs */
export type EnvVars = Record<string, string>;

/** A single JSONL session entry */
export interface SessionEntry {
  role?: string;
  content?: string;
  tool?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/** Discovered files to scan */
export interface DiscoveredFiles {
  configPath: string | null;
  envPath: string | null;
  credentialFiles: string[];
  authProfileFiles: string[];
  sessionLogFiles: string[];
  workspaceMarkdownFiles: string[];
  skillFiles: string[];
  openclawDir: string;
  workspaceDir: string | null;
}
