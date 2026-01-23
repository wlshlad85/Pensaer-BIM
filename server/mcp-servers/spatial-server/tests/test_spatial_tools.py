"""Unit tests for Spatial MCP Server tools.

Tests cover:
- compute_adjacency: Room adjacency detection
- find_nearest: Spatial proximity queries
- compute_area: Polygon area calculation
- check_clearance: Clearance verification
- analyze_circulation: Path finding between rooms
- point_in_polygon: Point containment test
"""

import pytest
import math

# Import the internal functions directly for testing
from spatial_server.server import (
    _compute_adjacency,
    _find_nearest,
    _compute_area,
    _check_clearance,
    _analyze_circulation,
    _point_in_polygon,
    _detect_rooms,
    polygon_area,
    polygon_centroid,
    point_in_polygon,
    distance_2d,
    TopologyGraphPy,
)


class TestGeometryUtilities:
    """Tests for geometry utility functions."""

    def test_distance_2d(self):
        """Test 2D distance calculation."""
        assert distance_2d([0, 0], [3, 4]) == 5.0
        assert distance_2d([0, 0], [0, 0]) == 0.0
        assert abs(distance_2d([1, 1], [2, 2]) - math.sqrt(2)) < 1e-10

    def test_polygon_area_triangle(self):
        """Test area calculation for a triangle."""
        # Right triangle with legs of length 4 and 3
        triangle = [[0, 0], [4, 0], [0, 3]]
        area = abs(polygon_area(triangle))
        assert abs(area - 6.0) < 1e-10

    def test_polygon_area_square(self):
        """Test area calculation for a square."""
        # 5x5 square
        square = [[0, 0], [5, 0], [5, 5], [0, 5]]
        area = abs(polygon_area(square))
        assert abs(area - 25.0) < 1e-10

    def test_polygon_area_rectangle(self):
        """Test area calculation for a rectangle."""
        # 10x8 rectangle
        rect = [[0, 0], [10, 0], [10, 8], [0, 8]]
        area = abs(polygon_area(rect))
        assert abs(area - 80.0) < 1e-10

    def test_polygon_centroid_square(self):
        """Test centroid calculation for a square."""
        square = [[0, 0], [4, 0], [4, 4], [0, 4]]
        centroid = polygon_centroid(square)
        assert abs(centroid[0] - 2.0) < 1e-6
        assert abs(centroid[1] - 2.0) < 1e-6

    def test_point_in_polygon_inside(self):
        """Test point inside polygon."""
        square = [[0, 0], [10, 0], [10, 10], [0, 10]]
        assert point_in_polygon([5, 5], square) is True
        assert point_in_polygon([1, 1], square) is True
        assert point_in_polygon([9, 9], square) is True

    def test_point_in_polygon_outside(self):
        """Test point outside polygon."""
        square = [[0, 0], [10, 0], [10, 10], [0, 10]]
        assert point_in_polygon([-1, 5], square) is False
        assert point_in_polygon([11, 5], square) is False
        assert point_in_polygon([5, -1], square) is False
        assert point_in_polygon([5, 11], square) is False


class TestComputeAdjacency:
    """Tests for compute_adjacency tool."""

    @pytest.mark.asyncio
    async def test_two_adjacent_rooms(self):
        """Test two rooms sharing a wall."""
        rooms = [
            {"id": "room1", "boundary_wall_ids": ["w1", "w2", "w3", "w4"]},
            {"id": "room2", "boundary_wall_ids": ["w3", "w5", "w6", "w7"]},
        ]
        result = await _compute_adjacency({"rooms": rooms})

        assert result["success"] is True
        assert result["data"]["room_count"] == 2
        assert result["data"]["total_adjacencies"] == 1

        # room1 and room2 should be adjacent (share w3)
        adj_data = result["data"]["adjacency"]
        room1_adj = next(a for a in adj_data if a["room_id"] == "room1")
        room2_adj = next(a for a in adj_data if a["room_id"] == "room2")

        assert "room2" in room1_adj["adjacent_rooms"]
        assert "room1" in room2_adj["adjacent_rooms"]

    @pytest.mark.asyncio
    async def test_three_adjacent_rooms(self):
        """Test three rooms with varying adjacencies."""
        rooms = [
            {"id": "room1", "boundary_wall_ids": ["w1", "w2", "w3", "w4"]},
            {"id": "room2", "boundary_wall_ids": ["w3", "w5", "w6", "w7"]},  # shares w3 with room1
            {"id": "room3", "boundary_wall_ids": ["w7", "w8", "w9", "w10"]},  # shares w7 with room2
        ]
        result = await _compute_adjacency({"rooms": rooms})

        assert result["success"] is True
        assert result["data"]["total_adjacencies"] == 2

    @pytest.mark.asyncio
    async def test_isolated_room(self):
        """Test room with no shared walls."""
        rooms = [
            {"id": "room1", "boundary_wall_ids": ["w1", "w2", "w3", "w4"]},
            {"id": "room2", "boundary_wall_ids": ["w5", "w6", "w7", "w8"]},  # no shared walls
        ]
        result = await _compute_adjacency({"rooms": rooms})

        assert result["success"] is True
        assert result["data"]["total_adjacencies"] == 0


