# Pensaer Server - Python/MCP Guidance

## Overview
FastAPI server with 4 MCP tool servers for BIM operations.

## Structure
```
server/
├── main.py              # FastAPI app entry
├── mcp-servers/         # MCP tool implementations
│   ├── geometry/        # Wall, opening, mesh tools
│   ├── spatial/         # Room, adjacency tools
│   ├── validation/      # Compliance, clash tools
│   └── documentation/   # Schedule, report tools
└── utils/               # Shared utilities
```

## MCP Tool Template
```python
from mcp.server import Server
from mcp.types import Tool, TextContent

server = Server("tool-name")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="tool_action",
            description="What it does",
            inputSchema={
                "type": "object",
                "properties": {...},
                "required": [...]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    match name:
        case "tool_action":
            result = await do_action(**arguments)
            return [TextContent(type="text", text=json.dumps(result))]
```

## Type Hints
- Required on all function signatures
- Use Pydantic models for request/response
- Use `TypedDict` for complex dict structures

## Testing
```bash
pytest -q                    # Run all tests
pytest -k "test_wall"        # Run specific tests
pytest --cov=server          # With coverage
```

## Don't
- Skip type hints
- Use `Any` without justification
- Catch bare `Exception`
