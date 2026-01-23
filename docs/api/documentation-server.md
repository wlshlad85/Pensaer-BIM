# Documentation Server API

> MCP tool server for generating schedules, reports, and exports.

**Server:** `documentation-server`
**Transport:** stdio
**Version:** 1.0.0

---

## Overview

The Documentation Server provides tools for generating construction documentation from BIM models. This includes schedules (doors, windows, rooms), quantity takeoffs, reports, and exports in various formats (CSV, IFC, BCF).

---

## Tools

| Tool | Description |
|------|-------------|
| [generate_schedule](#generate_schedule) | Generate element schedules |
| [door_schedule](#door_schedule) | Generate door schedule |
| [window_schedule](#window_schedule) | Generate window schedule |
| [room_schedule](#room_schedule) | Generate room schedule |
| [generate_quantities](#generate_quantities) | Calculate element quantities |
| [export_csv](#export_csv) | Export element data to CSV |
| [export_ifc](#export_ifc) | Export to IFC format |
| [export_report](#export_report) | Generate compliance/summary reports |
| [export_bcf](#export_bcf) | Export issues to BCF format |

---

## generate_schedule

Generate a schedule (tabular listing) for specified elements.

**Description:** Supports table (markdown), CSV, and JSON output formats. Automatically detects available columns from element properties.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_type` | `string` | Yes | - | Element type: wall, door, window, room, floor, roof |
| `element_ids` | `string[]` | No | all | Specific elements to include |
| `columns` | `string[]` | No | auto | Properties to include as columns |
| `format` | `string` | No | table | Output format: table, csv, json |
| `sort_by` | `string` | No | id | Column to sort by |
| `sort_order` | `string` | No | asc | Sort order: asc, desc |
| `include_totals` | `boolean` | No | false | Include totals row |

**Example Request:**

```json
{
  "element_type": "wall",
  "columns": ["id", "length", "height", "area", "wall_type"],
  "format": "table",
  "include_totals": true
}
```

**Example Response (table format):**

```json
{
  "success": true,
  "data": {
    "schedule": "| ID | Length (m) | Height (m) | Area (m²) | Type |\n|---|---|---|---|---|\n| wall-001 | 10.0 | 3.0 | 30.0 | structural |\n| wall-002 | 8.0 | 3.0 | 24.0 | basic |\n| **Total** | **18.0** | - | **54.0** | - |",
    "row_count": 2,
    "totals": {
      "length": 18.0,
      "area": 54.0
    }
  }
}
```

---

## door_schedule

Generate a specialized schedule for door elements.

**Description:** Includes ID, type, dimensions (width/height), fire rating, and hardware columns. Automatically formatted for construction documentation.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `door_ids` | `string[]` | No | all | Specific doors to include |
| `format` | `string` | No | table | Output format: table, csv, json |
| `include_hardware` | `boolean` | No | true | Include hardware column |
| `include_fire_rating` | `boolean` | No | true | Include fire rating column |
| `group_by_type` | `boolean` | No | false | Group doors by type |

**Example Request:**

```json
{
  "format": "table",
  "include_hardware": true,
  "include_fire_rating": true
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "schedule": "| Mark | Type | Width | Height | Fire Rating | Hardware |\n|---|---|---|---|---|---|\n| D001 | single | 0.90m | 2.10m | - | Lever |\n| D002 | double | 1.80m | 2.20m | 1-hour | Panic bar |",
    "row_count": 2,
    "summary": {
      "total_doors": 2,
      "by_type": {
        "single": 1,
        "double": 1
      }
    }
  }
}
```

---

## window_schedule

Generate a specialized schedule for window elements.

**Description:** Includes ID, type, dimensions (width/height), glazing type, and U-value columns.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `window_ids` | `string[]` | No | all | Specific windows to include |
| `format` | `string` | No | table | Output format: table, csv, json |
| `include_glazing` | `boolean` | No | true | Include glazing specification |
| `include_thermal` | `boolean` | No | true | Include thermal properties (U-value) |

**Example Response:**

```json
{
  "success": true,
  "data": {
    "schedule": "| Mark | Type | Width | Height | Sill | Glazing | U-value |\n|---|---|---|---|---|---|---|\n| W001 | casement | 1.20m | 1.00m | 0.90m | Double | 1.4 |\n| W002 | fixed | 1.50m | 1.20m | 0.80m | Triple | 0.9 |",
    "row_count": 2,
    "total_glazing_area": 3.0
  }
}
```

---

## room_schedule

Generate a specialized schedule for room elements.

**Description:** Includes ID, name, number, area, and finish columns. Useful for space planning and interior specifications.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `room_ids` | `string[]` | No | all | Specific rooms to include |
| `format` | `string` | No | table | Output format: table, csv, json |
| `include_finishes` | `boolean` | No | false | Include wall/floor/ceiling finishes |
| `include_occupancy` | `boolean` | No | false | Include occupancy information |

**Example Response:**

```json
{
  "success": true,
  "data": {
    "schedule": "| Number | Name | Area (m²) | Height | Type |\n|---|---|---|---|---|\n| 101 | Reception | 45.0 | 3.0m | office |\n| 102 | Meeting Room | 30.0 | 3.0m | office |",
    "row_count": 2,
    "total_area": 75.0,
    "summary": {
      "by_type": {
        "office": 2
      }
    }
  }
}
```

---

## generate_quantities

Calculate quantities for building elements.

**Description:** Calculates area, volume, length based on element type. Useful for cost estimation and material takeoffs.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_ids` | `string[]` | No | all | Elements to calculate |
| `element_type` | `string` | No | - | Filter by element type |
| `group_by` | `string` | No | type | Group by: type, material, level |
| `include_waste` | `boolean` | No | false | Include waste factor |
| `waste_factor` | `number` | No | 0.1 | Waste factor percentage (0-1) |

**Example Request:**

```json
{
  "element_type": "wall",
  "group_by": "material",
  "include_waste": true,
  "waste_factor": 0.1
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "quantities": [
      {
        "group": "Concrete",
        "elements": 5,
        "area": 150.0,
        "volume": 30.0,
        "area_with_waste": 165.0,
        "volume_with_waste": 33.0
      },
      {
        "group": "Brick",
        "elements": 3,
        "area": 72.0,
        "volume": 14.4,
        "area_with_waste": 79.2,
        "volume_with_waste": 15.84
      }
    ],
    "totals": {
      "elements": 8,
      "area": 222.0,
      "volume": 44.4,
      "area_with_waste": 244.2,
      "volume_with_waste": 48.84
    },
    "unit": {
      "area": "m²",
      "volume": "m³"
    }
  }
}
```

---

## export_csv

Export element data to CSV format.

**Description:** Auto-detects columns from element properties or use specified properties. Suitable for import into spreadsheet applications.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_ids` | `string[]` | No | all | Elements to export |
| `element_type` | `string` | No | - | Filter by element type |
| `columns` | `string[]` | No | auto | Specific columns to include |
| `include_header` | `boolean` | No | true | Include header row |
| `delimiter` | `string` | No | , | Column delimiter |

**Example Response:**

```json
{
  "success": true,
  "data": {
    "csv": "id,type,width,height,area\nwall-001,structural,10.0,3.0,30.0\nwall-002,basic,8.0,3.0,24.0",
    "row_count": 2,
    "columns": ["id", "type", "width", "height", "area"]
  }
}
```

---

## export_ifc

Export elements to IFC format structure.

**Description:** Returns a structured representation suitable for IFC serialization. Supports IFC2x3 and IFC4 schemas.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_ids` | `string[]` | No | all | Elements to export |
| `schema` | `string` | No | IFC4 | IFC schema: IFC2x3, IFC4 |
| `include_geometry` | `boolean` | No | true | Include geometric representations |
| `include_properties` | `boolean` | No | true | Include property sets |

**Example Request:**

```json
{
  "schema": "IFC4",
  "include_geometry": true,
  "include_properties": true
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "schema": "IFC4",
    "entities": [
      {
        "type": "IfcWall",
        "id": "wall-001",
        "global_id": "2WzXyZ123...",
        "name": "Wall 001",
        "object_placement": { ... },
        "representation": { ... },
        "property_sets": [
          {
            "name": "Pset_WallCommon",
            "properties": {
              "IsExternal": true,
              "LoadBearing": false
            }
          }
        ]
      }
    ],
    "entity_count": 1
  }
}
```

---

## export_report

Generate a compliance or summary report.

**Description:** Report types include fire_safety, accessibility, model_summary, and validation. Returns formatted report text.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `report_type` | `string` | Yes | - | Type: fire_safety, accessibility, model_summary, validation |
| `format` | `string` | No | markdown | Output format: markdown, html, json |
| `include_recommendations` | `boolean` | No | true | Include recommendations section |
| `include_statistics` | `boolean` | No | true | Include statistics section |

**Example Request:**

```json
{
  "report_type": "model_summary",
  "format": "markdown"
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "report": "# Model Summary Report\n\n## Overview\n- Total Elements: 45\n- Walls: 12\n- Doors: 8\n- Windows: 15\n- Rooms: 6\n- Floors: 2\n- Roofs: 2\n\n## Statistics\n- Total Floor Area: 450 m²\n- Total Wall Area: 324 m²\n- Gross Building Volume: 1,350 m³\n\n## Generated\n2026-01-20 07:00:00",
    "report_type": "model_summary",
    "generated_at": "2026-01-20T07:00:00Z"
  }
}
```

---

## export_bcf

Export issues and clashes to BCF (BIM Collaboration Format) 2.1.

**Description:** BCF is an XML-based format for exchanging issues, comments, and viewpoints between BIM tools. Useful for coordination meetings and issue tracking.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `issues` | `object[]` | Yes | - | List of issues to export |
| `project_name` | `string` | No | Pensaer Project | BCF project name |
| `include_viewpoints` | `boolean` | No | true | Include camera viewpoints |
| `author` | `string` | No | - | Issue author name |

**Issue Object:**

```json
{
  "title": "Clash between wall and column",
  "description": "Wall W001 intersects with column C005",
  "type": "clash",
  "priority": "high",
  "element_ids": ["wall-001", "column-005"],
  "location": [5.0, 3.0, 1.5]
}
```

**Example Request:**

```json
{
  "issues": [
    {
      "title": "Door clearance violation",
      "description": "Door D003 does not meet ADA clearance requirements",
      "type": "accessibility",
      "priority": "high",
      "element_ids": ["door-003"]
    }
  ],
  "project_name": "Office Building Phase 1",
  "author": "QA Team"
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "bcf_version": "2.1",
    "topics": [
      {
        "guid": "abc-123-def",
        "title": "Door clearance violation",
        "topic_type": "accessibility",
        "priority": "high",
        "creation_date": "2026-01-20T07:00:00Z",
        "creation_author": "QA Team"
      }
    ],
    "topic_count": 1
  }
}
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32602 | INVALID_PARAMS | Invalid or missing parameters |
| 1001 | ELEMENT_NOT_FOUND | Referenced element does not exist |
| 1005 | INTERNAL_ERROR | Internal server error |

---

## Response Format

All responses follow the standard MCP response envelope:

```json
{
  "success": true,
  "data": { ... },
  "event_id": "evt-123456",
  "timestamp": "2026-01-20T07:00:00Z"
}
```
