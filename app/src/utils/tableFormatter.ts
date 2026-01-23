/**
 * Table Formatter Utility
 *
 * Formats data as ASCII tables for terminal display.
 * Supports dynamic column widths, truncation, and ANSI colors.
 */

import type { Terminal } from "@xterm/xterm";

// ANSI color codes
export const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
};

// Table configuration options
export interface TableOptions {
  /** Maximum width for each column (default: 40) */
  maxColWidth?: number;
  /** Minimum width for each column (default: 5) */
  minColWidth?: number;
  /** Maximum total table width (default: 100) */
  maxTableWidth?: number;
  /** Show row numbers (default: false) */
  showRowNumbers?: boolean;
  /** Header text color (default: cyan) */
  headerColor?: string;
  /** Border style: 'simple' | 'rounded' | 'none' (default: 'simple') */
  borderStyle?: "simple" | "rounded" | "none";
  /** Highlight alternate rows (default: false) */
  alternateRows?: boolean;
  /** Custom column alignments: 'left' | 'right' | 'center' */
  alignments?: Record<string, "left" | "right" | "center">;
}

// Table column definition
export interface TableColumn {
  key: string;
  header: string;
  width?: number;
  align?: "left" | "right" | "center";
  format?: (value: unknown) => string;
}

// Border characters
const BORDERS = {
  simple: {
    topLeft: "+",
    topRight: "+",
    bottomLeft: "+",
    bottomRight: "+",
    horizontal: "-",
    vertical: "|",
    cross: "+",
    topCross: "+",
    bottomCross: "+",
    leftCross: "+",
    rightCross: "+",
  },
  rounded: {
    topLeft: "\u256d",
    topRight: "\u256e",
    bottomLeft: "\u2570",
    bottomRight: "\u256f",
    horizontal: "\u2500",
    vertical: "\u2502",
    cross: "\u253c",
    topCross: "\u252c",
    bottomCross: "\u2534",
    leftCross: "\u251c",
    rightCross: "\u2524",
  },
  none: {
    topLeft: "",
    topRight: "",
    bottomLeft: "",
    bottomRight: "",
    horizontal: "",
    vertical: " ",
    cross: "",
    topCross: "",
    bottomCross: "",
    leftCross: "",
    rightCross: "",
  },
};

/**
 * Calculate visible string length (excluding ANSI codes)
 */
export function visibleLength(str: string): number {
  // Remove ANSI escape codes
  return str.replace(/\x1b\[[0-9;]*m/g, "").length;
}

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str: string, maxLen: number): string {
  if (visibleLength(str) <= maxLen) return str;
  const truncated = str.slice(0, maxLen - 3);
  return truncated + "...";
}

/**
 * Pad string to target length
 */
export function pad(
  str: string,
  length: number,
  align: "left" | "right" | "center" = "left"
): string {
  const visible = visibleLength(str);
  if (visible >= length) return str;
  const padding = length - visible;

  switch (align) {
    case "right":
      return " ".repeat(padding) + str;
    case "center": {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return " ".repeat(leftPad) + str + " ".repeat(rightPad);
    }
    default:
      return str + " ".repeat(padding);
  }
}

/**
 * Format a value for display
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    // Format numbers nicely
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(2);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.length <= 3) return value.map(formatValue).join(", ");
    return `[${value.length} items]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as object);
    if (keys.length === 0) return "{}";
    return `{${keys.length} props}`;
  }
  return String(value);
}

/**
 * Calculate optimal column widths based on content
 */
export function calculateColumnWidths(
  headers: string[],
  rows: string[][],
  options: TableOptions = {}
): number[] {
  const { maxColWidth = 40, minColWidth = 5, maxTableWidth = 100 } = options;
  const numCols = headers.length;

  // Start with header widths
  const widths = headers.map((h) => Math.max(minColWidth, visibleLength(h)));

  // Check each row for wider content
  for (const row of rows) {
    for (let i = 0; i < numCols && i < row.length; i++) {
      widths[i] = Math.max(widths[i], Math.min(maxColWidth, visibleLength(row[i])));
    }
  }

  // Calculate total width
  let totalWidth = widths.reduce((sum, w) => sum + w + 3, 1); // +3 for " | " separators

  // Scale down if too wide
  if (totalWidth > maxTableWidth) {
    const scale = maxTableWidth / totalWidth;
    for (let i = 0; i < widths.length; i++) {
      widths[i] = Math.max(minColWidth, Math.floor(widths[i] * scale));
    }
  }

  return widths;
}

