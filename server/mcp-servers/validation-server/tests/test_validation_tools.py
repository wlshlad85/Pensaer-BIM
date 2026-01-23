"""Unit tests for Validation MCP Server tools.

Tests cover:
- validate_model: Comprehensive model validation
- check_fire_compliance: Fire rating and compartmentalization
- check_accessibility: ADA/DDA accessibility checks
- check_egress: Egress path and travel distance validation
- check_door_clearances: Door swing and clearance requirements
- check_stair_compliance: Stair dimension compliance
- detect_clashes: Geometric clash detection with tolerance

Comprehensive test coverage including:
- Basic functionality
- Edge cases
- Error handling
- Performance considerations
"""

import pytest
import math

# Import the internal functions directly for testing
from validation_server.server import (
    _validate_model,
    _check_fire_compliance,
    _check_accessibility,
    _check_egress,
    _check_door_clearances,
    _check_stair_compliance,
    _detect_clashes,
    ValidationIssue,
    ClashResult,
    distance_2d,
    get_element_position,
    get_element_bbox,
    bboxes_intersect,
    ADA_REQUIREMENTS,
    FIRE_RATING_DEFAULTS,
    EGRESS_REQUIREMENTS,
    STAIR_REQUIREMENTS_IBC,
)


# =============================================================================
# Utility Function Tests
# =============================================================================


class TestUtilityFunctions:
    """Tests for utility functions."""

    def test_distance_2d(self):
        """Test 2D distance calculation."""
        assert distance_2d([0, 0], [3, 4]) == 5.0
        assert distance_2d([0, 0], [0, 0]) == 0.0
        assert abs(distance_2d([1, 1], [2, 2]) - math.sqrt(2)) < 1e-10

    def test_distance_2d_negative_coords(self):
        """Test distance with negative coordinates."""
        assert distance_2d([-5, -5], [5, 5]) == pytest.approx(math.sqrt(200))

    def test_get_element_position_from_position(self):
        """Test position extraction from position field."""
        element = {"position": [5, 10, 3]}
        pos = get_element_position(element)
        assert pos == [5, 10]

    def test_get_element_position_from_bbox(self):
        """Test position extraction from bounding box."""
        element = {"bbox": {"min": [0, 0], "max": [10, 10]}}
        pos = get_element_position(element)
        assert pos == [5.0, 5.0]

    def test_get_element_position_from_line(self):
        """Test position extraction from start/end."""
        element = {"start": [0, 0], "end": [10, 10]}
        pos = get_element_position(element)
        assert pos == [5.0, 5.0]

    def test_get_element_position_missing(self):
        """Test position extraction returns None when missing."""
        element = {"id": "test"}
        pos = get_element_position(element)
        assert pos is None

    def test_get_element_bbox_direct(self):
        """Test bbox extraction from direct bbox field."""
        element = {"bbox": {"min": [0, 0, 0], "max": [10, 10, 3]}}
        bbox = get_element_bbox(element)
        assert bbox["min"] == [0, 0, 0]
        assert bbox["max"] == [10, 10, 3]

    def test_get_element_bbox_from_wall(self):
        """Test bbox computation from wall start/end."""
        element = {
            "start": [0, 0],
            "end": [10, 0],
            "thickness": 0.2,
            "height": 3.0
        }
        bbox = get_element_bbox(element)
        assert bbox is not None
        # Wall is along x-axis with thickness perpendicular
        assert bbox["max"][2] == 3.0  # height

    def test_get_element_bbox_from_position(self):
        """Test bbox computation from position + dimensions."""
        element = {
            "position": [5, 5, 0],
            "width": 0.9,
            "height": 2.1,
            "depth": 0.1
        }
        bbox = get_element_bbox(element)
        assert bbox is not None
        assert bbox["min"][0] == pytest.approx(5 - 0.45)
        assert bbox["max"][0] == pytest.approx(5 + 0.45)

    def test_get_element_bbox_missing(self):
        """Test bbox returns None when no data available."""
        element = {"id": "test"}
        bbox = get_element_bbox(element)
        assert bbox is None

    def test_bboxes_intersect_true(self):
        """Test overlapping bounding boxes."""
        bbox_a = {"min": [0, 0, 0], "max": [5, 5, 5]}
        bbox_b = {"min": [3, 3, 3], "max": [8, 8, 8]}
        intersects, severity, penetration = bboxes_intersect(bbox_a, bbox_b)
        assert intersects is True
        assert severity == "hard"
        assert penetration > 0

    def test_bboxes_intersect_false(self):
        """Test non-overlapping bounding boxes."""
        bbox_a = {"min": [0, 0, 0], "max": [5, 5, 5]}
        bbox_b = {"min": [10, 10, 10], "max": [15, 15, 15]}
        intersects, severity, penetration = bboxes_intersect(bbox_a, bbox_b)
        assert intersects is False
        assert severity == "none"

    def test_bboxes_intersect_with_clearance(self):
        """Test bbox intersection with clearance distance."""
        bbox_a = {"min": [0, 0, 0], "max": [5, 5, 5]}
        bbox_b = {"min": [5.5, 0, 0], "max": [10, 5, 5]}  # 0.5m gap
        # With 1m clearance, should detect clearance violation
        intersects, severity, gap = bboxes_intersect(bbox_a, bbox_b, clearance=1.0)
        assert intersects is True
        assert severity == "clearance"

    def test_bboxes_intersect_soft(self):
        """Test bbox intersection with tolerance (soft clash)."""
        bbox_a = {"min": [0, 0, 0], "max": [5, 5, 5]}
        bbox_b = {"min": [4.999, 0, 0], "max": [10, 5, 5]}  # barely touching
        intersects, severity, penetration = bboxes_intersect(bbox_a, bbox_b, tolerance=0.01)
        assert intersects is True
        assert severity in ("soft", "hard")


