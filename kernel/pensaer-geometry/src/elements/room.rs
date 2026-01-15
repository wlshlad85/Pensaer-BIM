//! Room element for BIM modeling.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use pensaer_math::{BoundingBox3, Point2, Point3, Polygon2};

use crate::element::{Element, ElementMetadata, ElementType};
use crate::error::{GeometryError, GeometryResult};
use crate::mesh::TriangleMesh;

/// A room element representing an enclosed space.
///
/// Rooms are typically bounded by walls and are used for:
/// - Area calculations
/// - Space scheduling
/// - HVAC zone definitions
/// - Room numbering and naming
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Room {
    /// Unique identifier.
    pub id: Uuid,
    /// Room name.
    pub name: String,
    /// Room number.
    pub number: String,
    /// Room boundary polygon.
    pub boundary: Polygon2,
    /// Base elevation (floor level).
    pub base_elevation: f64,
    /// Room height (floor to ceiling).
    pub height: f64,
    /// IDs of walls that form the boundary.
    pub bounding_walls: Vec<Uuid>,
    /// Metadata.
    pub metadata: ElementMetadata,
}

impl Room {
    /// Create a new room from a boundary polygon.
    pub fn new(
        name: impl Into<String>,
        number: impl Into<String>,
        boundary: Polygon2,
        height: f64,
    ) -> GeometryResult<Self> {
        if height <= 0.0 {
            return Err(GeometryError::NonPositiveHeight);
        }
        boundary.validate().map_err(|_| GeometryError::InsufficientVertices)?;

        Ok(Self {
            id: Uuid::new_v4(),
            name: name.into(),
            number: number.into(),
            boundary,
            base_elevation: 0.0,
            height,
            bounding_walls: Vec::new(),
            metadata: ElementMetadata::new(),
        })
    }

    /// Create a rectangular room.
    pub fn rectangle(
        name: impl Into<String>,
        number: impl Into<String>,
        min: Point2,
        max: Point2,
        height: f64,
    ) -> GeometryResult<Self> {
        if min.x >= max.x || min.y >= max.y {
            return Err(GeometryError::InvalidFloorBounds);
        }
        let boundary = Polygon2::rectangle(min, max);
        Self::new(name, number, boundary, height)
    }

    /// Set base elevation.
    pub fn set_elevation(&mut self, elevation: f64) {
        self.base_elevation = elevation;
    }

    /// Top elevation (ceiling height).
    pub fn top_elevation(&self) -> f64 {
        self.base_elevation + self.height
    }

    /// Floor area of the room.
    pub fn area(&self) -> f64 {
        self.boundary.area()
    }

    /// Perimeter of the room.
    pub fn perimeter(&self) -> f64 {
        self.boundary.perimeter()
    }

    /// Volume of the room.
    pub fn volume(&self) -> f64 {
        self.area() * self.height
    }

    /// Centroid of the room (useful for label placement).
    pub fn centroid(&self) -> Point3 {
        let c2 = self.boundary.centroid();
        let z = self.base_elevation + self.height / 2.0;
        Point3::new(c2.x, c2.y, z)
    }

    /// Add a wall to the bounding walls list.
    pub fn add_bounding_wall(&mut self, wall_id: Uuid) {
        if !self.bounding_walls.contains(&wall_id) {
            self.bounding_walls.push(wall_id);
        }
    }

    /// Remove a wall from the bounding walls list.
    pub fn remove_bounding_wall(&mut self, wall_id: Uuid) -> bool {
        if let Some(pos) = self.bounding_walls.iter().position(|&id| id == wall_id) {
            self.bounding_walls.remove(pos);
            true
        } else {
            false
        }
    }

    /// Check if a point is inside the room (2D check at floor level).
    pub fn contains_point_2d(&self, p: &Point2) -> bool {
        self.boundary.contains_point(p)
    }

    /// Check if a 3D point is inside the room.
    pub fn contains_point(&self, p: &Point3) -> bool {
        if p.z < self.base_elevation || p.z > self.top_elevation() {
            return false;
        }
        self.boundary.contains_point(&Point2::new(p.x, p.y))
    }
}

impl Element for Room {
    fn id(&self) -> Uuid {
        self.id
    }

    fn element_type(&self) -> ElementType {
        ElementType::Room
    }

    fn bounding_box(&self) -> GeometryResult<BoundingBox3> {
        let bbox2 = self.boundary.bounding_box()
            .ok_or(GeometryError::InsufficientVertices)?;

        Ok(BoundingBox3::new(
            Point3::new(bbox2.min.x, bbox2.min.y, self.base_elevation),
            Point3::new(bbox2.max.x, bbox2.max.y, self.top_elevation()),
        ))
    }

