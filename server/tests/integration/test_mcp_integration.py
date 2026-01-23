"""Integration tests for MCP tool servers.

These tests verify the full HTTP flow from client to server:
1. Test all geometry tools
2. Test spatial tools
3. Test validation tools
4. Test documentation tools
5. Error handling tests
6. Performance benchmarks

Run with: pytest server/tests/integration/ -v
"""

import asyncio
import time
from typing import Any
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

# Import FastAPI app
import sys
from pathlib import Path

# Add server to path for imports
SERVER_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(SERVER_ROOT))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "geometry-server"))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "spatial-server"))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "validation-server"))
sys.path.insert(0, str(SERVER_ROOT / "mcp-servers" / "documentation-server"))

from main import app, TOOL_CATALOG, TOOL_HANDLERS


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def client() -> TestClient:
    """Create a test client for synchronous tests."""
    return TestClient(app)


@pytest.fixture
async def async_client():
    """Create an async test client for async tests."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# =============================================================================
# Health & Discovery Tests
# =============================================================================


class TestServerHealth:
    """Test server health and tool discovery endpoints."""

    def test_root_endpoint(self, client: TestClient):
        """Test server root endpoint returns health info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Pensaer BIM Server"
        assert data["status"] == "running"
        assert "tools_available" in data
        assert data["tools_available"] > 0

    def test_health_endpoint(self, client: TestClient):
        """Test /health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_list_all_tools(self, client: TestClient):
        """Test listing all available MCP tools."""
        response = client.get("/mcp/tools")
        assert response.status_code == 200
        tools = response.json()
        assert isinstance(tools, list)
        assert len(tools) > 0

        # Verify tool structure
        for tool in tools:
            assert "name" in tool
            assert "description" in tool
            assert "category" in tool
            assert "input_schema" in tool

    def test_list_tools_by_category_spatial(self, client: TestClient):
        """Test listing spatial tools."""
        response = client.get("/mcp/tools/spatial")
        assert response.status_code == 200
        tools = response.json()
        assert len(tools) > 0
        for tool in tools:
            assert tool["category"] == "spatial"

    def test_list_tools_by_category_validation(self, client: TestClient):
        """Test listing validation tools."""
        response = client.get("/mcp/tools/validation")
        assert response.status_code == 200
        tools = response.json()
        assert len(tools) > 0
        for tool in tools:
            assert tool["category"] == "validation"

    def test_list_tools_by_category_documentation(self, client: TestClient):
        """Test listing documentation tools."""
        response = client.get("/mcp/tools/documentation")
        assert response.status_code == 200
        tools = response.json()
        assert len(tools) > 0
        for tool in tools:
            assert tool["category"] == "documentation"

    def test_list_tools_invalid_category(self, client: TestClient):
        """Test listing tools with invalid category returns 404."""
        response = client.get("/mcp/tools/invalid_category")
        assert response.status_code == 404


# =============================================================================
# Geometry Tools Integration Tests
# =============================================================================


class TestGeometryTools:
    """Integration tests for geometry MCP tools."""

    def test_create_wall(self, client: TestClient):
        """Test create_wall tool via HTTP."""
        response = client.post(
            "/mcp/tools/create_wall",
            json={"arguments": {
                "start": [0.0, 0.0],
                "end": [5.0, 0.0],
                "height": 3.0,
                "thickness": 0.2,
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "wall_id" in data["data"] or "id" in data["data"]
        assert "event_id" in data
        assert "timestamp" in data

    def test_create_wall_with_wall_type(self, client: TestClient):
        """Test create_wall with different wall types."""
        for wall_type in ["basic", "structural", "curtain"]:
            response = client.post(
                "/mcp/tools/create_wall",
                json={"arguments": {
                    "start": [0.0, 0.0],
                    "end": [10.0, 0.0],
                    "wall_type": wall_type,
                }},
            )
            assert response.status_code == 200
            assert response.json()["success"] is True

    def test_create_rectangular_walls(self, client: TestClient):
        """Test create_rectangular_walls tool."""
        response = client.post(
            "/mcp/tools/create_rectangular_walls",
            json={"arguments": {
                "min_point": [0.0, 0.0],
                "max_point": [10.0, 8.0],
                "height": 3.0,
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Should create 4 walls
        if "wall_ids" in data.get("data", {}):
            assert len(data["data"]["wall_ids"]) == 4

    def test_create_floor(self, client: TestClient):
        """Test create_floor tool."""
        response = client.post(
            "/mcp/tools/create_floor",
            json={"arguments": {
                "min_point": [0.0, 0.0],
                "max_point": [10.0, 8.0],
                "thickness": 0.3,
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data

    def test_create_room(self, client: TestClient):
        """Test create_room tool."""
        response = client.post(
            "/mcp/tools/create_room",
            json={"arguments": {
                "name": "Living Room",
                "number": "101",
                "min_point": [0.0, 0.0],
                "max_point": [5.0, 4.0],
                "height": 2.7,
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_create_roof(self, client: TestClient):
        """Test create_roof tool with different types."""
        for roof_type in ["flat", "gable", "hip"]:
            response = client.post(
                "/mcp/tools/create_roof",
                json={"arguments": {
                    "min_point": [0.0, 0.0],
                    "max_point": [10.0, 8.0],
                    "roof_type": roof_type,
                    "slope_degrees": 30.0 if roof_type != "flat" else 0.0,
                }},
            )
            assert response.status_code == 200
            assert response.json()["success"] is True

    def test_place_door(self, client: TestClient):
        """Test place_door tool."""
        # First create a wall
        wall_response = client.post(
            "/mcp/tools/create_wall",
            json={"arguments": {
                "start": [0.0, 0.0],
                "end": [5.0, 0.0],
            }},
        )
        assert wall_response.status_code == 200
        wall_data = wall_response.json()["data"]
        wall_id = wall_data.get("wall_id") or wall_data.get("id")

        # Place door in wall
        response = client.post(
            "/mcp/tools/place_door",
            json={"arguments": {
                "wall_id": wall_id,
                "offset": 2.0,
                "width": 0.9,
                "height": 2.1,
                "door_type": "single",
            }},
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_place_window(self, client: TestClient):
        """Test place_window tool."""
        # First create a wall
        wall_response = client.post(
            "/mcp/tools/create_wall",
            json={"arguments": {
                "start": [0.0, 0.0],
                "end": [5.0, 0.0],
            }},
        )
        assert wall_response.status_code == 200
        wall_data = wall_response.json()["data"]
        wall_id = wall_data.get("wall_id") or wall_data.get("id")

        # Place window in wall
        response = client.post(
            "/mcp/tools/place_window",
            json={"arguments": {
                "wall_id": wall_id,
                "offset": 1.5,
                "width": 1.2,
                "height": 1.0,
                "sill_height": 0.9,
            }},
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_get_element(self, client: TestClient):
        """Test get_element tool."""
        response = client.post(
            "/mcp/tools/get_element",
            json={"arguments": {
                "element_id": "test-element-id",
            }},
        )
        assert response.status_code == 200
        # May return success with data or success=False if not found

    def test_list_elements(self, client: TestClient):
        """Test list_elements tool."""
        response = client.post(
            "/mcp/tools/list_elements",
            json={"arguments": {}},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_list_elements_by_category(self, client: TestClient):
        """Test list_elements with category filter."""
        response = client.post(
            "/mcp/tools/list_elements",
            json={"arguments": {
                "category": "wall",
            }},
        )
        assert response.status_code == 200

    def test_detect_clashes(self, client: TestClient):
        """Test detect_clashes tool."""
        response = client.post(
            "/mcp/tools/detect_clashes",
            json={"arguments": {
                "tolerance": 0.001,
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_get_state_summary(self, client: TestClient):
        """Test get_state_summary tool."""
        response = client.post(
            "/mcp/tools/get_state_summary",
            json={"arguments": {}},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


# =============================================================================
# Spatial Tools Integration Tests
# =============================================================================


class TestSpatialTools:
    """Integration tests for spatial MCP tools."""

    def test_compute_adjacency(self, client: TestClient):
        """Test compute_adjacency tool."""
        response = client.post(
            "/mcp/tools/compute_adjacency",
            json={"arguments": {
                "rooms": [
                    {"id": "room1", "boundary_wall_ids": ["w1", "w2", "w3", "w4"]},
                    {"id": "room2", "boundary_wall_ids": ["w3", "w5", "w6", "w7"]},
                ],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert data["data"]["room_count"] == 2

    def test_find_nearest(self, client: TestClient):
        """Test find_nearest tool."""
        response = client.post(
            "/mcp/tools/find_nearest",
            json={"arguments": {
                "x": 5.0,
                "y": 5.0,
                "radius": 10.0,
                "elements": [
                    {"id": "e1", "type": "wall", "position": [0, 0, 0]},
                    {"id": "e2", "type": "wall", "position": [4, 5, 0]},
                    {"id": "e3", "type": "door", "position": [10, 10, 0]},
                ],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["count"] >= 1

    def test_find_nearest_with_type_filter(self, client: TestClient):
        """Test find_nearest with element type filter."""
        response = client.post(
            "/mcp/tools/find_nearest",
            json={"arguments": {
                "x": 0,
                "y": 0,
                "radius": 20.0,
                "elements": [
                    {"id": "w1", "type": "wall", "position": [1, 0, 0]},
                    {"id": "d1", "type": "door", "position": [2, 0, 0]},
                ],
                "element_types": ["door"],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Only doors should be in results
        for r in data["data"]["results"]:
            assert r["element_type"] == "door"

    def test_compute_area(self, client: TestClient):
        """Test compute_area tool."""
        response = client.post(
            "/mcp/tools/compute_area",
            json={"arguments": {
                "polygon": [[0, 0], [10, 0], [10, 10], [0, 10]],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert abs(data["data"]["gross_area"] - 100.0) < 0.01

    def test_compute_area_with_holes(self, client: TestClient):
        """Test compute_area with holes."""
        response = client.post(
            "/mcp/tools/compute_area",
            json={"arguments": {
                "polygon": [[0, 0], [10, 0], [10, 10], [0, 10]],
                "include_holes": [
                    [[2, 2], [4, 2], [4, 4], [2, 4]],
                ],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert abs(data["data"]["net_area"] - 96.0) < 0.01

    def test_check_clearance(self, client: TestClient):
        """Test check_clearance tool."""
        response = client.post(
            "/mcp/tools/check_clearance",
            json={"arguments": {
                "element": {"id": "door1", "position": [5, 5, 0]},
                "clearance_type": "door_swing",
                "obstacles": [],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["passed"] is True

    def test_check_clearance_with_obstruction(self, client: TestClient):
        """Test check_clearance with obstruction."""
        response = client.post(
            "/mcp/tools/check_clearance",
            json={"arguments": {
                "element": {"id": "door1", "position": [5, 5, 0]},
                "clearance_type": "door_swing",
                "min_clearance": 0.9,
                "obstacles": [
                    {"id": "wall1", "type": "wall", "position": [5.5, 5, 0]},
                ],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["passed"] is False

    def test_analyze_circulation(self, client: TestClient):
        """Test analyze_circulation tool."""
        response = client.post(
            "/mcp/tools/analyze_circulation",
            json={"arguments": {
                "rooms": [
                    {"id": "room1", "boundary_wall_ids": ["w1", "w2", "w3", "w4"]},
                    {"id": "room2", "boundary_wall_ids": ["w3", "w5", "w6", "w7"]},
                ],
                "doors": [
                    {"id": "door1", "host_wall_id": "w3"},
                ],
                "start_room_id": "room1",
                "end_room_id": "room2",
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["path_exists"] is True

    def test_point_in_polygon(self, client: TestClient):
        """Test point_in_polygon tool."""
        response = client.post(
            "/mcp/tools/point_in_polygon",
            json={"arguments": {
                "point": [5, 5],
                "polygon": [[0, 0], [10, 0], [10, 10], [0, 10]],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["inside"] is True


# =============================================================================
# Validation Tools Integration Tests
# =============================================================================


class TestValidationTools:
    """Integration tests for validation MCP tools."""

    def test_validate_model(self, client: TestClient):
        """Test validate_model tool."""
        response = client.post(
            "/mcp/tools/validate_model",
            json={"arguments": {
                "elements": [
                    {"id": "w1", "type": "wall", "start": [0, 0], "end": [5, 0], "height": 3.0},
                    {"id": "d1", "type": "door", "width": 0.9, "height": 2.1},
                ],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "valid" in data["data"]

    def test_validate_model_with_categories(self, client: TestClient):
        """Test validate_model with specific categories."""
        response = client.post(
            "/mcp/tools/validate_model",
            json={"arguments": {
                "elements": [
                    {"id": "w1", "type": "wall", "width": 0.2},
                ],
                "categories": ["geometry", "general"],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "geometry" in data["data"]["categories_checked"]
        assert "general" in data["data"]["categories_checked"]

    def test_check_fire_compliance(self, client: TestClient):
        """Test check_fire_compliance tool."""
        response = client.post(
            "/mcp/tools/check_fire_compliance",
            json={"arguments": {
                "elements": [
                    {"id": "w1", "type": "exit_stair_enclosure", "fire_rating": 1.0},
                ],
                "rooms": [
                    {"id": "r1", "area": 400},
                ],
                "max_compartment_area": 500,
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "passed" in data["data"]

    def test_check_accessibility(self, client: TestClient):
        """Test check_accessibility tool."""
        response = client.post(
            "/mcp/tools/check_accessibility",
            json={"arguments": {
                "doors": [
                    {"id": "d1", "width": 0.9, "threshold_height": 0.01},
                ],
                "corridors": [
                    {"id": "c1", "width": 1.2},
                ],
                "standard": "ADA",
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "passed" in data["data"]
        assert data["data"]["standard"] == "ADA"

    def test_check_accessibility_failing(self, client: TestClient):
        """Test check_accessibility with non-compliant elements."""
        response = client.post(
            "/mcp/tools/check_accessibility",
            json={"arguments": {
                "doors": [
                    {"id": "d1", "width": 0.6},  # Too narrow
                ],
                "standard": "ADA",
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["passed"] is False
        assert len(data["data"]["issues"]) > 0

    def test_check_egress(self, client: TestClient):
        """Test check_egress tool."""
        response = client.post(
            "/mcp/tools/check_egress",
            json={"arguments": {
                "rooms": [
                    {"id": "r1", "area": 100, "exit_door_ids": ["d1", "d2"]},
                ],
                "doors": [
                    {"id": "d1", "width": 0.9},
                    {"id": "d2", "width": 0.9},
                ],
                "occupancy_type": "business",
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "passed" in data["data"]

    def test_check_door_clearances(self, client: TestClient):
        """Test check_door_clearances tool."""
        response = client.post(
            "/mcp/tools/check_door_clearances",
            json={"arguments": {
                "doors": [
                    {"id": "d1", "width": 0.9, "clear_floor_space": 1.6},
                ],
                "min_clear_width": 0.815,
                "min_maneuvering_clearance": 1.5,
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["passed"] is True

    def test_check_stair_compliance(self, client: TestClient):
        """Test check_stair_compliance tool."""
        response = client.post(
            "/mcp/tools/check_stair_compliance",
            json={"arguments": {
                "stairs": [
                    {
                        "id": "s1",
                        "width": 1.2,
                        "riser_height": 0.17,
                        "tread_depth": 0.28,
                        "headroom": 2.1,
                    },
                ],
                "building_code": "IBC",
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "passed" in data["data"]

    def test_detect_clashes_no_clashes(self, client: TestClient):
        """Test detect_clashes with non-overlapping elements."""
        response = client.post(
            "/mcp/tools/detect_clashes",
            json={"arguments": {
                "elements": [
                    {
                        "id": "w1",
                        "type": "wall",
                        "start": [0.0, 0.0],
                        "end": [5.0, 0.0],
                        "height": 3.0,
                        "thickness": 0.2,
                    },
                    {
                        "id": "w2",
                        "type": "wall",
                        "start": [10.0, 0.0],
                        "end": [15.0, 0.0],
                        "height": 3.0,
                        "thickness": 0.2,
                    },
                ],
                "tolerance": 0.0,
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["clash_free"] is True
        assert data["data"]["clash_count"] == 0
        assert data["data"]["elements_checked"] == 2

    def test_detect_clashes_with_overlap(self, client: TestClient):
        """Test detect_clashes detects overlapping elements."""
        response = client.post(
            "/mcp/tools/detect_clashes",
            json={"arguments": {
                "elements": [
                    {
                        "id": "w1",
                        "type": "wall",
                        "start": [0.0, 0.0],
                        "end": [5.0, 0.0],
                        "height": 3.0,
                        "thickness": 0.2,
                    },
                    {
                        "id": "w2",
                        "type": "wall",
                        "start": [4.0, -2.0],
                        "end": [4.0, 2.0],
                        "height": 3.0,
                        "thickness": 0.2,
                    },
                ],
                "tolerance": 0.0,
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["clash_free"] is False
        assert data["data"]["clash_count"] >= 1
        # Verify clash details
        clash = data["data"]["clashes"][0]
        assert "element_a_id" in clash
        assert "element_b_id" in clash
        assert "clash_type" in clash
        assert "severity" in clash
        assert "overlap_distance" in clash
        assert "location" in clash

    def test_detect_clashes_with_tolerance_clearance(self, client: TestClient):
        """Test detect_clashes with positive tolerance (clearance requirement)."""
        response = client.post(
            "/mcp/tools/detect_clashes",
            json={"arguments": {
                "elements": [
                    {
                        "id": "col1",
                        "type": "column",
                        "bbox": {"min": [0.0, 0.0, 0.0], "max": [0.3, 0.3, 3.0]},
                    },
                    {
                        "id": "col2",
                        "type": "column",
                        "bbox": {"min": [0.4, 0.0, 0.0], "max": [0.7, 0.3, 3.0]},
                    },
                ],
                "tolerance": 0.2,  # Require 0.2m clearance
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Columns are 0.1m apart, but we require 0.2m clearance
        assert data["data"]["clash_free"] is False
        assert data["data"]["clash_count"] >= 1

    def test_detect_clashes_with_negative_tolerance(self, client: TestClient):
        """Test detect_clashes with negative tolerance (allowed overlap)."""
        response = client.post(
            "/mcp/tools/detect_clashes",
            json={"arguments": {
                "elements": [
                    {
                        "id": "w1",
                        "type": "wall",
                        "bbox": {"min": [0.0, 0.0, 0.0], "max": [5.0, 0.2, 3.0]},
                    },
                    {
                        "id": "w2",
                        "type": "wall",
                        "bbox": {"min": [4.95, 0.0, 0.0], "max": [10.0, 0.2, 3.0]},
                    },
                ],
                "tolerance": -0.1,  # Allow 0.1m overlap
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # 0.05m overlap is within allowed 0.1m
        assert data["data"]["clash_free"] is True

    def test_detect_clashes_element_type_filter(self, client: TestClient):
        """Test detect_clashes with element type filtering."""
        response = client.post(
            "/mcp/tools/detect_clashes",
            json={"arguments": {
                "elements": [
                    {
                        "id": "w1",
                        "type": "wall",
                        "bbox": {"min": [0.0, 0.0, 0.0], "max": [5.0, 0.2, 3.0]},
                    },
                    {
                        "id": "c1",
                        "type": "column",
                        "bbox": {"min": [2.0, 0.0, 0.0], "max": [2.3, 0.3, 3.0]},
                    },
                    {
                        "id": "d1",
                        "type": "door",
                        "bbox": {"min": [1.0, 0.0, 0.0], "max": [1.9, 0.1, 2.1]},
                    },
                ],
                "element_types": ["wall", "column"],  # Only check walls and columns
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["elements_checked"] == 2  # Door excluded
        # Wall and column overlap
        assert data["data"]["clash_count"] >= 1
        for clash in data["data"]["clashes"]:
            assert clash["element_a_type"] in ["wall", "column"]
            assert clash["element_b_type"] in ["wall", "column"]

    def test_detect_clashes_custom_severity(self, client: TestClient):
        """Test detect_clashes with custom severity levels."""
        response = client.post(
            "/mcp/tools/detect_clashes",
            json={"arguments": {
                "elements": [
                    {
                        "id": "w1",
                        "type": "wall",
                        "bbox": {"min": [0.0, 0.0, 0.0], "max": [5.0, 0.2, 3.0]},
                    },
                    {
                        "id": "beam1",
                        "type": "beam",
                        "bbox": {"min": [2.0, -0.5, 2.5], "max": [3.0, 0.5, 3.0]},
                    },
                ],
                "severity_levels": {
                    "wall-beam": "info",  # Custom: mark wall-beam as info
                },
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        if data["data"]["clash_count"] > 0:
            assert data["data"]["clashes"][0]["severity"] == "info"

    def test_detect_clashes_batch_processing(self, client: TestClient):
        """Test detect_clashes with batch processing."""
        # Create many elements to test batch processing
        elements = []
        for i in range(10):
            elements.append({
                "id": f"col_{i}",
                "type": "column",
                "bbox": {
                    "min": [i * 3.0, 0.0, 0.0],
                    "max": [i * 3.0 + 0.3, 0.3, 3.0]
                },
            })

        response = client.post(
            "/mcp/tools/detect_clashes",
            json={"arguments": {
                "elements": elements,
                "batch_size": 3,  # Small batch size
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["elements_checked"] == 10
        assert data["data"]["pairs_checked"] == 45  # 10 choose 2

    def test_detect_clashes_severity_counts(self, client: TestClient):
        """Test detect_clashes returns correct severity counts."""
        response = client.post(
            "/mcp/tools/detect_clashes",
            json={"arguments": {
                "elements": [
                    {
                        "id": "w1",
                        "type": "wall",
                        "bbox": {"min": [0.0, 0.0, 0.0], "max": [5.0, 0.2, 3.0]},
                    },
                    {
                        "id": "w2",
                        "type": "wall",
                        "bbox": {"min": [4.0, -2.0, 0.0], "max": [4.2, 2.0, 3.0]},
                    },
                ],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "counts_by_severity" in data["data"]
        assert "counts_by_type" in data["data"]
        counts = data["data"]["counts_by_severity"]
        assert "error" in counts
        assert "warning" in counts
        assert "info" in counts

    def test_detect_clashes_elements_without_bbox(self, client: TestClient):
        """Test detect_clashes handles elements without bounding boxes."""
        response = client.post(
            "/mcp/tools/detect_clashes",
            json={"arguments": {
                "elements": [
                    {
                        "id": "w1",
                        "type": "wall",
                        "start": [0.0, 0.0],
                        "end": [5.0, 0.0],
                        "height": 3.0,
                        "thickness": 0.2,
                    },
                    {
                        "id": "unknown1",
                        "type": "custom",
                        # No bbox, start/end, or position
                    },
                ],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["elements_checked"] == 1
        assert data["data"]["elements_skipped_no_bbox"] == 1


# =============================================================================
# Documentation Tools Integration Tests
# =============================================================================


class TestDocumentationTools:
    """Integration tests for documentation MCP tools."""

    def test_generate_schedule_table(self, client: TestClient):
        """Test generate_schedule with table format."""
        response = client.post(
            "/mcp/tools/generate_schedule",
            json={"arguments": {
                "element_type": "wall",
                "elements": [
                    {"id": "w1", "type": "wall", "height": 2.7, "length": 5.0},
                    {"id": "w2", "type": "wall", "height": 2.7, "length": 3.0},
                ],
                "format": "table",
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "# Wall Schedule" in data["data"]["schedule"]

    def test_generate_schedule_csv(self, client: TestClient):
        """Test generate_schedule with CSV format."""
        response = client.post(
            "/mcp/tools/generate_schedule",
            json={"arguments": {
                "element_type": "door",
                "elements": [
                    {"id": "d1", "type": "door", "width": 0.9},
                ],
                "format": "csv",
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["format"] == "csv"

    def test_generate_schedule_json(self, client: TestClient):
        """Test generate_schedule with JSON format."""
        response = client.post(
            "/mcp/tools/generate_schedule",
            json={"arguments": {
                "element_type": "room",
                "elements": [
                    {"id": "r1", "type": "room", "area": 25.0},
                ],
                "format": "json",
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["format"] == "json"

    def test_export_ifc(self, client: TestClient):
        """Test export_ifc tool."""
        response = client.post(
            "/mcp/tools/export_ifc",
            json={"arguments": {
                "elements": [
                    {"id": "w1", "type": "wall", "start": [0, 0], "end": [5, 0], "height": 2.7},
                ],
                "project_name": "Test Project",
                "ifc_version": "IFC4",
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "ifc_structure" in data["data"]
        assert data["data"]["ifc_version"] == "IFC4"

    def test_export_report_model_summary(self, client: TestClient):
        """Test export_report with model_summary type."""
        response = client.post(
            "/mcp/tools/export_report",
            json={"arguments": {
                "report_type": "model_summary",
                "elements": [
                    {"id": "w1", "type": "wall"},
                    {"id": "w2", "type": "wall"},
                    {"id": "d1", "type": "door"},
                ],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["report_type"] == "model_summary"

    def test_export_report_html(self, client: TestClient):
        """Test export_report with HTML format."""
        response = client.post(
            "/mcp/tools/export_report",
            json={"arguments": {
                "report_type": "validation",
                "format": "html",
                "validation_results": [],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "<!DOCTYPE html>" in data["data"]["report"]

    def test_generate_quantities(self, client: TestClient):
        """Test generate_quantities tool."""
        response = client.post(
            "/mcp/tools/generate_quantities",
            json={"arguments": {
                "element_type": "wall",
                "elements": [
                    {"id": "w1", "start": [0, 0], "end": [5, 0], "height": 2.7, "thickness": 0.2},
                ],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "quantities" in data["data"]

    def test_export_csv(self, client: TestClient):
        """Test export_csv tool."""
        response = client.post(
            "/mcp/tools/export_csv",
            json={"arguments": {
                "elements": [
                    {"id": "w1", "type": "wall", "height": 2.7},
                    {"id": "w2", "type": "wall", "height": 3.0},
                ],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "csv" in data["data"]
        assert data["data"]["row_count"] == 2

    def test_door_schedule(self, client: TestClient):
        """Test door_schedule tool."""
        response = client.post(
            "/mcp/tools/door_schedule",
            json={"arguments": {
                "doors": [
                    {"id": "D01", "type": "single", "width": 0.9, "height": 2.1, "fire_rating": "1HR"},
                    {"id": "D02", "type": "double", "width": 1.8, "height": 2.1, "fire_rating": "none"},
                ],
                "format": "table",
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["door_count"] == 2
        assert data["data"]["fire_rated_count"] == 1

    def test_window_schedule(self, client: TestClient):
        """Test window_schedule tool."""
        response = client.post(
            "/mcp/tools/window_schedule",
            json={"arguments": {
                "windows": [
                    {"id": "W01", "type": "fixed", "width": 1.2, "height": 1.5, "glazing": "double", "u_value": 1.4},
                ],
                "format": "json",
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["window_count"] == 1

    def test_room_schedule(self, client: TestClient):
        """Test room_schedule tool."""
        response = client.post(
            "/mcp/tools/room_schedule",
            json={"arguments": {
                "rooms": [
                    {"id": "R01", "name": "Living Room", "number": "101", "area": 25.0},
                ],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["room_count"] == 1

    def test_export_bcf(self, client: TestClient):
        """Test export_bcf tool."""
        response = client.post(
            "/mcp/tools/export_bcf",
            json={"arguments": {
                "issues": [
                    {"message": "Door too narrow", "severity": "critical", "element_id": "d1"},
                ],
                "project_name": "Test Project",
                "bcf_version": "2.1",
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["topic_count"] == 1


# =============================================================================
# Error Handling Tests
# =============================================================================


class TestErrorHandling:
    """Integration tests for error handling."""

    def test_unknown_tool_returns_404(self, client: TestClient):
        """Test calling unknown tool returns 404."""
        response = client.post(
            "/mcp/tools/unknown_tool",
            json={"arguments": {}},
        )
        assert response.status_code == 404

    def test_invalid_arguments_handled(self, client: TestClient):
        """Test invalid arguments are handled gracefully."""
        response = client.post(
            "/mcp/tools/compute_area",
            json={"arguments": {}},  # Missing required polygon
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "error" in data["data"]

    def test_empty_elements_handled(self, client: TestClient):
        """Test empty elements handled gracefully."""
        response = client.post(
            "/mcp/tools/generate_schedule",
            json={"arguments": {
                "element_type": "wall",
                "elements": [],
            }},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False

    def test_malformed_json_returns_422(self, client: TestClient):
        """Test malformed JSON returns 422."""
        response = client.post(
            "/mcp/tools/create_wall",
            content="not valid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422

    def test_tools_alias_endpoint(self, client: TestClient):
        """Test /tools/{name} alias endpoint works."""
        response = client.post(
            "/tools/compute_area",
            json={"arguments": {
                "polygon": [[0, 0], [10, 0], [10, 10], [0, 10]],
            }},
        )
        assert response.status_code == 200
        assert response.json()["success"] is True


# =============================================================================
# Performance Benchmarks
# =============================================================================


class TestPerformanceBenchmarks:
    """Performance benchmarks for MCP tools."""

    def test_simple_tool_latency(self, client: TestClient):
        """Benchmark simple tool call latency."""
        times = []
        for _ in range(10):
            start = time.perf_counter()
            response = client.post(
                "/mcp/tools/compute_area",
                json={"arguments": {
                    "polygon": [[0, 0], [10, 0], [10, 10], [0, 10]],
                }},
            )
            elapsed = time.perf_counter() - start
            times.append(elapsed)
            assert response.status_code == 200

        avg_latency = sum(times) / len(times)
        max_latency = max(times)

        # Simple tool should complete in under 100ms
        assert avg_latency < 0.1, f"Average latency {avg_latency:.3f}s too high"
        assert max_latency < 0.2, f"Max latency {max_latency:.3f}s too high"

    def test_complex_tool_latency(self, client: TestClient):
        """Benchmark complex validation tool latency."""
        # Create a larger dataset
        elements = [
            {"id": f"w{i}", "type": "wall", "start": [i, 0], "end": [i + 1, 0], "height": 3.0}
            for i in range(100)
        ]

        times = []
        for _ in range(5):
            start = time.perf_counter()
            response = client.post(
                "/mcp/tools/validate_model",
                json={"arguments": {"elements": elements}},
            )
            elapsed = time.perf_counter() - start
            times.append(elapsed)
            assert response.status_code == 200

        avg_latency = sum(times) / len(times)

        # Complex validation with 100 elements should complete in under 500ms
        assert avg_latency < 0.5, f"Average latency {avg_latency:.3f}s too high"

    def test_schedule_generation_performance(self, client: TestClient):
        """Benchmark schedule generation with many elements."""
        doors = [
            {"id": f"D{i:03d}", "type": "single", "width": 0.9, "height": 2.1, "fire_rating": "1HR" if i % 3 == 0 else "none"}
            for i in range(200)
        ]

        start = time.perf_counter()
        response = client.post(
            "/mcp/tools/door_schedule",
            json={"arguments": {"doors": doors, "format": "table"}},
        )
        elapsed = time.perf_counter() - start

        assert response.status_code == 200
        assert response.json()["success"] is True
        # 200 doors should complete in under 1 second
        assert elapsed < 1.0, f"Schedule generation took {elapsed:.3f}s"

    def test_ifc_export_performance(self, client: TestClient):
        """Benchmark IFC export with many elements."""
        elements = []
        for i in range(50):
            elements.append({"id": f"w{i}", "type": "wall", "start": [i, 0], "end": [i, 5], "height": 3.0})
            elements.append({"id": f"d{i}", "type": "door", "width": 0.9, "height": 2.1})
            elements.append({"id": f"r{i}", "type": "room", "name": f"Room {i}", "area": 20.0})

        start = time.perf_counter()
        response = client.post(
            "/mcp/tools/export_ifc",
            json={"arguments": {"elements": elements}},
        )
        elapsed = time.perf_counter() - start

        assert response.status_code == 200
        assert response.json()["success"] is True
        # 150 elements should complete in under 2 seconds
        assert elapsed < 2.0, f"IFC export took {elapsed:.3f}s"

    def test_concurrent_tool_calls(self, client: TestClient):
        """Test concurrent tool calls don't interfere."""
        import concurrent.futures

        def make_call(idx: int):
            response = client.post(
                "/mcp/tools/compute_area",
                json={"arguments": {
                    "polygon": [[0, 0], [idx + 1, 0], [idx + 1, idx + 1], [0, idx + 1]],
                }},
            )
            return response.status_code, response.json()

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_call, i) for i in range(20)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        # All calls should succeed
        for status, data in results:
            assert status == 200
            assert data["success"] is True


