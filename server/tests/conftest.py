"""Pytest configuration for server tests."""

import sys
from pathlib import Path

import pytest

# Add server paths to Python path for imports
SERVER_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(SERVER_ROOT))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "geometry-server"))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "spatial-server"))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "validation-server"))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "documentation-server"))


@pytest.fixture(scope="session")
def event_loop_policy():
    """Use standard event loop policy."""
    import asyncio
    return asyncio.DefaultEventLoopPolicy()
