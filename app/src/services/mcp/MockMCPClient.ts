/**
 * Mock MCP Client
 *
 * Provides mock responses for development without running MCP servers.
 * Supports configurable delays and error simulation.
 */

import type {
  IMCPClient,
  MCPToolCall,
  MCPToolResult,
  MCPClientMode,
  MockConfig,
} from "./types";
import {
  mockCreateWall,
  mockCreateFloor,
  mockCreateRoom,
  mockCreateRoof,
  mockCreateOpening,
  mockPlaceDoor,
  mockPlaceWindow,
  mockComputeMesh,
  mockListElements,
  mockGetElement,
  mockDeleteElement,
  mockModifyElement,
  mockGetStateSummary,
  mockDetectRooms,
  mockComputeAdjacency,
  mockFindNearest,
  mockComputeArea,
  mockCheckClearance,
  mockAnalyzeCirculation,
  mockPointInPolygon,
  mockAnalyzeTopology,
  mockDetectClashes,
  mockDetectClashesBetweenSets,
} from "./mocks";

/**
 * Mock tool handler function type
 */
type MockToolHandler = (args: Record<string, unknown>) => MCPToolResult;

/**
 * Registry of mock tool handlers
 */
const MOCK_HANDLERS: Record<string, MockToolHandler> = {
  // Geometry tools
  create_wall: mockCreateWall,
  create_floor: mockCreateFloor,
  create_room: mockCreateRoom,
  create_roof: mockCreateRoof,
  create_opening: mockCreateOpening,
  place_door: mockPlaceDoor,
  place_window: mockPlaceWindow,
  compute_mesh: mockComputeMesh,

  // Query tools
  list_elements: mockListElements,
  get_element: mockGetElement,
  delete_element: mockDeleteElement,
  modify_element: mockModifyElement,
  get_state_summary: mockGetStateSummary,

  // Spatial tools
  detect_rooms: mockDetectRooms,
  compute_adjacency: mockComputeAdjacency,
  find_nearest: mockFindNearest,
  compute_area: mockComputeArea,
  check_clearance: mockCheckClearance,
  analyze_circulation: mockAnalyzeCirculation,
  point_in_polygon: mockPointInPolygon,
  analyze_wall_topology: mockAnalyzeTopology,

  // Validation tools
  detect_clashes: mockDetectClashes,
  detect_clashes_between_sets: mockDetectClashesBetweenSets,
};

/**
 * Default mock configuration
 */
const DEFAULT_CONFIG: Required<MockConfig> = {
  baseDelay: 100,
  delayVariance: 200,
  simulateErrors: false,
  errorRate: 0.1,
};

/**
 * Mock MCP Client for development
 *
 * Features:
 * - Simulated network delays
 * - Error simulation for testing error handling
 * - Configurable response timing
 * - Full mock coverage for all geometry tools
 */
export class MockMCPClient implements IMCPClient {
  private config: Required<MockConfig>;

  constructor(config: MockConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the current mode
   */
  getMode(): MCPClientMode {
    return "mock";
  }

  /**
   * Check if in mock mode (always true)
   */
  isMockMode(): boolean {
    return true;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<MockConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<MockConfig> {
    return { ...this.config };
  }

  /**
   * Call an MCP tool with mock response
   */
  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    // Simulate network delay
    await this.simulateDelay();

    // Simulate random errors if enabled
    if (this.shouldSimulateError()) {
      return this.generateRandomError(call.tool);
    }

    // Get mock handler
    const handler = MOCK_HANDLERS[call.tool];
    if (!handler) {
      return {
        success: false,
        error: {
          code: -32601,
          message: `Unknown tool: ${call.tool}`,
          data: {
            available_tools: Object.keys(MOCK_HANDLERS),
          },
        },
      };
    }

    // Execute mock handler
    return handler(call.arguments);
  }

  /**
   * Simulate network delay
   */
  private async simulateDelay(): Promise<void> {
    const delay =
      this.config.baseDelay + Math.random() * this.config.delayVariance;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Check if we should simulate an error
   */
  private shouldSimulateError(): boolean {
    return (
      this.config.simulateErrors && Math.random() < this.config.errorRate
    );
  }

  /**
   * Generate a random error response
   */
  private generateRandomError(tool: string): MCPToolResult {
    const errorTypes = [
      {
        code: -32603,
        message: "Internal server error",
      },
      {
        code: -32602,
        message: "Invalid parameters",
      },
      {
        code: -32001,
        message: "Validation error: constraint violated",
      },
      {
        code: -32006,
        message: "Service temporarily unavailable",
      },
    ];

    const error = errorTypes[Math.floor(Math.random() * errorTypes.length)];

    return {
      success: false,
      error: {
        code: error.code,
        message: `${error.message} (simulated error for ${tool})`,
        data: {
          simulated: true,
          tool,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Register a custom mock handler
   */
  static registerMockHandler(tool: string, handler: MockToolHandler): void {
    MOCK_HANDLERS[tool] = handler;
  }

  /**
   * Get available mock tools
   */
  static getAvailableTools(): string[] {
    return Object.keys(MOCK_HANDLERS);
  }
}

export default MockMCPClient;
