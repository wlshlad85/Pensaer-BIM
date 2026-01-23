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

## Task Orchestration Workflow

> Tasks are the primary coordination mechanism for all non-trivial work.

### When to Use Tasks

| Scope | Use Tasks? | Approach |
|-------|-----------|----------|
| Single-file fix, bug, refactor | No | Just do it directly |
| Multi-file feature (3+ files) | Yes | Create task list with dependencies |
| Cross-component work (app + server) | Yes | Tasks + subagents |
| Multi-session / EPIC work | Yes | Shared task list via `CLAUDE_CODE_TASK_LIST_ID` |

### Task Workflow

1. **Break down** the project into tasks with `TaskCreate`
2. **Define dependencies** with `TaskUpdate` (addBlockedBy / addBlocks)
3. **Claim and start** tasks by setting `status: "in_progress"`
4. **Complete** tasks by setting `status: "completed"` only when fully done
5. **Check for next work** with `TaskList` after each completion

### Task Rules

- **Never mark a task completed if:** tests fail, implementation is partial, or errors are unresolved
- **Always set `activeForm`** (present continuous) for spinner display (e.g., "Building auth system")
- **Dependencies are enforced:** don't start a task if its `blockedBy` list has open items
- **Tasks persist on disk:** they survive session restarts — pick up where you left off

### Multi-Session Coordination

For COMPOUND/EPIC work spanning multiple sessions or subagents:

```bash
# All sessions sharing the same task list:
CLAUDE_CODE_TASK_LIST_ID=pensaer-feature-xyz
```

- Each subagent works in its own context but sees the same task list
- When one session completes a task, others see the update immediately
- Prevents duplicate work and agents stepping on each other

### Subagent Division Strategy

```
Session 1 (app):    UI components, stores, hooks
Session 2 (server): MCP tools, API endpoints, migrations
Session 3 (kernel): Rust geometry, CRDT, IFC parsing
```

Each session claims tasks from the shared list relevant to its domain.

### Task Sizing

- ATOMIC: 1-2 files, <100 lines — single task, no subagents
- MOLECULAR: 2-4 files, 100-300 lines — 2-3 tasks with dependencies
- COMPOUND: 4-8 files, 300-800 lines — task tree + parallel subagents
- EPIC: **DECOMPOSE into COMPOUND chunks first** — never assign directly

---

## AI Code Automation System

**Read `docs/CODE_AUTOMATION_SYSTEM.md` for the complete system.**

### Quick Reference

**Before Every Commit:**
```bash
./scripts/verify.sh        # Full verification
./scripts/verify.sh --quick  # Fast mode (skip slow tests)
```

**Branch Naming:**
```
ai/kernel-[feature]   # Kernel work
ai/app-[feature]      # App work
ai/server-[feature]   # Server work
```

**Parallel Session Rules:**
- One session per component (kernel, app, server)
- No two sessions editing the same file
- Rebase from main before starting
- Use shared `CLAUDE_CODE_TASK_LIST_ID` for cross-session coordination

## Related CLAUDE.md Files

- `kernel/CLAUDE.md` - Rust-specific guidance
- `server/CLAUDE.md` - Python/MCP guidance
- `app/CLAUDE.md` - React/TypeScript guidance
- `docs/CODE_AUTOMATION_SYSTEM.md` - Full automation guide
