//! Roof element for BIM modeling.
//!
//! Supports various roof types including flat, gable, hip, shed, and mansard.
//! Roofs can be attached to walls and support multiple slope configurations.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use pensaer_math::{BoundingBox3, Point2, Point3, Polygon2};

use crate::element::{Element, ElementMetadata, ElementType};
use crate::error::{GeometryError, GeometryResult};
use crate::mesh::TriangleMesh;

/// Type of roof construction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub enum RoofType {
    /// Flat roof (no slope or minimal slope for drainage).
    #[default]
    Flat,
    /// Gable roof (two sloping sides meeting at a ridge).
    Gable,
    /// Hip roof (slopes on all four sides).
    Hip,
    /// Shed/lean-to roof (single sloping plane).
    Shed,
    /// Mansard roof (four-sided with double slope on each side).
    Mansard,
}

impl RoofType {
    /// Return the name of this roof type.
    pub fn name(&self) -> &'static str {
        match self {
            RoofType::Flat => "Flat",
            RoofType::Gable => "Gable",
            RoofType::Hip => "Hip",
            RoofType::Shed => "Shed",
            RoofType::Mansard => "Mansard",
        }
    }
}

/// Direction for the ridge line in gable/hip roofs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub enum RidgeDirection {
    /// Ridge runs along the X-axis (longer dimension).
    #[default]
    AlongX,
    /// Ridge runs along the Y-axis.
    AlongY,
}

/// A roof element in the BIM model.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Roof {
    /// Unique identifier.
    pub id: Uuid,
    /// Roof footprint boundary polygon.
    pub boundary: Polygon2,
    /// Roof thickness (structural depth).
    pub thickness: f64,
    /// Base elevation (where roof meets walls).
    pub base_elevation: f64,
    /// Roof type.
    pub roof_type: RoofType,
    /// Slope angle in degrees (0 for flat, typically 15-45 for pitched).
    pub slope_degrees: f64,
    /// Eave overhang distance beyond walls.
    pub eave_overhang: f64,
    /// Ridge direction for gable/hip roofs.
    pub ridge_direction: RidgeDirection,
    /// IDs of walls this roof is attached to.
    pub attached_wall_ids: Vec<Uuid>,
    /// Metadata.
    pub metadata: ElementMetadata,
}

