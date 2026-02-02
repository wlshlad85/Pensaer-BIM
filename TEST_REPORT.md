# Pensaer-BIM House Building Test Report

**Date:** 2025-07-13  
**Tester:** Automated code review / simulated user testing  
**Goal:** Build a simple 2-storey house from scratch using the terminal

---

## Summary

| Step | Command | Result | Verdict |
|------|---------|--------|---------|
| 1. Set up grid | `grid 6000 6000` | ❌ No command exists | **FAIL** |
| 2. Create levels | `level 0` / `level 3000` | ❌ No command exists | **FAIL** |
| 3. Ground floor slab | `floor --min 0,0 --max 12,8` | ✅ Command works | **PASS** (with caveats) |
| 4. Exterior walls | `wall --start 0,0 --end 12,0` | ✅ Command works | **PASS** |
| 5. Interior wall | `wall --start 6,0 --end 6,8 --thickness 0.1` | ✅ Command works | **PASS** |
| 6. Place door | `door --wall <id> --offset 2.5` | ⚠️ Requires wall ID | **PARTIAL** |
| 7. Place window | `window --wall <id> --offset 1.5` | ⚠️ Requires wall ID | **PARTIAL** |
| 8. Second floor slab | `floor --min 0,0 --max 12,8 --level "Level 2"` | ⚠️ Level is string only, no elevation | **PARTIAL** |
| 9. Roof | `roof --type gable --min 0,0 --max 12,8` | ✅ Command works | **PASS** (with caveats) |
| 10. Columns | `column ...` | ❌ No command exists | **FAIL** |

**Overall: 3 PASS, 3 PARTIAL, 4 FAIL**

---

## Detailed Findings

### Step 1: Set Up Grid — ❌ FAIL

**What a user would type:** `grid 6000 6000` or `grid --spacing 6000`

**Terminal switch/case:** No `grid` case exists. Falls through to DSL parser.  
**DSL parser:** No `GRID` token type. No grid parsing.  
**What happens:** "Command not found" error.

**Impact:** Users cannot configure grid spacing. The 2D canvas has a hardcoded `<Grid>` component but it's not configurable from the terminal.

**Fix needed:** Add a `grid` command that updates a grid spacing setting in uiStore.

---

### Step 2: Create Levels — ❌ FAIL

**What a user would type:** `level 0` or `level add --name "Ground Floor" --elevation 0`

**Terminal switch/case:** No `level` case exists. Falls through to DSL parser.  
**DSL parser:** `LEVEL` exists as a token type but only as a **property keyword** (e.g., `wall ... level "Level 1"`), not as a standalone command.  
**Model store:** `addLevel()` exists in modelStore but is never wired to a terminal command.

**Impact:** Users cannot create or manage building levels from the terminal. The LevelPanel UI exists but is disconnected from terminal workflow.

**Fix needed:** Add a `level` command with subcommands: `level add --name "Ground" --elevation 0`, `level list`, `level set <name>`.

---

### Step 3: Ground Floor Slab — ✅ PASS (with caveats)

**What a user would type:** `floor --min 0,0 --max 12,8`

**Terminal switch/case:** ✅ `floor` case exists, requires `--min` and `--max`.  
**Command handler:** ✅ `createFloorHandler` correctly creates floor element with bbox.  
**Model store:** ✅ Element added via `addElement()`.  
**2D canvas:** ⚠️ **NOT RENDERED.** The `renderElement` switch/case handles `wall`, `door`, `window`, `room` — but **not `floor`**. Floor elements are added to the store but invisible in 2D.  
**3D canvas:** ✅ Renders floors: `elements.filter((el) => el.type === "floor")` at line 1030.

**Caveats:**
- Coordinates are in **meters** (not mm). Users expecting BIM conventions (mm) will be confused. `--min 0,0 --max 12,8` creates a 12m × 8m floor.
- No visual feedback in 2D view — user can't see the floor they just created.
- The `SCALE = 100` factor means 1 meter = 100 pixels.

