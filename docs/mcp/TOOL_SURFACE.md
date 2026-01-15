# Pensaer MCP Tool Surface

**Version:** 1.0  
**Date:** January 15, 2026  
**Status:** Authoritative Reference  
**Total Tools:** 33+

---

## Tool Inventory by Server

### Geometry Server (12 tools)

| Tool | Purpose | Parameters | Returns |
|------|---------|------------|---------|
| `create_wall` | Create wall element | `start: (x,y)`, `end: (x,y)`, `height: mm`, `thickness: mm`, `wall_type: str`, `level_id: uuid` | `wall_id`, `event_id` |
| `create_floor` | Create floor/slab | `boundary_points: [(x,y)]`, `thickness: mm`, `level_id: uuid` | `floor_id`, `event_id` |
| `create_roof` | Create roof element | `boundary_points: [(x,y)]`, `slope: deg`, `thickness: mm` | `roof_id`, `event_id` |
| `create_column` | Create structural column | `location: (x,y)`, `base_level: uuid`, `top_level: uuid`, `profile: str` | `column_id`, `event_id` |
| `create_opening` | Cut opening in host | `host_id: uuid`, `location: (x,y,z)`, `width: mm`, `height: mm`, `opening_type: str` | `opening_id`, `event_id` |
| `place_door` | Place door in wall | `wall_id: uuid`, `offset: mm`, `width: mm`, `height: mm`, `door_type: str` | `door_id`, `event_id` |
| `place_window` | Place window in wall | `wall_id: uuid`, `offset: mm`, `width: mm`, `height: mm`, `sill_height: mm` | `window_id`, `event_id` |
| `boolean_operation` | CSG operations | `element_a: uuid`, `element_b: uuid`, `operation: union|subtract|intersect` | `result_id`, `event_id` |
| `join_elements` | Create element joins | `element_ids: [uuid]`, `join_type: str` | `join_id`, `event_id` |
| `modify_parameter` | Update element property | `element_id: uuid`, `parameter_name: str`, `value: any` | `event_id` |
| `move_element` | Relocate element | `element_id: uuid`, `delta: (x,y,z)` | `event_id` |
| `copy_element` | Duplicate element | `element_id: uuid`, `to_location: (x,y,z)`, `to_level: uuid?` | `new_id`, `event_id` |

---

### Spatial Server (8 tools)

| Tool | Purpose | Parameters | Returns |
|------|---------|------------|---------|
| `room_analysis` | Analyze room properties | `room_id: uuid` | `area`, `volume`, `perimeter`, `adjacencies[]` |
| `circulation_check` | Path analysis | `model_id: uuid`, `start: (x,y,z)`, `end: (x,y,z)` | `path[]`, `distance`, `obstacles[]` |
| `adjacency_matrix` | Room relationships | `level_id: uuid` | `matrix: {room_id: {room_id: bool}}` |
| `spatial_query` | Find elements in bounds | `bounds: bbox`, `categories: [str]` | `element_ids[]` |
| `path_finding` | Route between rooms | `from_room: uuid`, `to_room: uuid` | `path[]`, `distance` |
| `bounding_analysis` | Find bounding elements | `element_id: uuid` | `bounding_elements[]` |
| `level_elements` | Elements on level | `level_id: uuid`, `categories: [str]?` | `element_ids[]` |
| `relationship_query` | Query element relationships | `element_id: uuid`, `relationship_type: str` | `related_elements[]` |

---

### Validation Server (8 tools)

| Tool | Purpose | Parameters | Returns |
|------|---------|------------|---------|
| `clash_detection` | Find geometric clashes | `source_category: str`, `target_category: str`, `tolerance: mm` | `clashes[]` |
| `code_compliance` | Check building codes | `model_id: uuid`, `standard: str`, `severity_threshold: str` | `issues[]` |
| `accessibility_check` | ADA/DDA compliance | `model_id: uuid`, `standard: ADA|DDA|both` | `violations[]` |
| `validate_constraints` | Check parametric rules | `element_ids: [uuid]` | `constraint_errors[]` |
| `fire_rating_check` | Fire compartment validation | `model_id: uuid` | `violations[]`, `recommendations[]` |
| `egress_analysis` | Emergency exit analysis | `model_id: uuid`, `occupancy: int` | `paths[]`, `compliance: bool` |
| `structural_check` | Basic structural validation | `model_id: uuid` | `warnings[]` |
| `data_completeness` | Check required properties | `element_ids: [uuid]`, `required_params: [str]` | `missing[]` |

---

### Documentation Server (7 tools)