# =============================================================================
# WebSocket Tests (if needed)
# =============================================================================


class TestWebSocketEndpoint:
    """Tests for WebSocket MCP endpoint."""

    def test_websocket_connect(self, client: TestClient):
        """Test WebSocket connection can be established."""
        with client.websocket_connect("/mcp/ws") as websocket:
            # Send tools/list request
            websocket.send_json({
                "jsonrpc": "2.0",
                "id": "1",
                "method": "tools/list",
                "params": {},
            })
            response = websocket.receive_json()
            assert "result" in response
            assert "tools" in response["result"]

    def test_websocket_tool_call(self, client: TestClient):
        """Test tool call via WebSocket."""
        with client.websocket_connect("/mcp/ws") as websocket:
            websocket.send_json({
                "jsonrpc": "2.0",
                "id": "2",
                "method": "tools/call",
                "params": {
                    "name": "compute_area",
                    "arguments": {
                        "polygon": [[0, 0], [5, 0], [5, 5], [0, 5]],
                    },
                },
            })
            response = websocket.receive_json()
            assert "result" in response
            assert response["result"]["success"] is True

    def test_websocket_unknown_method(self, client: TestClient):
        """Test unknown method returns error via WebSocket."""
        with client.websocket_connect("/mcp/ws") as websocket:
            websocket.send_json({
                "jsonrpc": "2.0",
                "id": "3",
                "method": "unknown/method",
                "params": {},
            })
            response = websocket.receive_json()
            assert "error" in response
            assert response["error"]["code"] == -32601
