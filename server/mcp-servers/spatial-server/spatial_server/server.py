"""Pensaer Spatial MCP Server.

This server exposes spatial analysis tools via the Model Context Protocol (MCP),
enabling AI agents to analyze spatial relationships in building models.

Tools planned:
- create_room - Create room from boundary
- compute_adjacency - Find adjacent rooms
- find_nearest - Find nearest elements
- compute_area - Calculate areas
- check_clearance - Verify clearances

Usage:
    python -m spatial_server  # Run via stdio
"""

import asyncio
import logging
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

logger = logging.getLogger(__name__)

# Tool definitions (stubs for now)
TOOLS = [
    Tool(
        name="create_room",
        description="Create a room from boundary walls",
        inputSchema={
            "type": "object",
            "properties": {
                "boundary_wall_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "IDs of walls forming the room boundary",
                },
                "name": {
                    "type": "string",
                    "description": "Room name",
                },
                "function": {
                    "type": "string",
                    "description": "Room function (e.g., 'Office', 'Corridor')",
                },
            },
            "required": ["boundary_wall_ids"],
        },
    ),
    Tool(
        name="compute_adjacency",
        description="Find rooms adjacent to a given room",
        inputSchema={
            "type": "object",
            "properties": {
                "room_id": {
                    "type": "string",
                    "description": "ID of the room to analyze",
                },
            },
            "required": ["room_id"],
        },
    ),
    Tool(
        name="find_nearest",
        description="Find nearest elements to a point",
        inputSchema={
            "type": "object",
            "properties": {
                "x": {"type": "number", "description": "X coordinate in mm"},
                "y": {"type": "number", "description": "Y coordinate in mm"},
                "radius": {"type": "number", "description": "Search radius in mm"},
                "element_types": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Element types to search for",
                },
            },
            "required": ["x", "y", "radius"],
        },
    ),
    Tool(
        name="compute_area",
        description="Calculate the area of a room or region",
        inputSchema={
            "type": "object",
            "properties": {
                "room_id": {
                    "type": "string",
                    "description": "ID of the room",
                },
            },
            "required": ["room_id"],
        },
    ),
    Tool(
        name="check_clearance",
        description="Verify clearance requirements around an element",
        inputSchema={
            "type": "object",
            "properties": {
                "element_id": {
                    "type": "string",
                    "description": "ID of the element (e.g., door)",
                },
                "clearance_type": {
                    "type": "string",
                    "enum": ["door_swing", "wheelchair", "furniture"],
                    "description": "Type of clearance to check",
                },
            },
            "required": ["element_id"],
        },
    ),
]


def create_server() -> Server:
    """Create and configure the MCP server."""
    server = Server("pensaer-spatial-server")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        return TOOLS

    @server.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
        logger.info(f"Tool called: {name} with args: {arguments}")

        # All tools return not-implemented for now
        return [
            TextContent(
                type="text",
                text=f"Tool '{name}' is not yet implemented. "
                f"Received arguments: {arguments}",
            )
        ]

    return server


async def run_server() -> None:
    """Run the MCP server via stdio."""
    server = create_server()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream, write_stream, server.create_initialization_options()
        )


def main() -> None:
    """Entry point for the spatial MCP server."""
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
