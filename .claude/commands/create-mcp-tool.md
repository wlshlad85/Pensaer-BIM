# /create-mcp-tool

Scaffold a new MCP tool with proper structure and tests.

## Arguments

- `$TOOL_NAME` - Name of the tool (e.g., `detect_clashes`)
- `$SERVER` - Which MCP server (geometry, spatial, validation, documentation)

## Pre-compute context

```bash
echo "=== Existing MCP Tools ==="
ls server/mcp-servers/*/tools/ 2>/dev/null || echo "No tools yet"
echo ""
echo "=== Server Structure ==="
ls -la server/mcp-servers/
```

## Instructions

1. Create tool file at `server/mcp-servers/{SERVER}-server/tools/{TOOL_NAME}.py`
2. Follow this template:

```python
"""
{TOOL_NAME} - [Brief description]

MCP Tool for Pensaer BIM Platform
"""

from typing import Any
from pydantic import BaseModel, Field


class {ToolName}Input(BaseModel):
    """Input schema for {TOOL_NAME}"""
    # Add typed fields with descriptions
    pass


class {ToolName}Output(BaseModel):
    """Output schema for {TOOL_NAME}"""
    success: bool
    # Add result fields
    pass


async def {tool_name}(input: {ToolName}Input) -> {ToolName}Output:
    """
    [Detailed description of what this tool does]
    
    Args:
        input: Validated input parameters
        
    Returns:
        {ToolName}Output with results
        
    Raises:
        ValueError: If input validation fails
    """
    # Implementation
    pass
```

3. Create test file at `server/mcp-servers/{SERVER}-server/tests/test_{TOOL_NAME}.py`
4. Register tool in server's `__init__.py`
5. Update `server/CLAUDE.md` with new tool documentation

## Naming Conventions

- Tool function: `snake_case` (e.g., `detect_clashes`)
- Input/Output classes: `PascalCase` + `Input`/`Output` suffix
- File name: `{tool_name}.py`
