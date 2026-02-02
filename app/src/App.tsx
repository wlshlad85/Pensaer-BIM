/**
 * Pensaer BIM Platform - Main Application
 *
 * This is the entry point for the Pensaer BIM application.
 * Layout matches the prototype exactly with header, toolbar, canvas, and properties panel.
 */

import { useEffect, useState } from "react";
import { useUIStore, initializeHistory, initializeNamingMiddleware } from "./stores";
import { useKeyboardShortcuts, usePersistence, useBreakpoints } from "./hooks";
import { Canvas2D, Canvas3D } from "./components/canvas";
import {
  Header,
  Toolbar,
  PropertiesPanel,
  CommandPalette,
  Terminal,
  LevelPanel,
  LayerPanel,
  HistoryPanel,
  StatusBar,
} from "./components/layout";
import { PerformanceMonitor } from "./components/debug";
import { KeyboardShortcutsPanel } from "./components/KeyboardShortcutsPanel";
import { SkipLinks } from "./components/accessibility/SkipLinks";
import { ScreenReaderAnnouncer } from "./components/accessibility/ScreenReaderAnnouncer";
import clsx from "clsx";

function App() {
  // Initialize history and naming on first render
  useEffect(() => {
    initializeHistory();
    initializeNamingMiddleware();
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
  const showKeyboardShortcuts = useUIStore((s) => s.showKeyboardShortcuts);
  const closeKeyboardShortcuts = useUIStore((s) => s.closeKeyboardShortcuts);
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  // Terminal state (from store, toggleable via Ctrl+`)
  const showTerminal = useUIStore((s) => s.showTerminal);
  const toggleTerminal = useUIStore((s) => s.toggleTerminal);

  // Responsive breakpoints
  const { isMobile, isTablet, isMobileOrTablet } = useBreakpoints();

  // State for mobile panel visibility
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState<"properties" | "levels" | null>(null);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 text-white overflow-hidden" data-testid="app-container">
      {/* Skip Links for keyboard navigation */}
      <SkipLinks />

      {/* Screen Reader Announcer */}
      <ScreenReaderAnnouncer />

      {/* Header */}
      <Header onOpenPalette={openCommandPalette} />

      {/* Main Content */}
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden" role="main" aria-label="BIM workspace">
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar - hidden on mobile, icon-only on tablet */}
          {!isMobile && <Toolbar compact={isTablet} />}

          {/* Canvas Area */}
          <div id="canvas-area" className="flex-1 relative" role="region" aria-label="Building model canvas" data-testid="canvas-container">
            {viewMode === "3d" ? <Canvas3D /> : <Canvas2D />}

            {/* Level, Layer & History Panels (floating, top-left) - hidden on mobile */}
            {!isMobileOrTablet && (
              <div className="absolute top-4 left-4 w-52 z-10 flex flex-col gap-2">
                <LevelPanel />
                <LayerPanel />
                <HistoryPanel />
              </div>
            )}

            {/* Mobile floating action button for tools */}
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={clsx(
                  "absolute bottom-20 right-4 z-20 w-14 h-14 rounded-full shadow-lg",
                  "bg-blue-600 hover:bg-blue-700 text-white",
                  "flex items-center justify-center text-xl",
                  "transition-transform",
                  mobileMenuOpen && "rotate-45",
                )}
                aria-label={mobileMenuOpen ? "Close tools menu" : "Open tools menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-tools-menu"
              >
                <i className="fa-solid fa-plus" aria-hidden="true"></i>
              </button>
            )}

            {/* Mobile tools radial menu */}
            {isMobile && mobileMenuOpen && (
              <div
                id="mobile-tools-menu"
                className="absolute bottom-36 right-4 z-20 flex flex-col gap-2"
                role="menu"
                aria-label="Mobile tools menu"
              >
                <button
                  onClick={() => {
                    setMobilePanelOpen("properties");
                    setMobileMenuOpen(false);
                  }}
                  className="w-12 h-12 rounded-full bg-gray-800 shadow-lg flex items-center justify-center"
                  aria-label="Open properties panel"
                  role="menuitem"
                >
                  <i className="fa-solid fa-sliders" aria-hidden="true"></i>
                </button>
                <button
                  onClick={() => {
                    setMobilePanelOpen("levels");
                    setMobileMenuOpen(false);
                  }}
                  className="w-12 h-12 rounded-full bg-gray-800 shadow-lg flex items-center justify-center"
                  aria-label="Open layers and levels panel"
                  role="menuitem"
                >
                  <i className="fa-solid fa-layer-group" aria-hidden="true"></i>
                </button>
              </div>
            )}
          </div>

          {/* Right Properties Panel - hidden on mobile, shown as modal */}
          {!isMobileOrTablet && <PropertiesPanel />}
        </div>

        {/* Terminal Panel - reduced height on mobile, toggle with Ctrl+` */}
        <Terminal
          isExpanded={showTerminal}
          onToggle={toggleTerminal}
          compact={isMobileOrTablet}
        />
      </main>

      {/* Mobile Properties Panel (slide-in modal) */}
      {isMobileOrTablet && mobilePanelOpen === "properties" && (
        <div
          className="fixed inset-0 z-40 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-properties-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobilePanelOpen(null)}
            aria-hidden="true"
          />
          <div className="relative w-80 max-w-[90vw] bg-gray-900 shadow-xl overflow-y-auto">
            <div className="sticky top-0 flex justify-between items-center p-3 bg-gray-900 border-b border-gray-800">
              <span id="mobile-properties-title" className="font-medium">Properties</span>
              <button
                onClick={() => setMobilePanelOpen(null)}
                className="p-2 hover:bg-gray-800 rounded"
                aria-label="Close properties panel"
              >
                <i className="fa-solid fa-times" aria-hidden="true"></i>
              </button>
            </div>
            <PropertiesPanel />
          </div>
        </div>
      )}

      {/* Mobile Levels/Layers Panel (slide-in modal) */}
      {isMobileOrTablet && mobilePanelOpen === "levels" && (
        <div
          className="fixed inset-0 z-40 flex justify-start"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-layers-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobilePanelOpen(null)}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-[90vw] bg-gray-900 shadow-xl overflow-y-auto">
            <div className="sticky top-0 flex justify-between items-center p-3 bg-gray-900 border-b border-gray-800">
              <span id="mobile-layers-title" className="font-medium">Layers & Levels</span>
              <button
                onClick={() => setMobilePanelOpen(null)}
                className="p-2 hover:bg-gray-800 rounded"
                aria-label="Close layers panel"
              >
                <i className="fa-solid fa-times" aria-hidden="true"></i>
              </button>
            </div>
            <div className="p-2 flex flex-col gap-2">
              <LevelPanel />
              <LayerPanel />
              <HistoryPanel />
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <StatusBar
        isLoading={isLoading}
        isSaving={isSaving}
        lastSaved={lastSaved}
        dbAvailable={dbAvailable}
      />

      {/* Command Palette Modal */}
      {showCommandPalette && <CommandPalette onClose={closeCommandPalette} />}

      {/* Keyboard Shortcuts Panel (? to toggle) */}
      <KeyboardShortcutsPanel
        isOpen={showKeyboardShortcuts}
        onClose={closeKeyboardShortcuts}
      />

      {/* Performance Monitor (F3 to toggle) */}
      <PerformanceMonitor position="top-right" showGraph={true} />

      {/* Toast Container */}
      <div
        className="fixed top-16 right-4 z-50 flex flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
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
            role={toast.type === "error" ? "alert" : "status"}
            aria-live={toast.type === "error" ? "assertive" : "polite"}
          >
            <i
              className={clsx(
                "fa-solid",
                toast.type === "success" && "fa-check-circle",
                toast.type === "error" && "fa-exclamation-circle",
                toast.type === "warning" && "fa-exclamation-triangle",
                toast.type === "info" && "fa-info-circle",
              )}
              aria-hidden="true"
            ></i>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="opacity-70 hover:opacity-100"
              aria-label={`Dismiss ${toast.type} notification`}
            >
              <i className="fa-solid fa-times" aria-hidden="true"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
