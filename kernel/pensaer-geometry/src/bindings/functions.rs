//! Python functions for MCP tool server integration.
//!
//! These functions provide a high-level API for creating and manipulating
//! BIM elements from Python, designed for use with MCP tool servers.

use pyo3::exceptions::{PyRuntimeError, PyValueError};
use pyo3::prelude::*;
use pyo3::types::PyDict;
use pyo3::IntoPy;

use crate::elements::{OpeningType, Wall, WallOpening};
use crate::joins::JoinResolver;
use crate::mesh::TriangleMesh;

use super::types::{
    PyDoor, PyFloor, PyRoof, PyRoom, PyTriangleMesh, PyWall, PyWallJoin, PyWallOpening, PyWindow,
};

/// Create a new wall element.
///
/// Args:
///     start: Starting point as (x, y) tuple
///     end: Ending point as (x, y) tuple
///     height: Wall height in model units (typically meters)
///     thickness: Wall thickness in model units
///     wall_type: Optional wall type ("basic", "structural", "curtain", "retaining")
///
/// Returns:
///     PyWall: The created wall element
///
/// Example:
///     >>> wall = create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
///     >>> wall.length()
///     5.0
#[pyfunction]
#[pyo3(signature = (start, end, height, thickness, wall_type=None))]
pub fn create_wall(
    start: (f64, f64),
    end: (f64, f64),
    height: f64,
    thickness: f64,
    wall_type: Option<&str>,
) -> PyResult<PyWall> {
    PyWall::new(start, end, height, thickness, wall_type)
}

/// Create a rectangular floor element.
///
/// Args:
///     min_point: Minimum corner as (x, y) tuple
///     max_point: Maximum corner as (x, y) tuple
///     thickness: Floor thickness
///     floor_type: Optional floor type ("basic", "structural", "suspended", "slab_on_grade")
///
/// Returns:
///     PyFloor: The created floor element
///
/// Example:
///     >>> floor = create_floor((0, 0), (10, 8), thickness=0.3)
///     >>> floor.area()
///     80.0
#[pyfunction]
#[pyo3(signature = (min_point, max_point, thickness, floor_type=None))]
pub fn create_floor(
    min_point: (f64, f64),
    max_point: (f64, f64),
    thickness: f64,
    floor_type: Option<&str>,
) -> PyResult<PyFloor> {
    PyFloor::rectangle(min_point, max_point, thickness, floor_type)
}

/// Create a rectangular room element.
///
/// Args:
///     name: Room name (e.g., "Living Room")
///     number: Room number (e.g., "101")
///     min_point: Minimum corner as (x, y) tuple
///     max_point: Maximum corner as (x, y) tuple
///     height: Room height
///
/// Returns:
///     PyRoom: The created room element
///
/// Example:
///     >>> room = create_room("Kitchen", "102", (0, 0), (4, 3), height=2.7)
///     >>> room.area()
///     12.0
#[pyfunction]
#[pyo3(signature = (name, number, min_point, max_point, height))]
pub fn create_room(
    name: &str,
    number: &str,
    min_point: (f64, f64),
    max_point: (f64, f64),
    height: f64,
) -> PyResult<PyRoom> {
    PyRoom::rectangle(name, number, min_point, max_point, height)
}

