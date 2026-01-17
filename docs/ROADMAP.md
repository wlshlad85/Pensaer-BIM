# Pensaer Development Roadmap

**Document Version:** 3.0 (Complete Rewrite)
**Initiated:** January 13, 2026
**Updated:** January 16, 2026
**Status:** Phase 1 Foundation 95% ✅ | Phase 2 Imminent

---

## Executive Summary

Pensaer is a **developer-first BIM platform** targeting computational designers frustrated with Revit's click-heavy workflows. We're building a keyboard-driven, Git-native, AI-powered alternative with real-time collaboration.

**Current Position:** End of Phase 1 Foundation
- ✅ Rust geometry kernel operational (95%)
- ✅ React client feature-complete for Phase 1 (95%)
- ✅ MCP tool servers substantially complete (47 tools across 3 servers)
- ✅ Terminal functional with MCP integration (75%)
- ⏳ DSL parser basic (30%)
- ✅ IFC pipeline complete (web-ifc)

**Velocity:** AI-first development with Claude Opus 4.5 + parallel sessions
**Team Size:** 1 developer + AI assistance

---

## Strategic Timeline

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                           PENSAER 48-WEEK MASTER TIMELINE                                 ║
╠══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                            ║
║   2026    Jan    Feb    Mar    Apr    May    Jun    Jul    Aug    Sep    Oct    Nov  Dec  ║
║           ├──────┴──────┼──────┴──────┼──────┴──────┼──────┴──────┼──────┴──────┴─────┤  ║
║   Week    1─────────12  13────────24  25────────36  37────────48  49────────52           ║
║           │             │             │             │             │                       ║
║           │  PHASE 1    │  PHASE 2    │  PHASE 3    │  PHASE 4    │  GTM                 ║
║           │  Foundation │  Collab     │  Agentic    │  Production │  Launch              ║
║           │             │             │  AI         │  Hardening  │                       ║
║           │    ███████░ │             │             │             │                       ║
║           │     90%     │     0%      │     0%      │     0%      │    0%                ║
║           └─────────────┴─────────────┴─────────────┴─────────────┴─────────────         ║
║                                                                                            ║
║   Legend: ███ Complete  ░░░ In Progress  ─── Planned                                      ║
║                                                                                            ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Phase 1: Foundation (Weeks 1-12) — 90% Complete

**Goal:** Establish model kernel, regeneration loop, and baseline MCP tools.

### Current Status Summary

| Component | Status | Completion |
|-----------|--------|------------|
| Rust Geometry Kernel | ✅ Operational | 95% |
| Topology Module | ✅ Complete with tests | 100% |
| React Client (2D) | ✅ Feature Complete | 95% |
| React Client (3D) | ⏳ Basic Only | 60% |
| Command Palette | ✅ Complete | 100% |
| MCP Geometry Server | ✅ 35 tools | 90% |
| MCP Spatial Server | ✅ 6 tools (Jan 16) | 100% |
| MCP Validation Server | ✅ 6 tools (Jan 16) | 100% |
| MCP Documentation Server | ⏹️ Skeleton | 10% |
| Terminal (xterm.js) | ✅ Functional | 75% |
| Clash Detection | ✅ Complete pipeline | 100% |
| DSL Parser | ⏳ Basic parsing | 30% |
| IFC Pipeline | ✅ Complete (web-ifc) | 100% |

---

### Week-by-Week Detail

#### Weeks 1-4: Core Engine ✅ COMPLETE

| Week | Deliverable | Status |
|------|-------------|--------|
| 1 | Project setup (Vite + React + TypeScript + Tailwind) | ✅ |
| 1 | Component folder structure | ✅ |
| 2 | Element/Relationship TypeScript interfaces | ✅ |
| 2 | Zustand stores (model, selection, ui, history) | ✅ |
| 3 | 2D SVG canvas with element rendering | ✅ |
| 3 | Selection system (click, shift, box select) | ✅ |
| 3 | Snap system (grid, element, endpoint) | ✅ |
| 4 | Transaction manager with undo/redo | ✅ |
| 4 | IndexedDB persistence + auto-save | ✅ |

