//! Miter join algorithm for wall corners.
//!
//! A miter join creates a clean diagonal cut where two walls meet at an angle.
//! The algorithm:
//! 1. Computes wall directions pointing away from the join
//! 2. Finds the bisector line between the walls
//! 3. Intersects wall edges with the miter line
//! 4. Returns modified corner profiles for each wall
//!
//! ```text
//!           Wall B
//!             │
//!             │
//!     ────────┼─────── Miter line
//!            ╱│
//!           ╱ │
//!          ╱  │
//! Wall A ─╱   │
//!        ╱    │
//! ```

use pensaer_math::{Point2, Vector2};

use super::{WallEnd, WallJoinProfile};
use crate::elements::Wall;
use crate::error::{GeometryError, GeometryResult};

/// Result of computing a miter join.
#[derive(Debug, Clone)]
pub struct MiterJoinResult {
    /// Profile for the first wall.
    pub profile_a: WallJoinProfile,
    /// Profile for the second wall.
    pub profile_b: WallJoinProfile,
    /// The miter line direction (perpendicular to bisector).
    pub miter_direction: Vector2,
    /// The bisector direction (between the two walls).
    pub bisector: Vector2,
}

/// Compute miter join geometry for two walls meeting at a point.
///
/// # Arguments
/// * `wall_a` - First wall
/// * `wall_b` - Second wall
/// * `join_point` - The point where walls meet
/// * `end_a` - Which end of wall_a is at the join
/// * `end_b` - Which end of wall_b is at the join
/// * `tolerance` - Distance tolerance for calculations
///
/// # Returns
/// A `MiterJoinResult` containing the modified corner profiles for both walls.
pub fn compute_miter_join(
    wall_a: &Wall,
    wall_b: &Wall,
    join_point: Point2,
    end_a: WallEnd,
    end_b: WallEnd,
    tolerance: f64,
) -> GeometryResult<MiterJoinResult> {
    // Get wall directions pointing AWAY from the join point
    let dir_a = get_wall_direction_from_join(wall_a, end_a)?;
    let dir_b = get_wall_direction_from_join(wall_b, end_b)?;

    // Get wall normals (perpendicular to direction)
    let normal_a = dir_a.perp();
    let normal_b = dir_b.perp();

    // Compute bisector (average of the two directions, normalized)
    let bisector = compute_bisector(&dir_a, &dir_b)?;

    // Miter line is perpendicular to the bisector
    let miter_direction = bisector.perp();

    // Compute corner profiles for each wall
    let profile_a = compute_wall_miter_profile(
        wall_a,
        end_a,
        join_point,
        &dir_a,
        &normal_a,
        &miter_direction,
        tolerance,
    )?;

    let profile_b = compute_wall_miter_profile(
        wall_b,
        end_b,
        join_point,
        &dir_b,
        &normal_b,
        &miter_direction,
        tolerance,
    )?;

    Ok(MiterJoinResult {
        profile_a,
        profile_b,
        miter_direction,
        bisector,
    })
}

/// Get the direction vector of a wall pointing away from the join.
fn get_wall_direction_from_join(wall: &Wall, end: WallEnd) -> GeometryResult<Vector2> {
    let raw_dir = wall.direction()?;
    match end {
        WallEnd::Start => Ok(-raw_dir), // Start is at join, so away is toward end
        WallEnd::End => Ok(raw_dir),    // End is at join, so away is toward start
    }
}

/// Compute the bisector direction between two vectors.
///
/// The bisector splits the angle between the vectors equally.
fn compute_bisector(dir_a: &Vector2, dir_b: &Vector2) -> GeometryResult<Vector2> {
    // Normalize both directions
    let norm_a = dir_a
        .normalize()
        .map_err(|_| GeometryError::ZeroLengthWall)?;
    let norm_b = dir_b
        .normalize()
        .map_err(|_| GeometryError::ZeroLengthWall)?;

    // Bisector is the sum of normalized vectors, then normalized
    let sum = norm_a + norm_b;

    // Handle case where vectors are opposite (180 degrees)
    if sum.length_squared() < 1e-10 {
        // Return perpendicular to either direction
        return Ok(norm_a.perp());
    }

    sum.normalize().map_err(|_| GeometryError::ZeroLengthWall)
}

