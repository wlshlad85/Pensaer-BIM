/**
 * Lexer for the Pensaer DSL.
 *
 * Tokenizes DSL input into a stream of tokens for the parser.
 * Supports wall, door, window, and opening commands with units and options.
 */

import {
  KEYWORDS,
  LONG_OPTIONS,
  SHORT_OPTIONS,
  UNIT_CONVERSIONS,
  VARIABLES,
  type LexerError,
  type Token,
  TokenType,
} from "./tokens";

// UUID pattern: 8-4-4-4-12 hex chars
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Number with optional unit suffix (longer suffixes first for greedy match)
const NUMBER_PATTERN = /^-?\d+(?:\.\d+)?(?:mm|cm|ft|in|m)?/i;

// Identifier pattern (letters, digits, underscore, hyphen)
const IDENT_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*/;

// String pattern (single or double quoted)
const STRING_PATTERN = /^(?:"[^"]*"|'[^']*')/;

// Unit extraction pattern
const UNIT_EXTRACT_PATTERN = /(m|mm|cm|ft|in)$/i;

/**
 * Tokenizer for the Pensaer DSL grammar.
 *
 * @example
 * const lexer = new Lexer("wall (0, 0) (5, 0) height 3");
 * const result = lexer.tokenize();
 * console.log(result.tokens);
 */
