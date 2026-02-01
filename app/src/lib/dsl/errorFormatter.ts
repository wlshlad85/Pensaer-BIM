/**
 * DSL Error Formatter
 *
 * Formats DSL errors for user-friendly terminal display with:
 * - Position indicators showing where the error occurred
 * - Color-coded output by error type
 * - Actionable suggestions
 */

import type { DslError } from "./errors";
import { DslErrorCode, findSimilar, KNOWN_COMMANDS } from "./errors";

// =============================================================================
// ANSI Color Codes
// =============================================================================

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  underline: "\x1b[4m",

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
  brightGreen: "\x1b[92m",
  brightMagenta: "\x1b[95m",
} as const;

// =============================================================================
// Error Category and Severity
// =============================================================================

type ErrorCategory = "syntax" | "command" | "reference" | "validation";
type ErrorSeverity = "error" | "warning" | "info";

interface ErrorCategoryInfo {
  category: ErrorCategory;
  severity: ErrorSeverity;
  icon: string;
  label: string;
  color: string;
}

function getErrorCategoryInfo(code: DslErrorCode): ErrorCategoryInfo {
  // Syntax errors (1xxx)
  if (code >= 1000 && code < 2000) {
    return {
      category: "syntax",
      severity: "error",
      icon: "\u2717", // X mark
      label: "Syntax Error",
      color: ANSI.brightRed,
    };
  }

  // Command errors (2xxx)
  if (code >= 2000 && code < 3000) {
    return {
      category: "command",
      severity: "error",
      icon: "\u2717",
      label: "Command Error",
      color: ANSI.brightRed,
    };
  }

  // Reference errors (3xxx)
  if (code >= 3000 && code < 4000) {
    return {
      category: "reference",
      severity: "error",
      icon: "\u2717",
      label: "Reference Error",
      color: ANSI.brightYellow,
    };
  }

  // Validation errors (4xxx)
  if (code >= 4000 && code < 5000) {
    return {
      category: "validation",
      severity: "warning",
      icon: "\u26A0", // Warning triangle
      label: "Validation Error",
      color: ANSI.brightYellow,
    };
  }

  return {
    category: "syntax",
    severity: "error",
    icon: "\u2717",
    label: "Error",
    color: ANSI.brightRed,
  };
}

// =============================================================================
// Suggestion Generation
// =============================================================================

function getSuggestion(error: DslError): string | undefined {
  switch (error.code) {
    case DslErrorCode.UNEXPECTED_TOKEN:
      return "Check for typos or missing punctuation.";

    case DslErrorCode.UNEXPECTED_END_OF_INPUT:
      return "Complete the command or add missing values.";

    case DslErrorCode.UNTERMINATED_STRING:
      return "Add a closing quote to the string.";

    case DslErrorCode.UNKNOWN_COMMAND: {
      const suggestions = error.context?.suggestions as string[] | undefined;
      if (suggestions && suggestions.length > 0) {
        return `Did you mean: ${suggestions.map((s) => `'${s}'`).join(", ")}?`;
      }
      return "Type 'help' to see available commands.";
    }

    case DslErrorCode.MISSING_REQUIRED_PARAM: {
      const param = error.context?.param as string;
      const cmd = error.context?.command as string;
      return `Add the '${param}' parameter. Example: ${cmd} ${param} <value>`;
    }

    case DslErrorCode.INVALID_PARAM_VALUE: {
      const expected = error.context?.expected as string;
      return `Use a value of type ${expected}.`;
    }

    case DslErrorCode.UNKNOWN_VARIABLE: {
      const available = error.context?.available as string[] | undefined;
      if (available && available.length > 0) {
        return `Available variables: ${available.join(", ")}`;
      }
      return "Use $last, $selected, or $wall.";
    }

    case DslErrorCode.INVALID_ELEMENT_REF:
      return "Use a UUID like 'abc123-...' or a variable like $last.";

    case DslErrorCode.WALL_TOO_SHORT:
      return "Increase the distance between start and end points.";

    case DslErrorCode.INVALID_COORDINATES:
      return "Use format: (x, y) or x,y with numeric values.";

    case DslErrorCode.NEGATIVE_DIMENSION:
      return "Use a positive value for dimensions.";

    case DslErrorCode.OPENING_OUTSIDE_WALL:
      return "Reduce the offset to place the opening within the wall.";

    case DslErrorCode.INVALID_OFFSET:
      return "Use a non-negative offset value.";

    default:
      return undefined;
  }
}

