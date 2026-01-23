"""Root pytest configuration - adds MCP server paths for import resolution."""

import sys
from pathlib import Path

SERVER_ROOT = Path(__file__).parent
sys.path.insert(0, str(SERVER_ROOT))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "geometry-server"))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "spatial-server"))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "validation-server"))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "documentation-server"))
