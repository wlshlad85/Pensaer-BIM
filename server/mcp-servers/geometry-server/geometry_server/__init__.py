"""Pensaer Geometry MCP Server.

This server provides BIM geometry tools for AI agents via MCP protocol.
"""

__version__ = "0.1.0"

from .geometry_mcp import main

__all__ = ["main", "__version__"]
