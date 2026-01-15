//! Wall element for BIM modeling.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use pensaer_math::{BoundingBox3, Point2, Point3, Vector2};

use crate::element::{Element, ElementMetadata, ElementType};
use crate::error::{GeometryError, GeometryResult};
use crate::mesh::TriangleMesh;

/// Wall baseline (centerline) definition.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct WallBaseline {
    /// Start point of the wall centerline.
    pub start: Point2,
    /// End point of the wall centerline.
    pub end: Point2,
}

impl WallBaseline {
    /// Create a new baseline.
    pub fn new(start: Point2, end: Point2) -> Self {
        Self { start, end }
    }

    /// Length of the baseline.
    pub fn length(&self) -> f64 {
        self.start.distance_to(&self.end)
    }

    /// Direction vector (normalized).
    pub fn direction(&self) -> GeometryResult<Vector2> {
        let dir = self.end - self.start;
        dir.normalize().map_err(|_| GeometryError::ZeroLengthWall)
    }

    /// Normal vector (perpendicular to direction).
    pub fn normal(&self) -> GeometryResult<Vector2> {
        Ok(self.direction()?.perp())
    }

    /// Point at parameter t (0 = start, 1 = end).
    pub fn point_at(&self, t: f64) -> Point2 {
        self.start.lerp(&self.end, t)
    }
}

/// Type of wall construction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub enum WallType {
    /// Basic interior wall.
    #[default]
    Basic,
    /// Load-bearing structural wall.
    Structural,
    /// Curtain wall (glass/panels).
    Curtain,
    /// Retaining wall.
    Retaining,
}

/// An opening in a wall (for doors, windows, or generic openings).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WallOpening {
    /// Unique identifier.
    pub id: Uuid,
    /// Distance from wall start to opening center.
    pub offset_along_wall: f64,
    /// Height from wall base to opening bottom.
    pub base_height: f64,
    /// Width of the opening.
    pub width: f64,
    /// Height of the opening.
    pub height: f64,
    /// Type of opening.
    pub opening_type: OpeningType,
    /// ID of hosted element (door or window), if any.
    pub hosted_element_id: Option<Uuid>,
}

impl WallOpening {
    /// Create a new wall opening.
    pub fn new(
        offset_along_wall: f64,
        base_height: f64,
        width: f64,
        height: f64,
        opening_type: OpeningType,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            offset_along_wall,
            base_height,
            width,
            height,
            opening_type,
            hosted_element_id: None,
        }
    }

    /// Start offset along wall (left edge of opening).
    pub fn start_offset(&self) -> f64 {
        self.offset_along_wall - self.width / 2.0
    }

    /// End offset along wall (right edge of opening).
    pub fn end_offset(&self) -> f64 {
        self.offset_along_wall + self.width / 2.0
    }

    /// Top height of opening.
    pub fn top_height(&self) -> f64 {
        self.base_height + self.height
    }
}

/// Type of opening.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OpeningType {
    /// Door opening.
    Door,
    /// Window opening.
    Window,
    /// Generic opening.
    Generic,
}

/// A wall element in the BIM model.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Wall {
    /// Unique identifier.
    pub id: Uuid,
    /// Wall centerline.
    pub baseline: WallBaseline,
    /// Wall height.
    pub height: f64,
    /// Wall thickness.
    pub thickness: f64,
    /// Offset from level base.
    pub base_offset: f64,
    /// Wall type.
    pub wall_type: WallType,
    /// Openings in this wall.
    pub openings: Vec<WallOpening>,
    /// Metadata.
    pub metadata: ElementMetadata,
}

impl Wall {
    /// Create a new wall.
    pub fn new(start: Point2, end: Point2, height: f64, thickness: f64) -> GeometryResult<Self> {
        if height <= 0.0 {
            return Err(GeometryError::NonPositiveHeight);
        }
        if thickness <= 0.0 {
            return Err(GeometryError::NonPositiveThickness);
        }

        let baseline = WallBaseline::new(start, end);
        if baseline.length() < 1e-10 {
            return Err(GeometryError::ZeroLengthWall);
        }

        Ok(Self {
            id: Uuid::new_v4(),
            baseline,
            height,
            thickness,
            base_offset: 0.0,
            wall_type: WallType::default(),
            openings: Vec::new(),
            metadata: ElementMetadata::new(),
        })
    }

