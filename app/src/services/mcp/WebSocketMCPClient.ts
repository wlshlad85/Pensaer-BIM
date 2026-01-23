/**
 * WebSocket MCP Client
 *
 * MCP client using WebSocket for real-time bidirectional communication.
 */

import type {
  IMCPClient,
  MCPToolCall,
  MCPToolResult,
  MCPClientMode,
} from "./types";

/**
 * WebSocket client configuration
 */
export interface WebSocketClientConfig {
  /** WebSocket URL (e.g., ws://localhost:8000/mcp/ws) */
  wsUrl: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in milliseconds */
  reconnectDelay?: number;
  /** Max reconnect attempts */
  maxReconnectAttempts?: number;
}

/**
 * WebSocket MCP Client for real-time communication
 */
export class WebSocketMCPClient implements IMCPClient {
  private config: Required<WebSocketClientConfig>;
  private ws: WebSocket | null = null;
  private pendingCalls: Map<
    string,
    { resolve: (result: MCPToolResult) => void; reject: (error: Error) => void }
  > = new Map();
  private reconnectAttempts = 0;
  private isConnecting = false;

  constructor(config: WebSocketClientConfig) {
    this.config = {
      timeout: 30000,
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
      ...config,
    };
  }

  /**
   * Get the current mode
   */
  getMode(): MCPClientMode {
    return "websocket";
  }

  /**
   * Check if in mock mode (always false)
   */
  isMockMode(): boolean {
    return false;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnected() || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        reject(error);
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Reject all pending calls
    for (const [id, { reject }] of this.pendingCalls) {
      reject(new Error("Connection closed"));
      this.pendingCalls.delete(id);
    }
  }

  /**
   * Call an MCP tool via WebSocket
   */
  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    // Ensure connected
    if (!this.isConnected()) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const callId = crypto.randomUUID();

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (this.pendingCalls.has(callId)) {
          this.pendingCalls.delete(callId);
          reject(new Error("Tool call timed out"));
        }
      }, this.config.timeout);

      // Store pending call
      this.pendingCalls.set(callId, {
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });

      // Send JSON-RPC request
      this.ws!.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: {
            name: call.tool,
            arguments: call.arguments,
          },
        })
      );
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      if (data.id && this.pendingCalls.has(data.id)) {
        const { resolve, reject } = this.pendingCalls.get(data.id)!;
        this.pendingCalls.delete(data.id);

        if (data.error) {
          reject(new Error(data.error.message));
        } else {
          resolve(data.result);
        }
      }
    } catch {
      console.error("Failed to parse WebSocket message:", event.data);
    }
  }

  /**
   * Handle WebSocket disconnect
   */
  private handleDisconnect(): void {
    this.ws = null;

    // Reject all pending calls
    for (const [id, { reject }] of this.pendingCalls) {
      reject(new Error("Connection lost"));
      this.pendingCalls.delete(id);
    }

    // Auto-reconnect if enabled
    if (
      this.config.autoReconnect &&
      this.reconnectAttempts < this.config.maxReconnectAttempts
    ) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect().catch(() => {
          // Reconnect failed, will retry if within max attempts
        });
      }, this.config.reconnectDelay);
    }
  }

  /**
   * Get current WebSocket URL
   */
  getWsUrl(): string {
    return this.config.wsUrl;
  }
}

export default WebSocketMCPClient;
