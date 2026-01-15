# 🏗️ Pensaer BIM Platform

> **Pensaer** (Welsh: *pen-SAH-eer*) — *architect*

<div align="center">

**The Building Information Modeling platform built for developers.**

*Command-line first. Keyboard-centric. AI-native.*

[![Status](https://img.shields.io/badge/Status-Alpha-orange)]()
[![License](https://img.shields.io/badge/License-MIT-blue)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)]()

[Vision](#vision) • [Architecture](#architecture) • [Quick Start](#quick-start) • [Documentation](#documentation)

</div>

---

## Monorepo Structure

```
Pensaer/
├── kernel/           # Rust geometry/CRDT/IFC crates
│   ├── pensaer-crdt/
│   ├── pensaer-geometry/
│   ├── pensaer-ifc/
│   └── pensaer-math/
├── server/           # Python API + MCP servers
│   ├── app/          # FastAPI application
│   ├── mcp-servers/  # 4 MCP servers (33+ tools)
│   └── mcp-bridge/   # Node.js MCP bridge
├── src/              # React/TypeScript client
├── docs/             # Canonical documentation
│   ├── architecture/ # System design, tech stack
│   ├── mcp/          # MCP server design
│   ├── adr/          # Architecture Decision Records
│   └── loop/         # Development loop tracking
└── prototype/        # HTML prototype
```

---

## Why "Pensaer"?

**Pensaer** is the Welsh word for "architect."

We chose this name because:
- It's distinctive and memorable
- Welsh architecture has a proud heritage (from medieval castles to modern masters like Richard Rogers)
- It signals craft and tradition reimagined with modern tools
- The pronunciation (*pen-SAH-eer*) is approachable yet unique

Pensaer isn't just software. It's a statement: **architecture and code are becoming one discipline.**

---

## Vision

**Architects are becoming developers.**

Over 500,000 professionals use Dynamo, pyRevit, and Grasshopper to automate their BIM workflows. Yet traditional BIM software remains click-heavy, mouse-dependent, and hostile to programmatic control.

**Pensaer changes this.** We're building BIM software the way developers build code editors—with command palettes, terminal access, keyboard shortcuts, and scriptable everything.

---

## Architecture

### Three-Layer Stack

| Layer | Technology | Location |
|-------|------------|----------|
| **Kernel** | Rust + PyO3 | `kernel/` |
| **Server** | Python 3.12 + FastAPI + MCP | `server/` |
| **Client** | React 18 + TypeScript + Three.js | `src/` |

### Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **CRDT** | Loro | Rust-native, Movable Tree for BIM hierarchies |
| **Event Store** | PostgreSQL 16 | pgvector + PostGIS, proven at scale |
| **Actors** | actix-rs | Single-threaded async, no Orleans complexity |
| **Orchestration** | LangGraph | Python-native, graph-based agent workflows |
| **Geometry** | CGAL | Industrial-strength boolean operations |

### MCP Server Organization

| Server | Tools | Purpose |
|--------|-------|---------|
| geometry-server | 12 | create_wall, create_floor, boolean_operation |
| spatial-server | 8 | room_analysis, circulation_check, adjacency |
| validation-server | 8 | clash_detection, code_compliance |
| documentation-server | 7 | generate_schedule, create_section, export_ifc |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/pensaer.git
cd pensaer

# Build Rust kernel
cd kernel && cargo build && cd ..

# Install Python server deps
cd server && pip install -e . && cd ..

# Install client deps
npm install

# Start development
npm run dev
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/INDEX.md](docs/INDEX.md) | ⭐ **Start here** - Documentation navigation |
| [docs/architecture/CANONICAL_ARCHITECTURE.md](docs/architecture/CANONICAL_ARCHITECTURE.md) | System design, sacred invariant |
| [docs/architecture/TECH_STACK.md](docs/architecture/TECH_STACK.md) | Technology decisions with rejections |
| [docs/architecture/GLOSSARY.md](docs/architecture/GLOSSARY.md) | Standardized terminology |
| [docs/mcp/SERVER_DESIGN.md](docs/mcp/SERVER_DESIGN.md) | 4-server organization |
| [docs/mcp/TOOL_SURFACE.md](docs/mcp/TOOL_SURFACE.md) | Complete 33+ tool inventory |
| [docs/adr/](docs/adr/) | Architecture Decision Records |
| [docs/loop/](docs/loop/) | Development loop tracking |

---

## Development

### Rust Kernel

```bash
cd kernel
cargo build
cargo test
```

### Python Server

```bash
cd server
pip install -e ".[dev]"
pytest
```

### Client

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint + TypeScript
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with 🧠 by developers, for developers.**

*Pensaer — Unified Monorepo: January 15, 2026*

</div>
