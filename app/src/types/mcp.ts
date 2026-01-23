/**
 * Pensaer BIM Platform - MCP (Model Context Protocol) Type Definitions
 *
 * Interfaces for MCP tool communication, following JSON-RPC 2.0 patterns.
 * These types define the contract between the client and MCP tool servers.
 *
 * @module types/mcp
 */

import type { Element, ElementId, ElementType } from "./elements";
import type { Issue, Suggestion } from "./validation";

// ============================================
// MCP SERVER TYPES
// ============================================

/**
 * Available MCP tool servers in Pensaer.
 */
export type MCPServerType =
  | "geometry"       // Create walls, openings, compute meshes
  | "spatial"        // Create rooms, compute adjacency
  | "validation"     // Check compliance, detect clashes
  | "documentation"; // Generate schedules, export reports

/**
 * Connection state for an MCP server.
 */
export type MCPConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "reconnecting";

/**
 * MCP server status information.
 */
export interface MCPServerStatus {
  /** Server type */
  server: MCPServerType;

  /** Current connection state */
  state: MCPConnectionState;

  /** Last error message, if any */
  error?: string;

  /** Last successful connection time */
  lastConnected?: number;

  /** Available tools on this server */
  tools?: string[];

  /** Server version */
  version?: string;
}

// ============================================
// JSON-RPC 2.0 TYPES
// ============================================

/**
 * JSON-RPC 2.0 request object.
 */
export interface JSONRPCRequest {
  /** JSON-RPC version (always "2.0") */
  jsonrpc: "2.0";

  /** Method name (tool name) */
  method: string;

  /** Method parameters */
  params?: Record<string, unknown>;

  /** Request ID for response matching */
  id: string | number;
}

/**
 * JSON-RPC 2.0 response object.
 */
export interface JSONRPCResponse<T = unknown> {
  /** JSON-RPC version (always "2.0") */
  jsonrpc: "2.0";

  /** Result data (present on success) */
  result?: T;

  /** Error object (present on failure) */
  error?: JSONRPCError;

  /** Request ID for response matching */
  id: string | number;
}

/**
 * JSON-RPC 2.0 error object.
 */
export interface JSONRPCError {
  /** Error code */
  code: number;

  /** Human-readable error message */
  message: string;

  /** Additional error data */
  data?: unknown;
}

// Standard JSON-RPC error codes
export const JSONRPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Server-defined errors (-32000 to -32099)
  SERVER_ERROR: -32000,
  TIMEOUT_ERROR: -32001,
  CONNECTION_ERROR: -32002,
} as const;

// ============================================
// MCP TOOL RESULT TYPES
// ============================================

/**
 * Result status for MCP tool calls.
 */
export type MCPResultStatus = "success" | "error" | "partial";

/**
 * Warning from an MCP tool operation.
 */
export interface MCPWarning {
  /** Warning code */
  code: string;

  /** Human-readable warning message */
  message: string;

  /** Related element IDs */
  elementIds?: ElementId[];
}

/**
 * Generic MCP tool result.
 *
 * @template T The type of the result data
 *
 * @example
 * ```ts
 * const result: MCPToolResult<WallElement> = {
 *   status: 'success',
 *   data: { ... },
 *   warnings: [],
 *   duration: 45
 * };
 * ```
 */
export interface MCPToolResult<T = unknown> {
  /** Result status */
  status: MCPResultStatus;

  /** Result data (present on success or partial) */
  data?: T;

  /** Error message (present on error) */
  error?: string;

  /** Error code */
  errorCode?: string;

  /** Warnings that occurred during execution */
  warnings: MCPWarning[];

  /** Execution duration in milliseconds */
  duration?: number;

  /** Token usage for AI operations */
  tokenUsage?: TokenUsage;
}

/**
 * Token usage information for AI operations.
 */
export interface TokenUsage {
  /** Input tokens used */
  input: number;

  /** Output tokens generated */
  output: number;

  /** Total tokens */
  total: number;

  /** Cost estimate in USD */
  cost?: number;
}

// ============================================
// GEOMETRY SERVER TYPES
// ============================================

/**
 * Request to create a wall.
 */
export interface CreateWallRequest {
  /** Start point coordinates */
  start: { x: number; y: number };

  /** End point coordinates */
  end: { x: number; y: number };

  /** Wall height in mm */
  height?: number;

  /** Wall thickness in mm */
  thickness?: number;

  /** Optional name for the wall */
  name?: string;

  /** Level to place the wall on */
  level?: string;
}

/**
 * Request to create an opening (door/window).
 */
export interface CreateOpeningRequest {
  /** Host wall ID */
  wallId: ElementId;

  /** Opening type */
  type: "door" | "window";

  /** Position along the wall (0-1) */
  position: number;

  /** Opening width in mm */
  width: number;

  /** Opening height in mm */
  height: number;

  /** Sill height (for windows) */
  sillHeight?: number;
}

