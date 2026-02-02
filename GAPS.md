# GAPS.md — What's Broken Between Bible and Reality

> Generated: 2025-07-11 | Companion to CONSTRUCTION_BIBLE.md

---

## Critical Path: "Build a Simple House from Scratch"

To demo a house, a user needs to: create levels → place walls → place doors/windows → add floor → add roof → define rooms → validate.

### Gap 1: No `level` Terminal Command (P0)
**Bible says:** Phase 0 — define levels before anything else.
**Reality:** Levels exist in the store (`addLevel`, `getLevelsOrdered`, etc.) and in the types (`Level` interface). But there is **no terminal command** to create, list, or manage levels. The only way to get levels is through the demo data (`createInitialLevels()`).

**Impact:** Users can't set up a multi-story building. All elements default to "Level 1".

### Gap 2: No `column` Terminal Command (P0)
**Bible says:** Phase 2 — place columns at grid intersections.
**Reality:** `ColumnElement` is fully defined in `types/elements.ts` (shape, depth, material, fireProtection, baseElevation, topElevation). `column` is listed in the `ToolType` union. But **no command handler exists** and the **DSL parser doesn't recognize it**.

**Impact:** Can't build a structural frame. For simple house demo this is less critical (load-bearing walls), but for any commercial building it's a blocker.

### Gap 3: No `beam` Terminal Command (P0)
**Bible says:** Phase 2 — span beams between columns.
**Reality:** `BeamElement` fully defined in types (shape, depth, material, span). Listed in `ToolType`. **No command handler, no DSL parser support.**

**Impact:** Same as columns — can't build a frame structure.

### Gap 4: DSL Parser vs Command Handlers — Two Separate Systems
**Bible says:** One way to build things.
**Reality:** There are TWO command execution paths:
1. **DSL Parser** (`lib/dsl/parser.ts`): Full recursive-descent parser with `wall`, `walls rect`, `rect`, `box`, `floor`, `roof`, `room`, `door`, `window`, `opening`, `help`. Supports `$last`, `$selected`, `$wall` variable refs. Supports `from/to` syntax.
2. **Command Handlers** (`commands/handlers/`): Separate registration system via `registerCommand()`. Handles `wall`, `floor`, `roof`, `room`, `door`, `window`, `delete`, `get`, `list`, `detect-rooms`, `analyze`, `clash`, `clash-between`, `help`, `clear`, `status`, `version`, `echo`, `macro`.

**Key mismatches:**
- `rect`/`box`/`walls rect` — DSL parser handles it, **no command handler**
- `opening` — DSL parser handles it, **no command handler**
- `$last`/`$selected`/`$wall` — DSL parser supports variable refs, command handlers only support `--wall <id>` (no variable resolution)
- DSL parser produces AST nodes; unclear if these are actually executed anywhere or if Terminal.tsx only uses the command dispatcher

**Impact:** User experience is inconsistent. Some syntax works in DSL but not in terminal, or vice versa.

### Gap 5: No `undo`/`redo` Terminal Command (P0)
**Bible says:** Implicit — users make mistakes, they need undo.
**Reality:** `historyStore` exists with `recordAction()` being called. But there's no `undo` or `redo` command registered. The history store has `undoStack` and `redoStack` referenced in status output but actual undo/redo logic may be incomplete.

**Impact:** Users can't undo mistakes from terminal. Must delete manually.

### Gap 6: No `stair` Terminal Command (P1)
**Bible says:** Phase 5 — vertical circulation.
**Reality:** `StairElement` fully defined (risers, riserHeight, treadDepth, stairWidth, stairType). Listed in `ToolType`. **No command handler, no DSL parser support.**

### Gap 7: `opening` Command Not Wired (P1)
**Bible says:** Phase 4 — openings in walls.
**Reality:** DSL parser fully parses `opening` commands with wall ref, offset, width, height, baseHeight. But **no command handler is registered** for `opening`.

### Gap 8: Wall Intersection/Join Detection (P1)
**Bible says:** Phase 4 — walls should join properly.
**Reality:** Walls are independent line segments. No automatic:
- T-join detection
- L-join cleanup
- Wall trimming/extending to meet

### Gap 9: Door/Window Overlap Detection (P1)
**Bible says:** Phase 4 — validate placement.
**Reality:** Door/window placement validates against wall bounds but does NOT check for overlaps with existing doors/windows in the same wall.

### Gap 10: Element `--level` Not Enforced (P1)
**Bible says:** Every element belongs to a level.
**Reality:** Elements accept `--level "Level 1"` as a string property, but:
- It's stored as a string in `properties`, not as the typed `level` field on `BaseElement`
- No validation that the level exists
- No filtering by level in the viewport

### Gap 11: `rect`/`box` Command Handler Missing (P1)
**Bible says:** Phase 3 — create building envelope quickly.
**Reality:** DSL parser handles `rect (0,0) (10,8)` and `box` and `walls rect`, producing a `CreateRectWalls` AST node. But the command handler system doesn't have a registered handler for `rect` or `box`.

### Gap 12: No `move`/`edit`/`modify` Commands (P1)
**Bible says:** Implicit — users need to adjust elements.
**Reality:** `updateElement()` exists in store, `updateProperties()` exists, but no terminal command to move or modify an element's geometry or properties.

### Gap 13: No `select` Terminal Command (P1)
**Bible says:** Implicit — context-aware commands need selection.
**Reality:** Selection store exists but no way to select elements from terminal. Door/window commands accept `context.selectedIds` but there's no `select` command.

---

## Summary by Priority

| Priority | Count | Items |
|----------|-------|-------|
| **P0** | 4 | `level` cmd, `column` cmd, `beam` cmd, `undo`/`redo` cmd |
| **P1** | 9 | DSL/handler unification, `stair` cmd, `opening` handler, `rect` handler, wall joins, door/window overlaps, level enforcement, `move`/`edit` cmd, `select` cmd |
| **P2** | Many | Foundations, MEP, code compliance, IFC export, material library, etc. |

### Minimum for "Build a House" Demo
1. ✅ `wall` — works
2. ✅ `rect` — works in DSL (need to verify Terminal routing)
3. ✅ `door` — works (need wall ID)
4. ✅ `window` — works (need wall ID)
5. ✅ `floor` — works
6. ✅ `roof` — works
7. ✅ `room` — works
8. ❌ `undo` — missing (P0)
9. ❌ `level` — missing (P0, workaround: use defaults)
10. ⚠️ `rect`/`box` — DSL only, may not work from terminal command dispatcher

**Verdict:** A basic single-story house demo is POSSIBLE today if you accept:
- No undo
- Manual wall ID tracking for doors/windows
- Default level only
- Using individual `wall` commands instead of `rect`
