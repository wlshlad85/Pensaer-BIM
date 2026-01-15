# ADR-20260115-crdt-sync-conflicts

Date: 2026-01-15
Status: Accepted
Decision: Use CRDT-based sync with explicit conflict policy.

Context:
- Offline-first collaboration requires conflict-free convergence.
- BIM element hierarchies need structured, deterministic merges.

Decision:
- Use CRDTs for structural convergence of the model hierarchy.
- For same-element edits, apply a defined conflict policy (LWW with audit).
- For different elements, merge concurrently without user intervention.

Consequences:
- Users can edit concurrently with predictable outcomes.
- Conflict policy must be transparent and explainable in audit logs.
- Some edits may still require manual resolution in edge cases.

Alternatives considered:
- Central lock-based editing (hurts offline and concurrency).
- Manual merge only (too slow for real-time workflows).
