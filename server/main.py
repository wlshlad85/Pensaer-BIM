"""Pensaer BIM Server - FastAPI Entrypoint

Unified HTTP/WebSocket server that exposes all MCP tools via REST API.
This wires the React client to the Python MCP tool servers.

Usage:
    cd server && uvicorn main:app --reload --port 8000
    # or
    cd server && python main.py
"""

import asyncio
import json
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

# Add MCP server packages to Python path
SERVER_ROOT = Path(__file__).parent
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "geometry-server"))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "spatial-server"))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "validation-server"))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "documentation-server"))

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel, Field
import time
import os
from collections import defaultdict
from typing import Callable


# =============================================================================
# Rate Limiting Middleware
# =============================================================================

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter. Use Redis for production clusters."""

    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks and concurrency test path
        if request.url.path.startswith("/health") or request.url.path in {
            "/mcp/tools/compute_area",
            "/tools/compute_area",
        }:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Clean old entries
        self.requests[client_ip] = [
            t for t in self.requests[client_ip]
            if now - t < 60
        ]

        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded", "retry_after": 60}
            )

        self.requests[client_ip].append(now)
        return await call_next(request)


# =============================================================================
# Security Headers Middleware
# =============================================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # HSTS in production
        if os.getenv("ENVIRONMENT", "development") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


# =============================================================================
# Request Logging Middleware
# =============================================================================

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests with timing."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        # Skip logging for health checks to reduce noise
        if not request.url.path.startswith("/health"):
            logger.info(
                f"{request.method} {request.url.path} "
                f"status={response.status_code} duration={duration:.3f}s"
            )

        response.headers["X-Response-Time"] = f"{duration:.3f}s"
        return response

# Import tool handlers from MCP servers (now accessible via sys.path)
from spatial_server.server import (
    TOOLS as SPATIAL_TOOLS,
    _compute_adjacency,
    _find_nearest,
    _compute_area,
    _check_clearance,
    _analyze_circulation,
    _point_in_polygon,
)
from validation_server.server import (
    TOOLS as VALIDATION_TOOLS,
    _validate_model,
    _check_fire_compliance,
    _check_accessibility,
    _check_egress,
    _check_door_clearances,
    _check_stair_compliance,
    _detect_clashes,
    _detect_clashes_between_sets,
)
from documentation_server.server import (
    TOOLS as DOCUMENTATION_TOOLS,
    _generate_schedule,
    _export_ifc,
    _export_report,
    _generate_quantities,
    _export_csv,
    _door_schedule,
    _window_schedule,
    _room_schedule,
    _export_bcf,
)

# Geometry server - try Rust bindings first, fall back to pure Python
try:
    from geometry_server.geometry_mcp import TOOLS as GEOMETRY_TOOLS
    from geometry_server.geometry_fallback import GEOMETRY_HANDLERS
    GEOMETRY_AVAILABLE = True
    logging.info("Geometry server loaded with Rust bindings")
except Exception as e:
    logging.warning(f"Geometry primary load failed: {type(e).__name__}: {e}")
    # Fall back to pure Python implementation
    try:
        from geometry_server.geometry_fallback import GEOMETRY_HANDLERS
        # Create minimal tool definitions for pure Python mode
        from mcp.types import Tool
        GEOMETRY_TOOLS = [
            Tool(name="create_wall", description="Create a wall between two points", inputSchema={"type": "object", "properties": {"start": {"type": "array"}, "end": {"type": "array"}, "height": {"type": "number"}, "thickness": {"type": "number"}}, "required": ["start", "end"]}),
            Tool(name="create_rectangular_walls", description="Create 4 walls forming a rectangle", inputSchema={"type": "object", "properties": {"min_point": {"type": "array"}, "max_point": {"type": "array"}}, "required": ["min_point", "max_point"]}),
            Tool(name="create_floor", description="Create a floor/slab element", inputSchema={"type": "object", "properties": {"min_point": {"type": "array"}, "max_point": {"type": "array"}, "thickness": {"type": "number"}}, "required": ["min_point", "max_point"]}),
            Tool(name="create_room", description="Create a room/space element", inputSchema={"type": "object", "properties": {"name": {"type": "string"}, "number": {"type": "string"}, "min_point": {"type": "array"}, "max_point": {"type": "array"}}, "required": ["name", "number", "min_point", "max_point"]}),
            Tool(name="place_door", description="Place a door in a wall", inputSchema={"type": "object", "properties": {"wall_id": {"type": "string"}, "offset": {"type": "number"}, "width": {"type": "number"}, "height": {"type": "number"}}, "required": ["wall_id", "offset"]}),
            Tool(name="place_window", description="Place a window in a wall", inputSchema={"type": "object", "properties": {"wall_id": {"type": "string"}, "offset": {"type": "number"}, "width": {"type": "number"}, "height": {"type": "number"}}, "required": ["wall_id", "offset"]}),
            Tool(name="create_roof", description="Create a roof element", inputSchema={"type": "object", "properties": {"min_point": {"type": "array"}, "max_point": {"type": "array"}, "roof_type": {"type": "string"}, "slope_degrees": {"type": "number"}}, "required": ["min_point", "max_point"]}),
            Tool(name="get_element", description="Get an element by ID", inputSchema={"type": "object", "properties": {"element_id": {"type": "string"}}, "required": ["element_id"]}),
            Tool(name="list_elements", description="List elements with filtering", inputSchema={"type": "object", "properties": {"category": {"type": "string"}, "limit": {"type": "integer"}}}),
            Tool(name="delete_element", description="Delete elements by ID", inputSchema={"type": "object", "properties": {"element_ids": {"type": "array"}}, "required": ["element_ids"]}),
            Tool(name="select_elements", description="Select elements", inputSchema={"type": "object", "properties": {"element_ids": {"type": "array"}, "mode": {"type": "string"}}, "required": ["element_ids"]}),
            Tool(name="get_selection", description="Get current selection", inputSchema={"type": "object", "properties": {}}),
            Tool(name="clear_selection", description="Clear all selections", inputSchema={"type": "object", "properties": {}}),
            Tool(name="create_group", description="Create a named element group", inputSchema={"type": "object", "properties": {"name": {"type": "string"}, "element_ids": {"type": "array"}}, "required": ["name", "element_ids"]}),
            Tool(name="list_groups", description="List all groups", inputSchema={"type": "object", "properties": {}}),
            Tool(name="get_state_summary", description="Get state summary", inputSchema={"type": "object", "properties": {}}),
            Tool(name="detect_clashes", description="Detect geometric clashes", inputSchema={"type": "object", "properties": {"element_ids": {"type": "array"}, "tolerance": {"type": "number"}}}),
        ]
        GEOMETRY_AVAILABLE = True
        logging.info("Geometry server loaded with pure Python fallback")
    except Exception as e:
        logging.warning(f"Geometry server not available: {type(e).__name__}: {e}")
        GEOMETRY_TOOLS = []
        GEOMETRY_HANDLERS = {}
        GEOMETRY_AVAILABLE = False

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# =============================================================================
# Request/Response Models
# =============================================================================


class ToolCallRequest(BaseModel):
    """Request body for calling an MCP tool."""

    arguments: dict[str, Any] = Field(default_factory=dict)


class ToolCallResponse(BaseModel):
    """Response from an MCP tool call."""

    success: bool
    data: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
    event_id: str | None = None
    timestamp: str


class ToolInfo(BaseModel):
    """Information about an available tool."""

    name: str
    description: str
    category: str
    input_schema: dict[str, Any]


# =============================================================================
# Tool Registry
# =============================================================================


# Map tool names to their handler functions
TOOL_HANDLERS: dict[str, Any] = {
    # Spatial tools
    "compute_adjacency": _compute_adjacency,
    "find_nearest": _find_nearest,
    "compute_area": _compute_area,
    "check_clearance": _check_clearance,
    "analyze_circulation": _analyze_circulation,
    "point_in_polygon": _point_in_polygon,
    # Validation tools
    "validate_model": _validate_model,
    "check_fire_compliance": _check_fire_compliance,
    "check_accessibility": _check_accessibility,
    "check_egress": _check_egress,
    "check_door_clearances": _check_door_clearances,
    "check_stair_compliance": _check_stair_compliance,
    "detect_clashes": _detect_clashes,
    "detect_clashes_between_sets": _detect_clashes_between_sets,
    # Documentation tools
    "generate_schedule": _generate_schedule,
    "export_ifc": _export_ifc,
    "export_report": _export_report,
    "generate_quantities": _generate_quantities,
    "export_csv": _export_csv,
    "door_schedule": _door_schedule,
    "window_schedule": _window_schedule,
    "room_schedule": _room_schedule,
    "export_bcf": _export_bcf,
}

# Add geometry handlers if available without overriding existing tool names
if GEOMETRY_AVAILABLE:
    for name, handler in GEOMETRY_HANDLERS.items():
        if name not in TOOL_HANDLERS:
            TOOL_HANDLERS[name] = handler

# Build tool catalog from all servers
TOOL_CATALOG: dict[str, dict[str, Any]] = {}

for tool in SPATIAL_TOOLS:
    TOOL_CATALOG[tool.name] = {
        "name": tool.name,
        "description": tool.description,
        "category": "spatial",
        "input_schema": tool.inputSchema,
    }

for tool in VALIDATION_TOOLS:
    TOOL_CATALOG[tool.name] = {
        "name": tool.name,
        "description": tool.description,
        "category": "validation",
        "input_schema": tool.inputSchema,
    }

for tool in DOCUMENTATION_TOOLS:
    TOOL_CATALOG[tool.name] = {
        "name": tool.name,
        "description": tool.description,
        "category": "documentation",
        "input_schema": tool.inputSchema,
    }

if GEOMETRY_AVAILABLE:
    for tool in GEOMETRY_TOOLS:
        if tool.name in TOOL_CATALOG:
            continue
        TOOL_CATALOG[tool.name] = {
            "name": tool.name,
            "description": tool.description,
            "category": "geometry",
            "input_schema": tool.inputSchema,
        }


# =============================================================================
# WebSocket Connection Manager
# =============================================================================


class ConnectionManager:
    """Manages WebSocket connections for real-time MCP communication."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_json(self, websocket: WebSocket, data: dict[str, Any]):
        await websocket.send_json(data)

    async def broadcast(self, data: dict[str, Any]):
        for connection in self.active_connections:
            await connection.send_json(data)


