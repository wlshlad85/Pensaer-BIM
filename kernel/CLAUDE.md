# Pensaer Kernel - Rust Guidance

## Overview
Rust crates for geometry, CRDT sync, IFC parsing, and math utilities.

## Crate Structure
```
kernel/
├── pensaer-geometry/   # Core geometry primitives
├── pensaer-crdt/       # Conflict-free replicated data types
├── pensaer-ifc/        # IFC import/export
└── pensaer-math/       # Vector/matrix utilities
```

## FFI Rules (Critical)
- All public functions use `#[no_mangle]` and `extern "C"`
- Use `CString`/`CStr` for string interop
- Memory allocated in Rust must be freed in Rust
- Provide `*_free()` functions for all allocated types

## Error Handling
```rust
// Use PensaerError for all fallible operations
pub type Result<T> = std::result::Result<T, PensaerError>;

// Always provide context
fn create_wall(...) -> Result<Wall> {
    validate_params(...).context("Invalid wall parameters")?;
    // ...
}
```

## Performance
- Prefer stack allocation where possible
- Use `SmallVec` for small, dynamic collections
- Profile with `cargo flamegraph` before optimizing

## Don't
- Use `unwrap()` in library code
- Allocate in hot paths without benchmarking
- Expose raw pointers without `_free()` counterpart
