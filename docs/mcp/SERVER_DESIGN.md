# Pensaer MCP Server Design

**Version:** 1.0  
**Date:** January 15, 2026  
**Status:** Authoritative Reference  
**Source:** Extracted from pensaer-a canonical architecture

---

## Overview

Pensaer exposes BIM functionality via **Model Context Protocol (MCP)** servers, enabling AI agents to interact with building models through a standardized JSON-RPC 2.0 interface.

---

## Server Organization

```
pensaer-mcp-servers/
├── geometry-server/       # Element creation/modification
├── spatial-server/        # Analysis and relationships
├── validation-server/     # Rules and compliance
└── documentation-server/  # Schedules and views
```

Each server is:
- **Stateless** — All state lives in the model server (Layer B)
- **Async** — Non-blocking operations via Python asyncio
- **Typed** — Pydantic v2 models for all parameters and responses
- **Auditable** — Every operation logged with reasoning

---

## Server Specifications

### 1. Geometry Server

**Purpose:** Element creation, modification, and geometric operations

**Transport:** stdio (local) or SSE (remote)

**Tools:**

| Tool | Parameters | Returns |
|------|-----------|---------|
| `create_wall` | start, end, height, thickness, wall_type, level_id | wall_id, event_id |
| `create_floor` | boundary_points, thickness, level_id | floor_id, event_id |
| `create_opening` | host_id, location, width, height, opening_type | opening_id, event_id |
| `boolean_operation` | element_a, element_b, operation_type | result_id, event_id |
| `join_elements` | element_ids, join_type | join_id, event_id |
| `modify_parameter` | element_id, parameter_name, value | event_id |

---

### 2. Spatial Server

**Purpose:** Spatial analysis, queries, and relationship management

**Tools:**

| Tool | Parameters | Returns |
|------|-----------|---------|
| `room_analysis` | room_id | area, volume, perimeter, adjacencies |
| `circulation_check` | model_id, start, end | path, distance, obstacles |
| `adjacency_matrix` | level_id | matrix[room_id][room_id] |
| `spatial_query` | bounds, categories | element_ids[] |
| `path_finding` | from_room, to_room | path[], distance |
| `bounding_analysis` | element_id | bounding_elements[] |

---

### 3. Validation Server

**Purpose:** Compliance checking, clash detection, rule enforcement

**Tools:**

| Tool | Parameters | Returns |
|------|-----------|---------|
| `clash_detection` | source_category, target_category, tolerance | clashes[] |
| `code_compliance` | model_id, standard, severity_threshold | issues[] |
| `accessibility_check` | model_id, standard | violations[] |
| `validate_constraints` | element_ids | constraint_errors[] |
| `fire_rating_check` | model_id | violations[] |
| `egress_analysis` | model_id, occupancy | paths[], compliance |

---

### 4. Documentation Server

**Purpose:** Schedule generation, view creation, export operations

**Tools:**

| Tool | Parameters | Returns |
|------|-----------|---------|
| `generate_schedule` | category, parameters, filters | schedule_data |
| `create_section` | cut_plane, depth, scale | view_id |
| `quantity_takeoff` | categories, grouping | quantities[] |
| `export_ifc` | model_id, schema_version, mvd | file_path |
| `export_bcf` | issues[], project_info | file_path |
| `create_sheet` | views[], title_block | sheet_id |

---

## Tool Definition Pattern

```python
from mcp.server import Server
from mcp.types import Tool
from pydantic import BaseModel, Field
from uuid import uuid4

server = Server("pensaer-geometry")

class CreateWallParams(BaseModel):
    """Parameters for creating a wall element."""
    start: tuple[float, float] = Field(..., description="Start point (x, y) in mm")
    end: tuple[float, float] = Field(..., description="End point (x, y) in mm")
    height: float = Field(3000.0, description="Wall height in mm", gt=0)
    thickness: float = Field(200.0, description="Wall thickness in mm", gt=0)
    wall_type: str = Field("exterior", description="Wall type: exterior|interior|partition")
    level_id: str = Field(..., description="UUID of hosting level")

@server.tool()
async def create_wall(params: CreateWallParams) -> dict:
    """Create a wall between two points in the BIM model.
    
    The wall is created on the specified level with the given dimensions.
    Returns the wall ID and event ID for tracking.
    """
    event = WallCreatedEvent(
        wall_id=uuid4(),
        start=params.start,
        end=params.end,
        height=params.height,
        thickness=params.thickness,
        wall_type=params.wall_type,
        level_id=params.level_id,
        created_by=get_current_user(),
        timestamp=utc_now()
    )
    
    await event_store.append(event)
    await regen_engine.propagate(event)
    
    return {
        "wall_id": str(event.wall_id),
        "event_id": str(event.id),
        "status": "created"
    }
```

---

## Error Handling

All tools return structured errors:

```python
class MCPError(BaseModel):
    code: int
    message: str
    data: dict | None = None

# Standard error codes
INVALID_PARAMS = -32602
ELEMENT_NOT_FOUND = 1001
CONSTRAINT_VIOLATION = 1002
PERMISSION_DENIED = 1003
APPROVAL_REQUIRED = 1004
```

---

## Governance Integration

Every tool call passes through the governance layer:

```python
@server.tool()
async def delete_elements(params: DeleteParams) -> dict:
    # 1. Check permissions
    if not await governance.check_permission(
        user=get_current_user(),
        action=Permission.DELETE,
        scope=params.element_ids
    ):
        raise MCPError(PERMISSION_DENIED, "Delete not authorized")
    
    # 2. Check approval gate
    approval = await governance.check_approval_gate(
        operation_type=EventType.ELEMENT_DELETED,
        affected_count=len(params.element_ids)
    )
    
    if approval.required:
        # Queue for approval, return pending status
        return await queue_for_approval(params, approval.reason)
    
    # 3. Execute with audit trail
    result = await execute_delete(params)
    await audit_log.record(
        tool="delete_elements",
        params=params,
        result=result,
        user=get_current_user(),
        reasoning=params.reasoning  # From AI agent
    )
    
    return result
```

---

## Transport Configuration

### Local (stdio)

```json
{
  "mcpServers": {
    "pensaer-geometry": {
      "command": "python",
      "args": ["-m", "pensaer.mcp.geometry"],
      "env": {
        "PENSAER_DB_URL": "postgresql://...",
        "PENSAER_MODEL_ID": "..."
      }
    }
  }
}
```

### Remote (SSE)

```json
{
  "mcpServers": {
    "pensaer-geometry": {
      "url": "https://api.pensaer.dev/mcp/geometry",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer ${PENSAER_API_KEY}"
      }
    }
  }
}
```

---

## Related Documents

- [TOOL_SURFACE.md](./TOOL_SURFACE.md) — Complete tool inventory with parameters
- [CANONICAL_ARCHITECTURE.md](../architecture/CANONICAL_ARCHITECTURE.md) — System architecture
- [GLOSSARY.md](../architecture/GLOSSARY.md) — Terminology reference

---

*MCP servers are the primary integration point for AI agents with Pensaer.*
