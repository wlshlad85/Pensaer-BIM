/**
 * MCP Client Factory Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMCPClient,
  createMockClient,
  createHttpClient,
  createWebSocketClient,
  isMockModeEnabled,
  getCurrentMode,
} from "./factory";
import { MockMCPClient } from "./MockMCPClient";
import { HttpMCPClient } from "./HttpMCPClient";
import { WebSocketMCPClient } from "./WebSocketMCPClient";

describe("MCP Client Factory", () => {
  // Save original env
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    // Reset env before each test
    vi.stubEnv("VITE_MCP_MOCK_MODE", undefined);
    vi.stubEnv("VITE_MCP_MODE", undefined);
    vi.stubEnv("VITE_MCP_BASE_URL", undefined);
    vi.stubEnv("VITE_MCP_WS_URL", undefined);
    vi.stubEnv("VITE_MCP_MOCK_DELAY", undefined);
    vi.stubEnv("VITE_MCP_MOCK_ERRORS", undefined);
    vi.stubEnv("NODE_ENV", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("createMCPClient", () => {
    it("should create mock client when VITE_MCP_MOCK_MODE=true", () => {
      vi.stubEnv("VITE_MCP_MOCK_MODE", "true");
      const client = createMCPClient();
      expect(client.getMode()).toBe("mock");
    });

    it("should create mock client when VITE_MCP_MOCK_MODE=1", () => {
      vi.stubEnv("VITE_MCP_MOCK_MODE", "1");
      const client = createMCPClient();
      expect(client.getMode()).toBe("mock");
    });

    it("should create mock client when VITE_MCP_MODE=mock", () => {
      vi.stubEnv("VITE_MCP_MODE", "mock");
      const client = createMCPClient();
      expect(client.getMode()).toBe("mock");
    });

    it("should create http client when VITE_MCP_MODE=http", () => {
      vi.stubEnv("VITE_MCP_MODE", "http");
      const client = createMCPClient();
      expect(client.getMode()).toBe("http");
    });

    it("should create websocket client when VITE_MCP_MODE=websocket", () => {
      vi.stubEnv("VITE_MCP_MODE", "websocket");
      const client = createMCPClient();
      expect(client.getMode()).toBe("websocket");
    });
  });

  describe("createMockClient", () => {
    it("should create a mock client", () => {
      const client = createMockClient();
      expect(client).toBeInstanceOf(MockMCPClient);
      expect(client.getMode()).toBe("mock");
    });

    it("should accept custom config", () => {
      const client = createMockClient({ baseDelay: 500 });
      const config = client.getConfig();
      expect(config.baseDelay).toBe(500);
    });
  });

  describe("createHttpClient", () => {
    it("should create an http client", () => {
      const client = createHttpClient("http://localhost:3000");
      expect(client).toBeInstanceOf(HttpMCPClient);
      expect(client.getMode()).toBe("http");
    });

    it("should use provided base URL", () => {
      const client = createHttpClient("http://custom:8080");
      expect(client.getBaseUrl()).toBe("http://custom:8080");
    });
  });

  describe("createWebSocketClient", () => {
    it("should create a websocket client", () => {
      const client = createWebSocketClient("ws://localhost:8000/ws");
      expect(client).toBeInstanceOf(WebSocketMCPClient);
      expect(client.getMode()).toBe("websocket");
    });

    it("should use provided ws URL", () => {
      const client = createWebSocketClient("ws://custom:9000/mcp");
      expect(client.getWsUrl()).toBe("ws://custom:9000/mcp");
    });
  });

  describe("isMockModeEnabled", () => {
    it("should return true when mock mode is enabled", () => {
      vi.stubEnv("VITE_MCP_MOCK_MODE", "true");
      expect(isMockModeEnabled()).toBe(true);
    });

    it("should return false when http mode is set", () => {
      vi.stubEnv("VITE_MCP_MODE", "http");
      expect(isMockModeEnabled()).toBe(false);
    });
  });

  describe("getCurrentMode", () => {
    it("should return mock when mock mode enabled", () => {
      vi.stubEnv("VITE_MCP_MOCK_MODE", "true");
      expect(getCurrentMode()).toBe("mock");
    });

    it("should return explicit mode", () => {
      vi.stubEnv("VITE_MCP_MODE", "websocket");
      expect(getCurrentMode()).toBe("websocket");
    });
  });
});
