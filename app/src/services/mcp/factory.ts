/**
 * MCP Client Factory
 *
 * Creates the appropriate MCP client based on environment configuration.
 * Uses factory pattern to enable seamless switching between mock and real modes.
 */

import type { IMCPClient, MCPClientMode, MockConfig } from "./types";
import { MockMCPClient } from "./MockMCPClient";
import { HttpMCPClient } from "./HttpMCPClient";
import { WebSocketMCPClient } from "./WebSocketMCPClient";
import { SelfHealingMCPClient, type SelfHealingConfig } from "./SelfHealingMCPClient";

/**
 * Environment variable names
 */
const ENV_VARS = {
  /** Set to 'true' to enable mock mode */
  MOCK_MODE: "VITE_MCP_MOCK_MODE",
  /** MCP client mode: 'mock' | 'http' | 'websocket' */
  MODE: "VITE_MCP_MODE",
  /** Base URL for HTTP client */
  BASE_URL: "VITE_MCP_BASE_URL",
  /** WebSocket URL */
  WS_URL: "VITE_MCP_WS_URL",
  /** Base delay for mock mode (ms) */
  MOCK_DELAY: "VITE_MCP_MOCK_DELAY",
  /** Enable error simulation in mock mode */
  MOCK_ERRORS: "VITE_MCP_MOCK_ERRORS",
  /** Error rate for mock mode (0-1) */
  MOCK_ERROR_RATE: "VITE_MCP_MOCK_ERROR_RATE",
  /** Enable self-healing features (default: true) */
  SELF_HEALING: "VITE_MCP_SELF_HEALING",
};

/**
 * Default configuration values
 */
const DEFAULTS = {
  baseUrl: "http://localhost:8000",
  wsUrl: "ws://localhost:8000/mcp/ws",
  mockDelay: 100,
  mockErrorRate: 0.1,
};

/**
 * Get environment variable value
 */
function getEnv(key: string): string | undefined {
  // Vite exposes env vars on import.meta.env
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key];
  }
  // Fallback to process.env for testing
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
}

/**
 * Determine the MCP client mode from environment
 */
function getModeFromEnv(): MCPClientMode {
  // Check explicit mock mode flag first
  const mockMode = getEnv(ENV_VARS.MOCK_MODE);
  if (mockMode === "true" || mockMode === "1") {
    return "mock";
  }

  // Check explicit mode setting
  const mode = getEnv(ENV_VARS.MODE);
  if (mode === "mock" || mode === "http" || mode === "websocket") {
    return mode;
  }

  // Default to http in production, mock in development
  const isDev =
    getEnv("NODE_ENV") === "development" ||
    getEnv("MODE") === "development" ||
    getEnv("DEV") === "true";

  return isDev ? "mock" : "http";
}

/**
 * Get mock configuration from environment
 */
function getMockConfigFromEnv(): MockConfig {
  const delayStr = getEnv(ENV_VARS.MOCK_DELAY);
  const errorRateStr = getEnv(ENV_VARS.MOCK_ERROR_RATE);
  const simulateErrors = getEnv(ENV_VARS.MOCK_ERRORS);

  return {
    baseDelay: delayStr ? parseInt(delayStr, 10) : DEFAULTS.mockDelay,
    delayVariance: 200,
    simulateErrors: simulateErrors === "true" || simulateErrors === "1",
    errorRate: errorRateStr
      ? parseFloat(errorRateStr)
      : DEFAULTS.mockErrorRate,
  };
}

/**
 * Check if self-healing is enabled
 */
function isSelfHealingEnabled(): boolean {
  const selfHealing = getEnv(ENV_VARS.SELF_HEALING);
  // Enabled by default (opt-out with VITE_MCP_SELF_HEALING=false)
  return selfHealing !== "false" && selfHealing !== "0";
}

/**
 * Create an MCP client based on environment configuration
 *
 * By default, wraps the client with self-healing capabilities including:
 * - Circuit breaker pattern (prevents cascade failures)
 * - Automatic retry with exponential backoff
 * - Error recovery and fallback strategies
 * - Metrics collection
 *
 * Set VITE_MCP_SELF_HEALING=false to disable self-healing features.
 */
export function createMCPClient(): IMCPClient {
  const mode = getModeFromEnv();

  let baseClient: IMCPClient;

  switch (mode) {
    case "mock":
      baseClient = new MockMCPClient(getMockConfigFromEnv());
      break;

    case "http":
      baseClient = new HttpMCPClient({
        baseUrl: getEnv(ENV_VARS.BASE_URL) || DEFAULTS.baseUrl,
      });
      break;

    case "websocket":
      baseClient = new WebSocketMCPClient({
        wsUrl: getEnv(ENV_VARS.WS_URL) || DEFAULTS.wsUrl,
      });
      break;

    default:
      // Fallback to mock
      baseClient = new MockMCPClient(getMockConfigFromEnv());
  }

  // Wrap with self-healing capabilities if enabled
  if (isSelfHealingEnabled()) {
    return new SelfHealingMCPClient(baseClient, {
      enableCircuitBreaker: true,
      enableRetry: true,
      enableCache: true,
      enableMetrics: true,
    });
  }

  return baseClient;
}

/**
 * Create a mock MCP client explicitly
 */
export function createMockClient(config?: MockConfig): MockMCPClient {
  return new MockMCPClient(config);
}

/**
 * Create an HTTP MCP client explicitly
 */
export function createHttpClient(baseUrl?: string): HttpMCPClient {
  return new HttpMCPClient({
    baseUrl: baseUrl || getEnv(ENV_VARS.BASE_URL) || DEFAULTS.baseUrl,
  });
}

/**
 * Create a WebSocket MCP client explicitly
 */
export function createWebSocketClient(wsUrl?: string): WebSocketMCPClient {
  return new WebSocketMCPClient({
    wsUrl: wsUrl || getEnv(ENV_VARS.WS_URL) || DEFAULTS.wsUrl,
  });
}

/**
 * Check if mock mode is enabled
 */
export function isMockModeEnabled(): boolean {
  return getModeFromEnv() === "mock";
}

/**
 * Get the current mode from environment
 */
export function getCurrentMode(): MCPClientMode {
  return getModeFromEnv();
}
