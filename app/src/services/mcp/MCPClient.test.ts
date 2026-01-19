/**
 * MCPClient Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MCPClient,
  getMCPClient,
  createMCPClientInstance,
  resetMCPClient,
  type MCPServerName,
} from "./MCPClient";

describe("MCPClient", () => {
  beforeEach(() => {
    // Reset singleton and stub environment
    resetMCPClient();
    vi.stubEnv("VITE_MCP_MODE", "mock");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetMCPClient();
  });

  describe("constructor and initialization", () => {
    it("should create a client in mock mode by default", () => {
      const client = new MCPClient({ mode: "mock" });
      expect(client.getMode()).toBe("mock");
      expect(client.isMockMode()).toBe(true);
    });

    it("should list all servers as available in mock mode", () => {
      const client = new MCPClient({ mode: "mock" });
      const servers = client.getAvailableServers();
      expect(servers).toContain("geometry");
      expect(servers).toContain("spatial");
      expect(servers).toContain("validation");
      expect(servers).toContain("documentation");
    });
  });

  describe("callTool with server inference", () => {
    it("should route create_wall to geometry server", async () => {
      const client = new MCPClient({ mode: "mock" });
      const result = await client.callTool({
        tool: "create_wall",
        arguments: {
          start: [0, 0],
          end: [5, 0],
          height: 3,
          thickness: 0.2,
        },
      });
      expect(result.success).toBe(true);
    });

    it("should route place_door to geometry server", async () => {
      const client = new MCPClient({ mode: "mock" });
      const result = await client.callTool({
        tool: "place_door",
        arguments: {
          wall_id: "test-wall",
          position: 2.5,
          width: 0.9,
          height: 2.1,
        },
      });
      expect(result.success).toBe(true);
    });

    it("should route list_elements to geometry server", async () => {
      const client = new MCPClient({ mode: "mock" });
      const result = await client.callTool({
        tool: "list_elements",
        arguments: {},
      });
      expect(result.success).toBe(true);
    });

    it("should route detect_rooms to spatial server", async () => {
      const client = new MCPClient({ mode: "mock" });
      const result = await client.callTool({
        tool: "detect_rooms",
        arguments: {},
      });
      expect(result.success).toBe(true);
    });

    it("should route detect_clashes to validation server", async () => {
      const client = new MCPClient({ mode: "mock" });
      const result = await client.callTool({
        tool: "detect_clashes",
        arguments: {},
      });
      expect(result.success).toBe(true);
    });

    it("should return error for unknown tool", async () => {
      const client = new MCPClient({ mode: "mock" });
      const result = await client.callTool({
        tool: "unknown_tool_xyz",
        arguments: {},
      });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(-32601);
    });
  });

  describe("callToolOnServer", () => {
    it("should call tool on specific server", async () => {
      const client = new MCPClient({ mode: "mock" });
      const result = await client.callToolOnServer("geometry", "create_wall", {
        start: [0, 0],
        end: [5, 0],
        height: 3,
        thickness: 0.2,
      });
      expect(result.success).toBe(true);
    });

    it("should return error for unavailable server in non-mock mode", async () => {
      const client = new MCPClient({
        mode: "http",
        servers: {
          geometry: { baseUrl: "http://localhost:8001", enabled: false },
        },
      });
      const result = await client.callToolOnServer("geometry", "create_wall", {
        start: [0, 0],
        end: [5, 0],
      });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(-32002);
    });
  });

  describe("JSON-RPC formatting", () => {
    it("should format valid JSON-RPC 2.0 request", () => {
      const client = new MCPClient({ mode: "mock" });
      const request = client.formatJsonRpcRequest("create_wall", {
        start: [0, 0],
        end: [5, 0],
      });

      expect(request.jsonrpc).toBe("2.0");
      expect(request.id).toBeDefined();
      expect(request.method).toBe("tools/call");
      expect(request.params.name).toBe("create_wall");
      expect(request.params.arguments).toEqual({
        start: [0, 0],
        end: [5, 0],
      });
    });

    it("should parse JSON-RPC 2.0 success response", () => {
      const client = new MCPClient({ mode: "mock" });
      const response = client.parseJsonRpcResponse({
        jsonrpc: "2.0",
        id: "test-id",
        result: {
          success: true,
          data: { wall_id: "w1" },
        },
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ wall_id: "w1" });
    });

    it("should parse JSON-RPC 2.0 error response", () => {
      const client = new MCPClient({ mode: "mock" });
      const response = client.parseJsonRpcResponse({
        jsonrpc: "2.0",
        id: "test-id",
        error: {
          code: -32601,
          message: "Method not found",
        },
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(-32601);
      expect(response.error?.message).toBe("Method not found");
    });
  });

  describe("health checks", () => {
    it("should return healthy for mock servers", async () => {
      const client = new MCPClient({ mode: "mock" });
      const health = await client.checkServerHealth("geometry");

      expect(health.server).toBe("geometry");
      expect(health.healthy).toBe(true);
      expect(health.latencyMs).toBe(0);
    });

    it("should check health of all servers", async () => {
      const client = new MCPClient({ mode: "mock" });
      const healthResults = await client.checkAllServerHealth();

      expect(healthResults.length).toBe(4);
      for (const health of healthResults) {
        expect(health.healthy).toBe(true);
      }
    });

    it("should track health status", async () => {
      const client = new MCPClient({ mode: "mock" });
      await client.checkServerHealth("geometry");

      const status = client.getHealthStatus();
      expect(status.has("geometry")).toBe(true);
      expect(status.get("geometry")?.healthy).toBe(true);
    });
  });

  describe("server configuration", () => {
    it("should update server configuration", () => {
      const client = new MCPClient({ mode: "mock" });
      client.updateServerConfig("geometry", {
        baseUrl: "http://newhost:9000",
      });

      // Configuration is updated (internal state)
      expect(client.getAvailableServers()).toContain("geometry");
    });
  });

  describe("singleton pattern", () => {
    it("should return same instance from getMCPClient", () => {
      const client1 = getMCPClient();
      const client2 = getMCPClient();
      expect(client1).toBe(client2);
    });

    it("should create new instance from createMCPClientInstance", () => {
      const client1 = getMCPClient();
      const client2 = createMCPClientInstance({ mode: "mock" });
      expect(client1).not.toBe(client2);
    });

    it("should reset singleton on resetMCPClient", () => {
      const client1 = getMCPClient();
      resetMCPClient();
      const client2 = getMCPClient();
      expect(client1).not.toBe(client2);
    });
  });

  describe("disconnect", () => {
    it("should disconnect cleanly", () => {
      const client = new MCPClient({ mode: "mock" });
      expect(() => client.disconnect()).not.toThrow();
    });

    it("should stop health checks on disconnect", () => {
      const client = new MCPClient({
        mode: "mock",
        healthCheckInterval: 1000,
      });
      expect(() => client.disconnect()).not.toThrow();
    });
  });

  describe("tool routing inference", () => {
    it("should infer geometry server for create_ tools", async () => {
      const client = new MCPClient({ mode: "mock" });

      const tools = [
        "create_wall",
        "create_floor",
        "create_room",
        "create_roof",
      ];
      for (const tool of tools) {
        const result = await client.callTool({ tool, arguments: {} });
        // Should not return "cannot determine server" error
        expect(result.error?.code).not.toBe(-32601);
      }
    });

    it("should infer geometry server for place_ tools", async () => {
      const client = new MCPClient({ mode: "mock" });

      const tools = ["place_door", "place_window"];
      for (const tool of tools) {
        const result = await client.callTool({ tool, arguments: {} });
        expect(result.error?.code).not.toBe(-32601);
      }
    });

    it("should infer spatial server for detect_rooms", async () => {
      const client = new MCPClient({ mode: "mock" });
      const result = await client.callTool({
        tool: "detect_rooms",
        arguments: {},
      });
      expect(result.error?.code).not.toBe(-32601);
    });

    it("should infer validation server for detect_clash tools", async () => {
      const client = new MCPClient({ mode: "mock" });
      const result = await client.callTool({
        tool: "detect_clashes",
        arguments: {},
      });
      expect(result.error?.code).not.toBe(-32601);
    });
  });
});
