/**
 * Tests for MCP Types Validation
 */

import { describe, it, expect } from "vitest";
import { validateMCPToolResult, getValidationErrors } from "./types";

describe("validateMCPToolResult", () => {
  it("should validate a minimal successful response", () => {
    expect(validateMCPToolResult({ success: true })).toBe(true);
    expect(validateMCPToolResult({ success: false })).toBe(true);
  });

  it("should validate a full successful response", () => {
    const response = {
      success: true,
      data: { id: "wall-1", type: "wall" },
      event_id: "evt-123",
      timestamp: "2024-01-01T00:00:00Z",
      warnings: ["Warning message"],
    };

    expect(validateMCPToolResult(response)).toBe(true);
  });

  it("should validate an error response", () => {
    const response = {
      success: false,
      error: {
        code: -32603,
        message: "Internal error",
        data: { details: "Something went wrong" },
      },
      timestamp: "2024-01-01T00:00:00Z",
    };

    expect(validateMCPToolResult(response)).toBe(true);
  });

  it("should reject null", () => {
    expect(validateMCPToolResult(null)).toBe(false);
  });

  it("should reject undefined", () => {
    expect(validateMCPToolResult(undefined)).toBe(false);
  });

  it("should reject non-object", () => {
    expect(validateMCPToolResult("string")).toBe(false);
    expect(validateMCPToolResult(123)).toBe(false);
    expect(validateMCPToolResult([])).toBe(false);
  });

  it("should reject missing success field", () => {
    expect(validateMCPToolResult({ data: {} })).toBe(false);
  });

  it("should reject non-boolean success field", () => {
    expect(validateMCPToolResult({ success: "true" })).toBe(false);
    expect(validateMCPToolResult({ success: 1 })).toBe(false);
  });

  it("should reject invalid error structure", () => {
    expect(validateMCPToolResult({ success: false, error: "string" })).toBe(
      false
    );
    expect(validateMCPToolResult({ success: false, error: null })).toBe(false);
    expect(
      validateMCPToolResult({ success: false, error: { code: "not-a-number" } })
    ).toBe(false);
    expect(
      validateMCPToolResult({ success: false, error: { code: 1, message: 123 } })
    ).toBe(false);
  });

  it("should reject non-object data", () => {
    expect(validateMCPToolResult({ success: true, data: "string" })).toBe(
      false
    );
    expect(validateMCPToolResult({ success: true, data: null })).toBe(false);
  });

  it("should reject non-array warnings", () => {
    expect(validateMCPToolResult({ success: true, warnings: "string" })).toBe(
      false
    );
  });

  it("should reject warnings with non-string elements", () => {
    expect(validateMCPToolResult({ success: true, warnings: [1, 2, 3] })).toBe(
      false
    );
    expect(
      validateMCPToolResult({ success: true, warnings: ["valid", 123] })
    ).toBe(false);
  });
});

describe("getValidationErrors", () => {
  it("should return empty array for valid response", () => {
    const response = {
      success: true,
      data: { id: "1" },
    };

    expect(getValidationErrors(response)).toEqual([]);
  });

  it("should detect non-object response", () => {
    const errors = getValidationErrors(null);

    expect(errors).toContainEqual({
      field: "response",
      expected: "object",
      received: "object", // typeof null === "object"
    });
  });

  it("should detect missing success field", () => {
    const errors = getValidationErrors({ data: {} });

    expect(errors).toContainEqual({
      field: "success",
      expected: "boolean",
      received: "undefined",
    });
  });

  it("should detect invalid success field type", () => {
    const errors = getValidationErrors({ success: "true" });

    expect(errors).toContainEqual({
      field: "success",
      expected: "boolean",
      received: "string",
    });
  });

  it("should detect invalid error structure", () => {
    const errors = getValidationErrors({
      success: false,
      error: "string",
    });

    expect(errors).toContainEqual({
      field: "error",
      expected: "object",
      received: "string",
    });
  });

  it("should detect invalid error.code type", () => {
    const errors = getValidationErrors({
      success: false,
      error: { code: "not-a-number", message: "test" },
    });

    expect(errors).toContainEqual({
      field: "error.code",
      expected: "number",
      received: "string",
    });
  });

  it("should detect invalid error.message type", () => {
    const errors = getValidationErrors({
      success: false,
      error: { code: -1, message: 123 },
    });

    expect(errors).toContainEqual({
      field: "error.message",
      expected: "string",
      received: "number",
    });
  });

  it("should detect invalid data type", () => {
    const errors = getValidationErrors({
      success: true,
      data: "string",
    });

    expect(errors).toContainEqual({
      field: "data",
      expected: "object",
      received: "string",
    });
  });

  it("should detect invalid warnings type", () => {
    const errors = getValidationErrors({
      success: true,
      warnings: "not-an-array",
    });

    expect(errors).toContainEqual({
      field: "warnings",
      expected: "array",
      received: "string",
    });
  });

  it("should detect mixed warnings array", () => {
    const errors = getValidationErrors({
      success: true,
      warnings: ["valid", 123],
    });

    expect(errors).toContainEqual({
      field: "warnings[]",
      expected: "string",
      received: "mixed",
    });
  });

  it("should collect multiple errors", () => {
    const errors = getValidationErrors({
      success: "not-boolean",
      error: "not-object",
      data: "not-object",
    });

    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
