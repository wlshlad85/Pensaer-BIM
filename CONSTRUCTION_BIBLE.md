# CONSTRUCTION_BIBLE.md — Pensaer-BIM Canonical Construction Workflow

> **Version:** 1.0 | **Date:** 2025-07-11 | **Author:** CTO Office
>
> This is THE reference for how buildings are constructed in Pensaer-BIM.
> Every feature, command, and workflow should be validated against this document.

---

## Philosophy

Buildings are constructed in a specific order. You can't hang a door before you've built a wall. You can't place a wall if you don't know what level it's on. Pensaer-BIM must enforce (or at least guide) this order.

**The Golden Rule:** A user should be able to build a simple house from scratch using only the terminal, following these phases in order, and never hit a dead end.

---

## Phase 0: Site & Grid

### What This Phase Does
Establishes the coordinate system, grid lines, building levels, and the spatial framework everything else sits on.

### Correct Workflow
1. Set project units (metric/imperial)
2. Define grid lines (structural grid: A, B, C... and 1, 2, 3...)
3. Define levels (Ground Floor @ 0.0m, Level 1 @ 3.0m, Level 2 @ 6.0m, Roof @ 9.0m)
4. Set site boundary (optional)

### What Exists Today
| Feature | Status | Notes |
|---------|--------|-------|
| Levels in store | ✅ Exists | `modelStore.levels[]` with id, name, elevation, height |
| Level CRUD | ✅ Exists | `addLevel`, `updateLevel`, `deleteLevel`, `setLevels` |
| Level queries | ✅ Exists | `getLevelById`, `getLevelByName`, `getLevelsOrdered`, `getElementsByLevel` |
| Grid settings | ✅ Exists | UI store has `grid: { visible, size, majorInterval }` |
| Snap settings | ✅ Exists | UI store has `snap: { enabled, grid, endpoint, midpoint, perpendicular, threshold }` |
| Project settings | ✅ Exists | Units, gridSize, snapEnabled, defaultWallHeight, defaultWallThickness |

### What's MISSING
| Feature | Priority | Notes |
|---------|----------|-------|
| `level` command (terminal) | **P0** | No way to create/manage levels from terminal. Only exists in store. |
| `grid` command (terminal) | P1 | No way to define named grid lines (A, B, C / 1, 2, 3) |
| Site boundary command | P2 | No site/boundary element type |
| Grid line element type | P1 | No `gridLine` in ElementType union |
| Coordinate system display | P1 | No axis indicator or origin marker |

### Parameters That Matter
- Level: `name`, `elevation` (meters from datum), `height` (floor-to-floor)
- Grid: `spacing` (meters), `majorInterval` (every N lines)

---

## Phase 1: Foundations

### What This Phase Does
Creates the building's foundation system: footings, foundation walls, ground slab.

### Correct Workflow
1. Define foundation walls (below grade, on grid lines)
2. Place footings under columns and walls
3. Create ground floor slab (ground-bearing or suspended)

### What Exists Today
| Feature | Status | Notes |
|---------|--------|-------|
| Wall command | ✅ Exists | `wall --start x,y --end x,y` — can be used for foundation walls |
| Floor/slab command | ✅ Exists | `floor --points ...` or `floor --min --max` — can be used for ground slab |
| Wall types | ⚠️ Partial | Has `basic`, `structural`, `curtain`, `retaining` — no explicit `foundation` type |

### What's MISSING
| Feature | Priority | Notes |
|---------|----------|-------|
| Foundation wall type | P2 | Could use `--type retaining` as workaround |
| Footing element | P2 | No `footing` type in ElementType |
| Below-grade indication | P2 | No concept of "below level 0" |
| Column foundation (pad footing) | P2 | No footing-column relationship |

### Parameters That Matter
- Foundation wall: same as wall + `depth` below grade
- Footing: `width`, `depth`, `thickness`
- Ground slab: same as floor + `type: ground-bearing | suspended`

---

## Phase 2: Structure

### What This Phase Does
Creates the structural frame: columns, beams, structural walls, and floor slabs at each level.

