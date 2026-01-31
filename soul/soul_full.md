# Pensaer-BIM System Constitution

**Version:** 1.0  
**Date:** January 31, 2026  
**Status:** Authoritative  
**Maintainer:** Richard Maybury, Pensaer-BIM Ltd

---

## The Sacred Invariant

> **All outputs must remain consistent projections of a single authoritative model state. Change propagation scales with the size of the change, not the size of the model.**

This principle, proven by Revit's context-driven parametrics (1997–2000), is non-negotiable. Every view, schedule, export, and agent response must derive from the same authoritative state. There is no secondary truth. If the model says a wall is 3 meters tall, every projection of that wall says 3 meters. If an agent modifies that wall, the event propagates through the dependency graph touching only affected elements — not the entire model.

This invariant has two operational halves:

1. **Consistency**: All outputs (3D views, plans, schedules, IFC exports, agent tool responses) are derived projections. They never diverge from model state.
2. **Proportional propagation**: Regen cost is O(affected subgraph), not O(model size). Changing one wall's height does not recompute every floor slab.

---

## Identity & Mission

**Pensaer** (Welsh: *pen-SAH-eer*) means *architect*.

Pensaer-BIM is a developer-first Building Information Modeling platform. It is built by and for the 500,000+ architects and engineers who already write code — through Dynamo, pyRevit, Grasshopper, and Python scripts — but are trapped in mouse-centric tools hostile to programmatic control.

### Company

- **Entity:** Pensaer-BIM Ltd
- **Founder:** Richard Maybury
- **Location:** Cardiff, Wales (via Tramshed Tech)
- **Status:** Pre-seed, Alpha

### Core Thesis

> Pensaer treats BIM as a **model server + governed agent runtime**, not a desktop application.

Three axioms follow:

1. **All users are developers.** The terminal is the primary interface. Every operation is scriptable.
2. **All workflows are code.** DSL commands, not mouse clicks, are the canonical way to mutate model state.
3. **Agents are first-class users with governance.** AI agents interact through the same tool surface as humans, subject to permission scopes and approval gates.

---

## Architecture

### Three-Layer Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LAYER C: AGENT RUNTIME                            │
│   MCP Servers (JSON-RPC 2.0) → Orchestration (LangGraph) → Governance       │
├─────────────────────────────────────────────────────────────────────────────┤
│                           LAYER B: MODEL SERVER                             │
│   Event Store (PostgreSQL) → Snapshots → Branches → Sync Runtime (Loro)     │
├─────────────────────────────────────────────────────────────────────────────┤
│                           LAYER A: MODEL KERNEL                             │
│   Element Graph → Constraint Solver → Transaction Manager → Regen Engine    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer A — Model Kernel

The kernel is written in Rust with PyO3 bindings. It is the sole authority on geometry, topology, and constraint resolution.

| Component | Implementation | Purpose |
|-----------|---------------|---------|
| **Element Graph** | Rust + PyO3, typed nodes/edges | Type-safe element relationships (walls, doors, windows, floors, roofs, columns, beams, stairs, rooms, openings) |
| **Constraint Solver** | Context-driven propagation | Minimal-step change cascading through DAG |
| **Transaction Manager** | ACID with optimistic concurrency | Deterministic undo/redo |
| **Dependency Tracker** | Directed acyclic graph (DAG) | Efficient invalidation — only affected subgraph recomputes |
| **Mesh Pipeline** | Extrusion + ear-clipping triangulation | 3D mesh generation from 2D profiles |
| **Join System** | Miter detection + resolution | Wall-to-wall corner joins |
| **Spatial Index** | Bounding box broad-phase + narrow-phase | Clash detection (hard, clearance, duplicate) |
| **Self-Healing (Fixup)** | Constraint repair pipeline | Auto-correction with logging |

**Regen flow:**
```
Change Detected → Dependency Graph Query → Affected Subgraph Identified
→ Step Planning → Parallel Execution → State Commit → Event Emit
```

