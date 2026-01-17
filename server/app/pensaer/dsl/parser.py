"""Recursive descent parser for the Pensaer DSL.

Parses token streams into AST nodes for execution against MCP tools.
Supports wall, door, window, and opening commands with full option parsing.
"""

from dataclasses import dataclass, field

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
    SwingDirection,
    VariableRef,
    WallType,
    WindowType,
)
from .lexer import Lexer, tokenize
from .tokens import Token, TokenType


@dataclass
class Parser:
    """Recursive descent parser for the Pensaer DSL.

    Example:
        parser = Parser("wall (0, 0) (5, 0) height 3")
        result = parser.parse()
        if result.success:
            for cmd in result.commands:
                print(cmd)
    """

    source: str
    tokens: list[Token] = field(default_factory=list)
    pos: int = 0
    result: ParseResult = field(default_factory=ParseResult)

    def __post_init__(self) -> None:
        tokens, lex_errors = tokenize(self.source)
        self.tokens = tokens
        # Convert lexer errors to parse errors
        for err in lex_errors:
            self.result.add_error(
                ParseError(
                    message=err.message,
                    line=err.line,
                    column=err.column,
                    token_value=err.raw,
                )
            )

    @property
    def current(self) -> Token:
        """Get current token."""
        if self.pos >= len(self.tokens):
            return self.tokens[-1]  # Return EOF
        return self.tokens[self.pos]

    @property
    def current_type(self) -> TokenType:
        """Get current token type."""
        return self.current.type

    def peek(self, offset: int = 1) -> Token:
        """Peek at token at offset from current position."""
        pos = self.pos + offset
        if pos >= len(self.tokens):
            return self.tokens[-1]
        return self.tokens[pos]

    def advance(self) -> Token:
        """Consume and return current token."""
        token = self.current
        if self.pos < len(self.tokens) - 1:
            self.pos += 1
        return token

    def match(self, *types: TokenType) -> bool:
        """Check if current token matches any of the given types."""
        return self.current_type in types

    def expect(self, token_type: TokenType, message: str | None = None) -> Token:
        """Consume token of expected type or add error."""
        if self.current_type == token_type:
            return self.advance()
        msg = message or f"Expected {token_type.name}, got {self.current_type.name}"
        self.error(msg)
        return self.current

    def error(self, message: str) -> None:
        """Add a parse error at current position."""
        token = self.current
        self.result.add_error(
            ParseError(
                message=message,
                line=token.line,
                column=token.column,
                token_value=str(token.value) if token.value else None,
            )
        )

    def skip_newlines(self) -> None:
        """Skip any newline tokens."""
        while self.match(TokenType.NEWLINE):
            self.advance()

    def parse(self) -> ParseResult:
        """Parse the entire input and return result."""
        self.skip_newlines()

        while not self.match(TokenType.EOF):
            cmd = self.parse_command()
            if cmd:
                self.result.add_command(cmd)
            self.skip_newlines()

        return self.result

    def parse_command(self) -> Command | None:
        """Parse a single command."""
        # Skip newlines between commands
        self.skip_newlines()

        if self.match(TokenType.EOF):
            return None

        # Determine command type based on first token(s)
        if self.match(TokenType.WALL):
            return self.parse_wall_command()
        elif self.match(TokenType.WALLS):
            return self.parse_walls_command()
        elif self.match(TokenType.DOOR):
            return self.parse_door_command()
        elif self.match(TokenType.WINDOW):
            return self.parse_window_command()
        elif self.match(TokenType.OPENING):
            return self.parse_opening_command()
        elif self.match(TokenType.CREATE):
            return self.parse_create_command()
        elif self.match(TokenType.PLACE):
            return self.parse_place_command()
        elif self.match(TokenType.ADD):
            return self.parse_add_command()
        elif self.match(TokenType.MODIFY):
            return self.parse_modify_command()
        elif self.match(TokenType.BOX):
            return self.parse_box_command()
        elif self.match(TokenType.RECT):
            return self.parse_rect_walls_command()
        elif self.match(TokenType.HELP):
            return self.parse_help_command()
        else:
            self.error(f"Unexpected token: {self.current_type.name}")
            self.advance()
            return None

    # =========================================================================
    # Wall Commands
    # =========================================================================

    def parse_wall_command(self) -> Command | None:
        """Parse: wall ... or wall <uuid> set ..."""
        start_token = self.advance()  # consume 'wall'

        # Check if this is modify command: wall <uuid> set ...
        if self.match(TokenType.UUID):
            uuid_token = self.advance()
            if self.match(TokenType.SET):
                return self.parse_modify_wall_rest(uuid_token.value, start_token)

        # Otherwise it's create wall
        return self.parse_create_wall_rest(start_token)

    def parse_create_wall_rest(self, start_token: Token) -> CreateWallCommand | None:
        """Parse rest of create wall command after 'wall' keyword."""
        # Parse start point (with optional 'from' keyword)
        if self.match(TokenType.FROM):
            self.advance()

        start = self.parse_point2d()
        if start is None:
            self.error("Expected start point")
            return None

        # Parse end point (with optional 'to' keyword)
        if self.match(TokenType.TO):
            self.advance()

        end = self.parse_point2d()
        if end is None:
            self.error("Expected end point")
            return None

        # Parse options
        height = 3.0
        thickness = 0.2
        wall_type: WallType | None = None
        level_id: str | None = None

        while self.is_wall_option():
            opt_name, opt_value = self.parse_wall_option()
            if opt_name == "height":
                height = float(opt_value)
            elif opt_name == "thickness":
                thickness = float(opt_value)
            elif opt_name == "type":
                wall_type = self.parse_wall_type_value(opt_value)
            elif opt_name == "level":
                level_id = str(opt_value)

        return CreateWallCommand(
            start=start,
            end=end,
            height=height,
            thickness=thickness,
            wall_type=wall_type,
            level_id=level_id,
            line=start_token.line,
            column=start_token.column,
        )

    def parse_walls_command(self) -> Command | None:
        """Parse: walls rect ..."""
        start_token = self.advance()  # consume 'walls'

        if self.match(TokenType.RECT, TokenType.RECTANGLE):
            self.advance()
            return self.parse_rect_walls_rest(start_token)

        self.error("Expected 'rect' or 'rectangle' after 'walls'")
        return None

    def parse_rect_walls_rest(self, start_token: Token) -> CreateRectWallsCommand | None:
        """Parse rest of rectangular walls command."""
        min_point = self.parse_point2d()
        if min_point is None:
            self.error("Expected min point")
            return None

        max_point = self.parse_point2d()
        if max_point is None:
            self.error("Expected max point")
            return None

        # Parse options
        height = 3.0
        thickness = 0.2

        while self.is_wall_option():
            opt_name, opt_value = self.parse_wall_option()
            if opt_name == "height":
                height = float(opt_value)
            elif opt_name == "thickness":
                thickness = float(opt_value)

        return CreateRectWallsCommand(
            min_point=min_point,
            max_point=max_point,
            height=height,
            thickness=thickness,
            line=start_token.line,
            column=start_token.column,
        )

    def parse_box_command(self) -> CreateRectWallsCommand | None:
        """Parse: box <min> <max> [options]"""
        start_token = self.advance()  # consume 'box'
        return self.parse_rect_walls_rest(start_token)

    def parse_rect_walls_command(self) -> CreateRectWallsCommand | None:
        """Parse: rect walls <min> <max> [options]"""
        start_token = self.advance()  # consume 'rect'
        if self.match(TokenType.WALLS):
            self.advance()
        return self.parse_rect_walls_rest(start_token)

    def parse_modify_wall_rest(self, wall_id: str, start_token: Token) -> ModifyWallCommand:
        """Parse rest of modify wall command after wall <uuid>."""
        self.advance()  # consume 'set'

        prop_name = self.parse_property_name()
        value = self.parse_dimension_or_type()

        return ModifyWallCommand(
            wall_id=wall_id,
            property_name=prop_name,
            value=value,
            line=start_token.line,
            column=start_token.column,
        )

    # =========================================================================
    # Door Commands
    # =========================================================================

    def parse_door_command(self) -> Command | None:
        """Parse: door ... or door <uuid> set ..."""
        start_token = self.advance()  # consume 'door'

        # Check if modify command: door <uuid> set
        if self.match(TokenType.UUID):
            uuid_token = self.advance()
            if self.match(TokenType.SET):
                return self.parse_modify_door_rest(uuid_token.value, start_token)
            # Otherwise treat UUID as wall ref for place door
            self.pos -= 1  # back up

        return self.parse_place_door_rest(start_token)

    def parse_place_door_rest(self, start_token: Token) -> PlaceDoorCommand | None:
        """Parse rest of place door command."""
        # Parse location: [in] <wall-ref> [at|@] <offset>
        if self.match(TokenType.IN):
            self.advance()

        wall_ref = self.parse_element_ref()
        if wall_ref is None:
            self.error("Expected wall reference")
            return None

        # Parse offset
        if self.match(TokenType.AT):
            self.advance()
        elif self.match(TokenType.AT_SIGN):
            self.advance()
        elif self.match(TokenType.OFFSET):
            self.advance()

        offset = self.parse_number()
        if offset is None:
            self.error("Expected offset value")
            return None

        # Parse options
        width = 0.9
        height = 2.1
        door_type: DoorType | None = None
        swing: SwingDirection | None = None

        while self.is_door_option():
            opt_name, opt_value = self.parse_door_option()
            if opt_name == "width":
                width = float(opt_value)
            elif opt_name == "height":
                height = float(opt_value)
            elif opt_name == "type":
                door_type = self.parse_door_type_value(opt_value)
            elif opt_name == "swing":
                swing = self.parse_swing_value(opt_value)

        return PlaceDoorCommand(
            wall_ref=wall_ref,
            offset=offset,
            width=width,
            height=height,
            door_type=door_type,
            swing=swing,
            line=start_token.line,
            column=start_token.column,
        )

    def parse_modify_door_rest(self, door_id: str, start_token: Token) -> ModifyDoorCommand:
        """Parse rest of modify door command."""
        self.advance()  # consume 'set'

        prop_name = self.parse_property_name()
        value = self.parse_dimension_or_type()

        return ModifyDoorCommand(
            door_id=door_id,
            property_name=prop_name,
            value=value,
            line=start_token.line,
            column=start_token.column,
        )

    # =========================================================================
    # Window Commands
    # =========================================================================

    def parse_window_command(self) -> Command | None:
        """Parse: window ... or window <uuid> set ..."""
        start_token = self.advance()  # consume 'window'

        # Check if modify command
        if self.match(TokenType.UUID):
            uuid_token = self.advance()
            if self.match(TokenType.SET):
                return self.parse_modify_window_rest(uuid_token.value, start_token)
            self.pos -= 1

        return self.parse_place_window_rest(start_token)

    def parse_place_window_rest(self, start_token: Token) -> PlaceWindowCommand | None:
        """Parse rest of place window command."""
        if self.match(TokenType.IN):
            self.advance()

        wall_ref = self.parse_element_ref()
        if wall_ref is None:
            self.error("Expected wall reference")
            return None

        if self.match(TokenType.AT):
            self.advance()
        elif self.match(TokenType.AT_SIGN):
            self.advance()
        elif self.match(TokenType.OFFSET):
            self.advance()

        offset = self.parse_number()
        if offset is None:
            self.error("Expected offset value")
            return None

        # Parse options
        width = 1.2
        height = 1.0
        sill_height = 0.9
        window_type: WindowType | None = None

        while self.is_window_option():
            opt_name, opt_value = self.parse_window_option()
            if opt_name == "width":
                width = float(opt_value)
            elif opt_name == "height":
                height = float(opt_value)
            elif opt_name == "sill":
                sill_height = float(opt_value)
            elif opt_name == "type":
                window_type = self.parse_window_type_value(opt_value)

        return PlaceWindowCommand(
            wall_ref=wall_ref,
            offset=offset,
            width=width,
            height=height,
            sill_height=sill_height,
            window_type=window_type,
            line=start_token.line,
            column=start_token.column,
        )

    def parse_modify_window_rest(
        self, window_id: str, start_token: Token
    ) -> ModifyWindowCommand:
        """Parse rest of modify window command."""
        self.advance()  # consume 'set'

        prop_name = self.parse_property_name()
        value = self.parse_dimension_or_type()

        return ModifyWindowCommand(
            window_id=window_id,
            property_name=prop_name,
            value=value,
            line=start_token.line,
            column=start_token.column,
        )

    # =========================================================================
    # Opening Command
    # =========================================================================

    def parse_opening_command(self) -> CreateOpeningCommand | None:
        """Parse: opening <wall-ref> at <offset> <dims>"""
        start_token = self.advance()  # consume 'opening'

        wall_ref = self.parse_element_ref()
        if wall_ref is None:
            self.error("Expected wall reference")
            return None

        if self.match(TokenType.AT):
            self.advance()

        offset = self.parse_number()
        if offset is None:
            self.error("Expected offset value")
            return None

        # Parse dimensions: <w> x <h> | <w> by <h> | width <w> height <h>
        width: float | None = None
        height: float | None = None

        if self.match(TokenType.WIDTH):
            self.advance()
            width = self.parse_number()
            if self.match(TokenType.HEIGHT):
                self.advance()
            height = self.parse_number()
        else:
            width = self.parse_number()
            if self.match(TokenType.X, TokenType.BY):
                self.advance()
            height = self.parse_number()

        if width is None or height is None:
            self.error("Expected opening dimensions")
            return None

        return CreateOpeningCommand(
            wall_ref=wall_ref,
            offset=offset,
            width=width,
            height=height,
            line=start_token.line,
            column=start_token.column,
        )

    # =========================================================================
    # Prefix Commands (create, place, add, modify)
    # =========================================================================

    def parse_create_command(self) -> Command | None:
        """Parse: create wall|door|window|opening ..."""
        start_token = self.advance()  # consume 'create'

        if self.match(TokenType.WALL):
            self.advance()
            return self.parse_create_wall_rest(start_token)
        elif self.match(TokenType.DOOR):
            self.advance()
            return self.parse_place_door_rest(start_token)
        elif self.match(TokenType.WINDOW):
            self.advance()
            return self.parse_place_window_rest(start_token)
        elif self.match(TokenType.OPENING):
            self.advance()
            return self.parse_opening_rest(start_token)

        self.error("Expected element type after 'create'")
        return None

    def parse_place_command(self) -> Command | None:
        """Parse: place door|window ..."""
        start_token = self.advance()  # consume 'place'

        if self.match(TokenType.DOOR):
            self.advance()
            return self.parse_place_door_rest(start_token)
        elif self.match(TokenType.WINDOW):
            self.advance()
            return self.parse_place_window_rest(start_token)

        self.error("Expected 'door' or 'window' after 'place'")
        return None

    def parse_add_command(self) -> Command | None:
        """Parse: add door|window ..."""
        start_token = self.advance()  # consume 'add'

        if self.match(TokenType.DOOR):
            self.advance()
            return self.parse_place_door_rest(start_token)
        elif self.match(TokenType.WINDOW):
            self.advance()
            return self.parse_place_window_rest(start_token)

        self.error("Expected 'door' or 'window' after 'add'")
        return None

    def parse_modify_command(self) -> Command | None:
        """Parse: modify wall|door|window <uuid> ..."""
        start_token = self.advance()  # consume 'modify'

        if self.match(TokenType.WALL):
            self.advance()
            if self.match(TokenType.UUID):
                uuid_token = self.advance()
                return self.parse_modify_wall_rest(uuid_token.value, start_token)
        elif self.match(TokenType.DOOR):
            self.advance()
            if self.match(TokenType.UUID):
                uuid_token = self.advance()
                return self.parse_modify_door_rest(uuid_token.value, start_token)
        elif self.match(TokenType.WINDOW):
            self.advance()
            if self.match(TokenType.UUID):
                uuid_token = self.advance()
                return self.parse_modify_window_rest(uuid_token.value, start_token)

        self.error("Expected element type and UUID after 'modify'")
        return None

    def parse_opening_rest(self, start_token: Token) -> CreateOpeningCommand | None:
        """Parse opening command after 'create opening'."""
        wall_ref = self.parse_element_ref()
        if wall_ref is None:
            self.error("Expected wall reference")
            return None

        if self.match(TokenType.AT):
            self.advance()

        offset = self.parse_number()
        if offset is None:
            self.error("Expected offset value")
            return None

        width = self.parse_number()
        if self.match(TokenType.X, TokenType.BY):
            self.advance()
        height = self.parse_number()

        if width is None or height is None:
            self.error("Expected opening dimensions")
            return None

        return CreateOpeningCommand(
            wall_ref=wall_ref,
            offset=offset,
            width=width,
            height=height,
            line=start_token.line,
            column=start_token.column,
        )

    # =========================================================================
    # Help Command
    # =========================================================================

    def parse_help_command(self) -> HelpCommand:
        """Parse: help [topic]"""
        start_token = self.advance()  # consume 'help'

        topic: str | None = None
        if self.match(
            TokenType.WALL,
            TokenType.DOOR,
            TokenType.WINDOW,
            TokenType.OPENING,
            TokenType.IDENTIFIER,
        ):
            topic = str(self.advance().value)

        return HelpCommand(
            topic=topic, line=start_token.line, column=start_token.column
        )

    # =========================================================================
    # Primitive Parsers
    # =========================================================================

    def parse_point2d(self) -> Point2D | None:
        """Parse a 2D point: (x, y) or x, y or x y."""
        has_paren = False
        if self.match(TokenType.LPAREN):
            self.advance()
            has_paren = True

        x = self.parse_number()
        if x is None:
            return None

        # Optional comma
        if self.match(TokenType.COMMA):
            self.advance()

        y = self.parse_number()
        if y is None:
            return None

        if has_paren:
            if self.match(TokenType.RPAREN):
                self.advance()

        return Point2D(x, y)

    def parse_number(self) -> float | None:
        """Parse a number (integer or float)."""
        if self.match(TokenType.INTEGER, TokenType.FLOAT):
            token = self.advance()
            return float(token.value)
        return None

    def parse_element_ref(self) -> ElementRef | None:
        """Parse an element reference (UUID or variable)."""
        # Skip optional 'wall' keyword
        if self.match(TokenType.WALL):
            self.advance()

        if self.match(TokenType.UUID):
            return ElementRef.from_uuid(self.advance().value)
        elif self.match(TokenType.VAR_LAST):
            self.advance()
            return ElementRef.from_variable(VariableRef.LAST)
        elif self.match(TokenType.VAR_SELECTED):
            self.advance()
            return ElementRef.from_variable(VariableRef.SELECTED)
        elif self.match(TokenType.VAR_WALL):
            self.advance()
            return ElementRef.from_variable(VariableRef.WALL)

        return None

    def parse_property_name(self) -> str:
        """Parse a property name for modify commands."""
        if self.match(TokenType.HEIGHT):
            self.advance()
            return "height"
        elif self.match(TokenType.THICKNESS):
            self.advance()
            return "thickness"
        elif self.match(TokenType.WIDTH):
            self.advance()
            return "width"
        elif self.match(TokenType.TYPE):
            self.advance()
            return "type"
        elif self.match(TokenType.SWING):
            self.advance()
            return "swing"
        elif self.match(TokenType.SILL, TokenType.SILL_HEIGHT):
            self.advance()
            return "sill_height"
        elif self.match(TokenType.IDENTIFIER):
            return str(self.advance().value)

        self.error("Expected property name")
        return "unknown"

    def parse_dimension_or_type(self) -> float | str:
        """Parse a dimension value or type keyword."""
        if self.match(TokenType.INTEGER, TokenType.FLOAT):
            return float(self.advance().value)

        # Type keywords
        type_tokens = [
            TokenType.BASIC,
            TokenType.STRUCTURAL,
            TokenType.CURTAIN,
            TokenType.RETAINING,
            TokenType.SINGLE,
            TokenType.DOUBLE,
            TokenType.SLIDING,
            TokenType.FOLDING,
            TokenType.REVOLVING,
            TokenType.POCKET,
            TokenType.FIXED,
            TokenType.CASEMENT,
            TokenType.DOUBLE_HUNG,
            TokenType.AWNING,
            TokenType.HOPPER,
            TokenType.PIVOT,
            TokenType.LEFT,
            TokenType.RIGHT,
            TokenType.BOTH,
            TokenType.NONE,
        ]
        if self.match(*type_tokens):
            return str(self.advance().value)

        self.error("Expected dimension or type value")
        return 0.0

    # =========================================================================
    # Option Detection and Parsing
    # =========================================================================

    def is_wall_option(self) -> bool:
        """Check if current token starts a wall option."""
        return self.match(
            TokenType.HEIGHT,
            TokenType.THICKNESS,
            TokenType.TYPE,
            TokenType.LEVEL,
            TokenType.ON,
            TokenType.OPT_H,
            TokenType.OPT_T,
            TokenType.LONG_HEIGHT,
            TokenType.LONG_THICKNESS,
            TokenType.LONG_TYPE,
            TokenType.LONG_LEVEL,
        )

    def parse_wall_option(self) -> tuple[str, float | str]:
        """Parse a wall option and return (name, value)."""
        if self.match(TokenType.HEIGHT, TokenType.OPT_H, TokenType.LONG_HEIGHT):
            self.advance()
            return ("height", self.parse_number() or 3.0)
        elif self.match(TokenType.THICKNESS, TokenType.OPT_T, TokenType.LONG_THICKNESS):
            self.advance()
            return ("thickness", self.parse_number() or 0.2)
        elif self.match(TokenType.TYPE, TokenType.LONG_TYPE):
            self.advance()
            return ("type", self.parse_wall_type_token())
        elif self.match(TokenType.LEVEL, TokenType.LONG_LEVEL):
            self.advance()
            if self.match(TokenType.UUID):
                return ("level", self.advance().value)
        elif self.match(TokenType.ON):
            self.advance()
            if self.match(TokenType.LEVEL):
                self.advance()
                if self.match(TokenType.UUID):
                    return ("level", self.advance().value)

        return ("unknown", 0.0)

    def is_door_option(self) -> bool:
        """Check if current token starts a door option."""
        return self.match(
            TokenType.WIDTH,
            TokenType.HEIGHT,
            TokenType.TYPE,
            TokenType.SWING,
            TokenType.OPT_W,
            TokenType.OPT_H,
            TokenType.LONG_WIDTH,
            TokenType.LONG_HEIGHT,
            TokenType.LONG_TYPE,
            TokenType.LONG_SWING,
        )

    def parse_door_option(self) -> tuple[str, float | str]:
        """Parse a door option and return (name, value)."""
        if self.match(TokenType.WIDTH, TokenType.OPT_W, TokenType.LONG_WIDTH):
            self.advance()
            return ("width", self.parse_number() or 0.9)
        elif self.match(TokenType.HEIGHT, TokenType.OPT_H, TokenType.LONG_HEIGHT):
            self.advance()
            return ("height", self.parse_number() or 2.1)
        elif self.match(TokenType.TYPE, TokenType.LONG_TYPE):
            self.advance()
            return ("type", self.parse_door_type_token())
        elif self.match(TokenType.SWING, TokenType.LONG_SWING):
            self.advance()
            return ("swing", self.parse_swing_token())

        return ("unknown", 0.0)

    def is_window_option(self) -> bool:
        """Check if current token starts a window option."""
        return self.match(
            TokenType.WIDTH,
            TokenType.HEIGHT,
            TokenType.SILL,
            TokenType.SILL_HEIGHT,
            TokenType.TYPE,
            TokenType.OPT_W,
            TokenType.OPT_H,
            TokenType.LONG_WIDTH,
            TokenType.LONG_HEIGHT,
            TokenType.LONG_SILL,
            TokenType.LONG_SILL_HEIGHT,
            TokenType.LONG_TYPE,
        )

    def parse_window_option(self) -> tuple[str, float | str]:
        """Parse a window option and return (name, value)."""
        if self.match(TokenType.WIDTH, TokenType.OPT_W, TokenType.LONG_WIDTH):
            self.advance()
            return ("width", self.parse_number() or 1.2)
        elif self.match(TokenType.HEIGHT, TokenType.OPT_H, TokenType.LONG_HEIGHT):
            self.advance()
            return ("height", self.parse_number() or 1.0)
        elif self.match(
            TokenType.SILL,
            TokenType.SILL_HEIGHT,
            TokenType.LONG_SILL,
            TokenType.LONG_SILL_HEIGHT,
        ):
            self.advance()
            return ("sill", self.parse_number() or 0.9)
        elif self.match(TokenType.TYPE, TokenType.LONG_TYPE):
            self.advance()
            return ("type", self.parse_window_type_token())

        return ("unknown", 0.0)

    # =========================================================================
    # Type Token Parsing
    # =========================================================================

    def parse_wall_type_token(self) -> str:
        """Parse and return wall type as string."""
        type_map = {
            TokenType.BASIC: "basic",
            TokenType.STRUCTURAL: "structural",
            TokenType.CURTAIN: "curtain",
            TokenType.RETAINING: "retaining",
        }
        for token_type, value in type_map.items():
            if self.match(token_type):
                self.advance()
                return value
        return "basic"

    def parse_door_type_token(self) -> str:
        """Parse and return door type as string."""
        type_map = {
            TokenType.SINGLE: "single",
            TokenType.DOUBLE: "double",
            TokenType.SLIDING: "sliding",
            TokenType.FOLDING: "folding",
            TokenType.REVOLVING: "revolving",
            TokenType.POCKET: "pocket",
        }
        for token_type, value in type_map.items():
            if self.match(token_type):
                self.advance()
                return value
        return "single"

    def parse_window_type_token(self) -> str:
        """Parse and return window type as string."""
        type_map = {
            TokenType.FIXED: "fixed",
            TokenType.CASEMENT: "casement",
            TokenType.DOUBLE_HUNG: "double_hung",
            TokenType.SLIDING: "sliding",
            TokenType.AWNING: "awning",
            TokenType.HOPPER: "hopper",
            TokenType.PIVOT: "pivot",
        }
        for token_type, value in type_map.items():
            if self.match(token_type):
                self.advance()
                return value
        return "fixed"

    def parse_swing_token(self) -> str:
        """Parse and return swing direction as string."""
        type_map = {
            TokenType.LEFT: "left",
            TokenType.RIGHT: "right",
            TokenType.BOTH: "both",
            TokenType.NONE: "none",
        }
        for token_type, value in type_map.items():
            if self.match(token_type):
                self.advance()
                return value
        return "left"

    # =========================================================================
    # Type Value Converters
    # =========================================================================

    def parse_wall_type_value(self, value: str | float) -> WallType | None:
        """Convert string to WallType enum."""
        if isinstance(value, str):
            try:
                return WallType(value.lower())
            except ValueError:
                pass
        return None

    def parse_door_type_value(self, value: str | float) -> DoorType | None:
        """Convert string to DoorType enum."""
        if isinstance(value, str):
            try:
                return DoorType(value.lower())
            except ValueError:
                pass
        return None

    def parse_window_type_value(self, value: str | float) -> WindowType | None:
        """Convert string to WindowType enum."""
        if isinstance(value, str):
            try:
                return WindowType(value.lower())
            except ValueError:
                pass
        return None

    def parse_swing_value(self, value: str | float) -> SwingDirection | None:
        """Convert string to SwingDirection enum."""
        if isinstance(value, str):
            try:
                return SwingDirection(value.lower())
            except ValueError:
                pass
        return None


def parse(source: str) -> ParseResult:
    """Parse a DSL source string.

    Args:
        source: The DSL source code to parse.

    Returns:
        ParseResult containing commands and/or errors.
    """
    parser = Parser(source)
    return parser.parse()
