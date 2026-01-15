# Pensaer Server - AI Navigation Guide

> **Language:** Python 3.11+
> **Framework:** FastAPI
> **Model Hint:** Use **Opus 4.5** for MCP tools, **Sonnet 4** for standard API routes

## Purpose

The server layer provides:
- FastAPI application for REST/WebSocket APIs
- 4 MCP tool servers for AI agent integration
- Database interactions (PostgreSQL + PostGIS)
- Authentication and authorization

## Directory Structure

```
server/
├── app/
│   ├── pensaer/
│   │   ├── cli/          # CLI entry points
│   │   ├── commands/     # Command handlers (event sourcing)
│   │   ├── queries/      # Read-side query handlers
│   │   ├── projections/  # View projections from events
│   │   └── mcp/          # MCP tool definitions
│   └── tests/
│
├── mcp-servers/          # 4 standalone MCP servers
│   ├── geometry-server/
│   ├── spatial-server/
│   ├── validation-server/
│   └── documentation-server/
│
└── mcp-bridge/           # Node.js MCP bridge (if needed)
```

## MCP Tool Servers

### 1. geometry-server
```python
# Tools: create_wall, create_opening, compute_mesh, snap_to_grid
@tool
def create_wall(start: Point3, end: Point3, height: float, thickness: float) -> Wall:
    """Create a wall element between two points."""
```

### 2. spatial-server
```python
# Tools: create_room, compute_adjacency, find_bounded_spaces
@tool
def create_room(boundary_walls: list[str]) -> Room:
    """Create a room bounded by the given walls."""
```

### 3. validation-server
```python
# Tools: check_fire_rating, detect_clashes, validate_accessibility
@tool
def check_fire_rating(element_id: str) -> ValidationResult:
    """Check fire rating compliance for an element."""
```

### 4. documentation-server
```python
# Tools: generate_door_schedule, export_csv, create_report
@tool
def generate_door_schedule(model_id: str) -> Schedule:
    """Generate a door schedule from the model."""
```

## Key Patterns

### Pydantic Models
```python
from pydantic import BaseModel

class CreateWallRequest(BaseModel):
    start: Point3
    end: Point3
    height: float = 2.7
    thickness: float = 0.2
```

### Dependency Injection
```python
from fastapi import Depends

async def get_model_service(db: Database = Depends(get_db)) -> ModelService:
    return ModelService(db)

@router.post("/walls")
async def create_wall(
    request: CreateWallRequest,
    service: ModelService = Depends(get_model_service)
):
    return await service.create_wall(request)
```

## What You CAN Do

- Add new MCP tools following existing patterns
- Implement new API endpoints
- Add query handlers for read operations
- Write integration tests

## What You Should NOT Do

- Don't bypass command handlers for writes
- Don't store derived data (views are computed)
- Don't add new dependencies without checking tech stack
- Don't write geometry math - call the Rust kernel

## Running Locally

```bash
cd server/app
pip install -e .
uvicorn pensaer.main:app --reload

# MCP servers
cd server/mcp-servers/geometry-server
python server.py
```

## Testing

```bash
cd server/app
pytest                        # Run all tests
pytest tests/test_mcp.py     # Run specific tests
```
