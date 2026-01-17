"""Tests for the Pensaer DSL lexer.

These tests verify that:
1. All token types are correctly recognized
2. Numbers with unit suffixes are converted to meters
3. Keywords and identifiers are distinguished
4. Variable references work correctly
5. Options (short and long) are parsed
6. Error handling works for invalid input
"""

import pytest
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from pensaer.dsl import Lexer, Token, TokenType, tokenize


class TestBasicTokens:
    """Test basic token recognition."""

    def test_empty_input(self):
        """Empty input should only produce EOF token."""
        tokens, errors = tokenize("")
        assert len(tokens) == 1
        assert tokens[0].type == TokenType.EOF
        assert len(errors) == 0

    def test_whitespace_only(self):
        """Whitespace-only input should only produce EOF."""
        tokens, errors = tokenize("   \t  ")
        assert len(tokens) == 1
        assert tokens[0].type == TokenType.EOF

    def test_newline_token(self):
        """Newlines should produce NEWLINE tokens."""
        tokens, errors = tokenize("wall\ndoor")
        types = [t.type for t in tokens]
        assert TokenType.NEWLINE in types

    def test_comment_ignored(self):
        """Comments should be skipped."""
        tokens, errors = tokenize("wall # this is a comment\ndoor")
        types = [t.type for t in tokens]
        assert TokenType.WALL in types
        assert TokenType.DOOR in types
        # Comment content should not appear
        assert all("comment" not in str(t.value) for t in tokens)


class TestNumbers:
    """Test number tokenization and unit conversion."""

    def test_integer(self):
        """Integer should be tokenized as INTEGER."""
        tokens, errors = tokenize("42")
        assert tokens[0].type == TokenType.INTEGER
        assert tokens[0].value == 42

    def test_float(self):
        """Float should be tokenized as FLOAT."""
        tokens, errors = tokenize("3.14")
        assert tokens[0].type == TokenType.FLOAT
        assert tokens[0].value == pytest.approx(3.14)

    def test_negative_integer(self):
        """Negative integer should be parsed correctly."""
        tokens, errors = tokenize("-5")
        assert tokens[0].value == -5

    def test_negative_float(self):
        """Negative float should be parsed correctly."""
        tokens, errors = tokenize("-2.5")
        assert tokens[0].value == pytest.approx(-2.5)

    def test_unit_meters(self):
        """Number with 'm' suffix should stay as meters."""
        tokens, errors = tokenize("5m")
        assert tokens[0].value == pytest.approx(5.0)

    def test_unit_millimeters(self):
        """Number with 'mm' suffix should convert to meters."""
        tokens, errors = tokenize("5000mm")
        assert tokens[0].value == pytest.approx(5.0)

    def test_unit_centimeters(self):
        """Number with 'cm' suffix should convert to meters."""
        tokens, errors = tokenize("300cm")
        assert tokens[0].value == pytest.approx(3.0)

    def test_unit_feet(self):
        """Number with 'ft' suffix should convert to meters."""
        tokens, errors = tokenize("10ft")
        assert tokens[0].value == pytest.approx(3.048)

    def test_unit_inches(self):
        """Number with 'in' suffix should convert to meters."""
        tokens, errors = tokenize("12in")
        assert tokens[0].value == pytest.approx(0.3048)

    def test_unit_case_insensitive(self):
        """Unit suffixes should be case insensitive."""
        tokens_lower, _ = tokenize("5mm")
        tokens_upper, _ = tokenize("5MM")
        assert tokens_lower[0].value == tokens_upper[0].value


