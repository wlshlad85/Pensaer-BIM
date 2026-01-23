# Geometry Server API

> MCP tool server for creating and manipulating BIM geometry.

**Server:** `geometry-server`
**Transport:** stdio
**Version:** 1.0.0

---

## Overview

The Geometry Server provides tools for creating, modifying, and querying BIM elements including walls, floors, roofs, rooms, doors, and windows. It also handles mesh generation, selection management, and group operations.

All dimensions are in **meters** unless otherwise specified.

---

## Tool Categories

| Category | Tools |
|----------|-------|
| [Wall Tools](#wall-tools) | create_wall, create_rectangular_walls |
| [Floor Tools](#floor-tools) | create_floor |
| [Roof Tools](#roof-tools) | create_roof, attach_roof_to_walls |
| [Room Tools](#room-tools) | create_room |
| [Opening Tools](#opening-tools) | place_door, place_window, create_opening |
| [Element Operations](#element-operations) | get_element, list_elements, delete_element, modify_element |
| [Mesh Tools](#mesh-tools) | generate_mesh, compute_mesh, compute_mesh_batch, validate_mesh |
| [Selection Tools](#selection-tools) | select_elements, get_selection, clear_selection, select_by_type |
| [Group Tools](#group-tools) | create_group, add_to_group, remove_from_group, delete_group, get_group, list_groups, select_group |
| [Analysis Tools](#analysis-tools) | detect_joins, detect_rooms, analyze_wall_topology, detect_clashes, detect_clashes_between_sets |
| [Building Tools](#building-tools) | create_simple_building |
| [State Tools](#state-tools) | get_state_summary, get_self_healing_status |

---

## Wall Tools

### create_wall

Create a single wall segment from start to end point.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `start` | `[number, number]` | Yes | - | Start point (x, y) in meters |
| `end` | `[number, number]` | Yes | - | End point (x, y) in meters |
| `height` | `number` | No | 3.0 | Wall height in meters |
| `thickness` | `number` | No | 0.2 | Wall thickness in meters |
| `wall_type` | `string` | No | basic | One of: basic, structural, curtain, retaining |
| `level_id` | `string` | No | - | UUID of hosting level |
| `reasoning` | `string` | No | - | AI agent reasoning for audit trail |

**Example Request:**

```json
{
  "start": [0, 0],
  "end": [10, 0],
  "height": 3.0,
  "thickness": 0.25,
  "wall_type": "structural"
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "wall-a1b2c3d4",
    "element_type": "wall",
    "start": [0, 0],
    "end": [10, 0],
    "height": 3.0,
    "thickness": 0.25,
    "wall_type": "structural",
    "length": 10.0
  },
  "event_id": "evt-123456"
}
```

---

### create_rectangular_walls

Create 4 walls forming a rectangle from two corner points.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `min_point` | `[number, number]` | Yes | - | Minimum corner (x, y) |
| `max_point` | `[number, number]` | Yes | - | Maximum corner (x, y) |
| `height` | `number` | No | 3.0 | Wall height in meters |
| `thickness` | `number` | No | 0.2 | Wall thickness in meters |
| `reasoning` | `string` | No | - | AI agent reasoning |

**Example Request:**

```json
{
  "min_point": [0, 0],
  "max_point": [10, 8],
  "height": 3.0,
  "thickness": 0.2
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "walls": [
      { "id": "wall-001", "start": [0, 0], "end": [10, 0] },
      { "id": "wall-002", "start": [10, 0], "end": [10, 8] },
      { "id": "wall-003", "start": [10, 8], "end": [0, 8] },
      { "id": "wall-004", "start": [0, 8], "end": [0, 0] }
    ],
    "wall_ids": ["wall-001", "wall-002", "wall-003", "wall-004"]
  }
}
```

---

## Floor Tools

### create_floor

Create a floor slab element.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `min_point` | `[number, number]` | Yes | - | Minimum corner (x, y) |
| `max_point` | `[number, number]` | Yes | - | Maximum corner (x, y) |
| `thickness` | `number` | No | 0.3 | Floor thickness in meters |
| `floor_type` | `string` | No | slab | One of: slab, suspended, foundation |
| `level_id` | `string` | No | - | UUID of hosting level |
| `reasoning` | `string` | No | - | AI agent reasoning |

**Example Request:**

```json
{
  "min_point": [0, 0],
  "max_point": [10, 8],
  "thickness": 0.15,
  "floor_type": "slab"
}
```

---

## Roof Tools

### create_roof

Create a roof element with various roof types.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `min_point` | `[number, number]` | Yes | - | Minimum corner (x, y) |
| `max_point` | `[number, number]` | Yes | - | Maximum corner (x, y) |
| `thickness` | `number` | No | 0.25 | Roof thickness in meters |
| `roof_type` | `string` | No | flat | One of: flat, gable, hip, shed, mansard |
| `slope_degrees` | `number` | No | 30.0 | Slope angle (0-85 degrees) |
| `ridge_along_x` | `boolean` | No | true | Ridge direction (true=X-axis) |
| `eave_overhang` | `number` | No | 0.3 | Eave overhang in meters |
| `base_elevation` | `number` | No | 0.0 | Base elevation (height above ground) |
| `reasoning` | `string` | No | - | AI agent reasoning |

**Example Request:**

```json
{
  "min_point": [0, 0],
  "max_point": [10, 8],
  "roof_type": "gable",
  "slope_degrees": 30,
  "eave_overhang": 0.5
}
```

---

### attach_roof_to_walls

Attach a roof to walls for visualization and join computation.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `roof_id` | `string` | Yes | - | UUID of the roof element |
| `wall_ids` | `string[]` | Yes | - | UUIDs of walls to attach |
| `reasoning` | `string` | No | - | AI agent reasoning |

---

## Room Tools

### create_room

Create a room element with defined boundary.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | Yes | - | Room name (e.g., "Living Room") |
| `number` | `string` | Yes | - | Room number (e.g., "101") |
| `min_point` | `[number, number]` | Yes | - | Minimum corner (x, y) |
| `max_point` | `[number, number]` | Yes | - | Maximum corner (x, y) |
| `height` | `number` | No | 3.0 | Room height in meters |
| `reasoning` | `string` | No | - | AI agent reasoning |

---

## Opening Tools

### place_door

Place a door in an existing wall.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `wall_id` | `string` | Yes | - | UUID of the host wall |
| `offset` | `number` | Yes | - | Distance from wall start to door center (meters) |
| `width` | `number` | No | 0.9 | Door width in meters |
| `height` | `number` | No | 2.1 | Door height in meters |
| `door_type` | `string` | No | single | One of: single, double, sliding, folding, revolving, pocket |
| `swing` | `string` | No | left | Swing direction: left, right, both, none |
| `reasoning` | `string` | No | - | AI agent reasoning |

**Example Request:**

```json
{
  "wall_id": "wall-a1b2c3d4",
  "offset": 5.0,
  "width": 1.0,
  "height": 2.2,
  "door_type": "double",
  "swing": "both"
}
```

---

### place_window

Place a window in an existing wall.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `wall_id` | `string` | Yes | - | UUID of the host wall |
| `offset` | `number` | Yes | - | Distance from wall start to window center (meters) |
| `width` | `number` | No | 1.2 | Window width in meters |
| `height` | `number` | No | 1.0 | Window height in meters |
| `sill_height` | `number` | No | 0.9 | Height from floor to window sill (meters) |
| `window_type` | `string` | No | fixed | One of: fixed, casement, double_hung, sliding, awning, hopper, pivot |
| `reasoning` | `string` | No | - | AI agent reasoning |

---

### create_opening

Create a generic opening in a wall.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `host_id` | `string` | Yes | - | UUID of the host wall |
| `offset` | `number` | Yes | - | Distance from wall start to opening center |
| `width` | `number` | Yes | - | Opening width in meters |
| `height` | `number` | Yes | - | Opening height in meters |
| `base_height` | `number` | No | 0.0 | Height from floor to opening base |
| `opening_type` | `string` | No | generic | One of: door, window, generic |
| `reasoning` | `string` | No | - | AI agent reasoning |

---

## Element Operations

### get_element

Get an element by its UUID.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `element_id` | `string` | Yes | UUID of the element |

---

### list_elements

List elements with optional filtering.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `category` | `string` | No | - | Filter by: wall, floor, door, window, room, roof |
| `level_id` | `string` | No | - | Filter by level UUID |
| `limit` | `integer` | No | 100 | Maximum results (1-1000) |
| `offset` | `integer` | No | 0 | Results to skip |

---

### delete_element

Delete one or more elements.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `element_ids` | `string[]` | Yes | UUIDs of elements to delete |
| `reasoning` | `string` | No | AI agent reasoning |

---

### modify_element

Modify an element's properties and/or geometry.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `element_id` | `string` | Yes | UUID of the element |
| `properties` | `object` | No | Properties to update (partial update) |
| `geometry` | `object` | No | Geometry parameters to update |
| `reasoning` | `string` | No | AI agent reasoning |

**Note:** At least one of `properties` or `geometry` must be provided.

---

## Mesh Tools

### compute_mesh

Compute a 3D mesh for an element with full features.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_id` | `string` | Yes | - | UUID of the element |
| `include_normals` | `boolean` | No | true | Include vertex normals |
| `include_uvs` | `boolean` | No | false | Include UV coordinates |
| `lod_level` | `integer` | No | 0 | Level of detail (0=full, 1=medium, 2=low) |
| `format` | `string` | No | gltf | Output format: gltf, json, obj |

**Example Response (gltf format):**

```json
{
  "success": true,
  "data": {
    "vertices": [0, 0, 0, 10, 0, 0, 10, 3, 0, 0, 3, 0, ...],
    "indices": [0, 1, 2, 0, 2, 3, ...],
    "normals": [0, 0, 1, 0, 0, 1, ...],
    "vertex_count": 24,
    "face_count": 12
  }
}
```

---

### compute_mesh_batch

Generate meshes for multiple elements at once.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_ids` | `string[]` | Yes | - | List of element UUIDs |
| `merge` | `boolean` | No | false | Merge all meshes into one |
| `format` | `string` | No | json | Output format: json, obj |
| `compute_normals` | `boolean` | No | true | Compute vertex normals |

---

### generate_mesh / validate_mesh

Generate or validate a mesh for an element.

---

## Selection Tools

### select_elements

Select one or more BIM elements.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_ids` | `string[]` | Yes | - | UUIDs of elements to select |
| `mode` | `string` | No | replace | Mode: replace, add, remove, toggle |
| `reasoning` | `string` | No | - | AI agent reasoning |

---

### get_selection

Get the current selection.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `include_details` | `boolean` | No | false | Include full element properties |
| `category` | `string` | No | - | Filter by element type |

---

### clear_selection

Clear all selected elements.

---

### select_by_type

Select all elements of a specific type.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_type` | `string` | Yes | - | Element type: wall, floor, door, window, room, roof |
| `mode` | `string` | No | replace | Mode: replace, add, toggle |

---

## Group Tools

### create_group

Create a named group of elements.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Name for the group |
| `element_ids` | `string[]` | Yes | UUIDs of elements to include |
| `metadata` | `object` | No | Optional metadata |
| `reasoning` | `string` | No | AI agent reasoning |

---

### add_to_group / remove_from_group

Add or remove elements from an existing group.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `group_id` | `string` | Yes | UUID of the group |
| `element_ids` | `string[]` | Yes | UUIDs of elements |

---

### delete_group

Delete a group (elements remain in model).

---

### get_group / list_groups / select_group

Query and select groups.

---

## Analysis Tools

### detect_rooms

Detect enclosed rooms from walls using topology analysis.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `wall_ids` | `string[]` | No | all | UUIDs of walls to analyze |
| `tolerance` | `number` | No | 0.0005 | Distance tolerance for node merging (meters) |

---

### analyze_wall_topology

Analyze the topology of a wall network.

Returns node count, edge count, room count, connectivity status, and detailed room information.

---

### detect_clashes

Detect geometric clashes between BIM elements.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `element_ids` | `string[]` | No | all | UUIDs of elements to check |
| `tolerance` | `number` | No | 0.001 | Distance tolerance (meters) |
| `clearance` | `number` | No | 0.0 | Minimum clearance distance |
| `ignore_same_type` | `boolean` | No | false | Ignore same-type clashes |

---

### detect_clashes_between_sets

Detect clashes between two sets of elements.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `set_a_ids` | `string[]` | Yes | First set of element UUIDs |
| `set_b_ids` | `string[]` | Yes | Second set of element UUIDs |
| `tolerance` | `number` | No | Distance tolerance |
| `clearance` | `number` | No | Minimum clearance |

---

## Building Tools

### create_simple_building

Create a simple rectangular building with walls, floor, and room.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `min_point` | `[number, number]` | Yes | - | Minimum corner |
| `max_point` | `[number, number]` | Yes | - | Maximum corner |
| `wall_height` | `number` | No | 3.0 | Wall height |
| `wall_thickness` | `number` | No | 0.2 | Wall thickness |
| `floor_thickness` | `number` | No | 0.3 | Floor thickness |
| `room_name` | `string` | Yes | - | Room name |
| `room_number` | `string` | Yes | - | Room number |

---

## State Tools

### get_state_summary

Get a summary of the current model state including element counts by type.

### get_self_healing_status

Get self-healing system status including corrections made and circuit breaker state.

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32602 | INVALID_PARAMS | Invalid or missing parameters |
| 1001 | ELEMENT_NOT_FOUND | Referenced element does not exist |
| 1002 | CONSTRAINT_VIOLATION | Operation violates model constraints |
| 1003 | PERMISSION_DENIED | Operation not permitted |
| 1004 | APPROVAL_REQUIRED | Human approval required |
| 1005 | INTERNAL_ERROR | Internal server error |

---

## Response Format

All responses follow the MCPResponse envelope:

```json
{
  "success": true,
  "data": { ... },
  "event_id": "evt-123456",
  "timestamp": "2026-01-20T07:00:00Z",
  "warnings": [],
  "audit": {
    "user_id": null,
    "agent_id": "agent-001",
    "reasoning": "Creating wall for building perimeter"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": 1001,
    "message": "Element not found: wall-xyz"
  },
  "event_id": "evt-123457",
  "timestamp": "2026-01-20T07:00:01Z"
}
```
