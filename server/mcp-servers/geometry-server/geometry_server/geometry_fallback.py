"""Pure Python geometry implementation (no Rust bindings required).

This module provides fallback implementations for all geometry tools
when the pensaer_geometry Rust library is not available.

All dimensions are in meters.
"""

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import ValidationError

from .schemas import (
    CreateWallParams,
    CreateRectangularWallsParams,
    CreateFloorParams,
    CreateRoomParams,
    PlaceDoorParams,
    PlaceWindowParams,
    CreateOpeningParams,
    DetectJoinsParams,
    GetElementParams,
    ListElementsParams,
    DeleteElementParams,
    CreateRoofParams,
    SelectElementsParams,
    CreateGroupParams,
    DetectClashesParams,
)
from .state import get_state


# =============================================================================
# Element Dataclasses (Python-only, no Rust)
# =============================================================================


@dataclass
class Wall:
    """Wall element."""
    id: str
    start: tuple[float, float]
    end: tuple[float, float]
    height: float = 3.0
    thickness: float = 0.2
    wall_type: str = "basic"
    level_id: str | None = None

    @property
    def length(self) -> float:
        dx = self.end[0] - self.start[0]
        dy = self.end[1] - self.start[1]
        return math.sqrt(dx * dx + dy * dy)

    @property
    def area(self) -> float:
        return self.length * self.height

    @property
    def volume(self) -> float:
        return self.area * self.thickness

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": "wall",
            "start": list(self.start),
            "end": list(self.end),
            "height": self.height,
            "thickness": self.thickness,
            "wall_type": self.wall_type,
            "length": round(self.length, 4),
            "area": round(self.area, 4),
            "volume": round(self.volume, 4),
            "level_id": self.level_id,
        }


@dataclass
class Floor:
    """Floor/slab element."""
    id: str
    min_point: tuple[float, float]
    max_point: tuple[float, float]
    thickness: float = 0.3
    floor_type: str = "slab"
    level_id: str | None = None

    @property
    def area(self) -> float:
        dx = abs(self.max_point[0] - self.min_point[0])
        dy = abs(self.max_point[1] - self.min_point[1])
        return dx * dy

    @property
    def volume(self) -> float:
        return self.area * self.thickness

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": "floor",
            "min_point": list(self.min_point),
            "max_point": list(self.max_point),
            "thickness": self.thickness,
            "floor_type": self.floor_type,
            "area": round(self.area, 4),
            "volume": round(self.volume, 4),
            "level_id": self.level_id,
        }


@dataclass
class Room:
    """Room/space element."""
    id: str
    name: str
    number: str
    min_point: tuple[float, float]
    max_point: tuple[float, float]
    height: float = 3.0
    level_id: str | None = None

    @property
    def area(self) -> float:
        dx = abs(self.max_point[0] - self.min_point[0])
        dy = abs(self.max_point[1] - self.min_point[1])
        return dx * dy

    @property
    def volume(self) -> float:
        return self.area * self.height

    @property
    def perimeter(self) -> float:
        dx = abs(self.max_point[0] - self.min_point[0])
        dy = abs(self.max_point[1] - self.min_point[1])
        return 2 * (dx + dy)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": "room",
            "name": self.name,
            "number": self.number,
            "min_point": list(self.min_point),
            "max_point": list(self.max_point),
            "height": self.height,
            "area": round(self.area, 4),
            "volume": round(self.volume, 4),
            "perimeter": round(self.perimeter, 4),
            "level_id": self.level_id,
        }


@dataclass
class Door:
    """Door opening element."""
    id: str
    wall_id: str
    offset: float
    width: float = 0.9
    height: float = 2.1
    door_type: str = "single"
    swing: str = "left"

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": "door",
            "wall_id": self.wall_id,
            "offset": self.offset,
            "width": self.width,
            "height": self.height,
            "door_type": self.door_type,
            "swing": self.swing,
        }


@dataclass
class Window:
    """Window opening element."""
    id: str
    wall_id: str
    offset: float
    width: float = 1.2
    height: float = 1.0
    sill_height: float = 0.9
    window_type: str = "fixed"

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": "window",
            "wall_id": self.wall_id,
            "offset": self.offset,
            "width": self.width,
            "height": self.height,
            "sill_height": self.sill_height,
            "window_type": self.window_type,
        }


