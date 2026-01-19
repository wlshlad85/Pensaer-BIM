/**
 * Token Store
 *
 * Tracks LLM/AI token usage across the application with cost estimation
 * and usage threshold warnings.
 */

import { create } from "zustand";
import {
  calculateCost,
  checkThresholds,
  formatTokenCount,
  formatCost,
  DEFAULT_THRESHOLDS,
  type TokenThreshold,
  type TokenUsage,
} from "../services/mcp/tokenCounter";

/**
 * Token usage entry for a single API call
 */
export interface TokenUsageEntry {
  /** Timestamp of the call */
  timestamp: Date;
  /** Tool name */
  tool: string;
  /** Input tokens */
  inputTokens: number;
  /** Output tokens */
  outputTokens: number;
  /** Estimated cost in USD */
  costUsd: number;
}

/**
 * Token state interface
 */
interface TokenState {
  /** Total input tokens used */
  inputTokens: number;
  /** Total output tokens used */
  outputTokens: number;
  /** Total estimated cost in USD */
  totalCostUsd: number;
  /** Total API calls made */
  totalCalls: number;
  /** Session start time */
  sessionStart: Date;
  /** Usage history (last N entries) */
  usageHistory: TokenUsageEntry[];
  /** Maximum history entries to keep */
  maxHistorySize: number;
  /** Active thresholds */
  thresholds: TokenThreshold[];
  /** Crossed threshold messages (for display) */
  crossedThresholds: TokenThreshold[];
  /** Model for cost calculation */
  model: string;

  // Actions
  /** Add tokens from an AI interaction */
  addTokens: (input: number, output: number) => void;
  /** Record a complete tool call with metadata */
  recordToolCall: (
    tool: string,
    inputTokens: number,
    outputTokens: number
  ) => TokenUsage;
  /** Reset token counts */
  resetTokens: () => void;
  /** Get total tokens */
  totalTokens: () => number;
  /** Get formatted summary string */
  getSummary: () => string;
  /** Clear crossed threshold warnings */
  clearThresholdWarnings: () => void;
  /** Set model for cost calculation */
  setModel: (model: string) => void;
  /** Set custom thresholds */
  setThresholds: (thresholds: TokenThreshold[]) => void;
}

export const useTokenStore = create<TokenState>((set, get) => ({
  inputTokens: 0,
  outputTokens: 0,
  totalCostUsd: 0,
  totalCalls: 0,
  sessionStart: new Date(),
  usageHistory: [],
  maxHistorySize: 100,
  thresholds: DEFAULT_THRESHOLDS,
  crossedThresholds: [],
  model: "default",

  addTokens: (input, output) => {
    const state = get();
    const previousTotal = state.inputTokens + state.outputTokens;
    const newTotal = previousTotal + input + output;
    const cost = calculateCost(input, output, state.model);

    // Check for crossed thresholds
    const crossed = checkThresholds(newTotal, previousTotal, state.thresholds);

    set((s) => ({
      inputTokens: s.inputTokens + input,
      outputTokens: s.outputTokens + output,
      totalCostUsd: s.totalCostUsd + cost,
      totalCalls: s.totalCalls + 1,
      crossedThresholds:
        crossed.length > 0
          ? [...s.crossedThresholds, ...crossed]
          : s.crossedThresholds,
    }));
  },

  recordToolCall: (tool, inputTokens, outputTokens) => {
    const state = get();
    const previousTotal = state.inputTokens + state.outputTokens;
    const costUsd = calculateCost(inputTokens, outputTokens, state.model);
    const totalTokens = inputTokens + outputTokens;
    const newTotal = previousTotal + totalTokens;

    // Check for crossed thresholds
    const crossed = checkThresholds(newTotal, previousTotal, state.thresholds);

    // Create usage entry
    const entry: TokenUsageEntry = {
      timestamp: new Date(),
      tool,
      inputTokens,
      outputTokens,
      costUsd,
    };

    set((s) => {
      // Maintain history size limit
      const newHistory = [entry, ...s.usageHistory].slice(0, s.maxHistorySize);

      return {
        inputTokens: s.inputTokens + inputTokens,
        outputTokens: s.outputTokens + outputTokens,
        totalCostUsd: s.totalCostUsd + costUsd,
        totalCalls: s.totalCalls + 1,
        usageHistory: newHistory,
        crossedThresholds:
          crossed.length > 0
            ? [...s.crossedThresholds, ...crossed]
            : s.crossedThresholds,
      };
    });

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd: costUsd,
    };
  },

  resetTokens: () =>
    set({
      inputTokens: 0,
      outputTokens: 0,
      totalCostUsd: 0,
      totalCalls: 0,
      sessionStart: new Date(),
      usageHistory: [],
      crossedThresholds: [],
    }),

  totalTokens: () => get().inputTokens + get().outputTokens,

  getSummary: () => {
    const state = get();
    const total = state.inputTokens + state.outputTokens;
    return [
      `Tokens: ${formatTokenCount(total)}`,
      `(In: ${formatTokenCount(state.inputTokens)}, Out: ${formatTokenCount(state.outputTokens)})`,
      `Cost: ${formatCost(state.totalCostUsd)}`,
      `Calls: ${state.totalCalls}`,
    ].join(" | ");
  },

  clearThresholdWarnings: () => set({ crossedThresholds: [] }),

  setModel: (model) => set({ model }),

  setThresholds: (thresholds) => set({ thresholds }),
}));
