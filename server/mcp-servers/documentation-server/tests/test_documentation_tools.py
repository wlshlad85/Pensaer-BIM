"""Unit tests for Documentation MCP Server tools.

Tests cover:
- generate_schedule: Element schedule generation (table, CSV, JSON)
- export_ifc: IFC format export
- export_report: Compliance and summary reports
- generate_quantities: Quantity takeoff calculations
- export_csv: CSV data export
- door_schedule: Specialized door schedules with fire rating
- window_schedule: Specialized window schedules with glazing and U-value
"""

import pytest

from documentation_server.server import (
    _generate_schedule,
    _export_ifc,
    _export_report,
    _generate_quantities,
    _export_csv,
    _door_schedule,
    _window_schedule,
    get_element_property,
    format_value,
)


class TestUtilityFunctions:
    """Tests for utility functions."""

    def test_get_element_property_simple(self):
        """Test getting a simple property."""
        element = {"id": "wall1", "type": "wall", "height": 2.7}
        assert get_element_property(element, "id") == "wall1"
        assert get_element_property(element, "type") == "wall"
        assert get_element_property(element, "height") == 2.7

    def test_get_element_property_nested(self):
        """Test getting a nested property."""
        element = {"id": "wall1", "props": {"material": "concrete"}}
        assert get_element_property(element, "props.material") == "concrete"

    def test_get_element_property_missing(self):
        """Test getting a missing property."""
        element = {"id": "wall1"}
        assert get_element_property(element, "missing") is None

    def test_format_value_none(self):
        """Test formatting None value."""
        assert format_value(None) == "-"

    def test_format_value_float(self):
        """Test formatting float value."""
        assert format_value(3.14159) == "3.142"

    def test_format_value_bool(self):
        """Test formatting boolean value."""
        assert format_value(True) == "Yes"
        assert format_value(False) == "No"

    def test_format_value_list(self):
        """Test formatting list value."""
        assert format_value(["a", "b", "c"]) == "a, b, c"


class TestGenerateSchedule:
    """Tests for generate_schedule tool."""

    @pytest.mark.asyncio
    async def test_basic_schedule_table(self):
        """Test basic schedule generation in table format."""
        elements = [
            {"id": "w1", "type": "wall", "height": 2.7, "length": 5.0},
            {"id": "w2", "type": "wall", "height": 2.7, "length": 3.0},
        ]
        result = await _generate_schedule({
            "element_type": "wall",
            "elements": elements,
            "format": "table",
        })

        assert result["success"] is True
        assert result["data"]["element_count"] == 2
        assert result["data"]["format"] == "table"
        assert "# Wall Schedule" in result["data"]["schedule"]

    @pytest.mark.asyncio
    async def test_schedule_csv_format(self):
        """Test schedule generation in CSV format."""
        elements = [
            {"id": "d1", "type": "door", "width": 0.9},
            {"id": "d2", "type": "door", "width": 1.2},
        ]
        result = await _generate_schedule({
            "element_type": "door",
            "elements": elements,
            "format": "csv",
        })

        assert result["success"] is True
        assert result["data"]["format"] == "csv"
        # CSV should have header and data rows
        lines = result["data"]["schedule"].strip().split("\n")
        assert len(lines) >= 3  # header + 2 data rows

    @pytest.mark.asyncio
    async def test_schedule_json_format(self):
        """Test schedule generation in JSON format."""
        elements = [
            {"id": "r1", "type": "room", "area": 25.0},
        ]
        result = await _generate_schedule({
            "element_type": "room",
            "elements": elements,
            "format": "json",
        })

        assert result["success"] is True
        assert result["data"]["format"] == "json"

    @pytest.mark.asyncio
    async def test_schedule_with_properties(self):
        """Test schedule with specific properties."""
        elements = [
            {"id": "w1", "type": "wall", "height": 2.7, "material": "brick"},
        ]
        result = await _generate_schedule({
            "element_type": "wall",
            "elements": elements,
            "properties": ["id", "height", "material"],
            "format": "table",
        })

        assert result["success"] is True
        assert result["data"]["properties"] == ["id", "height", "material"]

    @pytest.mark.asyncio
    async def test_schedule_grouping(self):
        """Test schedule with grouping."""
        elements = [
            {"id": "w1", "type": "wall", "level": "Level 1"},
            {"id": "w2", "type": "wall", "level": "Level 1"},
            {"id": "w3", "type": "wall", "level": "Level 2"},
        ]
        result = await _generate_schedule({
            "element_type": "wall",
            "elements": elements,
            "group_by": "level",
            "format": "table",
        })

        assert result["success"] is True
        # Should have Level 1 and Level 2 groups
        assert "level: Level 1" in result["data"]["schedule"]
        assert "level: Level 2" in result["data"]["schedule"]

    @pytest.mark.asyncio
    async def test_schedule_empty_elements(self):
        """Test schedule with no elements."""
        result = await _generate_schedule({
            "element_type": "wall",
            "elements": [],
        })

        assert result["success"] is False
        assert "error" in result


