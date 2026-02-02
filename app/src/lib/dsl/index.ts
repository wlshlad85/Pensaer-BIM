/**
 * Pensaer DSL - Domain Specific Language for BIM commands.
 *
 * This module provides lexer and parser for the Pensaer DSL,
 * enabling text-based creation and manipulation of building elements.
 *
 * @example
 * ```typescript
 * import { parse, tokenize } from './dsl';
 *
 * // Tokenize only
 * const { tokens, errors } = tokenize('wall (0, 0) (5, 0) height 3');
 *
 * // Parse to AST
 * const result = parse('wall (0, 0) (5, 0) height 3');
 * if (result.success) {
 *   console.log(result.commands);
 * }
 * ```
 */

// Token types and definitions
export {
  TokenType,
  type Token,
  type LexerError,
  KEYWORDS,
  VARIABLES,
  LONG_OPTIONS,
  SHORT_OPTIONS,
  UNIT_CONVERSIONS,
} from "./tokens";

// Lexer
export { Lexer, tokenize } from "./lexer";

// Parser
export { Parser, parse } from "./parser";

// AST types
export {
  // Enums
  WallType,
  DoorType,
  WindowType,
  SwingDirection,
  VariableRef,
  // Types
  type Point2D,
  type Point3D,
  type ElementRef,
  type BaseCommand,
  type Command,
  type CreateWallCommand,
  type CreateRectWallsCommand,
  type ModifyWallCommand,
  type PlaceDoorCommand,
  type ModifyDoorCommand,
  type PlaceWindowCommand,
  type ModifyWindowCommand,
  type CreateOpeningCommand,
  type HelpCommand,
  type PassthroughCommand,
  type ParseError,
  type ParseResult,
  // Functions
  createElementRefFromUUID,
  createElementRefFromVariable,
  commandToMcpArgs,
} from "./ast";

// Error types and utilities
export {
  // Enums
  DslErrorCode,
  // Types
  type DslError,
  type SourcePosition,
  type DslResult,
  // Factory functions
  createDslError,
  unexpectedTokenError,
  unexpectedEndError,
  unknownCommandError,
  missingParamError,
  invalidParamValueError,
  invalidParamTypeError,
  unknownVariableError,
  invalidElementRefError,
  wallTooShortError,
  invalidCoordinatesError,
  negativeDimensionError,
  openingOutsideWallError,
  invalidOffsetError,
  // Result helpers
  success,
  failure,
  // String similarity
  levenshteinDistance,
  findSimilar,
  // Known values for suggestions
  KNOWN_COMMANDS,
  KNOWN_OPTIONS,
  KNOWN_VARIABLES,
} from "./errors";

// Executor
export {
  executeCommand,
  executeCommands,
  executeDsl,
  type ExecutionContext,
  type ExecutionResult,
} from "./executor";

// Error formatter
export {
  // Main formatting functions
  formatDslError,
  formatDslErrors,
  formatParseErrors,
  // Terminal writers
  writeDslErrorToTerminal,
  writeDslErrorsToTerminal,
  writeParseErrorsToTerminal,
  // Quick formatting helpers
  formatQuickError,
  formatQuickWarning,
  formatUnknownCommand,
  formatMissingParam,
  formatInvalidValue,
  // Convert parse errors
  parseErrorToDslError,
  // Types
  type FormattedDslError,
  // Constants
  ANSI,
} from "./errorFormatter";
