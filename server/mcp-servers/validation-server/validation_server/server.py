"""Pensaer Validation MCP Server.

This server exposes compliance validation tools via the Model Context Protocol (MCP),
enabling AI agents to check building code compliance.

Tools planned:
- validate_model - Run all validation rules
- check_fire_compliance - Fire rating validation
- check_accessibility - ADA/DDA compliance
- detect_clashes - Clash detection
- check_egress - Egress path validation

Usage:
    python -m validation_server  # Run via stdio
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
        name="validate_model",
        description="Run all validation rules against the model",
        inputSchema={
            "type": "object",
            "properties": {
                "categories": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Validation categories to run (empty = all)",
                },
            },
        },
    ),
    Tool(
        name="check_fire_compliance",
        description="Check fire rating compliance for elements",
        inputSchema={
            "type": "object",
            "properties": {
                "element_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Element IDs to check (empty = all)",
                },
            },
        },
    ),
    Tool(
        name="check_accessibility",
        description="Check ADA/DDA accessibility compliance",
        inputSchema={
            "type": "object",
            "properties": {
                "element_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Element IDs to check (empty = all)",
                },
                "standard": {
                    "type": "string",
                    "enum": ["ADA", "DDA", "ISO21542"],
                    "description": "Accessibility standard to check against",
                    "default": "ADA",
                },
            },
        },
    ),
    Tool(
        name="detect_clashes",
        description="Detect geometric clashes between elements",
        inputSchema={
            "type": "object",
            "properties": {
                "element_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Element IDs to check (empty = all)",
                },
                "tolerance_mm": {
                    "type": "number",
                    "description": "Clash tolerance in mm",
                    "default": 1,
                },
            },
        },
    ),
    Tool(
        name="check_egress",
        description="Validate egress paths and travel distances",
        inputSchema={
            "type": "object",
            "properties": {
                "room_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Room IDs to check egress from",
                },
                "max_travel_distance_m": {
                    "type": "number",
                    "description": "Maximum travel distance in meters",
                    "default": 45,
                },
            },
        },
    ),
]


def create_server() -> Server:
    """Create and configure the MCP server."""
    server = Server("pensaer-validation-server")

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
    """Entry point for the validation MCP server."""
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