### Correct Workflow
1. Place columns at grid intersections on each level
2. Place beams spanning between columns
3. Create structural walls (shear walls, core walls)
4. Create floor slabs at each level

### What Exists Today
| Feature | Status | Notes |
|---------|--------|-------|
| Column type defined | ✅ Exists | `ColumnElement` in types with shape, depth, material, etc. |
| Beam type defined | ✅ Exists | `BeamElement` in types with shape, depth, material, span |
| Structural wall | ✅ Exists | `wall --type structural` |
| Floor slab | ✅ Exists | `floor` command works |
| Column command | ❌ Missing | Type exists but **no command handler** |
| Beam command | ❌ Missing | Type exists but **no command handler** |

### What's MISSING
| Feature | Priority | Notes |
|---------|----------|-------|
| `column` command | **P0** | Type defined, no handler. Can't place columns. |
| `beam` command | **P0** | Type defined, no handler. Can't place beams. |
| Column-beam relationship | P1 | No automatic connection/support relationship |
| Multi-level workflow | P1 | No command to copy structure to next level |
| Load path validation | P2 | No check that columns stack vertically |

### Parameters That Matter
- Column: `position (x,y)`, `width`, `depth`, `height`, `shape`, `material`, `level`
- Beam: `start`, `end`, `width`, `depth`, `material`, `level`
- Floor: `boundary_points`, `thickness`, `level`, `type (slab/deck)`

---

## Phase 3: Envelope

### What This Phase Does
Creates the building skin: exterior walls, curtain walls, and roof.

### Correct Workflow
1. Create exterior walls between columns on building perimeter
2. Place curtain wall systems where needed
3. Create roof over the top level

### What Exists Today
| Feature | Status | Notes |
|---------|--------|-------|
| Wall command | ✅ Exists | Works for exterior walls |
| Curtain wall type | ⚠️ Partial | `--type curtain` in DSL parser, but no special rendering/behavior |
| Roof command | ✅ Exists | `roof --type gable|hip|flat|shed|mansard --points ...` |
| `rect` / `box` command | ✅ Exists | Creates 4 walls as rectangle — good for simple buildings |
| `walls rect` command | ✅ Exists | Same as above |

### What's MISSING
| Feature | Priority | Notes |
|---------|----------|-------|
| Exterior wall flag | P1 | `isExterior` exists in type but no way to set via command |
| Curtain wall behavior | P2 | No mullion/panel system |
| Wall-to-roof connection | P2 | No relationship between walls and roof |
| Insulation properties | P2 | No U-value or R-value on walls |

### Parameters That Matter
- Exterior wall: same as wall + `isExterior: true`
- Curtain wall: `mullion_spacing`, `panel_type`
- Roof: `type`, `slope`, `overhang`, `ridge_direction`, `material`

---

## Phase 4: Partitions (Interior Fit-Out)

### What This Phase Does
Creates interior walls, places doors in walls, places windows in walls.

### Correct Workflow
1. Create interior partition walls
2. Place doors in walls (both interior and exterior)
3. Place windows in exterior walls

### What Exists Today
| Feature | Status | Notes |
|---------|--------|-------|
| Wall command | ✅ Exists | Works for partitions |
| Door command | ✅ Exists | `door --wall <id> --offset <m>` with types: single, double, sliding |
| Window command | ✅ Exists | `window --wall <id> --offset <m>` with types: fixed, casement, awning, sliding, double_hung |
| Opening command | ✅ Exists | DSL parser supports `opening` command |
| Door-wall hosting | ✅ Exists | Updates wall's `hosts[]` relationship |
| Window-wall hosting | ✅ Exists | Updates wall's `hosts[]` relationship |
| Door/window validation | ✅ Exists | Checks fit within wall bounds |
| DSL variable refs | ✅ Exists | `$last`, `$selected`, `$wall` for referencing walls |