class TestFindNearest:
    """Tests for find_nearest tool."""

    @pytest.mark.asyncio
    async def test_find_nearest_basic(self):
        """Test finding nearest elements."""
        elements = [
            {"id": "e1", "type": "wall", "position": [0, 0, 0]},
            {"id": "e2", "type": "wall", "position": [5, 0, 0]},
            {"id": "e3", "type": "wall", "position": [10, 0, 0]},
        ]
        result = await _find_nearest({
            "x": 4,
            "y": 0,
            "radius": 10,
            "elements": elements,
        })

        assert result["success"] is True
        assert result["data"]["count"] >= 1
        # e2 at (5,0) should be closest to (4,0)
        assert result["data"]["results"][0]["element_id"] == "e2"

    @pytest.mark.asyncio
    async def test_find_nearest_with_type_filter(self):
        """Test filtering by element type."""
        elements = [
            {"id": "w1", "type": "wall", "position": [0, 0, 0]},
            {"id": "d1", "type": "door", "position": [1, 0, 0]},
            {"id": "w2", "type": "wall", "position": [2, 0, 0]},
        ]
        result = await _find_nearest({
            "x": 0,
            "y": 0,
            "radius": 10,
            "elements": elements,
            "element_types": ["door"],
        })

        assert result["success"] is True
        # Only doors should be returned
        for r in result["data"]["results"]:
            assert r["element_type"] == "door"

    @pytest.mark.asyncio
    async def test_find_nearest_outside_radius(self):
        """Test that elements outside radius are excluded."""
        elements = [
            {"id": "e1", "type": "wall", "position": [100, 0, 0]},
        ]
        result = await _find_nearest({
            "x": 0,
            "y": 0,
            "radius": 10,
            "elements": elements,
        })

        assert result["success"] is True
        assert result["data"]["count"] == 0


class TestComputeArea:
    """Tests for compute_area tool."""

    @pytest.mark.asyncio
    async def test_compute_area_square(self):
        """Test area calculation for square room."""
        result = await _compute_area({
            "polygon": [[0, 0], [10, 0], [10, 10], [0, 10]],
        })

        assert result["success"] is True
        assert abs(result["data"]["gross_area"] - 100.0) < 0.01
        assert abs(result["data"]["net_area"] - 100.0) < 0.01

    @pytest.mark.asyncio
    async def test_compute_area_with_holes(self):
        """Test area calculation with holes subtracted."""
        result = await _compute_area({
            "polygon": [[0, 0], [10, 0], [10, 10], [0, 10]],  # 100 sq units
            "include_holes": [
                [[2, 2], [4, 2], [4, 4], [2, 4]],  # 4 sq unit hole
            ],
        })

        assert result["success"] is True
        assert abs(result["data"]["gross_area"] - 100.0) < 0.01
        assert abs(result["data"]["hole_area"] - 4.0) < 0.01
        assert abs(result["data"]["net_area"] - 96.0) < 0.01


