"""Tests for the Pensaer DSL parser.

These tests verify that:
1. All command types are parsed correctly
2. Options are extracted properly
3. Error handling works for invalid input
4. AST nodes contain correct values
5. MCP argument generation works
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from pensaer.dsl.parser import Parser, parse
from pensaer.dsl.ast import (
    CreateWallCommand,
    CreateRectWallsCommand,
    ModifyWallCommand,
    PlaceDoorCommand,
    ModifyDoorCommand,
    PlaceWindowCommand,
    ModifyWindowCommand,
    CreateOpeningCommand,
    HelpCommand,
    Point2D,
    ElementRef,
    VariableRef,
    WallType,
    DoorType,
    WindowType,
    SwingDirection,
)


class TestParserBasics:
    """Test basic parser functionality."""

    def test_empty_input(self):
        """Empty input should produce no commands and no errors."""
        result = parse("")
        assert result.success
        assert len(result.commands) == 0

    def test_whitespace_only(self):
        """Whitespace-only input should produce no commands."""
        result = parse("   \n\n   ")
        assert result.success
        assert len(result.commands) == 0

    def test_multiple_commands(self):
        """Multiple commands separated by newlines."""
        result = parse("wall (0, 0) (5, 0)\nwall (0, 0) (0, 5)")
        assert result.success
        assert len(result.commands) == 2
        assert all(isinstance(cmd, CreateWallCommand) for cmd in result.commands)


class TestWallCommands:
    """Test wall command parsing."""

    def test_simple_wall(self):
        """Parse simple wall command."""
        result = parse("wall (0, 0) (5, 0)")
        assert result.success
        assert len(result.commands) == 1

        cmd = result.commands[0]
        assert isinstance(cmd, CreateWallCommand)
        assert cmd.start == Point2D(0, 0)
        assert cmd.end == Point2D(5, 0)
        assert cmd.height == 3.0  # default
        assert cmd.thickness == 0.2  # default

    def test_wall_with_from_to(self):
        """Parse wall with from/to keywords."""
        result = parse("wall from (0, 0) to (5, 0)")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateWallCommand)
        assert cmd.start == Point2D(0, 0)
        assert cmd.end == Point2D(5, 0)

    def test_wall_with_height(self):
        """Parse wall with height option."""
        result = parse("wall (0, 0) (5, 0) height 2.5")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateWallCommand)
        assert cmd.height == pytest.approx(2.5)

    def test_wall_with_thickness(self):
        """Parse wall with thickness option."""
        result = parse("wall (0, 0) (5, 0) thickness 0.3")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateWallCommand)
        assert cmd.thickness == pytest.approx(0.3)

    def test_wall_with_short_options(self):
        """Parse wall with short options."""
        result = parse("wall (0, 0) (5, 0) -h 2.8 -t 0.15")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateWallCommand)
        assert cmd.height == pytest.approx(2.8)
        assert cmd.thickness == pytest.approx(0.15)

    def test_wall_with_long_options(self):
        """Parse wall with long options."""
        result = parse("wall (0, 0) (5, 0) --height 2.8 --thickness 0.15")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateWallCommand)
        assert cmd.height == pytest.approx(2.8)
        assert cmd.thickness == pytest.approx(0.15)

    def test_wall_with_type(self):
        """Parse wall with type option."""
        result = parse("wall (0, 0) (5, 0) type structural")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateWallCommand)
        assert cmd.wall_type == WallType.STRUCTURAL

    def test_wall_with_level(self):
        """Parse wall with level option."""
        result = parse(
            "wall (0, 0) (5, 0) level a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        )
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateWallCommand)
        assert cmd.level_id == "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

    def test_wall_all_options(self):
        """Parse wall with all options."""
        result = parse(
            "wall (0, 0) (5, 0) height 3.5 thickness 0.25 type structural"
        )
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateWallCommand)
        assert cmd.height == pytest.approx(3.5)
        assert cmd.thickness == pytest.approx(0.25)
        assert cmd.wall_type == WallType.STRUCTURAL

    def test_create_wall_prefix(self):
        """Parse create wall command."""
        result = parse("create wall (0, 0) (5, 0)")
        assert result.success
        assert isinstance(result.commands[0], CreateWallCommand)

    def test_wall_space_separated_coords(self):
        """Parse wall with space-separated coordinates."""
        result = parse("wall 0 0 5 0")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateWallCommand)
        assert cmd.start == Point2D(0, 0)
        assert cmd.end == Point2D(5, 0)


class TestRectWallsCommands:
    """Test rectangular walls command parsing."""

    def test_walls_rect(self):
        """Parse walls rect command."""
        result = parse("walls rect (0, 0) (10, 8)")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateRectWallsCommand)
        assert cmd.min_point == Point2D(0, 0)
        assert cmd.max_point == Point2D(10, 8)

    def test_walls_rectangle(self):
        """Parse walls rectangle command."""
        result = parse("walls rectangle (0, 0) (10, 8)")
        assert result.success
        assert isinstance(result.commands[0], CreateRectWallsCommand)

    def test_rect_walls(self):
        """Parse rect walls command."""
        result = parse("rect walls (0, 0) (10, 8)")
        assert result.success
        assert isinstance(result.commands[0], CreateRectWallsCommand)

    def test_box_command(self):
        """Parse box command."""
        result = parse("box (0, 0) (10, 8)")
        assert result.success
        assert isinstance(result.commands[0], CreateRectWallsCommand)

    def test_rect_walls_with_options(self):
        """Parse rect walls with options."""
        result = parse("walls rect (0, 0) (10, 8) height 2.7 thickness 0.3")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateRectWallsCommand)
        assert cmd.height == pytest.approx(2.7)
        assert cmd.thickness == pytest.approx(0.3)


class TestModifyWallCommands:
    """Test modify wall command parsing."""

    def test_modify_wall_height(self):
        """Parse wall modify command."""
        result = parse("wall a1b2c3d4-e5f6-7890-abcd-ef1234567890 set height 3.5")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, ModifyWallCommand)
        assert cmd.wall_id == "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        assert cmd.property_name == "height"
        assert cmd.value == pytest.approx(3.5)

    def test_modify_wall_type(self):
        """Parse wall modify type command."""
        result = parse("wall a1b2c3d4-e5f6-7890-abcd-ef1234567890 set type structural")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, ModifyWallCommand)
        assert cmd.property_name == "type"
        assert cmd.value == "structural"

    def test_modify_wall_prefix(self):
        """Parse modify wall command with prefix."""
        result = parse(
            "modify wall a1b2c3d4-e5f6-7890-abcd-ef1234567890 set height 3.5"
        )
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, ModifyWallCommand)


class TestDoorCommands:
    """Test door command parsing."""

    def test_door_in_wall_at(self):
        """Parse door in wall at offset."""
        result = parse("door in $last at 2.5")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceDoorCommand)
        assert cmd.wall_ref.variable == VariableRef.LAST
        assert cmd.offset == pytest.approx(2.5)

    def test_door_with_uuid(self):
        """Parse door with UUID reference."""
        result = parse("door in a1b2c3d4-e5f6-7890-abcd-ef1234567890 at 2.5")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceDoorCommand)
        assert cmd.wall_ref.uuid == "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

    def test_door_at_shorthand(self):
        """Parse door with @ shorthand."""
        result = parse("door $last @2.5")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceDoorCommand)
        assert cmd.offset == pytest.approx(2.5)

    def test_door_with_dimensions(self):
        """Parse door with width and height."""
        result = parse("door in $last at 2.5 width 1.0 height 2.2")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceDoorCommand)
        assert cmd.width == pytest.approx(1.0)
        assert cmd.height == pytest.approx(2.2)

    def test_door_with_type(self):
        """Parse door with type."""
        result = parse("door in $last at 2.5 type double")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceDoorCommand)
        assert cmd.door_type == DoorType.DOUBLE

    def test_door_with_swing(self):
        """Parse door with swing direction."""
        result = parse("door in $last at 2.5 swing right")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceDoorCommand)
        assert cmd.swing == SwingDirection.RIGHT

    def test_door_all_options(self):
        """Parse door with all options."""
        result = parse(
            "door in $last at 2.5 width 1.8 height 2.2 type double swing both"
        )
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceDoorCommand)
        assert cmd.width == pytest.approx(1.8)
        assert cmd.height == pytest.approx(2.2)
        assert cmd.door_type == DoorType.DOUBLE
        assert cmd.swing == SwingDirection.BOTH

    def test_place_door_prefix(self):
        """Parse place door command."""
        result = parse("place door in $last at 2.5")
        assert result.success
        assert isinstance(result.commands[0], PlaceDoorCommand)

    def test_add_door_prefix(self):
        """Parse add door command."""
        result = parse("add door in $last at 2.5")
        assert result.success
        assert isinstance(result.commands[0], PlaceDoorCommand)

    def test_door_var_selected(self):
        """Parse door with $selected variable."""
        result = parse("door in $selected at 2.5")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceDoorCommand)
        assert cmd.wall_ref.variable == VariableRef.SELECTED

    def test_door_var_wall(self):
        """Parse door with $wall variable."""
        result = parse("door in $wall at 2.5")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceDoorCommand)
        assert cmd.wall_ref.variable == VariableRef.WALL


class TestModifyDoorCommands:
    """Test modify door command parsing."""

    def test_modify_door(self):
        """Parse door modify command."""
        result = parse("door a1b2c3d4-e5f6-7890-abcd-ef1234567890 set width 1.0")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, ModifyDoorCommand)
        assert cmd.door_id == "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        assert cmd.property_name == "width"


class TestWindowCommands:
    """Test window command parsing."""

    def test_window_basic(self):
        """Parse basic window command."""
        result = parse("window in $last at 1")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceWindowCommand)
        assert cmd.wall_ref.variable == VariableRef.LAST
        assert cmd.offset == pytest.approx(1.0)

    def test_window_with_dimensions(self):
        """Parse window with dimensions."""
        result = parse("window in $last at 1 width 1.5 height 1.2")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceWindowCommand)
        assert cmd.width == pytest.approx(1.5)
        assert cmd.height == pytest.approx(1.2)

    def test_window_with_sill(self):
        """Parse window with sill height."""
        result = parse("window in $last at 1 sill 0.8")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceWindowCommand)
        assert cmd.sill_height == pytest.approx(0.8)

    def test_window_with_type(self):
        """Parse window with type."""
        result = parse("window in $last at 1 type casement")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceWindowCommand)
        assert cmd.window_type == WindowType.CASEMENT

    def test_window_all_options(self):
        """Parse window with all options."""
        result = parse(
            "window in $last at 1 width 1.5 height 1.2 sill 0.8 type sliding"
        )
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceWindowCommand)
        assert cmd.width == pytest.approx(1.5)
        assert cmd.height == pytest.approx(1.2)
        assert cmd.sill_height == pytest.approx(0.8)
        assert cmd.window_type == WindowType.SLIDING

    def test_window_at_shorthand(self):
        """Parse window with @ shorthand."""
        result = parse("window $last @1.5")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceWindowCommand)
        assert cmd.offset == pytest.approx(1.5)

    def test_place_window_prefix(self):
        """Parse place window command."""
        result = parse("place window in $last at 1")
        assert result.success
        assert isinstance(result.commands[0], PlaceWindowCommand)


class TestModifyWindowCommands:
    """Test modify window command parsing."""

    def test_modify_window(self):
        """Parse window modify command."""
        result = parse("window a1b2c3d4-e5f6-7890-abcd-ef1234567890 set sill 1.0")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, ModifyWindowCommand)


class TestOpeningCommands:
    """Test opening command parsing."""

    def test_opening_basic(self):
        """Parse basic opening command."""
        result = parse("opening $last at 2 1.5 x 2.0")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateOpeningCommand)
        assert cmd.offset == pytest.approx(2.0)
        assert cmd.width == pytest.approx(1.5)
        assert cmd.height == pytest.approx(2.0)

    def test_opening_by_syntax(self):
        """Parse opening with 'by' syntax."""
        result = parse("opening $last at 2 1.5 by 2.0")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateOpeningCommand)
        assert cmd.width == pytest.approx(1.5)
        assert cmd.height == pytest.approx(2.0)

    def test_opening_width_height_syntax(self):
        """Parse opening with width/height keywords."""
        result = parse("opening $last at 2 width 1.5 height 2.0")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateOpeningCommand)
        assert cmd.width == pytest.approx(1.5)
        assert cmd.height == pytest.approx(2.0)

    def test_create_opening_prefix(self):
        """Parse create opening command."""
        result = parse("create opening $last at 2 1.5 x 2.0")
        assert result.success
        assert isinstance(result.commands[0], CreateOpeningCommand)


class TestHelpCommand:
    """Test help command parsing."""

    def test_help_no_topic(self):
        """Parse help without topic."""
        result = parse("help")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, HelpCommand)
        assert cmd.topic is None

    def test_help_with_topic(self):
        """Parse help with topic."""
        result = parse("help wall")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, HelpCommand)
        assert cmd.topic == "wall"


class TestMCPArgGeneration:
    """Test MCP argument generation from AST nodes."""

    def test_wall_to_mcp_args(self):
        """Test CreateWallCommand.to_mcp_args()."""
        result = parse("wall (0, 0) (5, 3) height 2.5 type structural")
        cmd = result.commands[0]
        assert isinstance(cmd, CreateWallCommand)

        args = cmd.to_mcp_args()
        assert args["start"] == (0.0, 0.0)
        assert args["end"] == (5.0, 3.0)
        assert args["height"] == 2.5
        assert args["wall_type"] == "structural"

    def test_door_to_mcp_args(self):
        """Test PlaceDoorCommand.to_mcp_args()."""
        result = parse(
            "door in a1b2c3d4-e5f6-7890-abcd-ef1234567890 at 2.5 type double swing both"
        )
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceDoorCommand)

        args = cmd.to_mcp_args()
        assert args["wall_id"] == "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        assert args["offset"] == 2.5
        assert args["door_type"] == "double"
        assert args["swing"] == "both"

    def test_window_to_mcp_args(self):
        """Test PlaceWindowCommand.to_mcp_args()."""
        result = parse(
            "window in a1b2c3d4-e5f6-7890-abcd-ef1234567890 at 1 sill 0.8 type casement"
        )
        cmd = result.commands[0]
        assert isinstance(cmd, PlaceWindowCommand)

        args = cmd.to_mcp_args()
        assert args["wall_id"] == "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        assert args["sill_height"] == 0.8
        assert args["window_type"] == "casement"


class TestErrorHandling:
    """Test parser error handling."""

    def test_missing_end_point(self):
        """Error on missing end point."""
        result = parse("wall (0, 0)")
        assert not result.success
        assert len(result.errors) > 0

    def test_invalid_token(self):
        """Error on unexpected token."""
        result = parse("foobar (0, 0) (5, 0)")
        assert not result.success
        assert len(result.errors) > 0

    def test_continues_after_error(self):
        """Parser continues after error."""
        result = parse("invalid\nwall (0, 0) (5, 0)")
        # Should have error but also parse the valid command
        assert len(result.errors) > 0
        assert len(result.commands) >= 1


class TestUnitConversion:
    """Test that unit conversion from lexer flows through parser."""

    def test_wall_with_mm(self):
        """Parse wall with millimeter units."""
        result = parse("wall (0mm, 0mm) (5000mm, 0mm) height 3000mm")
        assert result.success
        cmd = result.commands[0]
        assert isinstance(cmd, CreateWallCommand)
        # 5000mm = 5m
        assert cmd.end.x == pytest.approx(5.0)
        # 3000mm = 3m
        assert cmd.height == pytest.approx(3.0)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
