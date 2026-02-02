# Part 6: Every Feature We Will Build

> **Pensaer Engineering Encyclopedia** | CTO Office | 2 Feb 2026

---

## How to Read This Document

Every feature follows the same template:

```
### Feature: [Name]
- Phase / Priority / Effort
- What & Why
- How to Build (files, approach, dependencies)
- How to Test (unit, integration, E2E, edge cases)
- Quality Gate (acceptance criteria)
- Scrutiny (what could go wrong, worst failure, detection, recovery)
```

---

## Sprint 1: Demo-Ready (P0)

### Feature: `undo` / `redo` Terminal Commands

- **Phase:** 1 | **Priority:** P0 | **Effort:** S
- **What:** Undo/redo last model-changing action from terminal
- **Why:** Can't demo without it. Users make mistakes. Dealbreaker.
- **How to Build:**
  - Files: `app/src/commands/handlers/builtinCommands.ts`
  - Approach: Register `undo` and `redo` commands. Wire to `historyStore.undo()` / `historyStore.redo()`. Ensure `recordAction()` captures full element snapshots (not just IDs).
  - Dependencies: `historyStore` exists with `undoStack`/`redoStack`
- **How to Test:**
  - Unit: Create wall → undo → assert wall removed → redo → assert wall back
  - Integration: Create 5 elements → undo 3 → redo 1 → verify state
  - Edge: Undo on empty stack, redo after new action (should clear redo stack)
- **Quality Gate:**
  - [ ] `undo` reverses last action
  - [ ] `redo` re-applies last undone action
  - [ ] Undo stack limit (100 actions)
  - [ ] New action after undo clears redo stack
  - [ ] Works for all element types (wall, floor, roof, room, door, window)
- **Scrutiny:**
  - Risk: `recordAction` doesn't snapshot full element state → undo restores partial
  - Worst: Undo corrupts model store
  - Detect: Compare element count before/after undo cycle
  - Recover: Store full JSON snapshot per action, not diffs

---

### Feature: `level` Terminal Command

- **Phase:** 1 | **Priority:** P0 | **Effort:** S
- **What:** Create, list, delete, activate levels from terminal
- **Why:** Phase 0 of construction. Multi-story buildings impossible without it.
- **How to Build:**
  - Files: New `app/src/commands/handlers/levelCommands.ts`, register in `commands/index.ts`
  - DSL: Add `level` to parser in `lib/dsl/parser.ts`
  - Commands: `level add "Level 2" --elevation 3.0 --height 3.0`, `level list`, `level delete <id>`, `level set-active <id>`
  - Dependencies: Store CRUD exists (`addLevel`, `updateLevel`, `deleteLevel`, `setLevels`)
- **How to Test:**
  - Unit: Add level → verify in store, delete level → verify removed
  - Integration: Add 3 levels → list → verify ordered by elevation
  - Edge: Delete level with elements on it, duplicate names, negative elevation
- **Quality Gate:**
  - [ ] `level add` creates level in store
  - [ ] `level list` shows all levels ordered by elevation
  - [ ] `level set-active` changes active level
  - [ ] Elements created after `level set-active` go on that level
  - [ ] `level delete` warns if elements exist on level
- **Scrutiny:**
  - Risk: Deleting level doesn't clean up elements → orphaned elements
  - Detect: Query `getElementsByLevel` after delete
  - Recover: Cascade delete or move elements to adjacent level

---

### Feature: `column` Terminal Command + DSL

- **Phase:** 1 | **Priority:** P0 | **Effort:** M
- **What:** Place structural columns at positions
- **Why:** Phase 2 of construction. Can't build frame structures without columns.
- **How to Build:**
  - Files: New handler in `commands/handlers/elementCommands.ts` or new `structuralCommands.ts`
  - DSL: Add `column` to parser
  - Syntax: `column 5,3 --width 0.4 --depth 0.4 --shape rect --material Concrete`
  - Store: Use `modelStore.addElement()` with type `column`
  - 3D: Render as box/cylinder in `canvas/elements/` (component exists but needs wiring)
  - MCP: Wire to `create_column` geometry server tool
- **How to Test:**
  - Unit: Create column → verify in store with correct position/dimensions
  - Integration: Place column → verify 3D renders → verify in element list
  - Edge: Column at same position as wall, column outside site boundary, zero dimensions