class TestExportIfc:
    """Tests for export_ifc tool."""

    @pytest.mark.asyncio
    async def test_basic_ifc_export(self):
        """Test basic IFC export."""
        elements = [
            {"id": "w1", "type": "wall", "start": [0, 0], "end": [5, 0], "height": 2.7},
        ]
        result = await _export_ifc({
            "elements": elements,
        })

        assert result["success"] is True
        assert result["data"]["element_count"] == 1
        assert result["data"]["ifc_version"] == "IFC4"
        assert "ifc_structure" in result["data"]

    @pytest.mark.asyncio
    async def test_ifc_type_mapping(self):
        """Test IFC type mapping for different element types."""
        elements = [
            {"id": "w1", "type": "wall"},
            {"id": "d1", "type": "door"},
            {"id": "r1", "type": "room"},
        ]
        result = await _export_ifc({
            "elements": elements,
        })

        assert result["success"] is True
        ifc_elements = result["data"]["ifc_structure"]["elements"]
        types = [e["type"] for e in ifc_elements]
        assert "IfcWall" in types
        assert "IfcDoor" in types
        assert "IfcSpace" in types

    @pytest.mark.asyncio
    async def test_ifc_versions(self):
        """Test different IFC versions."""
        elements = [{"id": "w1", "type": "wall"}]

        for version in ["IFC2X3", "IFC4", "IFC4X3"]:
            result = await _export_ifc({
                "elements": elements,
                "ifc_version": version,
            })
            assert result["success"] is True
            assert result["data"]["ifc_version"] == version

    @pytest.mark.asyncio
    async def test_ifc_with_properties(self):
        """Test IFC export with property sets."""
        elements = [
            {"id": "w1", "type": "wall", "fire_rating": "1HR", "material": "concrete"},
        ]
        result = await _export_ifc({
            "elements": elements,
            "include_properties": True,
        })

        assert result["success"] is True
        ifc_elem = result["data"]["ifc_structure"]["elements"][0]
        assert "property_sets" in ifc_elem

    @pytest.mark.asyncio
    async def test_ifc_without_properties(self):
        """Test IFC export without property sets."""
        elements = [
            {"id": "w1", "type": "wall", "fire_rating": "1HR"},
        ]
        result = await _export_ifc({
            "elements": elements,
            "include_properties": False,
        })

        assert result["success"] is True
        ifc_elem = result["data"]["ifc_structure"]["elements"][0]
        assert "property_sets" not in ifc_elem