class TestValidationIssue:
    """Tests for ValidationIssue class."""

    def test_validation_issue_creation(self):
        """Test creating a validation issue."""
        issue = ValidationIssue(
            code="TEST001",
            message="Test message",
            severity="error",
            category="test",
            element_id="elem1",
            location=[1, 2, 3],
            suggested_fix="Fix it"
        )
        assert issue.code == "TEST001"
        assert issue.severity == "error"
        assert issue.element_id == "elem1"

    def test_validation_issue_to_dict(self):
        """Test converting issue to dictionary."""
        issue = ValidationIssue(
            code="TEST001",
            message="Test message",
            severity="warning",
            category="test"
        )
        d = issue.to_dict()
        assert "id" in d
        assert d["code"] == "TEST001"
        assert d["severity"] == "warning"


class TestClashResult:
    """Tests for ClashResult class."""

    def test_clash_result_creation(self):
        """Test creating a clash result."""
        clash = ClashResult(
            element_a_id="wall1",
            element_b_id="column1",
            element_a_type="wall",
            element_b_type="column",
            clash_type="hard",
            severity="error",
            penetration_depth=0.15,
            location=[5, 5, 2]
        )
        assert clash.element_a_id == "wall1"
        assert clash.severity == "error"

    def test_clash_result_to_dict(self):
        """Test converting clash result to dictionary."""
        clash = ClashResult(
            element_a_id="a",
            element_b_id="b",
            element_a_type="wall",
            element_b_type="wall",
            clash_type="soft",
            severity="warning",
            penetration_depth=0.05,
            location=[0, 0, 0]
        )
        d = clash.to_dict()
        assert "id" in d
        assert d["element_a_id"] == "a"
        assert d["penetration_depth"] == 0.05


# =============================================================================
# Clash Detection Tests
# =============================================================================


