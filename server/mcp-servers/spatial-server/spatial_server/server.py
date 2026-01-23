"""Pensaer Spatial MCP Server.

This server exposes spatial analysis tools via the Model Context Protocol (MCP),
enabling AI agents to analyze spatial relationships in building models.

Tools provided:
- compute_adjacency - Find rooms sharing walls (adjacent rooms)
- find_nearest - Find elements within radius of a point
- compute_area - Calculate area of a polygon region
- check_clearance - Verify clearance requirements around elements
- analyze_circulation - Analyze paths between rooms

Usage:
    python -m spatial_server  # Run via stdio
"""

import asyncio
import json
import logging
import math
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from pydantic import BaseModel, Field, ValidationError

logger = logging.getLogger(__name__)


# =============================================================================
# Pydantic Schemas
# =============================================================================


class ComputeAdjacencyParams(BaseModel):
    """Parameters for compute_adjacency tool."""

    rooms: list[dict[str, Any]] = Field(
        ..., description="List of room objects with id, boundary_wall_ids"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class FindNearestParams(BaseModel):
    """Parameters for find_nearest tool."""

    x: float = Field(..., description="X coordinate in meters")
    y: float = Field(..., description="Y coordinate in meters")
    radius: float = Field(..., description="Search radius in meters")
    elements: list[dict[str, Any]] = Field(
        ..., description="List of elements with id, type, and position/bounds"
    )
    element_types: list[str] | None = Field(
        None, description="Filter by element types (e.g., ['wall', 'door'])"
    )
    limit: int = Field(10, description="Maximum results to return")
    reasoning: str | None = Field(None, description="AI agent reasoning")


class ComputeAreaParams(BaseModel):
    """Parameters for compute_area tool."""

    polygon: list[list[float]] = Field(
        ..., description="List of [x, y] coordinates forming the polygon boundary"
    )
    include_holes: list[list[list[float]]] | None = Field(
        None, description="List of hole polygons to subtract"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class CheckClearanceParams(BaseModel):
    """Parameters for check_clearance tool."""

    element: dict[str, Any] = Field(
        ..., description="Element to check clearance around"
    )
    clearance_type: str = Field(
        ..., description="Type: door_swing, wheelchair, furniture, egress"
    )
    min_clearance: float = Field(
        0.9, description="Minimum clearance distance in meters"
    )
    obstacles: list[dict[str, Any]] = Field(
        default_factory=list, description="Nearby elements that may obstruct"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class AnalyzeCirculationParams(BaseModel):
    """Parameters for analyze_circulation tool."""

    rooms: list[dict[str, Any]] = Field(..., description="List of room objects")
    doors: list[dict[str, Any]] = Field(..., description="List of door objects")
    start_room_id: str | None = Field(None, description="Starting room for path")
    end_room_id: str | None = Field(None, description="Ending room for path")
    reasoning: str | None = Field(None, description="AI agent reasoning")


class PointInPolygonParams(BaseModel):
    """Parameters for point_in_polygon tool."""

    point: list[float] = Field(..., description="[x, y] point to test")
    polygon: list[list[float]] = Field(
        ..., description="List of [x, y] vertices"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class WallSpec(BaseModel):
    """Specification for a wall element."""

    id: str | None = Field(None, description="Optional wall ID")
    start: list[float] = Field(..., description="[x, y] start point")
    end: list[float] = Field(..., description="[x, y] end point")
    height: float = Field(2.7, description="Wall height in meters")
    thickness: float = Field(0.2, description="Wall thickness in meters")


class DetectRoomsParams(BaseModel):
    """Parameters for detect_rooms tool."""

    walls: list[WallSpec] = Field(
        ..., description="List of wall objects with start/end points"
    )
    tolerance: float = Field(
        0.5, description="Node merge tolerance in mm (default 0.5mm)"
    )
    level: int = Field(0, description="Building level for multi-story detection")
    reasoning: str | None = Field(None, description="AI agent reasoning")


# =============================================================================
# Response Helpers
# =============================================================================


def make_response(
    data: dict[str, Any],
    reasoning: str | None = None,
) -> dict[str, Any]:
    """Create a standard MCP response envelope."""
    return {
        "success": True,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "audit": {"reasoning": reasoning},
    }


def make_error(code: int, message: str) -> dict[str, Any]:
    """Create a standard MCP error response."""
    return {
        "success": False,
        "error": {"code": code, "message": message},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# =============================================================================
# Geometry Utilities
# =============================================================================


def distance_2d(p1: list[float], p2: list[float]) -> float:
    """Calculate 2D Euclidean distance."""
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    return math.sqrt(dx * dx + dy * dy)


def polygon_area(vertices: list[list[float]]) -> float:
    """Calculate polygon area using the shoelace formula.

    Returns positive area for counter-clockwise vertices,
    negative for clockwise.
    """
    n = len(vertices)
    if n < 3:
        return 0.0

    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += vertices[i][0] * vertices[j][1]
        area -= vertices[j][0] * vertices[i][1]

    return area / 2.0


def polygon_centroid(vertices: list[list[float]]) -> list[float]:
    """Calculate polygon centroid."""
    n = len(vertices)
    if n == 0:
        return [0.0, 0.0]
    if n == 1:
        return vertices[0]
    if n == 2:
        return [(vertices[0][0] + vertices[1][0]) / 2,
                (vertices[0][1] + vertices[1][1]) / 2]

    area = polygon_area(vertices)
    if abs(area) < 1e-10:
        # Degenerate polygon - use simple average
        cx = sum(v[0] for v in vertices) / n
        cy = sum(v[1] for v in vertices) / n
        return [cx, cy]

    cx = 0.0
    cy = 0.0
    for i in range(n):
        j = (i + 1) % n
        cross = vertices[i][0] * vertices[j][1] - vertices[j][0] * vertices[i][1]
        cx += (vertices[i][0] + vertices[j][0]) * cross
        cy += (vertices[i][1] + vertices[j][1]) * cross

    cx /= 6.0 * area
    cy /= 6.0 * area

    return [cx, cy]


def point_in_polygon(point: list[float], polygon: list[list[float]]) -> bool:
    """Ray casting algorithm to test if point is inside polygon."""
    x, y = point[0], point[1]
    n = len(polygon)
    inside = False

    j = n - 1
    for i in range(n):
        xi, yi = polygon[i][0], polygon[i][1]
        xj, yj = polygon[j][0], polygon[j][1]

        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside

        j = i

    return inside


def bbox_center(bbox: dict[str, Any]) -> list[float]:
    """Get center point of a bounding box."""
    if "min" in bbox and "max" in bbox:
        return [
            (bbox["min"][0] + bbox["max"][0]) / 2,
            (bbox["min"][1] + bbox["max"][1]) / 2,
        ]
    elif "x" in bbox and "y" in bbox:
        return [bbox["x"], bbox["y"]]
    return [0.0, 0.0]


def point_to_bbox_distance(point: list[float], bbox: dict[str, Any]) -> float:
    """Calculate distance from point to bounding box."""
    if "min" not in bbox or "max" not in bbox:
        # If no bbox, use position if available
        if "position" in bbox:
            pos = bbox["position"]
            return distance_2d(point, [pos[0], pos[1]])
        return float("inf")

    # Clamp point to bbox
    cx = max(bbox["min"][0], min(point[0], bbox["max"][0]))
    cy = max(bbox["min"][1], min(point[1], bbox["max"][1]))

    return distance_2d(point, [cx, cy])


# =============================================================================
# Tool Implementations
# =============================================================================


async def _compute_adjacency(args: dict[str, Any]) -> dict[str, Any]:
    """Find adjacent rooms (rooms sharing walls)."""
    try:
        params = ComputeAdjacencyParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    rooms = params.rooms
    adjacency_matrix: dict[str, list[str]] = {}

    # Build wall -> rooms mapping
    wall_to_rooms: dict[str, list[str]] = {}
    for room in rooms:
        room_id = room.get("id", str(uuid4()))
        boundary_walls = room.get("boundary_wall_ids", [])

        adjacency_matrix[room_id] = []

        for wall_id in boundary_walls:
            if wall_id not in wall_to_rooms:
                wall_to_rooms[wall_id] = []
            wall_to_rooms[wall_id].append(room_id)

    # Find adjacencies (rooms sharing walls)
    for wall_id, room_ids in wall_to_rooms.items():
        if len(room_ids) == 2:
            # Two rooms share this wall - they are adjacent
            room_a, room_b = room_ids[0], room_ids[1]
            if room_b not in adjacency_matrix[room_a]:
                adjacency_matrix[room_a].append(room_b)
            if room_a not in adjacency_matrix[room_b]:
                adjacency_matrix[room_b].append(room_a)

    # Format results
    adjacency_list = [
        {
            "room_id": room_id,
            "adjacent_rooms": adjacent,
            "adjacent_count": len(adjacent),
        }
        for room_id, adjacent in adjacency_matrix.items()
    ]

    return make_response(
        {
            "adjacency": adjacency_list,
            "room_count": len(rooms),
            "total_adjacencies": sum(len(adj) for adj in adjacency_matrix.values()) // 2,
        },
        reasoning=params.reasoning,
    )


async def _find_nearest(args: dict[str, Any]) -> dict[str, Any]:
    """Find elements nearest to a point within radius."""
    try:
        params = FindNearestParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    search_point = [params.x, params.y]
    results: list[dict[str, Any]] = []

    for element in params.elements:
        # Filter by type if specified
        if params.element_types:
            etype = element.get("type", element.get("element_type", ""))
            if etype not in params.element_types:
                continue

        # Calculate distance
        if "position" in element:
            pos = element["position"]
            dist = distance_2d(search_point, [pos[0], pos[1]])
        elif "bbox" in element:
            dist = point_to_bbox_distance(search_point, element["bbox"])
        elif "start" in element and "end" in element:
            # Line element (wall) - distance to midpoint
            mid = [
                (element["start"][0] + element["end"][0]) / 2,
                (element["start"][1] + element["end"][1]) / 2,
            ]
            dist = distance_2d(search_point, mid)
        else:
            continue

        # Check if within radius
        if dist <= params.radius:
            results.append({
                "element_id": element.get("id", "unknown"),
                "element_type": element.get("type", element.get("element_type", "unknown")),
                "distance": round(dist, 4),
                "element": element,
            })

    # Sort by distance
    results.sort(key=lambda x: x["distance"])

    # Limit results
    results = results[: params.limit]

    return make_response(
        {
            "results": results,
            "count": len(results),
            "search_point": search_point,
            "search_radius": params.radius,
        },
        reasoning=params.reasoning,
    )


async def _compute_area(args: dict[str, Any]) -> dict[str, Any]:
    """Compute area of a polygon region."""
    try:
        params = ComputeAreaParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    # Calculate main polygon area
    gross_area = abs(polygon_area(params.polygon))

    # Subtract holes if any
    hole_area = 0.0
    if params.include_holes:
        for hole in params.include_holes:
            hole_area += abs(polygon_area(hole))

    net_area = gross_area - hole_area
    centroid = polygon_centroid(params.polygon)

    return make_response(
        {
            "gross_area": round(gross_area, 4),
            "hole_area": round(hole_area, 4),
            "net_area": round(net_area, 4),
            "centroid": [round(c, 4) for c in centroid],
            "vertex_count": len(params.polygon),
            "hole_count": len(params.include_holes) if params.include_holes else 0,
        },
        reasoning=params.reasoning,
    )


async def _check_clearance(args: dict[str, Any]) -> dict[str, Any]:
    """Check clearance requirements around an element."""
    try:
        params = CheckClearanceParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    element = params.element
    clearance_type = params.clearance_type
    min_clearance = params.min_clearance

    # Get element position/bounds
    element_center = [0.0, 0.0]
    if "position" in element:
        element_center = element["position"][:2]
    elif "bbox" in element:
        element_center = bbox_center(element["bbox"])

    # Define clearance requirements based on type
    clearance_specs = {
        "door_swing": {
            "description": "Door swing clearance",
            "min_distance": 0.9,  # 900mm standard
            "check_area": "arc",
        },
        "wheelchair": {
            "description": "Wheelchair turning radius",
            "min_distance": 1.5,  # 1500mm turning circle
            "check_area": "circle",
        },
        "furniture": {
            "description": "Furniture clearance",
            "min_distance": 0.6,  # 600mm passage
            "check_area": "perimeter",
        },
        "egress": {
            "description": "Egress path clearance",
            "min_distance": 1.1,  # 1100mm egress width
            "check_area": "corridor",
        },
    }

    spec = clearance_specs.get(clearance_type, clearance_specs["furniture"])
    required_clearance = max(min_clearance, spec["min_distance"])

    # Check each obstacle
    violations: list[dict[str, Any]] = []
    for obstacle in params.obstacles:
        if "position" in obstacle:
            obs_pos = obstacle["position"][:2]
            dist = distance_2d(element_center, obs_pos)
        elif "bbox" in obstacle:
            dist = point_to_bbox_distance(element_center, obstacle["bbox"])
        else:
            continue

        if dist < required_clearance:
            violations.append({
                "obstacle_id": obstacle.get("id", "unknown"),
                "obstacle_type": obstacle.get("type", "unknown"),
                "distance": round(dist, 4),
                "required": required_clearance,
                "shortage": round(required_clearance - dist, 4),
            })

    passed = len(violations) == 0

    return make_response(
        {
            "passed": passed,
            "clearance_type": clearance_type,
            "clearance_spec": spec["description"],
            "required_clearance": required_clearance,
            "violations": violations,
            "violation_count": len(violations),
            "element_id": element.get("id", "unknown"),
        },
        reasoning=params.reasoning,
    )


async def _analyze_circulation(args: dict[str, Any]) -> dict[str, Any]:
    """Analyze circulation paths between rooms via doors."""
    try:
        params = AnalyzeCirculationParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    rooms = {r.get("id"): r for r in params.rooms}
    doors = params.doors

    # Build room connectivity graph
    # door -> which rooms it connects
    graph: dict[str, list[str]] = {rid: [] for rid in rooms}

    for door in doors:
        host_wall = door.get("host_wall_id")
        # Find which rooms this door connects
        connected_rooms: list[str] = []
        for room_id, room in rooms.items():
            boundary_walls = room.get("boundary_wall_ids", [])
            if host_wall in boundary_walls:
                connected_rooms.append(room_id)

        # Add edges for connected rooms
        if len(connected_rooms) == 2:
            r1, r2 = connected_rooms
            if r2 not in graph[r1]:
                graph[r1].append(r2)
            if r1 not in graph[r2]:
                graph[r2].append(r1)

    # Calculate statistics
    connected_rooms = [rid for rid, conns in graph.items() if len(conns) > 0]
    dead_ends = [rid for rid, conns in graph.items() if len(conns) == 1]
    isolated = [rid for rid, conns in graph.items() if len(conns) == 0]

    result = {
        "graph": graph,
        "room_count": len(rooms),
        "door_count": len(doors),
        "connected_rooms": len(connected_rooms),
        "dead_end_rooms": dead_ends,
        "isolated_rooms": isolated,
    }

    # If start/end specified, find path
    if params.start_room_id and params.end_room_id:
        path = _find_path_bfs(graph, params.start_room_id, params.end_room_id)
        result["path"] = path
        result["path_length"] = len(path) - 1 if path else -1
        result["path_exists"] = path is not None

    return make_response(result, reasoning=params.reasoning)


def _find_path_bfs(
    graph: dict[str, list[str]], start: str, end: str
) -> list[str] | None:
    """BFS to find shortest path between rooms."""
    if start not in graph or end not in graph:
        return None
    if start == end:
        return [start]

    visited = {start}
    queue = [[start]]

    while queue:
        path = queue.pop(0)
        node = path[-1]

        for neighbor in graph.get(node, []):
            if neighbor == end:
                return path + [neighbor]
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])

    return None


async def _point_in_polygon(args: dict[str, Any]) -> dict[str, Any]:
    """Test if a point is inside a polygon."""
    try:
        params = PointInPolygonParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    inside = point_in_polygon(params.point, params.polygon)

    return make_response(
        {
            "inside": inside,
            "point": params.point,
            "vertex_count": len(params.polygon),
        },
        reasoning=params.reasoning,
    )


# =============================================================================
# Room Detection Implementation
# =============================================================================


class TopologyNode:
    """A node in the topology graph representing a wall endpoint."""

    def __init__(self, node_id: str, position: list[float]):
        self.id = node_id
        self.position = position
        self.edges: list[str] = []

    def add_edge(self, edge_id: str) -> None:
        if edge_id not in self.edges:
            self.edges.append(edge_id)


class TopologyEdge:
    """An edge in the topology graph representing a wall segment."""

    def __init__(self, edge_id: str, start_node: str, end_node: str, wall_id: str | None = None):
        self.id = edge_id
        self.start_node = start_node
        self.end_node = end_node
        self.wall_id = wall_id


class TopologyGraphPy:
    """Pure Python implementation of topology graph for room detection.

    Uses the "turn-right" (minimum angle) algorithm to trace closed boundaries.
    """

    def __init__(self, tolerance: float = 0.0005):
        self.nodes: dict[str, TopologyNode] = {}
        self.edges: dict[str, TopologyEdge] = {}
        self.tolerance = tolerance
        self._node_counter = 0
        self._edge_counter = 0

    def _points_within_tolerance(self, p1: list[float], p2: list[float]) -> bool:
        """Check if two points are within merge tolerance."""
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        return math.sqrt(dx * dx + dy * dy) <= self.tolerance

    def find_or_create_node(self, position: list[float]) -> str:
        """Find an existing node near position or create a new one."""
        for node in self.nodes.values():
            if self._points_within_tolerance(node.position, position):
                return node.id

        self._node_counter += 1
        node_id = f"node_{self._node_counter}"
        self.nodes[node_id] = TopologyNode(node_id, position)
        return node_id

    def add_edge(
        self,
        start_pos: list[float],
        end_pos: list[float],
        wall_id: str | None = None,
    ) -> str | None:
        """Add an edge between two positions, creating nodes as needed."""
        # Don't create zero-length edges
        if self._points_within_tolerance(start_pos, end_pos):
            return None

        start_node_id = self.find_or_create_node(start_pos)
        end_node_id = self.find_or_create_node(end_pos)

        # Don't create self-loop
        if start_node_id == end_node_id:
            return None

        self._edge_counter += 1
        edge_id = f"edge_{self._edge_counter}"
        edge = TopologyEdge(edge_id, start_node_id, end_node_id, wall_id)

        self.edges[edge_id] = edge
        self.nodes[start_node_id].add_edge(edge_id)
        self.nodes[end_node_id].add_edge(edge_id)

        return edge_id

    def _get_node_position(self, node_id: str) -> list[float]:
        """Get position of a node."""
        return self.nodes[node_id].position

    def _edge_angle(self, from_node: str, to_node: str) -> float:
        """Calculate angle of edge from from_node to to_node."""
        from_pos = self._get_node_position(from_node)
        to_pos = self._get_node_position(to_node)
        dx = to_pos[0] - from_pos[0]
        dy = to_pos[1] - from_pos[1]
        return math.atan2(dy, dx)

    def _get_outgoing_edges(self, node_id: str) -> list[tuple[str, str]]:
        """Get all edges leaving a node as (edge_id, other_node_id) pairs."""
        result = []
        node = self.nodes[node_id]
        for edge_id in node.edges:
            edge = self.edges[edge_id]
            if edge.start_node == node_id:
                result.append((edge_id, edge.end_node))
            else:
                result.append((edge_id, edge.start_node))
        return result

    def _next_edge_cw(
        self,
        current_node: str,
        incoming_from: str,
    ) -> tuple[str, str] | None:
        """Find the next edge in clockwise order (turn right).

        Given that we arrived at current_node from incoming_from,
        find the next edge by turning as far right as possible.
        """
        outgoing = self._get_outgoing_edges(current_node)
        if not outgoing:
            return None

        # Filter out the edge we came from
        outgoing = [(e, n) for e, n in outgoing if n != incoming_from]
        if not outgoing:
            # Dead end - we must go back
            for e, n in self._get_outgoing_edges(current_node):
                if n == incoming_from:
                    return (e, n)
            return None

        if len(outgoing) == 1:
            return outgoing[0]

        # Calculate incoming angle
        incoming_angle = self._edge_angle(incoming_from, current_node)

        # Find the edge with the smallest clockwise angle from incoming
        best_edge = None
        best_angle_diff = float("inf")

        for edge_id, to_node in outgoing:
            outgoing_angle = self._edge_angle(current_node, to_node)

            # Calculate clockwise angle difference
            # We want the rightmost turn, which is the largest angle going CCW
            # or equivalently the smallest angle going CW
            angle_diff = incoming_angle - outgoing_angle
            # Normalize to [0, 2*pi)
            while angle_diff < 0:
                angle_diff += 2 * math.pi
            while angle_diff >= 2 * math.pi:
                angle_diff -= 2 * math.pi

            if angle_diff < best_angle_diff:
                best_angle_diff = angle_diff
                best_edge = (edge_id, to_node)

        return best_edge

    def detect_rooms(self) -> list[dict[str, Any]]:
        """Detect all rooms (closed polygons) in the graph.

        Uses the "turn-right" algorithm to trace boundaries.
        Returns interior rooms (positive area) only.
        """
        if not self.edges:
            return []

        # Generate all half-edges (directed edges)
        half_edges: list[tuple[str, str, str]] = []  # (edge_id, from_node, to_node)
        for edge in self.edges.values():
            half_edges.append((edge.id, edge.start_node, edge.end_node))
            half_edges.append((edge.id, edge.end_node, edge.start_node))

        # Track used half-edges
        used: set[tuple[str, str, str]] = set()
        rooms: list[dict[str, Any]] = []

        for start_edge_id, start_from, start_to in half_edges:
            key = (start_edge_id, start_from, start_to)
            if key in used:
                continue

            # Trace a boundary starting from this half-edge
            boundary_nodes: list[str] = []
            boundary_edges: list[str] = []

            current_from = start_from
            current_to = start_to
            current_edge = start_edge_id

            max_iterations = len(self.edges) * 2 + 10

            for _ in range(max_iterations):
                he_key = (current_edge, current_from, current_to)

                # Check if we've completed a loop
                if he_key in used and he_key == key:
                    break
                if he_key in used and he_key != key:
                    # Already part of another room, skip
                    break

                used.add(he_key)
                boundary_nodes.append(current_from)
                boundary_edges.append(current_edge)

                # Find next edge by turning right at current_to
                next_info = self._next_edge_cw(current_to, current_from)
                if next_info is None:
                    break

                next_edge_id, next_to = next_info

                # Move to next edge
                current_from = current_to
                current_to = next_to
                current_edge = next_edge_id

                # Check if we've returned to start
                if (
                    current_edge == start_edge_id
                    and current_from == start_from
                    and current_to == start_to
                ):
                    break

            # Need at least 3 edges to form a valid room
            if len(boundary_nodes) < 3:
                continue

            # Get positions for the boundary
            positions = [
                self._get_node_position(node_id) for node_id in boundary_nodes
            ]

            # Calculate signed area using shoelace formula
            signed_area = polygon_area(positions)

            # Filter out degenerate rooms (near-zero area)
            if abs(signed_area) < 1.0:
                continue

            # Calculate centroid
            centroid = polygon_centroid(positions)

            # Get boundary wall IDs
            boundary_wall_ids = []
            for edge_id in boundary_edges:
                wall_id = self.edges[edge_id].wall_id
                if wall_id and wall_id not in boundary_wall_ids:
                    boundary_wall_ids.append(wall_id)

            rooms.append({
                "id": str(uuid4()),
                "area": abs(signed_area),
                "signed_area": signed_area,
                "centroid": centroid,
                "boundary": positions,
                "boundary_node_count": len(boundary_nodes),
                "boundary_edge_count": len(boundary_edges),
                "boundary_wall_ids": boundary_wall_ids,
                "is_exterior": signed_area < 0,  # CW = exterior, CCW = interior
            })

        # Return only interior rooms (positive signed area = CCW winding)
        return [r for r in rooms if not r["is_exterior"]]


async def _detect_rooms(args: dict[str, Any]) -> dict[str, Any]:
    """Detect rooms from wall topology.

    Analyzes wall layout to automatically detect enclosed spaces (rooms)
    by tracing closed boundaries in the wall network.
    """
    try:
        params = DetectRoomsParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    # Convert tolerance from mm to model units (meters)
    tolerance_meters = params.tolerance / 1000.0

    # Try to use Rust kernel if available
    try:
        import pensaer_geometry as pg

        # Create walls using kernel
        py_walls = []
        for wall_spec in params.walls:
            wall = pg.create_wall(
                tuple(wall_spec.start),
                tuple(wall_spec.end),
                wall_spec.height,
                wall_spec.thickness,
            )
            py_walls.append(wall)

        # Use kernel's detect_rooms
        rooms_data = pg.detect_rooms(py_walls, tolerance_meters)

        rooms = []
        for room_dict in rooms_data:
            rooms.append({
                "id": room_dict.get("id", str(uuid4())),
                "area": room_dict.get("area", 0.0),
                "centroid": list(room_dict.get("centroid", (0, 0))),
                "boundary_count": room_dict.get("boundary_count", 0),
                "boundary_wall_ids": room_dict.get("boundary_wall_ids", []),
                "is_exterior": room_dict.get("is_exterior", False),
            })

        return make_response(
            {
                "rooms": rooms,
                "room_count": len(rooms),
                "wall_count": len(params.walls),
                "level": params.level,
                "engine": "rust_kernel",
            },
            reasoning=params.reasoning,
        )

    except ImportError:
        # Fall back to pure Python implementation
        logger.info("Rust kernel not available, using Python fallback")

    # Pure Python implementation
    graph = TopologyGraphPy(tolerance=tolerance_meters)

    # Add walls as edges
    for i, wall_spec in enumerate(params.walls):
        wall_id = wall_spec.id or f"wall_{i}"
        graph.add_edge(
            wall_spec.start,
            wall_spec.end,
            wall_id=wall_id,
        )

    # Detect rooms
    detected_rooms = graph.detect_rooms()

    return make_response(
        {
            "rooms": detected_rooms,
            "room_count": len(detected_rooms),
            "wall_count": len(params.walls),
            "node_count": len(graph.nodes),
            "edge_count": len(graph.edges),
            "level": params.level,
            "engine": "python_fallback",
        },
        reasoning=params.reasoning,
    )


# =============================================================================
# Tool Definitions
# =============================================================================

TOOLS = [
    Tool(
        name="compute_adjacency",
        description="Find adjacent rooms (rooms that share walls). "
        "Input: list of room objects with boundary_wall_ids. "
        "Output: adjacency matrix showing which rooms are connected.",
        inputSchema={
            "type": "object",
            "properties": {
                "rooms": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "boundary_wall_ids": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                        "required": ["id", "boundary_wall_ids"],
                    },
                    "description": "List of room objects with boundary wall IDs",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["rooms"],
        },
    ),
    Tool(
        name="find_nearest",
        description="Find elements nearest to a point within a search radius. "
        "Supports filtering by element type. Returns sorted by distance.",
        inputSchema={
            "type": "object",
            "properties": {
                "x": {"type": "number", "description": "X coordinate in meters"},
                "y": {"type": "number", "description": "Y coordinate in meters"},
                "radius": {"type": "number", "description": "Search radius in meters"},
                "elements": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Elements to search (with id, type, position/bbox)",
                },
                "element_types": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter by types (e.g., ['wall', 'door'])",
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "description": "Max results",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["x", "y", "radius", "elements"],
        },
    ),
    Tool(
        name="compute_area",
        description="Calculate area of a polygon region using the shoelace formula. "
        "Supports holes (subtract from gross area).",
        inputSchema={
            "type": "object",
            "properties": {
                "polygon": {
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 2,
                        "maxItems": 2,
                    },
                    "description": "List of [x, y] coordinates",
                },
                "include_holes": {
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "array",
                            "items": {"type": "number"},
                        },
                    },
                    "description": "List of hole polygons to subtract",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["polygon"],
        },
    ),
    Tool(
        name="check_clearance",
        description="Verify clearance requirements around an element. "
        "Checks for obstacles within required clearance distance. "
        "Types: door_swing (0.9m), wheelchair (1.5m), furniture (0.6m), egress (1.1m).",
        inputSchema={
            "type": "object",
            "properties": {
                "element": {
                    "type": "object",
                    "description": "Element to check (with id, position/bbox)",
                },
                "clearance_type": {
                    "type": "string",
                    "enum": ["door_swing", "wheelchair", "furniture", "egress"],
                    "description": "Type of clearance requirement",
                },
                "min_clearance": {
                    "type": "number",
                    "description": "Override minimum clearance (meters)",
                },
                "obstacles": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Nearby elements that may obstruct",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["element", "clearance_type"],
        },
    ),
    Tool(
        name="analyze_circulation",
        description="Analyze circulation paths between rooms via doors. "
        "Builds a connectivity graph and optionally finds shortest path.",
        inputSchema={
            "type": "object",
            "properties": {
                "rooms": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "List of room objects with id, boundary_wall_ids",
                },
                "doors": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "List of door objects with host_wall_id",
                },
                "start_room_id": {
                    "type": "string",
                    "description": "Starting room for path finding",
                },
                "end_room_id": {
                    "type": "string",
                    "description": "Ending room for path finding",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["rooms", "doors"],
        },
    ),
    Tool(
        name="point_in_polygon",
        description="Test if a point is inside a polygon using ray casting.",
        inputSchema={
            "type": "object",
            "properties": {
                "point": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2,
                    "description": "[x, y] point to test",
                },
                "polygon": {
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {"type": "number"},
                    },
                    "description": "Polygon vertices",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["point", "polygon"],
        },
    ),
    Tool(
        name="detect_rooms",
        description="Detect enclosed rooms from wall topology. "
        "Analyzes wall layout to automatically identify enclosed spaces by tracing "
        "closed boundaries in the wall network. Returns room polygons with areas.",
        inputSchema={
            "type": "object",
            "properties": {
                "walls": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {
                                "type": "string",
                                "description": "Optional wall ID",
                            },
                            "start": {
                                "type": "array",
                                "items": {"type": "number"},
                                "minItems": 2,
                                "maxItems": 2,
                                "description": "[x, y] start point",
                            },
                            "end": {
                                "type": "array",
                                "items": {"type": "number"},
                                "minItems": 2,
                                "maxItems": 2,
                                "description": "[x, y] end point",
                            },
                            "height": {
                                "type": "number",
                                "default": 2.7,
                                "description": "Wall height in meters",
                            },
                            "thickness": {
                                "type": "number",
                                "default": 0.2,
                                "description": "Wall thickness in meters",
                            },
                        },
                        "required": ["start", "end"],
                    },
                    "description": "List of wall objects with start/end points",
                },
                "tolerance": {
                    "type": "number",
                    "default": 0.5,
                    "description": "Node merge tolerance in mm (default 0.5mm)",
                },
                "level": {
                    "type": "integer",
                    "default": 0,
                    "description": "Building level for multi-story detection",
                },
                "reasoning": {"type": "string", "description": "AI agent reasoning"},
            },
            "required": ["walls"],
        },
    ),
]


