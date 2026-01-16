"""Pensaer Geometry MCP Server.

This server exposes BIM geometry tools via the Model Context Protocol (MCP),
enabling AI agents to create and manipulate building elements.

Tools provided:
- create_wall, create_floor, create_room - Element creation
- place_door, place_window - Opening placement
- detect_joins, join_elements - Wall join operations
- move_element, copy_element, delete_element - Element operations
- generate_mesh, merge_meshes - Mesh generation
- create_simple_building - Convenience operations

Features:
- Self-healing argument parsing (fuzzy matching, semantic aliases)
- Circuit breaker for resilience
- Comprehensive audit logging

Usage:
    python -m geometry_server  # Run via stdio
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any
from uuid import uuid4

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

import pensaer_geometry as pg

# Self-healing utilities
from .self_healing import (
    heal_tool_args,
    get_circuit_breaker,
    get_argument_healer,
)

from .schemas import (
    CreateWallParams,
    CreateRectangularWallsParams,
    CreateFloorParams,
    CreateRoomParams,
    PlaceDoorParams,
    PlaceWindowParams,
    DetectJoinsParams,
    GetElementParams,
    ListElementsParams,
    DeleteElementParams,
    GenerateMeshParams,
    ValidateMeshParams,
    CreateSimpleBuildingParams,
    CreateRoofParams,
    AttachRoofToWallsParams,
    ErrorCodes,
)
from .state import get_state, GeometryState

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pensaer-geometry")

# Create MCP server instance
server = Server("pensaer-geometry")


# =============================================================================
# Response Helpers
# =============================================================================


def make_response(
    data: dict[str, Any],
    event_id: str | None = None,
    warnings: list[str] | None = None,
    reasoning: str | None = None,
) -> dict[str, Any]:
    """Create a standard MCP response envelope."""
    return {
        "success": True,
        "data": data,
        "event_id": event_id or str(uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "warnings": warnings or [],
        "audit": {
            "user_id": None,  # Set by auth layer in production
            "agent_id": None,
            "reasoning": reasoning,
        },
    }


def make_error(
    code: int, message: str, data: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Create a standard MCP error response."""
    return {
        "success": False,
        "error": {"code": code, "message": message, "data": data or {}},
        "event_id": None,
        "timestamp": datetime.utcnow().isoformat(),
    }


# =============================================================================
# Tool Definitions
# =============================================================================

