/**
 * Self-Healing MCP Client
 *
 * Wraps MCP client with circuit breaker pattern and advanced error recovery.
 * Implements self-healing patterns from SELF_HEALING_CODE_RESEARCH.md
 *
 * Features:
 * - Circuit breaker per server (prevents cascade failures)
 * - Automatic retry with exponential backoff
 * - Graceful degradation with cached data
 * - Error recovery and fallback strategies
 * - Metrics collection for monitoring
 */

import { handleAll, circuitBreaker, SamplingBreaker, type CircuitBreakerPolicy } from 'cockatiel';
import type {
  IMCPClient,
  MCPToolResult,
  MCPClientMode,
} from './types';
import { retryWithBackoff, RETRY_CONFIGS, type RetryConfig } from '../../utils/retry';
import { selfHealingSystem, MCPServerError } from '../../utils/errorRecovery';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Timeout in milliseconds before circuit breaker triggers */
  timeout: number;
  /** Error threshold percentage (0-100) to open circuit */
  errorThresholdPercentage: number;
  /** Time in milliseconds before trying to close circuit again */
  resetTimeout: number;
  /** Minimum number of requests before error threshold applies */
  volumeThreshold?: number;
}

/**
 * Self-healing client configuration
 */
export interface SelfHealingConfig {
  /** Enable circuit breaker (default: true) */
  enableCircuitBreaker?: boolean;
  /** Enable retry logic (default: true) */
  enableRetry?: boolean;
  /** Enable caching for fallback (default: true) */
  enableCache?: boolean;
  /** Circuit breaker config per server */
  circuitBreakerConfig?: CircuitBreakerConfig;
  /** Retry config per operation type */
  retryConfig?: RetryConfig;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
  /** Enable metrics collection (default: true) */
  enableMetrics?: boolean;
}

/**
 * Metrics for monitoring
 */
export interface SelfHealingMetrics {
  servers: Record<string, {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    circuitOpenCount: number;
    retriesPerformed: number;
    cacheHits: number;
    avgResponseTime: number;
  }>;
  global: {
    totalRecoveries: number;
    successfulRecoveries: number;
    uptime: number;
  };
}

/**
 * Cache entry with timestamp
 */
interface CacheEntry {
  data: MCPToolResult;
  timestamp: number;
  server: string;
  tool: string;
}

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  timeout: 30000, // 30s
  errorThresholdPercentage: 50,
  resetTimeout: 10000, // 10s
  volumeThreshold: 5,
};

/**
 * Self-Healing MCP Client
 *
 * Wraps any MCP client implementation with self-healing capabilities
 */
export class SelfHealingMCPClient implements IMCPClient {
  private baseClient: IMCPClient;
  private config: Required<SelfHealingConfig>;
  private breakers: Map<string, CircuitBreakerPolicy> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private metrics: SelfHealingMetrics;
  private startTime: number;

  constructor(baseClient: IMCPClient, config?: SelfHealingConfig) {
    this.baseClient = baseClient;
    this.startTime = Date.now();

    this.config = {
      enableCircuitBreaker: true,
      enableRetry: true,
      enableCache: true,
      enableMetrics: true,
      circuitBreakerConfig: DEFAULT_CIRCUIT_BREAKER_CONFIG,
      retryConfig: RETRY_CONFIGS.FAST_MCP,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      ...config,
    };

    this.metrics = {
      servers: {},
      global: {
        totalRecoveries: 0,
        successfulRecoveries: 0,
        uptime: 0,
      },
    };

    if (this.config.enableCircuitBreaker) {
      this.initializeCircuitBreakers();
    }
  }