- **Quality Gate:**
  - [ ] `column` creates element in store
  - [ ] 3D viewport shows column at correct position
  - [ ] 2D plan view shows column cross-section
  - [ ] Column appears in `list column` output
  - [ ] Column participates in clash detection
- **Scrutiny:**
  - Risk: Column type mismatch between client types and server
  - Detect: TypeScript compile check + MCP round-trip test
  - Recover: Align ColumnElement interface with server schema

---

### Feature: `beam` Terminal Command + DSL

- **Phase:** 1 | **Priority:** P0 | **Effort:** M
- **What:** Place structural beams spanning between points
- **Why:** Phase 2 of construction. Beams connect columns and support floors.
- **How to Build:**
  - Same pattern as column
  - Syntax: `beam 0,0 10,0 --width 0.3 --depth 0.5 --material Steel`
  - 3D: Render as extruded rectangle between start/end points
- **How to Test:**
  - Unit: Create beam → verify start/end/dimensions
  - Integration: Place beam between two columns → verify geometry
  - Edge: Zero-length beam, beam longer than 100m, beam at angle
- **Quality Gate:**
  - [ ] `beam` creates element with correct start/end
  - [ ] 3D renders beam at correct elevation (typically at level height minus beam depth)
  - [ ] Beam appears in clash detection
  - [ ] Works with `$last` variable reference
- **Scrutiny:**
  - Risk: Beam elevation wrong (renders at ground instead of level height)
  - Detect: Visual check + assertion on element Z coordinate

---

### Feature: `rect` / `box` Command Handler

- **Phase:** 1 | **Priority:** P1 | **Effort:** S
- **What:** Register `rect` as a command handler (currently DSL-only)
- **Why:** Most common way to start a building. Quick win.
- **How to Build:**
  - Files: `commands/handlers/elementCommands.ts`
  - Approach: Handler calls `wall` command 4 times with calculated corners
  - Note: PR #9 already wired `CreateRectWalls` through executor. Verify this works end-to-end.
- **How to Test:**
  - Unit: `rect (0,0) (10,8)` → verify 4 walls created with correct coordinates
  - Edge: Zero-area rect, single-point rect, very large rect
- **Quality Gate:**
  - [ ] `rect (0,0) (10,8)` creates exactly 4 walls
  - [ ] Walls form closed rectangle
  - [ ] Default height/thickness applied
  - [ ] `--height` and `--thickness` flags work
- **Scrutiny:**
  - Risk: Wall ordering wrong → not a closed shape
  - Detect: Topology analysis should find 0 open endpoints

---

### Feature: `select` Terminal Command

- **Phase:** 1 | **Priority:** P1 | **Effort:** S
- **What:** Select elements from terminal for door/window placement
- **Why:** Door/window commands need `selectedIds`. No way to set from terminal.
- **How to Build:**
  - Commands: `select <id>`, `select --type wall`, `select --all`, `deselect`, `deselect --all`
  - Wire to `selectionStore.selectElements()` / `clearSelection()`
- **How to Test:**
  - Unit: Select by ID → verify in selection store
  - Integration: Select wall → place door → verify door hosted on wall
  - Edge: Select non-existent ID, select already-selected element
- **Quality Gate:**
  - [ ] `select <id>` adds to selection
  - [ ] `deselect` clears selection
  - [ ] `select --type wall` selects all walls
  - [ ] Selection visible in 3D viewport (highlight)

---

## Sprint 2: Structural Completeness (P1)

### Feature: `stair` Terminal Command

- **Phase:** 1 | **Priority:** P1 | **Effort:** M
- **What:** Place stair elements connecting levels
- **Why:** Vertical circulation — Phase 5 of construction
- **How to Build:**
  - Syntax: `stair 2,3 --width 1.2 --risers 17 --riser-height 0.178 --type straight`
  - StairElement type already defined
  - 3D: Render as stepped geometry (series of boxes)
- **How to Test:**
  - Unit: Create stair → verify riser count, dimensions
  - Edge: Non-standard riser heights (code compliance), spiral stair geometry
- **Quality Gate:**
  - [ ] Stair creates correct number of risers
  - [ ] Total rise = risers × riser_height (matches level-to-level height)
  - [ ] 3D renders steps visually

---

### Feature: `move` / `modify` Terminal Command

