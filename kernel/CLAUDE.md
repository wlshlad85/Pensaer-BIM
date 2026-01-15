# Pensaer Kernel - AI Navigation Guide

> **Language:** Rust
> **Model Hint:** Use **Opus 4.5** for kernel work (complex math, deep reasoning required)

## Purpose

The kernel contains the core computational logic for Pensaer:
- Geometry primitives and operations
- CRDT-based collaboration sync
- IFC import/export
- Mathematical utilities

## Crate Structure

```
kernel/
├── Cargo.toml              # Workspace root
├── pensaer-geometry/       # Wall joins, mesh generation, snapping
├── pensaer-crdt/           # Loro-based CRDT operations
├── pensaer-ifc/            # IFC 4.3 import/export via IfcOpenShell
└── pensaer-math/           # Points, vectors, transforms, intersections
```

## Key Patterns

### Error Handling
```rust
use crate::error::PensaerError;

pub fn create_wall(start: Point3, end: Point3) -> Result<Wall, PensaerError> {
    // Validate inputs
    if start == end {
        return Err(PensaerError::InvalidGeometry("Wall has zero length"));
    }
    // ...
}
```

### Geometry Primitives
- `Point3` - 3D point (x, y, z as f64)
- `Vector3` - 3D vector with operations
- `Transform` - 4x4 transformation matrix
- `BoundingBox` - AABB for spatial queries

### Wall Representation
```rust
pub struct Wall {
    pub id: Uuid,
    pub start: Point3,
    pub end: Point3,
    pub height: f64,
    pub thickness: f64,
    pub openings: Vec<Opening>,
}
```

## What You CAN Do

- Implement new geometry algorithms
- Add new element types following existing patterns
- Optimize existing computations
- Add unit tests in `tests/` subdirectories

## What You Should NOT Do

- Don't add external crates without checking `docs/architecture/TECH_STACK.md`
- Don't expose internal implementation details in public APIs
- Don't use `unwrap()` - always handle errors properly
- Don't bypass the event sourcing pattern

## Testing

```bash
cd kernel
cargo test                    # Run all tests
cargo test --package pensaer-geometry  # Test specific crate
cargo bench                   # Run benchmarks
```

## Performance Targets

| Operation | Target |
|-----------|--------|
| Wall creation | < 1ms |
| Mesh generation (single wall) | < 10ms |
| Model regeneration (1000 elements) | < 100ms |

## PyO3 Bindings

The kernel exposes Python bindings via PyO3 for the server layer. Key exports:
- `create_wall()`
- `compute_mesh()`
- `validate_geometry()`

See `pensaer-geometry/src/bindings.rs` for the Python interface.
