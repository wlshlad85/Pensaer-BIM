/**
 * Pensaer BIM Platform - Store State Type Definitions
 *
 * Interfaces for Zustand store states used throughout the application.
 * These define the shape of all global state.
 *
 * @module types/store
 */

import type { Element, ElementId, LevelId } from "./elements";
import type { Issue, Suggestion } from "./validation";

// ============================================
// MODEL STORE
// ============================================

/**
 * State for the model store containing all BIM elements.
 */
export interface ModelState {
  /** All elements in the model, indexed by ID */
  readonly elements: Element[];

  /** All levels in the model */
  readonly levels: Level[];

  /** Project metadata */
  readonly project: ProjectMeta;

  /** Whether the model has unsaved changes */
  readonly isDirty: boolean;

  /** Last modification timestamp */
  readonly lastModified: number;
}

/**
 * Actions for the model store.
 */
export interface ModelActions {
  /** Add a new element to the model */
  addElement: (element: Element) => void;

  /** Update an existing element */
  updateElement: (id: ElementId, updates: Partial<Element>) => void;

  /** Delete an element by ID */
  deleteElement: (id: ElementId) => void;

  /** Get an element by ID */
  getElement: (id: ElementId) => Element | undefined;

  /** List all elements, optionally filtered by type */
  listElements: (type?: string) => Element[];

  /** Add a level */
  addLevel: (level: Level) => void;

  /** Update a level */
  updateLevel: (id: LevelId, updates: Partial<Level>) => void;

  /** Delete a level */
  deleteLevel: (id: LevelId) => void;

  /** Clear all elements */
  clearAll: () => void;

  /** Mark model as saved */
  markSaved: () => void;

  /** Load model from serialized data */
  loadModel: (data: SerializedModel) => void;

  /** Export model to serialized data */
  exportModel: () => SerializedModel;
}

/**
 * Complete model store type.
 */
export type ModelStore = ModelState & ModelActions;

// ============================================
// SELECTION STORE
// ============================================

/**
 * Selection mode for multi-select behavior.
 */
export type SelectionMode = "single" | "multi" | "box";

/**
 * State for the selection store.
 */
export interface SelectionState {
  /** Currently selected element IDs */
  readonly selectedIds: Set<ElementId>;

  /** Currently hovered element ID */
  readonly hoveredId: ElementId | null;

  /** Elements highlighted (but not selected) */
  readonly highlightedIds: Set<ElementId>;

  /** Current selection mode */
  readonly selectionMode: SelectionMode;

  /** Box selection start point (during drag) */
  readonly boxStart: { x: number; y: number } | null;

  /** Box selection end point (during drag) */
  readonly boxEnd: { x: number; y: number } | null;
}

/**
 * Actions for the selection store.
 */
export interface SelectionActions {
  /** Select a single element (clears previous selection) */
  select: (id: ElementId) => void;

  /** Add element to selection */
  addToSelection: (id: ElementId) => void;

  /** Remove element from selection */
  removeFromSelection: (id: ElementId) => void;

  /** Toggle element selection */
  toggleSelection: (id: ElementId) => void;

  /** Select multiple elements */
  selectMultiple: (ids: ElementId[]) => void;

  /** Clear all selection */
  clearSelection: () => void;

  /** Set hovered element */
  setHovered: (id: ElementId | null) => void;

  /** Set highlighted elements */
  setHighlighted: (ids: ElementId[]) => void;

  /** Set selection mode */
  setSelectionMode: (mode: SelectionMode) => void;

  /** Start box selection */
  startBoxSelect: (point: { x: number; y: number }) => void;

  /** Update box selection */
  updateBoxSelect: (point: { x: number; y: number }) => void;

  /** End box selection */
  endBoxSelect: () => void;
}

/**
 * Complete selection store type.
 */
export type SelectionStore = SelectionState & SelectionActions;

// ============================================
// UI STORE
// ============================================

/**
 * View mode (2D or 3D).
 */
export type ViewMode = "2d" | "3d";

/**
 * Active tool for editing.
 */
