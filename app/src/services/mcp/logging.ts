/**
 * MCP Tool Call Logging
 *
 * Comprehensive logging for MCP tool calls with:
 * - Structured JSON format
 * - Configurable log levels
 * - Request/response/error logging with timing
 * - Console and custom output targets
 * - PII/sensitive data redaction
 * - Browser devtools integration
 */

import type { MCPToolCall, MCPToolResult } from "./types";
import type { MCPServerName } from "./MCPClient";

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Log entry for a tool call
 */
export interface ToolCallLogEntry {
  /** Unique request ID */
  requestId: string;
  /** Timestamp in ISO format */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Log level name */
  levelName: string;
  /** Event type */
  event: "request" | "response" | "error";
  /** Target MCP server */
  server?: MCPServerName;
  /** Tool name */
  tool: string;
  /** Request parameters (may be redacted) */
  params?: Record<string, unknown>;
  /** Response data (may be redacted) */
  result?: MCPToolResult;
  /** Duration in milliseconds (for response/error) */
  durationMs?: number;
  /** Error information */
  error?: {
    code: number;
    message: string;
    stack?: string;
  };
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Log output target interface
 */
export interface LogOutputTarget {
  /** Write a log entry */
  write(entry: ToolCallLogEntry): void;
  /** Flush any buffered entries */
  flush?(): void;
}

/**
 * Console output target
 */
export class ConsoleLogTarget implements LogOutputTarget {
  private useGrouping: boolean;

  constructor(options?: { useGrouping?: boolean }) {
    this.useGrouping = options?.useGrouping ?? true;
  }

  write(entry: ToolCallLogEntry): void {
    const prefix = `[MCP:${entry.tool}]`;
    const timestamp = entry.timestamp.split("T")[1].slice(0, 12);

    if (this.useGrouping && entry.event === "request") {
      console.groupCollapsed(
        `%c${prefix} ${timestamp} REQUEST`,
        "color: #6366f1; font-weight: bold"
      );
      console.log("Server:", entry.server);
      console.log("Params:", entry.params);
      console.log("Request ID:", entry.requestId);
      console.groupEnd();
    } else if (this.useGrouping && entry.event === "response") {
      const color = entry.result?.success ? "#22c55e" : "#ef4444";
      console.groupCollapsed(
        `%c${prefix} ${timestamp} RESPONSE (${entry.durationMs}ms)`,
        `color: ${color}; font-weight: bold`
      );
      console.log("Success:", entry.result?.success);
      if (entry.result?.data) console.log("Data:", entry.result.data);
      if (entry.result?.error) console.log("Error:", entry.result.error);
      if (entry.result?.warnings) console.log("Warnings:", entry.result.warnings);
      console.groupEnd();
    } else if (entry.event === "error") {
      console.error(
        `%c${prefix} ${timestamp} ERROR (${entry.durationMs}ms)`,
        "color: #ef4444; font-weight: bold"
      );
      console.error("Error:", entry.error);
    } else {
      // Fallback for non-grouped logging
      const logFn = entry.level === LogLevel.ERROR ? console.error :
                    entry.level === LogLevel.WARN ? console.warn :
                    entry.level === LogLevel.DEBUG ? console.debug : console.log;
      logFn(`${prefix} ${timestamp}`, entry);
    }
  }
}

/**
 * JSON file/storage output target
 */
export class JsonLogTarget implements LogOutputTarget {
  private entries: ToolCallLogEntry[] = [];
  private maxEntries: number;
  private storageKey: string;
  private useLocalStorage: boolean;

  constructor(options?: {
    maxEntries?: number;
    storageKey?: string;
    useLocalStorage?: boolean;
  }) {
    this.maxEntries = options?.maxEntries ?? 1000;
    this.storageKey = options?.storageKey ?? "pensaer_mcp_logs";
    this.useLocalStorage = options?.useLocalStorage ?? false;

    if (this.useLocalStorage) {
      this.loadFromStorage();
    }
  }

  write(entry: ToolCallLogEntry): void {
    this.entries.push(entry);

    // Trim if exceeding max
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    if (this.useLocalStorage) {
      this.saveToStorage();
    }
  }

  flush(): void {
    if (this.useLocalStorage) {
      this.saveToStorage();
    }
  }

