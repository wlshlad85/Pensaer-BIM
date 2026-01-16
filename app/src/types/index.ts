/**
 * Pensaer BIM Platform - Core Type Definitions
 *
 * This file contains the foundational TypeScript interfaces
 * for the BIM data model, following IFC-inspired relationships.
 */

// ============================================
// ELEMENT TYPES
// ============================================

export type ElementType =
  | 'wall'
  | 'door'
  | 'window'
  | 'room'
  | 'floor'
  | 'roof'
  | 'column'
  | 'beam'
  | 'stair';

// ============================================
// BASE ELEMENT INTERFACE
// ============================================

export interface Element {
  id: string;
  type: ElementType;
  name: string;

  // Geometry (2D for now)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;

  // Properties (type-specific)
  properties: Record<string, string | number | boolean>;

  // Relationships (IFC-inspired)
  relationships: Relationships;

  // Validation
  issues: Issue[];

  // AI-native features
  aiSuggestions: Suggestion[];

  // Metadata
  level?: string;
  createdAt?: number;
  modifiedAt?: number;
}

// ============================================
// RELATIONSHIPS (IFC-INSPIRED)
// ============================================

export interface Relationships {
  // Host relationships (door/window → wall)
  hostedBy?: string;
  hosts?: string[];

  // Spatial relationships (room → walls)
  bounds?: string[];
  boundedBy?: string[];

  // Connection relationships (wall → wall)
  joins?: string[];

  // Access relationships (door → rooms)
  leadsTo?: string[];
  accessVia?: string[];

  // View relationships (window → room)
  facesRoom?: string;

  // Roof relationships
  coversRooms?: string[];
  supportedBy?: string[];
  covers?: string[];

  // Room adjacency
  connectedTo?: string[];
}

// ============================================
// ISSUES & SUGGESTIONS
// ============================================

export type IssueType = 'error' | 'warning' | 'info';
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Issue {
  id?: string;
  type: IssueType;
  message: string;
  severity?: IssueSeverity;
  code?: string; // e.g., 'FIRE-001', 'CLASH-002'
  fixable?: boolean;
}

export type SuggestionPriority = 'high' | 'medium' | 'low' | 'info';

export interface Suggestion {
  id?: string;
  icon: string;
  text: string;
  priority: SuggestionPriority;
  action?: () => void;
}

// ============================================
// SELECTION STATE
// ============================================

export interface SelectionState {
  selectedIds: string[];
  hoveredId: string | null;
  highlightedIds: string[];
}

// ============================================
// TOOL STATE
// ============================================

export type ToolType =
  | 'select'
  | 'wall'
  | 'door'
  | 'window'
  | 'room'
  | 'floor'
  | 'roof'
  | 'column'
  | 'measure'
  | 'pan';

export interface ToolState {
  activeTool: ToolType;
  isDrawing: boolean;
  drawStart: { x: number; y: number } | null;
  drawEnd: { x: number; y: number } | null;
}

// ============================================
// VIEW STATE
// ============================================

export type ViewMode = '2d' | '3d';

export interface ViewState {
  mode: ViewMode;
  zoom: number;
  panX: number;
  panY: number;
  activeLevel: string;
}

// ============================================
// HISTORY (UNDO/REDO)
// ============================================

export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  elements: Element[];
}

// ============================================
// COMMAND PALETTE
// ============================================

export type CommandCategory =
  | 'Modeling'
  | 'Selection'
  | 'Views'
  | 'Tools'
  | 'Analysis'
  | 'Documentation'
  | 'Edit'
  | 'System'
  | 'Spaces'
  | 'Structure';

export interface Command {
  id: string;
  type: string;
  icon: string;
  label: string;
  shortcut?: string;
  category: CommandCategory;
  description: string;
  action?: () => void;
}

// ============================================
// CONTEXT MENU
// ============================================

export interface ContextMenuItem {
  id: string;
  icon?: string;
  label?: string;
  shortcut?: string;
  danger?: boolean;
  type?: 'divider';
  action?: () => void;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// ============================================
// PROJECT
// ============================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  modifiedAt: number;
  elements: Element[];
  levels: Level[];
  settings: ProjectSettings;
}

export interface Level {
  id: string;
  name: string;
  elevation: number; // mm from ground
  height: number; // floor-to-floor height in mm
}

export interface ProjectSettings {
  units: 'metric' | 'imperial';
  gridSize: number;
  snapEnabled: boolean;
  snapTolerance: number;
}