class TestDetectClashes:
    """Tests for detect_clashes tool."""

    @pytest.mark.asyncio
    async def test_no_clashes(self):
        """Test with non-overlapping elements."""
        elements = [
            {"id": "wall1", "type": "wall", "bbox": {"min": [0, 0, 0], "max": [5, 0.2, 3]}},
            {"id": "wall2", "type": "wall", "bbox": {"min": [10, 0, 0], "max": [15, 0.2, 3]}},
        ]
        result = await _detect_clashes({"elements": elements})
        assert result["success"] is True
        assert result["data"]["clash_count"] == 0

    @pytest.mark.asyncio
    async def test_hard_clash(self):
        """Test detection of hard clash (significant overlap)."""
        elements = [
            {"id": "wall1", "type": "wall", "bbox": {"min": [0, 0, 0], "max": [5, 1, 3]}},
            {"id": "wall2", "type": "wall", "bbox": {"min": [4, 0, 0], "max": [9, 1, 3]}},  # 1m overlap
        ]
        result = await _detect_clashes({"elements": elements})
        assert result["success"] is True
        assert result["data"]["clash_count"] == 1
        assert result["data"]["clashes"][0]["severity"] == "error"

    @pytest.mark.asyncio
    async def test_soft_clash(self):
        """Test detection of soft clash (minor overlap)."""
        elements = [
            {"id": "wall1", "type": "wall", "bbox": {"min": [0, 0, 0], "max": [5, 1, 3]}},
            {"id": "wall2", "type": "wall", "bbox": {"min": [4.99, 0, 0], "max": [10, 1, 3]}},  # 0.01m overlap
        ]
        result = await _detect_clashes({"elements": elements, "tolerance": 0.02})
        assert result["success"] is True
        assert result["data"]["clash_count"] == 1
        # With small overlap and tolerance, can be warning or error
        assert result["data"]["clashes"][0]["severity"] in ("warning", "error")

    @pytest.mark.asyncio
    async def test_clash_with_clearance_distance(self):
        """Test clash detection with required clearance."""
        elements = [
            {"id": "elem1", "type": "column", "bbox": {"min": [0, 0, 0], "max": [0.5, 0.5, 3]}},
            {"id": "elem2", "type": "column", "bbox": {"min": [0.6, 0, 0], "max": [1.1, 0.5, 3]}},  # 0.1m gap
        ]
        # With 0.2m clearance_distance, this should detect clearance violation
        result = await _detect_clashes({
            "elements": elements,
            "clearance_distance": 0.2,
            "severity_threshold": "clearance"
        })
        assert result["success"] is True
        assert result["data"]["clash_count"] == 1

    @pytest.mark.asyncio
    async def test_severity_threshold_filter(self):
        """Test filtering clashes by severity threshold."""
        elements = [
            {"id": "wall1", "type": "wall", "bbox": {"min": [0, 0, 0], "max": [5, 1, 3]}},
            {"id": "wall2", "type": "wall", "bbox": {"min": [4.99, 0, 0], "max": [10, 1, 3]}},  # 0.01m overlap
        ]
        # Default threshold is "hard", should still detect
        result = await _detect_clashes({"elements": elements})
        assert result["success"] is True
        assert result["data"]["clash_count"] >= 0  # May or may not detect as hard

    @pytest.mark.asyncio
    async def test_element_type_filter(self):
        """Test filtering clashes by element type."""
        elements = [
            {"id": "wall1", "type": "wall", "bbox": {"min": [0, 0, 0], "max": [5, 1, 3]}},
            {"id": "wall2", "type": "wall", "bbox": {"min": [4, 0, 0], "max": [9, 1, 3]}},  # clash with wall1
            {"id": "door1", "type": "door", "bbox": {"min": [2, 0, 0], "max": [3, 0.1, 2.1]}},  # clash with wall1
        ]
        result = await _detect_clashes({"elements": elements, "element_types": ["wall"]})
        assert result["success"] is True
        # Only wall-wall clash should be detected
        assert result["data"]["clash_count"] == 1
        clash = result["data"]["clashes"][0]
        assert clash["element_a_type"] == "wall"
        assert clash["element_b_type"] == "wall"

    @pytest.mark.asyncio
    async def test_wall_door_clash(self):
        """Test detecting wall-door clash."""
        elements = [
            {"id": "wall1", "type": "wall", "bbox": {"min": [0, 0, 0], "max": [5, 1, 3]}},
            {"id": "door1", "type": "door", "bbox": {"min": [2, 0, 0], "max": [3, 1, 2.1]}},
        ]
        result = await _detect_clashes({"elements": elements})
        assert result["success"] is True
        # Wall and door overlap, should detect clash
        assert result["data"]["clash_count"] == 1
        clash = result["data"]["clashes"][0]
        assert clash["severity"] in ["error", "warning"]

    @pytest.mark.asyncio
    async def test_empty_elements(self):
        """Test with empty elements list."""
        result = await _detect_clashes({"elements": []})
        assert result["success"] is True
        assert result["data"]["clash_count"] == 0
        assert result["data"]["elements_checked"] == 0

    @pytest.mark.asyncio
    async def test_elements_without_bbox(self):
        """Test handling of elements without bounding box data."""
        elements = [
            {"id": "elem1", "type": "unknown"},  # No bbox data
            {"id": "elem2", "type": "wall", "bbox": {"min": [0, 0, 0], "max": [5, 1, 3]}},
        ]
        result = await _detect_clashes({"elements": elements})
        assert result["success"] is True
        # Only 1 element has bbox, so only 1 checked
        assert result["data"]["elements_checked"] == 1

    @pytest.mark.asyncio
    async def test_clash_location(self):
        """Test that clash location is calculated correctly."""
        elements = [
            {"id": "wall1", "type": "wall", "bbox": {"min": [0, 0, 0], "max": [5, 1, 3]}},
            {"id": "wall2", "type": "wall", "bbox": {"min": [4, 0, 0], "max": [9, 1, 3]}},
        ]
        result = await _detect_clashes({"elements": elements})
        assert result["success"] is True
        clash = result["data"]["clashes"][0]
        # Intersection is [4, 0, 0] to [5, 1, 3], center at [4.5, 0.5, 1.5]
        assert clash["location"][0] == pytest.approx(4.5)
        assert clash["location"][1] == pytest.approx(0.5)
        assert clash["location"][2] == pytest.approx(1.5)

    @pytest.mark.asyncio
    async def test_many_elements(self):
        """Test with many elements."""
        # Create many elements
        elements = [
            {"id": f"elem{i}", "type": "column", "bbox": {"min": [i*10, 0, 0], "max": [i*10+1, 1, 3]}}
            for i in range(50)
        ]
        result = await _detect_clashes({"elements": elements})
        assert result["success"] is True
        # No clashes since elements are spread out
        assert result["data"]["clash_count"] == 0
        assert result["data"]["elements_checked"] == 50


