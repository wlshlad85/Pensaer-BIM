# Pensaer Product Requirements Document

**Document Version:** 2.0 (Consolidated)
**Last Updated:** January 15, 2026
**Status:** Founding Document + Technical Specification

---

## Document History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | January 13, 2026 | Initial user stories (founding) |
| 2.0 | January 15, 2026 | Technical spec-driven pivot |
| 2.0-consolidated | January 15, 2026 | Merged into single document |

---

# Part I: Product Vision (v1.0 - Founding)

> *This section captures the original product vision and user-focused requirements established at project inception.*

---

## Product Overview

**Pensaer** is a developer-first Building Information Modeling (BIM) platform that combines the power of terminal-based workflows with intuitive 2D/3D visualization.

### One-Liner
> A VS Code-like experience for building design, with IFC compatibility and AI-powered assistance.

### Target Release
- **Alpha:** Week 8 (Terminal + DSL working)
- **Beta:** Week 16 (Full collaboration)
- **GA:** Month 6

---

## User Personas

### 1. Primary: Maya the Computational Designer

**Background:**
- 32 years old, M.Arch from SCI-Arc
- 6 years at mid-size architecture firm
- Self-taught Python, uses Dynamo daily
- Frustrated with Revit's limitations

**Quote:**
> "I spend more time clicking through Revit menus than actually designing. I just want to script my way through the boring stuff."

**Goals:**
- Automate repetitive modeling tasks
- Version control for design iterations
- Faster iteration on parametric designs

**Pain Points:**
- Revit's GUI is click-heavy
- No native scripting (needs Dynamo/pyRevit)
- No version control integration
- Expensive for personal use

### 2. Secondary: Ben the BIM Manager

**Background:**
- 45 years old, registered architect
- 15 years experience, 8 in BIM
- Manages 20-person team
- Responsible for standards and quality

**Quote:**
> "I spend half my day in coordination meetings and the other half fixing other people's models."

**Goals:**
- Automated quality checks
- Standardized workflows
- Faster clash resolution
- Better documentation

**Pain Points:**
- Manual clash detection is slow
- Inconsistent standards across team
- Hard to track who changed what

### 3. Tertiary: Sofia the Firm Owner

**Background:**
- 52 years old, runs 8-person firm
- Concerned about software costs
- Wants to attract young talent
- Open to new technology

**Quote:**
> "We're paying $20K/year for Revit licenses. If there's a better option, I'm listening."

**Goals:**
- Reduce software costs
- Competitive advantage
- Attract tech-savvy staff

---

## Feature Requirements

### Epic 1: Core Modeling (Phase 1)

#### US-1.1: Wall Creation
**As a** designer
**I want to** draw walls by clicking start and end points
**So that** I can quickly define room boundaries

**Acceptance Criteria:**
- [ ] Click-click wall creation
- [ ] Adjustable thickness (default 200mm)
- [ ] Wall-to-wall snapping
- [ ] Visual feedback during drawing
- [ ] Undo/redo support

#### US-1.2: Door and Window Placement
**As a** designer
**I want to** place doors and windows in walls
**So that** I can define openings

**Acceptance Criteria:**
- [ ] Doors/windows must be placed in walls
- [ ] Automatic wall cutting
- [ ] Adjustable width/height
- [ ] Flip functionality

#### US-1.3: Room Definition
**As a** designer
**I want to** define rooms bounded by walls
**So that** I can track spaces and areas

**Acceptance Criteria:**
- [ ] Rooms detect bounding walls
- [ ] Automatic area calculation
- [ ] Room naming
- [ ] Occupancy type

#### US-1.4: Selection and Modification
**As a** designer
**I want to** select and modify elements
**So that** I can edit my design

**Acceptance Criteria:**
- [ ] Click to select
- [ ] Shift-click for multi-select
- [ ] Box selection
- [ ] Move by drag
- [ ] Resize via handles
- [ ] Delete with keyboard

