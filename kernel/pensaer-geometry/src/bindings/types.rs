//! Python wrapper types for Pensaer geometry kernel.
//!
//! This module defines PyO3 wrapper types for all core geometry primitives
//! and BIM elements, making them accessible from Python.

use pyo3::exceptions::{PyRuntimeError, PyValueError};
use pyo3::prelude::*;
use pyo3::types::PyDict;
use uuid::Uuid;

use pensaer_math::{BoundingBox3, Point2, Point3, Vector2, Vector3};

use crate::element::Element;
use crate::elements::{
    Door, DoorSwing, DoorType, Floor, FloorType, OpeningType, RidgeDirection, Roof, RoofType, Room,
    Wall, WallOpening, WallType, Window, WindowType,
};
use crate::joins::{JoinResolver, JoinType, WallJoin};
use crate::mesh::TriangleMesh;

// =============================================================================
// Math Primitive Wrappers
// =============================================================================

/// 2D point (x, y).
#[pyclass(name = "Point2")]
#[derive(Clone)]
pub struct PyPoint2 {
    pub inner: Point2,
}

#[pymethods]
impl PyPoint2 {
    #[new]
    fn new(x: f64, y: f64) -> Self {
        Self {
            inner: Point2::new(x, y),
        }
    }

    #[getter]
    fn x(&self) -> f64 {
        self.inner.x
    }

    #[getter]
    fn y(&self) -> f64 {
        self.inner.y
    }

    fn distance_to(&self, other: &PyPoint2) -> f64 {
        self.inner.distance_to(&other.inner)
    }

    fn lerp(&self, other: &PyPoint2, t: f64) -> PyPoint2 {
        PyPoint2 {
            inner: self.inner.lerp(&other.inner, t),
        }
    }

    fn __repr__(&self) -> String {
        format!("Point2({}, {})", self.inner.x, self.inner.y)
    }

    fn __add__(&self, other: &PyVector2) -> PyPoint2 {
        PyPoint2 {
            inner: self.inner + other.inner,
        }
    }

    fn __sub__(&self, other: &PyPoint2) -> PyVector2 {
        PyVector2 {
            inner: self.inner - other.inner,
        }
    }

    fn to_tuple(&self) -> (f64, f64) {
        (self.inner.x, self.inner.y)
    }
}

/// 3D point (x, y, z).
#[pyclass(name = "Point3")]
#[derive(Clone)]
pub struct PyPoint3 {
    pub inner: Point3,
}

#[pymethods]
impl PyPoint3 {
    #[new]
    fn new(x: f64, y: f64, z: f64) -> Self {
        Self {
            inner: Point3::new(x, y, z),
        }
    }

    #[getter]
    fn x(&self) -> f64 {
        self.inner.x
    }

    #[getter]
    fn y(&self) -> f64 {
        self.inner.y
    }

    #[getter]
    fn z(&self) -> f64 {
        self.inner.z
    }

    fn distance_to(&self, other: &PyPoint3) -> f64 {
        self.inner.distance_to(&other.inner)
    }

    fn lerp(&self, other: &PyPoint3, t: f64) -> PyPoint3 {
        PyPoint3 {
            inner: self.inner.lerp(&other.inner, t),
        }
    }

    fn __repr__(&self) -> String {
        format!(
            "Point3({}, {}, {})",
            self.inner.x, self.inner.y, self.inner.z
        )
    }

    fn __add__(&self, other: &PyVector3) -> PyPoint3 {
        PyPoint3 {
            inner: self.inner + other.inner,
        }
    }

    fn __sub__(&self, other: &PyPoint3) -> PyVector3 {
        PyVector3 {
            inner: self.inner - other.inner,
        }
    }

    fn to_tuple(&self) -> (f64, f64, f64) {
        (self.inner.x, self.inner.y, self.inner.z)
    }
}

/// 2D vector (x, y).
#[pyclass(name = "Vector2")]
#[derive(Clone)]
pub struct PyVector2 {
    pub inner: Vector2,
}

#[pymethods]
impl PyVector2 {
    #[new]
    fn new(x: f64, y: f64) -> Self {
        Self {
            inner: Vector2::new(x, y),
        }
    }

    #[getter]
    fn x(&self) -> f64 {
        self.inner.x
    }

    #[getter]
    fn y(&self) -> f64 {
        self.inner.y
    }

    fn length(&self) -> f64 {
        self.inner.length()
    }

    fn dot(&self, other: &PyVector2) -> f64 {
        self.inner.dot(&other.inner)
    }

    fn cross(&self, other: &PyVector2) -> f64 {
        self.inner.cross(&other.inner)
    }

    fn normalize(&self) -> PyResult<PyVector2> {
        self.inner
            .normalize()
            .map(|v| PyVector2 { inner: v })
            .map_err(|e| PyValueError::new_err(format!("{}", e)))
    }

    fn perp(&self) -> PyVector2 {
        PyVector2 {
            inner: self.inner.perp(),
        }
    }