### What's MISSING
| Feature | Priority | Notes |
|---------|----------|-------|
| Wall join detection | P1 | Walls don't auto-detect intersections |
| Wall cleanup at joins | P1 | No T-join or L-join cleanup |
| Door/window clash with existing | P1 | Can place overlapping doors in same wall |
| `opening` command handler | P1 | DSL parses it but no command handler registered |

### Parameters That Matter
- Door: `wall_id`, `offset`, `width`, `height`, `type`, `swing`
- Window: `wall_id`, `offset`, `width`, `height`, `sill_height`, `type`
- Interior wall: `thickness` (typically 0.1-0.15m vs 0.2-0.3m exterior)

---

## Phase 5: Vertical Circulation

### What This Phase Does
Creates stairs, elevators, and shafts connecting levels.

### Correct Workflow
1. Place stair elements connecting levels
2. Define elevator shafts
3. Create shaft openings in floor slabs

### What Exists Today
| Feature | Status | Notes |
|---------|--------|-------|
| Stair type defined | ✅ Exists | `StairElement` with risers, riserHeight, treadDepth, stairWidth, stairType |
| Stair command | ❌ Missing | Type defined, **no command handler** |
| Tool type for stair | ✅ Exists | `stair` in `ToolType` union |

### What's MISSING
| Feature | Priority | Notes |
|---------|----------|-------|
| `stair` command | P1 | Type exists, no handler |
| Elevator element type | P2 | Not in ElementType union |
| Shaft element type | P2 | Not in ElementType union |
| Floor opening (for stairs) | P2 | Can't cut holes in floor slabs |
| Stair-level relationship | P2 | No `connectsLevels` relationship |

### Parameters That Matter
- Stair: `position`, `width`, `risers`, `riser_height`, `tread_depth`, `type`, `from_level`, `to_level`

---

## Phase 6: MEP Rough-In

### What This Phase Does
Placeholder for future mechanical, electrical, and plumbing systems.

### What Exists Today
Nothing. No MEP element types, no commands, no store support.

### What's MISSING (All P2 — Future Phase)
| Feature | Notes |
|---------|-------|
| Duct element type | HVAC routing |
| Pipe element type | Plumbing routing |
| Electrical conduit type | Electrical routing |
| MEP clash detection | MEP vs structure conflicts |
| Zone/system grouping | Grouping MEP elements by system |

---

## Phase 7: Finishes (Rooms & Spaces)

### What This Phase Does
Defines rooms/spaces, assigns finishes, and creates the spatial model.

### Correct Workflow
1. Define rooms bounded by walls
2. Assign room types and names
3. Set finish materials (floor, wall, ceiling)
4. Auto-detect rooms from wall topology (alternative)

### What Exists Today
| Feature | Status | Notes |
|---------|--------|-------|
| Room command | ✅ Exists | `room --points ... --name --type` |
| Room types | ✅ Exists | bedroom, bathroom, kitchen, living, dining, office, storage, hallway, utility, garage |
| Room finishes | ✅ Exists | Default finishes per room type (floor, wall, ceiling) |
| Room detect command | ✅ Exists | `detect-rooms` — MCP-based room detection from walls |
| Room area calculation | ✅ Exists | Shoelace formula, centroid, bounding box |

### What's MISSING
| Feature | Priority | Notes |
|---------|----------|-------|
| Room-wall binding | P1 | Rooms don't reference their bounding walls |
| Material library | P2 | No reusable material definitions |
| Space program validation | P2 | No check against required areas |

### Parameters That Matter
- Room: `boundary_points`, `name`, `number`, `type`, `height`, `level`

---

## Phase 8: Analysis & Validation

### What This Phase Does
Validates the model: clash detection, code compliance, topology analysis.

### Correct Workflow
1. Analyze wall topology (find disconnected walls, T-joins, etc.)
2. Run clash detection between all elements
3. Run clash detection between specific sets
4. Validate rooms (areas, required openings, etc.)
5. Export/report

### What Exists Today
| Feature | Status | Notes |
|---------|--------|-------|
| Clash detection | ✅ Exists | `clash` command — all elements or by IDs |
| Clash between sets | ✅ Exists | `clash-between --a ids --b ids` |
| Topology analysis | ✅ Exists | `analyze` command — wall topology |
| Element issues | ✅ Exists | `issues[]` array on every element |
| AI suggestions | ✅ Exists | `aiSuggestions[]` array on every element |

