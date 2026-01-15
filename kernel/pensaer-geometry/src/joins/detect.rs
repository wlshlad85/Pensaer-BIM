//! Wall join detection algorithms.
//!
//! This module provides algorithms for detecting where walls should be joined.
//! Join detection considers:
//! - Endpoint proximity (walls meeting at endpoints)
//! - Midpoint intersections (T-joins)
//! - Full intersections (cross joins)
//! - Angle between walls (determines join type)

use std::f64::consts::PI;

use pensaer_math::Vector2;
use pensaer_math::robust_predicates::{orientation_2d, Orientation};

use crate::elements::Wall;
use super::{JoinType, WallEnd, WallJoin};

/// Detector for wall joins.
///
/// Analyzes a set of walls and identifies where joins should occur.
pub struct JoinDetector {
    /// Distance tolerance for point coincidence.
    tolerance: f64,
    /// Angle tolerance for determining join types.
    angle_tolerance: f64,
}

impl JoinDetector {
    /// Create a new join detector.
    pub fn new(tolerance: f64, angle_tolerance: f64) -> Self {
        Self {
            tolerance,
            angle_tolerance,
        }
    }

    /// Detect all joins between a set of walls.
    ///
    /// This algorithm:
    /// 1. Checks all pairs of wall endpoints for proximity
    /// 2. Checks for T-joins (endpoint near another wall's side)
    /// 3. Checks for cross joins (wall midpoints intersecting)
    /// 4. Classifies each join by angle
    pub fn detect_all(&self, walls: &[&Wall]) -> Vec<WallJoin> {
        let mut joins = Vec::new();

        // For each pair of walls
        for i in 0..walls.len() {
            for j in (i + 1)..walls.len() {
                if let Some(join) = self.detect_join_between(walls[i], walls[j]) {
                    joins.push(join);
                }
            }
        }

        // Remove duplicate joins (same walls, same point)
        self.deduplicate_joins(joins)
    }

    /// Detect a join between two specific walls.
    fn detect_join_between(&self, wall_a: &Wall, wall_b: &Wall) -> Option<WallJoin> {
        // Strategy:
        // 1. Check endpoint-to-endpoint joins (corner/miter/L)
        // 2. Check endpoint-to-edge joins (T-join)
        // 3. Check edge-to-edge crossing (cross join)

        // Endpoint-to-endpoint detection
        if let Some(join) = self.detect_endpoint_join(wall_a, wall_b) {
            return Some(join);
        }

        // Endpoint-to-edge detection (T-joins)
        if let Some(join) = self.detect_t_join(wall_a, wall_b) {
            return Some(join);
        }

        // Edge crossing detection (cross joins)
        if let Some(join) = self.detect_cross_join(wall_a, wall_b) {
            return Some(join);
        }

        None
    }

    /// Detect endpoint-to-endpoint joins.
    ///
    /// Checks if any endpoint of wall_a is close to any endpoint of wall_b.
    fn detect_endpoint_join(&self, wall_a: &Wall, wall_b: &Wall) -> Option<WallJoin> {
        let endpoints_a = [
            (wall_a.baseline.start, WallEnd::Start),
            (wall_a.baseline.end, WallEnd::End),
        ];
        let endpoints_b = [
            (wall_b.baseline.start, WallEnd::Start),
            (wall_b.baseline.end, WallEnd::End),
        ];

        for (pt_a, end_a) in &endpoints_a {
            for (pt_b, end_b) in &endpoints_b {
                let distance = pt_a.distance_to(pt_b);
                if distance <= self.tolerance {
                    // Found coincident endpoints
                    let join_point = pt_a.midpoint(pt_b);
                    let angle = self.compute_angle_between_walls(wall_a, *end_a, wall_b, *end_b);
                    let join_type = self.classify_endpoint_join(angle);

                    return Some(WallJoin::new(
                        join_type,
                        vec![wall_a.id, wall_b.id],
                        vec![*end_a, *end_b],
                        join_point,
                        angle,
                    ));
                }
            }
        }

        None
    }

    /// Detect T-joins (endpoint of one wall near the side of another).
    fn detect_t_join(&self, wall_a: &Wall, wall_b: &Wall) -> Option<WallJoin> {
        // Check if wall_a's endpoints are near wall_b's edge
        if let Some(join) = self.check_endpoint_to_edge(wall_a, wall_b) {
            return Some(join);
        }

        // Check if wall_b's endpoints are near wall_a's edge
        if let Some(join) = self.check_endpoint_to_edge(wall_b, wall_a) {
            // Swap the order in the result
            let mut join = join;
            join.wall_ids.reverse();
            join.wall_ends.reverse();
            return Some(join);
        }

        None
    }