    fn __repr__(&self) -> String {
        format!("Vector2({}, {})", self.inner.x, self.inner.y)
    }

    fn __add__(&self, other: &PyVector2) -> PyVector2 {
        PyVector2 {
            inner: self.inner + other.inner,
        }
    }

    fn __sub__(&self, other: &PyVector2) -> PyVector2 {
        PyVector2 {
            inner: self.inner - other.inner,
        }
    }

    fn __mul__(&self, scalar: f64) -> PyVector2 {
        PyVector2 {
            inner: self.inner * scalar,
        }
    }

    fn __neg__(&self) -> PyVector2 {
        PyVector2 { inner: -self.inner }
    }

    fn to_tuple(&self) -> (f64, f64) {
        (self.inner.x, self.inner.y)
    }
}

/// 3D vector (x, y, z).
#[pyclass(name = "Vector3")]
#[derive(Clone)]
pub struct PyVector3 {
    pub inner: Vector3,
}

#[pymethods]
impl PyVector3 {
    #[new]
    fn new(x: f64, y: f64, z: f64) -> Self {
        Self {
            inner: Vector3::new(x, y, z),
        }
    }

    #[getter]
    fn x(&self) -> f64 {
        self.inner.x
    }

    #[getter]
    fn y(&self) -> f64 {
        self.inner.y
    }

    #[getter]
    fn z(&self) -> f64 {
        self.inner.z
    }

    fn length(&self) -> f64 {
        self.inner.length()
    }

    fn dot(&self, other: &PyVector3) -> f64 {
        self.inner.dot(&other.inner)
    }

    fn cross(&self, other: &PyVector3) -> PyVector3 {
        PyVector3 {
            inner: self.inner.cross(&other.inner),
        }
    }

    fn normalize(&self) -> PyResult<PyVector3> {
        self.inner
            .normalize()
            .map(|v| PyVector3 { inner: v })
            .map_err(|e| PyValueError::new_err(format!("{}", e)))
    }

    fn __repr__(&self) -> String {
        format!(
            "Vector3({}, {}, {})",
            self.inner.x, self.inner.y, self.inner.z
        )
    }

    fn __add__(&self, other: &PyVector3) -> PyVector3 {
        PyVector3 {
            inner: self.inner + other.inner,
        }
    }

    fn __sub__(&self, other: &PyVector3) -> PyVector3 {
        PyVector3 {
            inner: self.inner - other.inner,
        }
    }

    fn __mul__(&self, scalar: f64) -> PyVector3 {
        PyVector3 {
            inner: self.inner * scalar,
        }
    }

    fn __neg__(&self) -> PyVector3 {
        PyVector3 { inner: -self.inner }
    }

    fn to_tuple(&self) -> (f64, f64, f64) {
        (self.inner.x, self.inner.y, self.inner.z)
    }
}

/// 3D axis-aligned bounding box.
#[pyclass(name = "BoundingBox3")]
#[derive(Clone)]
pub struct PyBoundingBox3 {
    pub inner: BoundingBox3,
}

#[pymethods]
impl PyBoundingBox3 {
    #[new]
    fn new(min: &PyPoint3, max: &PyPoint3) -> Self {
        Self {
            inner: BoundingBox3::new(min.inner, max.inner),
        }
    }

    #[getter]
    fn min(&self) -> PyPoint3 {
        PyPoint3 {
            inner: self.inner.min,
        }
    }

    #[getter]
    fn max(&self) -> PyPoint3 {
        PyPoint3 {
            inner: self.inner.max,
        }
    }

    fn center(&self) -> PyPoint3 {
        PyPoint3 {
            inner: self.inner.center(),
        }
    }

    fn size(&self) -> PyVector3 {
        PyVector3 {
            inner: self.inner.size(),
        }
    }

    fn contains_point(&self, point: &PyPoint3) -> bool {
        self.inner.contains_point(&point.inner)
    }

    fn intersects(&self, other: &PyBoundingBox3) -> bool {
        self.inner.intersects(&other.inner)
    }

    fn expand(&self, amount: f64) -> PyBoundingBox3 {
        PyBoundingBox3 {
            inner: self.inner.expand(amount),
        }
    }

    fn __repr__(&self) -> String {
        format!(
            "BoundingBox3(min=({}, {}, {}), max=({}, {}, {}))",
            self.inner.min.x,
            self.inner.min.y,
            self.inner.min.z,
            self.inner.max.x,
            self.inner.max.y,
            self.inner.max.z
        )
    }
}

// =============================================================================
// Geometry Element Wrappers
// =============================================================================

/// Wall opening (door/window cutout).
#[pyclass(name = "WallOpening")]
#[derive(Clone)]
pub struct PyWallOpening {
    pub inner: WallOpening,
}

