/**
 * Token Counter Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  estimateTokens,
  estimateRequestTokens,
  estimateResponseTokens,
  calculateCost,
  calculateTokenUsage,
  checkThresholds,
  formatTokenCount,
  formatCost,
  TokenCounter,
  getTokenCounter,
  resetTokenCounter,
  configureTokenCounter,
  DEFAULT_THRESHOLDS,
  MODEL_PRICING,
  type TokenThreshold,
} from "./tokenCounter";

describe("tokenCounter", () => {
  describe("estimateTokens", () => {
    it("should return 0 for empty string", () => {
      expect(estimateTokens("")).toBe(0);
    });

    it("should return 0 for null/undefined", () => {
      expect(estimateTokens(null as unknown as string)).toBe(0);
      expect(estimateTokens(undefined as unknown as string)).toBe(0);
    });

    it("should estimate tokens based on character count", () => {
      // ~4 chars per token + 10% overhead
      const text = "Hello world"; // 11 chars
      const tokens = estimateTokens(text);
      // 11/4 = 2.75 -> ceil = 3, + 10% overhead = ~4
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it("should handle longer text", () => {
      const text = "a".repeat(1000);
      const tokens = estimateTokens(text);
      // 1000/4 = 250 + 10% = ~275
      expect(tokens).toBeGreaterThanOrEqual(250);
      expect(tokens).toBeLessThanOrEqual(300);
    });
  });

  describe("estimateRequestTokens", () => {
    it("should estimate tokens for a simple request", () => {
      const tokens = estimateRequestTokens("create_wall", {
        start: [0, 0],
        end: [10, 0],
      });
      expect(tokens).toBeGreaterThan(0);
    });

    it("should handle empty arguments", () => {
      const tokens = estimateRequestTokens("list_elements", {});
      expect(tokens).toBeGreaterThan(0);
    });

    it("should increase with larger arguments", () => {
      const smallTokens = estimateRequestTokens("test", { a: 1 });
      const largeTokens = estimateRequestTokens("test", {
        a: 1,
        b: "long string here with lots of text",
        c: [1, 2, 3, 4, 5],
        d: { nested: { deep: { value: "test" } } },
      });
      expect(largeTokens).toBeGreaterThan(smallTokens);
    });
  });

  describe("estimateResponseTokens", () => {
    it("should estimate tokens for a success response", () => {
      const response = {
        success: true,
        data: { id: "123", name: "Wall 1" },
      };
      const tokens = estimateResponseTokens(response);
      expect(tokens).toBeGreaterThan(0);
    });

    it("should estimate tokens for an error response", () => {
      const response = {
        success: false,
        error: { code: -32600, message: "Invalid request" },
      };
      const tokens = estimateResponseTokens(response);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe("calculateCost", () => {
    it("should calculate cost with default pricing", () => {
      const cost = calculateCost(1000, 500);
      // Default: 0.25 input, 1.25 output per million
      const expected = (1000 / 1_000_000) * 0.25 + (500 / 1_000_000) * 1.25;
      expect(cost).toBeCloseTo(expected, 8);
    });

    it("should calculate cost for opus model", () => {
      const cost = calculateCost(1000, 500, "claude-3-opus");
      // Opus: 15.0 input, 75.0 output per million
      const expected = (1000 / 1_000_000) * 15.0 + (500 / 1_000_000) * 75.0;
      expect(cost).toBeCloseTo(expected, 8);
    });

    it("should use default pricing for unknown model", () => {
      const cost = calculateCost(1000, 500, "unknown-model");
      const defaultCost = calculateCost(1000, 500, "default");
      expect(cost).toBe(defaultCost);
    });
  });

  describe("calculateTokenUsage", () => {
    it("should return complete token usage", () => {
      const usage = calculateTokenUsage(
        "create_wall",
        { start: [0, 0], end: [10, 0] },
        { success: true, data: { id: "123" } }
      );

      expect(usage.inputTokens).toBeGreaterThan(0);
      expect(usage.outputTokens).toBeGreaterThan(0);
      expect(usage.totalTokens).toBe(usage.inputTokens + usage.outputTokens);
      expect(usage.estimatedCostUsd).toBeGreaterThan(0);
    });
  });

  describe("checkThresholds", () => {
    it("should return empty array when no thresholds crossed", () => {
      const crossed = checkThresholds(5000, 4000, DEFAULT_THRESHOLDS);
      expect(crossed).toHaveLength(0);
    });

    it("should detect crossed thresholds", () => {
      const crossed = checkThresholds(15000, 8000, DEFAULT_THRESHOLDS);
      expect(crossed.length).toBeGreaterThan(0);
      expect(crossed[0].value).toBe(10000);
    });

    it("should detect multiple crossed thresholds", () => {
      const crossed = checkThresholds(60000, 5000, DEFAULT_THRESHOLDS);
      // Should cross 10K and 50K
      expect(crossed.length).toBe(2);
    });

    it("should work with custom thresholds", () => {
      const customThresholds: TokenThreshold[] = [
        { value: 100, message: "100 tokens", severity: "info" },
        { value: 500, message: "500 tokens", severity: "warning" },
      ];
      const crossed = checkThresholds(150, 50, customThresholds);
      expect(crossed.length).toBe(1);
      expect(crossed[0].value).toBe(100);
    });
  });

  describe("formatTokenCount", () => {
    it("should format small numbers as-is", () => {
      expect(formatTokenCount(500)).toBe("500");
    });

    it("should format thousands with K", () => {
      expect(formatTokenCount(1500)).toBe("1.5K");
      expect(formatTokenCount(10000)).toBe("10.0K");
    });

    it("should format millions with M", () => {
      expect(formatTokenCount(1500000)).toBe("1.5M");
    });
  });

  describe("formatCost", () => {
    it("should format small costs with 4 decimals", () => {
      expect(formatCost(0.0012)).toBe("$0.0012");
    });

    it("should format larger costs with 2 decimals", () => {
      expect(formatCost(1.5)).toBe("$1.50");
      expect(formatCost(0.05)).toBe("$0.05");
    });
  });

  describe("TokenCounter class", () => {
    let counter: TokenCounter;

    beforeEach(() => {
      counter = new TokenCounter();
    });

    it("should start with zero stats", () => {
      const stats = counter.getStats();
      expect(stats.totalInputTokens).toBe(0);
      expect(stats.totalOutputTokens).toBe(0);
      expect(stats.totalCalls).toBe(0);
      expect(stats.totalCostUsd).toBe(0);
    });

    it("should record usage", () => {
      const usage = counter.recordUsage(
        "create_wall",
        { start: [0, 0], end: [10, 0] },
        { success: true, data: { id: "123" } }
      );

      expect(usage.inputTokens).toBeGreaterThan(0);
      expect(usage.outputTokens).toBeGreaterThan(0);

      const stats = counter.getStats();
      expect(stats.totalInputTokens).toBe(usage.inputTokens);
      expect(stats.totalOutputTokens).toBe(usage.outputTokens);
      expect(stats.totalCalls).toBe(1);
    });

    it("should accumulate usage across calls", () => {
      counter.recordUsage("tool1", { a: 1 }, { success: true });
      counter.recordUsage("tool2", { b: 2 }, { success: true });

      const stats = counter.getStats();
      expect(stats.totalCalls).toBe(2);
      expect(stats.totalInputTokens).toBeGreaterThan(0);
    });

    it("should estimate request tokens", () => {
      const estimate = counter.estimateRequest("create_wall", {
        start: [0, 0],
        end: [10, 0],
      });
      expect(estimate).toBeGreaterThan(0);
    });

    it("should reset stats", () => {
      counter.recordUsage("test", { a: 1 }, { success: true });
      counter.reset();

      const stats = counter.getStats();
      expect(stats.totalInputTokens).toBe(0);
      expect(stats.totalCalls).toBe(0);
    });

    it("should call threshold callback", () => {
      const thresholdCalls: TokenThreshold[] = [];
      const customCounter = new TokenCounter({
        thresholds: [{ value: 10, message: "Test", severity: "info" }],
        onThresholdCrossed: (t) => thresholdCalls.push(t),
      });

      // Generate enough tokens to cross threshold
      const longText = "a".repeat(100);
      customCounter.recordUsage(
        "test",
        { data: longText },
        { success: true, data: { result: longText } }
      );

      expect(thresholdCalls.length).toBeGreaterThan(0);
    });

    it("should generate summary string", () => {
      counter.recordUsage("test", { a: 1 }, { success: true });
      const summary = counter.getSummary();

      expect(summary).toContain("Tokens:");
      expect(summary).toContain("Cost:");
      expect(summary).toContain("Calls:");
    });
  });

  describe("global token counter", () => {
    beforeEach(() => {
      resetTokenCounter();
    });

    it("should return singleton instance", () => {
      const counter1 = getTokenCounter();
      const counter2 = getTokenCounter();
      expect(counter1).toBe(counter2);
    });

    it("should reset singleton", () => {
      const counter = getTokenCounter();
      counter.recordUsage("test", { a: 1 }, { success: true });

      resetTokenCounter();

      const stats = getTokenCounter().getStats();
      expect(stats.totalCalls).toBe(0);
    });

    it("should configure singleton", () => {
      const thresholdCalls: TokenThreshold[] = [];
      configureTokenCounter({
        model: "claude-3-opus",
        onThresholdCrossed: (t) => thresholdCalls.push(t),
      });

      const counter = getTokenCounter();
      expect(counter).toBeDefined();
    });
  });

  describe("MODEL_PRICING", () => {
    it("should have all expected models", () => {
      expect(MODEL_PRICING["claude-3-opus"]).toBeDefined();
      expect(MODEL_PRICING["claude-3-sonnet"]).toBeDefined();
      expect(MODEL_PRICING["claude-3-haiku"]).toBeDefined();
      expect(MODEL_PRICING.default).toBeDefined();
    });

    it("should have valid pricing values", () => {
      for (const model of Object.values(MODEL_PRICING)) {
        expect(model.inputPerMillion).toBeGreaterThan(0);
        expect(model.outputPerMillion).toBeGreaterThan(0);
      }
    });
  });

  describe("DEFAULT_THRESHOLDS", () => {
    it("should be sorted by value", () => {
      for (let i = 1; i < DEFAULT_THRESHOLDS.length; i++) {
        expect(DEFAULT_THRESHOLDS[i].value).toBeGreaterThan(
          DEFAULT_THRESHOLDS[i - 1].value
        );
      }
    });

    it("should have valid severity levels", () => {
      const validSeverities = ["info", "warning", "error"];
      for (const threshold of DEFAULT_THRESHOLDS) {
        expect(validSeverities).toContain(threshold.severity);
      }
    });
  });
});
