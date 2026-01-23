/**
 * Error Formatter Tests
 *
 * Tests for MCP error formatting functions.
 */

import { describe, it, expect, vi } from "vitest";
import {
  formatError,
  formatValidationError,
  formatNetworkError,
  formatTimeoutError,
  formatServerError,
  formatMethodNotFoundError,
  formatResourceNotFoundError,
  writeErrorToTerminal,
  fromJsError,
  McpErrorCode,
  type McpError,
} from "./errorFormatter";

describe("errorFormatter", () => {
  describe("formatError", () => {
    it("formats a basic error with code and message", () => {
      const error: McpError = {
        code: McpErrorCode.INTERNAL_ERROR,
        message: "Something went wrong",
      };

      const result = formatError(error);

      expect(result.code).toBe(McpErrorCode.INTERNAL_ERROR);
      expect(result.errorType).toBe("Internal Server Error");
      expect(result.severity).toBe("error");
      expect(result.plain).toContain("Something went wrong");
      expect(result.suggestion).toBeDefined();
    });

    it("formats a validation error", () => {
      const error: McpError = {
        code: McpErrorCode.VALIDATION_ERROR,
        message: "Invalid input",
      };

      const result = formatError(error);

      expect(result.errorType).toBe("Validation Error");
      expect(result.severity).toBe("warning");
    });

    it("formats a method not found error", () => {
      const error: McpError = {
        code: McpErrorCode.METHOD_NOT_FOUND,
        message: "Unknown tool: foo",
      };

      const result = formatError(error);

      expect(result.errorType).toBe("Method Not Found");
      expect(result.severity).toBe("error");
      expect(result.suggestion).toContain("help");
    });

    it("includes error details when present", () => {
      const error: McpError = {
        code: McpErrorCode.VALIDATION_ERROR,
        message: "Invalid parameters",
        data: { field: "start", expected: "array", got: "string" },
      };

      const result = formatError(error);

      expect(result.plain).toContain("field");
      expect(result.plain).toContain("expected");
      expect(result.plain).toContain("got");
    });

    it("includes timestamp when present", () => {
      const timestamp = new Date().toISOString();
      const error: McpError = {
        code: McpErrorCode.INTERNAL_ERROR,
        message: "Error occurred",
        timestamp,
      };

      const result = formatError(error);

      expect(result.plain).toContain("Occurred at:");
    });

    it("handles unknown error codes gracefully", () => {
      const error: McpError = {
        code: -99999,
        message: "Unknown error type",
      };

      const result = formatError(error);

      expect(result.errorType).toBe("Unknown Error");
      expect(result.severity).toBe("error");
    });

    it("includes ANSI codes in formatted output", () => {
      const error: McpError = {
        code: McpErrorCode.INTERNAL_ERROR,
        message: "Test error",
      };

      const result = formatError(error);

      // Check for ANSI escape codes
      expect(result.formatted).toContain("\x1b[");
      expect(result.formatted).toContain("\x1b[0m");
    });

    it("plain output has no ANSI codes", () => {
      const error: McpError = {
        code: McpErrorCode.INTERNAL_ERROR,
        message: "Test error",
      };

      const result = formatError(error);

      // Plain should not contain ANSI escape codes
      expect(result.plain).not.toContain("\x1b[");
    });
  });

  describe("formatValidationError", () => {
    it("creates a validation error with field errors", () => {
      const result = formatValidationError("Invalid input", {
        start: "Required field",
        end: "Must be an array",
      });

      expect(result.code).toBe(McpErrorCode.VALIDATION_ERROR);
      expect(result.errorType).toBe("Validation Error");
      expect(result.severity).toBe("warning");
      expect(result.plain).toContain("start");
      expect(result.plain).toContain("end");
    });

    it("works without field errors", () => {
      const result = formatValidationError("General validation error");

      expect(result.code).toBe(McpErrorCode.VALIDATION_ERROR);
      expect(result.plain).toContain("General validation error");
    });
  });

  describe("formatNetworkError", () => {
    it("creates a network error with URL", () => {
      const result = formatNetworkError(
        "Failed to fetch",
        "http://localhost:8000/api"
      );

      expect(result.code).toBe(McpErrorCode.NETWORK_ERROR);
      expect(result.errorType).toBe("Network Error");
      expect(result.severity).toBe("error");
      expect(result.plain).toContain("localhost:8000");
    });

    it("works without URL", () => {
      const result = formatNetworkError("Network request failed");

      expect(result.code).toBe(McpErrorCode.NETWORK_ERROR);
      expect(result.plain).toContain("Network request failed");
    });
  });

  describe("formatTimeoutError", () => {
    it("creates a timeout error with operation and duration", () => {
      const result = formatTimeoutError("create_wall", 30000);

      expect(result.code).toBe(McpErrorCode.TIMEOUT_ERROR);
      expect(result.errorType).toBe("Timeout");
      expect(result.severity).toBe("warning");
      expect(result.plain).toContain("create_wall");
      expect(result.plain).toContain("30000");
    });
  });

  describe("formatServerError", () => {
    it("creates a server error with details", () => {
      const result = formatServerError("Internal server error", {
        stack_trace: "Error at line 42",
      });

      expect(result.code).toBe(McpErrorCode.INTERNAL_ERROR);
      expect(result.errorType).toBe("Internal Server Error");
      expect(result.severity).toBe("error");
      // Note: underscores in keys are replaced with spaces in formatted output
      expect(result.plain).toContain("stack trace");
    });

    it("includes timestamp", () => {
      const result = formatServerError("Server crashed");

      expect(result.plain).toContain("Occurred at:");
    });
  });

  describe("formatMethodNotFoundError", () => {
    it("creates a method not found error", () => {
      const result = formatMethodNotFoundError("unknown_tool");

      expect(result.code).toBe(McpErrorCode.METHOD_NOT_FOUND);
      expect(result.errorType).toBe("Method Not Found");
      expect(result.plain).toContain("unknown_tool");
      expect(result.suggestion).toContain("help");
    });
  });

  describe("formatResourceNotFoundError", () => {
    it("creates a resource not found error", () => {
      const result = formatResourceNotFoundError("wall", "wall-123");

      expect(result.code).toBe(McpErrorCode.RESOURCE_NOT_FOUND);
      expect(result.errorType).toBe("Resource Not Found");
      expect(result.plain).toContain("wall");
      expect(result.plain).toContain("wall-123");
      expect(result.suggestion).toContain("list");
    });
  });

  describe("writeErrorToTerminal", () => {
    it("writes each line to terminal", () => {
      const mockTerminal = {
        writeln: vi.fn(),
      };

      const error: McpError = {
        code: McpErrorCode.INTERNAL_ERROR,
        message: "Test error",
      };

      const formatted = formatError(error);
      writeErrorToTerminal(mockTerminal, formatted);

      // Should have called writeln for each line
      expect(mockTerminal.writeln).toHaveBeenCalled();
      expect(mockTerminal.writeln.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe("fromJsError", () => {
    it("converts a TypeError to network error when it involves fetch", () => {
      const jsError = new TypeError("Failed to fetch");
      const result = fromJsError(jsError);

      expect(result.code).toBe(McpErrorCode.NETWORK_ERROR);
      expect(result.message).toContain("Network");
    });

    it("converts an AbortError to timeout error", () => {
      const jsError = new Error("Aborted");
      jsError.name = "AbortError";
      const result = fromJsError(jsError);

      expect(result.code).toBe(McpErrorCode.TIMEOUT_ERROR);
    });

    it("converts unknown errors to internal errors", () => {
      const jsError = new Error("Unknown error");
      const result = fromJsError(jsError);

      expect(result.code).toBe(McpErrorCode.INTERNAL_ERROR);
      expect(result.message).toBe("Unknown error");
    });
  });

  describe("error severity colors", () => {
    it("uses red for errors", () => {
      const error: McpError = {
        code: McpErrorCode.INTERNAL_ERROR,
        message: "Error",
      };

      const result = formatError(error);

      // Bright red ANSI code
      expect(result.formatted).toContain("\x1b[91m");
    });

    it("uses yellow for warnings", () => {
      const error: McpError = {
        code: McpErrorCode.VALIDATION_ERROR,
        message: "Warning",
      };

      const result = formatError(error);

      // Bright yellow ANSI code
      expect(result.formatted).toContain("\x1b[93m");
    });
  });

  describe("all error codes have suggestions", () => {
    const errorCodes = [
      McpErrorCode.PARSE_ERROR,
      McpErrorCode.INVALID_REQUEST,
      McpErrorCode.METHOD_NOT_FOUND,
      McpErrorCode.INVALID_PARAMS,
      McpErrorCode.INTERNAL_ERROR,
      McpErrorCode.VALIDATION_ERROR,
      McpErrorCode.RESOURCE_NOT_FOUND,
      McpErrorCode.RESOURCE_CONFLICT,
      McpErrorCode.PERMISSION_DENIED,
      McpErrorCode.RATE_LIMITED,
      McpErrorCode.SERVICE_UNAVAILABLE,
      McpErrorCode.NETWORK_ERROR,
      McpErrorCode.TIMEOUT_ERROR,
      McpErrorCode.CONNECTION_REFUSED,
      McpErrorCode.CONNECTION_LOST,
    ];

    it.each(errorCodes)("error code %s has a suggestion", (code) => {
      const error: McpError = {
        code,
        message: "Test error",
      };

      const result = formatError(error);

      expect(result.suggestion).toBeDefined();
      expect(result.suggestion?.length).toBeGreaterThan(0);
    });
  });
});