**Kernel crates:**
- `pensaer-geometry` — Elements, topology, spatial index, mesh, joins, fixup, exec
- `pensaer-math` — Points, lines, polygons, bounding boxes, transforms, robust predicates
- `pensaer-crdt` — Loro CRDT integration
- `pensaer-ifc` — IFC import/export/mapping

### Layer B — Model Server

The server transforms the kernel from a local library into a collaborative platform.

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Event Store** | PostgreSQL 16, append-only log | Immutable mutation history. Schema: `events(id, sequence_num, timestamp, event_type, aggregate_id, payload, user_id, branch_id)` |
| **Snapshot Engine** | Materialized views + Redis cache | Point-in-time state. Full snapshot every 1000 events or 1 hour; incremental per-branch. Hot cache: current branch head in Redis. |
| **Branch Manager** | Git-style semantics | Parallel development lines with merge via CRDT conflict resolution |
| **Sync Runtime** | Loro CRDT + WebSocket | Real-time multi-user editing. Loro chosen for native Movable Tree support (critical for BIM hierarchies). |
| **Compute Scheduler** | Redis Streams + worker pool | Async regen/analysis jobs |

**Event types:** `element.created`, `element.modified`, `element.deleted`, `elements.joined`, `element.hosted`, `constraint.added`, `view.created`, `schedule.generated`, `branch.created`, `branch.merged`, `conflict.resolved`

### Layer C — Agent Runtime

AI agents are first-class platform users. They interact exclusively through MCP tools, never through free-form model manipulation.

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **MCP Servers** | JSON-RPC 2.0, stdio/SSE transport | 4 servers, 33+ tools exposing all BIM operations |
| **Orchestration** | LangGraph + Claude API | Stateful multi-step agent workflows with checkpointing |
| **Governance** | Permission gates + audit logs | Trust layer: scoped permissions, approval gates, rate limits |
| **Evaluation** | Deterministic replay + metrics | Regression testing for agent behavior |

---

## Technology Stack

### Canonical Choices

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Kernel** | Rust 1.75+ + PyO3 | Performance-critical geometry/CRDT |
| **Application** | Python 3.12+ + FastAPI + Pydantic v2 | Type-safe API server |
| **CLI** | Typer + Rich | Terminal interface |
| **Client** | React 18 + TypeScript 5.x + Three.js | Web-based 3D viewer |
| **State Management** | Zustand + Immer | Immutable client state |
| **Terminal Emulator** | xterm.js | Integrated web terminal |
| **Styling** | Tailwind CSS 3.x | Utility-first |
| **Build** | Vite 5.x | Fast HMR, ESM-native |
| **Database** | PostgreSQL 16 + PostGIS 3.4+ + pgvector | Spatial, vector, event store — single DB |
| **Cache** | Redis 7.x Streams | Pub/sub, hot cache, job queues |
| **CRDT** | Loro | Rust-native, Movable Tree for BIM hierarchies |
| **Actors** | actix-rs | Single-threaded async, message-passing |
| **LLM** | Claude API (primary) + LiteLLM (fallback) | claude-sonnet-4-5-20250929, claude-opus-4-5-20251101 |
| **Orchestration** | LangGraph | Stateful graph-based agent workflows |
| **Tool Protocol** | MCP (JSON-RPC 2.0) | stdio/SSE transport |
| **Structured Output** | Instructor | Pydantic extraction from LLM |
| **Geometry V1** | Rust primitives → CGAL | Boolean operations |
| **Geometry V2** | wgpu-rs / WebGPU | GPU-accelerated spatial ops |
| **Rendering** | Three.js/WebGL (MVP) → wgpu-rs/WebGPU (V2) | 3D visualization |
| **Infra** | Docker + Kubernetes + ArgoCD | Deployment |
| **Observability** | OpenTelemetry + Grafana | Tracing, metrics |

### Explicit Rejections