export type ToolType =
  | "select"
  | "wall"
  | "door"
  | "window"
  | "room"
  | "floor"
  | "roof"
  | "column"
  | "beam"
  | "stair"
  | "measure"
  | "pan";

/**
 * Panel visibility state.
 */
export interface PanelState {
  /** Properties panel visible */
  properties: boolean;

  /** Levels panel visible */
  levels: boolean;

  /** Layers panel visible */
  layers: boolean;

  /** Terminal panel expanded */
  terminal: boolean;

  /** Command palette visible */
  commandPalette: boolean;
}

/**
 * Toast notification type.
 */
export type ToastType = "success" | "error" | "warning" | "info";

/**
 * Toast notification.
 */
export interface Toast {
  /** Unique ID */
  id: string;

  /** Toast type */
  type: ToastType;

  /** Message to display */
  message: string;

  /** Auto-dismiss duration in ms */
  duration?: number;
}

/**
 * State for the UI store.
 */
export interface UIState {
  /** Current view mode */
  readonly viewMode: ViewMode;

  /** Current zoom level (1.0 = 100%) */
  readonly zoom: number;

  /** Pan offset X */
  readonly panX: number;

  /** Pan offset Y */
  readonly panY: number;

  /** Active level ID */
  readonly activeLevel: LevelId;

  /** Active editing tool */
  readonly activeTool: ToolType;

  /** Panel visibility states */
  readonly panels: PanelState;

  /** Whether command palette is visible */
  readonly showCommandPalette: boolean;

  /** Active toast notifications */
  readonly toasts: Toast[];

  /** Grid settings */
  readonly grid: GridSettings;

  /** Snap settings */
  readonly snap: SnapSettings;

  /** Whether dark mode is enabled */
  readonly darkMode: boolean;
}

/**
 * Grid display settings.
 */
export interface GridSettings {
  /** Grid visible */
  visible: boolean;

  /** Grid spacing in mm */
  size: number;

  /** Major grid line interval */
  majorInterval: number;
}

/**
 * Snap settings for drawing tools.
 */
export interface SnapSettings {
  /** Snap enabled */
  enabled: boolean;

  /** Grid snap */
  grid: boolean;

  /** Endpoint snap */
  endpoint: boolean;

  /** Midpoint snap */
  midpoint: boolean;

  /** Perpendicular snap */
  perpendicular: boolean;

  /** Snap distance threshold in pixels */
  threshold: number;
}

/**
 * Actions for the UI store.
 */
export interface UIActions {
  /** Set view mode */
  setViewMode: (mode: ViewMode) => void;

  /** Set zoom level */
  setZoom: (zoom: number) => void;

  /** Set pan position */
  setPan: (x: number, y: number) => void;

  /** Set active level */
  setActiveLevel: (level: LevelId) => void;

  /** Set active tool */
  setActiveTool: (tool: ToolType) => void;

  /** Toggle panel visibility */
  togglePanel: (panel: keyof PanelState) => void;

  /** Open command palette */
  openCommandPalette: () => void;

  /** Close command palette */
  closeCommandPalette: () => void;

  /** Add a toast notification */
  addToast: (toast: Omit<Toast, "id">) => void;

  /** Remove a toast notification */
  removeToast: (id: string) => void;

  /** Update grid settings */
  setGridSettings: (settings: Partial<GridSettings>) => void;

  /** Update snap settings */
  setSnapSettings: (settings: Partial<SnapSettings>) => void;

  /** Toggle dark mode */
  toggleDarkMode: () => void;

  /** Reset UI to defaults */
  resetUI: () => void;
}

/**
 * Complete UI store type.
 */
export type UIStore = UIState & UIActions;

// ============================================
// HISTORY STORE
// ============================================

/**
 * History entry for undo/redo.
 */
export interface HistoryEntry {
  /** Unique ID */
  readonly id: string;

  /** Timestamp of the action */
  readonly timestamp: number;

  /** Human-readable description */
  readonly description: string;

  /** Snapshot of elements at this point */
  readonly elements: Element[];

