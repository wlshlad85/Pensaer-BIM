# Loop 01 Checklist

## Spec Gate
- [ ] Scope matches Loop 01 (FR-4, FR-6, FR-9, FR-11, FR-13, NFR-1/2 partial)
- [ ] Acceptance criteria are explicit and testable
- [ ] Risks and open questions recorded
- [ ] Owners assigned for test plan items

## Build Gate
- [ ] Core wall element + geometry primitives implemented
- [ ] Event log append + snapshot scaffold in place
- [ ] MCP create_wall tool wired end-to-end
- [ ] Interfaces documented in build notes

## Verify Gate
- [ ] T-REGEN-001 passes
- [ ] T-GEO-001, T-GEO-002, T-GEO-003 pass
- [ ] T-MCP-001 passes
- [ ] T-SERVER-001, T-SERVER-002 pass
- [ ] T-EVAL-001 passes
- [ ] P-REGEN-001 baseline recorded
- [ ] R-REPLAY-001 meets time target

## Decide Gate
- [ ] Decision recorded (ship/iterate/rollback)
- [ ] Delta list for Loop 02 written