**Milestone:** v0.1.0-alpha ✅ Achieved

---

#### Weeks 5-8: Developer Experience — 60% Complete

| Week | Deliverable | Status |
|------|-------------|--------|
| 5 | Command palette component | ✅ |
| 5 | Fuzzy search algorithm | ✅ |
| 5 | Keyboard shortcut manager (⌘K trigger) | ✅ |
| 6 | xterm.js integration | ⏹️ TODO |
| 6 | Terminal UI panel (resizable) | ⏹️ TODO |
| 6 | Command history + autocomplete | ⏹️ TODO |
| 7 | DSL grammar specification (BNF) | ⏹️ TODO |
| 7 | Lexer + Parser implementation | ⏹️ TODO |
| 7 | Command executor | ⏹️ TODO |
| 8 | Natural language pattern matching | ⏹️ TODO |
| 8 | Macro recording/playback | ⏹️ TODO |

**Milestone:** v0.2.0-alpha ⏹️ Pending (Target: Week 8)

---

#### Weeks 9-12: BIM Compliance — 20% Complete

| Week | Deliverable | Status |
|------|-------------|--------|
| 9 | Three.js proper wall/door/window 3D | ⏳ Basic done |
| 9 | Floor + roof 3D rendering | ⏹️ TODO |
| 9 | Orbit controls + viewcube | ⏹️ TODO |
| 9 | Section cuts | ⏹️ TODO |
| 10 | IFC import pipeline (web-ifc) | ✅ |
| 10 | Element mapping (IFC → Pensaer) | ✅ |
| 10 | IFC export functionality | ✅ |
| 11 | Level entity type | ⏹️ TODO |
| 11 | Level switching + browser panel | ⏹️ TODO |
| 12 | Rule engine for compliance | ⏹️ TODO |
| 12 | Clash detection system | ⏹️ TODO |

**Milestone:** v0.3.0-alpha ⏹️ Pending (Target: Week 12)

---

### Phase 1 Remaining Work (Priority Order)

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1 COMPLETION PRIORITIES                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  CRITICAL PATH (Must complete before Phase 2)                        │
│  ═══════════════════════════════════════════                         │
│                                                                       │
│  1. [Kernel] Commit topology module         ██████████  ✅ COMPLETE  │
│     └─ graph.rs, node.rs, edge.rs, room.rs                           │
│     └─ Tests included, 42KB+ implementation                          │
│                                                                       │
│  2. [Server] Complete geometry-server       █████████░  ✅ 90%       │
│     └─ 35 tools implemented                                          │
│     └─ mesh generation, clash detection, room detection              │
│     └─ boolean operations working                                    │
│                                                                       │
│  3. [App] Terminal integration              ███████░░░  ✅ 75%       │
│     └─ xterm.js setup complete                                       │
│     └─ DSL parser (basic subset) ⏳                                  │
│     └─ Command execution working                                     │
│                                                                       │
│  IMPORTANT (Complete during Phase 2 overlap)                         │
│  ═══════════════════════════════════════════                         │
│                                                                       │
│  4. [App] 3D visualization improvements     ████░░░░░░  Est: 4 days  │
│     └─ Proper wall thickness                                         │
│     └─ Floor/roof geometry                                           │
│     └─ Section cuts                                                  │
│                                                                       │
│  5. [Server] Spatial + Validation servers   ██████████  ✅ COMPLETE  │
│     └─ Spatial: 6 tools (Jan 16)                                     │
│     └─ Validation: 6 tools (Jan 16)                                  │
│     └─ Clash detection complete                                      │
│                                                                       │
│  6. [App] IFC pipeline                      ██████████  ✅ COMPLETE  │
│     └─ web-ifc integration (Jan 17)                                  │
│     └─ Import + Export complete                                      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 2: Collaboration (Weeks 13-24) — Not Started

