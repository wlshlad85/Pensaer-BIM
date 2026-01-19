/**
 * Timeout Utilities for MCP Requests
 *
 * Provides configurable timeout wrappers, request tracking,
 * and cancellation support for MCP tool calls.
 */

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends Error {
  readonly code = -2;
  readonly requestId?: string;
  readonly timeout: number;

  constructor(message: string, timeout: number, requestId?: string) {
    super(message);
    this.name = "TimeoutError";
    this.timeout = timeout;
    this.requestId = requestId;
  }
}

/**
 * Error thrown when a request is cancelled
 */
export class CancellationError extends Error {
  readonly code = -3;
  readonly requestId?: string;

  constructor(message: string, requestId?: string) {
    super(message);
    this.name = "CancellationError";
    this.requestId = requestId;
  }
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Initial delay between retries in ms (default: 1000) */
  initialDelay: number;
  /** Maximum delay between retries in ms (default: 30000) */
  maxDelay: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier: number;
  /** Error codes that should trigger retry */
  retryableCodes: number[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  // Retryable error codes: timeout, network error, server unavailable
  retryableCodes: [-1, -2, -32006],
};

/**
 * Request tracking entry
 */
export interface PendingRequest<T> {
  id: string;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
  abortController?: AbortController;
  startTime: number;
  attempt: number;
}

/**
 * Request tracker for managing pending requests with correlation
 */
export class RequestTracker<T> {
  private pending: Map<string, PendingRequest<T>> = new Map();

  /**
   * Generate a unique request ID
   */
  generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Register a new pending request
   */
  register(
    id: string,
    resolve: (value: T) => void,
    reject: (error: Error) => void,
    abortController?: AbortController
  ): PendingRequest<T> {
    const request: PendingRequest<T> = {
      id,
      resolve,
      reject,
      abortController,
      startTime: Date.now(),
      attempt: 1,
    };
    this.pending.set(id, request);
    return request;
  }

  /**
   * Get a pending request by ID
   */
  get(id: string): PendingRequest<T> | undefined {
    return this.pending.get(id);
  }

  /**
   * Check if a request is pending
   */
  has(id: string): boolean {
    return this.pending.has(id);
  }

  /**
   * Resolve a pending request
   */
  resolve(id: string, value: T): boolean {
    const request = this.pending.get(id);
    if (!request) return false;

    if (request.timeoutId) {
      clearTimeout(request.timeoutId);
    }
    this.pending.delete(id);
    request.resolve(value);
    return true;
  }

  /**
   * Reject a pending request
   */
  reject(id: string, error: Error): boolean {
    const request = this.pending.get(id);
    if (!request) return false;

    if (request.timeoutId) {
      clearTimeout(request.timeoutId);
    }
    this.pending.delete(id);
    request.reject(error);
    return true;
  }

  /**
   * Set timeout for a pending request
   */
  setTimeout(id: string, timeout: number): void {
    const request = this.pending.get(id);
    if (!request) return;

    request.timeoutId = setTimeout(() => {
      this.reject(
        id,
        new TimeoutError(`Request timed out after ${timeout}ms`, timeout, id)
      );
      // Also abort the request if possible
      request.abortController?.abort();
    }, timeout);
  }

  /**
   * Cancel a pending request
   */
  cancel(id: string): boolean {
    const request = this.pending.get(id);
    if (!request) return false;

    if (request.timeoutId) {
      clearTimeout(request.timeoutId);
    }
    request.abortController?.abort();
    this.pending.delete(id);
    request.reject(new CancellationError("Request cancelled", id));
    return true;
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    for (const [id] of this.pending) {
      this.cancel(id);
    }
  }

  /**
   * Get the number of pending requests
   */
  get size(): number {
    return this.pending.size;
  }

  /**
   * Get all pending request IDs
   */
  getPendingIds(): string[] {
    return Array.from(this.pending.keys());
  }

  /**
   * Get elapsed time for a request
   */
  getElapsedTime(id: string): number | undefined {
    const request = this.pending.get(id);
    if (!request) return undefined;
    return Date.now() - request.startTime;
  }

  /**
   * Update attempt count for retry
   */
  incrementAttempt(id: string): number | undefined {
    const request = this.pending.get(id);
    if (!request) return undefined;
    request.attempt += 1;
    return request.attempt;
  }
}

/**
 * Calculate delay for retry with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  // Add jitter (±10%) to prevent thundering herd
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, config.maxDelay);
}

/**
 * Check if an error is retryable based on error code
 */
export function isRetryableError(
  errorCode: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  return config.retryableCodes.includes(errorCode);
}

/**
 * Wrap a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  requestId?: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new TimeoutError(
          `Request timed out after ${timeout}ms`,
          timeout,
          requestId
        )
      );
    }, timeout);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  getErrorCode: (error: unknown) => number | undefined,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= fullConfig.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorCode = getErrorCode(error);

      // Don't retry if we've exhausted attempts or error is not retryable
      if (
        attempt > fullConfig.maxRetries ||
        errorCode === undefined ||
        !isRetryableError(errorCode, fullConfig)
      ) {
        throw lastError;
      }

      // Wait before retrying
      const delay = calculateRetryDelay(attempt, fullConfig);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error("Unknown error during retry");
}