class TestExportReport:
    """Tests for export_report tool."""

    @pytest.mark.asyncio
    async def test_model_summary_report(self):
        """Test model summary report generation."""
        elements = [
            {"id": "w1", "type": "wall"},
            {"id": "w2", "type": "wall"},
            {"id": "d1", "type": "door"},
        ]
        result = await _export_report({
            "report_type": "model_summary",
            "elements": elements,
        })

        assert result["success"] is True
        assert result["data"]["report_type"] == "model_summary"
        assert result["data"]["element_count"] == 3

    @pytest.mark.asyncio
    async def test_validation_report(self):
        """Test validation report with issues."""
        validation_results = [
            {"element_id": "d1", "message": "Door too narrow", "severity": "critical", "category": "accessibility"},
            {"element_id": "w1", "message": "Missing fire rating", "severity": "warning", "category": "fire"},
        ]
        result = await _export_report({
            "report_type": "validation",
            "validation_results": validation_results,
        })

        assert result["success"] is True
        assert result["data"]["issue_count"] == 2

    @pytest.mark.asyncio
    async def test_html_format(self):
        """Test HTML format report."""
        result = await _export_report({
            "report_type": "model_summary",
            "elements": [{"id": "w1", "type": "wall"}],
            "format": "html",
        })

        assert result["success"] is True
        assert result["data"]["format"] == "html"
        assert "<!DOCTYPE html>" in result["data"]["report"]
        assert "</html>" in result["data"]["report"]

    @pytest.mark.asyncio
    async def test_markdown_format(self):
        """Test markdown format report."""
        result = await _export_report({
            "report_type": "model_summary",
            "elements": [{"id": "w1", "type": "wall"}],
            "format": "markdown",
        })

        assert result["success"] is True
        assert result["data"]["format"] == "markdown"
        assert "# Pensaer" in result["data"]["report"]

    @pytest.mark.asyncio
    async def test_fire_safety_report(self):
        """Test fire safety report."""
        validation_results = [
            {"element_id": "w1", "message": "Missing fire rating", "severity": "critical", "category": "fire"},
        ]
        result = await _export_report({
            "report_type": "fire_safety",
            "validation_results": validation_results,
        })

        assert result["success"] is True
        assert "Fire Safety" in result["data"]["report"]

    @pytest.mark.asyncio
    async def test_accessibility_report(self):
        """Test accessibility report."""
        validation_results = [
            {"element_id": "d1", "message": "Door too narrow for ADA", "severity": "critical", "category": "accessibility"},
        ]
        result = await _export_report({
            "report_type": "accessibility",
            "validation_results": validation_results,
        })

        assert result["success"] is True
        assert "Accessibility" in result["data"]["report"]


class TestGenerateQuantities:
    """Tests for generate_quantities tool."""

    @pytest.mark.asyncio
    async def test_wall_quantities(self):
        """Test quantity calculation for walls."""
        elements = [
            {"id": "w1", "start": [0, 0], "end": [5, 0], "height": 2.7, "thickness": 0.2},
        ]
        result = await _generate_quantities({
            "element_type": "wall",
            "elements": elements,
        })

        assert result["success"] is True
        qty = result["data"]["quantities"][0]
        assert qty["length"] == 5.0
        assert qty["height"] == 2.7
        assert qty["area"] == 13.5  # 5 * 2.7
        assert qty["volume"] == 2.7  # 5 * 2.7 * 0.2

    @pytest.mark.asyncio
    async def test_room_quantities(self):
        """Test quantity calculation for rooms."""
        elements = [
            {"id": "r1", "area": 25.0, "height": 2.7, "perimeter": 20.0},
        ]
        result = await _generate_quantities({
            "element_type": "room",
            "elements": elements,
        })

        assert result["success"] is True
        qty = result["data"]["quantities"][0]
        assert qty["area"] == 25.0
        assert qty["volume"] == 67.5  # 25 * 2.7

    @pytest.mark.asyncio
    async def test_quantities_with_totals(self):
        """Test quantity totals calculation."""
        elements = [
            {"id": "w1", "start": [0, 0], "end": [5, 0], "height": 2.7, "thickness": 0.2},
            {"id": "w2", "start": [0, 0], "end": [3, 0], "height": 2.7, "thickness": 0.2},
        ]
        result = await _generate_quantities({
            "element_type": "wall",
            "elements": elements,
            "include_totals": True,
        })

        assert result["success"] is True
        totals = result["data"]["totals"]
        assert totals["count"] == 2
        assert totals["length"] == 8.0  # 5 + 3

    @pytest.mark.asyncio
    async def test_quantities_grouped(self):
        """Test grouped quantity calculation."""
        elements = [
            {"id": "w1", "start": [0, 0], "end": [5, 0], "height": 2.7, "level": "Level 1"},
            {"id": "w2", "start": [0, 0], "end": [3, 0], "height": 2.7, "level": "Level 1"},
            {"id": "w3", "start": [0, 0], "end": [4, 0], "height": 2.7, "level": "Level 2"},
        ]
        result = await _generate_quantities({
            "element_type": "wall",
            "elements": elements,
            "group_by": "level",
        })

        assert result["success"] is True
        grouped = result["data"]["grouped_totals"]
        assert "Level 1" in grouped
        assert "Level 2" in grouped
        assert grouped["Level 1"]["count"] == 2
        assert grouped["Level 2"]["count"] == 1

    @pytest.mark.asyncio
    async def test_door_quantities(self):
        """Test quantity calculation for doors."""
        elements = [
            {"id": "d1", "width": 0.9, "height": 2.1},
        ]
        result = await _generate_quantities({
            "element_type": "door",
            "elements": elements,
        })

        assert result["success"] is True
        qty = result["data"]["quantities"][0]
        assert qty["width"] == 0.9
        assert qty["height"] == 2.1
        assert abs(qty["area"] - 1.89) < 0.01  # 0.9 * 2.1


