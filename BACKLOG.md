# BACKLOG.md — Prioritized Engineering Tickets

> Generated: 2025-07-11 | Derived from CONSTRUCTION_BIBLE.md + GAPS.md

---

## P0 — Can't Demo Without It

### P0-001: `undo` / `redo` Terminal Commands
**Why:** Users make mistakes. Without undo, they must manually delete and recreate. Dealbreaker for any live demo.
**Scope:** Register `undo` and `redo` commands. Wire to `historyStore`. Ensure `recordAction()` captures element snapshots properly.
**Estimate:** S (small) — store exists, just need commands + snapshot logic.

### P0-002: `level` Terminal Command
**Why:** Phase 0 of construction. Multi-story buildings impossible without it. Currently levels only come from demo data.
**Scope:** `level add "Level 2" --elevation 3.0 --height 3.0`, `level list`, `level delete <id>`, `level set-active <id>`.
**Estimate:** S — store CRUD exists, need command handlers only.

### P0-003: `column` Terminal Command + DSL
**Why:** Structural columns are Phase 2. Type fully defined but no way to create them.
**Scope:** Command handler for `column --position x,y --width w --depth d --height h --level l --material m --shape rect|circular`. Add to DSL parser. Add MCP tool call.
**Estimate:** M (medium) — pattern exists from wall handler, follow same pattern.

### P0-004: `beam` Terminal Command + DSL
**Why:** Structural beams are Phase 2. Type fully defined but no way to create them.
**Scope:** Command handler for `beam --start x,y --end x,y --width w --depth d --level l --material m`. Add to DSL parser. Add MCP tool call.
**Estimate:** M — same pattern as column.

---

## P1 — Embarrassing If Missing

### P1-001: Unify DSL Parser and Command Dispatcher
**Why:** Two execution paths means inconsistent behavior. `rect`/`box` work in DSL but not as commands. `$last` works in DSL but not in command args. Users will be confused.
**Scope:** Either (a) route DSL AST execution through command handlers, or (b) register command handlers for all DSL commands. Option (a) is architecturally cleaner.
**Estimate:** L (large) — significant refactor, touches parser, dispatcher, and Terminal.

### P1-002: `rect` / `box` Command Handler
**Why:** Most common way to start a building. DSL parses it but no command handler.
**Scope:** Register `rect` command that creates 4 walls. Follow `CreateRectWalls` AST pattern.
**Estimate:** S — just need a handler that calls `wall` 4 times.
**Blocked by:** Nothing. Quick win.

### P1-003: `opening` Command Handler
**Why:** DSL parses `opening` commands but nothing executes them. Dead feature.
**Scope:** Register handler, create element in store (or modify wall geometry to cut opening).
**Estimate:** S-M.

### P1-004: `stair` Terminal Command + DSL
**Why:** Vertical circulation, Phase 5. Type defined, no handler.
**Scope:** Command handler for `stair --position x,y --width w --risers n --riser-height h --tread-depth d --type straight|L|U|spiral --level l`.
**Estimate:** M.

### P1-005: `select` Terminal Command
**Why:** Door/window handlers accept `context.selectedIds` but no way to select from terminal.
**Scope:** `select <id>`, `select --type wall`, `select --all`, `deselect`.
**Estimate:** S.

### P1-006: `move` / `modify` Terminal Command
**Why:** Can't adjust anything after creation without delete + recreate.
**Scope:** `move <id> --to x,y`, `modify <id> --height 3.5 --material Brick`.
**Estimate:** M — need to handle geometry recalculation.

### P1-007: Door/Window Overlap Validation
**Why:** Can place two doors at same offset in same wall. Obviously wrong.
**Scope:** In `placeDoorHandler`/`placeWindowHandler`, check existing hosted elements for overlaps.
**Estimate:** S.

### P1-008: Wall Join Detection
**Why:** Walls should detect and clean up intersections (T-joins, L-joins).
**Scope:** After wall creation, check for intersections with existing walls. Update relationships.
**Estimate:** M-L — geometry intersection logic.

### P1-009: Level Enforcement on Elements
**Why:** `--level` is stored as a string property, not validated against actual levels.
**Scope:** Validate level exists when creating elements. Store as `level` field on BaseElement, not just in properties.
**Estimate:** M — touches all element creation handlers.

### P1-010: Grid Line Element Type + Command
**Why:** Phase 0 — structural grid (A, B, C / 1, 2, 3) is fundamental to BIM workflow.
**Scope:** New `GridLine` element type. `grid add A --axis x --position 0`, `grid add 1 --axis y --position 0`. Render as dashed lines on canvas.
**Estimate:** M.

---

## P2 — Nice to Have

### P2-001: Foundation Wall Type
`wall --type foundation` with below-grade properties.

### P2-002: Footing Element Type
New `footing` element for pad and strip footings.

### P2-003: Elevator/Shaft Element Types
New element types for vertical shafts.

### P2-004: Floor Opening (Slab Penetration)
Cut holes in floor slabs for stairs, shafts, etc.

### P2-005: Exterior Wall Flag via Command
`wall --start 0,0 --end 10,0 --exterior` to set `isExterior: true`.

### P2-006: Curtain Wall System
Mullion/panel subdivision for curtain walls.

### P2-007: Material Library
Reusable material definitions with thermal/acoustic properties.

### P2-008: Room-Wall Binding
Rooms should reference their bounding walls, auto-update when walls move.

### P2-009: Space Program Validation
Define required rooms and areas, validate against model.

### P2-010: IFC Export
Export model to IFC format for interoperability.

### P2-011: Code Compliance Checks
Building code validation (egress, fire separation, accessibility).

### P2-012: MEP Element Types (Placeholder)
Ducts, pipes, electrical conduits — entire future module.

### P2-013: Copy Structure to Level
Duplicate all elements from one level to another.

### P2-014: Load Path Validation
Check that columns stack vertically, beams connect to supports.

### P2-015: Coordinate System Display
Origin marker, axis indicator, dimension annotations.

---

## Execution Order Recommendation

**Sprint 1 (Demo-ready):**
1. P0-001: `undo`/`redo` (S)
2. P0-002: `level` command (S)
3. P1-002: `rect`/`box` handler (S)
4. P1-005: `select` command (S)
5. P1-007: Door/window overlap check (S)

**Sprint 2 (Structural completeness):**
6. P0-003: `column` command (M)
7. P0-004: `beam` command (M)
8. P1-004: `stair` command (M)
9. P1-006: `move`/`modify` command (M)
10. P1-009: Level enforcement (M)

**Sprint 3 (Polish):**
11. P1-001: DSL/handler unification (L)
12. P1-003: `opening` handler (S-M)
13. P1-008: Wall join detection (M-L)
14. P1-010: Grid lines (M)
