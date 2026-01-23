/**
 * Tests for DSL error types and utilities
 */

import { describe, it, expect } from "vitest";
import {
  DslErrorCode,
  createDslError,
  unexpectedTokenError,
  unexpectedEndError,
  unknownCommandError,
  missingParamError,
  invalidParamValueError,
  unknownVariableError,
  wallTooShortError,
  levenshteinDistance,
  findSimilar,
  KNOWN_COMMANDS,
} from "./errors";

describe("DslErrorCode", () => {
  it("should have syntax errors in 1xxx range", () => {
    expect(DslErrorCode.UNEXPECTED_TOKEN).toBe(1001);
    expect(DslErrorCode.UNEXPECTED_END_OF_INPUT).toBe(1002);
    expect(DslErrorCode.UNTERMINATED_STRING).toBe(1003);
  });

  it("should have command errors in 2xxx range", () => {
    expect(DslErrorCode.UNKNOWN_COMMAND).toBe(2001);
    expect(DslErrorCode.MISSING_REQUIRED_PARAM).toBe(2002);
    expect(DslErrorCode.INVALID_PARAM_VALUE).toBe(2003);
  });

  it("should have reference errors in 3xxx range", () => {
    expect(DslErrorCode.UNKNOWN_VARIABLE).toBe(3001);
    expect(DslErrorCode.INVALID_ELEMENT_REF).toBe(3002);
  });

  it("should have validation errors in 4xxx range", () => {
    expect(DslErrorCode.WALL_TOO_SHORT).toBe(4001);
    expect(DslErrorCode.INVALID_COORDINATES).toBe(4002);
    expect(DslErrorCode.NEGATIVE_DIMENSION).toBe(4003);
  });
});

describe("createDslError", () => {
  it("should create error with required fields", () => {
    const error = createDslError(
      DslErrorCode.UNEXPECTED_TOKEN,
      "Test message",
      { line: 1, column: 5 }
    );

    expect(error.code).toBe(DslErrorCode.UNEXPECTED_TOKEN);
    expect(error.message).toBe("Test message");
    expect(error.position.line).toBe(1);
    expect(error.position.column).toBe(5);
  });

  it("should create error with optional fields", () => {
    const error = createDslError(
      DslErrorCode.UNKNOWN_COMMAND,
      "Unknown command",
      { line: 2, column: 1 },
      { source: "wll", context: { suggestions: ["wall"] } }
    );

    expect(error.source).toBe("wll");
    expect(error.context?.suggestions).toEqual(["wall"]);
  });
});

describe("Error factory functions", () => {
  it("unexpectedTokenError creates correct error", () => {
    const error = unexpectedTokenError("IDENTIFIER", "123", { line: 1, column: 1 });

    expect(error.code).toBe(DslErrorCode.UNEXPECTED_TOKEN);
    expect(error.message).toBe("Expected IDENTIFIER, got '123'");
    expect(error.source).toBe("123");
    expect(error.context?.expected).toBe("IDENTIFIER");
    expect(error.context?.got).toBe("123");
  });

  it("unexpectedEndError creates correct error", () => {
    const error = unexpectedEndError("end point", { line: 1, column: 20 });

    expect(error.code).toBe(DslErrorCode.UNEXPECTED_END_OF_INPUT);
    expect(error.message).toBe("Unexpected end of input, expected end point");
  });

  it("unknownCommandError with suggestions", () => {
    const error = unknownCommandError("wll", { line: 1, column: 1 }, ["wall", "walls"]);

    expect(error.code).toBe(DslErrorCode.UNKNOWN_COMMAND);
    expect(error.message).toBe("Unknown command: 'wll'. Did you mean: wall, walls?");
    expect(error.source).toBe("wll");
    expect(error.context?.suggestions).toEqual(["wall", "walls"]);
  });

  it("unknownCommandError without suggestions", () => {
    const error = unknownCommandError("xyz", { line: 1, column: 1 });

    expect(error.code).toBe(DslErrorCode.UNKNOWN_COMMAND);
    expect(error.message).toBe("Unknown command: 'xyz'");
    expect(error.context?.suggestions).toBeUndefined();
  });

  it("missingParamError creates correct error", () => {
    const error = missingParamError("start", "wall", { line: 1, column: 5 });

    expect(error.code).toBe(DslErrorCode.MISSING_REQUIRED_PARAM);
    expect(error.message).toBe("Missing required parameter 'start' for 'wall'");
    expect(error.context?.param).toBe("start");
    expect(error.context?.command).toBe("wall");
  });

  it("invalidParamValueError creates correct error", () => {
    const error = invalidParamValueError(
      "height",
      "abc",
      "a number",
      { line: 1, column: 15 }
    );

    expect(error.code).toBe(DslErrorCode.INVALID_PARAM_VALUE);
    expect(error.message).toBe("Invalid value 'abc' for 'height', expected a number");
    expect(error.source).toBe("abc");
  });

  it("unknownVariableError with available vars", () => {
    const error = unknownVariableError(
      "$foo",
      { line: 1, column: 5 },
      ["$last", "$selected", "$wall"]
    );

    expect(error.code).toBe(DslErrorCode.UNKNOWN_VARIABLE);
    expect(error.message).toBe("Unknown variable: '$foo'. Available: $last, $selected, $wall");
  });

  it("wallTooShortError creates correct error", () => {
    const error = wallTooShortError(0.05, 0.1, { line: 1, column: 1 });

    expect(error.code).toBe(DslErrorCode.WALL_TOO_SHORT);
    expect(error.message).toContain("too short");
    expect(error.message).toContain("0.05");
    expect(error.message).toContain("0.1");
    expect(error.context?.length).toBe(0.05);
    expect(error.context?.minLength).toBe(0.1);
  });
});

