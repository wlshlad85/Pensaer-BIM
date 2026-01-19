/**
 * MCP Result Formatter
 *
 * Formats complex MCP results (schedules, lists, reports) for readable terminal display.
 * Supports table formatting, list formatting, JSON pretty-print, truncation, and pagination.
 */

import type { Terminal } from "@xterm/xterm";
import type { MCPToolResult } from "./types";
import {
  formatTable,
  formatList,
  formatJson,
  formatValue,
  ANSI,
  type TableColumn,
  type TableOptions,
} from "../../utils/tableFormatter";

// Result formatting options
export interface ResultFormatterOptions {
  /** Output format: 'auto' | 'table' | 'list' | 'json' | 'raw' */
  format?: "auto" | "table" | "list" | "json" | "raw";
  /** Maximum items to display (for pagination) */
  maxItems?: number;
  /** Page number for paginated results (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Show all items (override maxItems) */
  showAll?: boolean;
  /** Export to file instead of displaying */
  exportToFile?: string;
  /** Terminal width for formatting */
  terminalWidth?: number;
  /** Custom table columns */
  columns?: TableColumn[];
  /** Table options */
  tableOptions?: TableOptions;
}

// Pagination state for tracking paginated results
export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Result types that we know how to format
type ScheduleData = {
  items: Record<string, unknown>[];
  columns?: TableColumn[];
  title?: string;
};

type ListData = {
  elements?: Record<string, unknown>[];
  items?: unknown[];
  results?: unknown[];
};

type ReportData = {
  summary?: Record<string, unknown>;
  details?: Record<string, unknown>[];
  warnings?: string[];
  errors?: string[];
};

/**
 * Detect the best format for displaying data
 */
export function detectFormat(data: unknown): "table" | "list" | "json" | "simple" {
  if (!data || typeof data !== "object") return "simple";

  // Check for schedule/table-like data
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return "table";
  }

  // Check for named collection properties
  const obj = data as Record<string, unknown>;
  if (obj.elements || obj.items || obj.results) {
    const collection = obj.elements || obj.items || obj.results;
    if (Array.isArray(collection) && collection.length > 0) {
      if (typeof collection[0] === "object") return "table";
      return "list";
    }
  }

  // Check for schedule data
  if (obj.items && Array.isArray(obj.items)) {
    return "table";
  }

  // Default to JSON for complex objects
  if (Object.keys(obj).length > 0) {
    return "json";
  }

  return "simple";
}

/**
 * Get display columns for element/item data
 */
function getDefaultColumns(data: Record<string, unknown>[]): TableColumn[] {
  if (data.length === 0) return [];

  // Collect all unique keys
  const allKeys = new Set<string>();
  data.forEach((item) => Object.keys(item).forEach((k) => allKeys.add(k)));

  // Priority order for common BIM columns
  const priorityKeys = [
    "id",
    "type",
    "element_type",
    "name",
    "status",
    "area",
    "length",
    "height",
    "width",
    "material",
  ];

  // Build columns in priority order, then alphabetically
  const sortedKeys: string[] = [];
  for (const key of priorityKeys) {
    if (allKeys.has(key)) {
      sortedKeys.push(key);
      allKeys.delete(key);
    }
  }
  sortedKeys.push(...Array.from(allKeys).sort());

  // Limit columns for display
  const displayKeys = sortedKeys.slice(0, 8);

  return displayKeys.map((key) => ({
    key,
    header: key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    align: ["area", "length", "height", "width", "count", "total"].includes(key)
      ? "right" as const
      : "left" as const,
  }));
}

/**
 * Apply pagination to data array
 */
export function paginate<T>(
  data: T[],
  page: number,
  pageSize: number
): { items: T[]; pagination: PaginationState } {
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIdx = (currentPage - 1) * pageSize;
  const items = data.slice(startIdx, startIdx + pageSize);

  return {
    items,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      pageSize,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    },
  };
}

/**
 * Format MCP tool result for terminal display
 */
