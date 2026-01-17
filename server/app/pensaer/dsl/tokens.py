"""Token types for the Pensaer DSL lexer.

This module defines all token types used by the DSL grammar,
including keywords, operators, and literal types.
"""

from dataclasses import dataclass
from enum import Enum, auto
from typing import Any


class TokenType(Enum):
    """All token types recognized by the lexer."""

    # Literals
    INTEGER = auto()
    FLOAT = auto()
    UUID = auto()
    STRING = auto()

    # Identifiers and Keywords
    IDENTIFIER = auto()

    # Commands
    WALL = auto()
    WALLS = auto()
    DOOR = auto()
    WINDOW = auto()
    OPENING = auto()
    CREATE = auto()
    PLACE = auto()
    ADD = auto()
    MODIFY = auto()
    SET = auto()
    HELP = auto()

    # Directional Keywords
    FROM = auto()
    TO = auto()
    AT = auto()
    IN = auto()
    ON = auto()
    START = auto()
    END = auto()
    OFFSET = auto()

    # Shape Keywords
    RECT = auto()
    RECTANGLE = auto()
    BOX = auto()

    # Property Keywords
    HEIGHT = auto()
    THICKNESS = auto()
    WIDTH = auto()
    TYPE = auto()
    LEVEL = auto()
    SWING = auto()
    SILL = auto()
    SILL_HEIGHT = auto()

    # Wall Types
    BASIC = auto()
    STRUCTURAL = auto()
    CURTAIN = auto()
    RETAINING = auto()

    # Door Types
    SINGLE = auto()
    DOUBLE = auto()
    SLIDING = auto()
    FOLDING = auto()
    REVOLVING = auto()
    POCKET = auto()

    # Window Types
    FIXED = auto()
    CASEMENT = auto()
    DOUBLE_HUNG = auto()
    AWNING = auto()
    HOPPER = auto()
    PIVOT = auto()

    # Swing Directions
    LEFT = auto()
    RIGHT = auto()
    BOTH = auto()
    NONE = auto()

    # Units
    UNIT_M = auto()
    UNIT_MM = auto()
    UNIT_CM = auto()
    UNIT_FT = auto()
    UNIT_IN = auto()

    # Punctuation
    LPAREN = auto()
    RPAREN = auto()
    COMMA = auto()
    AT_SIGN = auto()
    EQUALS = auto()
    HYPHEN = auto()
    X = auto()
    BY = auto()

    # Options (short)
    OPT_H = auto()
    OPT_T = auto()
    OPT_W = auto()

    # Options (long)
    LONG_HEIGHT = auto()
    LONG_THICKNESS = auto()
    LONG_WIDTH = auto()
    LONG_TYPE = auto()
    LONG_LEVEL = auto()
    LONG_SWING = auto()
    LONG_SILL = auto()
    LONG_SILL_HEIGHT = auto()

    # Variables
    VAR_LAST = auto()
    VAR_SELECTED = auto()
    VAR_WALL = auto()

    # Special
    NEWLINE = auto()
    EOF = auto()
    ERROR = auto()


# Keyword mappings
KEYWORDS: dict[str, TokenType] = {
    # Commands
    "wall": TokenType.WALL,
    "walls": TokenType.WALLS,
    "door": TokenType.DOOR,
    "window": TokenType.WINDOW,
    "opening": TokenType.OPENING,
    "create": TokenType.CREATE,
    "place": TokenType.PLACE,
    "add": TokenType.ADD,
    "modify": TokenType.MODIFY,
    "set": TokenType.SET,
    "help": TokenType.HELP,
    # Directional
    "from": TokenType.FROM,
    "to": TokenType.TO,
    "at": TokenType.AT,
    "in": TokenType.IN,
    "on": TokenType.ON,
    "start": TokenType.START,
    "end": TokenType.END,
    "offset": TokenType.OFFSET,
    # Shape
    "rect": TokenType.RECT,
    "rectangle": TokenType.RECTANGLE,
    "box": TokenType.BOX,
    # Properties
    "height": TokenType.HEIGHT,
    "thickness": TokenType.THICKNESS,
    "thick": TokenType.THICKNESS,
    "width": TokenType.WIDTH,
    "type": TokenType.TYPE,
    "level": TokenType.LEVEL,
    "swing": TokenType.SWING,
    "sill": TokenType.SILL,
    "sill-height": TokenType.SILL_HEIGHT,
    # Wall types
    "basic": TokenType.BASIC,
    "structural": TokenType.STRUCTURAL,
    "curtain": TokenType.CURTAIN,
    "retaining": TokenType.RETAINING,
    # Door types
    "single": TokenType.SINGLE,
    "double": TokenType.DOUBLE,
    "sliding": TokenType.SLIDING,
    "folding": TokenType.FOLDING,
    "revolving": TokenType.REVOLVING,
    "pocket": TokenType.POCKET,
    # Window types
    "fixed": TokenType.FIXED,
    "casement": TokenType.CASEMENT,
    "double_hung": TokenType.DOUBLE_HUNG,
    "awning": TokenType.AWNING,
    "hopper": TokenType.HOPPER,
    "pivot": TokenType.PIVOT,
    # Swing directions
    "left": TokenType.LEFT,
    "right": TokenType.RIGHT,
    "both": TokenType.BOTH,
    "none": TokenType.NONE,
    # Dimension keyword
    "by": TokenType.BY,
    "x": TokenType.X,
}

# Unit suffix mappings
UNIT_SUFFIXES: dict[str, TokenType] = {
    "m": TokenType.UNIT_M,
    "mm": TokenType.UNIT_MM,
    "cm": TokenType.UNIT_CM,
    "ft": TokenType.UNIT_FT,
    "in": TokenType.UNIT_IN,
}

# Variable mappings
VARIABLES: dict[str, TokenType] = {
    "$last": TokenType.VAR_LAST,
    "$selected": TokenType.VAR_SELECTED,
    "$wall": TokenType.VAR_WALL,
}

# Long option mappings (without --)
LONG_OPTIONS: dict[str, TokenType] = {
    "height": TokenType.LONG_HEIGHT,
    "thickness": TokenType.LONG_THICKNESS,
    "width": TokenType.LONG_WIDTH,
    "type": TokenType.LONG_TYPE,
    "level": TokenType.LONG_LEVEL,
    "swing": TokenType.LONG_SWING,
    "sill": TokenType.LONG_SILL,
    "sill-height": TokenType.LONG_SILL_HEIGHT,
}

# Short option mappings (without -)
SHORT_OPTIONS: dict[str, TokenType] = {
    "h": TokenType.OPT_H,
    "t": TokenType.OPT_T,
    "w": TokenType.OPT_W,
}


@dataclass(frozen=True, slots=True)
class Token:
    """A lexical token from the DSL input."""

    type: TokenType
    value: Any
    line: int
    column: int
    raw: str

    def __repr__(self) -> str:
        return f"Token({self.type.name}, {self.value!r}, {self.line}:{self.column})"


@dataclass(frozen=True, slots=True)
class LexerError:
    """Error encountered during lexing."""

    message: str
    line: int
    column: int
    raw: str

    def __str__(self) -> str:
        return f"Lexer error at {self.line}:{self.column}: {self.message}"
