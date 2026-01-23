/**
 * MCPClient - Unified MCP Client with Server-Aware Routing
 *
 * Provides a singleton/factory interface for communicating with multiple
 * MCP tool servers (geometry-server, spatial-server, validation-server, documentation-server).
 *
 * Features:
 * - Server-aware routing via callTool(server, tool, params)
 * - JSON-RPC 2.0 message formatting
 * - Connection management with pooling
 * - Automatic reconnection logic
 * - Server health checks
 * - Environment-based configuration
 */

import type {
  IMCPClient,
  MCPToolCall,
  MCPToolCallWithOptions,
  MCPToolResult,
  MCPClientMode,
  MCPToolCallOptions,
} from "./types";
import { HttpMCPClient } from "./HttpMCPClient";
import { WebSocketMCPClient } from "./WebSocketMCPClient";
import { MockMCPClient } from "./MockMCPClient";
import {
  estimateRequestTokens,
  estimateResponseTokens,
  type TokenUsage,
} from "./tokenCounter";
import { useTokenStore } from "../../stores/tokenStore";
import { getMCPLogger, type MCPToolLogger } from "./logging";

/**
 * Available MCP server names
 */
export type MCPServerName =
  | "geometry"
  | "spatial"
  | "validation"
  | "documentation";

/**
 * Server configuration for each MCP server
 */
export interface MCPServerConfig {
  /** Base URL for the server */
  baseUrl: string;
  /** WebSocket URL for the server (optional) */
  wsUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether the server is enabled */
  enabled?: boolean;
}

/**
 * MCPClient configuration
 */
export interface MCPClientConfig {
  /** Client mode */
  mode: MCPClientMode;
  /** Server configurations by name */
  servers: Partial<Record<MCPServerName, MCPServerConfig>>;
  /** Default timeout in milliseconds */
  defaultTimeout?: number;
  /** Enable auto-reconnect for WebSocket connections */
  autoReconnect?: boolean;
  /** Health check interval in milliseconds (0 to disable) */
  healthCheckInterval?: number;
}

/**
 * Server health status
 */
export interface ServerHealth {
  server: MCPServerName;
  healthy: boolean;
  lastCheck: Date;
  latencyMs?: number;
  error?: string;
}

/**
 * JSON-RPC 2.0 Request
 */
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * JSON-RPC 2.0 Response
 */
interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string;
  result?: MCPToolResult;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Default server URLs
 */
const DEFAULT_SERVER_URLS: Record<MCPServerName, MCPServerConfig> = {
  geometry: {
    baseUrl: "http://localhost:8001",
    wsUrl: "ws://localhost:8001/ws",
    enabled: true,
  },
  spatial: {
    baseUrl: "http://localhost:8002",
    wsUrl: "ws://localhost:8002/ws",
    enabled: true,
  },
  validation: {
    baseUrl: "http://localhost:8003",
    wsUrl: "ws://localhost:8003/ws",
    enabled: true,
  },
  documentation: {
    baseUrl: "http://localhost:8004",
    wsUrl: "ws://localhost:8004/ws",
    enabled: true,
  },
};

/**
 * Environment variable names for server configuration
 */
const ENV_VARS = {
  MODE: "VITE_MCP_MODE",
  GEOMETRY_URL: "VITE_MCP_GEOMETRY_URL",
  SPATIAL_URL: "VITE_MCP_SPATIAL_URL",
  VALIDATION_URL: "VITE_MCP_VALIDATION_URL",
  DOCUMENTATION_URL: "VITE_MCP_DOCUMENTATION_URL",
  DEFAULT_TIMEOUT: "VITE_MCP_TIMEOUT",
  HEALTH_CHECK_INTERVAL: "VITE_MCP_HEALTH_CHECK_INTERVAL",
};

/**
 * Get environment variable value
 */
function getEnv(key: string): string | undefined {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
}

/**
 * Get configuration from environment
 */
