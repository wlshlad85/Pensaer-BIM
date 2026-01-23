/**
 * MCP Client Types
 *
 * Core types for MCP client and tool interactions.
 */

/**
 * Result of an MCP tool call
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

/**
 * MCP tool call request
 */
export interface MCPToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

/**
 * MCP client operating mode
 */
export type MCPClientMode = "mock" | "http" | "websocket";

/**
 * MCP client configuration
 */
export interface MCPClientConfig {
  /** Operating mode */
  mode: MCPClientMode;
  /** Base URL for HTTP mode */
  baseUrl?: string;
  /** WebSocket URL for websocket mode */
  wsUrl?: string;
}

/**
 * Mock mode configuration
 */
export interface MockConfig {
  /** Base delay in milliseconds (default: 100) */
  baseDelay?: number;
  /** Random delay variance in milliseconds (default: 200) */
  delayVariance?: number;
  /** Enable error simulation */
  simulateErrors?: boolean;
  /** Error rate (0-1) when simulation enabled */
  errorRate?: number;
}

/**
 * Extended tool call options
 */
export interface MCPToolCallOptions {
  /** Custom timeout in milliseconds (overrides client default) */
  timeout?: number;
  /** Enable retry for transient errors */
  retry?: boolean;
  /** Custom retry configuration */
  retryConfig?: {
    maxRetries?: number;
    initialDelay?: number;
  };
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Extended MCP tool call request with options
 */
export interface MCPToolCallWithOptions extends MCPToolCall {
  options?: MCPToolCallOptions;
}

/**
 * Interface for MCP client implementations
 */
export interface IMCPClient {
  /**
   * Call an MCP tool
   */
  callTool(call: MCPToolCall | MCPToolCallWithOptions): Promise<MCPToolResult>;

  /**
   * Get the current mode
   */
  getMode(): MCPClientMode;

  /**
   * Check if in mock mode
   */
  isMockMode(): boolean;
}

/**
 * Extended interface for MCP clients with cancellation support
 */
export interface IMCPClientWithCancellation extends IMCPClient {
  /**
   * Cancel a pending request by ID
   */
  cancelRequest(requestId: string): boolean;

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void;

  /**
   * Get the number of pending requests
   */
  getPendingRequestCount(): number;
}

/**
 * Validation error for invalid response types
 */
export interface ResponseValidationError {
  field: string;
  expected: string;
  received: string;
}

/**
 * Validate that a response matches the MCPToolResult shape
 */
export function validateMCPToolResult(
  response: unknown
): response is MCPToolResult {
  if (typeof response !== "object" || response === null) {
    return false;
  }

  const obj = response as Record<string, unknown>;

  // success field is required and must be boolean
  if (typeof obj.success !== "boolean") {
    return false;
  }

  // error must have correct shape if present
  if (obj.error !== undefined) {
    if (typeof obj.error !== "object" || obj.error === null) {
      return false;
    }
    const error = obj.error as Record<string, unknown>;
    if (typeof error.code !== "number" || typeof error.message !== "string") {
      return false;
    }
  }

  // data must be object if present
  if (obj.data !== undefined) {
    if (typeof obj.data !== "object" || obj.data === null) {
      return false;
    }
  }

  // warnings must be string array if present
  if (obj.warnings !== undefined) {
    if (!Array.isArray(obj.warnings)) {
      return false;
    }
    if (!obj.warnings.every((w) => typeof w === "string")) {
      return false;
    }
  }

  return true;
}

/**
 * Get detailed validation errors for a response
 */
export function getValidationErrors(
  response: unknown
): ResponseValidationError[] {
  const errors: ResponseValidationError[] = [];

  if (typeof response !== "object" || response === null) {
    errors.push({
      field: "response",
      expected: "object",
      received: typeof response,
    });
    return errors;
  }

  const obj = response as Record<string, unknown>;

  if (typeof obj.success !== "boolean") {
    errors.push({
      field: "success",
      expected: "boolean",
      received: typeof obj.success,
    });
  }

  if (obj.error !== undefined) {
    if (typeof obj.error !== "object" || obj.error === null) {
      errors.push({
        field: "error",
        expected: "object",
        received: typeof obj.error,
      });
    } else {
      const error = obj.error as Record<string, unknown>;
      if (typeof error.code !== "number") {
        errors.push({
          field: "error.code",
          expected: "number",
          received: typeof error.code,
        });
      }
      if (typeof error.message !== "string") {
        errors.push({
          field: "error.message",
          expected: "string",
          received: typeof error.message,
        });
      }
    }
  }

  if (obj.data !== undefined && (typeof obj.data !== "object" || obj.data === null)) {
    errors.push({
      field: "data",
      expected: "object",
      received: typeof obj.data,
    });
  }

  if (obj.warnings !== undefined) {
    if (!Array.isArray(obj.warnings)) {
      errors.push({
        field: "warnings",
        expected: "array",
        received: typeof obj.warnings,
      });
    } else if (!obj.warnings.every((w) => typeof w === "string")) {
      errors.push({
        field: "warnings[]",
        expected: "string",
        received: "mixed",
      });
    }
  }

  return errors;
}
