# Part 7: The Python Server

**Pensaer Engineering Encyclopedia — Definitive Reference**

*Written by Max, CTO of Pensaer-BIM*

> *"The server is the nervous system. Every MCP tool call, every validation rule, every mesh computation flows through this layer. It translates AI intent into building geometry."*

---

## Table of Contents

1. [Server Architecture](#1-server-architecture)
2. [MCP Geometry Server](#2-mcp-geometry-server)
3. [MCP Spatial Server](#3-mcp-spatial-server)
4. [MCP Validation Server](#4-mcp-validation-server)
5. [MCP Documentation Server](#5-mcp-documentation-server)
6. [Server Application (server/app/)](#6-server-application)
7. [API Endpoints](#7-api-endpoints)
8. [Configuration](#8-configuration)
9. [Testing](#9-testing)
10. [Rust Kernel Integration](#10-rust-kernel-integration)

---

## 1. Server Architecture

### 1.1 Overview

The Pensaer Python server is a **FastAPI application** (`server/main.py`) that unifies four independent MCP (Model Context Protocol) servers into a single HTTP/WebSocket API. The React client never talks to MCP servers directly — it talks to FastAPI, which dispatches to the appropriate tool handler.

```
┌─────────────┐     HTTP/WS      ┌──────────────────────────────────────────┐
│  React App  │ ───────────────→  │           FastAPI (main.py)              │
│  (Vite)     │  POST /mcp/tools  │                                          │
│  port 5173  │  WS /mcp/ws       │  ┌──────────┐ ┌─────────┐ ┌───────────┐ │
└─────────────┘                   │  │ Geometry  │ │ Spatial │ │Validation │ │
                                  │  │  Server   │ │ Server  │ │  Server   │ │
                                  │  └──────────┘ └─────────┘ └───────────┘ │
                                  │  ┌───────────────┐                       │
                                  │  │ Documentation │                       │
                                  │  │    Server     │                       │
                                  │  └───────────────┘                       │
                                  └──────────────────────────────────────────┘
                                           │           │           │
                                  ┌────────┴──┐  ┌─────┴───┐  ┌───┴────┐
                                  │PostgreSQL │  │  Redis  │  │ MinIO  │
                                  │+ PostGIS  │  │ Cache   │  │Storage │
                                  └───────────┘  └─────────┘  └────────┘
```

### 1.2 FastAPI Application Structure

**Entry point:** `server/main.py`

The application boots via:
```bash
cd server && uvicorn main:app --reload --port 8000
# or
cd server && python main.py
```

**Startup sequence:**
1. `sys.path` manipulation adds all MCP server packages
2. Import tool handlers from each MCP server
3. Import tool definitions (`TOOLS` lists of `mcp.types.Tool`)
4. Build `TOOL_CATALOG` (name → metadata) and `TOOL_HANDLERS` (name → async function)
5. Register middleware stack (logging → security headers → rate limiting → CORS)
6. FastAPI `lifespan` logs tool count on startup

**Key data structures:**

```python
TOOL_HANDLERS: dict[str, Any]     # tool_name → async handler function
TOOL_CATALOG: dict[str, dict]     # tool_name → {name, description, category, input_schema}
```

### 1.3 How MCP Servers Are Mounted/Connected

Each MCP server is a standalone package under `server/mcp-servers/`:

```
server/mcp-servers/
├── geometry-server/geometry_server/
├── spatial-server/spatial_server/
├── validation-server/validation_server/
└── documentation-server/documentation_server/
```

Each server has:
- `server.py` — Tool definitions (`TOOLS` list) and handler functions
- `__main__.py` — Standalone stdio runner (for direct MCP protocol use)
- `state.py` — In-memory state management (geometry and spatial servers)
- `schemas.py` — Pydantic validation schemas (geometry server)

**Connection method:** The servers are NOT mounted as sub-applications or run as separate processes. Instead, `main.py` **directly imports** their handler functions and tool definitions:

```python
from spatial_server.server import TOOLS as SPATIAL_TOOLS, _compute_adjacency, ...
from validation_server.server import TOOLS as VALIDATION_TOOLS, _validate_model, ...
from documentation_server.server import TOOLS as DOCUMENTATION_TOOLS, _generate_schedule, ...
from geometry_server.geometry_mcp import TOOLS as GEOMETRY_TOOLS
from geometry_server.geometry_fallback import GEOMETRY_HANDLERS
```

This means all tools run **in-process** within the FastAPI server. The standalone MCP stdio interface (`__main__.py`) exists for direct AI agent integration without HTTP.

### 1.4 MCP Bridge Design

The bridge between HTTP clients and MCP tools is simple and explicit:

**HTTP mode** (`POST /mcp/tools/{tool_name}`):
1. Client sends `{"arguments": {...}}`
2. FastAPI looks up handler in `TOOL_HANDLERS[tool_name]`
3. Calls `await handler(arguments)`
4. Wraps result in `ToolCallResponse` envelope with `event_id` and `timestamp`

**WebSocket mode** (`WS /mcp/ws`):
1. Client connects, sends JSON-RPC 2.0 messages
2. `tools/list` → returns all tools from `TOOL_CATALOG`
3. `tools/call` → looks up handler, calls it, returns result
4. Unknown methods → JSON-RPC error code `-32601`

**Request/Response models:**

```python
class ToolCallRequest(BaseModel):
    arguments: dict[str, Any] = Field(default_factory=dict)

class ToolCallResponse(BaseModel):
    success: bool
    data: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
    event_id: str | None = None      # UUID for event sourcing
    timestamp: str                     # ISO 8601 UTC
```

### 1.5 Event Sourcing Pattern

Every tool handler generates an `event_id` (UUID v4) for each operation. The `GeometryState` class records events in an in-memory log:

```python
class GeometryState:
    _events: list[dict[str, Any]]  # Append-only event log

    def _record_event(self, event_type: str, data: dict) -> str:
        event = {
            "id": str(uuid4()),
            "type": event_type,    # e.g., "element_created", "selection_changed"
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._events.append(event)
```

**Event types recorded:**
- `element_created` — New wall, floor, door, window, room, roof
- `element_modified` — Property/geometry change
- `element_deleted` — Element removed
- `selection_changed` — Selection add/remove/replace/toggle
- `selection_cleared` — All selections cleared
- `group_created` / `group_modified` / `group_deleted` — Group lifecycle

**Current state:** In-memory only. Production will persist to PostgreSQL event store and reconstruct state from the event log (as noted in `state.py` comments).

### 1.6 Database Schema (PostgreSQL + PostGIS)

**Image:** `postgis/postgis:16-3.4-alpine`

**Connection:** `postgresql://pensaer:pensaer@postgres:5432/pensaer`

**Alembic migrations:** `server/migrations/env.py` configures async Alembic with `asyncpg` driver. Currently `target_metadata = None` — schema is not yet defined in SQLAlchemy models.

The health endpoint tests DB connectivity:
```python
engine = create_async_engine(db_url.replace("postgresql://", "postgresql+asyncpg://"))
async with engine.connect() as conn:
    await conn.execute(text("SELECT 1"))
```

**Planned schema** (from architecture docs): Event store tables for event sourcing, PostGIS columns for spatial indexing.

### 1.7 Redis Caching Layer

**Image:** `redis:7-alpine`

**Connection:** `redis://redis:6379`

**Configuration:** `appendonly yes`, `maxmemory 256mb`, `maxmemory-policy allkeys-lru`

Currently used for:
- Health check connectivity verification (`redis.from_url(redis_url); await r.ping()`)
- Planned: Tool result caching, pub/sub for real-time updates, session management

### 1.8 MinIO Object Storage

**Image:** `minio/minio:latest`

**Ports:** API `9000`, Console `9001`

**Credentials:** `pensaer` / `pensaer123`

Planned for storing IFC files, model snapshots, generated reports, and BCF exports.

### 1.9 Middleware Stack

Applied in reverse order (last added = first executed):

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 (outer) | `RequestLoggingMiddleware` | Logs method, path, status, duration. Adds `X-Response-Time` header. Skips `/health`. |
| 2 | `SecurityHeadersMiddleware` | Adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`. HSTS in production. |
| 3 | `RateLimitMiddleware` | In-memory per-IP rate limiting. Default 100 req/min. Skips `/health` and `compute_area` paths. Returns 429 with `retry_after: 60`. |
| 4 (inner) | `CORSMiddleware` | Allows `localhost:5173`, `localhost:3000`, `127.0.0.1:5173`. Production adds `pensaer.io` domains. |

### 1.10 WebSocket Connection Manager

```python
class ConnectionManager:
    active_connections: list[WebSocket]

    async def connect(websocket)      # Accept and track
    def disconnect(websocket)         # Remove from tracking
    async def send_json(ws, data)     # Send to one
    async def broadcast(data)         # Send to all
```

Used by `/mcp/ws` endpoint for real-time bidirectional MCP communication.

---

## 2. MCP Geometry Server

**Package:** `server/mcp-servers/geometry-server/geometry_server/`

**Files:**
- `geometry_mcp.py` — MCP server with Rust kernel integration (42 tools, 3078 lines)
- `geometry_fallback.py` — Pure Python fallback (17 handler functions)
- `schemas.py` — Pydantic validation schemas (30+ schema classes)
- `self_healing.py` — BIM-specific argument healing, circuit breaker
- `state.py` — In-memory element/selection/group/event state
- `__init__.py`, `__main__.py` — Package and stdio entry point

### 2.1 Architecture

The geometry server has a **dual-mode** design:

1. **Rust mode** — Imports `pensaer_geometry` (PyO3 bindings), creates elements via `pg.create_wall()`, etc.
2. **Python fallback** — Pure Python dataclasses (`Wall`, `Floor`, `Room`, `Door`, `Window`, `Roof`) with property calculations

Both modes register handlers in `GEOMETRY_HANDLERS` dict. The fallback is always available; the Rust path is used when the kernel is compiled and importable.

**Self-healing pipeline:**
```
Raw args → heal_tool_args() → Schema validation → Handler → Response
              │                      │
              ├── BIM semantic aliases (start_point → start)
              ├── Fuzzy matching (thicness → thickness, 75% threshold)
              └── Circuit breaker (disables after 5 failures)
```

### 2.2 State Management

```python
class GeometryState:
    _elements: dict[str, ElementRecord]   # id → {element, type, created_at, level_id, metadata}
    _joins: dict[str, Any]                # id → join object
    _events: list[dict]                   # Append-only event log
    _selected: set[str]                   # Currently selected element IDs
    _groups: dict[str, dict]              # id → {name, element_ids, metadata}
```

**Global singleton:** `get_state()` returns/creates the single instance. `reset_state()` for testing.

### 2.3 Tool Reference

#### 2.3.1 Element Creation Tools

---

**`create_wall`**

Create a wall element between two points.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start` | `[float, float]` | ✅ | — | Start point (x, y) in meters |
| `end` | `[float, float]` | ✅ | — | End point (x, y) in meters |
| `height` | `float` | — | `3.0` | Wall height in meters |
| `thickness` | `float` | — | `0.2` | Wall thickness in meters |
| `wall_type` | `string` | — | `null` | `basic`, `structural`, `curtain`, `retaining` |
| `material` | `string` | — | `null` | `concrete`, `brick`, `timber`, `steel`, `masonry`, `drywall` |
| `level_id` | `string` | — | `null` | UUID of hosting level |
| `reasoning` | `string` | — | `null` | AI agent reasoning for audit trail |

**Validation:** Minimum wall length 100mm (0.1m). Wall type and material are case-insensitive enum validated.

**Example call:**
```json
POST /mcp/tools/create_wall
{
  "arguments": {
    "start": [0.0, 0.0],
    "end": [5.0, 0.0],
    "height": 3.0,
    "thickness": 0.2,
    "wall_type": "structural",
    "material": "concrete"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wall_id": "a1b2c3d4-...",
    "start": [0.0, 0.0],
    "end": [5.0, 0.0],
    "length": 5.0,
    "height": 3.0,
    "thickness": 0.2,
    "wall_type": "structural",
    "material": "concrete"
  },
  "event_id": "e5f6g7h8-...",
  "timestamp": "2025-01-15T12:00:00Z",
  "warnings": [],
  "audit": { "reasoning": null }
}
```

**Test coverage:** `test_geometry_tools.py::TestCreateWallParams` — valid wall, wall types, invalid types, defaults, materials, minimum length, zero length, diagonal length.

---

**`create_rectangular_walls`**

Create 4 walls forming a closed rectangle.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `min_point` | `[float, float]` | ✅ | — | Minimum corner (x, y) |
| `max_point` | `[float, float]` | ✅ | — | Maximum corner (x, y) |
| `height` | `float` | — | `3.0` | Wall height in meters |
| `thickness` | `float` | — | `0.2` | Wall thickness in meters |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** `{ wall_ids: [4 UUIDs], count: 4, dimensions: { width, depth, height } }`

**Fallback:** Creates 4 individual `Wall` objects at the rectangle corners: `(min_x, min_y) → (max_x, min_y) → (max_x, max_y) → (min_x, max_y) → (min_x, min_y)`.

---

**`create_floor`**

Create a rectangular floor slab element.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `min_point` | `[float, float]` | ✅ | — | Minimum corner |
| `max_point` | `[float, float]` | ✅ | — | Maximum corner |
| `thickness` | `float` | — | `0.3` | Floor thickness in meters |
| `floor_type` | `string` | — | `null` | `slab`, `suspended`, `foundation` |
| `level_id` | `string` | — | `null` | Hosting level UUID |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** `{ floor_id, area, thickness, floor_type, volume }`

---

**`create_room`**

Create a rectangular room/space element with name and number.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | `string` | ✅ | — | Room name (e.g., "Living Room") |
| `number` | `string` | ✅ | — | Room number (e.g., "101") |
| `min_point` | `[float, float]` | ✅ | — | Minimum corner |
| `max_point` | `[float, float]` | ✅ | — | Maximum corner |
| `height` | `float` | — | `3.0` | Room height in meters |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** `{ room_id, name, number, area, volume, perimeter }`

---

**`create_roof`**

Create a roof element supporting flat, gable, hip, shed, and mansard types.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `min_point` | `[float, float]` | ✅ | — | Minimum corner |
| `max_point` | `[float, float]` | ✅ | — | Maximum corner |
| `thickness` | `float` | — | `0.25` | Roof thickness in meters |
| `roof_type` | `string` | — | `"flat"` | `flat`, `gable`, `hip`, `shed`, `mansard` |
| `slope_degrees` | `float` | — | `30.0` | Slope angle (0–85°) |
| `ridge_along_x` | `bool` | — | `true` | Ridge direction |
| `eave_overhang` | `float` | — | `0.3` | Eave overhang in meters |
| `base_elevation` | `float` | — | `0.0` | Base elevation (wall height) |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** `{ roof_id, roof_type, slope_degrees, footprint_area, surface_area, eave_overhang }`

**Test coverage:** `test_geometry_tools.py::TestCreateRoofParams` — valid roof, all 5 roof types.

---

**`create_simple_building`**

Convenience tool: creates walls + floor + room in one call.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `min_point` | `[float, float]` | ✅ | — | Minimum corner |
| `max_point` | `[float, float]` | ✅ | — | Maximum corner |
| `wall_height` | `float` | — | `3.0` | Wall height |
| `wall_thickness` | `float` | — | `0.2` | Wall thickness |
| `floor_thickness` | `float` | — | `0.3` | Floor thickness |
| `room_name` | `string` | ✅ | — | Room name |
| `room_number` | `string` | ✅ | — | Room number |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** Contains `wall_ids`, `floor_id`, `room_id`, and aggregate dimensions.

---

#### 2.3.2 Opening Tools

**`place_door`**

Place a door in a wall element.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `wall_id` | `string` | ✅ | — | UUID of host wall |
| `offset` | `float` | ✅ | — | Distance from wall start to door center (m) |
| `width` | `float` | — | `0.9` | Door width |
| `height` | `float` | — | `2.1` | Door height |
| `door_type` | `string` | — | `null` | `single`, `double`, `sliding`, `folding`, `revolving`, `pocket` |
| `swing` | `string` | — | `null` | `left`, `right`, `both`, `none` |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** `{ door_id, wall_id, width, height, door_type, swing }`

**Test coverage:** `TestPlaceDoorParams` — valid door, all 6 door types, all 4 swing directions.

---

**`place_window`**

Place a window in a wall element.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `wall_id` | `string` | ✅ | — | UUID of host wall |
| `offset` | `float` | ✅ | — | Distance from wall start to window center (m) |
| `width` | `float` | — | `1.2` | Window width |
| `height` | `float` | — | `1.0` | Window height |
| `sill_height` | `float` | — | `0.9` | Height from floor to sill (m) |
| `window_type` | `string` | — | `null` | `fixed`, `casement`, `double_hung`, `sliding`, `awning`, `hopper`, `pivot` |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** `{ window_id, wall_id, width, height, sill_height, window_type }`

**Test coverage:** `TestPlaceWindowParams` — valid window, all 7 window types.

---

**`create_opening`**

Create a generic rectangular opening (not door or window) in a wall.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `host_id` | `string` | ✅ | — | UUID of host wall |
| `offset` | `float` | ✅ | — | Distance from wall start (m) |
| `width` | `float` | ✅ | — | Opening width |
| `height` | `float` | ✅ | — | Opening height |
| `base_height` | `float` | — | `0.0` | Height from floor to base |
| `opening_type` | `string` | — | `"generic"` | `door`, `window`, `generic` |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Test coverage:** `TestCreateOpeningParams` — valid generic/door/window openings, missing fields, negative width, default type.

---

#### 2.3.3 Element Operation Tools

**`get_element`**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_id` | `string` | ✅ | UUID of element |

**Response:** Full element data via `to_dict()`.

---

**`list_elements`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `category` | `string` | — | `null` | `wall`, `floor`, `door`, `window`, `room`, `roof` |
| `level_id` | `string` | — | `null` | Filter by level |
| `limit` | `int` | — | `100` | Max results (1–1000) |
| `offset` | `int` | — | `0` | Pagination offset |

**Response:** `{ elements: [...], count, total }`

---

**`delete_element`**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_ids` | `string[]` | ✅ | UUIDs to delete |
| `reasoning` | `string` | — | AI reasoning |

**Response:** `{ deleted: [...], deleted_count, not_found: [...] }`

---

**`modify_element`**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_id` | `string` | ✅ | UUID of element |
| `properties` | `object` | — | Properties to update |
| `geometry` | `object` | — | Geometry to update |
| `reasoning` | `string` | — | AI reasoning |

**Validation:** At least one of `properties` or `geometry` must be provided.

---

#### 2.3.4 Join Tools

**`detect_joins`**

Detect wall joins between a set of walls.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `wall_ids` | `string[]` | ✅ | — | Wall UUIDs to analyze |
| `tolerance` | `float` | — | `0.001` | Join detection tolerance (m) |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Test coverage:** `TestDetectJoinsParams` — valid detection, default tolerance.

---

**`attach_roof_to_walls`**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roof_id` | `string` | ✅ | UUID of roof |
| `wall_ids` | `string[]` | ✅ | UUIDs of supporting walls |
| `reasoning` | `string` | — | AI reasoning |

---

#### 2.3.5 Mesh Tools

**`generate_mesh`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `element_id` | `string` | ✅ | — | Element UUID |
| `format` | `string` | — | `"json"` | `json`, `obj` |

---

**`validate_mesh`**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `element_id` | `string` | ✅ | Element UUID |

---

**`compute_mesh`**

Full-featured mesh generation with normals, UVs, LOD, and glTF output.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `element_id` | `string` | ✅ | — | Element UUID |
| `include_normals` | `bool` | — | `true` | Include vertex normals |
| `include_uvs` | `bool` | — | `false` | Include UV coordinates |
| `lod_level` | `int` | — | `0` | `0`=full, `1`=medium, `2`=low |
| `format` | `string` | — | `"gltf"` | `gltf`, `json`, `obj` |

---

**`compute_mesh_batch`**

Batch mesh generation for multiple elements, with optional merge.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `element_ids` | `string[]` | ✅ | — | Element UUIDs |
| `merge` | `bool` | — | `false` | Merge into single mesh |
| `format` | `string` | — | `"json"` | `json`, `obj` |
| `compute_normals` | `bool` | — | `true` | Compute vertex normals |

---

#### 2.3.6 Selection Tools

**`select_elements`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `element_ids` | `string[]` | ✅ | — | UUIDs to select |
| `mode` | `string` | — | `"replace"` | `replace`, `add`, `remove`, `toggle` |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** `{ selected_ids, selected_count, valid_ids, invalid_ids }`

---

**`get_selection`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `include_details` | `bool` | — | `false` | Include full element properties |
| `category` | `string` | — | `null` | Filter by element type |

**Response:** `{ selected_count, selected_ids, elements_by_type }`

---

**`clear_selection`**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reasoning` | `string` | — | AI reasoning |

**Response:** `{ cleared_count }`

---

**`select_by_type`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `element_type` | `string` | ✅ | — | Element type to select |
| `mode` | `string` | — | `"replace"` | `replace`, `add`, `toggle` |
| `reasoning` | `string` | — | `null` | AI reasoning |

---

#### 2.3.7 Group Tools

**`create_group`**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | ✅ | Group name |
| `element_ids` | `string[]` | ✅ | Elements to include |
| `metadata` | `object` | — | Optional metadata |
| `reasoning` | `string` | — | AI reasoning |

**Response:** `{ group_id, name, element_count }`

---

**`add_to_group`** / **`remove_from_group`**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_id` | `string` | ✅ | Group UUID |
| `element_ids` | `string[]` | ✅ | Elements to add/remove |
| `reasoning` | `string` | — | AI reasoning |

---

**`delete_group`**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_id` | `string` | ✅ | Group UUID to delete |
| `reasoning` | `string` | — | AI reasoning |

Elements remain in the model.

---

**`get_group`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `group_id` | `string` | ✅ | — | Group UUID |
| `include_details` | `bool` | — | `false` | Include element properties |

---

**`list_groups`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `include_elements` | `bool` | — | `false` | Include element IDs |

**Response:** `{ groups: [...], count }`

---

**`select_group`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `group_id` | `string` | ✅ | — | Group to select |
| `mode` | `string` | — | `"replace"` | `replace`, `add`, `toggle` |
| `reasoning` | `string` | — | `null` | AI reasoning |

---

#### 2.3.8 Room Detection Tools

**`detect_rooms`**

Detect enclosed rooms from walls using topology graph analysis. Uses "turn-right" (minimum angle) algorithm.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `wall_ids` | `string[]` | — | `null` | Wall UUIDs (null = all walls) |
| `tolerance` | `float` | — | `0.0005` | Node merge tolerance (m), default 0.5mm |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** `{ rooms: [{id, area, signed_area, centroid, boundary, boundary_wall_ids, is_exterior}], room_count }`

---

**`analyze_wall_topology`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `wall_ids` | `string[]` | — | `null` | Wall UUIDs (null = all) |
| `tolerance` | `float` | — | `0.0005` | Node merge tolerance |
| `reasoning` | `string` | — | `null` | AI reasoning |

---

#### 2.3.9 Clash Detection Tools

**`detect_clashes`** (Geometry Server)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `element_ids` | `string[]` | — | `null` | Elements to check (null = all) |
| `tolerance` | `float` | — | `0.001` | Clash tolerance (m) |
| `clearance` | `float` | — | `0.0` | Minimum clearance distance |
| `ignore_same_type` | `bool` | — | `false` | Ignore same-type clashes |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** `{ clashes: [...], count, elements_checked, tolerance }`

Fallback implementation uses simple AABB intersection.

---

**`detect_clashes_between_sets`** (Geometry Server)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `set_a_ids` | `string[]` | ✅ | First set |
| `set_b_ids` | `string[]` | ✅ | Second set |
| `tolerance` | `float` | — | Tolerance (m) |
| `clearance` | `float` | — | Clearance distance |
| `reasoning` | `string` | — | AI reasoning |

---

#### 2.3.10 State & Diagnostic Tools

**`get_state_summary`**

No parameters. Returns: `{ total_elements, total_joins, total_events, total_selected, total_groups, elements_by_type }`

---

**`get_self_healing_status`**

No parameters. Returns circuit breaker state, correction counts, success rate.

---

**`boolean_operation`** *(Placeholder — Phase 3)*

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operation` | `string` | ✅ | `union`, `difference`, `intersection` |
| `target_id` | `string` | ✅ | Target element UUID |
| `tool_id` | `string` | ✅ | Tool element UUID |
| `reasoning` | `string` | — | AI reasoning |

---

### 2.4 Self-Healing System

**File:** `geometry_server/self_healing.py`

The self-healing system makes the geometry server resilient to AI agent parameter naming variations.

#### BIM Semantic Aliases

```python
BIM_SEMANTIC_ALIASES = {
    "start": ["start_point", "from", "from_point", "p1", "point1", "origin"],
    "end": ["end_point", "to", "to_point", "p2", "point2", "destination"],
    "min_point": ["min", "bottom_left", "origin", "start", "lower_left"],
    "height": ["wall_height", "h", "elevation", "z"],
    "thickness": ["wall_thickness", "width", "depth", "t"],
    "element_id": ["wall_id", "floor_id", "door_id", "id", "uuid"],
    # ... 20+ more mappings
}
```

#### ArgumentHealer

```python
healer = ArgumentHealer(threshold=0.75, use_aliases=True)
healed = healer.heal("create_wall", {"start_point": [0, 0], "end_point": [5, 0]})
# → {"start": [0, 0], "end": [5, 0]}
```

Strategies (in order):
1. Exact match → pass through
2. BIM semantic alias lookup → `start_point` is alias of `start`
3. Fuzzy string matching (SequenceMatcher, 75% threshold) → `thicness` → `thickness`
4. Preserve unknown keys (don't drop extras)

#### Circuit Breaker

```python
CircuitBreaker(failure_threshold=5, success_threshold=2, timeout_seconds=60)
```

States: `CLOSED` (normal) → `OPEN` (disabled after 5 failures) → `HALF_OPEN` (testing after 60s timeout) → `CLOSED` (after 2 successes)

When OPEN, `heal_tool_args()` passes arguments through unchanged.

**Test coverage:** `test_self_healing.py` — 12 tests covering exact match, semantic aliases (`start_point→start`, `p1→start`, `wall_height→height`, `id→element_id`), fuzzy typo correction, correction logging, unknown arg preservation, circuit breaker states, expected keys per tool.

### 2.5 Pure Python Fallback Elements

When the Rust kernel is unavailable, `geometry_fallback.py` provides dataclass-based elements:

| Class | Properties | Computed Fields |
|-------|-----------|-----------------|
| `Wall` | id, start, end, height, thickness, wall_type, level_id | `length`, `area`, `volume` |
| `Floor` | id, min_point, max_point, thickness, floor_type, level_id | `area`, `volume` |
| `Room` | id, name, number, min_point, max_point, height, level_id | `area`, `volume`, `perimeter` |
| `Door` | id, wall_id, offset, width, height, door_type, swing | — |
| `Window` | id, wall_id, offset, width, height, sill_height, window_type | — |
| `Roof` | id, min_point, max_point, base_elevation, roof_type, slope_degrees, thickness, eave_overhang | `footprint_area`, `surface_area` |

All implement `to_dict()` for serialization.

**Fallback GEOMETRY_HANDLERS** (17 functions):
`create_wall`, `create_rectangular_walls`, `create_floor`, `create_room`, `place_door`, `place_window`, `create_roof`, `get_element`, `list_elements`, `delete_element`, `select_elements`, `get_selection`, `clear_selection`, `create_group`, `list_groups`, `get_state_summary`, `detect_clashes`

### 2.6 Error Codes

```python
class ErrorCodes:
    INVALID_PARAMS = -32602
    ELEMENT_NOT_FOUND = 1001
    CONSTRAINT_VIOLATION = 1002
    PERMISSION_DENIED = 1003
    APPROVAL_REQUIRED = 1004
    INTERNAL_ERROR = 1005
```

---

## 3. MCP Spatial Server

**Package:** `server/mcp-servers/spatial-server/spatial_server/`

**Files:**
- `server.py` — 7 tools, ~750 lines including TopologyGraphPy
- `state.py` — Spatial state with element and room records, spatial queries
- `__init__.py`, `__main__.py` — Package and stdio entry point

### 3.1 Tool Reference

---

**`compute_adjacency`**

Find adjacent rooms (rooms sharing boundary walls).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rooms` | `object[]` | ✅ | Rooms with `id` and `boundary_wall_ids` |
| `reasoning` | `string` | — | AI reasoning |

**Algorithm:** Builds `wall_to_rooms` mapping. If a wall is shared by exactly 2 rooms, those rooms are adjacent.

**Example call:**
```json
{
  "rooms": [
    {"id": "room1", "boundary_wall_ids": ["w1", "w2", "w3", "w4"]},
    {"id": "room2", "boundary_wall_ids": ["w3", "w5", "w6", "w7"]}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "adjacency": [
      {"room_id": "room1", "adjacent_rooms": ["room2"], "adjacent_count": 1},
      {"room_id": "room2", "adjacent_rooms": ["room1"], "adjacent_count": 1}
    ],
    "room_count": 2,
    "total_adjacencies": 1
  }
}
```

**Test coverage:** 3 tests — two adjacent rooms, three rooms, isolated room.

---

**`find_nearest`**

Find elements nearest to a point within a search radius.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `x` | `float` | ✅ | — | X coordinate (m) |
| `y` | `float` | ✅ | — | Y coordinate (m) |
| `radius` | `float` | ✅ | — | Search radius (m) |
| `elements` | `object[]` | ✅ | — | Elements with id, type, position/bbox |
| `element_types` | `string[]` | — | `null` | Filter by types |
| `limit` | `int` | — | `10` | Max results |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Algorithm:** Calculates distance from search point to element position/bbox center/line midpoint. Sorts by distance. Supports bbox clamping for accurate bbox-to-point distance.

**Response:** `{ results: [{element_id, element_type, distance, element}], count, search_point, search_radius }`

**Test coverage:** 3 tests — basic, type filter, outside radius.

---

**`compute_area`**

Calculate area of a polygon using the shoelace formula, with optional hole subtraction.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `polygon` | `[[float, float], ...]` | ✅ | — | Polygon boundary vertices |
| `include_holes` | `[[[float, float], ...], ...]` | — | `null` | Hole polygons to subtract |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** `{ gross_area, hole_area, net_area, centroid, vertex_count, hole_count }`

**Example:**
```json
{ "polygon": [[0,0],[10,0],[10,10],[0,10]], "include_holes": [[[2,2],[4,2],[4,4],[2,4]]] }
→ { "gross_area": 100.0, "hole_area": 4.0, "net_area": 96.0, "centroid": [5.0, 5.0] }
```

**Test coverage:** 2 tests — simple square (100m²), with holes (96m²).

---

**`check_clearance`**

Verify clearance requirements around an element.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `element` | `object` | ✅ | — | Element with id, position/bbox |
| `clearance_type` | `string` | ✅ | — | `door_swing`, `wheelchair`, `furniture`, `egress` |
| `min_clearance` | `float` | — | `0.9` | Override minimum clearance (m) |
| `obstacles` | `object[]` | — | `[]` | Nearby elements that may obstruct |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Built-in clearance specs:**

| Type | Min Distance | Check Area |
|------|-------------|------------|
| `door_swing` | 0.9m (900mm) | Arc |
| `wheelchair` | 1.5m (1500mm turning circle) | Circle |
| `furniture` | 0.6m (600mm passage) | Perimeter |
| `egress` | 1.1m (1100mm egress width) | Corridor |

**Response:** `{ passed, clearance_type, clearance_spec, required_clearance, violations: [{obstacle_id, distance, required, shortage}], violation_count }`

**Test coverage:** 3 tests — no obstructions, with obstruction, wheelchair clearance.

---

**`analyze_circulation`**

Analyze circulation paths between rooms via doors. Builds connectivity graph, finds shortest path via BFS.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rooms` | `object[]` | ✅ | Rooms with id, boundary_wall_ids |
| `doors` | `object[]` | ✅ | Doors with id, host_wall_id |
| `start_room_id` | `string` | — | Start room for pathfinding |
| `end_room_id` | `string` | — | End room for pathfinding |
| `reasoning` | `string` | — | AI reasoning |

**Response:** `{ graph, room_count, door_count, connected_rooms, dead_end_rooms, isolated_rooms, path (optional), path_length, path_exists }`

**Test coverage:** 3 tests — simple path, no path, circulation statistics.

---

**`point_in_polygon`**

Ray casting algorithm to test if point is inside polygon.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `point` | `[float, float]` | ✅ | Point to test |
| `polygon` | `[[float, float], ...]` | ✅ | Polygon vertices |
| `reasoning` | `string` | — | AI reasoning |

**Response:** `{ inside: bool, point, vertex_count }`

**Test coverage:** 2 tests — inside and outside.

---

**`detect_rooms`** (Spatial Server version)

Detect enclosed rooms from wall topology using `TopologyGraphPy` class.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `walls` | `object[]` | ✅ | — | Walls with `start`, `end`, optional `id`, `height`, `thickness` |
| `tolerance` | `float` | — | `0.5` | Node merge tolerance in **mm** |
| `level` | `int` | — | `0` | Building level |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Algorithm:** `TopologyGraphPy` implements:
1. Build topology graph: walls become edges, endpoints become nodes (merged within tolerance)
2. Generate all half-edges (directed)
3. For each unused half-edge, trace boundary using "turn-right" (minimum clockwise angle) algorithm
4. Filter: require ≥3 edges, area ≥1.0m², positive signed area (CCW = interior)

**Kernel fallback:** Tries `pensaer_geometry.detect_rooms()` first, falls back to Python `TopologyGraphPy`.

**Response:** `{ rooms: [{id, area, signed_area, centroid, boundary, boundary_wall_ids, is_exterior}], room_count, wall_count, node_count, edge_count, engine }`

**Test coverage:** 9 tests — rectangular room, two adjacent rooms, triangular room, open layout (no rooms), empty walls, wall IDs preserved, centroid calculation, custom tolerance, level parameter.

### 3.2 Spatial State

```python
class SpatialState:
    _elements: dict[str, SpatialElement]   # id → {bbox_min, bbox_max, centroid, properties}
    _rooms: dict[str, RoomRecord]          # id → {name, number, boundary_wall_ids, area, centroid}
    _adjacencies: dict[str, set[str]]      # room_id → adjacent room_ids
```

**Spatial queries:**
- `find_elements_in_bbox(min_point, max_point, element_type)` — 2D AABB intersection
- `find_elements_within_radius(center, radius, element_type)` — Distance-based with sorting
- `find_nearest_elements(point, count, element_type)` — Top-N nearest by centroid distance
- `compute_adjacencies()` — Builds adjacency matrix from shared boundary walls

### 3.3 Geometry Utilities

| Function | Description |
|----------|-------------|
| `distance_2d(p1, p2)` | Euclidean distance |
| `polygon_area(vertices)` | Shoelace formula (signed area) |
| `polygon_centroid(vertices)` | Weighted centroid |
| `point_in_polygon(point, polygon)` | Ray casting |
| `bbox_center(bbox)` | Center of bounding box |
| `point_to_bbox_distance(point, bbox)` | Clamped point-to-box distance |

---

## 4. MCP Validation Server

**Package:** `server/mcp-servers/validation-server/validation_server/`

**Files:**
- `server.py` — 8 tools, ~1715 lines including clash detection
- `__init__.py`, `__main__.py` — Package and stdio entry point

### 4.1 Compliance Constants

#### ADA Accessibility Requirements

| Requirement | Value | Description |
|-------------|-------|-------------|
| `door_clear_width` | 0.815m (32") | Minimum clear door width |
| `door_maneuvering_clearance` | 1.525m (60") | Wheelchair maneuvering |
| `corridor_width` | 0.915m (36") | Minimum corridor width |
| `passing_width` | 1.525m (60") | Two wheelchair passing |
| `turning_radius` | 1.525m (60") | Wheelchair turning circle |
| `threshold_height` | 0.0125m (½") | Maximum threshold height |
| `door_opening_force` | 22.2N (5 lbf) | Maximum opening force |

#### Fire Rating Requirements (Hours)

| Element Type | Rating |
|-------------|--------|
| Exit stair enclosure | 2.0 |
| Exit passageway | 1.0 |
| Corridor | 1.0 |
| Shaft enclosure | 2.0 |
| Occupancy separation | 2.0 |

#### Egress Requirements by Occupancy

| Type | Max Travel (m) | Min Exits | Occupant Factor (m²/person) |
|------|----------------|-----------|----------------------------|
| Assembly | 61 | 2 | 0.65 |
| Business | 61 | 2 | 9.3 |
| Educational | 61 | 2 | 1.86 |
| Factory | 76 | 2 | 9.3 |
| Residential | 61 | 2 | 18.6 |
| Storage | 122 | 2 | 46.5 |

#### Stair Requirements (IBC)

| Dimension | Requirement |
|-----------|-------------|
| Min width | 1.118m (44") |
| Min headroom | 2.032m (6'8") |
| Max riser height | 0.178m (7") |
| Min riser height | 0.102m (4") |
| Min tread depth | 0.279m (11") |
| Handrail height | 0.864–0.965m (34–38") |

### 4.2 Tool Reference

---

**`validate_model`**

Run comprehensive validation rules against the model.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `elements` | `object[]` | ✅ | — | All model elements |
| `rooms` | `object[]` | — | `[]` | Room definitions |
| `doors` | `object[]` | — | `[]` | Door elements |
| `categories` | `string[]` | — | all | `geometry`, `accessibility`, `fire_safety`, `egress`, `general` |
| `severity_threshold` | `string` | — | `"warning"` | `info`, `warning`, `error` |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Validation categories and codes:**

| Category | Code | Severity | What It Checks |
|----------|------|----------|----------------|
| Geometry | `GEOM001` | error | Zero-length wall (<0.001m) |
| Geometry | `GEOM002` | warning | Very short wall (<0.1m) |
| Geometry | `GEOM003` | error | Invalid width (≤0) |
| Geometry | `GEOM004` | error | Invalid height (≤0) |
| Accessibility | `ADA001` | error | Door below ADA clear width |
| Accessibility | `ADA002` | warning | Room too small for wheelchair turning (<2.25m²) |
| Fire Safety | `FIRE001` | warning | Room exceeds 500m² compartment limit |
| Fire Safety | `FIRE002` | warning | Large room (>100m²) with <2 exits |
| Egress | `EGRESS001` | error | Room with insufficient exits |
| Egress | `EGRESS002` | warning | Insufficient exit width for occupancy |
| General | `GEN001` | warning | Missing element ID |
| General | `GEN002` | error | Duplicate element ID |

**Response:** `{ valid: bool, issues: [{id, code, message, severity, category, element_id, location, suggested_fix}], issue_count, counts: {error, warning, info}, categories_checked, element_count }`

**Test coverage:** 9 tests — valid model, zero/short walls, invalid width/height, missing/duplicate IDs, category filter, severity threshold, all categories.

---

**`check_fire_compliance`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `elements` | `object[]` | ✅ | — | Elements with `fire_rating` |
| `rooms` | `object[]` | — | `[]` | Rooms with `area` |
| `fire_rating_requirements` | `object` | — | `{}` | Custom ratings by type (hours) |
| `max_compartment_area` | `float` | — | `500.0` | Max compartment area (m²) |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Codes:** `FIRE010` (insufficient rating), `FIRE011` (compartment too large)

**Test coverage:** 4 tests — no issues, insufficient rating, compartment too large, custom requirements.

---

**`check_accessibility`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `doors` | `object[]` | ✅ | — | Door elements |
| `corridors` | `object[]` | — | `[]` | Corridor elements |
| `rooms` | `object[]` | — | `[]` | Room definitions |
| `standard` | `string` | — | `"ADA"` | `ADA`, `DDA`, `ISO21542` |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Codes:** `ACCESS001` (door too narrow), `ACCESS002` (threshold too high), `ACCESS003` (corridor too narrow), `ACCESS004` (no turning space)

**Test coverage:** 6 tests — compliant doors, width violation, threshold violation, corridor width, turning space, empty doors.

---

**`check_egress`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `rooms` | `object[]` | ✅ | — | Rooms with `area`, `exit_door_ids` |
| `doors` | `object[]` | ✅ | — | Door elements |
| `occupancy_type` | `string` | — | `"business"` | Building occupancy type |
| `max_travel_distance` | `float` | — | `45.0` | Max travel to exit (m) |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Codes:** `EGRESS010` (travel distance exceeded), `EGRESS011` (insufficient exits), `EGRESS012` (exit capacity insufficient)

**Test coverage:** 5 tests — compliant, travel distance violation, insufficient exits, all occupancy types, empty rooms.

---

**`check_door_clearances`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `doors` | `object[]` | ✅ | — | Door elements |
| `walls` | `object[]` | — | `[]` | Nearby walls |
| `min_clear_width` | `float` | — | `0.815` | Min clear width (m) |
| `min_maneuvering_clearance` | `float` | — | `1.5` | Wheelchair clearance (m) |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Codes:** `DOOR001` (clear width violation), `DOOR002` (maneuvering space violation)

**Test coverage:** 4 tests — compliant, narrow door, insufficient maneuvering, custom requirements.

---

**`check_stair_compliance`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `stairs` | `object[]` | ✅ | — | Stair elements |
| `building_code` | `string` | — | `"IBC"` | `IBC`, `NBC`, `BS` |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Codes:** `STAIR001` (width), `STAIR002` (riser too high), `STAIR003` (riser too low), `STAIR004` (tread too shallow), `STAIR005` (headroom too low)

**Test coverage:** 6 tests — compliant stair, width, riser high/low, tread shallow, headroom, empty stairs.

---

**`detect_clashes`** (Validation Server)

Full-featured clash detection with bbox intersection, severity levels, and type filtering.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `elements` | `object[]` | — | `[]` | Elements with bbox/start+end/position |
| `tolerance` | `float` | — | `0.001` | Detection tolerance (m) |
| `element_types` | `string[]` | — | `null` | Type filter |
| `severity_threshold` | `string` | — | `"soft"` | `hard`, `soft`, `clearance` |
| `severity_levels` | `object` | — | `null` | Custom severity by type pair (e.g., `{"wall-beam": "info"}`) |
| `batch_size` | `int` | — | `null` | Batch size for pair checks |
| `clearance_distance` | `float` | — | `0.0` | Clearance requirement (m) |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Clash types:**
- **Hard** — Solid penetration (overlap > tolerance) → severity `error`
- **Soft** — Touching within tolerance → severity `warning`
- **Clearance** — Within clearance distance but not touching → severity `info`

**Bbox extraction logic:** Handles 3 element formats:
1. Direct `bbox` field with `min`/`max`
2. `start`/`end` line elements (walls) — expands by thickness/height
3. `position` with `width`/`height`/`depth`

**Response:**
```json
{
  "clashes": [{ "id", "element_a_id", "element_b_id", "element_a_type", "element_b_type",
                 "clash_type", "severity", "overlap_distance", "penetration_depth", "location" }],
  "clash_count": 1,
  "clash_free": false,
  "counts": {"hard": 1, "soft": 0, "clearance": 0},
  "counts_by_severity": {"error": 1, "warning": 0, "info": 0},
  "counts_by_type": {"wall-wall": 1},
  "elements_checked": 2,
  "elements_skipped_no_bbox": 0,
  "pairs_checked": 1,
  "tolerance": 0.001,
  "clearance_distance": 0.0
}
```

**Test coverage:** 14 integration tests + 12 unit tests covering: no clashes, hard clash with overlap, soft clash, clearance distance, tolerance/negative tolerance, type filter, custom severity, batch processing, severity counts, elements without bbox, clash location calculation, many elements performance.

---

**`detect_clashes_between_sets`** (Validation Server)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `set_a` | `object[]` | ✅ | — | First element set |
| `set_b` | `object[]` | ✅ | — | Second element set |
| `tolerance` | `float` | — | `0.001` | Tolerance (m) |
| `clearance_distance` | `float` | — | `0.0` | Clearance (m) |
| `reasoning` | `string` | — | `null` | AI reasoning |

Checks all pairs between sets (|A| × |B|), not within sets.

---

## 5. MCP Documentation Server

**Package:** `server/mcp-servers/documentation-server/documentation_server/`

**Files:**
- `server.py` — 9 tools, ~1945 lines
- `__init__.py`, `__main__.py` — Package and stdio entry point

### 5.1 Tool Reference

---

**`generate_schedule`**

Create element schedules in table (markdown), CSV, or JSON format.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `element_type` | `string` | ✅ | — | `wall`, `door`, `window`, `room`, `floor` |
| `elements` | `object[]` | ✅ | — | Elements to schedule |
| `properties` | `string[]` | — | auto-detect | Properties to include |
| `format` | `string` | — | `"table"` | `table`, `csv`, `json` |
| `sort_by` | `string` | — | `null` | Property to sort by |
| `group_by` | `string` | — | `null` | Property to group by |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** `{ schedule: "...", element_type, element_count, property_count, properties, format }`

**Test coverage:** 6 tests — table/CSV/JSON formats, specific properties, grouping, empty elements error.

---

**`export_ifc`**

Export model to IFC format structure (structured JSON, not actual .ifc file).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `elements` | `object[]` | ✅ | — | Elements to export |
| `project_name` | `string` | — | `"Pensaer Project"` | IFC project name |
| `ifc_version` | `string` | — | `"IFC4"` | `IFC2X3`, `IFC4`, `IFC4X3` |
| `include_properties` | `bool` | — | `true` | Include Pset_Pensaer property sets |
| `reasoning` | `string` | — | `null` | AI reasoning |

**IFC type mapping:**

| Element Type | IFC Type |
|-------------|----------|
| wall | IfcWall |
| door | IfcDoor |
| window | IfcWindow |
| floor | IfcSlab |
| room | IfcSpace |
| column | IfcColumn |
| beam | IfcBeam |
| roof | IfcRoof |
| stair | IfcStair |

**Response:** `{ ifc_structure: {header, project, elements}, element_count, ifc_version, project_name, note }`

**Test coverage:** 4 tests — basic export, type mapping, IFC versions, with/without properties.

---

**`export_report`**

Generate compliance or summary reports in markdown or HTML.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `report_type` | `string` | ✅ | — | `fire_safety`, `accessibility`, `model_summary`, `validation` |
| `elements` | `object[]` | — | `[]` | Model elements |
| `validation_results` | `object[]` | — | `null` | Validation issues to include |
| `format` | `string` | — | `"markdown"` | `markdown`, `html` |
| `include_summary` | `bool` | — | `true` | Include executive summary |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Test coverage:** 5 tests — model summary, validation report with issues, HTML/markdown formats, fire safety, accessibility.

---

**`generate_quantities`**

Calculate quantities (areas, volumes, lengths) for elements.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `element_type` | `string` | ✅ | — | Element type to quantify |
| `elements` | `object[]` | ✅ | — | Elements to calculate |
| `group_by` | `string` | — | `null` | Group quantities by property |
| `include_totals` | `bool` | — | `true` | Include total sums |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Quantity fields by type:**

| Type | Fields |
|------|--------|
| wall | length, height, thickness, area, volume |
| floor | area, thickness, volume |
| room | area, height, volume, perimeter |
| door/window | width, height, area, count |
| column | width, depth, height, volume |

**Test coverage:** 4 tests — wall quantities, room quantities, totals, grouped by level.

---

**`export_csv`**

Export element data to CSV.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `elements` | `object[]` | ✅ | — | Elements to export |
| `properties` | `string[]` | — | auto-detect | Columns to include |
| `include_header` | `bool` | — | `true` | Include header row |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Response:** `{ csv: "...", columns, row_count, column_count }`

**Test coverage:** 4 tests — basic, specific properties, with/without header.

---

**`door_schedule`**

Specialized door schedule with fire rating tracking.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `doors` | `object[]` | ✅ | — | Door elements |
| `format` | `string` | — | `"table"` | `table`, `csv`, `json` |
| `include_fire_rating` | `bool` | — | `true` | Include fire rating column |
| `sort_by` | `string` | — | `null` | Sort property |
| `group_by` | `string` | — | `null` | Group property (`type`, `fire_rating`, `level`) |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Default columns:** id, type, width, height, [fire_rating]

**Response:** `{ schedule, door_count, columns, format, fire_rated_count }`

**Test coverage:** 11 tests — table/CSV/JSON, fire rating on/off, sorting, grouping by type/rating/level, empty, defaults, fire rated count, summary section.

---

**`window_schedule`**

Specialized window schedule with glazing and U-value tracking.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `windows` | `object[]` | ✅ | — | Window elements |
| `format` | `string` | — | `"table"` | `table`, `csv`, `json` |
| `include_glazing` | `bool` | — | `true` | Include glazing column |
| `include_u_value` | `bool` | — | `true` | Include U-value column |
| `sort_by` | `string` | — | `null` | Sort property |
| `group_by` | `string` | — | `null` | Group property (`type`, `glazing`, `level`) |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Default columns:** id, type, width, height, [glazing], [u_value]

**Response:** `{ schedule, window_count, columns, format, total_glazing_area, average_u_value }`

**Test coverage:** 13 tests — table/CSV/JSON, glazing on/off, U-value on/off, sorting, grouping by type/glazing/level, empty, defaults, total area, average U-value, summary section.

---

**`room_schedule`**

Specialized room schedule with area and finish tracking.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `rooms` | `object[]` | ✅ | — | Room elements |
| `format` | `string` | — | `"table"` | `table`, `csv`, `json` |
| `include_area` | `bool` | — | `true` | Include area column |
| `include_finishes` | `bool` | — | `true` | Include floor_finish, ceiling_height |
| `sort_by` | `string` | — | `null` | Sort property |
| `group_by` | `string` | — | `null` | Group property (`level`, `department`, `occupancy_type`) |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Default columns:** id, name, number, [area], [floor_finish, ceiling_height]

**Response:** `{ schedule, room_count, columns, format, total_area }`

**Test coverage:** 11 tests — table/CSV/JSON, area on/off, finishes on/off, sorting, grouping by level/department, empty, defaults, total area, summary section.

---

**`export_bcf`**

Export issues/clashes to BCF (BIM Collaboration Format).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `issues` | `object[]` | ✅ | — | Issues/clashes to export |
| `project_name` | `string` | — | `"Pensaer Project"` | BCF project name |
| `author` | `string` | — | `"Pensaer"` | Author name |
| `include_viewpoints` | `bool` | — | `true` | Include viewpoint info |
| `bcf_version` | `string` | — | `"2.1"` | `2.0`, `2.1`, `3.0` |
| `reasoning` | `string` | — | `null` | AI reasoning |

**Severity → BCF Priority mapping:** critical→critical, high→high, medium→normal, low→low

**Type → BCF Topic Type mapping:** clash→Clash, warning→Warning, error→Error, fire→Fire Safety, accessibility→Accessibility

**Response:** `{ bcf_structure: {project, topics: [{guid, topic_type, topic_status, priority, title, viewpoints, comments, reference_links}]}, topic_count, bcf_version, bcf_xml_sample }`

**Test coverage:** 11 tests — basic, element references, viewpoints on/off, BCF versions, priority mapping, type mapping, comments, project info, XML sample, empty issues, multiple issues.

---

## 6. Server Application (server/app/)

**Package:** `server/app/pensaer/`

The application package contains the **server-side domain logic** modules, currently in early scaffolding stage.

### 6.1 Package Structure

```
server/app/pensaer/
├── __init__.py          # "Pensaer-B application package."
├── cli/
│   ├── __init__.py
│   └── main.py          # CLI entrypoint (not yet implemented)
├── commands/
│   └── __init__.py      # "Command handlers live here."
├── dsl/
│   ├── __init__.py
│   ├── tokens.py        # Token types and lexer constants
│   ├── lexer.py         # Tokenizer for DSL input
│   ├── parser.py        # Recursive descent parser
│   ├── ast.py           # AST node definitions
│   └── tests/
│       ├── __init__.py
│       ├── test_lexer.py
│       └── test_parser.py
├── mcp/
│   └── __init__.py      # "MCP server implementations live here."
├── projections/
│   └── __init__.py      # "Projections and read models live here."
└── queries/
    └── __init__.py      # "Query handlers live here."
```

### 6.2 CLI Module

**File:** `server/app/pensaer/cli/main.py`

```python
def main() -> None:
    raise SystemExit("CLI not implemented yet.")
```

Placeholder for a command-line interface to interact with the server.

### 6.3 Commands Module

Placeholder for CQRS command handlers (write side). Will process validated DSL commands and emit events.

### 6.4 DSL Module — The Pensaer Domain-Specific Language

This is a **fully implemented** lexer + parser for a natural-language-like BIM command syntax.

#### 6.4.1 Token System (`tokens.py`)

**96 token types** organized into categories:

| Category | Tokens | Examples |
|----------|--------|---------|
| Literals | `INTEGER`, `FLOAT`, `UUID`, `STRING` | `42`, `3.14`, `a1b2-...`, `"name"` |
| Commands | `WALL`, `WALLS`, `DOOR`, `WINDOW`, `OPENING`, `CREATE`, `PLACE`, `ADD`, `MODIFY`, `SET`, `HELP` | `wall`, `create`, `place` |
| Directional | `FROM`, `TO`, `AT`, `IN`, `ON`, `START`, `END`, `OFFSET` | `from`, `to`, `at` |
| Shape | `RECT`, `RECTANGLE`, `BOX` | `rect`, `box` |
| Properties | `HEIGHT`, `THICKNESS`, `WIDTH`, `TYPE`, `LEVEL`, `SWING`, `SILL`, `SILL_HEIGHT` | `height`, `thickness` |
| Wall Types | `BASIC`, `STRUCTURAL`, `CURTAIN`, `RETAINING` | `structural` |
| Door Types | `SINGLE`, `DOUBLE`, `SLIDING`, `FOLDING`, `REVOLVING`, `POCKET` | `double` |
| Window Types | `FIXED`, `CASEMENT`, `DOUBLE_HUNG`, `AWNING`, `HOPPER`, `PIVOT` | `casement` |
| Swing | `LEFT`, `RIGHT`, `BOTH`, `NONE` | `left` |
| Units | `UNIT_M`, `UNIT_MM`, `UNIT_CM`, `UNIT_FT`, `UNIT_IN` | (via suffix) |
| Variables | `VAR_LAST`, `VAR_SELECTED`, `VAR_WALL` | `$last`, `$selected` |
| Options | `OPT_H`, `OPT_T`, `OPT_W`, `LONG_HEIGHT`, `LONG_THICKNESS`, etc. | `-h`, `--height` |
| Punctuation | `LPAREN`, `RPAREN`, `COMMA`, `AT_SIGN`, `EQUALS` | `(`, `)`, `,` |

**Variable references:** `$last` (last created element), `$selected` (current selection), `$wall` (last wall)

#### 6.4.2 Lexer (`lexer.py`)

The `Lexer` class tokenizes DSL input with:

- **UUID recognition:** `8-4-4-4-12` hex pattern
- **Number with unit suffix:** `-?\d+(?:\.\d+)?(?:mm|cm|ft|in|m)?` with automatic conversion to meters
- **Unit conversions:** `mm`→×0.001, `cm`→×0.01, `ft`→×0.3048, `in`→×0.0254, `m`→×1.0
- **Quoted strings:** Single or double quotes
- **Variables:** `$last`, `$selected`, `$wall`
- **Long options:** `--height`, `--thickness`, `--width`, `--type`, `--level`, `--swing`, `--sill`, `--sill-height`
- **Short options:** `-h`, `-t`, `-w`
- **Comments:** `#` to end of line
- **Error recovery:** Unknown characters logged as errors, lexing continues

```python
lexer = Lexer("wall (0, 0) (5m, 0) height 3000mm")
tokens = list(lexer.tokenize())
# → [WALL, LPAREN, INTEGER(0), COMMA, INTEGER(0), RPAREN,
#    LPAREN, FLOAT(5.0), COMMA, INTEGER(0), RPAREN,
#    HEIGHT, FLOAT(3.0), EOF]
```

#### 6.4.3 Parser (`parser.py`)

**Recursive descent parser** producing AST nodes.

**Supported command forms:**

| Command | Examples |
|---------|---------|
| Create wall | `wall (0,0) (5,0) height 3` / `wall from (0,0) to (5,0) -h 3` / `create wall (0,0) (5,0) --height=3` |
| Rect walls | `walls rect (0,0) (10,8)` / `box (0,0) (10,8)` / `rect walls (0,0) (10,8)` |
| Place door | `door in $last at 2.5 width 0.9` / `place door $wall @ 2.5 type double swing left` |
| Place window | `window $wall @ 1.5 width 1200mm sill 900mm` / `add window in $last at 3.0` |
| Create opening | `opening $wall at 2.0 1.5 x 2.5` |
| Modify element | `wall <uuid> set height 3.5` / `door <uuid> set type sliding` / `modify wall <uuid> height 4.0` |
| Help | `help` / `help wall` / `help door` |

#### 6.4.4 AST Nodes (`ast.py`)

| Node Class | Maps to MCP Tool | Key Fields |
|-----------|-----------------|------------|
| `CreateWallCommand` | `create_wall` | start, end, height, thickness, wall_type, level_id |
| `CreateRectWallsCommand` | `create_rectangular_walls` | min_point, max_point, height, thickness |
| `ModifyWallCommand` | `modify_parameter` | wall_id, property_name, value |
| `PlaceDoorCommand` | `place_door` | wall_ref, offset, width, height, door_type, swing |
| `ModifyDoorCommand` | `modify_parameter` | door_id, property_name, value |
| `PlaceWindowCommand` | `place_window` | wall_ref, offset, width, height, sill_height, window_type |
| `ModifyWindowCommand` | `modify_parameter` | window_id, property_name, value |
| `CreateOpeningCommand` | `create_opening` | wall_ref, offset, width, height, base_height |
| `HelpCommand` | (local) | topic |

Each command implements `to_mcp_args() → dict` for direct MCP tool invocation.

**Element references** support both UUID and variable resolution:
```python
class ElementRef:
    uuid: str | None
    variable: VariableRef | None  # LAST, SELECTED, WALL
```

**Type enums:** `WallType`, `DoorType`, `WindowType`, `SwingDirection` — all validated via Python enum.

### 6.5 MCP Module

Placeholder for server-side MCP implementations (currently tools live in `mcp-servers/`).

### 6.6 Projections Module

Placeholder for CQRS read models / projections (event → materialized view).

### 6.7 Queries Module

Placeholder for CQRS query handlers (read side).

---

## 7. API Endpoints

### 7.1 REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Server info (name, version, status, tools_available, timestamp) |
| `GET` | `/health` | Comprehensive health check (DB, Redis, Kernel, MCP tools) |
| `GET` | `/health/live` | Kubernetes liveness probe (`{"status": "alive"}`) |
| `GET` | `/health/ready` | Kubernetes readiness probe (`{"status": "ready", "tools": N}`) |
| `GET` | `/mcp/tools` | List all MCP tools (name, description, category, input_schema) |
| `GET` | `/mcp/tools/{category}` | List tools by category (spatial, validation, documentation, geometry) |
| `POST` | `/mcp/tools/{tool_name}` | Call an MCP tool (primary endpoint) |
| `POST` | `/tools/{tool_name}` | Alias for backwards compatibility with mcpClient.ts |

### 7.2 WebSocket Endpoint

| Protocol | Path | Description |
|----------|------|-------------|
| `WS` | `/mcp/ws` | JSON-RPC 2.0 real-time MCP communication |

**JSON-RPC methods:**
- `tools/list` → Returns `{ tools: [{name, description, inputSchema}] }`
- `tools/call` → `{ name, arguments }` → Tool result or error
- Unknown → Error code `-32601`

### 7.3 Health Check Details

The `/health` endpoint checks:

| Check | Method | Status Values |
|-------|--------|---------------|
| Database | `SELECT 1` via asyncpg | `connected`, `not_configured`, `error: ...` |
| Redis | `PING` via aioredis | `connected`, `not_configured`, `error: ...` |
| Kernel | `GET {KERNEL_URL}/health` via httpx (2s timeout) | `connected`, `not_configured`, `error: ...` |
| MCP Tools | Count of `TOOL_CATALOG` | Integer count |

Overall `status`: `"healthy"` or `"degraded"` (if any check fails).

---

## 8. Configuration

### 8.1 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://pensaer:pensaer@localhost:5432/pensaer` | PostgreSQL connection |
| `REDIS_URL` | — | Redis connection |
| `KERNEL_URL` | — | Rust kernel gRPC/HTTP URL |
| `STORAGE_PATH` | `/data/models` | Model file storage path |
| `LOG_LEVEL` | `INFO` | Logging level |
| `ENVIRONMENT` | `development` | `development` or `production` |
| `RATE_LIMIT_PER_MINUTE` | `100` | Per-IP rate limit |
| `ALLOWED_ORIGINS` | `localhost:5173,localhost:3000` | CORS origins (comma-separated) |

### 8.2 Docker Configuration

**Docker Compose services:**

| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| `app` | Custom (Vite) | 5173 | React frontend |
| `server` | Custom (Python 3.12) | 8000 | FastAPI server |
| `kernel` | Custom (Rust) | 50051 | Geometry kernel (4GB mem limit) |
| `postgres` | `postgis/postgis:16-3.4-alpine` | 5432 | Database |
| `redis` | `redis:7-alpine` | 6379 | Cache (256MB, LRU eviction) |
| `minio` | `minio/minio:latest` | 9000/9001 | Object storage (dev only) |

**Server Dockerfile:**
- **Base:** Python 3.12 slim
- **Development:** uvicorn with `--reload`
- **Production:** gunicorn with 4 uvicorn workers, 120s timeout, non-root user, health check

**Volumes:**
- `postgres-data` — PostgreSQL data
- `redis-data` — Redis AOF persistence
- `minio-data` — Object storage
- `model-data` — Shared model files

### 8.3 Database Connection

Alembic uses async SQLAlchemy with asyncpg:
```python
url = os.getenv("DATABASE_URL", "postgresql://pensaer:pensaer@localhost:5432/pensaer")
# Converts postgres:// to postgresql:// for SQLAlchemy 2.0 compatibility
engine = async_engine_from_config(configuration, prefix="sqlalchemy.", poolclass=pool.NullPool)
```

### 8.4 Redis Connection

```python
import redis.asyncio as redis
r = redis.from_url(redis_url)
await r.ping()
await r.close()
```

---

## 9. Testing

### 9.1 Test Structure

```
server/
├── conftest.py                                    # Root: adds MCP server paths
├── tests/
│   ├── conftest.py                                # Pytest fixtures (event loop policy)
│   ├── __init__.py
│   └── integration/
│       ├── __init__.py
│       └── test_mcp_integration.py                # 40+ HTTP integration tests
├── mcp-servers/
│   ├── geometry-server/tests/
│   │   ├── test_geometry_tools.py                 # Schema validation tests
│   │   └── test_self_healing.py                   # Self-healing + circuit breaker
│   ├── spatial-server/tests/
│   │   └── test_spatial_tools.py                  # Spatial tool unit tests
│   ├── validation-server/tests/
│   │   └── test_validation_tools.py               # Validation + clash detection
│   └── documentation-server/tests/
│       └── test_documentation_tools.py            # Schedule + export tests
└── app/pensaer/dsl/tests/
    ├── test_lexer.py                              # DSL lexer tests
    └── test_parser.py                             # DSL parser tests
```

### 9.2 Test File Summary

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `test_mcp_integration.py` | ~50 | Full HTTP flow: health, discovery, all 4 server categories, error handling, WebSocket, performance benchmarks, concurrent calls |
| `test_geometry_tools.py` | ~25 | Pydantic schema validation: walls (types, materials, min length), doors (types, swings), windows (types), openings, roofs, joins, meshes |
| `test_self_healing.py` | ~12 | Argument healing (aliases, fuzzy match, corrections logging), BIM aliases, circuit breaker states, expected keys |
| `test_spatial_tools.py` | ~25 | Geometry utilities, adjacency, nearest, area, clearance, circulation, point-in-polygon, topology graph, room detection (9 cases) |
| `test_validation_tools.py` | ~45 | Utility functions, clash detection (14 cases), fire compliance, accessibility, egress, door clearances, stair compliance, model validation, constants, performance |
| `test_documentation_tools.py` | ~60 | Schedules (all 3 formats × 3 types), IFC export, reports, quantities, CSV, BCF export with viewpoints/priorities/types/XML |

**Total: ~217 tests across 6 test files**

### 9.3 How to Run Tests

```bash
# All tests
cd server && pytest -v

# Specific server
pytest server/mcp-servers/geometry-server/tests/ -v
pytest server/mcp-servers/spatial-server/tests/ -v
pytest server/mcp-servers/validation-server/tests/ -v
pytest server/mcp-servers/documentation-server/tests/ -v

# Integration tests only
pytest server/tests/integration/ -v

# DSL tests
pytest server/app/pensaer/dsl/tests/ -v

# With coverage
pytest --cov=. --cov-report=html -v
```

### 9.4 Integration Test Approach

`test_mcp_integration.py` uses FastAPI's `TestClient` for synchronous tests and `httpx.AsyncClient` with `ASGITransport` for async tests. No external services needed — all tests run against the in-memory tool handlers.

**Test classes:**
- `TestServerHealth` — Root, health, tool discovery, category listing
- `TestGeometryTools` — Create wall/floor/room/roof, place door/window, list/get/delete elements, clash detection, state summary
- `TestSpatialTools` — Adjacency, nearest (with type filter), area (with holes), clearance (with/without obstruction), circulation, point-in-polygon
- `TestValidationTools` — Model validation (with categories), fire compliance, accessibility (passing/failing), egress, door clearances, stair compliance, clash detection (9 scenarios)
- `TestDocumentationTools` — Schedule generation (3 formats), IFC export, reports (markdown/HTML), quantities, CSV, door/window/room schedules, BCF export
- `TestErrorHandling` — Unknown tool (404), invalid arguments, empty elements, malformed JSON (422), alias endpoint
- `TestPerformanceBenchmarks` — Simple tool <100ms, complex validation <500ms, 200 doors schedule <1s, 150 element IFC export <2s, 20 concurrent calls
- `TestWebSocketEndpoint` — Connect, tools/list, tools/call, unknown method error

### 9.5 Test Gaps

1. **No end-to-end database tests** — All state is in-memory, no PostgreSQL integration tests
2. **No Redis caching tests** — Redis is checked in health only
3. **No MinIO storage tests** — Object storage not yet integrated
4. **No authentication/authorization tests** — Auth layer not implemented
5. **No DSL-to-MCP execution tests** — Parser produces AST but execution pipeline not tested end-to-end
6. **Limited geometry kernel tests** — Rust bindings tested only via integration; no dedicated PyO3 unit tests
7. **No load/stress tests** — Performance benchmarks are lightweight (10-20 iterations)
8. **No WebSocket stress tests** — Only basic connect/call/error

---

## 10. Rust Kernel Integration

### 10.1 How the Server Imports PyO3 Bindings

The geometry server attempts to import the Rust kernel at startup:

```python
# In geometry_mcp.py
import pensaer_geometry as pg

# Usage:
wall = pg.create_wall(tuple(params.start), tuple(params.end), height=3.0, thickness=0.2, wall_type="basic")
walls = pg.create_rectangular_walls(tuple(params.min_point), tuple(params.max_point), height=3.0, thickness=0.2)
floor = pg.create_floor(tuple(params.min_point), tuple(params.max_point), thickness=0.3, floor_type="slab")
room = pg.create_room(params.name, params.number, tuple(params.min_point), tuple(params.max_point), height=3.0)
door = pg.place_door(wall, offset=2.0, width=0.9, height=2.1, door_type="single", swing="left")
rooms_data = pg.detect_rooms(py_walls, tolerance_meters)  # Topology analysis
```

In `main.py`, the import is wrapped in try/except:

```python
try:
    from geometry_server.geometry_mcp import TOOLS as GEOMETRY_TOOLS
    from geometry_server.geometry_fallback import GEOMETRY_HANDLERS
    GEOMETRY_AVAILABLE = True
except Exception:
    # Fall back to pure Python
    from geometry_server.geometry_fallback import GEOMETRY_HANDLERS
    GEOMETRY_TOOLS = [Tool(...) for each tool]  # Manually defined
    GEOMETRY_AVAILABLE = True  # Fallback still works
```

### 10.2 Fallback Behavior When Kernel Is Unavailable

**Three levels of fallback:**

1. **Rust kernel available** — Full geometry operations via `pensaer_geometry` PyO3 bindings. Logged as: `"Geometry server loaded with Rust bindings"`

2. **Rust kernel unavailable, fallback loaded** — Pure Python dataclasses in `geometry_fallback.py`. All 17 core handlers work. Logged as: `"Geometry server loaded with pure Python fallback"`. Tool definitions are manually constructed `mcp.types.Tool` objects.

3. **Complete failure** — `GEOMETRY_TOOLS = []`, `GEOMETRY_HANDLERS = {}`, `GEOMETRY_AVAILABLE = False`. Geometry tools simply not registered. Logged as: `"Geometry server not available"`

**What changes in fallback mode:**
- Element objects are Python dataclasses instead of PyO3 structs
- No native mesh generation (compute_mesh tools may not work)
- No native CSG boolean operations
- Clash detection uses simple AABB instead of precise geometry
- Room detection uses Python `TopologyGraphPy` instead of Rust graph

**What still works identically:**
- All CRUD operations (create, get, list, delete)
- Selection and group management
- State tracking and event logging
- All spatial, validation, and documentation tools (independent of kernel)

### 10.3 Performance Difference

| Operation | With Kernel | Without Kernel | Notes |
|-----------|-------------|----------------|-------|
| Wall creation | ~0.01ms (Rust struct) | ~0.05ms (Python dataclass) | Negligible difference |
| Mesh generation | ~1-5ms (Rust mesher) | Not available | Key differentiator |
| Room detection | ~1ms (Rust topology) | ~5-50ms (Python TopologyGraphPy) | Matters at scale |
| Clash detection | ~1ms (precise geometry) | ~2-10ms (AABB only) | Less accurate in fallback |
| Boolean operations | Available (Phase 3) | Not available | Rust-only planned |
| Batch mesh (100 elements) | ~50ms | Not available | Rust-only |

The spatial server's `detect_rooms` tool explicitly tries the kernel first:
```python
try:
    import pensaer_geometry as pg
    rooms_data = pg.detect_rooms(py_walls, tolerance_meters)
    return make_response({..., "engine": "rust_kernel"})
except ImportError:
    logger.info("Rust kernel not available, using Python fallback")
    graph = TopologyGraphPy(tolerance=tolerance_meters)
    # ... pure Python implementation
    return make_response({..., "engine": "python_fallback"})
```

### 10.4 Kernel Health Check

The `/health` endpoint checks kernel availability:
```python
kernel_url = os.getenv("KERNEL_URL")
if kernel_url:
    async with httpx.AsyncClient(timeout=2.0) as client:
        resp = await client.get(f"{kernel_url}/health")
        checks["kernel"] = "connected" if resp.status_code == 200 else "error"
```

Docker Compose sets `KERNEL_URL=http://kernel:50051` with the kernel container allocated 4GB memory.

---

## Appendix A: Complete Tool Inventory

### By Category

| Category | Count | Tools |
|----------|-------|-------|
| **Geometry** | 33 | `create_wall`, `create_rectangular_walls`, `create_floor`, `create_room`, `place_door`, `place_window`, `create_opening`, `detect_joins`, `get_element`, `list_elements`, `delete_element`, `modify_element`, `generate_mesh`, `validate_mesh`, `compute_mesh`, `compute_mesh_batch`, `create_simple_building`, `create_roof`, `attach_roof_to_walls`, `select_elements`, `get_selection`, `clear_selection`, `select_by_type`, `create_group`, `add_to_group`, `remove_from_group`, `delete_group`, `get_group`, `list_groups`, `select_group`, `boolean_operation`, `detect_rooms`, `analyze_wall_topology`, `detect_clashes`, `detect_clashes_between_sets`, `get_state_summary`, `get_self_healing_status` |
| **Spatial** | 7 | `compute_adjacency`, `find_nearest`, `compute_area`, `check_clearance`, `analyze_circulation`, `point_in_polygon`, `detect_rooms` |
| **Validation** | 8 | `validate_model`, `check_fire_compliance`, `check_accessibility`, `check_egress`, `check_door_clearances`, `check_stair_compliance`, `detect_clashes`, `detect_clashes_between_sets` |
| **Documentation** | 9 | `generate_schedule`, `export_ifc`, `export_report`, `generate_quantities`, `export_csv`, `door_schedule`, `window_schedule`, `room_schedule`, `export_bcf` |

**Total: ~57 tool definitions** (some names shared between geometry and validation with different implementations)

### Registered in TOOL_HANDLERS (main.py)

The `TOOL_HANDLERS` dict maps tool names to async functions. **38 explicit registrations** plus geometry handlers added dynamically.

---

## Appendix B: Standard Response Envelope

Every MCP tool returns this structure:

```json
{
  "success": true,
  "data": { ... },
  "event_id": "uuid-v4",
  "timestamp": "2025-01-15T12:00:00+00:00",
  "warnings": [],
  "audit": {
    "user_id": null,
    "agent_id": null,
    "reasoning": "AI agent reasoning string"
  }
}
```

Error response:
```json
{
  "success": false,
  "error": {
    "code": -32602,
    "message": "Invalid parameters: ...",
    "data": {}
  },
  "event_id": null,
  "timestamp": "2025-01-15T12:00:00+00:00"
}
```

---

## Appendix C: Common Self-Healing Utilities

**File:** `server/common/self_healing.py`

Foundation for the BIM self-healing system:

| Class/Function | Purpose |
|----------------|---------|
| `FuzzyDict` | Dict with fuzzy key matching (75% threshold) |
| `fuzzy_get(d, key, default, threshold)` | Standalone fuzzy dict access |
| `deep_get(data, key, default, threshold)` | Recursive key search at any nesting level |
| `AdaptiveResponseParser` | 5-strategy parser: direct → alias → learned path → fuzzy → deep search |
| `SelfHealingResponse` | Wrapper making any dict self-healing with chained access |
| `CircuitBreaker` | CLOSED → OPEN → HALF_OPEN state machine |
| `SelfHealingImporter` | Import hook: hyphen→underscore, filesystem discovery |
| `SEMANTIC_ALIASES` | Base alias mappings (element_id, mesh, count, etc.) |

The `AdaptiveResponseParser` learns paths — if it finds `vertices` at `$.data.mesh.vertices` once, it tries that path first next time.

---

*End of Part 7. The server is where AI intent becomes building reality.*