    /// Create a wall with a specific ID.
    pub fn with_id(
        id: Uuid,
        start: Point2,
        end: Point2,
        height: f64,
        thickness: f64,
    ) -> GeometryResult<Self> {
        let mut wall = Self::new(start, end, height, thickness)?;
        wall.id = id;
        Ok(wall)
    }

    /// Wall length.
    pub fn length(&self) -> f64 {
        self.baseline.length()
    }

    /// Wall direction.
    pub fn direction(&self) -> GeometryResult<Vector2> {
        self.baseline.direction()
    }

    /// Wall normal (perpendicular to baseline).
    pub fn normal(&self) -> GeometryResult<Vector2> {
        self.baseline.normal()
    }

    /// Add an opening to the wall.
    pub fn add_opening(&mut self, opening: WallOpening) -> GeometryResult<()> {
        // Validate opening bounds
        let wall_length = self.length();
        if opening.start_offset() < 0.0 || opening.end_offset() > wall_length {
            return Err(GeometryError::OpeningOutOfBounds);
        }
        if opening.base_height < 0.0 || opening.top_height() > self.height {
            return Err(GeometryError::OpeningOutOfBounds);
        }

        // Check for overlaps with existing openings
        for existing in &self.openings {
            if self.openings_overlap(&opening, existing) {
                return Err(GeometryError::OverlappingOpenings);
            }
        }

        self.openings.push(opening);
        Ok(())
    }

    /// Remove an opening by ID.
    pub fn remove_opening(&mut self, opening_id: Uuid) -> bool {
        if let Some(pos) = self.openings.iter().position(|o| o.id == opening_id) {
            self.openings.remove(pos);
            true
        } else {
            false
        }
    }

    /// Check if two openings overlap.
    fn openings_overlap(&self, a: &WallOpening, b: &WallOpening) -> bool {
        // Check horizontal overlap
        let h_overlap = a.start_offset() < b.end_offset() && a.end_offset() > b.start_offset();
        // Check vertical overlap
        let v_overlap = a.base_height < b.top_height() && a.top_height() > b.base_height;
        h_overlap && v_overlap
    }

    /// Get the four corner points of the wall base (in plan view).
    pub fn base_corners(&self) -> GeometryResult<[Point2; 4]> {
        let normal = self.normal()?;
        let half_thickness = self.thickness / 2.0;
        let offset = normal * half_thickness;

        Ok([
            self.baseline.start + offset, // Start, positive normal
            self.baseline.start - offset, // Start, negative normal
            self.baseline.end - offset,   // End, negative normal
            self.baseline.end + offset,   // End, positive normal
        ])
    }

    /// Generate mesh without openings.
    pub fn to_mesh_simple(&self) -> GeometryResult<TriangleMesh> {
        let corners = self.base_corners()?;
        let z0 = self.base_offset;
        let z1 = self.base_offset + self.height;

        // Create 8 vertices (4 bottom + 4 top)
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

        // Create 12 triangles (2 per face, 6 faces)
        let indices = vec![
            // Bottom
            [0, 1, 2],
            [0, 2, 3],
            // Top
            [4, 6, 5],
            [4, 7, 6],
            // Front (positive normal face)
            [0, 4, 5],
            [0, 5, 1],
            // Back (negative normal face)
            [2, 6, 7],
            [2, 7, 3],
            // Left (start end)
            [1, 5, 6],
            [1, 6, 2],
            // Right (end end)
            [3, 7, 4],
            [3, 4, 0],
        ];

        Ok(TriangleMesh::from_vertices_indices(vertices, indices))
    }

    /// Generate mesh with openings (simplified - creates holes but not reveals).
    pub fn to_mesh_with_openings(&self) -> GeometryResult<TriangleMesh> {
        if self.openings.is_empty() {
            return self.to_mesh_simple();
        }

        // For now, return simple mesh.
        // Full opening implementation requires polygon boolean operations
        // and constrained triangulation, which will be added in Phase 4.
        self.to_mesh_simple()
    }
}

impl Element for Wall {
    fn id(&self) -> Uuid {
        self.id
    }

    fn element_type(&self) -> ElementType {
        ElementType::Wall
    }

    fn bounding_box(&self) -> GeometryResult<BoundingBox3> {
        let corners = self.base_corners()?;
        let z0 = self.base_offset;
        let z1 = self.base_offset + self.height;

        let points = vec![
            Point3::new(corners[0].x, corners[0].y, z0),
            Point3::new(corners[1].x, corners[1].y, z0),
            Point3::new(corners[2].x, corners[2].y, z0),
            Point3::new(corners[3].x, corners[3].y, z0),
            Point3::new(corners[0].x, corners[0].y, z1),
            Point3::new(corners[1].x, corners[1].y, z1),
            Point3::new(corners[2].x, corners[2].y, z1),
            Point3::new(corners[3].x, corners[3].y, z1),
        ];

        BoundingBox3::from_points(&points).ok_or(GeometryError::ZeroLengthWall)
    }