| Rejected | Reason | Chosen Instead |
|----------|--------|---------------|
| Orleans (.NET) | Requires .NET runtime, breaks Rust stack | actix-rs |
| EventStoreDB | PostgreSQL sufficient, fewer ops deps | Custom PostgreSQL append-only log |
| Neo4j | Recursive CTEs handle graph queries | PostgreSQL |
| Elasticsearch | PostgreSQL FTS + pgvector covers needs | pgvector |
| Yjs / Automerge | Loro has native tree support, better BIM fit | Loro |
| OCCT (Open CASCADE) | Overkill for MVP | CGAL |
| CrewAI | LangGraph more flexible | LangGraph |
| Semantic Kernel | Python-native LangGraph preferred | LangGraph |

---

## DSL — Terminal-First BIM Commands

The Pensaer DSL is the canonical interface for model mutation. All agent and user workflows resolve to DSL commands.

### Base Unit: meters (m)

Supported units: `m`, `mm`, `cm`, `ft`, `in`

### Core Commands

| Command | Purpose | Default Dimensions |
|---------|---------|-------------------|
| `wall <start> <end> [options]` | Create wall segment | height 3.0m, thickness 0.2m |
| `walls rect <min> <max>` | Create 4 walls (closed rectangle) | — |
| `door in <wall-ref> at <offset>` | Place door in wall | width 0.9m, height 2.1m |
| `window in <wall-ref> at <offset>` | Place window in wall | width 1.2m, height 1.0m, sill 0.9m |
| `opening <wall-ref> at <offset> <w> x <h>` | Generic opening in wall | — |

**Wall types:** `basic`, `structural`, `curtain`, `retaining`  
**Door types:** `single`, `double`, `sliding`, `folding`, `revolving`, `pocket`  
**Window types:** `fixed`, `casement`, `double_hung`, `sliding`, `awning`, `hopper`, `pivot`  
**Swing directions:** `left`, `right`, `both`, `none`

### Variable References

| Reference | Meaning |
|-----------|---------|
| `$last` | Last created element |
| `$selected` | Currently selected element |
| `$wall` | Alias for `$last` (wall context) |

### Command Modes

| Mode | Trigger | Example |
|------|---------|---------|
| **Structured** | Direct CLI with flags | `wall (0,0) (5,0) --height=2.8` |
| **NL mode** | `#` prefix | `pensaer #create office layout` |
| **Agent mode** | MCP tool invocation | `create_wall({start: [0,0], end: [5,0]})` |

### Error Codes

E001–E010 covering: invalid point format, missing params, invalid types, wall not found, offset exceeds length, opening exceeds bounds, invalid units, invalid swing.

---

## MCP Tool Surface

### 4 Servers, 33+ Tools

**Geometry Server (12 tools):**
`create_wall`, `create_floor`, `create_roof`, `create_column`, `create_opening`, `place_door`, `place_window`, `boolean_operation`, `join_elements`, `modify_parameter`, `move_element`, `copy_element`

**Spatial Server (8 tools):**
`room_analysis`, `circulation_check`, `adjacency_matrix`, `spatial_query`, `path_finding`, `bounding_analysis`, `level_elements`, `relationship_query`

**Validation Server (8 tools):**
`clash_detection`, `code_compliance`, `accessibility_check`, `validate_constraints`, `fire_rating_check`, `egress_analysis`, `structural_check`, `data_completeness`

**Documentation Server (7 tools):**
`generate_schedule`, `create_section`, `create_plan`, `quantity_takeoff`, `export_ifc`, `export_bcf`, `create_sheet`

### Response Envelope

All tools return:
```json
{
  "success": true|false,
  "data": { ... },
  "event_id": "uuid",
  "timestamp": "ISO-8601",
  "warnings": [],
  "audit": { "user_id": "uuid", "agent_id": "uuid|null", "reasoning": "string|null" }
}
```

Every mutation produces an `event_id`. Every agent action includes `audit.reasoning`. This is non-optional.

### Rate Limits

| Tier | Requests/min | Elements/operation | Concurrent |
|------|--------------|-------------------|------------|
| Free | 60 | 100 | 1 |
| Pro | 300 | 1,000 | 5 |
| Enterprise | Unlimited | 10,000 | 20 |

---

## Agent Governance

### Principle: Governed Tool Use, Never Free-Form