#### US-1.5: Undo/Redo
**As a** designer
**I want to** undo and redo my actions
**So that** I can recover from mistakes

**Acceptance Criteria:**
- [ ] Cmd+Z to undo
- [ ] Cmd+Shift+Z to redo
- [ ] Unlimited undo stack (session)
- [ ] Transaction grouping

---

### Epic 2: Developer Experience (Phase 2)

#### US-2.1: Command Palette
**As a** power user
**I want to** access all commands via Cmd+K
**So that** I never need to leave the keyboard

**Acceptance Criteria:**
- [ ] Cmd+K opens palette
- [ ] Fuzzy search
- [ ] Keyboard navigation (up/down/enter)
- [ ] Recently used commands
- [ ] Shortcut hints

#### US-2.2: Terminal Panel
**As a** developer
**I want to** access a terminal within the app
**So that** I can script operations

**Acceptance Criteria:**
- [ ] Resizable terminal panel
- [ ] Command history
- [ ] Tab completion
- [ ] Syntax highlighting
- [ ] Error messages

#### US-2.3: DSL Commands
**As a** developer
**I want to** create and modify elements via commands
**So that** I can automate workflows

**Acceptance Criteria:**
- [ ] `wall create --from x,y --to x,y --thickness 200`
- [ ] `door place --in wall-id --offset 1000`
- [ ] `select where type=wall`
- [ ] `delete selection`
- [ ] `copy selection --to-levels 2,3,4`

#### US-2.4: Natural Language Commands
**As a** user
**I want to** type commands in plain English
**So that** I don't need to memorize syntax

**Acceptance Criteria:**
- [ ] "add 200mm concrete wall" works
- [ ] "fix all fire code issues" works
- [ ] Preview of interpreted action
- [ ] Confidence indicator

#### US-2.5: Keyboard Shortcuts
**As a** power user
**I want to** use keyboard shortcuts for common actions
**So that** I can work faster

**Acceptance Criteria:**
- [ ] V = Select tool
- [ ] W = Wall tool
- [ ] D = Door tool
- [ ] N = Window tool
- [ ] 3 = 3D view
- [ ] Cmd+S = Save
- [ ] Customizable via settings

---

### Epic 3: BIM Compliance (Phase 3)

#### US-3.1: IFC Import
**As a** professional
**I want to** import IFC files
**So that** I can work with existing models

**Acceptance Criteria:**
- [ ] Support IFC2x3 and IFC4
- [ ] Import walls, doors, windows, slabs
- [ ] Preserve properties
- [ ] Progress indicator
- [ ] Error reporting

#### US-3.2: IFC Export
**As a** professional
**I want to** export to IFC
**So that** I can share with other software

**Acceptance Criteria:**
- [ ] Export to IFC4
- [ ] Include property sets
- [ ] Preserve relationships
- [ ] Valid IFC output

#### US-3.3: Multi-Level Support
**As a** designer
**I want to** work with multiple floors
**So that** I can design multi-story buildings

**Acceptance Criteria:**
- [ ] Level creation
- [ ] Level switching
- [ ] Copy to level
- [ ] Level browser panel
- [ ] 3D shows all levels

#### US-3.4: Compliance Checking
**As a** professional
**I want to** check my model for code compliance
**So that** I avoid errors in construction documents

**Acceptance Criteria:**
- [ ] Fire rating checks
- [ ] Accessibility checks
- [ ] Issue visualization
- [ ] One-click fix suggestions

#### US-3.5: Clash Detection
**As a** BIM manager
**I want to** detect element clashes
**So that** I can resolve coordination issues

**Acceptance Criteria:**
- [ ] Detect geometric overlaps
- [ ] Tolerance settings
- [ ] Clash report
- [ ] Navigate to clash

---

### Epic 4: Collaboration (Phase 4)

#### US-4.1: Cloud Save
**As a** user
**I want to** save my projects to the cloud
**So that** I can access them anywhere

