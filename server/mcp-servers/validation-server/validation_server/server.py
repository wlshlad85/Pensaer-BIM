"""Pensaer Validation MCP Server.

This server exposes compliance validation tools via the Model Context Protocol (MCP),
enabling AI agents to check building code compliance and model quality.

Tools provided:
- validate_model - Run all validation rules against a model
- check_fire_compliance - Fire rating and compartmentalization checks
- check_accessibility - ADA/DDA accessibility compliance
- check_egress - Egress path and travel distance validation
- check_door_clearances - Door swing and clearance requirements
- check_stair_compliance - Stair dimension compliance

Usage:
    python -m validation_server  # Run via stdio
"""

import asyncio
import json
import logging
import math
from datetime import datetime
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


class ValidateModelParams(BaseModel):
    """Parameters for validate_model tool."""

    elements: list[dict[str, Any]] = Field(
        ..., description="List of all elements in the model"
    )
    rooms: list[dict[str, Any]] = Field(
        default_factory=list, description="List of room objects"
    )
    doors: list[dict[str, Any]] = Field(
        default_factory=list, description="List of door objects"
    )
    categories: list[str] | None = Field(
        None, description="Validation categories to run (None = all)"
    )
    severity_threshold: str = Field(
        "warning", description="Minimum severity to report: info, warning, error"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class CheckFireComplianceParams(BaseModel):
    """Parameters for check_fire_compliance tool."""

    elements: list[dict[str, Any]] = Field(..., description="Elements to check")
    rooms: list[dict[str, Any]] = Field(
        default_factory=list, description="Room definitions"
    )
    fire_rating_requirements: dict[str, float] = Field(
        default_factory=dict,
        description="Required fire ratings by element type (hours)",
    )
    max_compartment_area: float = Field(
        500.0, description="Maximum compartment area in m²"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class CheckAccessibilityParams(BaseModel):
    """Parameters for check_accessibility tool."""

    doors: list[dict[str, Any]] = Field(..., description="Door elements")
    corridors: list[dict[str, Any]] = Field(
        default_factory=list, description="Corridor/path elements"
    )
    rooms: list[dict[str, Any]] = Field(
        default_factory=list, description="Room definitions"
    )
    standard: str = Field(
        "ADA", description="Accessibility standard: ADA, DDA, ISO21542"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class CheckEgressParams(BaseModel):
    """Parameters for check_egress tool."""

    rooms: list[dict[str, Any]] = Field(..., description="Room definitions with exits")
    doors: list[dict[str, Any]] = Field(..., description="Door elements")
    occupancy_type: str = Field(
        "business", description="Building occupancy type"
    )
    max_travel_distance: float = Field(
        45.0, description="Maximum travel distance to exit (meters)"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class CheckDoorClearancesParams(BaseModel):
    """Parameters for check_door_clearances tool."""

    doors: list[dict[str, Any]] = Field(..., description="Door elements")
    walls: list[dict[str, Any]] = Field(
        default_factory=list, description="Wall elements near doors"
    )
    min_clear_width: float = Field(0.815, description="Minimum clear width (meters)")
    min_maneuvering_clearance: float = Field(
        1.5, description="Wheelchair maneuvering clearance (meters)"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class CheckStairComplianceParams(BaseModel):
    """Parameters for check_stair_compliance tool."""

    stairs: list[dict[str, Any]] = Field(..., description="Stair elements")
    building_code: str = Field("IBC", description="Building code: IBC, NBC, BS")
    reasoning: str | None = Field(None, description="AI agent reasoning")


class DetectClashesParams(BaseModel):
    """Parameters for detect_clashes tool."""

    elements: list[dict[str, Any]] = Field(
        ..., description="List of elements to check for clashes"
    )
    tolerance: float = Field(
        0.001, description="Tolerance for clash detection in meters (default 1mm)"
    )
    element_types: list[str] | None = Field(
        None, description="Filter by element types to check (e.g., ['wall', 'door'])"
    )
    severity_threshold: str = Field(
        "hard", description="Minimum severity: hard (penetration), soft (touch), clearance"
    )
    clearance_distance: float = Field(
        0.0, description="Clearance distance for soft clash detection (meters)"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class DetectClashesBetweenSetsParams(BaseModel):
    """Parameters for detect_clashes_between_sets tool."""

    set_a: list[dict[str, Any]] = Field(
        ..., description="First set of elements to check"
    )
    set_b: list[dict[str, Any]] = Field(
        ..., description="Second set of elements to check against"
    )
    tolerance: float = Field(
        0.001, description="Tolerance for clash detection in meters"
    )
    clearance_distance: float = Field(
        0.0, description="Clearance distance for soft clash detection"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


# =============================================================================
# Validation Issue Types
# =============================================================================


class ValidationIssue:
    """A validation issue found in the model."""

    def __init__(
        self,
        code: str,
        message: str,
        severity: str,
        category: str,
        element_id: str | None = None,
        location: list[float] | None = None,
        suggested_fix: str | None = None,
    ):
        self.id = str(uuid4())
        self.code = code
        self.message = message
        self.severity = severity  # error, warning, info
        self.category = category
        self.element_id = element_id
        self.location = location
        self.suggested_fix = suggested_fix

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "code": self.code,
            "message": self.message,
            "severity": self.severity,
            "category": self.category,
            "element_id": self.element_id,
            "location": self.location,
            "suggested_fix": self.suggested_fix,
        }


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
        "timestamp": datetime.utcnow().isoformat(),
        "audit": {"reasoning": reasoning},
    }


def make_error(code: int, message: str) -> dict[str, Any]:
    """Create a standard MCP error response."""
    return {
        "success": False,
        "error": {"code": code, "message": message},
        "timestamp": datetime.utcnow().isoformat(),
    }


# =============================================================================
# Compliance Constants
# =============================================================================

# ADA Accessibility Requirements
ADA_REQUIREMENTS = {
    "door_clear_width": 0.815,  # 32 inches minimum
    "door_maneuvering_clearance": 1.525,  # 60 inches for wheelchair
    "corridor_width": 0.915,  # 36 inches minimum
    "passing_width": 1.525,  # 60 inches for two wheelchairs
    "turning_radius": 1.525,  # 60 inches diameter
    "threshold_height": 0.0125,  # 1/2 inch max
    "door_opening_force": 22.2,  # 5 lbf max (22.2 N)
}

# Fire Rating Requirements (hours)
FIRE_RATING_DEFAULTS = {
    "exit_stair_enclosure": 2.0,
    "exit_passageway": 1.0,
    "corridor": 1.0,
    "shaft_enclosure": 2.0,
    "occupancy_separation": 2.0,
}

# Egress Requirements by Occupancy
EGRESS_REQUIREMENTS = {
    "assembly": {"max_travel": 61.0, "min_exits": 2, "occupant_factor": 0.65},
    "business": {"max_travel": 61.0, "min_exits": 2, "occupant_factor": 9.3},
    "educational": {"max_travel": 61.0, "min_exits": 2, "occupant_factor": 1.86},
    "factory": {"max_travel": 76.0, "min_exits": 2, "occupant_factor": 9.3},
    "residential": {"max_travel": 61.0, "min_exits": 2, "occupant_factor": 18.6},
    "storage": {"max_travel": 122.0, "min_exits": 2, "occupant_factor": 46.5},
}

# Stair Requirements (IBC)
STAIR_REQUIREMENTS_IBC = {
    "min_width": 1.118,  # 44 inches
    "min_headroom": 2.032,  # 80 inches (6'8")
    "max_riser_height": 0.178,  # 7 inches
    "min_riser_height": 0.102,  # 4 inches
    "min_tread_depth": 0.279,  # 11 inches
    "max_riser_variation": 0.0095,  # 3/8 inch
    "handrail_height_min": 0.864,  # 34 inches
    "handrail_height_max": 0.965,  # 38 inches
}


# =============================================================================
# Utility Functions
# =============================================================================


def distance_2d(p1: list[float], p2: list[float]) -> float:
    """Calculate 2D Euclidean distance."""
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    return math.sqrt(dx * dx + dy * dy)


def get_element_position(element: dict[str, Any]) -> list[float] | None:
    """Extract position from element."""
    if "position" in element:
        return element["position"][:2]
    if "bbox" in element:
        bbox = element["bbox"]
        if "min" in bbox and "max" in bbox:
            return [
                (bbox["min"][0] + bbox["max"][0]) / 2,
                (bbox["min"][1] + bbox["max"][1]) / 2,
            ]
    if "start" in element and "end" in element:
        return [
            (element["start"][0] + element["end"][0]) / 2,
            (element["start"][1] + element["end"][1]) / 2,
        ]
    return None


# =============================================================================
# Tool Implementations
# =============================================================================


async def _validate_model(args: dict[str, Any]) -> dict[str, Any]:
    """Run all validation rules against the model."""
    try:
        params = ValidateModelParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    issues: list[ValidationIssue] = []
    categories_run: list[str] = []

    # Determine which categories to run
    all_categories = ["geometry", "accessibility", "fire_safety", "egress", "general"]
    run_categories = params.categories or all_categories

    # Geometry validation
    if "geometry" in run_categories:
        categories_run.append("geometry")
        issues.extend(_validate_geometry(params.elements))

    # Accessibility validation
    if "accessibility" in run_categories:
        categories_run.append("accessibility")
        issues.extend(_validate_accessibility_basic(params.doors, params.rooms))

    # Fire safety validation
    if "fire_safety" in run_categories:
        categories_run.append("fire_safety")
        issues.extend(_validate_fire_safety_basic(params.elements, params.rooms))

    # Egress validation
    if "egress" in run_categories:
        categories_run.append("egress")
        issues.extend(_validate_egress_basic(params.rooms, params.doors))

    # General model validation
    if "general" in run_categories:
        categories_run.append("general")
        issues.extend(_validate_general(params.elements))

    # Filter by severity threshold
    severity_order = {"info": 0, "warning": 1, "error": 2}
    threshold = severity_order.get(params.severity_threshold, 1)
    filtered_issues = [
        i for i in issues if severity_order.get(i.severity, 0) >= threshold
    ]

    # Count by severity
    counts = {
        "error": sum(1 for i in filtered_issues if i.severity == "error"),
        "warning": sum(1 for i in filtered_issues if i.severity == "warning"),
        "info": sum(1 for i in filtered_issues if i.severity == "info"),
    }

    return make_response(
        {
            "valid": counts["error"] == 0,
            "issues": [i.to_dict() for i in filtered_issues],
            "issue_count": len(filtered_issues),
            "counts": counts,
            "categories_checked": categories_run,
            "element_count": len(params.elements),
        },
        reasoning=params.reasoning,
    )


def _validate_geometry(elements: list[dict[str, Any]]) -> list[ValidationIssue]:
    """Validate geometry correctness."""
    issues = []

    for element in elements:
        eid = element.get("id", "unknown")
        etype = element.get("type", element.get("element_type", "unknown"))

        # Check for zero-length walls
        if etype == "wall":
            if "start" in element and "end" in element:
                length = distance_2d(element["start"], element["end"])
                if length < 0.001:
                    issues.append(
                        ValidationIssue(
                            code="GEOM001",
                            message=f"Wall {eid} has near-zero length ({length:.4f}m)",
                            severity="error",
                            category="geometry",
                            element_id=eid,
                            location=element.get("start"),
                            suggested_fix="Remove or extend the wall to a valid length",
                        )
                    )
                elif length < 0.1:
                    issues.append(
                        ValidationIssue(
                            code="GEOM002",
                            message=f"Wall {eid} is very short ({length:.2f}m)",
                            severity="warning",
                            category="geometry",
                            element_id=eid,
                            location=element.get("start"),
                        )
                    )

        # Check for invalid dimensions
        if "width" in element and element["width"] <= 0:
            issues.append(
                ValidationIssue(
                    code="GEOM003",
                    message=f"Element {eid} has invalid width: {element['width']}",
                    severity="error",
                    category="geometry",
                    element_id=eid,
                )
            )

        if "height" in element and element["height"] <= 0:
            issues.append(
                ValidationIssue(
                    code="GEOM004",
                    message=f"Element {eid} has invalid height: {element['height']}",
                    severity="error",
                    category="geometry",
                    element_id=eid,
                )
            )

    return issues


def _validate_accessibility_basic(
    doors: list[dict[str, Any]], rooms: list[dict[str, Any]]
) -> list[ValidationIssue]:
    """Basic accessibility validation."""
    issues = []

    for door in doors:
        did = door.get("id", "unknown")
        width = door.get("width", 0.9)

        # Check door clear width
        if width < ADA_REQUIREMENTS["door_clear_width"]:
            issues.append(
                ValidationIssue(
                    code="ADA001",
                    message=f"Door {did} width ({width:.3f}m) is below ADA minimum ({ADA_REQUIREMENTS['door_clear_width']:.3f}m)",
                    severity="error",
                    category="accessibility",
                    element_id=did,
                    location=get_element_position(door),
                    suggested_fix=f"Increase door width to at least {ADA_REQUIREMENTS['door_clear_width']:.3f}m",
                )
            )

    # Check room sizes for wheelchair access
    for room in rooms:
        rid = room.get("id", "unknown")
        area = room.get("area", 0)

        # Minimum room size for wheelchair turning
        min_area = 2.25  # 1.5m x 1.5m
        if area > 0 and area < min_area:
            issues.append(
                ValidationIssue(
                    code="ADA002",
                    message=f"Room {rid} area ({area:.2f}m²) may not accommodate wheelchair turning",
                    severity="warning",
                    category="accessibility",
                    element_id=rid,
                )
            )

    return issues


def _validate_fire_safety_basic(
    elements: list[dict[str, Any]], rooms: list[dict[str, Any]]
) -> list[ValidationIssue]:
    """Basic fire safety validation."""
    issues = []

    # Check room sizes for fire compartments
    for room in rooms:
        rid = room.get("id", "unknown")
        area = room.get("area", 0)
        room_type = room.get("function", room.get("type", ""))

        # Check compartment size
        if area > 500:  # Default max compartment
            issues.append(
                ValidationIssue(
                    code="FIRE001",
                    message=f"Room {rid} ({room_type}) exceeds maximum compartment area ({area:.1f}m² > 500m²)",
                    severity="warning",
                    category="fire_safety",
                    element_id=rid,
                    suggested_fix="Consider subdividing with fire-rated partitions",
                )
            )

    # Check for exit signs/doors in large rooms
    for room in rooms:
        rid = room.get("id", "unknown")
        area = room.get("area", 0)
        exit_count = room.get("exit_count", room.get("door_count", 0))

        if area > 100 and exit_count < 2:
            issues.append(
                ValidationIssue(
                    code="FIRE002",
                    message=f"Room {rid} ({area:.1f}m²) should have at least 2 exits",
                    severity="warning",
                    category="fire_safety",
                    element_id=rid,
                    suggested_fix="Add additional exit doors",
                )
            )

    return issues


def _validate_egress_basic(
    rooms: list[dict[str, Any]], doors: list[dict[str, Any]]
) -> list[ValidationIssue]:
    """Basic egress validation."""
    issues = []

    # Build door lookup
    door_map = {d.get("id"): d for d in doors}

    for room in rooms:
        rid = room.get("id", "unknown")
        exit_door_ids = room.get("exit_door_ids", [])
        area = room.get("area", 0)
        occupancy = room.get("occupancy_type", "business")

        # Get egress requirements
        reqs = EGRESS_REQUIREMENTS.get(occupancy, EGRESS_REQUIREMENTS["business"])

        # Check number of exits
        if area > 50 and len(exit_door_ids) < reqs["min_exits"]:
            issues.append(
                ValidationIssue(
                    code="EGRESS001",
                    message=f"Room {rid} has {len(exit_door_ids)} exits, requires {reqs['min_exits']} minimum",
                    severity="error",
                    category="egress",
                    element_id=rid,
                    suggested_fix=f"Add {reqs['min_exits'] - len(exit_door_ids)} more exit(s)",
                )
            )

        # Check if any exit door width is adequate
        total_exit_width = 0
        for door_id in exit_door_ids:
            if door_id in door_map:
                total_exit_width += door_map[door_id].get("width", 0.9)

        # Estimate occupancy
        if area > 0:
            est_occupancy = area / reqs["occupant_factor"]
            required_width = est_occupancy * 0.005  # 5mm per occupant (rough)

            if total_exit_width < required_width and total_exit_width > 0:
                issues.append(
                    ValidationIssue(
                        code="EGRESS002",
                        message=f"Room {rid} exit width ({total_exit_width:.2f}m) may be insufficient for estimated occupancy ({est_occupancy:.0f})",
                        severity="warning",
                        category="egress",
                        element_id=rid,
                    )
                )

    return issues


def _validate_general(elements: list[dict[str, Any]]) -> list[ValidationIssue]:
    """General model validation."""
    issues = []

    # Check for missing IDs
    for i, element in enumerate(elements):
        if "id" not in element:
            issues.append(
                ValidationIssue(
                    code="GEN001",
                    message=f"Element at index {i} is missing an ID",
                    severity="warning",
                    category="general",
                )
            )

    # Check for duplicate IDs
    ids_seen: dict[str, int] = {}
    for element in elements:
        eid = element.get("id")
        if eid:
            if eid in ids_seen:
                issues.append(
                    ValidationIssue(
                        code="GEN002",
                        message=f"Duplicate element ID: {eid}",
                        severity="error",
                        category="general",
                        element_id=eid,
                    )
                )
            ids_seen[eid] = ids_seen.get(eid, 0) + 1

    return issues


async def _check_fire_compliance(args: dict[str, Any]) -> dict[str, Any]:
    """Detailed fire compliance checking."""
    try:
        params = CheckFireComplianceParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    issues: list[ValidationIssue] = []

    # Merge default fire ratings with provided requirements
    fire_ratings = {**FIRE_RATING_DEFAULTS, **params.fire_rating_requirements}

    # Check element fire ratings
    for element in params.elements:
        eid = element.get("id", "unknown")
        etype = element.get("type", element.get("element_type", ""))
        rating = element.get("fire_rating", 0)

        # Check if type requires fire rating
        required = fire_ratings.get(etype, 0)
        if required > 0 and rating < required:
            issues.append(
                ValidationIssue(
                    code="FIRE010",
                    message=f"Element {eid} ({etype}) fire rating ({rating}hr) is below requirement ({required}hr)",
                    severity="error",
                    category="fire_safety",
                    element_id=eid,
                    location=get_element_position(element),
                    suggested_fix=f"Upgrade element to {required}hr fire-rated construction",
                )
            )

    # Check compartment areas
    for room in params.rooms:
        rid = room.get("id", "unknown")
        area = room.get("area", 0)

        if area > params.max_compartment_area:
            issues.append(
                ValidationIssue(
                    code="FIRE011",
                    message=f"Room {rid} exceeds compartment limit ({area:.1f}m² > {params.max_compartment_area}m²)",
                    severity="error",
                    category="fire_safety",
                    element_id=rid,
                )
            )

    passed = not any(i.severity == "error" for i in issues)

    return make_response(
        {
            "passed": passed,
            "issues": [i.to_dict() for i in issues],
            "issue_count": len(issues),
            "elements_checked": len(params.elements),
            "rooms_checked": len(params.rooms),
            "max_compartment_area": params.max_compartment_area,
        },
        reasoning=params.reasoning,
    )


async def _check_accessibility(args: dict[str, Any]) -> dict[str, Any]:
    """Detailed accessibility compliance checking."""
    try:
        params = CheckAccessibilityParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    issues: list[ValidationIssue] = []

    # Get requirements based on standard
    reqs = ADA_REQUIREMENTS  # Default to ADA

    # Check doors
    for door in params.doors:
        did = door.get("id", "unknown")
        width = door.get("width", 0.9)
        threshold_height = door.get("threshold_height", 0)

        # Clear width check
        if width < reqs["door_clear_width"]:
            issues.append(
                ValidationIssue(
                    code="ACCESS001",
                    message=f"Door {did} clear width ({width:.3f}m) below {params.standard} minimum ({reqs['door_clear_width']:.3f}m)",
                    severity="error",
                    category="accessibility",
                    element_id=did,
                    location=get_element_position(door),
                    suggested_fix=f"Widen door to minimum {reqs['door_clear_width']:.3f}m",
                )
            )

        # Threshold height check
        if threshold_height > reqs["threshold_height"]:
            issues.append(
                ValidationIssue(
                    code="ACCESS002",
                    message=f"Door {did} threshold ({threshold_height:.4f}m) exceeds {params.standard} maximum ({reqs['threshold_height']:.4f}m)",
                    severity="error",
                    category="accessibility",
                    element_id=did,
                    location=get_element_position(door),
                    suggested_fix="Lower or remove threshold",
                )
            )

    # Check corridor widths
    for corridor in params.corridors:
        cid = corridor.get("id", "unknown")
        width = corridor.get("width", 1.2)

        if width < reqs["corridor_width"]:
            issues.append(
                ValidationIssue(
                    code="ACCESS003",
                    message=f"Corridor {cid} width ({width:.3f}m) below {params.standard} minimum ({reqs['corridor_width']:.3f}m)",
                    severity="error",
                    category="accessibility",
                    element_id=cid,
                    location=get_element_position(corridor),
                )
            )

    # Check rooms for wheelchair turning space
    for room in params.rooms:
        rid = room.get("id", "unknown")
        min_dimension = room.get("min_dimension", float("inf"))

        if min_dimension < reqs["turning_radius"]:
            issues.append(
                ValidationIssue(
                    code="ACCESS004",
                    message=f"Room {rid} may lack wheelchair turning space (min dim: {min_dimension:.3f}m, need: {reqs['turning_radius']:.3f}m)",
                    severity="warning",
                    category="accessibility",
                    element_id=rid,
                )
            )

    passed = not any(i.severity == "error" for i in issues)

    return make_response(
        {
            "passed": passed,
            "standard": params.standard,
            "issues": [i.to_dict() for i in issues],
            "issue_count": len(issues),
            "doors_checked": len(params.doors),
            "corridors_checked": len(params.corridors),
            "rooms_checked": len(params.rooms),
        },
        reasoning=params.reasoning,
    )


async def _check_egress(args: dict[str, Any]) -> dict[str, Any]:
    """Detailed egress path validation."""
    try:
        params = CheckEgressParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    issues: list[ValidationIssue] = []

    # Get requirements for occupancy type
    reqs = EGRESS_REQUIREMENTS.get(
        params.occupancy_type, EGRESS_REQUIREMENTS["business"]
    )

    # Build door lookup
    door_map = {d.get("id"): d for d in params.doors}

    for room in params.rooms:
        rid = room.get("id", "unknown")
        area = room.get("area", 0)
        travel_distance = room.get("max_travel_distance", room.get("travel_distance"))
        exit_door_ids = room.get("exit_door_ids", [])

        # Check travel distance
        max_allowed = params.max_travel_distance or reqs["max_travel"]
        if travel_distance and travel_distance > max_allowed:
            issues.append(
                ValidationIssue(
                    code="EGRESS010",
                    message=f"Room {rid} travel distance ({travel_distance:.1f}m) exceeds maximum ({max_allowed:.1f}m)",
                    severity="error",
                    category="egress",
                    element_id=rid,
                    suggested_fix="Add closer exit or reduce room depth",
                )
            )

        # Check exit count
        if area > 50 and len(exit_door_ids) < reqs["min_exits"]:
            issues.append(
                ValidationIssue(
                    code="EGRESS011",
                    message=f"Room {rid} requires {reqs['min_exits']} exits, has {len(exit_door_ids)}",
                    severity="error",
                    category="egress",
                    element_id=rid,
                )
            )

        # Check exit door widths for occupancy
        if area > 0:
            est_occupancy = area / reqs["occupant_factor"]
            required_width = est_occupancy * 0.0051  # 5.1mm per person (IBC)

            total_width = sum(
                door_map.get(did, {}).get("width", 0) for did in exit_door_ids
            )

            if total_width > 0 and total_width < required_width:
                issues.append(
                    ValidationIssue(
                        code="EGRESS012",
                        message=f"Room {rid} exit capacity ({total_width:.2f}m) insufficient for occupancy ({est_occupancy:.0f} persons)",
                        severity="error",
                        category="egress",
                        element_id=rid,
                    )
                )

    passed = not any(i.severity == "error" for i in issues)

    return make_response(
        {
            "passed": passed,
            "occupancy_type": params.occupancy_type,
            "max_travel_distance": params.max_travel_distance or reqs["max_travel"],
            "issues": [i.to_dict() for i in issues],
            "issue_count": len(issues),
            "rooms_checked": len(params.rooms),
        },
        reasoning=params.reasoning,
    )


async def _check_door_clearances(args: dict[str, Any]) -> dict[str, Any]:
    """Check door swing and maneuvering clearances."""
    try:
        params = CheckDoorClearancesParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    issues: list[ValidationIssue] = []

    for door in params.doors:
        did = door.get("id", "unknown")
        width = door.get("width", 0.9)
        swing = door.get("swing", "push")
        clear_floor_space = door.get("clear_floor_space", float("inf"))

        # Check clear width
        if width < params.min_clear_width:
            issues.append(
                ValidationIssue(
                    code="DOOR001",
                    message=f"Door {did} clear width ({width:.3f}m) below minimum ({params.min_clear_width:.3f}m)",
                    severity="error",
                    category="accessibility",
                    element_id=did,
                    location=get_element_position(door),
                )
            )

        # Check maneuvering clearance
        if clear_floor_space < params.min_maneuvering_clearance:
            issues.append(
                ValidationIssue(
                    code="DOOR002",
                    message=f"Door {did} maneuvering space ({clear_floor_space:.3f}m) below requirement ({params.min_maneuvering_clearance:.3f}m)",
                    severity="error",
                    category="accessibility",
                    element_id=did,
                    location=get_element_position(door),
                    suggested_fix="Increase clear floor space in front of door",
                )
            )

    passed = not any(i.severity == "error" for i in issues)

    return make_response(
        {
            "passed": passed,
            "issues": [i.to_dict() for i in issues],
            "issue_count": len(issues),
            "doors_checked": len(params.doors),
        },
        reasoning=params.reasoning,
    )


async def _check_stair_compliance(args: dict[str, Any]) -> dict[str, Any]:
    """Check stair dimension compliance."""
    try:
        params = CheckStairComplianceParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    issues: list[ValidationIssue] = []

    # Get code requirements
    reqs = STAIR_REQUIREMENTS_IBC  # Default to IBC

    for stair in params.stairs:
        sid = stair.get("id", "unknown")
        width = stair.get("width", 1.2)
        riser_height = stair.get("riser_height", 0.18)
        tread_depth = stair.get("tread_depth", 0.28)
        headroom = stair.get("headroom", 2.1)

        # Check width
        if width < reqs["min_width"]:
            issues.append(
                ValidationIssue(
                    code="STAIR001",
                    message=f"Stair {sid} width ({width:.3f}m) below {params.building_code} minimum ({reqs['min_width']:.3f}m)",
                    severity="error",
                    category="egress",
                    element_id=sid,
                )
            )

        # Check riser height
        if riser_height > reqs["max_riser_height"]:
            issues.append(
                ValidationIssue(
                    code="STAIR002",
                    message=f"Stair {sid} riser ({riser_height:.3f}m) exceeds maximum ({reqs['max_riser_height']:.3f}m)",
                    severity="error",
                    category="egress",
                    element_id=sid,
                )
            )
        elif riser_height < reqs["min_riser_height"]:
            issues.append(
                ValidationIssue(
                    code="STAIR003",
                    message=f"Stair {sid} riser ({riser_height:.3f}m) below minimum ({reqs['min_riser_height']:.3f}m)",
                    severity="error",
                    category="egress",
                    element_id=sid,
                )
            )

        # Check tread depth
        if tread_depth < reqs["min_tread_depth"]:
            issues.append(
                ValidationIssue(
                    code="STAIR004",
                    message=f"Stair {sid} tread ({tread_depth:.3f}m) below minimum ({reqs['min_tread_depth']:.3f}m)",
                    severity="error",
                    category="egress",
                    element_id=sid,
                )
            )

        # Check headroom
        if headroom < reqs["min_headroom"]:
            issues.append(
                ValidationIssue(
                    code="STAIR005",
                    message=f"Stair {sid} headroom ({headroom:.3f}m) below minimum ({reqs['min_headroom']:.3f}m)",
                    severity="error",
                    category="egress",
                    element_id=sid,
                )
            )

    passed = not any(i.severity == "error" for i in issues)

    return make_response(
        {
            "passed": passed,
            "building_code": params.building_code,
            "issues": [i.to_dict() for i in issues],
            "issue_count": len(issues),
            "stairs_checked": len(params.stairs),
        },
        reasoning=params.reasoning,
    )


# =============================================================================
# Clash Detection Implementation
# =============================================================================


def get_element_bbox(element: dict[str, Any]) -> dict[str, list[float]] | None:
    """Extract or compute bounding box for an element.

    Returns dict with 'min' and 'max' keys, each a [x, y, z] list.
    """
    # Direct bbox
    if "bbox" in element:
        bbox = element["bbox"]
        if "min" in bbox and "max" in bbox:
            return bbox

    # Wall element (line with thickness)
    if "start" in element and "end" in element:
        start = element["start"]
        end = element["end"]
        thickness = element.get("thickness", 0.2) / 2
        height = element.get("height", 2.7)

        min_x = min(start[0], end[0]) - thickness
        max_x = max(start[0], end[0]) + thickness
        min_y = min(start[1], end[1]) - thickness
        max_y = max(start[1], end[1]) + thickness
        min_z = element.get("base_level", 0)
        max_z = min_z + height

        return {
            "min": [min_x, min_y, min_z],
            "max": [max_x, max_y, max_z],
        }

    # Position-based element (door, window, etc.)
    if "position" in element:
        pos = element["position"]
        width = element.get("width", 0.9) / 2
        height = element.get("height", 2.1)
        depth = element.get("depth", 0.1) / 2

        return {
            "min": [pos[0] - width, pos[1] - depth, pos[2] if len(pos) > 2 else 0],
            "max": [pos[0] + width, pos[1] + depth, (pos[2] if len(pos) > 2 else 0) + height],
        }

    return None


def bboxes_intersect(
    bbox_a: dict[str, list[float]],
    bbox_b: dict[str, list[float]],
    tolerance: float = 0.0,
    clearance: float = 0.0,
) -> tuple[bool, str, float]:
    """Check if two bounding boxes intersect.

    Returns:
        (intersects, severity, penetration_depth)
        - severity: 'hard' (penetrating), 'soft' (touching), 'clearance' (within clearance)
    """
    # Expand bbox_b by tolerance
    a_min = bbox_a["min"]
    a_max = bbox_a["max"]
    b_min = [b - tolerance for b in bbox_b["min"]]
    b_max = [b + tolerance for b in bbox_b["max"]]

    # Check for no intersection (gap in any axis)
    for i in range(3):
        if a_max[i] < b_min[i] or a_min[i] > b_max[i]:
            # Check clearance
            gap = max(b_min[i] - a_max[i], a_min[i] - b_max[i])
            if gap > 0 and gap <= clearance:
                return True, "clearance", gap
            return False, "none", 0.0

    # Boxes intersect - calculate penetration depth
    overlaps = []
    for i in range(3):
        overlap = min(a_max[i], b_max[i]) - max(a_min[i], b_min[i])
        overlaps.append(overlap)

    penetration = min(overlaps)

    # Determine severity
    if penetration > tolerance:
        return True, "hard", penetration
    else:
        return True, "soft", penetration


class ClashResult:
    """A detected clash between two elements."""

    def __init__(
        self,
        element_a_id: str,
        element_b_id: str,
        element_a_type: str,
        element_b_type: str,
        severity: str,
        penetration_depth: float,
        location: list[float] | None = None,
    ):
        self.id = str(uuid4())
        self.element_a_id = element_a_id
        self.element_b_id = element_b_id
        self.element_a_type = element_a_type
        self.element_b_type = element_b_type
        self.severity = severity
        self.penetration_depth = penetration_depth
        self.location = location

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "element_a_id": self.element_a_id,
            "element_b_id": self.element_b_id,
            "element_a_type": self.element_a_type,
            "element_b_type": self.element_b_type,
            "severity": self.severity,
            "penetration_depth": round(self.penetration_depth, 4),
            "location": self.location,
        }


async def _detect_clashes(args: dict[str, Any]) -> dict[str, Any]:
    """Detect clashes between elements.

    Uses bounding box intersection for broad phase,
    with configurable tolerance and severity thresholds.
    """
    try:
        params = DetectClashesParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    # Filter elements by type if specified
    elements = params.elements
    if params.element_types:
        elements = [
            e for e in elements
            if e.get("type", e.get("element_type", "")) in params.element_types
        ]

    # Build bounding box cache
    bbox_cache: dict[str, dict[str, list[float]]] = {}
    valid_elements: list[dict[str, Any]] = []

    for element in elements:
        eid = element.get("id", str(uuid4()))
        bbox = get_element_bbox(element)
        if bbox:
            bbox_cache[eid] = bbox
            valid_elements.append(element)

    # Severity order for filtering
    severity_order = {"clearance": 0, "soft": 1, "hard": 2}
    threshold = severity_order.get(params.severity_threshold, 2)

    # Check all pairs
    clashes: list[ClashResult] = []
    n = len(valid_elements)

    for i in range(n):
        elem_a = valid_elements[i]
        aid = elem_a.get("id", f"element_{i}")
        atype = elem_a.get("type", elem_a.get("element_type", "unknown"))
        bbox_a = bbox_cache[aid]

        for j in range(i + 1, n):
            elem_b = valid_elements[j]
            bid = elem_b.get("id", f"element_{j}")
            btype = elem_b.get("type", elem_b.get("element_type", "unknown"))
            bbox_b = bbox_cache[bid]

            # Check intersection
            intersects, severity, penetration = bboxes_intersect(
                bbox_a,
                bbox_b,
                tolerance=params.tolerance,
                clearance=params.clearance_distance,
            )

            if intersects and severity_order.get(severity, 0) >= threshold:
                # Calculate clash location (center of overlap region)
                loc_x = (max(bbox_a["min"][0], bbox_b["min"][0]) +
                        min(bbox_a["max"][0], bbox_b["max"][0])) / 2
                loc_y = (max(bbox_a["min"][1], bbox_b["min"][1]) +
                        min(bbox_a["max"][1], bbox_b["max"][1])) / 2
                loc_z = (max(bbox_a["min"][2], bbox_b["min"][2]) +
                        min(bbox_a["max"][2], bbox_b["max"][2])) / 2

                clashes.append(ClashResult(
                    element_a_id=aid,
                    element_b_id=bid,
                    element_a_type=atype,
                    element_b_type=btype,
                    severity=severity,
                    penetration_depth=penetration,
                    location=[round(loc_x, 4), round(loc_y, 4), round(loc_z, 4)],
                ))

    # Count by severity
    counts = {
        "hard": sum(1 for c in clashes if c.severity == "hard"),
        "soft": sum(1 for c in clashes if c.severity == "soft"),
        "clearance": sum(1 for c in clashes if c.severity == "clearance"),
    }

    return make_response(
        {
            "clashes": [c.to_dict() for c in clashes],
            "clash_count": len(clashes),
            "counts": counts,
            "elements_checked": len(valid_elements),
            "pairs_checked": n * (n - 1) // 2,
            "tolerance": params.tolerance,
            "clearance_distance": params.clearance_distance,
        },
        reasoning=params.reasoning,
    )


async def _detect_clashes_between_sets(args: dict[str, Any]) -> dict[str, Any]:
    """Detect clashes between two sets of elements.

    Useful for checking specific element groups against each other,
    e.g., structural vs architectural elements.
    """
    try:
        params = DetectClashesBetweenSetsParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    # Build bounding box caches
    bbox_cache_a: dict[str, dict[str, list[float]]] = {}
    bbox_cache_b: dict[str, dict[str, list[float]]] = {}

    valid_a: list[dict[str, Any]] = []
    valid_b: list[dict[str, Any]] = []

    for element in params.set_a:
        eid = element.get("id", str(uuid4()))
        bbox = get_element_bbox(element)
        if bbox:
            bbox_cache_a[eid] = bbox
            valid_a.append(element)

    for element in params.set_b:
        eid = element.get("id", str(uuid4()))
        bbox = get_element_bbox(element)
        if bbox:
            bbox_cache_b[eid] = bbox
            valid_b.append(element)

    # Check all pairs between sets
    clashes: list[ClashResult] = []

    for elem_a in valid_a:
        aid = elem_a.get("id")
        atype = elem_a.get("type", elem_a.get("element_type", "unknown"))
        bbox_a = bbox_cache_a[aid]

        for elem_b in valid_b:
            bid = elem_b.get("id")
            btype = elem_b.get("type", elem_b.get("element_type", "unknown"))
            bbox_b = bbox_cache_b[bid]

            intersects, severity, penetration = bboxes_intersect(
                bbox_a,
                bbox_b,
                tolerance=params.tolerance,
                clearance=params.clearance_distance,
            )

            if intersects:
                # Calculate clash location
                loc_x = (max(bbox_a["min"][0], bbox_b["min"][0]) +
                        min(bbox_a["max"][0], bbox_b["max"][0])) / 2
                loc_y = (max(bbox_a["min"][1], bbox_b["min"][1]) +
                        min(bbox_a["max"][1], bbox_b["max"][1])) / 2
                loc_z = (max(bbox_a["min"][2], bbox_b["min"][2]) +
                        min(bbox_a["max"][2], bbox_b["max"][2])) / 2

                clashes.append(ClashResult(
                    element_a_id=aid,
                    element_b_id=bid,
                    element_a_type=atype,
                    element_b_type=btype,
                    severity=severity,
                    penetration_depth=penetration,
                    location=[round(loc_x, 4), round(loc_y, 4), round(loc_z, 4)],
                ))

    counts = {
        "hard": sum(1 for c in clashes if c.severity == "hard"),
        "soft": sum(1 for c in clashes if c.severity == "soft"),
        "clearance": sum(1 for c in clashes if c.severity == "clearance"),
    }

    return make_response(
        {
            "clashes": [c.to_dict() for c in clashes],
            "clash_count": len(clashes),
            "counts": counts,
            "set_a_count": len(valid_a),
            "set_b_count": len(valid_b),
            "pairs_checked": len(valid_a) * len(valid_b),
            "tolerance": params.tolerance,
            "clearance_distance": params.clearance_distance,
        },
        reasoning=params.reasoning,
    )


# =============================================================================
# Tool Definitions
# =============================================================================

TOOLS = [
    Tool(
        name="validate_model",
        description="Run comprehensive validation rules against the model. "
        "Checks geometry, accessibility, fire safety, egress, and general issues. "
        "Returns categorized issues with severity levels.",
        inputSchema={
            "type": "object",
            "properties": {
                "elements": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "All elements in the model",
                },
                "rooms": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Room definitions",
                },
                "doors": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Door elements",
                },
                "categories": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["geometry", "accessibility", "fire_safety", "egress", "general"],
                    },
                    "description": "Categories to check (default: all)",
                },
                "severity_threshold": {
                    "type": "string",
                    "enum": ["info", "warning", "error"],
                    "description": "Minimum severity to report",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["elements"],
        },
    ),
    Tool(
        name="check_fire_compliance",
        description="Check fire rating compliance and compartmentalization. "
        "Validates fire-rated construction and maximum compartment areas.",
        inputSchema={
            "type": "object",
            "properties": {
                "elements": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Elements to check",
                },
                "rooms": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Room definitions for compartment check",
                },
                "fire_rating_requirements": {
                    "type": "object",
                    "description": "Required fire ratings by type (hours)",
                },
                "max_compartment_area": {
                    "type": "number",
                    "description": "Maximum compartment area (m²)",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["elements"],
        },
    ),
    Tool(
        name="check_accessibility",
        description="Check ADA/DDA accessibility compliance. "
        "Validates door widths, thresholds, corridor widths, and turning spaces.",
        inputSchema={
            "type": "object",
            "properties": {
                "doors": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Door elements",
                },
                "corridors": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Corridor/path elements",
                },
                "rooms": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Room definitions",
                },
                "standard": {
                    "type": "string",
                    "enum": ["ADA", "DDA", "ISO21542"],
                    "description": "Accessibility standard",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["doors"],
        },
    ),
    Tool(
        name="check_egress",
        description="Validate egress paths and travel distances. "
        "Checks exit count, exit capacity, and travel distances per occupancy type.",
        inputSchema={
            "type": "object",
            "properties": {
                "rooms": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Room definitions with exit info",
                },
                "doors": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Door elements",
                },
                "occupancy_type": {
                    "type": "string",
                    "enum": ["assembly", "business", "educational", "factory", "residential", "storage"],
                    "description": "Building occupancy type",
                },
                "max_travel_distance": {
                    "type": "number",
                    "description": "Maximum travel distance (meters)",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["rooms", "doors"],
        },
    ),
    Tool(
        name="check_door_clearances",
        description="Check door swing and maneuvering clearances for accessibility.",
        inputSchema={
            "type": "object",
            "properties": {
                "doors": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Door elements",
                },
                "walls": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Nearby wall elements",
                },
                "min_clear_width": {
                    "type": "number",
                    "description": "Minimum clear width (meters)",
                },
                "min_maneuvering_clearance": {
                    "type": "number",
                    "description": "Wheelchair maneuvering clearance (meters)",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["doors"],
        },
    ),
    Tool(
        name="check_stair_compliance",
        description="Check stair dimension compliance (riser, tread, width, headroom).",
        inputSchema={
            "type": "object",
            "properties": {
                "stairs": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Stair elements",
                },
                "building_code": {
                    "type": "string",
                    "enum": ["IBC", "NBC", "BS"],
                    "description": "Building code standard",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["stairs"],
        },
    ),
    Tool(
        name="detect_clashes",
        description="Detect element intersections and clashes. "
        "Uses bounding box intersection with configurable tolerance. "
        "Returns clash locations with severity levels (hard/soft/clearance).",
        inputSchema={
            "type": "object",
            "properties": {
                "elements": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Elements to check for clashes",
                },
                "tolerance": {
                    "type": "number",
                    "description": "Clash detection tolerance in meters (default 0.001)",
                },
                "element_types": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter by element types (e.g., ['wall', 'door'])",
                },
                "severity_threshold": {
                    "type": "string",
                    "enum": ["hard", "soft", "clearance"],
                    "description": "Minimum severity to report",
                },
                "clearance_distance": {
                    "type": "number",
                    "description": "Clearance distance for soft clash detection (meters)",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["elements"],
        },
    ),
    Tool(
        name="detect_clashes_between_sets",
        description="Detect clashes between two sets of elements. "
        "Useful for checking specific element groups (e.g., structural vs architectural).",
        inputSchema={
            "type": "object",
            "properties": {
                "set_a": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "First set of elements",
                },
                "set_b": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Second set of elements to check against",
                },
                "tolerance": {
                    "type": "number",
                    "description": "Clash detection tolerance in meters",
                },
                "clearance_distance": {
                    "type": "number",
                    "description": "Clearance distance for soft clash detection",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["set_a", "set_b"],
        },
    ),
]


# =============================================================================
# Server Setup
# =============================================================================


def create_server() -> Server:
    """Create and configure the MCP server."""
    server = Server("pensaer-validation-server")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        return TOOLS

    @server.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
        logger.info(f"Tool called: {name}")

        try:
            if name == "validate_model":
                result = await _validate_model(arguments)
            elif name == "check_fire_compliance":
                result = await _check_fire_compliance(arguments)
            elif name == "check_accessibility":
                result = await _check_accessibility(arguments)
            elif name == "check_egress":
                result = await _check_egress(arguments)
            elif name == "check_door_clearances":
                result = await _check_door_clearances(arguments)
            elif name == "check_stair_compliance":
                result = await _check_stair_compliance(arguments)
            elif name == "detect_clashes":
                result = await _detect_clashes(arguments)
            elif name == "detect_clashes_between_sets":
                result = await _detect_clashes_between_sets(arguments)
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
    """Entry point for the validation MCP server."""
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
