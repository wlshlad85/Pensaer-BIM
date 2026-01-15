//! Wall join system for BIM modeling.
//!
//! This module handles how walls connect at corners and intersections:
//! - **Butt joins**: Walls meet end-to-end
//! - **Miter joins**: Angled corner joins
//! - **L-joins**: L-shaped corners
//! - **T-joins**: T-intersections
//! - **Cross joins**: X-intersections
//!
//! # Example
//!
//! ```rust
//! use pensaer_geometry::joins::{JoinResolver, JoinType};
//! use pensaer_geometry::elements::Wall;
//! use pensaer_math::Point2;
//!
//! let wall1 = Wall::new(
//!     Point2::new(0.0, 0.0),
//!     Point2::new(5.0, 0.0),
//!     3.0, 0.2,
//! ).unwrap();
//!
//! let wall2 = Wall::new(
//!     Point2::new(5.0, 0.0),
//!     Point2::new(5.0, 4.0),
//!     3.0, 0.2,
//! ).unwrap();
//!
//! let resolver = JoinResolver::new(0.001); // 1mm tolerance
//! let joins = resolver.detect_joins(&[&wall1, &wall2]);
//! ```

mod detect;
mod miter;

pub use detect::JoinDetector;
pub use miter::{compute_miter_join, MiterJoinResult};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use pensaer_math::{Point2, Vector2};

use crate::elements::Wall;
use crate::error::{GeometryError, GeometryResult};
use crate::mesh::TriangleMesh;

/// Type of wall join.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum JoinType {
    /// Walls meet end-to-end (no angle).
    Butt,
    /// Angled corner join (two walls meeting at an angle).
    Miter,
    /// L-shaped corner (90-degree join).
    LJoin,
    /// T-intersection (one wall ends at another's side).
    TJoin,
    /// X-intersection (two walls cross).
    CrossJoin,
    /// No join detected.
    None,
}

impl Default for JoinType {
    fn default() -> Self {
        Self::None
    }
}

/// Which end of a wall participates in a join.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WallEnd {
    /// The start point of the wall baseline.
    Start,
    /// The end point of the wall baseline.
    End,
}

/// Priority for wall joins (determines which wall "wins" in conflicts).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum JoinPriority {
    /// Interior walls (lowest priority).
    Interior = 1,
    /// Exterior walls.
    Exterior = 2,
    /// Structural/load-bearing walls (highest priority).
    Structural = 3,
}

impl Default for JoinPriority {
    fn default() -> Self {
        Self::Interior
    }
}

/// A detected wall join.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WallJoin {
    /// Unique identifier for this join.
    pub id: Uuid,
    /// Type of join.
    pub join_type: JoinType,
    /// IDs of walls participating in this join.
    pub wall_ids: Vec<Uuid>,
    /// Which end of each wall is involved.
    pub wall_ends: Vec<WallEnd>,
    /// The point where walls meet.
    pub join_point: Point2,
    /// Angle between walls (in radians, 0 to PI).
    pub angle: f64,
}

impl WallJoin {
    /// Create a new wall join.
    pub fn new(
        join_type: JoinType,
        wall_ids: Vec<Uuid>,
        wall_ends: Vec<WallEnd>,
        join_point: Point2,
        angle: f64,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            join_type,
            wall_ids,
            wall_ends,
            join_point,
            angle,
        }
    }

    /// Check if this join involves a specific wall.
    pub fn involves_wall(&self, wall_id: Uuid) -> bool {
        self.wall_ids.contains(&wall_id)
    }

    /// Get the number of walls in this join.
    pub fn wall_count(&self) -> usize {
        self.wall_ids.len()
    }
}

/// Profile of a wall at a join point.
///
/// Describes how a wall's geometry is modified at a join.
#[derive(Debug, Clone)]
pub struct WallJoinProfile {
    /// ID of the wall.
    pub wall_id: Uuid,
    /// Which end of the wall.
    pub wall_end: WallEnd,
    /// The four corner points of the wall end after joining.
    /// Order: [inner_near, outer_near, outer_far, inner_far]
    /// where "inner" is toward the join point and "outer" is away.
    pub corners: [Point2; 4],
    /// Direction the wall extends from the join (normalized).
    pub direction: Vector2,
}

/// Computed geometry for a join.
#[derive(Debug, Clone)]
pub struct JoinGeometry {
    /// Modified wall profiles at the join.
    pub wall_profiles: Vec<WallJoinProfile>,
    /// Optional fill mesh for the join region (for complex joins).
    pub fill_mesh: Option<TriangleMesh>,
    /// The join point.
    pub join_point: Point2,
    /// The type of join that was computed.
    pub join_type: JoinType,
}

/// Resolves and computes wall joins.
pub struct JoinResolver {
    /// Tolerance for detecting coincident points (typically 1mm = 0.001).
    tolerance: f64,
    /// Angle tolerance for determining join types (in radians).
    angle_tolerance: f64,
}