#[pymethods]
impl PyWallOpening {
    #[new]
    #[pyo3(signature = (offset_along_wall, base_height, width, height, opening_type="generic"))]
    fn new(
        offset_along_wall: f64,
        base_height: f64,
        width: f64,
        height: f64,
        opening_type: &str,
    ) -> PyResult<Self> {
        let otype = match opening_type.to_lowercase().as_str() {
            "door" => OpeningType::Door,
            "window" => OpeningType::Window,
            "generic" | _ => OpeningType::Generic,
        };

        Ok(Self {
            inner: WallOpening::new(offset_along_wall, base_height, width, height, otype),
        })
    }

    #[getter]
    fn id(&self) -> String {
        self.inner.id.to_string()
    }

    #[getter]
    fn offset_along_wall(&self) -> f64 {
        self.inner.offset_along_wall
    }

    #[getter]
    fn base_height(&self) -> f64 {
        self.inner.base_height
    }

    #[getter]
    fn width(&self) -> f64 {
        self.inner.width
    }

    #[getter]
    fn height(&self) -> f64 {
        self.inner.height
    }

    #[getter]
    fn opening_type(&self) -> String {
        match self.inner.opening_type {
            OpeningType::Door => "door".to_string(),
            OpeningType::Window => "window".to_string(),
            OpeningType::Generic => "generic".to_string(),
        }
    }

    fn __repr__(&self) -> String {
        format!(
            "WallOpening(type={}, offset={}, width={}, height={})",
            self.opening_type(),
            self.inner.offset_along_wall,
            self.inner.width,
            self.inner.height
        )
    }
}

/// Wall BIM element.
#[pyclass(name = "Wall")]
#[derive(Clone)]
pub struct PyWall {
    pub inner: Wall,
}

#[pymethods]
impl PyWall {
    #[new]
    #[pyo3(signature = (start, end, height, thickness, wall_type=None))]
    pub fn new(
        start: (f64, f64),
        end: (f64, f64),
        height: f64,
        thickness: f64,
        wall_type: Option<&str>,
    ) -> PyResult<Self> {
        let mut wall = Wall::new(
            Point2::new(start.0, start.1),
            Point2::new(end.0, end.1),
            height,
            thickness,
        )
        .map_err(|e| PyValueError::new_err(format!("{}", e)))?;

        if let Some(wt) = wall_type {
            wall.wall_type = match wt.to_lowercase().as_str() {
                "structural" => WallType::Structural,
                "curtain" => WallType::Curtain,
                "retaining" => WallType::Retaining,
                "basic" | _ => WallType::Basic,
            };
        }

        Ok(Self { inner: wall })
    }

    #[getter]
    fn id(&self) -> String {
        self.inner.id.to_string()
    }

    #[getter]
    fn start(&self) -> PyPoint2 {
        PyPoint2 {
            inner: self.inner.baseline.start,
        }
    }

    #[getter]
    fn end(&self) -> PyPoint2 {
        PyPoint2 {
            inner: self.inner.baseline.end,
        }
    }

    #[getter]
    fn height(&self) -> f64 {
        self.inner.height
    }

    #[getter]
    fn thickness(&self) -> f64 {
        self.inner.thickness
    }

    #[getter]
    fn wall_type(&self) -> String {
        match self.inner.wall_type {
            WallType::Basic => "basic".to_string(),
            WallType::Structural => "structural".to_string(),
            WallType::Curtain => "curtain".to_string(),
            WallType::Retaining => "retaining".to_string(),
        }
    }

    fn length(&self) -> f64 {
        self.inner.length()
    }

    fn direction(&self) -> PyResult<PyVector2> {
        self.inner
            .direction()
            .map(|v| PyVector2 { inner: v })
            .map_err(|e| PyRuntimeError::new_err(format!("{}", e)))
    }

    fn normal(&self) -> PyResult<PyVector2> {
        self.inner
            .normal()
            .map(|v| PyVector2 { inner: v })
            .map_err(|e| PyRuntimeError::new_err(format!("{}", e)))
    }

    fn add_opening(&mut self, opening: &PyWallOpening) -> PyResult<()> {
        self.inner
            .add_opening(opening.inner.clone())
            .map_err(|e| PyValueError::new_err(format!("{}", e)))
    }

    fn remove_opening(&mut self, opening_id: &str) -> PyResult<bool> {
        let uuid = Uuid::parse_str(opening_id)
            .map_err(|e| PyValueError::new_err(format!("Invalid UUID: {}", e)))?;
        Ok(self.inner.remove_opening(uuid))
    }

    #[getter]
    fn openings(&self) -> Vec<PyWallOpening> {
        self.inner
            .openings
            .iter()
            .map(|o| PyWallOpening { inner: o.clone() })
            .collect()
    }

    fn to_mesh(&self) -> PyResult<PyTriangleMesh> {
        self.inner
            .to_mesh()
            .map(|m| PyTriangleMesh { inner: m })
            .map_err(|e| PyRuntimeError::new_err(format!("{}", e)))
    }

    fn bounding_box(&self) -> PyResult<PyBoundingBox3> {
        self.inner
            .bounding_box()
            .map(|b| PyBoundingBox3 { inner: b })
            .map_err(|e| PyRuntimeError::new_err(format!("{}", e)))
    }

