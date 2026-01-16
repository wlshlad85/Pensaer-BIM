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
import { Header, Toolbar, PropertiesPanel, CommandPalette } from './components/layout';
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

export default App;