**Acceptance Criteria:**
- [ ] Create account
- [ ] Save to cloud
- [ ] Project list
- [ ] Open from cloud

#### US-4.2: Real-Time Collaboration
**As a** team member
**I want to** edit with colleagues in real-time
**So that** we can work together efficiently

**Acceptance Criteria:**
- [ ] See others' cursors
- [ ] Live updates
- [ ] Presence indicators
- [ ] Conflict-free editing

#### US-4.3: Comments and Markup
**As a** team member
**I want to** leave comments on the model
**So that** I can communicate with my team

**Acceptance Criteria:**
- [ ] Add comment at location
- [ ] Reply to comments
- [ ] Resolve comments
- [ ] @mentions

#### US-4.4: Version History
**As a** project manager
**I want to** see the history of changes
**So that** I can track progress and revert if needed

**Acceptance Criteria:**
- [ ] View change history
- [ ] See who made changes
- [ ] Revert to previous version
- [ ] Compare versions

---

## Non-Functional Requirements (Part I)

### Performance
| Metric | Requirement |
|--------|-------------|
| Initial load | < 3 seconds |
| Command palette | < 100ms |
| Element count | Support 10,000+ elements |
| IFC import (50MB) | < 30 seconds |

### Accessibility
- Keyboard navigable
- Screen reader support
- Color contrast compliance
- Zoom support

### Security
- HTTPS only
- Encrypted storage
- No password storage (OAuth preferred)
- GDPR compliant

### Browser Support
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

---

## Success Metrics (Part I)

### Alpha (Week 8)
- [ ] 100 active alpha users
- [ ] 50+ terminal commands executed per user
- [ ] < 5 critical bugs

### Beta (Week 16)
- [ ] 1,000 registered users
- [ ] 3 architecture firms piloting
- [ ] NPS > 40

### GA (Month 6)
- [ ] 10,000 registered users
- [ ] $10K MRR
- [ ] NPS > 50

---

## Out of Scope (v1)

- MEP (Mechanical, Electrical, Plumbing)
- Structural analysis
- Rendering/visualization
- Mobile app
- Offline-first desktop app
- Revit plugin/integration

---

# Part II: Technical Specification (v2.0 - Post-Pivot)

> *This section defines the spec-driven technical requirements following the architectural pivot to a CLI-first, agentic, AI-native platform.*

---

## 1) Purpose

Deliver a CLI-first, agentic, AI-native BIM platform built from first principles for 2026-era hardware and collaboration patterns. The platform is a model server plus governed agent runtime, not a desktop application. Sacred invariant: all outputs are consistent projections of a single authoritative model state, and change propagation scales with the size of the change, not the size of the model. This PRD converts the architecture roadmap into an executable, spec-driven plan suitable for iterative implementation using the Ralph Biggum loop (spec -> build -> verify -> decide).

## 2) Ralph Biggum Loop Inputs

These inputs drive each iteration and gate progress. The default gate set is Balanced.

### Loop cycle
1. Spec: define requirements and acceptance criteria
2. Build: implement against spec items
3. Verify: tests, benchmarks, and validation checks
4. Decide: ship, iterate, or rollback

### Gate criteria (Balanced)
Spec gate:
- Scoped FR/NFR IDs with acceptance criteria
- Risks and open questions captured
- Explicit in-scope and out-of-scope boundaries

Build gate:
- Feature complete for the scoped items or behind flags
- Interfaces documented (CLI, API, MCP tools)
- Build notes list touched components

Verify gate:
- Unit and integration tests pass for scoped items
- Golden-path scenario run completed when in scope
- Performance check if geometry, CRDT, or rendering touched

Decide gate:
- Decision log: ship, iterate, or rollback
- Delta list for next loop if iterate

### Required artifacts per loop (Evidence Pack)
- Spec items with IDs and acceptance criteria
- Build notes (components touched, interfaces added)
- Verification evidence (tests, benchmarks, sample runs)
- Decision log (ship/iterate/rollback and rationale)

