/**
 * Pensaer DSL - Domain Specific Language for BIM commands.
 *
 * This module provides lexer and parser for the Pensaer DSL,
 * enabling text-based creation and manipulation of building elements.
 *
 * @example
 * ```typescript
 * import { tokenize } from './dsl';
 *
 * const { tokens, errors } = tokenize('wall (0, 0) (5, 0) height 3');
 * console.log(tokens);
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
