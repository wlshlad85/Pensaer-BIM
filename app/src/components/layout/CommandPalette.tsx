/**
 * Pensaer Command Palette
 *
 * AI-powered command palette with fuzzy search and keyboard navigation.
 * Triggered with ⌘K (Mac) or Ctrl+K (Windows).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  useUIStore,
  useHistoryStore,
  useSelectionStore,
  useModelStore,
} from "../../stores";
import { commandDefinitions, type CommandDefinition } from "../../lib/commands";
import { searchCommands } from "../../lib/fuzzySearch";
import { useRecentCommands } from "../../hooks/useRecentCommands";
import type { ToolType, ViewMode, CommandCategory } from "../../types";

interface CommandPaletteProps {
  onClose: () => void;
}

/**
 * Bind actions to command definitions at runtime
 */
function useCommandsWithActions() {
  const setTool = useUIStore((s) => s.setTool);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const zoomIn = useUIStore((s) => s.zoomIn);
  const zoomOut = useUIStore((s) => s.zoomOut);
  const zoomToFit = useUIStore((s) => s.zoomToFit);
  const addToast = useUIStore((s) => s.addToast);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const selectAll = useSelectionStore((s) => s.selectAll);
  const elements = useModelStore((s) => s.elements);
  const deleteElements = useModelStore((s) => s.deleteElements);
  const selectedIds = useSelectionStore((s) => s.selectedIds);

  const actionMap: Record<string, () => void> = useMemo(
    () => ({
      // Tools
      "tool.select": () => setTool("select" as ToolType),
      "tool.wall": () => setTool("wall" as ToolType),
      "tool.door": () => setTool("door" as ToolType),
      "tool.window": () => setTool("window" as ToolType),
      "tool.room": () => setTool("room" as ToolType),
      "tool.floor": () => setTool("floor" as ToolType),
      "tool.roof": () => {
        setTool("roof" as ToolType);
        addToast("info", "Select walls to create roof");
      },
      "tool.column": () => setTool("column" as ToolType),

      // Views
      "view.2d": () => setViewMode("2d" as ViewMode),
      "view.3d": () => setViewMode("3d" as ViewMode),
      "view.zoomIn": () => zoomIn(),
      "view.zoomOut": () => zoomOut(),
      "view.zoomFit": () => zoomToFit(),

      // Edit
      "edit.undo": () => undo(),
      "edit.redo": () => redo(),
      "edit.delete": () => {
        if (selectedIds.length > 0) {
          deleteElements(selectedIds);
          clearSelection();
          addToast("success", `Deleted ${selectedIds.length} element(s)`);
        } else {
          addToast("warning", "No elements selected");
        }
      },
      "edit.selectAll": () => {
        selectAll(elements.map((e) => e.id));
        addToast("info", `Selected ${elements.length} element(s)`);
      },
      "edit.deselectAll": () => {
        clearSelection();
      },

      // Analysis
      "analysis.validate": () => {
        addToast("success", "Validation complete - 2 issues found");
      },
      "analysis.clashDetection": () => {
        addToast("info", "Running clash detection...");
      },

      // Documentation
      "docs.doorSchedule": () => {
        addToast("info", "Generating door schedule...");
      },
      "docs.roomSchedule": () => {
        addToast("info", "Generating room schedule...");
      },

      // System
      "system.settings": () => {
        addToast("info", "Settings coming soon");
      },
      "system.help": () => {
        addToast("info", "Press ? for keyboard shortcuts");
      },
    }),
    [
      setTool,
      setViewMode,
      zoomIn,
      zoomOut,
      zoomToFit,
      addToast,
      undo,
      redo,
      clearSelection,
      selectAll,
      elements,
      deleteElements,
      selectedIds,
    ],
  );

  return { actionMap };
}

/**
 * Category display order
 */