    /// Check if an endpoint of wall_a is near the edge of wall_b (not at endpoints).
    fn check_endpoint_to_edge(&self, wall_a: &Wall, wall_b: &Wall) -> Option<WallJoin> {
        let endpoints_a = [
            (wall_a.baseline.start, WallEnd::Start),
            (wall_a.baseline.end, WallEnd::End),
        ];

        for (pt_a, end_a) in &endpoints_a {
            // Project point onto wall_b's baseline
            let baseline_vec = wall_b.baseline.end - wall_b.baseline.start;
            let to_point = *pt_a - wall_b.baseline.start;

            let baseline_len_sq = baseline_vec.length_squared();
            if baseline_len_sq < 1e-20 {
                continue; // Degenerate wall
            }

            let t = to_point.dot(&baseline_vec) / baseline_len_sq;

            // Must be in the interior of wall_b (not at endpoints)
            let margin = self.tolerance / wall_b.length();
            if t <= margin || t >= (1.0 - margin) {
                continue; // At or beyond endpoints
            }

            // Compute closest point on wall_b
            let closest = wall_b.baseline.start + baseline_vec * t;
            let distance = pt_a.distance_to(&closest);

            if distance <= self.tolerance {
                // Found T-join
                let angle = self.compute_t_join_angle(wall_a, *end_a, wall_b, t);

                return Some(WallJoin::new(
                    JoinType::TJoin,
                    vec![wall_a.id, wall_b.id],
                    vec![*end_a, WallEnd::Start], // wall_b doesn't have a specific end
                    closest,
                    angle,
                ));
            }
        }

        None
    }

    /// Detect cross joins (walls crossing each other).
    ///
    /// Uses robust geometric predicates to correctly detect nearly-parallel walls.
    fn detect_cross_join(&self, wall_a: &Wall, wall_b: &Wall) -> Option<WallJoin> {
        // Line segment intersection using robust predicates
        let p1 = wall_a.baseline.start;
        let p2 = wall_a.baseline.end;
        let p3 = wall_b.baseline.start;
        let p4 = wall_b.baseline.end;

        // Use robust orientation tests to check if segments can intersect
        // Segments intersect iff (p1,p2) straddles (p3,p4) AND (p3,p4) straddles (p1,p2)
        let o1 = orientation_2d(p1, p2, p3);
        let o2 = orientation_2d(p1, p2, p4);
        let o3 = orientation_2d(p3, p4, p1);
        let o4 = orientation_2d(p3, p4, p2);

        // Check for proper crossing (not just touching)
        // Must have opposite orientations on both sides
        let straddle_a = o1 != o2 && o1 != Orientation::Collinear && o2 != Orientation::Collinear;
        let straddle_b = o3 != o4 && o3 != Orientation::Collinear && o4 != Orientation::Collinear;

        if !straddle_a || !straddle_b {
            return None; // No proper crossing
        }

        // Compute actual intersection point (still using float arithmetic)
        let d1 = p2 - p1;
        let d2 = p4 - p3;
        let d3 = p1 - p3;

        let cross = d1.cross(&d2);
        if cross.abs() < 1e-15 {
            return None; // Parallel (shouldn't happen if straddle checks passed, but safety check)
        }

        let t = d3.cross(&d2) / (-cross);
        let u = d1.cross(&d3) / cross;

        // Check if intersection is in the interior of both segments
        let margin = self.tolerance / wall_a.length().max(wall_b.length());
        if t <= margin || t >= (1.0 - margin) || u <= margin || u >= (1.0 - margin) {
            return None; // Intersection at or beyond endpoints
        }

        let intersection = p1 + d1 * t;
        let angle = self.compute_cross_angle(&d1, &d2);

        Some(WallJoin::new(
            JoinType::CrossJoin,
            vec![wall_a.id, wall_b.id],
            vec![WallEnd::Start, WallEnd::Start], // Neither has a specific end
            intersection,
            angle,
        ))
    }

