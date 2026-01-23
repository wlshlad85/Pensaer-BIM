"""Shared state access for the Spatial MCP Server.

The spatial server needs access to elements created by the geometry server.
For now, we maintain a separate state that can be populated by tool calls.
In production, this will read from the shared event store.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


@dataclass
class SpatialElement:
    """Record of an element with spatial data."""

    id: str
    element_type: str
    bbox_min: tuple[float, float, float]  # (x, y, z) minimum
    bbox_max: tuple[float, float, float]  # (x, y, z) maximum
    centroid: tuple[float, float]  # (x, y) center
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass
class RoomRecord:
    """Record of a detected or created room."""

    id: str
    name: str
    number: str
    boundary_wall_ids: list[str]
    area: float
    centroid: tuple[float, float]
    height: float = 2.7
    function: str = ""
    adjacent_room_ids: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class SpatialState:
    """In-memory state manager for spatial analysis.

    Stores elements and rooms for spatial queries.
    """

    def __init__(self):
        self._elements: dict[str, SpatialElement] = {}
        self._rooms: dict[str, RoomRecord] = {}
        self._adjacencies: dict[str, set[str]] = {}  # room_id -> set of adjacent room_ids

    def add_element(
        self,
        element_id: str,
        element_type: str,
        bbox_min: tuple[float, float, float],
        bbox_max: tuple[float, float, float],
        properties: dict[str, Any] | None = None,
    ) -> str:
        """Add an element for spatial indexing."""
        centroid = (
            (bbox_min[0] + bbox_max[0]) / 2,
            (bbox_min[1] + bbox_max[1]) / 2,
        )
        self._elements[element_id] = SpatialElement(
            id=element_id,
            element_type=element_type,
            bbox_min=bbox_min,
            bbox_max=bbox_max,
            centroid=centroid,
            properties=properties or {},
        )
        return element_id

    def get_element(self, element_id: str) -> SpatialElement | None:
        """Get an element by ID."""
        return self._elements.get(element_id)

    def list_elements(self, element_type: str | None = None) -> list[SpatialElement]:
        """List elements, optionally filtered by type."""
        if element_type:
            return [e for e in self._elements.values() if e.element_type == element_type]
        return list(self._elements.values())

    def find_elements_in_bbox(
        self,
        min_point: tuple[float, float],
        max_point: tuple[float, float],
        element_type: str | None = None,
    ) -> list[SpatialElement]:
        """Find elements whose bounding boxes intersect with the given bbox."""
        results = []
        for elem in self._elements.values():
            if element_type and elem.element_type != element_type:
                continue

            # Check 2D bbox intersection
            if (
                elem.bbox_max[0] >= min_point[0]
                and elem.bbox_min[0] <= max_point[0]
                and elem.bbox_max[1] >= min_point[1]
                and elem.bbox_min[1] <= max_point[1]
            ):
                results.append(elem)
        return results

    def find_elements_within_radius(
        self,
        center: tuple[float, float],
        radius: float,
        element_type: str | None = None,
    ) -> list[tuple[SpatialElement, float]]:
        """Find elements within radius of a point, returning (element, distance) pairs."""
        import math

        results = []
        for elem in self._elements.values():
            if element_type and elem.element_type != element_type:
                continue

            # Distance from center to element centroid
            dx = elem.centroid[0] - center[0]
            dy = elem.centroid[1] - center[1]
            distance = math.sqrt(dx * dx + dy * dy)

            if distance <= radius:
                results.append((elem, distance))

        # Sort by distance
        results.sort(key=lambda x: x[1])
        return results

    def find_nearest_elements(
        self,
        point: tuple[float, float],
        count: int = 5,
        element_type: str | None = None,
    ) -> list[tuple[SpatialElement, float]]:
        """Find the N nearest elements to a point."""
        import math

        distances = []
        for elem in self._elements.values():
            if element_type and elem.element_type != element_type:
                continue

            dx = elem.centroid[0] - point[0]
            dy = elem.centroid[1] - point[1]
            distance = math.sqrt(dx * dx + dy * dy)
            distances.append((elem, distance))

        # Sort by distance and return top N
        distances.sort(key=lambda x: x[1])
        return distances[:count]

    def add_room(
        self,
        room_id: str | None,
        name: str,
        number: str,
        boundary_wall_ids: list[str],
        area: float,
        centroid: tuple[float, float],
        height: float = 2.7,
        function: str = "",
    ) -> str:
        """Add a room to the spatial state."""
        room_id = room_id or str(uuid4())
        self._rooms[room_id] = RoomRecord(
            id=room_id,
            name=name,
            number=number,
            boundary_wall_ids=boundary_wall_ids,
            area=area,
            centroid=centroid,
            height=height,
            function=function,
        )
        return room_id

    def get_room(self, room_id: str) -> RoomRecord | None:
        """Get a room by ID."""
        return self._rooms.get(room_id)

    def list_rooms(self) -> list[RoomRecord]:
        """List all rooms."""
        return list(self._rooms.values())

    def compute_adjacencies(self) -> dict[str, list[str]]:
        """Compute room adjacencies based on shared boundary walls."""
        self._adjacencies.clear()

        rooms = list(self._rooms.values())
        for i, room1 in enumerate(rooms):
            if room1.id not in self._adjacencies:
                self._adjacencies[room1.id] = set()

            for room2 in rooms[i + 1 :]:
                if room2.id not in self._adjacencies:
                    self._adjacencies[room2.id] = set()

                # Check for shared boundary walls
                shared_walls = set(room1.boundary_wall_ids) & set(room2.boundary_wall_ids)
                if shared_walls:
                    self._adjacencies[room1.id].add(room2.id)
                    self._adjacencies[room2.id].add(room1.id)

        # Convert to list format
        return {rid: list(adj) for rid, adj in self._adjacencies.items()}

    def get_adjacent_rooms(self, room_id: str) -> list[str]:
        """Get rooms adjacent to a given room."""
        return list(self._adjacencies.get(room_id, set()))

    def to_summary(self) -> dict[str, Any]:
        """Get summary of spatial state."""
        type_counts: dict[str, int] = {}
        for elem in self._elements.values():
            type_counts[elem.element_type] = type_counts.get(elem.element_type, 0) + 1

        return {
            "total_elements": len(self._elements),
            "total_rooms": len(self._rooms),
            "elements_by_type": type_counts,
            "adjacency_pairs": sum(len(adj) for adj in self._adjacencies.values()) // 2,
        }

    def clear(self) -> None:
        """Clear all state."""
        self._elements.clear()
        self._rooms.clear()
        self._adjacencies.clear()


# Global state instance
_state: SpatialState | None = None


def get_state() -> SpatialState:
    """Get the global state instance."""
    global _state
    if _state is None:
        _state = SpatialState()
    return _state


def reset_state() -> None:
    """Reset the global state (for testing)."""
    global _state
    _state = SpatialState()
