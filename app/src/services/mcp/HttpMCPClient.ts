/**
 * HTTP MCP Client
 *
 * Production MCP client using HTTP/REST to communicate with MCP servers.
 * Features:
 * - Request ID correlation for tracking
 * - Configurable timeout with proper error handling
 * - Retry logic with exponential backoff for transient errors
 * - Response type validation
 * - Request cancellation support
 */

import type {
  IMCPClientWithCancellation,
  MCPToolCall,
  MCPToolCallWithOptions,
  MCPToolResult,
  MCPClientMode,
} from "./types";
import { validateMCPToolResult, getValidationErrors } from "./types";
import {
  RequestTracker,
  TimeoutError,
  CancellationError,
  withRetry,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
} from "./timeout";

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  /** Base URL for MCP server (e.g., http://localhost:8000) */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Custom headers to include */
  headers?: Record<string, string>;
  /** Enable retry for transient errors (default: true) */
  enableRetry?: boolean;
  /** Retry configuration */
  retryConfig?: Partial<RetryConfig>;
  /** Enable response validation (default: true) */
  validateResponse?: boolean;
}

/**
 * HTTP MCP Client for production use
 */
export class HttpMCPClient implements IMCPClientWithCancellation {
  private config: Required<
    Omit<HttpClientConfig, "retryConfig" | "headers">
  > & {
    headers: Record<string, string>;
    retryConfig: RetryConfig;
  };
  private requestTracker: RequestTracker<MCPToolResult>;

  constructor(config: HttpClientConfig) {
    this.config = {
      timeout: 30000,
      headers: {},
      enableRetry: true,
      validateResponse: true,
      ...config,
      retryConfig: { ...DEFAULT_RETRY_CONFIG, ...config.retryConfig },
    };
    this.requestTracker = new RequestTracker<MCPToolResult>();
  }

  /**
   * Get the current mode
   */
  getMode(): MCPClientMode {
    return "http";
  }

  /**
   * Check if in mock mode (always false)
   */
  isMockMode(): boolean {
    return false;
  }

  /**
   * Get the number of pending requests
   */
  getPendingRequestCount(): number {
    return this.requestTracker.size;
  }

  /**
   * Cancel a pending request by ID
   */
  cancelRequest(requestId: string): boolean {
    return this.requestTracker.cancel(requestId);
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.requestTracker.cancelAll();
  }

  /**
   * Call an MCP tool via HTTP
   */
  async callTool(
    call: MCPToolCall | MCPToolCallWithOptions
  ): Promise<MCPToolResult> {
    const options = "options" in call ? call.options : undefined;
    const timeout = options?.timeout ?? this.config.timeout;
    const enableRetry = options?.retry ?? this.config.enableRetry;
    const externalSignal = options?.signal;

    const requestId = this.requestTracker.generateId();

    // Merge retry config from options
    const retryConfig: RetryConfig = {
      ...this.config.retryConfig,
      ...(options?.retryConfig && {
        maxRetries: options.retryConfig.maxRetries ?? this.config.retryConfig.maxRetries,
        initialDelay: options.retryConfig.initialDelay ?? this.config.retryConfig.initialDelay,
      }),
    };

    const executeRequest = async (): Promise<MCPToolResult> => {
      const abortController = new AbortController();

      // Link external signal if provided
      if (externalSignal) {
        if (externalSignal.aborted) {
          throw new CancellationError("Request cancelled", requestId);
        }
        externalSignal.addEventListener("abort", () => {
          abortController.abort();
        });
      }

      return new Promise<MCPToolResult>((resolve, reject) => {
        // Register request for tracking
        this.requestTracker.register(
          requestId,
          resolve,
          reject,
          abortController
        );

        // Set up timeout
        this.requestTracker.setTimeout(requestId, timeout);

        // Execute fetch
        this.executeHttpRequest(call, abortController, requestId)
          .then((result) => {
            this.requestTracker.resolve(requestId, result);
          })
          .catch((error) => {
            // Don't reject if already handled (timeout/cancellation)
            if (this.requestTracker.has(requestId)) {
              this.requestTracker.reject(requestId, error);
            }
          });
      });
    };

    // Execute with retry if enabled
    if (enableRetry) {
      return withRetry(
        executeRequest,
        (error) => {
          if (error instanceof TimeoutError) return error.code;
          if (error instanceof CancellationError) return undefined; // Don't retry cancellations
          if (error instanceof Error && "code" in error) {
            return (error as { code: number }).code;
          }
          return -1; // Network error
        },
        retryConfig
      );
    }

    return executeRequest();
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeHttpRequest(
    call: MCPToolCall | MCPToolCallWithOptions,
    abortController: AbortController,
    requestId: string
  ): Promise<MCPToolResult> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/tools/${call.tool}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": requestId,
            ...this.config.headers,
          },
          body: JSON.stringify(call.arguments),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: -32603,
            message: `HTTP error: ${response.status} ${response.statusText}`,
            data: {
              status: response.status,
              statusText: response.statusText,
              requestId,
            },
          },
          timestamp: new Date().toISOString(),
        };
      }

      const data = await response.json();

      // Validate response if enabled
      if (this.config.validateResponse) {
        if (!validateMCPToolResult(data)) {
          const validationErrors = getValidationErrors(data);
          return {
            success: false,
            error: {
              code: -32700,
              message: "Invalid response format from server",
              data: {
                requestId,
                validationErrors,
              },
            },
            timestamp: new Date().toISOString(),
          };
        }
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          // Check if this was a timeout or cancellation
          const pendingRequest = this.requestTracker.get(requestId);
          if (!pendingRequest) {
            // Request was already handled (likely timeout)
            throw new TimeoutError(
              "Request timed out",
              this.config.timeout,
              requestId
            );
          }
          throw new CancellationError("Request cancelled", requestId);
        }

        return {
          success: false,
          error: {
            code: -1,
            message: error.message,
            data: { errorName: error.name, requestId },
          },
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: false,
        error: {
          code: -1,
          message: "Unknown error occurred",
          data: { requestId },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Update base URL
   */
  setBaseUrl(url: string): void {
    this.config.baseUrl = url;
  }

  /**
   * Get current base URL
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Update timeout
   */
  setTimeout(timeout: number): void {
    this.config.timeout = timeout;
  }

  /**
   * Get current timeout
   */
  getTimeout(): number {
    return this.config.timeout;
  }

  /**
   * Update retry configuration
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.config.retryConfig = { ...this.config.retryConfig, ...config };
  }

  /**
   * Get current retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.config.retryConfig };
  }

  /**
   * Enable or disable retry
   */
  setRetryEnabled(enabled: boolean): void {
    this.config.enableRetry = enabled;
  }

  /**
   * Check if retry is enabled
   */
  isRetryEnabled(): boolean {
    return this.config.enableRetry;
  }
}

export default HttpMCPClient;
