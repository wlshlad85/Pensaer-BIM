/**
 * Tests for Timeout Utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TimeoutError,
  CancellationError,
  RequestTracker,
  withTimeout,
  withRetry,
  calculateRetryDelay,
  isRetryableError,
  DEFAULT_RETRY_CONFIG,
} from "./timeout";

describe("TimeoutError", () => {
  it("should create with correct properties", () => {
    const error = new TimeoutError("Request timed out", 5000, "req-123");

    expect(error.message).toBe("Request timed out");
    expect(error.timeout).toBe(5000);
    expect(error.requestId).toBe("req-123");
    expect(error.code).toBe(-2);
    expect(error.name).toBe("TimeoutError");
  });

  it("should work without requestId", () => {
    const error = new TimeoutError("Timed out", 3000);

    expect(error.timeout).toBe(3000);
    expect(error.requestId).toBeUndefined();
  });
});

describe("CancellationError", () => {
  it("should create with correct properties", () => {
    const error = new CancellationError("Request cancelled", "req-456");

    expect(error.message).toBe("Request cancelled");
    expect(error.requestId).toBe("req-456");
    expect(error.code).toBe(-3);
    expect(error.name).toBe("CancellationError");
  });
});

describe("RequestTracker", () => {
  let tracker: RequestTracker<string>;

  beforeEach(() => {
    tracker = new RequestTracker<string>();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should generate unique IDs", () => {
    const id1 = tracker.generateId();
    const id2 = tracker.generateId();

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it("should register and track pending requests", () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    tracker.register("req-1", resolve, reject);

    expect(tracker.has("req-1")).toBe(true);
    expect(tracker.size).toBe(1);
    expect(tracker.getPendingIds()).toContain("req-1");
  });

  it("should resolve pending requests", () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    tracker.register("req-1", resolve, reject);
    const result = tracker.resolve("req-1", "success");

    expect(result).toBe(true);
    expect(resolve).toHaveBeenCalledWith("success");
    expect(reject).not.toHaveBeenCalled();
    expect(tracker.has("req-1")).toBe(false);
  });

  it("should reject pending requests", () => {
    const resolve = vi.fn();
    const reject = vi.fn();
    const error = new Error("Test error");

    tracker.register("req-1", resolve, reject);
    const result = tracker.reject("req-1", error);

    expect(result).toBe(true);
    expect(reject).toHaveBeenCalledWith(error);
    expect(resolve).not.toHaveBeenCalled();
    expect(tracker.has("req-1")).toBe(false);
  });

  it("should return false when resolving/rejecting non-existent request", () => {
    expect(tracker.resolve("non-existent", "value")).toBe(false);
    expect(tracker.reject("non-existent", new Error("error"))).toBe(false);
  });

  it("should handle timeout", () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    tracker.register("req-1", resolve, reject);
    tracker.setTimeout("req-1", 1000);

    expect(tracker.has("req-1")).toBe(true);

    vi.advanceTimersByTime(1000);

    expect(tracker.has("req-1")).toBe(false);
    expect(reject).toHaveBeenCalled();
    expect(reject.mock.calls[0][0]).toBeInstanceOf(TimeoutError);
  });

  it("should cancel pending requests", () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    tracker.register("req-1", resolve, reject);
    const result = tracker.cancel("req-1");

    expect(result).toBe(true);
    expect(reject).toHaveBeenCalled();
    expect(reject.mock.calls[0][0]).toBeInstanceOf(CancellationError);
  });

  it("should cancel all pending requests", () => {
    const resolve1 = vi.fn();
    const reject1 = vi.fn();
    const resolve2 = vi.fn();
    const reject2 = vi.fn();

    tracker.register("req-1", resolve1, reject1);
    tracker.register("req-2", resolve2, reject2);

    tracker.cancelAll();

    expect(tracker.size).toBe(0);
    expect(reject1).toHaveBeenCalled();
    expect(reject2).toHaveBeenCalled();
  });

  it("should track elapsed time", () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    tracker.register("req-1", resolve, reject);

    vi.advanceTimersByTime(500);

    expect(tracker.getElapsedTime("req-1")).toBe(500);
    expect(tracker.getElapsedTime("non-existent")).toBeUndefined();
  });

  it("should increment attempt count", () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    tracker.register("req-1", resolve, reject);

    expect(tracker.incrementAttempt("req-1")).toBe(2);
    expect(tracker.incrementAttempt("req-1")).toBe(3);
    expect(tracker.incrementAttempt("non-existent")).toBeUndefined();
  });

  it("should clear timeout when resolved", () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    tracker.register("req-1", resolve, reject);
    tracker.setTimeout("req-1", 1000);
    tracker.resolve("req-1", "success");

    vi.advanceTimersByTime(2000);

    // Should not reject after being resolved
    expect(reject).not.toHaveBeenCalled();
  });
});

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should resolve if promise completes before timeout", async () => {
    const promise = Promise.resolve("success");
    const result = await withTimeout(promise, 1000);
    expect(result).toBe("success");
  });

  it("should throw TimeoutError if promise exceeds timeout", async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve("success"), 2000);
    });

    const timeoutPromise = withTimeout(promise, 1000, "req-123");

    vi.advanceTimersByTime(1000);

    await expect(timeoutPromise).rejects.toThrow(TimeoutError);
    await expect(timeoutPromise).rejects.toMatchObject({
      timeout: 1000,
      requestId: "req-123",
    });
  });
});

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const getErrorCode = vi.fn();

    const result = await withRetry(fn, getErrorCode);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on retryable errors", async () => {
    // Create proper Errors with code property
    const retryError = Object.assign(new Error("Retryable error"), { code: -1 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(retryError)
      .mockRejectedValueOnce(retryError)
      .mockResolvedValue("success");

    const getErrorCode = (error: unknown) => {
      if (error && typeof error === "object" && "code" in error) {
        return (error as { code: number }).code;
      }
      return undefined;
    };

    const promise = withRetry(fn, getErrorCode, {
      maxRetries: 3,
      initialDelay: 100,
    });

    // Advance through retry delays until promise resolves
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(200);
    }

    const result = await promise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should not retry non-retryable errors", async () => {
    // Create a proper Error with code property
    const testError = Object.assign(new Error("Non-retryable error"), { code: -999 });
    const fn = vi.fn().mockRejectedValue(testError);

    const getErrorCode = (error: unknown) => {
      if (error && typeof error === "object" && "code" in error) {
        return (error as { code: number }).code;
      }
      return undefined;
    };

    await expect(
      withRetry(fn, getErrorCode, { maxRetries: 3 })
    ).rejects.toMatchObject({ code: -999 });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should throw after max retries exceeded", async () => {
    // Create a proper Error with code property
    const testError = Object.assign(new Error("Retryable error"), { code: -1 });
    const fn = vi.fn().mockRejectedValue(testError);

    const getErrorCode = () => -1;

    const promise = withRetry(fn, getErrorCode, {
      maxRetries: 2,
      initialDelay: 100,
      maxDelay: 1000,
    });

    // Prevent unhandled rejection warning by adding a catch handler
    // This doesn't prevent the test from verifying the rejection
    promise.catch(() => {});

    // Advance through all retries
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(1000);
    }

    await expect(promise).rejects.toMatchObject({ code: -1 });
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});

describe("calculateRetryDelay", () => {
  it("should calculate exponential backoff", () => {
    const config = { ...DEFAULT_RETRY_CONFIG, initialDelay: 1000 };

    // Note: Results include jitter (±10%), so we check ranges
    const delay1 = calculateRetryDelay(1, config);
    const delay2 = calculateRetryDelay(2, config);
    const delay3 = calculateRetryDelay(3, config);

    expect(delay1).toBeGreaterThanOrEqual(900); // 1000 - 10%
    expect(delay1).toBeLessThanOrEqual(1100); // 1000 + 10%

    expect(delay2).toBeGreaterThanOrEqual(1800); // 2000 - 10%
    expect(delay2).toBeLessThanOrEqual(2200); // 2000 + 10%

    expect(delay3).toBeGreaterThanOrEqual(3600); // 4000 - 10%
    expect(delay3).toBeLessThanOrEqual(4400); // 4000 + 10%
  });

  it("should respect maxDelay", () => {
    const config = {
      ...DEFAULT_RETRY_CONFIG,
      initialDelay: 10000,
      maxDelay: 15000,
    };

    const delay = calculateRetryDelay(10, config);

    expect(delay).toBeLessThanOrEqual(16500); // maxDelay + 10% jitter
  });
});

describe("isRetryableError", () => {
  it("should return true for retryable error codes", () => {
    expect(isRetryableError(-1)).toBe(true); // Network error
    expect(isRetryableError(-2)).toBe(true); // Timeout
    expect(isRetryableError(-32006)).toBe(true); // Service unavailable
  });

  it("should return false for non-retryable error codes", () => {
    expect(isRetryableError(-32601)).toBe(false); // Method not found
    expect(isRetryableError(-32602)).toBe(false); // Invalid params
    expect(isRetryableError(-999)).toBe(false); // Unknown code
  });

  it("should use custom config", () => {
    const customConfig = {
      ...DEFAULT_RETRY_CONFIG,
      retryableCodes: [-100, -200],
    };

    expect(isRetryableError(-100, customConfig)).toBe(true);
    expect(isRetryableError(-1, customConfig)).toBe(false);
  });
});