- **Phase:** 1 | **Priority:** P1 | **Effort:** M
- **What:** Adjust elements after creation without delete+recreate
- **Why:** Basic editing capability
- **How to Build:**
  - `move <id> --to 5,3` — change position
  - `modify <id> --height 3.5 --material Brick` — change properties
  - Wire to `modelStore.updateElement()` and `updateProperties()`
- **How to Test:**
  - Unit: Create wall → move → verify new position
  - Integration: Move wall → verify 3D updates → verify hosted doors move too
  - Edge: Move to same position, modify non-existent property
- **Quality Gate:**
  - [ ] `move` updates element position
  - [ ] `modify` updates element properties
  - [ ] Hosted elements (doors/windows) move with their wall
  - [ ] Undo works for move/modify
- **Scrutiny:**
  - Risk: Moving wall doesn't update hosted door positions
  - Detect: Query door position after wall move

---

### Feature: Door/Window Overlap Validation

- **Phase:** 1 | **Priority:** P1 | **Effort:** S
- **What:** Prevent placing two doors at same offset in same wall
- **Why:** Obviously incorrect. Embarrassing in demo.
- **How to Build:**
  - In `placeDoorHandler` / `placeWindowHandler`: check wall's `hosts[]` for overlap
  - Overlap = new opening bounds intersect existing opening bounds
- **How to Test:**
  - Unit: Place door → place second door at same offset → expect error
  - Edge: Adjacent but non-overlapping doors, door at wall end
- **Quality Gate:**
  - [ ] Overlapping placement returns error message
  - [ ] Non-overlapping placement succeeds
  - [ ] Error message says which existing opening conflicts

---

### Feature: Level Enforcement on Elements

- **Phase:** 1 | **Priority:** P1 | **Effort:** M
- **What:** Validate `--level` exists when creating elements. Store as typed field.
- **Why:** Level is stored as string in properties bag, never validated.
- **How to Build:**
  - In all element creation handlers: validate level exists in `modelStore.levels`
  - Store as `level` field on BaseElement (not just properties)
  - Default to active level if not specified
- **How to Test:**
  - Unit: Create wall with non-existent level → expect error
  - Integration: Set active level → create wall → verify wall on correct level
- **Quality Gate:**
  - [ ] Invalid level name rejected with error
  - [ ] Default to active level when not specified
  - [ ] Element `level` field matches actual Level object

---

### Feature: Grid Line Element Type + Command

- **Phase:** 1 | **Priority:** P1 | **Effort:** M
- **What:** Named structural grid lines (A, B, C / 1, 2, 3)
- **Why:** Phase 0 — fundamental to BIM workflow
- **How to Build:**
  - New `GridLine` element type
  - `grid add A --axis x --position 0`, `grid add 1 --axis y --position 5`
  - Render as dashed lines on 2D canvas and 3D viewport
- **How to Test:**
  - Unit: Add grid line → verify in store
  - Integration: Add grid → place column at intersection → verify snap
  - Edge: Duplicate grid names, remove grid with elements on it
- **Quality Gate:**
  - [ ] Grid lines visible on canvas
  - [ ] Grid names displayed
  - [ ] Snap to grid intersections works

---

## Sprint 3: Polish (P1)

### Feature: Wall Join Detection & Cleanup

- **Phase:** 1 | **Priority:** P1 | **Effort:** L
- **What:** Auto-detect T-joins, L-joins at wall intersections and clean geometry
- **Why:** Walls currently just overlap — looks wrong in 3D
- **How to Build:**
  - After wall creation: `detectJoins()` from kernel joins module
  - Apply miter/cleanup geometry
  - Update wall mesh in 3D
  - Rust kernel has `joins/detect.rs` and `joins/miter.rs` (800+ lines)
- **How to Test:**
  - Unit: Two perpendicular walls → verify T-join detected
  - Integration: Create L-shaped room → verify clean corner in 3D
  - Edge: Walls at acute angles, three walls meeting at point
- **Quality Gate:**
  - [ ] L-joins produce clean corners (no overlap)
  - [ ] T-joins trim wall to meet
  - [ ] Join detection works for all wall angles
  - [ ] Performance: <10ms for 100 walls
- **Scrutiny:**
  - Risk: Join cleanup introduces geometry artifacts
  - Detect: Visual regression test + area conservation check

---

### Feature: DSL/Command Handler Unification