**Goal:** Enable real-time multi-user editing with CRDT synchronization.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COLLABORATION ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────┐     WebSocket      ┌──────────────┐                   │
│  │ Client A │ ◄───────────────► │              │                    │
│  └──────────┘                    │   Loro CRDT  │                    │
│                                  │    Server    │                    │
│  ┌──────────┐     WebSocket      │              │                    │
│  │ Client B │ ◄───────────────► │              │                    │
│  └──────────┘                    └──────┬───────┘                    │
│                                         │                            │
│                                         ▼                            │
│                              ┌──────────────────┐                    │
│                              │   PostgreSQL     │                    │
│                              │   Event Store    │                    │
│                              │   + Snapshots    │                    │
│                              └──────────────────┘                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Week-by-Week Plan

#### Weeks 13-14: Cloud Infrastructure

| Deliverable | Details |
|-------------|---------|
| Supabase project setup | Auth, database, storage |
| Authentication | Email + Google OAuth |
| Project/document storage | PostgreSQL schema |
| Sharing + permissions API | Role-based access |

#### Weeks 15-16: Event Store

| Deliverable | Details |
|-------------|---------|
| PostgreSQL event log | Append-only table |
| Snapshot materialization | Every 1000 events or 1hr |
| Event replay mechanism | For client sync |
| Versioning system | Branch/tag support |

#### Weeks 17-18: CRDT Integration

| Deliverable | Details |
|-------------|---------|
| Loro CRDT integration | Movable Tree CRDT |
| WebSocket provider | Real-time transport |
| Conflict resolution | Automatic merge |
| Offline support | Local-first sync |

#### Weeks 19-20: Real-time Features

| Deliverable | Details |
|-------------|---------|
| Presence indicators | Who's editing what |
| Cursor sharing | See collaborator cursors |
| Selection broadcasting | Shared selection state |
| Change attribution | Who made what change |

#### Weeks 21-22: Collaboration UX

| Deliverable | Details |
|-------------|---------|
| Comments/markup system | Threaded discussions |
| Design option branching | Create alternatives |
| Change tracking/history | Visual diff |
| Merge functionality | Combine branches |

#### Weeks 23-24: Thin Client Viewer

| Deliverable | Details |
|-------------|---------|
| Read-only viewer | Share with stakeholders |
| Mobile-responsive | Works on tablets |
| Embed support | Iframe embedding |
| Link sharing | Public/private links |

### Phase 2 Success Criteria

| Metric | Target |
|--------|--------|
| CRDT sync latency | <100ms |
| Concurrent users | 10+ |
| Offline tolerance | 24+ hours |
| Conflict resolution | Automatic |

---

## Phase 3: Agentic AI (Weeks 25-36) — Planned

**Goal:** Expand MCP tool surface and enable autonomous AI workflows.

### MCP Tool Surface (33+ Tools)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MCP TOOL MATRIX                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  GEOMETRY SERVER (12 tools)                                          │
│  ┌────────────────┬────────────────┬────────────────┐               │
│  │ create_wall    │ create_floor   │ create_roof    │               │
│  │ create_door    │ create_window  │ create_column  │               │
│  │ create_beam    │ create_stair   │ create_opening │               │
│  │ boolean_op     │ join_elements  │ modify_param   │               │
│  └────────────────┴────────────────┴────────────────┘               │
│                                                                       │
│  SPATIAL SERVER (8 tools)                                            │
│  ┌────────────────┬────────────────┬────────────────┐               │
│  │ create_room    │ room_analysis  │ adjacency      │               │
│  │ circulation    │ path_finding   │ space_program  │               │
│  │ area_schedule  │ net_gross      │                │               │
│  └────────────────┴────────────────┴────────────────┘               │
│                                                                       │
│  VALIDATION SERVER (7 tools)                                         │
│  ┌────────────────┬────────────────┬────────────────┐               │
│  │ clash_detect   │ code_comply    │ accessibility  │               │
│  │ fire_rating    │ egress_check   │ clearance      │               │
│  │ structural     │                │                │               │
│  └────────────────┴────────────────┴────────────────┘               │
│                                                                       │
│  DOCUMENTATION SERVER (6 tools)                                      │
│  ┌────────────────┬────────────────┬────────────────┐               │
│  │ door_schedule  │ window_sched   │ room_schedule  │               │
│  │ export_ifc     │ export_bcf     │ export_report  │               │
│  └────────────────┴────────────────┴────────────────┘               │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Week-by-Week Plan

