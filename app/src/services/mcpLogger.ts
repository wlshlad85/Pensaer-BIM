/**
 * MCP Logger Service
 *
 * Convenience wrapper for MCP tool call logging utilities.
 * Provides easy access to logging configuration and debug features.
 *
 * Usage:
 * ```ts
 * import { mcpLogger, enableDebugLogging, exportLogs } from './services/mcpLogger';
 *
 * // Enable verbose logging
 * enableDebugLogging();
 *
 * // Export logs for analysis
 * const json = exportLogs();
 * ```
 */

import {
  getMCPLogger,
  createMCPLogger,
  configureMCPLogger,
  resetMCPLogger,
  LogLevel,
  ConsoleLogTarget,
  JsonLogTarget,
  type MCPLoggerConfig,
  type MCPToolLogger,
  type ToolCallLogEntry,
  type LogOutputTarget,
} from "./mcp";

// Re-export types
export type {
  MCPLoggerConfig,
  MCPToolLogger,
  ToolCallLogEntry,
  LogOutputTarget,
};

// Re-export classes and enums
export { LogLevel, ConsoleLogTarget, JsonLogTarget };

// Re-export factory functions
export { getMCPLogger, createMCPLogger, configureMCPLogger, resetMCPLogger };

/**
 * Singleton logger instance for convenience
 */
export const mcpLogger = getMCPLogger();

/**
 * Enable debug-level logging (verbose)
 */
export function enableDebugLogging(): void {
  configureMCPLogger({ level: LogLevel.DEBUG });
  console.log("[MCP Logger] Debug logging enabled");
}

/**
 * Enable info-level logging (default)
 */
export function enableInfoLogging(): void {
  configureMCPLogger({ level: LogLevel.INFO });
  console.log("[MCP Logger] Info logging enabled");
}

/**
 * Disable all logging
 */
export function disableLogging(): void {
  configureMCPLogger({ level: LogLevel.NONE });
  console.log("[MCP Logger] Logging disabled");
}

/**
 * Create a JSON log target for storing logs
 */
export function createJsonLogTarget(options?: {
  maxEntries?: number;
  useLocalStorage?: boolean;
  storageKey?: string;
}): JsonLogTarget {
  return new JsonLogTarget(options);
}

/**
 * Add a log target to the singleton logger
 */
export function addLogTarget(target: LogOutputTarget): void {
  mcpLogger.addTarget(target);
}

/**
 * Get current log level
 */
export function getLogLevel(): LogLevel {
  return mcpLogger.getLevel();
}

/**
 * Set log level
 */
export function setLogLevel(level: LogLevel): void {
  mcpLogger.setLevel(level);
}

/**
 * Export logs from a JsonLogTarget as JSON string
 */
export function exportLogs(target?: JsonLogTarget): string {
  if (target) {
    return target.export();
  }

  // Find the first JsonLogTarget in the logger's targets
  const config = mcpLogger.getConfig();
  const jsonTarget = config.targets.find(
    (t): t is JsonLogTarget => t instanceof JsonLogTarget
  );

  if (jsonTarget) {
    return jsonTarget.export();
  }

  return "[]";
}

/**
 * Get filtered log entries from a JsonLogTarget
 */
export function getFilteredLogs(
  target: JsonLogTarget,
  filter: {
    level?: LogLevel;
    tool?: string;
    event?: "request" | "response" | "error";
    since?: Date;
  }
): ToolCallLogEntry[] {
  return target.getFilteredEntries(filter);
}

/**
 * Download logs as a JSON file
 */
export function downloadLogs(
  target?: JsonLogTarget,
  filename?: string
): void {
  const json = exportLogs(target);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `mcp-logs-${new Date().toISOString().slice(0, 19)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Get logging statistics
 */
export function getLoggingStats(target: JsonLogTarget): {
  totalEntries: number;
  requests: number;
  responses: number;
  errors: number;
  averageDuration: number;
  toolCounts: Record<string, number>;
} {
  const entries = target.getEntries();
  const requests = entries.filter((e) => e.event === "request").length;
  const responses = entries.filter((e) => e.event === "response").length;
  const errors = entries.filter((e) => e.event === "error").length;

  // Calculate average duration from responses
  const responsesWithDuration = entries.filter(
    (e) => e.event === "response" && e.durationMs !== undefined
  );
  const averageDuration =
    responsesWithDuration.length > 0
      ? responsesWithDuration.reduce((sum, e) => sum + (e.durationMs ?? 0), 0) /
        responsesWithDuration.length
      : 0;

  // Count by tool
  const toolCounts: Record<string, number> = {};
  for (const entry of entries) {
    toolCounts[entry.tool] = (toolCounts[entry.tool] ?? 0) + 1;
  }

  return {
    totalEntries: entries.length,
    requests,
    responses,
    errors,
    averageDuration: Math.round(averageDuration),
    toolCounts,
  };
}