    fn to_dict(&self) -> PyResult<Py<PyDict>> {
        Python::with_gil(|py| {
            let dict = PyDict::new_bound(py);
            dict.set_item("id", self.inner.id.to_string())?;
            dict.set_item(
                "start",
                (self.inner.baseline.start.x, self.inner.baseline.start.y),
            )?;
            dict.set_item(
                "end",
                (self.inner.baseline.end.x, self.inner.baseline.end.y),
            )?;
            dict.set_item("height", self.inner.height)?;
            dict.set_item("thickness", self.inner.thickness)?;
            dict.set_item("wall_type", self.wall_type())?;
            dict.set_item("length", self.inner.length())?;
            dict.set_item("openings_count", self.inner.openings.len())?;
            Ok(dict.unbind())
        })
    }

    fn __repr__(&self) -> String {
        format!(
            "Wall(id={}, start=({}, {}), end=({}, {}), height={}, thickness={})",
            self.inner.id,
            self.inner.baseline.start.x,
            self.inner.baseline.start.y,
            self.inner.baseline.end.x,
            self.inner.baseline.end.y,
            self.inner.height,
            self.inner.thickness
        )
    }
}

/// Floor BIM element.
#[pyclass(name = "Floor")]
#[derive(Clone)]
pub struct PyFloor {
    pub inner: Floor,
}

#[pymethods]
impl PyFloor {
    /// Create a rectangular floor.
    #[staticmethod]
    #[pyo3(signature = (min_point, max_point, thickness, floor_type=None))]
    pub fn rectangle(
        min_point: (f64, f64),
        max_point: (f64, f64),
        thickness: f64,
        floor_type: Option<&str>,
    ) -> PyResult<Self> {
        let mut floor = Floor::rectangle(
            Point2::new(min_point.0, min_point.1),
            Point2::new(max_point.0, max_point.1),
            thickness,
        )
        .map_err(|e| PyValueError::new_err(format!("{}", e)))?;

        if let Some(ft) = floor_type {
            floor.floor_type = match ft.to_lowercase().as_str() {
                "foundation" => FloorType::Foundation,
                "suspended" => FloorType::Suspended,
                "slab" | _ => FloorType::Slab,
            };
        }

        Ok(Self { inner: floor })
    }

    #[getter]
    fn id(&self) -> String {
        self.inner.id.to_string()
    }

    #[getter]
    fn thickness(&self) -> f64 {
        self.inner.thickness
    }

    #[getter]
    fn base_elevation(&self) -> f64 {
        self.inner.base_elevation
    }

    #[getter]
    fn floor_type(&self) -> String {
        match self.inner.floor_type {
            FloorType::Slab => "slab".to_string(),
            FloorType::Suspended => "suspended".to_string(),
            FloorType::Foundation => "foundation".to_string(),
        }
    }

    fn area(&self) -> f64 {
        self.inner.area()
    }

    fn perimeter(&self) -> f64 {
        self.inner.perimeter()
    }

    fn to_mesh(&self) -> PyResult<PyTriangleMesh> {
        self.inner
            .to_mesh()
            .map(|m| PyTriangleMesh { inner: m })
            .map_err(|e| PyRuntimeError::new_err(format!("{}", e)))
    }

    fn to_dict(&self) -> PyResult<Py<PyDict>> {
        Python::with_gil(|py| {
            let dict = PyDict::new_bound(py);
            dict.set_item("id", self.inner.id.to_string())?;
            dict.set_item("thickness", self.inner.thickness)?;
            dict.set_item("base_elevation", self.inner.base_elevation)?;
            dict.set_item("floor_type", self.floor_type())?;
            dict.set_item("area", self.inner.area())?;
            dict.set_item("perimeter", self.inner.perimeter())?;
            Ok(dict.unbind())
        })
    }

    fn __repr__(&self) -> String {
        format!(
            "Floor(id={}, area={:.2}, thickness={})",
            self.inner.id,
            self.inner.area(),
            self.inner.thickness
        )
    }
}

/// Door BIM element.
#[pyclass(name = "Door")]
#[derive(Clone)]
pub struct PyDoor {
    pub inner: Door,
}

#[pymethods]
impl PyDoor {
    #[new]
    #[pyo3(signature = (host_wall_id, width, height, offset_along_wall, door_type=None, swing=None))]
    pub fn new(
        host_wall_id: &str,
        width: f64,
        height: f64,
        offset_along_wall: f64,
        door_type: Option<&str>,
        swing: Option<&str>,
    ) -> PyResult<Self> {
        let wall_id = Uuid::parse_str(host_wall_id)
            .map_err(|e| PyValueError::new_err(format!("Invalid UUID: {}", e)))?;

        let mut door = Door::new(wall_id, width, height, offset_along_wall)
            .map_err(|e| PyValueError::new_err(format!("{}", e)))?;

        if let Some(dt) = door_type {
            door.door_type = match dt.to_lowercase().as_str() {
                "double" => DoorType::Double,
                "sliding" => DoorType::Sliding,
                "folding" => DoorType::Folding,
                "revolving" => DoorType::Revolving,
                "pocket" => DoorType::Pocket,
                "single" | _ => DoorType::Single,
            };
        }

        if let Some(s) = swing {
            door.swing = match s.to_lowercase().as_str() {
                "right" => DoorSwing::Right,
                "both" => DoorSwing::Both,
                "none" => DoorSwing::None,
                "left" | _ => DoorSwing::Left,
            };
        }

        Ok(Self { inner: door })
    }