  /**
   * Initialize circuit breakers for each known server
   */
  private initializeCircuitBreakers(): void {
    const servers = ['geometry', 'spatial', 'validation', 'documentation'];

    servers.forEach(server => {
      // Create circuit breaker policy with cockatiel v3
      const breaker = circuitBreaker(handleAll, {
        breaker: new SamplingBreaker({
          threshold: this.config.circuitBreakerConfig.errorThresholdPercentage / 100,
          duration: this.config.circuitBreakerConfig.timeout,
          minimumRps: this.config.circuitBreakerConfig.volumeThreshold || 5,
        }),
        halfOpenAfter: this.config.circuitBreakerConfig.resetTimeout,
      });

      // Event handlers for monitoring (cockatiel v3 API)
      breaker.onStateChange(state => {
        if (state === 'open') {
          console.warn(`[Self-Healing] Circuit breaker OPEN for ${server} server`);
          this.notifyCircuitOpen(server);
        } else if (state === 'halfOpen') {
          console.info(`[Self-Healing] Circuit breaker HALF-OPEN for ${server} server`);
        } else if (state === 'closed') {
          console.info(`[Self-Healing] Circuit breaker CLOSED for ${server} server`);
        }
      });

      this.breakers.set(server, breaker);
    });
  }

  /**
   * Get current mode
   */
  getMode(): MCPClientMode {
    return this.baseClient.getMode();
  }

  /**
   * Check if in mock mode
   */
  isMockMode(): boolean {
    return this.baseClient.isMockMode();
  }

  /**
   * Call a tool with self-healing capabilities
   */
  async callTool(
    server: string,
    tool: string,
    params: any
  ): Promise<MCPToolResult> {
    const startTime = Date.now();

    try {
      // If circuit breaker is enabled, use it
      if (this.config.enableCircuitBreaker) {
        const breaker = this.breakers.get(server);

        if (breaker) {
          try {
            return await breaker.execute(() => this.executeCall(server, tool, params));
          } catch (error) {
            // Circuit is open, try fallback
            if ((error as Error).message.includes('broken') || (error as Error).message.includes('open')) {
              console.warn(`[Self-Healing] Circuit open for ${server}, trying fallback`);
              return await this.getFallbackData(server, tool, params);
            }
            throw error;
          }
        }
      }

      // If retry is enabled, wrap the call
      if (this.config.enableRetry) {
        return await retryWithBackoff(
          () => this.executeCall(server, tool, params),
          {
            ...this.config.retryConfig,
            onRetry: (attempt, delay, error) => {
              console.log(
                `[Self-Healing] Retry ${attempt}/${this.config.retryConfig.maxAttempts} ` +
                `for ${server}.${tool} after ${delay}ms (${error.message})`
              );
              this.recordMetric(server, 'retry');
            },
          }
        );
      }

      // Direct call without protection
      return await this.executeCall(server, tool, params);

    } catch (error) {
      const err = error as Error;

      // Try error recovery
      const recovery = await selfHealingSystem.handleError(
        new MCPServerError(err.message, server)
      );

      this.metrics.global.totalRecoveries++;
      if (recovery.success) {
        this.metrics.global.successfulRecoveries++;
      }

      // If recovery provided fallback data, use it
      if (recovery.fallbackData) {
        return recovery.fallbackData;
      }

      // Try cache as last resort
      if (this.config.enableCache) {
        const cached = this.getCachedResult(server, tool, params);
        if (cached) {
          console.warn(`[Self-Healing] Using cached data for ${server}.${tool}`);
          return cached;
        }
      }

      // All recovery attempts failed
      throw err;

    } finally {
      const duration = Date.now() - startTime;
      this.recordMetric(server, 'call', duration);
    }
  }

  /**
   * Execute the actual MCP call
   */
  private async executeCall(
    server: string,
    tool: string,
    params: any
  ): Promise<MCPToolResult> {
    const result = await this.baseClient.callTool(server, tool, params);

    // Cache successful results
    if (this.config.enableCache && result.success) {
      this.cacheResult(server, tool, params, result);
    }

    return result;
  }

  /**
   * Get fallback data when primary call fails
   */
  private async getFallbackData(
    server: string,
    tool: string,
    params: any
  ): Promise<MCPToolResult> {
    // Try cache first
    const cached = this.getCachedResult(server, tool, params);
    if (cached) {
      this.recordMetric(server, 'cache-hit');
      return cached;
    }

    // Return error result
    return {
      success: false,
      error: `${server} server unavailable and no cached data`,
      data: null,
    };
  }