**Fix needed:** Add `FloorElement` component to 2D canvas `renderElement` switch.

---

### Step 4: Exterior Walls — ✅ PASS

**What a user would type:**
```
wall --start 0,0 --end 12,0 --thickness 0.2
wall --start 12,0 --end 12,8 --thickness 0.2
wall --start 12,8 --end 0,8 --thickness 0.2
wall --start 0,8 --end 0,0 --thickness 0.2
```

**Terminal switch/case:** ✅ `wall` case exists.  
**Command handler:** ✅ `createWallHandler` validates inputs, creates wall element.  
**2D canvas:** ✅ Renders via `WallElement` component.  
**3D canvas:** ✅ Renders walls with proper thickness and height.

**Notes:**
- Wall IDs are auto-generated UUIDs like `wall-a1b2c3d4`. User must run `list wall` to discover IDs for door/window placement.
- Default height 3.0m, default thickness 0.2m (200mm).
- DSL parser also supports natural syntax: `wall (0, 0) (12, 0)` via fallback.
- No `slab` alias — BIM users might try `slab` and get an error.

---

### Step 5: Interior Wall — ✅ PASS

**What a user would type:** `wall --start 6,0 --end 6,8 --thickness 0.1`

Works the same as exterior walls. Thickness 0.1m = 100mm partition wall.

---

### Step 6: Place Door — ⚠️ PARTIAL PASS

**What a user would type:** `door --wall wall-a1b2c3d4 --offset 2.5 --width 0.9`

**Terminal switch/case:** ✅ `door` case exists, requires `--wall`.  
**Command handler:** ✅ `placeDoorHandler` exists.  
**2D canvas:** ✅ Renders via `DoorElement`.  
**3D canvas:** ✅ Renders doors with cutouts.

**Problems:**
1. **Wall ID discovery is painful.** After creating walls, the user must run `list wall` and manually find which `wall-xxxxxxxx` corresponds to which wall. There's no spatial way to pick a wall.
2. **The `--offset` is in meters from wall start.** But the user doesn't know which end is "start" without checking properties.
3. **DSL parser supports `door on $last`** (variable reference to last created element), but the Terminal switch/case for `door` does NOT use the DSL parser — it uses `parseArgs`. So `door on $last at 2.5` will fail in the Terminal switch/case. It only works if it falls through to DSL.
4. **No validation that offset + door width fits within wall length.**

**Fix needed:**
- Add wall naming: `wall --start 0,0 --end 12,0 --name "north"` → `door --wall north --offset 2.5`
- Or: auto-name walls based on direction (wall-north-1, wall-east-1, etc.)
- Make `door on $last at 2.5` work in terminal without DSL fallback

---

### Step 7: Place Window — ⚠️ PARTIAL PASS

**What a user would type:** `window --wall wall-a1b2c3d4 --offset 1.5 --width 1.2 --height 1.0 --sill 0.9`

Same issues as door. Additionally:
- Default sill height is 0.9m which is reasonable.
- Window types (fixed, casement, awning, sliding) are supported.
- Same wall ID discovery problem.

---

### Step 8: Second Floor Slab — ⚠️ PARTIAL PASS

**What a user would type:** `floor --min 0,0 --max 12,8 --level "Level 2"`

**Command handler:** ✅ Creates floor element with `level: "Level 2"` property.

**Problems:**
1. **No actual elevation.** The `level` parameter is just a string label. The floor is placed at the same Z=0 position as the ground floor in 3D. There's no `--elevation` parameter.
2. **Levels don't exist as first-class objects** that the floor can reference. The string "Level 2" is just metadata.
3. **In 3D,** floors render at Y=0 (Canvas3D line ~1030). There's no logic to offset by level elevation.

**Fix needed:** 
- Add `--elevation` parameter to floor command
- Wire levels to actual Z positions in 3D rendering
- Or auto-derive elevation from level name

