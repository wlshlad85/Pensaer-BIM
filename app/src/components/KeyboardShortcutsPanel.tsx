/**
 * Pensaer BIM Platform - Keyboard Shortcuts Panel
 *
 * Displays all available keyboard shortcuts organized by category.
 * Opens with ? key or via Help menu.
 * Supports searching/filtering shortcuts.
 */

import { useState, useEffect, useMemo } from "react";

interface ShortcutItem {
  key: string;
  modifiers?: string[];
  description: string;
  category: string;
}

// Define all shortcuts organized by category
const SHORTCUTS: ShortcutItem[] = [
  // Tools
  { key: "V", description: "Select tool", category: "Tools" },
  { key: "W", description: "Wall tool", category: "Tools" },
  { key: "D", description: "Door tool", category: "Tools" },
  { key: "N", description: "Window tool", category: "Tools" },
  { key: "M", description: "Room tool", category: "Tools" },
  { key: "F", description: "Floor tool", category: "Tools" },
  { key: "R", description: "Roof tool", category: "Tools" },

  // View
  { key: "2", description: "2D view", category: "View" },
  { key: "3", description: "3D view", category: "View" },
  { key: "L", description: "Toggle layers panel", category: "View" },
  { key: "L", modifiers: ["Shift"], description: "Show all layers", category: "View" },
  { key: "=", modifiers: ["Ctrl"], description: "Zoom in", category: "View" },
  { key: "-", modifiers: ["Ctrl"], description: "Zoom out", category: "View" },
  { key: "0", modifiers: ["Ctrl"], description: "Zoom to fit", category: "View" },
  { key: "F3", description: "Toggle performance monitor", category: "View" },
  { key: "F8", description: "Toggle FPS counter (3D view)", category: "View" },

  // Selection
  { key: "A", modifiers: ["Ctrl"], description: "Select all (visible)", category: "Selection" },
  { key: "Escape", description: "Clear selection", category: "Selection" },
  { key: "Delete", description: "Delete selected", category: "Selection" },
  { key: "Backspace", description: "Delete selected", category: "Selection" },

  // Edit
  { key: "Z", modifiers: ["Ctrl"], description: "Undo", category: "Edit" },
  { key: "Z", modifiers: ["Ctrl", "Shift"], description: "Redo", category: "Edit" },
  { key: "Y", modifiers: ["Ctrl"], description: "Redo (alternate)", category: "Edit" },

  // Snap
  { key: "S", description: "Toggle snap", category: "Snap" },
  { key: "G", description: "Toggle grid snap", category: "Snap" },
  { key: "O", description: "Toggle object snap", category: "Snap" },

  // Commands
  { key: "K", modifiers: ["Ctrl"], description: "Command palette", category: "Commands" },
  { key: "?", description: "Show keyboard shortcuts", category: "Commands" },
];

// Group shortcuts by category
const CATEGORIES = ["Tools", "View", "Selection", "Edit", "Snap", "Commands"];

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsPanel({
  isOpen,
  onClose,
}: KeyboardShortcutsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter shortcuts based on search query
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return SHORTCUTS;

    const query = searchQuery.toLowerCase();
    return SHORTCUTS.filter(
      (s) =>
        s.description.toLowerCase().includes(query) ||
        s.key.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group filtered shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, ShortcutItem[]> = {};
    for (const cat of CATEGORIES) {
      const items = filteredShortcuts.filter((s) => s.category === cat);
      if (items.length > 0) {
        groups[cat] = items;
      }
    }
    return groups;
  }, [filteredShortcuts]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown, true);
    }
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose]);

  // Focus search input when panel opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      const input = document.getElementById("shortcut-search");
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:bg-white print:backdrop-blur-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col print:bg-white print:border-gray-300 print:max-h-none print:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 print:border-gray-300">
          <div>
            <h2 className="text-lg font-semibold text-white print:text-black">
              Keyboard Shortcuts
            </h2>
            <p className="text-sm text-gray-400 print:text-gray-600">
              Quick reference for all keyboard shortcuts
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors print:hidden"
            title="Close (Escape)"
          >
            <i className="fa-solid fa-times" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-700/50 print:hidden">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="shortcut-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <i className="fa-solid fa-times-circle" />
              </button>
            )}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 print:overflow-visible">
          {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No shortcuts found for "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
              {CATEGORIES.map((category) => {
                const items = groupedShortcuts[category];
                if (!items) return null;

                return (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3 print:text-blue-600">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {items.map((shortcut, idx) => (
                        <ShortcutRow key={`${category}-${idx}`} shortcut={shortcut} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500 print:hidden">
          <span>
            Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">?</kbd> to toggle this panel
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
            title="Print shortcuts"
          >
            <i className="fa-solid fa-print" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Single shortcut row component
 */
function ShortcutRow({ shortcut }: { shortcut: ShortcutItem }) {
  const isMac = navigator.platform.toLowerCase().includes("mac");

  // Format modifier keys for display
  const formatModifier = (mod: string): string => {
    if (mod === "Ctrl") return isMac ? "⌘" : "Ctrl";
    if (mod === "Shift") return isMac ? "⇧" : "Shift";
    if (mod === "Alt") return isMac ? "⌥" : "Alt";
    return mod;
  };

  // Build key combination display
  const keyDisplay = [
    ...(shortcut.modifiers?.map(formatModifier) || []),
    shortcut.key,
  ].join(isMac ? "" : "+");

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-300 print:text-gray-700">
        {shortcut.description}
      </span>
      <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs font-mono text-gray-300 print:bg-gray-100 print:border-gray-300 print:text-gray-700">
        {keyDisplay}
      </kbd>
    </div>
  );
}

export default KeyboardShortcutsPanel;
