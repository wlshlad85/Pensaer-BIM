# Part 5: Rust Kernel Reference

> **Pensaer Engineering Encyclopedia** | CTO Office | 2 Feb 2026

---

## Overview

The Rust kernel is Pensaer's computational backbone — ~14,000 lines of Rust across 4 crates providing geometry, math, CRDT sync, and IFC interoperability. It compiles to both a native Rust library and a Python extension (via PyO3) for use by the FastAPI server.

**Critical Blocker:** PyO3 bindings aren't currently built for the Docker runtime — the server falls back to pure Python geometry. Fixing this (`maturin develop --features python`) is a P0.

```
kernel/
├── pensaer-math/       (3,962 lines)  Mathematical primitives
├── pensaer-geometry/   (9,653 lines)  BIM geometry & mesh generation
├── pensaer-crdt/       (510 lines)    CRDT sync (Loro-based)
├── pensaer-ifc/        (1,850 lines)  IFC import/export
└── pensaer-kernel-stub.rs (42 lines)  Docker health-check stub
```

---

## Crate 1: pensaer-math (3,962 lines)

**Purpose:** Low-level mathematical types and algorithms. Zero BIM knowledge — pure math.

**Dependencies:** serde, thiserror, robust (Shewchuk's adaptive precision predicates)  
**Dev Dependencies:** approx, proptest (property-based testing)

### Module Tree

| Module | Lines | Purpose |
|--------|-------|---------|
| `lib.rs` | 172 | Re-exports, module declarations |
| `point.rs` | 188 | Point2, Point3 types |
| `vector.rs` | 641 | Vector2, Vector3 with full ops |
| `line.rs` | 603 | Line2, LineSegment2, intersections |
| `polygon.rs` | 530 | Polygon2 — area, centroid, containment, convex hull |
| `bbox.rs` | 333 | BoundingBox2, BoundingBox3 — AABB collision |
| `transform.rs` | 305 | Transform2, Transform3 — affine transformations |
| `guards.rs` | 295 | Runtime guards for geometric validity |
| `robust_predicates.rs` | 681 | Shewchuk-based orient2d, incircle, collinearity |
| `error.rs` | 38 | Error types |

### Key Types

```rust
// Point2 — 2D coordinate (immutable, Copy)
pub struct Point2 { pub x: f64, pub y: f64 }
// Methods: new(), distance_to(), midpoint_to(), lerp(), translate()

// Point3 — 3D coordinate
pub struct Point3 { pub x: f64, pub y: f64, pub z: f64 }

// Vector2 — 2D direction/magnitude
pub struct Vector2 { pub x: f64, pub y: f64 }
// Methods: length(), normalize(), dot(), cross(), angle_to(), perpendicular(), rotate()

// Vector3 — 3D direction/magnitude  
pub struct Vector3 { pub x: f64, pub y: f64, pub z: f64 }
// Methods: length(), normalize(), dot(), cross(), angle_between()

// Line2 — infinite line from point + direction
pub struct Line2 { pub origin: Point2, pub direction: Vector2 }

// LineSegment2 — finite line between two points
pub struct LineSegment2 { pub start: Point2, pub end: Point2 }
// Methods: length(), midpoint(), direction(), intersection(), distance_to_point(), project_point()

// Polygon2 — closed polygon from vertices
pub struct Polygon2 { pub vertices: Vec<Point2> }
// Methods: area(), signed_area(), centroid(), contains_point(), is_convex(), convex_hull(), bounding_box()

// BoundingBox2 — axis-aligned bounding box
pub struct BoundingBox2 { pub min: Point2, pub max: Point2 }
// Methods: new(), contains(), intersects(), union(), expand(), center(), area()

// Transform2 — 2D affine transformation (3x3 matrix)
pub struct Transform2 { pub matrix: [[f64; 3]; 3] }
// Methods: identity(), translate(), rotate(), scale(), compose(), apply_point(), apply_vector(), inverse()
```

### Robust Predicates

Uses Shewchuk's adaptive-precision arithmetic for exact geometric decisions:

- `orient2d(a, b, c)` → positive if CCW, negative if CW, zero if collinear
- `incircle(a, b, c, d)` → positive if d is inside circle through a,b,c
- `is_collinear(a, b, c)` → exact collinearity test
- `segments_intersect(a1, a2, b1, b2)` → robust segment intersection

### Testing

- **Property-based tests** via proptest: tests mathematical invariants (e.g., vector normalization always yields unit length, polygon area is always non-negative for CCW vertices)
- **proptest-regressions/** stores regression cases
- Run: `cd kernel/pensaer-math && cargo test`

---

## Crate 2: pensaer-geometry (9,653 lines)

**Purpose:** BIM-aware geometry — elements, mesh generation, spatial indexing, topology, wall joins, and Python bindings.

**Dependencies:** pensaer-math, uuid, serde, serde_json, rstar (R*-tree), geo, geo-clipper (boolean ops), earcutr (triangulation), robust, pyo3 (optional)

### Module Tree

| Module | Lines | Purpose |
|--------|-------|---------|
| **Root** | | |
| `lib.rs` | 216 | Public API, module declarations |
| `element.rs` | 99 | Base element trait and types |
| `exec.rs` | 282 | Command execution engine |
| `constants.rs` | 88 | Physical constants (min wall thickness, etc.) |
| `error.rs` | 47 | Geometry error types |
| `io.rs` | 215 | Serialization/deserialization |
| **elements/** | | BIM element geometry |
| `wall.rs` | 382 | Wall geometry, offsets, profiles |
| `floor.rs` | 279 | Floor/slab geometry |
| `roof.rs` | 724 | Roof types (gable, hip, flat, shed, mansard) |
| `room.rs` | 327 | Room/space geometry, area calculation |
| `opening.rs` | 323 | Door/window openings in walls |
| **mesh/** | | 3D mesh generation |
| `mod.rs` | 416 | Mesh types, vertex/face data |
| `extrude.rs` | 593 | Profile extrusion (walls → 3D) |
| `triangulate.rs` | 553 | Ear-cutting triangulation |
| **spatial/** | | Spatial indexing & queries |
| `mod.rs` | 79 | Spatial index public API |
| `clash.rs` | 533 | Clash detection (AABB + detailed) |
| `edge_index.rs` | 164 | R*-tree edge spatial index |
| `node_index.rs` | 167 | R*-tree node spatial index |
| `predicates.rs` | 246 | Spatial predicates (contains, intersects) |
| **topology/** | | Topological graph |
| `mod.rs` | 112 | Topology public API |
| `graph.rs` | 1,082 | Halfedge topology graph |
| `node.rs` | 132 | Topology vertices |
| `edge.rs` | 191 | Topology edges/halfedges |
| `room.rs` | 135 | Room detection from wall topology |
| **joins/** | | Wall join system |
| `mod.rs` | 411 | Join public API |
| `detect.rs` | 400 | Join detection (T-join, L-join, cross) |
| `miter.rs` | 342 | Miter/bevel join geometry |
| **fixup/** | | Self-healing geometry repair |
| `mod.rs` | 703 | Geometry validation + auto-repair |
| **bindings/** | | Python FFI |
| `mod.rs` | 87 | PyO3 module registration |
| `functions.rs` | 894 | Python-callable functions |
| `types.rs` | 1,239 | Python type wrappers |

### Element Geometry

Each BIM element type has geometry functions:

**Wall** (`elements/wall.rs`):
- `WallGeometry::new(start, end, height, thickness)` — creates wall from centerline
- `offset_line()` — generates inner/outer face lines
- `profile()` — returns 2D cross-section polygon
- `contains_point()` — point-in-wall test
- `split_at()` — split wall at parameter t
- `hosting_zone()` — valid zone for door/window placement

**Floor** (`elements/floor.rs`):
- `FloorGeometry::from_boundary(points, thickness)` — slab from boundary
- `FloorGeometry::from_rect(min, max, thickness)` — rectangular slab
- `area()`, `centroid()`, `bounding_box()`

**Roof** (`elements/roof.rs`):
- `RoofGeometry::gable(boundary, slope, ridge_direction)` 
- `RoofGeometry::hip(boundary, slope)`
- `RoofGeometry::flat(boundary, thickness)`
- `RoofGeometry::shed(boundary, slope, direction)`
- `RoofGeometry::mansard(boundary, lower_slope, upper_slope)`
- Each generates 3D mesh with proper ridge/eave geometry

**Opening** (`elements/opening.rs`):
- `OpeningGeometry::new(wall, offset, width, height, sill_height)` — cut in wall
- `boolean_subtract()` — CSG subtraction from wall geometry
- `validate_placement()` — checks opening fits within wall bounds

### Mesh Generation

Converts 2D profiles to 3D meshes for Three.js rendering:

- `extrude_profile(polygon, height)` → Mesh with vertices, normals, UVs
- `triangulate_polygon(vertices)` → triangle indices via ear-cutting
- `Mesh` struct: `vertices: Vec<[f64; 3]>`, `normals: Vec<[f64; 3]>`, `uvs: Vec<[f64; 2]>`, `indices: Vec<u32>`

### Spatial Indexing

R*-tree based spatial queries:

- `SpatialIndex::insert(id, bbox)` — add element to index
- `SpatialIndex::query_rect(bbox)` → Vec of intersecting element IDs
- `SpatialIndex::query_point(point)` → Vec of containing elements
- `SpatialIndex::nearest(point, k)` → k-nearest elements

**Clash Detection** (`spatial/clash.rs`):
- `detect_clashes(elements, tolerance)` → Vec of clash pairs
- `detect_clashes_between(set_a, set_b, tolerance)` → filtered clashes
- Two-phase: broad (AABB) then narrow (detailed geometry)

### Topology

Halfedge data structure for understanding wall connectivity:

- `TopologyGraph::new()` — empty graph
- `add_wall(start, end, id)` — insert wall segment
- `detect_rooms()` → Vec of closed room polygons
- `find_joins()` → T-joins, L-joins, crosses
- `connected_components()` → groups of connected walls

### Wall Joins

- `detect_joins(walls)` → Vec of JoinType (T, L, Cross)
- `miter_join(wall_a, wall_b)` → mitered corner geometry
- `cleanup_join(join)` → trim/extend walls to meet cleanly

### Self-Healing (fixup/)

Automatic geometry repair:

- `validate_element(element)` → Vec of issues
- `repair_element(element)` → fixed element + list of repairs made
- Common repairs: snap near-zero coords, clamp to bounds, minimum dimensions, degenerate polygon removal

### PyO3 Bindings

**When built with `--features python`**, exposes to Python:

```python
import pensaer_geometry as pg

# Create wall
wall = pg.create_wall(start=(0,0), end=(10,0), height=3.0, thickness=0.2)

# Generate mesh
mesh = pg.wall_mesh(wall)

# Clash detection
clashes = pg.detect_clashes(elements, tolerance=0.01)

# Topology
graph = pg.TopologyGraph()
graph.add_wall((0,0), (10,0), "wall-1")
rooms = graph.detect_rooms()
```

**Key functions exposed** (`bindings/functions.rs`, 894 lines):
- `create_wall`, `create_floor`, `create_roof`, `create_room`
- `wall_mesh`, `floor_mesh`, `roof_mesh`
- `detect_clashes`, `detect_clashes_between`
- `analyze_topology`, `detect_rooms`
- `validate_model`, `repair_model`

**Python type wrappers** (`bindings/types.rs`, 1,239 lines):
- PyWall, PyFloor, PyRoof, PyRoom, PyOpening
- PyMesh, PyClash, PyTopologyResult
- PyPoint2, PyVector2, PyBoundingBox2

### How to Build

```bash
# Rust library only
cd kernel && cargo build --release

# With Python bindings
cd kernel/pensaer-geometry && maturin develop --features python

# Run tests
cd kernel && cargo test --all
```

### Known Issues

1. **PyO3 not built for Docker** — server falls back to pure Python. Fix: add `maturin develop` to Dockerfile
2. **Roof geometry edge cases** — mansard roof can produce degenerate triangles with very steep slopes
3. **Join detection** — only handles axis-aligned walls reliably; angled joins may produce artifacts
4. **No column/beam geometry** — types are defined in the client but no Rust geometry implementation exists

---

## Crate 3: pensaer-crdt (510 lines)

**Purpose:** CRDT-based real-time collaboration using Loro.

**Dependencies:** None specified in Cargo.toml (minimal crate)

### Module: `lib.rs` (510 lines)

Implements a document-level CRDT for BIM model synchronization:

- `CrdtDocument::new()` — create new collaborative document
- `CrdtDocument::apply_operation(op)` — apply local edit
- `CrdtDocument::merge(remote)` — merge remote changes
- `CrdtDocument::snapshot()` — serialize current state
- `CrdtDocument::from_snapshot(data)` — restore from snapshot

**Conflict Resolution Strategy:**
- Last-writer-wins for scalar properties (name, dimensions)
- Set-union for collections (element lists)
- Operational transform for concurrent geometry edits
- Branch/merge support for design alternatives

### Status

Early implementation. The Phase 2 (Collaboration) roadmap will flesh this out with Loro CRDT integration, WebSocket transport, and multi-user sync.

---

## Crate 4: pensaer-ifc (1,850 lines)

**Purpose:** IFC (Industry Foundation Classes) import and export. The interoperability layer.

**Dependencies:** ifc_rs (0.1.0-alpha.9), pensaer-math, uuid, thiserror, serde, serde_json

### Module Tree

| Module | Lines | Purpose |
|--------|-------|---------|
| `lib.rs` | 85 | Public API, IFC version enum |
| `export.rs` | 756 | IFC STEP export (Pensaer → IFC) |
| `import.rs` | 657 | IFC STEP import (IFC → Pensaer) |
| `mapping.rs` | 201 | Type mapping between Pensaer and IFC entities |
| `error.rs` | 151 | IFC-specific error types |

### Export Pipeline

```rust
let mut exporter = IfcExporter::new("My Building", "Architect");
exporter.add_wall(wall_data);
exporter.add_room(room_data);
exporter.add_floor(floor_data);
let ifc_content = exporter.export()?;  // → IFC STEP format string
```

**Exported entity types:** IfcProject, IfcSite, IfcBuilding, IfcBuildingStorey, IfcWallStandardCase, IfcSpace, IfcSlab, IfcDoor, IfcWindow, IfcRoof

**Self-healing export:**
- `export_healing()` → (content, warnings) — validates all elements, exports even with warnings
- `add_wall_healing(wall)` → auto-repairs geometry before adding
- `validate_element(element)` → checks coordinate validity, dimension ranges

### Import Pipeline

```rust
let mut importer = IfcImporter::from_file("building.ifc")?;
let walls = importer.extract_walls()?;
let rooms = importer.extract_rooms()?;
let floors = importer.extract_floors()?;
let summary = importer.get_summary();  // HashMap<EntityType, Count>
```

**Self-healing import:**
- `extract_walls_healing()` → HealingImportResult with elements, skipped count, repaired count, error log
- Auto-repairs: snap coordinates, clamp dimensions, generate UUIDs for missing GlobalIds
- Never crashes on malformed IFC — skips unrecoverable entities with detailed logging

### Type Mapping (`mapping.rs`)

| Pensaer Type | IFC Entity |
|-------------|------------|
| Wall | IfcWallStandardCase |
| Door | IfcDoor |
| Window | IfcWindow |
| Floor | IfcSlab |
| Room | IfcSpace |
| Roof | IfcRoof |
| Column | IfcColumn |
| Beam | IfcBeam |
| Stair | IfcStair |
| Opening | IfcOpeningElement |

### Testing

Each crate has `#[cfg(test)] mod tests` inline:
- pensaer-ifc: 7 tests (create exporter, add wall, export basic, global ID, parse IFC, extract walls/rooms, get summary)
- All tests run with `cargo test -p pensaer-ifc`

### Known Issues

1. **ifc_rs alpha** — dependency is 0.1.0-alpha.9, may have breaking changes
2. **Limited geometry extraction** — import gets wall placement/origin but not full extruded geometry (height/thickness default to 3.0/0.2)
3. **No door/window import** — entity types recognized but geometry extraction not implemented
4. **No roof export** — IfcRoof entity not yet written to STEP output

---

## Integration: Kernel → Python Server → React Client

```
┌─────────────┐     PyO3 FFI      ┌──────────────┐     REST/MCP     ┌──────────────┐
│ Rust Kernel │ ◄───────────────► │ Python Server │ ◄─────────────► │ React Client │
│ (geometry,  │  maturin develop  │ (FastAPI +    │  HTTP + JSON    │ (Three.js +  │
│  mesh, IFC) │  --features python│  MCP servers) │                 │  xterm.js)   │
└─────────────┘                   └──────────────┘                  └──────────────┘
```

**When kernel is available (PyO3 built):**
- MCP tools call Rust functions directly → fast geometry, mesh generation, clash detection
- ~10-100x faster than pure Python fallback

**When kernel is unavailable (current Docker state):**
- Server uses pure Python implementations (numpy/scipy based)
- Functionally identical but slower
- This is the current state — fixing it is P0

---

## Quality Gates

### For any kernel change:
- [ ] `cargo build --all` passes
- [ ] `cargo test --all` passes
- [ ] `cargo clippy --all` has no warnings
- [ ] `cargo fmt --all -- --check` passes
- [ ] If touching bindings: `maturin develop --features python` works
- [ ] If touching elements: corresponding MCP tool still returns correct results
- [ ] If touching mesh: visual regression check in 3D viewport

### Performance benchmarks:
- Mesh generation: <1ms per wall, <5ms per roof
- Clash detection: <100ms for 1000 elements
- IFC export: <1s for 10,000 elements
- IFC import: <2s for typical building (~5000 entities)
