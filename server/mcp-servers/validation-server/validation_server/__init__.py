"""Pensaer Validation MCP Server.

This server provides compliance validation tools for AI agents via MCP protocol.
"""

__version__ = "0.1.0"

from .server import main, create_server

__all__ = ["main", "create_server", "__version__"]
