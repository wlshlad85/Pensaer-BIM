"""Pensaer Documentation MCP Server.

This server exposes documentation generation tools via the Model Context Protocol (MCP),
enabling AI agents to generate schedules, reports, and exports.

Tools provided:
- generate_schedule - Create element schedules (table, CSV, JSON)
- export_ifc - Export model to IFC format
- export_report - Generate compliance or summary reports
- generate_quantities - Calculate quantities for elements
- export_csv - Export element data to CSV format
- door_schedule - Generate specialized door schedules with ID, type, dimensions, fire rating

Usage:
    python -m documentation_server  # Run via stdio
"""

import asyncio
import csv
import io
import json
import logging
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


class GenerateScheduleParams(BaseModel):
    """Parameters for generate_schedule tool."""

    element_type: str = Field(
        ..., description="Type of elements to schedule (wall, door, window, room, floor)"
    )
    elements: list[dict[str, Any]] = Field(
        ..., description="List of elements to include in schedule"
    )
    properties: list[str] | None = Field(
        None, description="Properties to include in schedule"
    )
    format: str = Field(
        "table", description="Output format: table, csv, json"
    )
    sort_by: str | None = Field(
        None, description="Property to sort by"
    )
    group_by: str | None = Field(
        None, description="Property to group by"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class ExportIfcParams(BaseModel):
    """Parameters for export_ifc tool."""

    elements: list[dict[str, Any]] = Field(
        ..., description="Elements to export"
    )
    project_name: str = Field(
        "Pensaer Project", description="Project name for IFC header"
    )
    ifc_version: str = Field(
        "IFC4", description="IFC version: IFC2X3, IFC4, IFC4X3"
    )
    include_properties: bool = Field(
        True, description="Include property sets"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class ExportReportParams(BaseModel):
    """Parameters for export_report tool."""

    report_type: str = Field(
        ..., description="Report type: fire_safety, accessibility, model_summary, validation"
    )
    elements: list[dict[str, Any]] = Field(
        default_factory=list, description="Elements to include in report"
    )
    validation_results: list[dict[str, Any]] | None = Field(
        None, description="Validation results to include"
    )
    format: str = Field(
        "markdown", description="Output format: markdown, html"
    )
    include_summary: bool = Field(
        True, description="Include executive summary"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class GenerateQuantitiesParams(BaseModel):
    """Parameters for generate_quantities tool."""

    element_type: str = Field(
        ..., description="Type of elements to quantify"
    )
    elements: list[dict[str, Any]] = Field(
        ..., description="Elements to calculate quantities for"
    )
    group_by: str | None = Field(
        None, description="Property to group quantities by"
    )
    include_totals: bool = Field(
        True, description="Include total sums"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class ExportCsvParams(BaseModel):
    """Parameters for export_csv tool."""

    elements: list[dict[str, Any]] = Field(
        ..., description="Elements to export"
    )
    properties: list[str] | None = Field(
        None, description="Properties to include as columns"
    )
    include_header: bool = Field(
        True, description="Include header row"
    )
    reasoning: str | None = Field(None, description="AI agent reasoning")


class DoorScheduleParams(BaseModel):
    """Parameters for door_schedule tool."""

    doors: list[dict[str, Any]] = Field(
        ..., description="List of door elements to schedule"
    )
    format: str = Field(
        "table", description="Output format: table, csv, json"
    )
    include_fire_rating: bool = Field(
        True, description="Include fire rating column"
    )
    sort_by: str | None = Field(
        None, description="Property to sort by (id, type, width, height, fire_rating)"
    )
    group_by: str | None = Field(
        None, description="Property to group by (type, fire_rating, level)"
    )
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
# Utility Functions
# =============================================================================


def get_element_property(element: dict[str, Any], prop: str) -> Any:
    """Extract a property from an element, handling nested paths."""
    if "." in prop:
        parts = prop.split(".")
        value = element
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            else:
                return None
        return value
    return element.get(prop)


def format_value(value: Any) -> str:
    """Format a value for display."""
    if value is None:
        return "-"
    if isinstance(value, float):
        return f"{value:.3f}"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, list):
        return ", ".join(str(v) for v in value)
    return str(value)


def calculate_wall_area(wall: dict[str, Any]) -> float:
    """Calculate wall area from dimensions."""
    length = wall.get("length", 0)
    height = wall.get("height", 0)
    if length and height:
        return length * height
    # Try to calculate from start/end
    if "start" in wall and "end" in wall:
        import math
        dx = wall["end"][0] - wall["start"][0]
        dy = wall["end"][1] - wall["start"][1]
        length = math.sqrt(dx * dx + dy * dy)
        height = wall.get("height", 2.7)  # Default height
        return length * height
    return 0


def calculate_element_volume(element: dict[str, Any], element_type: str) -> float:
    """Calculate volume for an element."""
    if element_type == "wall":
        area = calculate_wall_area(element)
        thickness = element.get("thickness", 0.2)  # Default thickness
        return area * thickness
    elif element_type == "floor":
        area = element.get("area", 0)
        thickness = element.get("thickness", 0.15)  # Default slab thickness
        return area * thickness
    elif element_type == "column":
        width = element.get("width", 0.3)
        depth = element.get("depth", 0.3)
        height = element.get("height", 3.0)
        return width * depth * height
    return 0


# =============================================================================
# Tool Implementations
# =============================================================================


async def _generate_schedule(args: dict[str, Any]) -> dict[str, Any]:
    """Generate a schedule for specified elements."""
    try:
        params = GenerateScheduleParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    elements = params.elements
    if not elements:
        return make_error(400, "No elements provided")

    # Determine properties to include
    if params.properties:
        properties = params.properties
    else:
        # Auto-detect properties from first element
        properties = ["id", "type"]
        if elements:
            sample = elements[0]
            for key in sample.keys():
                if key not in properties and not key.startswith("_"):
                    properties.append(key)

    # Sort if requested
    if params.sort_by and params.sort_by in properties:
        elements = sorted(
            elements,
            key=lambda x: get_element_property(x, params.sort_by) or ""
        )

    # Group if requested
    grouped_data: dict[str, list[dict[str, Any]]] = {}
    if params.group_by:
        for elem in elements:
            group_key = str(get_element_property(elem, params.group_by) or "Ungrouped")
            if group_key not in grouped_data:
                grouped_data[group_key] = []
            grouped_data[group_key].append(elem)
    else:
        grouped_data["All"] = elements

    # Format output
    if params.format == "json":
        output = {
            "schedule_type": params.element_type,
            "properties": properties,
            "groups": {
                group: [
                    {prop: get_element_property(elem, prop) for prop in properties}
                    for elem in group_elements
                ]
                for group, group_elements in grouped_data.items()
            },
            "total_count": len(elements),
        }
        formatted_output = json.dumps(output, indent=2)

    elif params.format == "csv":
        output_io = io.StringIO()
        writer = csv.writer(output_io)
        writer.writerow(properties)
        for elem in elements:
            row = [format_value(get_element_property(elem, prop)) for prop in properties]
            writer.writerow(row)
        formatted_output = output_io.getvalue()

    else:  # table format (markdown)
        lines = []
        lines.append(f"# {params.element_type.title()} Schedule")
        lines.append("")

        for group_name, group_elements in grouped_data.items():
            if params.group_by:
                lines.append(f"## {params.group_by}: {group_name}")
                lines.append("")

            # Table header
            header = " | ".join(prop.replace("_", " ").title() for prop in properties)
            lines.append(f"| {header} |")
            lines.append("|" + "|".join("---" for _ in properties) + "|")

            # Table rows
            for elem in group_elements:
                row = " | ".join(
                    format_value(get_element_property(elem, prop))
                    for prop in properties
                )
                lines.append(f"| {row} |")

            lines.append("")
            lines.append(f"*Count: {len(group_elements)}*")
            lines.append("")

        formatted_output = "\n".join(lines)

    return make_response(
        {
            "schedule": formatted_output,
            "element_type": params.element_type,
            "element_count": len(elements),
            "property_count": len(properties),
            "properties": properties,
            "format": params.format,
        },
        reasoning=params.reasoning,
    )


async def _export_ifc(args: dict[str, Any]) -> dict[str, Any]:
    """Export elements to IFC format structure."""
    try:
        params = ExportIfcParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    elements = params.elements
    if not elements:
        return make_error(400, "No elements provided")

    # IFC type mapping
    ifc_type_map = {
        "wall": "IfcWall",
        "door": "IfcDoor",
        "window": "IfcWindow",
        "floor": "IfcSlab",
        "room": "IfcSpace",
        "column": "IfcColumn",
        "beam": "IfcBeam",
        "roof": "IfcRoof",
        "stair": "IfcStair",
    }

    # Generate IFC structure
    ifc_header = {
        "schema": params.ifc_version,
        "file_description": [
            "ViewDefinition [CoordinationView]",
        ],
        "file_name": {
            "name": f"{params.project_name}.ifc",
            "time_stamp": datetime.now(timezone.utc).isoformat(),
            "author": "Pensaer BIM",
            "organization": "Pensaer",
            "originating_system": "Pensaer MCP Server",
        },
    }

    ifc_project = {
        "type": "IfcProject",
        "id": str(uuid4()),
        "name": params.project_name,
        "units": {
            "length": "METRE",
            "area": "SQUARE_METRE",
            "volume": "CUBIC_METRE",
            "angle": "RADIAN",
        },
    }

    ifc_elements = []
    for elem in elements:
        elem_type = elem.get("type", elem.get("element_type", "unknown"))
        ifc_type = ifc_type_map.get(elem_type, "IfcBuildingElement")

        ifc_elem = {
            "type": ifc_type,
            "id": elem.get("id", str(uuid4())),
            "name": elem.get("name", f"{elem_type}_{len(ifc_elements) + 1}"),
            "global_id": str(uuid4()),
        }

        # Add geometry representation
        if "start" in elem and "end" in elem:
            ifc_elem["representation"] = {
                "type": "SweptSolid",
                "profile": "RectangleProfile",
                "start": elem["start"],
                "end": elem["end"],
                "height": elem.get("height", 2.7),
                "thickness": elem.get("thickness", 0.2),
            }
        elif "position" in elem:
            ifc_elem["placement"] = {
                "location": elem["position"],
            }

        # Add property sets if requested
        if params.include_properties:
            pset = {}
            for key, value in elem.items():
                if key not in ["id", "type", "element_type", "start", "end", "position"]:
                    if isinstance(value, (str, int, float, bool)):
                        pset[key] = value
            if pset:
                ifc_elem["property_sets"] = [
                    {
                        "name": "Pset_Pensaer",
                        "properties": pset,
                    }
                ]

        ifc_elements.append(ifc_elem)

    ifc_content = {
        "header": ifc_header,
        "project": ifc_project,
        "elements": ifc_elements,
    }

    return make_response(
        {
            "ifc_structure": ifc_content,
            "element_count": len(ifc_elements),
            "ifc_version": params.ifc_version,
            "project_name": params.project_name,
            "note": "This is a structured IFC representation. Use IFC serialization library for actual .ifc file.",
        },
        reasoning=params.reasoning,
    )


async def _export_report(args: dict[str, Any]) -> dict[str, Any]:
    """Generate a compliance or summary report."""
    try:
        params = ExportReportParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    report_type = params.report_type
    elements = params.elements
    validation_results = params.validation_results or []

    lines = []
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    if params.format == "html":
        # HTML format
        lines.append("<!DOCTYPE html>")
        lines.append("<html><head>")
        lines.append(f"<title>Pensaer {report_type.replace('_', ' ').title()} Report</title>")
        lines.append("<style>")
        lines.append("body { font-family: Arial, sans-serif; margin: 40px; }")
        lines.append("h1 { color: #2c3e50; }")
        lines.append("h2 { color: #34495e; border-bottom: 1px solid #bdc3c7; }")
        lines.append("table { border-collapse: collapse; width: 100%; margin: 20px 0; }")
        lines.append("th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }")
        lines.append("th { background-color: #3498db; color: white; }")
        lines.append(".pass { color: #27ae60; }")
        lines.append(".fail { color: #e74c3c; }")
        lines.append(".warning { color: #f39c12; }")
        lines.append("</style></head><body>")

        lines.append(f"<h1>Pensaer {report_type.replace('_', ' ').title()} Report</h1>")
        lines.append(f"<p>Generated: {timestamp}</p>")

    else:
        # Markdown format
        lines.append(f"# Pensaer {report_type.replace('_', ' ').title()} Report")
        lines.append("")
        lines.append(f"**Generated:** {timestamp}")
        lines.append("")

    # Executive Summary
    if params.include_summary:
        if params.format == "html":
            lines.append("<h2>Executive Summary</h2>")
        else:
            lines.append("## Executive Summary")
            lines.append("")

        total_elements = len(elements)
        total_issues = len(validation_results)
        critical_issues = sum(1 for v in validation_results if v.get("severity") == "critical")
        warning_issues = sum(1 for v in validation_results if v.get("severity") == "warning")

        if params.format == "html":
            lines.append("<ul>")
            lines.append(f"<li>Total Elements Analyzed: <strong>{total_elements}</strong></li>")
            lines.append(f"<li>Total Issues Found: <strong>{total_issues}</strong></li>")
            lines.append(f"<li class='fail'>Critical Issues: <strong>{critical_issues}</strong></li>")
            lines.append(f"<li class='warning'>Warnings: <strong>{warning_issues}</strong></li>")
            lines.append("</ul>")
        else:
            lines.append(f"- Total Elements Analyzed: **{total_elements}**")
            lines.append(f"- Total Issues Found: **{total_issues}**")
            lines.append(f"- Critical Issues: **{critical_issues}**")
            lines.append(f"- Warnings: **{warning_issues}**")
            lines.append("")

    # Report-specific content
    if report_type == "fire_safety":
        if params.format == "html":
            lines.append("<h2>Fire Safety Compliance</h2>")
        else:
            lines.append("## Fire Safety Compliance")
            lines.append("")

        fire_issues = [v for v in validation_results if "fire" in v.get("category", "").lower()]
        if fire_issues:
            if params.format == "html":
                lines.append("<table><tr><th>Element</th><th>Issue</th><th>Severity</th></tr>")
                for issue in fire_issues:
                    sev_class = "fail" if issue.get("severity") == "critical" else "warning"
                    lines.append(f"<tr><td>{issue.get('element_id', 'N/A')}</td>")
                    lines.append(f"<td>{issue.get('message', 'N/A')}</td>")
                    lines.append(f"<td class='{sev_class}'>{issue.get('severity', 'N/A')}</td></tr>")
                lines.append("</table>")
            else:
                lines.append("| Element | Issue | Severity |")
                lines.append("|---------|-------|----------|")
                for issue in fire_issues:
                    lines.append(f"| {issue.get('element_id', 'N/A')} | {issue.get('message', 'N/A')} | {issue.get('severity', 'N/A')} |")
                lines.append("")
        else:
            lines.append("No fire safety issues found." if params.format != "html" else "<p>No fire safety issues found.</p>")

    elif report_type == "accessibility":
        if params.format == "html":
            lines.append("<h2>Accessibility Compliance (ADA/DDA)</h2>")
        else:
            lines.append("## Accessibility Compliance (ADA/DDA)")
            lines.append("")

        access_issues = [v for v in validation_results if "accessibility" in v.get("category", "").lower()]
        if access_issues:
            if params.format == "html":
                lines.append("<table><tr><th>Element</th><th>Requirement</th><th>Status</th></tr>")
                for issue in access_issues:
                    status_class = "fail" if issue.get("severity") == "critical" else "warning"
                    lines.append(f"<tr><td>{issue.get('element_id', 'N/A')}</td>")
                    lines.append(f"<td>{issue.get('message', 'N/A')}</td>")
                    lines.append(f"<td class='{status_class}'>{issue.get('severity', 'N/A')}</td></tr>")
                lines.append("</table>")
            else:
                lines.append("| Element | Requirement | Status |")
                lines.append("|---------|-------------|--------|")
                for issue in access_issues:
                    lines.append(f"| {issue.get('element_id', 'N/A')} | {issue.get('message', 'N/A')} | {issue.get('severity', 'N/A')} |")
                lines.append("")
        else:
            lines.append("No accessibility issues found." if params.format != "html" else "<p>No accessibility issues found.</p>")

    elif report_type == "model_summary":
        if params.format == "html":
            lines.append("<h2>Model Statistics</h2>")
        else:
            lines.append("## Model Statistics")
            lines.append("")

        # Count by type
        type_counts: dict[str, int] = {}
        for elem in elements:
            etype = elem.get("type", elem.get("element_type", "unknown"))
            type_counts[etype] = type_counts.get(etype, 0) + 1

        if params.format == "html":
            lines.append("<table><tr><th>Element Type</th><th>Count</th></tr>")
            for etype, count in sorted(type_counts.items()):
                lines.append(f"<tr><td>{etype.title()}</td><td>{count}</td></tr>")
            lines.append("</table>")
        else:
            lines.append("| Element Type | Count |")
            lines.append("|--------------|-------|")
            for etype, count in sorted(type_counts.items()):
                lines.append(f"| {etype.title()} | {count} |")
            lines.append("")

    elif report_type == "validation":
        if params.format == "html":
            lines.append("<h2>Validation Results</h2>")
        else:
            lines.append("## Validation Results")
            lines.append("")

        if validation_results:
            # Group by category
            categories: dict[str, list[dict[str, Any]]] = {}
            for result in validation_results:
                cat = result.get("category", "General")
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(result)

            for cat, issues in categories.items():
                if params.format == "html":
                    lines.append(f"<h3>{cat}</h3>")
                    lines.append("<table><tr><th>Element</th><th>Message</th><th>Severity</th></tr>")
                    for issue in issues:
                        sev_class = "fail" if issue.get("severity") == "critical" else "warning"
                        lines.append(f"<tr><td>{issue.get('element_id', 'N/A')}</td>")
                        lines.append(f"<td>{issue.get('message', 'N/A')}</td>")
                        lines.append(f"<td class='{sev_class}'>{issue.get('severity', 'N/A')}</td></tr>")
                    lines.append("</table>")
                else:
                    lines.append(f"### {cat}")
                    lines.append("")
                    lines.append("| Element | Message | Severity |")
                    lines.append("|---------|---------|----------|")
                    for issue in issues:
                        lines.append(f"| {issue.get('element_id', 'N/A')} | {issue.get('message', 'N/A')} | {issue.get('severity', 'N/A')} |")
                    lines.append("")
        else:
            lines.append("No validation issues found." if params.format != "html" else "<p>No validation issues found.</p>")

    if params.format == "html":
        lines.append("</body></html>")

    report_content = "\n".join(lines)

    return make_response(
        {
            "report": report_content,
            "report_type": report_type,
            "format": params.format,
            "element_count": len(elements),
            "issue_count": len(validation_results),
        },
        reasoning=params.reasoning,
    )


async def _generate_quantities(args: dict[str, Any]) -> dict[str, Any]:
    """Calculate quantities for elements."""
    try:
        params = GenerateQuantitiesParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    elements = params.elements
    element_type = params.element_type

    if not elements:
        return make_error(400, "No elements provided")

    # Calculate quantities based on element type
    quantities: list[dict[str, Any]] = []

    for elem in elements:
        qty: dict[str, Any] = {
            "element_id": elem.get("id", "unknown"),
            "element_type": element_type,
        }

        if element_type == "wall":
            # Wall quantities: length, height, area, volume
            length = elem.get("length", 0)
            if not length and "start" in elem and "end" in elem:
                import math
                dx = elem["end"][0] - elem["start"][0]
                dy = elem["end"][1] - elem["start"][1]
                length = math.sqrt(dx * dx + dy * dy)

            height = elem.get("height", 2.7)
            thickness = elem.get("thickness", 0.2)
            area = length * height
            volume = area * thickness

            qty.update({
                "length": round(length, 3),
                "height": round(height, 3),
                "thickness": round(thickness, 3),
                "area": round(area, 3),
                "volume": round(volume, 3),
            })

        elif element_type == "floor":
            area = elem.get("area", 0)
            thickness = elem.get("thickness", 0.15)
            volume = area * thickness

            qty.update({
                "area": round(area, 3),
                "thickness": round(thickness, 3),
                "volume": round(volume, 3),
            })

        elif element_type == "room":
            area = elem.get("area", 0)
            height = elem.get("height", 2.7)
            volume = area * height
            perimeter = elem.get("perimeter", 0)

            qty.update({
                "area": round(area, 3),
                "height": round(height, 3),
                "volume": round(volume, 3),
                "perimeter": round(perimeter, 3),
            })

        elif element_type in ["door", "window"]:
            width = elem.get("width", 0.9 if element_type == "door" else 1.2)
            height = elem.get("height", 2.1 if element_type == "door" else 1.2)
            area = width * height

            qty.update({
                "width": round(width, 3),
                "height": round(height, 3),
                "area": round(area, 3),
                "count": 1,
            })

        elif element_type == "column":
            width = elem.get("width", 0.3)
            depth = elem.get("depth", 0.3)
            height = elem.get("height", 3.0)
            volume = width * depth * height

            qty.update({
                "width": round(width, 3),
                "depth": round(depth, 3),
                "height": round(height, 3),
                "volume": round(volume, 3),
            })

        else:
            # Generic: just count
            qty["count"] = 1

        # Add group_by value if specified
        if params.group_by:
            qty["group"] = str(get_element_property(elem, params.group_by) or "Ungrouped")

        quantities.append(qty)

    # Group and aggregate if requested
    grouped_totals: dict[str, dict[str, float]] = {}
    if params.group_by:
        for qty in quantities:
            group = qty.get("group", "Ungrouped")
            if group not in grouped_totals:
                grouped_totals[group] = {"count": 0}

            grouped_totals[group]["count"] += 1
            for key, value in qty.items():
                if isinstance(value, (int, float)) and key not in ["count"]:
                    if key not in grouped_totals[group]:
                        grouped_totals[group][key] = 0
                    grouped_totals[group][key] += value

    # Calculate totals
    totals: dict[str, float] = {"count": len(quantities)}
    if params.include_totals:
        for qty in quantities:
            for key, value in qty.items():
                if isinstance(value, (int, float)) and key not in ["count"]:
                    if key not in totals:
                        totals[key] = 0
                    totals[key] += value

        # Round totals
        totals = {k: round(v, 3) for k, v in totals.items()}

    return make_response(
        {
            "quantities": quantities,
            "element_type": element_type,
            "element_count": len(quantities),
            "totals": totals if params.include_totals else None,
            "grouped_totals": grouped_totals if params.group_by else None,
        },
        reasoning=params.reasoning,
    )


async def _export_csv(args: dict[str, Any]) -> dict[str, Any]:
    """Export elements to CSV format."""
    try:
        params = ExportCsvParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    elements = params.elements
    if not elements:
        return make_error(400, "No elements provided")

    # Determine columns
    if params.properties:
        columns = params.properties
    else:
        # Auto-detect from all elements
        columns_set: set[str] = set()
        for elem in elements:
            for key in elem.keys():
                if not key.startswith("_") and isinstance(elem[key], (str, int, float, bool, type(None))):
                    columns_set.add(key)
        columns = sorted(columns_set)

    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)

    if params.include_header:
        writer.writerow(columns)

    for elem in elements:
        row = []
        for col in columns:
            value = get_element_property(elem, col)
            if value is None:
                row.append("")
            elif isinstance(value, bool):
                row.append("true" if value else "false")
            elif isinstance(value, (list, dict)):
                row.append(json.dumps(value))
            else:
                row.append(str(value))
        writer.writerow(row)

    csv_content = output.getvalue()

    return make_response(
        {
            "csv": csv_content,
            "columns": columns,
            "row_count": len(elements),
            "column_count": len(columns),
        },
        reasoning=params.reasoning,
    )


async def _door_schedule(args: dict[str, Any]) -> dict[str, Any]:
    """Generate a schedule specifically for door elements."""
    try:
        params = DoorScheduleParams(**args)
    except ValidationError as e:
        return make_error(400, f"Invalid parameters: {e}")

    doors = params.doors
    if not doors:
        return make_error(400, "No door elements provided")

    # Standard door schedule columns
    base_columns = ["id", "type", "width", "height"]
    if params.include_fire_rating:
        base_columns.append("fire_rating")

    # Extract and normalize door data
    schedule_entries: list[dict[str, Any]] = []
    for door in doors:
        entry: dict[str, Any] = {
            "id": door.get("id", f"door_{len(schedule_entries) + 1}"),
            "type": door.get("type", door.get("door_type", "standard")),
            "width": door.get("width", 0.9),
            "height": door.get("height", 2.1),
        }
        if params.include_fire_rating:
            entry["fire_rating"] = door.get("fire_rating", door.get("fireRating", "none"))

        # Preserve additional properties for grouping
        for key in ["level", "room", "material"]:
            if key in door:
                entry[key] = door[key]

        schedule_entries.append(entry)

    # Sort if requested
    if params.sort_by and params.sort_by in base_columns:
        schedule_entries = sorted(
            schedule_entries,
            key=lambda x: x.get(params.sort_by) or ""
        )

    # Group if requested
    grouped_data: dict[str, list[dict[str, Any]]] = {}
    if params.group_by:
        for entry in schedule_entries:
            group_key = str(entry.get(params.group_by, "Ungrouped"))
            if group_key not in grouped_data:
                grouped_data[group_key] = []
            grouped_data[group_key].append(entry)
    else:
        grouped_data["All Doors"] = schedule_entries

    # Format output
    if params.format == "json":
        output = {
            "schedule_type": "door",
            "columns": base_columns,
            "groups": {
                group: [
                    {col: entry.get(col) for col in base_columns}
                    for entry in group_entries
                ]
                for group, group_entries in grouped_data.items()
            },
            "total_count": len(schedule_entries),
            "summary": {
                "total_doors": len(schedule_entries),
                "fire_rated_count": sum(
                    1 for e in schedule_entries
                    if e.get("fire_rating") and e["fire_rating"] != "none"
                ),
            },
        }
        formatted_output = json.dumps(output, indent=2)

    elif params.format == "csv":
        output_io = io.StringIO()
        writer = csv.writer(output_io)
        writer.writerow([col.replace("_", " ").title() for col in base_columns])
        for entry in schedule_entries:
            row = [format_value(entry.get(col)) for col in base_columns]
            writer.writerow(row)
        formatted_output = output_io.getvalue()

    else:  # table format (markdown)
        lines = []
        lines.append("# Door Schedule")
        lines.append("")

        for group_name, group_entries in grouped_data.items():
            if params.group_by:
                lines.append(f"## {params.group_by.replace('_', ' ').title()}: {group_name}")
                lines.append("")

            # Table header
            header = " | ".join(col.replace("_", " ").title() for col in base_columns)
            lines.append(f"| {header} |")
            lines.append("|" + "|".join("---" for _ in base_columns) + "|")

            # Table rows
            for entry in group_entries:
                row = " | ".join(
                    format_value(entry.get(col))
                    for col in base_columns
                )
                lines.append(f"| {row} |")

            lines.append("")
            lines.append(f"*Count: {len(group_entries)}*")
            lines.append("")

        # Summary section
        fire_rated = sum(
            1 for e in schedule_entries
            if e.get("fire_rating") and e["fire_rating"] != "none"
        )
        lines.append("## Summary")
        lines.append(f"- Total Doors: **{len(schedule_entries)}**")
        lines.append(f"- Fire-Rated Doors: **{fire_rated}**")
        lines.append("")

        formatted_output = "\n".join(lines)

    return make_response(
        {
            "schedule": formatted_output,
            "door_count": len(schedule_entries),
            "columns": base_columns,
            "format": params.format,
            "fire_rated_count": sum(
                1 for e in schedule_entries
                if e.get("fire_rating") and e["fire_rating"] != "none"
            ),
        },
        reasoning=params.reasoning,
    )


# =============================================================================
# Tool Definitions
# =============================================================================

TOOLS = [
    Tool(
        name="generate_schedule",
        description="Generate a schedule (tabular listing) for specified elements. "
        "Supports table (markdown), CSV, and JSON output formats. "
        "Can sort and group by properties.",
        inputSchema={
            "type": "object",
            "properties": {
                "element_type": {
                    "type": "string",
                    "enum": ["wall", "door", "window", "room", "floor", "column", "beam"],
                    "description": "Type of elements to schedule",
                },
                "elements": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "List of elements to include in schedule",
                },
                "properties": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Properties to include as columns",
                },
                "format": {
                    "type": "string",
                    "enum": ["table", "csv", "json"],
                    "default": "table",
                    "description": "Output format",
                },
                "sort_by": {
                    "type": "string",
                    "description": "Property to sort by",
                },
                "group_by": {
                    "type": "string",
                    "description": "Property to group by",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["element_type", "elements"],
        },
    ),
    Tool(
        name="export_ifc",
        description="Export elements to IFC format structure. "
        "Returns a structured representation suitable for IFC serialization. "
        "Supports IFC2X3, IFC4, and IFC4X3 schemas.",
        inputSchema={
            "type": "object",
            "properties": {
                "elements": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Elements to export",
                },
                "project_name": {
                    "type": "string",
                    "default": "Pensaer Project",
                    "description": "Project name for IFC header",
                },
                "ifc_version": {
                    "type": "string",
                    "enum": ["IFC2X3", "IFC4", "IFC4X3"],
                    "default": "IFC4",
                    "description": "IFC schema version",
                },
                "include_properties": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include property sets in export",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["elements"],
        },
    ),
    Tool(
        name="export_report",
        description="Generate a compliance or summary report. "
        "Report types: fire_safety, accessibility, model_summary, validation. "
        "Output formats: markdown, html.",
        inputSchema={
            "type": "object",
            "properties": {
                "report_type": {
                    "type": "string",
                    "enum": ["fire_safety", "accessibility", "model_summary", "validation"],
                    "description": "Type of report to generate",
                },
                "elements": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Elements to include in report",
                },
                "validation_results": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Validation issues to include",
                },
                "format": {
                    "type": "string",
                    "enum": ["markdown", "html"],
                    "default": "markdown",
                    "description": "Output format",
                },
                "include_summary": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include executive summary",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["report_type"],
        },
    ),
    Tool(
        name="generate_quantities",
        description="Calculate quantities for building elements. "
        "Calculates area, volume, length based on element type. "
        "Supports grouping and totals.",
        inputSchema={
            "type": "object",
            "properties": {
                "element_type": {
                    "type": "string",
                    "description": "Type of elements to quantify",
                },
                "elements": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Elements to calculate quantities for",
                },
                "group_by": {
                    "type": "string",
                    "description": "Property to group quantities by",
                },
                "include_totals": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include total sums",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["element_type", "elements"],
        },
    ),
    Tool(
        name="export_csv",
        description="Export element data to CSV format. "
        "Auto-detects columns from element properties or use specified properties.",
        inputSchema={
            "type": "object",
            "properties": {
                "elements": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Elements to export",
                },
                "properties": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Properties to include as columns",
                },
                "include_header": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include header row",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["elements"],
        },
    ),
    Tool(
        name="door_schedule",
        description="Generate a specialized schedule for door elements. "
        "Includes ID, type, dimensions (width/height), and fire rating columns. "
        "Supports table (markdown), CSV, and JSON output formats with sorting and grouping.",
        inputSchema={
            "type": "object",
            "properties": {
                "doors": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "List of door elements with id, type, width, height, fire_rating",
                },
                "format": {
                    "type": "string",
                    "enum": ["table", "csv", "json"],
                    "default": "table",
                    "description": "Output format",
                },
                "include_fire_rating": {
                    "type": "boolean",
                    "default": True,
                    "description": "Include fire rating column in schedule",
                },
                "sort_by": {
                    "type": "string",
                    "enum": ["id", "type", "width", "height", "fire_rating"],
                    "description": "Property to sort by",
                },
                "group_by": {
                    "type": "string",
                    "enum": ["type", "fire_rating", "level"],
                    "description": "Property to group doors by",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["doors"],
        },
    ),
]


# =============================================================================
# Server Setup
# =============================================================================


def create_server() -> Server:
    """Create and configure the MCP server."""
    server = Server("pensaer-documentation-server")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        return TOOLS

    @server.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
        logger.info(f"Tool called: {name}")

        try:
            if name == "generate_schedule":
                result = await _generate_schedule(arguments)
            elif name == "export_ifc":
                result = await _export_ifc(arguments)
            elif name == "export_report":
                result = await _export_report(arguments)
            elif name == "generate_quantities":
                result = await _generate_quantities(arguments)
            elif name == "export_csv":
                result = await _export_csv(arguments)
            elif name == "door_schedule":
                result = await _door_schedule(arguments)
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
    """Entry point for the documentation MCP server."""
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
