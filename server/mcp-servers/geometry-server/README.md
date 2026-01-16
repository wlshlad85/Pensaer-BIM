# Pensaer Geometry MCP Server

MCP server for BIM geometry operations, enabling AI agents to create and manipulate building elements.

## Features

### Element Creation Tools
- `create_wall` - Create a wall between two points
- `create_rectangular_walls` - Create 4 walls forming a rectangle
- `create_floor` - Create a rectangular floor slab
- `create_room` - Create a room element with name and number
- `create_simple_building` - Create a complete building shell

### Opening Tools
- `place_door` - Place a door in a wall
- `place_window` - Place a window in a wall

### Join Tools
- `detect_joins` - Detect wall joins (L-joins, T-joins, etc.)

### Element Operations
- `get_element` - Get an element by UUID
- `list_elements` - List elements with optional filtering
- `delete_element` - Delete one or more elements

### Mesh Tools
- `generate_mesh` - Generate triangle mesh (JSON or OBJ format)
- `validate_mesh` - Validate mesh integrity

### State Tools
- `get_state_summary` - Get summary of current model state

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Install the pensaer_geometry wheel (from kernel build)
pip install path/to/pensaer_geometry-*.whl
```

## Usage

### As MCP Server (stdio)

```bash
cd server/mcp-servers/geometry-server
python -m geometry_server
```

### Claude Code Configuration

Add to your Claude Code MCP settings (`~/.claude.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "pensaer-geometry": {
      "command": "python",
      "args": ["-m", "geometry_server"],
      "cwd": "C:/Users/RICHARD/Pensaer-BIM/server/mcp-servers/geometry-server",
      "env": {
        "PENSAER_MODEL_ID": "your-model-id"
      }
    }
  }
}
```

## Example Tool Usage

### Create a Simple Building

```json
{
  "tool": "create_simple_building",
  "arguments": {
    "min_point": [0, 0],
    "max_point": [10, 8],
    "wall_height": 3.0,
    "wall_thickness": 0.2,
    "floor_thickness": 0.3,
    "room_name": "Main Hall",
    "room_number": "001",
    "reasoning": "Creating main hall as per floor plan"
  }
}
```

### Place a Door

```json
{
  "tool": "place_door",
  "arguments": {
    "wall_id": "uuid-from-create_wall",
    "offset": 2.5,
    "width": 0.9,
    "height": 2.1,
    "door_type": "single",
    "swing": "left",
    "reasoning": "Main entrance door"
  }
}
```

### Generate Mesh for Export

```json
{
  "tool": "generate_mesh",
  "arguments": {
    "element_id": "uuid-of-wall",
    "format": "obj"
  }
}
```

## Response Format

All tools return a consistent response envelope:

```json
{
  "success": true,
  "data": {
    // Tool-specific response data
  },
  "event_id": "uuid",
  "timestamp": "2026-01-15T10:30:00Z",
  "warnings": [],
  "audit": {
    "user_id": null,
    "agent_id": null,
    "reasoning": "AI agent reasoning"
  }
}
```

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32602 | INVALID_PARAMS | Invalid tool parameters |
| 1001 | ELEMENT_NOT_FOUND | Element UUID not found |
| 1002 | CONSTRAINT_VIOLATION | Operation violates constraints |
| 1003 | PERMISSION_DENIED | Operation not authorized |
| 1004 | APPROVAL_REQUIRED | Operation requires approval |
| 1005 | INTERNAL_ERROR | Internal server error |

## Architecture

```
geometry-server/
├── requirements.txt          # Dependencies
├── README.md                 # This file
└── geometry_server/          # Python package
    ├── __init__.py           # Package marker
    ├── __main__.py           # Entry point
    ├── server.py             # MCP server and tool handlers
    ├── schemas.py            # Pydantic models for tool parameters
    └── state.py              # In-memory element storage
```

## Dependencies

- `mcp` - Model Context Protocol SDK
- `pydantic` - Data validation
- `pensaer-geometry` - Rust geometry kernel with PyO3 bindings

## Related Documentation

- [TOOL_SURFACE.md](../../../docs/mcp/TOOL_SURFACE.md) - Complete tool inventory
- [SERVER_DESIGN.md](../../../docs/mcp/SERVER_DESIGN.md) - Server architecture
- [Kernel CLAUDE.md](../../../kernel/CLAUDE.md) - Rust kernel guide
