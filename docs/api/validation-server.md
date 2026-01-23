# Validation Server API

> MCP tool server for compliance checking and validation.

**Server:** `validation-server`
**Transport:** stdio
**Version:** 1.0.0

---

## Overview

The Validation Server provides tools for validating BIM models against building codes and standards. It includes checks for fire safety, accessibility (ADA/DDA), egress requirements, and geometric clashes.

All dimensions are in **meters** unless otherwise specified.

---

## Tools

| Tool | Description |
|------|-------------|
| [validate_model](#validate_model) | Run comprehensive validation rules |
| [check_fire_compliance](#check_fire_compliance) | Check fire rating compliance |
| [check_accessibility](#check_accessibility) | Check ADA/DDA accessibility compliance |
| [check_egress](#check_egress) | Validate egress paths and travel distances |
| [check_door_clearances](#check_door_clearances) | Check door swing and maneuvering clearances |
| [check_stair_compliance](#check_stair_compliance) | Check stair dimension compliance |
| [detect_clashes](#detect_clashes) | Detect element intersections |
| [detect_clashes_between_sets](#detect_clashes_between_sets) | Detect clashes between element groups |

---

## validate_model

Run comprehensive validation rules against the model.

**Description:** Checks geometry, accessibility, fire safety, egress, and general issues. Returns a detailed report with warnings and errors categorized by severity.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_ids` | `string[]` | No | all | UUIDs of elements to validate |
| `rules` | `string[]` | No | all | Specific rules to check |
| `severity_threshold` | `string` | No | warning | Minimum severity: info, warning, error |

**Available Rules:**
- `geometry` - Geometric validity checks
- `accessibility` - ADA/DDA compliance
- `fire_safety` - Fire rating and compartmentalization
- `egress` - Exit paths and travel distances
- `clearances` - Minimum clearance requirements
- `dimensions` - Dimensional constraints

**Example Request:**

```json
{
  "rules": ["accessibility", "egress"],
  "severity_threshold": "warning"
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "valid": false,
    "summary": {
      "total_issues": 3,
      "errors": 1,
      "warnings": 2,
      "info": 0
    },
    "issues": [
      {
        "rule": "accessibility",
        "severity": "error",
        "element_id": "door-001",
        "message": "Door width 0.76m is below minimum 0.81m (32 inches)",
        "code": "ADA-404.2.3"
      },
      {
        "rule": "egress",
        "severity": "warning",
        "element_id": "room-001",
        "message": "Single exit for room with occupancy > 50",
        "code": "IBC-1006.2"
      }
    ]
  }
}
```

---

## check_fire_compliance

Check fire rating compliance and compartmentalization.

**Description:** Validates fire-rated construction and maximum compartment areas according to building code requirements.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_ids` | `string[]` | No | all | Elements to check |
| `occupancy_type` | `string` | No | B | Occupancy classification (A, B, E, F, H, I, M, R, S, U) |
| `construction_type` | `string` | No | V-B | Construction type (I-A through V-B) |
| `sprinklered` | `boolean` | No | false | Building has sprinkler system |

**Example Request:**

```json
{
  "occupancy_type": "B",
  "construction_type": "V-B",
  "sprinklered": true
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "compliant": true,
    "compartment_areas": [
      {
        "area": 450.0,
        "max_allowed": 600.0,
        "compliant": true
      }
    ],
    "fire_rated_elements": [
      {
        "element_id": "wall-001",
        "required_rating": "1-hour",
        "actual_rating": "1-hour",
        "compliant": true
      }
    ]
  }
}
```

---

## check_accessibility

Check ADA/DDA accessibility compliance.

**Description:** Validates door widths, thresholds, corridor widths, and turning spaces according to accessibility standards.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_ids` | `string[]` | No | all | Elements to check |
| `standard` | `string` | No | ADA | Standard to use: ADA, DDA, both |
| `include_recommendations` | `boolean` | No | false | Include enhancement recommendations |

**Example Request:**

```json
{
  "standard": "ADA",
  "include_recommendations": true
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "compliant": false,
    "checks": [
      {
        "category": "door_widths",
        "passed": 5,
        "failed": 1,
        "issues": [
          {
            "element_id": "door-003",
            "actual": 0.76,
            "required": 0.81,
            "message": "Door width must be at least 32 inches (0.81m)"
          }
        ]
      },
      {
        "category": "corridor_widths",
        "passed": 3,
        "failed": 0,
        "issues": []
      },
      {
        "category": "turning_spaces",
        "passed": 2,
        "failed": 0,
        "issues": []
      }
    ],
    "recommendations": [
      "Consider adding automatic door openers for improved accessibility",
      "Room 102 would benefit from additional maneuvering clearance"
    ]
  }
}
```

---

## check_egress

Validate egress paths and travel distances.

**Description:** Checks exit count, exit capacity, and travel distances per occupancy type according to IBC requirements.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `room_ids` | `string[]` | No | all | Rooms to check |
| `occupancy_type` | `string` | No | B | Occupancy classification |
| `occupant_load` | `integer` | No | - | Override calculated occupant load |
| `sprinklered` | `boolean` | No | false | Building has sprinkler system |

**Example Request:**

```json
{
  "occupancy_type": "B",
  "sprinklered": true
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "compliant": true,
    "rooms": [
      {
        "room_id": "room-001",
        "occupant_load": 45,
        "exits_required": 2,
        "exits_provided": 2,
        "max_travel_distance": 75.0,
        "actual_travel_distance": 42.5,
        "compliant": true
      }
    ],
    "total_exit_capacity": 200,
    "total_occupant_load": 120
  }
}
```

---

## check_door_clearances

Check door swing and maneuvering clearances for accessibility.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `door_ids` | `string[]` | No | all | Doors to check |
| `approach_type` | `string` | No | front | Approach: front, hinge, latch |
| `standard` | `string` | No | ADA | Standard: ADA, DDA |

**Example Response:**

```json
{
  "success": true,
  "data": {
    "doors": [
      {
        "door_id": "door-001",
        "clearance_required": {
          "push_side": 1.22,
          "pull_side": 1.52
        },
        "clearance_actual": {
          "push_side": 1.5,
          "pull_side": 1.8
        },
        "compliant": true
      }
    ]
  }
}
```

---

## check_stair_compliance

Check stair dimension compliance (riser, tread, width, headroom).

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `stair_ids` | `string[]` | No | all | Stairs to check |
| `code` | `string` | No | IBC | Building code: IBC, NFPA, ADA |

**Example Response:**

```json
{
  "success": true,
  "data": {
    "stairs": [
      {
        "stair_id": "stair-001",
        "riser_height": {
          "actual": 0.18,
          "min": 0.10,
          "max": 0.18,
          "compliant": true
        },
        "tread_depth": {
          "actual": 0.28,
          "min": 0.28,
          "compliant": true
        },
        "width": {
          "actual": 1.12,
          "min": 1.10,
          "compliant": true
        },
        "headroom": {
          "actual": 2.10,
          "min": 2.03,
          "compliant": true
        }
      }
    ]
  }
}
```

---

## detect_clashes

Detect element intersections and clashes.

**Description:** Uses bounding box intersection with configurable tolerance. Returns hard clashes (intersections), clearance violations, and potential duplicates.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_ids` | `string[]` | No | all | Elements to check |
| `tolerance` | `number` | No | 0.001 | Distance tolerance (meters) |
| `clearance` | `number` | No | 0.0 | Minimum clearance distance |
| `ignore_same_type` | `boolean` | No | false | Ignore same-type clashes |

**Example Request:**

```json
{
  "tolerance": 0.001,
  "clearance": 0.05,
  "ignore_same_type": true
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "clashes": [
      {
        "type": "hard_clash",
        "element_a": "wall-001",
        "element_b": "door-002",
        "overlap_volume": 0.05,
        "location": [5.0, 3.0, 1.0]
      },
      {
        "type": "clearance_violation",
        "element_a": "door-001",
        "element_b": "column-001",
        "distance": 0.03,
        "required_clearance": 0.05
      }
    ],
    "summary": {
      "hard_clashes": 1,
      "clearance_violations": 1,
      "duplicates": 0
    }
  }
}
```

---

## detect_clashes_between_sets

Detect clashes between two sets of elements.

**Description:** Useful for checking specific element groups (e.g., structural vs architectural, new elements vs existing).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `set_a_ids` | `string[]` | Yes | First set of element UUIDs |
| `set_b_ids` | `string[]` | Yes | Second set of element UUIDs |
| `tolerance` | `number` | No | Distance tolerance |
| `clearance` | `number` | No | Minimum clearance |

**Example Request:**

```json
{
  "set_a_ids": ["wall-001", "wall-002"],
  "set_b_ids": ["column-001", "beam-001"],
  "tolerance": 0.001
}
```

---

## Compliance Codes Reference

### ADA (Americans with Disabilities Act)

| Code | Description |
|------|-------------|
| ADA-404.2.3 | Door clear width minimum 32" (0.81m) |
| ADA-404.2.4 | Maneuvering clearance requirements |
| ADA-403.5.1 | Corridor width minimum 36" (0.91m) |
| ADA-304.3 | Turning space 60" (1.52m) diameter |

### IBC (International Building Code)

| Code | Description |
|------|-------------|
| IBC-1005.1 | Egress width per occupant |
| IBC-1006.2 | Number of exits required |
| IBC-1017.1 | Maximum travel distance |
| IBC-1011.5 | Stair dimension requirements |

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32602 | INVALID_PARAMS | Invalid or missing parameters |
| 1001 | ELEMENT_NOT_FOUND | Referenced element does not exist |
| 1002 | CONSTRAINT_VIOLATION | Validation constraint violated |
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
