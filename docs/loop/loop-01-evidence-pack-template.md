# Loop 01 Evidence Pack (Template)

Loop ID: 01
Owner: RICHARD
Dates: 2026-01-15 to 2026-01-29
Status: Draft

## 1) Spec Gate
Scope:
- In scope (FR/NFR IDs): FR-4, FR-6, FR-9 (partial: create_wall), FR-11 (partial: event log + snapshots), FR-13 (partial: deterministic replay), NFR-1 (partial), NFR-2 (partial)
- Out of scope: FR-1, FR-2, FR-3, FR-5, FR-7, FR-8, FR-10, FR-12, NFR-3, NFR-4, NFR-5

Acceptance criteria:
- Create wall -> geometry computed -> event stored (FR-4, FR-6, FR-11 partial).
- Move wall -> joins/room boundary updates deterministic (FR-4, FR-13 partial).
- MCP geometry tool create_wall works end-to-end (FR-9 partial).
- Event log replay rebuilds state for a sample sequence (FR-11 partial, NFR-2 partial).
- Regen benchmark recorded for a 1000-element change (NFR-1 partial).

Risks:
- R-1: Geometry primitives and meshing may be unstable under edge cases.
- R-2: Regen determinism may be violated by ordering or floating-point drift.

Open questions:
- Q-1: Snapshot cadence and storage footprint for early event log.
- Q-2: Conflict policy details for same-element edits (deferred to Loop 02+).

Decisions made:
- D-1: Analytic primitives + meshing first; full B-rep deferred.

## 2) Build Gate
Summary:
- Kernel MVP: wall element, geometry primitives, meshing pipeline (initial Rust structs and mesh builder).
- Remaining: event log scaffold, MCP create_wall, replay harness.

Components touched:
- kernel/ (geometry primitives, meshing)

Interfaces added or changed:
- CLI: none required in Loop 01 (optional stub).
- API: event append and query endpoints (internal).
- MCP tools: create_wall.

Flags and migrations:
- Flags: feature flag for regen loop if needed.
- Migrations: events table + snapshot table.

## 3) Verify Gate
Tests run:
- Unit: not run (rustc not available).
- Integration: not run (rustc not available).
- E2E: not run (MCP server not implemented).

Golden-path scenarios (Loop 02+):
- GP-1: init -> create "two-story office" -> validate -> export IFC (deferred)
- GP-2: import IFC -> query "find walls" -> export glTF (deferred)
- GP-3: two clients create elements -> sync -> no conflicts (deferred)

Performance checks (if applicable):
- Regen benchmark: record time for 1000-element change (baseline).
- CLI query latency: not in scope.
- Viewer FPS: not in scope.
- Parallel CPU utilization: optional baseline check for geometry tasks.

Evidence links:
- Logs: TBD (tests not run)
- Screenshots: N/A
- Benchmark results: TBD
- CI run: TBD
- Test plan: `docs/loop/loop-01-test-plan.md`
- Checklist: `docs/loop/loop-01-checklist.md`
- Run sheet: `docs/loop/loop-01-run-sheet.md`

## 4) Decide Gate
Decision: ship | iterate | rollback
Rationale:
- Why this decision was made

Delta list for next loop:
- Add IFC import/export via IfcOpenShell (FR-7).
- Add WebGL viewer baseline + glTF export (FR-8).
- Add branching operations for FR-11 remainder.
- Add governance audit logs for tools (FR-12).

## 5) Signoff
- Product:
- Engineering:
- QA:
- Date:
