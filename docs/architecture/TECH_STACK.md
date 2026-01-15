# Pensaer: Canonical Technology Stack

**Version:** 1.0 | **Date:** January 15, 2026  
**Status:** Authoritative — all other documents defer to this  
**Source:** Merged from pensaer-a project documentation

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────┐
│  KERNEL        Rust + PyO3                                  │
│  APPLICATION   Python 3.12+ / FastAPI / Pydantic v2         │
│  CLI           Typer + Rich                                 │
├─────────────────────────────────────────────────────────────┤
│  DATABASE      PostgreSQL 16 + PostGIS + pgvector           │
│  CACHE         Redis 7.x Streams                            │
│  EVENTS        Custom append-only log (not EventStoreDB)    │
├─────────────────────────────────────────────────────────────┤
│  GEOMETRY      Rust primitives → CGAL (V1) → OptiX (V2)     │
│  CRDT          Loro                                         │
│  ACTORS        actix-rs                                     │
├─────────────────────────────────────────────────────────────┤
│  LLM           Claude API (primary) + LiteLLM (fallback)    │
│  ORCHESTRATION LangGraph                                    │
│  TOOLS         MCP (JSON-RPC 2.0)                           │
├─────────────────────────────────────────────────────────────┤
│  RENDERING     Three.js/WebGL (MVP) → wgpu-rs/WebGPU (V2)   │
│  INFRA         Docker + Kubernetes + ArgoCD                 │
│  OBSERVABILITY OpenTelemetry + Grafana                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Client-Specific Stack (Pensaer-BIM Web App)

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| **Framework** | React | 18+ | Type-safe UI components |
| **Language** | TypeScript | 5.x | Strict mode enabled |
| **Styling** | Tailwind CSS | 3.x | Utility-first |
| **State** | Zustand + Immer | Latest | Immutable state management |
| **3D Engine** | Three.js | Latest | r3f for React integration |
| **Terminal** | xterm.js | Latest | Integrated terminal |
| **Build** | Vite | 5.x | Fast HMR, ESM-native |

---

## Server-Side Stack (Canonical)

### Core Languages

| Use Case | Technology | Version | Notes |
|----------|------------|---------|-------|
| Kernel/Performance | Rust | 1.75+ | PyO3 for Python bindings |
| Application/API | Python | 3.12+ | Type hints, async/await |
| Web Client | TypeScript | 5.x | React 18+ |
| Shaders | WGSL | — | Via Naga transpiler |

### Data Layer

| Component | Technology | Version | Config |
|-----------|------------|---------|--------|
| Primary DB | PostgreSQL | 16.x | PostGIS 3.4+, pgvector |
| Cache | Redis | 7.x | Streams for pub/sub |
| Search | PostgreSQL FTS | — | + pgvector for semantic |
| File Storage | MinIO/S3 | — | IFC files, geometry cache |

**No separate services for:** Neo4j, Elasticsearch, EventStoreDB, dedicated vector DB

### AI/Agent Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Primary LLM | Claude API | claude-sonnet-4-5-20250929, claude-opus-4-5-20251101 |
| Fallback | LiteLLM | Multi-provider routing |
| Orchestration | LangGraph | Stateful, checkpointing |
| Tool Protocol | MCP | JSON-RPC 2.0, stdio/SSE |
| Structured Output | Instructor | Pydantic extraction |

### Collaboration

| Component | Technology | Notes |
|-----------|------------|-------|
| CRDT | **Loro** | Movable Tree, Rust-native |
| Actors | actix-rs | Message-passing concurrency |
| Transport | WebSocket + SSE | Real-time + streaming |
| Sync Protocol | Custom | Loro-based merge semantics |

---

## ⚠️ Explicit Rejections

These technologies were considered and **explicitly rejected**:

| Technology | Reason for Rejection | Alternative |
|------------|---------------------|-------------|
| **Orleans (.NET)** | Requires .NET runtime, breaks pure-Rust stack | actix-rs |
| **EventStoreDB** | PostgreSQL sufficient, fewer ops dependencies | Custom PostgreSQL |
| **Neo4j** | Recursive CTEs handle graph queries | PostgreSQL |
| **Elasticsearch** | PostgreSQL FTS + pgvector covers our needs | pgvector |
| **Yjs/Automerge** | Loro has native tree support, better fit | **Loro** |
| **OCCT (Open CASCADE)** | Overkill for MVP, CGAL lighter for V1 | CGAL |
| **CrewAI** | LangGraph more flexible, better documented | LangGraph |
| **Semantic Kernel** | Python-native LangGraph preferred | LangGraph |

---

## Version Pinning Strategy

### Python (pyproject.toml)

```toml
[project]
requires-python = ">=3.12"

[tool.poetry.dependencies]
python = "^3.12"
fastapi = "^0.109"
pydantic = "^2.5"
sqlalchemy = "^2.0"
typer = "^0.9"
rich = "^13.0"
httpx = "^0.26"
anthropic = "^0.18"
langgraph = "^0.0.40"
instructor = "^0.5"
```

### Rust (Cargo.toml)

```toml
[dependencies]
tokio = { version = "1.35", features = ["full"] }
actix = "0.13"
pyo3 = { version = "0.20", features = ["extension-module"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1.6", features = ["v4", "serde"] }
loro = "0.16"
```

### TypeScript (package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "three": "^0.160.0",
    "@react-three/fiber": "^8.15.0",
    "zustand": "^4.5.0",
    "immer": "^10.0.0",
    "xterm": "^5.3.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## Environment Configuration

### Docker Compose Services

```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: pensaer
      POSTGRES_USER: pensaer
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - miniodata:/data
    ports:
      - "9000:9000"
      - "9001:9001"
```

---

## ADR Summary

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Event sourcing over mutable state | ✅ Final |
| ADR-002 | **Loro** for CRDT (not Yjs/Automerge) | ✅ Final |
| ADR-003 | Rust kernel + Python application | ✅ Final |
| ADR-004 | MCP for tool exposure | ✅ Final |
| ADR-005 | PostgreSQL event store (not EventStoreDB) | ✅ Final |
| ADR-006 | **actix-rs** for actors (not Orleans) | ✅ Final |
| ADR-007 | Three.js MVP → wgpu-rs V2 | ✅ Final |
| ADR-008 | **LangGraph** for orchestration | ✅ Final |
| ADR-009 | Custom → CGAL → OptiX geometry pipeline | ✅ Final |
| ADR-010 | pgvector (no Elasticsearch) | ✅ Final |

---

*This is the canonical technology reference. When in doubt, this document wins.*