/// Place a door in a wall.
///
/// This function creates both a door element and adds an opening to the wall.
///
/// Args:
///     wall: The wall to place the door in (will be modified)
///     offset: Distance from wall start to door center
///     width: Door width
///     height: Door height
///     door_type: Optional door type ("single", "double", "sliding", "folding", "revolving")
///     swing: Optional swing direction ("left", "right", "both", "none")
///
/// Returns:
///     dict: Contains 'door' (PyDoor) and 'opening' (PyWallOpening)
///
/// Example:
///     >>> wall = create_wall((0, 0), (5, 0), 3.0, 0.2)
///     >>> result = place_door(wall, offset=2.5, width=0.9, height=2.1)
///     >>> door = result['door']
#[pyfunction]
#[pyo3(signature = (wall, offset, width, height, door_type=None, swing=None))]
pub fn place_door(
    wall: &mut PyWall,
    offset: f64,
    width: f64,
    height: f64,
    door_type: Option<&str>,
    swing: Option<&str>,
) -> PyResult<Py<PyDict>> {
    // Create opening in wall
    let opening = WallOpening::new(offset, 0.0, width, height, OpeningType::Door);
    wall.inner
        .add_opening(opening.clone())
        .map_err(|e| PyValueError::new_err(format!("{}", e)))?;

    // Create door element
    let door = PyDoor::new(
        &wall.inner.id.to_string(),
        width,
        height,
        offset,
        door_type,
        swing,
    )?;

    // Return both as dict
    Python::with_gil(|py| {
        let dict = PyDict::new_bound(py);
        dict.set_item("door", door.into_py(py))?;
        dict.set_item("opening", PyWallOpening { inner: opening }.into_py(py))?;
        dict.set_item("wall_id", wall.inner.id.to_string())?;
        Ok(dict.unbind())
    })
}

/// Place a window in a wall.
///
/// This function creates both a window element and adds an opening to the wall.
///
/// Args:
///     wall: The wall to place the window in (will be modified)
///     offset: Distance from wall start to window center
///     width: Window width
///     height: Window height
///     sill_height: Height from floor to window sill
///     window_type: Optional window type ("fixed", "casement", "double_hung", "sliding", "awning")
///
/// Returns:
///     dict: Contains 'window' (PyWindow) and 'opening' (PyWallOpening)
///
/// Example:
///     >>> wall = create_wall((0, 0), (5, 0), 3.0, 0.2)
///     >>> result = place_window(wall, offset=1.0, width=1.2, height=1.0, sill_height=0.9)
///     >>> window = result['window']
#[pyfunction]
#[pyo3(signature = (wall, offset, width, height, sill_height, window_type=None))]
pub fn place_window(
    wall: &mut PyWall,
    offset: f64,
    width: f64,
    height: f64,
    sill_height: f64,
    window_type: Option<&str>,
) -> PyResult<Py<PyDict>> {
    // Create opening in wall
    let opening = WallOpening::new(offset, sill_height, width, height, OpeningType::Window);
    wall.inner
        .add_opening(opening.clone())
        .map_err(|e| PyValueError::new_err(format!("{}", e)))?;

    // Create window element
    let window = PyWindow::new(
        &wall.inner.id.to_string(),
        width,
        height,
        sill_height,
        offset,
        window_type,
    )?;

    // Return both as dict
    Python::with_gil(|py| {
        let dict = PyDict::new_bound(py);
        dict.set_item("window", window.into_py(py))?;
        dict.set_item("opening", PyWallOpening { inner: opening }.into_py(py))?;
        dict.set_item("wall_id", wall.inner.id.to_string())?;
        Ok(dict.unbind())
    })
}

/// Detect joins between walls.
///
/// Analyzes a set of walls and detects where they meet, classifying
/// the join type (L-join, T-join, cross-join, etc.).
///
/// Args:
///     walls: List of wall elements to analyze
///     tolerance: Distance tolerance for detecting joins (default 0.001 = 1mm)
///
/// Returns:
///     list[PyWallJoin]: Detected wall joins
///
/// Example:
///     >>> wall1 = create_wall((0, 0), (5, 0), 3.0, 0.2)
///     >>> wall2 = create_wall((5, 0), (5, 4), 3.0, 0.2)
///     >>> joins = detect_joins([wall1, wall2])
///     >>> len(joins)
///     1
///     >>> joins[0].join_type
///     'l_join'
#[pyfunction]
#[pyo3(signature = (walls, tolerance=0.001))]
pub fn detect_joins(walls: Vec<PyWall>, tolerance: f64) -> Vec<PyWallJoin> {
    let resolver = JoinResolver::new(tolerance);
    let wall_refs: Vec<&Wall> = walls.iter().map(|w| &w.inner).collect();
    resolver
        .detect_joins(&wall_refs)
        .into_iter()
        .map(|j| PyWallJoin { inner: j })
        .collect()
}