/**
 * Request to compute a 3D mesh.
 */
export interface ComputeMeshRequest {
  /** Element ID to generate mesh for */
  elementId: ElementId;

  /** Level of detail */
  lod?: "low" | "medium" | "high";

  /** Include UV coordinates */
  includeUVs?: boolean;
}

/**
 * 3D mesh data result.
 */
export interface MeshData {
  /** Vertex positions (flat array: x,y,z,x,y,z,...) */
  vertices: Float32Array;

  /** Face indices */
  indices: Uint32Array;

  /** Vertex normals (optional) */
  normals?: Float32Array;

  /** UV coordinates (optional) */
  uvs?: Float32Array;
}

// ============================================
// SPATIAL SERVER TYPES
// ============================================

/**
 * Request to create a room.
 */
export interface CreateRoomRequest {
  /** Room name */
  name: string;

  /** Bounding wall IDs */
  boundingWalls: ElementId[];

  /** Room type */
  roomType?: string;

  /** Level ID */
  level?: string;
}

/**
 * Adjacency graph for rooms.
 */
export interface AdjacencyGraph {
  /** Node (room) data */
  nodes: Array<{
    id: ElementId;
    name: string;
    area?: number;
  }>;

  /** Edge (connection) data */
  edges: Array<{
    source: ElementId;
    target: ElementId;
    via?: ElementId; // Door ID
  }>;
}

// ============================================
// VALIDATION SERVER TYPES
// ============================================

/**
 * Request to check compliance.
 */
export interface CheckComplianceRequest {
  /** Element IDs to check (or all if empty) */
  elementIds?: ElementId[];

  /** Compliance codes to check */
  codes?: string[];

  /** Include AI suggestions */
  includeSuggestions?: boolean;
}

/**
 * Compliance check result.
 */
export interface ComplianceResult {
  /** Overall compliance status */
  compliant: boolean;

  /** Issues found */
  issues: Issue[];

  /** AI suggestions */
  suggestions?: Suggestion[];

  /** Checked compliance codes */
  checkedCodes: string[];
}

/**
 * Clash detection request.
 */
export interface DetectClashesRequest {
  /** Element IDs to check for clashes */
  elementIds?: ElementId[];

  /** Minimum overlap distance to report (mm) */
  tolerance?: number;
}

/**
 * Individual clash detection result.
 */
export interface ClashResult {
  /** First element in clash */
  elementA: ElementId;

  /** Second element in clash */
  elementB: ElementId;

  /** Overlap volume in cubic mm */
  overlapVolume: number;

  /** Clash severity */
  severity: "hard" | "soft" | "clearance";
}

// ============================================
// DOCUMENTATION SERVER TYPES
// ============================================

/**
 * Request to generate a schedule.
 */
export interface GenerateScheduleRequest {
  /** Element types to include */
  elementTypes: ElementType[];

  /** Properties to include in schedule */
  properties: string[];

  /** Grouping field */
  groupBy?: string;

  /** Output format */
  format?: "json" | "csv" | "html";
}

/**
 * Schedule data result.
 */
export interface ScheduleData {
  /** Column headers */
  headers: string[];

  /** Row data */
  rows: Array<Record<string, unknown>>;

  /** Groupings (if grouped) */
  groups?: Array<{
    name: string;
    rows: Array<Record<string, unknown>>;
    subtotals?: Record<string, number>;
  }>;

  /** Totals row */
  totals?: Record<string, number>;
}

/**
 * Report export request.
 */
export interface ExportReportRequest {
  /** Report type */
  reportType: "area" | "element-count" | "compliance" | "full";

  /** Output format */
  format: "pdf" | "docx" | "html";

  /** Include images */
  includeImages?: boolean;

  /** Custom title */
  title?: string;
}

// ============================================
// MCP CLIENT TYPES
// ============================================

/**
 * Options for MCP tool calls.
 */
export interface MCPCallOptions {
  /** Request timeout in ms */
  timeout?: number;

  /** Retry count on failure */
  retries?: number;

  /** Whether to track token usage */
  trackTokens?: boolean;
}

/**
 * MCP client interface for tool calls.
 */
export interface IMCPClient {
  /**
   * Call an MCP tool.
   *
   * @template T Result data type
   * @param server Target server
   * @param tool Tool name
   * @param params Tool parameters
   * @param options Call options
   */
  callTool<T = unknown>(
    server: MCPServerType,
    tool: string,
    params?: Record<string, unknown>,
    options?: MCPCallOptions
  ): Promise<MCPToolResult<T>>;

  /**
   * Get server status.
   */
  getServerStatus(server: MCPServerType): MCPServerStatus;

  /**
   * Check if a server is connected.
   */
  isConnected(server: MCPServerType): boolean;

  /**
   * Connect to a server.
   */
  connect(server: MCPServerType): Promise<void>;

  /**
   * Disconnect from a server.
   */
  disconnect(server: MCPServerType): Promise<void>;
}
