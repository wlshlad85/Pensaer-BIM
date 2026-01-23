/**
 * Pensaer BIM Platform - UI Store
 *
 * Manages UI state: tools, views, panels, modals, and toasts.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ToolType, ViewMode, Toast, ToastType, SnapSettings } from "../types";

interface UIState {
  // Tool State
  activeTool: ToolType;
  isDrawing: boolean;
  drawStart: { x: number; y: number } | null;
  drawEnd: { x: number; y: number } | null;

  // View State
  viewMode: ViewMode;
  zoom: number;
  panX: number;
  panY: number;
  activeLevel: string;

  // Layer Visibility - tracks which element types are hidden
  hiddenLayers: Set<string>;
  lockedLayers: Set<string>;

  // Panel State
  showCommandPalette: boolean;
  showPropertiesPanel: boolean;
  showLayersPanel: boolean;
  showSnapSettings: boolean;
  showKeyboardShortcuts: boolean;
  showTerminal: boolean;

  // Snap Settings
  snap: SnapSettings;

  // Context Menu
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    targetId: string | null;
  };

  // Toasts
  toasts: Toast[];

  // Loading State
  loadingOperations: Array<{
    id: string;
    label: string;
    progress: number;
    cancellable: boolean;
  }>;
  isGlobalLoading: boolean;

  // Demo trigger (increments to signal demo should start)
  demoTrigger: number;
}

interface UIActions {
  // Tool Actions
  setTool: (tool: ToolType) => void;
  startDrawing: (x: number, y: number) => void;
  updateDrawing: (x: number, y: number) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;

  // View Actions
  setViewMode: (mode: ViewMode) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  pan: (deltaX: number, deltaY: number) => void;
  setActiveLevel: (level: string) => void;

  // Panel Actions
  toggleCommandPalette: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  togglePropertiesPanel: () => void;
  toggleLayersPanel: () => void;
  toggleKeyboardShortcuts: () => void;
  closeKeyboardShortcuts: () => void;
  toggleTerminal: () => void;

  // Layer Visibility Actions
  toggleLayerVisibility: (layerType: string) => void;
  showAllLayers: () => void;
  hideAllLayers: () => void;
  toggleLayerLock: (layerType: string) => void;
  unlockAllLayers: () => void;
  isLayerVisible: (layerType: string) => boolean;
  isLayerLocked: (layerType: string) => boolean;

  // Context Menu Actions
  showContextMenu: (x: number, y: number, targetId: string | null) => void;
  hideContextMenu: () => void;

  // Toast Actions
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Snap Actions
  toggleSnapEnabled: () => void;
  toggleGridSnap: () => void;
  toggleObjectSnap: () => void;
  togglePerpendicularSnap: () => void;
  setSnapSettings: (settings: Partial<SnapSettings>) => void;
  toggleSnapSettings: () => void;
  closeSnapSettings: () => void;

  // Loading Actions
  startLoading: (id: string, label: string, cancellable?: boolean) => void;
  updateLoadingProgress: (id: string, progress: number) => void;
  stopLoading: (id: string) => void;
  stopAllLoading: () => void;
  setGlobalLoading: (loading: boolean) => void;

  // Demo Actions
  triggerDemo: () => void;
  clearDemoTrigger: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  immer((set, get) => ({
    // Initial State
    activeTool: "select",
    isDrawing: false,
    drawStart: null,
    drawEnd: null,

    viewMode: "2d",
    zoom: 1,
    panX: 0,
    panY: 0,
    activeLevel: "Level 1",

    hiddenLayers: new Set(),
    lockedLayers: new Set(),

    showCommandPalette: false,
    showPropertiesPanel: true,
    showLayersPanel: false,
    showSnapSettings: false,
    showKeyboardShortcuts: false,
    showTerminal: false,

    snap: {
      enabled: true,
      grid: true,
      endpoint: true,
      midpoint: false,
      perpendicular: false,
      threshold: 10,
    },

    contextMenu: {
      visible: false,
      x: 0,
      y: 0,
      targetId: null,
    },

    toasts: [],

    // Loading State
    loadingOperations: [],
    isGlobalLoading: false,

    // Demo trigger
    demoTrigger: 0,

    // Tool Actions
    setTool: (tool) =>
      set((state) => {
        state.activeTool = tool;
        state.isDrawing = false;
        state.drawStart = null;
        state.drawEnd = null;
      }),

    startDrawing: (x, y) =>
      set((state) => {
        state.isDrawing = true;
        state.drawStart = { x, y };
        state.drawEnd = { x, y };
      }),

    updateDrawing: (x, y) =>
      set((state) => {
        if (state.isDrawing) {
          state.drawEnd = { x, y };
        }
      }),

    finishDrawing: () =>
      set((state) => {
        state.isDrawing = false;
        state.drawStart = null;
        state.drawEnd = null;
      }),

    cancelDrawing: () =>
      set((state) => {
        state.isDrawing = false;
        state.drawStart = null;
        state.drawEnd = null;
      }),

    // View Actions
    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode;
      }),

    setZoom: (zoom) =>
      set((state) => {
        state.zoom = Math.max(0.1, Math.min(5, zoom));
      }),

    zoomIn: () =>
      set((state) => {
        state.zoom = Math.min(5, state.zoom * 1.2);
      }),

    zoomOut: () =>
      set((state) => {
        state.zoom = Math.max(0.1, state.zoom / 1.2);
      }),

    zoomToFit: () =>
      set((state) => {
        state.zoom = 1;
        state.panX = 0;
        state.panY = 0;
      }),

    pan: (deltaX, deltaY) =>
      set((state) => {
        state.panX += deltaX;
        state.panY += deltaY;
      }),

    setActiveLevel: (level) =>
      set((state) => {
        state.activeLevel = level;
      }),

    // Panel Actions
    toggleCommandPalette: () =>
      set((state) => {
        state.showCommandPalette = !state.showCommandPalette;
      }),

    openCommandPalette: () =>
      set((state) => {
        state.showCommandPalette = true;
      }),

    closeCommandPalette: () =>
      set((state) => {
        state.showCommandPalette = false;
      }),

    togglePropertiesPanel: () =>
      set((state) => {
        state.showPropertiesPanel = !state.showPropertiesPanel;
      }),

    toggleLayersPanel: () =>
      set((state) => {
        state.showLayersPanel = !state.showLayersPanel;
      }),

    toggleKeyboardShortcuts: () =>
      set((state) => {
        state.showKeyboardShortcuts = !state.showKeyboardShortcuts;
      }),

    closeKeyboardShortcuts: () =>
      set((state) => {
        state.showKeyboardShortcuts = false;
      }),

    toggleTerminal: () =>
      set((state) => {
        state.showTerminal = !state.showTerminal;
      }),

    // Layer Visibility Actions
    toggleLayerVisibility: (layerType) =>
      set((state) => {
        const newHidden = new Set(state.hiddenLayers);
        if (newHidden.has(layerType)) {
          newHidden.delete(layerType);
        } else {
          newHidden.add(layerType);
        }
        state.hiddenLayers = newHidden;
      }),

    showAllLayers: () =>
      set((state) => {
        state.hiddenLayers = new Set();
      }),

    hideAllLayers: () =>
      set((state) => {
        state.hiddenLayers = new Set([
          "wall",
          "door",
          "window",
          "room",
          "floor",
          "roof",
          "column",
          "beam",
          "stair",
        ]);
      }),

    toggleLayerLock: (layerType) =>
      set((state) => {
        const newLocked = new Set(state.lockedLayers);
        if (newLocked.has(layerType)) {
          newLocked.delete(layerType);
        } else {
          newLocked.add(layerType);
        }
        state.lockedLayers = newLocked;
      }),

    unlockAllLayers: () =>
      set((state) => {
        state.lockedLayers = new Set();
      }),

    isLayerVisible: (layerType) => !get().hiddenLayers.has(layerType),

    isLayerLocked: (layerType) => get().lockedLayers.has(layerType),

    // Context Menu Actions
    showContextMenu: (x, y, targetId) =>
      set((state) => {
        state.contextMenu = { visible: true, x, y, targetId };
      }),

    hideContextMenu: () =>
      set((state) => {
        state.contextMenu.visible = false;
      }),

    // Toast Actions
    addToast: (type, message) => {
      const id = `toast-${Date.now()}`;
      set((state) => {
        // Limit to max 3 toasts visible at once
        if (state.toasts.length >= 3) {
          state.toasts.shift(); // Remove oldest toast
        }
        state.toasts.push({ id, type, message });
      });

      // Auto-dismiss based on toast type
      // - success/info: 4 seconds
      // - warning: 6 seconds
      // - error: no auto-dismiss (user must close)
      const duration =
        type === "error" ? null : type === "warning" ? 6000 : 4000;
      if (duration) {
        setTimeout(() => {
          useUIStore.getState().removeToast(id);
        }, duration);
      }
    },

    removeToast: (id) =>
      set((state) => {
        state.toasts = state.toasts.filter((t) => t.id !== id);
      }),

    clearToasts: () =>
      set((state) => {
        state.toasts = [];
      }),

    // Snap Actions
    toggleSnapEnabled: () =>
      set((state) => {
        state.snap.enabled = !state.snap.enabled;
      }),

    toggleGridSnap: () =>
      set((state) => {
        state.snap.grid = !state.snap.grid;
      }),

    toggleObjectSnap: () =>
      set((state) => {
        // Object snap toggles endpoint and midpoint together
        const newValue = !(state.snap.endpoint || state.snap.midpoint);
        state.snap.endpoint = newValue;
        state.snap.midpoint = newValue;
      }),

    togglePerpendicularSnap: () =>
      set((state) => {
        state.snap.perpendicular = !state.snap.perpendicular;
      }),

    setSnapSettings: (settings) =>
      set((state) => {
        Object.assign(state.snap, settings);
      }),

    toggleSnapSettings: () =>
      set((state) => {
        state.showSnapSettings = !state.showSnapSettings;
      }),

    closeSnapSettings: () =>
      set((state) => {
        state.showSnapSettings = false;
      }),

    // Loading Actions
    startLoading: (id, label, cancellable = false) =>
      set((state) => {
        // Don't add duplicate operations
        if (!state.loadingOperations.some((op) => op.id === id)) {
          state.loadingOperations.push({ id, label, progress: 0, cancellable });
        }
      }),

    updateLoadingProgress: (id, progress) =>
      set((state) => {
        const op = state.loadingOperations.find((o) => o.id === id);
        if (op) {
          op.progress = Math.max(0, Math.min(100, progress));
        }
      }),

    stopLoading: (id) =>
      set((state) => {
        state.loadingOperations = state.loadingOperations.filter(
          (op) => op.id !== id
        );
      }),

    stopAllLoading: () =>
      set((state) => {
        state.loadingOperations = [];
        state.isGlobalLoading = false;
      }),

    setGlobalLoading: (loading) =>
      set((state) => {
        state.isGlobalLoading = loading;
      }),

    // Demo Actions
    triggerDemo: () =>
      set((state) => {
        state.demoTrigger += 1;
      }),

    clearDemoTrigger: () =>
      set((state) => {
        state.demoTrigger = 0;
      }),
  })),
);
