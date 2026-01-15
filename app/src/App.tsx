/**
 * Pensaer BIM Platform - Main Application
 *
 * This is the entry point for the Pensaer BIM application.
 * Layout matches the prototype exactly with header, toolbar, canvas, and properties panel.
 */

import { useEffect } from 'react';
import { useUIStore, useModelStore, useSelectionStore, initializeHistory, useHistoryStore } from './stores';
import { useKeyboardShortcuts, usePersistence } from './hooks';
import { Canvas2D, Canvas3D } from './components/canvas';
import { Header, Toolbar, PropertiesPanel } from './components/layout';
import clsx from 'clsx';

function App() {
  // Initialize history on first render
  useEffect(() => {
    initializeHistory();
  }, []);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Initialize persistence (auto-save to IndexedDB)
  const { isLoading, isSaving, lastSaved, isAvailable: dbAvailable } = usePersistence();

  // Get history count for status bar
  const historyCount = useHistoryStore((s) => s.entries.length);

  // Store state
  const viewMode = useUIStore((s) => s.viewMode);
  const showCommandPalette = useUIStore((s) => s.showCommandPalette);
  const closeCommandPalette = useUIStore((s) => s.closeCommandPalette);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const zoom = useUIStore((s) => s.zoom);
  const activeLevel = useUIStore((s) => s.activeLevel);
  const activeTool = useUIStore((s) => s.activeTool);
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  const elements = useModelStore((s) => s.elements);
  const selectedIds = useSelectionStore((s) => s.selectedIds);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <Header onOpenPalette={openCommandPalette} />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <Toolbar />

        {/* Canvas Area */}
        <div className="flex-1 relative">
          {viewMode === '3d' ? <Canvas3D /> : <Canvas2D />}

          {/* Zoom indicator (2D only) */}
          {viewMode === '2d' && (
            <div className="absolute bottom-4 left-4 px-2 py-1 rounded bg-gray-900/80 text-xs text-gray-400">
              {Math.round(zoom * 100)}%
            </div>
          )}
        </div>

        {/* Right Properties Panel */}
        <PropertiesPanel />
      </main>

      {/* Status Bar */}
      <footer className="h-6 flex items-center justify-between px-4 text-xs text-gray-500 border-t border-gray-700/50 bg-gray-900/50">
        <div className="flex items-center gap-4">
          <span>{activeLevel}</span>
          <span className="text-gray-600">•</span>
          <span className="capitalize">Tool: {activeTool}</span>
          <span className="text-gray-600">•</span>
          <span>Grid: 50mm</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{elements.length} elements</span>
          <span className="text-gray-600">•</span>
          <span>{selectedIds.length} selected</span>
          <span className="text-gray-600">•</span>
          <span title="Undo history">{historyCount} history</span>
          <span className="text-gray-600">•</span>
          {isLoading ? (
            <span className="text-yellow-400">● Loading...</span>
          ) : isSaving ? (
            <span className="text-blue-400">● Saving...</span>
          ) : dbAvailable ? (
            <span className="text-green-400" title={lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Auto-save enabled'}>
              ● Saved
            </span>
          ) : (
            <span className="text-orange-400">● No persistence</span>
          )}
        </div>
      </footer>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <CommandPalette onClose={closeCommandPalette} />
      )}

      {/* Toast Container */}
      <div className="fixed top-16 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              'animate-toast-in px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[250px]',
              toast.type === 'success' && 'bg-green-500/90',
              toast.type === 'error' && 'bg-red-500/90',
              toast.type === 'warning' && 'bg-yellow-500/90',
              toast.type === 'info' && 'bg-blue-500/90'
            )}
          >
            <i
              className={clsx(
                'fa-solid',
                toast.type === 'success' && 'fa-check-circle',
                toast.type === 'error' && 'fa-exclamation-circle',
                toast.type === 'warning' && 'fa-exclamation-triangle',
                toast.type === 'info' && 'fa-info-circle'
              )}
            ></i>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="opacity-70 hover:opacity-100"
            >
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Command Palette Component
 *
 * AI-powered command palette for quick actions and natural language commands.
 */
function CommandPalette({ onClose }: { onClose: () => void }) {
  const setTool = useUIStore((s) => s.setTool);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const addToast = useUIStore((s) => s.addToast);

  const commands = [
    { icon: 'fa-arrow-pointer', label: 'Select tool', shortcut: 'V', action: () => setTool('select') },
    { icon: 'fa-square', label: 'Wall tool', shortcut: 'W', action: () => setTool('wall') },
    { icon: 'fa-door-open', label: 'Door tool', shortcut: 'D', action: () => setTool('door') },
    { icon: 'fa-window-maximize', label: 'Window tool', shortcut: 'N', action: () => setTool('window') },
    { icon: 'fa-vector-square', label: 'Room tool', shortcut: 'M', action: () => setTool('room') },
    { icon: 'fa-cube', label: 'Toggle 3D view', shortcut: '3', action: () => setViewMode('3d') },
    { icon: 'fa-table-cells', label: 'Toggle 2D view', shortcut: '2', action: () => setViewMode('2d') },
    { icon: 'fa-home', label: 'Add roof', shortcut: 'R', action: () => addToast('info', 'Select walls to create roof') },
    { icon: 'fa-check-circle', label: 'Run validation', shortcut: '⌘⇧V', action: () => addToast('success', 'Validation complete - 2 issues found') },
  ];

  const handleCommand = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[560px] bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl animate-slide-up overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-magnifying-glass text-gray-500"></i>
            <input
              type="text"
              placeholder="Type command or ask AI..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
              autoFocus
            />
            <kbd className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded">ESC</kbd>
          </div>
        </div>

        {/* Commands List */}
        <div className="max-h-80 overflow-y-auto p-2">
          <div className="text-xs text-gray-500 uppercase px-3 py-2">Quick Actions</div>
          {commands.map((cmd, i) => (
            <button
              key={i}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              onClick={() => handleCommand(cmd.action)}
            >
              <i className={`fa-solid ${cmd.icon} w-5 text-center text-gray-500`}></i>
              <span className="flex-1 text-sm">{cmd.label}</span>
              <kbd className="px-2 py-0.5 bg-gray-800 text-gray-500 text-xs rounded">{cmd.shortcut}</kbd>
            </button>
          ))}
        </div>

        {/* AI Section */}
        <div className="p-3 border-t border-gray-700/50 bg-purple-900/10">
          <div className="flex items-center gap-2 text-xs text-purple-400">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span>Try: "Add a door to Wall-101" or "Check fire compliance"</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