export function formatMcpResult(
  result: MCPToolResult,
  toolName: string,
  options: ResultFormatterOptions = {}
): string[] {
  const lines: string[] = [];
  const {
    format = "auto",
    maxItems = 20,
    page = 1,
    pageSize = 20,
    showAll = false,
  } = options;

  // Handle error results
  if (!result.success) {
    lines.push(`${ANSI.red}Error: ${result.error?.message || "Unknown error"}${ANSI.reset}`);
    if (result.error?.code) {
      lines.push(`${ANSI.gray}  Code: ${result.error.code}${ANSI.reset}`);
    }
    return lines;
  }

  // Success header
  lines.push(`${ANSI.green}\u2713 ${toolName} completed${ANSI.reset}`);

  // Handle no data
  if (!result.data) {
    return lines;
  }

  // Detect format if auto
  const effectiveFormat = format === "auto" ? detectFormat(result.data) : format;

  // Format based on type
  switch (effectiveFormat) {
    case "table": {
      const tableData = extractTableData(result.data);
      if (tableData.length > 0) {
        const columns = options.columns || getDefaultColumns(tableData);
        const effectiveMaxItems = showAll ? tableData.length : maxItems;
        const { items, pagination } = paginate(tableData, page, showAll ? tableData.length : pageSize);

        lines.push("");
        const tableLines = formatTable(items, columns, {
          ...options.tableOptions,
          maxTableWidth: options.terminalWidth || 100,
        });
        lines.push(...tableLines);

        // Show pagination info if there are more items
        if (!showAll && pagination.totalPages > 1) {
          lines.push("");
          lines.push(
            `${ANSI.gray}Page ${pagination.currentPage} of ${pagination.totalPages} ` +
            `(${pagination.totalItems} total items)${ANSI.reset}`
          );
          if (pagination.hasNext) {
            lines.push(`${ANSI.gray}Use --page ${pagination.currentPage + 1} to see more${ANSI.reset}`);
          }
        } else if (tableData.length > effectiveMaxItems) {
          lines.push(`${ANSI.gray}Showing ${effectiveMaxItems} of ${tableData.length} items${ANSI.reset}`);
        }
      } else {
        lines.push(`${ANSI.gray}  (no items)${ANSI.reset}`);
      }
      break;
    }

    case "list": {
      const listData = extractListData(result.data);
      if (listData.length > 0) {
        const effectiveMaxItems = showAll ? listData.length : maxItems;
        lines.push("");
        const listLines = formatList(listData.slice(0, effectiveMaxItems), {
          numbered: listData.length > 5,
        });
        lines.push(...listLines);

        if (listData.length > effectiveMaxItems) {
          lines.push(`${ANSI.gray}... ${listData.length - effectiveMaxItems} more items${ANSI.reset}`);
        }
      }
      break;
    }

    case "json": {
      lines.push("");
      const jsonLines = formatJson(result.data, { maxDepth: 4 });
      lines.push(...jsonLines);
      break;
    }

    case "raw":
    default: {
      lines.push("");
      lines.push(JSON.stringify(result.data, null, 2));
      break;
    }
  }

  // Add warnings if present
  if (result.warnings && result.warnings.length > 0) {
    lines.push("");
    lines.push(`${ANSI.yellow}Warnings:${ANSI.reset}`);
    result.warnings.forEach((w) => {
      lines.push(`  ${ANSI.yellow}\u26a0${ANSI.reset} ${w}`);
    });
  }

  return lines;
}

/**
 * Extract table-compatible data from result
 */
function extractTableData(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== "object") return [];

  // Direct array
  if (Array.isArray(data)) {
    return data.filter((item) => typeof item === "object" && item !== null) as Record<string, unknown>[];
  }

  const obj = data as Record<string, unknown>;

  // Named collections
  const collectionKeys = ["elements", "items", "results", "walls", "rooms", "doors", "windows", "clashes"];
  for (const key of collectionKeys) {
    if (obj[key] && Array.isArray(obj[key])) {
      const arr = obj[key] as unknown[];
      return arr.filter((item) => typeof item === "object" && item !== null) as Record<string, unknown>[];
    }
  }

  // Schedule data
  if (obj.items && Array.isArray(obj.items)) {
    return obj.items as Record<string, unknown>[];
  }

  return [];
}

/**
 * Extract list data from result
 */
function extractListData(data: unknown): unknown[] {
  if (!data || typeof data !== "object") return [];

  if (Array.isArray(data)) return data;

  const obj = data as Record<string, unknown>;
  const collectionKeys = ["elements", "items", "results", "ids", "names", "values"];
  for (const key of collectionKeys) {
    if (obj[key] && Array.isArray(obj[key])) {
      return obj[key] as unknown[];
    }
  }

  return [];
}

/**
 * Format a schedule (element schedule, door schedule, etc.)
 */
export function formatSchedule(
  data: ScheduleData,
  options: ResultFormatterOptions = {}
): string[] {
  const lines: string[] = [];

  if (data.title) {
    lines.push(`${ANSI.bold}${ANSI.cyan}${data.title}${ANSI.reset}`);
    lines.push("");
  }

  if (!data.items || data.items.length === 0) {
    lines.push(`${ANSI.gray}(empty schedule)${ANSI.reset}`);
    return lines;
  }

  const columns = data.columns || getDefaultColumns(data.items);
  const tableLines = formatTable(data.items, columns, {
    borderStyle: "rounded",
    showRowNumbers: true,
    alternateRows: true,
    ...options.tableOptions,
  });

  lines.push(...tableLines);
  lines.push("");
  lines.push(`${ANSI.gray}Total: ${data.items.length} items${ANSI.reset}`);

  return lines;
}