function getConfigFromEnv(): MCPClientConfig {
  const mode = (getEnv(ENV_VARS.MODE) as MCPClientMode) || "mock";
  const timeout = parseInt(getEnv(ENV_VARS.DEFAULT_TIMEOUT) || "30000", 10);
  const healthInterval = parseInt(
    getEnv(ENV_VARS.HEALTH_CHECK_INTERVAL) || "0",
    10
  );

  return {
    mode,
    defaultTimeout: timeout,
    healthCheckInterval: healthInterval,
    autoReconnect: true,
    servers: {
      geometry: {
        ...DEFAULT_SERVER_URLS.geometry,
        baseUrl:
          getEnv(ENV_VARS.GEOMETRY_URL) || DEFAULT_SERVER_URLS.geometry.baseUrl,
      },
      spatial: {
        ...DEFAULT_SERVER_URLS.spatial,
        baseUrl:
          getEnv(ENV_VARS.SPATIAL_URL) || DEFAULT_SERVER_URLS.spatial.baseUrl,
      },
      validation: {
        ...DEFAULT_SERVER_URLS.validation,
        baseUrl:
          getEnv(ENV_VARS.VALIDATION_URL) ||
          DEFAULT_SERVER_URLS.validation.baseUrl,
      },
      documentation: {
        ...DEFAULT_SERVER_URLS.documentation,
        baseUrl:
          getEnv(ENV_VARS.DOCUMENTATION_URL) ||
          DEFAULT_SERVER_URLS.documentation.baseUrl,
      },
    },
  };
}

/**
 * MCPClient - Main MCP client class with server-aware routing
 */
export class MCPClient implements IMCPClient {
  private config: MCPClientConfig;
  private clients: Map<MCPServerName, IMCPClient> = new Map();
  private mockClient: MockMCPClient | null = null;
  private healthStatus: Map<MCPServerName, ServerHealth> = new Map();
  private healthCheckIntervalId: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts: Map<MCPServerName, number> = new Map();
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private enableTokenTracking = true;
  private lastTokenUsage: TokenUsage | null = null;
  private logger: MCPToolLogger;
  private enableLogging = true;

  constructor(config?: Partial<MCPClientConfig>) {
    const envConfig = getConfigFromEnv();
    this.config = {
      ...envConfig,
      ...config,
      servers: { ...envConfig.servers, ...config?.servers },
    };

    this.logger = getMCPLogger();
    this.initializeClients();
    this.startHealthChecks();
  }

  /**
   * Initialize clients for each server
   */
  private initializeClients(): void {
    if (this.config.mode === "mock") {
      this.mockClient = new MockMCPClient();
      return;
    }

    const serverNames: MCPServerName[] = [
      "geometry",
      "spatial",
      "validation",
      "documentation",
    ];

    for (const serverName of serverNames) {
      const serverConfig = this.config.servers[serverName];
      if (!serverConfig?.enabled) continue;

      const client = this.createClientForServer(serverName, serverConfig);
      if (client) {
        this.clients.set(serverName, client);
        this.reconnectAttempts.set(serverName, 0);
      }
    }
  }

  /**
   * Create a client for a specific server
   */
  private createClientForServer(
    _serverName: MCPServerName,
    serverConfig: MCPServerConfig
  ): IMCPClient | null {
    switch (this.config.mode) {
      case "http":
        return new HttpMCPClient({
          baseUrl: serverConfig.baseUrl,
          timeout: serverConfig.timeout || this.config.defaultTimeout,
        });

      case "websocket":
        if (!serverConfig.wsUrl) {
          console.warn(
            `No WebSocket URL for server ${_serverName}, falling back to HTTP`
          );
          return new HttpMCPClient({
            baseUrl: serverConfig.baseUrl,
            timeout: serverConfig.timeout || this.config.defaultTimeout,
          });
        }
        return new WebSocketMCPClient({
          wsUrl: serverConfig.wsUrl,
          timeout: serverConfig.timeout || this.config.defaultTimeout,
          autoReconnect: this.config.autoReconnect,
        });

      default:
        return null;
    }
  }

