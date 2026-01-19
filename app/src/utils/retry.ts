/**
 * Retry Utilities with Exponential Backoff
 *
 * Implements self-healing retry logic for transient failures.
 * Based on research: SELF_HEALING_CODE_RESEARCH.md
 */

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier (typically 2 for exponential) */
  backoffMultiplier: number;
  /** Jitter factor (0-1) to prevent thundering herd, default 0.1 */
  jitterFactor?: number;
  /** Callback for each retry attempt */
  onRetry?: (attempt: number, delay: number, error: Error) => void;
  /** Function to determine if error is retryable */
  isRetryable?: (error: Error) => boolean;
}

export interface RetryMetrics {
  totalAttempts: number;
  successfulAttempt: number | null;
  totalDelay: number;
  errors: Error[];
}

/**
 * Default retry configurations for common operation types
 */
export const RETRY_CONFIGS = {
  /** Fast MCP calls (geometry, spatial queries) */
  FAST_MCP: {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 2000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  } as RetryConfig,

  /** Slow MCP calls (complex validations, large data) */
  SLOW_MCP: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  } as RetryConfig,

  /** File operations (IFC loading, exports) */
  FILE_OPS: {
    maxAttempts: 3,
    initialDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  } as RetryConfig,

  /** GPU operations (mesh generation, rendering) */
  GPU_OPS: {
    maxAttempts: 5,
    initialDelay: 100,
    maxDelay: 3000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  } as RetryConfig,

  /** Network sync operations (CRDT, collaboration) */
  NETWORK_SYNC: {
    maxAttempts: 5,
    initialDelay: 200,
    maxDelay: 8000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  } as RetryConfig,
};

/**
 * Default retryable error patterns
 */
const DEFAULT_RETRYABLE_ERRORS = [
  /network/i,
  /timeout/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /ETIMEDOUT/i,
  /temporary/i,
  /transient/i,
  /unavailable/i,
  /rate limit/i,
];

/**
 * Determines if an error is retryable based on error message patterns
 */
function isDefaultRetryable(error: Error): boolean {
  const message = error.message || error.toString();
  return DEFAULT_RETRYABLE_ERRORS.some(pattern => pattern.test(message));
}

/**
 * Calculates delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Calculate exponential backoff
  let delay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  );

  // Add jitter to prevent thundering herd
  if (config.jitterFactor && config.jitterFactor > 0) {
    const jitter = delay * config.jitterFactor * (Math.random() * 2 - 1);
    delay = Math.max(0, delay + jitter);
  }

  return Math.floor(delay);
}

/**
 * Retry a promise-returning function with exponential backoff
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => mcpClient.callTool('geometry', 'create_wall', params),
 *   RETRY_CONFIGS.FAST_MCP
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  const metrics: RetryMetrics = {
    totalAttempts: 0,
    successfulAttempt: null,
    totalDelay: 0,
    errors: [],
  };

  const isRetryable = config.isRetryable || isDefaultRetryable;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    metrics.totalAttempts++;

    try {
      const result = await fn();
      metrics.successfulAttempt = attempt;
      return result;
    } catch (error) {
      const err = error as Error;
      metrics.errors.push(err);

      // Check if we should retry
      const shouldRetry = attempt < config.maxAttempts && isRetryable(err);

      if (!shouldRetry) {
        throw new RetryError(
          `Operation failed after ${attempt} attempt(s). Last error: ${err.message}`,
          metrics
        );
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, config);
      metrics.totalDelay += delay;

      // Call retry callback if provided
      if (config.onRetry) {
        config.onRetry(attempt, delay, err);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new RetryError(
    `Max retry attempts (${config.maxAttempts}) reached`,
    metrics
  );
}

/**
 * Custom error class for retry failures
 */
export class RetryError extends Error {
  constructor(
    message: string,
    public readonly metrics: RetryMetrics
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Retry with custom retry logic (for advanced use cases)
 *
 * @example
 * ```typescript
 * const result = await retry(
 *   async (attempt) => {
 *     console.log(`Attempt ${attempt}`);
 *     return await riskyOperation();
 *   },
 *   {
 *     maxAttempts: 3,
 *     shouldRetry: (error, attempt) => {
 *       // Custom retry logic
 *       return error.statusCode === 503 && attempt < 3;
 *     },
 *     delay: (attempt) => 1000 * attempt,
 *   }
 * );
 * ```
 */
export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  options: {
    maxAttempts: number;
    shouldRetry?: (error: Error, attempt: number) => boolean;
    delay?: (attempt: number) => number;
    onRetry?: (attempt: number, error: Error) => void;
  }
): Promise<T> {
  const { maxAttempts, shouldRetry, delay, onRetry } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      const err = error as Error;

      const willRetry = shouldRetry
        ? shouldRetry(err, attempt)
        : attempt < maxAttempts;

      if (!willRetry) {
        throw err;
      }

      if (onRetry) {
        onRetry(attempt, err);
      }

      if (delay) {
        const delayMs = delay(attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Max retry attempts (${maxAttempts}) reached`);
}

/**
 * Wraps a function to automatically retry on failure
 *
 * @example
 * ```typescript
 * const resilientFetch = withRetry(
 *   fetch,
 *   RETRY_CONFIGS.FAST_MCP
 * );
 *
 * const response = await resilientFetch('https://api.example.com');
 * ```
 */
export function withRetry<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: RetryConfig
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => {
    return retryWithBackoff(() => fn(...args), config);
  };
}