- **Phase:** 1 | **Priority:** P1 | **Effort:** L
- **What:** Single execution path for all commands
- **Why:** Two systems cause inconsistent behavior. PR #9 started this, needs completion.
- **How to Build:**
  - Route ALL terminal input through DSL parser first
  - DSL AST → executor → command dispatcher → model store
  - Remove duplicate handling in Terminal.tsx switch/case
  - Ensure all DSL features ($last, $selected, from/to syntax) work
- **How to Test:**
  - Integration: Every command in CONSTRUCTION_BIBLE golden path must work
  - E2E: Full house build scenario automated
- **Quality Gate:**
  - [ ] Every DSL command produces same result as equivalent command handler
  - [ ] $last variable works for all element types
  - [ ] No command silently fails
  - [ ] Terminal feedback for every command (success or error)
- **Scrutiny:**
  - Risk: Breaking existing working commands during unification
  - Detect: Regression test suite for all 18 existing commands

---

## Phase 2: Collaboration (Weeks 13-24)

### Feature: Authentication (Supabase)

- **Priority:** P0 for Phase 2 | **Effort:** M
- **What:** User auth via email + Google OAuth
- **Why:** Can't have collaboration without identity
- **How to Build:**
  - Supabase project setup
  - Auth provider in React (`@supabase/auth-helpers-react`)
  - JWT validation on server
  - User profile storage
- **Quality Gate:**
  - [ ] Sign up, sign in, sign out work
  - [ ] Google OAuth flow works
  - [ ] JWT tokens validated on API calls
  - [ ] Session persists across page reloads

---

### Feature: CRDT Real-Time Sync (Loro)

- **Priority:** P0 for Phase 2 | **Effort:** XL
- **What:** Multi-user real-time editing with automatic conflict resolution
- **Why:** The #1 differentiator. "Google Docs for BIM."
- **How to Build:**
  - Integrate Loro CRDT (kernel/pensaer-crdt has 510-line foundation)
  - WebSocket server for change transport
  - Client-side Loro document synced to Zustand stores
  - Offline buffer with reconnection merge
- **How to Test:**
  - Unit: Apply same op on two docs → merge → verify convergence
  - Integration: Two clients edit same wall simultaneously → both see result
  - E2E: 10 concurrent users making edits → all converge within 5s
  - Edge: Network partition (client offline 24h) → reconnect → merge
- **Quality Gate:**
  - [ ] Sync latency <100ms on LAN
  - [ ] 10+ concurrent users supported
  - [ ] Offline edits merge correctly
  - [ ] No data loss under any network condition
- **Scrutiny:**
  - Risk: CRDT state bloat with many operations
  - Worst: Divergent state that never converges
  - Detect: Hash-based state comparison across clients
  - Recover: Snapshot + replay from last known-good state

---

### Feature: Presence & Cursors

- **Priority:** P1 for Phase 2 | **Effort:** M
- **What:** See who's editing what, cursor sharing
- **Why:** Essential for collaborative UX
- **How to Build:**
  - Broadcast cursor position via WebSocket
  - Show colored avatars on elements being edited
  - Lock indicators for exclusive edits
- **Quality Gate:**
  - [ ] See other users' cursors in viewport
  - [ ] See who's editing which element
  - [ ] Cursor updates at 10+ FPS

---

### Feature: Design Branching & Merge

- **Priority:** P1 for Phase 2 | **Effort:** L
- **What:** Create alternative design options, compare, merge
- **Why:** "Git for buildings" — core value proposition
- **How to Build:**
  - Branch = CRDT document fork
  - Merge = CRDT three-way merge
  - UI for branch comparison (side-by-side 3D)
- **Quality Gate:**
  - [ ] Create branch from any point
  - [ ] Edit independently on branches
  - [ ] Merge with automatic conflict resolution
  - [ ] Visual diff between branches

---

## Phase 3: Agentic AI (Weeks 25-36)

### Feature: LangGraph Orchestration

- **Priority:** P0 for Phase 3 | **Effort:** L
- **What:** Multi-step AI workflows using LangGraph
- **Why:** AI can design buildings autonomously using MCP tools
- **How to Build:**
  - LangGraph integration on server
  - Agent graphs: "Design a house" → breaks into wall/floor/roof steps
  - Human-in-loop approval gates
- **Quality Gate:**
  - [ ] Agent can build a house from text description
  - [ ] Each step produces valid model state
  - [ ] Human can approve/reject/modify at each gate
  - [ ] Audit trail records all agent decisions

