/**
 * DSL Error Types and Utilities
 *
 * Defines error types for DSL parsing and execution with position tracking
 * and categorization for user-friendly error messages.
 */

// =============================================================================
// Error Codes
// =============================================================================

/**
 * DSL-specific error codes for categorization
 */
export enum DslErrorCode {
  // Syntax errors (1xxx)
  UNEXPECTED_TOKEN = 1001,
  UNEXPECTED_END_OF_INPUT = 1002,
  UNTERMINATED_STRING = 1003,
  INVALID_NUMBER = 1004,
  INVALID_CHARACTER = 1005,

  // Command errors (2xxx)
  UNKNOWN_COMMAND = 2001,
  MISSING_REQUIRED_PARAM = 2002,
  INVALID_PARAM_VALUE = 2003,
  INVALID_PARAM_TYPE = 2004,
  DUPLICATE_PARAM = 2005,

  // Reference errors (3xxx)
  UNKNOWN_VARIABLE = 3001,
  INVALID_ELEMENT_REF = 3002,
  ELEMENT_NOT_FOUND = 3003,

  // Validation errors (4xxx)
  WALL_TOO_SHORT = 4001,
  INVALID_COORDINATES = 4002,
  NEGATIVE_DIMENSION = 4003,
  OPENING_OUTSIDE_WALL = 4004,
  INVALID_OFFSET = 4005,

  // Unknown
  UNKNOWN = 9999,
}

// =============================================================================
// Error Position
// =============================================================================

/**
 * Source position for error reporting
 */
export interface SourcePosition {
  line: number;
  column: number;
  offset?: number;
  length?: number;
}

// =============================================================================
// Base DSL Error
// =============================================================================

/**
 * Base DSL error with position tracking
 */
export interface DslError {
  /** Error code for categorization */
  code: DslErrorCode;
  /** Human-readable error message */
  message: string;
  /** Source position where error occurred */
  position: SourcePosition;
  /** The raw token or text that caused the error */
  source?: string;
  /** Additional context data */
  context?: Record<string, unknown>;
}

/**
 * Create a DSL error
 */
export function createDslError(
  code: DslErrorCode,
  message: string,
  position: SourcePosition,
  options?: {
    source?: string;
    context?: Record<string, unknown>;
  }
): DslError {
  return {
    code,
    message,
    position,
    source: options?.source,
    context: options?.context,
  };
}

// =============================================================================
// Error Factory Functions
// =============================================================================

/**
 * Create syntax error for unexpected token
 */
export function unexpectedTokenError(
  expected: string,
  got: string,
  position: SourcePosition
): DslError {
  return createDslError(
    DslErrorCode.UNEXPECTED_TOKEN,
    `Expected ${expected}, got '${got}'`,
    position,
    { source: got, context: { expected, got } }
  );
}

/**
 * Create syntax error for unexpected end of input
 */
export function unexpectedEndError(
  expected: string,
  position: SourcePosition
): DslError {
  return createDslError(
    DslErrorCode.UNEXPECTED_END_OF_INPUT,
    `Unexpected end of input, expected ${expected}`,
    position,
    { context: { expected } }
  );
}

/**
 * Create error for unknown command
 */
export function unknownCommandError(
  command: string,
  position: SourcePosition,
  suggestions?: string[]
): DslError {
  let message = `Unknown command: '${command}'`;
  if (suggestions && suggestions.length > 0) {
    message += `. Did you mean: ${suggestions.join(", ")}?`;
  }
  return createDslError(DslErrorCode.UNKNOWN_COMMAND, message, position, {
    source: command,
    context: { command, suggestions },
  });
}

/**
 * Create error for missing required parameter
 */
export function missingParamError(
  paramName: string,
  commandName: string,
  position: SourcePosition
): DslError {
  return createDslError(
    DslErrorCode.MISSING_REQUIRED_PARAM,
    `Missing required parameter '${paramName}' for '${commandName}'`,
    position,
    { context: { param: paramName, command: commandName } }
  );
}

/**
 * Create error for invalid parameter value
 */
export function invalidParamValueError(
  paramName: string,
  value: string,
  expected: string,
  position: SourcePosition
): DslError {
  return createDslError(
    DslErrorCode.INVALID_PARAM_VALUE,
    `Invalid value '${value}' for '${paramName}', expected ${expected}`,
    position,
    { source: value, context: { param: paramName, value, expected } }
  );
}

/**
 * Create error for invalid parameter type
 */
export function invalidParamTypeError(
  paramName: string,
  expectedType: string,
  gotType: string,
  position: SourcePosition
): DslError {
  return createDslError(
    DslErrorCode.INVALID_PARAM_TYPE,
    `'${paramName}' expects ${expectedType}, got ${gotType}`,
    position,
    { context: { param: paramName, expected: expectedType, got: gotType } }
  );
}

