/**
 * BNF Grammar Specification for the Pensaer DSL.
 *
 * This module defines the formal grammar for the Pensaer BIM command language.
 * The grammar follows Backus-Naur Form (BNF) notation and is designed to be
 * both human-readable and machine-parseable.
 *
 * Grammar Conventions:
 * - UPPERCASE: Terminal tokens (from lexer)
 * - lowercase: Non-terminal rules
 * - |: Alternation (or)
 * - []: Optional
 * - {}: Zero or more repetitions
 * - (): Grouping
 * - "text": Literal string
 *
 * @see docs/dsl/GRAMMAR.bnf for the formal BNF grammar specification
 * @see docs/dsl/DSL_REFERENCE.md for detailed documentation
 */

// =============================================================================
// Grammar Rule Types
// =============================================================================

/**
 * Types of grammar rules
 */
export enum RuleType {
  TERMINAL = "terminal",
  NON_TERMINAL = "non_terminal",
  ALTERNATION = "alternation",
  SEQUENCE = "sequence",
  OPTIONAL = "optional",
  REPETITION = "repetition",
  LITERAL = "literal",
}

/**
 * Base grammar element
 */
export interface GrammarElement {
  type: RuleType;
  name?: string;
  description?: string;
}

/**
 * Terminal symbol (token)
 */
export interface TerminalSymbol extends GrammarElement {
  type: RuleType.TERMINAL;
  tokenType: string;
}

/**
 * Non-terminal symbol (references another rule)
 */
export interface NonTerminalSymbol extends GrammarElement {
  type: RuleType.NON_TERMINAL;
  ruleName: string;
}

/**
 * Literal string match
 */
export interface LiteralSymbol extends GrammarElement {
  type: RuleType.LITERAL;
  value: string;
}

/**
 * Alternation (choice between elements)
 */
export interface AlternationRule extends GrammarElement {
  type: RuleType.ALTERNATION;
  alternatives: GrammarRule[];
}

/**
 * Sequence of elements
 */
export interface SequenceRule extends GrammarElement {
  type: RuleType.SEQUENCE;
  elements: GrammarRule[];
}

/**
 * Optional element
 */
export interface OptionalRule extends GrammarElement {
  type: RuleType.OPTIONAL;
  element: GrammarRule;
}

/**
 * Zero or more repetitions
 */
export interface RepetitionRule extends GrammarElement {
  type: RuleType.REPETITION;
  element: GrammarRule;
  min: number;
  max: number | null; // null = unbounded
}

/**
 * Union type for all grammar rules
 */
export type GrammarRule =
  | TerminalSymbol
  | NonTerminalSymbol
  | LiteralSymbol
  | AlternationRule
  | SequenceRule
  | OptionalRule
  | RepetitionRule;

// =============================================================================
// Grammar Rule Factories
// =============================================================================

/**
 * Create a terminal symbol
 */
export function terminal(tokenType: string, name?: string): TerminalSymbol {
  return { type: RuleType.TERMINAL, tokenType, name };
}

/**
 * Create a non-terminal symbol
 */
export function nonTerminal(ruleName: string): NonTerminalSymbol {
  return { type: RuleType.NON_TERMINAL, ruleName };
}

/**
 * Create a literal symbol
 */
export function literal(value: string): LiteralSymbol {
  return { type: RuleType.LITERAL, value };
}

/**
 * Create an alternation rule
 */
export function alt(...alternatives: GrammarRule[]): AlternationRule {
  return { type: RuleType.ALTERNATION, alternatives };
}

/**
 * Create a sequence rule
 */
export function seq(...elements: GrammarRule[]): SequenceRule {
  return { type: RuleType.SEQUENCE, elements };
}

/**
 * Create an optional rule
 */
export function opt(element: GrammarRule): OptionalRule {
  return { type: RuleType.OPTIONAL, element };
}

/**
 * Create a repetition rule (zero or more)
 */
export function many(element: GrammarRule): RepetitionRule {
  return { type: RuleType.REPETITION, element, min: 0, max: null };
}

/**
 * Create a repetition rule (one or more)
 */
export function many1(element: GrammarRule): RepetitionRule {
  return { type: RuleType.REPETITION, element, min: 1, max: null };
}

// =============================================================================
// Pensaer DSL Grammar Definition
// =============================================================================