    #[getter]
    fn id(&self) -> String {
        self.inner.id.to_string()
    }

    #[getter]
    fn host_wall_id(&self) -> String {
        self.inner.host_wall_id.to_string()
    }

    #[getter]
    fn width(&self) -> f64 {
        self.inner.width
    }

    #[getter]
    fn height(&self) -> f64 {
        self.inner.height
    }

    #[getter]
    fn offset_along_wall(&self) -> f64 {
        self.inner.offset_along_wall
    }

    #[getter]
    fn door_type(&self) -> String {
        match self.inner.door_type {
            DoorType::Single => "single".to_string(),
            DoorType::Double => "double".to_string(),
            DoorType::Sliding => "sliding".to_string(),
            DoorType::Folding => "folding".to_string(),
            DoorType::Revolving => "revolving".to_string(),
            DoorType::Pocket => "pocket".to_string(),
        }
    }

    #[getter]
    fn swing(&self) -> String {
        match self.inner.swing {
            DoorSwing::Left => "left".to_string(),
            DoorSwing::Right => "right".to_string(),
            DoorSwing::Both => "both".to_string(),
            DoorSwing::None => "none".to_string(),
        }
    }

    fn __repr__(&self) -> String {
        format!(
            "Door(id={}, width={}, height={}, type={})",
            self.inner.id,
            self.inner.width,
            self.inner.height,
            self.door_type()
        )
    }
}

/// Window BIM element.
#[pyclass(name = "Window")]
#[derive(Clone)]
pub struct PyWindow {
    pub inner: Window,
}

#[pymethods]
impl PyWindow {
    #[new]
    #[pyo3(signature = (host_wall_id, width, height, sill_height, offset_along_wall, window_type=None))]
    pub fn new(
        host_wall_id: &str,
        width: f64,
        height: f64,
        sill_height: f64,
        offset_along_wall: f64,
        window_type: Option<&str>,
    ) -> PyResult<Self> {
        let wall_id = Uuid::parse_str(host_wall_id)
            .map_err(|e| PyValueError::new_err(format!("Invalid UUID: {}", e)))?;

        let mut window = Window::new(wall_id, width, height, sill_height, offset_along_wall)
            .map_err(|e| PyValueError::new_err(format!("{}", e)))?;

        if let Some(wt) = window_type {
            window.window_type = match wt.to_lowercase().as_str() {
                "casement" => WindowType::Casement,
                "double_hung" => WindowType::DoubleHung,
                "sliding" => WindowType::Sliding,
                "awning" => WindowType::Awning,
                "hopper" => WindowType::Hopper,
                "pivot" => WindowType::Pivot,
                "fixed" | _ => WindowType::Fixed,
            };
        }

        Ok(Self { inner: window })
    }

    #[getter]
    fn id(&self) -> String {
        self.inner.id.to_string()
    }

    #[getter]
    fn host_wall_id(&self) -> String {
        self.inner.host_wall_id.to_string()
    }

    #[getter]
    fn width(&self) -> f64 {
        self.inner.width
    }

    #[getter]
    fn height(&self) -> f64 {
        self.inner.height
    }

    #[getter]
    fn sill_height(&self) -> f64 {
        self.inner.sill_height
    }

    #[getter]
    fn offset_along_wall(&self) -> f64 {
        self.inner.offset_along_wall
    }

    #[getter]
    fn window_type(&self) -> String {
        match self.inner.window_type {
            WindowType::Fixed => "fixed".to_string(),
            WindowType::Casement => "casement".to_string(),
            WindowType::DoubleHung => "double_hung".to_string(),
            WindowType::Sliding => "sliding".to_string(),
            WindowType::Awning => "awning".to_string(),
            WindowType::Hopper => "hopper".to_string(),
            WindowType::Pivot => "pivot".to_string(),
        }
    }

    fn __repr__(&self) -> String {
        format!(
            "Window(id={}, width={}, height={}, sill={}, type={})",
            self.inner.id,
            self.inner.width,
            self.inner.height,
            self.inner.sill_height,
            self.window_type()
        )
    }
}

/// Room BIM element.
#[pyclass(name = "Room")]
#[derive(Clone)]
pub struct PyRoom {
    pub inner: Room,
}