    fn to_mesh(&self) -> GeometryResult<TriangleMesh> {
        self.to_mesh_with_openings()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wall_creation() {
        let wall = Wall::new(Point2::new(0.0, 0.0), Point2::new(5.0, 0.0), 3.0, 0.2).unwrap();

        assert!((wall.length() - 5.0).abs() < 1e-10);
        assert!((wall.height - 3.0).abs() < 1e-10);
        assert!((wall.thickness - 0.2).abs() < 1e-10);
    }

    #[test]
    fn wall_zero_length_fails() {
        let result = Wall::new(Point2::new(0.0, 0.0), Point2::new(0.0, 0.0), 3.0, 0.2);
        assert!(matches!(result, Err(GeometryError::ZeroLengthWall)));
    }

    #[test]
    fn wall_non_positive_height_fails() {
        let result = Wall::new(Point2::new(0.0, 0.0), Point2::new(5.0, 0.0), 0.0, 0.2);
        assert!(matches!(result, Err(GeometryError::NonPositiveHeight)));
    }

    #[test]
    fn wall_direction() {
        let wall = Wall::new(Point2::new(0.0, 0.0), Point2::new(5.0, 0.0), 3.0, 0.2).unwrap();

        let dir = wall.direction().unwrap();
        assert!((dir.x - 1.0).abs() < 1e-10);
        assert!(dir.y.abs() < 1e-10);
    }

    #[test]
    fn wall_normal() {
        let wall = Wall::new(Point2::new(0.0, 0.0), Point2::new(5.0, 0.0), 3.0, 0.2).unwrap();

        let normal = wall.normal().unwrap();
        // Perpendicular to (1, 0) should be (0, 1) or (0, -1)
        assert!(normal.x.abs() < 1e-10);
        assert!((normal.y.abs() - 1.0).abs() < 1e-10);
    }

    #[test]
    fn wall_add_opening() {
        let mut wall = Wall::new(Point2::new(0.0, 0.0), Point2::new(5.0, 0.0), 3.0, 0.2).unwrap();

        let opening = WallOpening::new(2.5, 0.0, 1.0, 2.0, OpeningType::Door);
        assert!(wall.add_opening(opening).is_ok());
        assert_eq!(wall.openings.len(), 1);
    }

    #[test]
    fn wall_opening_out_of_bounds() {
        let mut wall = Wall::new(Point2::new(0.0, 0.0), Point2::new(5.0, 0.0), 3.0, 0.2).unwrap();

        // Opening extends past wall end
        let opening = WallOpening::new(5.0, 0.0, 1.0, 2.0, OpeningType::Window);
        assert!(matches!(
            wall.add_opening(opening),
            Err(GeometryError::OpeningOutOfBounds)
        ));
    }

    #[test]
    fn wall_mesh_valid() {
        let wall = Wall::new(Point2::new(0.0, 0.0), Point2::new(5.0, 0.0), 3.0, 0.2).unwrap();

        let mesh = wall.to_mesh().unwrap();
        assert!(mesh.is_valid());
        assert_eq!(mesh.vertex_count(), 8);
        assert_eq!(mesh.triangle_count(), 12);
    }

    #[test]
    fn wall_bounding_box() {
        let wall = Wall::new(Point2::new(0.0, 0.0), Point2::new(4.0, 0.0), 3.0, 0.2).unwrap();

        let bbox = wall.bounding_box().unwrap();
        assert_eq!(bbox.min.x, 0.0);
        assert!((bbox.min.y - (-0.1)).abs() < 1e-10);
        assert_eq!(bbox.min.z, 0.0);
        assert_eq!(bbox.max.x, 4.0);
        assert!((bbox.max.y - 0.1).abs() < 1e-10);
        assert_eq!(bbox.max.z, 3.0);
    }

    #[test]
    fn wall_element_trait() {
        let wall = Wall::new(Point2::new(0.0, 0.0), Point2::new(5.0, 0.0), 3.0, 0.2).unwrap();

        assert_eq!(wall.element_type(), ElementType::Wall);
        assert!(!wall.id().is_nil());
    }
}
