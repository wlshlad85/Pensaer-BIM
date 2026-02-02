/**
 * Pensaer BIM Platform - Core Type Definitions
 *
 * This file re-exports all types from specialized modules and provides
 * backward-compatible type aliases for existing code.
 *
 * @module types
 */

// ============================================
// RE-EXPORTS FROM SPECIALIZED MODULES
// ============================================

// Element types and type guards
export type {
  ElementId,
  LevelId,
  ElementType,
  BaseElement,
  WallElement,
  DoorElement,
  WindowElement,
  OpeningElement,
  RoomElement,
  FloorElement,
  RoofElement,
  ColumnElement,
  BeamElement,
  StairElement,
  Element,
} from "./elements";

export {
  createElementId,
  createLevelId,
  isWall,
  isDoor,
  isWindow,
  isOpening,
  isRoom,
  isFloor,
  isRoof,
  isColumn,
  isBeam,
  isStair,
  isHostElement,
  isHostedElement,
} from "./elements";

// Relationship types
export type {
  Relationships,
  RelationshipType,
  RelationshipMeta,
} from "./relationships";

export { getInverseRelationType } from "./relationships";

// Validation types
export type {
  IssueType,
  IssueSeverity,
  IssueCategory,
  Issue,
  IssueFix,
  SuggestionPriority,
  SuggestionCategory,
  Suggestion,
  ValidationResult,
  ValidationConfig,
} from "./validation";

// MCP types
export type {
  MCPServerType,
  MCPConnectionState,
  MCPServerStatus,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
  MCPResultStatus,
  MCPWarning,
  MCPToolResult,
  TokenUsage,
  CreateWallRequest,
  CreateOpeningRequest,
  ComputeMeshRequest,
  MeshData,
  CreateRoomRequest,
  AdjacencyGraph,
  CheckComplianceRequest,
  ComplianceResult,
  DetectClashesRequest,
  ClashResult,
  GenerateScheduleRequest,
  ScheduleData,
  ExportReportRequest,
  MCPCallOptions,
  IMCPClient,
} from "./mcp";

export { JSONRPC_ERROR_CODES } from "./mcp";

// Store types
export type {
  ModelState,
  ModelActions,
  ModelStore,
  SelectionMode,
  SelectionState,
  SelectionActions,
  SelectionStore,
  ViewMode,
  ToolType,
  PanelState,
  ToastType,
  Toast,
  UIState,
  GridSettings,
  SnapSettings,
  UIActions,
  UIStore,
  HistoryEntry,
  HistoryState,
  HistoryActions,
  HistoryStore,
  TokenStats,
  TokenState,
  TokenActions,
  TokenStore,
  Level,
  ProjectMeta,
  ProjectSettings,
  SerializedModel,
} from "./store";

// ============================================
// LEGACY COMPATIBILITY TYPES
// ============================================

/**
 * @deprecated Use the new Element union type from ./elements
 * Kept for backward compatibility with existing code.
 */
export interface LegacyElement {
  id: string;
  type: import("./elements").ElementType;
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
  relationships: import("./relationships").Relationships;

  // Validation
  issues: import("./validation").Issue[];

  // AI-native features
  aiSuggestions: import("./validation").Suggestion[];

  // Metadata
  level?: string;
  createdAt?: number;
  modifiedAt?: number;
}

// ============================================
// TOOL STATE (Legacy)
// ============================================

/**
 * Tool drawing state for canvas interactions.
 */
export interface ToolState {
  activeTool: import("./store").ToolType;
  isDrawing: boolean;
  drawStart: { x: number; y: number } | null;
  drawEnd: { x: number; y: number } | null;
}

// ============================================
// VIEW STATE (Legacy)
// ============================================

/**
 * View state for canvas display.
 */
export interface ViewState {
  mode: import("./store").ViewMode;
  zoom: number;
  panX: number;
  panY: number;
  activeLevel: string;
}

// ============================================
// COMMAND PALETTE
// ============================================

/**
 * Command category for grouping in command palette.
 */
export type CommandCategory =
  | "Modeling"
  | "Selection"
  | "Views"
  | "Tools"
  | "Analysis"
  | "Documentation"
  | "Edit"
  | "System"
  | "Spaces"
  | "Structure";

/**
 * Command definition for command palette.
 */
export interface Command {
  /** Unique command ID */
  id: string;

  /** Command type */
  type: string;

  /** Icon identifier */
  icon: string;

  /** Display label */
  label: string;

  /** Keyboard shortcut */
  shortcut?: string;

  /** Command category */
  category: CommandCategory;

  /** Description shown in palette */
  description: string;

  /** Action to execute */
  action?: () => void;
}

// ============================================
// CONTEXT MENU
// ============================================

/**
 * Context menu item definition.
 */
export interface ContextMenuItem {
  /** Unique item ID */
  id: string;

  /** Icon identifier */
  icon?: string;

  /** Display label */
  label?: string;

  /** Keyboard shortcut hint */
  shortcut?: string;

  /** Whether this is a destructive action */
  danger?: boolean;

  /** Item type (divider for separator) */
  type?: "divider";

  /** Action to execute */
  action?: () => void;
}

// ============================================
// PROJECT (Legacy)
// ============================================

/**
 * @deprecated Use ProjectMeta from ./store
 * Project definition for persistence.
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  modifiedAt: number;
  elements: LegacyElement[];
  levels: import("./store").Level[];
  settings: import("./store").ProjectSettings;
}