#### Weeks 25-28: Tool Surface Completion

| Week | Focus | Tools |
|------|-------|-------|
| 25 | Geometry tools | boolean_op, join_elements |
| 26 | Geometry tools | modify_param, compute_mesh |
| 27 | Spatial tools | room_analysis, adjacency |
| 28 | Spatial tools | circulation, path_finding |

#### Weeks 29-32: Validation & Docs

| Week | Focus | Tools |
|------|-------|-------|
| 29 | Validation | clash_detect, clearance |
| 30 | Validation | code_comply, accessibility |
| 31 | Documentation | schedules (door/window/room) |
| 32 | Documentation | export_ifc, export_bcf |

#### Weeks 33-36: Governance Layer

| Week | Focus | Deliverable |
|------|-------|-------------|
| 33 | Approval gates | Human-in-loop for destructive ops |
| 34 | Audit logging | Complete action history |
| 35 | Evaluation harness | Deterministic replay |
| 36 | LangGraph examples | Multi-step workflows |

### Phase 3 Success Criteria

| Metric | Target |
|--------|--------|
| Tool coverage | 33+ tools |
| Agent task completion | >90% |
| Audit trail completeness | 100% |
| Governance compliance | Zero bypass |

---

## Phase 4: Production Hardening (Weeks 37-48) — Planned

**Goal:** Scale, secure, and prepare for production deployment.

### Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Model capacity | ~10K elements | 1M elements |
| Regen time (typical) | ~50ms | <100ms |
| Regen time (worst) | N/A | <1s |
| 3D render FPS | 30 | 60 |
| Initial load | ~2s | <1s |

### Week-by-Week Plan

#### Weeks 37-40: Performance

| Week | Focus | Work |
|------|-------|------|
| 37 | Profiling | Identify bottlenecks |
| 38 | Kernel optimization | Parallel mesh gen |
| 39 | Client optimization | Virtualized rendering |
| 40 | Database optimization | Index tuning, query opt |

#### Weeks 41-44: Security & Compliance

| Week | Focus | Work |
|------|-------|------|
| 41 | OAuth2 implementation | Full provider support |
| 42 | Encryption | At rest + in transit |
| 43 | Audit compliance | SOC2 prep |
| 44 | Penetration testing | External audit |

#### Weeks 45-48: Scalability

| Week | Focus | Work |
|------|-------|------|
| 45 | Kubernetes setup | Helm charts |
| 46 | ArgoCD GitOps | Automated deployments |
| 47 | Observability | OpenTelemetry + Grafana |
| 48 | Load testing | Validate 1M elements |

### Phase 4 Success Criteria

| Metric | Target |
|--------|--------|
| Uptime SLA | 99.9% |
| Security audit | Pass |
| Load test | 1M elements, 100 users |
| Recovery time | <15 min |

---

## Go-To-Market (Weeks 49-52)

### Week 49-50: Documentation

- [ ] Complete API reference
- [ ] Tutorial series (video + text)
- [ ] Architecture deep-dives
- [ ] Migration guides (from Revit)

### Week 51: Community

- [ ] Discord server launch
- [ ] GitHub Discussions enable
- [ ] Early adopter program (50 users)
- [ ] Feedback collection system

### Week 52: Launch

- [ ] Public announcement
- [ ] Product Hunt launch
- [ ] Hacker News post
- [ ] Architecture firm outreach

---

## Technology Stack (Canonical)

### Layer A: Kernel (Rust)

| Component | Technology | Status |
|-----------|------------|--------|
| Math primitives | Custom (Point3, Vector3) | ✅ |
| Boolean operations | Clipper2 | ✅ |
| Triangulation | earcutr | ✅ |
| Spatial indexing | rstar (R*-tree) | ✅ |
| Topology | Custom (halfedge) | ⏳ |
| CRDT | Loro | ⏹️ |
| Python FFI | PyO3 | ✅ |
| IFC | IfcOpenShell | ⏹️ |

### Layer B: Server (Python)

| Component | Technology | Status |
|-----------|------------|--------|
| Framework | FastAPI 0.109+ | ✅ |
| MCP | Official Python SDK | ✅ |
| Validation | Pydantic v2 | ✅ |
| Database | PostgreSQL 16 | ⏹️ |
| Cache | Redis 7 | ⏹️ |
| LLM | Claude API | ⏹️ |
| Orchestration | LangGraph | ⏹️ |

### Layer C: Client (TypeScript)

| Component | Technology | Status |
|-----------|------------|--------|
| Framework | React 19.2 | ✅ |
| State | Zustand 5 + Immer | ✅ |
| Build | Vite 7.2 | ✅ |
| Styling | Tailwind CSS 4.1 | ✅ |
| 3D | Three.js r182 | ✅ |
| Terminal | xterm.js | ⏹️ |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| IFC complexity exceeds estimates | Medium | High | Start Week 10; have fallback (basic subset) |
| Loro CRDT learning curve | Low | Medium | Dedicated spike week; use examples |
| Performance at 1M elements | Low | High | Profile early; lazy loading; WebGPU |
| Topology edge cases | Medium | Medium | Comprehensive test suite; self-healing |
| Scope creep | Medium | High | Strict phase gates; feature freeze |
| Team burnout | Medium | High | Sustainable pace; parallel AI sessions |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Jan 13, 2026 | Rust kernel over pure TS | Performance + safety for geometry |
| Jan 14, 2026 | Loro over Yjs | Better tree CRDT; Rust bindings |
| Jan 14, 2026 | 4 MCP servers | Separation of concerns |
| Jan 15, 2026 | PostgreSQL over SQLite | Collaboration requires server DB |
| Jan 16, 2026 | Topology module priority | Enables wall joins, room detection |

---

## Appendix: Detailed Task Breakdown

### Immediate Next Actions (This Week)

1. **PR: Topology Module** (2 days)
   - Write unit tests for graph.rs, node.rs, edge.rs
   - Add integration tests
   - CI approval
   - Merge to main

2. **Geometry Server Tools** (5 days)
   - Implement `create_wall` with full parameters
   - Implement `create_opening` (door/window cut)
   - Add `compute_mesh` endpoint
   - Unit tests + integration tests

3. **Terminal Integration** (5 days)
   - npm install xterm + xterm-addon-fit
   - Create TerminalPanel component
   - Basic DSL parser (wall, door, window commands)
   - Wire to model store

### Uncommitted Work Tracking

```
Location: kernel/pensaer-geometry/src/topology/
Files:
  - mod.rs      (module exports)
  - graph.rs    (topology graph data structure) - 42KB
  - node.rs     (vertex/node abstractions)
  - edge.rs     (edge/halfedge connectivity)
  - room.rs     (room detection from topology)
Status: ✅ COMPLETE with comprehensive tests

Location: server/mcp-servers/spatial-server/
Files:
  - server.py   (6 tools: adjacency, find_nearest, area, clearance, circulation, point_in_polygon)
Status: ✅ COMPLETE (Jan 16, 2026)

Location: server/mcp-servers/validation-server/
Files:
  - server.py   (6 tools: validate_model, fire, accessibility, egress, door_clearances, stairs)
Status: ✅ COMPLETE (Jan 16, 2026)
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 13, 2026 | AI | Initial 16-week plan |
| 2.0 | Jan 15, 2026 | AI | Extended 48-week plan |
| 3.0 | Jan 16, 2026 | AI | Complete rewrite with accurate status |
| 3.1 | Jan 16, 2026 | AI | Updated: Spatial Server ✅, Validation Server ✅, corrected topology status |
| 3.2 | Jan 17, 2026 | AI | IFC import pipeline ✅ complete with web-ifc |
| 3.3 | Jan 17, 2026 | AI | IFC export ✅ complete with web-ifc |

---

*Last updated: January 17, 2026*
*Pensaer Roadmap v3.0*