    fn to_mesh(&self) -> GeometryResult<TriangleMesh> {
        // Room mesh is typically just the boundary extruded for visualization
        // Similar to floor but represents the space, not the slab
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
        for i in 1..n - 1 {
            // Bottom face
            indices.push([0, (i + 1) as u32, i as u32]);
            // Top face
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn room_creation() {
        let room = Room::rectangle(
            "Living Room",
            "101",
            Point2::new(0.0, 0.0),
            Point2::new(5.0, 4.0),
            2.7,
        )
        .unwrap();

        assert_eq!(room.name, "Living Room");
        assert_eq!(room.number, "101");
        assert!((room.area() - 20.0).abs() < 1e-10);
        assert!((room.height - 2.7).abs() < 1e-10);
    }

    #[test]
    fn room_volume() {
        let room = Room::rectangle(
            "Bedroom",
            "102",
            Point2::new(0.0, 0.0),
            Point2::new(4.0, 3.0),
            2.5,
        )
        .unwrap();

        assert!((room.volume() - 30.0).abs() < 1e-10);
    }

    #[test]
    fn room_centroid() {
        let room = Room::rectangle(
            "Office",
            "103",
            Point2::new(0.0, 0.0),
            Point2::new(4.0, 4.0),
            3.0,
        )
        .unwrap();

        let centroid = room.centroid();
        assert!((centroid.x - 2.0).abs() < 1e-10);
        assert!((centroid.y - 2.0).abs() < 1e-10);
        assert!((centroid.z - 1.5).abs() < 1e-10);
    }

    #[test]
    fn room_contains_point() {
        let mut room = Room::rectangle(
            "Kitchen",
            "104",
            Point2::new(0.0, 0.0),
            Point2::new(4.0, 4.0),
            3.0,
        )
        .unwrap();
        room.set_elevation(0.0);

        // Inside
        assert!(room.contains_point(&Point3::new(2.0, 2.0, 1.5)));
        // Outside horizontally
        assert!(!room.contains_point(&Point3::new(5.0, 2.0, 1.5)));
        // Below floor
        assert!(!room.contains_point(&Point3::new(2.0, 2.0, -1.0)));
        // Above ceiling
        assert!(!room.contains_point(&Point3::new(2.0, 2.0, 4.0)));
    }

    #[test]
    fn room_elevation() {
        let mut room = Room::rectangle(
            "Bathroom",
            "105",
            Point2::new(0.0, 0.0),
            Point2::new(3.0, 2.5),
            2.4,
        )
        .unwrap();

        room.set_elevation(5.0);
        assert!((room.base_elevation - 5.0).abs() < 1e-10);
        assert!((room.top_elevation() - 7.4).abs() < 1e-10);
    }

    #[test]
    fn room_bounding_walls() {
        let mut room = Room::rectangle(
            "Hallway",
            "106",
            Point2::new(0.0, 0.0),
            Point2::new(6.0, 1.5),
            2.7,
        )
        .unwrap();

        let wall1 = Uuid::new_v4();
        let wall2 = Uuid::new_v4();

        room.add_bounding_wall(wall1);
        room.add_bounding_wall(wall2);
        assert_eq!(room.bounding_walls.len(), 2);

        // Adding same wall again should not duplicate
        room.add_bounding_wall(wall1);
        assert_eq!(room.bounding_walls.len(), 2);

        assert!(room.remove_bounding_wall(wall1));
        assert_eq!(room.bounding_walls.len(), 1);
    }

    #[test]
    fn room_element_trait() {
        let room = Room::rectangle(
            "Storage",
            "107",
            Point2::new(0.0, 0.0),
            Point2::new(2.0, 2.0),
            2.5,
        )
        .unwrap();

        assert_eq!(room.element_type(), ElementType::Room);
        assert!(!room.id().is_nil());
    }

    #[test]
    fn room_mesh_valid() {
        let room = Room::rectangle(
            "Closet",
            "108",
            Point2::new(0.0, 0.0),
            Point2::new(1.5, 1.0),
            2.4,
        )
        .unwrap();

        let mesh = room.to_mesh().unwrap();
        assert!(mesh.is_valid());
    }

    #[test]
    fn room_bounding_box() {
        let mut room = Room::rectangle(
            "Garage",
            "G01",
            Point2::new(0.0, 0.0),
            Point2::new(6.0, 3.0),
            2.8,
        )
        .unwrap();
        room.set_elevation(0.0);

        let bbox = room.bounding_box().unwrap();
        assert_eq!(bbox.min.x, 0.0);
        assert_eq!(bbox.min.y, 0.0);
        assert!((bbox.min.z - 0.0).abs() < 1e-10);
        assert_eq!(bbox.max.x, 6.0);
        assert_eq!(bbox.max.y, 3.0);
        assert!((bbox.max.z - 2.8).abs() < 1e-10);
    }
}