class TestCheckClearance:
    """Tests for check_clearance tool."""

    @pytest.mark.asyncio
    async def test_clearance_passed(self):
        """Test clearance check with no obstructions."""
        result = await _check_clearance({
            "element": {"id": "door1", "position": [5, 5, 0]},
            "clearance_type": "door_swing",
            "obstacles": [],
        })

        assert result["success"] is True
        assert result["data"]["passed"] is True
        assert result["data"]["violation_count"] == 0

    @pytest.mark.asyncio
    async def test_clearance_failed(self):
        """Test clearance check with obstruction."""
        result = await _check_clearance({
            "element": {"id": "door1", "position": [5, 5, 0]},
            "clearance_type": "door_swing",
            "min_clearance": 0.9,
            "obstacles": [
                {"id": "wall1", "type": "wall", "position": [5.5, 5, 0]},  # 0.5m away
            ],
        })

        assert result["success"] is True
        assert result["data"]["passed"] is False
        assert result["data"]["violation_count"] == 1

    @pytest.mark.asyncio
    async def test_wheelchair_clearance(self):
        """Test wheelchair turning radius clearance."""
        result = await _check_clearance({
            "element": {"id": "door1", "position": [5, 5, 0]},
            "clearance_type": "wheelchair",
            "obstacles": [
                {"id": "wall1", "type": "wall", "position": [6, 5, 0]},  # 1m away
            ],
        })

        assert result["success"] is True
        # Wheelchair needs 1.5m, obstacle is 1m away
        assert result["data"]["passed"] is False


class TestAnalyzeCirculation:
    """Tests for analyze_circulation tool."""

    @pytest.mark.asyncio
    async def test_simple_path(self):
        """Test path finding between two connected rooms."""
        rooms = [
            {"id": "room1", "boundary_wall_ids": ["w1", "w2", "w3", "w4"]},
            {"id": "room2", "boundary_wall_ids": ["w3", "w5", "w6", "w7"]},
        ]
        doors = [
            {"id": "door1", "host_wall_id": "w3"},  # connects room1 and room2
        ]

        result = await _analyze_circulation({
            "rooms": rooms,
            "doors": doors,
            "start_room_id": "room1",
            "end_room_id": "room2",
        })

        assert result["success"] is True
        assert result["data"]["path_exists"] is True
        assert result["data"]["path_length"] == 1

    @pytest.mark.asyncio
    async def test_no_path(self):
        """Test when no path exists between rooms."""
        rooms = [
            {"id": "room1", "boundary_wall_ids": ["w1", "w2", "w3", "w4"]},
            {"id": "room2", "boundary_wall_ids": ["w5", "w6", "w7", "w8"]},  # isolated
        ]
        doors = []  # no doors

        result = await _analyze_circulation({
            "rooms": rooms,
            "doors": doors,
            "start_room_id": "room1",
            "end_room_id": "room2",
        })

        assert result["success"] is True
        assert result["data"]["path_exists"] is False

    @pytest.mark.asyncio
    async def test_circulation_statistics(self):
        """Test circulation analysis statistics."""
        rooms = [
            {"id": "room1", "boundary_wall_ids": ["w1", "w2"]},
            {"id": "room2", "boundary_wall_ids": ["w2", "w3"]},
            {"id": "room3", "boundary_wall_ids": ["w4", "w5"]},  # isolated
        ]
        doors = [
            {"id": "d1", "host_wall_id": "w2"},
        ]

        result = await _analyze_circulation({
            "rooms": rooms,
            "doors": doors,
        })

        assert result["success"] is True
        assert result["data"]["room_count"] == 3
        assert "room3" in result["data"]["isolated_rooms"]


class TestPointInPolygon:
    """Tests for point_in_polygon tool."""

    @pytest.mark.asyncio
    async def test_point_inside(self):
        """Test point inside polygon."""
        result = await _point_in_polygon({
            "point": [5, 5],
            "polygon": [[0, 0], [10, 0], [10, 10], [0, 10]],
        })

        assert result["success"] is True
        assert result["data"]["inside"] is True

    @pytest.mark.asyncio
    async def test_point_outside(self):
        """Test point outside polygon."""
        result = await _point_in_polygon({
            "point": [15, 5],
            "polygon": [[0, 0], [10, 0], [10, 10], [0, 10]],
        })

        assert result["success"] is True
        assert result["data"]["inside"] is False