/**
 * Format data as an ASCII table
 */
export function formatTable(
  data: Record<string, unknown>[],
  columns?: TableColumn[],
  options: TableOptions = {}
): string[] {
  if (data.length === 0) {
    return [`${ANSI.gray}(empty table)${ANSI.reset}`];
  }

  const {
    headerColor = ANSI.cyan,
    borderStyle = "simple",
    showRowNumbers = false,
    alternateRows = false,
    alignments = {},
  } = options;

  const border = BORDERS[borderStyle];

  // Auto-detect columns if not provided
  if (!columns) {
    const allKeys = new Set<string>();
    data.forEach((row) => Object.keys(row).forEach((k) => allKeys.add(k)));
    columns = Array.from(allKeys).map((key) => ({
      key,
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
      align: alignments[key] || "left",
    }));
  }

  // Add row number column if requested
  if (showRowNumbers) {
    columns = [
      { key: "__row__", header: "#", align: "right" },
      ...columns,
    ];
  }

  // Convert data to string rows
  const headers = columns.map((col) => col.header);
  const rows = data.map((row, idx) =>
    columns!.map((col) => {
      if (col.key === "__row__") return String(idx + 1);
      const value = row[col.key];
      return col.format ? col.format(value) : formatValue(value);
    })
  );

  // Calculate widths
  const widths = calculateColumnWidths(headers, rows, options);

  // Truncate and pad content
  const paddedHeaders = headers.map((h, i) =>
    pad(truncate(h, widths[i]), widths[i], columns![i].align)
  );
  const paddedRows = rows.map((row) =>
    row.map((cell, i) =>
      pad(truncate(cell, widths[i]), widths[i], columns![i].align)
    )
  );

  // Build table lines
  const lines: string[] = [];

  // Top border
  if (borderStyle !== "none") {
    lines.push(
      border.topLeft +
        widths.map((w) => border.horizontal.repeat(w + 2)).join(border.topCross) +
        border.topRight
    );
  }

  // Header row
  lines.push(
    border.vertical +
      paddedHeaders
        .map((h) => ` ${headerColor}${ANSI.bold}${h}${ANSI.reset} `)
        .join(border.vertical) +
      border.vertical
  );

  // Header separator
  if (borderStyle !== "none") {
    lines.push(
      border.leftCross +
        widths.map((w) => border.horizontal.repeat(w + 2)).join(border.cross) +
        border.rightCross
    );
  }

  // Data rows
  paddedRows.forEach((row, idx) => {
    const rowColor = alternateRows && idx % 2 === 1 ? ANSI.dim : "";
    const resetColor = alternateRows && idx % 2 === 1 ? ANSI.reset : "";
    lines.push(
      border.vertical +
        row.map((cell) => ` ${rowColor}${cell}${resetColor} `).join(border.vertical) +
        border.vertical
    );
  });

  // Bottom border
  if (borderStyle !== "none") {
    lines.push(
      border.bottomLeft +
        widths.map((w) => border.horizontal.repeat(w + 2)).join(border.bottomCross) +
        border.bottomRight
    );
  }

  return lines;
}

/**
 * Format data as a simple list
 */
export function formatList(
  items: unknown[],
  options: { prefix?: string; numbered?: boolean; maxItems?: number } = {}
): string[] {
  const { prefix = "  ", numbered = false, maxItems = 20 } = options;
  const lines: string[] = [];

  const displayItems = items.slice(0, maxItems);
  displayItems.forEach((item, idx) => {
    const bullet = numbered ? `${idx + 1}.` : "-";
    lines.push(`${prefix}${ANSI.cyan}${bullet}${ANSI.reset} ${formatValue(item)}`);
  });

  if (items.length > maxItems) {
    lines.push(
      `${prefix}${ANSI.gray}... and ${items.length - maxItems} more${ANSI.reset}`
    );
  }

  return lines;
}