class TestExportCsv:
    """Tests for export_csv tool."""

    @pytest.mark.asyncio
    async def test_basic_csv_export(self):
        """Test basic CSV export."""
        elements = [
            {"id": "w1", "type": "wall", "height": 2.7},
            {"id": "w2", "type": "wall", "height": 3.0},
        ]
        result = await _export_csv({
            "elements": elements,
        })

        assert result["success"] is True
        assert result["data"]["row_count"] == 2
        assert "csv" in result["data"]

    @pytest.mark.asyncio
    async def test_csv_with_properties(self):
        """Test CSV with specific properties."""
        elements = [
            {"id": "w1", "type": "wall", "height": 2.7, "material": "brick"},
        ]
        result = await _export_csv({
            "elements": elements,
            "properties": ["id", "height"],
        })

        assert result["success"] is True
        assert result["data"]["columns"] == ["id", "height"]
        assert result["data"]["column_count"] == 2

    @pytest.mark.asyncio
    async def test_csv_without_header(self):
        """Test CSV without header row."""
        elements = [
            {"id": "w1", "type": "wall"},
        ]
        result = await _export_csv({
            "elements": elements,
            "include_header": False,
        })

        assert result["success"] is True
        # No header row, just data
        lines = result["data"]["csv"].strip().split("\n")
        assert len(lines) == 1

    @pytest.mark.asyncio
    async def test_csv_with_header(self):
        """Test CSV with header row."""
        elements = [
            {"id": "w1", "type": "wall"},
        ]
        result = await _export_csv({
            "elements": elements,
            "include_header": True,
        })

        assert result["success"] is True
        lines = result["data"]["csv"].strip().split("\n")
        assert len(lines) == 2  # header + 1 data row


