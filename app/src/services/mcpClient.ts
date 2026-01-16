/**
 * MCP Client Service
 *
 * Provides communication with MCP tool servers (geometry-server, etc.)
 * Supports both HTTP and mock modes for development.
 */

export interface MCPToolResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
    data?: Record<string, unknown>;
  };
  event_id?: string;
  timestamp?: string;
  warnings?: string[];
}

export interface MCPToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

type MCPClientMode = "mock" | "http" | "websocket";

interface MCPClientConfig {
  mode: MCPClientMode;
  baseUrl?: string;
  wsUrl?: string;
}

/**
 * MCP Client for communicating with tool servers
 */
class MCPClient {
  private config: MCPClientConfig;
  private ws: WebSocket | null = null;
  private pendingCalls: Map<
    string,
    { resolve: (result: MCPToolResult) => void; reject: (error: Error) => void }
  > = new Map();

  constructor(config: MCPClientConfig = { mode: "mock" }) {
    this.config = config;
  }

  /**
   * Call an MCP tool
   */
  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    switch (this.config.mode) {
      case "mock":
        return this.mockToolCall(call);
      case "http":
        return this.httpToolCall(call);
      case "websocket":
        return this.wsToolCall(call);
      default:
        return this.mockToolCall(call);
    }
  }

  /**
   * Mock tool call for development
   */
  private async mockToolCall(call: MCPToolCall): Promise<MCPToolResult> {
    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, 100 + Math.random() * 200),
    );

    const { tool, arguments: args } = call;

    // Mock implementations for common tools
    switch (tool) {
      case "create_wall":
        return this.mockCreateWall(args);
      case "create_floor":
        return this.mockCreateFloor(args);
      case "create_room":
        return this.mockCreateRoom(args);
      case "create_roof":
        return this.mockCreateRoof(args);
      case "place_door":
        return this.mockPlaceDoor(args);
      case "place_window":
        return this.mockPlaceWindow(args);
      case "list_elements":
        return this.mockListElements(args);
      case "get_element":
        return this.mockGetElement(args);
      case "delete_element":
        return this.mockDeleteElement(args);
      case "detect_rooms":
        return this.mockDetectRooms(args);
      case "analyze_wall_topology":
        return this.mockAnalyzeTopology(args);
      case "get_state_summary":
        return this.mockGetStateSummary();
      default:
        return {
          success: false,
          error: {
            code: -32601,
            message: `Unknown tool: ${tool}`,
          },
        };
    }
  }

  /**
   * HTTP tool call (for production)
   */
  private async httpToolCall(call: MCPToolCall): Promise<MCPToolResult> {
    if (!this.config.baseUrl) {
      throw new Error("HTTP baseUrl not configured");
    }

    const response = await fetch(`${this.config.baseUrl}/tools/${call.tool}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(call.arguments),
    });

    return response.json();
  }

  /**
   * WebSocket tool call
   */
  private async wsToolCall(call: MCPToolCall): Promise<MCPToolResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connectWebSocket();
    }

    return new Promise((resolve, reject) => {
      const callId = crypto.randomUUID();
      this.pendingCalls.set(callId, { resolve, reject });

      this.ws!.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: {
            name: call.tool,
            arguments: call.arguments,
          },
        }),
      );

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingCalls.has(callId)) {
          this.pendingCalls.delete(callId);
          reject(new Error("Tool call timed out"));
        }
      }, 30000);
    });
  }

  private async connectWebSocket(): Promise<void> {
    if (!this.config.wsUrl) {
      throw new Error("WebSocket URL not configured");
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.wsUrl!);

      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id && this.pendingCalls.has(data.id)) {
          const { resolve } = this.pendingCalls.get(data.id)!;
          this.pendingCalls.delete(data.id);
          resolve(data.result);
        }
      };
    });
  }

  // ============================================================================
  // Mock Implementations
  // ============================================================================

  private mockCreateWall(args: Record<string, unknown>): MCPToolResult {
    const start = args.start as number[];
    const end = args.end as number[];
    const height = (args.height as number) || 3.0;
    const thickness = (args.thickness as number) || 0.2;

    const length = Math.sqrt(
      Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2),
    );

    return {
      success: true,
      data: {
        wall_id: crypto.randomUUID(),
        length: Math.round(length * 1000) / 1000,
        height,
        thickness,
        wall_type: args.wall_type || "basic",
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private mockCreateFloor(args: Record<string, unknown>): MCPToolResult {
    const minPoint = args.min_point as number[];
    const maxPoint = args.max_point as number[];
    const thickness = (args.thickness as number) || 0.3;

    const area = Math.abs(
      (maxPoint[0] - minPoint[0]) * (maxPoint[1] - minPoint[1]),
    );

    return {
      success: true,
      data: {
        floor_id: crypto.randomUUID(),
        area: Math.round(area * 1000) / 1000,
        thickness,
        floor_type: args.floor_type || "slab",
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private mockCreateRoom(args: Record<string, unknown>): MCPToolResult {
    const minPoint = args.min_point as number[];
    const maxPoint = args.max_point as number[];
    const height = (args.height as number) || 3.0;

    const area = Math.abs(
      (maxPoint[0] - minPoint[0]) * (maxPoint[1] - minPoint[1]),
    );
    const volume = area * height;

    return {
      success: true,
      data: {
        room_id: crypto.randomUUID(),
        name: args.name,
        number: args.number,
        area: Math.round(area * 1000) / 1000,
        volume: Math.round(volume * 1000) / 1000,
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private mockCreateRoof(args: Record<string, unknown>): MCPToolResult {
    const minPoint = args.min_point as number[];
    const maxPoint = args.max_point as number[];

    const footprintArea = Math.abs(
      (maxPoint[0] - minPoint[0]) * (maxPoint[1] - minPoint[1]),
    );

    return {
      success: true,
      data: {
        roof_id: crypto.randomUUID(),
        roof_type: args.roof_type || "flat",
        slope_degrees: args.slope_degrees || 30,
        footprint_area: Math.round(footprintArea * 1000) / 1000,
        surface_area: Math.round(footprintArea * 1.15 * 1000) / 1000,
        ridge_height: args.roof_type === "flat" ? 0 : 2.5,
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private mockPlaceDoor(args: Record<string, unknown>): MCPToolResult {
    return {
      success: true,
      data: {
        door_id: crypto.randomUUID(),
        wall_id: args.wall_id,
        width: args.width || 0.9,
        height: args.height || 2.1,
        door_type: args.door_type || "single",
        swing: args.swing || "left",
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private mockPlaceWindow(args: Record<string, unknown>): MCPToolResult {
    return {
      success: true,
      data: {
        window_id: crypto.randomUUID(),
        wall_id: args.wall_id,
        width: args.width || 1.2,
        height: args.height || 1.0,
        sill_height: args.sill_height || 0.9,
        window_type: args.window_type || "fixed",
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private mockListElements(args: Record<string, unknown>): MCPToolResult {
    const category = args.category as string | undefined;

    // Mock element list
    const mockElements = [
      { id: "wall-1", type: "wall", created_at: new Date().toISOString() },
      { id: "wall-2", type: "wall", created_at: new Date().toISOString() },
      { id: "floor-1", type: "floor", created_at: new Date().toISOString() },
      { id: "room-1", type: "room", created_at: new Date().toISOString() },
    ];

    const filtered = category
      ? mockElements.filter((e) => e.type === category)
      : mockElements;

    return {
      success: true,
      data: {
        elements: filtered,
        count: filtered.length,
        total: mockElements.length,
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private mockGetElement(args: Record<string, unknown>): MCPToolResult {
    const elementId = args.element_id as string;

    return {
      success: true,
      data: {
        id: elementId,
        type: "wall",
        length: 5.0,
        height: 3.0,
        thickness: 0.2,
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private mockDeleteElement(args: Record<string, unknown>): MCPToolResult {
    const elementIds = args.element_ids as string[];

    return {
      success: true,
      data: {
        deleted: elementIds,
        deleted_count: elementIds.length,
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private mockDetectRooms(_args: Record<string, unknown>): MCPToolResult {
    return {
      success: true,
      data: {
        rooms: [
          {
            id: crypto.randomUUID(),
            area: 25.0,
            centroid: [2.5, 2.5],
            node_count: 4,
            edge_count: 4,
          },
        ],
        room_count: 1,
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private mockAnalyzeTopology(_args: Record<string, unknown>): MCPToolResult {
    return {
      success: true,
      data: {
        node_count: 6,
        edge_count: 5,
        room_count: 2,
        interior_room_count: 1,
        is_connected: true,
        rooms: [
          {
            id: crypto.randomUUID(),
            area: 25.0,
            is_exterior: false,
          },
          {
            id: crypto.randomUUID(),
            area: 100.0,
            is_exterior: true,
          },
        ],
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  private mockGetStateSummary(): MCPToolResult {
    return {
      success: true,
      data: {
        element_counts: {
          wall: 4,
          floor: 1,
          door: 2,
          window: 3,
          room: 1,
          roof: 0,
        },
        total_elements: 11,
        selected_count: 0,
        join_count: 4,
        group_count: 0,
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }
}

// Singleton instance
export const mcpClient = new MCPClient({
  mode: "mock", // Change to "http" or "websocket" for production
  baseUrl: "http://localhost:8000/mcp",
  wsUrl: "ws://localhost:8000/mcp/ws",
});

export default mcpClient;