TOOLS = [
    # Wall Tools
    Tool(
        name="create_wall",
        description="Create a wall element between two points in the BIM model.",
        inputSchema={
            "type": "object",
            "properties": {
                "start": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "Start point (x, y) in meters",
                },
                "end": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "End point (x, y) in meters",
                },
                "height": {
                    "type": "number",
                    "default": 3.0,
                    "description": "Wall height in meters",
                },
                "thickness": {
                    "type": "number",
                    "default": 0.2,
                    "description": "Wall thickness in meters",
                },
                "wall_type": {
                    "type": "string",
                    "enum": ["basic", "structural", "curtain", "retaining"],
                    "description": "Wall type",
                },
                "level_id": {"type": "string", "description": "UUID of hosting level"},
                "reasoning": {
                    "type": "string",
                    "description": "AI agent reasoning for this action",
                },
            },
            "required": ["start", "end"],
        },
    ),
    Tool(
        name="create_rectangular_walls",
        description="Create 4 walls forming a closed rectangle.",
        inputSchema={
            "type": "object",
            "properties": {
                "min_point": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "Minimum corner (x, y)",
                },
                "max_point": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "Maximum corner (x, y)",
                },
                "height": {
                    "type": "number",
                    "default": 3.0,
                    "description": "Wall height in meters",
                },
                "thickness": {
                    "type": "number",
                    "default": 0.2,
                    "description": "Wall thickness in meters",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["min_point", "max_point"],
        },
    ),
    # Floor Tools
    Tool(
        name="create_floor",
        description="Create a rectangular floor slab element.",
        inputSchema={
            "type": "object",
            "properties": {
                "min_point": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "Minimum corner (x, y)",
                },
                "max_point": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "Maximum corner (x, y)",
                },
                "thickness": {
                    "type": "number",
                    "default": 0.3,
                    "description": "Floor thickness in meters",
                },
                "floor_type": {
                    "type": "string",
                    "enum": ["slab", "suspended", "foundation"],
                    "description": "Floor type",
                },
                "level_id": {"type": "string", "description": "UUID of hosting level"},
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["min_point", "max_point"],
        },
    ),
    # Room Tools
    Tool(
        name="create_room",
        description="Create a rectangular room element with name and number.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Room name (e.g., 'Living Room')",
                },
                "number": {
                    "type": "string",
                    "description": "Room number (e.g., '101')",
                },
                "min_point": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "Minimum corner (x, y)",
                },
                "max_point": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "Maximum corner (x, y)",
                },
                "height": {
                    "type": "number",
                    "default": 3.0,
                    "description": "Room height in meters",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["name", "number", "min_point", "max_point"],
        },
    ),
    # Opening Tools
    Tool(
        name="place_door",
        description="Place a door in a wall element.",
        inputSchema={
            "type": "object",
            "properties": {
                "wall_id": {
                    "type": "string",
                    "description": "UUID of the wall to place door in",
                },
                "offset": {
                    "type": "number",
                    "description": "Distance from wall start to door center (meters)",
                },
                "width": {
                    "type": "number",
                    "default": 0.9,
                    "description": "Door width in meters",
                },
                "height": {
                    "type": "number",
                    "default": 2.1,
                    "description": "Door height in meters",
                },
                "door_type": {
                    "type": "string",
                    "enum": [
                        "single",
                        "double",
                        "sliding",
                        "folding",
                        "revolving",
                        "pocket",
                    ],
                    "description": "Door type",
                },
                "swing": {
                    "type": "string",
                    "enum": ["left", "right", "both", "none"],
                    "description": "Swing direction",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["wall_id", "offset"],
        },
    ),
    Tool(
        name="place_window",
        description="Place a window in a wall element.",
        inputSchema={
            "type": "object",
            "properties": {
                "wall_id": {
                    "type": "string",
                    "description": "UUID of the wall to place window in",
                },
                "offset": {
                    "type": "number",
                    "description": "Distance from wall start to window center (meters)",
                },
                "width": {
                    "type": "number",
                    "default": 1.2,
                    "description": "Window width in meters",
                },
                "height": {
                    "type": "number",
                    "default": 1.0,
                    "description": "Window height in meters",
                },
                "sill_height": {
                    "type": "number",
                    "default": 0.9,
                    "description": "Height from floor to window sill (meters)",
                },
                "window_type": {
                    "type": "string",
                    "enum": [
                        "fixed",
                        "casement",
                        "double_hung",
                        "sliding",
                        "awning",
                        "hopper",
                        "pivot",
                    ],
                    "description": "Window type",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["wall_id", "offset"],
        },
    ),
    # Join Tools
    Tool(
        name="detect_joins",
        description="Detect wall joins between a set of walls.",
        inputSchema={
            "type": "object",
            "properties": {
                "wall_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of wall UUIDs to analyze",
                },
                "tolerance": {
                    "type": "number",
                    "default": 0.001,
                    "description": "Distance tolerance for join detection (meters)",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["wall_ids"],
        },
    ),
    # Element Operations
    Tool(
        name="get_element",
        description="Get an element by its UUID.",
        inputSchema={
            "type": "object",
            "properties": {
                "element_id": {"type": "string", "description": "UUID of the element"}
            },
            "required": ["element_id"],
        },
    ),
    Tool(
        name="list_elements",
        description="List elements with optional filtering by category or level.",
        inputSchema={
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["wall", "floor", "door", "window", "room", "roof"],
                    "description": "Filter by category",
                },
                "level_id": {"type": "string", "description": "Filter by level UUID"},
                "limit": {
                    "type": "integer",
                    "default": 100,
                    "minimum": 1,
                    "maximum": 1000,
                    "description": "Maximum results",
                },
                "offset": {
                    "type": "integer",
                    "default": 0,
                    "minimum": 0,
                    "description": "Results to skip",
                },
            },
        },
    ),
    Tool(
        name="delete_element",
        description="Delete one or more elements by UUID.",
        inputSchema={
            "type": "object",
            "properties": {
                "element_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "UUIDs of elements to delete",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["element_ids"],
        },
    ),
    # Mesh Tools
    Tool(
        name="generate_mesh",
        description="Generate a triangle mesh for an element.",
        inputSchema={
            "type": "object",
            "properties": {
                "element_id": {"type": "string", "description": "UUID of the element"},
                "format": {
                    "type": "string",
                    "enum": ["json", "obj"],
                    "default": "json",
                    "description": "Output format",
                },
            },
            "required": ["element_id"],
        },
    ),
    Tool(
        name="validate_mesh",
        description="Validate the mesh of an element.",
        inputSchema={
            "type": "object",
            "properties": {
                "element_id": {"type": "string", "description": "UUID of the element"}
            },
            "required": ["element_id"],
        },
    ),
    # Building Tools
    Tool(
        name="create_simple_building",
        description="Create a simple rectangular building with walls, floor, and room.",
        inputSchema={
            "type": "object",
            "properties": {
                "min_point": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "Minimum corner (x, y)",
                },
                "max_point": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "Maximum corner (x, y)",
                },
                "wall_height": {
                    "type": "number",
                    "default": 3.0,
                    "description": "Wall height in meters",
                },
                "wall_thickness": {
                    "type": "number",
                    "default": 0.2,
                    "description": "Wall thickness in meters",
                },
                "floor_thickness": {
                    "type": "number",
                    "default": 0.3,
                    "description": "Floor thickness in meters",
                },
                "room_name": {"type": "string", "description": "Name for the room"},
                "room_number": {"type": "string", "description": "Room number"},
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["min_point", "max_point", "room_name", "room_number"],
        },
    ),
    # Roof Tools
    Tool(
        name="create_roof",
        description="Create a roof element. Supports flat, gable, hip, shed, and mansard roof types.",
        inputSchema={
            "type": "object",
            "properties": {
                "min_point": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "Minimum corner (x, y)",
                },
                "max_point": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "Maximum corner (x, y)",
                },
                "thickness": {
                    "type": "number",
                    "default": 0.25,
                    "description": "Roof thickness in meters",
                },
                "roof_type": {
                    "type": "string",
                    "enum": ["flat", "gable", "hip", "shed", "mansard"],
                    "default": "flat",
                    "description": "Roof type",
                },
                "slope_degrees": {
                    "type": "number",
                    "default": 30.0,
                    "description": "Slope angle in degrees",
                },
                "ridge_along_x": {
                    "type": "boolean",
                    "default": True,
                    "description": "Ridge direction: true for X-axis, false for Y-axis",
                },
                "eave_overhang": {
                    "type": "number",
                    "default": 0.3,
                    "description": "Eave overhang in meters",
                },
                "base_elevation": {
                    "type": "number",
                    "default": 0.0,
                    "description": "Base elevation (height above ground, typically wall height)",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["min_point", "max_point"],
        },
    ),
    Tool(
        name="attach_roof_to_walls",
        description="Attach a roof to multiple walls. This associates the roof with walls it rests on for visualization and join computation.",
        inputSchema={
            "type": "object",
            "properties": {
                "roof_id": {
                    "type": "string",
                    "description": "UUID of the roof element",
                },
                "wall_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "UUIDs of walls to attach the roof to",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["roof_id", "wall_ids"],
        },
    ),
    # State Tools
    Tool(
        name="get_state_summary",
        description="Get a summary of the current model state.",
        inputSchema={"type": "object", "properties": {}},
    ),
    Tool(
        name="get_self_healing_status",
        description="Get self-healing system status including corrections made and circuit breaker state.",
        inputSchema={"type": "object", "properties": {}},
    ),
]


@server.list_tools()
async def list_tools() -> list[Tool]:
    """Return the list of available tools."""
    return TOOLS


# =============================================================================
# Tool Implementations
# =============================================================================


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Handle tool calls with self-healing argument processing."""
    logger.info(f"Tool called: {name} with raw args: {arguments}")

    # Check circuit breaker state
    cb = get_circuit_breaker()
    if not cb.can_attempt_correction():
        logger.warning(f"Circuit breaker OPEN - self-healing disabled for {name}")

    # Self-heal arguments (fuzzy matching + semantic aliases)
    healed_args = heal_tool_args(name, arguments)

    # Log if any corrections were made
    healer = get_argument_healer()
    if healer.corrections:
        recent_corrections = [c for c in healer.corrections if c["tool"] == name]
        if recent_corrections:
            logger.info(f"Self-healing corrections for {name}: {recent_corrections}")

    logger.info(f"Tool {name} with healed args: {healed_args}")

    try:
        result = await _dispatch_tool(name, healed_args)
        cb.record_success()  # Record successful execution
        return [TextContent(type="text", text=json.dumps(result, indent=2))]
    except Exception as e:
        logger.exception(f"Error in tool {name}")
        cb.record_failure()  # Record failure for circuit breaker
        error_response = make_error(
            ErrorCodes.INTERNAL_ERROR,
            str(e),
            {"tool": name, "original_args": arguments, "healed_args": healed_args},
        )
        return [TextContent(type="text", text=json.dumps(error_response, indent=2))]


async def _dispatch_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Dispatch tool call to appropriate handler."""
    state = get_state()
    reasoning = args.get("reasoning")

    # Wall Tools
    if name == "create_wall":
        return await _create_wall(state, args, reasoning)
    elif name == "create_rectangular_walls":
        return await _create_rectangular_walls(state, args, reasoning)

    # Floor Tools
    elif name == "create_floor":
        return await _create_floor(state, args, reasoning)

    # Room Tools
    elif name == "create_room":
        return await _create_room(state, args, reasoning)

    # Opening Tools
    elif name == "place_door":
        return await _place_door(state, args, reasoning)
    elif name == "place_window":
        return await _place_window(state, args, reasoning)

    # Join Tools
    elif name == "detect_joins":
        return await _detect_joins(state, args, reasoning)

    # Element Operations
    elif name == "get_element":
        return await _get_element(state, args)
    elif name == "list_elements":
        return await _list_elements(state, args)
    elif name == "delete_element":
        return await _delete_element(state, args, reasoning)

    # Mesh Tools
    elif name == "generate_mesh":
        return await _generate_mesh(state, args)
    elif name == "validate_mesh":
        return await _validate_mesh(state, args)

    # Building Tools
    elif name == "create_simple_building":
        return await _create_simple_building(state, args, reasoning)

    # Roof Tools
    elif name == "create_roof":
        return await _create_roof(state, args, reasoning)
    elif name == "attach_roof_to_walls":
        return await _attach_roof_to_walls(state, args, reasoning)

    # State Tools
    elif name == "get_state_summary":
        return await _get_state_summary(state)
    elif name == "get_self_healing_status":
        return await _get_self_healing_status()

    else:
        return make_error(ErrorCodes.INVALID_PARAMS, f"Unknown tool: {name}")


# =============================================================================
# Wall Tool Handlers
# =============================================================================


async def _create_wall(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Create a wall element."""
    params = CreateWallParams(**args)

    wall = pg.create_wall(
        tuple(params.start),
        tuple(params.end),
        height=params.height,
        thickness=params.thickness,
        wall_type=params.wall_type,
    )

    element_id = state.add_element(wall, "wall", params.level_id)

    return make_response(
        {
            "wall_id": element_id,
            "length": wall.length(),
            "height": params.height,
            "thickness": params.thickness,
            "wall_type": params.wall_type or "basic",
        },
        reasoning=reasoning,
    )


async def _create_rectangular_walls(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Create 4 walls forming a rectangle."""
    params = CreateRectangularWallsParams(**args)

    walls = pg.create_rectangular_walls(
        tuple(params.min_point),
        tuple(params.max_point),
        height=params.height,
        thickness=params.thickness,
    )

    wall_ids = []
    for wall in walls:
        element_id = state.add_element(wall, "wall")
        wall_ids.append(element_id)

    return make_response(
        {
            "wall_ids": wall_ids,
            "count": len(wall_ids),
            "dimensions": {
                "width": abs(params.max_point[0] - params.min_point[0]),
                "depth": abs(params.max_point[1] - params.min_point[1]),
                "height": params.height,
            },
        },
        reasoning=reasoning,
    )


# =============================================================================
# Floor Tool Handlers
# =============================================================================


async def _create_floor(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Create a floor element."""
    params = CreateFloorParams(**args)

    floor = pg.create_floor(
        tuple(params.min_point),
        tuple(params.max_point),
        thickness=params.thickness,
        floor_type=params.floor_type,
    )

    element_id = state.add_element(floor, "floor", params.level_id)

    return make_response(
        {
            "floor_id": element_id,
            "area": floor.area(),
            "thickness": params.thickness,
            "floor_type": params.floor_type or "slab",
        },
        reasoning=reasoning,
    )


# =============================================================================
# Room Tool Handlers
# =============================================================================


async def _create_room(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Create a room element."""
    params = CreateRoomParams(**args)

    room = pg.create_room(
        params.name,
        params.number,
        tuple(params.min_point),
        tuple(params.max_point),
        height=params.height,
    )

    element_id = state.add_element(room, "room")

    return make_response(
        {
            "room_id": element_id,
            "name": params.name,
            "number": params.number,
            "area": room.area(),
            "volume": room.volume(),
        },
        reasoning=reasoning,
    )


# =============================================================================
# Opening Tool Handlers
# =============================================================================


async def _place_door(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Place a door in a wall."""
    params = PlaceDoorParams(**args)

    # Get the wall
    wall_record = state.get_element(params.wall_id)
    if not wall_record or wall_record.element_type != "wall":
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Wall not found: {params.wall_id}"
        )

    wall = wall_record.element

    # Place the door
    result = pg.place_door(
        wall,
        offset=params.offset,
        width=params.width,
        height=params.height,
        door_type=params.door_type,
        swing=params.swing,
    )

    # Store the door
    door = result["door"]
    door_id = state.add_element(door, "door", metadata={"host_wall_id": params.wall_id})

    # Update the wall in state
    state.update_element(params.wall_id, wall)

    return make_response(
        {
            "door_id": door_id,
            "wall_id": params.wall_id,
            "width": params.width,
            "height": params.height,
            "door_type": params.door_type or "single",
            "swing": params.swing or "left",
        },
        reasoning=reasoning,
    )


async def _place_window(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Place a window in a wall."""
    params = PlaceWindowParams(**args)

    # Get the wall
    wall_record = state.get_element(params.wall_id)
    if not wall_record or wall_record.element_type != "wall":
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Wall not found: {params.wall_id}"
        )

    wall = wall_record.element

    # Place the window
    result = pg.place_window(
        wall,
        offset=params.offset,
        width=params.width,
        height=params.height,
        sill_height=params.sill_height,
        window_type=params.window_type,
    )

    # Store the window
    window = result["window"]
    window_id = state.add_element(
        window, "window", metadata={"host_wall_id": params.wall_id}
    )

    # Update the wall in state
    state.update_element(params.wall_id, wall)

    return make_response(
        {
            "window_id": window_id,
            "wall_id": params.wall_id,
            "width": params.width,
            "height": params.height,
            "sill_height": params.sill_height,
            "window_type": params.window_type or "fixed",
        },
        reasoning=reasoning,
    )


# =============================================================================
# Join Tool Handlers
# =============================================================================


async def _detect_joins(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Detect joins between walls."""
    params = DetectJoinsParams(**args)

    # Get the walls
    walls = []
    for wall_id in params.wall_ids:
        wall_record = state.get_element(wall_id)
        if wall_record and wall_record.element_type == "wall":
            walls.append(wall_record.element)

    if len(walls) < 2:
        return make_error(
            ErrorCodes.CONSTRAINT_VIOLATION, "Need at least 2 walls for join detection"
        )

    # Detect joins
    joins = pg.detect_joins(walls, params.tolerance)

    # Store joins
    join_data = []
    for join in joins:
        join_id = state.add_join(join)
        join_data.append(
            {
                "join_id": join_id,
                "join_type": join.join_type,
                "wall_count": 2,  # For L-joins
            }
        )

    return make_response(
        {"joins": join_data, "count": len(join_data)}, reasoning=reasoning
    )


# =============================================================================
# Element Operation Handlers
# =============================================================================


async def _get_element(state: GeometryState, args: dict[str, Any]) -> dict[str, Any]:
    """Get an element by ID."""
    params = GetElementParams(**args)

    record = state.get_element(params.element_id)
    if not record:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Element not found: {params.element_id}"
        )

    element = record.element
    data = {
        "id": record.id,
        "type": record.element_type,
        "created_at": record.created_at.isoformat(),
        "modified_at": record.modified_at.isoformat(),
    }

    # Add type-specific properties
    if record.element_type == "wall":
        data["length"] = element.length()
        data["height"] = element.height
        data["thickness"] = element.thickness
    elif record.element_type == "floor":
        data["area"] = element.area()
        data["thickness"] = element.thickness
    elif record.element_type == "room":
        data["name"] = element.name
        data["number"] = element.number
        data["area"] = element.area()
        data["volume"] = element.volume()
    elif record.element_type == "roof":
        data["roof_type"] = element.roof_type
        data["thickness"] = element.thickness
        data["slope_degrees"] = element.slope_degrees
        data["footprint_area"] = element.footprint_area()
        data["surface_area"] = element.surface_area()
        data["ridge_height"] = element.ridge_height()
        data["eave_overhang"] = element.eave_overhang
        data["attached_wall_ids"] = element.attached_wall_ids()

    return make_response(data)


async def _list_elements(state: GeometryState, args: dict[str, Any]) -> dict[str, Any]:
    """List elements with optional filtering."""
    params = ListElementsParams(**args)

    records = state.list_elements(
        category=params.category,
        level_id=params.level_id,
        limit=params.limit,
        offset=params.offset,
    )

    elements = []
    for record in records:
        elements.append(
            {
                "id": record.id,
                "type": record.element_type,
                "created_at": record.created_at.isoformat(),
            }
        )

    return make_response(
        {
            "elements": elements,
            "count": len(elements),
            "total": state.count_elements(params.category),
        }
    )


async def _delete_element(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Delete elements."""
    params = DeleteElementParams(**args)

    deleted = []
    not_found = []

    for element_id in params.element_ids:
        if state.delete_element(element_id):
            deleted.append(element_id)
        else:
            not_found.append(element_id)

    warnings = []
    if not_found:
        warnings.append(f"Elements not found: {not_found}")

    return make_response(
        {"deleted": deleted, "deleted_count": len(deleted)},
        warnings=warnings,
        reasoning=reasoning,
    )


# =============================================================================
# Mesh Tool Handlers
# =============================================================================


async def _generate_mesh(state: GeometryState, args: dict[str, Any]) -> dict[str, Any]:
    """Generate mesh for an element."""
    params = GenerateMeshParams(**args)

    record = state.get_element(params.element_id)
    if not record:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Element not found: {params.element_id}"
        )

    element = record.element
    mesh = element.to_mesh()

    if params.format == "obj":
        obj_string = pg.mesh_to_obj(mesh)
        return make_response(
            {
                "format": "obj",
                "content": obj_string,
                "vertex_count": mesh.vertex_count(),
                "triangle_count": mesh.triangle_count(),
            }
        )
    else:
        # JSON format with vertices and indices
        vertices = mesh.vertices()
        indices = mesh.indices()
        return make_response(
            {
                "format": "json",
                "vertices": vertices,
                "indices": indices,
                "vertex_count": mesh.vertex_count(),
                "triangle_count": mesh.triangle_count(),
            }
        )


async def _validate_mesh(state: GeometryState, args: dict[str, Any]) -> dict[str, Any]:
    """Validate mesh for an element."""
    params = ValidateMeshParams(**args)

    record = state.get_element(params.element_id)
    if not record:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Element not found: {params.element_id}"
        )

    element = record.element
    mesh = element.to_mesh()
    validation = pg.validate_mesh(mesh)

    return make_response(
        {
            "valid": validation["valid"],
            "vertex_count": validation["vertex_count"],
            "triangle_count": validation["triangle_count"],
            "surface_area": validation["surface_area"],
            "bounding_box": validation.get("bounding_box"),
        }
    )


# =============================================================================
# Building Tool Handlers
# =============================================================================


async def _create_simple_building(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Create a simple rectangular building."""
    params = CreateSimpleBuildingParams(**args)

    building = pg.create_simple_building(
        tuple(params.min_point),
        tuple(params.max_point),
        wall_height=params.wall_height,
        wall_thickness=params.wall_thickness,
        floor_thickness=params.floor_thickness,
        room_name=params.room_name,
        room_number=params.room_number,
    )

    # Store all created elements
    wall_ids = []
    for wall in building["walls"]:
        element_id = state.add_element(wall, "wall")
        wall_ids.append(element_id)

    floor_id = state.add_element(building["floor"], "floor")
    room_id = state.add_element(building["room"], "room")

    # Store joins
    join_ids = []
    for join in building["joins"]:
        join_id = state.add_join(join)
        join_ids.append(join_id)

    return make_response(
        {
            "wall_ids": wall_ids,
            "floor_id": floor_id,
            "room_id": room_id,
            "join_ids": join_ids,
            "room_name": params.room_name,
            "room_number": params.room_number,
            "dimensions": {
                "width": abs(params.max_point[0] - params.min_point[0]),
                "depth": abs(params.max_point[1] - params.min_point[1]),
                "height": params.wall_height,
            },
        },
        reasoning=reasoning,
    )


# =============================================================================
# Roof Tool Handlers
# =============================================================================


async def _create_roof(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Create a roof element."""
    params = CreateRoofParams(**args)

    roof = pg.create_roof(
        tuple(params.min_point),
        tuple(params.max_point),
        thickness=params.thickness,
        roof_type=params.roof_type,
        slope_degrees=params.slope_degrees,
        ridge_along_x=params.ridge_along_x,
        eave_overhang=params.eave_overhang,
    )

    # Set base elevation if provided
    if params.base_elevation > 0:
        roof.set_elevation(params.base_elevation)

    element_id = state.add_element(roof, "roof")

    return make_response(
        {
            "roof_id": element_id,
            "roof_type": params.roof_type,
            "slope_degrees": params.slope_degrees,
            "footprint_area": roof.footprint_area(),
            "surface_area": roof.surface_area(),
            "ridge_height": roof.ridge_height(),
            "eave_overhang": params.eave_overhang,
        },
        reasoning=reasoning,
    )


async def _attach_roof_to_walls(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Attach a roof to multiple walls."""
    params = AttachRoofToWallsParams(**args)

    # Get the roof element
    roof_record = state.get_element(params.roof_id)
    if not roof_record or roof_record.element_type != "roof":
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Roof not found: {params.roof_id}"
        )

    roof = roof_record.element

    # Verify all walls exist
    walls = []
    not_found = []
    for wall_id in params.wall_ids:
        wall_record = state.get_element(wall_id)
        if wall_record and wall_record.element_type == "wall":
            walls.append(wall_record.element)
        else:
            not_found.append(wall_id)

    if not_found:
        return make_error(ErrorCodes.ELEMENT_NOT_FOUND, f"Walls not found: {not_found}")

    # Attach using the Python binding
    result = pg.attach_roof_to_walls(roof, walls)

    # Update the roof in state with attached walls
    state.update_element(params.roof_id, result["roof"])

    return make_response(
        {
            "roof_id": params.roof_id,
            "attached_wall_count": result["attached_wall_count"],
            "wall_ids": result["wall_ids"],
        },
        reasoning=reasoning,
    )


# =============================================================================
# State Tool Handlers
# =============================================================================


async def _get_state_summary(state: GeometryState) -> dict[str, Any]:
    """Get state summary."""
    summary = state.to_summary()
    return make_response(summary)


async def _get_self_healing_status() -> dict[str, Any]:
    """Get self-healing system status."""
    cb = get_circuit_breaker()
    healer = get_argument_healer()

    # Group corrections by tool
    corrections_by_tool: dict[str, list[dict]] = {}
    for correction in healer.corrections:
        tool = correction["tool"]
        if tool not in corrections_by_tool:
            corrections_by_tool[tool] = []
        corrections_by_tool[tool].append(
            {
                "original": correction["original_key"],
                "corrected": correction["corrected_key"],
                "timestamp": correction["timestamp"],
            }
        )

    return make_response(
        {
            "circuit_breaker": {
                "state": cb.state.value,
                "failures": cb.failures,
                "successes": cb.successes,
                "failure_threshold": cb.failure_threshold,
                "success_threshold": cb.success_threshold,
                "timeout_seconds": cb.timeout_seconds,
                "is_healthy": cb.can_attempt_correction(),
            },
            "argument_healing": {
                "threshold": healer.threshold,
                "total_corrections": len(healer.corrections),
                "corrections_by_tool": corrections_by_tool,
            },
            "semantic_aliases_count": len(
                healer._get_expected_keys("create_wall")
            ),  # Sample
        }
    )


# =============================================================================
# Server Entry Point
# =============================================================================


async def main():
    """Run the MCP server via stdio."""
    logger.info("Starting Pensaer Geometry MCP Server...")

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream, write_stream, server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
