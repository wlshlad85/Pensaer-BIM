# Soul: Kernel Constitution (Layer A)

**Scope:** Rust geometry kernel — element graph, constraints, regen, mesh, spatial index, joins, IFC mapping.

---

## Geometry Invariants

1. **All geometry is derived from parameters.** A wall is defined by start point, end point, height, and thickness. The 3D mesh is computed, never stored as source truth.
2. **Coordinates are in meters (f64).** Unit conversion happens at the DSL/API boundary, never inside the kernel.
3. **Element IDs are UUIDs.** Generated once at creation, immutable thereafter.
4. **Bounding boxes are always current.** After any mutation, the element's AABB is recomputed before the transaction commits.
5. **Floating-point tolerance: 1e-6.** Two values within this epsilon are considered equal. Robust geometric predicates use exact arithmetic where needed (`pensaer-math::robust_predicates`).

## Element Types (10)

Wall, Door, Window, Floor, Room, Roof, Column, Beam, Stair, Opening.

Each element has:
- `id: UUID` — immutable after creation
- `element_type: ElementType` — immutable after creation
- Type-specific parameters (height, thickness, start, end, offset, width, etc.)
- Hosting relationship (door → wall, window → wall)
- Join relationships (wall → wall corners)

## Regen Contract

1. **Change propagation is DAG-ordered.** The dependency tracker maintains a directed acyclic graph. Regen walks only the affected subgraph.
2. **Regen is deterministic.** Same element state + same change = same output mesh. No randomness, no timing dependencies.
3. **Regen is transactional.** Either the entire affected subgraph updates successfully, or the transaction rolls back completely.
4. **Regen cost is O(affected), not O(model).** Proven: 10 affected elements in a 1000-element model = 13.85ms.

## Mesh Pipeline

1. **Extrusion:** 2D profile → 3D solid via `mesh::extrude`.
2. **Triangulation:** Ear-clipping for simple polygons (`mesh::triangulate`).
3. **Output:** Indexed triangle mesh (vertices + indices) suitable for Three.js/WebGL.

## Join System

1. **Detection:** `joins::detect` finds wall-wall intersections by endpoint proximity.
2. **Miter:** `joins::miter` computes corner geometry for clean visual joins.
3. **Joins are recomputed on wall mutation.** Moving a wall endpoint triggers re-detection for affected joins.

## Spatial Index

1. **Broad phase:** AABB overlap test using bounding boxes.
2. **Narrow phase:** Actual geometry intersection for candidates.
3. **Clash types:** Hard (solid overlap), Clearance (too close), Duplicate (same geometry at same location).
4. **GPU path (V2):** Morton sort for spatial locality, broadphase on wgpu.

## CRDT Merge Rules (via Loro)

1. **Loro Movable Tree** is the canonical CRDT structure. It preserves parent-child relationships (wall hosts door) during concurrent edits.
2. **Commutative edits merge automatically.** Two users modifying different elements on the same branch merge without conflict.
3. **Structural conflicts require resolution.** Simultaneous delete + modify of the same element, or reparenting conflicts, produce a conflict event that must be resolved (either automatically via last-writer-wins or via approval gate).
4. **Merge never violates the sacred invariant.** Post-merge state must pass regen. If regen fails post-merge, the merge is rejected.

## IFC Mapping

10 element types ↔ IFC entities. Export schemas: IFC2x3, IFC4, IFC4.3.

Round-trip requirement: `export(import(ifc_file))` must produce semantically equivalent output. Any loss must be reported, never silently dropped.

## Self-Healing (Fixup)

The fixup module auto-corrects minor constraint violations (e.g., door offset exceeds wall length after wall shortening). Rules:
1. Every fixup action is recorded as an event with reasoning.
2. Fixup never invents new geometry — it adjusts parameters within valid bounds.
3. If fixup cannot resolve the violation, it fails loudly and the transaction rolls back.

---

*This constitution governs all code in `kernel/`. If kernel behavior violates these rules, it's a bug.*
