/**
 * Pensaer BIM Platform - Main Application
 *
 * This is the entry point for the Pensaer BIM application.
 * Layout matches the prototype exactly with header, toolbar, canvas, and properties panel.
 */

import { useEffect, useState } from "react";
import { useUIStore, initializeHistory } from "./stores";
import { useKeyboardShortcuts, usePersistence } from "./hooks";
import { Canvas2D, Canvas3D } from "./components/canvas";
import {
  Header,
  Toolbar,
  PropertiesPanel,
  CommandPalette,
  Terminal,
  LevelPanel,
  LayerPanel,
  StatusBar,
} from "./components/layout";
import { PerformanceMonitor } from "./components/debug";
import clsx from "clsx";

function App() {
  // Initialize history on first render
  useEffect(() => {
    initializeHistory();
  }, []);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Initialize persistence (auto-save to IndexedDB)
  const {
    isLoading,
    isSaving,
    lastSaved,
    isAvailable: dbAvailable,
  } = usePersistence();

  // Store state
  const viewMode = useUIStore((s) => s.viewMode);
  const showCommandPalette = useUIStore((s) => s.showCommandPalette);
  const closeCommandPalette = useUIStore((s) => s.closeCommandPalette);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  // Terminal state
  const [terminalExpanded, setTerminalExpanded] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <Header onOpenPalette={openCommandPalette} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar */}
          <Toolbar />

          {/* Canvas Area */}
          <div className="flex-1 relative">
            {viewMode === "3d" ? <Canvas3D /> : <Canvas2D />}

            {/* Level & Layer Panels (floating, top-left) */}
            <div className="absolute top-4 left-4 w-52 z-10 flex flex-col gap-2">
              <LevelPanel />
              <LayerPanel />
            </div>

          </div>

          {/* Right Properties Panel */}
          <PropertiesPanel />
        </div>

        {/* Terminal Panel */}
        <Terminal
          isExpanded={terminalExpanded}
          onToggle={() => setTerminalExpanded(!terminalExpanded)}
        />
      </main>

      {/* Status Bar */}
      <StatusBar
        isLoading={isLoading}
        isSaving={isSaving}
        lastSaved={lastSaved}
        dbAvailable={dbAvailable}
      />

      {/* Command Palette Modal */}
      {showCommandPalette && <CommandPalette onClose={closeCommandPalette} />}

      {/* Performance Monitor (F3 to toggle) */}
      <PerformanceMonitor position="top-right" showGraph={true} />

      {/* Toast Container */}
      <div className="fixed top-16 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              "animate-toast-in px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[250px]",
              toast.type === "success" && "bg-green-500/90",
              toast.type === "error" && "bg-red-500/90",
              toast.type === "warning" && "bg-yellow-500/90",
              toast.type === "info" && "bg-blue-500/90",
            )}
          >
            <i
              className={clsx(
                "fa-solid",
                toast.type === "success" && "fa-check-circle",
                toast.type === "error" && "fa-exclamation-circle",
                toast.type === "warning" && "fa-exclamation-triangle",
                toast.type === "info" && "fa-info-circle",
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
