# Pensaer Engineering Encyclopedia

## Part 1 — Platform Overview & Architecture

> **Edition:** 1.0 · **Author:** Max, CTO · **Last updated:** 2025-07-14
> **Classification:** Internal Engineering Reference · **Status:** Living Document

---

## Table of Contents

1. [What Pensaer-BIM Is](#1-what-pensaer-bim-is)
2. [Three-Layer Architecture](#2-three-layer-architecture)
3. [Data Flow](#3-data-flow)
4. [State Management](#4-state-management)
5. [Docker Stack](#5-docker-stack)
6. [Key Design Decisions (ADRs)](#6-key-design-decisions-adrs)
7. [Directory Map](#7-directory-map)
8. [Quality Gates & Testing](#8-quality-gates--testing)

---

## 1. What Pensaer-BIM Is

**Pensaer-BIM** is a developer-first Building Information Modelling platform built to replace Autodesk Revit. The name comes from Welsh: *pensaer* (pronounced **pen-SAH-eer**) means "architect."

We are a Welsh startup building the BIM tool that engineers actually want to use.

### Core Principles

| Principle | What It Means |
|---|---|
| **Command-line first** | Every operation is a typed command. The terminal is the primary interface, not a side panel. |
| **Keyboard-centric** | Mouse is optional. Every workflow has keyboard shortcuts. Power users never touch a menu. |
| **AI-native** | MCP (Model Context Protocol) tool architecture means AI agents can drive the entire platform programmatically — 58+ tools exposed. |
| **Multi-threaded** | Rust kernel handles geometry, boolean operations, and spatial indexing across threads. No single-threaded bottlenecks. |
| **Developer-first** | Version-controllable models, scriptable DSL, REST API, event sourcing. Treat buildings like code. |

### What We Replace

| Revit Pain | Pensaer Solution |
|---|---|
| Single-threaded geometry engine | Rust kernel with Rayon parallelism |
| Proprietary `.rvt` format | IFC 4.0 import/export, open event log |
| Click-heavy UI | Terminal + command palette + keyboard shortcuts |
| No real API | 58+ MCP tools + REST API + WebSocket |
| No real-time collaboration | CRDT-based sync (pensaer-crdt) |
| Expensive per-seat licensing | Open-core model |

---

## 2. Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  LAYER C: React Client                                  │
│  TypeScript · Three.js · xterm.js · Zustand             │
│  Port 5173 (Vite dev server)                            │
├─────────────────────────────────────────────────────────┤
│  LAYER B: Python Server                                 │
│  FastAPI · 4 MCP Servers · Event Sourcing               │
│  Port 8000                                              │
├─────────────────────────────────────────────────────────┤
│  LAYER A: Rust Kernel                                   │
│  pensaer-math · pensaer-geometry · pensaer-crdt         │
│  pensaer-ifc · PyO3 bindings                            │
│  Port 50051                                             │
└─────────────────────────────────────────────────────────┘
     ↕ PostgreSQL/PostGIS · Redis · MinIO
```

---

### 2A. Layer A — Rust Kernel

The kernel is a Cargo workspace containing four crates. It handles all computationally expensive work: geometry, spatial queries, CRDT synchronisation, and IFC serialisation.

#### Crate Overview

| Crate | Purpose | Key Types / Modules |
|---|---|---|
| `pensaer-math` | Geometry primitives, linear algebra | `Vec3`, `Mat4`, `Quat`, `BBox3`, transforms |
| `pensaer-geometry` | Elements, boolean ops, meshing, spatial indexing | `Element`, `Mesh`, `BooleanOp`, `SpatialIndex`, topology |
| `pensaer-crdt` | Conflict-free replicated data types for real-time sync | CRDT document, merge operations |
| `pensaer-ifc` | IFC 4.0 import/export | `import`, `export`, `mapping`, error types |

#### Directory Structure

```
kernel/
├── Cargo.toml                  # Workspace root
├── Cargo.lock
├── Dockerfile
├── CLAUDE.md                   # AI instructions for kernel work
├── pensaer-kernel-stub.rs
├── pensaer-math/
│   ├── Cargo.toml
│   ├── src/
│   │   └── lib.rs              # Vec3, Mat4, BBox3, transforms
│   └── proptest-regressions/   # Property test regression cases
├── pensaer-geometry/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs              # Crate root, re-exports
│       ├── element.rs          # Element trait and core types
│       ├── constants.rs        # Tolerances, epsilon values
│       ├── error.rs            # GeometryError enum
│       ├── exec.rs             # Command execution bridge
│       ├── io.rs               # Serialization/deserialization
│       ├── bindings/           # PyO3 Python bindings
│       ├── elements/           # Wall, Slab, Column, Beam, etc.
│       ├── joins/              # Element join/intersection logic
│       ├── mesh/               # Triangulation, mesh generation
│       ├── spatial/            # R-tree spatial index
│       ├── topology/           # Topological relationships
│       ├── fixup/              # Geometry repair/cleanup
│       └── util/               # Shared utilities
├── pensaer-crdt/
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs              # CRDT document, operations, merge
└── pensaer-ifc/
    ├── Cargo.toml
    └── src/
        ├── lib.rs              # Crate root
        ├── error.rs            # IFC-specific errors
        ├── export.rs           # Model → IFC 4.0 STEP serialization
        ├── import.rs           # IFC STEP → internal model
        └── mapping.rs          # IFC entity ↔ Pensaer element mapping
```

#### How It's Tested

| Method | Tool | Notes |
|---|---|---|
| Unit tests | `cargo test` | Every crate has `#[cfg(test)]` modules |
| Property tests | `proptest` | `pensaer-math` uses proptest for numeric invariants (regression files tracked) |
| CI | `kernel-ci.yml` | Runs on every push, `cargo test --workspace`, `cargo clippy`, `cargo fmt --check` |

#### Known Issues

- PyO3 bindings are in `pensaer-geometry/src/bindings/` — must be kept in sync with Python server expectations manually.
- Memory limit of 4GB in Docker (see `docker-compose.yml` deploy config). Large models may need tuning.
- `pensaer-crdt` is early-stage; merge conflict resolution is basic.

#### Quality Gates

- ✅ `cargo clippy -- -D warnings` (zero warnings)
- ✅ `cargo fmt --check` (enforced formatting)
- ✅ `cargo test --workspace` (all tests pass)
- ✅ No `unsafe` without `// SAFETY:` comment

---

### 2B. Layer B — Python Server

The server is a FastAPI application that acts as the brain of the platform: it parses DSL commands, runs event sourcing, manages persistence, and hosts four MCP servers that expose 58+ tools for AI agents.

#### Components

| Component | Purpose | Location |
|---|---|---|
| **FastAPI app** | REST API, WebSocket, health checks | `server/main.py`, `server/app/` |
| **DSL Parser** | Parses terminal commands into structured operations | `server/app/pensaer/dsl/` |
| **Command Handlers** | Execute parsed commands against the model | `server/app/pensaer/commands/` |
| **CLI** | Command-line interface module | `server/app/pensaer/cli/` |
| **MCP Tools** | Model Context Protocol tool definitions | `server/app/pensaer/mcp/` |
| **Projections** | Event sourcing read-model projections | `server/app/pensaer/projections/` |
| **Queries** | Read-side query handlers | `server/app/pensaer/queries/` |
| **MCP Bridge** | Node.js bridge for client ↔ MCP communication | `server/mcp-bridge/` |
| **Self-Healing** | Error recovery and auto-repair logic | `server/common/self_healing.py` |
| **Migrations** | SQL migrations (PostGIS init) | `server/migrations/` |

#### The Four MCP Servers

Each MCP server is a standalone Python package with its own tests:

```
server/mcp-servers/
├── README.md
├── geometry-server/         # Create/modify/query geometry elements
│   ├── documentation_server/  # (symlink or shared code)
│   └── tests/
├── spatial-server/          # Spatial queries, clash detection, proximity
│   └── tests/
├── validation-server/       # Model validation, code compliance checks
│   └── tests/
└── documentation-server/    # IFC property sets, documentation generation
    ├── documentation_server/
    └── tests/
```

| MCP Server | Tool Count | Example Tools |
|---|---|---|
| **Geometry** | ~20 | `create_wall`, `create_slab`, `create_column`, `boolean_union`, `extrude`, `move_element` |
| **Spatial** | ~15 | `find_nearby`, `clash_detect`, `spatial_query`, `bounding_box`, `ray_cast` |
| **Validation** | ~12 | `validate_model`, `check_clearances`, `fire_egress_check`, `structural_check` |
| **Documentation** | ~11 | `export_ifc`, `generate_schedule`, `add_property_set`, `create_drawing` |

#### Event Sourcing

All model mutations are captured as events. The event log is the source of truth:

```python
# Conceptual event structure
{
    "event_id": "uuid",
    "event_type": "ElementCreated",
    "timestamp": "2025-07-14T12:00:00Z",
    "payload": {
        "element_id": "wall-001",
        "element_type": "wall",
        "geometry": { ... },
        "properties": { ... }
    },
    "user_id": "max",
    "session_id": "abc-123"
}
```

Events are stored in PostgreSQL. Projections rebuild the current model state. Snapshots accelerate rebuilds for large models.

#### Directory Structure

```
server/
├── main.py                     # FastAPI entrypoint
├── Dockerfile
├── requirements.txt
├── pytest.ini
├── conftest.py
├── CLAUDE.md                   # AI instructions for server work
├── __init__.py
├── app/
│   ├── README.md
│   └── pensaer/
│       ├── __init__.py
│       ├── cli/                # CLI commands
│       ├── commands/           # Command handlers (write side)
│       ├── dsl/                # DSL parser
│       ├── mcp/                # MCP tool registrations
│       ├── projections/        # Event sourcing projections (read side)
│       └── queries/            # Query handlers
├── common/
│   ├── __init__.py
│   └── self_healing.py         # Error recovery module
├── mcp-bridge/
│   └── package.json            # Node.js MCP bridge
├── mcp-servers/
│   ├── README.md
│   ├── geometry-server/
│   ├── spatial-server/
│   ├── validation-server/
│   └── documentation-server/
├── migrations/
│   └── init.sql                # PostGIS schema init
└── tests/                      # Integration tests
```

#### How It's Tested

| Method | Tool | Notes |
|---|---|---|
| Unit tests | `pytest` | Per-module tests in `app/tests/` and `mcp-servers/*/tests/` |
| Integration tests | `pytest` | `server/tests/` — tests against real DB (Docker) |
| CI | `server-ci.yml` | Runs on every push |
| Root-level tests | `pytest` | `test_roof.py`, `test_selection.py`, `test_selection_mcp.py` at repo root |

#### Known Issues

- MCP bridge (`server/mcp-bridge/`) is a thin Node.js shim — needs `npm install` separately.
- `__pycache__` directories are tracked in some places (should be `.gitignore`d).
- Self-healing module is experimental.

#### Quality Gates

- ✅ `pytest` passes with zero failures
- ✅ All MCP tools have docstrings (used by AI agents to discover capabilities)
- ✅ Every command handler has a corresponding event type
- ✅ `ruff check` for linting (Python)

---

### 2C. Layer C — React Client

The client is a React 18 application built with TypeScript, bundled by Vite, and rendered with Three.js for 3D, Canvas2D for plans, and xterm.js for the integrated terminal.

#### Key UI Components

| Component | Technology | File |
|---|---|---|
| **3D Viewport** | Three.js + React Three Fiber | `app/src/components/canvas/Canvas3D.tsx` |
| **2D Plan View** | HTML5 Canvas | `app/src/components/canvas/Canvas2D.tsx` |
| **Terminal** | xterm.js | `app/src/components/Terminal/` |
| **Command Palette** | Custom React | `app/src/commands/` |
| **Selection Box** | Three.js overlay | `app/src/components/canvas/SelectionBox.tsx` |
| **Grid** | Three.js helper | `app/src/components/canvas/Grid.tsx` |
| **View Cube** | Three.js | `app/src/components/canvas/ViewCube.tsx` |
| **Snap Indicator** | Three.js overlay | `app/src/components/canvas/SnapIndicator.tsx` |
| **Guide Lines** | Three.js lines | `app/src/components/canvas/GuideLine.tsx` |
| **Drawing Preview** | Canvas overlay | `app/src/components/canvas/DrawingPreview.tsx` |
| **Geometry Loader** | Three.js loader | `app/src/components/canvas/GeometryLoader.tsx` |
| **FPS Counter** | React | `app/src/components/FPSCounter.tsx` |
| **Keyboard Shortcuts** | React panel | `app/src/components/KeyboardShortcutsPanel.tsx` |
| **Accessibility** | Screen reader, skip links | `app/src/components/accessibility/` |
| **Error Boundary** | Self-healing wrapper | `app/src/components/common/SelfHealingErrorBoundary.tsx` |

#### Directory Structure

```
app/src/
├── main.tsx                    # App entrypoint
├── App.tsx                     # Root component
├── index.css                   # Global styles
├── assets/                     # Static assets
├── commands/
│   ├── index.ts                # Command registry
│   ├── handlers/
│   │   ├── builtinCommands.ts  # help, clear, version, etc.
│   │   └── elementCommands.ts  # wall, slab, column, etc.
│   └── __tests__/
├── components/
│   ├── accessibility/          # ScreenReaderAnnouncer, SkipLinks
│   ├── canvas/                 # Canvas3D, Canvas2D, Grid, SelectionBox, etc.
│   │   ├── elements/           # Element-specific 3D renderers
│   │   └── __tests__/
│   ├── common/                 # SelfHealingErrorBoundary
│   ├── debug/                  # Debug panels
│   ├── layout/                 # App layout components
│   ├── Terminal/               # xterm.js terminal integration
│   └── ui/                     # Shared UI primitives
├── constants/                  # App-wide constants
├── demo/                       # Demo mode data/scripts
├── hooks/                      # Custom React hooks
├── lib/                        # Utility libraries
├── services/                   # API client, WebSocket, MCP bridge client
├── stores/                     # Zustand state stores (see §4)
│   ├── modelStore.ts
│   ├── selectionStore.ts
│   ├── uiStore.ts
│   ├── historyStore.ts
│   ├── macroStore.ts
│   ├── tokenStore.ts
│   ├── selfHealing.ts
│   ├── index.ts
│   ├── demo/
│   └── __tests__/
├── test/                       # Test utilities
├── tests/                      # Component/integration tests
├── types/                      # TypeScript type definitions
└── utils/                      # Shared utility functions
```

#### How It's Tested

| Method | Tool | Notes |
|---|---|---|
| Unit tests | Vitest | `app/vitest.config.ts`, store and command tests in `__tests__/` |
| E2E tests | Playwright | `app/e2e/`, `app/playwright.config.ts` |
| CI | `app-ci.yml` | Runs on every push: lint, type-check, unit tests |

#### Known Issues

- `SelfHealingErrorBoundary` is experimental (see `app/docs/SELF_HEALING_IMPLEMENTATION.md` and `app/SELF_HEALING_QUICKSTART.md`).
- Three.js memory leaks possible on hot-reload — dispose geometry/materials on unmount.

#### Quality Gates

- ✅ `tsc --noEmit` (zero type errors)
- ✅ `eslint` via `app/eslint.config.js` (zero warnings in CI)
- ✅ `prettier --check` (enforced formatting)
- ✅ Vitest passes
- ✅ Playwright E2E passes

---

## 3. Data Flow

### 3.1 Terminal Command Flow (Primary Path)

```
User types in Terminal (xterm.js)
        │
        ▼
┌─────────────────┐
│   DSL Parser    │  Tokenize + parse command string
│  (client-side)  │  e.g. "wall 0,0 10,0 3.0"
└────────┬────────┘
         │ Parsed command object
         ▼
┌─────────────────┐
│   Executor      │  Validates parameters, resolves references
│  (client-side)  │
└────────┬────────┘
         │ Validated command
         ▼
┌─────────────────┐
│   Command       │  Routes to correct handler
│   Dispatcher    │  (builtinCommands.ts or elementCommands.ts)
└────────┬────────┘
         │ State mutation
         ▼
┌─────────────────┐
│   Model Store   │  Zustand store updated immutably
│   (Zustand)     │  History entry pushed
└────────┬────────┘
         │ React re-render triggered
         ▼
┌─────────────────┐
│   3D Viewport   │  Three.js scene graph updated
│   (Three.js)    │  Elements rendered
└─────────────────┘
```

### 3.2 MCP Tool Flow (AI Agent Path)

```
AI Agent / Client
        │
        ▼
┌─────────────────┐
│   MCP Bridge    │  Node.js bridge (server/mcp-bridge/)
│   (client)      │  Translates MCP protocol to HTTP
└────────┬────────┘
         │ HTTP/JSON-RPC
         ▼
┌─────────────────┐
│   MCP Servers   │  geometry-server, spatial-server,
│   (Python)      │  validation-server, documentation-server
└────────┬────────┘
         │ PyO3 FFI calls
         ▼
┌─────────────────┐
│   Rust Kernel   │  pensaer-geometry, pensaer-math,
│   (native)      │  pensaer-crdt, pensaer-ifc
└────────┬────────┘
         │ Results
         ▼
    Response back through MCP Bridge → Client
```

### 3.3 Persistence Flow

```
Command execution
        │
        ▼
Event created → PostgreSQL (event store)
        │
        ▼
Projection updated (read model)
        │
        ├──→ Redis (cached queries, pub/sub notifications)
        │
        └──→ MinIO (large binary assets: IFC files, renders)
```

---

## 4. State Management

All client-side state lives in **Zustand** stores. Zustand was chosen over Redux for its minimal boilerplate and excellent TypeScript support.

### 4.1 Store Inventory

| Store | File | Purpose |
|---|---|---|
| `modelStore` | `stores/modelStore.ts` | All BIM elements, geometry data, model metadata |
| `selectionStore` | `stores/selectionStore.ts` | Currently selected element IDs, selection mode |
| `uiStore` | `stores/uiStore.ts` | Panel visibility, active tool, view mode, theme |
| `historyStore` | `stores/historyStore.ts` | Undo/redo stack, command history |
| `macroStore` | `stores/macroStore.ts` | Recorded macros, playback state |
| `tokenStore` | `stores/tokenStore.ts` | Auth tokens, session state |
| `selfHealing` | `stores/selfHealing.ts` | Error recovery state, retry counts |

### 4.2 Critical Rules

These are **non-negotiable**. Violating them causes infinite re-render loops, stale state, or silent data corruption.

#### Rule 1: NEVER Call Functions Inside Selectors

```typescript
// ❌ WRONG — causes infinite re-renders
const elements = useModelStore(state => state.getFilteredElements());

// ✅ CORRECT — derive data from raw state
const elements = useModelStore(state =>
  state.elements.filter(e => e.type === 'wall')
);
```

**Why:** Zustand selectors run on every state change. If a selector calls a function that triggers a state change, you get an infinite loop. Selectors must be **pure derivations** of state.

#### Rule 2: selectedIds Is `string[]`, Not `Set<string>`

```typescript
// ❌ WRONG — Set is not serializable, breaks devtools, breaks equality checks
selectedIds: new Set<string>()

// ✅ CORRECT — plain array
selectedIds: string[]
```

**Why:** Zustand's equality check (`Object.is` by default) doesn't work with `Set`. Arrays are serializable, debuggable, and work with `shallow` equality. Use `.includes()` for lookups or convert to `Set` locally in the component.

#### Rule 3: Immutable Updates Only

```typescript
// ❌ WRONG — mutating state
set(state => { state.elements.push(newElement); });

// ✅ CORRECT — spread to new array
set(state => ({ elements: [...state.elements, newElement] }));
```

#### Rule 4: Keep Stores Independent

Stores should not import or subscribe to each other directly. Cross-store coordination happens in command handlers or React hooks, never inside store definitions.

### 4.3 Store Usage Pattern

```typescript
import { useModelStore } from '@/stores/modelStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { shallow } from 'zustand/shallow';

function WallList() {
  // Select only what you need, use shallow for object/array selectors
  const walls = useModelStore(
    state => state.elements.filter(e => e.type === 'wall'),
    shallow
  );
  const selectedIds = useSelectionStore(state => state.selectedIds);

  return (
    <ul>
      {walls.map(wall => (
        <li key={wall.id} data-selected={selectedIds.includes(wall.id)}>
          {wall.id}
        </li>
      ))}
    </ul>
  );
}
```

---

## 5. Docker Stack

The full development environment is defined in `docker-compose.yml` at the repository root.

### 5.1 Service Map

| Service | Image / Build | Port | Purpose |
|---|---|---|---|
| `app` | `./app/Dockerfile` (target: development) | **5173** | Vite dev server, React client |
| `server` | `./server/Dockerfile` | **8000** | FastAPI, MCP servers, event sourcing |
| `kernel` | `./kernel/Dockerfile` | **50051** | Rust geometry/CRDT/IFC engine |
| `postgres` | `postgis/postgis:16-3.4-alpine` | **5432** | PostGIS database (event store, projections) |
| `redis` | `redis:7-alpine` | **6379** | Cache, pub/sub, sessions |
| `minio` | `minio/minio:latest` | **9000** / **9001** | S3-compatible object storage (dev only) |

### 5.2 Network & Volumes

- **Network:** `pensaer` (bridge driver) — all services communicate by service name.
- **Volumes:**
  - `postgres-data` — persistent DB
  - `redis-data` — persistent cache (AOF)
  - `minio-data` — object storage
  - `model-data` — server model file storage

### 5.3 Environment Variables

| Variable | Service | Value |
|---|---|---|
| `VITE_API_URL` | app | `http://localhost:8000` |
| `VITE_WS_URL` | app | `ws://localhost:8000/ws` |
| `DATABASE_URL` | server | `postgresql://pensaer:pensaer@postgres:5432/pensaer` |
| `REDIS_URL` | server | `redis://redis:6379` |
| `KERNEL_URL` | server | `http://kernel:50051` |
| `STORAGE_PATH` | server | `/data/models` |
| `RUST_LOG` | kernel | `info` |
| `RUST_BACKTRACE` | kernel | `1` |

### 5.4 Starting the Stack

```bash
# Full stack
docker compose up --build

# Individual services
docker compose up app server    # Frontend + API only
docker compose up postgres redis  # Infrastructure only

# Rebuild kernel after Rust changes
docker compose build kernel && docker compose up -d kernel
```

### 5.5 Health Checks

| Service | Check | Interval |
|---|---|---|
| `server` | `curl -f http://localhost:8000/health` | 10s |
| `postgres` | `pg_isready -U pensaer` | 5s |
| `redis` | `redis-cli ping` | 5s |

### 5.6 Resource Limits

| Service | Memory Limit | Memory Reservation |
|---|---|---|
| `kernel` | 4 GB | 1 GB |
| All others | Docker default | Docker default |

---

## 6. Key Design Decisions (ADRs)

Architecture Decision Records documenting *why* we built it this way.

### ADR-001: Geometry Primitives First

**Context:** We needed a foundation before building walls, slabs, columns.

**Decision:** Build `pensaer-math` (Vec3, Mat4, BBox3, transforms) and `pensaer-geometry` primitives before any BIM-specific elements.

**Consequences:**
- ✅ All higher-level elements share identical coordinate math
- ✅ Property-tested numeric invariants from day one
- ✅ Single source of truth for tolerance/epsilon values (`constants.rs`)
- ⚠️ Initial development felt slow — no visible features for weeks

---

### ADR-002: WebGL Viewer (Three.js)

**Context:** Options were Three.js, Babylon.js, custom WebGPU, or desktop-only (OpenGL).

**Decision:** Three.js via React Three Fiber for the 3D viewport.

**Rationale:**
- Largest ecosystem and community
- React Three Fiber integrates naturally with React component model
- Web-first means zero install for end users
- WebGPU migration path exists when Three.js supports it

**Consequences:**
- ✅ Works in any modern browser
- ✅ Huge library of helpers (drei, postprocessing)
- ⚠️ Performance ceiling for very large models (>500k triangles needs LOD)
- ⚠️ Memory management requires explicit dispose calls

---

### ADR-003: IFC Import/Export

**Context:** BIM interoperability requires a standard exchange format.

**Decision:** IFC 4.0 (ISO 16739-1:2018) as the primary exchange format, implemented in Rust (`pensaer-ifc`).

**Rationale:**
- Industry standard, required by most governments for public projects
- Rust parsing is fast enough for large models (100MB+ files)
- Mapping table (`mapping.rs`) makes internal ↔ IFC conversion explicit

**Consequences:**
- ✅ Import from Revit, ArchiCAD, Tekla, etc.
- ✅ Export for regulatory submission
- ⚠️ IFC spec is enormous — we support a subset (walls, slabs, columns, beams, spaces, properties)
- ⚠️ Round-trip fidelity is not 100% (some Revit-specific extensions lost)

---

### ADR-004: CRDT Sync

**Context:** Real-time multi-user editing without a central lock server.

**Decision:** Implement CRDT (Conflict-free Replicated Data Types) in Rust (`pensaer-crdt`).

**Rationale:**
- CRDTs guarantee eventual consistency without coordination
- Rust implementation avoids GC pauses during merge
- Works offline — users can edit disconnected and merge later

**Consequences:**
- ✅ True real-time collaboration
- ✅ Offline-first capability
- ⚠️ CRDT merge can produce valid-but-unexpected geometry (wall overlaps after concurrent edits)
- ⚠️ Early-stage — conflict resolution UI not yet built

---

### ADR-005: Event Sourcing with Snapshots

**Context:** Need full audit trail and undo/redo at any depth.

**Decision:** All model mutations stored as immutable events in PostgreSQL. Periodic snapshots for fast replay.

**Rationale:**
- Complete history for regulatory compliance (who changed what, when)
- Unlimited undo/redo (replay events forward/backward)
- Snapshots keep replay time bounded even for long-lived projects

**Consequences:**
- ✅ Full audit log, compliance-ready
- ✅ Time-travel debugging
- ✅ Undo/redo is just event replay
- ⚠️ Event schema migration is complex (need upcasters)
- ⚠️ Snapshot frequency tuning required for large models

---

### ADR-006: MCP Tool Architecture

**Context:** We want AI agents (Claude, GPT, etc.) to drive Pensaer programmatically.

**Decision:** Expose all operations as MCP (Model Context Protocol) tools, organised into four domain-specific servers.

**Rationale:**
- MCP is the emerging standard for AI ↔ tool communication
- Tool-per-operation is self-documenting (AI reads tool schemas)
- Four servers keep tool count manageable per domain
- 58+ tools cover full CRUD + spatial queries + validation + documentation

**Consequences:**
- ✅ Any MCP-compatible AI can drive Pensaer
- ✅ Tools are discoverable and self-documenting
- ✅ Enables "AI architect" workflows
- ⚠️ MCP spec is evolving — need to track upstream changes
- ⚠️ 58+ tools means maintenance burden on schema consistency

---

### ADR-007: Terminal-First Interface

**Context:** BIM tools traditionally use click-heavy GUIs. We wanted something different.

**Decision:** The terminal (xterm.js) is the primary input method. All operations have text commands. GUI is a visualization layer, not the input layer.

**Rationale:**
- Faster for power users (typing > clicking through menus)
- Commands are scriptable, composable, repeatable
- Macros are just saved command sequences
- Easier to test (text in → state out)

**Consequences:**
- ✅ Power users are dramatically faster
- ✅ Full scriptability and macro recording
- ✅ Easy to test
- ⚠️ Higher learning curve for non-technical users
- ⚠️ Need good autocomplete, help, and error messages to be usable

---

### ADR-008: Zustand State Management

**Context:** Need client-side state management for a complex React app.

**Decision:** Zustand over Redux, MobX, or Jotai.

**Rationale:**
- Minimal boilerplate (no actions, reducers, action creators)
- Excellent TypeScript inference
- Subscriptions are granular (components re-render only when their selected slice changes)
- Small bundle size (~1KB)
- Works outside React (useful for service modules)

**Consequences:**
- ✅ Less code than Redux by 60-70%
- ✅ Excellent TypeScript DX
- ✅ Easy to split into focused stores
- ⚠️ Must follow selector rules strictly (see §4.2)
- ⚠️ No built-in devtools (zustand/middleware adds them)

---

## 7. Directory Map

Complete top-level repository structure:

```
Pensaer-BIM/
├── .claude/                    # Claude Code configuration
│   ├── commands/               # Custom Claude commands
│   ├── rules/                  # Component and MCP tool rules
│   ├── settings.json
│   └── settings.local.json
├── .github/
│   ├── workflows/
│   │   ├── app-ci.yml          # Frontend CI
│   │   ├── ci.yml              # Global CI
│   │   ├── kernel-ci.yml       # Rust kernel CI
│   │   └── server-ci.yml       # Python server CI
│   ├── instructions/
│   │   └── codacy.instructions.md
│   └── pull_request_template.md
├── app/                        # Layer C: React Client
├── server/                     # Layer B: Python Server + MCP
├── kernel/                     # Layer A: Rust Kernel
├── deploy/                     # Deployment configurations
├── docs/                       # Documentation (you are here)
├── prompts/                    # AI prompt templates
├── prototype/                  # Early prototypes
├── scripts/                    # Build and utility scripts
├── docker-compose.yml          # Full stack definition
├── build_bindings.ps1          # PowerShell: build PyO3 bindings
├── fly.toml                    # Fly.io deployment config
├── .pre-commit-config.yaml     # Pre-commit hooks
├── .env.example                # Environment variable template
├── CLAUDE.md                   # Root AI instructions
├── README.md                   # Project README
├── CHANGELOG.md                # Version history
├── BACKLOG.md                  # Feature backlog
├── GAPS.md                     # Known gaps
├── CONSTRUCTION_BIBLE.md       # Construction domain reference
├── LICENSE                     # License file
├── DEMO_COMMANDS.txt           # Demo command sequences
├── DEMO_SCRIPT.md              # Demo walkthrough
├── HOUSE_TUTORIAL.md           # Tutorial: build a house
└── TOWER_BUILDING_README.md    # Tutorial: build a tower
```

---

## 8. Quality Gates & Testing

### 8.1 CI Pipelines

| Pipeline | File | Trigger | Checks |
|---|---|---|---|
| **Global** | `ci.yml` | All pushes & PRs | Orchestrates sub-pipelines |
| **App** | `app-ci.yml` | Changes in `app/` | `tsc`, `eslint`, `vitest`, `playwright` |
| **Server** | `server-ci.yml` | Changes in `server/` | `ruff`, `pytest`, `mypy` |
| **Kernel** | `kernel-ci.yml` | Changes in `kernel/` | `cargo test`, `cargo clippy`, `cargo fmt` |

### 8.2 Pre-Commit Hooks

Defined in `.pre-commit-config.yaml`:

- Rust: `cargo fmt`, `cargo clippy`
- Python: `ruff check`, `ruff format`
- TypeScript: `eslint`, `prettier`

### 8.3 Definition of Done

A feature is done when:

1. ✅ Code written and compiles/type-checks
2. ✅ Unit tests written and passing
3. ✅ Integration test if it crosses layer boundaries
4. ✅ E2E test if it affects user-visible behaviour
5. ✅ Documentation updated (this encyclopedia, docstrings, README)
6. ✅ No CI failures
7. ✅ PR reviewed and approved
8. ✅ No new `clippy` warnings, `eslint` warnings, or `ruff` violations

### 8.4 Test Commands Quick Reference

```bash
# Kernel (Rust)
cd kernel && cargo test --workspace
cd kernel && cargo clippy -- -D warnings

# Server (Python)
cd server && pytest -v
cd server && ruff check .

# App (TypeScript/React)
cd app && npx vitest run
cd app && npx tsc --noEmit
cd app && npx eslint .
cd app && npx playwright test

# Root-level tests
pytest test_roof.py test_selection.py test_selection_mcp.py

# Full stack
docker compose up --build
```

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **BIM** | Building Information Modelling — 3D model + data for construction |
| **IFC** | Industry Foundation Classes — ISO standard for BIM data exchange |
| **MCP** | Model Context Protocol — standard for AI ↔ tool communication |
| **CRDT** | Conflict-free Replicated Data Type — data structure for distributed sync |
| **DSL** | Domain-Specific Language — Pensaer's command language |
| **PyO3** | Rust ↔ Python FFI bridge |
| **Event Sourcing** | Storing all changes as immutable events, deriving state by replay |
| **Projection** | A read-model derived from the event log |
| **PostGIS** | PostgreSQL extension for geographic/geometric data |

## Appendix B: Port Reference

| Port | Service | Protocol |
|---|---|---|
| 5173 | Vite (React client) | HTTP |
| 8000 | FastAPI (Python server) | HTTP / WebSocket |
| 50051 | Rust kernel | HTTP / gRPC |
| 5432 | PostgreSQL | TCP |
| 6379 | Redis | TCP |
| 9000 | MinIO (S3 API) | HTTP |
| 9001 | MinIO (Console) | HTTP |

---

*End of Part 1 — Platform Overview & Architecture*

*Next: Part 2 — Geometry Engine & Element System*