class TestKeywords:
    """Test keyword tokenization."""

    def test_wall_keyword(self):
        """'wall' should be tokenized as WALL."""
        tokens, _ = tokenize("wall")
        assert tokens[0].type == TokenType.WALL

    def test_door_keyword(self):
        """'door' should be tokenized as DOOR."""
        tokens, _ = tokenize("door")
        assert tokens[0].type == TokenType.DOOR

    def test_window_keyword(self):
        """'window' should be tokenized as WINDOW."""
        tokens, _ = tokenize("window")
        assert tokens[0].type == TokenType.WINDOW

    def test_create_keyword(self):
        """'create' should be tokenized as CREATE."""
        tokens, _ = tokenize("create")
        assert tokens[0].type == TokenType.CREATE

    def test_from_to_keywords(self):
        """'from' and 'to' should be tokenized correctly."""
        tokens, _ = tokenize("from to")
        assert tokens[0].type == TokenType.FROM
        assert tokens[1].type == TokenType.TO

    def test_height_keyword(self):
        """'height' should be tokenized as HEIGHT."""
        tokens, _ = tokenize("height")
        assert tokens[0].type == TokenType.HEIGHT

    def test_wall_type_keywords(self):
        """Wall types should be tokenized correctly."""
        for wall_type in ["basic", "structural", "curtain", "retaining"]:
            tokens, _ = tokenize(wall_type)
            assert tokens[0].type.name == wall_type.upper()

    def test_door_type_keywords(self):
        """Door types should be tokenized correctly."""
        for door_type in ["single", "double", "sliding", "folding", "revolving", "pocket"]:
            tokens, _ = tokenize(door_type)
            assert tokens[0].type.name == door_type.upper()

    def test_window_type_keywords(self):
        """Window types should be tokenized correctly."""
        for window_type in ["fixed", "casement", "double_hung", "sliding", "awning", "hopper", "pivot"]:
            tokens, _ = tokenize(window_type)
            assert tokens[0].type.name == window_type.upper().replace("_", "_")

    def test_swing_directions(self):
        """Swing directions should be tokenized correctly."""
        for direction in ["left", "right", "both", "none"]:
            tokens, _ = tokenize(direction)
            assert tokens[0].type.name == direction.upper()

    def test_keyword_case_insensitive(self):
        """Keywords should be case insensitive."""
        tokens1, _ = tokenize("WALL")
        tokens2, _ = tokenize("wall")
        tokens3, _ = tokenize("Wall")
        assert tokens1[0].type == tokens2[0].type == tokens3[0].type


class TestVariables:
    """Test variable reference tokenization."""

    def test_var_last(self):
        """$last should be tokenized as VAR_LAST."""
        tokens, _ = tokenize("$last")
        assert tokens[0].type == TokenType.VAR_LAST

    def test_var_selected(self):
        """$selected should be tokenized as VAR_SELECTED."""
        tokens, _ = tokenize("$selected")
        assert tokens[0].type == TokenType.VAR_SELECTED

    def test_var_wall(self):
        """$wall should be tokenized as VAR_WALL."""
        tokens, _ = tokenize("$wall")
        assert tokens[0].type == TokenType.VAR_WALL

    def test_var_case_insensitive(self):
        """Variable names should be case insensitive."""
        tokens1, _ = tokenize("$LAST")
        tokens2, _ = tokenize("$last")
        assert tokens1[0].type == tokens2[0].type

    def test_unknown_variable_error(self):
        """Unknown variables should produce an error."""
        tokens, errors = tokenize("$unknown")
        assert len(errors) > 0
        assert "Unknown variable" in errors[0].message


class TestOptions:
    """Test short and long option tokenization."""

    def test_short_option_h(self):
        """-h should be tokenized as OPT_H."""
        tokens, _ = tokenize("-h")
        assert tokens[0].type == TokenType.OPT_H

    def test_short_option_t(self):
        """-t should be tokenized as OPT_T."""
        tokens, _ = tokenize("-t")
        assert tokens[0].type == TokenType.OPT_T

    def test_short_option_w(self):
        """-w should be tokenized as OPT_W."""
        tokens, _ = tokenize("-w")
        assert tokens[0].type == TokenType.OPT_W

    def test_long_option_height(self):
        """--height should be tokenized as LONG_HEIGHT."""
        tokens, _ = tokenize("--height")
        assert tokens[0].type == TokenType.LONG_HEIGHT

    def test_long_option_with_equals(self):
        """--height= should be tokenized as LONG_HEIGHT."""
        tokens, _ = tokenize("--height=")
        assert tokens[0].type == TokenType.LONG_HEIGHT

    def test_long_option_thickness(self):
        """--thickness should be tokenized as LONG_THICKNESS."""
        tokens, _ = tokenize("--thickness")
        assert tokens[0].type == TokenType.LONG_THICKNESS

    def test_long_option_sill_height(self):
        """--sill-height should be tokenized as LONG_SILL_HEIGHT."""
        tokens, _ = tokenize("--sill-height")
        assert tokens[0].type == TokenType.LONG_SILL_HEIGHT

    def test_unknown_short_option_error(self):
        """Unknown short options should produce an error."""
        tokens, errors = tokenize("-z")
        assert len(errors) > 0
        assert "Unknown option" in errors[0].message

    def test_unknown_long_option_error(self):
        """Unknown long options should produce an error."""
        tokens, errors = tokenize("--unknown")
        assert len(errors) > 0
        assert "Unknown option" in errors[0].message


