/**
 * Tests for DSL error formatter
 */

import { describe, it, expect, vi } from "vitest";
import {
  formatDslError,
  formatDslErrors,
  formatParseErrors,
  writeDslErrorToTerminal,
  formatQuickError,
  formatQuickWarning,
  formatUnknownCommand,
  formatMissingParam,
  formatInvalidValue,
  parseErrorToDslError,
  ANSI,
} from "./errorFormatter";
import { DslErrorCode, createDslError, unknownCommandError } from "./errors";
import type { ParseResult, ParseError } from "./ast";

describe("formatDslError", () => {
  it("should format syntax error correctly", () => {
    const error = createDslError(
      DslErrorCode.UNEXPECTED_TOKEN,
      "Expected RPAREN, got 'EOF'",
      { line: 1, column: 10 },
      { source: "EOF" }
    );

    const result = formatDslError(error);

    expect(result.severity).toBe("error");
    expect(result.category).toBe("syntax");
    expect(result.formatted).toContain("Syntax Error");
    expect(result.formatted).toContain("[1001]");
    expect(result.formatted).toContain("line 1, column 10");
    expect(result.plain).toContain("Syntax Error");
    expect(result.plain).not.toContain("\x1b");
  });

  it("should format command error correctly", () => {
    const error = unknownCommandError("wll", { line: 1, column: 1 }, ["wall"]);

    const result = formatDslError(error);

    expect(result.severity).toBe("error");
    expect(result.category).toBe("command");
    expect(result.formatted).toContain("Command Error");
    expect(result.formatted).toContain("wll");
    expect(result.formatted).toContain("wall");
    expect(result.formatted).toContain("Did you mean");
  });

  it("should format validation error as warning", () => {
    const error = createDslError(
      DslErrorCode.WALL_TOO_SHORT,
      "Wall length (0.05m) is too short. Minimum is 0.1m",
      { line: 1, column: 1 }
    );

    const result = formatDslError(error);

    expect(result.severity).toBe("warning");
    expect(result.category).toBe("validation");
    expect(result.formatted).toContain("Validation Error");
  });

  it("should include source line with position indicator", () => {
    const error = createDslError(
      DslErrorCode.UNEXPECTED_TOKEN,
      "Expected number",
      { line: 1, column: 12 },
      { source: "abc", context: {} }
    );

    const sourceLine = "wall (0, 0) abc";
    const result = formatDslError(error, sourceLine);

    // Should contain the source line and position indicator
    expect(result.formatted).toContain("wall (0, 0) abc");
    expect(result.formatted).toContain("^");
  });

  it("should include suggestion for unknown command", () => {
    const error = unknownCommandError("wlal", { line: 1, column: 1 }, ["wall"]);

    const result = formatDslError(error);

    expect(result.formatted).toContain("Tip:");
    expect(result.formatted).toContain("Did you mean");
    expect(result.formatted).toContain("wall");
  });

  it("should include suggestion for missing param", () => {
    const error = createDslError(
      DslErrorCode.MISSING_REQUIRED_PARAM,
      "Missing required parameter 'start' for 'wall'",
      { line: 1, column: 5 },
      { context: { param: "start", command: "wall" } }
    );

    const result = formatDslError(error);

    expect(result.formatted).toContain("Tip:");
    expect(result.formatted).toContain("start");
  });
});

describe("formatDslErrors", () => {
  it("should format multiple errors", () => {
    const errors = [
      createDslError(DslErrorCode.UNEXPECTED_TOKEN, "Error 1", { line: 1, column: 1 }),
      createDslError(DslErrorCode.UNKNOWN_COMMAND, "Error 2", { line: 2, column: 1 }),
    ];

    const results = formatDslErrors(errors);

    expect(results).toHaveLength(2);
    expect(results[0].formatted).toContain("Error 1");
    expect(results[1].formatted).toContain("Error 2");
  });

  it("should include correct source lines for each error", () => {
    const source = "wall (0, 0) (5\nxyz";
    const errors = [
      createDslError(DslErrorCode.UNEXPECTED_END_OF_INPUT, "Missing )", { line: 1, column: 15 }),
      createDslError(DslErrorCode.UNKNOWN_COMMAND, "Unknown cmd", { line: 2, column: 1 }),
    ];

    const results = formatDslErrors(errors, source);

    expect(results[0].formatted).toContain("wall (0, 0) (5");
    expect(results[1].formatted).toContain("xyz");
  });
});