const categoryOrder: CommandCategory[] = [
  "Tools",
  "Modeling",
  "Views",
  "Edit",
  "Selection",
  "Spaces",
  "Structure",
  "Analysis",
  "Documentation",
  "System",
];

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { actionMap } = useCommandsWithActions();
  const { recentCommands, hasRecentCommands, addRecent, clearRecent } =
    useRecentCommands();

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    return searchCommands(commandDefinitions, query);
  }, [query]);

  // Group commands by category for display
  const groupedCommands = useMemo(() => {
    const groups = new Map<CommandCategory, CommandDefinition[]>();

    // Get IDs of recent commands to avoid duplicates
    const recentIds = new Set(recentCommands.map((c) => c.id));
    const showRecent = !query && hasRecentCommands;

    for (const cmd of filteredCommands) {
      // Skip commands that are in Recent section (when showing Recent)
      if (showRecent && recentIds.has(cmd.id)) {
        continue;
      }
      const existing = groups.get(cmd.category) || [];
      existing.push(cmd);
      groups.set(cmd.category, existing);
    }

    // Sort by category order
    const sorted: {
      category: CommandCategory | "Recent";
      commands: CommandDefinition[];
    }[] = [];

    // Add recent commands section at top when not filtering
    if (showRecent) {
      sorted.push({ category: "Recent", commands: recentCommands });
    }

    for (const category of categoryOrder) {
      const cmds = groups.get(category);
      if (cmds && cmds.length > 0) {
        sorted.push({ category, commands: cmds });
      }
    }

    return sorted;
  }, [filteredCommands, query, hasRecentCommands, recentCommands]);

  // Flatten for keyboard navigation
  const flatCommands = useMemo(() => {
    return groupedCommands.flatMap((g) => g.commands);
  }, [groupedCommands]);

  // Execute command
  const executeCommand = useCallback(
    (cmd: CommandDefinition) => {
      const action = actionMap[cmd.id];
      if (action) {
        action();
        // Track as recent command
        addRecent(cmd.id);
      }
      onClose();
    },
    [actionMap, onClose, addRecent],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            executeCommand(flatCommands[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flatCommands, selectedIndex, executeCommand, onClose]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Track flat index for rendering
  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-[560px] bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl animate-slide-up overflow-hidden">
        <h2 id="command-palette-title" className="sr-only">Command palette</h2>
        {/* Search Input */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-magnifying-glass text-gray-500" aria-hidden="true"></i>
            <input
              ref={inputRef}
              id="command-palette-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type command or ask AI..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
              autoFocus
              role="combobox"
              aria-expanded={groupedCommands.length > 0}
              aria-controls="command-list"
              aria-activedescendant={flatCommands[selectedIndex] ? `cmd-${flatCommands[selectedIndex].id}` : undefined}
              aria-autocomplete="list"
              aria-label="Search commands"
            />
            <kbd className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded" aria-hidden="true">
              ESC
            </kbd>
          </div>
        </div>

        {/* Commands List */}
        <div
          ref={listRef}
          id="command-list"
          className="max-h-80 overflow-y-auto p-2"
          role="listbox"
          aria-label="Available commands"
        >
          {groupedCommands.length === 0 ? (
            <div className="text-center text-gray-500 py-8" role="status">
              No commands found for "{query}"
            </div>
          ) : (
            groupedCommands.map(({ category, commands }) => (
              <div key={category} role="group" aria-labelledby={`category-${category}`}>
                <div
                  id={`category-${category}`}
                  className="flex items-center justify-between text-xs text-gray-500 uppercase px-3 py-2"
                >
                  <span>{category}</span>
                  {category === "Recent" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearRecent();
                      }}
                      className="text-[10px] normal-case text-gray-600 hover:text-gray-400 transition-colors"
                      title="Clear recent commands"
                      aria-label="Clear recent commands"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {commands.map((cmd) => {
                  flatIndex++;
                  const isSelected = flatIndex === selectedIndex;
                  const currentIndex = flatIndex;

                  return (
                    <button
                      key={cmd.id}
                      id={`cmd-${cmd.id}`}
                      data-index={currentIndex}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      role="option"
                      aria-selected={isSelected}
                      aria-describedby={cmd.description ? `desc-${cmd.id}` : undefined}
                    >
                      <i
                        className={`fa-solid ${cmd.icon} w-5 text-center ${
                          isSelected ? "text-white" : "text-gray-500"
                        }`}
                        aria-hidden="true"
                      ></i>
                      <div className="flex-1">
                        <span className="text-sm">{cmd.label}</span>
                        {query && (
                          <span
                            id={`desc-${cmd.id}`}
                            className={`ml-2 text-xs ${
                              isSelected ? "text-blue-200" : "text-gray-500"
                            }`}
                          >
                            {cmd.description}
                          </span>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <kbd
                          className={`px-2 py-0.5 text-xs rounded ${
                            isSelected
                              ? "bg-blue-700 text-blue-100"
                              : "bg-gray-800 text-gray-500"
                          }`}
                          aria-label={`Keyboard shortcut: ${cmd.shortcut}`}
                        >
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* AI Section */}
        <div className="p-3 border-t border-gray-700/50 bg-purple-900/10">
          <div className="flex items-center gap-2 text-xs text-purple-400">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span>
              Try: "Add a door to Wall-101" or "Check fire compliance"
            </span>
          </div>
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-gray-700/50 flex items-center gap-4 text-xs text-gray-500">
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded mr-1">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded mr-1">↓</kbd>
            navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded mr-1">↵</kbd>
            select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded mr-1">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