@dataclass
class Roof:
    """Roof element."""
    id: str
    min_point: tuple[float, float]
    max_point: tuple[float, float]
    base_elevation: float = 3.0
    roof_type: str = "flat"
    slope_degrees: float = 0.0
    thickness: float = 0.25
    eave_overhang: float = 0.3
    level_id: str | None = None

    @property
    def footprint_area(self) -> float:
        dx = abs(self.max_point[0] - self.min_point[0])
        dy = abs(self.max_point[1] - self.min_point[1])
        return dx * dy

    @property
    def surface_area(self) -> float:
        # Approximate surface area accounting for slope
        if self.slope_degrees == 0:
            return self.footprint_area
        slope_factor = 1 / math.cos(math.radians(self.slope_degrees))
        return self.footprint_area * slope_factor

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": "roof",
            "min_point": list(self.min_point),
            "max_point": list(self.max_point),
            "base_elevation": self.base_elevation,
            "roof_type": self.roof_type,
            "slope_degrees": self.slope_degrees,
            "thickness": self.thickness,
            "eave_overhang": self.eave_overhang,
            "footprint_area": round(self.footprint_area, 4),
            "surface_area": round(self.surface_area, 4),
            "level_id": self.level_id,
        }


# =============================================================================
# Response Helpers
# =============================================================================