---

### Feature: Governance & Audit Layer

- **Priority:** P0 for Phase 3 | **Effort:** M
- **What:** Complete audit trail, approval gates for destructive operations
- **Why:** BIM requires accountability. Who changed what, when, why.
- **How to Build:**
  - Event sourcing (all mutations as events)
  - Approval gates before delete/modify ops
  - Audit log queryable by user, time, element
  - Soul constitution enforcement (from soul_full.md)
- **Quality Gate:**
  - [ ] Every model change logged with user, timestamp, reason
  - [ ] Destructive ops require approval
  - [ ] Audit log queryable and exportable
  - [ ] Zero unauthorized changes possible

---

### Feature: MCP Tool Surface Completion (33→60+ tools)

- **Priority:** P1 for Phase 3 | **Effort:** XL
- **What:** Complete all MCP tools across 4 servers
- **Why:** Agents need tools to work autonomously
- **Missing tools:**
  - Geometry: `boolean_op`, `join_elements`, `modify_param`, `compute_mesh`
  - Spatial: `room_analysis`, `adjacency`, `circulation`, `path_finding`
  - Validation: `code_comply`, `accessibility`, `fire_rating`, `egress_check`
  - Documentation: `door_schedule`, `window_schedule`, `room_schedule`, `export_report`
- **Quality Gate:**
  - [ ] Every tool has input/output schema
  - [ ] Every tool has unit test
  - [ ] Every tool handles invalid input gracefully
  - [ ] Tool response time <500ms

---

## Phase 4: Production Hardening (Weeks 37-48)

### Feature: 1M Element Performance

- **Priority:** P0 for Phase 4 | **Effort:** XL
- **What:** Handle 1 million elements without degradation
- **Why:** Real commercial buildings have 100K+ elements
- **How to Build:**
  - Virtualized rendering (only render visible elements)
  - WebGPU compute for spatial queries (pensaer-gpu crate exists)
  - Level-of-detail (LOD) for distant elements
  - Spatial partitioning (octree) for 3D queries
  - Lazy loading from server
- **How to Test:**
  - Load test: Generate 1M elements programmatically
  - Measure: FPS, memory, interaction latency
  - Target: 60 FPS, <2GB memory, <100ms interaction
- **Quality Gate:**
  - [ ] 60 FPS with 1M elements visible
  - [ ] Pan/zoom/orbit responsive
  - [ ] Element selection <50ms
  - [ ] Memory <2GB
- **Scrutiny:**
  - Risk: Three.js can't handle 1M draw calls
  - Detect: FPS monitoring
  - Recover: Instanced rendering, geometry batching, WebGPU

---

### Feature: Kubernetes Deployment

- **Priority:** P1 for Phase 4 | **Effort:** L
- **What:** Production K8s cluster with auto-scaling
- **How to Build:**
  - Helm charts for all services
  - ArgoCD for GitOps deployment
  - HPA for auto-scaling
  - PDB for availability
- **Quality Gate:**
  - [ ] Zero-downtime deployments
  - [ ] Auto-scale on load
  - [ ] Health checks on all pods
  - [ ] Rollback works

---

### Feature: Observability (OpenTelemetry)

- **Priority:** P1 for Phase 4 | **Effort:** M
- **What:** Metrics, logs, traces across all services
- **How to Build:**
  - OpenTelemetry SDK in server + client
  - Grafana dashboards
  - Alerting on error rates, latency
- **Quality Gate:**
  - [ ] Request traces end-to-end
  - [ ] Error rate dashboard
  - [ ] Latency percentiles (p50, p95, p99)
  - [ ] Alert on >1% error rate

---

### Feature: Security Hardening

- **Priority:** P0 for Phase 4 | **Effort:** L
- **What:** Encryption, auth, penetration testing
- **How to Build:**
  - TLS everywhere
  - Encryption at rest (PostgreSQL, MinIO)
  - RBAC (role-based access control)
  - Rate limiting
  - Input sanitization
  - External pen test
- **Quality Gate:**
  - [ ] All traffic encrypted (TLS 1.3)
  - [ ] No SQL injection possible
  - [ ] No XSS possible
  - [ ] Rate limiting on all endpoints
  - [ ] Pen test passed

---

## Go-To-Market (Weeks 49-52)

### Feature: pensaer.io Website

