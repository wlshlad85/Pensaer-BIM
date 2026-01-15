# Loop 01 Run Sheet

Purpose: Execute the Loop 01 plan and capture evidence for spec, build, and verify gates.

## Pre-flight
- [ ] Confirm toolchains installed (Rust, Python 3.12, Postgres, Redis).
- [ ] Create any required local env files (if used).
- [ ] Decide loop branch name and create it.

Commands (fill in as needed):
```
rustc --version
python3 --version
psql --version
redis-cli --version
git checkout -b loop-01
```

## Build Gate Tasks
- [ ] Implement wall element + geometry primitives (kernel).
- [ ] Add meshing pipeline for wall/floor primitives.
- [ ] Implement event log append and snapshot scaffold (app).
- [ ] Wire MCP create_wall tool to command -> event -> regen path.

Notes:
- Keep changes scoped to FR-4, FR-6, FR-9 (create_wall), FR-11 (event log + snapshots), FR-13 (replay).
- Record touched components in the evidence pack.

## Verify Gate Tasks

### T-REGEN-001
- [ ] Execute deterministic regen test.
- Evidence: logs or test output file path.

### T-GEO-001
- [ ] Run primitive and bounding box unit tests.
- Evidence: test output.

### T-GEO-002
- [ ] Run meshing pipeline integration test.
- Evidence: test output and sample mesh artifact.

### T-GEO-003
- [ ] Run boolean ops integration test.
- Evidence: test output and mesh validity check.

### T-MCP-001
- [ ] Call MCP create_wall end-to-end.
- Evidence: MCP logs and event log entry.

### T-SERVER-001
- [ ] Append-only event log test.
- Evidence: test output and sample event query.

### T-SERVER-002
- [ ] Snapshot rebuild test.
- Evidence: snapshot + replay hash comparison.

### T-EVAL-001
- [ ] Deterministic replay test.
- Evidence: hash values from two runs.

### P-REGEN-001
- [ ] Regen performance baseline.
- Evidence: benchmark numbers and environment details.

### R-REPLAY-001
- [ ] Replay 100k events under 60 seconds.
- Evidence: timing logs.

## Evidence Pack Updates
- [ ] Fill in build notes and interfaces in `docs/loop/loop-01-evidence-pack-template.md`.
- [ ] Add evidence links for each test.
- [ ] Record decision (ship/iterate/rollback) and delta list.

## Signoff
- [ ] Complete signoff section in the evidence pack.