/// Compute the miter profile for one wall.
///
/// Returns the four corner points of the wall end after applying the miter cut.
fn compute_wall_miter_profile(
    wall: &Wall,
    end: WallEnd,
    join_point: Point2,
    wall_dir: &Vector2,
    wall_normal: &Vector2,
    miter_dir: &Vector2,
    _tolerance: f64,
) -> GeometryResult<WallJoinProfile> {
    let half_thickness = wall.thickness / 2.0;

    // The two edges of the wall (inner and outer)
    // Inner edge: join_point + normal * half_thickness
    // Outer edge: join_point - normal * half_thickness
    let inner_edge_point = join_point + *wall_normal * half_thickness;
    let outer_edge_point = join_point - *wall_normal * half_thickness;

    // Find where each edge intersects the miter line
    // The miter line passes through join_point with direction miter_dir

    // For each edge, we have a line:
    //   edge_line: edge_point + t * wall_dir
    // We want to find where this intersects:
    //   miter_line: join_point + s * miter_dir

    let inner_near = intersect_edge_with_miter(inner_edge_point, *wall_dir, join_point, *miter_dir)
        .unwrap_or(inner_edge_point);

    let outer_near = intersect_edge_with_miter(outer_edge_point, *wall_dir, join_point, *miter_dir)
        .unwrap_or(outer_edge_point);

    // The "far" corners are offset along the wall direction
    // We use the wall thickness as a reasonable offset for the profile
    let offset_distance = wall.thickness;
    let inner_far = inner_near + *wall_dir * offset_distance;
    let outer_far = outer_near + *wall_dir * offset_distance;

    Ok(WallJoinProfile {
        wall_id: wall.id,
        wall_end: end,
        corners: [inner_near, outer_near, outer_far, inner_far],
        direction: *wall_dir,
    })
}

/// Find intersection between a wall edge line and the miter line.
///
/// Edge line: edge_point + t * edge_dir
/// Miter line: miter_point + s * miter_dir
fn intersect_edge_with_miter(
    edge_point: Point2,
    edge_dir: Vector2,
    miter_point: Point2,
    miter_dir: Vector2,
) -> Option<Point2> {
    // Solve: edge_point + t * edge_dir = miter_point + s * miter_dir
    // Rearranging: t * edge_dir - s * miter_dir = miter_point - edge_point

    // Using 2D line intersection formula
    let d = edge_point - miter_point;

    let cross = edge_dir.cross(&miter_dir);
    if cross.abs() < 1e-10 {
        // Lines are parallel
        return None;
    }

    let t = miter_dir.cross(&d) / cross;

    Some(edge_point + edge_dir * t)
}

/// Compute the miter angle (half the angle between walls).
///
/// This is useful for calculating how much material is removed at the miter.
pub fn compute_miter_angle(dir_a: &Vector2, dir_b: &Vector2) -> f64 {
    let len_a = dir_a.length();
    let len_b = dir_b.length();

    if len_a < 1e-10 || len_b < 1e-10 {
        return 0.0;
    }

    let cos_angle = dir_a.dot(dir_b) / (len_a * len_b);
    let angle = cos_angle.clamp(-1.0, 1.0).acos();

    // Miter angle is half the angle between walls
    angle / 2.0
}

