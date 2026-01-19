/**
 * MCP Error Formatter
 *
 * Formats MCP errors for clear display in the terminal with actionable information.
 * Provides color-coded output by severity and suggested actions where applicable.
 */

// ============================================
// ERROR TYPES
// ============================================

/** MCP error codes based on JSON-RPC 2.0 spec */
export enum McpErrorCode {
  // Standard JSON-RPC errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // Custom MCP errors (server-defined range: -32000 to -32099)
  VALIDATION_ERROR = -32001,
  RESOURCE_NOT_FOUND = -32002,
  RESOURCE_CONFLICT = -32003,
  PERMISSION_DENIED = -32004,
  RATE_LIMITED = -32005,
  SERVICE_UNAVAILABLE = -32006,

  // Network/client errors (application-defined)
  NETWORK_ERROR = -1,
  TIMEOUT_ERROR = -2,
  CONNECTION_REFUSED = -3,
  CONNECTION_LOST = -4,
}

/** Error severity levels */
export type ErrorSeverity = "error" | "warning" | "info";

/** Structured error for formatting */
export interface McpError {
  code: number;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

/** Formatted error output */
export interface FormattedError {
  /** ANSI-formatted error string for terminal display */
  formatted: string;
  /** Plain text version without ANSI codes */
  plain: string;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Machine-readable error code */
  code: number;
  /** Human-readable error type */
  errorType: string;
  /** Suggested action to resolve the error */
  suggestion?: string;
}

// ============================================
// ANSI COLOR CODES
// ============================================

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  // Foreground colors
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Bright foreground
  brightRed: "\x1b[91m",
  brightYellow: "\x1b[93m",
  brightCyan: "\x1b[96m",

  // Background colors
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m",
} as const;

// ============================================
// ERROR TYPE MAPPING
// ============================================

interface ErrorTypeInfo {
  type: string;
  severity: ErrorSeverity;
  suggestion?: string;
}

const ERROR_TYPE_MAP: Record<number, ErrorTypeInfo> = {
  // JSON-RPC standard errors
  [McpErrorCode.PARSE_ERROR]: {
    type: "Parse Error",
    severity: "error",
    suggestion: "Check the request format and ensure valid JSON syntax.",
  },
  [McpErrorCode.INVALID_REQUEST]: {
    type: "Invalid Request",
    severity: "error",
    suggestion: "Verify the request structure matches the expected format.",
  },
  [McpErrorCode.METHOD_NOT_FOUND]: {
    type: "Method Not Found",
    severity: "error",
    suggestion: "Check the tool name. Use 'help' to see available commands.",
  },
  [McpErrorCode.INVALID_PARAMS]: {
    type: "Invalid Parameters",
    severity: "error",
    suggestion: "Check command arguments. Use 'help <command>' for usage.",
  },
  [McpErrorCode.INTERNAL_ERROR]: {
    type: "Internal Server Error",
    severity: "error",
    suggestion: "Try again. If the issue persists, check server logs.",
  },

  // Custom MCP errors
  [McpErrorCode.VALIDATION_ERROR]: {
    type: "Validation Error",
    severity: "warning",
    suggestion: "Check input values meet the required constraints.",
  },
  [McpErrorCode.RESOURCE_NOT_FOUND]: {
    type: "Resource Not Found",
    severity: "warning",
    suggestion: "Verify the element ID exists. Use 'list' to see elements.",
  },
  [McpErrorCode.RESOURCE_CONFLICT]: {
    type: "Resource Conflict",
    severity: "warning",
    suggestion: "The resource already exists or conflicts with another.",
  },
  [McpErrorCode.PERMISSION_DENIED]: {
    type: "Permission Denied",
    severity: "error",
    suggestion: "You don't have permission for this operation.",
  },
  [McpErrorCode.RATE_LIMITED]: {
    type: "Rate Limited",
    severity: "warning",
    suggestion: "Too many requests. Wait a moment and try again.",
  },
  [McpErrorCode.SERVICE_UNAVAILABLE]: {
    type: "Service Unavailable",
    severity: "error",
    suggestion: "The MCP server is temporarily unavailable. Check connection.",
  },

  // Network/client errors
  [McpErrorCode.NETWORK_ERROR]: {
    type: "Network Error",
    severity: "error",
    suggestion: "Check your network connection and server availability.",
  },
  [McpErrorCode.TIMEOUT_ERROR]: {
    type: "Timeout",
    severity: "warning",
    suggestion: "The operation timed out. Try again or check server status.",
  },
  [McpErrorCode.CONNECTION_REFUSED]: {
    type: "Connection Refused",
    severity: "error",
    suggestion: "Cannot connect to MCP server. Ensure the server is running.",
  },
  [McpErrorCode.CONNECTION_LOST]: {
    type: "Connection Lost",
    severity: "error",
    suggestion: "Lost connection to server. Attempting to reconnect...",
  },
};

