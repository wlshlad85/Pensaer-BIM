/**
 * Token Counter for MCP Requests
 *
 * Provides token counting and cost estimation for MCP tool calls.
 * Uses a simple character-based estimation for Claude models.
 *
 * Token estimation: ~4 characters per token for English text (Claude-specific approximation)
 */

/**
 * Token usage for a single request/response
 */
export interface TokenUsage {
  /** Input tokens (request) */
  inputTokens: number;
  /** Output tokens (response) */
  outputTokens: number;
  /** Total tokens */
  totalTokens: number;
  /** Estimated cost in USD */
  estimatedCostUsd: number;
}

/**
 * Cumulative token statistics
 */
export interface TokenStats {
  /** Total input tokens used in session */
  totalInputTokens: number;
  /** Total output tokens used in session */
  totalOutputTokens: number;
  /** Total API calls made */
  totalCalls: number;
  /** Total estimated cost in USD */
  totalCostUsd: number;
  /** Session start time */
  sessionStart: Date;
}

/**
 * Cost configuration for different Claude models
 * Prices per million tokens (as of 2024)
 */
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

/**
 * Available model pricing configurations
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-3-opus": {
    inputPerMillion: 15.0,
    outputPerMillion: 75.0,
  },
  "claude-3-sonnet": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  },
  "claude-3-haiku": {
    inputPerMillion: 0.25,
    outputPerMillion: 1.25,
  },
  // Default for MCP tool calls (using Haiku pricing as a conservative estimate)
  default: {
    inputPerMillion: 0.25,
    outputPerMillion: 1.25,
  },
};

/**
 * Token threshold warnings
 */
export interface TokenThreshold {
  /** Threshold value in tokens */
  value: number;
  /** Warning message */
  message: string;
  /** Severity level */
  severity: "info" | "warning" | "error";
}

/**
 * Default token thresholds for warnings
 */
export const DEFAULT_THRESHOLDS: TokenThreshold[] = [
  {
    value: 10000,
    message: "Token usage: 10K tokens consumed",
    severity: "info",
  },
  {
    value: 50000,
    message: "Warning: 50K tokens consumed - monitor usage",
    severity: "warning",
  },
  {
    value: 100000,
    message: "High usage: 100K tokens consumed",
    severity: "warning",
  },
  {
    value: 500000,
    message: "Critical: 500K tokens consumed - consider session reset",
    severity: "error",
  },
];

/**
 * Average characters per token (Claude-specific approximation)
 * English text typically averages ~4 characters per token
 */
const CHARS_PER_TOKEN = 4;

/**
 * Estimate token count from text content
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }
  // Simple character-based estimation
  // Add a small overhead for JSON structure/formatting
  const baseTokens = Math.ceil(text.length / CHARS_PER_TOKEN);
  const overhead = Math.ceil(baseTokens * 0.1); // 10% overhead for structure
  return baseTokens + overhead;
}

/**
 * Estimate tokens for an MCP tool request
 *
 * @param tool - Tool name
 * @param args - Tool arguments
 * @returns Estimated input tokens
 */
export function estimateRequestTokens(
  tool: string,
  args: Record<string, unknown>
): number {
  // Serialize the request to JSON for estimation
  const requestJson = JSON.stringify({
    method: "tools/call",
    params: {
      name: tool,
      arguments: args,
    },
  });
  return estimateTokens(requestJson);
}

/**
 * Estimate tokens for an MCP tool response
 *
 * @param response - The response object
 * @returns Estimated output tokens
 */
export function estimateResponseTokens(response: unknown): number {
  const responseJson = JSON.stringify(response);
  return estimateTokens(responseJson);
}

/**
 * Calculate cost from token counts
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param model - Model name (defaults to "default")
 * @returns Estimated cost in USD
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = "default"
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING.default;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  return inputCost + outputCost;
}

/**
 * Calculate token usage for a request/response pair
 *
 * @param tool - Tool name
 * @param args - Tool arguments
 * @param response - Tool response
 * @param model - Model name for cost calculation
 * @returns Token usage details
 */
export function calculateTokenUsage(
  tool: string,
  args: Record<string, unknown>,
  response: unknown,
  model: string = "default"
): TokenUsage {
  const inputTokens = estimateRequestTokens(tool, args);
  const outputTokens = estimateResponseTokens(response);
  const totalTokens = inputTokens + outputTokens;
  const estimatedCostUsd = calculateCost(inputTokens, outputTokens, model);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd,
  };
}

