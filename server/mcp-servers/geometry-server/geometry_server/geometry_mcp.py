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
from datetime import datetime, timezone
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
    CreateOpeningParams,
    DetectJoinsParams,
    GetElementParams,
    ListElementsParams,
    DeleteElementParams,
    ModifyElementParams,
    GenerateMeshParams,
    ValidateMeshParams,
    ComputeMeshParams,
    CreateSimpleBuildingParams,
    CreateRoofParams,
    AttachRoofToWallsParams,
    # Selection schemas
    SelectElementsParams,
    GetSelectionParams,
    SelectByTypeParams,
    # Group schemas
    CreateGroupParams,
    AddToGroupParams,
    RemoveFromGroupParams,
    DeleteGroupParams,
    GetGroupParams,
    ListGroupsParams,
    SelectGroupParams,
    # Room detection schemas
    DetectRoomsParams,
    AnalyzeTopologyParams,
    # Clash detection schemas
    DetectClashesParams,
    DetectClashesBetweenSetsParams,
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
        "timestamp": datetime.now(timezone.utc).isoformat(),
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
        "timestamp": datetime.now(timezone.utc).isoformat(),
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
                "material": {
                    "type": "string",
                    "enum": ["concrete", "brick", "timber", "steel", "masonry", "drywall"],
                    "description": "Wall material (optional)",
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
    # Generic Opening Tool
    Tool(
        name="create_opening",
        description="Create a generic rectangular opening (cut) in a wall. Use this for openings that aren't doors or windows.",
        inputSchema={
            "type": "object",
            "properties": {
                "host_id": {
                    "type": "string",
                    "description": "UUID of the wall to create opening in",
                },
                "offset": {
                    "type": "number",
                    "description": "Distance from wall start to opening center (meters)",
                },
                "width": {
                    "type": "number",
                    "description": "Opening width in meters",
                },
                "height": {
                    "type": "number",
                    "description": "Opening height in meters",
                },
                "base_height": {
                    "type": "number",
                    "default": 0.0,
                    "description": "Height from floor to opening base (meters)",
                },
                "opening_type": {
                    "type": "string",
                    "enum": ["door", "window", "generic"],
                    "default": "generic",
                    "description": "Opening type",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["host_id", "offset", "width", "height"],
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
    Tool(
        name="modify_element",
        description="Modify an element's properties and/or geometry.",
        inputSchema={
            "type": "object",
            "properties": {
                "element_id": {"type": "string", "description": "UUID of the element to modify"},
                "properties": {
                    "type": "object",
                    "description": "Properties to update (partial update)",
                },
                "geometry": {
                    "type": "object",
                    "description": "Geometry parameters to update (e.g., start_point, end_point for walls)",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["element_id"],
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
    Tool(
        name="compute_mesh",
        description="Compute a 3D mesh for an element with full features. "
        "Generates vertices, faces, normals, and UV coordinates. "
        "Supports LOD levels and multiple output formats including glTF-compatible JSON.",
        inputSchema={
            "type": "object",
            "properties": {
                "element_id": {"type": "string", "description": "UUID of the element to mesh"},
                "include_normals": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include vertex normals for lighting",
                },
                "include_uvs": {
                    "type": "boolean",
                    "default": False,
                    "description": "Include UV coordinates for texturing",
                },
                "lod_level": {
                    "type": "integer",
                    "default": 0,
                    "minimum": 0,
                    "maximum": 2,
                    "description": "Level of detail: 0=full, 1=medium, 2=low",
                },
                "format": {
                    "type": "string",
                    "enum": ["gltf", "json", "obj"],
                    "default": "gltf",
                    "description": "Output format: gltf (glTF-compatible), json, obj",
                },
            },
            "required": ["element_id"],
        },
    ),
    Tool(
        name="compute_mesh_batch",
        description="Generate meshes for multiple elements at once. Optionally merge into single mesh.",
        inputSchema={
            "type": "object",
            "properties": {
                "element_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of element UUIDs to generate meshes for",
                },
                "merge": {
                    "type": "boolean",
                    "default": False,
                    "description": "Merge all meshes into a single combined mesh",
                },
                "format": {
                    "type": "string",
                    "enum": ["json", "obj"],
                    "default": "json",
                    "description": "Output format",
                },
                "compute_normals": {
                    "type": "boolean",
                    "default": True,
                    "description": "Compute vertex normals for smooth shading",
                },
            },
            "required": ["element_ids"],
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
    # Selection Tools
    Tool(
        name="select_elements",
        description="Select one or more BIM elements. Supports multiple selection modes: replace (clear existing selection), add, remove, or toggle.",
        inputSchema={
            "type": "object",
            "properties": {
                "element_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "UUIDs of elements to select",
                },
                "mode": {
                    "type": "string",
                    "enum": ["replace", "add", "remove", "toggle"],
                    "default": "replace",
                    "description": "Selection mode: replace, add, remove, toggle",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["element_ids"],
        },
    ),
    Tool(
        name="get_selection",
        description="Get the current selection. Returns list of selected element IDs and optional full element details.",
        inputSchema={
            "type": "object",
            "properties": {
                "include_details": {
                    "type": "boolean",
                    "default": False,
                    "description": "Include full element properties in response",
                },
                "category": {
                    "type": "string",
                    "description": "Filter by element type (wall, floor, door, etc.)",
                },
            },
        },
    ),
    Tool(
        name="clear_selection",
        description="Clear all selected elements.",
        inputSchema={
            "type": "object",
            "properties": {
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
        },
    ),
    Tool(
        name="select_by_type",
        description="Select all elements of a specific type (wall, floor, door, window, room, roof).",
        inputSchema={
            "type": "object",
            "properties": {
                "element_type": {
                    "type": "string",
                    "description": "Element type to select",
                },
                "mode": {
                    "type": "string",
                    "enum": ["replace", "add", "toggle"],
                    "default": "replace",
                    "description": "Selection mode",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["element_type"],
        },
    ),
    # Group Tools
    Tool(
        name="create_group",
        description="Create a named group of elements for organizing and batch operations.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name for the group",
                },
                "element_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "UUIDs of elements to include",
                },
                "metadata": {
                    "type": "object",
                    "description": "Optional metadata for the group",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["name", "element_ids"],
        },
    ),
    Tool(
        name="add_to_group",
        description="Add elements to an existing group.",
        inputSchema={
            "type": "object",
            "properties": {
                "group_id": {
                    "type": "string",
                    "description": "UUID of the group",
                },
                "element_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "UUIDs of elements to add",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["group_id", "element_ids"],
        },
    ),
    Tool(
        name="remove_from_group",
        description="Remove elements from a group (elements remain in model).",
        inputSchema={
            "type": "object",
            "properties": {
                "group_id": {
                    "type": "string",
                    "description": "UUID of the group",
                },
                "element_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "UUIDs of elements to remove",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["group_id", "element_ids"],
        },
    ),
    Tool(
        name="delete_group",
        description="Delete a group (elements remain in model).",
        inputSchema={
            "type": "object",
            "properties": {
                "group_id": {
                    "type": "string",
                    "description": "UUID of the group to delete",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["group_id"],
        },
    ),
    Tool(
        name="get_group",
        description="Get a group by ID with its elements.",
        inputSchema={
            "type": "object",
            "properties": {
                "group_id": {
                    "type": "string",
                    "description": "UUID of the group",
                },
                "include_details": {
                    "type": "boolean",
                    "default": False,
                    "description": "Include full element properties",
                },
            },
            "required": ["group_id"],
        },
    ),
    Tool(
        name="list_groups",
        description="List all element groups.",
        inputSchema={
            "type": "object",
            "properties": {
                "include_elements": {
                    "type": "boolean",
                    "default": False,
                    "description": "Include element IDs in response",
                },
            },
        },
    ),
    Tool(
        name="select_group",
        description="Select all elements in a group.",
        inputSchema={
            "type": "object",
            "properties": {
                "group_id": {
                    "type": "string",
                    "description": "UUID of the group to select",
                },
                "mode": {
                    "type": "string",
                    "enum": ["replace", "add", "toggle"],
                    "default": "replace",
                    "description": "Selection mode",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["group_id"],
        },
    ),
    # Boolean Operation Tool (Placeholder)
    Tool(
        name="boolean_operation",
        description="Perform CSG boolean operations on meshes (union, difference, intersection). Note: Full implementation planned for Phase 3.",
        inputSchema={
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": ["union", "difference", "intersection"],
                    "description": "Boolean operation type",
                },
                "target_id": {
                    "type": "string",
                    "description": "UUID of the target element (modified in-place for difference)",
                },
                "tool_id": {
                    "type": "string",
                    "description": "UUID of the tool element (subtracted/intersected)",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["operation", "target_id", "tool_id"],
        },
    ),
    # Room Detection Tools
    Tool(
        name="detect_rooms",
        description="Detect enclosed rooms from walls using topology graph analysis. "
        "Identifies closed wall loops and computes room properties (area, centroid, boundary).",
        inputSchema={
            "type": "object",
            "properties": {
                "wall_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "UUIDs of walls to analyze. If not provided, uses all walls in model.",
                },
                "tolerance": {
                    "type": "number",
                    "default": 0.0005,
                    "description": "Distance tolerance for node merging in meters (default 0.5mm)",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
        },
    ),
    Tool(
        name="analyze_wall_topology",
        description="Analyze the topology of a wall network. Returns node count, edge count, "
        "room count, connectivity status, and detailed room information.",
        inputSchema={
            "type": "object",
            "properties": {
                "wall_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "UUIDs of walls to analyze. If not provided, uses all walls in model.",
                },
                "tolerance": {
                    "type": "number",
                    "default": 0.0005,
                    "description": "Distance tolerance for node merging in meters (default 0.5mm)",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
        },
    ),
    # Clash Detection Tools
    Tool(
        name="detect_clashes",
        description="Detect geometric clashes (intersections) between BIM elements. "
        "Returns hard clashes (solid intersections), clearance violations, and potential duplicates.",
        inputSchema={
            "type": "object",
            "properties": {
                "element_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "UUIDs of elements to check. If not provided, checks all elements in model.",
                },
                "tolerance": {
                    "type": "number",
                    "default": 0.001,
                    "description": "Distance tolerance for clash detection in meters (default 1mm)",
                },
                "clearance": {
                    "type": "number",
                    "default": 0.0,
                    "description": "Minimum clearance distance in meters. Elements closer trigger clearance clash.",
                },
                "ignore_same_type": {
                    "type": "boolean",
                    "default": False,
                    "description": "If true, ignores clashes between elements of the same type",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
        },
    ),
    Tool(
        name="detect_clashes_between_sets",
        description="Detect geometric clashes between two sets of BIM elements. "
        "Useful for checking new elements against existing model, or comparing different building systems.",
        inputSchema={
            "type": "object",
            "properties": {
                "set_a_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "UUIDs of first set of elements",
                },
                "set_b_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "UUIDs of second set of elements",
                },
                "tolerance": {
                    "type": "number",
                    "default": 0.001,
                    "description": "Distance tolerance for clash detection in meters (default 1mm)",
                },
                "clearance": {
                    "type": "number",
                    "default": 0.0,
                    "description": "Minimum clearance distance in meters",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["set_a_ids", "set_b_ids"],
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
    elif name == "create_opening":
        return await _create_opening(state, args, reasoning)

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
    elif name == "modify_element":
        return await _modify_element(state, args, reasoning)

    # Mesh Tools
    elif name == "generate_mesh":
        return await _generate_mesh(state, args)
    elif name == "validate_mesh":
        return await _validate_mesh(state, args)
    elif name == "compute_mesh":
        return await _compute_mesh(state, args)
    elif name == "compute_mesh_batch":
        return await _compute_mesh_batch(state, args)

    # Building Tools
    elif name == "create_simple_building":
        return await _create_simple_building(state, args, reasoning)

    # Roof Tools
    elif name == "create_roof":
        return await _create_roof(state, args, reasoning)
    elif name == "attach_roof_to_walls":
        return await _attach_roof_to_walls(state, args, reasoning)

    # Selection Tools
    elif name == "select_elements":
        return await _select_elements(state, args, reasoning)
    elif name == "get_selection":
        return await _get_selection(state, args)
    elif name == "clear_selection":
        return await _clear_selection(state, reasoning)
    elif name == "select_by_type":
        return await _select_by_type(state, args, reasoning)

    # Group Tools
    elif name == "create_group":
        return await _create_group(state, args, reasoning)
    elif name == "add_to_group":
        return await _add_to_group(state, args, reasoning)
    elif name == "remove_from_group":
        return await _remove_from_group(state, args, reasoning)
    elif name == "delete_group":
        return await _delete_group(state, args, reasoning)
    elif name == "get_group":
        return await _get_group(state, args)
    elif name == "list_groups":
        return await _list_groups(state, args)
    elif name == "select_group":
        return await _select_group(state, args, reasoning)

    # Boolean Operation
    elif name == "boolean_operation":
        return await _boolean_operation(state, args, reasoning)

    # Room Detection Tools
    elif name == "detect_rooms":
        return await _detect_rooms(state, args, reasoning)
    elif name == "analyze_wall_topology":
        return await _analyze_wall_topology(state, args, reasoning)

    # Clash Detection Tools
    elif name == "detect_clashes":
        return await _detect_clashes(state, args, reasoning)
    elif name == "detect_clashes_between_sets":
        return await _detect_clashes_between_sets(state, args, reasoning)

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
    """Create a wall element.

    Creates a wall between two points with configurable height, thickness,
    type, and material. The wall geometry is validated for minimum length.

    Args:
        state: The geometry state manager
        args: Tool arguments including start, end, height, thickness, wall_type, material
        reasoning: Optional AI agent reasoning for audit trail

    Returns:
        Response with wall_id, geometry properties, and material info
    """
    params = CreateWallParams(**args)

    wall = pg.create_wall(
        tuple(params.start),
        tuple(params.end),
        height=params.height,
        thickness=params.thickness,
        wall_type=params.wall_type,
    )

    element_id = state.add_element(wall, "wall", params.level_id)

    # Build response with all wall properties
    response_data = {
        "wall_id": element_id,
        "start": list(params.start),
        "end": list(params.end),
        "length": wall.length(),
        "height": params.height,
        "thickness": params.thickness,
        "wall_type": params.wall_type or "basic",
    }

    # Include material if specified
    if params.material:
        response_data["material"] = params.material

    # Include level if specified
    if params.level_id:
        response_data["level_id"] = params.level_id

    return make_response(response_data, reasoning=reasoning)


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


async def _create_opening(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Create a generic opening in a wall."""
    params = CreateOpeningParams(**args)

    # Get the wall
    wall_record = state.get_element(params.host_id)
    if not wall_record or wall_record.element_type != "wall":
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Wall not found: {params.host_id}"
        )

    wall = wall_record.element

    # Create the opening using the Python binding
    result = pg.create_opening(
        wall,
        offset=params.offset,
        base_height=params.base_height,
        width=params.width,
        height=params.height,
        opening_type=params.opening_type,
    )

    # Update the wall in state
    state.update_element(params.host_id, wall)

    return make_response(
        {
            "opening_id": result["opening"].id,
            "wall_id": params.host_id,
            "width": params.width,
            "height": params.height,
            "base_height": params.base_height,
            "opening_type": params.opening_type,
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


async def _modify_element(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Modify an element's properties and/or geometry."""
    try:
        params = ModifyElementParams(**args)
    except ValueError as e:
        return make_error(ErrorCodes.INVALID_PARAMS, str(e))

    record = state.get_element(params.element_id)
    if not record:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Element not found: {params.element_id}"
        )

    element = record.element
    element_type = record.element_type
    modified_fields = []
    warnings = []

    # Store original state for undo support
    original_data = {
        "element_id": params.element_id,
        "element_type": element_type,
    }

    # Apply property updates
    if params.properties:
        for key, value in params.properties.items():
            if hasattr(element, key):
                old_value = getattr(element, key)
                setattr(element, key, value)
                modified_fields.append(key)
                original_data[f"original_{key}"] = old_value
            else:
                warnings.append(f"Unknown property: {key}")

    # Apply geometry updates (element-type specific)
    if params.geometry:
        if element_type == "wall":
            # Wall geometry: start_point, end_point, height, thickness
            if "start_point" in params.geometry:
                old_start = element.start_point()
                new_start = tuple(params.geometry["start_point"])
                element = pg.Wall(
                    new_start,
                    element.end_point(),
                    element.height,
                    element.thickness,
                )
                modified_fields.append("start_point")
                original_data["original_start_point"] = list(old_start)
            if "end_point" in params.geometry:
                old_end = element.end_point()
                new_end = tuple(params.geometry["end_point"])
                element = pg.Wall(
                    element.start_point(),
                    new_end,
                    element.height,
                    element.thickness,
                )
                modified_fields.append("end_point")
                original_data["original_end_point"] = list(old_end)
            if "height" in params.geometry:
                old_height = element.height
                element = pg.Wall(
                    element.start_point(),
                    element.end_point(),
                    params.geometry["height"],
                    element.thickness,
                )
                modified_fields.append("height")
                original_data["original_height"] = old_height
            if "thickness" in params.geometry:
                old_thickness = element.thickness
                element = pg.Wall(
                    element.start_point(),
                    element.end_point(),
                    element.height,
                    params.geometry["thickness"],
                )
                modified_fields.append("thickness")
                original_data["original_thickness"] = old_thickness
        elif element_type in ("floor", "roof"):
            # Floor/Roof: may have points, thickness
            if "thickness" in params.geometry and hasattr(element, "thickness"):
                old_thickness = element.thickness
                element.thickness = params.geometry["thickness"]
                modified_fields.append("thickness")
                original_data["original_thickness"] = old_thickness
        elif element_type == "door":
            # Door: width, height, offset
            for field in ["width", "height", "offset"]:
                if field in params.geometry and hasattr(element, field):
                    old_value = getattr(element, field)
                    setattr(element, field, params.geometry[field])
                    modified_fields.append(field)
                    original_data[f"original_{field}"] = old_value
        elif element_type == "window":
            # Window: width, height, offset, sill_height
            for field in ["width", "height", "offset", "sill_height"]:
                if field in params.geometry and hasattr(element, field):
                    old_value = getattr(element, field)
                    setattr(element, field, params.geometry[field])
                    modified_fields.append(field)
                    original_data[f"original_{field}"] = old_value
        else:
            warnings.append(f"Geometry modification not supported for type: {element_type}")

    # Update element in state
    if modified_fields:
        state.update_element(params.element_id, element)

    return make_response(
        {
            "element_id": params.element_id,
            "element_type": element_type,
            "modified_fields": modified_fields,
            "undo_data": original_data,
        },
        warnings=warnings if warnings else None,
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


async def _compute_mesh(state: GeometryState, args: dict[str, Any]) -> dict[str, Any]:
    """Compute a mesh with full features: normals, UVs, LOD, glTF format.

    This is the comprehensive mesh generation tool that produces
    glTF-compatible output with optional normals and UVs.
    """
    params = ComputeMeshParams(**args)

    record = state.get_element(params.element_id)
    if not record:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Element not found: {params.element_id}"
        )

    element = record.element
    mesh = element.to_mesh()

    # Apply LOD reduction if requested
    if params.lod_level > 0:
        # LOD 1: reduce to ~50% triangles, LOD 2: reduce to ~25%
        target_ratio = 0.5 if params.lod_level == 1 else 0.25
        mesh = pg.simplify_mesh(mesh, target_ratio)

    # Compute normals if requested
    normals = None
    if params.include_normals:
        mesh.compute_smooth_normals()
        normals = mesh.normals()

    # Compute UVs if requested (box projection)
    uvs = None
    if params.include_uvs:
        uvs = mesh.compute_box_uvs()

    # Get base mesh data
    vertices = mesh.vertices()
    indices = mesh.indices()
    vertex_count = mesh.vertex_count()
    triangle_count = mesh.triangle_count()

    # Compute bounding box
    bbox = mesh.bounding_box()

    if params.format == "obj":
        # Generate OBJ format string
        obj_string = pg.mesh_to_obj(mesh)
        return make_response(
            {
                "format": "obj",
                "content": obj_string,
                "element_id": params.element_id,
                "element_type": record.element_type,
                "vertex_count": vertex_count,
                "triangle_count": triangle_count,
                "lod_level": params.lod_level,
                "has_normals": params.include_normals,
                "has_uvs": params.include_uvs,
                "bounding_box": bbox,
            }
        )

    elif params.format == "json":
        # Simple JSON format
        result = {
            "format": "json",
            "element_id": params.element_id,
            "element_type": record.element_type,
            "vertices": vertices,
            "indices": indices,
            "vertex_count": vertex_count,
            "triangle_count": triangle_count,
            "lod_level": params.lod_level,
            "bounding_box": bbox,
        }
        if normals is not None:
            result["normals"] = normals
        if uvs is not None:
            result["uvs"] = uvs
        return make_response(result)

    else:
        # glTF-compatible format (default)
        # Structure follows glTF 2.0 accessor/bufferView pattern
        gltf_data = {
            "format": "gltf",
            "element_id": params.element_id,
            "element_type": record.element_type,
            "lod_level": params.lod_level,
            "mesh": {
                "primitives": [
                    {
                        "attributes": {
                            "POSITION": {
                                "type": "VEC3",
                                "componentType": 5126,  # FLOAT
                                "count": vertex_count,
                                "data": vertices,
                                "min": bbox["min"] if bbox else None,
                                "max": bbox["max"] if bbox else None,
                            }
                        },
                        "indices": {
                            "type": "SCALAR",
                            "componentType": 5125,  # UNSIGNED_INT
                            "count": len(indices),
                            "data": indices,
                        },
                        "mode": 4,  # TRIANGLES
                    }
                ]
            },
            "vertex_count": vertex_count,
            "triangle_count": triangle_count,
            "bounding_box": bbox,
        }

        # Add normals attribute
        if normals is not None:
            gltf_data["mesh"]["primitives"][0]["attributes"]["NORMAL"] = {
                "type": "VEC3",
                "componentType": 5126,  # FLOAT
                "count": len(normals) // 3,
                "data": normals,
            }

        # Add UV attribute
        if uvs is not None:
            gltf_data["mesh"]["primitives"][0]["attributes"]["TEXCOORD_0"] = {
                "type": "VEC2",
                "componentType": 5126,  # FLOAT
                "count": len(uvs) // 2,
                "data": uvs,
            }

        return make_response(gltf_data)


async def _compute_mesh_batch(
    state: GeometryState, args: dict[str, Any]
) -> dict[str, Any]:
    """Generate meshes for multiple elements, optionally merging them."""
    element_ids = args.get("element_ids", [])
    merge = args.get("merge", False)
    output_format = args.get("format", "json")
    compute_normals = args.get("compute_normals", True)

    if not element_ids:
        return make_error(ErrorCodes.INVALID_PARAMS, "element_ids cannot be empty")

    # Collect meshes
    meshes = []
    mesh_info = []
    not_found = []

    for element_id in element_ids:
        record = state.get_element(element_id)
        if not record:
            not_found.append(element_id)
            continue

        mesh = record.element.to_mesh()
        if compute_normals:
            mesh.compute_smooth_normals()

        meshes.append(mesh)
        mesh_info.append(
            {
                "element_id": element_id,
                "element_type": record.element_type,
                "vertex_count": mesh.vertex_count(),
                "triangle_count": mesh.triangle_count(),
            }
        )

    warnings = []
    if not_found:
        warnings.append(f"Elements not found: {not_found}")

    if not meshes:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, "No valid elements found for mesh generation"
        )

    if merge:
        # Merge all meshes into one
        combined = pg.merge_meshes(meshes)

        if output_format == "obj":
            obj_string = pg.mesh_to_obj(combined)
            return make_response(
                {
                    "format": "obj",
                    "merged": True,
                    "content": obj_string,
                    "total_vertices": combined.vertex_count(),
                    "total_triangles": combined.triangle_count(),
                    "element_count": len(meshes),
                    "elements": mesh_info,
                },
                warnings=warnings,
            )
        else:
            vertices = combined.vertices()
            indices = combined.indices()
            return make_response(
                {
                    "format": "json",
                    "merged": True,
                    "vertices": vertices,
                    "indices": indices,
                    "total_vertices": combined.vertex_count(),
                    "total_triangles": combined.triangle_count(),
                    "element_count": len(meshes),
                    "elements": mesh_info,
                },
                warnings=warnings,
            )

    # Return individual meshes
    result_meshes = []
    for i, mesh in enumerate(meshes):
        if output_format == "obj":
            result_meshes.append(
                {
                    **mesh_info[i],
                    "content": pg.mesh_to_obj(mesh),
                }
            )
        else:
            result_meshes.append(
                {
                    **mesh_info[i],
                    "vertices": mesh.vertices(),
                    "indices": mesh.indices(),
                }
            )

    return make_response(
        {
            "format": output_format,
            "merged": False,
            "meshes": result_meshes,
            "element_count": len(meshes),
            "total_vertices": sum(m["vertex_count"] for m in mesh_info),
            "total_triangles": sum(m["triangle_count"] for m in mesh_info),
        },
        warnings=warnings,
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
# Boolean Operation Handlers
# =============================================================================


async def _boolean_operation(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Perform CSG boolean operations on meshes.

    Note: Full CSG implementation is planned for Phase 3 (Week 25).
    Currently provides mesh-level union via merge_meshes().
    """
    operation = args.get("operation", "union")
    target_id = args.get("target_id")
    tool_id = args.get("tool_id")

    # Validate elements exist
    target_record = state.get_element(target_id)
    tool_record = state.get_element(tool_id)

    if not target_record:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Target element not found: {target_id}"
        )
    if not tool_record:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Tool element not found: {tool_id}"
        )

    # For now, only support union via mesh merge
    if operation == "union":
        # Get meshes from both elements
        target_mesh = target_record.element.to_mesh()
        tool_mesh = tool_record.element.to_mesh()

        # Merge meshes
        combined = pg.merge_meshes([target_mesh, tool_mesh])

        return make_response(
            {
                "operation": "union",
                "target_id": target_id,
                "tool_id": tool_id,
                "result": {
                    "vertex_count": combined.vertex_count(),
                    "triangle_count": combined.triangle_count(),
                    "note": "Meshes merged. For true CSG union, see Phase 3 implementation.",
                },
            },
            reasoning=reasoning,
            warnings=[
                "Full CSG boolean operations (difference, intersection) planned for Phase 3."
            ],
        )

    # Difference and intersection require full CSG
    return make_response(
        {
            "operation": operation,
            "target_id": target_id,
            "tool_id": tool_id,
            "status": "not_implemented",
            "message": f"CSG {operation} operation requires Phase 3 implementation. "
            "Currently available: union (mesh merge). "
            "For opening cuts, use create_opening or place_door/place_window instead.",
        },
        reasoning=reasoning,
        warnings=[
            f"CSG {operation} not yet implemented. Use create_opening for wall cuts."
        ],
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
# Selection Tool Handlers
# =============================================================================


async def _select_elements(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Select one or more elements."""
    params = SelectElementsParams(**args)

    result = state.select_elements(params.element_ids, mode=params.mode)

    warnings = []
    if result["invalid_ids"]:
        warnings.append(f"Elements not found: {result['invalid_ids']}")

    return make_response(
        {
            "selected_count": result["selected_count"],
            "selected_ids": result["selected_ids"],
            "mode": params.mode,
            "valid_ids": result["valid_ids"],
        },
        warnings=warnings,
        reasoning=reasoning,
    )


async def _get_selection(state: GeometryState, args: dict[str, Any]) -> dict[str, Any]:
    """Get current selection."""
    params = GetSelectionParams(**args)

    summary = state.get_selection_summary()

    if params.include_details:
        # Get full element details
        elements = []
        for record in state.get_selected():
            # Apply category filter if specified
            if params.category and record.element_type != params.category:
                continue

            elem_data = {
                "id": record.id,
                "type": record.element_type,
                "created_at": record.created_at.isoformat(),
            }

            # Add type-specific properties
            element = record.element
            if record.element_type == "wall":
                elem_data["length"] = element.length()
                elem_data["height"] = element.height
            elif record.element_type == "floor":
                elem_data["area"] = element.area()
            elif record.element_type == "room":
                elem_data["name"] = element.name
                elem_data["area"] = element.area()
            elif record.element_type == "roof":
                elem_data["roof_type"] = element.roof_type
                elem_data["surface_area"] = element.surface_area()

            elements.append(elem_data)

        return make_response(
            {
                "selected_count": len(elements),
                "elements": elements,
                "elements_by_type": summary["elements_by_type"],
            }
        )

    # Filter by category if specified
    if params.category:
        filtered_ids = [
            eid
            for eid in summary["selected_ids"]
            if state.get_element(eid)
            and state.get_element(eid).element_type == params.category
        ]
        return make_response(
            {
                "selected_count": len(filtered_ids),
                "selected_ids": filtered_ids,
                "category_filter": params.category,
            }
        )

    return make_response(summary)


async def _clear_selection(
    state: GeometryState, reasoning: str | None
) -> dict[str, Any]:
    """Clear all selections."""
    count = state.clear_selection()

    return make_response(
        {"cleared_count": count, "selected_count": 0},
        reasoning=reasoning,
    )


async def _select_by_type(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Select all elements of a specific type."""
    params = SelectByTypeParams(**args)

    # Get all elements of the specified type
    records = state.list_elements(category=params.element_type, limit=10000)
    element_ids = [r.id for r in records]

    if not element_ids:
        return make_response(
            {
                "selected_count": 0,
                "selected_ids": [],
                "element_type": params.element_type,
                "message": f"No elements of type '{params.element_type}' found",
            },
            reasoning=reasoning,
        )

    result = state.select_elements(element_ids, mode=params.mode)

    return make_response(
        {
            "selected_count": result["selected_count"],
            "selected_ids": result["selected_ids"],
            "element_type": params.element_type,
            "mode": params.mode,
            "matched_count": len(element_ids),
        },
        reasoning=reasoning,
    )


# =============================================================================
# Group Tool Handlers
# =============================================================================


async def _create_group(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Create a named group of elements."""
    params = CreateGroupParams(**args)

    group_id = state.create_group(
        params.name,
        params.element_ids,
        metadata=params.metadata,
    )

    group = state.get_group(group_id)

    return make_response(
        {
            "group_id": group_id,
            "name": params.name,
            "element_count": len(group["element_ids"]) if group else 0,
            "element_ids": group["element_ids"] if group else [],
        },
        reasoning=reasoning,
    )


async def _add_to_group(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Add elements to a group."""
    params = AddToGroupParams(**args)

    success = state.add_to_group(params.group_id, params.element_ids)

    if not success:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Group not found: {params.group_id}"
        )

    group = state.get_group(params.group_id)

    return make_response(
        {
            "group_id": params.group_id,
            "added_count": len(params.element_ids),
            "total_elements": len(group["element_ids"]) if group else 0,
        },
        reasoning=reasoning,
    )


async def _remove_from_group(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Remove elements from a group."""
    params = RemoveFromGroupParams(**args)

    success = state.remove_from_group(params.group_id, params.element_ids)

    if not success:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Group not found: {params.group_id}"
        )

    group = state.get_group(params.group_id)

    return make_response(
        {
            "group_id": params.group_id,
            "removed_count": len(params.element_ids),
            "remaining_elements": len(group["element_ids"]) if group else 0,
        },
        reasoning=reasoning,
    )


async def _delete_group(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Delete a group (elements remain)."""
    params = DeleteGroupParams(**args)

    success = state.delete_group(params.group_id)

    if not success:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Group not found: {params.group_id}"
        )

    return make_response(
        {"group_id": params.group_id, "deleted": True},
        reasoning=reasoning,
    )


async def _get_group(state: GeometryState, args: dict[str, Any]) -> dict[str, Any]:
    """Get a group by ID."""
    params = GetGroupParams(**args)

    group = state.get_group(params.group_id)

    if not group:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, f"Group not found: {params.group_id}"
        )

    if params.include_details:
        # Get full element details
        elements = []
        for eid in group["element_ids"]:
            record = state.get_element(eid)
            if record:
                elements.append(
                    {
                        "id": record.id,
                        "type": record.element_type,
                        "created_at": record.created_at.isoformat(),
                    }
                )

        return make_response(
            {
                "group_id": group["id"],
                "name": group["name"],
                "element_count": len(elements),
                "elements": elements,
                "created_at": group["created_at"],
                "metadata": group["metadata"],
            }
        )

    return make_response(
        {
            "group_id": group["id"],
            "name": group["name"],
            "element_count": len(group["element_ids"]),
            "element_ids": group["element_ids"],
            "created_at": group["created_at"],
            "metadata": group["metadata"],
        }
    )


async def _list_groups(state: GeometryState, args: dict[str, Any]) -> dict[str, Any]:
    """List all groups."""
    params = ListGroupsParams(**args)

    groups = state.list_groups()

    if not params.include_elements:
        # Return simplified list
        result = [
            {
                "group_id": g["id"],
                "name": g["name"],
                "element_count": g["element_count"],
            }
            for g in groups
        ]
    else:
        result = [
            {
                "group_id": g["id"],
                "name": g["name"],
                "element_count": g["element_count"],
                "element_ids": g["element_ids"],
            }
            for g in groups
        ]

    return make_response({"groups": result, "count": len(groups)})


async def _select_group(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Select all elements in a group."""
    params = SelectGroupParams(**args)

    result = state.select_group(params.group_id, mode=params.mode)

    if "error" in result:
        return make_error(ErrorCodes.ELEMENT_NOT_FOUND, result["error"])

    group = state.get_group(params.group_id)

    return make_response(
        {
            "group_id": params.group_id,
            "group_name": group["name"] if group else None,
            "selected_count": result["selected_count"],
            "selected_ids": result["selected_ids"],
            "mode": params.mode,
        },
        reasoning=reasoning,
    )


# =============================================================================
# Room Detection Tool Handlers
# =============================================================================


async def _detect_rooms(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Detect enclosed rooms from walls using topology graph analysis."""
    params = DetectRoomsParams(**args)

    # Get walls to analyze
    if params.wall_ids:
        # Use specified walls
        walls = []
        for wall_id in params.wall_ids:
            record = state.get_element(wall_id)
            if record and record.element_type == "wall":
                walls.append(record.element)
            else:
                return make_error(
                    ErrorCodes.ELEMENT_NOT_FOUND, f"Wall not found: {wall_id}"
                )
    else:
        # Use all walls in model
        wall_records = state.list_elements(category="wall")
        walls = [r["element"] for r in wall_records]

    if not walls:
        return make_response(
            {
                "rooms": [],
                "count": 0,
                "message": "No walls found to analyze",
            },
            reasoning=reasoning,
        )

    # Call Rust room detection via PyO3 binding
    try:
        rooms = pg.detect_rooms(walls, tolerance=params.tolerance)

        # Convert Python list of dicts to response format
        room_data = []
        for room in rooms:
            room_data.append({
                "id": room["id"],
                "area": room["area"],
                "centroid": room["centroid"],
                "boundary_count": room["boundary_count"],
                "is_exterior": room["is_exterior"],
            })

        return make_response(
            {
                "rooms": room_data,
                "count": len(room_data),
                "walls_analyzed": len(walls),
                "tolerance": params.tolerance,
            },
            reasoning=reasoning,
        )
    except Exception as e:
        return make_error(
            ErrorCodes.INTERNAL_ERROR,
            f"Room detection failed: {str(e)}",
        )


async def _analyze_wall_topology(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Analyze wall network topology and return graph information."""
    params = AnalyzeTopologyParams(**args)

    # Get walls to analyze
    if params.wall_ids:
        # Use specified walls
        walls = []
        for wall_id in params.wall_ids:
            record = state.get_element(wall_id)
            if record and record.element_type == "wall":
                walls.append(record.element)
            else:
                return make_error(
                    ErrorCodes.ELEMENT_NOT_FOUND, f"Wall not found: {wall_id}"
                )
    else:
        # Use all walls in model
        wall_records = state.list_elements(category="wall")
        walls = [r["element"] for r in wall_records]

    if not walls:
        return make_response(
            {
                "node_count": 0,
                "edge_count": 0,
                "room_count": 0,
                "interior_room_count": 0,
                "is_connected": True,
                "rooms": [],
                "message": "No walls found to analyze",
            },
            reasoning=reasoning,
        )

    # Call Rust topology analysis via PyO3 binding
    try:
        analysis = pg.analyze_wall_topology(walls, tolerance=params.tolerance)

        return make_response(
            {
                "node_count": analysis["node_count"],
                "edge_count": analysis["edge_count"],
                "room_count": analysis["room_count"],
                "interior_room_count": analysis["interior_room_count"],
                "is_connected": analysis["is_connected"],
                "rooms": analysis["rooms"],
                "walls_analyzed": len(walls),
                "tolerance": params.tolerance,
            },
            reasoning=reasoning,
        )
    except Exception as e:
        return make_error(
            ErrorCodes.INTERNAL_ERROR,
            f"Topology analysis failed: {str(e)}",
        )


# =============================================================================
# Clash Detection Tool Handlers
# =============================================================================


async def _detect_clashes(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Detect clashes within a set of elements."""
    params = DetectClashesParams(**args)

    # Get elements to analyze
    if params.element_ids:
        # Use specified elements
        elements_data = []
        for element_id in params.element_ids:
            record = state.get_element(element_id)
            if record:
                elem = record.element
                mesh = elem.to_mesh()
                bbox = mesh.bounding_box()
                if bbox:
                    elements_data.append((
                        element_id,
                        record.element_type,
                        (bbox["min"]["x"], bbox["min"]["y"], bbox["min"]["z"]),
                        (bbox["max"]["x"], bbox["max"]["y"], bbox["max"]["z"]),
                    ))
            else:
                return make_error(
                    ErrorCodes.ELEMENT_NOT_FOUND, f"Element not found: {element_id}"
                )
    else:
        # Use all elements in model
        all_records = state.list_elements(limit=10000)
        elements_data = []
        for record in all_records:
            elem = record.element
            mesh = elem.to_mesh()
            bbox = mesh.bounding_box()
            if bbox:
                elements_data.append((
                    record.id,
                    record.element_type,
                    (bbox["min"]["x"], bbox["min"]["y"], bbox["min"]["z"]),
                    (bbox["max"]["x"], bbox["max"]["y"], bbox["max"]["z"]),
                ))

    if len(elements_data) < 2:
        return make_response(
            {
                "clashes": [],
                "count": 0,
                "message": "Need at least 2 elements for clash detection",
            },
            reasoning=reasoning,
        )

    # Call Rust clash detection via PyO3 binding
    try:
        clashes = pg.detect_clashes(
            elements_data,
            tolerance=params.tolerance,
            clearance=params.clearance,
            ignore_same_type=params.ignore_same_type,
        )

        # Format clash results
        clash_data = []
        for clash in clashes:
            clash_data.append({
                "id": clash["id"],
                "element_a_id": clash["element_a_id"],
                "element_b_id": clash["element_b_id"],
                "element_a_type": clash["element_a_type"],
                "element_b_type": clash["element_b_type"],
                "clash_type": clash["clash_type"],
                "clash_point": clash["clash_point"],
                "distance": clash["distance"],
            })

        return make_response(
            {
                "clashes": clash_data,
                "count": len(clash_data),
                "elements_checked": len(elements_data),
                "tolerance": params.tolerance,
                "clearance": params.clearance,
            },
            reasoning=reasoning,
        )
    except Exception as e:
        return make_error(
            ErrorCodes.INTERNAL_ERROR,
            f"Clash detection failed: {str(e)}",
        )


async def _detect_clashes_between_sets(
    state: GeometryState, args: dict[str, Any], reasoning: str | None
) -> dict[str, Any]:
    """Detect clashes between two sets of elements."""
    params = DetectClashesBetweenSetsParams(**args)

    def get_elements_data(element_ids: list[str]) -> list | None:
        """Convert element IDs to clash detection format."""
        elements_data = []
        for element_id in element_ids:
            record = state.get_element(element_id)
            if not record:
                return None  # Signal element not found
            elem = record.element
            mesh = elem.to_mesh()
            bbox = mesh.bounding_box()
            if bbox:
                elements_data.append((
                    element_id,
                    record.element_type,
                    (bbox["min"]["x"], bbox["min"]["y"], bbox["min"]["z"]),
                    (bbox["max"]["x"], bbox["max"]["y"], bbox["max"]["z"]),
                ))
        return elements_data

    # Get set A elements
    set_a_data = get_elements_data(params.set_a_ids)
    if set_a_data is None:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, "One or more elements in set_a not found"
        )

    # Get set B elements
    set_b_data = get_elements_data(params.set_b_ids)
    if set_b_data is None:
        return make_error(
            ErrorCodes.ELEMENT_NOT_FOUND, "One or more elements in set_b not found"
        )

    if not set_a_data or not set_b_data:
        return make_response(
            {
                "clashes": [],
                "count": 0,
                "message": "Both sets need at least one element",
            },
            reasoning=reasoning,
        )

    # Call Rust clash detection via PyO3 binding
    try:
        clashes = pg.detect_clashes_between_sets(
            set_a_data,
            set_b_data,
            tolerance=params.tolerance,
            clearance=params.clearance,
        )

        # Format clash results
        clash_data = []
        for clash in clashes:
            clash_data.append({
                "id": clash["id"],
                "element_a_id": clash["element_a_id"],
                "element_b_id": clash["element_b_id"],
                "element_a_type": clash["element_a_type"],
                "element_b_type": clash["element_b_type"],
                "clash_type": clash["clash_type"],
                "clash_point": clash["clash_point"],
                "distance": clash["distance"],
            })

        return make_response(
            {
                "clashes": clash_data,
                "count": len(clash_data),
                "set_a_count": len(set_a_data),
                "set_b_count": len(set_b_data),
                "tolerance": params.tolerance,
                "clearance": params.clearance,
            },
            reasoning=reasoning,
        )
    except Exception as e:
        return make_error(
            ErrorCodes.INTERNAL_ERROR,
            f"Clash detection failed: {str(e)}",
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