class TestDoorSchedule:
    """Tests for door_schedule tool."""

    @pytest.mark.asyncio
    async def test_basic_door_schedule_table(self):
        """Test basic door schedule generation in table format."""
        doors = [
            {"id": "D01", "type": "single", "width": 0.9, "height": 2.1, "fire_rating": "none"},
            {"id": "D02", "type": "double", "width": 1.8, "height": 2.1, "fire_rating": "1HR"},
        ]
        result = await _door_schedule({
            "doors": doors,
            "format": "table",
        })

        assert result["success"] is True
        assert result["data"]["door_count"] == 2
        assert result["data"]["format"] == "table"
        assert "# Door Schedule" in result["data"]["schedule"]
        assert "D01" in result["data"]["schedule"]
        assert "D02" in result["data"]["schedule"]

    @pytest.mark.asyncio
    async def test_door_schedule_csv_format(self):
        """Test door schedule generation in CSV format."""
        doors = [
            {"id": "D01", "type": "single", "width": 0.9, "height": 2.1},
            {"id": "D02", "type": "double", "width": 1.8, "height": 2.1},
        ]
        result = await _door_schedule({
            "doors": doors,
            "format": "csv",
        })

        assert result["success"] is True
        assert result["data"]["format"] == "csv"
        lines = result["data"]["schedule"].strip().split("\n")
        assert len(lines) >= 3  # header + 2 data rows

    @pytest.mark.asyncio
    async def test_door_schedule_json_format(self):
        """Test door schedule generation in JSON format."""
        doors = [
            {"id": "D01", "type": "single", "width": 0.9, "height": 2.1, "fire_rating": "30MIN"},
        ]
        result = await _door_schedule({
            "doors": doors,
            "format": "json",
        })

        assert result["success"] is True
        assert result["data"]["format"] == "json"
        # JSON output should be parseable
        import json
        output = json.loads(result["data"]["schedule"])
        assert output["schedule_type"] == "door"
        assert output["total_count"] == 1

    @pytest.mark.asyncio
    async def test_door_schedule_with_fire_rating(self):
        """Test door schedule includes fire rating column."""
        doors = [
            {"id": "D01", "type": "fire", "width": 0.9, "height": 2.1, "fire_rating": "1HR"},
            {"id": "D02", "type": "fire", "width": 0.9, "height": 2.1, "fire_rating": "2HR"},
        ]
        result = await _door_schedule({
            "doors": doors,
            "include_fire_rating": True,
        })

        assert result["success"] is True
        assert "fire_rating" in result["data"]["columns"]
        assert result["data"]["fire_rated_count"] == 2

    @pytest.mark.asyncio
    async def test_door_schedule_without_fire_rating(self):
        """Test door schedule excludes fire rating column."""
        doors = [
            {"id": "D01", "type": "single", "width": 0.9, "height": 2.1, "fire_rating": "1HR"},
        ]
        result = await _door_schedule({
            "doors": doors,
            "include_fire_rating": False,
        })

        assert result["success"] is True
        assert "fire_rating" not in result["data"]["columns"]

    @pytest.mark.asyncio
    async def test_door_schedule_sorting(self):
        """Test door schedule sorting by property."""
        doors = [
            {"id": "D03", "type": "single", "width": 0.9, "height": 2.1},
            {"id": "D01", "type": "single", "width": 0.9, "height": 2.1},
            {"id": "D02", "type": "single", "width": 0.9, "height": 2.1},
        ]
        result = await _door_schedule({
            "doors": doors,
            "sort_by": "id",
            "format": "json",
        })

        assert result["success"] is True
        import json
        output = json.loads(result["data"]["schedule"])
        door_ids = [d["id"] for d in output["groups"]["All Doors"]]
        assert door_ids == ["D01", "D02", "D03"]

    @pytest.mark.asyncio
    async def test_door_schedule_grouping_by_type(self):
        """Test door schedule grouping by type."""
        doors = [
            {"id": "D01", "type": "single", "width": 0.9, "height": 2.1},
            {"id": "D02", "type": "double", "width": 1.8, "height": 2.1},
            {"id": "D03", "type": "single", "width": 0.9, "height": 2.1},
        ]
        result = await _door_schedule({
            "doors": doors,
            "group_by": "type",
            "format": "table",
        })

        assert result["success"] is True
        assert "Type: single" in result["data"]["schedule"]
        assert "Type: double" in result["data"]["schedule"]

    @pytest.mark.asyncio
    async def test_door_schedule_grouping_by_fire_rating(self):
        """Test door schedule grouping by fire rating."""
        doors = [
            {"id": "D01", "type": "fire", "width": 0.9, "height": 2.1, "fire_rating": "1HR"},
            {"id": "D02", "type": "standard", "width": 0.9, "height": 2.1, "fire_rating": "none"},
            {"id": "D03", "type": "fire", "width": 0.9, "height": 2.1, "fire_rating": "1HR"},
        ]
        result = await _door_schedule({
            "doors": doors,
            "group_by": "fire_rating",
            "format": "json",
        })

        assert result["success"] is True
        import json
        output = json.loads(result["data"]["schedule"])
        assert "1HR" in output["groups"]
        assert "none" in output["groups"]
        assert len(output["groups"]["1HR"]) == 2
        assert len(output["groups"]["none"]) == 1

    @pytest.mark.asyncio
    async def test_door_schedule_grouping_by_level(self):
        """Test door schedule grouping by level."""
        doors = [
            {"id": "D01", "type": "single", "width": 0.9, "height": 2.1, "level": "Level 1"},
            {"id": "D02", "type": "single", "width": 0.9, "height": 2.1, "level": "Level 2"},
        ]
        result = await _door_schedule({
            "doors": doors,
            "group_by": "level",
            "format": "table",
        })

        assert result["success"] is True
        assert "Level: Level 1" in result["data"]["schedule"]
        assert "Level: Level 2" in result["data"]["schedule"]

    @pytest.mark.asyncio
    async def test_door_schedule_empty_doors(self):
        """Test door schedule with no doors."""
        result = await _door_schedule({
            "doors": [],
        })

        assert result["success"] is False
        assert "error" in result

    @pytest.mark.asyncio
    async def test_door_schedule_default_values(self):
        """Test door schedule fills in default values."""
        doors = [
            {"id": "D01"},  # minimal door, should get defaults
        ]
        result = await _door_schedule({
            "doors": doors,
            "format": "json",
        })

        assert result["success"] is True
        import json
        output = json.loads(result["data"]["schedule"])
        door = output["groups"]["All Doors"][0]
        assert door["width"] == 0.9  # default width
        assert door["height"] == 2.1  # default height
        assert door["type"] == "standard"  # default type

    @pytest.mark.asyncio
    async def test_door_schedule_fire_rated_count(self):
        """Test fire rated door counting."""
        doors = [
            {"id": "D01", "fire_rating": "1HR"},
            {"id": "D02", "fire_rating": "none"},
            {"id": "D03", "fire_rating": "2HR"},
            {"id": "D04"},  # no fire_rating defaults to "none"
        ]
        result = await _door_schedule({
            "doors": doors,
        })

        assert result["success"] is True
        assert result["data"]["fire_rated_count"] == 2  # D01 and D03

    @pytest.mark.asyncio
    async def test_door_schedule_summary_section(self):
        """Test door schedule includes summary section in table format."""
        doors = [
            {"id": "D01", "fire_rating": "1HR"},
            {"id": "D02", "fire_rating": "none"},
        ]
        result = await _door_schedule({
            "doors": doors,
            "format": "table",
        })

        assert result["success"] is True
        assert "## Summary" in result["data"]["schedule"]
        assert "Total Doors: **2**" in result["data"]["schedule"]
        assert "Fire-Rated Doors: **1**" in result["data"]["schedule"]


