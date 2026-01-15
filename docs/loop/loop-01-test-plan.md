# Loop 01 Test Plan

Scope: FR-4, FR-6, FR-9, FR-11, FR-13, NFR-1 (partial), NFR-2 (partial)
Notes:
- FR-9 scope in Loop 01 is create_wall only.
- FR-11 scope in Loop 01 is event log + snapshots; branching deferred.
- FR-13 scope in Loop 01 is deterministic replay only.

Owners:
- Kernel: RICHARD
- App: RICHARD
- MCP: RICHARD
- QA: RICHARD

## Tests

### T-REGEN-001 (Integration)
Owner: RICHARD
Due: TBD
Purpose: Deterministic regeneration for core elements.
Steps:
1) Create wall A and wall B.
2) Create room bounded by walls.
3) Move wall A by 1m.
Expected:
- Joins and room boundaries update deterministically.
- Room area recalculates and matches expected value.

### T-GEO-001 (Unit)
Owner: RICHARD
Due: TBD
Purpose: Geometry primitives and bounding box correctness.
Steps:
1) Create line, rectangle, and wall primitive.
2) Compute bounding boxes and compare to expected values.
Expected:
- Bounding boxes match analytic results.

### T-GEO-002 (Integration)
Owner: RICHARD
Due: TBD
Purpose: Meshing pipeline for wall/floor primitives.
Steps:
1) Create a wall and floor primitive.
2) Generate meshes at default tolerance.
Expected:
- Mesh is watertight and non-empty.

### T-GEO-003 (Integration)
Owner: RICHARD
Due: TBD
Purpose: Boolean ops using CGAL-backed operations.
Steps:
1) Create two overlapping solids.
2) Run union and difference.
Expected:
- Union and difference produce valid meshes.

### T-MCP-001 (E2E)
Owner: RICHARD
Due: TBD
Purpose: MCP geometry tool create_wall end-to-end.
Steps:
1) Call create_wall via MCP.
2) Verify event written and geometry computed.
Expected:
- Tool returns wall_id and event_id.
- Event log contains the new wall event.

### T-SERVER-001 (Integration)
Owner: RICHARD
Due: TBD
Purpose: Append-only event log.
Steps:
1) Append a sequence of events.
2) Query by aggregate_id.
Expected:
- Sequence numbers are monotonic and ordered.

### T-SERVER-002 (Integration)
Owner: RICHARD
Due: TBD
Purpose: Snapshot rebuild from event log.
Steps:
1) Create snapshot after N events.
2) Rebuild state from log.
Expected:
- Snapshot state matches rebuilt state.

### T-EVAL-001 (Integration)
Owner: RICHARD
Due: TBD
Purpose: Deterministic replay harness.
Steps:
1) Replay a fixed event sequence twice.
Expected:
- Resulting state hash is identical.

### P-REGEN-001 (Perf)
Owner: RICHARD
Due: TBD
Purpose: Regen performance baseline.
Steps:
1) Apply a synthetic 1000-element change set.
Expected:
- Regen time recorded and baseline captured.

### R-REPLAY-001 (Integration)
Owner: RICHARD
Due: TBD
Purpose: Reliability of replay under normal conditions.
Steps:
1) Replay 100k events from cold start.
Expected:
- Replay completes under 60 seconds.
