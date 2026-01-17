/**
 * Token types for the Pensaer DSL lexer.
 *
 * This module defines all token types used by the DSL grammar,
 * including keywords, operators, and literal types.
 */

/**
 * All token types recognized by the lexer.
 */
export enum TokenType {
  // Literals
  INTEGER = "INTEGER",
  FLOAT = "FLOAT",
  UUID = "UUID",
  STRING = "STRING",

  // Identifiers and Keywords
  IDENTIFIER = "IDENTIFIER",

  // Commands
  WALL = "WALL",
  WALLS = "WALLS",
  DOOR = "DOOR",
  WINDOW = "WINDOW",
  OPENING = "OPENING",
  CREATE = "CREATE",
  PLACE = "PLACE",
  ADD = "ADD",
  MODIFY = "MODIFY",
  SET = "SET",
  HELP = "HELP",

  // Directional Keywords
  FROM = "FROM",
  TO = "TO",
  AT = "AT",
  IN = "IN",
  ON = "ON",
  START = "START",
  END = "END",
  OFFSET = "OFFSET",

  // Shape Keywords
  RECT = "RECT",
  RECTANGLE = "RECTANGLE",
  BOX = "BOX",

  // Property Keywords
  HEIGHT = "HEIGHT",
  THICKNESS = "THICKNESS",
  WIDTH = "WIDTH",
  TYPE = "TYPE",
  LEVEL = "LEVEL",
  SWING = "SWING",
  SILL = "SILL",
  SILL_HEIGHT = "SILL_HEIGHT",

  // Wall Types
  BASIC = "BASIC",
  STRUCTURAL = "STRUCTURAL",
  CURTAIN = "CURTAIN",
  RETAINING = "RETAINING",

  // Door Types
  SINGLE = "SINGLE",
  DOUBLE = "DOUBLE",
  SLIDING = "SLIDING",
  FOLDING = "FOLDING",
  REVOLVING = "REVOLVING",
  POCKET = "POCKET",

  // Window Types
  FIXED = "FIXED",
  CASEMENT = "CASEMENT",
  DOUBLE_HUNG = "DOUBLE_HUNG",
  AWNING = "AWNING",
  HOPPER = "HOPPER",
  PIVOT = "PIVOT",

  // Swing Directions
  LEFT = "LEFT",
  RIGHT = "RIGHT",
  BOTH = "BOTH",
  NONE = "NONE",

  // Units
  UNIT_M = "UNIT_M",
  UNIT_MM = "UNIT_MM",
  UNIT_CM = "UNIT_CM",
  UNIT_FT = "UNIT_FT",
  UNIT_IN = "UNIT_IN",

  // Punctuation
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  COMMA = "COMMA",
  AT_SIGN = "AT_SIGN",
  EQUALS = "EQUALS",
  HYPHEN = "HYPHEN",
  X = "X",
  BY = "BY",

  // Options (short)
  OPT_H = "OPT_H",
  OPT_T = "OPT_T",
  OPT_W = "OPT_W",

  // Options (long)
  LONG_HEIGHT = "LONG_HEIGHT",
  LONG_THICKNESS = "LONG_THICKNESS",
  LONG_WIDTH = "LONG_WIDTH",
  LONG_TYPE = "LONG_TYPE",
  LONG_LEVEL = "LONG_LEVEL",
  LONG_SWING = "LONG_SWING",
  LONG_SILL = "LONG_SILL",
  LONG_SILL_HEIGHT = "LONG_SILL_HEIGHT",

  // Variables
  VAR_LAST = "VAR_LAST",
  VAR_SELECTED = "VAR_SELECTED",
  VAR_WALL = "VAR_WALL",

  // Special
  NEWLINE = "NEWLINE",
  EOF = "EOF",
  ERROR = "ERROR",
}

/**
 * A lexical token from the DSL input.
 */
export interface Token {
  type: TokenType;
  value: string | number | null;
  line: number;
  column: number;
  raw: string;
}

/**
 * Error encountered during lexing.
 */
