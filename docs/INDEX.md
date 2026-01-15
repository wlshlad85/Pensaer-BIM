# Pensaer Documentation Index

**Last Updated:** January 15, 2026 (Consolidated)
**Monorepo Structure:** Unified (kernel + server + client)

---

## Repository Structure

```
Pensaer/
├── kernel/                # Rust geometry/CRDT/IFC crates
├── server/                # Python API + MCP servers
│   ├── app/               # FastAPI application  
│   ├── mcp-servers/       # 4 MCP servers (33+ tools)
│   └── mcp-bridge/        # Node.js MCP bridge
├── src/                   # React/TypeScript client
├── docs/                  # ⬇️ THIS INDEX
└── prototype/             # HTML prototype
```

---

## Document Hierarchy

```
docs/
├── INDEX.md               # ⭐ YOU ARE HERE
├── VISION.md              # Why Pensaer exists
├── PRD.md                 # Product requirements (v1.0 + v2.0 consolidated)
├── ROADMAP.md             # Development timeline (16-week + 48-week)
├── CLIENT_ARCHITECTURE.md # Client architecture (React/TypeScript)
├── AGENT_TEAM.md          # AI agent architecture
├── AI_STRATEGY.md         # ⭐ AI-first development strategy (NEW)
│
├── architecture/          # CANONICAL TECHNICAL REFERENCE
│   ├── CANONICAL_ARCHITECTURE.md   # ⭐ Authoritative system design
│   ├── TECH_STACK.md               # ⭐ Technology decisions & rejections
│   └── GLOSSARY.md                 # ⭐ Standardized terminology
│
├── mcp/                   # MCP SERVER SPECIFICATIONS
│   ├── SERVER_DESIGN.md            # Server architecture & patterns
│   └── TOOL_SURFACE.md             # Complete tool inventory (33+ tools)
│
├── adr/                   # ARCHITECTURE DECISION RECORDS
│   ├── ADR-20260115-crdt-sync-conflicts.md
│   ├── ADR-20260115-event-sourcing-snapshots.md
│   ├── ADR-20260115-geometry-primitives-first.md
│   ├── ADR-20260115-governance-audit-gates.md
│   ├── ADR-20260115-ifc-import-export.md
│   ├── ADR-20260115-viewer-webgl-first.md
│   └── README.md
```

---

## Document Authority

| Document | Authority Level | Use Case |
|----------|-----------------|----------|
| `architecture/CANONICAL_ARCHITECTURE.md` | **HIGHEST** | System design decisions |
| `architecture/TECH_STACK.md` | **HIGHEST** | Technology choices |
| `architecture/GLOSSARY.md` | **HIGHEST** | Terminology |
| `adr/*.md` | **HIGHEST** | Specific decisions with context |
| `mcp/SERVER_DESIGN.md` | HIGH | MCP implementation |
| `mcp/TOOL_SURFACE.md` | HIGH | Tool specifications |
| `PRD.md` | MEDIUM | Feature requirements (Part I + II consolidated) |
| `ROADMAP.md` | MEDIUM | Timeline planning (16-week + 48-week) |
| `CLIENT_ARCHITECTURE.md` | MEDIUM | Client-side (React/TS) architecture |
| `AI_STRATEGY.md` | HIGH | AI-first development workflow |

---

## Key Decisions (Quick Reference)

| Decision | Choice | Document |
|----------|--------|----------|
| CRDT Library | **Loro** (not Yjs/Automerge) | TECH_STACK.md, ADR-crdt-sync |
| Actor Framework | **actix-rs** (not Orleans) | TECH_STACK.md |
| Event Store | **PostgreSQL** (not EventStoreDB) | TECH_STACK.md, ADR-event-sourcing |
| AI Orchestration | **LangGraph** (not CrewAI) | TECH_STACK.md |
| Geometry Approach | Primitives-first | ADR-geometry-primitives |
| Governance | Audit gates required | ADR-governance-audit-gates |
| IFC Strategy | Import/export not native | ADR-ifc-import-export |
| Viewer | WebGL first, wgpu later | ADR-viewer-webgl-first |

---

## Code Locations

| Component | Path | Language |
|-----------|------|----------|
| Geometry kernel | `kernel/pensaer-geometry/` | Rust |
| CRDT sync | `kernel/pensaer-crdt/` | Rust |
| IFC parser | `kernel/pensaer-ifc/` | Rust |
| Math primitives | `kernel/pensaer-math/` | Rust |
| MCP servers | `server/mcp-servers/` | Python |
| FastAPI app | `server/app/` | Python |
| React client | `src/` | TypeScript |

---

## Reading Order for New Contributors

1. `VISION.md` — Understand the "why"
2. `architecture/GLOSSARY.md` — Learn the vocabulary
3. `architecture/CANONICAL_ARCHITECTURE.md` — Understand the system
4. `architecture/TECH_STACK.md` — Know the technology decisions
5. `adr/README.md` — Browse decision records
6. `mcp/SERVER_DESIGN.md` — Agent integration
7. `kernel/README.md` — Rust crate structure

---

## Source History

| Path | Origin | Date |
|------|--------|------|
| `architecture/*` | pensaer-a | 2026-01-15 |
| `mcp/*` | pensaer-a | 2026-01-15 |
| `adr/*` | Pensaer-B | 2026-01-15 |
| `AI_STRATEGY.md` | Base44 adaptation | 2026-01-15 |
| `kernel/` | Pensaer-B | 2026-01-15 |
| `server/` | Pensaer-B | 2026-01-15 |
| `PRD.md` | Consolidated (v1.0 + PRD-server v2.0) | 2026-01-15 |
| `ROADMAP.md` | Consolidated (16-week + 48-week) | 2026-01-15 |
| `CLIENT_ARCHITECTURE.md` | Renamed from ARCHITECTURE.md | 2026-01-15 |

---

*When documents conflict, `architecture/` takes precedence over all others.*