def make_response(
    data: dict[str, Any],
    event_id: str | None = None,
    warnings: list[str] | None = None,
    reasoning: str | None = None,
) -> dict[str, Any]:
    """Create a standard MCP response envelope."""
    return {
        "success": True,
        "data": data,
        "event_id": event_id or str(uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "warnings": warnings or [],
        "audit": {"reasoning": reasoning},
    }


def make_error(
    code: int, message: str, data: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Create a standard MCP error response."""
    return {
        "success": False,
        "error": {"code": code, "message": message, "data": data or {}},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# =============================================================================
# Tool Handler Functions
# =============================================================================


async def create_wall(args: dict[str, Any]) -> dict[str, Any]:
    """Create a wall element."""
    try:
        params = CreateWallParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    wall = Wall(
        id=str(uuid4()),
        start=tuple(params.start),
        end=tuple(params.end),
        height=params.height,
        thickness=params.thickness,
        wall_type=params.wall_type or "basic",
        level_id=params.level_id,
    )

    state = get_state()
    state.add_element(wall, "wall", level_id=params.level_id)

    return make_response(
        {
            "wall_id": wall.id,
            "length": wall.length,
            "height": wall.height,
            "thickness": wall.thickness,
            "wall_type": wall.wall_type,
            "area": wall.area,
            "volume": wall.volume,
        },
        reasoning=params.reasoning,
    )


async def create_rectangular_walls(args: dict[str, Any]) -> dict[str, Any]:
    """Create 4 walls forming a rectangle."""
    try:
        params = CreateRectangularWallsParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    min_x, min_y = params.min_point
    max_x, max_y = params.max_point

    corners = [
        (min_x, min_y),
        (max_x, min_y),
        (max_x, max_y),
        (min_x, max_y),
    ]

    state = get_state()
    wall_ids = []

    for i in range(4):
        start = corners[i]
        end = corners[(i + 1) % 4]

        wall = Wall(
            id=str(uuid4()),
            start=start,
            end=end,
            height=params.height,
            thickness=params.thickness,
        )
        state.add_element(wall, "wall")
        wall_ids.append(wall.id)

    return make_response(
        {
            "wall_ids": wall_ids,
            "wall_count": 4,
            "total_length": 2 * (abs(max_x - min_x) + abs(max_y - min_y)),
        },
        reasoning=params.reasoning,
    )


async def create_floor(args: dict[str, Any]) -> dict[str, Any]:
    """Create a floor/slab element."""
    try:
        params = CreateFloorParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    floor = Floor(
        id=str(uuid4()),
        min_point=tuple(params.min_point),
        max_point=tuple(params.max_point),
        thickness=params.thickness,
        floor_type=params.floor_type or "slab",
        level_id=params.level_id,
    )

    state = get_state()
    state.add_element(floor, "floor", level_id=params.level_id)

    return make_response(
        {
            "floor_id": floor.id,
            "area": floor.area,
            "thickness": floor.thickness,
            "floor_type": floor.floor_type,
            "volume": floor.volume,
        },
        reasoning=params.reasoning,
    )


async def create_room(args: dict[str, Any]) -> dict[str, Any]:
    """Create a room/space element."""
    try:
        params = CreateRoomParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    room = Room(
        id=str(uuid4()),
        name=params.name,
        number=params.number,
        min_point=tuple(params.min_point),
        max_point=tuple(params.max_point),
        height=params.height,
    )

    state = get_state()
    state.add_element(room, "room")

    return make_response(
        {
            "room_id": room.id,
            "name": room.name,
            "number": room.number,
            "area": room.area,
            "volume": room.volume,
            "perimeter": room.perimeter,
        },
        reasoning=params.reasoning,
    )


async def place_door(args: dict[str, Any]) -> dict[str, Any]:
    """Place a door in a wall."""
    try:
        params = PlaceDoorParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    state = get_state()
    wall_record = state.get_element(params.wall_id)
    if not wall_record:
        return make_error(404, f"Wall not found: {params.wall_id}")

    door = Door(
        id=str(uuid4()),
        wall_id=params.wall_id,
        offset=params.offset,
        width=params.width,
        height=params.height,
        door_type=params.door_type or "single",
        swing=params.swing or "left",
    )

    state.add_element(door, "door")

    return make_response(
        {
            "door_id": door.id,
            "wall_id": door.wall_id,
            "width": door.width,
            "height": door.height,
            "door_type": door.door_type,
            "swing": door.swing,
        },
        reasoning=params.reasoning,
    )


async def place_window(args: dict[str, Any]) -> dict[str, Any]:
    """Place a window in a wall."""
    try:
        params = PlaceWindowParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    state = get_state()
    wall_record = state.get_element(params.wall_id)
    if not wall_record:
        return make_error(404, f"Wall not found: {params.wall_id}")

    window = Window(
        id=str(uuid4()),
        wall_id=params.wall_id,
        offset=params.offset,
        width=params.width,
        height=params.height,
        sill_height=params.sill_height,
        window_type=params.window_type or "fixed",
    )

    state.add_element(window, "window")

    return make_response(
        {
            "window_id": window.id,
            "wall_id": window.wall_id,
            "width": window.width,
            "height": window.height,
            "sill_height": window.sill_height,
            "window_type": window.window_type,
        },
        reasoning=params.reasoning,
    )


async def create_roof(args: dict[str, Any]) -> dict[str, Any]:
    """Create a roof element."""
    try:
        params = CreateRoofParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    roof = Roof(
        id=str(uuid4()),
        min_point=tuple(params.min_point),
        max_point=tuple(params.max_point),
        base_elevation=params.base_elevation,
        roof_type=params.roof_type or "flat",
        slope_degrees=params.slope_degrees or 30.0,
        thickness=params.thickness,
        eave_overhang=params.eave_overhang,
        level_id=getattr(params, 'level_id', None),
    )

    state = get_state()
    state.add_element(roof, "roof", level_id=getattr(params, 'level_id', None))

    return make_response(
        {
            "roof_id": roof.id,
            "roof_type": roof.roof_type,
            "slope_degrees": roof.slope_degrees,
            "footprint_area": roof.footprint_area,
            "surface_area": roof.surface_area,
            "eave_overhang": roof.eave_overhang,
        },
        reasoning=params.reasoning,
    )


async def get_element(args: dict[str, Any]) -> dict[str, Any]:
    """Get an element by ID."""
    try:
        params = GetElementParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    state = get_state()
    record = state.get_element(params.element_id)

    if not record:
        return make_error(404, f"Element not found: {params.element_id}")

    element = record.element
    if hasattr(element, "to_dict"):
        data = element.to_dict()
    else:
        data = {"id": record.id, "type": record.element_type}

    return make_response(data)


async def list_elements(args: dict[str, Any]) -> dict[str, Any]:
    """List elements with optional filtering."""
    try:
        params = ListElementsParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    state = get_state()
    records = state.list_elements(
        category=params.category,
        level_id=params.level_id,
        limit=params.limit,
        offset=params.offset,
    )

    elements = []
    for record in records:
        element = record.element
        if hasattr(element, "to_dict"):
            elements.append(element.to_dict())
        else:
            elements.append({
                "id": record.id,
                "type": record.element_type,
                "created_at": record.created_at.isoformat(),
            })

    return make_response({
        "elements": elements,
        "count": len(elements),
        "total": state.count_elements(params.category),
    })


async def delete_element(args: dict[str, Any]) -> dict[str, Any]:
    """Delete elements by ID."""
    try:
        params = DeleteElementParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    state = get_state()
    deleted = []
    not_found = []

    for eid in params.element_ids:
        if state.delete_element(eid):
            deleted.append(eid)
        else:
            not_found.append(eid)

    return make_response({
        "deleted": deleted,
        "deleted_count": len(deleted),
        "not_found": not_found,
    })


async def select_elements(args: dict[str, Any]) -> dict[str, Any]:
    """Select elements."""
    try:
        params = SelectElementsParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    state = get_state()
    result = state.select_elements(params.element_ids, mode=params.mode)

    return make_response(result, reasoning=params.reasoning)


async def get_selection(args: dict[str, Any]) -> dict[str, Any]:
    """Get current selection."""
    state = get_state()
    return make_response(state.get_selection_summary())


async def clear_selection(args: dict[str, Any]) -> dict[str, Any]:
    """Clear all selections."""
    state = get_state()
    cleared = state.clear_selection()
    return make_response({"cleared_count": cleared})


async def create_group(args: dict[str, Any]) -> dict[str, Any]:
    """Create a named group of elements."""
    try:
        params = CreateGroupParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    state = get_state()
    group_id = state.create_group(params.name, params.element_ids)

    return make_response({
        "group_id": group_id,
        "name": params.name,
        "element_count": len(params.element_ids),
    })


async def list_groups(args: dict[str, Any]) -> dict[str, Any]:
    """List all groups."""
    state = get_state()
    groups = state.list_groups()
    return make_response({"groups": groups, "count": len(groups)})


async def get_state_summary(args: dict[str, Any]) -> dict[str, Any]:
    """Get summary of current state."""
    state = get_state()
    return make_response(state.to_summary())


async def detect_clashes(args: dict[str, Any]) -> dict[str, Any]:
    """Detect geometric clashes between elements."""
    try:
        params = DetectClashesParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    # Simple Python-based clash detection
    state = get_state()
    clashes = []

    elements_to_check = []
    if params.element_ids:
        for eid in params.element_ids:
            record = state.get_element(eid)
            if record:
                elements_to_check.append(record)
    else:
        elements_to_check = state.list_elements(limit=1000)

    # Very basic bounding box intersection check
    for i, rec_a in enumerate(elements_to_check):
        for rec_b in elements_to_check[i + 1:]:
            elem_a = rec_a.element
            elem_b = rec_b.element

            # Check if both elements have bounds
            if hasattr(elem_a, "min_point") and hasattr(elem_b, "min_point"):
                # Simple AABB intersection
                if _boxes_intersect(elem_a, elem_b, params.tolerance):
                    clashes.append({
                        "id": str(uuid4()),
                        "element_a_id": rec_a.id,
                        "element_b_id": rec_b.id,
                        "element_a_type": rec_a.element_type,
                        "element_b_type": rec_b.element_type,
                        "clash_type": "Hard",
                    })

    return make_response({
        "clashes": clashes,
        "count": len(clashes),
        "elements_checked": len(elements_to_check),
        "tolerance": params.tolerance,
    })


def _boxes_intersect(a: Any, b: Any, tolerance: float) -> bool:
    """Check if two elements' bounding boxes intersect."""
    if not hasattr(a, "min_point") or not hasattr(b, "min_point"):
        return False

    a_min = a.min_point
    a_max = a.max_point
    b_min = b.min_point
    b_max = b.max_point

    # Check for overlap in x and y
    x_overlap = (a_min[0] - tolerance <= b_max[0]) and (a_max[0] + tolerance >= b_min[0])
    y_overlap = (a_min[1] - tolerance <= b_max[1]) and (a_max[1] + tolerance >= b_min[1])

    return x_overlap and y_overlap


# =============================================================================
# Tool Handler Registry
# =============================================================================


GEOMETRY_HANDLERS: dict[str, Any] = {
    "create_wall": create_wall,
    "create_rectangular_walls": create_rectangular_walls,
    "create_floor": create_floor,
    "create_room": create_room,
    "place_door": place_door,
    "place_window": place_window,
    "create_roof": create_roof,
    "get_element": get_element,
    "list_elements": list_elements,
    "delete_element": delete_element,
    "select_elements": select_elements,
    "get_selection": get_selection,
    "clear_selection": clear_selection,
    "create_group": create_group,
    "list_groups": list_groups,
    "get_state_summary": get_state_summary,
    "detect_clashes": detect_clashes,
}
