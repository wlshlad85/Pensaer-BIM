# Pensaer Engineering Encyclopedia — Part 3: Commands & Tools

> **Author:** Max, CTO · **Version:** 1.0 · **Date:** 2025-01-27
> **Scope:** Every command, DSL syntax rule, and MCP tool in the Pensaer-BIM platform

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Layer 1: DSL Parser Commands](#2-layer-1-dsl-parser-commands)
3. [Layer 2: Command Dispatcher Handlers](#3-layer-2-command-dispatcher-handlers)
4. [Layer 3: MCP Server Tools](#4-layer-3-mcp-server-tools)
5. [How the Three Layers Connect](#5-how-the-three-layers-connect)
6. [The Executor Bridge (DSL → Commands)](#6-the-executor-bridge)
7. [Variable References](#7-variable-references)
8. [Macro System](#8-macro-system)
9. [Terminal Component Input Flow](#9-terminal-component-input-flow)
10. [Complete Command Matrix](#10-complete-command-matrix)

---

## 1. Architecture Overview

Pensaer has **three command layers** that process user input:

```
┌─────────────────────────────────────────────────────────────┐
│  Terminal (xterm.js)                                        │
│  User types: "wall 0,0 10,0 --height 3"                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: DSL Parser (parser.ts)                            │
│  Tokenizes → Parses → AST node (CreateWallCommand)          │
│  Routes: wall, walls, floor, roof, room, door, window,      │
│          opening, rect, box, help                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  BRIDGE: Executor (executor.ts)                             │
│  Resolves $variables → Converts AST→args → Dispatches       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: Command Dispatcher (commandDispatcher.ts)         │
│  Registry of CommandHandlers → parses --flags → executes    │
│  Non-DSL commands (help, clear, status, etc.) go here       │
│  directly from Terminal.tsx                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: MCP Servers (4 Python servers)                    │
│  geometry-server  │ spatial-server │ validation │ docs      │
│  Called via mcpClient.callTool()                             │
└─────────────────────────────────────────────────────────────┘
```

**Key routing rule:** Element-creation commands (`wall`, `floor`, `roof`, `room`, `door`, `window`, `opening`, `rect`, `box`, `walls`) go through the DSL parser first. Everything else (`help`, `clear`, `status`, `list`, `delete`, `clash`, etc.) goes directly to the command dispatcher via a `switch` statement in `Terminal.tsx`.

---

## 2. Layer 1: DSL Parser Commands

**Source:** `app/src/lib/dsl/parser.ts` (recursive descent parser)
**Lexer:** `app/src/lib/dsl/lexer.ts` → `tokens.ts`
**AST:** `app/src/lib/dsl/ast.ts`

The parser is a hand-written recursive descent parser. It tokenizes input via the lexer, then consumes tokens to build AST nodes.

### 2.1 `wall` — Create a single wall

**AST Node:** `CreateWallCommand`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `start` | `Point2D` | *required* | Start point (x, y) in meters |
| `end` | `Point2D` | *required* | End point (x, y) in meters |
| `height` | `number` | `3.0` | Wall height in meters |
| `thickness` | `number` | `0.2` | Wall thickness in meters |
| `wallType` | `WallType?` | — | `basic`, `structural`, `curtain`, `retaining` |
| `levelId` | `string?` | — | Level identifier |
| `material` | `string?` | — | Material name |

**Syntax variants:**
```bash
# Flag-based (preferred)
wall --start 0,0 --end 5,0
wall --start 0,0 --end 5,0 --height 3 --thickness 0.2 --type structural

# Natural syntax
wall (0, 0) (5, 0)
wall 0,0 5,0
wall from (0, 0) to (5, 0)
wall from 0,0 to 10,0 height 3 thickness 0.3

# Short flags
wall --start 0,0 --end 5,0 -h 3.5 -t 0.15
```

**Validation rules:**
- Start and end points cannot be identical
- Minimum wall length: 0.1m (100mm)
- Points accept: `(x, y)`, `(x y)`, `x,y` formats

**Status:** ✅ Working
**Test:** `wall 0,0 5,0` → creates wall, returns wall_id
**Quality Gate:** Element appears in model store, visible on canvas

---

### 2.2 `walls` / `rect` / `box` — Create rectangular walls

**AST Node:** `CreateRectWallsCommand`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `minPoint` | `Point2D` | *required* | Bottom-left corner |
| `maxPoint` | `Point2D` | *required* | Top-right corner |
| `height` | `number` | `3.0` | Wall height |
| `thickness` | `number` | `0.2` | Wall thickness |

**Syntax variants:**
```bash
rect (0, 0) (10, 10)
box (0, 0) (10, 8) height 3
walls rect (0, 0) (10, 10)
walls (0, 0) (10, 8)
rect 0,0 10,8 --height 3.5
```

**Execution:** Expands to 4 individual `wall` commands (bottom, right, top, left) via `executeRectWalls()` in executor.ts.

**Status:** ✅ Working
**Test:** `rect 0,0 10,8` → creates 4 walls forming a rectangle
**Quality Gate:** 4 wall elements in store, `$last` and `$wall` point to last created wall

---

### 2.3 `floor` — Create a floor slab

**AST Node:** `CreateFloorCommand`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `points` | `Point2D[]` | *required* | Polygon boundary (min 3 points) |
| `thickness` | `number` | `0.15` | Slab thickness in meters |
| `level` | `number` | `0` | Level/elevation |
| `levelId` | `string?` | — | Level ID string |
| `floorType` | `string?` | — | `slab`, `suspended`, `foundation` |

**Syntax:**
```bash
floor --points 0,0 10,0 10,8 0,8
floor --min 0,0 --max 10,8
floor --min 0,0 --max 5,5 --thickness 0.15 --level "Level 2"
floor --points 0,0 6,0 6,4 3,4 3,2 0,2 --thickness 0.2
```

**Status:** ✅ Working
**Test:** `floor --min 0,0 --max 10,10` → creates floor element with area
**Quality Gate:** Floor element with calculated area in m²

---

### 2.4 `roof` — Create a roof element

**AST Node:** `CreateRoofCommand`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `points` | `Point2D[]` | *required* | Polygon boundary (min 3 points) |
| `roofType` | `RoofType` | `gable` | `flat`, `gable`, `hip`, `shed`, `mansard` |
| `slope` | `number` | `30` | Slope angle in degrees |
| `overhang` | `number` | `0.5` | Overhang distance in meters |
| `ridgeDirection` | `"x" \| "y"?` | — | Ridge alignment |
| `levelId` | `string?` | — | Level ID |

**Syntax:**
```bash
roof --type gable --points 0,0 10,0 10,8 0,8
roof --type hip --min 0,0 --max 10,10 --slope 30
roof --type flat --min 0,0 --max 10,10 --overhang 0.5
roof --type gable --points 0,0 12,0 12,8 0,8 --slope 35 --ridge x
```

**Status:** ✅ Working
**Test:** `roof --type gable --min 0,0 --max 10,8` → creates roof with footprint area
**Quality Gate:** Roof element in store with correct type and slope

---

### 2.5 `room` — Create a room/space

**AST Node:** `CreateRoomCommand`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `points` | `Point2D[]` | *required* | Room boundary polygon |
| `name` | `string?` | — | Room name (e.g., "Living Room") |
| `number` | `string?` | — | Room number (e.g., "101") |
| `roomType` | `RoomType?` | — | `bedroom`, `bathroom`, `kitchen`, `living`, `dining`, `office`, `storage`, `generic` |
| `height` | `number` | `3.0` | Room height |
| `levelId` | `string?` | — | Level ID |

**Syntax:**
```bash
room --points 0,0 5,0 5,4 0,4 --name "Living Room"
room --min 0,0 --max 5,5 --name Kitchen --type kitchen
room --points 0,0 3,0 3,2 0,2 --name Bathroom --number 101 --type bathroom
```

**Status:** ✅ Working
**Test:** `room --min 0,0 --max 5,4 --name "Kitchen" --type kitchen` → room with area, type-specific finishes
**Quality Gate:** Room element with area, centroid, type-based defaults (floor finish, occupancy)

---

### 2.6 `door` — Place a door in a wall

**AST Node:** `PlaceDoorCommand`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `wallRef` | `ElementRef` | *required* | Wall reference (UUID, `$last`, `$selected`, `$wall`) |
| `offset` | `number` | *required* | Distance along wall to door center (meters) |
| `width` | `number` | `0.9` | Door width |
| `height` | `number` | `2.1` | Door height |
| `doorType` | `DoorType?` | — | `single`, `double`, `sliding`, `folding`, `revolving`, `pocket` |
| `swing` | `SwingDirection?` | — | `left`, `right`, `both`, `none` |

**Syntax:**
```bash
door $last 2.5
door in $last at 2.5
door $wall 1.5 --type double --swing right
door in <uuid> at 3.0 --width 0.9 --height 2.1 --type sliding
```

**Edge cases:**
- Validates door fits within wall length
- Validates door doesn't extend past wall start/end
- Double doors use `width * 2` for effective width

**Status:** ✅ Working
**Test:** Create wall, then `door $last 2.5` → door placed in wall
**Quality Gate:** Door element created, wall's `hosts` relationship updated

---

### 2.7 `window` — Place a window in a wall

**AST Node:** `PlaceWindowCommand`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `wallRef` | `ElementRef` | *required* | Wall reference |
| `offset` | `number` | *required* | Distance along wall |
| `width` | `number` | `1.2` | Window width |
| `height` | `number` | `1.0` | Window height |
| `sillHeight` | `number` | `0.9` | Height from floor to sill |
| `windowType` | `WindowType?` | — | `fixed`, `casement`, `double_hung`, `sliding`, `awning`, `hopper`, `pivot` |

**Syntax:**
```bash
window $last 1.5
window in $wall at 2.0 --sill 0.9 --type casement
window $last 2.5 --width 1.2 --height 1.5 --type awning
```

**Edge cases:**
- Validates horizontal fit (offset ± width/2 within wall length)
- Validates vertical fit (sill + height ≤ wall height)
- Sill height cannot be negative

**Status:** ✅ Working
**Test:** Create wall, then `window $last 2.0` → window placed
**Quality Gate:** Window element, wall `hosts` updated, glazing type set

---

### 2.8 `opening` — Create a generic opening in a wall

**AST Node:** `CreateOpeningCommand`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `wallRef` | `ElementRef` | *required* | Wall reference |
| `offset` | `number` | *required* | Distance along wall |
| `width` | `number` | `1.0` | Opening width |
| `height` | `number` | `1.0` | Opening height |
| `baseHeight` | `number` | `0.0` | Height from floor to opening bottom |

**Syntax:**
```bash
opening $last 2.0
opening in $wall at 3.0 --width 2.0 --height 2.5
```

**Status:** ⚠️ Partial — Parser works, but no dedicated command handler registered. Maps to MCP `create_opening` tool via executor but handler registration is missing in `elementCommands.ts`.
**Test:** `opening $last 2.0` → should dispatch but may fail at handler level
**Quality Gate:** Opening element created in wall

---

### 2.9 `help` — Show help

**AST Node:** `HelpCommand`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `topic` | `string?` | — | Optional topic/command name |

**Syntax:**
```bash
help
help wall
help door
```

**Status:** ✅ Working (routes to dispatcher `help` command)

---

### 2.10 Parser Error Handling

The parser provides:
- **Fuzzy command suggestions:** Unknown commands trigger `findSimilar()` against `KNOWN_COMMANDS` using edit distance
- **Contextual error messages:** Each parse failure includes line, column, and expected syntax examples
- **Error formatting:** `errorFormatter.ts` produces ANSI-colored terminal output with line indicators

---

## 3. Layer 2: Command Dispatcher Handlers

**Source:** `app/src/services/commandDispatcher.ts` (registry + dispatch)
**Handlers:** `app/src/commands/handlers/builtinCommands.ts`, `elementCommands.ts`

The command dispatcher uses a **registry pattern**. Each command is registered with a `CommandDefinition` containing name, description, usage, examples, and handler function.

### 3.1 Built-in Commands (`builtinCommands.ts`)

#### `help`
- **Handler:** `helpHandler`
- **Args:** `{ command?: string }`
- **What it does:** Lists all registered commands grouped by category, or shows detailed help for a specific command
- **Return:** `{ total_commands, builtin: [...], elements: [...], analysis: [...] }`
- **Status:** ✅ Working

#### `clear`
- **Handler:** `clearHandler`
- **Args:** none
- **What it does:** Returns `__CLEAR_TERMINAL__` magic string. Terminal.tsx intercepts this and calls `terminal.clear()`
- **Status:** ✅ Working

#### `status`
- **Handler:** `statusHandler`
- **Args:** none
- **What it does:** Reads `modelStore` and `historyStore` to return element counts by type, level count, selection count, undo/redo availability, issue counts, AI suggestion count
- **Return:** `{ total_elements, elements_by_type, levels, selected, history, issues, ai_suggestions }`
- **Status:** ✅ Working

#### `version`
- **Handler:** `versionHandler`
- **Args:** none
- **What it does:** Returns version info: app v0.1.0, Phase 1 Foundation, kernel version, MCP mode, build date
- **Return:** `{ version, phase, kernel, client, mcp_mode, build_date, environment }`
- **Status:** ✅ Working

#### `echo`
- **Handler:** `echoHandler`
- **Args:** `{ text?: string, _raw?: string[] }`
- **What it does:** Echoes input text back to terminal
- **Status:** ✅ Working

#### `macro`
- **Handler:** `macroHandler`
- **Args:** `{ subcommand: string, name?: string }`
- **Subcommands:** `record`, `stop`, `cancel`, `play`, `list`, `delete`, `export`
- **What it does:** Full macro system — see [Section 8](#8-macro-system)
- **Status:** ✅ Working

---

### 3.2 Element Commands (`elementCommands.ts`)

#### `wall`
- **Handler:** `createWallHandler`
- **Args:** `{ start: number[], end: number[], height?: number, thickness?: number, material?: string, level?: string, type?: string }`
- **What it does:** Validates start≠end and min length, calls MCP `create_wall`, creates `Element` in `modelStore`, records history action
- **Return:** `{ wall_id, length, height, thickness }` + `elementCreated`
- **Scale:** 100 pixels per meter
- **Status:** ✅ Working

#### `floor`
- **Handler:** `createFloorHandler`
- **Args:** `{ points?: number[][], min?: number[], max?: number[], thickness?: number, level?: string }`
- **What it does:** Accepts polygon (`--points`) or rectangle (`--min/--max`), auto-closes polygon, computes area via shoelace formula, calls MCP `create_floor`
- **Return:** `{ floor_id, area, thickness, level, point_count }`
- **Status:** ✅ Working

#### `roof`
- **Handler:** `createRoofHandler`
- **Args:** `{ points?: number[][], min?: number[], max?: number[], type?: string, slope?: number, overhang?: number, ridge?: string }`
- **What it does:** Similar to floor — polygon or rect, calls MCP `create_roof`
- **Return:** `{ roof_id, roof_type, slope, overhang, footprint_area, point_count }`
- **Status:** ✅ Working

#### `room`
- **Handler:** `createRoomHandler`
- **Args:** `{ points?: number[][], min?: number[], max?: number[], name?: string, number?: string, type?: string, height?: number }`
- **What it does:** Creates room with type-specific defaults (finish floor, walls, occupancy). 10 room types supported: bedroom, bathroom, kitchen, living, dining, office, storage, hallway, utility, garage, other
- **Return:** `{ room_id, name, area, room_type, point_count }`
- **Status:** ✅ Working

#### `door`
- **Handler:** `placeDoorHandler`
- **Args:** `{ wall: string, offset?: number, position?: number, width?: number, height?: number, type?: string, swing?: string }`
- **What it does:** Validates wall exists and is type "wall", validates placement (door fits within wall bounds), calls MCP `place_door`, creates door element, updates wall's `hosts` relationship
- **Context-aware:** If no `--wall` specified but one element selected, uses that
- **Return:** `{ door_id, wall_id, offset, width, height, door_type, wall_length }`
- **Status:** ✅ Working

#### `window`
- **Handler:** `placeWindowHandler`
- **Args:** `{ wall: string, offset?: number, position?: number, width?: number, height?: number, sill?: number, type?: string }`
- **What it does:** Like door but also validates vertical fit (sill + height ≤ wall height). Sets glazing type based on window type.
- **Context-aware:** Same as door
- **Return:** `{ window_id, wall_id, offset, width, height, sill_height, window_type, wall_length }`
- **Status:** ✅ Working

#### `delete`
- **Handler:** `deleteElementsHandler`
- **Args:** `{ element_ids?: string[] }`
- **What it does:** Uses provided IDs or falls back to selected elements. Calls MCP `delete_element`, then deletes from `modelStore`.
- **Context-aware:** ✅ Auto-injects selected IDs
- **Status:** ✅ Working

#### `get`
- **Handler:** `getElementHandler`
- **Args:** `{ element_id?: string }`
- **What it does:** Gets element from local `modelStore` first (fast path), falls back to MCP `get_element`
- **Context-aware:** ✅ Uses selected element if one selected
- **Status:** ✅ Working

#### `list`
- **Handler:** `listElementsHandler`
- **Args:** `{ category?: string }`
- **What it does:** Lists elements from `modelStore`, groups by type
- **Return:** `{ elements: [{id, type, name}], count, by_type }`
- **Status:** ✅ Working

#### `detect-rooms`
- **Handler:** `detectRoomsHandler`
- **Args:** none
- **What it does:** Passthrough to MCP `detect_rooms`
- **Status:** ✅ Working

#### `analyze`
- **Handler:** `analyzeTopologyHandler`
- **Args:** none
- **What it does:** Passthrough to MCP `analyze_wall_topology`
- **Status:** ✅ Working

#### `clash`
- **Handler:** `detectClashesHandler`
- **Args:** `{ ids?: string, element_ids?: string[], tolerance?: number, clearance?: number, ignore_same_type?: boolean }`
- **What it does:** Passthrough to MCP `detect_clashes`
- **Context-aware:** ✅ Falls back to selected IDs
- **Status:** ✅ Working

#### `clash-between`
- **Handler:** `detectClashesBetweenSetsHandler`
- **Args:** `{ a: string, b: string, tolerance?: number, clearance?: number }`
- **What it does:** Passthrough to MCP `detect_clashes_between_sets`
- **Status:** ✅ Working

---

### 3.3 Terminal-Only Commands (handled in Terminal.tsx switch, not via dispatcher)

These commands are handled directly in `Terminal.tsx`'s `processCommand()` switch statement and call `mcpClient.callTool()` directly, bypassing the command dispatcher:

| Command | What it does | Status |
|---------|-------------|--------|
| `adjacency` | Calls `detect_rooms` then builds adjacency from shared walls | ⚠️ Partial (basic) |
| `nearest` | Calls `list_elements`, filters by distance from point | ⚠️ Partial (client-side) |
| `area` | Calls `detect_rooms`, finds matching room, shows area | ⚠️ Partial |
| `clearance` | Uses `detect_clashes` with clearance param as proxy | ⚠️ Partial |

---

## 4. Layer 3: MCP Server Tools

Four Python MCP servers communicate via stdio using the Model Context Protocol.

### 4.1 Geometry Server (`pensaer-geometry`)

**Source:** `server/mcp-servers/geometry-server/geometry_server/geometry_mcp.py`
**Features:** Self-healing argument parsing, circuit breaker, audit logging
**Rust kernel:** Uses `pensaer_geometry` (PyO3) for actual geometry operations

| # | Tool Name | Required Params | Key Optional Params | Status |
|---|-----------|----------------|---------------------|--------|
| 1 | `create_wall` | `start: [x,y]`, `end: [x,y]` | `height`, `thickness`, `wall_type`, `material`, `level_id` | ✅ |
| 2 | `create_rectangular_walls` | `min_point`, `max_point` | `height`, `thickness` | ✅ |
| 3 | `create_floor` | `min_point`, `max_point` | `thickness`, `floor_type`, `level_id` | ✅ |
| 4 | `create_room` | `name`, `number`, `min_point`, `max_point` | `height` | ✅ |
| 5 | `place_door` | `wall_id`, `offset` | `width`, `height`, `door_type`, `swing` | ✅ |
| 6 | `place_window` | `wall_id`, `offset` | `width`, `height`, `sill_height`, `window_type` | ✅ |
| 7 | `create_opening` | `host_id`, `offset`, `width`, `height` | `base_height`, `opening_type` | ✅ |
| 8 | `detect_joins` | `wall_ids: string[]` | `tolerance` | ✅ |
| 9 | `get_element` | `element_id` | — | ✅ |
| 10 | `list_elements` | — | `category`, `level_id`, `limit`, `offset` | ✅ |
| 11 | `delete_element` | `element_ids: string[]` | — | ✅ |
| 12 | `modify_element` | `element_id` | `properties`, `geometry` | ✅ |
| 13 | `generate_mesh` | `element_id` | `format` (json/obj) | ✅ |
| 14 | `validate_mesh` | `element_id` | — | ✅ |
| 15 | `compute_mesh` | `element_id` | `include_normals`, `include_uvs`, `lod_level`, `format` (gltf/json/obj) | ✅ |
| 16 | `compute_mesh_batch` | `element_ids: string[]` | `merge`, `format`, `compute_normals` | ✅ |
| 17 | `create_simple_building` | `min_point`, `max_point`, `room_name`, `room_number` | `wall_height`, `wall_thickness`, `floor_thickness` | ✅ |
| 18 | `create_roof` | `min_point`, `max_point` | `thickness`, `roof_type`, `slope_degrees`, `ridge_along_x`, `eave_overhang`, `base_elevation` | ✅ |
| 19 | `attach_roof_to_walls` | `roof_id`, `wall_ids: string[]` | — | ✅ |
| 20 | `select_elements` | `element_ids: string[]` | `mode` (replace/add/remove/toggle) | ✅ |
| 21 | `get_selection` | — | `include_details`, `category` | ✅ |
| 22 | `clear_selection` | — | — | ✅ |
| 23 | `select_by_type` | `element_type` | `mode` | ✅ |
| 24 | `create_group` | `name`, `element_ids` | `metadata` | ✅ |
| 25 | `add_to_group` | `group_id`, `element_ids` | — | ✅ |
| 26 | `remove_from_group` | `group_id`, `element_ids` | — | ✅ |
| 27 | `delete_group` | `group_id` | — | ✅ |
| 28 | `get_group` | `group_id` | `include_details` | ✅ |
| 29 | `list_groups` | — | `include_elements` | ✅ |
| 30 | `select_group` | `group_id` | `mode` | ✅ |
| 31 | `boolean_operation` | `operation`, `target_id`, `tool_id` | — | ❌ Placeholder (Phase 3) |
| 32 | `detect_rooms` | — | `wall_ids`, `tolerance` | ✅ |
| 33 | `analyze_wall_topology` | — | `wall_ids`, `tolerance` | ✅ |
| 34 | `detect_clashes` | — | `element_ids`, `tolerance`, `clearance`, `ignore_same_type` | ✅ |
| 35 | `detect_clashes_between_sets` | `set_a_ids`, `set_b_ids` | `tolerance`, `clearance` | ✅ |
| 36 | `get_state_summary` | — | — | ✅ |
| 37 | `get_self_healing_status` | — | — | ✅ |

**Self-Healing System:**
- `self_healing.py` provides `heal_tool_args()` — fuzzy matches argument names, applies semantic aliases
- Circuit breaker tracks success/failure rates, disables self-healing when error rate is too high
- All corrections logged in `ArgumentHealer.corrections`

---

### 4.2 Spatial Server (`pensaer-spatial-server`)

**Source:** `server/mcp-servers/spatial-server/spatial_server/server.py`
**Features:** Pure geometry utilities, room detection with Python fallback + Rust kernel

| # | Tool Name | Required Params | Key Optional Params | Status |
|---|-----------|----------------|---------------------|--------|
| 1 | `compute_adjacency` | `rooms: [{id, boundary_wall_ids}]` | — | ✅ |
| 2 | `find_nearest` | `x`, `y`, `radius`, `elements: [...]` | `element_types`, `limit` | ✅ |
| 3 | `compute_area` | `polygon: [[x,y], ...]` | `include_holes` | ✅ |
| 4 | `check_clearance` | `element`, `clearance_type` | `min_clearance`, `obstacles` | ✅ |
| 5 | `analyze_circulation` | `rooms`, `doors` | `start_room_id`, `end_room_id` | ✅ |
| 6 | `point_in_polygon` | `point: [x,y]`, `polygon: [[x,y], ...]` | — | ✅ |
| 7 | `detect_rooms` | `walls: [{start, end, ...}]` | `tolerance`, `level` | ✅ |

**`detect_rooms` implementation detail:**
- Tries Rust kernel `pensaer_geometry.detect_rooms()` first
- Falls back to pure Python `TopologyGraphPy` with "turn-right" (minimum angle) algorithm
- Traces closed wall loops, computes area via shoelace, returns interior rooms only

**`analyze_circulation` detail:**
- Builds room connectivity graph from doors and their host walls
- BFS shortest path between rooms
- Returns dead-end rooms, isolated rooms, path existence

---

### 4.3 Validation Server (`pensaer-validation-server`)

**Source:** `server/mcp-servers/validation-server/validation_server/server.py`
**Features:** Building code compliance checks (ADA, IBC, fire safety)

| # | Tool Name | Required Params | Key Optional Params | Status |
|---|-----------|----------------|---------------------|--------|
| 1 | `validate_model` | `elements` | `rooms`, `doors`, `categories`, `severity_threshold` | ✅ |
| 2 | `check_fire_compliance` | `elements` | `rooms`, `fire_rating_requirements`, `max_compartment_area` | ✅ |
| 3 | `check_accessibility` | `doors` | `corridors`, `rooms`, `standard` (ADA/DDA/ISO21542) | ✅ |
| 4 | `check_egress` | `rooms`, `doors` | `occupancy_type`, `max_travel_distance` | ✅ |
| 5 | `check_door_clearances` | `doors` | `walls`, `min_clear_width`, `min_maneuvering_clearance` | ✅ |
| 6 | `check_stair_compliance` | `stairs` | `building_code` (IBC/NBC/BS) | ✅ |
| 7 | `detect_clashes` | `elements` | `tolerance`, `element_types`, `severity_threshold`, `severity_levels`, `batch_size`, `clearance_distance` | ✅ |
| 8 | `detect_clashes_between_sets` | `set_a`, `set_b` | `tolerance`, `clearance_distance` | ✅ |

**`validate_model` categories:** `geometry`, `accessibility`, `fire_safety`, `egress`, `general`

**Validation issue codes:**
- `GEOM001-004`: Geometry issues (zero-length walls, invalid dimensions)
- `ADA001-002`: Accessibility (door width, wheelchair space)
- `FIRE001-002`: Fire safety (compartment area, exit count)
- `EGRESS001-002`: Egress (exit count, exit capacity)
- `GEN001-002`: General (missing IDs, duplicate IDs)
- `ACCESS001-004`: Detailed accessibility checks
- `FIRE010-011`: Detailed fire compliance
- `EGRESS010-012`: Detailed egress checks
- `DOOR001-002`: Door clearance checks
- `STAIR001-005`: Stair dimension compliance

**Compliance constants embedded:**
- ADA: door_clear_width=0.815m, corridor_width=0.915m, turning_radius=1.525m
- IBC stairs: min_width=1.118m, max_riser=0.178m, min_tread=0.279m, headroom=2.032m
- Fire: max compartment area=500m²

---

### 4.4 Documentation Server (`pensaer-documentation-server`)

**Source:** `server/mcp-servers/documentation-server/documentation_server/server.py`
**Features:** Schedule generation, IFC export, compliance reports, BCF export

| # | Tool Name | Required Params | Key Optional Params | Status |
|---|-----------|----------------|---------------------|--------|
| 1 | `generate_schedule` | `element_type`, `elements` | `properties`, `format` (table/csv/json), `sort_by`, `group_by` | ✅ |
| 2 | `export_ifc` | `elements` | `project_name`, `ifc_version` (IFC2X3/IFC4/IFC4X3), `include_properties` | ✅ |
| 3 | `export_report` | `report_type` | `elements`, `validation_results`, `format` (markdown/html), `include_summary` | ✅ |
| 4 | `generate_quantities` | `element_type`, `elements` | `group_by`, `include_totals` | ✅ |
| 5 | `export_csv` | `elements` | `properties`, `include_header` | ✅ |
| 6 | `door_schedule` | `doors` | `format`, `include_fire_rating`, `sort_by`, `group_by` | ✅ |
| 7 | `window_schedule` | `windows` | `format`, `include_glazing`, `include_u_value`, `sort_by`, `group_by` | ✅ |
| 8 | `room_schedule` | `rooms` | `format`, `include_area`, `include_finishes`, `sort_by`, `group_by` | ✅ |
| 9 | `export_bcf` | `issues` | `project_name`, `author`, `include_viewpoints`, `bcf_version` (2.0/2.1/3.0) | ✅ |

**Report types:** `fire_safety`, `accessibility`, `model_summary`, `validation`

**IFC type mapping:**
- wall → `IfcWall`, door → `IfcDoor`, window → `IfcWindow`, floor → `IfcSlab`, room → `IfcSpace`, roof → `IfcRoof`

**Note:** IFC and BCF exports produce structured JSON representations, not actual binary/XML files. Real serialization requires IFC/BCF libraries.

---

## 5. How the Three Layers Connect

### 5.1 DSL Commands Flow

```
"wall 0,0 10,0 height 3"
    │
    ▼ Terminal.tsx: DSL_COMMANDS.has("wall") → true
    │
    ▼ executeDsl(input, context)         [executor.ts]
    │
    ▼ parse(input)                       [parser.ts]
    │   Returns: ParseResult { commands: [CreateWallCommand], errors: [], success: true }
    │
    ▼ executeCommands(commands, context)  [executor.ts]
    │
    ▼ executeCommand(cmd, context)        [executor.ts]
    │   COMMAND_TO_TOOL["CreateWall"] → "wall"
    │   commandToMcpArgs(cmd) → { start: [0,0], end: [10,0], height: 3, ... }
    │   resolveVariablesInArgs(args, context) → resolves $last/$wall/$selected
    │
    ▼ dispatchCommand("wall", args)       [commandDispatcher.ts]
    │   Looks up "wall" in commandRegistry → createWallHandler
    │
    ▼ createWallHandler(args, context)    [elementCommands.ts]
    │   callMcpTool("create_wall", { start, end, height, ... })
    │   Creates Element in modelStore
    │   Records history action
    │
    ▼ mcpClient.callTool({ tool: "create_wall", arguments: {...} })
    │   [mcpClient.ts → geometry MCP server]
    │
    ▼ Result flows back up: CommandResult → ExecutionResult → terminal output
```

### 5.2 Non-DSL Commands Flow

```
"status"
    │
    ▼ Terminal.tsx: DSL_COMMANDS.has("status") → false
    │
    ▼ switch (command) { case "status": ... }
    │
    ▼ dispatchCommand("status", {})
    │
    ▼ statusHandler(args, context)  [builtinCommands.ts]
    │   Reads modelStore, historyStore directly
    │   No MCP call needed
    │
    ▼ Terminal.tsx formats and writes result
```

### 5.3 Disconnections and Gaps

| Issue | Description | Severity |
|-------|-------------|----------|
| **opening** has no handler | DSL parser produces `CreateOpeningCommand`, executor maps it to tool name `"opening"`, but no command handler named `"opening"` is registered. Will fail at dispatch. | ⚠️ |
| **Terminal-only commands** bypass dispatcher | `adjacency`, `nearest`, `area`, `clearance` are implemented only in Terminal.tsx switch, not registered as commands. Not available via macro playback or programmatic dispatch. | ⚠️ |
| **Duplicate clash tools** | Geometry server and validation server both implement `detect_clashes` and `detect_clashes_between_sets`. Client calls geometry server version. Validation server version has richer severity control. | ℹ️ |
| **DSL `modify` commands** exist in AST but not parser | `ModifyWallCommand`, `ModifyDoorCommand`, `ModifyWindowCommand` are defined in `ast.ts` but the parser has no grammar rules for `modify` commands. | ❌ |
| **MCP mock mode** | In dev mode (`VITE_MCP_MODE=mock`), `mcpClient.ts` may use a mock implementation rather than real MCP servers | ℹ️ |

---

## 6. The Executor Bridge

**Source:** `app/src/lib/dsl/executor.ts`

### 6.1 AST-to-Tool Mapping

```typescript
const COMMAND_TO_TOOL: Record<string, string> = {
  CreateWall: "wall",
  CreateRectWalls: "__rect_walls__",  // Special handling
  ModifyWall: "modify",
  PlaceDoor: "door",
  PlaceWindow: "window",
  CreateOpening: "opening",
  CreateFloor: "floor",
  CreateRoof: "roof",
  CreateRoom: "room",
  Help: "help",
};
```

### 6.2 AST-to-Args Conversion

`commandToMcpArgs()` in `ast.ts` converts each AST node to a flat `Record<string, unknown>` compatible with the command handler's expected format.

Key conversions:
- `Point2D { x, y }` → `[x, y]` array
- `ElementRef { uuid }` → `wall_id` string
- `ElementRef { variable }` → stored as `_wallRef` for later resolution
- Enum values pass through as strings

### 6.3 Variable Resolution

The executor resolves `$last`, `$selected`, `$wall` references before dispatching:
- Checks for `_wallRef` and `_hostRef` keys in args
- Calls `resolveVariable()` to look up actual IDs from `ExecutionContext`
- Also maps `wall_id` → `wall` (DSL produces `wall_id`, handler expects `wall`)

### 6.4 CreateRectWalls Special Handling

`CreateRectWalls` doesn't map to a single MCP tool. Instead, `executeRectWalls()`:
1. Defines 4 wall segments (bottom, right, top, left)
2. Dispatches each as a separate `wall` command
3. Updates `context.lastElementId` and `context.wallId` after each
4. Returns combined result with all wall IDs

### 6.5 Multi-Command Execution

`executeCommands()` runs commands sequentially:
- Updates `context.lastElementId` after each successful creation
- Sets `context.wallId` when a wall is created (for `$wall` references)
- Stops on first error
- Collects warnings across all commands
- Produces ANSI-colored terminal output lines

---

## 7. Variable References

| Variable | Token Type | Resolves To | Updated When |
|----------|-----------|-------------|--------------|
| `$last` | `VAR_LAST` | ID of last created element | Any element created |
| `$selected` | `VAR_SELECTED` | First selected element ID | User clicks element |
| `$wall` | `VAR_WALL` | ID of last created wall | Wall element created |

**Usage patterns:**
```bash
wall 0,0 10,0                # Creates wall, sets $last and $wall
door $last 2.5               # Places door in that wall
window $wall 5.0             # Places window in same wall
door $selected 1.0           # Places door in whatever's selected
```

**Resolution chain:**
1. Parser sees `$last` token → creates `ElementRef { variable: VariableRef.LAST }`
2. `commandToMcpArgs()` → args include `_wallRef: { variable: "$last" }`
3. `resolveVariablesInArgs()` → looks up `context.lastElementId` → replaces with actual UUID

---

## 8. Macro System

**Two implementations exist** (both active):

### 8.1 Zustand Store (`useMacroStore`)
- Used by `commandDispatcher.ts` — auto-records commands after successful dispatch
- Methods: `startRecording()`, `stopRecording()`, `startPlayback()`, `recordCommand()`
- Playback calls `dispatchCommand()` for each stored command string

### 8.2 Terminal localStorage (`Terminal.tsx`)
- Independent macro system using React state + `localStorage`
- Key: `pensaer-terminal-macros`
- Records raw command strings during recording mode
- Shows red `●` indicator in prompt when recording

### 8.3 Macro Commands

| Command | What it does |
|---------|-------------|
| `macro record <name>` | Start recording. All subsequent commands are captured |
| `macro stop` | Stop recording, save macro |
| `macro cancel` | Cancel recording without saving |
| `macro play <name>` | Execute all commands in macro sequentially with 200ms delay |
| `macro list` | Show all saved macros with command count and creation date |
| `macro show <name>` | Display the commands in a macro (Terminal.tsx only) |
| `macro delete <name>` | Delete a saved macro |
| `macro export` | Export all macros as JSON (dispatcher only) |

**Limitations:**
- Cannot play macros while recording
- Macro commands themselves (`macro record/stop/play`) are not recorded
- The two implementations (store vs Terminal) may desync — Terminal.tsx macro system is the primary one users interact with

---

## 9. Terminal Component Input Flow

**Source:** `app/src/components/layout/Terminal.tsx`

### 9.1 Technology

- **xterm.js** (`@xterm/xterm`) for terminal emulation
- **FitAddon** for auto-resize
- **WebLinksAddon** for clickable URLs
- Custom hooks: `useTerminalInput` (buffer/cursor), `useTabComplete` (autocomplete)

### 9.2 Input Processing Pipeline

```
User keystroke
    │
    ▼ terminal.onData(data)
    │
    ▼ handleInput(terminal, data)
    │
    ├── handleBufferInput() → handles typing, backspace, cursor movement
    │   Returns true if handled
    │
    ├── ESC sequences → Up/Down arrow → command history navigation
    │   - Up: load previous command from history
    │   - Down: load next command or restore saved buffer
    │
    ├── Enter (code 13) → submitBuffer()
    │   - Add to commandHistory (max 100, persisted to localStorage)
    │   - Call processCommand(terminal, cmd)
    │
    ├── Tab (code 9) → handleTab()
    │   - First tab: complete to common prefix
    │   - Second tab: show all matches
    │
    ├── Ctrl+C (code 3) → cancel input, clear buffer
    │
    └── Ctrl+L (code 12) → clear screen, redraw prompt
```

### 9.3 Command Routing in `processCommand()`

```
processCommand(terminal, cmd)
    │
    ├── Is command in DSL_COMMANDS set?
    │   ("wall", "walls", "floor", "roof", "room", "door", "window",
    │    "opening", "rect", "box")
    │   YES → executeDsl(trimmed, context) → display results
    │   Record to macro if recording
    │
    └── NO → switch(command.toLowerCase())
        ├── "help" → dispatchCommand("help", ...)
        ├── "clear" → terminal.clear()
        ├── "version" → dispatchCommand("version", ...)
        ├── "status" → dispatchCommand("status", ...)
        ├── "echo" → dispatchCommand("echo", ...)
        ├── "list" → dispatchCommand("list", ...)
        ├── "detect-rooms" → dispatchCommand("detect-rooms", ...)
        ├── "analyze" → dispatchCommand("analyze", ...)
        ├── "clash" → dispatchCommand("clash", ...)
        ├── "clash-between" → dispatchCommand("clash-between", ...)
        ├── "delete" → dispatchCommand("delete", ...)
        ├── "get" → dispatchCommand("get", ...)
        ├── "adjacency" → mcpClient.callTool("detect_rooms", ...) [direct]
        ├── "nearest" → mcpClient.callTool("list_elements", ...) [direct]
        ├── "area" → mcpClient.callTool("detect_rooms", ...) [direct]
        ├── "clearance" → mcpClient.callTool("detect_clashes", ...) [direct]
        └── "macro" → local macro handling
```

### 9.4 Demo System

- Triggered by `Ctrl+Shift+D` (sets `demoTrigger` in UIStore)
- `demo.ts` service provides `runDemo()`, `stopDemo()`, `toggleDemoPause()`
- Escape to stop, Space to pause/resume
- Callbacks: `writeToTerminal`, `executeCommand`, `clearTerminal`

### 9.5 Command History

- Stored in `localStorage` key `pensaer-terminal-history`
- Circular buffer: max 100 entries
- Deduplicates consecutive identical commands
- Navigate with ↑/↓ arrows
- Saves current typed buffer when entering history navigation

---

## 10. Complete Command Matrix

### All User-Facing Commands

| Command | DSL Parsed | Dispatcher Registered | MCP Tool Called | Status |
|---------|-----------|----------------------|----------------|--------|
| `wall` | ✅ | ✅ | `create_wall` | ✅ Working |
| `walls` / `rect` / `box` | ✅ | ✅ (via wall ×4) | `create_wall` ×4 | ✅ Working |
| `floor` | ✅ | ✅ | `create_floor` | ✅ Working |
| `roof` | ✅ | ✅ | `create_roof` | ✅ Working |
| `room` | ✅ | ✅ | `create_room` | ✅ Working |
| `door` | ✅ | ✅ | `place_door` | ✅ Working |
| `window` | ✅ | ✅ | `place_window` | ✅ Working |
| `opening` | ✅ | ❌ | `create_opening` | ⚠️ Parser works, handler missing |
| `help` | ✅ | ✅ | — (local) | ✅ Working |
| `clear` | — | ✅ | — (local) | ✅ Working |
| `status` | — | ✅ | — (local) | ✅ Working |
| `version` | — | ✅ | — (local) | ✅ Working |
| `echo` | — | ✅ | — (local) | ✅ Working |
| `macro` | — | ✅ | — (local) | ✅ Working |
| `list` | — | ✅ | — (local store) | ✅ Working |
| `get` | — | ✅ | `get_element` (fallback) | ✅ Working |
| `delete` | — | ✅ | `delete_element` | ✅ Working |
| `detect-rooms` | — | ✅ | `detect_rooms` | ✅ Working |
| `analyze` | — | ✅ | `analyze_wall_topology` | ✅ Working |
| `clash` | — | ✅ | `detect_clashes` | ✅ Working |
| `clash-between` | — | ✅ | `detect_clashes_between_sets` | ✅ Working |
| `adjacency` | — | ❌ | `detect_rooms` (direct) | ⚠️ Terminal only |
| `nearest` | — | ❌ | `list_elements` (direct) | ⚠️ Terminal only |
| `area` | — | ❌ | `detect_rooms` (direct) | ⚠️ Terminal only |
| `clearance` | — | ❌ | `detect_clashes` (direct) | ⚠️ Terminal only |

### MCP Tools NOT Exposed as Terminal Commands

These tools exist in MCP servers but have no terminal command mapping. They're available to AI agents calling MCP directly:

**Geometry Server:**
- `create_rectangular_walls`, `detect_joins`, `modify_element`
- `generate_mesh`, `validate_mesh`, `compute_mesh`, `compute_mesh_batch`
- `create_simple_building`, `attach_roof_to_walls`
- `select_elements`, `get_selection`, `clear_selection`, `select_by_type`
- `create_group`, `add_to_group`, `remove_from_group`, `delete_group`, `get_group`, `list_groups`, `select_group`
- `boolean_operation` (placeholder)
- `get_state_summary`, `get_self_healing_status`

**Spatial Server:**
- `compute_adjacency`, `find_nearest`, `compute_area`
- `check_clearance`, `analyze_circulation`, `point_in_polygon`
- `detect_rooms` (spatial server's own version — takes wall specs, not wall IDs)

**Validation Server:**
- `validate_model`, `check_fire_compliance`, `check_accessibility`
- `check_egress`, `check_door_clearances`, `check_stair_compliance`
- `detect_clashes`, `detect_clashes_between_sets` (validation server's versions)

**Documentation Server:**
- `generate_schedule`, `export_ifc`, `export_report`
- `generate_quantities`, `export_csv`
- `door_schedule`, `window_schedule`, `room_schedule`
- `export_bcf`

---

### Tool Count Summary

| Server | Tool Count |
|--------|-----------|
| Geometry | 37 |
| Spatial | 7 |
| Validation | 8 |
| Documentation | 9 |
| **Total MCP Tools** | **61** |
| Terminal Commands | 26 |
| Dispatcher-Registered | 18 |
| DSL-Parsed | 10 (+ help) |

---

*End of Part 3. For architecture details see Part 1. For data model and stores see Part 2.*
