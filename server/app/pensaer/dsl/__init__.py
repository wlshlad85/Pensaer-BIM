"""Pensaer DSL - Domain Specific Language for BIM commands.

This module provides lexer and parser for the Pensaer terminal DSL,
supporting wall, door, window, and opening commands.

Example:
    from pensaer.dsl import tokenize, Lexer, Token, TokenType

    tokens, errors = tokenize("wall (0, 0) (5, 0) height 3")
    for token in tokens:
        print(token)
"""

from .lexer import Lexer, tokenize
from .tokens import LexerError, Token, TokenType

__all__ = [
    "Lexer",
    "LexerError",
    "Token",
    "TokenType",
    "tokenize",
]
