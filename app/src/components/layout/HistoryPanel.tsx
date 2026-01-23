/**
 * History Panel Component
 *
 * Displays undo/redo history in a collapsible panel with:
 * - List of actions with timestamps
 * - Current position indicator
 * - Click action to jump to that state
 * - Clear history option
 */

import { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import { useHistoryStore } from "../../stores";

interface HistoryPanelProps {
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
}

/**
 * Format timestamp to relative time (e.g., "2m ago", "just now")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/**
 * Get icon class for action description
 */
function getActionIcon(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes("wall")) return "fa-square";
  if (lower.includes("door")) return "fa-door-open";
  if (lower.includes("window")) return "fa-window-maximize";
  if (lower.includes("room")) return "fa-vector-square";
  if (lower.includes("floor")) return "fa-layer-group";
  if (lower.includes("roof")) return "fa-home";
  if (lower.includes("delete")) return "fa-trash";
  if (lower.includes("move")) return "fa-arrows-alt";
  if (lower.includes("initial")) return "fa-flag";
  return "fa-edit";
}

export function HistoryPanel({
  collapsed: controlledCollapsed,
  onCollapseChange,
}: HistoryPanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const listRef = useRef<HTMLDivElement>(null);

  const entries = useHistoryStore((s) => s.entries);
  const currentIndex = useHistoryStore((s) => s.currentIndex);
  const jumpToEntry = useHistoryStore((s) => s.jumpToEntry);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  const toggleCollapse = () => {
    const newState = !collapsed;
    setInternalCollapsed(newState);
    onCollapseChange?.(newState);
  };

  // Scroll to current entry when it changes
  useEffect(() => {
    if (listRef.current && !collapsed) {
      const activeItem = listRef.current.querySelector("[data-active='true']");
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [currentIndex, collapsed]);

  // Force re-render every 30 seconds to update relative timestamps
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={toggleCollapse}
        className="w-full h-8 flex items-center justify-between px-3 hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left text-blue-400 text-xs"></i>
          <span className="text-xs font-medium text-gray-300">History</span>
          <span className="text-xs text-gray-500">
            ({currentIndex + 1}/{entries.length})
          </span>
        </div>
        <i
          className={clsx(
            "fa-solid text-gray-500 text-xs transition-transform",
            collapsed ? "fa-chevron-right" : "fa-chevron-down"
          )}
        ></i>
      </button>

      {/* History List */}
      {!collapsed && (
        <div className="px-2 pb-2">
          {/* Column Headers */}
          <div className="flex items-center text-[10px] text-gray-500 px-2 py-1 border-b border-gray-700/30 mb-1">
            <span className="w-4"></span>
            <span className="flex-1 ml-2">Action</span>
            <span className="w-16 text-right">Time</span>
          </div>

          {/* History Entries */}
          <div
            ref={listRef}
            className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
          >
            {entries.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">
                No history yet
              </div>
            ) : (
              // Show entries in reverse order (newest first)
              [...entries].reverse().map((entry, reverseIndex) => {
                const index = entries.length - 1 - reverseIndex;
                const isCurrent = index === currentIndex;
                const isFuture = index > currentIndex;
                const icon = getActionIcon(entry.description);

                return (
                  <button
                    key={entry.id}
                    data-active={isCurrent}
                    onClick={() => jumpToEntry(index)}
                    className={clsx(
                      "w-full flex items-center px-2 py-1.5 rounded transition-colors text-left group",
                      isCurrent
                        ? "bg-blue-500/20 border border-blue-500/30"
                        : "hover:bg-gray-700/30",
                      isFuture && "opacity-50"
                    )}
                    title={`Jump to: ${entry.description}`}
                  >
                    {/* Current Indicator */}
                    <span className="w-4 flex justify-center">
                      {isCurrent && (
                        <i className="fa-solid fa-caret-right text-blue-400 text-xs"></i>
                      )}
                    </span>

                    {/* Action Icon & Description */}
                    <div className="flex-1 flex items-center gap-2 min-w-0 ml-1">
                      <i
                        className={clsx(
                          "fa-solid text-xs",
                          icon,
                          isCurrent ? "text-blue-400" : "text-gray-500"
                        )}
                      ></i>
                      <span
                        className={clsx(
                          "text-xs truncate",
                          isCurrent
                            ? "text-gray-200 font-medium"
                            : isFuture
                              ? "text-gray-500"
                              : "text-gray-400"
                        )}
                      >
                        {entry.description}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <span
                      className={clsx(
                        "w-16 text-right text-[10px] font-mono",
                        isCurrent ? "text-blue-300" : "text-gray-600"
                      )}
                    >
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-1 mt-2 pt-2 border-t border-gray-700/30">
            <button
              onClick={() => canUndo() && undo()}
              disabled={!canUndo()}
              className={clsx(
                "flex-1 text-[10px] py-1 transition-colors",
                canUndo()
                  ? "text-gray-500 hover:text-gray-300"
                  : "text-gray-700 cursor-not-allowed"
              )}
              title="Undo (Ctrl+Z)"
            >
              <i className="fa-solid fa-rotate-left mr-1"></i>
              Undo
            </button>
            <button
              onClick={() => canRedo() && redo()}
              disabled={!canRedo()}
              className={clsx(
                "flex-1 text-[10px] py-1 transition-colors",
                canRedo()
                  ? "text-gray-500 hover:text-gray-300"
                  : "text-gray-700 cursor-not-allowed"
              )}
              title="Redo (Ctrl+Shift+Z)"
            >
              <i className="fa-solid fa-rotate-right mr-1"></i>
              Redo
            </button>
            <button
              onClick={clearHistory}
              disabled={entries.length <= 1}
              className={clsx(
                "flex-1 text-[10px] py-1 transition-colors",
                entries.length > 1
                  ? "text-gray-500 hover:text-red-400"
                  : "text-gray-700 cursor-not-allowed"
              )}
              title="Clear history"
            >
              <i className="fa-solid fa-trash mr-1"></i>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPanel;