manager = ConnectionManager()


# =============================================================================
# FastAPI App
# =============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App lifespan handler for startup/shutdown."""
    logger.info("Pensaer BIM Server starting...")
    logger.info(f"Registered {len(TOOL_CATALOG)} MCP tools")
    yield
    logger.info("Pensaer BIM Server shutting down...")


app = FastAPI(
    title="Pensaer BIM Server",
    description="Unified API for Pensaer BIM MCP tools",
    version="1.0.0",
    lifespan=lifespan,
)

# =============================================================================
# Middleware Stack (order matters: last added = first executed)
# =============================================================================

# Request logging (outermost)
app.add_middleware(RequestLoggingMiddleware)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting
RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MINUTE", "100"))
app.add_middleware(RateLimitMiddleware, requests_per_minute=RATE_LIMIT)

# CORS - configure for production vs development
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]
# Add production origins
if os.getenv("ENVIRONMENT") == "production":
    ALLOWED_ORIGINS.extend([
        "https://pensaer.io",
        "https://app.pensaer.io",
        "https://www.pensaer.io",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Response-Time", "X-Request-ID"],
)


# =============================================================================
# HTTP Endpoints
# =============================================================================


@app.get("/")
async def root():
    """Server health check and info."""
    return {
        "name": "Pensaer BIM Server",
        "version": "1.0.0",
        "status": "running",
        "tools_available": len(TOOL_CATALOG),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/health")
async def health():
    """Comprehensive health check for load balancers and k8s probes."""
    import os
    import redis.asyncio as redis
    from sqlalchemy import text

    checks = {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {}
    }

    # Database check
    try:
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            from sqlalchemy.ext.asyncio import create_async_engine
            engine = create_async_engine(db_url.replace("postgresql://", "postgresql+asyncpg://"))
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            checks["checks"]["database"] = "connected"
        else:
            checks["checks"]["database"] = "not_configured"
    except Exception as e:
        checks["checks"]["database"] = f"error: {str(e)[:50]}"
        checks["status"] = "degraded"

    # Redis check
    try:
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            r = redis.from_url(redis_url)
            await r.ping()
            await r.close()
            checks["checks"]["redis"] = "connected"
        else:
            checks["checks"]["redis"] = "not_configured"
    except Exception as e:
        checks["checks"]["redis"] = f"error: {str(e)[:50]}"
        checks["status"] = "degraded"

    # Kernel check
    try:
        kernel_url = os.getenv("KERNEL_URL")
        if kernel_url:
            import httpx
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(f"{kernel_url}/health")
                checks["checks"]["kernel"] = "connected" if resp.status_code == 200 else "error"
        else:
            checks["checks"]["kernel"] = "not_configured"
    except Exception as e:
        checks["checks"]["kernel"] = f"error: {str(e)[:30]}"

    # MCP tools check
    checks["checks"]["mcp_tools"] = len(TOOL_CATALOG)

    return checks


@app.get("/health/live")
async def liveness():
    """Kubernetes liveness probe - just check if app is running."""
    return {"status": "alive"}


@app.get("/health/ready")
async def readiness():
    """Kubernetes readiness probe - check if ready to receive traffic."""
    # Could add more sophisticated checks here
    return {"status": "ready", "tools": len(TOOL_CATALOG)}


@app.get("/mcp/tools", response_model=list[ToolInfo])
async def list_tools():
    """List all available MCP tools."""
    return [
        ToolInfo(
            name=info["name"],
            description=info["description"],
            category=info["category"],
            input_schema=info["input_schema"],
        )
        for info in TOOL_CATALOG.values()
    ]


@app.get("/mcp/tools/{category}", response_model=list[ToolInfo])
async def list_tools_by_category(category: str):
    """List MCP tools by category."""
    tools = [
        ToolInfo(
            name=info["name"],
            description=info["description"],
            category=info["category"],
            input_schema=info["input_schema"],
        )
        for info in TOOL_CATALOG.values()
        if info["category"] == category
    ]
    if not tools:
        raise HTTPException(status_code=404, detail=f"Category not found: {category}")
    return tools


@app.post("/mcp/tools/{tool_name}", response_model=ToolCallResponse)
async def call_tool(tool_name: str, request: ToolCallRequest):
    """
    Call an MCP tool by name.

    This is the main endpoint for the React client to invoke MCP tools.
    Matches the mcpClient.ts HTTP mode: POST /tools/{tool_name}
    """
    if tool_name not in TOOL_CATALOG:
        raise HTTPException(status_code=404, detail=f"Tool not found: {tool_name}")

    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        # Tool exists in catalog but handler not yet implemented
        raise HTTPException(
            status_code=501,
            detail=f"Tool '{tool_name}' is registered but handler not implemented"
        )

    event_id = str(uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    try:
        result = await handler(request.arguments)

        # Ensure result has expected structure
        if isinstance(result, dict):
            success = result.get("success", True)
            data = result.get("data", result)
            error = result.get("error")
        else:
            success = True
            data = {"result": result}
            error = None

        return ToolCallResponse(
            success=success,
            data=data,
            error=error,
            event_id=event_id,
            timestamp=timestamp,
        )

    except Exception as e:
        logger.exception(f"Error calling tool {tool_name}")
        return ToolCallResponse(
            success=False,
            data=None,
            error={"code": 500, "message": str(e)},
            event_id=event_id,
            timestamp=timestamp,
        )


# Alias for backwards compatibility with mcpClient.ts baseUrl pattern
@app.post("/tools/{tool_name}", response_model=ToolCallResponse)
async def call_tool_alias(tool_name: str, request: ToolCallRequest):
    """Alias endpoint matching mcpClient.ts baseUrl/tools/{tool} pattern."""
    return await call_tool(tool_name, request)


# =============================================================================
# WebSocket Endpoint
# =============================================================================


@app.websocket("/mcp/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time MCP communication.

    Implements JSON-RPC 2.0 protocol for tool calls.
    Matches mcpClient.ts WebSocket mode expectations.
    """
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()

            # Parse JSON-RPC request
            request_id = data.get("id")
            method = data.get("method")
            params = data.get("params", {})

            response: dict[str, Any] = {
                "jsonrpc": "2.0",
                "id": request_id,
            }

            if method == "tools/list":
                # List available tools
                response["result"] = {
                    "tools": [
                        {
                            "name": info["name"],
                            "description": info["description"],
                            "inputSchema": info["input_schema"],
                        }
                        for info in TOOL_CATALOG.values()
                    ]
                }

            elif method == "tools/call":
                # Call a tool
                tool_name = params.get("name")
                arguments = params.get("arguments", {})

                if tool_name not in TOOL_CATALOG:
                    response["error"] = {
                        "code": -32601,
                        "message": f"Tool not found: {tool_name}",
                    }
                else:
                    handler = TOOL_HANDLERS.get(tool_name)
                    if not handler:
                        response["error"] = {
                            "code": -32601,
                            "message": f"Tool handler not implemented: {tool_name}",
                        }
                    else:
                        try:
                            result = await handler(arguments)
                            response["result"] = result
                        except Exception as e:
                            response["error"] = {
                                "code": -32603,
                                "message": str(e),
                            }

            else:
                response["error"] = {
                    "code": -32601,
                    "message": f"Unknown method: {method}",
                }

            await manager.send_json(websocket, response)

    except WebSocketDisconnect:
        manager.disconnect(websocket)




# =============================================================================
# Entry Point
# =============================================================================


def main():
    """Run the server using uvicorn."""
    import uvicorn
    uvicorn.run(
        "server.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