  /** Snapshot of selection at this point */
  readonly selectedIds: ElementId[];
}

/**
 * State for the history store.
 */
export interface HistoryState {
  /** All history entries */
  readonly entries: HistoryEntry[];

  /** Current position in history (index) */
  readonly currentIndex: number;

  /** Maximum entries to keep */
  readonly maxEntries: number;

  /** Whether undo is available */
  readonly canUndo: boolean;

  /** Whether redo is available */
  readonly canRedo: boolean;
}

/**
 * Actions for the history store.
 */
export interface HistoryActions {
  /** Push a new state to history */
  pushState: (description: string, elements: Element[], selectedIds: ElementId[]) => void;

  /** Undo to previous state */
  undo: () => HistoryEntry | undefined;

  /** Redo to next state */
  redo: () => HistoryEntry | undefined;

  /** Clear all history */
  clearHistory: () => void;

  /** Get current state */
  getCurrentState: () => HistoryEntry | undefined;

  /** Set max entries */
  setMaxEntries: (max: number) => void;
}

/**
 * Complete history store type.
 */
export type HistoryStore = HistoryState & HistoryActions;

// ============================================
// TOKEN STORE
// ============================================

/**
 * Token usage statistics.
 */
export interface TokenStats {
  /** Total input tokens used */
  totalInput: number;

  /** Total output tokens used */
  totalOutput: number;

  /** Total tokens used */
  total: number;

  /** Estimated cost in USD */
  estimatedCost: number;

  /** Usage by tool/operation */
  byTool: Record<string, { input: number; output: number }>;
}

/**
 * State for the token store.
 */
export interface TokenState {
  /** Current session token usage */
  readonly sessionStats: TokenStats;

  /** All-time token usage */
  readonly allTimeStats: TokenStats;

  /** Token budget/limit */
  readonly budget: number | null;

  /** Whether budget warning has been shown */
  readonly budgetWarningShown: boolean;
}

/**
 * Actions for the token store.
 */
export interface TokenActions {
  /** Add token usage */
  addUsage: (tool: string, input: number, output: number) => void;

  /** Set budget */
  setBudget: (budget: number | null) => void;

  /** Reset session stats */
  resetSession: () => void;

  /** Get current budget status */
  getBudgetStatus: () => { used: number; remaining: number | null; percentage: number };
}

/**
 * Complete token store type.
 */
export type TokenStore = TokenState & TokenActions;

// ============================================
// SUPPORTING TYPES
// ============================================

/**
 * Level/floor definition.
 */
export interface Level {
  /** Unique ID */
  readonly id: LevelId;

  /** Level name (e.g., "Level 1", "Ground Floor") */
  name: string;

  /** Elevation from ground in mm */
  elevation: number;

  /** Floor-to-floor height in mm */
  height: number;

  /** Whether level is visible */
  visible?: boolean;
}

/**
 * Project metadata.
 */
export interface ProjectMeta {
  /** Project ID */
  readonly id: string;

  /** Project name */
  name: string;

  /** Project description */
  description?: string;

  /** Creation timestamp */
  readonly createdAt: number;

  /** Last modified timestamp */
  modifiedAt: number;

  /** Project settings */
  settings: ProjectSettings;
}

/**
 * Project-wide settings.
 */
export interface ProjectSettings {
  /** Measurement units */
  units: "metric" | "imperial";

  /** Default grid size in mm */
  gridSize: number;

  /** Default snap enabled */
  snapEnabled: boolean;

  /** Snap tolerance in mm */
  snapTolerance: number;

  /** Default wall height in mm */
  defaultWallHeight: number;

  /** Default wall thickness in mm */
  defaultWallThickness: number;
}

/**
 * Serialized model for persistence.
 */
export interface SerializedModel {
  /** Version number for migration */
  version: number;

  /** Project metadata */
  project: ProjectMeta;

  /** All elements */
  elements: Element[];

  /** All levels */
  levels: Level[];

  /** Export timestamp */
  exportedAt: number;
}