#[pymethods]
impl PyRoom {
    /// Create a rectangular room.
    #[staticmethod]
    #[pyo3(signature = (name, number, min_point, max_point, height))]
    pub fn rectangle(
        name: &str,
        number: &str,
        min_point: (f64, f64),
        max_point: (f64, f64),
        height: f64,
    ) -> PyResult<Self> {
        let room = Room::rectangle(
            name,
            number,
            Point2::new(min_point.0, min_point.1),
            Point2::new(max_point.0, max_point.1),
            height,
        )
        .map_err(|e| PyValueError::new_err(format!("{}", e)))?;

        Ok(Self { inner: room })
    }

    #[getter]
    fn id(&self) -> String {
        self.inner.id.to_string()
    }

    #[getter]
    fn name(&self) -> String {
        self.inner.name.clone()
    }

    #[getter]
    fn number(&self) -> String {
        self.inner.number.clone()
    }

    #[getter]
    fn height(&self) -> f64 {
        self.inner.height
    }

    fn area(&self) -> f64 {
        self.inner.area()
    }

    fn perimeter(&self) -> f64 {
        self.inner.perimeter()
    }

    fn volume(&self) -> f64 {
        self.inner.volume()
    }

    fn centroid(&self) -> PyPoint3 {
        PyPoint3 {
            inner: self.inner.centroid(),
        }
    }

    /// Check if a 2D point (x, y) is inside the room boundary (ignores height).
    fn contains_point_2d(&self, point: (f64, f64)) -> bool {
        self.inner.contains_point_2d(&Point2::new(point.0, point.1))
    }

    /// Check if a 3D point (x, y, z) is inside the room volume.
    fn contains_point(&self, point: (f64, f64, f64)) -> bool {
        self.inner
            .contains_point(&Point3::new(point.0, point.1, point.2))
    }

    fn to_mesh(&self) -> PyResult<PyTriangleMesh> {
        self.inner
            .to_mesh()
            .map(|m| PyTriangleMesh { inner: m })
            .map_err(|e| PyRuntimeError::new_err(format!("{}", e)))
    }

    fn to_dict(&self) -> PyResult<Py<PyDict>> {
        Python::with_gil(|py| {
            let dict = PyDict::new_bound(py);
            dict.set_item("id", self.inner.id.to_string())?;
            dict.set_item("name", self.inner.name.clone())?;
            dict.set_item("number", self.inner.number.clone())?;
            dict.set_item("height", self.inner.height)?;
            dict.set_item("area", self.inner.area())?;
            dict.set_item("perimeter", self.inner.perimeter())?;
            dict.set_item("volume", self.inner.volume())?;
            Ok(dict.unbind())
        })
    }

    fn __repr__(&self) -> String {
        format!(
            "Room(id={}, name=\"{}\", number=\"{}\", area={:.2})",
            self.inner.id,
            self.inner.name,
            self.inner.number,
            self.inner.area()
        )
    }
}

// =============================================================================
// Mesh Wrapper
// =============================================================================

/// Triangle mesh for 3D visualization.
#[pyclass(name = "TriangleMesh")]
#[derive(Clone)]
pub struct PyTriangleMesh {
    pub inner: TriangleMesh,
}

#[pymethods]
impl PyTriangleMesh {
    fn vertex_count(&self) -> usize {
        self.inner.vertex_count()
    }

    fn triangle_count(&self) -> usize {
        self.inner.triangle_count()
    }

    fn is_valid(&self) -> bool {
        self.inner.is_valid()
    }

    fn surface_area(&self) -> f64 {
        self.inner.surface_area()
    }

    /// Get vertices as list of (x, y, z) tuples.
    fn vertices(&self) -> Vec<(f64, f64, f64)> {
        self.inner
            .vertices
            .iter()
            .map(|p| (p.x, p.y, p.z))
            .collect()
    }

    /// Get triangle indices as list of [i0, i1, i2] arrays.
    fn indices(&self) -> Vec<[u32; 3]> {
        self.inner.indices.clone()
    }

    /// Get normals as list of (x, y, z) tuples.
    fn normals(&self) -> Vec<(f64, f64, f64)> {
        self.inner.normals.iter().map(|v| (v.x, v.y, v.z)).collect()
    }

    fn bounding_box(&self) -> Option<PyBoundingBox3> {
        self.inner
            .bounding_box()
            .map(|b| PyBoundingBox3 { inner: b })
    }

    /// Export mesh to OBJ format string.
    fn to_obj(&self) -> String {
        self.inner.to_obj()
    }

    fn __repr__(&self) -> String {
        format!(
            "TriangleMesh(vertices={}, triangles={}, valid={})",
            self.inner.vertex_count(),
            self.inner.triangle_count(),
            self.inner.is_valid()
        )
    }
}

// =============================================================================
// Wall Join Wrappers
// =============================================================================

/// Detected wall join.
#[pyclass(name = "WallJoin")]
#[derive(Clone)]
pub struct PyWallJoin {
    pub inner: WallJoin,
}

#[pymethods]
impl PyWallJoin {
    #[getter]
    fn id(&self) -> String {
        self.inner.id.to_string()
    }