impl Roof {
    /// Create a new flat roof from a boundary polygon.
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
            roof_type: RoofType::Flat,
            slope_degrees: 0.0,
            eave_overhang: 0.0,
            ridge_direction: RidgeDirection::default(),
            attached_wall_ids: Vec::new(),
            metadata: ElementMetadata::new(),
        })
    }

    /// Create a rectangular flat roof.
    pub fn rectangle(min: Point2, max: Point2, thickness: f64) -> GeometryResult<Self> {
        if min.x >= max.x || min.y >= max.y {
            return Err(GeometryError::InvalidFloorBounds);
        }
        let boundary = Polygon2::rectangle(min, max);
        Self::new(boundary, thickness)
    }

    /// Create a gable roof.
    pub fn gable(
        min: Point2,
        max: Point2,
        thickness: f64,
        slope_degrees: f64,
        ridge_direction: RidgeDirection,
    ) -> GeometryResult<Self> {
        let mut roof = Self::rectangle(min, max, thickness)?;
        roof.roof_type = RoofType::Gable;
        roof.slope_degrees = slope_degrees.clamp(0.0, 89.0);
        roof.ridge_direction = ridge_direction;
        Ok(roof)
    }

    /// Create a hip roof.
    pub fn hip(min: Point2, max: Point2, thickness: f64, slope_degrees: f64) -> GeometryResult<Self> {
        let mut roof = Self::rectangle(min, max, thickness)?;
        roof.roof_type = RoofType::Hip;
        roof.slope_degrees = slope_degrees.clamp(0.0, 89.0);
        Ok(roof)
    }

    /// Create a shed (single slope) roof.
    pub fn shed(
        min: Point2,
        max: Point2,
        thickness: f64,
        slope_degrees: f64,
        ridge_direction: RidgeDirection,
    ) -> GeometryResult<Self> {
        let mut roof = Self::rectangle(min, max, thickness)?;
        roof.roof_type = RoofType::Shed;
        roof.slope_degrees = slope_degrees.clamp(0.0, 89.0);
        roof.ridge_direction = ridge_direction;
        Ok(roof)
    }

    /// Create a roof with specific ID.
    pub fn with_id(id: Uuid, boundary: Polygon2, thickness: f64) -> GeometryResult<Self> {
        let mut roof = Self::new(boundary, thickness)?;
        roof.id = id;
        Ok(roof)
    }

    /// Set base elevation.
    pub fn set_elevation(&mut self, elevation: f64) {
        self.base_elevation = elevation;
    }

    /// Set the roof type and slope.
    pub fn set_type(&mut self, roof_type: RoofType, slope_degrees: f64) {
        self.roof_type = roof_type;
        self.slope_degrees = slope_degrees.clamp(0.0, 89.0);
    }

    /// Set eave overhang distance.
    pub fn set_eave_overhang(&mut self, overhang: f64) {
        self.eave_overhang = overhang.max(0.0);
    }

    /// Attach roof to a wall by ID.
    pub fn attach_to_wall(&mut self, wall_id: Uuid) {
        if !self.attached_wall_ids.contains(&wall_id) {
            self.attached_wall_ids.push(wall_id);
        }
    }

    /// Attach roof to multiple walls by their IDs.
    pub fn attach_to_walls(&mut self, wall_ids: &[Uuid]) {
        for wall_id in wall_ids {
            self.attach_to_wall(*wall_id);
        }
    }

    /// Detach roof from a wall.
    pub fn detach_from_wall(&mut self, wall_id: Uuid) -> bool {
        if let Some(pos) = self.attached_wall_ids.iter().position(|id| *id == wall_id) {
            self.attached_wall_ids.remove(pos);
            true
        } else {
            false
        }
    }

    /// Check if roof is attached to a specific wall.
    pub fn is_attached_to(&self, wall_id: Uuid) -> bool {
        self.attached_wall_ids.contains(&wall_id)
    }

    /// Get all attached wall IDs.
    pub fn attached_walls(&self) -> &[Uuid] {
        &self.attached_wall_ids
    }

    /// Ridge height above base elevation.
    pub fn ridge_height(&self) -> f64 {
        if self.slope_degrees <= 0.0 {
            return self.thickness;
        }

        let bbox = match self.boundary.bounding_box() {
            Some(b) => b,
            None => return self.thickness,
        };
        let span = match self.ridge_direction {
            RidgeDirection::AlongX => bbox.max.y - bbox.min.y,
            RidgeDirection::AlongY => bbox.max.x - bbox.min.x,
        };

        // For gable: half span * tan(slope)
        let half_span = span / 2.0;
        let slope_rad = self.slope_degrees.to_radians();
        self.thickness + half_span * slope_rad.tan()
    }

    /// Top elevation at the ridge.
    pub fn top_elevation(&self) -> f64 {
        self.base_elevation + self.ridge_height()
    }

    /// Area of the roof footprint.
    pub fn footprint_area(&self) -> f64 {
        self.boundary.area()
    }

    /// Approximate surface area (accounting for slope).
    pub fn surface_area(&self) -> f64 {
        let footprint = self.footprint_area();
        if self.slope_degrees <= 0.0 {
            return footprint;
        }

        let slope_rad = self.slope_degrees.to_radians();
        footprint / slope_rad.cos()
    }

    /// Perimeter of the roof boundary.
    pub fn perimeter(&self) -> f64 {
        self.boundary.perimeter()
    }

    /// Generate mesh for a flat roof.
    fn to_mesh_flat(&self) -> GeometryResult<TriangleMesh> {
        let bbox = self
            .boundary
            .bounding_box()
            .ok_or(GeometryError::InsufficientVertices)?;

        let z0 = self.base_elevation;
        let z1 = self.base_elevation + self.thickness;

        // Apply eave overhang
        let overhang = self.eave_overhang;
        let corners = [
            Point2::new(bbox.min.x - overhang, bbox.min.y - overhang),
            Point2::new(bbox.max.x + overhang, bbox.min.y - overhang),
            Point2::new(bbox.max.x + overhang, bbox.max.y + overhang),
            Point2::new(bbox.min.x - overhang, bbox.max.y + overhang),
        ];

        let vertices = vec![
            // Bottom face
            Point3::new(corners[0].x, corners[0].y, z0),
            Point3::new(corners[1].x, corners[1].y, z0),
            Point3::new(corners[2].x, corners[2].y, z0),
            Point3::new(corners[3].x, corners[3].y, z0),
            // Top face
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

    /// Generate mesh for a gable roof.
    fn to_mesh_gable(&self) -> GeometryResult<TriangleMesh> {
        let bbox = self
            .boundary
            .bounding_box()
            .ok_or(GeometryError::InsufficientVertices)?;

        let overhang = self.eave_overhang;
        let z_base = self.base_elevation;
        let ridge_z = self.top_elevation();

        let (x_min, x_max, y_min, y_max) = (
            bbox.min.x - overhang,
            bbox.max.x + overhang,
            bbox.min.y - overhang,
            bbox.max.y + overhang,
        );

        let vertices = match self.ridge_direction {
            RidgeDirection::AlongX => {
                // Ridge runs along X (east-west), slopes face north and south
                let y_mid = (y_min + y_max) / 2.0;
                vec![
                    // Eave corners (bottom of slope) - 4 corners
                    Point3::new(x_min, y_min, z_base), // 0: front-left
                    Point3::new(x_max, y_min, z_base), // 1: front-right
                    Point3::new(x_max, y_max, z_base), // 2: back-right
                    Point3::new(x_min, y_max, z_base), // 3: back-left
                    // Ridge points (top) - 2 points
                    Point3::new(x_min, y_mid, ridge_z), // 4: ridge-left
                    Point3::new(x_max, y_mid, ridge_z), // 5: ridge-right
                ]
            }
            RidgeDirection::AlongY => {
                // Ridge runs along Y (north-south), slopes face east and west
                let x_mid = (x_min + x_max) / 2.0;
                vec![
                    // Eave corners (bottom of slope) - 4 corners
                    Point3::new(x_min, y_min, z_base), // 0: front-left
                    Point3::new(x_max, y_min, z_base), // 1: front-right
                    Point3::new(x_max, y_max, z_base), // 2: back-right
                    Point3::new(x_min, y_max, z_base), // 3: back-left
                    // Ridge points (top) - 2 points
                    Point3::new(x_mid, y_min, ridge_z), // 4: ridge-front
                    Point3::new(x_mid, y_max, ridge_z), // 5: ridge-back
                ]
            }
        };

        let indices = match self.ridge_direction {
            RidgeDirection::AlongX => vec![
                // Front slope (south face)
                [0, 1, 5],
                [0, 5, 4],
                // Back slope (north face)
                [2, 3, 4],
                [2, 4, 5],
                // Left gable end
                [3, 0, 4],
                // Right gable end
                [1, 2, 5],
            ],
            RidgeDirection::AlongY => vec![
                // Left slope (west face)
                [0, 3, 5],
                [0, 5, 4],
                // Right slope (east face)
                [1, 4, 5],
                [1, 5, 2],
                // Front gable end
                [0, 4, 1],
                // Back gable end
                [3, 2, 5],
            ],
        };

        Ok(TriangleMesh::from_vertices_indices(vertices, indices))
    }

    /// Generate mesh for a hip roof.
    fn to_mesh_hip(&self) -> GeometryResult<TriangleMesh> {
        let bbox = self
            .boundary
            .bounding_box()
            .ok_or(GeometryError::InsufficientVertices)?;

        let overhang = self.eave_overhang;
        let z_base = self.base_elevation;
        let ridge_z = self.top_elevation();

        let (x_min, x_max, y_min, y_max) = (
            bbox.min.x - overhang,
            bbox.max.x + overhang,
            bbox.min.y - overhang,
            bbox.max.y + overhang,
        );

        // Determine shorter dimension to calculate ridge endpoints
        let width = x_max - x_min;
        let depth = y_max - y_min;
        let x_mid = (x_min + x_max) / 2.0;
        let y_mid = (y_min + y_max) / 2.0;

        let vertices = if width >= depth {
            // Ridge along X (wider dimension)
            let ridge_inset = depth / 2.0;
            vec![
                // 4 eave corners
                Point3::new(x_min, y_min, z_base), // 0: SW
                Point3::new(x_max, y_min, z_base), // 1: SE
                Point3::new(x_max, y_max, z_base), // 2: NE
                Point3::new(x_min, y_max, z_base), // 3: NW
                // 2 ridge endpoints
                Point3::new(x_min + ridge_inset, y_mid, ridge_z), // 4: ridge-west
                Point3::new(x_max - ridge_inset, y_mid, ridge_z), // 5: ridge-east
            ]
        } else {
            // Ridge along Y (deeper dimension)
            let ridge_inset = width / 2.0;
            vec![
                // 4 eave corners
                Point3::new(x_min, y_min, z_base), // 0: SW
                Point3::new(x_max, y_min, z_base), // 1: SE
                Point3::new(x_max, y_max, z_base), // 2: NE
                Point3::new(x_min, y_max, z_base), // 3: NW
                // 2 ridge endpoints
                Point3::new(x_mid, y_min + ridge_inset, ridge_z), // 4: ridge-south
                Point3::new(x_mid, y_max - ridge_inset, ridge_z), // 5: ridge-north
            ]
        };

        let indices = if width >= depth {
            vec![
                // South slope
                [0, 1, 5],
                [0, 5, 4],
                // North slope
                [2, 3, 4],
                [2, 4, 5],
                // West hip
                [3, 0, 4],
                // East hip
                [1, 2, 5],
            ]
        } else {
            vec![
                // West slope
                [0, 3, 5],
                [0, 5, 4],
                // East slope
                [1, 4, 5],
                [1, 5, 2],
                // South hip
                [0, 4, 1],
                // North hip
                [3, 2, 5],
            ]
        };

        Ok(TriangleMesh::from_vertices_indices(vertices, indices))
    }

    /// Generate mesh for a shed roof (single slope).
    fn to_mesh_shed(&self) -> GeometryResult<TriangleMesh> {
        let bbox = self
            .boundary
            .bounding_box()
            .ok_or(GeometryError::InsufficientVertices)?;

        let overhang = self.eave_overhang;
        let z_low = self.base_elevation;
        let z_high = self.top_elevation();

        let (x_min, x_max, y_min, y_max) = (
            bbox.min.x - overhang,
            bbox.max.x + overhang,
            bbox.min.y - overhang,
            bbox.max.y + overhang,
        );

        let vertices = match self.ridge_direction {
            RidgeDirection::AlongX => {
                // Slope faces south (low at front, high at back)
                vec![
                    // Low edge (front/south)
                    Point3::new(x_min, y_min, z_low), // 0
                    Point3::new(x_max, y_min, z_low), // 1
                    // High edge (back/north)
                    Point3::new(x_max, y_max, z_high), // 2
                    Point3::new(x_min, y_max, z_high), // 3
                    // Bottom face
                    Point3::new(x_min, y_min, z_low - self.thickness), // 4
                    Point3::new(x_max, y_min, z_low - self.thickness), // 5
                    Point3::new(x_max, y_max, z_high - self.thickness), // 6
                    Point3::new(x_min, y_max, z_high - self.thickness), // 7
                ]
            }
            RidgeDirection::AlongY => {
                // Slope faces west (low at left, high at right)
                vec![
                    // Low edge (left/west)
                    Point3::new(x_min, y_min, z_low), // 0
                    Point3::new(x_min, y_max, z_low), // 1
                    // High edge (right/east)
                    Point3::new(x_max, y_max, z_high), // 2
                    Point3::new(x_max, y_min, z_high), // 3
                    // Bottom face
                    Point3::new(x_min, y_min, z_low - self.thickness), // 4
                    Point3::new(x_min, y_max, z_low - self.thickness), // 5
                    Point3::new(x_max, y_max, z_high - self.thickness), // 6
                    Point3::new(x_max, y_min, z_high - self.thickness), // 7
                ]
            }
        };

        let indices = vec![
            // Top surface
            [0, 1, 2],
            [0, 2, 3],
            // Bottom surface
            [4, 6, 5],
            [4, 7, 6],
            // Front edge
            [0, 5, 1],
            [0, 4, 5],
            // Back edge
            [2, 7, 3],
            [2, 6, 7],
            // Left edge
            [0, 3, 7],
            [0, 7, 4],
            // Right edge
            [1, 6, 2],
            [1, 5, 6],
        ];

        Ok(TriangleMesh::from_vertices_indices(vertices, indices))
    }
}

impl Element for Roof {
    fn id(&self) -> Uuid {
        self.id
    }

    fn element_type(&self) -> ElementType {
        ElementType::Roof
    }

    fn bounding_box(&self) -> GeometryResult<BoundingBox3> {
        let bbox2 = self
            .boundary
            .bounding_box()
            .ok_or(GeometryError::InsufficientVertices)?;

        let overhang = self.eave_overhang;
        Ok(BoundingBox3::new(
            Point3::new(bbox2.min.x - overhang, bbox2.min.y - overhang, self.base_elevation),
            Point3::new(bbox2.max.x + overhang, bbox2.max.y + overhang, self.top_elevation()),
        ))
    }

    fn to_mesh(&self) -> GeometryResult<TriangleMesh> {
        match self.roof_type {
            RoofType::Flat => self.to_mesh_flat(),
            RoofType::Gable => self.to_mesh_gable(),
            RoofType::Hip => self.to_mesh_hip(),
            RoofType::Shed => self.to_mesh_shed(),
            RoofType::Mansard => {
                // Mansard is complex; fall back to flat for now
                self.to_mesh_flat()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roof_flat_creation() {
        let roof = Roof::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        assert!((roof.footprint_area() - 100.0).abs() < 1e-10);
        assert!((roof.thickness - 0.3).abs() < 1e-10);
        assert_eq!(roof.roof_type, RoofType::Flat);
    }

    #[test]
    fn roof_gable_creation() {
        let roof = Roof::gable(
            Point2::new(0.0, 0.0),
            Point2::new(10.0, 8.0),
            0.3,
            30.0,
            RidgeDirection::AlongX,
        )
        .unwrap();

        assert_eq!(roof.roof_type, RoofType::Gable);
        assert!((roof.slope_degrees - 30.0).abs() < 1e-10);
        assert!(roof.ridge_height() > roof.thickness);
    }

    #[test]
    fn roof_hip_creation() {
        let roof = Roof::hip(Point2::new(0.0, 0.0), Point2::new(10.0, 8.0), 0.3, 25.0).unwrap();

        assert_eq!(roof.roof_type, RoofType::Hip);
        assert!((roof.slope_degrees - 25.0).abs() < 1e-10);
    }

    #[test]
    fn roof_shed_creation() {
        let roof = Roof::shed(
            Point2::new(0.0, 0.0),
            Point2::new(10.0, 8.0),
            0.3,
            15.0,
            RidgeDirection::AlongY,
        )
        .unwrap();

        assert_eq!(roof.roof_type, RoofType::Shed);
    }

    #[test]
    fn roof_invalid_bounds() {
        let result = Roof::rectangle(Point2::new(10.0, 0.0), Point2::new(0.0, 10.0), 0.3);
        assert!(matches!(result, Err(GeometryError::InvalidFloorBounds)));
    }

    #[test]
    fn roof_non_positive_thickness() {
        let result = Roof::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.0);
        assert!(matches!(result, Err(GeometryError::NonPositiveThickness)));
    }

    #[test]
    fn roof_elevation() {
        let mut roof = Roof::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        roof.set_elevation(5.0);
        assert!((roof.base_elevation - 5.0).abs() < 1e-10);
    }

    #[test]
    fn roof_eave_overhang() {
        let mut roof = Roof::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        roof.set_eave_overhang(0.5);
        assert!((roof.eave_overhang - 0.5).abs() < 1e-10);

        let bbox = roof.bounding_box().unwrap();
        assert!((bbox.min.x - (-0.5)).abs() < 1e-10);
        assert!((bbox.max.x - 10.5).abs() < 1e-10);
    }

    #[test]
    fn roof_attach_walls() {
        let mut roof = Roof::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        let wall_id_1 = Uuid::new_v4();
        let wall_id_2 = Uuid::new_v4();

        roof.attach_to_wall(wall_id_1);
        roof.attach_to_wall(wall_id_2);

        assert!(roof.is_attached_to(wall_id_1));
        assert!(roof.is_attached_to(wall_id_2));
        assert_eq!(roof.attached_walls().len(), 2);

        // Duplicate attach should not add
        roof.attach_to_wall(wall_id_1);
        assert_eq!(roof.attached_walls().len(), 2);
    }

    #[test]
    fn roof_detach_wall() {
        let mut roof = Roof::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        let wall_id = Uuid::new_v4();
        roof.attach_to_wall(wall_id);
        assert!(roof.is_attached_to(wall_id));

        assert!(roof.detach_from_wall(wall_id));
        assert!(!roof.is_attached_to(wall_id));

        // Detach non-existent should return false
        assert!(!roof.detach_from_wall(wall_id));
    }

    #[test]
    fn roof_attach_multiple_walls() {
        let mut roof = Roof::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        let wall_ids: Vec<Uuid> = (0..4).map(|_| Uuid::new_v4()).collect();
        roof.attach_to_walls(&wall_ids);

        assert_eq!(roof.attached_walls().len(), 4);
        for id in &wall_ids {
            assert!(roof.is_attached_to(*id));
        }
    }

    #[test]
    fn roof_mesh_flat_valid() {
        let roof = Roof::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        let mesh = roof.to_mesh().unwrap();
        assert!(mesh.is_valid());
    }

    #[test]
    fn roof_mesh_gable_valid() {
        let roof = Roof::gable(
            Point2::new(0.0, 0.0),
            Point2::new(10.0, 8.0),
            0.3,
            30.0,
            RidgeDirection::AlongX,
        )
        .unwrap();

        let mesh = roof.to_mesh().unwrap();
        assert!(mesh.is_valid());
        assert!(mesh.vertex_count() == 6);
    }

    #[test]
    fn roof_mesh_hip_valid() {
        let roof = Roof::hip(Point2::new(0.0, 0.0), Point2::new(10.0, 8.0), 0.3, 25.0).unwrap();

        let mesh = roof.to_mesh().unwrap();
        assert!(mesh.is_valid());
    }

    #[test]
    fn roof_mesh_shed_valid() {
        let roof = Roof::shed(
            Point2::new(0.0, 0.0),
            Point2::new(10.0, 8.0),
            0.3,
            15.0,
            RidgeDirection::AlongY,
        )
        .unwrap();

        let mesh = roof.to_mesh().unwrap();
        assert!(mesh.is_valid());
    }

    #[test]
    fn roof_bounding_box() {
        let mut roof = Roof::gable(
            Point2::new(0.0, 0.0),
            Point2::new(10.0, 8.0),
            0.3,
            30.0,
            RidgeDirection::AlongX,
        )
        .unwrap();
        roof.set_elevation(5.0);
        roof.set_eave_overhang(0.5);

        let bbox = roof.bounding_box().unwrap();
        assert!((bbox.min.x - (-0.5)).abs() < 1e-10);
        assert!((bbox.min.y - (-0.5)).abs() < 1e-10);
        assert!((bbox.min.z - 5.0).abs() < 1e-10);
        assert!((bbox.max.x - 10.5).abs() < 1e-10);
        assert!((bbox.max.y - 8.5).abs() < 1e-10);
        assert!(bbox.max.z > 5.0); // Ridge is above base
    }

    #[test]
    fn roof_element_trait() {
        let roof = Roof::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        assert_eq!(roof.element_type(), ElementType::Roof);
        assert!(!roof.id().is_nil());
    }

    #[test]
    fn roof_surface_area() {
        let flat = Roof::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();
        assert!((flat.surface_area() - 100.0).abs() < 1e-10);

        let pitched = Roof::gable(
            Point2::new(0.0, 0.0),
            Point2::new(10.0, 10.0),
            0.3,
            30.0,
            RidgeDirection::AlongX,
        )
        .unwrap();
        assert!(pitched.surface_area() > 100.0); // Sloped surface is larger
    }
}
