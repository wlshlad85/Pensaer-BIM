"""Entry point for running the Geometry MCP Server.

Usage:
    python -m geometry_server
"""

import asyncio
from .geometry_mcp import main

if __name__ == "__main__":
    asyncio.run(main())
