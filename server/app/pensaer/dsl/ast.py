"""Abstract Syntax Tree nodes for the Pensaer DSL.

This module defines all AST node types that represent parsed DSL commands.
Each node type corresponds to a grammar rule and can be executed against
the MCP tool servers.
"""

from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any


# =============================================================================
# Enums for typed values
# =============================================================================


class WallType(Enum):
    """Wall construction types."""

    BASIC = "basic"
    STRUCTURAL = "structural"
    CURTAIN = "curtain"
    RETAINING = "retaining"


class DoorType(Enum):
    """Door types."""

    SINGLE = "single"
    DOUBLE = "double"
    SLIDING = "sliding"
    FOLDING = "folding"
    REVOLVING = "revolving"
    POCKET = "pocket"


class WindowType(Enum):
    """Window types."""

    FIXED = "fixed"
    CASEMENT = "casement"
    DOUBLE_HUNG = "double_hung"
    SLIDING = "sliding"
    AWNING = "awning"
    HOPPER = "hopper"
    PIVOT = "pivot"


class SwingDirection(Enum):
    """Door swing directions."""

    LEFT = "left"
    RIGHT = "right"
    BOTH = "both"
    NONE = "none"


class VariableRef(Enum):
    """Variable references for element selection."""

    LAST = "$last"
    SELECTED = "$selected"
    WALL = "$wall"


# =============================================================================
# Coordinate Types
# =============================================================================


@dataclass(frozen=True, slots=True)
class Point2D:
    """2D point in model space (meters)."""

    x: float
    y: float

    def as_tuple(self) -> tuple[float, float]:
        return (self.x, self.y)


@dataclass(frozen=True, slots=True)
class Point3D:
    """3D point in model space (meters)."""

    x: float
    y: float
    z: float

    def as_tuple(self) -> tuple[float, float, float]:
        return (self.x, self.y, self.z)


# =============================================================================
# Element References
# =============================================================================


@dataclass(frozen=True, slots=True)
class ElementRef:
    """Reference to an element by UUID or variable.

    Either uuid or variable will be set, not both.
    """

    uuid: str | None = None
    variable: VariableRef | None = None

    def __post_init__(self) -> None:
        if self.uuid is None and self.variable is None:
            raise ValueError("ElementRef must have either uuid or variable")
        if self.uuid is not None and self.variable is not None:
            raise ValueError("ElementRef cannot have both uuid and variable")

    @classmethod
    def from_uuid(cls, uuid: str) -> "ElementRef":
        return cls(uuid=uuid)

    @classmethod
    def from_variable(cls, var: VariableRef) -> "ElementRef":
        return cls(variable=var)

    def is_variable(self) -> bool:
        return self.variable is not None


# =============================================================================
# Base Command
# =============================================================================


@dataclass(kw_only=True)
class Command:
    """Base class for all DSL commands."""

    line: int = 0
    column: int = 0

    def to_mcp_args(self) -> dict[str, Any]:
        """Convert command to MCP tool arguments."""
        raise NotImplementedError


# =============================================================================
# Wall Commands
# =============================================================================


@dataclass
class CreateWallCommand(Command):
    """Create a single wall segment.

    Maps to: geometry-server/create_wall
    """

    start: Point2D
    end: Point2D
    height: float = 3.0
    thickness: float = 0.2
    wall_type: WallType | None = None
    level_id: str | None = None

    def to_mcp_args(self) -> dict[str, Any]:
        args: dict[str, Any] = {
            "start": self.start.as_tuple(),
            "end": self.end.as_tuple(),
            "height": self.height,
            "thickness": self.thickness,
        }
        if self.wall_type:
            args["wall_type"] = self.wall_type.value
        if self.level_id:
            args["level_id"] = self.level_id
        return args


@dataclass
class CreateRectWallsCommand(Command):
    """Create 4 walls forming a rectangle.

    Maps to: geometry-server/create_rectangular_walls
    """

    min_point: Point2D
    max_point: Point2D
    height: float = 3.0
    thickness: float = 0.2

    def to_mcp_args(self) -> dict[str, Any]:
        return {
            "min_point": self.min_point.as_tuple(),
            "max_point": self.max_point.as_tuple(),
            "height": self.height,
            "thickness": self.thickness,
        }