# =============================================================================
# Server Setup
# =============================================================================


def create_server() -> Server:
    """Create and configure the MCP server."""
    server = Server("pensaer-spatial-server")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        return TOOLS

    @server.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
        logger.info(f"Tool called: {name}")

        try:
            if name == "compute_adjacency":
                result = await _compute_adjacency(arguments)
            elif name == "find_nearest":
                result = await _find_nearest(arguments)
            elif name == "compute_area":
                result = await _compute_area(arguments)
            elif name == "check_clearance":
                result = await _check_clearance(arguments)
            elif name == "analyze_circulation":
                result = await _analyze_circulation(arguments)
            elif name == "point_in_polygon":
                result = await _point_in_polygon(arguments)
            elif name == "detect_rooms":
                result = await _detect_rooms(arguments)
            else:
                result = make_error(404, f"Unknown tool: {name}")

            return [TextContent(type="text", text=json.dumps(result, indent=2))]

        except Exception as e:
            logger.exception(f"Error in tool {name}")
            return [
                TextContent(
                    type="text",
                    text=json.dumps(make_error(500, str(e))),
                )
            ]

    return server


async def run_server() -> None:
    """Run the MCP server via stdio."""
    server = create_server()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream, write_stream, server.create_initialization_options()
        )


def main() -> None:
    """Entry point for the spatial MCP server."""
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
