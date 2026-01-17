"""Pensaer DSL - Domain Specific Language for BIM commands.

This module provides lexer and parser for the Pensaer terminal DSL,
supporting wall, door, window, and opening commands.

Example:
    from pensaer.dsl import parse, tokenize

    # Parse a command
    result = parse("wall (0, 0) (5, 0) height 3")
    if result.success:
        for cmd in result.commands:
            args = cmd.to_mcp_args()
            print(args)

    # Or tokenize only
    tokens, errors = tokenize("wall (0, 0) (5, 0)")
"""

from .ast import (
    Command,
    CreateOpeningCommand,
    CreateRectWallsCommand,
    CreateWallCommand,
    DoorType,
    ElementRef,
    HelpCommand,
    ModifyDoorCommand,
    ModifyWallCommand,
    ModifyWindowCommand,
    ParseError,
    ParseResult,
    PlaceDoorCommand,
    PlaceWindowCommand,
    Point2D,
    Point3D,
    SwingDirection,
    VariableRef,
    WallType,
    WindowType,
)
from .lexer import Lexer, tokenize
from .parser import Parser, parse
from .tokens import LexerError, Token, TokenType

__all__ = [
    # Parser
    "Parser",
    "parse",
    "ParseResult",
    "ParseError",
    # AST Nodes
    "Command",
    "CreateWallCommand",
    "CreateRectWallsCommand",
    "ModifyWallCommand",
    "PlaceDoorCommand",
    "ModifyDoorCommand",
    "PlaceWindowCommand",
    "ModifyWindowCommand",
    "CreateOpeningCommand",
    "HelpCommand",
    # Types
    "Point2D",
    "Point3D",
    "ElementRef",
    "VariableRef",
    "WallType",
    "DoorType",
    "WindowType",
    "SwingDirection",
    # Lexer
    "Lexer",
    "tokenize",
    "Token",
    "TokenType",
    "LexerError",
]