// ============================================
// FORMATTER FUNCTIONS
// ============================================

/**
 * Get error type info from error code
 */
function getErrorTypeInfo(code: number): ErrorTypeInfo {
  return (
    ERROR_TYPE_MAP[code] || {
      type: "Unknown Error",
      severity: "error" as ErrorSeverity,
      suggestion: "An unexpected error occurred. Please try again.",
    }
  );
}

/**
 * Get severity color code
 */
function getSeverityColor(severity: ErrorSeverity): string {
  switch (severity) {
    case "error":
      return ANSI.brightRed;
    case "warning":
      return ANSI.brightYellow;
    case "info":
      return ANSI.brightCyan;
    default:
      return ANSI.white;
  }
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: ErrorSeverity): string {
  switch (severity) {
    case "error":
      return "\u2717"; // Heavy X
    case "warning":
      return "\u26A0"; // Warning triangle
    case "info":
      return "\u2139"; // Info circle
    default:
      return "\u2022"; // Bullet
  }
}

/**
 * Format error details (additional data)
 */
function formatErrorDetails(data: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    const formattedKey = key.replace(/_/g, " ");
    if (typeof value === "object") {
      lines.push(`  ${ANSI.gray}${formattedKey}:${ANSI.reset}`);
      if (Array.isArray(value)) {
        value.slice(0, 3).forEach((item, i) => {
          lines.push(`    ${ANSI.dim}[${i}]${ANSI.reset} ${String(item)}`);
        });
        if (value.length > 3) {
          lines.push(`    ${ANSI.dim}... and ${value.length - 3} more${ANSI.reset}`);
        }
      } else {
        for (const [k, v] of Object.entries(value)) {
          lines.push(`    ${ANSI.dim}${k}:${ANSI.reset} ${String(v)}`);
        }
      }
    } else {
      lines.push(`  ${ANSI.gray}${formattedKey}:${ANSI.reset} ${String(value)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a plain text version of error details
 */
function formatErrorDetailsPlain(data: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    const formattedKey = key.replace(/_/g, " ");
    if (typeof value === "object") {
      lines.push(`  ${formattedKey}:`);
      if (Array.isArray(value)) {
        value.slice(0, 3).forEach((item, i) => {
          lines.push(`    [${i}] ${String(item)}`);
        });
        if (value.length > 3) {
          lines.push(`    ... and ${value.length - 3} more`);
        }
      } else {
        for (const [k, v] of Object.entries(value)) {
          lines.push(`    ${k}: ${String(v)}`);
        }
      }
    } else {
      lines.push(`  ${formattedKey}: ${String(value)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format an MCP error for terminal display
 */
export function formatError(error: McpError): FormattedError {
  const typeInfo = getErrorTypeInfo(error.code);
  const color = getSeverityColor(typeInfo.severity);
  const icon = getSeverityIcon(typeInfo.severity);

  // Build formatted output with ANSI codes
  const formattedLines: string[] = [
    `${color}${ANSI.bold}${icon} ${typeInfo.type}${ANSI.reset}`,
    `${ANSI.dim}Error ${error.code}:${ANSI.reset} ${error.message}`,
  ];

  // Build plain text output
  const plainLines: string[] = [
    `${icon} ${typeInfo.type}`,
    `Error ${error.code}: ${error.message}`,
  ];

  // Add error details if present
  if (error.data && Object.keys(error.data).length > 0) {
    formattedLines.push(`${ANSI.cyan}Details:${ANSI.reset}`);
    formattedLines.push(formatErrorDetails(error.data));

    plainLines.push("Details:");
    plainLines.push(formatErrorDetailsPlain(error.data));
  }

  // Add timestamp if present
  if (error.timestamp) {
    const time = new Date(error.timestamp).toLocaleTimeString();
    formattedLines.push(`${ANSI.dim}Occurred at: ${time}${ANSI.reset}`);
    plainLines.push(`Occurred at: ${time}`);
  }

  // Add suggestion
  const suggestion = typeInfo.suggestion;
  if (suggestion) {
    formattedLines.push(`${ANSI.yellow}Tip:${ANSI.reset} ${suggestion}`);
    plainLines.push(`Tip: ${suggestion}`);
  }

  return {
    formatted: formattedLines.join("\n"),
    plain: plainLines.join("\n"),
    severity: typeInfo.severity,
    code: error.code,
    errorType: typeInfo.type,
    suggestion,
  };
}

/**
 * Format a validation error with field-specific details
 */
export function formatValidationError(
  message: string,
  fieldErrors?: Record<string, string>
): FormattedError {
  const error: McpError = {
    code: McpErrorCode.VALIDATION_ERROR,
    message,
    data: fieldErrors ? { fields: fieldErrors } : undefined,
  };

  const formatted = formatError(error);

  // Add field-specific errors
  if (fieldErrors) {
    const fieldLines: string[] = [];
    const fieldLinesPlain: string[] = [];

    for (const [field, fieldMsg] of Object.entries(fieldErrors)) {
      fieldLines.push(
        `  ${ANSI.red}\u2022${ANSI.reset} ${ANSI.bold}${field}${ANSI.reset}: ${fieldMsg}`
      );
      fieldLinesPlain.push(`  \u2022 ${field}: ${fieldMsg}`);
    }

    formatted.formatted = formatted.formatted.replace(
      "Details:",
      `${ANSI.cyan}Field Errors:${ANSI.reset}\n${fieldLines.join("\n")}\nDetails:`
    );
    formatted.plain = formatted.plain.replace(
      "Details:",
      `Field Errors:\n${fieldLinesPlain.join("\n")}\nDetails:`
    );
  }

  return formatted;
}

/**
 * Format a network error
 */
export function formatNetworkError(message: string, url?: string): FormattedError {
  const error: McpError = {
    code: McpErrorCode.NETWORK_ERROR,
    message,
    data: url ? { url } : undefined,
  };
  return formatError(error);
}

/**
 * Format a timeout error
 */
export function formatTimeoutError(
  operation: string,
  timeoutMs: number
): FormattedError {
  const error: McpError = {
    code: McpErrorCode.TIMEOUT_ERROR,
    message: `Operation '${operation}' timed out after ${timeoutMs}ms`,
    data: { operation, timeout_ms: timeoutMs },
  };
  return formatError(error);
}

/**
 * Format a server error (5xx equivalent)
 */
export function formatServerError(
  message: string,
  details?: Record<string, unknown>
): FormattedError {
  const error: McpError = {
    code: McpErrorCode.INTERNAL_ERROR,
    message,
    data: details,
    timestamp: new Date().toISOString(),
  };
  return formatError(error);
}

/**
 * Format a "method not found" error
 */
export function formatMethodNotFoundError(toolName: string): FormattedError {
  const error: McpError = {
    code: McpErrorCode.METHOD_NOT_FOUND,
    message: `Unknown tool: ${toolName}`,
    data: { requested_tool: toolName },
  };
  return formatError(error);
}

/**
 * Format a "resource not found" error
 */
export function formatResourceNotFoundError(
  resourceType: string,
  resourceId: string
): FormattedError {
  const error: McpError = {
    code: McpErrorCode.RESOURCE_NOT_FOUND,
    message: `${resourceType} '${resourceId}' not found`,
    data: { resource_type: resourceType, resource_id: resourceId },
  };
  return formatError(error);
}

/**
 * Write formatted error to xterm.js terminal
 */
export function writeErrorToTerminal(
  terminal: { writeln: (text: string) => void },
  error: FormattedError
): void {
  // Split by newlines and write each line
  for (const line of error.formatted.split("\n")) {
    terminal.writeln(line);
  }
}

/**
 * Convert a JavaScript Error to McpError
 */
export function fromJsError(err: Error): McpError {
  // Check for network-related errors
  if (err.name === "TypeError" && err.message.includes("fetch")) {
    return {
      code: McpErrorCode.NETWORK_ERROR,
      message: "Network request failed",
      data: { original_message: err.message },
    };
  }

  if (err.name === "AbortError") {
    return {
      code: McpErrorCode.TIMEOUT_ERROR,
      message: "Request was aborted",
    };
  }

  // Default to internal error
  return {
    code: McpErrorCode.INTERNAL_ERROR,
    message: err.message,
    data: { error_name: err.name },
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  formatError,
  formatValidationError,
  formatNetworkError,
  formatTimeoutError,
  formatServerError,
  formatMethodNotFoundError,
  formatResourceNotFoundError,
  writeErrorToTerminal,
  fromJsError,
  McpErrorCode,
};