    /// Compute the angle between two walls at a join.
    ///
    /// Returns angle in radians [0, PI].
    fn compute_angle_between_walls(
        &self,
        wall_a: &Wall,
        end_a: WallEnd,
        wall_b: &Wall,
        end_b: WallEnd,
    ) -> f64 {
        // Get direction vectors pointing AWAY from the join point
        let dir_a = match end_a {
            WallEnd::Start => wall_a.baseline.start - wall_a.baseline.end,
            WallEnd::End => wall_a.baseline.end - wall_a.baseline.start,
        };

        let dir_b = match end_b {
            WallEnd::Start => wall_b.baseline.start - wall_b.baseline.end,
            WallEnd::End => wall_b.baseline.end - wall_b.baseline.start,
        };

        self.angle_between_vectors(&dir_a, &dir_b)
    }

    /// Compute angle for a T-join.
    fn compute_t_join_angle(&self, wall_a: &Wall, end_a: WallEnd, wall_b: &Wall, _t: f64) -> f64 {
        let dir_a = match end_a {
            WallEnd::Start => wall_a.baseline.end - wall_a.baseline.start,
            WallEnd::End => wall_a.baseline.start - wall_a.baseline.end,
        };

        let dir_b = wall_b.baseline.end - wall_b.baseline.start;

        self.angle_between_vectors(&dir_a, &dir_b)
    }

    /// Compute angle for a cross join.
    fn compute_cross_angle(&self, dir_a: &Vector2, dir_b: &Vector2) -> f64 {
        self.angle_between_vectors(dir_a, dir_b)
    }

    /// Compute angle between two vectors (0 to PI).
    fn angle_between_vectors(&self, a: &Vector2, b: &Vector2) -> f64 {
        let len_a = a.length();
        let len_b = b.length();

        if len_a < 1e-10 || len_b < 1e-10 {
            return 0.0;
        }

        let cos_angle = a.dot(b) / (len_a * len_b);
        // Clamp to [-1, 1] to handle floating point errors
        cos_angle.clamp(-1.0, 1.0).acos()
    }

    /// Classify an endpoint join by its angle.
    fn classify_endpoint_join(&self, angle: f64) -> JoinType {
        // Butt joint: walls are collinear (angle ~= PI or ~= 0)
        if (angle - PI).abs() < self.angle_tolerance || angle < self.angle_tolerance {
            return JoinType::Butt;
        }

        // L-join: walls are perpendicular (angle ~= PI/2)
        if (angle - PI / 2.0).abs() < self.angle_tolerance {
            return JoinType::LJoin;
        }

        // Otherwise it's a miter join (arbitrary angle)
        JoinType::Miter
    }

    /// Remove duplicate joins.
    fn deduplicate_joins(&self, mut joins: Vec<WallJoin>) -> Vec<WallJoin> {
        joins.sort_by(|a, b| {
            // Sort by join point for grouping
            let x_cmp = a.join_point.x.partial_cmp(&b.join_point.x).unwrap();
            if x_cmp != std::cmp::Ordering::Equal {
                return x_cmp;
            }
            a.join_point.y.partial_cmp(&b.join_point.y).unwrap()
        });

        let mut result = Vec::new();
        for join in joins {
            // Check if this join is a duplicate of an existing one
            let is_duplicate = result.iter().any(|existing: &WallJoin| {
                existing.join_point.distance_to(&join.join_point) < self.tolerance
                    && self.same_walls(&existing.wall_ids, &join.wall_ids)
            });

            if !is_duplicate {
                result.push(join);
            }
        }

        result
    }

