"""Pensaer Spatial MCP Server.

This server provides spatial analysis tools for AI agents via MCP protocol.
"""

__version__ = "0.1.0"

from .server import main, create_server

__all__ = ["main", "create_server", "__version__"]