  /**
   * Get all log entries
   */
  getEntries(): ToolCallLogEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries filtered by criteria
   */
  getFilteredEntries(filter: {
    level?: LogLevel;
    tool?: string;
    server?: MCPServerName;
    event?: "request" | "response" | "error";
    since?: Date;
  }): ToolCallLogEntry[] {
    return this.entries.filter((entry) => {
      if (filter.level !== undefined && entry.level < filter.level) return false;
      if (filter.tool && entry.tool !== filter.tool) return false;
      if (filter.server && entry.server !== filter.server) return false;
      if (filter.event && entry.event !== filter.event) return false;
      if (filter.since && new Date(entry.timestamp) < filter.since) return false;
      return true;
    });
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
    if (this.useLocalStorage) {
      try {
        localStorage.removeItem(this.storageKey);
      } catch {
        // localStorage not available
      }
    }
  }

  /**
   * Export entries as JSON string
   */
  export(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.entries = JSON.parse(stored);
      }
    } catch {
      // localStorage not available or invalid data
      this.entries = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
    } catch {
      // localStorage not available or quota exceeded
    }
  }
}

/**
 * Logger configuration
 */
export interface MCPLoggerConfig {
  /** Minimum log level (default: INFO in production, DEBUG in development) */
  level: LogLevel;
  /** Output targets */
  targets: LogOutputTarget[];
  /** Fields to redact from params (default: ["password", "token", "secret", "key"]) */
  redactFields: string[];
  /** Enable request logging (default: true) */
  logRequests: boolean;
  /** Enable response logging (default: true) */
  logResponses: boolean;
  /** Enable error logging (default: true) */
  logErrors: boolean;
  /** Include full response data (default: false for large responses) */
  includeFullResponse: boolean;
  /** Max data size to log before truncating (default: 10000 chars) */
  maxDataSize: number;
  /** Enable timing (default: true) */
  enableTiming: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: MCPLoggerConfig = {
  level: typeof window !== "undefined" && (window as Window & { __DEV__?: boolean }).__DEV__
    ? LogLevel.DEBUG
    : LogLevel.INFO,
  targets: [],
  redactFields: ["password", "token", "secret", "key", "apiKey", "api_key", "auth"],
  logRequests: true,
  logResponses: true,
  logErrors: true,
  includeFullResponse: false,
  maxDataSize: 10000,
  enableTiming: true,
};

/**
 * Get log level name
 */
function getLevelName(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG: return "DEBUG";
    case LogLevel.INFO: return "INFO";
    case LogLevel.WARN: return "WARN";
    case LogLevel.ERROR: return "ERROR";
    case LogLevel.NONE: return "NONE";
  }
}

/**
 * MCP Tool Call Logger
 */
export class MCPToolLogger {
  private config: MCPLoggerConfig;
  private requestStartTimes: Map<string, number> = new Map();

  constructor(config?: Partial<MCPLoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Add default console target if none provided
    if (this.config.targets.length === 0) {
      this.config.targets.push(new ConsoleLogTarget());
    }
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Add an output target
   */
  addTarget(target: LogOutputTarget): void {
    this.config.targets.push(target);
  }

  /**
   * Remove an output target
   */
  removeTarget(target: LogOutputTarget): void {
    const index = this.config.targets.indexOf(target);
    if (index !== -1) {
      this.config.targets.splice(index, 1);
    }
  }

  /**
   * Clear all targets
   */
  clearTargets(): void {
    this.config.targets = [];
  }

  /**
   * Log a tool call request
   */
  logRequest(
    requestId: string,
    call: MCPToolCall,
    server?: MCPServerName,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.logRequests) return;
    if (this.config.level > LogLevel.INFO) return;

    if (this.config.enableTiming) {
      this.requestStartTimes.set(requestId, performance.now());
    }

    const entry: ToolCallLogEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      levelName: getLevelName(LogLevel.INFO),
      event: "request",
      server,
      tool: call.tool,
      params: this.redactSensitiveData(call.arguments),
      metadata,
    };