describe("parseErrorToDslError", () => {
  it("should convert parse error with 'Expected' message", () => {
    const parseError: ParseError = {
      message: "Expected RPAREN, got EOF",
      line: 1,
      column: 10,
      tokenValue: "EOF",
    };

    const result = parseErrorToDslError(parseError);

    expect(result.code).toBe(DslErrorCode.UNEXPECTED_TOKEN);
    expect(result.message).toBe("Expected RPAREN, got EOF");
    expect(result.position.line).toBe(1);
    expect(result.position.column).toBe(10);
  });

  it("should convert parse error for unknown command with suggestions", () => {
    const parseError: ParseError = {
      message: "Unexpected token: IDENTIFIER",
      line: 1,
      column: 1,
      tokenValue: "wll",
    };

    const result = parseErrorToDslError(parseError);

    expect(result.code).toBe(DslErrorCode.UNKNOWN_COMMAND);
    expect(result.context?.suggestions).toBeDefined();
    expect((result.context?.suggestions as string[])).toContain("wall");
  });

  it("should convert parse error for missing start point", () => {
    const parseError: ParseError = {
      message: "expected start point",
      line: 1,
      column: 5,
    };

    const result = parseErrorToDslError(parseError);

    expect(result.code).toBe(DslErrorCode.MISSING_REQUIRED_PARAM);
  });
});

describe("formatParseErrors", () => {
  it("should format parse result errors", () => {
    const result: ParseResult = {
      commands: [],
      errors: [
        { message: "Expected number", line: 1, column: 10 },
        { message: "Unexpected token", line: 2, column: 1, tokenValue: "???" },
      ],
      success: false,
    };

    const formatted = formatParseErrors(result, "wall (0, 0) abc\n???");

    expect(formatted).toHaveLength(2);
    expect(formatted[0].formatted).toContain("Expected number");
    expect(formatted[1].formatted).toContain("Unexpected token");
  });
});

describe("writeDslErrorToTerminal", () => {
  it("should write each line to terminal", () => {
    const terminal = {
      writeln: vi.fn(),
    };

    const error = createDslError(
      DslErrorCode.UNKNOWN_COMMAND,
      "Unknown command: 'wll'",
      { line: 1, column: 1 }
    );

    const formatted = formatDslError(error);
    writeDslErrorToTerminal(terminal, formatted);

    // Should have called writeln for each line
    expect(terminal.writeln).toHaveBeenCalled();
    const calls = terminal.writeln.mock.calls;
    const allText = calls.map((c) => c[0]).join("\n");
    expect(allText).toContain("Command Error");
  });
});

describe("Quick formatting helpers", () => {
  describe("formatQuickError", () => {
    it("should format error with message", () => {
      const result = formatQuickError("Something went wrong");
      expect(result).toContain("Error:");
      expect(result).toContain("Something went wrong");
      expect(result).toContain(ANSI.brightRed);
    });

    it("should include suggestion when provided", () => {
      const result = formatQuickError("Something went wrong", "Try again");
      expect(result).toContain("Tip:");
      expect(result).toContain("Try again");
    });
  });

  describe("formatQuickWarning", () => {
    it("should format warning with message", () => {
      const result = formatQuickWarning("Be careful");
      expect(result).toContain("Warning:");
      expect(result).toContain("Be careful");
      expect(result).toContain(ANSI.brightYellow);
    });
  });

  describe("formatUnknownCommand", () => {
    it("should format with suggestions", () => {
      const result = formatUnknownCommand("wll", ["wall", "walls"]);
      expect(result).toContain("Unknown command:");
      expect(result).toContain("wll");
      expect(result).toContain("Did you mean:");
      expect(result).toContain("wall");
    });

    it("should format without suggestions", () => {
      const result = formatUnknownCommand("xyz");
      expect(result).toContain("Unknown command:");
      expect(result).toContain("help");
    });
  });

  describe("formatMissingParam", () => {
    it("should format with param and command", () => {
      const result = formatMissingParam("start", "wall");
      expect(result).toContain("Missing parameter:");
      expect(result).toContain("start");
      expect(result).toContain("wall");
    });

    it("should include usage when provided", () => {
      const result = formatMissingParam("start", "wall", "wall (x1, y1) (x2, y2)");
      expect(result).toContain("Usage:");
      expect(result).toContain("wall (x1, y1) (x2, y2)");
    });
  });

  describe("formatInvalidValue", () => {
    it("should format with value and expectation", () => {
      const result = formatInvalidValue("height", "abc", "a number");
      expect(result).toContain("Invalid value:");
      expect(result).toContain("abc");
      expect(result).toContain("height");
      expect(result).toContain("a number");
    });
  });
});

describe("ANSI constants", () => {
  it("should have all required colors", () => {
    expect(ANSI.reset).toBe("\x1b[0m");
    expect(ANSI.bold).toBe("\x1b[1m");
    expect(ANSI.red).toBe("\x1b[31m");
    expect(ANSI.green).toBe("\x1b[32m");
    expect(ANSI.yellow).toBe("\x1b[33m");
    expect(ANSI.cyan).toBe("\x1b[36m");
    expect(ANSI.brightRed).toBe("\x1b[91m");
    expect(ANSI.brightYellow).toBe("\x1b[93m");
    expect(ANSI.brightGreen).toBe("\x1b[92m");
  });
});
