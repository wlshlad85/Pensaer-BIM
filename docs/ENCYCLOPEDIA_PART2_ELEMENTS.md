# Pensaer Engineering Encyclopedia — Part 2: BIM Element Types

> **Author:** Max, CTO — Pensaer-BIM
> **Version:** 1.0.0
> **Date:** 2025-07-13
> **Scope:** Every BIM element type in the system — what it is, how to create it, how to test it, quality gates.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Element: Wall](#element-wall)
3. [Element: Floor](#element-floor)
4. [Element: Roof](#element-roof)
5. [Element: Room](#element-room)
6. [Element: Door](#element-door)
7. [Element: Window](#element-window)
8. [Element: Column](#element-column)
9. [Element: Beam](#element-beam)
10. [Element: Stair](#element-stair)
11. [Element: Grid](#element-grid)
12. [Element: CurtainWall](#element-curtainwall)
13. [Element: Core](#element-core)
14. [Element: Building](#element-building)
15. [Element: Opening](#element-opening)
16. [Cross-Cutting Concerns](#cross-cutting-concerns)
17. [Element Maturity Matrix](#element-maturity-matrix)

---

## Architecture Overview

### The Element Pipeline

Every BIM element flows through a consistent pipeline:

```
Terminal DSL Input
    ↓
Command Parser (app/src/commands/handlers/elementCommands.ts)
    ↓
Command Dispatcher (app/src/services/commandDispatcher.ts)
    ↓
MCP Tool Call (server/mcp-servers/geometry-server/)
    ↓
Geometry Engine (pensaer_geometry Rust/Python)
    ↓
Model Store (app/src/stores/modelStore.ts — Zustand)
    ↓
2D Renderer (app/src/components/canvas/elements/*.tsx — SVG)
    ↓
3D Renderer (app/src/components/canvas/Canvas3D.tsx — Three.js)
```

### Base Element Interface

All elements extend `BaseElement` defined in `app/src/types/elements.ts`:

```typescript
interface BaseElement {
  readonly id: ElementId;        // Branded string type
  name: string;                  // Human-readable name
  x: number;                     // X coordinate in model space (mm)
  y: number;                     // Y coordinate in model space (mm)
  width: number;                 // Bounding box width (mm)
  height: number;                // Bounding box height (mm)
  rotation?: number;             // 0-360 degrees
  relationships: Relationships;  // IFC-inspired links
  issues: Issue[];               // Validation issues
  aiSuggestions: Suggestion[];   // AI recommendations
  level?: LevelId;               // Level/floor assignment
  readonly createdAt?: number;   // Creation timestamp
  modifiedAt?: number;           // Last modification timestamp
}
```

### Discriminated Union

The `Element` type is a discriminated union on the `type` field:

```typescript
type Element =
  | WallElement
  | DoorElement
  | WindowElement
  | RoomElement
  | FloorElement
  | RoofElement
  | ColumnElement
  | BeamElement
  | StairElement;
```

### Type Guards

Every element type has a corresponding type guard: `isWall()`, `isDoor()`, `isWindow()`, `isRoom()`, `isFloor()`, `isRoof()`, `isColumn()`, `isBeam()`, `isStair()`.

Additionally: `isHostElement()` (wall|floor|roof), `isHostedElement()` (door|window).

### Scale Convention

- **Model coordinates:** millimeters (mm)
- **DSL input:** meters (m) — the command handlers multiply by `SCALE = 100` (100px per meter)
- **MCP server:** meters
- **3D renderer:** meters (divides stored values back)

---

## Element: Wall

### What
The primary structural/partition element in BIM. Walls define spaces, host openings (doors/windows), and form the skeleton of any building model. Walls are defined by a start point and end point in plan, with a height and thickness.

### Type Interface

```typescript
interface WallElement extends BaseElement {
  readonly type: "wall";
  thickness: number;                    // Wall thickness in mm
  wallHeight: number;                   // Floor-to-ceiling height in mm
  material?: "concrete" | "brick" | "drywall" | "glass" | "wood";
  isExterior?: boolean;
  fireRating?: number;                  // 0, 30, 60, 90, 120 minutes
  acousticRating?: number;              // dB
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
}
```

### DSL Syntax

```bash
# Named parameters
wall --start 0,0 --end 5,0
wall --start 0,0 --end 10,0 --height 3.0 --thickness 0.2 --material Brick --level "Level 2"
wall --start 0,0 --end 5,0 --type structural

# Positional syntax
wall 0,0 5,0
wall 0,0 10,0 --height 4.0
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--start` / positional[0] | `x,y` | **required** | Start point in meters |
| `--end` / positional[1] | `x,y` | **required** | End point in meters |
| `--height` | `number` | `3.0` | Wall height in meters |
| `--thickness` | `number` | `0.2` | Wall thickness in meters |
| `--material` | `string` | `"Concrete"` | Material type |
| `--level` | `string` | `"Level 1"` | Level assignment |
| `--type` / `--wall_type` | `string` | `"basic"` | `basic`, `structural`, `curtain`, `retaining` |

### Command Handler

**Exists:** ✅ Yes
**File:** `app/src/commands/handlers/elementCommands.ts` → `createWallHandler()`
**Registration:** `registerCommand({ name: "wall", ... })`

**Handler Logic:**
1. Parse `--start`/`--end` or positional `x,y x,y` syntax
2. Validate start ≠ end
3. Call MCP tool `create_wall`
4. Calculate length, check minimum (0.1m)
5. Determine orientation (horizontal vs vertical)
6. Create element in modelStore with SCALE conversion
7. Record history action

**Validation in handler:**
- Start and end must differ (zero-length wall rejected)
- Minimum wall length: 0.1m (100mm)
- Width/height calculated from orientation: horizontal walls get `width = length * SCALE`, `height = thickness * SCALE * 60`

### MCP Tool

**Tool name:** `create_wall`
**Server:** `pensaer-geometry` (geometry-server)
**File:** `server/mcp-servers/geometry-server/geometry_server/geometry_mcp.py`

**Input schema:**
```json
{
  "start": [x, y],           // Required. Meters.
  "end": [x, y],             // Required. Meters.
  "height": 3.0,             // Default 3.0m
  "thickness": 0.2,          // Default 0.2m
  "wall_type": "basic",      // basic|structural|curtain|retaining
  "material": "concrete",    // concrete|brick|timber|steel|masonry|drywall
  "level_id": "uuid",        // Optional level UUID
  "reasoning": "string"      // AI agent reasoning
}
```

**Additional MCP tool:** `create_rectangular_walls` — creates 4 walls forming a closed rectangle from `min_point` + `max_point`.

### 3D Rendering

**File:** `app/src/components/canvas/Canvas3D.tsx`
**Method:** Inline in Canvas3D — walls are rendered as `THREE.BoxGeometry` with CSG boolean subtraction for hosted openings.

**Process:**
1. Parse thickness from properties (supports mm/cm/m units)
2. Calculate wall length from start/end coordinates
3. Create `THREE.BoxGeometry(length, height, thickness)`
4. Position at midpoint between start and end
5. Rotate to match wall angle using `Math.atan2`
6. For each hosted door/window: create `Brush` geometry, perform `SUBTRACTION` via `three-bvh-csg` `Evaluator`
7. Apply material color based on material type (concrete=gray, brick=red-brown, etc.)

**CSG Boolean Operations:**
- Uses `three-bvh-csg` library (`Evaluator`, `Brush`, `SUBTRACTION`)
- Door openings: subtracted as rectangular voids
- Window openings: subtracted as rectangular voids at sill height

### 2D Rendering

**File:** `app/src/components/canvas/elements/WallElement.tsx`
**Component:** `<WallElement>` (React memo'd SVG group)

**Visual representation:**
- Main body: `<rect>` filled `#94a3b8` (selected: `#64748b`)
- Stroke: `#475569` normal, `#ef4444` errors, `#f59e0b` warnings, `#60a5fa` hover
- Structural walls: dashed center line (`strokeDasharray="4 2"`) — horizontal or vertical based on orientation
- Issue indicator: small circle at top-right corner (red for errors, amber for warnings)
- Selection handles: 4 blue squares at corners (`#3b82f6`)

### Relationships

| Relationship | Direction | Target Types | Description |
|-------------|-----------|--------------|-------------|
| `hosts` | outgoing | Door, Window | Openings placed in this wall |
| `joins` | bidirectional | Wall | Other walls meeting at endpoints |
| `bounds` | outgoing | Room | Rooms this wall encloses |
| `supportedBy` | outgoing | Column, Beam | Structural supports (future) |

**Auto-updated:** When a door/window is placed, the wall's `hosts` array is updated and the opening's `hostedBy` is set.

### Validation Rules

| Rule | Severity | Code | Description |
|------|----------|------|-------------|
| Minimum length | error | `GEOM-001` | Wall must be ≥ 0.1m (100mm) |
| Start ≠ End | error | `GEOM-002` | Zero-length wall rejected |
| Thickness > 0 | error | `GEOM-003` | Thickness must be positive |
| Height > 0 | error | `GEOM-004` | Height must be positive |
| Hosted openings fit | error | `GEOM-005` | Doors/windows must not extend past wall ends |
| Fire rating consistency | warning | `FIRE-001` | Exterior walls should have fire rating |
| Structural walls need foundations | info | `STRUCT-001` | Structural type should connect to floor |

### Known Issues

1. **Thickness scaling anomaly:** The 2D thickness uses `thickness * SCALE * 60` — the `* 60` multiplier is a magic number that produces visually reasonable results but isn't geometrically accurate. A 200mm wall renders at `0.2 * 100 * 60 = 1200px` width, which is way off.
2. **No diagonal wall support in 2D:** The 2D renderer uses axis-aligned `<rect>` — diagonal walls render as bounding boxes, not rotated rectangles.
3. **Properties bag divergence:** The command handler stores properties in a flat `properties: Record<string, string|number|boolean>` bag (legacy format), while the type system expects typed fields like `thickness: number`. This creates a dual representation.
4. **MCP fallback not tested with real geometry server:** The handler calls `callMcpTool("create_wall", ...)` but most testing uses the MockMCPClient.
5. **Wall joins not auto-detected on creation:** You must run `analyze` command separately.

### Test Coverage

| Test File | What's Tested | Status |
|-----------|---------------|--------|
| `app/src/commands/__tests__/elementCommands.test.ts` | Command parsing, validation | ✅ Exists |
| `app/e2e/workflows/floorPlan.spec.ts` | End-to-end wall creation | ✅ Exists |
| `server/mcp-servers/geometry-server/tests/test_geometry_tools.py` | MCP tool execution | ✅ Exists |

**Missing tests:**
- Wall-wall join detection after creation
- CSG boolean subtraction in 3D (door/window voids)
- Diagonal wall rendering
- Maximum wall length limits
- Concurrent wall creation race conditions

### Quality Gate

- [x] Type interface defined in `elements.ts`
- [x] Command handler registered and functional
- [x] MCP tool defined and callable
- [x] 2D SVG renderer implemented
- [x] 3D Three.js renderer implemented
- [x] Relationships managed (hosts, joins, bounds)
- [x] Basic validation (length, start≠end)
- [ ] Diagonal wall rendering accurate
- [ ] Thickness rendering geometrically correct
- [ ] Fire/acoustic rating validation
- [ ] Auto-join detection on creation
- [ ] IFC export mapping verified
- [ ] Property bag → typed interface migration complete

---

## Element: Floor

### What
A horizontal structural slab element representing a floor surface. Floors define the walking surface of each level, support furniture/equipment loads, and provide fire separation between levels. Can be defined as rectangles or arbitrary polygons.

### Type Interface

```typescript
interface FloorElement extends BaseElement {
  readonly type: "floor";
  thickness: number;                    // Floor thickness in mm
  area?: number;                        // Floor area in m²
  finishMaterial?: "concrete" | "tile" | "wood" | "carpet" | "vinyl" | "stone";
  elevation?: number;                   // Elevation from building datum
  loadCapacity?: number;                // Load capacity in kN/m²
}
```

### DSL Syntax

```bash
# Polygon boundary
floor --points 0,0 10,0 10,8 0,8
floor --points 0,0 6,0 6,4 3,4 3,2 0,2 --thickness 0.2

# Rectangular bounds
floor --min 0,0 --max 10,10
floor --min 0,0 --max 5,5 --thickness 0.15 --level "Level 2"
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--points` | `x,y x,y x,y ...` | — | Polygon boundary (≥3 points) |
| `--min` | `x,y` | — | Rectangle min corner (alternative to points) |
| `--max` | `x,y` | — | Rectangle max corner |
| `--thickness` | `number` | `0.15` | Slab thickness in meters |
| `--level` | `string` | `"Level 1"` | Level assignment |
| `--material` | `string` | `"Concrete"` | Finish material |
| `--type` / `--floor_type` | `string` | `"slab"` | `slab`, `suspended`, `foundation` |

### Command Handler

**Exists:** ✅ Yes
**File:** `app/src/commands/handlers/elementCommands.ts` → `createFloorHandler()`

**Handler Logic:**
1. Accept `--points` polygon OR `--min`/`--max` rectangle
2. Validate each point has [x, y]
3. Auto-close polygon if first ≠ last point
4. Calculate bounding box
5. Calculate area using Shoelace formula (`calculatePolygonArea()`)
6. Call MCP tool `create_floor`
7. Store boundary_points as JSON string in properties
8. Add to modelStore with `SCALE` conversion

**Helper functions defined inline:**
- `calculatePolygonArea(points)` — Shoelace/Surveyor's formula
- `calculateBoundingBox(points)` — min/max X/Y
- `isPolygonClosed(points, tolerance=0.01)` — checks first/last point distance

### MCP Tool

**Tool name:** `create_floor`
**Server:** `pensaer-geometry`

**Input schema:**
```json
{
  "min_point": [x, y],       // Required
  "max_point": [x, y],       // Required
  "thickness": 0.3,          // Default 0.3m
  "floor_type": "slab",      // slab|suspended|foundation
  "level_id": "uuid",
  "reasoning": "string"
}
```

**Note:** The MCP schema only accepts rectangular `min_point`/`max_point`. The polygon support is client-side only — the client sends `boundary_points` but the MCP tool ignores them and uses the bounding box.

### 3D Rendering

**File:** `app/src/components/canvas/Canvas3D.tsx`
**Method:** Floors rendered as flat `THREE.BoxGeometry(width, thickness, depth)` positioned at elevation.

### 2D Rendering

**File:** `app/src/components/canvas/elements/FloorElement.tsx`
**Component:** `<FloorElement>`

**Visual representation:**
- 45° hatching pattern via SVG `<pattern>` with `patternTransform="rotate(45)"`
- Outline: `<rect>` with stroke color varying by state (green `#10b981` selected, gray `#6b7280` default)
- Thickness indicators: diagonal corner lines (10px)
- Label: dark background pill with floor name
- Selection handles: 4 green squares at corners

### Relationships

| Relationship | Direction | Target Types | Description |
|-------------|-----------|--------------|-------------|
| `supports` | outgoing | Wall, Column | Elements resting on this floor |
| `supportedBy` | outgoing | Beam, Column | Structural elements supporting this slab |
| `containedIn` | outgoing | Level | Level this floor belongs to |

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Minimum 3 points for polygon | error | Polygon must have ≥3 distinct vertices |
| Positive thickness | error | Thickness must be > 0 |
| Non-zero area | error | Calculated area must be > 0 |
| Self-intersecting polygon | warning | Polygon edges should not cross (NOT YET IMPLEMENTED) |

### Known Issues

1. **Polygon rendering in 2D is bounding-box only:** Even though boundary_points are stored as JSON, the `<FloorElement>` renderer uses `element.x/y/width/height` (bounding box rect), not the actual polygon outline.
2. **MCP server ignores polygon boundary:** Server only uses min/max points for rectangular floors.
3. **No elevation rendering:** The `elevation` field exists but doesn't affect 2D or 3D positioning.
4. **Area calculation client-side only:** The Shoelace area is calculated in the handler, not verified by the MCP server.

### Test Coverage

| Test | Status |
|------|--------|
| Command parsing (points, min/max) | ✅ In elementCommands.test.ts |
| Polygon area calculation | ⚠️ Tested indirectly |
| Auto-close polygon | ⚠️ Not explicitly tested |
| 2D renderer | ❌ No unit test |
| 3D renderer | ❌ No unit test |

### Quality Gate

- [x] Type interface defined
- [x] Command handler with polygon support
- [x] MCP tool callable
- [x] 2D renderer implemented
- [x] 3D renderer implemented
- [ ] Actual polygon outline rendering in 2D (not just bounding box)
- [ ] MCP server polygon support
- [ ] Elevation-aware positioning
- [ ] Self-intersection validation
- [ ] Load capacity analysis integration

---

## Element: Roof

### What
The top covering element of a building. Supports multiple roof types (flat, gable, hip, shed, mansard, gambrel) with slope, overhang, and ridge direction parameters. Rendered with dashed lines in 2D plan view to indicate above-cut-plane elements.

### Type Interface

```typescript
interface RoofElement extends BaseElement {
  readonly type: "roof";
  pitch?: number;                       // Pitch in degrees
  roofType?: "flat" | "gable" | "hip" | "shed" | "mansard" | "gambrel";
  thickness?: number;                   // Roof thickness in mm
  material?: "asphalt" | "metal" | "tile" | "slate" | "membrane" | "green";
  overhang?: number;                    // Overhang distance in mm
  area?: number;                        // Roof area in m²
}
```

### DSL Syntax

```bash
roof --type gable --points 0,0 10,0 10,8 0,8
roof --type hip --min 0,0 --max 10,10 --slope 30
roof --type flat --min 0,0 --max 10,10 --overhang 0.5
roof --type gable --points 0,0 12,0 12,8 0,8 --slope 35 --ridge x
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--type` | `string` | `"gable"` | `flat`, `gable`, `hip`, `shed`, `mansard`, `gambrel` |
| `--points` | `x,y x,y ...` | — | Polygon boundary |
| `--min` / `--max` | `x,y` | — | Rectangular bounds |
| `--slope` | `number` | `30` | Slope angle in degrees |
| `--overhang` | `number` | `0.5` | Overhang in meters |
| `--ridge` | `string` | `"auto"` | Ridge direction: `auto`, `x`, `y` |
| `--material` | `string` | `"Metal Standing Seam"` | Roofing material |
| `--level` | `string` | `"Level 1"` | Level assignment |

### Command Handler

**Exists:** ✅ Yes
**File:** `app/src/commands/handlers/elementCommands.ts` → `createRoofHandler()`

**Handler Logic:**
- Same polygon/rectangle parsing as floor
- Calls MCP tool `create_roof`
- Stores `roof_type`, `slope_degrees`, `overhang`, `ridge_direction`, `footprint_area`, `boundary_points`
- Default insulation: `"R-30"`

### MCP Tool

**Tool name:** `create_roof`
**Server:** `pensaer-geometry`

**Input schema:**
```json
{
  "boundary_points": [[x,y], ...],
  "min_point": [x, y],
  "max_point": [x, y],
  "roof_type": "gable",
  "slope_degrees": 30,
  "overhang": 0.5,
  "level": "Level 1",
  "material": "Metal Standing Seam",
  "ridge_direction": "auto"
}
```

**Additional MCP tool:** `attach_roof_to_walls` — links a roof to supporting walls.

### 3D Rendering

**File:** `app/src/components/canvas/Canvas3D.tsx`

**Geometry by type:**
- **Flat:** `THREE.BoxGeometry(width, thickness, depth)` positioned at wall top
- **Gable:** Custom `BufferGeometry` with triangular prism — vertices calculated from slope angle and ridge direction
- **Hip:** Custom `BufferGeometry` with pyramid-like form — 4 sloped faces meeting at center

### 2D Rendering

**File:** `app/src/components/canvas/elements/RoofElement.tsx`
**Component:** `<RoofElement>`

**Visual representation:**
- Outline: `<rect>` with **dashed stroke** (`strokeDasharray="8 4"`) — convention for above-cut-plane elements
- Fill: transparent (orange tint when selected/hovered)
- **Gable roof:** Ridge line drawn as dashed line along dominant axis, slope direction arrows (triangular `<path>`)
- **Hip roof:** 4 diagonal lines from corners to center point, center dot
- **Flat roof:** Outline only
- Roof type indicator: letter in top-left (`F`, `G`, `H`)
- Label: dark background pill with name
- Selection handles: 4 orange squares at corners

### Relationships

| Relationship | Direction | Target Types | Description |
|-------------|-----------|--------------|-------------|
| `supportedBy` | outgoing | Wall, Column | Elements supporting the roof |
| `covers` | outgoing | Floor, Room | Spaces covered by this roof |
| `coversRooms` | outgoing | Room | Rooms under this roof |

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Slope 0-89° | error | Pitch must be between 0 (flat) and 89 degrees |
| Positive overhang | warning | Overhang should be ≥ 0 |
| Area > 0 | error | Footprint must have positive area |
| Supported by structure | warning | Roof should have `supportedBy` relationship |

### Known Issues

1. **Ridge direction "auto" logic not documented:** The handler passes `"auto"` but the logic for choosing X vs Y ridge isn't clear.
2. **Overhang not rendered in 2D:** The overhang parameter is stored but the 2D outline doesn't extend beyond the boundary.
3. **Only flat/gable/hip supported in renderers:** The type interface allows shed/mansard/gambrel but neither 2D nor 3D renderer handles them.
4. **No gutter/fascia elements:** Roof edges don't generate associated elements.

### Test Coverage

| Test | Status |
|------|--------|
| Command parsing | ✅ |
| Gable ridge line calculation | ⚠️ Tested via renderer unit tests (limited) |
| Hip lines calculation | ⚠️ Tested via renderer |
| 3D geometry generation | ❌ No test |

### Quality Gate

- [x] Type interface defined
- [x] Command handler with polygon support
- [x] MCP tool callable
- [x] 2D renderer with roof-type-specific lines
- [x] 3D renderer with gable/hip/flat geometry
- [ ] Shed/mansard/gambrel rendering
- [ ] Overhang rendered in 2D
- [ ] Drainage/slope analysis
- [ ] Insulation R-value validation

---

## Element: Room

### What
A spatial element representing an enclosed room/space defined by its boundary. Rooms are not physical elements — they are voids bounded by walls. They carry metadata like room type, area, occupancy, and finish schedules. Rooms can be rectangular or arbitrary polygons.

### Type Interface

```typescript
interface RoomElement extends BaseElement {
  readonly type: "room";
  roomType?: "living" | "bedroom" | "bathroom" | "kitchen" | "office"
           | "corridor" | "storage" | "utility" | "other";
  area?: number;                        // Floor area in m²
  perimeter?: number;                   // Perimeter in mm
  volume?: number;                      // Volume in m³
  ceilingHeight?: number;               // Ceiling height in mm
  requiredArea?: number;                // Minimum area for type
  occupancy?: number;                   // Occupancy count
  finishFloorLevel?: number;            // Finish floor level
}
```

### DSL Syntax

```bash
room --points 0,0 5,0 5,4 0,4 --name "Living Room"
room --points 0,0 3,0 3,2 0,2 --name Bathroom --number 101 --type bathroom
room --min 0,0 --max 5,5 --name Kitchen --type kitchen
room --points 0,0 6,0 6,4 3,4 3,2 0,2 --name "L-Shaped Room"
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--points` | `x,y x,y ...` | — | Polygon boundary (≥3 points) |
| `--min` / `--max` | `x,y` | — | Rectangular bounds |
| `--name` | `string` | Auto-generated | Room name |
| `--number` | `string` | `""` | Room number (e.g., "101") |
| `--type` | `string` | `"other"` | Room type (see RoomType enum below) |
| `--height` | `number` | `3.0` | Room height in meters |

**Room types with defaults:**

| Type | Display Name | Default Floor | Default Walls | Default Occupancy |
|------|-------------|---------------|---------------|-------------------|
| `bedroom` | Bedroom | Carpet | Painted | Residential |
| `bathroom` | Bathroom | Tile | Tile | Residential |
| `kitchen` | Kitchen | Tile | Painted | Residential |
| `living` | Living Room | Hardwood | Painted | Residential |
| `dining` | Dining Room | Hardwood | Painted | Residential |
| `office` | Office | Carpet | Painted | Commercial |
| `storage` | Storage | Concrete | Painted | Storage |
| `hallway` | Hallway | Hardwood | Painted | Circulation |
| `utility` | Utility Room | Concrete | Painted | Utility |
| `garage` | Garage | Concrete | Unfinished | Parking |
| `other` | Room | Hardwood | Painted | Residential |

### Command Handler

**Exists:** ✅ Yes
**File:** `app/src/commands/handlers/elementCommands.ts` → `createRoomHandler()`

**Handler Logic:**
1. Parse polygon or rectangle boundary
2. Auto-close polygon, validate ≥3 distinct points
3. Calculate area (Shoelace), centroid, bounding box
4. Look up room type info (display name, default finishes)
5. Call MCP tool `create_room`
6. Store boundary_points, centroid, finishes in properties
7. Initial relationships: `boundedBy: [], accessVia: []`

### MCP Tool

**Tool name:** `create_room`
**Server:** `pensaer-geometry`

**Input schema:**
```json
{
  "name": "Living Room",         // Required
  "number": "101",               // Required
  "min_point": [x, y],           // Required
  "max_point": [x, y],           // Required
  "height": 3.0,
  "reasoning": "string"
}
```

**Additional MCP tool:** `detect_rooms` — automatically detects enclosed spaces from wall topology.

### 3D Rendering

**File:** `app/src/components/canvas/Canvas3D.tsx`
**Method:** Rooms rendered as semi-transparent colored volumes — `THREE.BoxGeometry` with low opacity material.

### 2D Rendering

**File:** `app/src/components/canvas/elements/RoomElement.tsx`
**Component:** `<RoomElement>`

**Visual representation:**
- Fill: semi-transparent blue (`rgba(59, 130, 246, 0.1)`, brighter on hover/select)
- No visible stroke by default (dashed blue `#3b82f6` when selected)
- Label: dark pill at center with room name + area text
- Highlight border: green `#22c55e` with pulse animation when highlighted

### Relationships

| Relationship | Direction | Target Types | Description |
|-------------|-----------|--------------|-------------|
| `boundedBy` | outgoing | Wall | Walls enclosing this room |
| `accessVia` | outgoing | Door | Doors providing access |
| `connectedTo` | outgoing | Room | Adjacent rooms (via doors) |

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| ≥3 distinct points | error | Polygon must have at least 3 unique vertices |
| Area > 0 | error | Room must have positive area |
| Minimum area by type | warning | Bedrooms need ≥ X m², bathrooms ≥ Y m² |
| Must have access | warning | Room should have at least one door |
| Bounded by walls | info | Room should reference bounding walls |

### Known Issues

1. **No automatic wall-room boundary detection:** `boundedBy` must be manually set or via `detect_rooms`.
2. **2D renders as bounding box:** Same as floor — polygon boundary stored as JSON but rendered as rect.
3. **MCP `create_room` requires name AND number:** Both are marked `required` in the server schema, but the client-side handler sends empty string for number if not provided.
4. **Room type mismatch:** Handler uses extended types (dining, hallway, utility, garage) not in the TypeScript `roomType` union on the interface.
5. **No adjacency graph maintenance:** `connectedTo` isn't auto-populated when doors are placed.

### Test Coverage

| Test | Status |
|------|--------|
| Polygon room creation | ✅ |
| Rectangular room (min/max) | ✅ |
| Room type finishes | ⚠️ Not explicitly tested |
| detect-rooms command | ⚠️ Delegates to MCP, limited local test |

### Quality Gate

- [x] Type interface defined
- [x] Command handler with polygon + rectangle
- [x] MCP tool callable
- [x] 2D renderer with label
- [x] Room type defaults (finishes, occupancy)
- [ ] Auto-detect bounding walls
- [ ] Adjacency graph maintenance
- [ ] Polygon rendering (not just bounding box)
- [ ] Area validation against room type minimums
- [ ] Occupancy calculations

---

## Element: Door

### What
An opening element hosted by a wall, providing access between spaces. Doors have width, height, type (single/double/sliding), and swing direction. They are always placed relative to a host wall using an offset from the wall's start point.

### Type Interface

```typescript
interface DoorElement extends BaseElement {
  readonly type: "door";
  doorWidth: number;                    // Door width in mm
  doorHeight: number;                   // Door height in mm
  swing?: "left" | "right" | "double";
  openDirection?: "inward" | "outward";
  doorType?: "single" | "double" | "sliding" | "pocket" | "bi-fold";
  isFireDoor?: boolean;
  fireRating?: number;                  // Minutes
  isAccessible?: boolean;               // ADA compliance
}
```

### DSL Syntax

```bash
door --wall wall-001 --offset 2.5
door --wall wall-001 --offset 1.5 --type double
door --wall wall-001 --offset 3.0 --width 0.9 --height 2.1 --type sliding
door --wall wall-001 --offset 2.5 --swing left
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--wall` | `string` | Selected wall | Host wall ID (**required** unless 1 wall selected) |
| `--offset` / `--position` | `number` | `0.5` | Offset from wall start in meters |
| `--width` | `number` | `0.9` | Door width in meters (doubled for `double` type) |
| `--height` | `number` | `2.1` | Door height in meters |
| `--type` | `string` | `"single"` | `single`, `double`, `sliding` |
| `--swing` | `string` | `"left"` | Swing direction: `left`, `right` |

### Command Handler

**Exists:** ✅ Yes
**File:** `app/src/commands/handlers/elementCommands.ts` → `placeDoorHandler()`

**Handler Logic:**
1. Resolve wall ID (explicit `--wall` or single selected element)
2. Validate wall exists and is type `"wall"`
3. Compute effective width (doubled for `double` type)
4. Validate placement via `validateDoorPlacement()`:
   - Offset ≥ 0
   - `offset - width/2 ≥ 0` (door doesn't extend past wall start)
   - `offset + width/2 ≤ wallLength` (door doesn't extend past wall end)
5. Call MCP tool `place_door`
6. Calculate pixel position based on wall orientation (horizontal vs vertical)
7. Create door element, set `relationships.hostedBy = wallId`
8. Update host wall's `relationships.hosts` array

**Validation function:** `validateDoorPlacement(wall, offset, width)` — returns `{ valid, message, wallLength, requiredSpace }`

### MCP Tool

**Tool name:** `place_door`
**Server:** `pensaer-geometry`

**Input schema:**
```json
{
  "wall_id": "uuid",            // Required
  "offset": 2.5,                // Required. Distance from wall start.
  "width": 0.9,
  "height": 2.1,
  "door_type": "single",        // single|double|sliding|folding|revolving|pocket
  "swing": "left",              // left|right|both|none
  "reasoning": "string"
}
```

**Note:** MCP server supports more door types (folding, revolving, pocket) than the client handler (single, double, sliding).

### 3D Rendering

**File:** `app/src/components/canvas/Canvas3D.tsx`
**Method:** Doors are rendered as voids (CSG subtraction from host wall) plus a door panel mesh. The void is created at the offset position along the wall, and a thin box represents the door leaf.

### 2D Rendering

**File:** `app/src/components/canvas/elements/DoorElement.tsx`
**Component:** `<DoorElement>`

**Visual representation:**
- Opening gap: dark rect (`#1a1a2e`) matching wall background
- Door panel: inner rect filled yellow `#fbbf24` (selected: `#d97706`)
- Swing arc: dashed quarter-circle arc via SVG `<path>` with `A` (arc) command — radius = 1.5× element size
- Stroke: `#92400e` normal, `#ef4444` errors, `#60a5fa` hover
- Issue indicator: circle above element
- Selection: dashed blue outline

### Relationships

| Relationship | Direction | Target Types | Description |
|-------------|-----------|--------------|-------------|
| `hostedBy` | outgoing | Wall | The wall containing this door |
| `leadsTo` | outgoing | Room | Rooms accessible through this door |

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Must have host wall | error | `hostedBy` must reference a valid wall |
| Fits within wall | error | Door must not extend past wall boundaries |
| Width > 0 | error | Positive width required |
| Height > 0 | error | Positive height required |
| ADA minimum width | warning | Accessible doors must be ≥ 0.813m (32") |
| Fire door in fire wall | warning | If host wall has fire rating, door should be fire-rated |
| Offset ≥ 0 | error | Cannot place at negative offset |

### Known Issues

1. **Swing arc geometry is approximate:** The arc path uses `swingRadius = max(width, height) * 1.5` which doesn't represent the actual door leaf sweep.
2. **No swing direction distinction in rendering:** Left vs right swing renders identically — the arc always goes the same direction.
3. **Door position uses fixed offsets:** `doorY = wall.y - 6` and `doorH = 24` are magic numbers for horizontal walls.
4. **Double door width doubling:** `effectiveWidth = doorType === "double" ? width * 2 : width` — the `--width` parameter becomes per-leaf width for double doors, which may confuse users.
5. **leadsTo never populated:** The relationship is initialized as empty and never auto-calculated.
6. **No pocket/bi-fold/folding rendering:** Only single/double/sliding are handled in the command handler.

### Test Coverage

| Test | Status |
|------|--------|
| Door placement on wall | ✅ |
| Validation (too wide, negative offset) | ✅ |
| Host wall relationship update | ⚠️ Tested indirectly |
| Swing arc rendering | ❌ No visual test |
| Double door width doubling | ⚠️ Limited |

### Quality Gate

- [x] Type interface defined
- [x] Command handler with offset placement
- [x] MCP tool callable
- [x] 2D renderer with swing arc
- [x] 3D renderer (CSG void + panel)
- [x] Host wall relationship bidirectional
- [x] Placement validation (fits in wall)
- [ ] Correct swing direction rendering
- [ ] ADA accessibility validation
- [ ] Fire door validation
- [ ] leadsTo relationship auto-population
- [ ] All door types rendered

---

## Element: Window

### What
An opening element hosted by a wall for light, ventilation, and views. Windows have width, height, sill height, type (fixed/casement/sliding/awning/double-hung), and glazing properties. Placed relative to host wall via offset.

### Type Interface

```typescript
interface WindowElement extends BaseElement {
  readonly type: "window";
  windowWidth: number;                  // Window width in mm
  windowHeight: number;                 // Window height in mm
  sillHeight: number;                   // Sill height from floor in mm
  windowType?: "fixed" | "casement" | "sliding" | "awning" | "double-hung";
  glassType?: "single" | "double" | "triple" | "laminated" | "tempered";
  uValue?: number;                      // Thermal performance W/m²K
  operable?: boolean;
}
```

### DSL Syntax

```bash
window --wall wall-001 --offset 2.0
window --wall wall-001 --offset 1.5 --sill 0.9 --type casement
window --wall wall-001 --offset 2.5 --width 1.2 --height 1.5 --type awning
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--wall` | `string` | Selected wall | Host wall ID |
| `--offset` / `--position` | `number` | `0.5` | Offset from wall start in meters |
| `--width` | `number` | `1.2` | Window width in meters |
| `--height` | `number` | `1.0` | Window height in meters |
| `--sill` | `number` | `0.9` | Sill height from floor in meters |
| `--type` | `string` | `"fixed"` | Window type |

### Command Handler

**Exists:** ✅ Yes
**File:** `app/src/commands/handlers/elementCommands.ts` → `placeWindowHandler()`

**Handler Logic:**
1. Resolve wall ID (explicit or selected)
2. Validate wall exists and type = `"wall"`
3. Validate placement via `validateWindowPlacement()`:
   - Horizontal fit: `offset ± width/2` within wall length
   - Vertical fit: `sillHeight + windowHeight ≤ wallHeight`
   - Sill height ≥ 0
4. Call MCP tool `place_window`
5. Calculate pixel position based on wall orientation
6. Determine glazing type (fixed → "Double", others → "Double Low-E")
7. Create element, set `hostedBy`, update wall's `hosts` array

**Validation function:** `validateWindowPlacement(wall, offset, width, height, sillHeight)` — also checks vertical fit against wall height.

### MCP Tool

**Tool name:** `place_window`
**Server:** `pensaer-geometry`

**Input schema:**
```json
{
  "wall_id": "uuid",            // Required
  "offset": 2.0,                // Required
  "width": 1.2,
  "height": 1.0,
  "sill_height": 0.9,
  "window_type": "fixed",       // fixed|casement|double_hung|sliding|awning|hopper|pivot
  "reasoning": "string"
}
```

### 3D Rendering

**File:** `app/src/components/canvas/Canvas3D.tsx`
**Method:** Windows rendered as CSG subtraction from host wall (void) plus a glass pane. The void is positioned at `sillHeight` vertically. Glass material uses `MeshPhysicalMaterial` with transparency.

### 2D Rendering

**File:** `app/src/components/canvas/elements/WindowElement.tsx`
**Component:** `<WindowElement>`

**Visual representation:**
- Opening: dark rect (`#1a1a2e`)
- Frame: `<rect>` with cyan stroke `#0ea5e9` (2px)
- Glazing: inner rect with semi-transparent cyan fill `rgba(56, 189, 248, 0.2)` (0.4 selected)
- Center mullion: vertical `<line>` dividing the window
- Issue indicator: circle above
- Selection: dashed blue outline

### Relationships

| Relationship | Direction | Target Types | Description |
|-------------|-----------|--------------|-------------|
| `hostedBy` | outgoing | Wall | Host wall |
| `facesRoom` | outgoing | Room | Room the window faces into |

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Must have host wall | error | `hostedBy` required |
| Fits horizontally in wall | error | Offset ± width/2 within wall bounds |
| Fits vertically in wall | error | sillHeight + height ≤ wallHeight |
| Sill height ≥ 0 | error | Non-negative sill |
| Width, height > 0 | error | Positive dimensions |
| U-value reasonable | info | Typical range 0.5-5.0 W/m²K |

### Known Issues

1. **No multi-mullion rendering:** All windows show a single center mullion regardless of type.
2. **facesRoom never populated:** The relationship is set to `undefined` on creation.
3. **Window type rendering identical:** Fixed, casement, sliding all look the same in 2D.
4. **No daylight analysis integration:** Despite having U-value and glass type properties.
5. **Sill height stored as string in properties:** `sillHeight: "${sillHeight * 1000}mm"` — not the numeric field on the typed interface.

### Test Coverage

| Test | Status |
|------|--------|
| Window placement on wall | ✅ |
| Vertical fit validation | ✅ |
| Horizontal fit validation | ✅ |
| Sill height validation | ✅ |
| Host wall update | ⚠️ Indirect |
| Window type rendering | ❌ |

### Quality Gate

- [x] Type interface defined
- [x] Command handler with validation
- [x] MCP tool callable
- [x] 2D renderer with glazing
- [x] 3D renderer (CSG void + glass)
- [x] Host wall relationship bidirectional
- [x] Horizontal + vertical fit validation
- [ ] Window type-specific rendering
- [ ] facesRoom auto-detection
- [ ] U-value / thermal analysis
- [ ] Daylight calculation

---

## Element: Column

### What
A vertical structural element that transfers loads from beams/slabs above to foundations below. Columns can be rectangular, circular, H-section, or I-section. They are critical for structural grid systems.

### Type Interface

```typescript
interface ColumnElement extends BaseElement {
  readonly type: "column";
  shape?: "rectangular" | "circular" | "H" | "I" | "custom";
  depth: number;                        // Column depth in mm (REQUIRED)
  material?: "concrete" | "steel" | "wood" | "composite";
  fireProtection?: number;              // Fire protection thickness in mm
  baseElevation?: number;               // Base elevation in mm
  topElevation?: number;                // Top elevation in mm
}
```

### DSL Syntax

**⚠️ DOES NOT EXIST — NEEDS TO BE BUILT**

**Proposed syntax:**
```bash
column --position 5,5 --width 400 --depth 400 --height 3000
column --position 5,5 --shape circular --width 500 --material steel
column --position 5,5 --width 300 --depth 600 --shape H --material steel --level "Level 1"
```

**Proposed parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--position` | `x,y` | **required** | Column center point in meters |
| `--width` | `number` | `0.4` | Column width in meters |
| `--depth` | `number` | `= width` | Column depth in meters |
| `--height` | `number` | `3.0` | Column height (floor to floor) in meters |
| `--shape` | `string` | `"rectangular"` | Cross-section shape |
| `--material` | `string` | `"concrete"` | Material type |
| `--level` | `string` | `"Level 1"` | Level assignment |
| `--base-elevation` | `number` | `0` | Base elevation above datum |
| `--fire-protection` | `number` | `0` | Fire protection thickness in mm |

### Command Handler

**Exists:** ❌ NO
**Needs to be built at:** `app/src/commands/handlers/elementCommands.ts`

**Specification for handler:**
1. Parse `--position x,y` (required)
2. Width defaults to 0.4m (400mm), depth defaults to width
3. For circular columns: depth = width (diameter)
4. Call MCP tool `create_column` (ALSO NEEDS BUILDING)
5. Store in modelStore at `position * SCALE`
6. Relationships: `supports: [], supportedBy: [], containedIn: levelId`

### MCP Tool

**Tool name:** `create_column` — **DOES NOT EXIST**

**Proposed schema:**
```json
{
  "position": [x, y],           // Required. Center point in meters.
  "width": 0.4,                 // Cross-section width
  "depth": 0.4,                 // Cross-section depth
  "height": 3.0,                // Height
  "shape": "rectangular",       // rectangular|circular|H|I|custom
  "material": "concrete",
  "base_elevation": 0.0,
  "level_id": "uuid",
  "reasoning": "string"
}
```

### 3D Rendering

**Not implemented for columns specifically.** Would need:
- Rectangular: `THREE.BoxGeometry(width, height, depth)`
- Circular: `THREE.CylinderGeometry(radius, radius, height, 32)`
- H/I sections: Custom `BufferGeometry` or `THREE.ExtrudeGeometry` from profile shape

### 2D Rendering

**No dedicated component exists.** `elements/index.ts` does not export a ColumnElement renderer.

**Proposed 2D representation:**
- Rectangular: filled rectangle with X-pattern cross (structural convention)
- Circular: filled circle with cross
- H/I section: outline of profile shape
- Color: dark gray or brown
- Label: column grid reference (e.g., "A1", "B3")

### Relationships

| Relationship | Direction | Target Types | Description |
|-------------|-----------|--------------|-------------|
| `supports` | outgoing | Beam, Floor, Roof | Elements this column supports |
| `supportedBy` | outgoing | Floor (foundation) | Foundation element |
| `containedIn` | outgoing | Level | Level containing this column |

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Width, depth > 0 | error | Positive cross-section required |
| Height > 0 | error | Positive height required |
| Material required for structural | warning | Should specify material |
| On grid intersection | info | Columns should align with structural grid |
| Continuous through levels | warning | Columns should stack vertically |
| Slenderness ratio | warning | Height/min_dimension should be < 20 for concrete |

### Known Issues

1. **Entire element type is a stub.** Type interface exists but no command handler, no MCP tool, no renderer.
2. **Referenced in type guards:** `isColumn()` type guard exists and works, but nothing creates column elements.
3. **`depth` is required in the interface** but has no default — handler must provide it.

### Test Coverage

**Nothing exists.** Everything needs to be written.

### Quality Gate

- [x] Type interface defined in `elements.ts`
- [x] Type guard `isColumn()` exists
- [ ] Command handler
- [ ] MCP tool `create_column`
- [ ] 2D SVG renderer (ColumnElement.tsx)
- [ ] 3D Three.js renderer
- [ ] Grid alignment validation
- [ ] Structural load path analysis
- [ ] IFC export mapping (IfcColumn)

---

## Element: Beam

### What
A horizontal structural element spanning between columns or walls, carrying floor/roof loads. Beams can be rectangular, I-section, T-section, or L-section. They work with columns to form the structural frame.

### Type Interface

```typescript
interface BeamElement extends BaseElement {
  readonly type: "beam";
  shape?: "rectangular" | "I" | "T" | "L" | "custom";
  depth: number;                        // Beam depth in mm (REQUIRED)
  material?: "concrete" | "steel" | "wood" | "composite";
  fireProtection?: number;              // Fire protection thickness in mm
  span?: number;                        // Span length in mm
}
```

### DSL Syntax

**⚠️ DOES NOT EXIST — NEEDS TO BE BUILT**

**Proposed syntax:**
```bash
beam --start 0,5 --end 10,5 --width 300 --depth 600
beam --start 0,5 --end 10,5 --shape I --material steel --depth 400
beam --start col-A1 --end col-B1 --depth 500  # Column-to-column span
```

**Proposed parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--start` | `x,y` or `element-id` | **required** | Start point or support column |
| `--end` | `x,y` or `element-id` | **required** | End point or support column |
| `--width` | `number` | `0.3` | Beam width in meters |
| `--depth` | `number` | `0.6` | Beam depth in meters |
| `--shape` | `string` | `"rectangular"` | Cross-section profile |
| `--material` | `string` | `"concrete"` | Material type |
| `--level` | `string` | `"Level 1"` | Level assignment |
| `--elevation` | `number` | `auto` | Top of beam elevation (default: level height - depth) |

### Command Handler

**Exists:** ❌ NO

**Specification for handler:**
1. Parse `--start` and `--end` as coordinate pairs or column IDs
2. If column IDs: resolve to column center coordinates
3. Calculate span length: `Math.sqrt(dx² + dy²)`
4. Call MCP tool `create_beam`
5. Position in modelStore similar to walls (start/end with width)
6. Auto-link to supporting columns if specified by ID
7. Relationships: `supportedBy: [col1, col2], supports: [floor], containedIn: levelId`

### MCP Tool

**Tool name:** `create_beam` — **DOES NOT EXIST**

**Proposed schema:**
```json
{
  "start": [x, y],              // Required
  "end": [x, y],                // Required
  "width": 0.3,
  "depth": 0.6,
  "shape": "rectangular",
  "material": "concrete",
  "elevation": 2.4,             // Top of beam elevation
  "level_id": "uuid",
  "reasoning": "string"
}
```

### 3D Rendering

**Not implemented.** Would need:
- Rectangular: `THREE.BoxGeometry(span, depth, width)` rotated to beam angle
- I/T/L sections: `THREE.ExtrudeGeometry` from profile `THREE.Shape`

### 2D Rendering

**No component exists.**

**Proposed 2D representation:**
- Dashed outline rectangle (dashed because beams are above cut plane)
- Center line along span
- Depth annotations at ends
- Color: light brown or steel blue depending on material

### Relationships

| Relationship | Direction | Target Types | Description |
|-------------|-----------|--------------|-------------|
| `supportedBy` | outgoing | Column, Wall | Support elements at beam ends |
| `supports` | outgoing | Floor, Roof | Elements resting on this beam |
| `containedIn` | outgoing | Level | Level |

### Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| Start ≠ end | error | Zero-length beam rejected |
| Depth > width | info | Beams are typically deeper than wide |
| Span/depth ratio | warning | Should be 10-20 for concrete, 15-30 for steel |
| End supports exist | warning | Beam should connect to columns or walls |

### Known Issues

1. **Entire element is a stub** — type interface only.
2. **`depth` required but no handler to enforce it.**
3. **No column-to-column snapping logic.**

### Test Coverage

**Nothing exists.**

### Quality Gate

- [x] Type interface defined
- [x] Type guard `isBeam()` exists
- [ ] Command handler
- [ ] MCP tool `create_beam`
- [ ] 2D SVG renderer
- [ ] 3D Three.js renderer
- [ ] Column-to-column span support
- [ ] Structural analysis integration
- [ ] IFC export mapping (IfcBeam)

---

## Element: Stair

### What
A vertical circulation element connecting different levels. Stairs are defined by riser count, riser height, tread depth, width, and type (straight, L-shaped, U-shaped, spiral, curved). They are critical for building code compliance (means of egress).

### Type Interface

```typescript
interface StairElement extends BaseElement {
  readonly type: "stair";
  risers: number;                       // Number of risers (REQUIRED)
  riserHeight: number;                  // Riser height in mm (REQUIRED)
  treadDepth: number;                   // Tread depth in mm (REQUIRED)
  stairWidth: number;                   // Stair width in mm (REQUIRED)
  stairType?: "straight" | "L-shaped" | "U-shaped" | "spiral" | "curved";
  hasHandrails?: boolean;
  isEnclosed?: boolean;                 // Fire stair
}
```

### DSL Syntax

**⚠️ DOES NOT EXIST — NEEDS TO BE BUILT**

**Proposed syntax:**
```bash
stair --position 5,0 --risers 17 --riser-height 176 --tread-depth 280 --width 1200
stair --position 5,0 --type L-shaped --risers 20 --width 1000 --enclosed
stair --position 5,0 --type spiral --risers 16 --width 1500 --riser-height 190
```

**Proposed parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--position` | `x,y` | **required** | Start position in meters |
| `--risers` | `number` | **required** | Number of risers |
| `--riser-height` | `number` | `175` | Riser height in mm |
| `--tread-depth` | `number` | `280` | Tread depth in mm |
| `--width` | `number` | `1000` | Stair width in mm |
| `--type` | `string` | `"straight"` | Stair configuration |
| `--handrails` | `boolean` | `true` | Include handrails |
| `--enclosed` | `boolean` | `false` | Fire stair enclosure |
| `--direction` | `string` | `"up"` | Travel direction |
| `--level` | `string` | `"Level 1"` | Base level |

### Command Handler

**Exists:** ❌ NO

**Specification for handler:**
1. Parse position and stair parameters
2. Calculate total rise: `risers * riserHeight`
3. Calculate going: `(risers - 1) * treadDepth` (one fewer tread than risers)
4. Validate 2R + G rule: `2 * riserHeight + treadDepth` should be 550-700mm
5. For L-shaped: calculate landing position at midpoint
6. For U-shaped: calculate two runs with intermediate landing
7. For spiral: calculate diameter from width, total rotation
8. Call MCP tool `create_stair`
9. Store bounding box in modelStore

### MCP Tool

**Tool name:** `create_stair` — **DOES NOT EXIST**

**Proposed schema:**
```json
{
  "position": [x, y],
  "risers": 17,
  "riser_height": 0.176,        // Meters
  "tread_depth": 0.280,         // Meters
  "width": 1.0,                 // Meters
  "stair_type": "straight",
  "has_handrails": true,
  "is_enclosed": false,
  "direction": "up",            // up|down
  "level_id": "uuid",
  "reasoning": "string"
}
```

### 3D Rendering

**Not implemented.** Would need:
- Straight: Series of `THREE.BoxGeometry` treads stacked incrementally in height and position
- L-shaped: Two runs with a landing platform
- Spiral: `THREE.LatheGeometry` or custom helical geometry

### 2D Rendering

**No component exists.**

**Proposed 2D representation:**
- Outline rectangle of stair footprint
- Arrow indicating direction of travel (UP arrow convention)
- Parallel lines for each tread
- Break line at mid-height (architectural convention for stairs cut by floor plane)
- Landing shown as hatched rectangle (for L/U shapes)

### Relationships

| Relationship | Direction | Target Types | Description |
|-------------|-----------|--------------|-------------|
| `containedIn` | outgoing | Level | Base level |
| `connectedTo` | outgoing | Level | Level(s) this stair connects |
| `boundedBy` | outgoing | Wall | Enclosure walls (if enclosed) |

### Validation Rules

| Rule | Severity | Code | Description |
|------|----------|------|-------------|
| Riser height 150-200mm | error | `STAIR-001` | Building code limits |
| Tread depth ≥ 250mm | error | `STAIR-002` | Minimum tread |
| 2R + G = 550-700mm | warning | `STAIR-003` | Comfort formula |
| Width ≥ 900mm | error | `STAIR-004` | Minimum stair width |
| Width ≥ 1100mm if fire stair | error | `STAIR-005` | Fire stair minimum |
| Handrails required | warning | `STAIR-006` | Required for > 2 risers |
| Headroom ≥ 2000mm | error | `STAIR-007` | Minimum clearance |
| Max 16 risers without landing | warning | `STAIR-008` | UK Building Regs |

### Known Issues

1. **Entire element is a stub** — type interface only.
2. **All 4 fields are required** (`risers`, `riserHeight`, `treadDepth`, `stairWidth`) — no defaults possible from interface.
3. **Most complex geometry** of all element types — spiral stairs especially.
4. **Building code validation is locale-dependent** — UK, US, EU codes differ.

### Test Coverage

**Nothing exists.**

### Quality Gate

- [x] Type interface defined
- [x] Type guard `isStair()` exists
- [ ] Command handler
- [ ] MCP tool `create_stair`
- [ ] 2D SVG renderer with tread lines + direction arrow
- [ ] 3D Three.js renderer
- [ ] Building code compliance checks
- [ ] 2R+G comfort validation
- [ ] Landing calculation for L/U types
- [ ] IFC export mapping (IfcStairFlight)

---

## Element: Grid

### What
A structural grid system — a reference framework of horizontal and vertical grid lines with labeled bubble markers (A, B, C... and 1, 2, 3...). Grids don't represent physical elements but provide the coordination system for locating columns, beams, and walls. Standard in structural engineering practice.

### Type Interface

**⚠️ NOT DEFINED in `elements.ts`** — Grid is referenced by renderers as `GridElement` (imported from `types`) but the interface is **not in the type system**. The renderers cast to `GridElementType` which is likely defined inline or in a separate undiscovered file.

**Inferred interface from renderer usage:**
```typescript
interface GridElement extends BaseElement {
  readonly type: "grid";
  horizontalLines: Array<{ id: string; position: number }>;
  verticalLines: Array<{ id: string; position: number }>;
  bubbleSize?: number;                  // Bubble marker radius (default 24)
  lineColor?: string;                   // Grid line color (default "#6366f1")
  showBubbles?: boolean;                // Show bubble labels (default true)
}
```

### DSL Syntax

**⚠️ DOES NOT EXIST — NEEDS TO BE BUILT**

**Proposed syntax:**
```bash
grid --horizontal A:0,B:8,C:16 --vertical 1:0,2:6,3:12,4:18
grid --spacing-x 6 --spacing-y 8 --count-x 5 --count-y 4
grid --from-columns   # Auto-generate from placed columns
```

### Command Handler

**Exists:** ❌ NO

### MCP Tool

**Does not exist.**

### 3D Rendering

**Not implemented.** Grids are purely 2D reference elements — typically not shown in 3D.

### 2D Rendering

**File:** `app/src/components/canvas/elements/GridElement.tsx`
**Component:** `<GridElement>` — ✅ EXISTS but NOT exported from `elements/index.ts`

**Visual representation:**
- Horizontal lines: dashed indigo lines (`#6366f1`, `strokeDasharray="8 4"`, opacity 0.7)
- Vertical lines: same style
- Bubble markers: circles at both ends of each line with white text labels on dark background
- Subtle bounding box: dashed outline at 0.3 opacity
- Grid name label above
- Scale factor: `position * 0.1` (1mm = 0.1px)

### Relationships

| Relationship | Direction | Target Types | Description |
|-------------|-----------|--------------|-------------|
| `contains` | outgoing | Column | Columns at grid intersections |

### Known Issues

1. **Type interface missing from `elements.ts`** — not in the discriminated union `Element` type.
2. **Not exported from `elements/index.ts`** — cannot be rendered by the main Canvas2D dispatcher.
3. **No command handler** — cannot create grids from terminal.
4. **Renderer exists but is orphaned** — fully implemented SVG component with no way to feed it data.
5. **Scale factor `0.1` differs from wall SCALE of `100`** — coordinate system mismatch.

### Quality Gate

- [ ] Type interface added to `elements.ts` discriminated union
- [ ] Type guard `isGrid()` created
- [x] 2D renderer implemented (GridElement.tsx)
- [ ] Exported from elements/index.ts
- [ ] Command handler
- [ ] MCP tool
- [ ] Auto-generation from column layout
- [ ] Grid-snap for column placement

---

## Element: CurtainWall

### What
A non-structural exterior wall system consisting of a grid of mullions (vertical/horizontal framing) and glass panels. Unlike regular walls, curtain walls hang from the structure above rather than bearing loads. Common in commercial/high-rise buildings.

### Type Interface

**⚠️ NOT DEFINED in `elements.ts`** — Referenced by renderer but missing from type system.

**Inferred interface from renderer usage:**
```typescript
interface CurtainWallElement extends BaseElement {
  readonly type: "curtainwall";         // Note: not in ElementType union
  uDivisions?: number;                  // Horizontal panel divisions (default 5)
  vDivisions?: number;                  // Vertical panel divisions (default 8)
}
```

### DSL Syntax

**⚠️ DOES NOT EXIST**

**Proposed syntax:**
```bash
curtainwall --start 0,0 --end 20,0 --height 12 --u-divisions 4 --v-divisions 10
curtainwall --wall wall-001 --convert  # Convert existing wall to curtain wall
```

### Command Handler

**Exists:** ❌ NO

### MCP Tool

**Does not exist.** Note: `wall_type: "curtain"` exists in the MCP `create_wall` tool enum, but this creates a regular wall with curtain type, not a true curtain wall element.

### 3D Rendering

**Not implemented as separate element.** Curtain walls created via `create_wall --type curtain` render as regular walls in 3D.

### 2D Rendering

**File:** `app/src/components/canvas/elements/CurtainWallElement.tsx`
**Component:** `<CurtainWallElement>` — ✅ EXISTS but NOT exported from `elements/index.ts`

**Visual representation:**
- Main body: `<rect>` with semi-transparent sky blue fill (`#87ceeb`, opacity 0.3)
- Grid pattern: horizontal + vertical `<line>` elements creating panel divisions
- Mullion lines: `#708090` (slate gray)
- Thick border frame: `#475569` (2-3px)
- "CW" label in top-left corner
- Selection handles: 4 blue squares

### Known Issues

1. **Type not in discriminated union** — cannot be created through the type system.
2. **Renderer exists but is orphaned** — same as Grid.
3. **Not exported from index** — dead code.
4. **Panel/mullion properties ad-hoc:** `element.uDivisions` accessed directly without type safety.

### Quality Gate

- [ ] Type interface added to `elements.ts`
- [ ] Type guard `isCurtainWall()`
- [x] 2D renderer implemented
- [ ] Exported from elements/index.ts
- [ ] Command handler
- [ ] MCP tool
- [ ] 3D renderer with glass panels
- [ ] Panel customization (opaque, spandrel, etc.)
- [ ] Thermal performance analysis

---

## Element: Core

### What
A vertical service core containing elevators, stairs, and/or utility shafts. Cores are compound elements that span multiple floors and provide vertical circulation + services. They have thick structural walls forming a shaft.

### Type Interface

**⚠️ NOT DEFINED in `elements.ts`** — Referenced by renderer but missing from type system.

**Inferred interface from renderer usage:**
```typescript
interface CoreElement extends BaseElement {
  readonly type: "core";
  coreType: "elevator" | "stair" | "service" | "combined";
  wallThickness?: number;               // Core wall thickness in mm (default 200)
  elevatorCount?: number;               // Number of elevators
  stairCount?: number;                  // Number of stair flights
}
```

### DSL Syntax

**⚠️ DOES NOT EXIST**

**Proposed syntax:**
```bash
core --position 10,10 --width 6000 --depth 8000 --type combined --elevators 2 --stairs 1
core --position 5,5 --width 3000 --depth 3000 --type elevator --wall-thickness 250
```

### Command Handler

**Exists:** ❌ NO

### MCP Tool

**Does not exist.**

### 3D Rendering

**Not implemented.** Would render as thick-walled rectangular shaft with inner void.

### 2D Rendering

**File:** `app/src/components/canvas/elements/CoreElement.tsx`
**Component:** `<CoreElement>` — ✅ EXISTS but NOT exported from `elements/index.ts`

**Visual representation:**
- Outer boundary: `<rect>` with type-specific color (elevator=purple, stair=green, service=amber, combined=blue)
- Inner void: darker `<rect>` inset by `wallThickness * 0.1` on each side
- Type icon at center:
  - Elevator: up/down arrows in rectangle
  - Stair: step pattern (`<path>`)
  - Service: X in circle
  - Combined: split layout with elevator arrows + stair steps
- Elevator/stair count labels at bottom corners ("2E", "1S")
- Core name above element
- Selection handles: colored to match core type

### Relationships

| Relationship | Direction | Target Types | Description |
|-------------|-----------|--------------|-------------|
| `contains` | outgoing | Elevator, Stair | Elements within the core |
| `spans` | outgoing | Level | Levels the core connects |

### Known Issues

1. **Type not in discriminated union.**
2. **Renderer exists but orphaned.**
3. **Core is a compound element** — it should generate walls, floors, and stair/elevator elements within it.
4. **No multi-level support** — cores should span levels but the model is single-level.

### Quality Gate

- [ ] Type interface added to `elements.ts`
- [ ] Type guard `isCore()`
- [x] 2D renderer implemented (with icons!)
- [ ] Exported from elements/index.ts
- [ ] Command handler
- [ ] MCP tool
- [ ] 3D renderer
- [ ] Auto-generate enclosure walls
- [ ] Multi-level spanning

---

## Element: Building

### What
A container element representing an entire building. The building element defines the project boundary, contains all levels, tracks gross floor area, structural system, and occupancy type. It's the root of the IFC spatial hierarchy (IfcBuilding).

### Type Interface

**⚠️ NOT DEFINED in `elements.ts`** — Referenced by renderer but missing from type system.

**Inferred interface from renderer usage:**
```typescript
interface BuildingElement extends BaseElement {
  readonly type: "building";
  occupancyType?: "residential" | "commercial" | "mixed" | "industrial" | "institutional";
  levelCount?: number;
  grossFloorArea?: number;              // GFA in m²
  structuralSystem?: string;            // e.g., "concrete-frame", "steel-frame"
}
```

### DSL Syntax

**⚠️ DOES NOT EXIST**

**Proposed syntax (high-level):**
```bash
building --name "Tower A" --levels 12 --occupancy commercial --structural steel-frame
building --footprint 0,0 40,0 40,20 0,20 --levels 8 --occupancy residential
```

### Command Handler

**Exists:** ❌ NO

Note: MCP tool `create_simple_building` exists on the geometry server — this creates walls, floors, and a roof for a simple rectangular building in one shot. But it doesn't create a Building container element.

### MCP Tool

**`create_simple_building`** exists but creates constituent elements, not a Building element itself.

### 3D Rendering

**Not implemented as a separate element.** The building is an aggregate of its contained elements.

### 2D Rendering

**File:** `app/src/components/canvas/elements/BuildingElement.tsx`
**Component:** `<BuildingElement>` — ✅ EXISTS but NOT exported from `elements/index.ts`

**Visual representation:**
- Outline: dashed `<rect>` with occupancy-specific color (residential=green, commercial=blue, mixed=purple, industrial=amber, institutional=pink)
- Corner markers: L-shaped bracket lines at each corner
- Building icon: small rendered building pictogram with window grid + door
- Info panel: dark tooltip showing name, level count, occupancy, GFA
- Level count badge: colored circle at bottom-right with number
- Structural system label: top-right text
- Selection handles: large (10×10px) colored squares

### Relationships

| Relationship | Direction | Target Types | Description |
|-------------|-----------|--------------|-------------|
| `contains` | outgoing | Level, All Elements | Everything in the building |

### Known Issues

1. **Type not in discriminated union.**
2. **Renderer exists but orphaned.** Most fully-featured orphaned renderer.
3. **`create_simple_building` MCP tool exists** but creates walls/floors, not a Building element.
4. **No level management integration** — building should own levels.

### Quality Gate

- [ ] Type interface added to `elements.ts`
- [ ] Type guard `isBuilding()`
- [x] 2D renderer implemented (most detailed of all orphans)
- [ ] Exported from elements/index.ts
- [ ] Command handler
- [ ] MCP tool for Building element creation
- [ ] Level management integration
- [ ] GFA calculation
- [ ] IFC export mapping (IfcBuilding)

---

## Element: Opening

### What
A generic rectangular void cut into a wall. Openings are the parent concept for doors and windows — any rectangular cut that isn't specifically a door or window. Used for pass-throughs, service penetrations, and custom openings.

### Type Interface

**NOT defined as a separate element type.** Openings are handled through the MCP tool `create_opening` which creates a generic void in a wall.

### DSL Syntax

**No dedicated command.** Use the MCP tool directly or door/window commands.

### MCP Tool

**Tool name:** `create_opening`
**Server:** `pensaer-geometry`

**Input schema:**
```json
{
  "host_id": "uuid",            // Required. Wall UUID.
  "offset": 2.0,                // Required. Distance from wall start.
  "width": 1.0,                 // Required. Opening width in meters.
  "height": 2.0,                // Required. Opening height in meters.
  "base_height": 0.0,           // Height from floor to opening base.
  "opening_type": "generic",    // door|window|generic
  "reasoning": "string"
}
```

### 3D Rendering

Openings are rendered as CSG boolean subtractions from the host wall — same mechanism as doors/windows but without a panel or glass pane.

### 2D Rendering

**No dedicated renderer.** Generic openings would appear as gaps in the wall (void).

### Known Issues

1. **No TypeScript element type** — exists only as an MCP tool concept.
2. **No command handler** — no terminal DSL for creating openings.
3. **No 2D renderer** — openings are invisible unless you place a door/window.

### Quality Gate

- [ ] Type interface added to `elements.ts` (or handled as subtype of door/window)
- [ ] Command handler: `opening --wall ... --offset ... --width ... --height ...`
- [x] MCP tool exists
- [ ] 2D renderer
- [ ] 3D CSG boolean working

---

## Cross-Cutting Concerns

### Properties Bag vs. Typed Interface

**Current situation:** There are TWO representations of element properties.

1. **Typed interfaces** in `elements.ts`: `WallElement.thickness`, `DoorElement.doorWidth`, etc.
2. **Properties bag** in practice: `element.properties: Record<string, string|number|boolean>` from `LegacyElement`

The command handlers create elements using the properties bag pattern (e.g., `properties: { thickness: "200mm", height: "3000mm" }`), while the type system expects numeric fields directly on the interface.

**Impact:** Type guards work on the `type` discriminator but accessing typed fields like `element.thickness` on a `WallElement` may return `undefined` if the element was created through the command handler which puts everything in `properties`.

**Resolution needed:** Migrate command handlers to populate typed fields OR update interfaces to reflect the actual properties-bag pattern.

### Relationship Consistency

Relationships should always be bidirectional:
- If `door.hostedBy = wall-1`, then `wall-1.hosts` should include `door-id`
- If `room.boundedBy` includes `wall-1`, then `wall-1.bounds` should include `room-id`

**Current status:** Only door/window ↔ wall host relationships are maintained bidirectionally. All others are manually managed or missing.

### Coordinate Systems

| Context | Unit | Scale | Notes |
|---------|------|-------|-------|
| TypeScript interfaces | mm | — | BaseElement.x/y in mm |
| DSL input | m | — | Users type in meters |
| Command handler storage | px | ×100 | `x = meters * 100` |
| MCP server | m | — | Geometry calculations in meters |
| Properties bag | mixed | — | `"200mm"`, `"3.0"`, etc. |
| 3D renderer | m | ÷ varies | Parses back from properties |
| 2D renderer | px | — | Uses stored x/y/width/height directly |

**This is a mess.** The declared unit in the interface comments says "mm" but the command handlers store values in `SCALE = 100` pixels-per-meter, meaning a 5m wall stores `x = 500` which is neither mm nor m.

---

## Element Maturity Matrix

| Element | Type Interface | Type Guard | Command Handler | MCP Tool | 2D Renderer | 3D Renderer | Exported | Tests | Score |
|---------|---------------|------------|-----------------|----------|-------------|-------------|----------|-------|-------|
| **Wall** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **9/9** |
| **Floor** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | **8/9** |
| **Roof** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | **8/9** |
| **Room** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | **8/9** |
| **Door** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **9/9** |
| **Window** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **9/9** |
| **Column** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | — | ❌ | **2/9** |
| **Beam** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | — | ❌ | **2/9** |
| **Stair** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | — | ❌ | **2/9** |
| **Grid** | ❌ | ❌ | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ | **1/9** |
| **CurtainWall** | ❌ | ❌ | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ | **1/9** |
| **Core** | ❌ | ❌ | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ | **1/9** |
| **Building** | ❌ | ❌ | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ | **1/9** |
| **Opening** | ❌ | ❌ | ❌ | ✅ | ❌ | ⚠️ | — | ❌ | **1/9** |

*\* Renderer exists but is orphaned (not exported, not in type union)*

### Priority Build Order for Missing Elements

1. **Column** — Required for structural modeling. Simplest of the missing structural elements.
2. **Beam** — Required for structural frames. Similar to wall creation (start/end points).
3. **Grid** — Reference system for structural layout. Renderer already exists — wire it up.
4. **Building** — Container element. Renderer exists. IFC export needs it.
5. **Stair** — Most complex geometry. Critical for egress compliance.
6. **Core** — Compound element. Depends on stair + elevator implementation.
7. **CurtainWall** — Specialized wall variant. Lower priority.
8. **Opening** — Can be handled through door/window tools for now.

---

*End of Part 2 — Pensaer Engineering Encyclopedia*
*Next: Part 3 — The Rendering Pipeline (2D SVG, 3D Three.js, CSG Operations)*