    this.writeToTargets(entry);
  }

  /**
   * Log a tool call response
   */
  logResponse(
    requestId: string,
    tool: string,
    result: MCPToolResult,
    server?: MCPServerName,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.logResponses) return;

    const level = result.success ? LogLevel.INFO : LogLevel.WARN;
    if (this.config.level > level) return;

    const durationMs = this.getDuration(requestId);

    const entry: ToolCallLogEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      level,
      levelName: getLevelName(level),
      event: "response",
      server,
      tool,
      result: this.processResultForLogging(result),
      durationMs,
      metadata,
    };

    this.writeToTargets(entry);
    this.requestStartTimes.delete(requestId);
  }

  /**
   * Log a tool call error
   */
  logError(
    requestId: string,
    tool: string,
    error: Error | { code: number; message: string; data?: unknown },
    server?: MCPServerName,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.config.logErrors) return;
    if (this.config.level > LogLevel.ERROR) return;

    const durationMs = this.getDuration(requestId);

    const errorInfo = error instanceof Error
      ? {
          code: -1,
          message: error.message,
          stack: error.stack,
        }
      : {
          code: error.code,
          message: error.message,
          stack: undefined,
        };

    const entry: ToolCallLogEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      levelName: getLevelName(LogLevel.ERROR),
      event: "error",
      server,
      tool,
      error: errorInfo,
      durationMs,
      metadata,
    };

    this.writeToTargets(entry);
    this.requestStartTimes.delete(requestId);
  }

  /**
   * Log a custom debug message
   */
  debug(tool: string, message: string, data?: Record<string, unknown>): void {
    if (this.config.level > LogLevel.DEBUG) return;

    const entry: ToolCallLogEntry = {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      levelName: getLevelName(LogLevel.DEBUG),
      event: "request", // Using request as generic event type
      tool,
      metadata: { message, ...data },
    };

    this.writeToTargets(entry);
  }

  /**
   * Flush all targets
   */
  flush(): void {
    for (const target of this.config.targets) {
      target.flush?.();
    }
  }

  /**
   * Update configuration
   */
  configure(config: Partial<MCPLoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<MCPLoggerConfig> {
    return { ...this.config };
  }

  private getDuration(requestId: string): number | undefined {
    if (!this.config.enableTiming) return undefined;
    const startTime = this.requestStartTimes.get(requestId);
    if (startTime === undefined) return undefined;
    return Math.round(performance.now() - startTime);
  }

  private redactSensitiveData(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (this.shouldRedact(key)) {
        redacted[key] = "[REDACTED]";
      } else if (Array.isArray(value)) {
        // Preserve arrays as arrays
        redacted[key] = value.map((item) =>
          typeof item === "object" && item !== null
            ? this.redactSensitiveData(item as Record<string, unknown>)
            : item
        );
      } else if (typeof value === "object" && value !== null) {
        redacted[key] = this.redactSensitiveData(
          value as Record<string, unknown>
        );
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  private shouldRedact(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.config.redactFields.some(
      (field) => lowerKey.includes(field.toLowerCase())
    );
  }

  private processResultForLogging(result: MCPToolResult): MCPToolResult {
    if (this.config.includeFullResponse) {
      return result;
    }

    // Truncate large data
    const processed = { ...result };
    if (processed.data) {
      const dataStr = JSON.stringify(processed.data);
      if (dataStr.length > this.config.maxDataSize) {
        processed.data = {
          _truncated: true,
          _originalSize: dataStr.length,
          _preview: dataStr.slice(0, 500) + "...",
        };
      }
    }

    return processed;
  }

  private writeToTargets(entry: ToolCallLogEntry): void {
    for (const target of this.config.targets) {
      try {
        target.write(entry);
      } catch (error) {
        // Don't let logging errors break the application
        console.error("[MCPToolLogger] Failed to write to target:", error);
      }
    }
  }
}

// Singleton instance
let loggerInstance: MCPToolLogger | null = null;

/**
 * Get the singleton logger instance
 */
export function getMCPLogger(): MCPToolLogger {
  if (!loggerInstance) {
    loggerInstance = new MCPToolLogger();
  }
  return loggerInstance;
}

/**
 * Create a new logger instance
 */
export function createMCPLogger(
  config?: Partial<MCPLoggerConfig>
): MCPToolLogger {
  return new MCPToolLogger(config);
}

/**
 * Reset the singleton logger instance
 */
export function resetMCPLogger(): void {
  if (loggerInstance) {
    loggerInstance.flush();
    loggerInstance = null;
  }
}

/**
 * Configure the singleton logger
 */
export function configureMCPLogger(config: Partial<MCPLoggerConfig>): void {
  getMCPLogger().configure(config);
}

export default MCPToolLogger;