/**
 * Create error for unknown variable
 */
export function unknownVariableError(
  varName: string,
  position: SourcePosition,
  availableVars?: string[]
): DslError {
  let message = `Unknown variable: '${varName}'`;
  if (availableVars && availableVars.length > 0) {
    message += `. Available: ${availableVars.join(", ")}`;
  }
  return createDslError(DslErrorCode.UNKNOWN_VARIABLE, message, position, {
    source: varName,
    context: { variable: varName, available: availableVars },
  });
}

/**
 * Create error for invalid element reference
 */
export function invalidElementRefError(
  refValue: string,
  position: SourcePosition
): DslError {
  return createDslError(
    DslErrorCode.INVALID_ELEMENT_REF,
    `Invalid element reference: '${refValue}'. Use a UUID or variable like $last, $selected`,
    position,
    { source: refValue }
  );
}

/**
 * Create validation error for wall too short
 */
export function wallTooShortError(
  length: number,
  minLength: number,
  position: SourcePosition
): DslError {
  return createDslError(
    DslErrorCode.WALL_TOO_SHORT,
    `Wall length (${length.toFixed(2)}m) is too short. Minimum is ${minLength}m`,
    position,
    { context: { length, minLength } }
  );
}

/**
 * Create validation error for invalid coordinates
 */
export function invalidCoordinatesError(
  coord: string,
  position: SourcePosition
): DslError {
  return createDslError(
    DslErrorCode.INVALID_COORDINATES,
    `Invalid coordinates: '${coord}'. Use format (x, y) or x,y`,
    position,
    { source: coord }
  );
}

/**
 * Create validation error for negative dimension
 */
export function negativeDimensionError(
  dimension: string,
  value: number,
  position: SourcePosition
): DslError {
  return createDslError(
    DslErrorCode.NEGATIVE_DIMENSION,
    `${dimension} cannot be negative (got ${value})`,
    position,
    { context: { dimension, value } }
  );
}

/**
 * Create validation error for opening outside wall
 */
export function openingOutsideWallError(
  offset: number,
  wallLength: number,
  position: SourcePosition
): DslError {
  return createDslError(
    DslErrorCode.OPENING_OUTSIDE_WALL,
    `Opening offset (${offset}m) exceeds wall length (${wallLength}m)`,
    position,
    { context: { offset, wallLength } }
  );
}

/**
 * Create error for invalid offset
 */
export function invalidOffsetError(
  offset: number,
  position: SourcePosition
): DslError {
  return createDslError(
    DslErrorCode.INVALID_OFFSET,
    `Invalid offset: ${offset}. Offset must be non-negative`,
    position,
    { context: { offset } }
  );
}

// =============================================================================
// Error Collection Result
// =============================================================================

/**
 * Result with errors
 */
export interface DslResult<T> {
  success: boolean;
  value?: T;
  errors: DslError[];
  warnings?: DslError[];
}

/**
 * Create a successful result
 */
export function success<T>(value: T): DslResult<T> {
  return { success: true, value, errors: [] };
}

/**
 * Create a failed result
 */
export function failure<T>(errors: DslError[]): DslResult<T> {
  return { success: false, errors };
}

// =============================================================================
// String Similarity for Suggestions
// =============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find similar strings for "did you mean?" suggestions
 */
export function findSimilar(
  input: string,
  candidates: string[],
  maxDistance: number = 3,
  maxSuggestions: number = 3
): string[] {
  const inputLower = input.toLowerCase();

  const matches = candidates
    .map((candidate) => ({
      candidate,
      distance: levenshteinDistance(inputLower, candidate.toLowerCase()),
    }))
    .filter(({ distance }) => distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxSuggestions)
    .map(({ candidate }) => candidate);

  return matches;
}

// =============================================================================
// Known Commands and Keywords for Suggestions
// =============================================================================

/**
 * List of known DSL commands for suggestions
 */
export const KNOWN_COMMANDS = [
  "wall",
  "walls",
  "door",
  "window",
  "opening",
  "rect",
  "rectangle",
  "box",
  "help",
  "create",
  "place",
  "add",
  "modify",
  "set",
];

/**
 * List of known options for suggestions
 */
export const KNOWN_OPTIONS = [
  "height",
  "thickness",
  "width",
  "type",
  "level",
  "swing",
  "sill",
  "sill-height",
  "from",
  "to",
  "at",
  "in",
  "offset",
];

/**
 * List of known variables
 */
export const KNOWN_VARIABLES = ["$last", "$selected", "$wall"];