// =============================================================================
// Position Indicator
// =============================================================================

/**
 * Create a position indicator showing where the error occurred in the source
 */
function createPositionIndicator(
  sourceLine: string,
  column: number,
  length: number = 1
): string {
  // Ensure column is within bounds
  const col = Math.max(1, Math.min(column, sourceLine.length + 1));
  const len = Math.max(1, length);

  // Create the indicator line with ^ pointing to the error
  const padding = " ".repeat(col - 1);
  const carets = "^".repeat(Math.min(len, sourceLine.length - col + 2));

  return `${ANSI.cyan}${sourceLine}${ANSI.reset}\n${ANSI.brightRed}${padding}${carets}${ANSI.reset}`;
}

// =============================================================================
// Formatted Error Output
// =============================================================================

export interface FormattedDslError {
  /** ANSI-formatted string for terminal display */
  formatted: string;
  /** Plain text version without ANSI codes */
  plain: string;
  /** Error severity */
  severity: ErrorSeverity;
  /** Error category */
  category: ErrorCategory;
}

/**
 * Format a single DSL error for terminal display
 */
export function formatDslError(
  error: DslError,
  sourceLine?: string
): FormattedDslError {
  const info = getErrorCategoryInfo(error.code);
  const suggestion = getSuggestion(error);

  const lines: string[] = [];
  const plainLines: string[] = [];

  // Header with icon and label
  lines.push(
    `${info.color}${ANSI.bold}${info.icon} ${info.label}${ANSI.reset} ${ANSI.dim}[${error.code}]${ANSI.reset}`
  );
  plainLines.push(`${info.icon} ${info.label} [${error.code}]`);

  // Position info
  lines.push(
    `${ANSI.gray}  at line ${error.position.line}, column ${error.position.column}${ANSI.reset}`
  );
  plainLines.push(
    `  at line ${error.position.line}, column ${error.position.column}`
  );

  // Error message
  lines.push(`${ANSI.white}  ${error.message}${ANSI.reset}`);
  plainLines.push(`  ${error.message}`);

  // Source line with position indicator
  if (sourceLine) {
    lines.push("");
    lines.push(
      `  ${createPositionIndicator(sourceLine.trim(), error.position.column, error.source?.length)}`
    );
    plainLines.push("");
    plainLines.push(`  ${sourceLine.trim()}`);
    const indicator =
      " ".repeat(error.position.column - 1) +
      "^".repeat(error.source?.length || 1);
    plainLines.push(`  ${indicator}`);
  }

  // Suggestion
  if (suggestion) {
    lines.push("");
    lines.push(`${ANSI.brightGreen}  \u2192 Tip:${ANSI.reset} ${suggestion}`);
    plainLines.push("");
    plainLines.push(`  -> Tip: ${suggestion}`);
  }

  return {
    formatted: lines.join("\n"),
    plain: plainLines.join("\n"),
    severity: info.severity,
    category: info.category,
  };
}

/**
 * Format multiple DSL errors
 */
export function formatDslErrors(
  errors: DslError[],
  source?: string
): FormattedDslError[] {
  const sourceLines = source?.split("\n");

  return errors.map((error) => {
    const sourceLine = sourceLines?.[error.position.line - 1];
    return formatDslError(error, sourceLine);
  });
}

// =============================================================================
// Terminal Writer
// =============================================================================

interface TerminalLike {
  writeln: (text: string) => void;
}

/**
 * Write a formatted error to an xterm.js terminal
 */
export function writeDslErrorToTerminal(
  terminal: TerminalLike,
  error: FormattedDslError
): void {
  for (const line of error.formatted.split("\n")) {
    terminal.writeln(line);
  }
}

/**
 * Write multiple errors to terminal
 */
export function writeDslErrorsToTerminal(
  terminal: TerminalLike,
  errors: FormattedDslError[]
): void {
  for (let i = 0; i < errors.length; i++) {
    if (i > 0) {
      terminal.writeln(""); // Blank line between errors
    }
    writeDslErrorToTerminal(terminal, errors[i]);
  }

  // Summary if multiple errors
  if (errors.length > 1) {
    terminal.writeln("");
    terminal.writeln(
      `${ANSI.dim}Found ${errors.length} error(s)${ANSI.reset}`
    );
  }
}

// =============================================================================
// Parse Result Formatter
// =============================================================================

import type { ParseError, ParseResult } from "./ast";

/**
 * Convert a ParseError to a DslError
 */