/**
 * The complete BNF grammar for the Pensaer DSL.
 *
 * BNF Notation:
 * ```bnf
 * program         ::= { command newline } EOF
 *
 * command         ::= wall_command
 *                   | walls_command
 *                   | door_command
 *                   | window_command
 *                   | opening_command
 *                   | help_command
 *
 * wall_command    ::= "wall" wall_points { wall_option }
 * wall_points     ::= flag_syntax | positional_syntax
 * flag_syntax     ::= "--start" point2d { wall_option_ext }
 * positional_syntax ::= [ "from" ] point2d [ "to" ] point2d
 *
 * walls_command   ::= ( "walls" [ "rect" | "rectangle" ] | "rect" [ "walls" ] | "box" [ "walls" ] )
 *                     point2d point2d { wall_option }
 *
 * door_command    ::= "door" [ "in" ] element_ref [ "at" | "@" | "offset" ] number { door_option }
 *
 * window_command  ::= "window" [ "in" ] element_ref [ "at" | "@" | "offset" ] number { window_option }
 *
 * opening_command ::= "opening" [ "in" ] element_ref [ "at" | "@" | "offset" ] number { opening_option }
 *
 * help_command    ::= "help" [ topic ]
 *
 * point2d         ::= "(" number [ "," ] number ")"
 *                   | number "," number
 *
 * number          ::= INTEGER | FLOAT
 *                   | INTEGER unit | FLOAT unit
 *
 * unit            ::= "m" | "mm" | "cm" | "ft" | "in"
 *
 * element_ref     ::= UUID | variable
 *
 * variable        ::= "$last" | "$selected" | "$wall"
 *
 * wall_option     ::= height_opt | thickness_opt | type_opt
 * wall_option_ext ::= wall_option | end_opt | level_opt | material_opt
 *
 * height_opt      ::= ( "height" | "--height" | "-h" ) number
 * thickness_opt   ::= ( "thickness" | "--thickness" | "-t" ) number
 * type_opt        ::= ( "type" | "--type" ) wall_type
 * end_opt         ::= "--end" point2d
 * level_opt       ::= ( "level" | "--level" ) ( STRING | IDENTIFIER )
 * material_opt    ::= "--material" ( STRING | IDENTIFIER )
 *
 * wall_type       ::= "basic" | "structural" | "curtain" | "retaining"
 *
 * door_option     ::= width_opt | height_opt | door_type_opt | swing_opt
 * width_opt       ::= ( "width" | "--width" | "-w" ) number
 * door_type_opt   ::= ( "type" | "--type" ) door_type
 * swing_opt       ::= ( "swing" | "--swing" ) swing_direction
 *
 * door_type       ::= "single" | "double" | "sliding" | "folding" | "revolving" | "pocket"
 * swing_direction ::= "left" | "right" | "both" | "none"
 *
 * window_option   ::= width_opt | height_opt | window_type_opt | sill_opt
 * window_type_opt ::= ( "type" | "--type" ) window_type
 * sill_opt        ::= ( "sill" | "sill-height" | "--sill" | "--sill-height" ) number
 *
 * window_type     ::= "fixed" | "casement" | "double_hung" | "sliding" | "awning" | "hopper" | "pivot"
 *
 * opening_option  ::= width_opt | height_opt
 *
 * topic           ::= IDENTIFIER | STRING
 * ```
 */
export interface PensaerGrammar {
  name: string;
  version: string;
  rules: Record<string, GrammarRule>;
}

/**
 * The Pensaer DSL Grammar (v1.0)
 */
