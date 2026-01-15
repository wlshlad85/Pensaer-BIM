# Pensaer-BIM AI Navigation Guide

> **Purpose:** This file helps AI agents navigate and understand the Pensaer codebase efficiently.

## CRITICAL: Minimal Code Principle

> "The less code it writes, the fewer mistakes or confusion it can cause." — Maor Shlomo

**When writing code for Pensaer:**
1. **Call MCP tools** instead of implementing logic yourself
2. **Use existing utilities** before creating new ones
3. **Prefer configuration over code** where possible
4. **Keep functions short** - if it's > 20 lines, break it up
5. **Avoid abstractions** until the pattern repeats 3+ times

**Example - DON'T do this:**
```typescript
// BAD: Implementing geometry calculations
const wallLength = Math.sqrt(
  Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
);
```

**Example - DO this:**
```typescript
// GOOD: Call the MCP tool
const wall = await geometryServer.createWall({ start, end, height, thickness });
```

---

## Project Overview

**Pensaer** is a developer-first BIM (Building Information Modeling) platform with:
- **Rust kernel** for geometry, CRDT sync, and IFC parsing
- **Python server** (FastAPI) with MCP tool servers
- **React client** (TypeScript) for web interface

## Repository Structure

```
Pensaer-BIM/
├── kernel/           # Rust crates (geometry, CRDT, IFC, math)
├── server/           # Python FastAPI + 4 MCP servers
├── app/              # React/TypeScript web client
├── docs/             # Documentation (PRD, architecture, ADRs)
└── prototype/        # HTML prototype reference
```

## Quick Navigation

| I need to... | Go to |
|-------------|-------|
| Modify geometry logic | `kernel/pensaer-geometry/src/lib.rs` |
| Add MCP tools | `server/mcp-servers/` |
| Change UI components | `app/src/components/` |
| Update data stores | `app/src/stores/` |
| Read architecture | `docs/architecture/CANONICAL_ARCHITECTURE.md` |
| Check tech decisions | `docs/architecture/TECH_STACK.md` |

## Key Concepts

### Sacred Invariant
> "All outputs are consistent projections of a single authoritative model state."

Every change goes through the event log. Views are derived, never stored.

### Element Types
- `wall`, `door`, `window`, `room`, `roof`, `floor`, `column`, `beam`, `stair`

### MCP Tool Servers (4 total)
1. **geometry-server** - create_wall, create_opening, compute_mesh
2. **spatial-server** - create_room, compute_adjacency
3. **validation-server** - check_compliance, detect_clashes
4. **documentation-server** - generate_schedule, export_report

## Model Routing Hints

| Task Type | Recommended Model |
|-----------|------------------|
| UI/Frontend work | Sonnet (fast, great at design) |
| Geometry kernel | Opus (complex math) |
| MCP tools | Opus (architectural) |
| Quick fixes | Haiku (speed) |

## Coding Conventions

### Rust (kernel/)
- Use `Result<T, PensaerError>` for fallible operations
- Prefix internal functions with `_`
- Document public APIs with `///`

### Python (server/)
- Type hints required on all functions
- Use Pydantic models for request/response
- FastAPI dependency injection for services

### TypeScript (app/)
- Zustand for state management
- Functional components only
- Tailwind CSS for styling

## What NOT to Do

- Don't write raw geometry math - use MCP tools
- Don't bypass event sourcing - all changes through commands
- Don't add new dependencies without checking `TECH_STACK.md`
- Don't modify `kernel/` without Rust expertise

## Related CLAUDE.md Files

- `kernel/CLAUDE.md` - Rust-specific guidance
- `server/CLAUDE.md` - Python/MCP guidance
- `app/CLAUDE.md` - React/TypeScript guidance