  /**
   * Cache a successful result
   */
  private cacheResult(
    server: string,
    tool: string,
    params: any,
    result: MCPToolResult
  ): void {
    const key = this.getCacheKey(server, tool, params);
    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
      server,
      tool,
    });

    // Clean old entries periodically
    if (this.cache.size > 100) {
      this.cleanCache();
    }
  }

  /**
   * Get cached result if available and fresh
   */
  private getCachedResult(
    server: string,
    tool: string,
    params: any
  ): MCPToolResult | null {
    const key = this.getCacheKey(server, tool, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if cache is still fresh
    const age = Date.now() - entry.timestamp;
    if (age > this.config.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Generate cache key from parameters
   */
  private getCacheKey(server: string, tool: string, params: any): string {
    return `${server}:${tool}:${JSON.stringify(params)}`;
  }

  /**
   * Clean old cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp > this.config.cacheTTL) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Record metrics for monitoring
   */
  private recordMetric(
    server: string,
    type: 'success' | 'failure' | 'timeout' | 'circuit-open' | 'retry' | 'cache-hit' | 'call',
    duration?: number
  ): void {
    if (!this.config.enableMetrics) {
      return;
    }

    if (!this.metrics.servers[server]) {
      this.metrics.servers[server] = {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        circuitOpenCount: 0,
        retriesPerformed: 0,
        cacheHits: 0,
        avgResponseTime: 0,
      };
    }

    const stats = this.metrics.servers[server];

    switch (type) {
      case 'success':
        stats.successfulCalls++;
        break;
      case 'failure':
      case 'timeout':
        stats.failedCalls++;
        break;
      case 'circuit-open':
        stats.circuitOpenCount++;
        break;
      case 'retry':
        stats.retriesPerformed++;
        break;
      case 'cache-hit':
        stats.cacheHits++;
        break;
      case 'call':
        stats.totalCalls++;
        if (duration) {
          // Update rolling average
          stats.avgResponseTime =
            (stats.avgResponseTime * (stats.totalCalls - 1) + duration) / stats.totalCalls;
        }
        break;
    }
  }

  /**
   * Notify user when circuit opens
   */
  private notifyCircuitOpen(server: string): void {
    // This could trigger a toast notification or other UI feedback
    console.warn(`[Self-Healing] ${server} server unavailable, using cached data`);

    // Could dispatch an event for UI to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mcp-circuit-open', {
          detail: { server },
        })
      );
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): SelfHealingMetrics {
    return {
      ...this.metrics,
      global: {
        ...this.metrics.global,
        uptime: Date.now() - this.startTime,
      },
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      servers: {},
      global: {
        totalRecoveries: 0,
        successfulRecoveries: 0,
        uptime: 0,
      },
    };
    this.startTime = Date.now();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get circuit breaker status for a server
   */
  getCircuitStatus(server: string): {
    state: 'open' | 'closed' | 'half-open' | 'unknown';
    stats?: any;
  } {
    const breaker = this.breakers.get(server);
    if (!breaker) {
      return { state: 'unknown' };
    }

    // Note: Cockatiel's circuit breaker state access is different
    // This is a simplified approach - in practice you'd need to track state differently
    return {
      state: 'unknown', // Cockatiel doesn't expose state directly in the same way
      stats: undefined,
    };
  }

  /**
   * Manually open a circuit breaker
   */
  openCircuit(server: string): void {
    // Note: Cockatiel doesn't support manual open/close in the same way
    console.warn('[Self-Healing] Manual circuit control not supported with cockatiel');
  }

  /**
   * Manually close a circuit breaker
   */
  closeCircuit(server: string): void {
    // Note: Cockatiel doesn't support manual open/close in the same way
    console.warn('[Self-Healing] Manual circuit control not supported with cockatiel');
  }
}