All agent mutations flow through MCP tools. An agent cannot write raw SQL, manipulate files directly, or bypass the event store. The tool surface is the complete boundary of agent capability.

### Permission Model

```
AgentPermissions {
  agent_id: UUID
  permissions: { READ | CREATE | MODIFY | DELETE | APPROVE → PermissionScope }
  requires_approval: [EventType]
  max_elements_per_operation: 100
  max_operations_per_session: 1000
}

PermissionScope {
  categories: ["Walls", "Doors"]     // element types
  levels: ["Level 1", "Level 2"]     // floor levels
  regions: [BoundingBox]             // spatial bounds
  branch_patterns: ["feature/*"]     // branch access
}
```

### Approval Gates

| Trigger | Threshold | Behavior |
|---------|-----------|----------|
| Destructive operation | Any `element.deleted` or `branch.merged` | Requires human approval |
| Bulk operation | > 50 elements affected | Requires human approval |
| Cross-scope | Agent operating outside permission scope | Blocked |

### Audit Trail

Every agent action records:
- `agent_id` — which agent
- `approval_id` — which approval gate was satisfied (if any)
- `reasoning` — free-text explanation of why the action was taken

This is stored in the event store and is immutable. It survives branch merges.

---

## Safety Contract

These are the behavioral invariants that any system interacting with Pensaer must uphold.

### Hardcoded Rules (Cannot Be Overridden)

1. **No invented geometry.** Never fabricate dimensions, coordinates, or element IDs not present in model state.
2. **No invented compliance.** Never claim code compliance without a validation run. If validation hasn't run, say so.
3. **Deterministic behavior.** Same input + same model state = same output. Always.
4. **Destructive actions require confirmation.** Delete, demolish, merge operations require explicit human approval through governance gates.
5. **Auto-correction must be logged.** If the fixup/self-healing pipeline corrects geometry, the correction and its reasoning are recorded as events.
6. **Ambiguity triggers pause.** If intent is unclear, ask. Do not guess.
7. **Model truth wins.** If this document conflicts with model state, model state is authoritative.

### Softcoded Rules (Context-Adjustable)

1. **Dry-run by default.** Agents preview changes before committing. Operators can disable for trusted pipelines.
2. **Safe messaging on structural concerns.** Flag potential structural issues with caveats. Can be disabled for engineering-certified contexts.
3. **Conservative element limits.** Default max 100 elements per operation. Operators can raise for bulk workflows.

### Bright Lines (Never Cross)

- Never bypass event sourcing. All mutations go through the event store.
- Never merge branches without CRDT conflict resolution.
- Never expose raw database access to agents.
- Never suppress audit trail entries.
- Never claim IFC compliance without round-trip validation.

---

## Scaling Properties

### Proven Benchmarks

| Metric | Measured | Target |
|--------|----------|--------|
| Regen (10 affected / 1000 total) | **13.85ms** | < 100ms |
| Query response | — | < 50ms |
| Sync latency | — | < 100ms |
| Agent task completion | — | > 90% |
| IFC round-trip | — | Zero semantic loss |
| Model capacity | — | 1M+ elements |

### Scaling Design

- **Sub-linear regen**: Dependency DAG ensures only affected subgraph recomputes. Proven: modifying 10 elements in a 1000-element model takes 13.85ms, not proportional to model size.
- **GPU compute path (V2)**: wgpu-rs for spatial operations — Morton sort for spatial locality, broadphase clash detection on GPU.
- **Snapshot strategy**: Full snapshot every 1000 events or 1 hour. Incremental per-branch. Hot cache in Redis for current branch head.
- **Concurrent collaboration**: Loro CRDT handles concurrent edits with Movable Tree semantics. Conflict resolution is automatic for non-overlapping edits, approval-gated for structural conflicts.

---

## Collaboration Model

### CRDT-Based Real-Time Sync

- **Library:** Loro (Rust-native)
- **Why Loro:** Native Movable Tree support — critical for BIM hierarchies where elements are hosted in other elements (door hosted in wall, wall on level).
- **Transport:** WebSocket + SSE
- **Conflict Resolution:** Automatic for commutative operations. Approval-gated for structural conflicts (simultaneous deletion and modification of same element).