export const PENSAER_GRAMMAR: PensaerGrammar = {
  name: "Pensaer DSL",
  version: "1.0",
  rules: {
    // Top-level program
    program: seq(
      many(seq(nonTerminal("command"), terminal("NEWLINE"))),
      terminal("EOF")
    ),

    // Command alternation
    command: alt(
      nonTerminal("wall_command"),
      nonTerminal("walls_command"),
      nonTerminal("floor_command"),
      nonTerminal("roof_command"),
      nonTerminal("room_command"),
      nonTerminal("door_command"),
      nonTerminal("window_command"),
      nonTerminal("opening_command"),
      nonTerminal("help_command")
    ),

    // Wall command
    wall_command: seq(
      terminal("WALL"),
      nonTerminal("wall_points"),
      many(nonTerminal("wall_option"))
    ),

    wall_points: alt(
      nonTerminal("flag_syntax"),
      nonTerminal("positional_syntax")
    ),

    flag_syntax: seq(
      terminal("LONG_START"),
      nonTerminal("point2d"),
      many(nonTerminal("wall_option_ext"))
    ),

    positional_syntax: seq(
      opt(terminal("FROM")),
      nonTerminal("point2d"),
      opt(terminal("TO")),
      nonTerminal("point2d")
    ),

    // Walls command (rectangular walls)
    walls_command: seq(
      alt(
        seq(terminal("WALLS"), opt(alt(terminal("RECT"), terminal("RECTANGLE")))),
        seq(terminal("RECT"), opt(terminal("WALLS"))),
        seq(terminal("BOX"), opt(terminal("WALLS")))
      ),
      nonTerminal("point2d"),
      nonTerminal("point2d"),
      many(nonTerminal("wall_option"))
    ),

    // Door command
    door_command: seq(
      terminal("DOOR"),
      opt(terminal("IN")),
      nonTerminal("element_ref"),
      opt(alt(terminal("AT"), terminal("AT_SIGN"), terminal("OFFSET"))),
      nonTerminal("number"),
      many(nonTerminal("door_option"))
    ),

    // Window command
    window_command: seq(
      terminal("WINDOW"),
      opt(terminal("IN")),
      nonTerminal("element_ref"),
      opt(alt(terminal("AT"), terminal("AT_SIGN"), terminal("OFFSET"))),
      nonTerminal("number"),
      many(nonTerminal("window_option"))
    ),

    // Opening command
    opening_command: seq(
      terminal("OPENING"),
      opt(terminal("IN")),
      nonTerminal("element_ref"),
      opt(alt(terminal("AT"), terminal("AT_SIGN"), terminal("OFFSET"))),
      nonTerminal("number"),
      many(nonTerminal("opening_option"))
    ),

    // Floor command
    floor_command: seq(
      terminal("FLOOR"),
      nonTerminal("boundary_definition"),
      many(nonTerminal("floor_option"))
    ),

    // Roof command
    roof_command: seq(
      terminal("ROOF"),
      opt(nonTerminal("roof_type_opt")),
      nonTerminal("boundary_definition"),
      many(nonTerminal("roof_option"))
    ),

    // Room command
    room_command: seq(
      terminal("ROOM"),
      nonTerminal("boundary_definition"),
      many(nonTerminal("room_option"))
    ),

    // Boundary definition (--points or --min/--max)
    boundary_definition: alt(
      seq(terminal("LONG_POINTS"), many1(nonTerminal("point2d"))),
      seq(terminal("LONG_MIN"), nonTerminal("point2d"), terminal("LONG_MAX"), nonTerminal("point2d"))
    ),

    // Floor options
    floor_option: alt(
      nonTerminal("thickness_opt"),
      nonTerminal("level_opt"),
      nonTerminal("type_opt")
    ),

    // Roof options
    roof_option: alt(
      nonTerminal("roof_type_opt"),
      nonTerminal("slope_opt"),
      nonTerminal("overhang_opt"),
      nonTerminal("level_opt")
    ),

    roof_type_opt: seq(
      alt(terminal("TYPE"), terminal("LONG_TYPE")),
      nonTerminal("roof_type")
    ),

    roof_type: alt(
      terminal("FLAT"),
      terminal("GABLE"),
      terminal("HIP"),
      terminal("SHED"),
      terminal("MANSARD")
    ),

    slope_opt: seq(
      alt(terminal("SLOPE"), terminal("LONG_SLOPE")),
      nonTerminal("number")
    ),

    overhang_opt: seq(
      alt(terminal("OVERHANG"), terminal("LONG_OVERHANG")),
      nonTerminal("number")
    ),

    // Room options
    room_option: alt(
      nonTerminal("name_opt"),
      nonTerminal("number_opt"),
      nonTerminal("room_type_opt"),
      nonTerminal("height_opt"),
      nonTerminal("level_opt")
    ),

    name_opt: seq(
      alt(terminal("NAME"), terminal("LONG_NAME")),
      alt(terminal("STRING"), terminal("IDENTIFIER"))
    ),

    number_opt: seq(
      alt(terminal("NUMBER_KW"), terminal("LONG_NUMBER")),
      alt(terminal("STRING"), terminal("IDENTIFIER"))
    ),

    room_type_opt: seq(
      alt(terminal("TYPE"), terminal("LONG_TYPE")),
      nonTerminal("room_type")
    ),

    room_type: alt(
      terminal("BEDROOM"),
      terminal("BATHROOM"),
      terminal("KITCHEN"),
      terminal("LIVING"),
      terminal("DINING"),
      terminal("OFFICE"),
      terminal("STORAGE"),
      terminal("GENERIC")
    ),

    // Help command
    help_command: seq(terminal("HELP"), opt(nonTerminal("topic"))),

    // Point2D: (x, y) or x,y
    point2d: alt(
      seq(
        terminal("LPAREN"),
        nonTerminal("number"),
        opt(terminal("COMMA")),
        nonTerminal("number"),
        terminal("RPAREN")
      ),
      seq(nonTerminal("number"), terminal("COMMA"), nonTerminal("number"))
    ),

    // Number with optional unit
    number: alt(terminal("INTEGER"), terminal("FLOAT")),

    // Element reference
    element_ref: alt(terminal("UUID"), nonTerminal("variable")),

    // Variables
    variable: alt(
      terminal("VAR_LAST"),
      terminal("VAR_SELECTED"),
      terminal("VAR_WALL")
    ),

    // Wall options
    wall_option: alt(
      nonTerminal("height_opt"),
      nonTerminal("thickness_opt"),
      nonTerminal("type_opt")
    ),

    wall_option_ext: alt(
      nonTerminal("wall_option"),
      nonTerminal("end_opt"),
      nonTerminal("level_opt"),
      nonTerminal("material_opt")
    ),

    height_opt: seq(
      alt(terminal("HEIGHT"), terminal("LONG_HEIGHT"), terminal("OPT_H")),
      nonTerminal("number")
    ),

    thickness_opt: seq(
      alt(terminal("THICKNESS"), terminal("LONG_THICKNESS"), terminal("OPT_T")),
      nonTerminal("number")
    ),

    type_opt: seq(
      alt(terminal("TYPE"), terminal("LONG_TYPE")),
      nonTerminal("wall_type")
    ),

    end_opt: seq(terminal("LONG_END"), nonTerminal("point2d")),

    level_opt: seq(
      alt(terminal("LEVEL"), terminal("LONG_LEVEL")),
      alt(terminal("STRING"), terminal("IDENTIFIER"))
    ),

    material_opt: seq(
      terminal("LONG_MATERIAL"),
      alt(terminal("STRING"), terminal("IDENTIFIER"))
    ),

    // Wall types
    wall_type: alt(
      terminal("BASIC"),
      terminal("STRUCTURAL"),
      terminal("CURTAIN"),
      terminal("RETAINING")
    ),

    // Door options
    door_option: alt(
      nonTerminal("width_opt"),
      nonTerminal("height_opt"),
      nonTerminal("door_type_opt"),
      nonTerminal("swing_opt")
    ),

    width_opt: seq(
      alt(terminal("WIDTH"), terminal("LONG_WIDTH"), terminal("OPT_W")),
      nonTerminal("number")
    ),

    door_type_opt: seq(
      alt(terminal("TYPE"), terminal("LONG_TYPE")),
      nonTerminal("door_type")
    ),

    swing_opt: seq(
      alt(terminal("SWING"), terminal("LONG_SWING")),
      nonTerminal("swing_direction")
    ),

    // Door types
    door_type: alt(
      terminal("SINGLE"),
      terminal("DOUBLE"),
      terminal("SLIDING"),
      terminal("FOLDING"),
      terminal("REVOLVING"),
      terminal("POCKET")
    ),

    // Swing directions
    swing_direction: alt(
      terminal("LEFT"),
      terminal("RIGHT"),
      terminal("BOTH"),
      terminal("NONE")
    ),

    // Window options
    window_option: alt(
      nonTerminal("width_opt"),
      nonTerminal("height_opt"),
      nonTerminal("window_type_opt"),
      nonTerminal("sill_opt")
    ),

    window_type_opt: seq(
      alt(terminal("TYPE"), terminal("LONG_TYPE")),
      nonTerminal("window_type")
    ),

    sill_opt: seq(
      alt(
        terminal("SILL"),
        terminal("SILL_HEIGHT"),
        terminal("LONG_SILL"),
        terminal("LONG_SILL_HEIGHT")
      ),
      nonTerminal("number")
    ),

    // Window types
    window_type: alt(
      terminal("FIXED"),
      terminal("CASEMENT"),
      terminal("DOUBLE_HUNG"),
      terminal("SLIDING"),
      terminal("AWNING"),
      terminal("HOPPER"),
      terminal("PIVOT")
    ),

    // Opening options
    opening_option: alt(nonTerminal("width_opt"), nonTerminal("height_opt")),

    // Topic for help
    topic: alt(terminal("IDENTIFIER"), terminal("STRING")),
  },
};

