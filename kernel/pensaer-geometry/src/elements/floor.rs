//! Floor element for BIM modeling.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use pensaer_math::{BoundingBox3, Point2, Point3, Polygon2};

use crate::element::{Element, ElementMetadata, ElementType};
use crate::error::{GeometryError, GeometryResult};
use crate::mesh::TriangleMesh;

/// Type of floor construction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FloorType {
    /// Standard floor slab.
    Slab,
    /// Suspended floor.
    Suspended,
    /// Foundation slab.
    Foundation,
}

impl Default for FloorType {
    fn default() -> Self {
        Self::Slab
    }
}

/// A floor element in the BIM model.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Floor {
    /// Unique identifier.
    pub id: Uuid,
    /// Floor boundary polygon.
    pub boundary: Polygon2,
    /// Floor thickness.
    pub thickness: f64,
    /// Base elevation (Z coordinate of bottom face).
    pub base_elevation: f64,
    /// Floor type.
    pub floor_type: FloorType,
    /// Holes/cutouts in the floor.
    pub holes: Vec<Polygon2>,
    /// Metadata.
    pub metadata: ElementMetadata,
}

impl Floor {
    /// Create a new floor from a boundary polygon.
    pub fn new(boundary: Polygon2, thickness: f64) -> GeometryResult<Self> {
        if thickness <= 0.0 {
            return Err(GeometryError::NonPositiveThickness);
        }
        boundary
            .validate()
            .map_err(|_| GeometryError::InsufficientVertices)?;

        Ok(Self {
            id: Uuid::new_v4(),
            boundary,
            thickness,
            base_elevation: 0.0,
            floor_type: FloorType::default(),
            holes: Vec::new(),
            metadata: ElementMetadata::new(),
        })
    }

    /// Create a rectangular floor.
    pub fn rectangle(min: Point2, max: Point2, thickness: f64) -> GeometryResult<Self> {
        if min.x >= max.x || min.y >= max.y {
            return Err(GeometryError::InvalidFloorBounds);
        }
        let boundary = Polygon2::rectangle(min, max);
        Self::new(boundary, thickness)
    }

    /// Create a floor with specific ID.
    pub fn with_id(id: Uuid, boundary: Polygon2, thickness: f64) -> GeometryResult<Self> {
        let mut floor = Self::new(boundary, thickness)?;
        floor.id = id;
        Ok(floor)
    }

    /// Set base elevation.
    pub fn set_elevation(&mut self, elevation: f64) {
        self.base_elevation = elevation;
    }

    /// Top elevation of the floor.
    pub fn top_elevation(&self) -> f64 {
        self.base_elevation + self.thickness
    }

    /// Area of the floor (excluding holes).
    pub fn area(&self) -> f64 {
        let gross_area = self.boundary.area();
        let hole_area: f64 = self.holes.iter().map(|h| h.area()).sum();
        gross_area - hole_area
    }

    /// Perimeter of the floor boundary.
    pub fn perimeter(&self) -> f64 {
        self.boundary.perimeter()
    }

    /// Add a hole/cutout to the floor.
    pub fn add_hole(&mut self, hole: Polygon2) -> GeometryResult<()> {
        hole.validate()
            .map_err(|_| GeometryError::InsufficientVertices)?;
        self.holes.push(hole);
        Ok(())
    }

    /// Remove a hole by index.
    pub fn remove_hole(&mut self, index: usize) -> bool {
        if index < self.holes.len() {
            self.holes.remove(index);
            true
        } else {
            false
        }
    }

    /// Generate mesh (simplified - no holes).
    pub fn to_mesh_simple(&self) -> GeometryResult<TriangleMesh> {
        // For now, use simple rectangular extrusion
        // Full polygon triangulation will be added later
        let bbox = self
            .boundary
            .bounding_box()
            .ok_or(GeometryError::InsufficientVertices)?;

        let z0 = self.base_elevation;
        let z1 = self.top_elevation();

        let corners = [
            Point2::new(bbox.min.x, bbox.min.y),
            Point2::new(bbox.max.x, bbox.min.y),
            Point2::new(bbox.max.x, bbox.max.y),
            Point2::new(bbox.min.x, bbox.max.y),
        ];

        let vertices = vec![
            Point3::new(corners[0].x, corners[0].y, z0),
            Point3::new(corners[1].x, corners[1].y, z0),
            Point3::new(corners[2].x, corners[2].y, z0),
            Point3::new(corners[3].x, corners[3].y, z0),
            Point3::new(corners[0].x, corners[0].y, z1),
            Point3::new(corners[1].x, corners[1].y, z1),
            Point3::new(corners[2].x, corners[2].y, z1),
            Point3::new(corners[3].x, corners[3].y, z1),
        ];

        let indices = vec![
            // Bottom (facing down)
            [0, 2, 1],
            [0, 3, 2],
            // Top (facing up)
            [4, 5, 6],
            [4, 6, 7],
            // Front
            [0, 1, 5],
            [0, 5, 4],
            // Back
            [2, 3, 7],
            [2, 7, 6],
            // Left
            [0, 4, 7],
            [0, 7, 3],
            // Right
            [1, 2, 6],
            [1, 6, 5],
        ];

        Ok(TriangleMesh::from_vertices_indices(vertices, indices))
    }