    #[getter]
    fn join_type(&self) -> String {
        match self.inner.join_type {
            JoinType::Butt => "butt".to_string(),
            JoinType::Miter => "miter".to_string(),
            JoinType::LJoin => "l_join".to_string(),
            JoinType::TJoin => "t_join".to_string(),
            JoinType::CrossJoin => "cross_join".to_string(),
            JoinType::None => "none".to_string(),
        }
    }

    #[getter]
    fn join_point(&self) -> PyPoint2 {
        PyPoint2 {
            inner: self.inner.join_point,
        }
    }

    #[getter]
    fn wall_ids(&self) -> Vec<String> {
        self.inner
            .wall_ids
            .iter()
            .map(|id| id.to_string())
            .collect()
    }

    fn __repr__(&self) -> String {
        format!(
            "WallJoin(type={}, point=({}, {}), walls={})",
            self.join_type(),
            self.inner.join_point.x,
            self.inner.join_point.y,
            self.inner.wall_ids.len()
        )
    }
}

/// Wall join resolver.
#[pyclass(name = "JoinResolver")]
pub struct PyJoinResolver {
    inner: JoinResolver,
}

#[pymethods]
impl PyJoinResolver {
    #[new]
    #[pyo3(signature = (tolerance=0.001))]
    fn new(tolerance: f64) -> Self {
        Self {
            inner: JoinResolver::new(tolerance),
        }
    }

    fn detect_joins(&self, walls: Vec<PyWall>) -> Vec<PyWallJoin> {
        let wall_refs: Vec<&Wall> = walls.iter().map(|w| &w.inner).collect();
        self.inner
            .detect_joins(&wall_refs)
            .into_iter()
            .map(|j| PyWallJoin { inner: j })
            .collect()
    }

    fn __repr__(&self) -> String {
        "JoinResolver()".to_string()
    }
}

// =============================================================================
// Roof Element Wrapper
// =============================================================================

/// Roof BIM element wrapper.
#[pyclass(name = "Roof")]
#[derive(Clone)]
pub struct PyRoof {
    pub inner: Roof,
}

#[pymethods]
impl PyRoof {
    /// Create a flat rectangular roof.
    #[staticmethod]
    #[pyo3(signature = (min_point, max_point, thickness, roof_type=None, slope_degrees=None))]
    pub fn rectangle(
        min_point: (f64, f64),
        max_point: (f64, f64),
        thickness: f64,
        roof_type: Option<&str>,
        slope_degrees: Option<f64>,
    ) -> PyResult<Self> {
        let mut roof = Roof::rectangle(
            Point2::new(min_point.0, min_point.1),
            Point2::new(max_point.0, max_point.1),
            thickness,
        )
        .map_err(|e| PyValueError::new_err(format!("{}", e)))?;

        if let Some(rt) = roof_type {
            let rtype = match rt.to_lowercase().as_str() {
                "gable" => RoofType::Gable,
                "hip" => RoofType::Hip,
                "shed" => RoofType::Shed,
                "mansard" => RoofType::Mansard,
                "flat" | _ => RoofType::Flat,
            };
            let slope = slope_degrees.unwrap_or(match rtype {
                RoofType::Flat => 0.0,
                _ => 30.0, // Default 30 degrees for pitched roofs
            });
            roof.set_type(rtype, slope);
        }

        Ok(Self { inner: roof })
    }

    /// Create a gable roof.
    #[staticmethod]
    #[pyo3(signature = (min_point, max_point, thickness, slope_degrees, ridge_along_x=true))]
    pub fn gable(
        min_point: (f64, f64),
        max_point: (f64, f64),
        thickness: f64,
        slope_degrees: f64,
        ridge_along_x: bool,
    ) -> PyResult<Self> {
        let ridge_direction = if ridge_along_x {
            RidgeDirection::AlongX
        } else {
            RidgeDirection::AlongY
        };

        let roof = Roof::gable(
            Point2::new(min_point.0, min_point.1),
            Point2::new(max_point.0, max_point.1),
            thickness,
            slope_degrees,
            ridge_direction,
        )
        .map_err(|e| PyValueError::new_err(format!("{}", e)))?;

        Ok(Self { inner: roof })
    }

    /// Create a hip roof.
    #[staticmethod]
    #[pyo3(signature = (min_point, max_point, thickness, slope_degrees))]
    pub fn hip(
        min_point: (f64, f64),
        max_point: (f64, f64),
        thickness: f64,
        slope_degrees: f64,
    ) -> PyResult<Self> {
        let roof = Roof::hip(
            Point2::new(min_point.0, min_point.1),
            Point2::new(max_point.0, max_point.1),
            thickness,
            slope_degrees,
        )
        .map_err(|e| PyValueError::new_err(format!("{}", e)))?;

        Ok(Self { inner: roof })
    }