// =============================================================================
// Grammar Formatting (BNF Output)
// =============================================================================

/**
 * Convert a grammar rule to BNF string representation
 */
export function ruleToBnf(rule: GrammarRule): string {
  switch (rule.type) {
    case RuleType.TERMINAL:
      return rule.tokenType;

    case RuleType.NON_TERMINAL:
      return rule.ruleName;

    case RuleType.LITERAL:
      return `"${rule.value}"`;

    case RuleType.ALTERNATION:
      return rule.alternatives.map(ruleToBnf).join(" | ");

    case RuleType.SEQUENCE:
      return rule.elements.map(ruleToBnf).join(" ");

    case RuleType.OPTIONAL:
      return `[ ${ruleToBnf(rule.element)} ]`;

    case RuleType.REPETITION:
      if (rule.min === 0 && rule.max === null) {
        return `{ ${ruleToBnf(rule.element)} }`;
      } else if (rule.min === 1 && rule.max === null) {
        return `{ ${ruleToBnf(rule.element)} }+`;
      }
      return `{ ${ruleToBnf(rule.element)} }`;
  }
}

/**
 * Format the entire grammar as BNF
 */
export function grammarToBnf(grammar: PensaerGrammar): string {
  const lines: string[] = [
    `(* ${grammar.name} Grammar v${grammar.version} *)`,
    "",
  ];

  // Sort rules for consistent output (with program first)
  const ruleNames = Object.keys(grammar.rules);
  const sortedNames = ["program", ...ruleNames.filter((n) => n !== "program")];

  for (const name of sortedNames) {
    if (grammar.rules[name]) {
      const bnf = ruleToBnf(grammar.rules[name]);
      lines.push(`${name.padEnd(20)} ::= ${bnf}`);
    }
  }

  return lines.join("\n");
}