class TestValidationErrors:
    """Tests for input validation error handling."""

    @pytest.mark.asyncio
    async def test_missing_required_field(self):
        """Test error when required field is missing."""
        result = await _compute_area({})  # missing polygon
        assert result["success"] is False
        assert "error" in result

    @pytest.mark.asyncio
    async def test_invalid_polygon(self):
        """Test area calculation with insufficient vertices."""
        result = await _compute_area({
            "polygon": [[0, 0], [1, 0]],  # only 2 points
        })
        # Should still succeed but return 0 area
        assert result["success"] is True
        assert result["data"]["gross_area"] == 0.0


class TestTopologyGraph:
    """Tests for the TopologyGraphPy class."""

    def test_create_empty_graph(self):
        """Test creating an empty topology graph."""
        graph = TopologyGraphPy(tolerance=0.001)
        assert len(graph.nodes) == 0
        assert len(graph.edges) == 0

    def test_add_single_edge(self):
        """Test adding a single edge creates two nodes."""
        graph = TopologyGraphPy(tolerance=0.001)
        edge_id = graph.add_edge([0, 0], [10, 0])

        assert edge_id is not None
        assert len(graph.nodes) == 2
        assert len(graph.edges) == 1

    def test_nodes_merge_within_tolerance(self):
        """Test that nodes within tolerance are merged."""
        graph = TopologyGraphPy(tolerance=0.01)  # 10mm tolerance

        # Add first edge: (0,0) to (10,0)
        graph.add_edge([0, 0], [10, 0])

        # Add second edge starting very close to first edge's end
        graph.add_edge([10.005, 0], [20, 0])  # 5mm away, within 10mm tolerance

        # Should have 3 nodes, not 4 (middle node merged)
        assert len(graph.nodes) == 3
        assert len(graph.edges) == 2

    def test_l_shaped_walls(self):
        """Test L-shaped walls share a corner node."""
        graph = TopologyGraphPy(tolerance=0.001)

        # Horizontal wall
        graph.add_edge([0, 0], [10, 0])
        # Vertical wall meeting at corner
        graph.add_edge([10, 0], [10, 10])

        # Should share the corner node
        assert len(graph.nodes) == 3
        assert len(graph.edges) == 2

    def test_zero_length_edge_rejected(self):
        """Test that zero-length edges are rejected."""
        graph = TopologyGraphPy(tolerance=0.001)
        edge_id = graph.add_edge([5, 5], [5, 5])  # Same point

        assert edge_id is None
        assert len(graph.edges) == 0


