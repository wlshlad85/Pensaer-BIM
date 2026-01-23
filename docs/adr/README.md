# Architecture Decision Records (ADR)

This folder contains concise records of key architectural decisions.

Naming format: `ADR-YYYYMMDD-<short-title>.md`

## Index

### Foundation Decisions (2026-01-15)
- [ADR-20260115-ifc-import-export.md](./ADR-20260115-ifc-import-export.md) - IFC format support
- [ADR-20260115-geometry-primitives-first.md](./ADR-20260115-geometry-primitives-first.md) - Geometry approach
- [ADR-20260115-viewer-webgl-first.md](./ADR-20260115-viewer-webgl-first.md) - 3D rendering choice
- [ADR-20260115-event-sourcing-snapshots.md](./ADR-20260115-event-sourcing-snapshots.md) - Event sourcing strategy
- [ADR-20260115-crdt-sync-conflicts.md](./ADR-20260115-crdt-sync-conflicts.md) - Conflict resolution
- [ADR-20260115-governance-audit-gates.md](./ADR-20260115-governance-audit-gates.md) - AI governance

### Implementation Decisions (2026-01-20)
- [ADR-20260120-zustand-state-management.md](./ADR-20260120-zustand-state-management.md) - Zustand + Immer for state
- [ADR-20260120-mcp-tool-architecture.md](./ADR-20260120-mcp-tool-architecture.md) - Four MCP servers
- [ADR-20260120-terminal-first-interface.md](./ADR-20260120-terminal-first-interface.md) - Terminal-first UX

## ADR Template

```markdown
# ADR: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded
**Decision Makers:** [Names/Roles]

## Context
[What is the issue we're addressing?]

## Decision
[What decision was made?]

## Alternatives Considered
[What other options were evaluated?]

## Rationale
[Why was this decision made?]

## Consequences
[What are the positive and negative impacts?]

## References
[Links to relevant documents/resources]
```

## Status Definitions

| Status | Meaning |
|--------|---------|
| **Proposed** | Under discussion |
| **Accepted** | Approved and in effect |
| **Deprecated** | No longer recommended |
| **Superseded** | Replaced by another ADR |