class TestWindowSchedule:
    """Tests for window_schedule tool."""

    @pytest.mark.asyncio
    async def test_basic_window_schedule_table(self):
        """Test basic window schedule generation in table format."""
        windows = [
            {"id": "W01", "type": "fixed", "width": 1.2, "height": 1.5, "glazing": "double", "u_value": 1.4},
            {"id": "W02", "type": "casement", "width": 0.9, "height": 1.2, "glazing": "triple", "u_value": 0.8},
        ]
        result = await _window_schedule({
            "windows": windows,
            "format": "table",
        })

        assert result["success"] is True
        assert result["data"]["window_count"] == 2
        assert result["data"]["format"] == "table"
        assert "# Window Schedule" in result["data"]["schedule"]
        assert "W01" in result["data"]["schedule"]
        assert "W02" in result["data"]["schedule"]

    @pytest.mark.asyncio
    async def test_window_schedule_csv_format(self):
        """Test window schedule generation in CSV format."""
        windows = [
            {"id": "W01", "type": "fixed", "width": 1.2, "height": 1.5},
            {"id": "W02", "type": "sliding", "width": 1.8, "height": 1.2},
        ]
        result = await _window_schedule({
            "windows": windows,
            "format": "csv",
        })

        assert result["success"] is True
        assert result["data"]["format"] == "csv"
        lines = result["data"]["schedule"].strip().split("\n")
        assert len(lines) >= 3  # header + 2 data rows

    @pytest.mark.asyncio
    async def test_window_schedule_json_format(self):
        """Test window schedule generation in JSON format."""
        windows = [
            {"id": "W01", "type": "awning", "width": 0.6, "height": 0.4, "glazing": "double", "u_value": 1.6},
        ]
        result = await _window_schedule({
            "windows": windows,
            "format": "json",
        })

        assert result["success"] is True
        assert result["data"]["format"] == "json"
        import json
        output = json.loads(result["data"]["schedule"])
        assert output["schedule_type"] == "window"
        assert output["total_count"] == 1

    @pytest.mark.asyncio
    async def test_window_schedule_with_glazing(self):
        """Test window schedule includes glazing column."""
        windows = [
            {"id": "W01", "type": "fixed", "width": 1.2, "height": 1.5, "glazing": "triple"},
            {"id": "W02", "type": "fixed", "width": 1.2, "height": 1.5, "glazing": "double"},
        ]
        result = await _window_schedule({
            "windows": windows,
            "include_glazing": True,
        })

        assert result["success"] is True
        assert "glazing" in result["data"]["columns"]

    @pytest.mark.asyncio
    async def test_window_schedule_without_glazing(self):
        """Test window schedule excludes glazing column."""
        windows = [
            {"id": "W01", "type": "fixed", "width": 1.2, "height": 1.5, "glazing": "triple"},
        ]
        result = await _window_schedule({
            "windows": windows,
            "include_glazing": False,
        })

        assert result["success"] is True
        assert "glazing" not in result["data"]["columns"]

    @pytest.mark.asyncio
    async def test_window_schedule_with_u_value(self):
        """Test window schedule includes U-value column."""
        windows = [
            {"id": "W01", "type": "fixed", "width": 1.2, "height": 1.5, "u_value": 1.4},
        ]
        result = await _window_schedule({
            "windows": windows,
            "include_u_value": True,
        })

        assert result["success"] is True
        assert "u_value" in result["data"]["columns"]
        assert result["data"]["average_u_value"] == 1.4

    @pytest.mark.asyncio
    async def test_window_schedule_without_u_value(self):
        """Test window schedule excludes U-value column."""
        windows = [
            {"id": "W01", "type": "fixed", "width": 1.2, "height": 1.5, "u_value": 1.4},
        ]
        result = await _window_schedule({
            "windows": windows,
            "include_u_value": False,
        })

        assert result["success"] is True
        assert "u_value" not in result["data"]["columns"]
        assert result["data"]["average_u_value"] is None

    @pytest.mark.asyncio
    async def test_window_schedule_sorting(self):
        """Test window schedule sorting by property."""
        windows = [
            {"id": "W03", "type": "fixed", "width": 1.2, "height": 1.5},
            {"id": "W01", "type": "casement", "width": 0.9, "height": 1.2},
            {"id": "W02", "type": "sliding", "width": 1.8, "height": 1.0},
        ]
        result = await _window_schedule({
            "windows": windows,
            "sort_by": "id",
            "format": "json",
        })

        assert result["success"] is True
        import json
        output = json.loads(result["data"]["schedule"])
        window_ids = [w["id"] for w in output["groups"]["All Windows"]]
        assert window_ids == ["W01", "W02", "W03"]

    @pytest.mark.asyncio
    async def test_window_schedule_grouping_by_type(self):
        """Test window schedule grouping by type."""
        windows = [
            {"id": "W01", "type": "fixed", "width": 1.2, "height": 1.5},
            {"id": "W02", "type": "casement", "width": 0.9, "height": 1.2},
            {"id": "W03", "type": "fixed", "width": 1.0, "height": 1.0},
        ]
        result = await _window_schedule({
            "windows": windows,
            "group_by": "type",
            "format": "table",
        })

        assert result["success"] is True
        assert "Type: fixed" in result["data"]["schedule"]
        assert "Type: casement" in result["data"]["schedule"]

    @pytest.mark.asyncio
    async def test_window_schedule_grouping_by_glazing(self):
        """Test window schedule grouping by glazing type."""
        windows = [
            {"id": "W01", "type": "fixed", "width": 1.2, "height": 1.5, "glazing": "triple"},
            {"id": "W02", "type": "fixed", "width": 1.0, "height": 1.0, "glazing": "double"},
            {"id": "W03", "type": "casement", "width": 0.9, "height": 1.2, "glazing": "triple"},
        ]
        result = await _window_schedule({
            "windows": windows,
            "group_by": "glazing",
            "format": "json",
        })

        assert result["success"] is True
        import json
        output = json.loads(result["data"]["schedule"])
        assert "triple" in output["groups"]
        assert "double" in output["groups"]
        assert len(output["groups"]["triple"]) == 2
        assert len(output["groups"]["double"]) == 1

    @pytest.mark.asyncio
    async def test_window_schedule_grouping_by_level(self):
        """Test window schedule grouping by level."""
        windows = [
            {"id": "W01", "type": "fixed", "width": 1.2, "height": 1.5, "level": "Level 1"},
            {"id": "W02", "type": "casement", "width": 0.9, "height": 1.2, "level": "Level 2"},
        ]
        result = await _window_schedule({
            "windows": windows,
            "group_by": "level",
            "format": "table",
        })

        assert result["success"] is True
        assert "Level: Level 1" in result["data"]["schedule"]
        assert "Level: Level 2" in result["data"]["schedule"]

    @pytest.mark.asyncio
    async def test_window_schedule_empty_windows(self):
        """Test window schedule with no windows."""
        result = await _window_schedule({
            "windows": [],
        })

        assert result["success"] is False
        assert "error" in result

    @pytest.mark.asyncio
    async def test_window_schedule_default_values(self):
        """Test window schedule fills in default values."""
        windows = [
            {"id": "W01"},  # minimal window, should get defaults
        ]
        result = await _window_schedule({
            "windows": windows,
            "format": "json",
        })

        assert result["success"] is True
        import json
        output = json.loads(result["data"]["schedule"])
        window = output["groups"]["All Windows"][0]
        assert window["width"] == 1.2  # default width
        assert window["height"] == 1.2  # default height
        assert window["type"] == "fixed"  # default type
        assert window["glazing"] == "double"  # default glazing

    @pytest.mark.asyncio
    async def test_window_schedule_total_glazing_area(self):
        """Test window schedule calculates total glazing area."""
        windows = [
            {"id": "W01", "width": 1.0, "height": 1.0},  # 1.0 m²
            {"id": "W02", "width": 2.0, "height": 1.5},  # 3.0 m²
        ]
        result = await _window_schedule({
            "windows": windows,
        })

        assert result["success"] is True
        assert result["data"]["total_glazing_area"] == 4.0  # 1.0 + 3.0

    @pytest.mark.asyncio
    async def test_window_schedule_average_u_value(self):
        """Test window schedule calculates average U-value."""
        windows = [
            {"id": "W01", "u_value": 1.0},
            {"id": "W02", "u_value": 2.0},
            {"id": "W03", "u_value": 1.5},
        ]
        result = await _window_schedule({
            "windows": windows,
        })

        assert result["success"] is True
        assert result["data"]["average_u_value"] == 1.5  # (1.0 + 2.0 + 1.5) / 3

    @pytest.mark.asyncio
    async def test_window_schedule_summary_section(self):
        """Test window schedule includes summary section in table format."""
        windows = [
            {"id": "W01", "width": 1.0, "height": 1.0, "u_value": 1.4},
            {"id": "W02", "width": 1.5, "height": 1.2, "u_value": 1.2},
        ]
        result = await _window_schedule({
            "windows": windows,
            "format": "table",
        })

        assert result["success"] is True
        assert "## Summary" in result["data"]["schedule"]
        assert "Total Windows: **2**" in result["data"]["schedule"]
        assert "Total Glazing Area:" in result["data"]["schedule"]
        assert "Average U-Value:" in result["data"]["schedule"]


class TestValidationErrors:
    """Tests for input validation error handling."""

    @pytest.mark.asyncio
    async def test_schedule_missing_elements(self):
        """Test error when elements missing."""
        result = await _generate_schedule({
            "element_type": "wall",
            # missing elements
        })
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_ifc_empty_elements(self):
        """Test IFC export with empty elements."""
        result = await _export_ifc({
            "elements": [],
        })
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_csv_empty_elements(self):
        """Test CSV export with empty elements."""
        result = await _export_csv({
            "elements": [],
        })
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_quantities_empty_elements(self):
        """Test quantities with empty elements."""
        result = await _generate_quantities({
            "element_type": "wall",
            "elements": [],
        })
        assert result["success"] is False