/**
 * Get the BNF representation of the Pensaer grammar
 */
export function getPensaerGrammarBnf(): string {
  return grammarToBnf(PENSAER_GRAMMAR);
}

// =============================================================================
// Grammar Validation Helpers
// =============================================================================

/**
 * Check if a rule name exists in the grammar
 */
export function hasRule(grammar: PensaerGrammar, ruleName: string): boolean {
  return ruleName in grammar.rules;
}

/**
 * Get all terminal symbols used in the grammar
 */
export function getTerminals(grammar: PensaerGrammar): Set<string> {
  const terminals = new Set<string>();

  function collectTerminals(rule: GrammarRule) {
    switch (rule.type) {
      case RuleType.TERMINAL:
        terminals.add(rule.tokenType);
        break;
      case RuleType.ALTERNATION:
        rule.alternatives.forEach(collectTerminals);
        break;
      case RuleType.SEQUENCE:
        rule.elements.forEach(collectTerminals);
        break;
      case RuleType.OPTIONAL:
      case RuleType.REPETITION:
        collectTerminals(rule.element);
        break;
    }
  }

  Object.values(grammar.rules).forEach(collectTerminals);
  return terminals;
}

/**
 * Get all non-terminal symbols used in the grammar
 */
export function getNonTerminals(grammar: PensaerGrammar): Set<string> {
  const nonTerminals = new Set<string>();

  function collectNonTerminals(rule: GrammarRule) {
    switch (rule.type) {
      case RuleType.NON_TERMINAL:
        nonTerminals.add(rule.ruleName);
        break;
      case RuleType.ALTERNATION:
        rule.alternatives.forEach(collectNonTerminals);
        break;
      case RuleType.SEQUENCE:
        rule.elements.forEach(collectNonTerminals);
        break;
      case RuleType.OPTIONAL:
      case RuleType.REPETITION:
        collectNonTerminals(rule.element);
        break;
    }
  }

  Object.values(grammar.rules).forEach(collectNonTerminals);
  return nonTerminals;
}

/**
 * Validate grammar integrity (all non-terminals have rules)
 */
export function validateGrammar(
  grammar: PensaerGrammar
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const nonTerminals = getNonTerminals(grammar);
  const ruleNames = new Set(Object.keys(grammar.rules));

  for (const nt of nonTerminals) {
    if (!ruleNames.has(nt)) {
      errors.push(`Missing rule for non-terminal: ${nt}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
