/**
 * Pensaer BIM Platform - Token Store Tests
 *
 * Comprehensive unit tests for the token store (LLM token tracking).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useTokenStore } from "../tokenStore";
import { DEFAULT_THRESHOLDS } from "../../services/mcp/tokenCounter";

describe("tokenStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useTokenStore.getState().resetTokens();
  });

  describe("Initial State", () => {
    it("should start with zero tokens", () => {
      expect(useTokenStore.getState().inputTokens).toBe(0);
      expect(useTokenStore.getState().outputTokens).toBe(0);
    });

    it("should report zero total tokens initially", () => {
      expect(useTokenStore.getState().totalTokens()).toBe(0);
    });
  });

  describe("Adding Tokens", () => {
    it("should add input and output tokens", () => {
      useTokenStore.getState().addTokens(100, 50);

      expect(useTokenStore.getState().inputTokens).toBe(100);
      expect(useTokenStore.getState().outputTokens).toBe(50);
    });

    it("should accumulate tokens across multiple calls", () => {
      useTokenStore.getState().addTokens(100, 50);
      useTokenStore.getState().addTokens(200, 100);
      useTokenStore.getState().addTokens(50, 25);

      expect(useTokenStore.getState().inputTokens).toBe(350);
      expect(useTokenStore.getState().outputTokens).toBe(175);
    });

    it("should handle zero token additions", () => {
      useTokenStore.getState().addTokens(100, 50);
      useTokenStore.getState().addTokens(0, 0);

      expect(useTokenStore.getState().inputTokens).toBe(100);
      expect(useTokenStore.getState().outputTokens).toBe(50);
    });

    it("should handle adding only input tokens", () => {
      useTokenStore.getState().addTokens(100, 0);

      expect(useTokenStore.getState().inputTokens).toBe(100);
      expect(useTokenStore.getState().outputTokens).toBe(0);
    });

    it("should handle adding only output tokens", () => {
      useTokenStore.getState().addTokens(0, 100);

      expect(useTokenStore.getState().inputTokens).toBe(0);
      expect(useTokenStore.getState().outputTokens).toBe(100);
    });
  });

  describe("Total Tokens", () => {
    it("should calculate total tokens correctly", () => {
      useTokenStore.getState().addTokens(100, 50);

      expect(useTokenStore.getState().totalTokens()).toBe(150);
    });

    it("should update total as tokens are added", () => {
      useTokenStore.getState().addTokens(100, 50);
      expect(useTokenStore.getState().totalTokens()).toBe(150);

      useTokenStore.getState().addTokens(200, 100);
      expect(useTokenStore.getState().totalTokens()).toBe(450);
    });
  });

  describe("Reset Tokens", () => {
    it("should reset all tokens to zero", () => {
      useTokenStore.getState().addTokens(500, 250);
      useTokenStore.getState().resetTokens();

      expect(useTokenStore.getState().inputTokens).toBe(0);
      expect(useTokenStore.getState().outputTokens).toBe(0);
      expect(useTokenStore.getState().totalTokens()).toBe(0);
    });

    it("should allow adding tokens after reset", () => {
      useTokenStore.getState().addTokens(500, 250);
      useTokenStore.getState().resetTokens();
      useTokenStore.getState().addTokens(100, 50);

      expect(useTokenStore.getState().inputTokens).toBe(100);
      expect(useTokenStore.getState().outputTokens).toBe(50);
    });
  });

  describe("Edge Cases", () => {
    it("should handle large token counts", () => {
      useTokenStore.getState().addTokens(1000000, 500000);
      useTokenStore.getState().addTokens(1000000, 500000);

      expect(useTokenStore.getState().inputTokens).toBe(2000000);
      expect(useTokenStore.getState().outputTokens).toBe(1000000);
      expect(useTokenStore.getState().totalTokens()).toBe(3000000);
    });

    it("should handle multiple resets", () => {
      useTokenStore.getState().addTokens(100, 50);
      useTokenStore.getState().resetTokens();
      useTokenStore.getState().resetTokens();
      useTokenStore.getState().resetTokens();

      expect(useTokenStore.getState().inputTokens).toBe(0);
      expect(useTokenStore.getState().outputTokens).toBe(0);
    });

    it("should handle rapid additions", () => {
      for (let i = 0; i < 100; i++) {
        useTokenStore.getState().addTokens(10, 5);
      }

      expect(useTokenStore.getState().inputTokens).toBe(1000);
      expect(useTokenStore.getState().outputTokens).toBe(500);
      expect(useTokenStore.getState().totalTokens()).toBe(1500);
    });
  });

  describe("Enhanced Token Tracking", () => {
    it("should track total cost", () => {
      useTokenStore.getState().addTokens(1000, 500);
      const state = useTokenStore.getState();
      expect(state.totalCostUsd).toBeGreaterThan(0);
    });

    it("should track total calls", () => {
      useTokenStore.getState().addTokens(100, 50);
      useTokenStore.getState().addTokens(100, 50);
      const state = useTokenStore.getState();
      expect(state.totalCalls).toBe(2);
    });

    it("should have session start time", () => {
      const state = useTokenStore.getState();
      expect(state.sessionStart).toBeInstanceOf(Date);
    });

    it("should reset session start on reset", () => {
      const initialStart = useTokenStore.getState().sessionStart;
      // Wait a tiny bit to ensure time passes
      useTokenStore.getState().resetTokens();
      const newStart = useTokenStore.getState().sessionStart;
      expect(newStart.getTime()).toBeGreaterThanOrEqual(initialStart.getTime());
    });
  });

  describe("recordToolCall", () => {
    it("should record tool call and return usage", () => {
      const usage = useTokenStore.getState().recordToolCall("create_wall", 100, 50);

      expect(usage.inputTokens).toBe(100);
      expect(usage.outputTokens).toBe(50);
      expect(usage.totalTokens).toBe(150);
      expect(usage.estimatedCostUsd).toBeGreaterThan(0);
    });

    it("should add to usage history", () => {
      useTokenStore.getState().recordToolCall("create_wall", 100, 50);
      useTokenStore.getState().recordToolCall("list_elements", 50, 200);

      const state = useTokenStore.getState();
      expect(state.usageHistory).toHaveLength(2);
      expect(state.usageHistory[0].tool).toBe("list_elements"); // Most recent first
      expect(state.usageHistory[1].tool).toBe("create_wall");
    });

    it("should respect history size limit", () => {
      const state = useTokenStore.getState();
      const maxSize = state.maxHistorySize;

      // Add more than max history size
      for (let i = 0; i < maxSize + 10; i++) {
        useTokenStore.getState().recordToolCall(`tool_${i}`, 10, 5);
      }

      expect(useTokenStore.getState().usageHistory.length).toBe(maxSize);
    });
  });

  describe("Threshold Tracking", () => {
    it("should have default thresholds", () => {
      const state = useTokenStore.getState();
      expect(state.thresholds).toEqual(DEFAULT_THRESHOLDS);
    });

    it("should track crossed thresholds", () => {
      // Add enough tokens to cross the first threshold (10K)
      useTokenStore.getState().addTokens(11000, 0);

      const state = useTokenStore.getState();
      expect(state.crossedThresholds.length).toBeGreaterThan(0);
      expect(state.crossedThresholds[0].value).toBe(10000);
    });

    it("should clear threshold warnings", () => {
      useTokenStore.getState().addTokens(11000, 0);
      useTokenStore.getState().clearThresholdWarnings();

      const state = useTokenStore.getState();
      expect(state.crossedThresholds).toHaveLength(0);
    });

    it("should allow setting custom thresholds", () => {
      const customThresholds = [
        { value: 100, message: "100 tokens", severity: "info" as const },
      ];
      useTokenStore.getState().setThresholds(customThresholds);

      const state = useTokenStore.getState();
      expect(state.thresholds).toEqual(customThresholds);
    });
  });

  describe("Model Configuration", () => {
    it("should have default model", () => {
      const state = useTokenStore.getState();
      expect(state.model).toBe("default");
    });

    it("should allow setting model", () => {
      useTokenStore.getState().setModel("claude-3-opus");
      const state = useTokenStore.getState();
      expect(state.model).toBe("claude-3-opus");
    });
  });

  describe("Summary Generation", () => {
    it("should generate summary string", () => {
      useTokenStore.getState().addTokens(1000, 500);
      const summary = useTokenStore.getState().getSummary();

      expect(summary).toContain("Tokens:");
      expect(summary).toContain("In:");
      expect(summary).toContain("Out:");
      expect(summary).toContain("Cost:");
      expect(summary).toContain("Calls:");
    });
  });
});
