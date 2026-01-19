/**
 * MCP Client Service
 *
 * Provides communication with MCP tool servers (geometry-server, etc.)
 * Uses factory pattern to support mock, HTTP, and WebSocket modes.
 *
 * Configuration via environment variables:
 *   VITE_MCP_MOCK_MODE=true     - Enable mock mode
 *   VITE_MCP_MODE=mock|http|ws  - Set client mode explicitly
 *   VITE_MCP_BASE_URL=http://.. - HTTP server base URL
 *   VITE_MCP_WS_URL=ws://..     - WebSocket URL
 *   VITE_MCP_MOCK_DELAY=100     - Mock response delay (ms)
 *   VITE_MCP_MOCK_ERRORS=true   - Enable error simulation
 *   VITE_MCP_MOCK_ERROR_RATE=0.1 - Error rate (0-1)
 */

import { createMCPClient, isMockModeEnabled, getCurrentMode } from "./mcp";
import type { IMCPClient, MCPToolResult, MCPToolCall } from "./mcp";

// Re-export types from the new module
export type { MCPToolResult, MCPToolCall };

// Create singleton instance using factory
const mcpClient: IMCPClient = createMCPClient();

// Log the mode on startup (dev only)
if (import.meta.env?.DEV) {
  console.log(
    `[MCP Client] Mode: ${getCurrentMode()}${isMockModeEnabled() ? " (mock)" : ""}`
  );
}

export { mcpClient, isMockModeEnabled, getCurrentMode };
export default mcpClient;