class TestDetectRooms:
    """Tests for detect_rooms tool."""

    @pytest.mark.asyncio
    async def test_simple_rectangular_room(self):
        """Test detecting a simple rectangular room from 4 walls."""
        # Create 4 walls forming a 10x10 room
        walls = [
            {"start": [0, 0], "end": [10, 0]},     # bottom
            {"start": [10, 0], "end": [10, 10]},   # right
            {"start": [10, 10], "end": [0, 10]},   # top
            {"start": [0, 10], "end": [0, 0]},     # left
        ]

        result = await _detect_rooms({"walls": walls})

        assert result["success"] is True
        assert result["data"]["room_count"] == 1
        assert result["data"]["wall_count"] == 4

        room = result["data"]["rooms"][0]
        # Area should be 10 * 10 = 100
        assert abs(room["area"] - 100.0) < 1.0

    @pytest.mark.asyncio
    async def test_two_adjacent_rooms(self):
        """Test detecting two adjacent rooms sharing a wall."""
        # Create two adjacent rooms:
        # Room 1: (0,0) to (10,10)
        # Room 2: (10,0) to (20,10)
        # They share the middle wall from (10,0) to (10,10)
        walls = [
            # Outer perimeter
            {"start": [0, 0], "end": [10, 0]},      # bottom left
            {"start": [10, 0], "end": [20, 0]},     # bottom right
            {"start": [20, 0], "end": [20, 10]},    # right
            {"start": [20, 10], "end": [10, 10]},   # top right
            {"start": [10, 10], "end": [0, 10]},    # top left
            {"start": [0, 10], "end": [0, 0]},      # left
            # Middle dividing wall
            {"start": [10, 0], "end": [10, 10]},    # middle
        ]

        result = await _detect_rooms({"walls": walls})

        assert result["success"] is True
        assert result["data"]["room_count"] == 2

        # Each room should have area 10 * 10 = 100
        for room in result["data"]["rooms"]:
            assert abs(room["area"] - 100.0) < 1.0

    @pytest.mark.asyncio
    async def test_triangular_room(self):
        """Test detecting a triangular room."""
        # Create a right triangle with legs 10 and 10
        walls = [
            {"start": [0, 0], "end": [10, 0]},   # base
            {"start": [10, 0], "end": [0, 10]},  # hypotenuse
            {"start": [0, 10], "end": [0, 0]},   # height
        ]

        result = await _detect_rooms({"walls": walls})

        assert result["success"] is True
        assert result["data"]["room_count"] == 1

        room = result["data"]["rooms"][0]
        # Area of right triangle = 0.5 * 10 * 10 = 50
        assert abs(room["area"] - 50.0) < 1.0

    @pytest.mark.asyncio
    async def test_open_layout_no_rooms(self):
        """Test that an open layout (L-shape) detects no rooms."""
        # L-shape: not closed
        walls = [
            {"start": [0, 0], "end": [10, 0]},
            {"start": [10, 0], "end": [10, 10]},
        ]

        result = await _detect_rooms({"walls": walls})

        assert result["success"] is True
        assert result["data"]["room_count"] == 0

    @pytest.mark.asyncio
    async def test_empty_walls_list(self):
        """Test with empty walls list."""
        result = await _detect_rooms({"walls": []})

        assert result["success"] is True
        assert result["data"]["room_count"] == 0
        assert result["data"]["wall_count"] == 0

    @pytest.mark.asyncio
    async def test_room_with_wall_ids(self):
        """Test that wall IDs are preserved in room boundaries (when using Python fallback)."""
        walls = [
            {"id": "w1", "start": [0, 0], "end": [10, 0]},
            {"id": "w2", "start": [10, 0], "end": [10, 10]},
            {"id": "w3", "start": [10, 10], "end": [0, 10]},
            {"id": "w4", "start": [0, 10], "end": [0, 0]},
        ]

        result = await _detect_rooms({"walls": walls})

        assert result["success"] is True
        assert result["data"]["room_count"] == 1

        room = result["data"]["rooms"][0]
        assert "boundary_wall_ids" in room
        # Python fallback preserves wall IDs, Rust kernel returns empty list
        engine = result["data"].get("engine", "unknown")
        if engine == "python_fallback":
            assert len(room["boundary_wall_ids"]) == 4
            assert set(room["boundary_wall_ids"]) == {"w1", "w2", "w3", "w4"}
        else:
            # Rust kernel doesn't track wall IDs
            assert isinstance(room["boundary_wall_ids"], list)

    @pytest.mark.asyncio
    async def test_room_centroid(self):
        """Test that room centroid is correctly calculated."""
        # Square room from (0,0) to (10,10)
        walls = [
            {"start": [0, 0], "end": [10, 0]},
            {"start": [10, 0], "end": [10, 10]},
            {"start": [10, 10], "end": [0, 10]},
            {"start": [0, 10], "end": [0, 0]},
        ]

        result = await _detect_rooms({"walls": walls})

        assert result["success"] is True
        room = result["data"]["rooms"][0]

        # Centroid should be at (5, 5)
        centroid = room["centroid"]
        assert abs(centroid[0] - 5.0) < 0.1
        assert abs(centroid[1] - 5.0) < 0.1

    @pytest.mark.asyncio
    async def test_custom_tolerance(self):
        """Test room detection with custom tolerance."""
        walls = [
            {"start": [0, 0], "end": [10, 0]},
            {"start": [10, 0], "end": [10, 10]},
            {"start": [10, 10], "end": [0, 10]},
            {"start": [0, 10], "end": [0, 0]},
        ]

        result = await _detect_rooms({
            "walls": walls,
            "tolerance": 1.0,  # 1mm tolerance
        })

        assert result["success"] is True
        assert result["data"]["room_count"] == 1

    @pytest.mark.asyncio
    async def test_level_parameter(self):
        """Test that level parameter is passed through."""
        walls = [
            {"start": [0, 0], "end": [10, 0]},
            {"start": [10, 0], "end": [10, 10]},
            {"start": [10, 10], "end": [0, 10]},
            {"start": [0, 10], "end": [0, 0]},
        ]

        result = await _detect_rooms({
            "walls": walls,
            "level": 2,
        })

        assert result["success"] is True
        assert result["data"]["level"] == 2
