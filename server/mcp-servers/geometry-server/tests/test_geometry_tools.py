"""Tests for Geometry MCP Server tools.

These tests verify that:
1. Tool definitions have correct schemas
2. Pydantic schemas validate input correctly
3. Tool handlers are registered for all tools
"""

import pytest
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from geometry_server.schemas import (
    CreateWallParams,
    CreateFloorParams,
    CreateRoomParams,
    PlaceDoorParams,
    PlaceWindowParams,
    CreateOpeningParams,
    DetectJoinsParams,
    GenerateMeshParams,
    CreateRoofParams,
)
from pydantic import ValidationError


class TestCreateOpeningParams:
    """Test CreateOpeningParams validation."""

    def test_valid_generic_opening(self):
        """Valid generic opening should be accepted."""
        params = CreateOpeningParams(
            host_id="test-uuid",
            offset=2.5,
            width=1.0,
            height=2.5,
            base_height=0.0,
            opening_type="generic",
        )
        assert params.host_id == "test-uuid"
        assert params.opening_type == "generic"

    def test_valid_door_opening(self):
        """Valid door opening should be accepted."""
        params = CreateOpeningParams(
            host_id="test-uuid",
            offset=2.5,
            width=0.9,
            height=2.1,
            opening_type="door",
        )
        assert params.opening_type == "door"

    def test_valid_window_opening(self):
        """Valid window opening should be accepted."""
        params = CreateOpeningParams(
            host_id="test-uuid",
            offset=1.5,
            width=1.2,
            height=1.0,
            base_height=0.9,
            opening_type="window",
        )
        assert params.opening_type == "window"
        assert params.base_height == 0.9

    def test_missing_required_field(self):
        """Missing required field should raise ValidationError."""
        with pytest.raises(ValidationError):
            CreateOpeningParams(
                host_id="test-uuid",
                offset=2.5,
                # Missing width and height
            )

    def test_negative_width_rejected(self):
        """Negative width should be rejected."""
        with pytest.raises(ValidationError):
            CreateOpeningParams(
                host_id="test-uuid",
                offset=2.5,
                width=-1.0,
                height=2.0,
            )

    def test_default_opening_type(self):
        """Default opening_type should be 'generic'."""
        params = CreateOpeningParams(
            host_id="test-uuid",
            offset=2.5,
            width=1.0,
            height=2.0,
        )
        assert params.opening_type == "generic"


class TestCreateWallParams:
    """Test CreateWallParams validation."""

    def test_valid_wall(self):
        """Valid wall parameters should be accepted."""
        params = CreateWallParams(
            start=(0.0, 0.0),
            end=(5.0, 0.0),
            height=3.0,
            thickness=0.2,
        )
        assert params.start == (0.0, 0.0)
        assert params.end == (5.0, 0.0)
        assert params.height == 3.0

    def test_valid_wall_types(self):
        """Valid wall types should be accepted."""
        for wall_type in ["basic", "structural", "curtain", "retaining"]:
            params = CreateWallParams(
                start=(0.0, 0.0),
                end=(5.0, 0.0),
                wall_type=wall_type,
            )
            assert params.wall_type == wall_type

    def test_invalid_wall_type(self):
        """Invalid wall type should be rejected."""
        with pytest.raises(ValidationError):
            CreateWallParams(
                start=(0.0, 0.0),
                end=(5.0, 0.0),
                wall_type="invalid_type",
            )

    def test_default_values(self):
        """Default values should be applied."""
        params = CreateWallParams(
            start=(0.0, 0.0),
            end=(5.0, 0.0),
        )
        assert params.height == 3.0
        assert params.thickness == 0.2


class TestPlaceDoorParams:
    """Test PlaceDoorParams validation."""

    def test_valid_door(self):
        """Valid door parameters should be accepted."""
        params = PlaceDoorParams(
            wall_id="test-uuid",
            offset=2.5,
            width=0.9,
            height=2.1,
        )
        assert params.wall_id == "test-uuid"
        assert params.width == 0.9

    def test_valid_door_types(self):
        """Valid door types should be accepted."""
        for door_type in ["single", "double", "sliding", "folding", "revolving", "pocket"]:
            params = PlaceDoorParams(
                wall_id="test-uuid",
                offset=2.5,
                door_type=door_type,
            )
            assert params.door_type == door_type

    def test_valid_swing_directions(self):
        """Valid swing directions should be accepted."""
        for swing in ["left", "right", "both", "none"]:
            params = PlaceDoorParams(
                wall_id="test-uuid",
                offset=2.5,
                swing=swing,
            )
            assert params.swing == swing


class TestPlaceWindowParams:
    """Test PlaceWindowParams validation."""

    def test_valid_window(self):
        """Valid window parameters should be accepted."""
        params = PlaceWindowParams(
            wall_id="test-uuid",
            offset=1.5,
            width=1.2,
            height=1.0,
            sill_height=0.9,
        )
        assert params.wall_id == "test-uuid"
        assert params.sill_height == 0.9

    def test_valid_window_types(self):
        """Valid window types should be accepted."""
        valid_types = ["fixed", "casement", "double_hung", "sliding", "awning", "hopper", "pivot"]
        for window_type in valid_types:
            params = PlaceWindowParams(
                wall_id="test-uuid",
                offset=1.5,
                window_type=window_type,
            )
            assert params.window_type == window_type


class TestGenerateMeshParams:
    """Test GenerateMeshParams validation."""

    def test_valid_mesh_params(self):
        """Valid mesh parameters should be accepted."""
        params = GenerateMeshParams(
            element_id="test-uuid",
            format="json",
        )
        assert params.element_id == "test-uuid"
        assert params.format == "json"

    def test_valid_formats(self):
        """Valid formats should be accepted."""
        for fmt in ["json", "obj"]:
            params = GenerateMeshParams(
                element_id="test-uuid",
                format=fmt,
            )
            assert params.format == fmt


class TestCreateRoofParams:
    """Test CreateRoofParams validation."""

    def test_valid_roof(self):
        """Valid roof parameters should be accepted."""
        params = CreateRoofParams(
            min_point=(0.0, 0.0),
            max_point=(10.0, 8.0),
            thickness=0.25,
            roof_type="gable",
            slope_degrees=35.0,
        )
        assert params.roof_type == "gable"
        assert params.slope_degrees == 35.0

    def test_valid_roof_types(self):
        """Valid roof types should be accepted."""
        for roof_type in ["flat", "gable", "hip", "shed", "mansard"]:
            params = CreateRoofParams(
                min_point=(0.0, 0.0),
                max_point=(10.0, 8.0),
                roof_type=roof_type,
            )
            assert params.roof_type == roof_type


class TestDetectJoinsParams:
    """Test DetectJoinsParams validation."""

    def test_valid_join_detection(self):
        """Valid join detection parameters should be accepted."""
        params = DetectJoinsParams(
            wall_ids=["uuid-1", "uuid-2", "uuid-3"],
            tolerance=0.001,
        )
        assert len(params.wall_ids) == 3
        assert params.tolerance == 0.001

    def test_default_tolerance(self):
        """Default tolerance should be applied."""
        params = DetectJoinsParams(
            wall_ids=["uuid-1", "uuid-2"],
        )
        assert params.tolerance == 0.001