/// Check if a miter join is valid (walls must meet at an angle > 0 and < 180 degrees).
pub fn is_valid_miter_angle(dir_a: &Vector2, dir_b: &Vector2, min_angle: f64) -> bool {
    let len_a = dir_a.length();
    let len_b = dir_b.length();

    if len_a < 1e-10 || len_b < 1e-10 {
        return false;
    }

    let cos_angle = dir_a.dot(dir_b) / (len_a * len_b);
    let angle = cos_angle.clamp(-1.0, 1.0).acos();

    // Valid if angle is between min_angle and (PI - min_angle)
    angle >= min_angle && angle <= (std::f64::consts::PI - min_angle)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f64::consts::PI;

    fn create_test_wall(start: (f64, f64), end: (f64, f64)) -> Wall {
        Wall::new(
            Point2::new(start.0, start.1),
            Point2::new(end.0, end.1),
            3.0,
            0.2,
        )
        .unwrap()
    }

    #[test]
    fn miter_join_90_degrees() {
        let wall_a = create_test_wall((0.0, 0.0), (5.0, 0.0));
        let wall_b = create_test_wall((5.0, 0.0), (5.0, 4.0));
        let join_point = Point2::new(5.0, 0.0);

        let result = compute_miter_join(
            &wall_a,
            &wall_b,
            join_point,
            WallEnd::End,
            WallEnd::Start,
            0.001,
        )
        .unwrap();

        // Check that we got profiles for both walls
        assert_eq!(result.profile_a.wall_id, wall_a.id);
        assert_eq!(result.profile_b.wall_id, wall_b.id);

        // Bisector should be at 45 degrees (between horizontal and vertical)
        let bisector_angle = result.bisector.y.atan2(result.bisector.x);
        // Should be around 45 degrees (PI/4) or 135 degrees (3*PI/4)
        let normalized_angle = bisector_angle.abs();
        assert!(
            (normalized_angle - PI / 4.0).abs() < 0.1
                || (normalized_angle - 3.0 * PI / 4.0).abs() < 0.1
        );
    }

    #[test]
    fn miter_join_45_degrees() {
        let wall_a = create_test_wall((0.0, 0.0), (5.0, 0.0));
        let wall_b = create_test_wall((5.0, 0.0), (8.0, 3.0)); // 45 degrees
        let join_point = Point2::new(5.0, 0.0);

        let result = compute_miter_join(
            &wall_a,
            &wall_b,
            join_point,
            WallEnd::End,
            WallEnd::Start,
            0.001,
        )
        .unwrap();

        assert_eq!(result.profile_a.wall_id, wall_a.id);
        assert_eq!(result.profile_b.wall_id, wall_b.id);
    }

    #[test]
    fn bisector_computation() {
        // Two perpendicular vectors
        let dir_a = Vector2::new(1.0, 0.0);
        let dir_b = Vector2::new(0.0, 1.0);

        let bisector = compute_bisector(&dir_a, &dir_b).unwrap();

        // Bisector should be at 45 degrees
        let expected = Vector2::new(1.0, 1.0).normalize().unwrap();
        assert!((bisector.x - expected.x).abs() < 0.01);
        assert!((bisector.y - expected.y).abs() < 0.01);
    }

    #[test]
    fn bisector_opposite_vectors() {
        // Opposite vectors (180 degrees)
        let dir_a = Vector2::new(1.0, 0.0);
        let dir_b = Vector2::new(-1.0, 0.0);

        let bisector = compute_bisector(&dir_a, &dir_b).unwrap();

        // Should return a perpendicular vector
        assert!(bisector.dot(&dir_a).abs() < 0.01);
    }

    #[test]
    fn miter_angle_calculation() {
        // 90 degree angle
        let dir_a = Vector2::new(1.0, 0.0);
        let dir_b = Vector2::new(0.0, 1.0);

        let miter_angle = compute_miter_angle(&dir_a, &dir_b);

        // Miter angle should be 45 degrees (PI/4)
        assert!((miter_angle - PI / 4.0).abs() < 0.01);
    }

    #[test]
    fn valid_miter_angle_check() {
        let dir_a = Vector2::new(1.0, 0.0);
        let dir_b = Vector2::new(0.0, 1.0);

        // 90 degrees is valid
        assert!(is_valid_miter_angle(&dir_a, &dir_b, 0.1));

        // Nearly parallel (very small angle)
        let dir_c = Vector2::new(1.0, 0.0);
        let dir_d = Vector2::new(1.0, 0.01);
        assert!(!is_valid_miter_angle(&dir_c, &dir_d, 0.1));
    }

    #[test]
    fn edge_miter_intersection() {
        // Edge line at y=1, going in x direction
        let edge_point = Point2::new(0.0, 1.0);
        let edge_dir = Vector2::new(1.0, 0.0);

        // Miter line through origin at 45 degrees
        let miter_point = Point2::new(0.0, 0.0);
        let miter_dir = Vector2::new(1.0, 1.0);

        let intersection =
            intersect_edge_with_miter(edge_point, edge_dir, miter_point, miter_dir).unwrap();

        // Intersection should be at (1, 1)
        assert!((intersection.x - 1.0).abs() < 0.01);
        assert!((intersection.y - 1.0).abs() < 0.01);
    }

    #[test]
    fn miter_profile_corners() {
        let wall = create_test_wall((0.0, 0.0), (5.0, 0.0));
        let join_point = Point2::new(5.0, 0.0);

        let result = compute_miter_join(
            &wall,
            &create_test_wall((5.0, 0.0), (5.0, 4.0)),
            join_point,
            WallEnd::End,
            WallEnd::Start,
            0.001,
        )
        .unwrap();

        // Profile should have 4 corners
        assert_eq!(result.profile_a.corners.len(), 4);
        assert_eq!(result.profile_b.corners.len(), 4);

        // All corners should be near the join point
        for corner in &result.profile_a.corners {
            assert!(corner.distance_to(&join_point) < wall.thickness * 3.0);
        }
    }
}