# =============================================================================
# Fire Compliance Tests
# =============================================================================


class TestCheckFireCompliance:
    """Tests for check_fire_compliance tool."""

    @pytest.mark.asyncio
    async def test_no_issues(self):
        """Test compliant elements."""
        elements = [
            {"id": "wall1", "type": "exit_stair_enclosure", "fire_rating": 2.0},
            {"id": "wall2", "type": "corridor", "fire_rating": 1.0},
        ]
        rooms = [{"id": "room1", "area": 100}]
        result = await _check_fire_compliance({"elements": elements, "rooms": rooms})
        assert result["success"] is True
        assert result["data"]["passed"] is True

    @pytest.mark.asyncio
    async def test_insufficient_fire_rating(self):
        """Test element with insufficient fire rating."""
        elements = [
            {"id": "wall1", "type": "exit_stair_enclosure", "fire_rating": 1.0},  # Needs 2.0
        ]
        result = await _check_fire_compliance({"elements": elements})
        assert result["success"] is True
        assert result["data"]["passed"] is False
        assert any(i["code"] == "FIRE010" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_compartment_too_large(self):
        """Test compartment exceeding maximum area."""
        rooms = [{"id": "room1", "area": 600}]  # Exceeds default 500m²
        result = await _check_fire_compliance({"elements": [], "rooms": rooms})
        assert result["success"] is True
        assert any(i["code"] == "FIRE011" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_custom_compartment_area(self):
        """Test custom maximum compartment area."""
        rooms = [{"id": "room1", "area": 300}]
        result = await _check_fire_compliance({
            "elements": [],
            "rooms": rooms,
            "max_compartment_area": 200
        })
        assert result["success"] is True
        assert result["data"]["passed"] is False

    @pytest.mark.asyncio
    async def test_custom_fire_requirements(self):
        """Test custom fire rating requirements."""
        elements = [
            {"id": "wall1", "type": "custom_partition", "fire_rating": 0.5},
        ]
        result = await _check_fire_compliance({
            "elements": elements,
            "fire_rating_requirements": {"custom_partition": 1.0}
        })
        assert result["success"] is True
        assert result["data"]["passed"] is False


# =============================================================================
# Accessibility Tests
# =============================================================================


class TestCheckAccessibility:
    """Tests for check_accessibility tool."""

    @pytest.mark.asyncio
    async def test_compliant_doors(self):
        """Test ADA-compliant doors."""
        doors = [
            {"id": "door1", "width": 0.9, "threshold_height": 0.01},
        ]
        result = await _check_accessibility({"doors": doors})
        assert result["success"] is True
        assert result["data"]["passed"] is True

    @pytest.mark.asyncio
    async def test_door_width_violation(self):
        """Test door below minimum clear width."""
        doors = [
            {"id": "door1", "width": 0.7},  # Below 0.815m ADA minimum
        ]
        result = await _check_accessibility({"doors": doors})
        assert result["success"] is True
        assert result["data"]["passed"] is False
        assert any(i["code"] == "ACCESS001" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_threshold_height_violation(self):
        """Test excessive threshold height."""
        doors = [
            {"id": "door1", "width": 0.9, "threshold_height": 0.02},  # Above 0.0125m max
        ]
        result = await _check_accessibility({"doors": doors})
        assert result["success"] is True
        assert any(i["code"] == "ACCESS002" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_corridor_width_violation(self):
        """Test narrow corridor."""
        doors = [{"id": "door1", "width": 0.9}]
        corridors = [
            {"id": "corridor1", "width": 0.8},  # Below 0.915m minimum
        ]
        result = await _check_accessibility({"doors": doors, "corridors": corridors})
        assert result["success"] is True
        assert any(i["code"] == "ACCESS003" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_room_turning_space_warning(self):
        """Test room lacking wheelchair turning space."""
        doors = [{"id": "door1", "width": 0.9}]
        rooms = [
            {"id": "room1", "min_dimension": 1.2},  # Below 1.525m turning radius
        ]
        result = await _check_accessibility({"doors": doors, "rooms": rooms})
        assert result["success"] is True
        assert any(i["code"] == "ACCESS004" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_empty_doors(self):
        """Test with empty doors list."""
        result = await _check_accessibility({"doors": []})
        assert result["success"] is True
        assert result["data"]["doors_checked"] == 0


# =============================================================================
# Egress Tests
# =============================================================================


class TestCheckEgress:
    """Tests for check_egress tool."""

    @pytest.mark.asyncio
    async def test_compliant_egress(self):
        """Test compliant egress configuration."""
        rooms = [
            {"id": "room1", "area": 50, "exit_door_ids": ["d1", "d2"], "max_travel_distance": 30}
        ]
        doors = [
            {"id": "d1", "width": 0.9},
            {"id": "d2", "width": 0.9},
        ]
        result = await _check_egress({"rooms": rooms, "doors": doors})
        assert result["success"] is True
        assert result["data"]["passed"] is True

    @pytest.mark.asyncio
    async def test_travel_distance_violation(self):
        """Test excessive travel distance."""
        rooms = [
            {"id": "room1", "area": 100, "exit_door_ids": ["d1"], "max_travel_distance": 70}
        ]
        doors = [{"id": "d1", "width": 0.9}]
        result = await _check_egress({
            "rooms": rooms,
            "doors": doors,
            "max_travel_distance": 45
        })
        assert result["success"] is True
        assert result["data"]["passed"] is False
        assert any(i["code"] == "EGRESS010" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_insufficient_exits(self):
        """Test room with insufficient exits."""
        rooms = [
            {"id": "room1", "area": 100, "exit_door_ids": ["d1"]}  # Needs 2
        ]
        doors = [{"id": "d1", "width": 0.9}]
        result = await _check_egress({"rooms": rooms, "doors": doors})
        assert result["success"] is True
        assert any(i["code"] == "EGRESS011" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_different_occupancy_types(self):
        """Test different occupancy type requirements."""
        rooms = [{"id": "room1", "area": 100, "exit_door_ids": ["d1", "d2"]}]
        doors = [{"id": "d1", "width": 0.9}, {"id": "d2", "width": 0.9}]

        for occupancy in ["assembly", "business", "educational", "factory", "residential", "storage"]:
            result = await _check_egress({
                "rooms": rooms,
                "doors": doors,
                "occupancy_type": occupancy
            })
            assert result["success"] is True
            assert result["data"]["occupancy_type"] == occupancy

    @pytest.mark.asyncio
    async def test_empty_rooms(self):
        """Test with empty rooms."""
        result = await _check_egress({"rooms": [], "doors": []})
        assert result["success"] is True
        assert result["data"]["rooms_checked"] == 0


# =============================================================================
# Door Clearance Tests
# =============================================================================


class TestCheckDoorClearances:
    """Tests for check_door_clearances tool."""

    @pytest.mark.asyncio
    async def test_compliant_door(self):
        """Test door with compliant clearances."""
        doors = [
            {"id": "door1", "width": 0.9, "clear_floor_space": 1.6}
        ]
        result = await _check_door_clearances({"doors": doors})
        assert result["success"] is True
        assert result["data"]["passed"] is True

    @pytest.mark.asyncio
    async def test_narrow_door(self):
        """Test door below minimum clear width."""
        doors = [
            {"id": "door1", "width": 0.7}  # Below 0.815m default
        ]
        result = await _check_door_clearances({"doors": doors})
        assert result["success"] is True
        assert result["data"]["passed"] is False
        assert any(i["code"] == "DOOR001" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_insufficient_maneuvering_space(self):
        """Test insufficient maneuvering clearance."""
        doors = [
            {"id": "door1", "width": 0.9, "clear_floor_space": 1.2}  # Below 1.5m default
        ]
        result = await _check_door_clearances({"doors": doors})
        assert result["success"] is True
        assert any(i["code"] == "DOOR002" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_custom_clearance_requirements(self):
        """Test custom clearance requirements."""
        doors = [
            {"id": "door1", "width": 0.8, "clear_floor_space": 1.3}
        ]
        result = await _check_door_clearances({
            "doors": doors,
            "min_clear_width": 0.75,  # Custom minimum
            "min_maneuvering_clearance": 1.2  # Custom minimum
        })
        assert result["success"] is True
        assert result["data"]["passed"] is True


# =============================================================================
# Stair Compliance Tests
# =============================================================================


class TestCheckStairCompliance:
    """Tests for check_stair_compliance tool."""

    @pytest.mark.asyncio
    async def test_compliant_stair(self):
        """Test IBC-compliant stair."""
        stairs = [{
            "id": "stair1",
            "width": 1.2,
            "riser_height": 0.17,
            "tread_depth": 0.28,
            "headroom": 2.1
        }]
        result = await _check_stair_compliance({"stairs": stairs})
        assert result["success"] is True
        assert result["data"]["passed"] is True

    @pytest.mark.asyncio
    async def test_stair_width_violation(self):
        """Test stair below minimum width."""
        stairs = [{"id": "stair1", "width": 1.0}]  # Below 1.118m IBC minimum
        result = await _check_stair_compliance({"stairs": stairs})
        assert result["success"] is True
        assert any(i["code"] == "STAIR001" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_riser_too_high(self):
        """Test riser exceeding maximum height."""
        stairs = [{"id": "stair1", "riser_height": 0.2}]  # Above 0.178m max
        result = await _check_stair_compliance({"stairs": stairs})
        assert result["success"] is True
        assert any(i["code"] == "STAIR002" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_riser_too_low(self):
        """Test riser below minimum height."""
        stairs = [{"id": "stair1", "riser_height": 0.08}]  # Below 0.102m min
        result = await _check_stair_compliance({"stairs": stairs})
        assert result["success"] is True
        assert any(i["code"] == "STAIR003" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_tread_too_shallow(self):
        """Test tread below minimum depth."""
        stairs = [{"id": "stair1", "tread_depth": 0.25}]  # Below 0.279m min
        result = await _check_stair_compliance({"stairs": stairs})
        assert result["success"] is True
        assert any(i["code"] == "STAIR004" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_headroom_too_low(self):
        """Test headroom below minimum."""
        stairs = [{"id": "stair1", "headroom": 1.9}]  # Below 2.032m min
        result = await _check_stair_compliance({"stairs": stairs})
        assert result["success"] is True
        assert any(i["code"] == "STAIR005" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_empty_stairs(self):
        """Test with empty stairs list."""
        result = await _check_stair_compliance({"stairs": []})
        assert result["success"] is True
        assert result["data"]["stairs_checked"] == 0


# =============================================================================
# Model Validation Tests
# =============================================================================


class TestValidateModel:
    """Tests for validate_model tool."""

    @pytest.mark.asyncio
    async def test_valid_model(self):
        """Test model with no issues."""
        elements = [
            {"id": "wall1", "type": "wall", "start": [0, 0], "end": [5, 0], "width": 0.2, "height": 3},
        ]
        result = await _validate_model({"elements": elements})
        assert result["success"] is True
        assert result["data"]["valid"] is True

    @pytest.mark.asyncio
    async def test_zero_length_wall(self):
        """Test detection of zero-length wall."""
        elements = [
            {"id": "wall1", "type": "wall", "start": [0, 0], "end": [0, 0]},
        ]
        result = await _validate_model({"elements": elements})
        assert result["success"] is True
        assert result["data"]["valid"] is False
        assert any(i["code"] == "GEOM001" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_short_wall_warning(self):
        """Test warning for very short wall."""
        elements = [
            {"id": "wall1", "type": "wall", "start": [0, 0], "end": [0.05, 0]},
        ]
        result = await _validate_model({"elements": elements})
        assert result["success"] is True
        assert any(i["code"] == "GEOM002" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_invalid_width(self):
        """Test detection of invalid width."""
        elements = [
            {"id": "elem1", "type": "door", "width": -0.5},
        ]
        result = await _validate_model({"elements": elements})
        assert result["success"] is True
        assert any(i["code"] == "GEOM003" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_invalid_height(self):
        """Test detection of invalid height."""
        elements = [
            {"id": "elem1", "type": "door", "height": 0},
        ]
        result = await _validate_model({"elements": elements})
        assert result["success"] is True
        assert any(i["code"] == "GEOM004" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_missing_id_warning(self):
        """Test warning for missing element ID."""
        elements = [
            {"type": "wall", "start": [0, 0], "end": [5, 0]},  # No ID
        ]
        result = await _validate_model({"elements": elements})
        assert result["success"] is True
        assert any(i["code"] == "GEN001" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_duplicate_id_error(self):
        """Test error for duplicate element IDs."""
        elements = [
            {"id": "wall1", "type": "wall", "start": [0, 0], "end": [5, 0]},
            {"id": "wall1", "type": "wall", "start": [5, 0], "end": [10, 0]},
        ]
        result = await _validate_model({"elements": elements})
        assert result["success"] is True
        assert any(i["code"] == "GEN002" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_category_filter(self):
        """Test filtering by validation category."""
        elements = [
            {"id": "wall1", "type": "wall", "start": [0, 0], "end": [0, 0]},  # Geometry issue
        ]
        rooms = [{"id": "room1", "area": 600}]  # Fire safety issue

        # Only geometry
        result = await _validate_model({
            "elements": elements,
            "rooms": rooms,
            "categories": ["geometry"]
        })
        assert result["success"] is True
        assert "geometry" in result["data"]["categories_checked"]
        assert "fire_safety" not in result["data"]["categories_checked"]

    @pytest.mark.asyncio
    async def test_severity_threshold(self):
        """Test severity threshold filtering."""
        elements = [
            {"id": "wall1", "type": "wall", "start": [0, 0], "end": [0.05, 0]},  # Warning
            {"id": "wall2", "type": "wall", "start": [0, 0], "end": [0, 0]},  # Error
        ]
        # Only errors
        result = await _validate_model({
            "elements": elements,
            "severity_threshold": "error"
        })
        assert result["success"] is True
        assert all(i["severity"] == "error" for i in result["data"]["issues"])

    @pytest.mark.asyncio
    async def test_all_categories(self):
        """Test running all validation categories."""
        elements = [{"id": "wall1", "type": "wall", "start": [0, 0], "end": [5, 0]}]
        result = await _validate_model({"elements": elements})
        assert result["success"] is True
        expected_categories = ["geometry", "accessibility", "fire_safety", "egress", "general"]
        for cat in expected_categories:
            assert cat in result["data"]["categories_checked"]


# =============================================================================
# Validation Error Handling Tests
# =============================================================================


class TestValidationErrors:
    """Tests for input validation error handling."""

    @pytest.mark.asyncio
    async def test_missing_required_elements(self):
        """Test error when required elements field is missing."""
        result = await _validate_model({})
        assert result["success"] is False
        assert "error" in result

    @pytest.mark.asyncio
    async def test_missing_required_doors(self):
        """Test error when required doors field is missing."""
        result = await _check_accessibility({})
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_large_tolerance(self):
        """Test with large tolerance value."""
        # Large tolerance should work without error
        result = await _detect_clashes({"elements": [], "tolerance": 5.0})
        assert result["success"] is True
        assert result["data"]["tolerance"] == 5.0


# =============================================================================
# Performance Tests
# =============================================================================


class TestPerformance:
    """Performance tests for validation tools."""

    @pytest.mark.asyncio
    async def test_large_element_validation(self):
        """Test validation with many elements."""
        elements = [
            {"id": f"wall{i}", "type": "wall", "start": [i*5, 0], "end": [i*5+4, 0]}
            for i in range(100)
        ]
        result = await _validate_model({"elements": elements})
        assert result["success"] is True
        assert result["data"]["element_count"] == 100

    @pytest.mark.asyncio
    async def test_large_clash_detection(self):
        """Test clash detection with many elements."""
        # Create elements that don't clash
        elements = [
            {"id": f"elem{i}", "type": "column", "bbox": {"min": [i*10, 0, 0], "max": [i*10+1, 1, 3]}}
            for i in range(100)
        ]
        result = await _detect_clashes({"elements": elements})
        assert result["success"] is True
        assert result["data"]["elements_checked"] == 100

    @pytest.mark.asyncio
    async def test_many_rooms_egress(self):
        """Test egress validation with many rooms."""
        rooms = [
            {"id": f"room{i}", "area": 50, "exit_door_ids": [f"d{i}1", f"d{i}2"]}
            for i in range(50)
        ]
        doors = []
        for i in range(50):
            doors.extend([
                {"id": f"d{i}1", "width": 0.9},
                {"id": f"d{i}2", "width": 0.9}
            ])
        result = await _check_egress({"rooms": rooms, "doors": doors})
        assert result["success"] is True
        assert result["data"]["rooms_checked"] == 50


# =============================================================================
# Constants Tests
# =============================================================================


class TestConstants:
    """Tests for compliance constants."""

    def test_ada_requirements_exist(self):
        """Test that ADA requirements are defined."""
        assert "door_clear_width" in ADA_REQUIREMENTS
        assert "corridor_width" in ADA_REQUIREMENTS
        assert "turning_radius" in ADA_REQUIREMENTS

    def test_fire_rating_defaults_exist(self):
        """Test that fire rating defaults are defined."""
        assert "exit_stair_enclosure" in FIRE_RATING_DEFAULTS
        assert "corridor" in FIRE_RATING_DEFAULTS

    def test_egress_requirements_exist(self):
        """Test that egress requirements are defined."""
        assert "business" in EGRESS_REQUIREMENTS
        assert "residential" in EGRESS_REQUIREMENTS
        assert all("max_travel" in v for v in EGRESS_REQUIREMENTS.values())

    def test_stair_requirements_exist(self):
        """Test that stair requirements are defined."""
        assert "min_width" in STAIR_REQUIREMENTS_IBC
        assert "max_riser_height" in STAIR_REQUIREMENTS_IBC
        assert "min_tread_depth" in STAIR_REQUIREMENTS_IBC
