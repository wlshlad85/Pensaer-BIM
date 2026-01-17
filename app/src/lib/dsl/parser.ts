/**
 * Recursive descent parser for the Pensaer DSL.
 *
 * Parses token streams into AST nodes for execution against MCP tools.
 * Supports wall, door, window, and opening commands with full option parsing.
 */

import { tokenize } from "./lexer";
import type { Token } from "./tokens";
import { TokenType } from "./tokens";
import type {
  Command,
  CreateWallCommand,
  CreateRectWallsCommand,
  PlaceDoorCommand,
  PlaceWindowCommand,
  CreateOpeningCommand,
  HelpCommand,
  ElementRef,
  ParseError,
  ParseResult,
  Point2D,
} from "./ast";
import {
  WallType,
  DoorType,
  WindowType,
  SwingDirection,
  VariableRef,
} from "./ast";

/**
 * Recursive descent parser for the Pensaer DSL.
 */
export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private errors: ParseError[] = [];

  constructor(private source: string) {
    const result = tokenize(source);
    this.tokens = result.tokens;

    // Convert lexer errors to parse errors
    for (const err of result.errors) {
      this.errors.push({
        message: err.message,
        line: err.line,
        column: err.column,
        tokenValue: err.raw,
      });
    }
  }

  /**
   * Get current token.
   */
  private get current(): Token {
    if (this.pos >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1]; // Return EOF
    }
    return this.tokens[this.pos];
  }

  /**
   * Get current token type.
   */
  private get currentType(): TokenType {
    return this.current.type;
  }

  /**
   * Peek at token at offset from current position.
   */
  private peek(offset: number = 1): Token {
    const pos = this.pos + offset;
    if (pos >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[pos];
  }

  /**
   * Consume and return current token.
   */
  private advance(): Token {
    const token = this.current;
    if (this.pos < this.tokens.length - 1) {
      this.pos++;
    }
    return token;
  }

  /**
   * Check if current token matches any of the given types.
   */
  private match(...types: TokenType[]): boolean {
    return types.includes(this.currentType);
  }

  /**
   * Consume token of expected type or add error.
   */
  private expect(tokenType: TokenType, message?: string): Token {
    if (this.currentType === tokenType) {
      return this.advance();
    }
    const msg = message ?? `Expected ${tokenType}, got ${this.currentType}`;
    this.error(msg);
    return this.current;
  }

  /**
   * Add a parse error at current position.
   */
  private error(message: string): void {
    const token = this.current;
    this.errors.push({
      message,
      line: token.line,
      column: token.column,
      tokenValue: token.value != null ? String(token.value) : undefined,
    });
  }

  /**
   * Skip any newline tokens.
   */
  private skipNewlines(): void {
    while (this.match(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  /**
   * Parse the entire input and return result.
   */
  parse(): ParseResult {
    const commands: Command[] = [];

    this.skipNewlines();

    while (!this.match(TokenType.EOF)) {
      const cmd = this.parseCommand();
      if (cmd) {
        commands.push(cmd);
      }
      this.skipNewlines();
    }

    return {
      commands,
      errors: this.errors,
      success: this.errors.length === 0,
    };
  }

  /**
   * Parse a single command.
   */
  private parseCommand(): Command | null {
    this.skipNewlines();

    if (this.match(TokenType.EOF)) {
      return null;
    }

    if (this.match(TokenType.WALL)) {
      return this.parseWallCommand();
    } else if (this.match(TokenType.WALLS)) {
      return this.parseWallsCommand();
    } else if (this.match(TokenType.DOOR)) {
      return this.parseDoorCommand();
    } else if (this.match(TokenType.WINDOW)) {
      return this.parseWindowCommand();
    } else if (this.match(TokenType.OPENING)) {
      return this.parseOpeningCommand();
    } else if (this.match(TokenType.BOX, TokenType.RECT)) {
      return this.parseRectWallsCommand();
    } else if (this.match(TokenType.HELP)) {
      return this.parseHelpCommand();
    } else {
      this.error(`Unexpected token: ${this.currentType}`);
      this.advance();
      return null;
    }
  }

  // =========================================================================
  // Wall Commands
  // =========================================================================

  private parseWallCommand(): CreateWallCommand | null {
    const startToken = this.advance(); // consume 'wall'

    // Parse start point (with optional 'from' keyword)
    if (this.match(TokenType.FROM)) {
      this.advance();
    }

    const start = this.parsePoint2D();
    if (!start) {
      this.error("Expected start point");
      return null;
    }

    // Parse end point (with optional 'to' keyword)
    if (this.match(TokenType.TO)) {
      this.advance();
    }

    const end = this.parsePoint2D();
    if (!end) {
      this.error("Expected end point");
      return null;
    }

    // Parse options
    let height = 3.0;
    let thickness = 0.2;
    let wallType: WallType | undefined;

    while (this.isWallOption()) {
      const [name, value] = this.parseWallOption();
      if (name === "height") height = value as number;
      else if (name === "thickness") thickness = value as number;
      else if (name === "type") wallType = this.parseWallTypeValue(value);
    }

    return {
      type: "CreateWall",
      start,
      end,
      height,
      thickness,
      wallType,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private parseWallsCommand(): CreateRectWallsCommand | null {
    const startToken = this.advance(); // consume 'walls'

    if (this.match(TokenType.RECT, TokenType.RECTANGLE)) {
      this.advance();
    }

    return this.parseRectWallsRest(startToken);
  }

  private parseRectWallsCommand(): CreateRectWallsCommand | null {
    const startToken = this.advance(); // consume 'rect' or 'box'

    if (this.match(TokenType.WALLS)) {
      this.advance();
    }

    return this.parseRectWallsRest(startToken);
  }

  private parseRectWallsRest(startToken: Token): CreateRectWallsCommand | null {
    const minPoint = this.parsePoint2D();
    if (!minPoint) {
      this.error("Expected min point");
      return null;
    }

    const maxPoint = this.parsePoint2D();
    if (!maxPoint) {
      this.error("Expected max point");
      return null;
    }

    let height = 3.0;
    let thickness = 0.2;

    while (this.isWallOption()) {
      const [name, value] = this.parseWallOption();
      if (name === "height") height = value as number;
      else if (name === "thickness") thickness = value as number;
    }

    return {
      type: "CreateRectWalls",
      minPoint,
      maxPoint,
      height,
      thickness,
      line: startToken.line,
      column: startToken.column,
    };
  }

  // =========================================================================
  // Door Commands
  // =========================================================================

  private parseDoorCommand(): PlaceDoorCommand | null {
    const startToken = this.advance(); // consume 'door'

    // Parse location: [in] <wall-ref> [at|@] <offset>
    if (this.match(TokenType.IN)) {
      this.advance();
    }

    const wallRef = this.parseElementRef();
    if (!wallRef) {
      this.error("Expected wall reference");
      return null;
    }

    // Parse offset
    if (this.match(TokenType.AT, TokenType.AT_SIGN, TokenType.OFFSET)) {
      this.advance();
    }

    const offset = this.parseNumber();
    if (offset === null) {
      this.error("Expected offset value");
      return null;
    }

    // Parse options
    let width = 0.9;
    let height = 2.1;
    let doorType: DoorType | undefined;
    let swing: SwingDirection | undefined;

    while (this.isDoorOption()) {
      const [name, value] = this.parseDoorOption();
      if (name === "width") width = value as number;
      else if (name === "height") height = value as number;
      else if (name === "type") doorType = this.parseDoorTypeValue(value);
      else if (name === "swing") swing = this.parseSwingValue(value);
    }

    return {
      type: "PlaceDoor",
      wallRef,
      offset,
      width,
      height,
      doorType,
      swing,
      line: startToken.line,
      column: startToken.column,
    };
  }

  // =========================================================================
  // Window Commands
  // =========================================================================

  private parseWindowCommand(): PlaceWindowCommand | null {
    const startToken = this.advance(); // consume 'window'

    // Parse location
    if (this.match(TokenType.IN)) {
      this.advance();
    }

    const wallRef = this.parseElementRef();
    if (!wallRef) {
      this.error("Expected wall reference");
      return null;
    }

    // Parse offset
    if (this.match(TokenType.AT, TokenType.AT_SIGN, TokenType.OFFSET)) {
      this.advance();
    }

    const offset = this.parseNumber();
    if (offset === null) {
      this.error("Expected offset value");
      return null;
    }

    // Parse options
    let width = 1.2;
    let height = 1.0;
    let sillHeight = 0.9;
    let windowType: WindowType | undefined;

    while (this.isWindowOption()) {
      const [name, value] = this.parseWindowOption();
      if (name === "width") width = value as number;
      else if (name === "height") height = value as number;
      else if (name === "sill") sillHeight = value as number;
      else if (name === "type") windowType = this.parseWindowTypeValue(value);
    }

    return {
      type: "PlaceWindow",
      wallRef,
      offset,
      width,
      height,
      sillHeight,
      windowType,
      line: startToken.line,
      column: startToken.column,
    };
  }

  // =========================================================================
  // Opening Commands
  // =========================================================================

  private parseOpeningCommand(): CreateOpeningCommand | null {
    const startToken = this.advance(); // consume 'opening'

    if (this.match(TokenType.IN)) {
      this.advance();
    }

    const wallRef = this.parseElementRef();
    if (!wallRef) {
      this.error("Expected wall reference");
      return null;
    }

    if (this.match(TokenType.AT, TokenType.AT_SIGN, TokenType.OFFSET)) {
      this.advance();
    }

    const offset = this.parseNumber();
    if (offset === null) {
      this.error("Expected offset value");
      return null;
    }

    let width = 1.0;
    let height = 1.0;
    let baseHeight = 0.0;

    while (this.isOpeningOption()) {
      const [name, value] = this.parseOpeningOption();
      if (name === "width") width = value as number;
      else if (name === "height") height = value as number;
      else if (name === "base") baseHeight = value as number;
    }

    return {
      type: "CreateOpening",
      wallRef,
      offset,
      width,
      height,
      baseHeight,
      line: startToken.line,
      column: startToken.column,
    };
  }

  // =========================================================================
  // Help Command
  // =========================================================================

  private parseHelpCommand(): HelpCommand {
    const startToken = this.advance(); // consume 'help'

    let topic: string | undefined;
    if (this.match(TokenType.IDENTIFIER, TokenType.STRING)) {
      topic = String(this.advance().value);
    }

    return {
      type: "Help",
      topic,
      line: startToken.line,
      column: startToken.column,
    };
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private parsePoint2D(): Point2D | null {
    // Accept: (x, y) or (x y) or x,y
    if (this.match(TokenType.LPAREN)) {
      this.advance();

      const x = this.parseNumber();
      if (x === null) return null;

      // Skip comma if present
      if (this.match(TokenType.COMMA)) {
        this.advance();
      }

      const y = this.parseNumber();
      if (y === null) return null;

      this.expect(TokenType.RPAREN);

      return { x, y };
    }

    // Bare coordinates: x,y (detected by number followed by comma)
    if (this.match(TokenType.INTEGER, TokenType.FLOAT)) {
      const x = this.parseNumber();
      if (x === null) return null;

      if (this.match(TokenType.COMMA)) {
        this.advance();
      }

      const y = this.parseNumber();
      if (y === null) return null;

      return { x, y };
    }

    return null;
  }

  private parseNumber(): number | null {
    if (this.match(TokenType.INTEGER, TokenType.FLOAT)) {
      const token = this.advance();
      return token.value as number;
    }
    return null;
  }

  private parseElementRef(): ElementRef | null {
    if (this.match(TokenType.UUID)) {
      return { uuid: String(this.advance().value) };
    }

    if (this.match(TokenType.VAR_LAST)) {
      this.advance();
      return { variable: VariableRef.LAST };
    }
    if (this.match(TokenType.VAR_SELECTED)) {
      this.advance();
      return { variable: VariableRef.SELECTED };
    }
    if (this.match(TokenType.VAR_WALL)) {
      this.advance();
      return { variable: VariableRef.WALL };
    }

    return null;
  }

  // =========================================================================
  // Option Checking
  // =========================================================================

  private isWallOption(): boolean {
    return this.match(
      TokenType.HEIGHT,
      TokenType.THICKNESS,
      TokenType.TYPE,
      TokenType.LONG_HEIGHT,
      TokenType.LONG_THICKNESS,
      TokenType.LONG_TYPE,
      TokenType.OPT_H,
      TokenType.OPT_T,
    );
  }

  private isDoorOption(): boolean {
    return this.match(
      TokenType.WIDTH,
      TokenType.HEIGHT,
      TokenType.TYPE,
      TokenType.SWING,
      TokenType.LONG_WIDTH,
      TokenType.LONG_HEIGHT,
      TokenType.LONG_TYPE,
      TokenType.LONG_SWING,
      TokenType.OPT_W,
      TokenType.OPT_H,
    );
  }

  private isWindowOption(): boolean {
    return this.match(
      TokenType.WIDTH,
      TokenType.HEIGHT,
      TokenType.TYPE,
      TokenType.SILL,
      TokenType.SILL_HEIGHT,
      TokenType.LONG_WIDTH,
      TokenType.LONG_HEIGHT,
      TokenType.LONG_TYPE,
      TokenType.LONG_SILL,
      TokenType.LONG_SILL_HEIGHT,
      TokenType.OPT_W,
      TokenType.OPT_H,
    );
  }

  private isOpeningOption(): boolean {
    return this.match(
      TokenType.WIDTH,
      TokenType.HEIGHT,
      TokenType.LONG_WIDTH,
      TokenType.LONG_HEIGHT,
      TokenType.OPT_W,
      TokenType.OPT_H,
    );
  }

  // =========================================================================
  // Option Parsing
  // =========================================================================

  private parseWallOption(): [string, number | string] {
    const name = this.parseOptionName();
    const value = this.parseOptionValue();
    return [name, value];
  }

  private parseDoorOption(): [string, number | string] {
    const name = this.parseOptionName();
    const value = this.parseOptionValue();
    return [name, value];
  }

  private parseWindowOption(): [string, number | string] {
    const name = this.parseOptionName();
    const value = this.parseOptionValue();
    return [name, value];
  }

  private parseOpeningOption(): [string, number | string] {
    const name = this.parseOptionName();
    const value = this.parseOptionValue();
    return [name, value];
  }

  private parseOptionName(): string {
    const type = this.currentType;
    this.advance();

    switch (type) {
      case TokenType.HEIGHT:
      case TokenType.LONG_HEIGHT:
      case TokenType.OPT_H:
        return "height";
      case TokenType.THICKNESS:
      case TokenType.LONG_THICKNESS:
      case TokenType.OPT_T:
        return "thickness";
      case TokenType.WIDTH:
      case TokenType.LONG_WIDTH:
      case TokenType.OPT_W:
        return "width";
      case TokenType.TYPE:
      case TokenType.LONG_TYPE:
        return "type";
      case TokenType.SWING:
      case TokenType.LONG_SWING:
        return "swing";
      case TokenType.SILL:
      case TokenType.SILL_HEIGHT:
      case TokenType.LONG_SILL:
      case TokenType.LONG_SILL_HEIGHT:
        return "sill";
      default:
        return "unknown";
    }
  }

  private parseOptionValue(): number | string {
    if (this.match(TokenType.INTEGER, TokenType.FLOAT)) {
      return this.advance().value as number;
    }
    if (this.match(TokenType.IDENTIFIER, TokenType.STRING)) {
      return String(this.advance().value);
    }
    // Type keywords
    if (
      this.match(
        TokenType.BASIC,
        TokenType.STRUCTURAL,
        TokenType.CURTAIN,
        TokenType.RETAINING,
        TokenType.SINGLE,
        TokenType.DOUBLE,
        TokenType.SLIDING,
        TokenType.FOLDING,
        TokenType.REVOLVING,
        TokenType.POCKET,
        TokenType.FIXED,
        TokenType.CASEMENT,
        TokenType.DOUBLE_HUNG,
        TokenType.AWNING,
        TokenType.HOPPER,
        TokenType.PIVOT,
        TokenType.LEFT,
        TokenType.RIGHT,
        TokenType.BOTH,
        TokenType.NONE,
      )
    ) {
      return String(this.advance().value);
    }
    return 0;
  }

  // =========================================================================
  // Type Value Parsing
  // =========================================================================

  private parseWallTypeValue(value: unknown): WallType | undefined {
    const str = String(value).toLowerCase();
    switch (str) {
      case "basic":
        return WallType.BASIC;
      case "structural":
        return WallType.STRUCTURAL;
      case "curtain":
        return WallType.CURTAIN;
      case "retaining":
        return WallType.RETAINING;
      default:
        return undefined;
    }
  }

  private parseDoorTypeValue(value: unknown): DoorType | undefined {
    const str = String(value).toLowerCase();
    switch (str) {
      case "single":
        return DoorType.SINGLE;
      case "double":
        return DoorType.DOUBLE;
      case "sliding":
        return DoorType.SLIDING;
      case "folding":
        return DoorType.FOLDING;
      case "revolving":
        return DoorType.REVOLVING;
      case "pocket":
        return DoorType.POCKET;
      default:
        return undefined;
    }
  }

  private parseWindowTypeValue(value: unknown): WindowType | undefined {
    const str = String(value).toLowerCase();
    switch (str) {
      case "fixed":
        return WindowType.FIXED;
      case "casement":
        return WindowType.CASEMENT;
      case "double_hung":
        return WindowType.DOUBLE_HUNG;
      case "sliding":
        return WindowType.SLIDING;
      case "awning":
        return WindowType.AWNING;
      case "hopper":
        return WindowType.HOPPER;
      case "pivot":
        return WindowType.PIVOT;
      default:
        return undefined;
    }
  }

  private parseSwingValue(value: unknown): SwingDirection | undefined {
    const str = String(value).toLowerCase();
    switch (str) {
      case "left":
        return SwingDirection.LEFT;
      case "right":
        return SwingDirection.RIGHT;
      case "both":
        return SwingDirection.BOTH;
      case "none":
        return SwingDirection.NONE;
      default:
        return undefined;
    }
  }
}

/**
 * Parse a DSL source string.
 */
export function parse(source: string): ParseResult {
  const parser = new Parser(source);
  return parser.parse();
}