    /// Check if two wall ID lists contain the same walls (order independent).
    fn same_walls(&self, a: &[uuid::Uuid], b: &[uuid::Uuid]) -> bool {
        if a.len() != b.len() {
            return false;
        }
        a.iter().all(|id| b.contains(id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pensaer_math::Point2;
    use std::f64::consts::PI;

    fn create_test_wall(start: (f64, f64), end: (f64, f64)) -> Wall {
        Wall::new(
            Point2::new(start.0, start.1),
            Point2::new(end.0, end.1),
            3.0,
            0.2,
        ).unwrap()
    }

    #[test]
    fn detect_l_join_90_degrees() {
        let wall1 = create_test_wall((0.0, 0.0), (5.0, 0.0));
        let wall2 = create_test_wall((5.0, 0.0), (5.0, 4.0));

        let detector = JoinDetector::new(0.001, 0.1);
        let joins = detector.detect_all(&[&wall1, &wall2]);

        assert_eq!(joins.len(), 1);
        assert_eq!(joins[0].join_type, JoinType::LJoin);
        assert!((joins[0].join_point.x - 5.0).abs() < 0.01);
        assert!((joins[0].join_point.y - 0.0).abs() < 0.01);
        // Angle should be ~90 degrees
        assert!((joins[0].angle - PI / 2.0).abs() < 0.2);
    }

    #[test]
    fn detect_miter_join_45_degrees() {
        let wall1 = create_test_wall((0.0, 0.0), (5.0, 0.0));
        let wall2 = create_test_wall((5.0, 0.0), (8.0, 3.0)); // 45-degree angle

        let detector = JoinDetector::new(0.001, 0.05);
        let joins = detector.detect_all(&[&wall1, &wall2]);

        assert_eq!(joins.len(), 1);
        assert_eq!(joins[0].join_type, JoinType::Miter);
    }

    #[test]
    fn detect_butt_join() {
        let wall1 = create_test_wall((0.0, 0.0), (5.0, 0.0));
        let wall2 = create_test_wall((5.0, 0.0), (10.0, 0.0)); // Collinear

        let detector = JoinDetector::new(0.001, 0.1);
        let joins = detector.detect_all(&[&wall1, &wall2]);

        assert_eq!(joins.len(), 1);
        assert_eq!(joins[0].join_type, JoinType::Butt);
    }

    #[test]
    fn detect_t_join() {
        let wall1 = create_test_wall((0.0, 0.0), (10.0, 0.0)); // Horizontal
        let wall2 = create_test_wall((5.0, 0.0), (5.0, 4.0));  // Vertical ending at wall1

        let detector = JoinDetector::new(0.001, 0.1);
        let joins = detector.detect_all(&[&wall1, &wall2]);

        // This should be detected as an L-join (endpoints coincide)
        // or a T-join if one continues
        assert!(!joins.is_empty());
    }

    #[test]
    fn detect_cross_join() {
        let wall1 = create_test_wall((0.0, 0.0), (10.0, 0.0)); // Horizontal
        let wall2 = create_test_wall((5.0, -2.0), (5.0, 2.0)); // Vertical through middle

        let detector = JoinDetector::new(0.001, 0.1);
        let joins = detector.detect_all(&[&wall1, &wall2]);

        assert_eq!(joins.len(), 1);
        assert_eq!(joins[0].join_type, JoinType::CrossJoin);
        assert!((joins[0].join_point.x - 5.0).abs() < 0.01);
        assert!((joins[0].join_point.y - 0.0).abs() < 0.01);
    }

    #[test]
    fn no_join_distant_walls() {
        let wall1 = create_test_wall((0.0, 0.0), (5.0, 0.0));
        let wall2 = create_test_wall((100.0, 100.0), (105.0, 100.0));

        let detector = JoinDetector::new(0.001, 0.1);
        let joins = detector.detect_all(&[&wall1, &wall2]);

        assert!(joins.is_empty());
    }

    #[test]
    fn multiple_walls_multiple_joins() {
        // Create a simple rectangle of 4 walls
        let wall1 = create_test_wall((0.0, 0.0), (10.0, 0.0));
        let wall2 = create_test_wall((10.0, 0.0), (10.0, 8.0));
        let wall3 = create_test_wall((10.0, 8.0), (0.0, 8.0));
        let wall4 = create_test_wall((0.0, 8.0), (0.0, 0.0));

        let detector = JoinDetector::new(0.001, 0.1);
        let joins = detector.detect_all(&[&wall1, &wall2, &wall3, &wall4]);

        // Should detect 4 L-joins at corners
        assert_eq!(joins.len(), 4);
        for join in &joins {
            assert_eq!(join.join_type, JoinType::LJoin);
        }
    }

    #[test]
    fn angle_between_vectors() {
        let detector = JoinDetector::new(0.001, 0.1);

        // Perpendicular vectors
        let a = Vector2::new(1.0, 0.0);
        let b = Vector2::new(0.0, 1.0);
        let angle = detector.angle_between_vectors(&a, &b);
        assert!((angle - PI / 2.0).abs() < 0.01);

        // Parallel vectors (same direction)
        let c = Vector2::new(1.0, 0.0);
        let d = Vector2::new(2.0, 0.0);
        let angle2 = detector.angle_between_vectors(&c, &d);
        assert!(angle2.abs() < 0.01);

        // Opposite vectors
        let e = Vector2::new(1.0, 0.0);
        let f = Vector2::new(-1.0, 0.0);
        let angle3 = detector.angle_between_vectors(&e, &f);
        assert!((angle3 - PI).abs() < 0.01);
    }
}
