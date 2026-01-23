/**
 * Pensaer BIM Platform - Toolbar Component
 *
 * Vertical toolbar on the left side matching prototype exactly.
 */

import { useUIStore, useHistoryStore } from "../../stores";
import type { ToolType } from "../../types";
import { SnapSettingsDropdown } from "./SnapSettingsDropdown";

const TOOLS: { id: ToolType; icon: string; label: string }[] = [
  { id: "select", icon: "fa-arrow-pointer", label: "Select (V)" },
  { id: "wall", icon: "fa-square", label: "Wall (W)" },
  { id: "door", icon: "fa-door-open", label: "Door (D)" },
  { id: "window", icon: "fa-window-maximize", label: "Window (N)" },
  { id: "room", icon: "fa-vector-square", label: "Room (M)" },
  { id: "column", icon: "fa-grip-lines-vertical", label: "Column (C)" },
];

interface ToolbarProps {
  /** Compact mode for tablet layout - shows only icons */
  compact?: boolean;
}

export function Toolbar({ compact = false }: ToolbarProps) {
  const activeTool = useUIStore((s) => s.activeTool);
  const setTool = useUIStore((s) => s.setTool);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const snap = useUIStore((s) => s.snap);
  const toggleSnapEnabled = useUIStore((s) => s.toggleSnapEnabled);
  const toggleGridSnap = useUIStore((s) => s.toggleGridSnap);
  const toggleObjectSnap = useUIStore((s) => s.toggleObjectSnap);
  const toggleSnapSettings = useUIStore((s) => s.toggleSnapSettings);
  const addToast = useUIStore((s) => s.addToast);

  // History (undo/redo)
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const getUndoDescription = useHistoryStore((s) => s.getUndoDescription);
  const getRedoDescription = useHistoryStore((s) => s.getRedoDescription);

  const handleUndo = () => {
    if (canUndo()) {
      const desc = getUndoDescription();
      undo();
      addToast("info", desc ? `Undo: ${desc}` : "Undo");
    }
  };

  const handleRedo = () => {
    if (canRedo()) {
      const desc = getRedoDescription();
      redo();
      addToast("info", desc ? `Redo: ${desc}` : "Redo");
    }
  };

  return (
    <nav
      className="w-12 bg-gray-900/50 border-r border-gray-700/50 flex flex-col items-center py-2 gap-1"
      role="toolbar"
      aria-label="Drawing tools"
      aria-orientation="vertical"
      data-testid="toolbar"
    >
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors toolbar-button ${
            activeTool === tool.id
              ? "bg-blue-500/20 text-blue-400"
              : "text-gray-500 hover:text-white hover:bg-gray-800"
          }`}
          title={tool.label}
          aria-label={tool.label}
          aria-pressed={activeTool === tool.id}
          onClick={() => setTool(tool.id)}
        >
          <i className={`fa-solid ${tool.icon}`} aria-hidden="true"></i>
        </button>
      ))}

      {/* Separator */}
      <div className="w-8 h-px bg-gray-700/50 my-1" role="separator" aria-orientation="horizontal" />

      {/* Undo/Redo Buttons */}
      <button
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors toolbar-button ${
          canUndo()
            ? "text-gray-400 hover:text-white hover:bg-gray-800"
            : "text-gray-700 cursor-not-allowed"
        }`}
        title={`Undo${getUndoDescription() ? `: ${getUndoDescription()}` : ""} (Ctrl+Z)`}
        aria-label={`Undo${getUndoDescription() ? `: ${getUndoDescription()}` : ""}`}
        aria-keyshortcuts="Control+Z"
        onClick={handleUndo}
        disabled={!canUndo()}
      >
        <i className="fa-solid fa-rotate-left" aria-hidden="true"></i>
      </button>

      <button
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors toolbar-button ${
          canRedo()
            ? "text-gray-400 hover:text-white hover:bg-gray-800"
            : "text-gray-700 cursor-not-allowed"
        }`}
        title={`Redo${getRedoDescription() ? `: ${getRedoDescription()}` : ""} (Ctrl+Shift+Z)`}
        aria-label={`Redo${getRedoDescription() ? `: ${getRedoDescription()}` : ""}`}
        aria-keyshortcuts="Control+Shift+Z"
        onClick={handleRedo}
        disabled={!canRedo()}
      >
        <i className="fa-solid fa-rotate-right" aria-hidden="true"></i>
      </button>

      <div className="flex-1" />

      {/* Snap Controls */}
      <div className="relative" role="group" aria-label="Snap settings">
        {/* Grid Snap Toggle */}
        <button
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors toolbar-button ${
            snap.enabled && snap.grid
              ? "bg-green-500/20 text-green-400"
              : "text-gray-500 hover:text-white hover:bg-gray-800"
          }`}
          title={`Grid Snap ${snap.grid ? "ON" : "OFF"} (G)`}
          aria-label={`Grid Snap ${snap.grid ? "enabled" : "disabled"}`}
          aria-pressed={snap.enabled && snap.grid}
          aria-keyshortcuts="G"
          onClick={toggleGridSnap}
        >
          <i className="fa-solid fa-grip" aria-hidden="true"></i>
        </button>
      </div>

      {/* Object Snap Toggle */}
      <button
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors toolbar-button ${
          snap.enabled && (snap.endpoint || snap.midpoint)
            ? "bg-green-500/20 text-green-400"
            : "text-gray-500 hover:text-white hover:bg-gray-800"
        }`}
        title={`Object Snap ${snap.endpoint || snap.midpoint ? "ON" : "OFF"} (O)`}
        aria-label={`Object Snap ${snap.endpoint || snap.midpoint ? "enabled" : "disabled"}`}
        aria-pressed={snap.enabled && (snap.endpoint || snap.midpoint)}
        aria-keyshortcuts="O"
        onClick={toggleObjectSnap}
      >
        <i className="fa-solid fa-crosshairs" aria-hidden="true"></i>
      </button>

      {/* Snap Master Toggle */}
      <div className="relative">
        <button
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors toolbar-button ${
            snap.enabled
              ? "bg-blue-500/20 text-blue-400"
              : "text-gray-500 hover:text-white hover:bg-gray-800"
          }`}
          title={`Snap ${snap.enabled ? "ON" : "OFF"} (S)`}
          aria-label={`Snap ${snap.enabled ? "enabled" : "disabled"}`}
          aria-pressed={snap.enabled}
          aria-keyshortcuts="S"
          aria-haspopup="menu"
          onClick={toggleSnapEnabled}
          onContextMenu={(e) => {
            e.preventDefault();
            toggleSnapSettings();
          }}
        >
          <i className="fa-solid fa-magnet" aria-hidden="true"></i>
        </button>

        {/* Dropdown indicator */}
        <button
          className="absolute -right-0.5 -bottom-0.5 w-3 h-3 bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:text-white toolbar-button"
          title="Snap Settings"
          aria-label="Open snap settings menu"
          onClick={toggleSnapSettings}
        >
          <i className="fa-solid fa-caret-down text-[8px]" aria-hidden="true"></i>
        </button>

        <SnapSettingsDropdown />
      </div>

      {/* More tools */}
      <button
        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg toolbar-button"
        title="More tools (⌘K)"
        aria-label="Open command palette"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={openCommandPalette}
      >
        <i className="fa-solid fa-ellipsis" aria-hidden="true"></i>
      </button>
    </nav>
  );
}
