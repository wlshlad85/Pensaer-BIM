/**
 * MCP Services Index
 *
 * Re-exports all MCP-related services and utilities.
 */

// Types
export type {
  MCPToolResult,
  MCPToolCall,
  MCPToolCallOptions,
  MCPToolCallWithOptions,
  MCPClientMode,
  MCPClientConfig as MCPBaseClientConfig,
  MockConfig,
  IMCPClient,
  IMCPClientWithCancellation,
  ResponseValidationError,
} from "./types";

// MCPClient - Main client with server-aware routing
export {
  MCPClient,
  getMCPClient,
  createMCPClientInstance,
  resetMCPClient,
} from "./MCPClient";
export type {
  MCPServerName,
  MCPServerConfig,
  MCPClientConfig,
  ServerHealth,
} from "./MCPClient";

// Type validation
export { validateMCPToolResult, getValidationErrors } from "./types";

// Timeout utilities
export {
  TimeoutError,
  CancellationError,
  RequestTracker,
  withTimeout,
  withRetry,
  calculateRetryDelay,
  isRetryableError,
  DEFAULT_RETRY_CONFIG,
} from "./timeout";

export type { RetryConfig, PendingRequest } from "./timeout";

// Client implementations
export { MockMCPClient } from "./MockMCPClient";
export { HttpMCPClient } from "./HttpMCPClient";
export type { HttpClientConfig } from "./HttpMCPClient";
export { WebSocketMCPClient } from "./WebSocketMCPClient";
export type { WebSocketClientConfig } from "./WebSocketMCPClient";

// Self-Healing Client (wraps any client with circuit breaker + retry)
export { SelfHealingMCPClient } from "./SelfHealingMCPClient";
export type {
  SelfHealingConfig,
  SelfHealingMetrics,
  CircuitBreakerConfig,
} from "./SelfHealingMCPClient";

// Factory functions
export {
  createMCPClient,
  createMockClient,
  createHttpClient,
  createWebSocketClient,
  isMockModeEnabled,
  getCurrentMode,
} from "./factory";

// Error formatter
export {
  formatError,
  formatValidationError,
  formatNetworkError,
  formatTimeoutError,
  formatServerError,
  formatMethodNotFoundError,
  formatResourceNotFoundError,
  writeErrorToTerminal,
  fromJsError,
  McpErrorCode,
} from "./errorFormatter";

export type {
  McpError,
  FormattedError,
  ErrorSeverity,
} from "./errorFormatter";

// Result formatter
export {
  formatMcpResult,
  formatSchedule,
  formatClashReport,
  formatValidationReport,
  writeResultToTerminal,
  exportResultToFile,
  detectFormat,
  paginate,
} from "./resultFormatter";

export type {
  ResultFormatterOptions,
  PaginationState,
} from "./resultFormatter";

// Mock data (for testing)
export * as mocks from "./mocks";

// Tool call logging
export {
  LogLevel,
  MCPToolLogger,
  getMCPLogger,
  createMCPLogger,
  resetMCPLogger,
  configureMCPLogger,
  ConsoleLogTarget,
  JsonLogTarget,
} from "./logging";

export type {
  ToolCallLogEntry,
  LogOutputTarget,
  MCPLoggerConfig,
} from "./logging";

// Token counting
export {
  TokenCounter,
  getTokenCounter,
  resetTokenCounter,
  configureTokenCounter,
  estimateTokens,
  estimateRequestTokens,
  estimateResponseTokens,
  calculateCost,
  calculateTokenUsage,
  checkThresholds,
  formatTokenCount,
  formatCost,
  MODEL_PRICING,
  DEFAULT_THRESHOLDS,
} from "./tokenCounter";

export type {
  TokenUsage,
  TokenStats,
  TokenThreshold,
  ModelPricing,
} from "./tokenCounter";