### Efficiency add-ons
- Gate checklist with a single page evidence pack per loop
- Spec-to-test traceability (each FR/NFR maps to a named test)
- Golden-path scenarios that must pass every loop
- Risk-based gates with stricter checks for core systems
- Timeboxes to force decisions

### Golden-path scenarios (default)
- GP-1: `init -> create "two-story office" -> validate -> export IFC`
- GP-2: `import IFC -> query "find walls" -> export glTF`
- GP-3: `two clients create elements -> sync -> no conflicts`

### Risk-based gates (stricter checks)
- Geometry, CRDT, rendering: require perf check and regression test update
- Agent tooling: require MCP contract test and tool logs
- IFC import/export: require round-trip test evidence

### Timeboxes (default)
- Feasibility loops: 1 week
- MVP loops: 2 weeks
- Collaboration loops: 2 weeks

## 3) Problem Statement

Current BIM platforms are constrained by single-threaded, GUI-first architectures designed for early 2000s hardware and file-based collaboration. This creates slow regeneration, limited parallelism, brittle extensibility, and weak automation. Pensaer-B targets a developer-as-user paradigm, delivering a model server with governed agents, parallel compute, and real-time collaboration from day one.

## 4) Goals and Non-Goals

### Goals
- Provide a CLI-first BIM system where all operations are accessible via API and tools.
- Preserve the sacred invariant: consistent projections and change-scoped regeneration.
- Maintain vendor independence with a custom kernel (no external BIM engines).
- Support agentic workflows with tool invocation via MCP and governance.
- Enable parallel geometry, validation, and rendering pipelines.
- Deliver offline-first collaboration with CRDT synchronization.
- Achieve IFC 4.3 import/export parity for core elements.

### Non-Goals (MVP)
- Full parity with Revit families and legacy add-in ecosystems.
- A full-featured GUI authoring interface (viewer only is OK).
- Complete coverage of all IFC 4.3 entities on day one.
- Integration with proprietary BIM engines.

## 5) Target Users (Technical)
- Computational designers and architects who code.
- BIM automation developers and tool builders.
- AEC teams needing offline-first, privacy-sensitive workflows.

## 6) Scope

### MVP scope
- CLI for project init, model import/export, query, create, validate, and sync.
- Agentic execution pipeline with intent parsing, checkpoints, and audit logs.
- Core BIM model with event sourcing, deterministic regeneration, and CRDT collaboration.
- Vendor-free geometry kernel with analytic primitives and meshing.
- IFC 4.3 import/export for core building elements.
- Thin client viewer (WebGL with WebGPU migration path) and glTF export.

### Out of scope
- Full desktop GUI authoring.
- Advanced MEP detailing and fabrication tooling.
- Large-scale digital twin features beyond initial viewer.

## 7) Functional Requirements (Spec Items)

Each requirement includes acceptance criteria and verification.

### FR-1 CLI Core
Description: Provide a CLI with subcommands for project lifecycle and model operations.
Acceptance:
- `pensaer init`, `pensaer open`, `pensaer import`, `pensaer export`, `pensaer query`, `pensaer create`, `pensaer validate`, `pensaer sync` exist.
- `pensaer select`, `pensaer modify`, `pensaer clash`, `pensaer history`, `pensaer branch` exist.
- `pensaer query "find walls"` returns a structured result set.
Verification: CLI tests and example runs in CI.

### FR-2 Natural Language Pipeline
Description: Translate natural language into validated BIM commands with preview and confirmation.
Acceptance:
- NL input produces a deterministic command plan.
- User confirmation step can be bypassed with a flag.
Verification: Unit tests for translation and command plan snapshots.

### FR-3 Agent Orchestration
Description: Multi-agent workflow for plan -> build -> validate -> document.
Acceptance:
- At least 3 agents (planner, geometry, validator) can coordinate a task.
- Each agent invokes tools via MCP with auditable logs.
- Destructive actions require explicit approval or dry-run preview.
Verification: Integration test with a "two-story office" scenario.

