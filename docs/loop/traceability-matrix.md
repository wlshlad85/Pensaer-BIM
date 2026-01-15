# FR/NFR Traceability Matrix (Template)

Columns:
- ID: Requirement ID from PRD
- Summary: Short requirement summary
- Test/Scenario ID(s): Planned tests or golden paths
- Type: Unit | Integration | E2E | Perf | Policy
- Evidence: File path or CI link
- Status: TBD | Pass | Fail

| ID | Summary | Test/Scenario ID(s) | Type | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| FR-1 | CLI core commands | T-CLI-001, T-CLI-002 | Integration | TBD | TBD |
| FR-2 | NL pipeline | T-NL-001, T-NL-002 | Unit | TBD | TBD |
| FR-3 | Agent orchestration | T-AGENT-001 | Integration | TBD | TBD |
| FR-4 | Core BIM model + deterministic regen | T-REGEN-001 | Integration | docs/loop/loop-01-test-plan.md | TBD |
| FR-5 | CRDT collaboration | T-CRDT-001, GP-3 | E2E | TBD | TBD |
| FR-6 | Geometry kernel primitives + booleans | T-GEO-001, T-GEO-002, T-GEO-003 | Integration | docs/loop/loop-01-test-plan.md | TBD |
| FR-7 | IFC 4.3 import/export | T-IFC-001, T-IFC-002, GP-1 | Integration | TBD | TBD |
| FR-8 | Viewer + glTF export | T-VIEW-001, T-VIEW-002, GP-2 | E2E | TBD | TBD |
| FR-9 | MCP tooling | T-MCP-001 | E2E | docs/loop/loop-01-test-plan.md (partial: create_wall) | TBD |
| FR-10 | Scripting/extensions | T-SCRIPT-001 | Integration | TBD | TBD |
| FR-11 | Model server + branching | T-SERVER-001, T-SERVER-002 | Integration | docs/loop/loop-01-test-plan.md (partial: event log + snapshots) | TBD |
| FR-12 | Governance + audit | T-GOV-001, T-GOV-002 | Integration | TBD | TBD |
| FR-13 | Evaluation harness | T-EVAL-001 | Integration | docs/loop/loop-01-test-plan.md (partial: replay) | TBD |
| NFR-1 | Performance targets | P-REGEN-001 | Perf | docs/loop/loop-01-test-plan.md (partial) | TBD |
| NFR-2 | Reliability + replay | R-REPLAY-001 | Integration | docs/loop/loop-01-test-plan.md (partial) | TBD |
| NFR-3 | Security + privacy | S-LOCAL-001, S-OPTIN-001 | Policy | TBD | TBD |
| NFR-4 | Observability | O-LOG-001, O-METRIC-001 | Integration | TBD | TBD |
| NFR-5 | Compatibility | C-IFC-001, C-GLTF-001, C-BCF-PLAN | Integration | TBD | TBD |