impl JoinResolver {
    /// Create a new join resolver.
    ///
    /// # Arguments
    /// * `tolerance` - Distance tolerance for point coincidence (e.g., 0.001 for 1mm)
    pub fn new(tolerance: f64) -> Self {
        Self {
            tolerance,
            angle_tolerance: 0.01, // ~0.5 degrees
        }
    }

    /// Create with custom angle tolerance.
    pub fn with_angle_tolerance(mut self, angle_tolerance: f64) -> Self {
        self.angle_tolerance = angle_tolerance;
        self
    }

    /// Get the tolerance value.
    pub fn tolerance(&self) -> f64 {
        self.tolerance
    }

    /// Detect all potential joins between a set of walls.
    ///
    /// Returns a list of detected joins without modifying the walls.
    pub fn detect_joins(&self, walls: &[&Wall]) -> Vec<WallJoin> {
        let detector = JoinDetector::new(self.tolerance, self.angle_tolerance);
        detector.detect_all(walls)
    }

    /// Compute the geometry for a specific join.
    ///
    /// This determines how wall endpoints should be modified to form a clean join.
    pub fn compute_join_geometry(
        &self,
        walls: &[&Wall],
        join: &WallJoin,
    ) -> GeometryResult<JoinGeometry> {
        match join.join_type {
            JoinType::Miter | JoinType::LJoin => {
                if walls.len() != 2 {
                    return Err(GeometryError::InvalidJoinConfiguration);
                }
                self.compute_miter_geometry(walls[0], walls[1], join)
            }
            JoinType::Butt => {
                if walls.len() != 2 {
                    return Err(GeometryError::InvalidJoinConfiguration);
                }
                self.compute_butt_geometry(walls[0], walls[1], join)
            }
            JoinType::TJoin => {
                if walls.len() != 2 {
                    return Err(GeometryError::InvalidJoinConfiguration);
                }
                self.compute_t_geometry(walls[0], walls[1], join)
            }
            JoinType::CrossJoin => {
                if walls.len() != 2 {
                    return Err(GeometryError::InvalidJoinConfiguration);
                }
                self.compute_cross_geometry(walls[0], walls[1], join)
            }
            JoinType::None => Err(GeometryError::InvalidJoinConfiguration),
        }
    }

    /// Compute miter join geometry for two walls.
    fn compute_miter_geometry(
        &self,
        wall_a: &Wall,
        wall_b: &Wall,
        join: &WallJoin,
    ) -> GeometryResult<JoinGeometry> {
        let result = compute_miter_join(
            wall_a,
            wall_b,
            join.join_point,
            join.wall_ends[0],
            join.wall_ends[1],
            self.tolerance,
        )?;

        Ok(JoinGeometry {
            wall_profiles: vec![result.profile_a, result.profile_b],
            fill_mesh: None, // Miter joins don't need fill
            join_point: join.join_point,
            join_type: JoinType::Miter,
        })
    }

    /// Compute butt join geometry (walls meet end-to-end).
    fn compute_butt_geometry(
        &self,
        wall_a: &Wall,
        wall_b: &Wall,
        join: &WallJoin,
    ) -> GeometryResult<JoinGeometry> {
        // For butt joints, walls are essentially collinear
        // Each wall keeps its original end profile
        let profile_a = self.compute_wall_end_profile(wall_a, join.wall_ends[0])?;
        let profile_b = self.compute_wall_end_profile(wall_b, join.wall_ends[1])?;

        Ok(JoinGeometry {
            wall_profiles: vec![profile_a, profile_b],
            fill_mesh: None,
            join_point: join.join_point,
            join_type: JoinType::Butt,
        })
    }

    /// Compute T-join geometry (one wall ends at another's side).
    fn compute_t_geometry(
        &self,
        wall_a: &Wall,
        wall_b: &Wall,
        join: &WallJoin,
    ) -> GeometryResult<JoinGeometry> {
        // For T-joins, one wall continues through, one wall ends at it
        // The continuing wall is unmodified
        // The ending wall gets a square cut at the intersection

        let profile_a = self.compute_wall_end_profile(wall_a, join.wall_ends[0])?;
        let profile_b = self.compute_wall_end_profile(wall_b, join.wall_ends[1])?;

        Ok(JoinGeometry {
            wall_profiles: vec![profile_a, profile_b],
            fill_mesh: None,
            join_point: join.join_point,
            join_type: JoinType::TJoin,
        })
    }

    /// Compute cross join geometry (walls intersect).
    fn compute_cross_geometry(
        &self,
        wall_a: &Wall,
        wall_b: &Wall,
        join: &WallJoin,
    ) -> GeometryResult<JoinGeometry> {
        // For cross joins, both walls continue through
        // This creates a complex intersection region
        let profile_a = self.compute_wall_end_profile(wall_a, join.wall_ends[0])?;
        let profile_b = self.compute_wall_end_profile(wall_b, join.wall_ends[1])?;

        Ok(JoinGeometry {
            wall_profiles: vec![profile_a, profile_b],
            fill_mesh: None, // Could add intersection fill mesh
            join_point: join.join_point,
            join_type: JoinType::CrossJoin,
        })
    }