| Tool | Purpose | Parameters | Returns |
|------|---------|------------|---------|
| `generate_schedule` | Create element schedule | `category: str`, `parameters: [str]`, `filters: {}` | `schedule_data[]` |
| `create_section` | Generate section view | `cut_plane: plane`, `depth: mm`, `scale: str` | `view_id` |
| `create_plan` | Generate floor plan | `level_id: uuid`, `scale: str` | `view_id` |
| `quantity_takeoff` | Material quantities | `categories: [str]`, `grouping: str` | `quantities[]` |
| `export_ifc` | Export to IFC | `model_id: uuid`, `schema: IFC2x3|IFC4|IFC4.3`, `mvd: str` | `file_path` |
| `export_bcf` | Export issues to BCF | `issues: [uuid]`, `project_info: {}` | `file_path` |
| `create_sheet` | Create drawing sheet | `views: [uuid]`, `title_block: str` | `sheet_id` |

---

## Parameter Type Reference

### Common Types

```typescript
type UUID = string;  // "550e8400-e29b-41d4-a716-446655440000"
type Point2D = [number, number];  // [x, y] in mm
type Point3D = [number, number, number];  // [x, y, z] in mm
type BoundingBox = { min: Point3D, max: Point3D };
type Plane = { origin: Point3D, normal: Point3D };
```

### Element Categories

```typescript
type ElementCategory = 
  | "Walls" | "Doors" | "Windows" | "Floors" 
  | "Roofs" | "Columns" | "Beams" | "Stairs"
  | "Rooms" | "Furniture" | "Equipment";
```

### Standards Codes

```typescript
type ComplianceStandard = 
  | "IBC"       // International Building Code
  | "BS9999"    // UK Fire Safety
  | "ADA"       // Americans with Disabilities Act
  | "DDA"       // UK Disability Discrimination Act
  | "ISO19650"  // Information Management
  | "Eurocode"; // European structural standards
```

---

## Response Envelope

All tools return a consistent envelope:

```json
{
  "success": true,
  "data": { /* tool-specific response */ },
  "event_id": "uuid",
  "timestamp": "2026-01-15T10:30:00Z",
  "warnings": [],
  "audit": {
    "user_id": "uuid",
    "agent_id": "uuid|null",
    "reasoning": "string|null"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": 1002,
    "message": "Constraint violation: door width exceeds wall length",
    "data": {
      "element_id": "uuid",
      "constraint": "door_fits_in_wall",
      "violation_detail": "..."
    }
  },
  "event_id": null,
  "timestamp": "2026-01-15T10:30:00Z"
}
```

---

## Usage Examples

### Create a Simple Room

```python
# 1. Create walls
wall1 = await geometry.create_wall(
    start=(0, 0), end=(5000, 0), 
    height=3000, thickness=200,
    wall_type="interior", level_id=level_01
)

wall2 = await geometry.create_wall(
    start=(5000, 0), end=(5000, 4000),
    height=3000, thickness=200,
    wall_type="interior", level_id=level_01
)

# ... walls 3 and 4

# 2. Place door
door = await geometry.place_door(
    wall_id=wall1["wall_id"],
    offset=1000, width=900, height=2100,
    door_type="single_swing"
)

# 3. Analyze room
room = await spatial.room_analysis(room_id=auto_detected_room)
print(f"Area: {room['area']}mm², Volume: {room['volume']}mm³")

# 4. Check compliance
issues = await validation.code_compliance(
    model_id=current_model,
    standard="IBC",
    severity_threshold="warning"
)
```

### Batch Clash Detection

```python
# Find all MEP vs Structure clashes
clashes = await validation.clash_detection(
    source_category="MEP",
    target_category="Structure",
    tolerance=25  # 25mm tolerance
)

for clash in clashes["clashes"]:
    print(f"Clash: {clash['element_a']} ↔ {clash['element_b']}")
    print(f"  Location: {clash['intersection_point']}")
    print(f"  Overlap: {clash['overlap_volume']}mm³")
```

---

## Rate Limits & Quotas

| Tier | Requests/min | Elements/operation | Concurrent |
|------|--------------|-------------------|------------|
| Free | 60 | 100 | 1 |
| Pro | 300 | 1,000 | 5 |
| Enterprise | Unlimited | 10,000 | 20 |

---

## Related Documents

- [SERVER_DESIGN.md](./SERVER_DESIGN.md) — Server architecture and patterns
- [CANONICAL_ARCHITECTURE.md](../architecture/CANONICAL_ARCHITECTURE.md) — System architecture
- [TECH_STACK.md](../architecture/TECH_STACK.md) — Technology decisions

---

*This is the complete tool inventory for Pensaer MCP servers.*