### FR-4 Core BIM Model
Description: Core element hierarchy, parameters, and deterministic regeneration with event sourcing.
Acceptance:
- Create and modify walls, floors, doors, windows, and rooms.
- All changes stored as immutable events with replay.
- "Move wall" updates joins, hosted elements, and room boundaries deterministically.
Verification: Event store replay test producing identical state.

### FR-5 Collaboration (CRDT)
Description: Offline-first collaboration with structural hierarchy support.
Acceptance:
- Two clients can concurrently create elements and sync without conflict.
- CRDT preserves building -> storey -> space -> element structure.
Verification: Multi-client CRDT simulation tests.

### FR-6 Geometry Kernel Integration
Description: Vendor-free Rust geometry kernel with analytic primitives, meshing, and robust boolean ops (full B-rep deferred).
Acceptance:
- Create wall and floor solids with valid topology and meshes.
- Boolean union and difference succeed on simple solids using CGAL-backed operations.
- GPU-accelerated clash detection runs on test scenes.
Verification: Geometry regression tests with reference volumes and mesh checks.

### FR-7 IFC 4.3 Import/Export
Description: Parse and emit IFC 4.3 for core elements with canonical mapping.
Acceptance:
- Import sample IFC and preserve element counts.
- Export produced IFC re-imports with equivalent entities.
Verification: Round-trip tests using IfcOpenShell (native parser deferred).

### FR-8 Rendering and Export
Description: Thin client viewer and glTF export for viewing.
Acceptance:
- glTF export loads in a standard viewer without errors.
- Viewer renders a 50k triangle model at 60 FPS on baseline hardware.
Verification: Viewer benchmark and export validation (WebGL baseline, WebGPU upgrade path).

### FR-9 MCP Tooling
Description: MCP servers expose geometry, spatial, validation, and docs tools.
Acceptance:
- MCP tool registry exposes `create_wall`, `create_floor`, `create_opening`, `run_clash_detection`, `generate_schedule`.
- Tools validate inputs with schema checks (Zod or equivalent).
Verification: MCP contract tests.

### FR-10 Plugin and Scripting
Description: Support sandboxed scripting and tool extensions.
Acceptance:
- A script can create a parametric grid and rooms.
- Scripts run in a sandboxed environment with access to BIM API.
Verification: Scripted end-to-end tests.

### FR-11 Model Server and Branching
Description: Event-sourced model server with snapshots and branching.
Acceptance:
- All writes append to an event log with branch context.
- Snapshots can be rebuilt from events and match current state.
- Branch create and merge operations are supported with conflict policy.
Verification: Branching tests and snapshot replay tests.

### FR-12 Governance and Audit
Description: Governed agent runtime with permissions and auditability.
Acceptance:
- Tool-level permissions and approval gates exist for destructive operations.
- Audit logs capture actor, tool, inputs, outputs, and result.
Verification: Audit log tests and approval flow integration tests.

### FR-13 Evaluation Harness
Description: Deterministic replay and regression suite for agents and regeneration.
Acceptance:
- Deterministic replay produces identical state for a fixed event sequence.
- Golden-path scenarios run in CI with saved evidence.
Verification: Replay tests and golden-path snapshots.

## 8) Non-Functional Requirements (Part II)

### NFR-1 Performance
- Regen under 100 ms for a 1000-element change in baseline benchmarks.
- CLI query responses under 50 ms for common filters.
- Viewer renders 50k triangles at 60 FPS on baseline hardware.
- Parallel geometry tasks use at least 50 percent CPU cores on 16-core machines.

### NFR-2 Reliability
- Event store durability with zero data loss in normal shutdowns.
- Crash recovery via replay completes under 60 seconds for 100k events.
- Deterministic replay yields identical state for identical event streams.

### NFR-3 Security and Privacy
- Local-first by default.
- Explicit opt-in for cloud sync and external LLM routing.

