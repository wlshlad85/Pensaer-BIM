/**
 * Tests for MCP Tool Call Logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  LogLevel,
  MCPToolLogger,
  ConsoleLogTarget,
  JsonLogTarget,
  getMCPLogger,
  resetMCPLogger,
  createMCPLogger,
  configureMCPLogger,
  type ToolCallLogEntry,
  type LogOutputTarget,
} from "./logging";
import type { MCPToolResult } from "./types";

describe("LogLevel", () => {
  it("should have correct numeric ordering", () => {
    expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO);
    expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN);
    expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR);
    expect(LogLevel.ERROR).toBeLessThan(LogLevel.NONE);
  });
});

describe("MCPToolLogger", () => {
  let logger: MCPToolLogger;
  let mockTarget: LogOutputTarget;
  let writtenEntries: ToolCallLogEntry[];

  beforeEach(() => {
    writtenEntries = [];
    mockTarget = {
      write: vi.fn((entry: ToolCallLogEntry) => {
        writtenEntries.push(entry);
      }),
      flush: vi.fn(),
    };
    logger = new MCPToolLogger({
      level: LogLevel.DEBUG,
      targets: [mockTarget],
    });
  });

  afterEach(() => {
    resetMCPLogger();
  });

  describe("logRequest", () => {
    it("should log request with correct fields", () => {
      const requestId = "test-request-123";
      const call = { tool: "create_wall", arguments: { start: [0, 0], end: [10, 0] } };

      logger.logRequest(requestId, call, "geometry");

      expect(mockTarget.write).toHaveBeenCalledTimes(1);
      expect(writtenEntries[0]).toMatchObject({
        requestId,
        event: "request",
        tool: "create_wall",
        server: "geometry",
        level: LogLevel.INFO,
        levelName: "INFO",
      });
      expect(writtenEntries[0].params).toEqual({ start: [0, 0], end: [10, 0] });
      expect(writtenEntries[0].timestamp).toBeDefined();
    });

    it("should not log request when logRequests is disabled", () => {
      logger.configure({ logRequests: false });

      logger.logRequest("test-id", { tool: "test", arguments: {} });

      expect(mockTarget.write).not.toHaveBeenCalled();
    });

    it("should not log request when level is higher than INFO", () => {
      logger.setLevel(LogLevel.ERROR);

      logger.logRequest("test-id", { tool: "test", arguments: {} });

      expect(mockTarget.write).not.toHaveBeenCalled();
    });

    it("should redact sensitive fields", () => {
      logger.logRequest("test-id", {
        tool: "auth",
        arguments: {
          username: "user",
          password: "secret123",
          apiKey: "key123",
          nested: { token: "abc" },
        },
      });

      expect(writtenEntries[0].params).toEqual({
        username: "user",
        password: "[REDACTED]",
        apiKey: "[REDACTED]",
        nested: { token: "[REDACTED]" },
      });
    });
  });

  describe("logResponse", () => {
    it("should log successful response", () => {
      const requestId = "test-response-123";
      const result: MCPToolResult = {
        success: true,
        data: { wall_id: "wall-1" },
        timestamp: new Date().toISOString(),
      };

      logger.logResponse(requestId, "create_wall", result, "geometry");

      expect(mockTarget.write).toHaveBeenCalledTimes(1);
      expect(writtenEntries[0]).toMatchObject({
        requestId,
        event: "response",
        tool: "create_wall",
        server: "geometry",
        level: LogLevel.INFO,
      });
      expect(writtenEntries[0].result).toBeDefined();
    });

    it("should log failed response with WARN level", () => {
      const result: MCPToolResult = {
        success: false,
        error: { code: -1, message: "Failed" },
      };

      logger.logResponse("test-id", "test_tool", result);

      expect(writtenEntries[0].level).toBe(LogLevel.WARN);
    });

    it("should include duration when timing is enabled", () => {
      // First log request to start timing
      logger.logRequest("test-id", { tool: "test", arguments: {} });

      // Small delay
      const start = performance.now();
      while (performance.now() - start < 10) {
        // Wait a bit
      }

      logger.logResponse("test-id", "test", { success: true });

      expect(writtenEntries[1].durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should truncate large response data", () => {
      const largeData: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`key${i}`] = "x".repeat(20);
      }

      logger.logResponse("test-id", "test", {
        success: true,
        data: largeData,
      });

      const loggedResult = writtenEntries[0].result;
      expect(loggedResult?.data?._truncated).toBe(true);
      expect(loggedResult?.data?._preview).toBeDefined();
    });
  });

  describe("logError", () => {
    it("should log Error objects", () => {
      const error = new Error("Something went wrong");
      error.stack = "Error: Something went wrong\n    at test.ts:10";

      logger.logError("test-id", "test_tool", error, "geometry");

      expect(writtenEntries[0]).toMatchObject({
        event: "error",
        level: LogLevel.ERROR,
        levelName: "ERROR",
        error: {
          code: -1,
          message: "Something went wrong",
          stack: expect.stringContaining("Something went wrong"),
        },
      });
    });

    it("should log error objects with code", () => {
      const error = { code: -32603, message: "Internal error" };

      logger.logError("test-id", "test_tool", error);

      expect(writtenEntries[0].error).toMatchObject({
        code: -32603,
        message: "Internal error",
      });
    });
  });

  describe("debug", () => {
    it("should log debug messages", () => {
      logger.debug("test_tool", "Debug message", { extra: "data" });

      expect(writtenEntries[0]).toMatchObject({
        level: LogLevel.DEBUG,
        levelName: "DEBUG",
        tool: "test_tool",
        metadata: { message: "Debug message", extra: "data" },
      });
    });

    it("should not log debug when level is INFO or higher", () => {
      logger.setLevel(LogLevel.INFO);

      logger.debug("test", "message");

      expect(mockTarget.write).not.toHaveBeenCalled();
    });
  });

  describe("configuration", () => {
    it("should allow changing log level", () => {
      logger.setLevel(LogLevel.ERROR);
      expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });

    it("should allow adding and removing targets", () => {
      const newTarget: LogOutputTarget = { write: vi.fn() };

      logger.addTarget(newTarget);
      logger.logRequest("test", { tool: "test", arguments: {} });

      expect(newTarget.write).toHaveBeenCalled();

      logger.removeTarget(newTarget);
      logger.logRequest("test2", { tool: "test", arguments: {} });

      expect(newTarget.write).toHaveBeenCalledTimes(1);
    });

    it("should flush all targets", () => {
      logger.flush();

      expect(mockTarget.flush).toHaveBeenCalled();
    });
  });
});

describe("ConsoleLogTarget", () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
    groupCollapsed: ReturnType<typeof vi.spyOn>;
    groupEnd: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
      groupCollapsed: vi.spyOn(console, "groupCollapsed").mockImplementation(() => {}),
      groupEnd: vi.spyOn(console, "groupEnd").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should use grouped logging for requests", () => {
    const target = new ConsoleLogTarget({ useGrouping: true });
    const entry: ToolCallLogEntry = {
      requestId: "test-id",
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      levelName: "INFO",
      event: "request",
      tool: "create_wall",
      server: "geometry",
      params: { start: [0, 0] },
    };

    target.write(entry);

    expect(consoleSpy.groupCollapsed).toHaveBeenCalled();
    expect(consoleSpy.groupEnd).toHaveBeenCalled();
  });

  it("should use error logging for errors", () => {
    const target = new ConsoleLogTarget();
    const entry: ToolCallLogEntry = {
      requestId: "test-id",
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      levelName: "ERROR",
      event: "error",
      tool: "test_tool",
      error: { code: -1, message: "Test error" },
    };

    target.write(entry);

    expect(consoleSpy.error).toHaveBeenCalled();
  });
});

describe("JsonLogTarget", () => {
  it("should store entries in memory", () => {
    const target = new JsonLogTarget({ maxEntries: 100 });
    const entry: ToolCallLogEntry = {
      requestId: "test-id",
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      levelName: "INFO",
      event: "request",
      tool: "test",
    };

    target.write(entry);

    expect(target.getEntries()).toHaveLength(1);
    expect(target.getEntries()[0]).toEqual(entry);
  });

  it("should trim entries when exceeding max", () => {
    const target = new JsonLogTarget({ maxEntries: 3 });

    for (let i = 0; i < 5; i++) {
      target.write({
        requestId: `id-${i}`,
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        levelName: "INFO",
        event: "request",
        tool: "test",
      });
    }

    const entries = target.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0].requestId).toBe("id-2");
    expect(entries[2].requestId).toBe("id-4");
  });

  it("should filter entries by criteria", () => {
    const target = new JsonLogTarget();

    target.write({
      requestId: "1",
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      levelName: "INFO",
      event: "request",
      tool: "tool_a",
      server: "geometry",
    });
    target.write({
      requestId: "2",
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      levelName: "ERROR",
      event: "error",
      tool: "tool_b",
      server: "spatial",
    });

    expect(target.getFilteredEntries({ tool: "tool_a" })).toHaveLength(1);
    expect(target.getFilteredEntries({ server: "spatial" })).toHaveLength(1);
    expect(target.getFilteredEntries({ level: LogLevel.ERROR })).toHaveLength(1);
    expect(target.getFilteredEntries({ event: "request" })).toHaveLength(1);
  });

  it("should export entries as JSON", () => {
    const target = new JsonLogTarget();
    target.write({
      requestId: "1",
      timestamp: "2024-01-01T00:00:00.000Z",
      level: LogLevel.INFO,
      levelName: "INFO",
      event: "request",
      tool: "test",
    });

    const exported = target.export();
    const parsed = JSON.parse(exported);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].requestId).toBe("1");
  });

  it("should clear entries", () => {
    const target = new JsonLogTarget();
    target.write({
      requestId: "1",
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      levelName: "INFO",
      event: "request",
      tool: "test",
    });

    target.clear();

    expect(target.getEntries()).toHaveLength(0);
  });
});

describe("Singleton management", () => {
  beforeEach(() => {
    resetMCPLogger();
  });

  afterEach(() => {
    resetMCPLogger();
  });

  it("should return the same instance from getMCPLogger", () => {
    const logger1 = getMCPLogger();
    const logger2 = getMCPLogger();

    expect(logger1).toBe(logger2);
  });

  it("should create new instance with createMCPLogger", () => {
    const logger1 = createMCPLogger();
    const logger2 = createMCPLogger();

    expect(logger1).not.toBe(logger2);
  });

  it("should reset singleton with resetMCPLogger", () => {
    const logger1 = getMCPLogger();
    resetMCPLogger();
    const logger2 = getMCPLogger();

    expect(logger1).not.toBe(logger2);
  });

  it("should configure singleton with configureMCPLogger", () => {
    configureMCPLogger({ level: LogLevel.ERROR });

    expect(getMCPLogger().getLevel()).toBe(LogLevel.ERROR);
  });
});

describe("Integration scenarios", () => {
  it("should handle full request/response cycle", () => {
    const entries: ToolCallLogEntry[] = [];
    const target: LogOutputTarget = {
      write: (entry) => entries.push(entry),
    };

    const logger = new MCPToolLogger({
      level: LogLevel.DEBUG,
      targets: [target],
    });

    // Simulate request
    const requestId = "cycle-test-1";
    logger.logRequest(requestId, {
      tool: "create_wall",
      arguments: { start: [0, 0], end: [10, 0], height: 3 },
    }, "geometry");

    // Simulate response
    logger.logResponse(requestId, "create_wall", {
      success: true,
      data: { wall_id: "wall-123", length: 10 },
      event_id: "evt-456",
    }, "geometry");

    expect(entries).toHaveLength(2);
    expect(entries[0].event).toBe("request");
    expect(entries[1].event).toBe("response");
    expect(entries[1].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("should handle error scenarios", () => {
    const entries: ToolCallLogEntry[] = [];
    const target: LogOutputTarget = {
      write: (entry) => entries.push(entry),
    };

    const logger = new MCPToolLogger({
      level: LogLevel.DEBUG,
      targets: [target],
    });

    const requestId = "error-test-1";
    logger.logRequest(requestId, {
      tool: "invalid_tool",
      arguments: {},
    }, "geometry");

    logger.logError(requestId, "invalid_tool", {
      code: -32601,
      message: "Method not found",
    }, "geometry");

    expect(entries).toHaveLength(2);
    expect(entries[1].event).toBe("error");
    expect(entries[1].error?.code).toBe(-32601);
  });
});