    /// Compute the end profile of a wall (unmodified).
    fn compute_wall_end_profile(
        &self,
        wall: &Wall,
        wall_end: WallEnd,
    ) -> GeometryResult<WallJoinProfile> {
        let normal = wall.normal()?;
        let half_thickness = wall.thickness / 2.0;
        let offset = normal * half_thickness;

        let (end_point, direction) = match wall_end {
            WallEnd::Start => (wall.baseline.start, wall.direction()?),
            WallEnd::End => (wall.baseline.end, -wall.direction()?),
        };

        // Corners: inner_near, outer_near, outer_far, inner_far
        // "near" is at the join point, "far" is away from join
        let inner_near = end_point + offset;
        let outer_near = end_point - offset;
        let outer_far = outer_near + direction * wall.thickness;
        let inner_far = inner_near + direction * wall.thickness;

        Ok(WallJoinProfile {
            wall_id: wall.id,
            wall_end,
            corners: [inner_near, outer_near, outer_far, inner_far],
            direction,
        })
    }
}

impl Default for JoinResolver {
    fn default() -> Self {
        Self::new(0.001) // 1mm tolerance
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pensaer_math::Point2;
    use std::f64::consts::PI;

    #[test]
    fn join_type_default() {
        assert_eq!(JoinType::default(), JoinType::None);
    }

    #[test]
    fn wall_join_creation() {
        let wall_id1 = Uuid::new_v4();
        let wall_id2 = Uuid::new_v4();

        let join = WallJoin::new(
            JoinType::Miter,
            vec![wall_id1, wall_id2],
            vec![WallEnd::End, WallEnd::Start],
            Point2::new(5.0, 0.0),
            PI / 2.0,
        );

        assert_eq!(join.join_type, JoinType::Miter);
        assert_eq!(join.wall_count(), 2);
        assert!(join.involves_wall(wall_id1));
        assert!(join.involves_wall(wall_id2));
        assert!(!join.involves_wall(Uuid::new_v4()));
    }

    #[test]
    fn join_resolver_creation() {
        let resolver = JoinResolver::new(0.001);
        assert!((resolver.tolerance() - 0.001).abs() < 1e-10);
    }

    #[test]
    fn detect_l_join() {
        let wall1 = Wall::new(
            Point2::new(0.0, 0.0),
            Point2::new(5.0, 0.0),
            3.0,
            0.2,
        ).unwrap();

        let wall2 = Wall::new(
            Point2::new(5.0, 0.0),
            Point2::new(5.0, 4.0),
            3.0,
            0.2,
        ).unwrap();

        let resolver = JoinResolver::new(0.001);
        let joins = resolver.detect_joins(&[&wall1, &wall2]);

        assert_eq!(joins.len(), 1);
        assert!(matches!(joins[0].join_type, JoinType::LJoin | JoinType::Miter));
        assert!((joins[0].join_point.x - 5.0).abs() < 0.01);
        assert!((joins[0].join_point.y - 0.0).abs() < 0.01);
    }

    #[test]
    fn detect_t_join() {
        // Horizontal wall
        let wall1 = Wall::new(
            Point2::new(0.0, 0.0),
            Point2::new(10.0, 0.0),
            3.0,
            0.2,
        ).unwrap();

        // Vertical wall ending at horizontal wall's midpoint
        let wall2 = Wall::new(
            Point2::new(5.0, 5.0),
            Point2::new(5.0, 0.0),
            3.0,
            0.2,
        ).unwrap();

        let resolver = JoinResolver::new(0.001);
        let joins = resolver.detect_joins(&[&wall1, &wall2]);

        // Should detect a T-join where wall2 ends at wall1's side
        assert!(!joins.is_empty());
    }

    #[test]
    fn detect_no_join() {
        let wall1 = Wall::new(
            Point2::new(0.0, 0.0),
            Point2::new(5.0, 0.0),
            3.0,
            0.2,
        ).unwrap();

        // Wall far away - no join
        let wall2 = Wall::new(
            Point2::new(100.0, 100.0),
            Point2::new(105.0, 100.0),
            3.0,
            0.2,
        ).unwrap();

        let resolver = JoinResolver::new(0.001);
        let joins = resolver.detect_joins(&[&wall1, &wall2]);

        assert!(joins.is_empty());
    }

    #[test]
    fn compute_miter_join_geometry() {
        let wall1 = Wall::new(
            Point2::new(0.0, 0.0),
            Point2::new(5.0, 0.0),
            3.0,
            0.2,
        ).unwrap();

        let wall2 = Wall::new(
            Point2::new(5.0, 0.0),
            Point2::new(5.0, 4.0),
            3.0,
            0.2,
        ).unwrap();

        let resolver = JoinResolver::new(0.001);
        let joins = resolver.detect_joins(&[&wall1, &wall2]);

        assert!(!joins.is_empty());

        let geometry = resolver.compute_join_geometry(&[&wall1, &wall2], &joins[0]).unwrap();
        assert_eq!(geometry.wall_profiles.len(), 2);
    }
}