@dataclass
class ModifyWallCommand(Command):
    """Modify an existing wall's property.

    Maps to: geometry-server/modify_parameter
    """

    wall_id: str
    property_name: str
    value: float | str

    def to_mcp_args(self) -> dict[str, Any]:
        return {
            "element_id": self.wall_id,
            "parameter_name": self.property_name,
            "value": self.value,
        }


# =============================================================================
# Door Commands
# =============================================================================


@dataclass
class PlaceDoorCommand(Command):
    """Place a door in a wall.

    Maps to: geometry-server/place_door
    """

    wall_ref: ElementRef
    offset: float
    width: float = 0.9
    height: float = 2.1
    door_type: DoorType | None = None
    swing: SwingDirection | None = None

    def to_mcp_args(self) -> dict[str, Any]:
        args: dict[str, Any] = {
            "offset": self.offset,
            "width": self.width,
            "height": self.height,
        }
        # wall_id will be resolved at execution time if it's a variable
        if self.wall_ref.uuid:
            args["wall_id"] = self.wall_ref.uuid
        if self.door_type:
            args["door_type"] = self.door_type.value
        if self.swing:
            args["swing"] = self.swing.value
        return args


@dataclass
class ModifyDoorCommand(Command):
    """Modify an existing door's property.

    Maps to: geometry-server/modify_parameter
    """

    door_id: str
    property_name: str
    value: float | str

    def to_mcp_args(self) -> dict[str, Any]:
        return {
            "element_id": self.door_id,
            "parameter_name": self.property_name,
            "value": self.value,
        }


# =============================================================================
# Window Commands
# =============================================================================


@dataclass
class PlaceWindowCommand(Command):
    """Place a window in a wall.

    Maps to: geometry-server/place_window
    """

    wall_ref: ElementRef
    offset: float
    width: float = 1.2
    height: float = 1.0
    sill_height: float = 0.9
    window_type: WindowType | None = None

    def to_mcp_args(self) -> dict[str, Any]:
        args: dict[str, Any] = {
            "offset": self.offset,
            "width": self.width,
            "height": self.height,
            "sill_height": self.sill_height,
        }
        if self.wall_ref.uuid:
            args["wall_id"] = self.wall_ref.uuid
        if self.window_type:
            args["window_type"] = self.window_type.value
        return args


@dataclass
class ModifyWindowCommand(Command):
    """Modify an existing window's property.

    Maps to: geometry-server/modify_parameter
    """

    window_id: str
    property_name: str
    value: float | str

    def to_mcp_args(self) -> dict[str, Any]:
        return {
            "element_id": self.window_id,
            "parameter_name": self.property_name,
            "value": self.value,
        }


# =============================================================================
# Opening Command
# =============================================================================


@dataclass
class CreateOpeningCommand(Command):
    """Create a generic opening in a wall.

    Maps to: geometry-server/create_opening
    """

    wall_ref: ElementRef
    offset: float
    width: float
    height: float
    base_height: float = 0.0

    def to_mcp_args(self) -> dict[str, Any]:
        args: dict[str, Any] = {
            "offset": self.offset,
            "width": self.width,
            "height": self.height,
            "base_height": self.base_height,
            "opening_type": "generic",
        }
        if self.wall_ref.uuid:
            args["host_id"] = self.wall_ref.uuid
        return args


# =============================================================================
# Help Command
# =============================================================================


@dataclass
class HelpCommand(Command):
    """Display help information.

    Not an MCP command - handled locally.
    """

    topic: str | None = None

    def to_mcp_args(self) -> dict[str, Any]:
        return {"topic": self.topic}


# =============================================================================
# Parse Result
# =============================================================================


@dataclass
class ParseError:
    """Error encountered during parsing."""

    message: str
    line: int
    column: int
    token_value: str | None = None

    def __str__(self) -> str:
        loc = f"{self.line}:{self.column}"
        if self.token_value:
            return f"Parse error at {loc} near '{self.token_value}': {self.message}"
        return f"Parse error at {loc}: {self.message}"


@dataclass
class ParseResult:
    """Result of parsing a DSL input.

    Contains either a list of commands or a list of errors.
    """

    commands: list[Command] = field(default_factory=list)
    errors: list[ParseError] = field(default_factory=list)

    @property
    def success(self) -> bool:
        return len(self.errors) == 0

    def add_command(self, cmd: Command) -> None:
        self.commands.append(cmd)

    def add_error(self, error: ParseError) -> None:
        self.errors.append(error)
