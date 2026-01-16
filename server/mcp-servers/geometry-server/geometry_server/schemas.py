"""Pydantic schemas for Geometry MCP Server tools.

All dimensions are in model units (meters by default).
The documentation uses mm, but the Rust kernel uses meters.
Conversion can be applied at the API boundary if needed.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


# =============================================================================
# Common Types
# =============================================================================

Point2D = tuple[float, float]
Point3D = tuple[float, float, float]


class BoundingBox(BaseModel):
    """3D axis-aligned bounding box."""

    min: Point3D = Field(..., description="Minimum corner (x, y, z)")
    max: Point3D = Field(..., description="Maximum corner (x, y, z)")


class Plane(BaseModel):
    """3D plane definition."""

    origin: Point3D = Field(..., description="Point on the plane")
    normal: Point3D = Field(..., description="Normal vector")


# =============================================================================
# Wall Tool Schemas
# =============================================================================


class CreateWallParams(BaseModel):
    """Parameters for creating a wall element."""

    start: Point2D = Field(..., description="Start point (x, y) in meters")
    end: Point2D = Field(..., description="End point (x, y) in meters")
    height: float = Field(3.0, description="Wall height in meters", gt=0)
    thickness: float = Field(0.2, description="Wall thickness in meters", gt=0)
    wall_type: str | None = Field(
        None, description="Wall type: basic, structural, curtain, retaining"
    )
    level_id: str | None = Field(None, description="UUID of hosting level")
    reasoning: str | None = Field(
        None, description="AI agent reasoning for this action"
    )

    @field_validator("wall_type")
    @classmethod
    def validate_wall_type(cls, v: str | None) -> str | None:
        if v is not None:
            valid_types = {"basic", "structural", "curtain", "retaining"}
            if v.lower() not in valid_types:
                raise ValueError(f"wall_type must be one of: {valid_types}")
            return v.lower()
        return v


class CreateRectangularWallsParams(BaseModel):
    """Parameters for creating 4 walls forming a rectangle."""

    min_point: Point2D = Field(..., description="Minimum corner (x, y)")
    max_point: Point2D = Field(..., description="Maximum corner (x, y)")
    height: float = Field(3.0, description="Wall height in meters", gt=0)
    thickness: float = Field(0.2, description="Wall thickness in meters", gt=0)
    reasoning: str | None = Field(None, description="AI agent reasoning")


# =============================================================================
# Floor Tool Schemas
# =============================================================================


class CreateFloorParams(BaseModel):
    """Parameters for creating a floor element."""

    min_point: Point2D = Field(..., description="Minimum corner (x, y)")
    max_point: Point2D = Field(..., description="Maximum corner (x, y)")
    thickness: float = Field(0.3, description="Floor thickness in meters", gt=0)
    floor_type: str | None = Field(
        None, description="Floor type: slab, suspended, foundation"
    )
    level_id: str | None = Field(None, description="UUID of hosting level")
    reasoning: str | None = Field(None, description="AI agent reasoning")

    @field_validator("floor_type")
    @classmethod
    def validate_floor_type(cls, v: str | None) -> str | None:
        if v is not None:
            valid_types = {"slab", "suspended", "foundation"}
            if v.lower() not in valid_types:
                raise ValueError(f"floor_type must be one of: {valid_types}")
            return v.lower()
        return v


# =============================================================================
# Room Tool Schemas
# =============================================================================


class CreateRoomParams(BaseModel):
    """Parameters for creating a room element."""

    name: str = Field(..., description="Room name (e.g., 'Living Room')")
    number: str = Field(..., description="Room number (e.g., '101')")
    min_point: Point2D = Field(..., description="Minimum corner (x, y)")
    max_point: Point2D = Field(..., description="Maximum corner (x, y)")
    height: float = Field(3.0, description="Room height in meters", gt=0)
    reasoning: str | None = Field(None, description="AI agent reasoning")


# =============================================================================
# Opening Tool Schemas
# =============================================================================


class PlaceDoorParams(BaseModel):
    """Parameters for placing a door in a wall."""

    wall_id: str = Field(..., description="UUID of the wall to place door in")
    offset: float = Field(
        ..., description="Distance from wall start to door center (meters)"
    )
    width: float = Field(0.9, description="Door width in meters", gt=0)
    height: float = Field(2.1, description="Door height in meters", gt=0)
    door_type: str | None = Field(
        None,
        description="Door type: single, double, sliding, folding, revolving, pocket",
    )
    swing: str | None = Field(
        None, description="Swing direction: left, right, both, none"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")

    @field_validator("door_type")
    @classmethod
    def validate_door_type(cls, v: str | None) -> str | None:
        if v is not None:
            valid_types = {
                "single",
                "double",
                "sliding",
                "folding",
                "revolving",
                "pocket",
            }
            if v.lower() not in valid_types:
                raise ValueError(f"door_type must be one of: {valid_types}")
            return v.lower()
        return v

    @field_validator("swing")
    @classmethod
    def validate_swing(cls, v: str | None) -> str | None:
        if v is not None:
            valid_swings = {"left", "right", "both", "none"}
            if v.lower() not in valid_swings:
                raise ValueError(f"swing must be one of: {valid_swings}")
            return v.lower()
        return v


class PlaceWindowParams(BaseModel):
    """Parameters for placing a window in a wall."""

    wall_id: str = Field(..., description="UUID of the wall to place window in")
    offset: float = Field(
        ..., description="Distance from wall start to window center (meters)"
    )
    width: float = Field(1.2, description="Window width in meters", gt=0)
    height: float = Field(1.0, description="Window height in meters", gt=0)
    sill_height: float = Field(
        0.9, description="Height from floor to window sill (meters)", ge=0
    )
    window_type: str | None = Field(
        None,
        description="Window type: fixed, casement, double_hung, sliding, awning, hopper, pivot",
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")

    @field_validator("window_type")
    @classmethod
    def validate_window_type(cls, v: str | None) -> str | None:
        if v is not None:
            valid_types = {
                "fixed",
                "casement",
                "double_hung",
                "sliding",
                "awning",
                "hopper",
                "pivot",
            }
            if v.lower() not in valid_types:
                raise ValueError(f"window_type must be one of: {valid_types}")
            return v.lower()
        return v


class CreateOpeningParams(BaseModel):
    """Parameters for creating a generic opening in a wall."""

    host_id: str = Field(..., description="UUID of the host wall")
    offset: float = Field(
        ..., description="Distance from wall start to opening center (meters)"
    )
    width: float = Field(..., description="Opening width in meters", gt=0)
    height: float = Field(..., description="Opening height in meters", gt=0)
    base_height: float = Field(
        0.0, description="Height from floor to opening base (meters)", ge=0
    )
    opening_type: str = Field(
        "generic", description="Opening type: door, window, generic"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


# =============================================================================
# Join Tool Schemas
# =============================================================================


class DetectJoinsParams(BaseModel):
    """Parameters for detecting wall joins."""

    wall_ids: list[str] = Field(..., description="List of wall UUIDs to analyze")
    tolerance: float = Field(
        0.001, description="Distance tolerance for join detection (meters)"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class ComputeJoinGeometryParams(BaseModel):
    """Parameters for computing join geometry."""

    wall_ids: list[str] = Field(..., description="Wall UUIDs participating in the join")
    join_id: str = Field(..., description="UUID of the detected join")
    tolerance: float = Field(0.001, description="Distance tolerance (meters)")
    reasoning: str | None = Field(None, description="AI agent reasoning")


class JoinElementsParams(BaseModel):
    """Parameters for joining elements."""

    element_ids: list[str] = Field(..., description="UUIDs of elements to join")
    join_type: str = Field("auto", description="Join type: auto, miter, butt")
    reasoning: str | None = Field(None, description="AI agent reasoning")


# =============================================================================
# Element Operation Schemas
# =============================================================================


class GetElementParams(BaseModel):
    """Parameters for getting an element by ID."""

    element_id: str = Field(..., description="UUID of the element")


class ListElementsParams(BaseModel):
    """Parameters for listing elements."""

    category: str | None = Field(
        None, description="Filter by category: walls, floors, doors, windows, rooms"
    )
    level_id: str | None = Field(None, description="Filter by level UUID")
    limit: int = Field(100, description="Maximum number of results", ge=1, le=1000)
    offset: int = Field(0, description="Number of results to skip", ge=0)


class MoveElementParams(BaseModel):
    """Parameters for moving an element."""

    element_id: str = Field(..., description="UUID of the element to move")
    delta: Point3D = Field(..., description="Translation delta (dx, dy, dz) in meters")
    reasoning: str | None = Field(None, description="AI agent reasoning")


class CopyElementParams(BaseModel):
    """Parameters for copying an element."""

    element_id: str = Field(..., description="UUID of the element to copy")
    to_location: Point3D | None = Field(None, description="Target location (x, y, z)")
    delta: Point3D | None = Field(None, description="Translation delta (dx, dy, dz)")
    reasoning: str | None = Field(None, description="AI agent reasoning")


class DeleteElementParams(BaseModel):
    """Parameters for deleting elements."""

    element_ids: list[str] = Field(..., description="UUIDs of elements to delete")
    reasoning: str | None = Field(None, description="AI agent reasoning")


class ModifyParameterParams(BaseModel):
    """Parameters for modifying an element property."""

    element_id: str = Field(..., description="UUID of the element")
    parameter_name: str = Field(..., description="Name of the parameter to modify")
    value: Any = Field(..., description="New value for the parameter")
    reasoning: str | None = Field(None, description="AI agent reasoning")


# =============================================================================
# Mesh Tool Schemas
# =============================================================================


class GenerateMeshParams(BaseModel):
    """Parameters for generating a mesh."""

    element_id: str = Field(..., description="UUID of the element")
    format: str = Field("json", description="Output format: json, obj")


class MergeMeshesParams(BaseModel):
    """Parameters for merging multiple meshes."""

    element_ids: list[str] = Field(
        ..., description="UUIDs of elements to merge meshes from"
    )
    format: str = Field("json", description="Output format: json, obj")


class ValidateMeshParams(BaseModel):
    """Parameters for validating a mesh."""

    element_id: str = Field(..., description="UUID of the element")


# =============================================================================
# Building Tool Schemas
# =============================================================================


class CreateSimpleBuildingParams(BaseModel):
    """Parameters for creating a simple rectangular building."""

    min_point: Point2D = Field(..., description="Minimum corner (x, y)")
    max_point: Point2D = Field(..., description="Maximum corner (x, y)")
    wall_height: float = Field(3.0, description="Wall height in meters", gt=0)
    wall_thickness: float = Field(0.2, description="Wall thickness in meters", gt=0)
    floor_thickness: float = Field(0.3, description="Floor thickness in meters", gt=0)
    room_name: str = Field(..., description="Name for the room")
    room_number: str = Field(..., description="Room number")
    reasoning: str | None = Field(None, description="AI agent reasoning")


# =============================================================================
# Roof Tool Schemas
# =============================================================================


class CreateRoofParams(BaseModel):
    """Parameters for creating a roof element."""

    min_point: Point2D = Field(..., description="Minimum corner (x, y)")
    max_point: Point2D = Field(..., description="Maximum corner (x, y)")
    thickness: float = Field(0.25, description="Roof thickness in meters", gt=0)
    roof_type: str = Field(
        "flat", description="Roof type: flat, gable, hip, shed, mansard"
    )
    slope_degrees: float = Field(
        30.0, description="Slope angle in degrees", ge=0, le=85
    )
    ridge_along_x: bool = Field(
        True, description="Ridge direction: True for X-axis, False for Y-axis"
    )
    eave_overhang: float = Field(0.3, description="Eave overhang in meters", ge=0)
    base_elevation: float = Field(
        0.0, description="Base elevation (height above ground)"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")

    @field_validator("roof_type")
    @classmethod
    def validate_roof_type(cls, v: str) -> str:
        valid_types = {"flat", "gable", "hip", "shed", "mansard"}
        if v.lower() not in valid_types:
            raise ValueError(f"roof_type must be one of: {valid_types}")
        return v.lower()


class AttachRoofToWallsParams(BaseModel):
    """Parameters for attaching a roof to walls."""

    roof_id: str = Field(..., description="UUID of the roof element")
    wall_ids: list[str] = Field(..., description="UUIDs of walls to attach the roof to")
    reasoning: str | None = Field(None, description="AI agent reasoning")


# =============================================================================
# Selection Tool Schemas
# =============================================================================


class SelectElementsParams(BaseModel):
    """Parameters for selecting elements."""

    element_ids: list[str] = Field(..., description="UUIDs of elements to select")
    mode: str = Field(
        "replace",
        description="Selection mode: replace (clear and select), add (add to selection), "
        "remove (remove from selection), toggle (toggle selection state)",
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, v: str) -> str:
        valid_modes = {"replace", "add", "remove", "toggle"}
        if v.lower() not in valid_modes:
            raise ValueError(f"mode must be one of: {valid_modes}")
        return v.lower()


class GetSelectionParams(BaseModel):
    """Parameters for getting the current selection."""

    include_details: bool = Field(
        False, description="Include full element properties in response"
    )
    category: str | None = Field(
        None, description="Filter selection by element type (wall, floor, door, etc.)"
    )


class ClearSelectionParams(BaseModel):
    """Parameters for clearing the selection."""

    reasoning: str | None = Field(None, description="AI agent reasoning")


class SelectByTypeParams(BaseModel):
    """Parameters for selecting elements by type."""

    element_type: str = Field(
        ..., description="Element type to select (wall, floor, door, window, room, roof)"
    )
    mode: str = Field("replace", description="Selection mode: replace, add, toggle")
    reasoning: str | None = Field(None, description="AI agent reasoning")


class SelectByAreaParams(BaseModel):
    """Parameters for selecting elements within an area."""

    min_point: Point2D = Field(..., description="Minimum corner of selection area (x, y)")
    max_point: Point2D = Field(..., description="Maximum corner of selection area (x, y)")
    mode: str = Field("replace", description="Selection mode: replace, add, toggle")
    reasoning: str | None = Field(None, description="AI agent reasoning")


# =============================================================================
# Group Tool Schemas
# =============================================================================


class CreateGroupParams(BaseModel):
    """Parameters for creating an element group."""

    name: str = Field(..., description="Name for the group")
    element_ids: list[str] = Field(..., description="UUIDs of elements to include")
    metadata: dict[str, Any] | None = Field(
        None, description="Optional metadata for the group"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class AddToGroupParams(BaseModel):
    """Parameters for adding elements to a group."""

    group_id: str = Field(..., description="UUID of the group")
    element_ids: list[str] = Field(..., description="UUIDs of elements to add")
    reasoning: str | None = Field(None, description="AI agent reasoning")


class RemoveFromGroupParams(BaseModel):
    """Parameters for removing elements from a group."""

    group_id: str = Field(..., description="UUID of the group")
    element_ids: list[str] = Field(..., description="UUIDs of elements to remove")
    reasoning: str | None = Field(None, description="AI agent reasoning")


class DeleteGroupParams(BaseModel):
    """Parameters for deleting a group."""

    group_id: str = Field(..., description="UUID of the group to delete")
    reasoning: str | None = Field(None, description="AI agent reasoning")


class GetGroupParams(BaseModel):
    """Parameters for getting a group."""

    group_id: str = Field(..., description="UUID of the group")
    include_details: bool = Field(
        False, description="Include full element properties in response"
    )


class ListGroupsParams(BaseModel):
    """Parameters for listing groups."""

    include_elements: bool = Field(False, description="Include element IDs in response")


class SelectGroupParams(BaseModel):
    """Parameters for selecting all elements in a group."""

    group_id: str = Field(..., description="UUID of the group to select")
    mode: str = Field("replace", description="Selection mode: replace, add, toggle")
    reasoning: str | None = Field(None, description="AI agent reasoning")


# =============================================================================
# Response Schemas
# =============================================================================


class AuditInfo(BaseModel):
    """Audit trail information."""

    user_id: str | None = None
    agent_id: str | None = None
    reasoning: str | None = None


class MCPResponse(BaseModel):
    """Standard MCP response envelope."""

    success: bool
    data: dict[str, Any] | None = None
    event_id: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    warnings: list[str] = Field(default_factory=list)
    audit: AuditInfo = Field(default_factory=AuditInfo)


class MCPError(BaseModel):
    """Standard MCP error response."""

    success: bool = False
    error: dict[str, Any]
    event_id: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Error codes
class ErrorCodes:
    """Standard MCP error codes."""

    INVALID_PARAMS = -32602
    ELEMENT_NOT_FOUND = 1001
    CONSTRAINT_VIOLATION = 1002
    PERMISSION_DENIED = 1003
    APPROVAL_REQUIRED = 1004
    INTERNAL_ERROR = 1005
