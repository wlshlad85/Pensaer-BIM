/**
 * MCP Debug Panel Component
 *
 * Displays MCP tool call logs with filtering, timing, and export capabilities.
 * Toggleable with F4 keyboard shortcut.
 * Dev mode only by default.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import clsx from "clsx";
import {
  getMCPLogger,
  JsonLogTarget,
  LogLevel,
  type ToolCallLogEntry,
} from "../../services/mcp";

interface Props {
  /** Whether the panel is visible */
  visible?: boolean;
  /** Callback when visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
  /** Position on screen */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Maximum entries to display */
  maxDisplayEntries?: number;
}

// Shared log target for persistence
let sharedLogTarget: JsonLogTarget | null = null;

function getSharedLogTarget(): JsonLogTarget {
  if (!sharedLogTarget) {
    sharedLogTarget = new JsonLogTarget({
      maxEntries: 500,
      useLocalStorage: true,
      storageKey: "pensaer_mcp_debug_logs",
    });
    getMCPLogger().addTarget(sharedLogTarget);
  }
  return sharedLogTarget;
}

/**
 * Format duration with color coding
 */
function formatDuration(ms?: number): { text: string; color: string } {
  if (ms === undefined) return { text: "-", color: "text-gray-500" };
  if (ms < 100) return { text: `${ms}ms`, color: "text-green-400" };
  if (ms < 500) return { text: `${ms}ms`, color: "text-yellow-400" };
  return { text: `${ms}ms`, color: "text-red-400" };
}

/**
 * Format timestamp to time only
 */
function formatTime(isoString: string): string {
  return isoString.split("T")[1]?.slice(0, 12) ?? isoString;
}

/**
 * Get event badge styling
 */
function getEventBadge(event: string): { bg: string; text: string } {
  switch (event) {
    case "request":
      return { bg: "bg-blue-500/20", text: "text-blue-400" };
    case "response":
      return { bg: "bg-green-500/20", text: "text-green-400" };
    case "error":
      return { bg: "bg-red-500/20", text: "text-red-400" };
    default:
      return { bg: "bg-gray-500/20", text: "text-gray-400" };
  }
}