export function parseErrorToDslError(error: ParseError): DslError {
  // Determine error code based on message content
  let code = DslErrorCode.UNKNOWN;

  if (error.message.includes("Expected")) {
    code = DslErrorCode.UNEXPECTED_TOKEN;
  } else if (error.message.includes("Unexpected token")) {
    // Check if it's an unknown command
    if (error.tokenValue) {
      const suggestions = findSimilar(error.tokenValue, KNOWN_COMMANDS);
      return {
        code: DslErrorCode.UNKNOWN_COMMAND,
        message: error.message,
        position: { line: error.line, column: error.column },
        source: error.tokenValue,
        context: { suggestions },
      };
    }
    code = DslErrorCode.UNEXPECTED_TOKEN;
  } else if (error.message.includes("expected start point")) {
    code = DslErrorCode.MISSING_REQUIRED_PARAM;
  } else if (error.message.includes("expected end point")) {
    code = DslErrorCode.MISSING_REQUIRED_PARAM;
  } else if (error.message.includes("expected offset")) {
    code = DslErrorCode.MISSING_REQUIRED_PARAM;
  } else if (error.message.includes("Unknown variable")) {
    code = DslErrorCode.UNKNOWN_VARIABLE;
  } else if (error.message.includes("Unknown option")) {
    code = DslErrorCode.INVALID_PARAM_VALUE;
  }

  return {
    code,
    message: error.message,
    position: { line: error.line, column: error.column },
    source: error.tokenValue,
  };
}

/**
 * Format parse errors for terminal display
 */
export function formatParseErrors(
  result: ParseResult,
  source?: string
): FormattedDslError[] {
  const dslErrors = result.errors.map(parseErrorToDslError);
  return formatDslErrors(dslErrors, source);
}

/**
 * Write parse result errors to terminal
 */
export function writeParseErrorsToTerminal(
  terminal: TerminalLike,
  result: ParseResult,
  source?: string
): void {
  const formatted = formatParseErrors(result, source);
  writeDslErrorsToTerminal(terminal, formatted);
}

// =============================================================================
// Quick Formatting Helpers
// =============================================================================

/**
 * Format a quick error message (without full error structure)
 */
export function formatQuickError(
  message: string,
  suggestion?: string
): string {
  let output = `${ANSI.brightRed}${ANSI.bold}\u2717 Error:${ANSI.reset} ${message}`;
  if (suggestion) {
    output += `\n${ANSI.brightGreen}  \u2192 Tip:${ANSI.reset} ${suggestion}`;
  }
  return output;
}

/**
 * Format a quick warning message
 */
export function formatQuickWarning(
  message: string,
  suggestion?: string
): string {
  let output = `${ANSI.brightYellow}${ANSI.bold}\u26A0 Warning:${ANSI.reset} ${message}`;
  if (suggestion) {
    output += `\n${ANSI.brightGreen}  \u2192 Tip:${ANSI.reset} ${suggestion}`;
  }
  return output;
}

/**
 * Format unknown command error with suggestions
 */
export function formatUnknownCommand(
  command: string,
  suggestions?: string[]
): string {
  let output = `${ANSI.brightRed}${ANSI.bold}\u2717 Unknown command:${ANSI.reset} '${command}'`;

  if (suggestions && suggestions.length > 0) {
    output += `\n${ANSI.brightGreen}  \u2192 Did you mean:${ANSI.reset} ${suggestions.map((s) => `'${s}'`).join(", ")}?`;
  } else {
    output += `\n${ANSI.brightGreen}  \u2192 Tip:${ANSI.reset} Type 'help' to see available commands.`;
  }

  return output;
}

/**
 * Format missing parameter error
 */
export function formatMissingParam(
  paramName: string,
  commandName: string,
  usage?: string
): string {
  let output = `${ANSI.brightRed}${ANSI.bold}\u2717 Missing parameter:${ANSI.reset} '${paramName}' is required for '${commandName}'`;

  if (usage) {
    output += `\n${ANSI.cyan}  Usage:${ANSI.reset} ${usage}`;
  }

  return output;
}

/**
 * Format invalid value error
 */
export function formatInvalidValue(
  paramName: string,
  value: string,
  expected: string
): string {
  return `${ANSI.brightRed}${ANSI.bold}\u2717 Invalid value:${ANSI.reset} '${value}' for '${paramName}'\n${ANSI.brightGreen}  \u2192 Expected:${ANSI.reset} ${expected}`;
}

// =============================================================================
// Exports
// =============================================================================

export {
  ANSI,
  type ErrorCategory,
  type ErrorSeverity,
};