  /**
   * Get the current mode
   */
  getMode(): MCPClientMode {
    return this.config.mode;
  }

  /**
   * Check if in mock mode
   */
  isMockMode(): boolean {
    return this.config.mode === "mock";
  }

  /**
   * Call an MCP tool (implements IMCPClient interface)
   * Routes to the appropriate server based on tool name prefix
   */
  async callTool(
    call: MCPToolCall | MCPToolCallWithOptions
  ): Promise<MCPToolResult> {
    // Infer server from tool name if possible
    const server = this.inferServerFromTool(call.tool);
    if (!server) {
      return {
        success: false,
        error: {
          code: -32601,
          message: `Cannot determine server for tool: ${call.tool}`,
          data: { tool: call.tool },
        },
        timestamp: new Date().toISOString(),
      };
    }

    return this.callToolOnServer(server, call.tool, call.arguments,
      "options" in call ? call.options : undefined);
  }

  /**
   * Call an MCP tool on a specific server
   *
   * @param server - The target MCP server
   * @param tool - The tool name
   * @param params - Tool parameters
   * @param options - Optional call options
   */
  async callToolOnServer(
    server: MCPServerName,
    tool: string,
    params: Record<string, unknown>,
    options?: MCPToolCallOptions
  ): Promise<MCPToolResult> {
    // Generate request ID for logging
    const requestId = crypto.randomUUID();

    // Estimate input tokens before call
    const inputTokens = this.enableTokenTracking
      ? estimateRequestTokens(tool, params)
      : 0;

    // Log request
    if (this.enableLogging) {
      this.logger.logRequest(requestId, { tool, arguments: params }, server);
    }

    // Use mock client if in mock mode
    if (this.mockClient) {
      const result = await this.mockClient.callTool({ tool, arguments: params });
      this.trackTokenUsage(tool, inputTokens, result);
      if (this.enableLogging) {
        this.logger.logResponse(requestId, tool, result, server);
      }
      return result;
    }

    const client = this.clients.get(server);
    if (!client) {
      const result: MCPToolResult = {
        success: false,
        error: {
          code: -32002,
          message: `Server not available: ${server}`,
          data: {
            server,
            availableServers: Array.from(this.clients.keys()),
          },
        },
        timestamp: new Date().toISOString(),
      };
      if (this.enableLogging) {
        this.logger.logError(requestId, tool, result.error!, server);
      }
      return result;
    }

    // Check server health before making call
    const health = this.healthStatus.get(server);
    if (health && !health.healthy) {
      // Attempt reconnection
      const reconnected = await this.attemptReconnect(server);
      if (!reconnected) {
        const result: MCPToolResult = {
          success: false,
          error: {
            code: -32003,
            message: `Server unhealthy: ${server}`,
            data: {
              server,
              lastError: health.error,
              lastCheck: health.lastCheck.toISOString(),
            },
          },
          timestamp: new Date().toISOString(),
        };
        if (this.enableLogging) {
          this.logger.logError(requestId, tool, result.error!, server);
        }
        return result;
      }
    }

    try {
      const call: MCPToolCallWithOptions = {
        tool,
        arguments: params,
        options,
      };
      const result = await client.callTool(call);

      // Track token usage on successful call
      this.trackTokenUsage(tool, inputTokens, result);

      // Log response
      if (this.enableLogging) {
        if (result.success) {
          this.logger.logResponse(requestId, tool, result, server);
        } else {
          this.logger.logError(requestId, tool, result.error!, server);
        }
      }

      return result;
    } catch (error) {
      // Mark server as unhealthy on error
      this.healthStatus.set(server, {
        server,
        healthy: false,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Log error
      if (this.enableLogging) {
        this.logger.logError(
          requestId,
          tool,
          error instanceof Error ? error : { code: -32603, message: String(error) },
          server
        );
      }

      return {
        success: false,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Unknown error",
          data: { server, tool },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Track token usage for a tool call
   */
  private trackTokenUsage(
    tool: string,
    inputTokens: number,
    result: MCPToolResult
  ): void {
    if (!this.enableTokenTracking) return;

    const outputTokens = estimateResponseTokens(result);
    const usage = useTokenStore.getState().recordToolCall(tool, inputTokens, outputTokens);
    this.lastTokenUsage = usage;
  }

  /**
   * Get the last token usage
   */
  getLastTokenUsage(): TokenUsage | null {
    return this.lastTokenUsage;
  }

  /**
   * Enable or disable token tracking
   */
  setTokenTracking(enabled: boolean): void {
    this.enableTokenTracking = enabled;
  }

  /**
   * Check if token tracking is enabled
   */
  isTokenTrackingEnabled(): boolean {
    return this.enableTokenTracking;
  }

  /**
   * Enable or disable tool call logging
   */
  setLogging(enabled: boolean): void {
    this.enableLogging = enabled;
  }

  /**
   * Check if logging is enabled
   */
  isLoggingEnabled(): boolean {
    return this.enableLogging;
  }

  /**
   * Get the logger instance
   */
  getLogger(): MCPToolLogger {
    return this.logger;
  }

  /**
   * Infer the target server from a tool name
   */
  private inferServerFromTool(tool: string): MCPServerName | null {
    // Geometry tools
    if (
      tool.startsWith("create_") ||
      tool.startsWith("place_") ||
      tool === "compute_mesh"
    ) {
      return "geometry";
    }

    // Spatial tools
    if (
      tool === "detect_rooms" ||
      tool.startsWith("analyze_") ||
      tool === "compute_adjacency" ||
      tool === "find_nearest" ||
      tool === "compute_area" ||
      tool === "check_clearance" ||
      tool === "point_in_polygon"
    ) {
      return "spatial";
    }

    // Validation tools (check_ prefix, but not check_clearance which is spatial)
    if (
      (tool.startsWith("check_") && tool !== "check_clearance") ||
      tool.startsWith("detect_clash") ||
      tool === "validate_model"
    ) {
      return "validation";
    }

    // Documentation tools
    if (
      tool.startsWith("generate_") ||
      tool.startsWith("export_") ||
      tool === "create_schedule"
    ) {
      return "documentation";
    }

    // Query tools (default to geometry server)
    if (
      tool === "list_elements" ||
      tool === "get_element" ||
      tool === "delete_element" ||
      tool === "modify_element" ||
      tool === "get_state_summary"
    ) {
      return "geometry";
    }

    return null;
  }

  /**
   * Format a JSON-RPC 2.0 request
   */
  formatJsonRpcRequest(
    tool: string,
    params: Record<string, unknown>
  ): JsonRpcRequest {
    return {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "tools/call",
      params: {
        name: tool,
        arguments: params,
      },
    };
  }

  /**
   * Parse a JSON-RPC 2.0 response
   */
  parseJsonRpcResponse(response: JsonRpcResponse): MCPToolResult {
    if (response.error) {
      return {
        success: false,
        error: {
          code: response.error.code,
          message: response.error.message,
          data: response.error.data as Record<string, unknown> | undefined,
        },
        timestamp: new Date().toISOString(),
      };
    }

    return response.result || { success: true };
  }

  /**
   * Check health of a specific server
   */
  async checkServerHealth(server: MCPServerName): Promise<ServerHealth> {
    const startTime = Date.now();

    if (this.mockClient) {
      const health: ServerHealth = {
        server,
        healthy: true,
        lastCheck: new Date(),
        latencyMs: 0,
      };
      this.healthStatus.set(server, health);
      return health;
    }

    const client = this.clients.get(server);
    if (!client) {
      const health: ServerHealth = {
        server,
        healthy: false,
        lastCheck: new Date(),
        error: "Server not configured",
      };
      this.healthStatus.set(server, health);
      return health;
    }

    try {
      // Use a simple health check tool call
      const result = await client.callTool({
        tool: "health_check",
        arguments: {},
      });

      const latencyMs = Date.now() - startTime;
      const health: ServerHealth = {
        server,
        healthy: result.success,
        lastCheck: new Date(),
        latencyMs,
        error: result.error?.message,
      };

      this.healthStatus.set(server, health);
      this.reconnectAttempts.set(server, 0); // Reset on success
      return health;
    } catch (error) {
      const health: ServerHealth = {
        server,
        healthy: false,
        lastCheck: new Date(),
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Health check failed",
      };
      this.healthStatus.set(server, health);
      return health;
    }
  }

  /**
   * Check health of all servers
   */
  async checkAllServerHealth(): Promise<ServerHealth[]> {
    const servers: MCPServerName[] = [
      "geometry",
      "spatial",
      "validation",
      "documentation",
    ];
    const results = await Promise.all(
      servers.map((server) => this.checkServerHealth(server))
    );
    return results;
  }

  /**
   * Get current health status for all servers
   */
  getHealthStatus(): Map<MCPServerName, ServerHealth> {
    return new Map(this.healthStatus);
  }

  /**
   * Attempt to reconnect to a server
   */
  private async attemptReconnect(server: MCPServerName): Promise<boolean> {
    const attempts = this.reconnectAttempts.get(server) || 0;
    if (attempts >= this.maxReconnectAttempts) {
      return false;
    }

    this.reconnectAttempts.set(server, attempts + 1);

    // Wait before reconnecting
    await new Promise((resolve) =>
      setTimeout(resolve, this.reconnectDelay * Math.pow(2, attempts))
    );

    // For WebSocket clients, we may need to explicitly reconnect
    const client = this.clients.get(server);
    if (client && client.getMode() === "websocket") {
      const wsClient = client as WebSocketMCPClient;
      try {
        await wsClient.connect();
        const health = await this.checkServerHealth(server);
        return health.healthy;
      } catch {
        return false;
      }
    }

    // For HTTP, just check health
    const health = await this.checkServerHealth(server);
    return health.healthy;
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (
      this.config.healthCheckInterval &&
      this.config.healthCheckInterval > 0
    ) {
      this.healthCheckIntervalId = setInterval(() => {
        this.checkAllServerHealth().catch(console.error);
      }, this.config.healthCheckInterval);
    }
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
  }

  /**
   * Get available servers
   */
  getAvailableServers(): MCPServerName[] {
    if (this.mockClient) {
      return ["geometry", "spatial", "validation", "documentation"];
    }
    return Array.from(this.clients.keys());
  }

  /**
   * Update server configuration
   */
  updateServerConfig(
    server: MCPServerName,
    config: Partial<MCPServerConfig>
  ): void {
    const currentConfig = this.config.servers[server] || {};
    this.config.servers[server] = { ...currentConfig, ...config };

    // Recreate client with new config
    if (this.config.mode !== "mock") {
      const newClient = this.createClientForServer(
        server,
        this.config.servers[server]!
      );
      if (newClient) {
        this.clients.set(server, newClient);
      }
    }
  }

  /**
   * Disconnect all clients
   */
  disconnect(): void {
    this.stopHealthChecks();

    for (const [serverName, client] of this.clients) {
      if (client.getMode() === "websocket") {
        (client as WebSocketMCPClient).disconnect();
      }
      this.clients.delete(serverName);
    }

    this.mockClient = null;
  }
}

// Singleton instance
let mcpClientInstance: MCPClient | null = null;

/**
 * Get the singleton MCPClient instance
 */
export function getMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient();
  }
  return mcpClientInstance;
}

/**
 * Create a new MCPClient instance (for testing or custom configuration)
 */
export function createMCPClientInstance(
  config?: Partial<MCPClientConfig>
): MCPClient {
  return new MCPClient(config);
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetMCPClient(): void {
  if (mcpClientInstance) {
    mcpClientInstance.disconnect();
    mcpClientInstance = null;
  }
}

export default MCPClient;