class TestPunctuation:
    """Test punctuation tokenization."""

    def test_lparen(self):
        """'(' should be tokenized as LPAREN."""
        tokens, _ = tokenize("(")
        assert tokens[0].type == TokenType.LPAREN

    def test_rparen(self):
        """')' should be tokenized as RPAREN."""
        tokens, _ = tokenize(")")
        assert tokens[0].type == TokenType.RPAREN

    def test_comma(self):
        """',' should be tokenized as COMMA."""
        tokens, _ = tokenize(",")
        assert tokens[0].type == TokenType.COMMA

    def test_at_sign(self):
        """'@' should be tokenized as AT_SIGN."""
        tokens, _ = tokenize("@")
        assert tokens[0].type == TokenType.AT_SIGN

    def test_equals(self):
        """'=' should be tokenized as EQUALS."""
        tokens, _ = tokenize("=")
        assert tokens[0].type == TokenType.EQUALS


class TestUUID:
    """Test UUID tokenization."""

    def test_valid_uuid(self):
        """Valid UUID should be tokenized as UUID."""
        uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        tokens, _ = tokenize(uuid)
        assert tokens[0].type == TokenType.UUID
        assert tokens[0].value == uuid.lower()

    def test_uuid_case_insensitive(self):
        """UUID should be case insensitive."""
        uuid_upper = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890"
        tokens, _ = tokenize(uuid_upper)
        assert tokens[0].type == TokenType.UUID
        assert tokens[0].value == uuid_upper.lower()


class TestStrings:
    """Test string tokenization."""

    def test_double_quoted_string(self):
        """Double-quoted string should be tokenized as STRING."""
        tokens, _ = tokenize('"hello world"')
        assert tokens[0].type == TokenType.STRING
        assert tokens[0].value == "hello world"

    def test_single_quoted_string(self):
        """Single-quoted string should be tokenized as STRING."""
        tokens, _ = tokenize("'hello world'")
        assert tokens[0].type == TokenType.STRING
        assert tokens[0].value == "hello world"


