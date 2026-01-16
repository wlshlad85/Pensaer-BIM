// Allow common clippy warnings in bindings (PyO3 boilerplate)
#![allow(
    clippy::useless_conversion,
    clippy::wildcard_in_or_patterns,
    clippy::new_without_default
)]

//! PyO3 Python bindings for the Pensaer geometry kernel.
//!
//! This module provides Python wrappers for all core geometry types and operations,
//! enabling integration with MCP tool servers and the Python-based server layer.
//!
//! # Usage
//!
//! Build with the `python` feature:
//! ```bash
//! cd kernel/pensaer-geometry
//! maturin develop --features python
//! ```
//!
//! Then in Python:
//! ```python
//! import pensaer_geometry as pg
//!
//! # Create a wall
//! wall = pg.create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
//!
//! # Get mesh data
//! mesh = wall.to_mesh()
//! vertices = mesh.vertices()
//! indices = mesh.indices()
//! ```

mod functions;
mod types;

pub use functions::*;
pub use types::*;

use pyo3::prelude::*;

/// Python module for Pensaer geometry operations.
///
/// This module exposes:
/// - Math primitives: Point2, Point3, Vector2, Vector3, BoundingBox3
/// - BIM elements: Wall, Floor, Door, Window, Room
/// - Mesh operations: TriangleMesh
/// - Utility functions: create_wall, create_floor, place_door, etc.
#[pymodule]
fn pensaer_geometry(m: &Bound<'_, PyModule>) -> PyResult<()> {
    // Math types
    m.add_class::<PyPoint2>()?;
    m.add_class::<PyPoint3>()?;
    m.add_class::<PyVector2>()?;
    m.add_class::<PyVector3>()?;
    m.add_class::<PyBoundingBox3>()?;

    // Geometry elements
    m.add_class::<PyWall>()?;
    m.add_class::<PyFloor>()?;
    m.add_class::<PyRoof>()?;
    m.add_class::<PyDoor>()?;
    m.add_class::<PyWindow>()?;
    m.add_class::<PyRoom>()?;
    m.add_class::<PyWallOpening>()?;

    // Mesh
    m.add_class::<PyTriangleMesh>()?;

    // Join types
    m.add_class::<PyWallJoin>()?;
    m.add_class::<PyJoinResolver>()?;

    // Functions
    m.add_function(wrap_pyfunction!(create_wall, m)?)?;
    m.add_function(wrap_pyfunction!(create_floor, m)?)?;
    m.add_function(wrap_pyfunction!(create_room, m)?)?;
    m.add_function(wrap_pyfunction!(place_door, m)?)?;
    m.add_function(wrap_pyfunction!(place_window, m)?)?;
    m.add_function(wrap_pyfunction!(detect_joins, m)?)?;
    m.add_function(wrap_pyfunction!(compute_join_geometry, m)?)?;
    m.add_function(wrap_pyfunction!(mesh_to_obj, m)?)?;
    m.add_function(wrap_pyfunction!(validate_mesh, m)?)?;
    m.add_function(wrap_pyfunction!(create_rectangular_walls, m)?)?;
    m.add_function(wrap_pyfunction!(create_simple_building, m)?)?;
    m.add_function(wrap_pyfunction!(merge_meshes, m)?)?;
    m.add_function(wrap_pyfunction!(create_roof, m)?)?;
    m.add_function(wrap_pyfunction!(attach_roof_to_walls, m)?)?;
    m.add_function(wrap_pyfunction!(create_opening, m)?)?;
    m.add_function(wrap_pyfunction!(detect_rooms, m)?)?;
    m.add_function(wrap_pyfunction!(analyze_wall_topology, m)?)?;

    Ok(())
}