/**
 * Format JSON with syntax highlighting
 */
export function formatJson(
  data: unknown,
  options: { indent?: number; maxDepth?: number; currentDepth?: number } = {}
): string[] {
  const { indent = 2, maxDepth = 4, currentDepth = 0 } = options;
  const prefix = " ".repeat(currentDepth * indent);
  const lines: string[] = [];

  if (currentDepth >= maxDepth) {
    if (typeof data === "object" && data !== null) {
      const type = Array.isArray(data) ? `[${data.length} items]` : `{${Object.keys(data).length} props}`;
      lines.push(`${prefix}${ANSI.gray}${type}${ANSI.reset}`);
      return lines;
    }
  }

  if (data === null) {
    lines.push(`${prefix}${ANSI.magenta}null${ANSI.reset}`);
  } else if (typeof data === "boolean") {
    lines.push(`${prefix}${ANSI.yellow}${data}${ANSI.reset}`);
  } else if (typeof data === "number") {
    lines.push(`${prefix}${ANSI.green}${data}${ANSI.reset}`);
  } else if (typeof data === "string") {
    lines.push(`${prefix}${ANSI.cyan}"${data}"${ANSI.reset}`);
  } else if (Array.isArray(data)) {
    if (data.length === 0) {
      lines.push(`${prefix}${ANSI.gray}[]${ANSI.reset}`);
    } else {
      lines.push(`${prefix}[`);
      data.forEach((item, idx) => {
        const itemLines = formatJson(item, { indent, maxDepth, currentDepth: currentDepth + 1 });
        itemLines.forEach((line, lineIdx) => {
          if (lineIdx === 0) {
            const comma = idx < data.length - 1 ? "," : "";
            lines.push(line + comma);
          } else {
            lines.push(line);
          }
        });
      });
      lines.push(`${prefix}]`);
    }
  } else if (typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      lines.push(`${prefix}${ANSI.gray}{}${ANSI.reset}`);
    } else {
      lines.push(`${prefix}{`);
      entries.forEach(([key, value], idx) => {
        const valueLines = formatJson(value, { indent, maxDepth, currentDepth: currentDepth + 1 });
        const comma = idx < entries.length - 1 ? "," : "";
        const keyPrefix = " ".repeat((currentDepth + 1) * indent);

        if (valueLines.length === 1 && !valueLines[0].includes("\n")) {
          const valueStr = valueLines[0].trim();
          lines.push(`${keyPrefix}${ANSI.blue}"${key}"${ANSI.reset}: ${valueStr}${comma}`);
        } else {
          lines.push(`${keyPrefix}${ANSI.blue}"${key}"${ANSI.reset}:`);
          valueLines.forEach((line) => lines.push(line));
          if (comma) {
            const lastLine = lines[lines.length - 1];
            lines[lines.length - 1] = lastLine + comma;
          }
        }
      });
      lines.push(`${prefix}}`);
    }
  }

  return lines;
}

/**
 * Write table lines to a terminal
 */
export function writeTableToTerminal(terminal: Terminal, lines: string[]): void {
  lines.forEach((line) => terminal.writeln(line));
}

/**
 * Write formatted list to terminal
 */
export function writeListToTerminal(terminal: Terminal, lines: string[]): void {
  lines.forEach((line) => terminal.writeln(line));
}

/**
 * Format and truncate a long result with "show more" hint
 */
export function formatTruncated(
  data: unknown[],
  maxItems: number,
  formatFn: (item: unknown) => string
): { lines: string[]; truncated: number } {
  const displayed = data.slice(0, maxItems);
  const truncated = Math.max(0, data.length - maxItems);
  const lines = displayed.map(formatFn);

  if (truncated > 0) {
    lines.push(`${ANSI.gray}... ${truncated} more items (use --all to show all)${ANSI.reset}`);
  }

  return { lines, truncated };
}

export default {
  formatTable,
  formatList,
  formatJson,
  formatValue,
  truncate,
  pad,
  visibleLength,
  writeTableToTerminal,
  writeListToTerminal,
  formatTruncated,
  ANSI,
};