### NFR-4 Observability
- Structured logs for agent actions, MCP calls, and event writes.
- Metrics for command latency, event throughput, and sync conflicts.

### NFR-5 Compatibility
- IFC 4.3 compliance for supported entities.
- glTF 2.0 export compatible with common viewers.
- BCF 3.0 and IDS 1.0 support planned for validation and issues.

## 9) Architecture Overview

### System diagram (logical)
```
Interface Layer
  CLI (Typer/Rich) | MCP Server | GraphQL/REST | Web Client
        |
Agent Runtime
  LangGraph Orchestration | Tool Registry | Guardrails
        |
Application Layer (Python)
  Command Handlers | Query Handlers | Event Processors
        |
Domain Layer
  BIM Elements | Parametric Engine | Constraint Solver | Views
        |
Kernel Layer (Rust)
  Geometry Engine | CRDT Merge | Event Store | IFC Parser
        |
Persistence Layer
  PostgreSQL + PostGIS | Redis Streams | Object Storage
```

### Key technology choices
- Kernel: Rust (memory safety, performance) with PyO3 bindings.
- Application: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0 async.
- Geometry: custom kernel with CGAL bindings, OpenVDB SDF ops, Manifold meshing.
- GPU: wgpu compute; optional OptiX path for clash detection.
- Data: PostgreSQL 16 + PostGIS, Redis 7.x streams, object storage.
- Collaboration: CRDT-based sync with WebSocket transport.
- Agent runtime: LangGraph + Claude API with MCP tool surface.
- Client: WebGL viewer baseline with WebGPU migration path; glTF export.
- IFC: IfcOpenShell for import/export in MVP; native parser deferred.

## 10) Data Model

### Core entities
- Project, Site, Building, Storey, Space
- Element: Wall, Floor, Door, Window, Column, Beam, Room
- Geometry: BRep, Mesh, Material
- Parameters: name, type, dimensions, constraints
- Branch, Snapshot, Transaction

### Event types (event sourcing)
- ModelCreated, ElementCreated, ElementModified, ElementDeleted
- ParameterUpdated, ConstraintApplied
- RegenPlanned, RegenApplied, GeometryRebuilt
- ValidationRun, ClashDetected
- SnapshotCreated, BranchCreated, BranchMerged
- SyncMerged, ConflictResolved

### CRDT structure
CRDT for hierarchy:
Project -> Building -> Storey -> Space -> Element

## 11) Interfaces

### CLI commands (draft)
- `pensaer init`
- `pensaer open <project>`
- `pensaer import --ifc <file>`
- `pensaer export --ifc <file>`
- `pensaer export --gltf <file>`
- `pensaer query "<nl>"`
- `pensaer select --category <name> --level <name>`
- `pensaer modify --ids <csv> --param <name> --value <value>`
- `pensaer clash --source <cat> --target <cat>`
- `pensaer create "<nl>"`
- `pensaer validate`
- `pensaer sync`
- `pensaer history --since "<time>"`
- `pensaer branch create "<name>"`
- `pensaer branch merge "<name>" --into <branch>`

### API surfaces (draft)
- External: REST and GraphQL for model access, queries, and exports.
- Internal: gRPC for kernel and regeneration services.

### MCP tools (draft)
Geometry server:
- create_wall(start, end, height, thickness, wallType, levelId)
- create_floor(boundary, thickness, levelId)
- create_opening(hostId, location, width, height, openingType)
- boolean_operation(a, b, operationType)

Spatial server:
- room_analysis(roomId)
- circulation_check(modelId)
- adjacency_matrix(levelId)

Validation server:
- run_clash_detection(sourceCategory, targetCategory, tolerance)
- code_compliance(modelId, standard, severityThreshold)
- accessibility_check(modelId, standard)

Documentation server:
- generate_schedule(category, parameters, filters)
- create_section(cutPlane, depth, scale)
- quantity_takeoff(categories, grouping)

## 12) Agentic Workflow