export function MCPDebugPanel({
  visible: controlledVisible,
  onVisibilityChange,
  position = "bottom-right",
  maxDisplayEntries = 50,
}: Props): JSX.Element | null {
  const [internalVisible, setInternalVisible] = useState(false);
  const [entries, setEntries] = useState<ToolCallLogEntry[]>([]);
  const [filterTool, setFilterTool] = useState<string>("");
  const [filterEvent, setFilterEvent] = useState<
    "all" | "request" | "response" | "error"
  >("all");
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ToolCallLogEntry | null>(
    null
  );
  const logTargetRef = useRef<JsonLogTarget | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Use controlled visibility if provided, otherwise internal state
  const isVisible =
    controlledVisible !== undefined ? controlledVisible : internalVisible;

  // Initialize log target
  useEffect(() => {
    logTargetRef.current = getSharedLogTarget();
  }, []);

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    if (controlledVisible !== undefined && onVisibilityChange) {
      onVisibilityChange(!controlledVisible);
    } else {
      setInternalVisible((prev) => !prev);
    }
  }, [controlledVisible, onVisibilityChange]);

  // Handle F4 keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F4") {
        event.preventDefault();
        toggleVisibility();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleVisibility]);

  // Refresh entries periodically when visible
  useEffect(() => {
    if (!isVisible || !logTargetRef.current) return;

    const refreshEntries = () => {
      const target = logTargetRef.current;
      if (!target) return;

      const filtered = target.getFilteredEntries({
        tool: filterTool || undefined,
        event: filterEvent === "all" ? undefined : filterEvent,
      });

      // Show most recent entries (reversed for newest first)
      setEntries(filtered.slice(-maxDisplayEntries).reverse());
    };

    // Initial fetch
    refreshEntries();

    // Refresh every 500ms
    const interval = setInterval(refreshEntries, 500);
    return () => clearInterval(interval);
  }, [isVisible, filterTool, filterEvent, maxDisplayEntries]);

  // Get unique tool names for filter dropdown
  const uniqueTools = Array.from(
    new Set(logTargetRef.current?.getEntries().map((e) => e.tool) ?? [])
  ).sort();

  // Export logs as JSON
  const handleExport = useCallback(() => {
    const target = logTargetRef.current;
    if (!target) return;

    const json = target.export();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mcp-logs-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Clear logs
  const handleClear = useCallback(() => {
    logTargetRef.current?.clear();
    setEntries([]);
    setSelectedEntry(null);
  }, []);

  if (!isVisible) return null;

  // Position classes
  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  return (
    <div
      className={clsx(
        "fixed z-50 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 flex flex-col",
        positionClasses[position],
        isExpanded ? "w-[600px] h-[500px]" : "w-[400px] h-[300px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-code text-purple-400 text-sm" />
          <span className="text-sm font-semibold text-gray-300">
            MCP Debug
          </span>
          <span className="text-xs text-gray-500">({entries.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <i
              className={clsx(
                "fa-solid text-xs",
                isExpanded ? "fa-compress" : "fa-expand"
              )}
            />
          </button>
          <button
            onClick={toggleVisibility}
            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
            title="Close (F4)"
          >
            <i className="fa-solid fa-times text-xs" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/50 bg-gray-800/30">
        {/* Tool filter */}
        <select
          value={filterTool}
          onChange={(e) => setFilterTool(e.target.value)}
          className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">All Tools</option>
          {uniqueTools.map((tool) => (
            <option key={tool} value={tool}>
              {tool}
            </option>
          ))}
        </select>

        {/* Event filter */}
        <select
          value={filterEvent}
          onChange={(e) =>
            setFilterEvent(
              e.target.value as "all" | "request" | "response" | "error"
            )
          }
          className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Events</option>
          <option value="request">Requests</option>
          <option value="response">Responses</option>
          <option value="error">Errors</option>
        </select>

        <div className="flex-1" />

        {/* Actions */}
        <button
          onClick={handleExport}
          className="text-xs px-2 py-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
          title="Export logs as JSON"
        >
          <i className="fa-solid fa-download mr-1" />
          Export
        </button>
        <button
          onClick={handleClear}
          className="text-xs px-2 py-1 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded transition-colors"
          title="Clear all logs"
        >
          <i className="fa-solid fa-trash mr-1" />
          Clear
        </button>
      </div>

      {/* Log Entries */}
      <div className="flex flex-1 min-h-0">
        {/* Entry List */}
        <div
          ref={listRef}
          className={clsx(
            "flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent",
            selectedEntry && isExpanded ? "border-r border-gray-700" : ""
          )}
        >
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              <div className="text-center">
                <i className="fa-solid fa-inbox text-2xl mb-2 opacity-50" />
                <p>No log entries</p>
                <p className="text-xs text-gray-600 mt-1">
                  MCP tool calls will appear here
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {entries.map((entry) => {
                const eventBadge = getEventBadge(entry.event);
                const duration = formatDuration(entry.durationMs);
                const isSelected = selectedEntry?.requestId === entry.requestId;

                return (
                  <button
                    key={`${entry.requestId}-${entry.event}`}
                    onClick={() =>
                      setSelectedEntry(isSelected ? null : entry)
                    }
                    className={clsx(
                      "w-full px-3 py-2 text-left hover:bg-gray-800/50 transition-colors",
                      isSelected && "bg-purple-500/10"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {/* Event badge */}
                      <span
                        className={clsx(
                          "text-[10px] px-1.5 py-0.5 rounded uppercase font-medium",
                          eventBadge.bg,
                          eventBadge.text
                        )}
                      >
                        {entry.event.slice(0, 3)}
                      </span>

                      {/* Tool name */}
                      <span className="text-xs font-mono text-gray-300 truncate flex-1">
                        {entry.tool}
                      </span>

                      {/* Duration */}
                      <span
                        className={clsx(
                          "text-[10px] font-mono",
                          duration.color
                        )}
                      >
                        {duration.text}
                      </span>

                      {/* Time */}
                      <span className="text-[10px] text-gray-600 font-mono">
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>

                    {/* Server info */}
                    {entry.server && (
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {entry.server}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedEntry && isExpanded && (
          <div className="w-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent p-3 bg-gray-800/30">
            <h4 className="text-xs font-semibold text-gray-400 mb-2">
              Details
            </h4>

            <div className="space-y-3 text-xs">
              {/* Request ID */}
              <div>
                <div className="text-gray-500 text-[10px]">Request ID</div>
                <div className="text-gray-300 font-mono break-all">
                  {selectedEntry.requestId}
                </div>
              </div>

              {/* Server */}
              {selectedEntry.server && (
                <div>
                  <div className="text-gray-500 text-[10px]">Server</div>
                  <div className="text-gray-300">{selectedEntry.server}</div>
                </div>
              )}

              {/* Params */}
              {selectedEntry.params && (
                <div>
                  <div className="text-gray-500 text-[10px]">Parameters</div>
                  <pre className="text-gray-300 bg-gray-900/50 rounded p-2 overflow-x-auto text-[10px] leading-relaxed">
                    {JSON.stringify(selectedEntry.params, null, 2)}
                  </pre>
                </div>
              )}

              {/* Result */}
              {selectedEntry.result && (
                <div>
                  <div className="text-gray-500 text-[10px]">Result</div>
                  <pre className="text-gray-300 bg-gray-900/50 rounded p-2 overflow-x-auto text-[10px] leading-relaxed max-h-32">
                    {JSON.stringify(selectedEntry.result, null, 2)}
                  </pre>
                </div>
              )}

              {/* Error */}
              {selectedEntry.error && (
                <div>
                  <div className="text-red-400 text-[10px]">Error</div>
                  <pre className="text-red-300 bg-red-900/20 rounded p-2 overflow-x-auto text-[10px] leading-relaxed">
                    {JSON.stringify(selectedEntry.error, null, 2)}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {selectedEntry.metadata && (
                <div>
                  <div className="text-gray-500 text-[10px]">Metadata</div>
                  <pre className="text-gray-300 bg-gray-900/50 rounded p-2 overflow-x-auto text-[10px] leading-relaxed">
                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-gray-700 text-[10px] text-gray-600 flex items-center justify-between">
        <span>Press F4 to toggle</span>
        <span>
          Log Level:{" "}
          {LogLevel[getMCPLogger().getLevel()]}
        </span>
      </div>
    </div>
  );
}

export default MCPDebugPanel;