/**
 * Check if any thresholds have been crossed
 *
 * @param totalTokens - Current total token count
 * @param previousTotal - Previous total token count
 * @param thresholds - Thresholds to check (defaults to DEFAULT_THRESHOLDS)
 * @returns Array of crossed thresholds
 */
export function checkThresholds(
  totalTokens: number,
  previousTotal: number,
  thresholds: TokenThreshold[] = DEFAULT_THRESHOLDS
): TokenThreshold[] {
  const crossedThresholds: TokenThreshold[] = [];

  for (const threshold of thresholds) {
    // Check if we just crossed this threshold
    if (previousTotal < threshold.value && totalTokens >= threshold.value) {
      crossedThresholds.push(threshold);
    }
  }

  return crossedThresholds;
}

/**
 * Format token count for display
 *
 * @param tokens - Token count
 * @returns Formatted string (e.g., "1.5K", "2.3M")
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Format cost for display
 *
 * @param costUsd - Cost in USD
 * @returns Formatted string (e.g., "$0.0012", "$1.50")
 */
export function formatCost(costUsd: number): string {
  if (costUsd < 0.01) {
    return `$${costUsd.toFixed(4)}`;
  }
  return `$${costUsd.toFixed(2)}`;
}

/**
 * TokenCounter class for tracking session usage
 */
export class TokenCounter {
  private stats: TokenStats;
  private thresholds: TokenThreshold[];
  private model: string;
  private onThresholdCrossed?: (threshold: TokenThreshold) => void;

  constructor(options?: {
    model?: string;
    thresholds?: TokenThreshold[];
    onThresholdCrossed?: (threshold: TokenThreshold) => void;
  }) {
    this.model = options?.model || "default";
    this.thresholds = options?.thresholds || DEFAULT_THRESHOLDS;
    this.onThresholdCrossed = options?.onThresholdCrossed;
    this.stats = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCalls: 0,
      totalCostUsd: 0,
      sessionStart: new Date(),
    };
  }

  /**
   * Record token usage for a tool call
   */
  recordUsage(
    tool: string,
    args: Record<string, unknown>,
    response: unknown
  ): TokenUsage {
    const previousTotal =
      this.stats.totalInputTokens + this.stats.totalOutputTokens;
    const usage = calculateTokenUsage(tool, args, response, this.model);

    this.stats.totalInputTokens += usage.inputTokens;
    this.stats.totalOutputTokens += usage.outputTokens;
    this.stats.totalCalls += 1;
    this.stats.totalCostUsd += usage.estimatedCostUsd;

    // Check for crossed thresholds
    const newTotal = this.stats.totalInputTokens + this.stats.totalOutputTokens;
    const crossed = checkThresholds(newTotal, previousTotal, this.thresholds);
    for (const threshold of crossed) {
      this.onThresholdCrossed?.(threshold);
    }

    return usage;
  }

  /**
   * Estimate tokens for a request before sending
   */
  estimateRequest(tool: string, args: Record<string, unknown>): number {
    return estimateRequestTokens(tool, args);
  }

  /**
   * Get current session statistics
   */
  getStats(): TokenStats {
    return { ...this.stats };
  }

  /**
   * Reset session statistics
   */
  reset(): void {
    this.stats = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCalls: 0,
      totalCostUsd: 0,
      sessionStart: new Date(),
    };
  }

  /**
   * Get formatted summary
   */
  getSummary(): string {
    const totalTokens =
      this.stats.totalInputTokens + this.stats.totalOutputTokens;
    return [
      `Tokens: ${formatTokenCount(totalTokens)}`,
      `(In: ${formatTokenCount(this.stats.totalInputTokens)}, Out: ${formatTokenCount(this.stats.totalOutputTokens)})`,
      `Cost: ${formatCost(this.stats.totalCostUsd)}`,
      `Calls: ${this.stats.totalCalls}`,
    ].join(" | ");
  }
}

// Singleton instance for global token tracking
let globalTokenCounter: TokenCounter | null = null;

/**
 * Get the global token counter instance
 */
export function getTokenCounter(): TokenCounter {
  if (!globalTokenCounter) {
    globalTokenCounter = new TokenCounter();
  }
  return globalTokenCounter;
}

/**
 * Reset the global token counter
 */
export function resetTokenCounter(): void {
  if (globalTokenCounter) {
    globalTokenCounter.reset();
  }
}

/**
 * Configure the global token counter
 */
export function configureTokenCounter(options: {
  model?: string;
  thresholds?: TokenThreshold[];
  onThresholdCrossed?: (threshold: TokenThreshold) => void;
}): void {
  globalTokenCounter = new TokenCounter(options);
}