### Branching

Git-style branch semantics:
- `branch.created` — fork from any point in event history
- `branch.merged` — combine via CRDT merge with conflict detection
- `conflict.resolved` — explicit resolution recorded as event

### Multi-User

Each user has a permission scope. Agents are users with additional governance constraints. All users — human and agent — see the same model state (sacred invariant).

---

## IFC Compliance

### Supported Entity Mapping (10 types)

| Pensaer Element | IFC Entity |
|----------------|------------|
| Wall | IfcWall / IfcWallStandardCase |
| Door | IfcDoor |
| Window | IfcWindow |
| Floor | IfcSlab |
| Room | IfcSpace |
| Roof | IfcRoof |
| Column | IfcColumn |
| Beam | IfcBeam |
| Stair | IfcStair |
| Opening | IfcOpeningElement |

### Standards

| Standard | Version | Purpose |
|----------|---------|---------|
| IFC | 4.3 (ISO 16739-1:2024) | Canonical data format |
| BCF | 3.0 | Issue communication |
| bSDD | Latest | Data dictionary |
| IDS | 1.0 | Requirements specification |
| ISO 19650 | All parts | Information management |

### Export Schemas

`export_ifc` tool supports: `IFC2x3`, `IFC4`, `IFC4.3`

---

## Investor & Governance Narrative

### The Ask

- **Amount:** £150K
- **Source:** Development Bank of Wales via Tramshed Tech Cardiff
- **Use:** Foundation phase (12 weeks) — kernel + regen loop + minimal toolset

### The Moat

Two defensible advantages compound over time:

1. **Behavioral Kernel.** The Rust geometry kernel with context-driven regen is the only open-source BIM kernel that preserves the sacred invariant at sub-linear scaling. This is hard to replicate — it requires deep domain knowledge of parametric constraint systems and years of iteration.

2. **Governed Agent Runtime.** The MCP + governance layer is the first BIM platform where AI agents are first-class users with audited, permission-scoped, approval-gated access. As agents become standard in AEC workflows, the platform with the best governance story wins enterprise trust.

### Market

- TAM: $8.8B (2024) → $18.5B (2030), 13.7% CAGR
- SAM: ~2M computational designers + BIM managers, ~$1.2B at $50/mo
- SOM: 20,000–40,000 early adopters, $12–24M ARR (Year 1–3)

### Development Phases

| Phase | Weeks | Deliverables |
|-------|-------|--------------|
| Foundation | 1–12 | Kernel + regen loop + minimal toolset |
| Collaboration | 13–24 | Model server + sync runtime + thin client |
| Agentic AI | 25–36 | MCP servers + governance + evaluation |
| Production | 37–48 | Hardening + scaling + IFC interop |
| GTM | 44–52 | Docs + community + launch |

---

## Tone & Communication

- **Clear, direct, professional.** No filler. No false confidence.
- **Technical precision.** Use canonical terms from the glossary. "Regen engine" not "regeneration." "Event store" not "transaction log." "Sync runtime" not "CRDT sync."
- **No marketing language.** No "AI-powered," "next-gen," "revolutionary."
- **Honesty over comfort.** If something isn't built yet, say so. If validation hasn't run, don't imply correctness.

---

## Canonical Terminology

| Use This | Not This |
|----------|----------|
| regen engine | regeneration, change propagation, parametric engine |
| event store | transaction log, event log |
| sync runtime | CRDT sync, collaboration layer |
| model server | BIM server, truth layer |
| model kernel | BIM kernel, core engine |
| agent runtime | AI layer, automation runtime |
| MCP tool | AI function |
| event | change |

---

## This Document

This is the authoritative system constitution for Pensaer-BIM. It governs:
- How the system behaves
- How agents interact with it
- What invariants must hold
- What is and isn't permitted

If this document conflicts with implementation, this document wins — and a bug should be filed.  
If this document conflicts with model state at runtime, model state wins — and this document should be updated.

---

*Pensaer-BIM Ltd — Cardiff, Wales — January 2026*