export interface LexerError {
  message: string;
  line: number;
  column: number;
  raw: string;
}

/**
 * Keyword mappings (lowercase -> TokenType).
 */
export const KEYWORDS: Record<string, TokenType> = {
  // Commands
  wall: TokenType.WALL,
  walls: TokenType.WALLS,
  door: TokenType.DOOR,
  window: TokenType.WINDOW,
  opening: TokenType.OPENING,
  create: TokenType.CREATE,
  place: TokenType.PLACE,
  add: TokenType.ADD,
  modify: TokenType.MODIFY,
  set: TokenType.SET,
  help: TokenType.HELP,
  // Directional
  from: TokenType.FROM,
  to: TokenType.TO,
  at: TokenType.AT,
  in: TokenType.IN,
  on: TokenType.ON,
  start: TokenType.START,
  end: TokenType.END,
  offset: TokenType.OFFSET,
  // Shape
  rect: TokenType.RECT,
  rectangle: TokenType.RECTANGLE,
  box: TokenType.BOX,
  // Properties
  height: TokenType.HEIGHT,
  thickness: TokenType.THICKNESS,
  thick: TokenType.THICKNESS,
  width: TokenType.WIDTH,
  type: TokenType.TYPE,
  level: TokenType.LEVEL,
  swing: TokenType.SWING,
  sill: TokenType.SILL,
  "sill-height": TokenType.SILL_HEIGHT,
  // Wall types
  basic: TokenType.BASIC,
  structural: TokenType.STRUCTURAL,
  curtain: TokenType.CURTAIN,
  retaining: TokenType.RETAINING,
  // Door types
  single: TokenType.SINGLE,
  double: TokenType.DOUBLE,
  sliding: TokenType.SLIDING,
  folding: TokenType.FOLDING,
  revolving: TokenType.REVOLVING,
  pocket: TokenType.POCKET,
  // Window types
  fixed: TokenType.FIXED,
  casement: TokenType.CASEMENT,
  double_hung: TokenType.DOUBLE_HUNG,
  awning: TokenType.AWNING,
  hopper: TokenType.HOPPER,
  pivot: TokenType.PIVOT,
  // Swing directions
  left: TokenType.LEFT,
  right: TokenType.RIGHT,
  both: TokenType.BOTH,
  none: TokenType.NONE,
  // Dimension keyword
  by: TokenType.BY,
  x: TokenType.X,
};

/**
 * Unit suffix mappings.
 */
export const UNIT_SUFFIXES: Record<string, TokenType> = {
  m: TokenType.UNIT_M,
  mm: TokenType.UNIT_MM,
  cm: TokenType.UNIT_CM,
  ft: TokenType.UNIT_FT,
  in: TokenType.UNIT_IN,
};

/**
 * Variable mappings.
 */
export const VARIABLES: Record<string, TokenType> = {
  $last: TokenType.VAR_LAST,
  $selected: TokenType.VAR_SELECTED,
  $wall: TokenType.VAR_WALL,
};

/**
 * Long option mappings (without --).
 */
export const LONG_OPTIONS: Record<string, TokenType> = {
  height: TokenType.LONG_HEIGHT,
  thickness: TokenType.LONG_THICKNESS,
  width: TokenType.LONG_WIDTH,
  type: TokenType.LONG_TYPE,
  level: TokenType.LONG_LEVEL,
  swing: TokenType.LONG_SWING,
  sill: TokenType.LONG_SILL,
  "sill-height": TokenType.LONG_SILL_HEIGHT,
};

/**
 * Short option mappings (without -).
 */
export const SHORT_OPTIONS: Record<string, TokenType> = {
  h: TokenType.OPT_H,
  t: TokenType.OPT_T,
  w: TokenType.OPT_W,
};

/**
 * Unit conversion factors to meters.
 */
export const UNIT_CONVERSIONS: Record<string, number> = {
  m: 1.0,
  mm: 0.001,
  cm: 0.01,
  ft: 0.3048,
  in: 0.0254,
};
