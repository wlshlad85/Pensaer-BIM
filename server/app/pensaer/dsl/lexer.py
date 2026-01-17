"""Lexer for the Pensaer DSL.

Tokenizes DSL input into a stream of tokens for the parser.
Supports wall, door, window, and opening commands with units and options.
"""

import re
from collections.abc import Iterator
from dataclasses import dataclass
from typing import ClassVar

from .tokens import (
    KEYWORDS,
    LONG_OPTIONS,
    SHORT_OPTIONS,
    UNIT_SUFFIXES,
    VARIABLES,
    LexerError,
    Token,
    TokenType,
)


@dataclass
class Lexer:
    """Tokenizer for the Pensaer DSL grammar.

    Example usage:
        lexer = Lexer("wall (0, 0) (5, 0) height 3")
        for token in lexer.tokenize():
            print(token)
    """

    source: str
    pos: int = 0
    line: int = 1
    column: int = 1
    errors: list[LexerError] | None = None

    # UUID pattern: 8-4-4-4-12 hex chars
    UUID_PATTERN: ClassVar[re.Pattern[str]] = re.compile(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        re.IGNORECASE,
    )

    # Number with optional unit suffix (longer suffixes first for greedy match)
    NUMBER_PATTERN: ClassVar[re.Pattern[str]] = re.compile(
        r"-?\d+(?:\.\d+)?(?:mm|cm|ft|in|m)?",
        re.IGNORECASE,
    )

    # Identifier pattern (letters, digits, underscore, hyphen)
    IDENT_PATTERN: ClassVar[re.Pattern[str]] = re.compile(
        r"[a-zA-Z][a-zA-Z0-9_-]*",
    )

    # String pattern (single or double quoted)
    STRING_PATTERN: ClassVar[re.Pattern[str]] = re.compile(
        r'"[^"]*"|\'[^\']*\'',
    )

    def __post_init__(self) -> None:
        if self.errors is None:
            self.errors = []

    @property
    def current_char(self) -> str | None:
        """Return current character or None if at end."""
        if self.pos >= len(self.source):
            return None
        return self.source[self.pos]

    def peek(self, offset: int = 1) -> str | None:
        """Peek at character at offset from current position."""
        pos = self.pos + offset
        if pos >= len(self.source):
            return None
        return self.source[pos]

    def advance(self, count: int = 1) -> None:
        """Advance position by count characters."""
        for _ in range(count):
            if self.pos < len(self.source):
                if self.source[self.pos] == "\n":
                    self.line += 1
                    self.column = 1
                else:
                    self.column += 1
                self.pos += 1

    def skip_whitespace(self) -> None:
        """Skip whitespace characters (except newlines)."""
        while self.current_char is not None and self.current_char in " \t\r":
            self.advance()

    def skip_comment(self) -> None:
        """Skip comment until end of line."""
        while self.current_char is not None and self.current_char != "\n":
            self.advance()

    def make_token(self, token_type: TokenType, value: object, raw: str) -> Token:
        """Create a token at current position."""
        return Token(
            type=token_type,
            value=value,
            line=self.line,
            column=self.column - len(raw),
            raw=raw,
        )

    def add_error(self, message: str, raw: str = "") -> None:
        """Record a lexer error."""
        if self.errors is not None:
            self.errors.append(
                LexerError(
                    message=message,
                    line=self.line,
                    column=self.column,
                    raw=raw,
                )
            )

    def read_uuid(self) -> Token | None:
        """Try to read a UUID token."""
        match = self.UUID_PATTERN.match(self.source, self.pos)
        if match:
            raw = match.group(0)
            self.advance(len(raw))
            return self.make_token(TokenType.UUID, raw.lower(), raw)
        return None

    def read_number(self) -> Token | None:
        """Read a number with optional unit suffix."""
        match = self.NUMBER_PATTERN.match(self.source, self.pos)
        if match:
            raw = match.group(0)
            self.advance(len(raw))

            # Extract numeric part and unit
            unit_match = re.search(r"(m|mm|cm|ft|in)$", raw, re.IGNORECASE)
            if unit_match:
                num_str = raw[: unit_match.start()]
                unit = unit_match.group(1).lower()
                value = float(num_str) if "." in num_str else int(num_str)
                # Convert to meters based on unit
                value = self._convert_to_meters(value, unit)
            else:
                value = float(raw) if "." in raw else int(raw)

            token_type = TokenType.FLOAT if isinstance(value, float) else TokenType.INTEGER
            return self.make_token(token_type, value, raw)
        return None

    def _convert_to_meters(self, value: float | int, unit: str) -> float:
        """Convert a dimension value to meters."""
        conversions = {
            "m": 1.0,
            "mm": 0.001,
            "cm": 0.01,
            "ft": 0.3048,
            "in": 0.0254,
        }
        return float(value) * conversions.get(unit, 1.0)

    def read_string(self) -> Token | None:
        """Read a quoted string."""
        match = self.STRING_PATTERN.match(self.source, self.pos)
        if match:
            raw = match.group(0)
            self.advance(len(raw))
            # Remove quotes
            value = raw[1:-1]
            return self.make_token(TokenType.STRING, value, raw)
        return None

    def read_variable(self) -> Token | None:
        """Read a variable reference ($last, $selected, $wall)."""
        if self.current_char != "$":
            return None

        # Match variable name
        start = self.pos
        self.advance()  # skip $

        # Read variable name
        name_start = self.pos
        while self.current_char is not None and (
            self.current_char.isalnum() or self.current_char == "_"
        ):
            self.advance()

        raw = self.source[start : self.pos]
        var_lower = raw.lower()

        if var_lower in VARIABLES:
            return self.make_token(VARIABLES[var_lower], raw, raw)

        # Unknown variable - treat as error
        self.add_error(f"Unknown variable: {raw}", raw)
        return self.make_token(TokenType.ERROR, raw, raw)

    def read_long_option(self) -> Token | None:
        """Read a long option (--height, --width, etc.)."""
        if self.current_char != "-" or self.peek() != "-":
            return None

        start = self.pos
        self.advance(2)  # skip --

        # Read option name (may include hyphen like sill-height)
        name_start = self.pos
        while self.current_char is not None and (
            self.current_char.isalnum() or self.current_char == "-"
        ):
            self.advance()

        option_name = self.source[name_start : self.pos].lower()
        raw = self.source[start : self.pos]

        # Check for = suffix
        has_equals = False
        if self.current_char == "=":
            has_equals = True
            self.advance()
            raw = self.source[start : self.pos]

        if option_name in LONG_OPTIONS:
            token_type = LONG_OPTIONS[option_name]
            return self.make_token(token_type, option_name, raw)

        # Unknown option
        self.add_error(f"Unknown option: --{option_name}", raw)
        return self.make_token(TokenType.ERROR, raw, raw)

    def read_short_option(self) -> Token | None:
        """Read a short option (-h, -t, -w)."""
        if self.current_char != "-":
            return None

        # Check it's not a negative number or long option
        next_char = self.peek()
        if next_char is None:
            return None
        if next_char == "-":  # long option
            return None
        if next_char.isdigit():  # negative number
            return None

        start = self.pos
        self.advance()  # skip -

        # Read single letter option
        if self.current_char is not None and self.current_char.isalpha():
            option = self.current_char.lower()
            self.advance()
            raw = self.source[start : self.pos]

            if option in SHORT_OPTIONS:
                return self.make_token(SHORT_OPTIONS[option], option, raw)

            # Unknown short option
            self.add_error(f"Unknown option: -{option}", raw)
            return self.make_token(TokenType.ERROR, raw, raw)

        return None

    def read_identifier_or_keyword(self) -> Token | None:
        """Read an identifier or keyword."""
        match = self.IDENT_PATTERN.match(self.source, self.pos)
        if match:
            raw = match.group(0)
            self.advance(len(raw))
            lower = raw.lower()

            # Check if it's a keyword
            if lower in KEYWORDS:
                return self.make_token(KEYWORDS[lower], lower, raw)

            # Otherwise it's an identifier
            return self.make_token(TokenType.IDENTIFIER, raw, raw)
        return None

    def read_punctuation(self) -> Token | None:
        """Read punctuation tokens."""
        char = self.current_char
        if char is None:
            return None

        token_map = {
            "(": TokenType.LPAREN,
            ")": TokenType.RPAREN,
            ",": TokenType.COMMA,
            "@": TokenType.AT_SIGN,
            "=": TokenType.EQUALS,
        }

        if char in token_map:
            self.advance()
            return self.make_token(token_map[char], char, char)

        return None

    def tokenize(self) -> Iterator[Token]:
        """Generate tokens from the source input.

        Yields:
            Token objects for each recognized lexeme.
        """
        while self.current_char is not None:
            # Skip whitespace
            if self.current_char in " \t\r":
                self.skip_whitespace()
                continue

            # Handle comments
            if self.current_char == "#":
                self.skip_comment()
                continue

            # Handle newlines
            if self.current_char == "\n":
                yield self.make_token(TokenType.NEWLINE, "\n", "\n")
                self.advance()
                continue

            # Try to match tokens in order of specificity

            # UUID (before identifier since it starts with hex)
            if self.current_char and self.current_char in "0123456789abcdefABCDEF":
                # Peek ahead to see if this looks like a UUID
                ahead = self.source[self.pos : self.pos + 36]
                if self.UUID_PATTERN.match(ahead):
                    token = self.read_uuid()
                    if token:
                        yield token
                        continue

            # Variables ($last, $selected, $wall)
            if self.current_char == "$":
                token = self.read_variable()
                if token:
                    yield token
                    continue

            # Long options (--height, --width, etc.)
            if self.current_char == "-" and self.peek() == "-":
                token = self.read_long_option()
                if token:
                    yield token
                    continue

            # Short options (-h, -t, -w) or negative numbers
            if self.current_char == "-":
                next_char = self.peek()
                if next_char and next_char.isdigit():
                    # Negative number
                    token = self.read_number()
                    if token:
                        yield token
                        continue
                elif next_char and next_char.isalpha():
                    # Short option
                    token = self.read_short_option()
                    if token:
                        yield token
                        continue

            # Numbers (with optional unit suffix)
            if self.current_char and (
                self.current_char.isdigit()
                or (self.current_char == "-" and self.peek() and self.peek().isdigit())  # type: ignore[union-attr]
            ):
                token = self.read_number()
                if token:
                    yield token
                    continue

            # Strings
            if self.current_char in "\"'":
                token = self.read_string()
                if token:
                    yield token
                    continue

            # Identifiers and keywords
            if self.current_char and self.current_char.isalpha():
                token = self.read_identifier_or_keyword()
                if token:
                    yield token
                    continue

            # Punctuation
            token = self.read_punctuation()
            if token:
                yield token
                continue

            # Unknown character
            char = self.current_char
            self.add_error(f"Unexpected character: {char!r}", char)
            self.advance()

        # Yield EOF token
        yield self.make_token(TokenType.EOF, None, "")


def tokenize(source: str) -> tuple[list[Token], list[LexerError]]:
    """Tokenize a DSL source string.

    Args:
        source: The DSL source code to tokenize.

    Returns:
        A tuple of (tokens, errors).
    """
    lexer = Lexer(source)
    tokens = list(lexer.tokenize())
    return tokens, lexer.errors or []