/// Compute geometry for a wall join.
///
/// Calculates the detailed geometry needed to render a clean join
/// between walls at a junction point.
///
/// Args:
///     walls: Walls participating in the join
///     join: The detected wall join
///     tolerance: Distance tolerance (default 0.001)
///
/// Returns:
///     dict: Join geometry data including modified wall profiles
///
/// Example:
///     >>> joins = detect_joins([wall1, wall2])
///     >>> geometry = compute_join_geometry([wall1, wall2], joins[0])
#[pyfunction]
#[pyo3(signature = (walls, join, tolerance=0.001))]
pub fn compute_join_geometry(
    walls: Vec<PyWall>,
    join: &PyWallJoin,
    tolerance: f64,
) -> PyResult<Py<PyDict>> {
    let resolver = JoinResolver::new(tolerance);
    let wall_refs: Vec<&Wall> = walls.iter().map(|w| &w.inner).collect();

    let geometry = resolver
        .compute_join_geometry(&wall_refs, &join.inner)
        .map_err(|e| PyRuntimeError::new_err(format!("{}", e)))?;

    Python::with_gil(|py| {
        let dict = PyDict::new_bound(py);
        dict.set_item("join_id", join.inner.id.to_string())?;
        dict.set_item("profile_count", geometry.wall_profiles.len())?;

        // Include profile data
        let profiles: Vec<Py<PyDict>> = geometry
            .wall_profiles
            .iter()
            .map(|p| {
                Python::with_gil(|py| {
                    let pd = PyDict::new_bound(py);
                    pd.set_item("wall_id", p.wall_id.to_string()).ok();
                    let corners: Vec<(f64, f64)> = p.corners.iter().map(|c| (c.x, c.y)).collect();
                    pd.set_item("corners", corners).ok();
                    pd.into()
                })
            })
            .collect();
        dict.set_item("profiles", profiles)?;

        Ok(dict.unbind())
    })
}

/// Convert a mesh to OBJ format string.
///
/// Args:
///     mesh: The triangle mesh to convert
///
/// Returns:
///     str: OBJ format string
///
/// Example:
///     >>> wall = create_wall((0, 0), (5, 0), 3.0, 0.2)
///     >>> mesh = wall.to_mesh()
///     >>> obj_string = mesh_to_obj(mesh)
///     >>> with open('wall.obj', 'w') as f:
///     ...     f.write(obj_string)
#[pyfunction]
pub fn mesh_to_obj(mesh: &PyTriangleMesh) -> String {
    mesh.inner.to_obj()
}

/// Validate a triangle mesh.
///
/// Checks that a mesh is valid (no degenerate triangles, valid indices, etc.).
///
/// Args:
///     mesh: The mesh to validate
///
/// Returns:
///     dict: Validation results including 'valid', 'vertex_count', 'triangle_count'
///
/// Example:
///     >>> mesh = wall.to_mesh()
///     >>> result = validate_mesh(mesh)
///     >>> result['valid']
///     True
#[pyfunction]
pub fn validate_mesh(mesh: &PyTriangleMesh) -> PyResult<Py<PyDict>> {
    Python::with_gil(|py| {
        let dict = PyDict::new_bound(py);
        dict.set_item("valid", mesh.inner.is_valid())?;
        dict.set_item("vertex_count", mesh.inner.vertex_count())?;
        dict.set_item("triangle_count", mesh.inner.triangle_count())?;
        dict.set_item("surface_area", mesh.inner.surface_area())?;

        if let Some(bbox) = mesh.inner.bounding_box() {
            dict.set_item(
                "bounding_box",
                (
                    (bbox.min.x, bbox.min.y, bbox.min.z),
                    (bbox.max.x, bbox.max.y, bbox.max.z),
                ),
            )?;
        }

        Ok(dict.unbind())
    })
}