    /// Generate mesh with boundary shape (uses simple triangulation).
    fn to_mesh_from_boundary(&self) -> GeometryResult<TriangleMesh> {
        let n = self.boundary.vertex_count();
        if n < 3 {
            return Err(GeometryError::InsufficientVertices);
        }

        let z0 = self.base_elevation;
        let z1 = self.top_elevation();

        // Create vertices: bottom ring + top ring
        let mut vertices = Vec::with_capacity(n * 2);
        for v in &self.boundary.vertices {
            vertices.push(Point3::new(v.x, v.y, z0));
        }
        for v in &self.boundary.vertices {
            vertices.push(Point3::new(v.x, v.y, z1));
        }

        let mut indices = Vec::new();

        // Fan triangulation for top and bottom (works for convex polygons)
        // For concave polygons, proper triangulation needed
        for i in 1..n - 1 {
            // Bottom face (CCW when viewed from below)
            indices.push([0, (i + 1) as u32, i as u32]);
            // Top face (CCW when viewed from above)
            let offset = n as u32;
            indices.push([offset, offset + i as u32, offset + (i + 1) as u32]);
        }

        // Side faces
        for i in 0..n {
            let next = (i + 1) % n;
            let i0 = i as u32;
            let i1 = next as u32;
            let i2 = (n + next) as u32;
            let i3 = (n + i) as u32;

            indices.push([i0, i1, i2]);
            indices.push([i0, i2, i3]);
        }

        Ok(TriangleMesh::from_vertices_indices(vertices, indices))
    }
}

impl Element for Floor {
    fn id(&self) -> Uuid {
        self.id
    }

    fn element_type(&self) -> ElementType {
        ElementType::Floor
    }

    fn bounding_box(&self) -> GeometryResult<BoundingBox3> {
        let bbox2 = self
            .boundary
            .bounding_box()
            .ok_or(GeometryError::InsufficientVertices)?;

        Ok(BoundingBox3::new(
            Point3::new(bbox2.min.x, bbox2.min.y, self.base_elevation),
            Point3::new(bbox2.max.x, bbox2.max.y, self.top_elevation()),
        ))
    }

    fn to_mesh(&self) -> GeometryResult<TriangleMesh> {
        if self.boundary.is_convex() {
            self.to_mesh_from_boundary()
        } else {
            // Fall back to bounding box for non-convex polygons
            // until proper triangulation is implemented
            self.to_mesh_simple()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn floor_rectangle_creation() {
        let floor = Floor::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        assert!((floor.area() - 100.0).abs() < 1e-10);
        assert!((floor.thickness - 0.3).abs() < 1e-10);
    }

    #[test]
    fn floor_invalid_bounds() {
        let result = Floor::rectangle(Point2::new(10.0, 0.0), Point2::new(0.0, 10.0), 0.3);
        assert!(matches!(result, Err(GeometryError::InvalidFloorBounds)));
    }

    #[test]
    fn floor_non_positive_thickness() {
        let result = Floor::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.0);
        assert!(matches!(result, Err(GeometryError::NonPositiveThickness)));
    }

    #[test]
    fn floor_elevation() {
        let mut floor =
            Floor::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        floor.set_elevation(5.0);
        assert!((floor.base_elevation - 5.0).abs() < 1e-10);
        assert!((floor.top_elevation() - 5.3).abs() < 1e-10);
    }

    #[test]
    fn floor_mesh_valid() {
        let floor = Floor::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        let mesh = floor.to_mesh().unwrap();
        assert!(mesh.is_valid());
    }

    #[test]
    fn floor_bounding_box() {
        let mut floor =
            Floor::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();
        floor.set_elevation(5.0);

        let bbox = floor.bounding_box().unwrap();
        assert_eq!(bbox.min.x, 0.0);
        assert_eq!(bbox.min.y, 0.0);
        assert!((bbox.min.z - 5.0).abs() < 1e-10);
        assert_eq!(bbox.max.x, 10.0);
        assert_eq!(bbox.max.y, 10.0);
        assert!((bbox.max.z - 5.3).abs() < 1e-10);
    }

    #[test]
    fn floor_element_trait() {
        let floor = Floor::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        assert_eq!(floor.element_type(), ElementType::Floor);
        assert!(!floor.id().is_nil());
    }

    #[test]
    fn floor_add_hole() {
        let mut floor =
            Floor::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        let hole = Polygon2::rectangle(Point2::new(2.0, 2.0), Point2::new(4.0, 4.0));
        assert!(floor.add_hole(hole).is_ok());
        assert_eq!(floor.holes.len(), 1);
        assert!((floor.area() - 96.0).abs() < 1e-10);
    }
}
