# ADR-20260115-event-sourcing-snapshots

Date: 2026-01-15
Status: Accepted
Decision: Use event sourcing with append-only logs and periodic snapshots.

Context:
- The model server must provide auditability, replay, and deterministic regeneration.
- Branching and collaboration require a reliable history of changes.

Decision:
- Persist all writes as immutable events in an append-only log.
- Rebuild state from events and create periodic snapshots for fast loading.
- Treat snapshots as cache, not source of truth.

Consequences:
- Full audit trail and time-travel debugging.
- Replay enables deterministic verification and agent evaluation.
- Snapshot strategy must be tuned for performance and storage.

Alternatives considered:
- Direct state mutation with audit tables (weaker replay guarantees).
- EventStoreDB as a separate service (more ops complexity for MVP).