---

### Step 9: Roof — ✅ PASS (with caveats)

**What a user would type:** `roof --type gable --min 0,0 --max 12,8 --slope 30`

**Terminal switch/case:** ✅ `roof` case exists.  
**Command handler:** ✅ `createRoofHandler` with gable/hip/flat types.  
**2D canvas:** ⚠️ **NOT RENDERED** — no `roof` case in `renderElement`.  
**3D canvas:** ✅ Full roof rendering with gable, hip, and flat geometry generation. Ridge direction auto-calculated.

**Caveats:**
- Not visible in 2D plan view (same as floor).
- No automatic overhang snapping to walls.
- Ridge direction defaults to "auto" (along longest dimension).

**Fix needed:** Add roof outline rendering to 2D canvas.

---

### Step 10: Columns — ❌ FAIL

**What a user would type:** `column --position 0,0 --size 0.3,0.3 --height 3.0`

**Terminal switch/case:** No `column` case.  
**Command handler:** No `columnHandler` registered.  
**DSL parser:** No `COLUMN` token.  
**Model store:** No column-specific logic.

**Impact:** Cannot create structural columns. This is a fundamental BIM element.

**Fix needed:** Implement full column command (handler, Terminal case, 2D/3D rendering).

---

## Cross-Cutting Issues

### 1. Unit System Confusion
- Commands use **meters** (e.g., `wall --start 0,0 --end 12,0`).
- But the internal `SCALE = 100` suggests 100px per meter.
- The help text says coordinates are in meters but doesn't make this prominent.
- BIM professionals typically work in **millimetres**. No unit conversion or unit selection.

### 2. No `undo` Terminal Command
- `useHistoryStore` has undo/redo, and keyboard shortcuts (Ctrl+Z) work.
- But there's no `undo` / `redo` terminal command. Users who are terminal-first can't undo.

### 3. Floor & Roof Not Visible in 2D
- Both `floor` and `roof` elements are created in the store but **not rendered in 2D Canvas**.
- The `renderElement` function only handles: wall, door, window, room.
- Users create these elements and see nothing.

### 4. Wall ID Discovery UX
- Wall IDs are random UUIDs (e.g., `wall-a1b2c3d4`).
- To place doors/windows, users must run `list wall`, find the ID, then type it.
- No spatial picking, no named walls, no "last wall" shortcut in the Terminal switch/case.

### 5. No `select` Terminal Command
- Can't `select wall-001` from terminal. Selection is mouse-only in 2D canvas.

### 6. Levels Are Not Functional
- Levels are string labels only, with no elevation or Z-position.
- Cannot create levels from terminal.
- 3D rendering ignores level metadata.

### 7. DSL Parser ≠ Terminal Parser
- Two separate parsing paths exist:
  1. Terminal `switch/case` with `parseArgs()` (flag-based: `--start 0,0 --end 5,0`)
  2. DSL parser with positional syntax (natural: `wall (0,0) (5,0) height 3`)
- The DSL parser is only invoked as a **fallback** when the Terminal switch/case doesn't match.
- This means the documented DSL syntax only works if the command name doesn't match any Terminal case.
- Since `wall`, `door`, `window` etc. ARE Terminal cases, the DSL natural syntax is intercepted first by the flag-based parser, and only reaches DSL if flag parsing fails.

---

## Priority Fixes

1. **P0 — Floor/Roof 2D rendering:** Users create elements that are invisible. Add rendering.
2. **P0 — Level management command:** `level add`, `level list`, `level set`. Wire to elevations.
3. **P1 — Grid command:** `grid --spacing 6000`
4. **P1 — Column command:** Full implementation.
5. **P1 — Wall naming:** Allow `--name` on walls, use in door/window placement.
6. **P2 — Undo/redo terminal commands**
7. **P2 — Select command:** `select <id>` from terminal.
8. **P2 — Unit system:** Add `units mm|m` command for user preference.
