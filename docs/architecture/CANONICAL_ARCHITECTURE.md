# Pensaer: Canonical Architecture

**Version:** 1.0  
**Date:** January 15, 2026  
**Status:** Authoritative Reference  
**Supersedes:** All prior architecture discussions in other documents

---

## The Sacred Invariant

> **All outputs must remain consistent projections of a single authoritative model state. Change propagation scales with the size of the change, not the size of the model.**

This principle, proven by Revit's "context-driven parametrics" (1997-2000), remains non-negotiable. Pensaer preserves this invariant while extending it for the 2026 agentic AI era.

---

## Core Thesis

**Pensaer treats BIM as a model server + governed agent runtime, not a desktop application.**

- All users are developers
- All workflows are code
- Agents are first-class users with governance

---

## Architecture Layers

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

---

## Layer A — Model Kernel

The regen engine preserves the sacred invariant:

| Component | Implementation | Purpose |
|-----------|---------------|---------|
| **Element Graph** | Rust + PyO3 | Type-safe element relationships |
| **Constraint Solver** | Context-driven propagation | Minimal-step change cascading |
| **Transaction Manager** | ACID with optimistic concurrency | Deterministic undo/redo |
| **Dependency Tracker** | Directed acyclic graph (DAG) | Efficient invalidation |

### Regen Flow

```
Change Detected → Dependency Graph Query → Affected Subgraph Identified
→ Step Planning → Parallel Execution → State Commit → Event Emit
```

---

## Layer B — Model Server

The 2026 pivot from desktop file to collaborative server:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Event Store** | PostgreSQL 16 + append-only log | Immutable mutation history |
| **Snapshot Engine** | Materialized views + Redis cache | Point-in-time state retrieval |
| **Branch Manager** | Git-style semantics | Parallel development, merge |
| **Sync Runtime** | Loro CRDT + WebSocket | Real-time multi-user editing |
| **Compute Scheduler** | Redis Streams + worker pool | Async regen/analysis jobs |

### Event Store Schema

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_num BIGSERIAL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL,
    user_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    CONSTRAINT events_sequence_unique UNIQUE (branch_id, sequence_num)
);

CREATE INDEX idx_events_aggregate ON events(aggregate_id, sequence_num);
CREATE INDEX idx_events_branch ON events(branch_id, sequence_num);
CREATE INDEX idx_events_type ON events(event_type, timestamp);
```

---

## Layer C — Agent Runtime

Agentic AI as first-class platform capability:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **MCP Server** | JSON-RPC 2.0 + stdio/SSE | Tool exposure for AI agents |
| **Orchestration** | LangGraph + Claude API | Stateful multi-step workflows |
| **Governance** | Permission gates + audit logs | Trust layer for agent actions |
| **Evaluation** | Deterministic replay + metrics | Regression testing for agents |

See [MCP Server Design](../mcp/SERVER_DESIGN.md) for detailed tool specifications.

---

## Event Sourcing Patterns

### Event Types

```python
from enum import Enum
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class EventType(str, Enum):
    # Element lifecycle
    ELEMENT_CREATED = "element.created"
    ELEMENT_MODIFIED = "element.modified"
    ELEMENT_DELETED = "element.deleted"
    
    # Relationships
    ELEMENTS_JOINED = "elements.joined"
    ELEMENT_HOSTED = "element.hosted"
    CONSTRAINT_ADDED = "constraint.added"
    
    # Views
    VIEW_CREATED = "view.created"
    SCHEDULE_GENERATED = "schedule.generated"
    
    # Collaboration
    BRANCH_CREATED = "branch.created"
    BRANCH_MERGED = "branch.merged"
    CONFLICT_RESOLVED = "conflict.resolved"

class BIMEvent(BaseModel):
    id: UUID
    event_type: EventType
    aggregate_id: UUID
    timestamp: datetime
    user_id: UUID
    branch_id: UUID
    payload: dict
    
    # Audit fields
    agent_id: UUID | None = None
    approval_id: UUID | None = None
    reasoning: str | None = None
```

### Snapshot Strategy

- **Full snapshot:** Every 1000 events or 1 hour
- **Incremental snapshot:** Per-branch, per-element-type
- **Hot cache:** Current branch head in Redis

---

## Governance & Trust Layer

### Permission Model

```python
class Permission(str, Enum):
    READ = "read"
    CREATE = "create"
    MODIFY = "modify"
    DELETE = "delete"
    APPROVE = "approve"

class PermissionScope(BaseModel):
    categories: list[str] | None = None  # e.g., ["Walls", "Doors"]
    levels: list[str] | None = None      # e.g., ["Level 1", "Level 2"]
    regions: list[BoundingBox] | None = None
    branch_patterns: list[str] | None = None

class AgentPermissions(BaseModel):
    agent_id: UUID
    permissions: dict[Permission, PermissionScope]
    requires_approval: list[EventType]
    max_elements_per_operation: int = 100
    max_operations_per_session: int = 1000
```

### Approval Gates

```python
class ApprovalGate:
    """Operations requiring human approval before execution."""
    
    DESTRUCTIVE_OPS = [
        EventType.ELEMENT_DELETED,
        EventType.BRANCH_MERGED,
    ]
    
    BULK_OPS_THRESHOLD = 50  # Elements
    
    async def check(self, operation: Operation) -> ApprovalResult:
        if operation.event_type in self.DESTRUCTIVE_OPS:
            return ApprovalResult(required=True, reason="destructive_operation")
        
        if operation.affected_count > self.BULK_OPS_THRESHOLD:
            return ApprovalResult(required=True, reason="bulk_operation")
        
        return ApprovalResult(required=False)
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Query response | <50ms | CLI instrumentation |
| Regen (1000 elements affected) | <100ms | Benchmark suite |
| Sync latency | <100ms | E2E sync test |
| Agent task completion | >90% | Evaluation harness |
| IFC round-trip | Zero semantic loss | Diff comparison |
| Model capacity | 1M+ elements | Load testing |

---

## Standards Compliance

| Standard | Version | Purpose |
|----------|---------|---------|
| IFC | 4.3 (ISO 16739-1:2024) | Canonical data format |
| BCF | 3.0 | Issue communication |
| bSDD | Latest | Data dictionary |
| IDS | 1.0 | Requirements specification |
| ISO 19650 | All parts | Information management |

---

## Development Phases

| Phase | Weeks | Deliverables |
|-------|-------|--------------|
| **Foundation** | 1-12 | Kernel + regen loop + minimal toolset |
| **Collaboration** | 13-24 | Model server + sync runtime + thin client |
| **Agentic AI** | 25-36 | MCP servers + governance + evaluation |
| **Production** | 37-48 | Hardening + scaling + IFC interop |
| **GTM** | 44-52 | Docs + community + launch |

---

## Related Documents

- [GLOSSARY.md](./GLOSSARY.md) — Canonical terminology
- [TECH_STACK.md](./TECH_STACK.md) — Technology decisions and rejections
- [SERVER_DESIGN.md](../mcp/SERVER_DESIGN.md) — MCP server architecture
- [TOOL_SURFACE.md](../mcp/TOOL_SURFACE.md) — Complete tool inventory

---

*This document is the authoritative reference for Pensaer architecture.*
*All other documents should reference and align with these decisions.*