/// Create walls forming a rectangular room layout.
///
/// Convenience function to create 4 walls forming a closed rectangle.
///
/// Args:
///     min_point: Minimum corner as (x, y) tuple
///     max_point: Maximum corner as (x, y) tuple
///     height: Wall height
///     thickness: Wall thickness
///
/// Returns:
///     list[PyWall]: Four walls forming the rectangle
///
/// Example:
///     >>> walls = create_rectangular_walls((0, 0), (10, 8), height=3.0, thickness=0.2)
///     >>> len(walls)
///     4
#[pyfunction]
#[pyo3(signature = (min_point, max_point, height, thickness))]
pub fn create_rectangular_walls(
    min_point: (f64, f64),
    max_point: (f64, f64),
    height: f64,
    thickness: f64,
) -> PyResult<Vec<PyWall>> {
    let (x0, y0) = min_point;
    let (x1, y1) = max_point;

    // Create 4 walls: bottom, right, top, left
    let walls = vec![
        PyWall::new((x0, y0), (x1, y0), height, thickness, None)?, // bottom
        PyWall::new((x1, y0), (x1, y1), height, thickness, None)?, // right
        PyWall::new((x1, y1), (x0, y1), height, thickness, None)?, // top
        PyWall::new((x0, y1), (x0, y0), height, thickness, None)?, // left
    ];

    Ok(walls)
}

/// Create a simple building with walls, floor, and room.
///
/// Convenience function to create a complete rectangular building shell.
///
/// Args:
///     min_point: Minimum corner as (x, y) tuple
///     max_point: Maximum corner as (x, y) tuple
///     wall_height: Height of walls
///     wall_thickness: Thickness of walls
///     floor_thickness: Thickness of floor slab
///     room_name: Name for the room
///     room_number: Number for the room
///
/// Returns:
///     dict: Contains 'walls', 'floor', 'room', and 'joins'
///
/// Example:
///     >>> building = create_simple_building((0, 0), (10, 8), 3.0, 0.2, 0.3, "Main Hall", "001")
///     >>> len(building['walls'])
///     4
#[pyfunction]
#[pyo3(signature = (min_point, max_point, wall_height, wall_thickness, floor_thickness, room_name, room_number))]
pub fn create_simple_building(
    min_point: (f64, f64),
    max_point: (f64, f64),
    wall_height: f64,
    wall_thickness: f64,
    floor_thickness: f64,
    room_name: &str,
    room_number: &str,
) -> PyResult<Py<PyDict>> {
    // Create walls
    let walls = create_rectangular_walls(min_point, max_point, wall_height, wall_thickness)?;

    // Create floor
    let floor = create_floor(min_point, max_point, floor_thickness, None)?;

    // Create room
    let room = create_room(room_name, room_number, min_point, max_point, wall_height)?;

    // Detect joins
    let joins = detect_joins(walls.clone(), 0.001);

    Python::with_gil(|py| {
        let dict = PyDict::new_bound(py);
        dict.set_item("walls", walls.into_py(py))?;
        dict.set_item("floor", floor.into_py(py))?;
        dict.set_item("room", room.into_py(py))?;
        dict.set_item("joins", joins.into_py(py))?;
        Ok(dict.unbind())
    })
}

/// Merge multiple meshes into one.
///
/// Combines multiple triangle meshes into a single mesh for efficient rendering.
///
/// Args:
///     meshes: List of meshes to merge
///
/// Returns:
///     PyTriangleMesh: Combined mesh
///
/// Example:
///     >>> walls = create_rectangular_walls((0, 0), (10, 8), 3.0, 0.2)
///     >>> meshes = [w.to_mesh() for w in walls]
///     >>> combined = merge_meshes(meshes)
#[pyfunction]
pub fn merge_meshes(meshes: Vec<PyTriangleMesh>) -> PyTriangleMesh {
    let mut combined = TriangleMesh::new();
    for mesh in meshes {
        combined.merge(&mesh.inner);
    }
    PyTriangleMesh { inner: combined }
}

