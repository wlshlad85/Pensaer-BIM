# Spatial Server API

> MCP tool server for spatial analysis and room detection.

**Server:** `spatial-server`
**Transport:** stdio
**Version:** 1.0.0

---

## Overview

The Spatial Server provides tools for spatial analysis of BIM models including room adjacency computation, nearest element finding, area calculation, clearance checking, and circulation analysis.

All dimensions are in **meters** unless otherwise specified.

---

## Tools

| Tool | Description |
|------|-------------|
| [compute_adjacency](#compute_adjacency) | Find adjacent rooms that share walls |
| [find_nearest](#find_nearest) | Find elements nearest to a point |
| [compute_area](#compute_area) | Calculate polygon area |
| [check_clearance](#check_clearance) | Verify clearance requirements |
| [analyze_circulation](#analyze_circulation) | Analyze circulation paths between rooms |
| [point_in_polygon](#point_in_polygon) | Test if point is inside polygon |
| [detect_rooms](#detect_rooms) | Detect enclosed rooms from walls |

---

## compute_adjacency

Find adjacent rooms (rooms that share walls).

**Description:** Given a list of room objects with boundary wall IDs, this tool identifies which rooms are adjacent by finding shared walls between them.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `rooms` | `object[]` | Yes | List of room objects with `id` and `boundary_wall_ids` |

**Room Object:**

```json
{
  "id": "room-001",
  "boundary_wall_ids": ["wall-001", "wall-002", "wall-003", "wall-004"]
}
```

**Example Request:**

```json
{
  "rooms": [
    {
      "id": "room-001",
      "boundary_wall_ids": ["wall-001", "wall-002", "wall-003", "wall-004"]
    },
    {
      "id": "room-002",
      "boundary_wall_ids": ["wall-004", "wall-005", "wall-006", "wall-007"]
    }
  ]
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "adjacencies": [
      {
        "room_a": "room-001",
        "room_b": "room-002",
        "shared_walls": ["wall-004"]
      }
    ]
  }
}
```

---

## find_nearest

Find elements nearest to a point within a search radius.

**Description:** Supports filtering by element type. Returns results sorted by distance from the query point.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `point` | `[number, number]` | Yes | - | Query point (x, y) in meters |
| `radius` | `number` | Yes | - | Search radius in meters |
| `element_type` | `string` | No | - | Filter by type: wall, door, window, room, etc. |
| `limit` | `integer` | No | 10 | Maximum results to return |

**Example Request:**

```json
{
  "point": [5, 5],
  "radius": 3.0,
  "element_type": "wall",
  "limit": 5
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "elements": [
      {
        "id": "wall-001",
        "distance": 0.5,
        "element_type": "wall"
      },
      {
        "id": "wall-002",
        "distance": 1.2,
        "element_type": "wall"
      }
    ],
    "count": 2
  }
}
```

---

## compute_area

Calculate area of a polygon region using the shoelace formula.

**Description:** Supports holes (subtract from gross area). Useful for calculating room areas, floor areas, or any arbitrary polygon.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `boundary` | `[number, number][]` | Yes | List of boundary points (polygon vertices) |
| `holes` | `[number, number][][]` | No | List of hole polygons to subtract |

**Example Request:**

```json
{
  "boundary": [[0, 0], [10, 0], [10, 8], [0, 8]],
  "holes": [
    [[2, 2], [4, 2], [4, 4], [2, 4]]
  ]
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "gross_area": 80.0,
    "hole_area": 4.0,
    "net_area": 76.0,
    "unit": "m²"
  }
}
```

---

## check_clearance

Verify clearance requirements around an element.

**Description:** Checks for obstacles within the required clearance distance. Useful for accessibility compliance (door clearances, corridor widths).

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_id` | `string` | Yes | - | UUID of the element to check clearance for |
| `clearance_distance` | `number` | Yes | - | Required clearance distance in meters |
| `direction` | `string` | No | all | Direction to check: all, front, back, left, right |
| `element_types` | `string[]` | No | all | Element types to consider as obstacles |

**Example Request:**

```json
{
  "element_id": "door-001",
  "clearance_distance": 1.5,
  "direction": "front",
  "element_types": ["wall", "furniture"]
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "clearance_met": false,
    "required_clearance": 1.5,
    "actual_clearance": 1.2,
    "obstructions": [
      {
        "element_id": "wall-005",
        "distance": 1.2,
        "element_type": "wall"
      }
    ]
  }
}
```

---

## analyze_circulation

Analyze circulation paths between rooms via doors.

**Description:** Builds a connectivity graph and optionally finds the shortest path between two rooms. Useful for egress analysis and accessibility planning.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `rooms` | `object[]` | Yes | - | List of room objects with door connections |
| `from_room` | `string` | No | - | Starting room ID for path finding |
| `to_room` | `string` | No | - | Destination room ID for path finding |
| `include_distances` | `boolean` | No | false | Include travel distances |

**Example Request:**

```json
{
  "rooms": [
    {"id": "room-001", "doors": ["door-001", "door-002"]},
    {"id": "room-002", "doors": ["door-002", "door-003"]},
    {"id": "room-003", "doors": ["door-003"]}
  ],
  "from_room": "room-001",
  "to_room": "room-003",
  "include_distances": true
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "connectivity_graph": {
      "nodes": ["room-001", "room-002", "room-003"],
      "edges": [
        {"from": "room-001", "to": "room-002", "via": "door-002"},
        {"from": "room-002", "to": "room-003", "via": "door-003"}
      ]
    },
    "path": {
      "rooms": ["room-001", "room-002", "room-003"],
      "doors": ["door-002", "door-003"],
      "total_distance": 15.5
    }
  }
}
```

---

## point_in_polygon

Test if a point is inside a polygon using ray casting.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `point` | `[number, number]` | Yes | Point to test (x, y) |
| `polygon` | `[number, number][]` | Yes | Polygon vertices |

**Example Request:**

```json
{
  "point": [5, 5],
  "polygon": [[0, 0], [10, 0], [10, 10], [0, 10]]
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "inside": true,
    "on_boundary": false
  }
}
```

---

## detect_rooms

Detect enclosed rooms from wall topology.

**Description:** Analyzes wall layout to automatically identify enclosed spaces by tracing wall boundaries and finding closed loops.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `wall_ids` | `string[]` | No | all | UUIDs of walls to analyze |
| `tolerance` | `number` | No | 0.0005 | Distance tolerance for node merging (meters) |

**Example Request:**

```json
{
  "wall_ids": ["wall-001", "wall-002", "wall-003", "wall-004"],
  "tolerance": 0.001
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "rooms_detected": 1,
    "rooms": [
      {
        "boundary_wall_ids": ["wall-001", "wall-002", "wall-003", "wall-004"],
        "area": 80.0,
        "centroid": [5, 4],
        "perimeter": 36.0
      }
    ]
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