    /// Create a shed (single-slope) roof.
    #[staticmethod]
    #[pyo3(signature = (min_point, max_point, thickness, slope_degrees, slope_faces_south=true))]
    pub fn shed(
        min_point: (f64, f64),
        max_point: (f64, f64),
        thickness: f64,
        slope_degrees: f64,
        slope_faces_south: bool,
    ) -> PyResult<Self> {
        let ridge_direction = if slope_faces_south {
            RidgeDirection::AlongX
        } else {
            RidgeDirection::AlongY
        };

        let roof = Roof::shed(
            Point2::new(min_point.0, min_point.1),
            Point2::new(max_point.0, max_point.1),
            thickness,
            slope_degrees,
            ridge_direction,
        )
        .map_err(|e| PyValueError::new_err(format!("{}", e)))?;

        Ok(Self { inner: roof })
    }

    #[getter]
    fn id(&self) -> String {
        self.inner.id.to_string()
    }

    #[getter]
    fn thickness(&self) -> f64 {
        self.inner.thickness
    }

    #[getter]
    fn base_elevation(&self) -> f64 {
        self.inner.base_elevation
    }

    #[getter]
    fn slope_degrees(&self) -> f64 {
        self.inner.slope_degrees
    }

    #[getter]
    fn eave_overhang(&self) -> f64 {
        self.inner.eave_overhang
    }

    #[getter]
    fn roof_type(&self) -> String {
        self.inner.roof_type.name().to_lowercase()
    }

    fn set_elevation(&mut self, elevation: f64) {
        self.inner.set_elevation(elevation);
    }

    fn set_eave_overhang(&mut self, overhang: f64) {
        self.inner.set_eave_overhang(overhang);
    }

    fn footprint_area(&self) -> f64 {
        self.inner.footprint_area()
    }

    fn surface_area(&self) -> f64 {
        self.inner.surface_area()
    }

    fn perimeter(&self) -> f64 {
        self.inner.perimeter()
    }

    fn ridge_height(&self) -> f64 {
        self.inner.ridge_height()
    }

    fn top_elevation(&self) -> f64 {
        self.inner.top_elevation()
    }

    /// Attach roof to a wall by its UUID string.
    fn attach_to_wall(&mut self, wall_id: &str) -> PyResult<()> {
        let uuid = Uuid::parse_str(wall_id)
            .map_err(|e| PyValueError::new_err(format!("Invalid UUID: {}", e)))?;
        self.inner.attach_to_wall(uuid);
        Ok(())
    }

    /// Attach roof to multiple walls by their UUID strings.
    fn attach_to_walls(&mut self, wall_ids: Vec<String>) -> PyResult<()> {
        let uuids: Result<Vec<Uuid>, _> = wall_ids.iter().map(|s| Uuid::parse_str(s)).collect();
        let uuids = uuids.map_err(|e| PyValueError::new_err(format!("Invalid UUID: {}", e)))?;
        self.inner.attach_to_walls(&uuids);
        Ok(())
    }

    /// Detach roof from a wall.
    fn detach_from_wall(&mut self, wall_id: &str) -> PyResult<bool> {
        let uuid = Uuid::parse_str(wall_id)
            .map_err(|e| PyValueError::new_err(format!("Invalid UUID: {}", e)))?;
        Ok(self.inner.detach_from_wall(uuid))
    }

    /// Check if roof is attached to a wall.
    fn is_attached_to(&self, wall_id: &str) -> PyResult<bool> {
        let uuid = Uuid::parse_str(wall_id)
            .map_err(|e| PyValueError::new_err(format!("Invalid UUID: {}", e)))?;
        Ok(self.inner.is_attached_to(uuid))
    }

    /// Get list of attached wall UUIDs.
    fn attached_wall_ids(&self) -> Vec<String> {
        self.inner
            .attached_walls()
            .iter()
            .map(|u| u.to_string())
            .collect()
    }

    fn to_mesh(&self) -> PyResult<PyTriangleMesh> {
        self.inner
            .to_mesh()
            .map(|m| PyTriangleMesh { inner: m })
            .map_err(|e| PyRuntimeError::new_err(format!("{}", e)))
    }

    fn to_dict(&self) -> PyResult<Py<PyDict>> {
        Python::with_gil(|py| {
            let dict = PyDict::new_bound(py);
            dict.set_item("id", self.inner.id.to_string())?;
            dict.set_item("thickness", self.inner.thickness)?;
            dict.set_item("base_elevation", self.inner.base_elevation)?;
            dict.set_item("roof_type", self.roof_type())?;
            dict.set_item("slope_degrees", self.inner.slope_degrees)?;
            dict.set_item("eave_overhang", self.inner.eave_overhang)?;
            dict.set_item("footprint_area", self.inner.footprint_area())?;
            dict.set_item("surface_area", self.inner.surface_area())?;
            dict.set_item("ridge_height", self.inner.ridge_height())?;
            dict.set_item("attached_wall_ids", self.attached_wall_ids())?;
            Ok(dict.unbind())
        })
    }

    fn __repr__(&self) -> String {
        format!(
            "Roof(id={}, type={}, slope={}°, area={:.2})",
            self.inner.id,
            self.roof_type(),
            self.inner.slope_degrees,
            self.inner.footprint_area()
        )
    }
}
