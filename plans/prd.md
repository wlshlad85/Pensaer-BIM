# Pensaer-B Ralph Loop PRD

This file is the Ralph Loop driver. Use it with:

```
ralph --prd plans/prd.md "Read plans/prd.md and work the next open item."
```

## Workflow (must do)
1. Read `docs/PRD.md` (consolidated v2.0) and the Loop 01 docs in `docs/loop/`.
2. Pick the highest priority item in "Offen".
3. Implement the smallest useful slice (no shortcuts).
4. Run relevant tests or benchmarks.
5. Update evidence in `docs/loop/loop-01-evidence-pack-template.md`.
6. Move the completed item from "Offen" to "Erledigt" with date.
7. Update `notes.txt` with status and next steps.

## Offen
- Loop 01: Implement wall element + geometry primitives + meshing (FR-4, FR-6) [code added; tests pending].
- Loop 01: Add event log append + snapshot scaffold (FR-11 partial).
- Loop 01: Wire MCP create_wall end-to-end (FR-9 partial).
- Loop 01: Implement deterministic replay harness (FR-13 partial).
- Loop 01: Record regen benchmark baseline (NFR-1 partial).
- Loop 01: Record replay reliability baseline (NFR-2 partial).
- Loop 01: Fill evidence pack with build notes and test results.

## Erledigt
- (none)