### Default task flow
1. User prompt -> context gathering
2. Planner agent decomposes tasks
3. Geometry agent executes create/modify
4. Validator agent checks constraints
5. Documentation agent generates outputs
6. User confirms and merges changes

### Safety
- Tool calls require schema validation.
- Destructive actions require explicit confirmation or approval gates.
- Dry-run mode produces a preview and diff before execution.
- Audit logs record tool inputs, outputs, and actor identity.

## 13) Metrics and Success Criteria (Part II)
- Regen under 100 ms for a 1000-element change in benchmark suite.
- Collaboration latency under 100 ms for event propagation.
- Agent task completion rate above 90 percent in evaluation harness.
- IFC round-trip with zero semantic loss for supported entities.
- CLI query response under 50 ms for common filters.
- Test coverage above 80 percent for kernel, above 60 percent for application.

## 14) Decision Log
- 2026-01-15: IFC import/export via IfcOpenShell for MVP; native parser deferred for stability and speed. See `docs/adr/ADR-20260115-ifc-import-export.md`.
- 2026-01-15: Geometry starts with analytic primitives + meshing; full B-rep deferred until workflows demand it. See `docs/adr/ADR-20260115-geometry-primitives-first.md`.
- 2026-01-15: Viewer baseline is WebGL; WebGPU is a planned migration path. See `docs/adr/ADR-20260115-viewer-webgl-first.md`.
- 2026-01-15: Event sourcing with append-only logs and snapshots for model state. See `docs/adr/ADR-20260115-event-sourcing-snapshots.md`.
- 2026-01-15: CRDT-based sync with defined conflict policy. See `docs/adr/ADR-20260115-crdt-sync-conflicts.md`.
- 2026-01-15: Agent governance via permissions, approval gates, and audit logs. See `docs/adr/ADR-20260115-governance-audit-gates.md`.

## 15) Milestones (48-Week Extended Timeline)

### Phase 1: Foundation (Weeks 1-12)
- Kernel MVP: create wall, compute geometry, store event.
- Regeneration loop: move wall updates joins, room areas, and schedules.
- Minimal MCP tools: create_wall, create_opening, create_room.
- IFC import/export via IfcOpenShell for core elements.

### Phase 2: Collaboration (Weeks 13-24)
- Model server spine: event log, snapshots, basic branching.
- Two clients edit simultaneously with CRDT merge.
- Thin client viewer for mesh and plan view.
- WebGL viewer baseline with WebGPU migration plan.

### Phase 3: Agentic AI (Weeks 25-36)
- MCP tool surface expanded across geometry, spatial, validation, docs.
- Governance layer with approval gates and audit logs.
- Evaluation harness with deterministic replay and golden paths.

### Phase 4: Production Hardening (Weeks 37-48)
- Performance: 1M element models, <1s regen for typical changes.
- Security: OAuth2, encryption at rest and transit, audit compliance.
- Scalability: horizontal scaling with K8s and GitOps.
- Interoperability: IFC 4.3 import/export and BCF 3.0 support.

## 16) Risks and Mitigations
- Geometry kernel complexity: phased approach, CGAL for robust ops, regression tests.
- IFC round-trip data loss: explicit mapping tests and validation harness.
- CRDT merge conflicts: property testing and conflict visualization.
- GPU portability: wgpu abstraction with CPU fallback.
- LLM latency: streaming responses and caching for CLI workflows.

## 17) Open Questions
- Orchestration choice beyond LangGraph (if needed).
- Branch merge conflict policy for same-element edits.

## 18) Appendix

Primary references:
- IFC 4.3 (ISO 16739-1:2024), BCF 3.0, IDS 1.0
- CGAL, OpenVDB, Manifold meshing, wgpu compute
- PostgreSQL event sourcing patterns and Redis streams
- LangGraph, MCP tooling patterns, audit and evaluation harnesses

---

*Document consolidated: January 15, 2026*
*Pensaer PRD: v2.0 (Consolidated)*