export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private errors: LexerError[] = [];

  constructor(source: string) {
    this.source = source;
  }

  /**
   * Get current character or null if at end.
   */
  private get currentChar(): string | null {
    if (this.pos >= this.source.length) {
      return null;
    }
    return this.source[this.pos];
  }

  /**
   * Peek at character at offset from current position.
   */
  private peek(offset: number = 1): string | null {
    const pos = this.pos + offset;
    if (pos >= this.source.length) {
      return null;
    }
    return this.source[pos];
  }

  /**
   * Advance position by count characters.
   */
  private advance(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.pos < this.source.length) {
        if (this.source[this.pos] === "\n") {
          this.line++;
          this.column = 1;
        } else {
          this.column++;
        }
        this.pos++;
      }
    }
  }

  /**
   * Skip whitespace characters (except newlines).
   */
  private skipWhitespace(): void {
    while (this.currentChar !== null && " \t\r".includes(this.currentChar)) {
      this.advance();
    }
  }

  /**
   * Skip comment until end of line.
   */
  private skipComment(): void {
    while (this.currentChar !== null && this.currentChar !== "\n") {
      this.advance();
    }
  }

  /**
   * Create a token at current position.
   */
  private makeToken(
    type: TokenType,
    value: string | number | null,
    raw: string,
  ): Token {
    return {
      type,
      value,
      line: this.line,
      column: this.column - raw.length,
      raw,
    };
  }

  /**
   * Record a lexer error.
   */
  private addError(message: string, raw: string = ""): void {
    this.errors.push({
      message,
      line: this.line,
      column: this.column,
      raw,
    });
  }

  /**
   * Convert a dimension value to meters.
   */
  private convertToMeters(value: number, unit: string): number {
    return value * (UNIT_CONVERSIONS[unit.toLowerCase()] ?? 1.0);
  }

  /**
   * Try to read a UUID token.
   */
  private readUUID(): Token | null {
    const remaining = this.source.slice(this.pos);
    const match = UUID_PATTERN.exec(remaining);
    if (match) {
      const raw = match[0];
      this.advance(raw.length);
      return this.makeToken(TokenType.UUID, raw.toLowerCase(), raw);
    }
    return null;
  }

  /**
   * Read a number with optional unit suffix.
   */
  private readNumber(): Token | null {
    const remaining = this.source.slice(this.pos);
    const match = NUMBER_PATTERN.exec(remaining);
    if (match) {
      const raw = match[0];
      this.advance(raw.length);

      // Extract numeric part and unit
      const unitMatch = UNIT_EXTRACT_PATTERN.exec(raw);
      let value: number;
      let hasUnit = false;

      if (unitMatch) {
        const numStr = raw.slice(0, unitMatch.index);
        const unit = unitMatch[1].toLowerCase();
        value = this.convertToMeters(parseFloat(numStr), unit);
        hasUnit = true;
      } else {
        value = raw.includes(".") ? parseFloat(raw) : parseInt(raw, 10);
      }

      // Unit-converted values are always FLOAT (value was transformed)
      // Otherwise, check if the value is an integer
      const tokenType =
        hasUnit || !Number.isInteger(value)
          ? TokenType.FLOAT
          : TokenType.INTEGER;

      return this.makeToken(tokenType, value, raw);
    }
    return null;
  }

  /**
   * Read a quoted string.
   */
  private readString(): Token | null {
    const remaining = this.source.slice(this.pos);
    const match = STRING_PATTERN.exec(remaining);
    if (match) {
      const raw = match[0];
      this.advance(raw.length);
      // Remove quotes
      const value = raw.slice(1, -1);
      return this.makeToken(TokenType.STRING, value, raw);
    }
    return null;
  }

  /**
   * Read a variable reference ($last, $selected, $wall).
   */
  private readVariable(): Token | null {
    if (this.currentChar !== "$") {
      return null;
    }

    const start = this.pos;
    this.advance(); // skip $

    // Read variable name
    while (
      this.currentChar !== null &&
      (/[a-zA-Z0-9_]/.test(this.currentChar))
    ) {
      this.advance();
    }

    const raw = this.source.slice(start, this.pos);
    const varLower = raw.toLowerCase();

    if (varLower in VARIABLES) {
      return this.makeToken(VARIABLES[varLower], raw, raw);
    }

    // Unknown variable - treat as error
    this.addError(`Unknown variable: ${raw}`, raw);
    return this.makeToken(TokenType.ERROR, raw, raw);
  }

  /**
   * Read a long option (--height, --width, etc.).
   */
  private readLongOption(): Token | null {
    if (this.currentChar !== "-" || this.peek() !== "-") {
      return null;
    }

    const start = this.pos;
    this.advance(2); // skip --

    // Read option name (may include hyphen like sill-height)
    const nameStart = this.pos;
    while (
      this.currentChar !== null &&
      (/[a-zA-Z0-9-]/.test(this.currentChar))
    ) {
      this.advance();
    }

    const optionName = this.source.slice(nameStart, this.pos).toLowerCase();

    // Check for = suffix
    if (this.currentChar === "=") {
      this.advance();
    }

    const raw = this.source.slice(start, this.pos);

    if (optionName in LONG_OPTIONS) {
      return this.makeToken(LONG_OPTIONS[optionName], optionName, raw);
    }

    // Unknown option — pass through for passthrough commands
    return this.makeToken(TokenType.LONG_OPTION_UNKNOWN, optionName, raw);
  }

  /**
   * Read a short option (-h, -t, -w).
   */
  private readShortOption(): Token | null {
    if (this.currentChar !== "-") {
      return null;
    }

    // Check it's not a negative number or long option
    const nextChar = this.peek();
    if (nextChar === null) {
      return null;
    }
    if (nextChar === "-") {
      // long option
      return null;
    }
    if (/\d/.test(nextChar)) {
      // negative number
      return null;
    }

    const start = this.pos;
    this.advance(); // skip -

    // Read single letter option
    if (this.currentChar !== null && /[a-zA-Z]/.test(this.currentChar)) {
      const option = this.currentChar.toLowerCase();
      this.advance();
      const raw = this.source.slice(start, this.pos);

      if (option in SHORT_OPTIONS) {
        return this.makeToken(SHORT_OPTIONS[option], option, raw);
      }

      // Unknown short option
      this.addError(`Unknown option: -${option}`, raw);
      return this.makeToken(TokenType.ERROR, raw, raw);
    }

    return null;
  }

  /**
   * Read an identifier or keyword.
   */
  private readIdentifierOrKeyword(): Token | null {
    const remaining = this.source.slice(this.pos);
    const match = IDENT_PATTERN.exec(remaining);
    if (match) {
      const raw = match[0];
      this.advance(raw.length);
      const lower = raw.toLowerCase();

      // Check if it's a keyword
      if (lower in KEYWORDS) {
        return this.makeToken(KEYWORDS[lower], lower, raw);
      }

      // Otherwise it's an identifier
      return this.makeToken(TokenType.IDENTIFIER, raw, raw);
    }
    return null;
  }

  /**
   * Read punctuation tokens.
   */
  private readPunctuation(): Token | null {
    const char = this.currentChar;
    if (char === null) {
      return null;
    }

    const tokenMap: Record<string, TokenType> = {
      "(": TokenType.LPAREN,
      ")": TokenType.RPAREN,
      ",": TokenType.COMMA,
      "@": TokenType.AT_SIGN,
      "=": TokenType.EQUALS,
    };

    if (char in tokenMap) {
      this.advance();
      return this.makeToken(tokenMap[char], char, char);
    }

    return null;
  }

  /**
   * Generate tokens from the source input.
   */
  *generateTokens(): Generator<Token> {
    while (this.currentChar !== null) {
      // Skip whitespace
      if (" \t\r".includes(this.currentChar)) {
        this.skipWhitespace();
        continue;
      }

      // Handle comments
      if (this.currentChar === "#") {
        this.skipComment();
        continue;
      }

      // Handle newlines
      if (this.currentChar === "\n") {
        yield this.makeToken(TokenType.NEWLINE, "\n", "\n");
        this.advance();
        continue;
      }

      // Try to match tokens in order of specificity

      // UUID (before identifier since it starts with hex)
      if (
        this.currentChar &&
        "0123456789abcdefABCDEF".includes(this.currentChar)
      ) {
        // Peek ahead to see if this looks like a UUID
        const ahead = this.source.slice(this.pos, this.pos + 36);
        if (UUID_PATTERN.test(ahead)) {
          const token = this.readUUID();
          if (token) {
            yield token;
            continue;
          }
        }
      }

      // Variables ($last, $selected, $wall)
      if (this.currentChar === "$") {
        const token = this.readVariable();
        if (token) {
          yield token;
          continue;
        }
      }

      // Long options (--height, --width, etc.)
      if (this.currentChar === "-" && this.peek() === "-") {
        const token = this.readLongOption();
        if (token) {
          yield token;
          continue;
        }
      }

      // Short options (-h, -t, -w) or negative numbers
      if (this.currentChar === "-") {
        const nextChar = this.peek();
        if (nextChar && /\d/.test(nextChar)) {
          // Negative number
          const token = this.readNumber();
          if (token) {
            yield token;
            continue;
          }
        } else if (nextChar && /[a-zA-Z]/.test(nextChar)) {
          // Short option
          const token = this.readShortOption();
          if (token) {
            yield token;
            continue;
          }
        }
      }

      // Numbers (with optional unit suffix)
      if (
        this.currentChar &&
        (/\d/.test(this.currentChar) ||
          (this.currentChar === "-" && this.peek() && /\d/.test(this.peek()!)))
      ) {
        const token = this.readNumber();
        if (token) {
          yield token;
          continue;
        }
      }

      // Strings
      if (this.currentChar && "\"'".includes(this.currentChar)) {
        const token = this.readString();
        if (token) {
          yield token;
          continue;
        }
      }

      // Identifiers and keywords
      if (this.currentChar && /[a-zA-Z]/.test(this.currentChar)) {
        const token = this.readIdentifierOrKeyword();
        if (token) {
          yield token;
          continue;
        }
      }

      // Punctuation
      const token = this.readPunctuation();
      if (token) {
        yield token;
        continue;
      }

      // Unknown character
      const char = this.currentChar;
      this.addError(`Unexpected character: '${char}'`, char);
      this.advance();
    }

    // Yield EOF token
    yield this.makeToken(TokenType.EOF, null, "");
  }

  /**
   * Tokenize the source and return tokens with errors.
   */
  tokenize(): { tokens: Token[]; errors: LexerError[] } {
    const tokens = Array.from(this.generateTokens());
    return { tokens, errors: this.errors };
  }
}

/**
 * Tokenize a DSL source string.
 *
 * @param source - The DSL source code to tokenize.
 * @returns A tuple of [tokens, errors].
 */
export function tokenize(source: string): { tokens: Token[]; errors: LexerError[] } {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}