### What's MISSING
| Feature | Priority | Notes |
|---------|----------|-------|
| Code compliance checks | P2 | No building code validation |
| Accessibility checks | P2 | No ADA/accessibility validation |
| Energy analysis | P2 | No energy performance calculation |
| Export to IFC | P2 | No IFC export |

### Parameters That Matter
- Clash detection: `tolerance`, `clearance`, `ignore_same_type`

---

## Utility Commands (Available at Any Phase)

| Command | Status | Description |
|---------|--------|-------------|
| `help [command]` | ✅ | Show help |
| `clear` | ✅ | Clear terminal |
| `status` | ✅ | Show model statistics |
| `version` | ✅ | Show app version |
| `echo <text>` | ✅ | Print text |
| `list [type]` | ✅ | List elements |
| `get <id>` | ✅ | Get element details |
| `delete <ids>` | ✅ | Delete elements |
| `macro record/stop/play/list/delete` | ✅ | Command macros |

---

## The "Build a Simple House" Golden Path

This is the minimum viable workflow. A user should be able to do this TODAY:

```
# 1. Create 4 exterior walls (Phase 3 — we skip 0-1 for demo)
rect (0,0) (10,8) --height 3.0 --thickness 0.2

# 2. Add an interior wall (Phase 4)
wall --start 5,0 --end 5,8 --height 3.0 --thickness 0.1

# 3. Place a front door
door --wall <wall-id> --offset 2.5 --type single

# 4. Place windows
window --wall <wall-id> --offset 3.0 --sill 0.9

# 5. Create floor slab (Phase 2)
floor --min 0,0 --max 10,8 --thickness 0.15

# 6. Create roof (Phase 3)
roof --type gable --min 0,0 --max 10,8 --slope 30

# 7. Define rooms (Phase 7)
room --min 0,0 --max 5,8 --name "Living Room" --type living
room --min 5,0 --max 10,8 --name "Bedroom" --type bedroom

# 8. Check for issues (Phase 8)
analyze
clash
status
```

### Can This Workflow Actually Run Today?
**Mostly yes**, with caveats:
- `rect` works for creating 4 walls ✅
- Interior `wall` works ✅
- `door` and `window` work but you need wall IDs (no `$last` in command handler, only in DSL) ⚠️
- `floor` and `roof` work ✅
- `room` works ✅
- `analyze` and `clash` work (via MCP) ✅

**Key friction points:**
1. Must know wall IDs to place doors/windows — no easy way to reference "the north wall"
2. No level management from terminal
3. DSL parser and command handlers are **two separate systems** — DSL is more expressive but may not be fully wired to execution
4. No undo from terminal (history store exists but no `undo` command)

---

## Appendix: Command Reference

### Element Creation Commands
| Command | DSL Parser | Command Handler | MCP Tool |
|---------|-----------|-----------------|----------|
| `wall` | ✅ | ✅ | `create_wall` |
| `walls rect` / `rect` / `box` | ✅ | ❌ (DSL only) | — |
| `floor` | ✅ | ✅ | `create_floor` |
| `roof` | ✅ | ✅ | `create_roof` |
| `room` | ✅ | ✅ | `create_room` |
| `door` | ✅ | ✅ | `place_door` |
| `window` | ✅ | ✅ | `place_window` |
| `opening` | ✅ | ❌ | — |
| `column` | ❌ | ❌ | — |
| `beam` | ❌ | ❌ | — |
| `stair` | ❌ | ❌ | — |

### Analysis Commands
| Command | Handler | MCP Tool |
|---------|---------|----------|
| `detect-rooms` | ✅ | `detect_rooms` |
| `analyze` | ✅ | `analyze_wall_topology` |
| `clash` | ✅ | `detect_clashes` |
| `clash-between` | ✅ | `detect_clashes_between_sets` |
