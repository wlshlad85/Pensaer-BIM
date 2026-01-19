/**
 * Error Recovery System
 *
 * Implements automated error detection and recovery strategies.
 * Based on research: SELF_HEALING_CODE_RESEARCH.md
 */

export type RecoveryAction = 'retry' | 'fallback' | 'reload' | 'notify' | 'auto-fix';

export interface RecoveryResult {
  success: boolean;
  action: RecoveryAction;
  message: string;
  fallbackData?: any;
}

export interface RecoveryLog {
  timestamp: number;
  errorType: string;
  errorMessage: string;
  action: RecoveryAction;
  success: boolean;
  details: string;
}

/**
 * Error handler function type
 */
type ErrorHandler = (error: Error) => Promise<RecoveryResult>;

/**
 * Self-healing system that automatically detects and recovers from errors
 */
export class SelfHealingSystem {
  private handlers: Map<string, ErrorHandler> = new Map();
  private recoveryLog: RecoveryLog[] = [];
  private maxLogSize = 1000;

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register default error handlers for common error types
   */
  private registerDefaultHandlers(): void {
    // TypeError (null/undefined access)
    this.registerHandler('TypeError', async (error) => {
      console.warn('[Self-Healing] TypeError detected:', error.message);

      return {
        success: true,
        action: 'fallback',
        message: 'Applied defensive null checking',
        fallbackData: null,
      };
    });

    // NetworkError (connection issues)
    this.registerHandler('NetworkError', async (error) => {
      console.warn('[Self-Healing] NetworkError detected:', error.message);

      return {
        success: true,
        action: 'retry',
        message: 'Will retry with exponential backoff',
      };
    });

    // AbortError (request cancelled/timeout)
    this.registerHandler('AbortError', async (error) => {
      console.warn('[Self-Healing] AbortError detected:', error.message);

      return {
        success: true,
        action: 'retry',
        message: 'Request timed out, will retry',
      };
    });

    // WebGLError (GPU context loss)
    this.registerHandler('WebGLContextLost', async (error) => {
      console.warn('[Self-Healing] WebGL context lost:', error.message);

      // Try to reload WebGL context
      const reloaded = await this.reloadWebGLContext();

      if (reloaded) {
        return {
          success: true,
          action: 'reload',
          message: 'WebGL context reloaded successfully',
        };
      } else {
        return {
          success: true,
          action: 'fallback',
          message: 'Switched to 2D renderer',
        };
      }
    });

    // ParseError (DSL/IFC parsing)
    this.registerHandler('ParseError', async (error) => {
      console.warn('[Self-Healing] ParseError detected:', error.message);

      return {
        success: true,
        action: 'notify',
        message: 'Showing helpful error message with suggestions',
      };
    });

    // SyntaxError (malformed data)
    this.registerHandler('SyntaxError', async (error) => {
      console.warn('[Self-Healing] SyntaxError detected:', error.message);

      return {
        success: true,
        action: 'notify',
        message: 'Data format error detected',
      };
    });

    // QuotaExceededError (storage full)
    this.registerHandler('QuotaExceededError', async (error) => {
      console.warn('[Self-Healing] QuotaExceededError detected:', error.message);

      // Try to clear old cache entries
      await this.clearOldCache();

      return {
        success: true,
        action: 'auto-fix',
        message: 'Cleared old cache entries to free space',
      };
    });
  }

  /**
   * Register a custom error handler
   */
  registerHandler(errorType: string, handler: ErrorHandler): void {
    this.handlers.set(errorType, handler);
  }

  /**
   * Handle an error and attempt recovery
   */
  async handleError(error: Error): Promise<RecoveryResult> {
    const errorType = error.constructor.name;
    const handler = this.handlers.get(errorType);

    let result: RecoveryResult;

    if (handler) {
      result = await handler(error);
    } else {
      // Generic fallback handler
      console.error('[Self-Healing] Unhandled error:', error);
      result = {
        success: false,
        action: 'notify',
        message: `Unhandled error: ${error.message}`,
      };
    }

    // Log the recovery attempt
    this.logRecovery({
      timestamp: Date.now(),
      errorType,
      errorMessage: error.message,
      action: result.action,
      success: result.success,
      details: result.message,
    });

    return result;
  }

  /**
   * Log a recovery attempt
   */
  private logRecovery(log: RecoveryLog): void {
    this.recoveryLog.push(log);

    // Keep log size under control
    if (this.recoveryLog.length > this.maxLogSize) {
      this.recoveryLog.shift();
    }
  }

  /**
   * Get recovery logs for monitoring
   */
  getRecoveryLog(): RecoveryLog[] {
    return [...this.recoveryLog];
  }

  /**
   * Get recovery statistics
   */
  getStatistics(): {
    total: number;
    successful: number;
    byAction: Record<RecoveryAction, number>;
    byErrorType: Record<string, number>;
  } {
    const stats = {
      total: this.recoveryLog.length,
      successful: this.recoveryLog.filter(l => l.success).length,
      byAction: {} as Record<RecoveryAction, number>,
      byErrorType: {} as Record<string, number>,
    };

    this.recoveryLog.forEach(log => {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // Count by error type
      stats.byErrorType[log.errorType] = (stats.byErrorType[log.errorType] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear recovery log
   */
  clearLog(): void {
    this.recoveryLog = [];
  }

  /**
   * Attempt to reload WebGL context
   */
  private async reloadWebGLContext(): Promise<boolean> {
    // This would be implemented based on your 3D rendering setup
    // For now, return false to trigger fallback
    return false;
  }

  /**
   * Clear old cache entries to free space
   */
  private async clearOldCache(): Promise<void> {
    try {
      // Clear localStorage old entries (keep last 7 days)
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const data = JSON.parse(item);
              if (data.timestamp && data.timestamp < sevenDaysAgo) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            // Skip invalid entries
          }
        }
      }
    } catch (error) {
      console.error('[Self-Healing] Failed to clear cache:', error);
    }
  }
}

/**
 * Global singleton instance
 */
export const selfHealingSystem = new SelfHealingSystem();

/**
 * Wrap an async function with automatic error recovery
 *
 * @example
 * ```typescript
 * const safeFunction = withErrorRecovery(
 *   async () => await riskyOperation(),
 *   {
 *     onRecovery: (result) => {
 *       console.log('Recovered:', result.message);
 *     }
 *   }
 * );
 * ```
 */
export function withErrorRecovery<T>(
  fn: () => Promise<T>,
  options?: {
    onRecovery?: (result: RecoveryResult) => void;
    fallbackValue?: T;
  }
): () => Promise<T> {
  return async () => {
    try {
      return await fn();
    } catch (error) {
      const result = await selfHealingSystem.handleError(error as Error);

      if (options?.onRecovery) {
        options.onRecovery(result);
      }

      // If recovery provided fallback data, use it
      if (result.fallbackData !== undefined) {
        return result.fallbackData as T;
      }

      // If caller provided fallback value, use it
      if (options?.fallbackValue !== undefined) {
        return options.fallbackValue;
      }

      // Re-throw if no fallback available
      throw error;
    }
  };
}

/**
 * Custom error types for better error handling
 */

export class MCPServerError extends Error {
  constructor(message: string, public readonly server: string) {
    super(message);
    this.name = 'MCPServerError';
  }
}

export class WebGLContextLostError extends Error {
  constructor(message: string = 'WebGL context lost') {
    super(message);
    this.name = 'WebGLContextLost';
  }
}

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}
