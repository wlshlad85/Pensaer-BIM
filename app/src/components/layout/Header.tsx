/**
 * Pensaer BIM Platform - Header Component
 *
 * Matches the prototype header exactly with logo, search, 3D toggle, and avatars.
 * Includes undo/redo functionality via historyStore.
 */

import { useUIStore, useModelStore, useHistoryStore } from "../../stores";

interface HeaderProps {
  onOpenPalette: () => void;
}

export function Header({ onOpenPalette }: HeaderProps) {
  const is3DView = useUIStore((s) => s.viewMode === "3d");
  const setViewMode = useUIStore((s) => s.setViewMode);
  const elements = useModelStore((s) => s.elements);

  // History for undo/redo
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const canUndo = useHistoryStore((s) => s.canUndo());
  const canRedo = useHistoryStore((s) => s.canRedo());
  const undoDesc = useHistoryStore((s) => s.getUndoDescription());
  const redoDesc = useHistoryStore((s) => s.getRedoDescription());

  // Count issues (safely handle elements without issues array)
  const issueCount = elements.reduce(
    (acc, el) => acc + (el.issues?.length || 0),
    0,
  );

  return (
    <header className="h-12 bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50 flex items-center px-4">
      {/* Logo & Project */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <i className="fa-solid fa-building text-white text-sm"></i>
        </div>
        <span className="font-semibold text-white">Pensaer</span>
        <span className="text-gray-500 text-sm">Office Building</span>

        {/* Issues Badge */}
        {issueCount > 0 && (
          <span className="px-2 py-0.5 bg-orange-500/90 text-white text-xs font-medium rounded-full">
            {issueCount} issues
          </span>
        )}
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 ml-4">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            canUndo
              ? "text-gray-400 hover:text-white hover:bg-gray-800"
              : "text-gray-600 cursor-not-allowed"
          }`}
          title={undoDesc ? `Undo: ${undoDesc} (⌘Z)` : "Undo (⌘Z)"}
        >
          <i className="fa-solid fa-undo"></i>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            canRedo
              ? "text-gray-400 hover:text-white hover:bg-gray-800"
              : "text-gray-600 cursor-not-allowed"
          }`}
          title={redoDesc ? `Redo: ${redoDesc} (⌘⇧Z)` : "Redo (⌘⇧Z)"}
        >
          <i className="fa-solid fa-redo"></i>
        </button>
      </div>

      {/* Center - Command Palette Trigger */}
      <div className="flex-1 flex justify-center">
        <button
          onClick={onOpenPalette}
          className="flex items-center gap-3 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
        >
          <i className="fa-solid fa-magnifying-glass text-gray-500"></i>
          <span className="text-gray-400 text-sm">
            Type command or ask AI...
          </span>
          <kbd className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side - 3D Toggle & Avatars */}
      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors ${
            is3DView
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}
          onClick={() => setViewMode(is3DView ? "2d" : "3d")}
          title="Toggle 3D View (3)"
        >
          <i className="fa-solid fa-cube"></i>
          <span>{is3DView ? "3D" : "2D"}</span>
        </button>

        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
          <i className="fa-solid fa-users"></i>
        </button>

        {/* User Avatars */}
        <div className="flex -space-x-2">
          <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-gray-900 flex items-center justify-center text-xs font-medium text-white">
            JD
          </div>
          <div className="w-7 h-7 rounded-full bg-green-500 border-2 border-gray-900 flex items-center justify-center text-xs font-medium text-white">
            MK
          </div>
        </div>

        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
          <i className="fa-solid fa-question-circle"></i>
        </button>
      </div>
    </header>
  );
}