/**
 * Format a clash detection report
 */
export function formatClashReport(
  clashes: Record<string, unknown>[],
  options: ResultFormatterOptions = {}
): string[] {
  const lines: string[] = [];

  if (clashes.length === 0) {
    lines.push(`${ANSI.green}\u2713 No clashes detected${ANSI.reset}`);
    return lines;
  }

  lines.push(`${ANSI.red}\u2717 Found ${clashes.length} clash(es)${ANSI.reset}`);
  lines.push("");

  const columns: TableColumn[] = [
    { key: "element_a_id", header: "Element A", align: "left" },
    { key: "element_a_type", header: "Type A", align: "left" },
    { key: "element_b_id", header: "Element B", align: "left" },
    { key: "element_b_type", header: "Type B", align: "left" },
    { key: "clash_type", header: "Clash Type", align: "left" },
    { key: "distance", header: "Distance", align: "right" },
  ];

  const tableLines = formatTable(clashes, columns, {
    headerColor: ANSI.red,
    ...options.tableOptions,
  });
  lines.push(...tableLines);

  return lines;
}

/**
 * Format a validation report
 */
export function formatValidationReport(
  report: ReportData,
  _options: ResultFormatterOptions = {}
): string[] {
  const lines: string[] = [];

  // Summary section
  if (report.summary) {
    lines.push(`${ANSI.bold}${ANSI.cyan}Validation Summary${ANSI.reset}`);
    lines.push("");
    for (const [key, value] of Object.entries(report.summary)) {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      lines.push(`  ${ANSI.cyan}${label}:${ANSI.reset} ${formatValue(value)}`);
    }
    lines.push("");
  }

  // Errors
  if (report.errors && report.errors.length > 0) {
    lines.push(`${ANSI.red}Errors (${report.errors.length}):${ANSI.reset}`);
    report.errors.forEach((err) => {
      lines.push(`  ${ANSI.red}\u2717${ANSI.reset} ${err}`);
    });
    lines.push("");
  }

  // Warnings
  if (report.warnings && report.warnings.length > 0) {
    lines.push(`${ANSI.yellow}Warnings (${report.warnings.length}):${ANSI.reset}`);
    report.warnings.forEach((warn) => {
      lines.push(`  ${ANSI.yellow}\u26a0${ANSI.reset} ${warn}`);
    });
    lines.push("");
  }

  // Details table
  if (report.details && report.details.length > 0) {
    lines.push(`${ANSI.bold}Details:${ANSI.reset}`);
    const tableLines = formatTable(report.details, undefined, {
      borderStyle: "simple",
    });
    lines.push(...tableLines);
  }

  return lines;
}

/**
 * Write formatted result to terminal
 */
export function writeResultToTerminal(
  terminal: Terminal,
  result: MCPToolResult,
  toolName: string,
  options: ResultFormatterOptions = {}
): void {
  const lines = formatMcpResult(result, toolName, options);
  lines.forEach((line) => terminal.writeln(line));
}

/**
 * Export result to file (browser download)
 */
export function exportResultToFile(
  result: MCPToolResult,
  filename: string,
  format: "json" | "csv" = "json"
): void {
  let content: string;
  let mimeType: string;

  if (format === "csv") {
    content = resultToCsv(result);
    mimeType = "text/csv";
  } else {
    content = JSON.stringify(result.data, null, 2);
    mimeType = "application/json";
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert result data to CSV format
 */
function resultToCsv(result: MCPToolResult): string {
  const tableData = extractTableData(result.data);
  if (tableData.length === 0) return "";

  // Get all unique keys for headers
  const headers = new Set<string>();
  tableData.forEach((row) => Object.keys(row).forEach((k) => headers.add(k)));
  const headerArray = Array.from(headers);

  // Build CSV lines
  const lines: string[] = [];

  // Header row
  lines.push(headerArray.map((h) => `"${h}"`).join(","));

  // Data rows
  tableData.forEach((row) => {
    const values = headerArray.map((h) => {
      const value = row[h];
      if (value === null || value === undefined) return "";
      if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
      if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      return String(value);
    });
    lines.push(values.join(","));
  });

  return lines.join("\n");
}

export default {
  formatMcpResult,
  formatSchedule,
  formatClashReport,
  formatValidationReport,
  writeResultToTerminal,
  exportResultToFile,
  detectFormat,
  paginate,
};