/// Create a roof element.
///
/// Creates a roof that can be attached to walls. Supports multiple roof types:
/// flat, gable, hip, shed, and mansard.
///
/// Args:
///     min_point: Minimum corner as (x, y) tuple for rectangular roof
///     max_point: Maximum corner as (x, y) tuple for rectangular roof
///     thickness: Roof thickness
///     roof_type: Roof type ("flat", "gable", "hip", "shed", "mansard")
///     slope_degrees: Slope angle in degrees (default 30.0)
///     ridge_along_x: For gable/shed: ridge along X axis (True) or Y axis (False)
///     eave_overhang: Overhang at eaves in model units (default 0.3)
///
/// Returns:
///     PyRoof: The created roof element
///
/// Example:
///     >>> roof = create_roof((0, 0), (10, 8), 0.25, roof_type="gable", slope_degrees=35.0)
///     >>> roof.footprint_area()
///     80.0
#[pyfunction]
#[pyo3(signature = (min_point, max_point, thickness, roof_type="flat", slope_degrees=30.0, ridge_along_x=true, eave_overhang=0.3))]
pub fn create_roof(
    min_point: (f64, f64),
    max_point: (f64, f64),
    thickness: f64,
    roof_type: &str,
    slope_degrees: f64,
    ridge_along_x: bool,
    eave_overhang: f64,
) -> PyResult<PyRoof> {
    let mut roof = match roof_type.to_lowercase().as_str() {
        "flat" => PyRoof::rectangle(min_point, max_point, thickness, Some("flat"), Some(0.0))?,
        "gable" => PyRoof::gable(
            min_point,
            max_point,
            thickness,
            slope_degrees,
            ridge_along_x,
        )?,
        "hip" => PyRoof::hip(min_point, max_point, thickness, slope_degrees)?,
        "shed" => PyRoof::shed(
            min_point,
            max_point,
            thickness,
            slope_degrees,
            ridge_along_x,
        )?,
        "mansard" => {
            // Mansard uses gable with steeper slope
            PyRoof::gable(
                min_point,
                max_point,
                thickness,
                slope_degrees.max(60.0),
                ridge_along_x,
            )?
        }
        _ => {
            return Err(PyValueError::new_err(format!(
                "Unknown roof type: {}. Valid types: flat, gable, hip, shed, mansard",
                roof_type
            )))
        }
    };

    // Set eave overhang on the inner Roof
    roof.inner.set_eave_overhang(eave_overhang);

    Ok(roof)
}

/// Attach a roof to multiple walls.
///
/// This function associates a roof with the walls it rests on,
/// enabling proper join computation and visualization.
///
/// Args:
///     roof: The roof element to attach
///     walls: List of wall elements the roof connects to
///
/// Returns:
///     dict: Contains 'roof' (updated PyRoof), 'attached_wall_count', and 'wall_ids'
///
/// Example:
///     >>> walls = create_rectangular_walls((0, 0), (10, 8), 3.0, 0.2)
///     >>> roof = create_roof((0, 0), (10, 8), 0.25, roof_type="gable")
///     >>> result = attach_roof_to_walls(roof, walls)
///     >>> result['attached_wall_count']
///     4
#[pyfunction]
pub fn attach_roof_to_walls(mut roof: PyRoof, walls: Vec<PyWall>) -> PyResult<Py<PyDict>> {
    // Collect wall UUIDs and string IDs
    let wall_uuids: Vec<uuid::Uuid> = walls.iter().map(|w| w.inner.id).collect();
    let wall_ids: Vec<String> = wall_uuids.iter().map(|u| u.to_string()).collect();

    // Attach all walls to roof using inner Roof method
    roof.inner.attach_to_walls(&wall_uuids);

    Python::with_gil(|py| {
        let dict = PyDict::new_bound(py);
        dict.set_item("roof", roof.into_py(py))?;
        dict.set_item("attached_wall_count", wall_ids.len())?;
        dict.set_item("wall_ids", wall_ids)?;
        Ok(dict.unbind())
    })
}