- **Status:** ✅ DEPLOYED (2 Feb 2026)
- **URL:** https://www.pensaer.io
- **Stack:** Vite + React + Tailwind on Vercel
- **Remaining:**
  - [ ] Interactive terminal demo on homepage
  - [ ] Video demo embedded
  - [ ] Pricing page
  - [ ] Documentation section
  - [ ] Blog / changelog

---

### Feature: Documentation Portal

- **Priority:** P1 for GTM | **Effort:** M
- **What:** Public docs site with tutorials, API reference, guides
- **How to Build:**
  - This encyclopedia → formatted as web docs
  - Docusaurus or VitePress
  - Deploy alongside pensaer.io
- **Quality Gate:**
  - [ ] All MCP tools documented with examples
  - [ ] Getting started tutorial (<10 min)
  - [ ] API reference auto-generated from schemas
  - [ ] Search works

---

### Feature: Community (Discord + GitHub)

- **Priority:** P1 for GTM | **Effort:** S
- **What:** Discord server, GitHub Discussions, early adopter program
- **How to Build:**
  - Discord server with channels (#general, #support, #showcase, #dev)
  - GitHub Discussions enabled
  - Early adopter waitlist (50 users)
- **Quality Gate:**
  - [ ] Discord live and moderated
  - [ ] First 10 early adopters onboarded
  - [ ] Feedback loop established

---

## Cross-Cutting: IFC Interoperability

### Feature: Full IFC Export

- **Priority:** P1 | **Effort:** L
- **What:** Export complete model to IFC4 format
- **Why:** Industry standard. Required for interop with Revit, ArchiCAD, etc.
- **Current:** Basic export exists (walls, rooms, floors). Missing: doors, windows, roofs, columns, beams.
- **How to Build:**
  - Extend `pensaer-ifc/src/export.rs` with door/window/roof/column/beam export
  - Generate proper IfcExtrudedAreaSolid for 3D geometry
  - Add material assignments
  - Add property sets (Pset_WallCommon, etc.)
- **Quality Gate:**
  - [ ] Exported IFC opens in BIM Viewer / Revit / ArchiCAD
  - [ ] All element types round-trip (export → import → compare)
  - [ ] Geometry matches within 1mm tolerance
  - [ ] Property data preserved

---

### Feature: Full IFC Import

- **Priority:** P1 | **Effort:** L
- **What:** Import IFC files from other BIM tools
- **Current:** Basic import (walls, rooms, floors). Missing: full geometry extraction, door/window import.
- **How to Build:**
  - Parse IfcExtrudedAreaSolid for accurate wall geometry
  - Import doors/windows with host wall relationships
  - Import columns, beams, roofs
  - Handle multiple storeys
- **Quality Gate:**
  - [ ] Import standard IFC test files (buildingSMART samples)
  - [ ] Element count matches source
  - [ ] Geometry within tolerance
  - [ ] Self-healing: malformed IFC doesn't crash, logs warnings

---

## Priority Summary

| Sprint | Features | Total Effort |
|--------|----------|-------------|
| Sprint 1 (Demo) | undo, level, column, beam, rect, select | ~2 weeks |
| Sprint 2 (Structure) | stair, move/modify, overlap validation, level enforcement, grid | ~2 weeks |
| Sprint 3 (Polish) | wall joins, DSL unification, opening handler | ~2 weeks |
| Phase 2 | Auth, CRDT, presence, branching, thin viewer | ~12 weeks |
| Phase 3 | LangGraph, governance, 30+ MCP tools | ~12 weeks |
| Phase 4 | 1M perf, K8s, observability, security | ~12 weeks |
| GTM | Docs, community, launch | ~4 weeks |

**Total: ~46 weeks from Sprint 1 to launch**

---

## Scrutiny Master Checklist

For ANY feature, before shipping:

1. **Does it compile?** `npx tsc --noEmit` / `cargo build`
2. **Does it have tests?** Unit + at least one integration
3. **Does it handle errors?** Invalid input → helpful error message, not crash
4. **Does it work with undo?** Every model change must be undoable
5. **Does it work in the golden path?** Can you still build a house?
6. **Does it perform?** <100ms response for user-facing operations
7. **Does it look right?** 3D viewport renders correctly
8. **Does it log?** Audit trail for model changes
9. **Is the PR small?** <500 lines, focused on one thing
10. **Does the Docker build pass?** `docker compose up --build`
