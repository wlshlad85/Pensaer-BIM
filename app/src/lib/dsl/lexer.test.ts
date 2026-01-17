/**
 * DSL Lexer Tests
 *
 * Tests for the Pensaer DSL lexer tokenization.
 */

import { describe, it, expect } from "vitest";
import { Lexer, tokenize } from "./lexer";
import { TokenType } from "./tokens";

describe("Lexer", () => {
  describe("basic tokens", () => {
    it("tokenizes integers", () => {
      const { tokens, errors } = tokenize("42");
      expect(errors).toHaveLength(0);
      expect(tokens).toHaveLength(2); // 42 + EOF
      expect(tokens[0].type).toBe(TokenType.INTEGER);
      expect(tokens[0].value).toBe(42);
    });

    it("tokenizes floats", () => {
      const { tokens, errors } = tokenize("3.14");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.FLOAT);
      expect(tokens[0].value).toBe(3.14);
    });

    it("tokenizes negative numbers", () => {
      const { tokens, errors } = tokenize("-10");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.INTEGER);
      expect(tokens[0].value).toBe(-10);
    });

    it("tokenizes strings", () => {
      const { tokens, errors } = tokenize('"hello world"');
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("hello world");
    });

    it("tokenizes single-quoted strings", () => {
      const { tokens, errors } = tokenize("'kitchen'");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("kitchen");
    });
  });

  describe("unit conversion", () => {
    it("converts mm to meters", () => {
      const { tokens, errors } = tokenize("1000mm");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.FLOAT);
      expect(tokens[0].value).toBeCloseTo(1.0, 5);
    });

    it("converts cm to meters", () => {
      const { tokens, errors } = tokenize("100cm");
      expect(errors).toHaveLength(0);
      expect(tokens[0].value).toBeCloseTo(1.0, 5);
    });

    it("converts ft to meters", () => {
      const { tokens, errors } = tokenize("1ft");
      expect(errors).toHaveLength(0);
      expect(tokens[0].value).toBeCloseTo(0.3048, 4);
    });

    it("converts in to meters", () => {
      const { tokens, errors } = tokenize("1in");
      expect(errors).toHaveLength(0);
      expect(tokens[0].value).toBeCloseTo(0.0254, 4);
    });

    it("keeps meters as meters", () => {
      const { tokens, errors } = tokenize("5m");
      expect(errors).toHaveLength(0);
      expect(tokens[0].value).toBe(5);
    });
  });

  describe("keywords", () => {
    it("tokenizes wall keyword", () => {
      const { tokens, errors } = tokenize("wall");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.WALL);
      expect(tokens[0].value).toBe("wall");
    });

    it("tokenizes door keyword", () => {
      const { tokens, errors } = tokenize("door");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.DOOR);
    });

    it("tokenizes window keyword", () => {
      const { tokens, errors } = tokenize("window");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.WINDOW);
    });

    it("tokenizes structural keyword", () => {
      const { tokens, errors } = tokenize("structural");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.STRUCTURAL);
    });

    it("tokenizes from keyword", () => {
      const { tokens, errors } = tokenize("from");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.FROM);
    });

    it("tokenizes to keyword", () => {
      const { tokens, errors } = tokenize("to");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.TO);
    });
  });

  describe("variables", () => {
    it("tokenizes $last variable", () => {
      const { tokens, errors } = tokenize("$last");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.VAR_LAST);
    });

    it("tokenizes $selected variable", () => {
      const { tokens, errors } = tokenize("$selected");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.VAR_SELECTED);
    });

    it("tokenizes $wall variable", () => {
      const { tokens, errors } = tokenize("$wall");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.VAR_WALL);
    });

    it("reports error for unknown variable", () => {
      const { tokens, errors } = tokenize("$unknown");
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("Unknown variable");
      expect(tokens[0].type).toBe(TokenType.ERROR);
    });
  });

  describe("options", () => {
    it("tokenizes long option --height", () => {
      const { tokens, errors } = tokenize("--height");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.LONG_HEIGHT);
    });

    it("tokenizes long option --width", () => {
      const { tokens, errors } = tokenize("--width");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.LONG_WIDTH);
    });

    it("tokenizes long option with equals", () => {
      const { tokens, errors } = tokenize("--height=");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.LONG_HEIGHT);
    });

    it("tokenizes short option -h", () => {
      const { tokens, errors } = tokenize("-h");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.OPT_H);
    });

    it("tokenizes short option -w", () => {
      const { tokens, errors } = tokenize("-w");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.OPT_W);
    });

    it("reports error for unknown long option", () => {
      const { tokens, errors } = tokenize("--unknown");
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("Unknown option");
    });
  });

  describe("punctuation", () => {
    it("tokenizes parentheses", () => {
      const { tokens, errors } = tokenize("()");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.LPAREN);
      expect(tokens[1].type).toBe(TokenType.RPAREN);
    });

    it("tokenizes comma", () => {
      const { tokens, errors } = tokenize(",");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.COMMA);
    });

    it("tokenizes at sign", () => {
      const { tokens, errors } = tokenize("@");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.AT_SIGN);
    });
  });

  describe("UUIDs", () => {
    it("tokenizes valid UUID", () => {
      const { tokens, errors } = tokenize("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.UUID);
      expect(tokens[0].value).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    });

    it("normalizes UUID to lowercase", () => {
      const { tokens, errors } = tokenize("A1B2C3D4-E5F6-7890-ABCD-EF1234567890");
      expect(errors).toHaveLength(0);
      expect(tokens[0].value).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    });
  });

  describe("comments", () => {
    it("skips single-line comments", () => {
      const { tokens, errors } = tokenize("wall # this is a comment\ndoor");
      expect(errors).toHaveLength(0);
      // Should have: wall, newline, door, EOF
      expect(tokens.filter((t) => t.type !== TokenType.NEWLINE && t.type !== TokenType.EOF)).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.WALL);
      expect(tokens[2].type).toBe(TokenType.DOOR);
    });
  });

  describe("full commands", () => {
    it("tokenizes simple wall command", () => {
      const { tokens, errors } = tokenize("wall (0, 0) (5, 0)");
      expect(errors).toHaveLength(0);

      const types = tokens.map((t) => t.type);
      expect(types).toEqual([
        TokenType.WALL,
        TokenType.LPAREN,
        TokenType.INTEGER,
        TokenType.COMMA,
        TokenType.INTEGER,
        TokenType.RPAREN,
        TokenType.LPAREN,
        TokenType.INTEGER,
        TokenType.COMMA,
        TokenType.INTEGER,
        TokenType.RPAREN,
        TokenType.EOF,
      ]);
    });

    it("tokenizes wall command with options", () => {
      const { tokens, errors } = tokenize("wall from (0, 0) to (5, 0) height 3");
      expect(errors).toHaveLength(0);

      const types = tokens.map((t) => t.type);
      expect(types).toContain(TokenType.WALL);
      expect(types).toContain(TokenType.FROM);
      expect(types).toContain(TokenType.TO);
      expect(types).toContain(TokenType.HEIGHT);
    });

    it("tokenizes door command with variable", () => {
      const { tokens, errors } = tokenize("door in $last at 2.5");
      expect(errors).toHaveLength(0);

      const types = tokens.map((t) => t.type);
      expect(types).toContain(TokenType.DOOR);
      expect(types).toContain(TokenType.IN);
      expect(types).toContain(TokenType.VAR_LAST);
      expect(types).toContain(TokenType.AT);
    });

    it("tokenizes window command with long options", () => {
      const { tokens, errors } = tokenize("window $wall @1 --width 1.5 --height 1.2");
      expect(errors).toHaveLength(0);

      const types = tokens.map((t) => t.type);
      expect(types).toContain(TokenType.WINDOW);
      expect(types).toContain(TokenType.VAR_WALL);
      expect(types).toContain(TokenType.AT_SIGN);
      expect(types).toContain(TokenType.LONG_WIDTH);
      expect(types).toContain(TokenType.LONG_HEIGHT);
    });

    it("tokenizes walls rect command", () => {
      const { tokens, errors } = tokenize("walls rect (0, 0) (10, 8) height 3 type structural");
      expect(errors).toHaveLength(0);

      const types = tokens.map((t) => t.type);
      expect(types).toContain(TokenType.WALLS);
      expect(types).toContain(TokenType.RECT);
      expect(types).toContain(TokenType.HEIGHT);
      expect(types).toContain(TokenType.TYPE);
      expect(types).toContain(TokenType.STRUCTURAL);
    });
  });

  describe("position tracking", () => {
    it("tracks line and column", () => {
      const { tokens, errors } = tokenize("wall\ndoor");
      expect(errors).toHaveLength(0);

      // wall is on line 1, column 1
      expect(tokens[0].line).toBe(1);
      expect(tokens[0].column).toBe(1);

      // door is on line 2, column 1
      const doorToken = tokens.find((t) => t.type === TokenType.DOOR);
      expect(doorToken?.line).toBe(2);
      expect(doorToken?.column).toBe(1);
    });
  });

  describe("Lexer class", () => {
    it("can be instantiated directly", () => {
      const lexer = new Lexer("wall 5");
      const { tokens, errors } = lexer.tokenize();
      expect(errors).toHaveLength(0);
      expect(tokens[0].type).toBe(TokenType.WALL);
    });
  });
});