class TestCompleteCommands:
    """Test tokenization of complete DSL commands."""

    def test_simple_wall_command(self):
        """Simple wall command should tokenize correctly."""
        tokens, errors = tokenize("wall (0, 0) (5, 0)")
        types = [t.type for t in tokens if t.type != TokenType.EOF]

        assert TokenType.WALL in types
        assert TokenType.LPAREN in types
        assert TokenType.RPAREN in types
        assert TokenType.COMMA in types
        assert TokenType.INTEGER in types or TokenType.FLOAT in types
        assert len(errors) == 0

    def test_wall_with_options(self):
        """Wall with options should tokenize correctly."""
        tokens, errors = tokenize("wall (0, 0) (5, 0) height 3 thickness 0.2")
        types = [t.type for t in tokens if t.type != TokenType.EOF]

        assert TokenType.WALL in types
        assert TokenType.HEIGHT in types
        assert TokenType.THICKNESS in types
        assert len(errors) == 0

    def test_wall_with_short_options(self):
        """Wall with short options should tokenize correctly."""
        tokens, errors = tokenize("wall (0, 0) (5, 0) -h 3 -t 0.2")
        types = [t.type for t in tokens if t.type != TokenType.EOF]

        assert TokenType.WALL in types
        assert TokenType.OPT_H in types
        assert TokenType.OPT_T in types
        assert len(errors) == 0

    def test_wall_with_long_options(self):
        """Wall with long options should tokenize correctly."""
        tokens, errors = tokenize("wall (0, 0) (5, 0) --height=3 --thickness=0.2")
        types = [t.type for t in tokens if t.type != TokenType.EOF]

        assert TokenType.WALL in types
        assert TokenType.LONG_HEIGHT in types
        assert TokenType.LONG_THICKNESS in types
        assert len(errors) == 0

    def test_door_in_wall(self):
        """Door placement command should tokenize correctly."""
        tokens, errors = tokenize("door in $last at 2.5 width 0.9 type single")
        types = [t.type for t in tokens if t.type != TokenType.EOF]

        assert TokenType.DOOR in types
        assert TokenType.IN in types
        assert TokenType.VAR_LAST in types
        assert TokenType.AT in types
        assert TokenType.WIDTH in types
        assert TokenType.TYPE in types
        assert TokenType.SINGLE in types
        assert len(errors) == 0

    def test_window_with_sill(self):
        """Window with sill height should tokenize correctly."""
        tokens, errors = tokenize("window in $last at 1 width 1.2 height 1.0 sill 0.9")
        types = [t.type for t in tokens if t.type != TokenType.EOF]

        assert TokenType.WINDOW in types
        assert TokenType.SILL in types
        assert len(errors) == 0

    def test_door_with_at_shorthand(self):
        """Door with @ shorthand should tokenize correctly."""
        tokens, errors = tokenize("door $last @2.5")
        types = [t.type for t in tokens if t.type != TokenType.EOF]

        assert TokenType.DOOR in types
        assert TokenType.VAR_LAST in types
        assert TokenType.AT_SIGN in types
        assert len(errors) == 0

    def test_wall_with_units(self):
        """Wall with unit suffixes should tokenize correctly."""
        tokens, errors = tokenize("wall (0mm, 0mm) (5000mm, 0mm) height 3000mm")
        types = [t.type for t in tokens if t.type != TokenType.EOF]

        assert TokenType.WALL in types
        assert TokenType.HEIGHT in types
        assert len(errors) == 0

        # Check unit conversion
        numbers = [t for t in tokens if t.type in (TokenType.INTEGER, TokenType.FLOAT)]
        # 5000mm should be 5.0m
        assert any(abs(n.value - 5.0) < 0.001 for n in numbers)
        # 3000mm should be 3.0m
        assert any(abs(n.value - 3.0) < 0.001 for n in numbers)

    def test_rectangular_walls(self):
        """Rectangular walls command should tokenize correctly."""
        tokens, errors = tokenize("walls rect (0, 0) (10, 8) height 2.7")
        types = [t.type for t in tokens if t.type != TokenType.EOF]

        assert TokenType.WALLS in types
        assert TokenType.RECT in types
        assert TokenType.HEIGHT in types
        assert len(errors) == 0

    def test_wall_from_to_syntax(self):
        """Wall with from/to syntax should tokenize correctly."""
        tokens, errors = tokenize("wall from (0, 0) to (5, 0)")
        types = [t.type for t in tokens if t.type != TokenType.EOF]

        assert TokenType.WALL in types
        assert TokenType.FROM in types
        assert TokenType.TO in types
        assert len(errors) == 0


class TestLineAndColumn:
    """Test that line and column numbers are tracked correctly."""

    def test_first_token_position(self):
        """First token should be at line 1, column 1."""
        tokens, _ = tokenize("wall")
        assert tokens[0].line == 1
        assert tokens[0].column == 1

    def test_second_line_position(self):
        """Token after newline should be at line 2."""
        tokens, _ = tokenize("wall\ndoor")
        door_token = next(t for t in tokens if t.type == TokenType.DOOR)
        assert door_token.line == 2

    def test_column_after_whitespace(self):
        """Column should account for whitespace."""
        tokens, _ = tokenize("    wall")
        assert tokens[0].column == 5


class TestErrorRecovery:
    """Test error handling and recovery."""

    def test_unknown_character_error(self):
        """Unknown characters should produce errors."""
        tokens, errors = tokenize("wall ^ door")
        assert len(errors) > 0
        assert "Unexpected character" in errors[0].message

    def test_continues_after_error(self):
        """Lexer should continue after encountering an error."""
        tokens, errors = tokenize("wall ^ door")
        types = [t.type for t in tokens if t.type != TokenType.EOF]

        # Should still have wall and door tokens
        assert TokenType.WALL in types
        assert TokenType.DOOR in types


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
