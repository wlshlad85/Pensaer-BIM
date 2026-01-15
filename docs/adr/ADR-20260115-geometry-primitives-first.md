# ADR-20260115-geometry-primitives-first

Date: 2026-01-15
Status: Accepted
Decision: Start geometry with analytic primitives + meshing; defer full B-rep.

Context:
- MVP needs walls, floors, openings, and basic booleans.
- Full B-rep kernel adds significant complexity and delays.

Decision:
- Implement analytic primitives for core elements.
- Use robust meshing and CGAL-backed boolean ops.
- Defer full B-rep until workflows demand it.

Consequences:
- Faster, more reliable MVP geometry.
- Limited early support for complex curved geometry.
- Clear upgrade path if advanced modeling is required.

Alternatives considered:
- Integrate a full B-rep kernel immediately.
- Use a third-party BIM kernel (breaks vendor-free goal).
