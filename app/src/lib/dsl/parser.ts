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
  CreateFloorCommand,
  CreateRoofCommand,
  CreateRoomCommand,
  PlaceDoorCommand,
  PlaceWindowCommand,
  CreateOpeningCommand,
  CreateColumnCommand,
  CreateBeamCommand,
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
  RoofType,
  RoomType,
  VariableRef,
} from "./ast";
import { findSimilar, KNOWN_COMMANDS } from "./errors";

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
    } else if (this.match(TokenType.FLOOR)) {
      return this.parseFloorCommand();
    } else if (this.match(TokenType.ROOF)) {
      return this.parseRoofCommand();
    } else if (this.match(TokenType.ROOM)) {
      return this.parseRoomCommand();
    } else if (this.match(TokenType.DOOR)) {
      return this.parseDoorCommand();
    } else if (this.match(TokenType.WINDOW)) {
      return this.parseWindowCommand();
    } else if (this.match(TokenType.OPENING)) {
      return this.parseOpeningCommand();
    } else if (this.match(TokenType.COLUMN)) {
      return this.parseColumnCommand();
    } else if (this.match(TokenType.BEAM)) {
      return this.parseBeamCommand();
    } else if (this.match(TokenType.BOX, TokenType.RECT)) {
      return this.parseRectWallsCommand();
    } else if (this.match(TokenType.HELP)) {
      return this.parseHelpCommand();
    } else {
      // Try to provide helpful suggestions for unknown commands
      const tokenValue = this.current.value;
      if (this.match(TokenType.IDENTIFIER) && typeof tokenValue === "string") {
        const suggestions = findSimilar(tokenValue, KNOWN_COMMANDS);
        if (suggestions.length > 0) {
          this.error(
            `Unknown command: '${tokenValue}'. Did you mean: ${suggestions.join(", ")}?`
          );
        } else {
          this.error(
            `Unknown command: '${tokenValue}'. Type 'help' for available commands.`
          );
        }
      } else {
        this.error(`Unexpected token: ${this.currentType}`);
      }
      this.advance();
      return null;
    }
  }

  // =========================================================================
  // Wall Commands
  // =========================================================================

  private parseWallCommand(): CreateWallCommand | null {
    const startToken = this.advance(); // consume 'wall'

    let start: Point2D | null = null;
    let end: Point2D | null = null;
    let height = 3.0;
    let thickness = 0.2;
    let wallType: WallType | undefined;
    let levelId: string | undefined;
    let material: string | undefined;

    // Check for --start/--end flag syntax first
    if (this.match(TokenType.LONG_START)) {
      // Flag-based syntax: wall --start 0,0 --end 5,0
      this.advance(); // consume --start
      start = this.parsePoint2D();
      if (!start) {
        this.error("Expected coordinates after --start. Example: wall --start 0,0 --end 5,0");
        return null;
      }

      // Parse remaining options including --end
      while (this.isWallOptionExtended()) {
        if (this.match(TokenType.LONG_END)) {
          this.advance(); // consume --end
          end = this.parsePoint2D();
          if (!end) {
            this.error("Expected coordinates after --end. Example: wall --start 0,0 --end 5,0");
            return null;
          }
        } else {
          const [name, value] = this.parseWallOption();
          if (name === "height") height = value as number;
          else if (name === "thickness") thickness = value as number;
          else if (name === "type") wallType = this.parseWallTypeValue(value);
          else if (name === "level") levelId = String(value);
          else if (name === "material") material = String(value);
        }
      }

      if (!end) {
        this.error("Missing --end parameter. Example: wall --start 0,0 --end 5,0");
        return null;
      }
    } else {
      // Traditional syntax: wall (0, 0) (5, 0) or wall from (0, 0) to (5, 0) or wall 0,0 5,0
      if (this.match(TokenType.FROM)) {
        this.advance();
      }

      start = this.parsePoint2D();
      if (!start) {
        this.error("Expected start point. Examples:\n  wall --start 0,0 --end 5,0\n  wall (0, 0) (5, 0)\n  wall 0,0 5,0");
        return null;
      }

      // Parse end point (with optional 'to' keyword)
      if (this.match(TokenType.TO)) {
        this.advance();
      }

      end = this.parsePoint2D();
      if (!end) {
        this.error("Expected end point. Examples:\n  wall --start 0,0 --end 5,0\n  wall (0, 0) (5, 0)\n  wall 0,0 5,0");
        return null;
      }

      // Parse options
      while (this.isWallOptionExtended()) {
        const [name, value] = this.parseWallOption();
        if (name === "height") height = value as number;
        else if (name === "thickness") thickness = value as number;
        else if (name === "type") wallType = this.parseWallTypeValue(value);
        else if (name === "level") levelId = String(value);
        else if (name === "material") material = String(value);
      }
    }

    // Validate start != end
    if (start.x === end.x && start.y === end.y) {
      this.error("Wall start and end points cannot be the same");
      return null;
    }

    // Minimum length check (10cm)
    const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    if (length < 0.1) {
      this.error(`Wall length (${length.toFixed(3)}m) is too short. Minimum length is 0.1m (100mm)`);
      return null;
    }

    return {
      type: "CreateWall",
      start,
      end,
      height,
      thickness,
      wallType,
      levelId,
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
      this.error("Expected min point (x, y). Example: rect (0, 0) (10, 10)");
      return null;
    }

    const maxPoint = this.parsePoint2D();
    if (!maxPoint) {
      this.error("Expected max point (x, y). Example: rect (0, 0) (10, 10)");
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
  // Floor Command
  // =========================================================================

  private parseFloorCommand(): CreateFloorCommand | null {
    const startToken = this.advance(); // consume 'floor'

    let points: Point2D[] = [];
    let thickness = 0.15;
    let level = 0;
    let levelId: string | undefined;
    let floorType: string | undefined;

    // Parse --points first or --min/--max for bounding box
    if (this.match(TokenType.LONG_POINTS)) {
      this.advance(); // consume --points
      points = this.parsePointsList();
    } else if (this.match(TokenType.LONG_MIN)) {
      // --min/--max syntax converts to points
      this.advance(); // consume --min
      const minPoint = this.parsePoint2D();
      if (!minPoint) {
        this.error("Expected min point after --min. Example: floor --min 0,0 --max 10,8");
        return null;
      }

      if (!this.match(TokenType.LONG_MAX)) {
        this.error("Expected --max after --min. Example: floor --min 0,0 --max 10,8");
        return null;
      }
      this.advance(); // consume --max
      const maxPoint = this.parsePoint2D();
      if (!maxPoint) {
        this.error("Expected max point after --max. Example: floor --min 0,0 --max 10,8");
        return null;
      }

      // Convert bounding box to polygon points
      points = [
        { x: minPoint.x, y: minPoint.y },
        { x: maxPoint.x, y: minPoint.y },
        { x: maxPoint.x, y: maxPoint.y },
        { x: minPoint.x, y: maxPoint.y },
      ];
    } else {
      this.error("Expected --points or --min/--max. Example: floor --points 0,0 10,0 10,8 0,8");
      return null;
    }

    if (points.length < 3) {
      this.error("Floor boundary must have at least 3 points");
      return null;
    }

    // Parse additional options
    while (this.isFloorOption()) {
      const [name, value] = this.parseFloorOption();
      if (name === "thickness") thickness = value as number;
      else if (name === "level") {
        if (typeof value === "number") level = value;
        else levelId = String(value);
      }
      else if (name === "type") floorType = String(value);
    }

    return {
      type: "CreateFloor",
      points,
      thickness,
      level,
      levelId,
      floorType,
      line: startToken.line,
      column: startToken.column,
    };
  }

  // =========================================================================
  // Roof Command
  // =========================================================================

  private parseRoofCommand(): CreateRoofCommand | null {
    const startToken = this.advance(); // consume 'roof'

    let points: Point2D[] = [];
    let roofType: RoofType = RoofType.GABLE;
    let slope = 30;
    let overhang = 0.5;
    let ridgeDirection: "x" | "y" | undefined;
    let levelId: string | undefined;

    // Check for --type first (can come before --points)
    if (this.match(TokenType.LONG_TYPE, TokenType.TYPE)) {
      this.advance();
      const typeValue = this.parseOptionValue();
      roofType = this.parseRoofTypeValue(typeValue) || RoofType.GABLE;
    }

    // Parse --points or --min/--max
    if (this.match(TokenType.LONG_POINTS)) {
      this.advance(); // consume --points
      points = this.parsePointsList();
    } else if (this.match(TokenType.LONG_MIN)) {
      // --min/--max syntax
      this.advance(); // consume --min
      const minPoint = this.parsePoint2D();
      if (!minPoint) {
        this.error("Expected min point after --min. Example: roof --min 0,0 --max 10,8");
        return null;
      }

      if (!this.match(TokenType.LONG_MAX)) {
        this.error("Expected --max after --min. Example: roof --min 0,0 --max 10,8");
        return null;
      }
      this.advance(); // consume --max
      const maxPoint = this.parsePoint2D();
      if (!maxPoint) {
        this.error("Expected max point after --max. Example: roof --min 0,0 --max 10,8");
        return null;
      }

      // Convert bounding box to polygon points
      points = [
        { x: minPoint.x, y: minPoint.y },
        { x: maxPoint.x, y: minPoint.y },
        { x: maxPoint.x, y: maxPoint.y },
        { x: minPoint.x, y: maxPoint.y },
      ];
    } else if (!this.match(TokenType.LONG_TYPE, TokenType.TYPE)) {
      this.error("Expected --points or --min/--max. Example: roof --type gable --points 0,0 10,0 10,8 0,8");
      return null;
    }

    if (points.length < 3) {
      this.error("Roof boundary must have at least 3 points");
      return null;
    }

    // Parse additional options
    while (this.isRoofOption()) {
      const [name, value] = this.parseRoofOption();
      if (name === "type") roofType = this.parseRoofTypeValue(value) || RoofType.GABLE;
      else if (name === "slope") slope = value as number;
      else if (name === "overhang") overhang = value as number;
      else if (name === "ridge") ridgeDirection = String(value) as "x" | "y";
      else if (name === "level") levelId = String(value);
    }

    return {
      type: "CreateRoof",
      points,
      roofType,
      slope,
      overhang,
      ridgeDirection,
      levelId,
      line: startToken.line,
      column: startToken.column,
    };
  }

  // =========================================================================
  // Room Command
  // =========================================================================

  private parseRoomCommand(): CreateRoomCommand | null {
    const startToken = this.advance(); // consume 'room'

    let points: Point2D[] = [];
    let name: string | undefined;
    let number: string | undefined;
    let roomType: RoomType | undefined;
    let height = 3.0;
    let levelId: string | undefined;

    // Parse --points or --min/--max
    if (this.match(TokenType.LONG_POINTS)) {
      this.advance(); // consume --points
      points = this.parsePointsList();
    } else if (this.match(TokenType.LONG_MIN)) {
      // --min/--max syntax
      this.advance(); // consume --min
      const minPoint = this.parsePoint2D();
      if (!minPoint) {
        this.error("Expected min point after --min. Example: room --min 0,0 --max 5,4");
        return null;
      }

      if (!this.match(TokenType.LONG_MAX)) {
        this.error("Expected --max after --min. Example: room --min 0,0 --max 5,4");
        return null;
      }
      this.advance(); // consume --max
      const maxPoint = this.parsePoint2D();
      if (!maxPoint) {
        this.error("Expected max point after --max. Example: room --min 0,0 --max 5,4");
        return null;
      }

      // Convert bounding box to polygon points
      points = [
        { x: minPoint.x, y: minPoint.y },
        { x: maxPoint.x, y: minPoint.y },
        { x: maxPoint.x, y: maxPoint.y },
        { x: minPoint.x, y: maxPoint.y },
      ];
    } else {
      this.error("Expected --points or --min/--max. Example: room --points 0,0 5,0 5,4 0,4");
      return null;
    }

    if (points.length < 3) {
      this.error("Room boundary must have at least 3 points");
      return null;
    }

    // Parse additional options
    while (this.isRoomOption()) {
      const [optName, value] = this.parseRoomOption();
      if (optName === "name") name = String(value);
      else if (optName === "number") number = String(value);
      else if (optName === "type") roomType = this.parseRoomTypeValue(value);
      else if (optName === "height") height = value as number;
      else if (optName === "level") levelId = String(value);
    }

    return {
      type: "CreateRoom",
      points,
      name,
      number,
      roomType,
      height,
      levelId,
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
      this.error("Expected wall reference (UUID or $last, $selected, $wall). Example: door $last 2.5");
      return null;
    }

    // Parse offset
    if (this.match(TokenType.AT, TokenType.AT_SIGN, TokenType.OFFSET)) {
      this.advance();
    }

    const offset = this.parseNumber();
    if (offset === null) {
      this.error("Expected offset value (distance along wall). Example: door $last 2.5");
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
      this.error("Expected wall reference (UUID or $last, $selected, $wall). Example: window $last 1.5");
      return null;
    }

    // Parse offset
    if (this.match(TokenType.AT, TokenType.AT_SIGN, TokenType.OFFSET)) {
      this.advance();
    }

    const offset = this.parseNumber();
    if (offset === null) {
      this.error("Expected offset value (distance along wall). Example: window $last 1.5");
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
  // Column Command
  // =========================================================================

  private parseColumnCommand(): CreateColumnCommand | null {
    const startToken = this.advance(); // consume 'column'

    let position: Point2D | null = null;
    let width = 0.4;
    let depth = 0.4;
    let height = 3.0;
    let shape: string | undefined;
    let material: string | undefined;
    let levelId: string | undefined;

    if (this.match(TokenType.LONG_POSITION)) {
      this.advance();
      position = this.parsePoint2D();
      if (!position) {
        this.error("Expected coordinates after --position. Example: column --position 5,3");
        return null;
      }
    } else {
      position = this.parsePoint2D();
      if (!position) {
        this.error("Expected position. Examples:\n  column --position 5,3\n  column 5,3");
        return null;
      }
    }

    while (this.isColumnOption()) {
      const [name, value] = this.parseGenericOption();
      if (name === "width") width = value as number;
      else if (name === "depth") depth = value as number;
      else if (name === "height") height = value as number;
      else if (name === "shape") shape = String(value);
      else if (name === "material") material = String(value);
      else if (name === "level") levelId = String(value);
    }

    return {
      type: "CreateColumn",
      position,
      width,
      depth,
      height,
      shape,
      material,
      levelId,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private isColumnOption(): boolean {
    return this.match(
      TokenType.WIDTH,
      TokenType.HEIGHT,
      TokenType.LEVEL,
      TokenType.LONG_WIDTH,
      TokenType.LONG_HEIGHT,
      TokenType.LONG_DEPTH,
      TokenType.LONG_SHAPE,
      TokenType.LONG_LEVEL,
      TokenType.LONG_MATERIAL,
      TokenType.OPT_W,
      TokenType.OPT_H,
    );
  }

  // =========================================================================
  // Beam Command
  // =========================================================================

  private parseBeamCommand(): CreateBeamCommand | null {
    const startToken = this.advance(); // consume 'beam'

    let start: Point2D | null = null;
    let end: Point2D | null = null;
    let width = 0.3;
    let depth = 0.5;
    let material: string | undefined;
    let levelId: string | undefined;

    if (this.match(TokenType.LONG_START)) {
      this.advance();
      start = this.parsePoint2D();
      if (!start) {
        this.error("Expected coordinates after --start. Example: beam --start 0,0 --end 10,0");
        return null;
      }

      while (this.isBeamOptionExtended()) {
        if (this.match(TokenType.LONG_END)) {
          this.advance();
          end = this.parsePoint2D();
          if (!end) {
            this.error("Expected coordinates after --end. Example: beam --start 0,0 --end 10,0");
            return null;
          }
        } else {
          const [name, value] = this.parseGenericOption();
          if (name === "width") width = value as number;
          else if (name === "depth") depth = value as number;
          else if (name === "material") material = String(value);
          else if (name === "level") levelId = String(value);
        }
      }

      if (!end) {
        this.error("Missing --end parameter. Example: beam --start 0,0 --end 10,0");
        return null;
      }
    } else {
      if (this.match(TokenType.FROM)) {
        this.advance();
      }

      start = this.parsePoint2D();
      if (!start) {
        this.error("Expected start point. Examples:\n  beam --start 0,0 --end 10,0\n  beam 0,0 10,0");
        return null;
      }

      if (this.match(TokenType.TO)) {
        this.advance();
      }

      end = this.parsePoint2D();
      if (!end) {
        this.error("Expected end point. Examples:\n  beam --start 0,0 --end 10,0\n  beam 0,0 10,0");
        return null;
      }

      while (this.isBeamOption()) {
        const [name, value] = this.parseGenericOption();
        if (name === "width") width = value as number;
        else if (name === "depth") depth = value as number;
        else if (name === "material") material = String(value);
        else if (name === "level") levelId = String(value);
      }
    }

    if (start.x === end.x && start.y === end.y) {
      this.error("Beam start and end points cannot be the same");
      return null;
    }

    return {
      type: "CreateBeam",
      start,
      end,
      width,
      depth,
      material,
      levelId,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private isBeamOption(): boolean {
    return this.match(
      TokenType.WIDTH,
      TokenType.LEVEL,
      TokenType.LONG_WIDTH,
      TokenType.LONG_DEPTH,
      TokenType.LONG_LEVEL,
      TokenType.LONG_MATERIAL,
      TokenType.OPT_W,
    );
  }

  private isBeamOptionExtended(): boolean {
    return this.match(
      TokenType.WIDTH,
      TokenType.LEVEL,
      TokenType.LONG_WIDTH,
      TokenType.LONG_DEPTH,
      TokenType.LONG_LEVEL,
      TokenType.LONG_MATERIAL,
      TokenType.LONG_END,
      TokenType.OPT_W,
    );
  }

  private parseGenericOption(): [string, number | string] {
    const type = this.currentType;
    this.advance();

    let name: string;
    switch (type) {
      case TokenType.LONG_DEPTH:
        name = "depth";
        break;
      case TokenType.LONG_SHAPE:
        name = "shape";
        break;
      case TokenType.HEIGHT:
      case TokenType.LONG_HEIGHT:
      case TokenType.OPT_H:
        name = "height";
        break;
      case TokenType.WIDTH:
      case TokenType.LONG_WIDTH:
      case TokenType.OPT_W:
        name = "width";
        break;
      case TokenType.LEVEL:
      case TokenType.LONG_LEVEL:
        name = "level";
        break;
      case TokenType.LONG_MATERIAL:
        name = "material";
        break;
      default:
        name = "unknown";
        break;
    }

    const value = this.parseOptionValue();
    return [name, value];
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
      this.error("Expected wall reference (UUID or $last, $selected, $wall). Example: opening $last 2.0");
      return null;
    }

    if (this.match(TokenType.AT, TokenType.AT_SIGN, TokenType.OFFSET)) {
      this.advance();
    }

    const offset = this.parseNumber();
    if (offset === null) {
      this.error("Expected offset value (distance along wall). Example: opening $last 2.0");
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
    // Accept identifiers, strings, or command keywords as topic
    if (
      this.match(
        TokenType.IDENTIFIER,
        TokenType.STRING,
        TokenType.WALL,
        TokenType.FLOOR,
        TokenType.ROOF,
        TokenType.ROOM,
        TokenType.DOOR,
        TokenType.WINDOW,
        TokenType.OPENING,
        TokenType.COLUMN,
        TokenType.BEAM
      )
    ) {
      const topicToken = this.advance();
      topic = String(topicToken.value ?? topicToken.raw);
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

  /**
   * Parse a list of points separated by spaces.
   * Points can be in (x,y) or x,y format.
   * Continues parsing until a non-point token is encountered.
   */
  private parsePointsList(): Point2D[] {
    const points: Point2D[] = [];

    while (true) {
      const point = this.parsePoint2D();
      if (!point) break;
      points.push(point);
    }

    return points;
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

  /**
   * Extended wall option check that includes --end, --level, --material.
   */
  private isWallOptionExtended(): boolean {
    return this.match(
      TokenType.HEIGHT,
      TokenType.THICKNESS,
      TokenType.TYPE,
      TokenType.LEVEL,
      TokenType.LONG_HEIGHT,
      TokenType.LONG_THICKNESS,
      TokenType.LONG_TYPE,
      TokenType.LONG_LEVEL,
      TokenType.LONG_MATERIAL,
      TokenType.LONG_END,
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

  private isFloorOption(): boolean {
    return this.match(
      TokenType.THICKNESS,
      TokenType.LEVEL,
      TokenType.TYPE,
      TokenType.LONG_THICKNESS,
      TokenType.LONG_LEVEL,
      TokenType.LONG_TYPE,
      TokenType.OPT_T,
    );
  }

  private isRoofOption(): boolean {
    return this.match(
      TokenType.TYPE,
      TokenType.SLOPE,
      TokenType.OVERHANG,
      TokenType.LEVEL,
      TokenType.LONG_TYPE,
      TokenType.LONG_SLOPE,
      TokenType.LONG_OVERHANG,
      TokenType.LONG_LEVEL,
    );
  }

  private isRoomOption(): boolean {
    return this.match(
      TokenType.NAME,
      TokenType.NUMBER_KW,
      TokenType.TYPE,
      TokenType.HEIGHT,
      TokenType.LEVEL,
      TokenType.LONG_NAME,
      TokenType.LONG_NUMBER,
      TokenType.LONG_TYPE,
      TokenType.LONG_HEIGHT,
      TokenType.LONG_LEVEL,
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

  private parseFloorOption(): [string, number | string] {
    const name = this.parseOptionName();
    const value = this.parseOptionValue();
    return [name, value];
  }

  private parseRoofOption(): [string, number | string] {
    const name = this.parseOptionName();
    const value = this.parseOptionValue();
    return [name, value];
  }

  private parseRoomOption(): [string, number | string] {
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
      case TokenType.LEVEL:
      case TokenType.LONG_LEVEL:
        return "level";
      case TokenType.LONG_MATERIAL:
        return "material";
      case TokenType.SLOPE:
      case TokenType.LONG_SLOPE:
        return "slope";
      case TokenType.OVERHANG:
      case TokenType.LONG_OVERHANG:
        return "overhang";
      case TokenType.NAME:
      case TokenType.LONG_NAME:
        return "name";
      case TokenType.NUMBER_KW:
      case TokenType.LONG_NUMBER:
        return "number";
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
        // Wall types
        TokenType.BASIC,
        TokenType.STRUCTURAL,
        TokenType.CURTAIN,
        TokenType.RETAINING,
        // Door types
        TokenType.SINGLE,
        TokenType.DOUBLE,
        TokenType.SLIDING,
        TokenType.FOLDING,
        TokenType.REVOLVING,
        TokenType.POCKET,
        // Window types
        TokenType.FIXED,
        TokenType.CASEMENT,
        TokenType.DOUBLE_HUNG,
        TokenType.AWNING,
        TokenType.HOPPER,
        TokenType.PIVOT,
        // Swing directions
        TokenType.LEFT,
        TokenType.RIGHT,
        TokenType.BOTH,
        TokenType.NONE,
        // Roof types
        TokenType.FLAT,
        TokenType.GABLE,
        TokenType.HIP,
        TokenType.SHED,
        TokenType.MANSARD,
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

  private parseRoofTypeValue(value: unknown): RoofType | undefined {
    const str = String(value).toLowerCase();
    switch (str) {
      case "flat":
        return RoofType.FLAT;
      case "gable":
        return RoofType.GABLE;
      case "hip":
        return RoofType.HIP;
      case "shed":
        return RoofType.SHED;
      case "mansard":
        return RoofType.MANSARD;
      default:
        return undefined;
    }
  }

  private parseRoomTypeValue(value: unknown): RoomType | undefined {
    const str = String(value).toLowerCase();
    switch (str) {
      case "bedroom":
        return RoomType.BEDROOM;
      case "bathroom":
        return RoomType.BATHROOM;
      case "kitchen":
        return RoomType.KITCHEN;
      case "living":
        return RoomType.LIVING;
      case "dining":
        return RoomType.DINING;
      case "office":
        return RoomType.OFFICE;
      case "storage":
        return RoomType.STORAGE;
      case "generic":
        return RoomType.GENERIC;
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