describe("levenshteinDistance", () => {
  it("should return 0 for identical strings", () => {
    expect(levenshteinDistance("wall", "wall")).toBe(0);
    expect(levenshteinDistance("", "")).toBe(0);
  });

  it("should return string length for empty vs non-empty", () => {
    expect(levenshteinDistance("abc", "")).toBe(3);
    expect(levenshteinDistance("", "abc")).toBe(3);
  });

  it("should calculate correct distance for simple edits", () => {
    // One substitution
    expect(levenshteinDistance("wall", "woll")).toBe(1);
    // One insertion
    expect(levenshteinDistance("wall", "walls")).toBe(1);
    // One deletion
    expect(levenshteinDistance("walls", "wall")).toBe(1);
    // Multiple edits
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
  });

  it("should handle case-sensitive comparison", () => {
    expect(levenshteinDistance("Wall", "wall")).toBe(1);
    expect(levenshteinDistance("WALL", "wall")).toBe(4);
  });
});

describe("findSimilar", () => {
  it("should find exact match first", () => {
    const result = findSimilar("wall", KNOWN_COMMANDS);
    expect(result[0]).toBe("wall");
  });

  it("should find close matches", () => {
    const result = findSimilar("wll", KNOWN_COMMANDS);
    expect(result).toContain("wall");
  });

  it("should find 'door' for 'dor'", () => {
    const result = findSimilar("dor", KNOWN_COMMANDS);
    expect(result).toContain("door");
  });

  it("should find 'window' for 'windo'", () => {
    const result = findSimilar("windo", KNOWN_COMMANDS);
    expect(result).toContain("window");
  });

  it("should return empty for very different strings", () => {
    const result = findSimilar("xyz123", KNOWN_COMMANDS);
    expect(result).toEqual([]);
  });

  it("should limit number of suggestions", () => {
    const result = findSimilar("w", ["wall", "walls", "window", "wow", "web"]);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("should sort by distance", () => {
    const result = findSimilar("wall", ["walls", "wll", "wall", "ball"]);
    // Exact match should be first
    expect(result[0]).toBe("wall");
  });
});

describe("KNOWN_COMMANDS", () => {
  it("should include all DSL commands", () => {
    expect(KNOWN_COMMANDS).toContain("wall");
    expect(KNOWN_COMMANDS).toContain("walls");
    expect(KNOWN_COMMANDS).toContain("door");
    expect(KNOWN_COMMANDS).toContain("window");
    expect(KNOWN_COMMANDS).toContain("opening");
    expect(KNOWN_COMMANDS).toContain("rect");
    expect(KNOWN_COMMANDS).toContain("box");
    expect(KNOWN_COMMANDS).toContain("help");
  });
});
