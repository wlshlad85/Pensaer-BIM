//! Line types for 2D and 3D lines with intersection and projection operations.
//!
//! Uses **self-correcting robust predicates** where applicable for reliable
//! geometric tests even in near-degenerate configurations.

use serde::{Deserialize, Serialize};

use crate::error::{MathError, MathResult};
use crate::point::{Point2, Point3};
use crate::robust_predicates::{orientation_2d, Orientation};
use crate::vector::{Vector2, Vector3};

/// A 2D line represented by origin point and direction vector.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Line2 {
    pub origin: Point2,
    pub direction: Vector2,
}

impl Line2 {
    /// Create a new line from origin and direction.
    /// Direction will be normalized.
    #[inline]
    pub fn new(origin: Point2, direction: Vector2) -> MathResult<Self> {
        let dir = direction.normalize()?;
        Ok(Self {
            origin,
            direction: dir,
        })
    }

    /// Create a line from two points.
    /// Returns error if points are coincident.
    pub fn from_points(a: Point2, b: Point2) -> MathResult<Self> {
        let direction = b - a;
        if direction.length_squared() < 1e-15 {
            return Err(MathError::ZeroLengthLine);
        }
        Self::new(a, direction)
    }

    /// Get point at parameter t along the line.
    /// origin + t * direction
    #[inline]
    pub fn point_at(&self, t: f64) -> Point2 {
        self.origin + self.direction * t
    }

    /// Find intersection with another line.
    /// Returns None if lines are parallel (or coincident).
    pub fn intersect(&self, other: &Line2) -> MathResult<Point2> {
        // Using parametric form:
        // P = origin1 + t * dir1
        // P = origin2 + s * dir2
        // Solve for t using cross product method

        let d1 = self.direction;
        let d2 = other.direction;
        let cross = d1.cross(&d2);

        if cross.abs() < 1e-15 {
            return Err(MathError::ParallelLines);
        }

        let delta = other.origin - self.origin;
        let t = delta.cross(&d2) / cross;

        Ok(self.point_at(t))
    }

    /// Find intersection parameter t for this line.
    /// Returns the t value where this line intersects other.
    pub fn intersect_parameter(&self, other: &Line2) -> MathResult<f64> {
        let d1 = self.direction;
        let d2 = other.direction;
        let cross = d1.cross(&d2);

        if cross.abs() < 1e-15 {
            return Err(MathError::ParallelLines);
        }

        let delta = other.origin - self.origin;
        Ok(delta.cross(&d2) / cross)
    }

    /// Calculate signed distance from a point to this line.
    /// Positive = left of line, Negative = right of line.
    #[inline]
    pub fn signed_distance_to_point(&self, p: &Point2) -> f64 {
        let v = *p - self.origin;
        self.direction.cross(&v)
    }

    /// Calculate absolute distance from a point to this line.
    #[inline]
    pub fn distance_to_point(&self, p: &Point2) -> f64 {
        self.signed_distance_to_point(p).abs()
    }

    /// Determine which side of the line a point is on using robust predicates.
    ///
    /// Returns the orientation of point `p` relative to the line direction.
    /// Uses self-correcting arithmetic for reliable results near the line.
    pub fn side_of_point(&self, p: &Point2) -> Orientation {
        // Create a second point along the line direction
        let second_point = self.origin + self.direction;
        orientation_2d(self.origin, second_point, *p)
    }

    /// Check if a point is strictly to the left of this line.
    ///
    /// Uses robust predicates for reliable results even for points very close to the line.
    #[inline]
    pub fn point_is_left(&self, p: &Point2) -> bool {
        self.side_of_point(p) == Orientation::CounterClockwise
    }

    /// Check if a point is strictly to the right of this line.
    ///
    /// Uses robust predicates for reliable results even for points very close to the line.
    #[inline]
    pub fn point_is_right(&self, p: &Point2) -> bool {
        self.side_of_point(p) == Orientation::Clockwise
    }

    /// Check if a point is on the line using robust predicates.
    ///
    /// Uses robust predicates for reliable collinearity test.
    #[inline]
    pub fn point_is_collinear(&self, p: &Point2) -> bool {
        self.side_of_point(p) == Orientation::Collinear
    }

    /// Find the closest point on this line to a given point.
    #[inline]
    pub fn closest_point(&self, p: &Point2) -> Point2 {
        let t = self.project_point(p);
        self.point_at(t)
    }

    /// Project a point onto this line, returning the parameter t.
    /// The closest point is at origin + t * direction.
    #[inline]
    pub fn project_point(&self, p: &Point2) -> f64 {
        let v = *p - self.origin;
        v.dot(&self.direction)
    }

    /// Check if a point lies on this line (within tolerance).
    #[inline]
    pub fn contains_point(&self, p: &Point2, tolerance: f64) -> bool {
        self.distance_to_point(p) < tolerance
    }

    /// Get perpendicular line through a point.
    pub fn perpendicular_at(&self, p: &Point2) -> Self {
        Self {
            origin: *p,
            direction: self.direction.perp(),
        }
    }

    /// Get perpendicular line through parameter t on this line.
    pub fn perpendicular_at_t(&self, t: f64) -> Self {
        Self {
            origin: self.point_at(t),
            direction: self.direction.perp(),
        }
    }

    /// Check if two lines are parallel.
    #[inline]
    pub fn is_parallel_to(&self, other: &Line2, tolerance: f64) -> bool {
        self.direction.cross(&other.direction).abs() < tolerance
    }
}

/// A 2D line segment with start and end points.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct LineSegment2 {
    pub start: Point2,
    pub end: Point2,
}

impl LineSegment2 {
    /// Create a new line segment.
    #[inline]
    pub fn new(start: Point2, end: Point2) -> Self {
        Self { start, end }
    }

    /// Length of the segment.
    #[inline]
    pub fn length(&self) -> f64 {
        self.start.distance_to(&self.end)
    }

    /// Squared length (avoids sqrt).
    #[inline]
    pub fn length_squared(&self) -> f64 {
        self.start.distance_squared_to(&self.end)
    }

    /// Direction vector (not normalized).
    #[inline]
    pub fn direction(&self) -> Vector2 {
        self.end - self.start
    }

    /// Normalized direction vector.
    pub fn direction_normalized(&self) -> MathResult<Vector2> {
        self.direction().normalize()
    }

    /// Midpoint of the segment.
    #[inline]
    pub fn midpoint(&self) -> Point2 {
        self.start.midpoint(&self.end)
    }

    /// Convert to infinite line.
    pub fn to_line(&self) -> MathResult<Line2> {
        Line2::from_points(self.start, self.end)
    }

    /// Get point at parameter t (0 = start, 1 = end).
    #[inline]
    pub fn point_at(&self, t: f64) -> Point2 {
        self.start.lerp(&self.end, t)
    }

    /// Project point onto segment, returning clamped parameter t in [0, 1].
    pub fn project_point_clamped(&self, p: &Point2) -> f64 {
        let v = self.end - self.start;
        let len_sq = v.length_squared();
        if len_sq < 1e-15 {
            return 0.0;
        }
        let w = *p - self.start;
        let t = w.dot(&v) / len_sq;
        t.clamp(0.0, 1.0)
    }

    /// Project point onto segment line, returning unclamped parameter t.
    pub fn project_point(&self, p: &Point2) -> f64 {
        let v = self.end - self.start;
        let len_sq = v.length_squared();
        if len_sq < 1e-15 {
            return 0.0;
        }
        let w = *p - self.start;
        w.dot(&v) / len_sq
    }

    /// Closest point on segment to given point.
    #[inline]
    pub fn closest_point(&self, p: &Point2) -> Point2 {
        let t = self.project_point_clamped(p);
        self.point_at(t)
    }

    /// Distance from point to segment.
    #[inline]
    pub fn distance_to_point(&self, p: &Point2) -> f64 {
        let closest = self.closest_point(p);
        p.distance_to(&closest)
    }

    /// Check if point lies on segment (within tolerance).
    pub fn contains_point(&self, p: &Point2, tolerance: f64) -> bool {
        let t = self.project_point(p);
        if t < -tolerance || t > 1.0 + tolerance {
            return false;
        }
        self.distance_to_point(p) < tolerance
    }

    /// Intersect with another segment. Returns parameter t for this segment.
    /// Returns None if no intersection or parallel.
    pub fn intersect(&self, other: &LineSegment2) -> Option<Point2> {
        let d1 = self.direction();
        let d2 = other.direction();
        let cross = d1.cross(&d2);

        if cross.abs() < 1e-15 {
            return None; // Parallel
        }

        let delta = other.start - self.start;
        let t = delta.cross(&d2) / cross;
        let s = delta.cross(&d1) / cross;

        // Check if intersection is within both segments
        if (0.0..=1.0).contains(&t) && (0.0..=1.0).contains(&s) {
            Some(self.point_at(t))
        } else {
            None
        }
    }

    /// Check if segments intersect (including at endpoints).
    ///
    /// Uses robust geometric predicates to handle edge cases correctly.
    /// This is more reliable than the `intersect()` method for boolean checks.
    pub fn intersects(&self, other: &LineSegment2) -> bool {
        crate::robust_predicates::segments_intersect(self.start, self.end, other.start, other.end)
    }

    /// Check if segments properly intersect (cross each other, not just touch).
    ///
    /// Uses robust geometric predicates. Returns false for endpoint touches.
    pub fn properly_intersects(&self, other: &LineSegment2) -> bool {
        crate::robust_predicates::segments_properly_intersect(
            self.start,
            self.end,
            other.start,
            other.end,
        )
    }
}

/// A 3D line represented by origin point and direction vector.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Line3 {
    pub origin: Point3,
    pub direction: Vector3,
}

impl Line3 {
    /// Create a new line from origin and direction.
    /// Direction will be normalized.
    #[inline]
    pub fn new(origin: Point3, direction: Vector3) -> MathResult<Self> {
        let dir = direction.normalize()?;
        Ok(Self {
            origin,
            direction: dir,
        })
    }

    /// Create a line from two points.
    pub fn from_points(a: Point3, b: Point3) -> MathResult<Self> {
        let direction = b - a;
        if direction.length_squared() < 1e-15 {
            return Err(MathError::ZeroLengthLine);
        }
        Self::new(a, direction)
    }

    /// Get point at parameter t along the line.
    #[inline]
    pub fn point_at(&self, t: f64) -> Point3 {
        self.origin + self.direction * t
    }

    /// Project a point onto this line, returning the parameter t.
    #[inline]
    pub fn project_point(&self, p: &Point3) -> f64 {
        let v = *p - self.origin;
        v.dot(&self.direction)
    }

    /// Find the closest point on this line to a given point.
    #[inline]
    pub fn closest_point(&self, p: &Point3) -> Point3 {
        let t = self.project_point(p);
        self.point_at(t)
    }

    /// Calculate distance from a point to this line.
    #[inline]
    pub fn distance_to_point(&self, p: &Point3) -> f64 {
        let v = *p - self.origin;
        let proj_len = v.dot(&self.direction);
        let proj = self.direction * proj_len;
        (v - proj).length()
    }

    /// Check if a point lies on this line (within tolerance).
    #[inline]
    pub fn contains_point(&self, p: &Point3, tolerance: f64) -> bool {
        self.distance_to_point(p) < tolerance
    }

    /// Find closest points between two 3D lines.
    /// Returns (t1, t2) where:
    /// - Closest point on line1 is line1.point_at(t1)
    /// - Closest point on line2 is line2.point_at(t2)
    pub fn closest_approach(&self, other: &Line3) -> MathResult<(f64, f64)> {
        let d1 = self.direction;
        let d2 = other.direction;
        let r = self.origin - other.origin;

        let a = d1.dot(&d1); // Should be 1 if normalized
        let b = d1.dot(&d2);
        let c = d1.dot(&r);
        let e = d2.dot(&d2); // Should be 1 if normalized
        let f = d2.dot(&r);

        let denom = a * e - b * b;

        if denom.abs() < 1e-15 {
            // Lines are parallel
            return Err(MathError::ParallelLines);
        }

        let t1 = (b * f - c * e) / denom;
        let t2 = (a * f - b * c) / denom;

        Ok((t1, t2))
    }

    /// Minimum distance between two 3D lines.
    pub fn distance_to_line(&self, other: &Line3) -> f64 {
        match self.closest_approach(other) {
            Ok((t1, t2)) => {
                let p1 = self.point_at(t1);
                let p2 = other.point_at(t2);
                p1.distance_to(&p2)
            }
            Err(_) => {
                // Parallel lines - distance to any point
                self.distance_to_point(&other.origin)
            }
        }
    }
}

/// A 3D line segment with start and end points.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct LineSegment3 {
    pub start: Point3,
    pub end: Point3,
}

impl LineSegment3 {
    /// Create a new line segment.
    #[inline]
    pub fn new(start: Point3, end: Point3) -> Self {
        Self { start, end }
    }

    /// Length of the segment.
    #[inline]
    pub fn length(&self) -> f64 {
        self.start.distance_to(&self.end)
    }

    /// Squared length.
    #[inline]
    pub fn length_squared(&self) -> f64 {
        self.start.distance_squared_to(&self.end)
    }

    /// Direction vector (not normalized).
    #[inline]
    pub fn direction(&self) -> Vector3 {
        self.end - self.start
    }

    /// Normalized direction vector.
    pub fn direction_normalized(&self) -> MathResult<Vector3> {
        self.direction().normalize()
    }

    /// Midpoint of the segment.
    #[inline]
    pub fn midpoint(&self) -> Point3 {
        self.start.midpoint(&self.end)
    }

    /// Convert to infinite line.
    pub fn to_line(&self) -> MathResult<Line3> {
        Line3::from_points(self.start, self.end)
    }

    /// Get point at parameter t (0 = start, 1 = end).
    #[inline]
    pub fn point_at(&self, t: f64) -> Point3 {
        self.start.lerp(&self.end, t)
    }

    /// Project point onto segment, returning clamped parameter t in [0, 1].
    pub fn project_point_clamped(&self, p: &Point3) -> f64 {
        let v = self.end - self.start;
        let len_sq = v.length_squared();
        if len_sq < 1e-15 {
            return 0.0;
        }
        let w = *p - self.start;
        let t = w.dot(&v) / len_sq;
        t.clamp(0.0, 1.0)
    }

    /// Closest point on segment to given point.
    #[inline]
    pub fn closest_point(&self, p: &Point3) -> Point3 {
        let t = self.project_point_clamped(p);
        self.point_at(t)
    }

    /// Distance from point to segment.
    #[inline]
    pub fn distance_to_point(&self, p: &Point3) -> f64 {
        let closest = self.closest_point(p);
        p.distance_to(&closest)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPSILON: f64 = 1e-10;

    #[test]
    fn line2_from_points() {
        let line = Line2::from_points(Point2::new(0.0, 0.0), Point2::new(1.0, 0.0)).unwrap();
        assert!((line.direction.x - 1.0).abs() < EPSILON);
        assert!(line.direction.y.abs() < EPSILON);
    }

    #[test]
    fn line2_from_points_zero_length() {
        let result = Line2::from_points(Point2::new(1.0, 1.0), Point2::new(1.0, 1.0));
        assert!(result.is_err());
    }

    #[test]
    fn line2_intersection() {
        // Horizontal line y = 0
        let line1 = Line2::from_points(Point2::new(0.0, 0.0), Point2::new(1.0, 0.0)).unwrap();
        // Vertical line x = 5
        let line2 = Line2::from_points(Point2::new(5.0, 0.0), Point2::new(5.0, 1.0)).unwrap();

        let intersection = line1.intersect(&line2).unwrap();
        assert!((intersection.x - 5.0).abs() < EPSILON);
        assert!(intersection.y.abs() < EPSILON);
    }

    #[test]
    fn line2_parallel_no_intersection() {
        // Two horizontal parallel lines
        let line1 = Line2::from_points(Point2::new(0.0, 0.0), Point2::new(1.0, 0.0)).unwrap();
        let line2 = Line2::from_points(Point2::new(0.0, 1.0), Point2::new(1.0, 1.0)).unwrap();

        assert!(line1.intersect(&line2).is_err());
    }

    #[test]
    fn line2_distance_to_point() {
        let line = Line2::from_points(Point2::new(0.0, 0.0), Point2::new(1.0, 0.0)).unwrap();
        let p = Point2::new(5.0, 3.0);
        assert!((line.distance_to_point(&p) - 3.0).abs() < EPSILON);
    }

    #[test]
    fn line2_closest_point() {
        let line = Line2::from_points(Point2::new(0.0, 0.0), Point2::new(1.0, 0.0)).unwrap();
        let p = Point2::new(5.0, 3.0);
        let closest = line.closest_point(&p);
        assert!((closest.x - 5.0).abs() < EPSILON);
        assert!(closest.y.abs() < EPSILON);
    }

    #[test]
    fn segment2_intersection() {
        let seg1 = LineSegment2::new(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0));
        let seg2 = LineSegment2::new(Point2::new(0.0, 10.0), Point2::new(10.0, 0.0));

        let intersection = seg1.intersect(&seg2).unwrap();
        assert!((intersection.x - 5.0).abs() < EPSILON);
        assert!((intersection.y - 5.0).abs() < EPSILON);
    }

    #[test]
    fn segment2_no_intersection() {
        let seg1 = LineSegment2::new(Point2::new(0.0, 0.0), Point2::new(1.0, 1.0));
        let seg2 = LineSegment2::new(Point2::new(2.0, 0.0), Point2::new(3.0, 1.0));

        assert!(seg1.intersect(&seg2).is_none());
    }

    #[test]
    fn segment2_distance_to_point() {
        let seg = LineSegment2::new(Point2::new(0.0, 0.0), Point2::new(10.0, 0.0));

        // Point projects onto segment
        assert!((seg.distance_to_point(&Point2::new(5.0, 3.0)) - 3.0).abs() < EPSILON);

        // Point projects before start
        assert!((seg.distance_to_point(&Point2::new(-3.0, 4.0)) - 5.0).abs() < EPSILON);

        // Point projects after end
        assert!((seg.distance_to_point(&Point2::new(13.0, 4.0)) - 5.0).abs() < EPSILON);
    }

    #[test]
    fn line3_distance_to_point() {
        let line =
            Line3::from_points(Point3::new(0.0, 0.0, 0.0), Point3::new(1.0, 0.0, 0.0)).unwrap();

        let p = Point3::new(5.0, 3.0, 4.0);
        assert!((line.distance_to_point(&p) - 5.0).abs() < EPSILON);
    }

    #[test]
    fn line3_closest_approach() {
        // Two skew lines
        let line1 =
            Line3::from_points(Point3::new(0.0, 0.0, 0.0), Point3::new(1.0, 0.0, 0.0)).unwrap();
        let line2 =
            Line3::from_points(Point3::new(0.0, 1.0, 1.0), Point3::new(0.0, 1.0, 2.0)).unwrap();

        let (t1, t2) = line1.closest_approach(&line2).unwrap();
        let p1 = line1.point_at(t1);
        let p2 = line2.point_at(t2);

        assert!(p1.x.abs() < EPSILON);
        assert!(p2.z.abs() < 2.0); // z should be 1.0

        // Distance should be 1.0 (y direction)
        let dist = p1.distance_to(&p2);
        assert!((dist - 1.0).abs() < EPSILON);
    }

    #[test]
    fn segment3_closest_point() {
        let seg = LineSegment3::new(Point3::new(0.0, 0.0, 0.0), Point3::new(10.0, 0.0, 0.0));

        // Point projects onto segment
        let p1 = Point3::new(5.0, 3.0, 0.0);
        let closest1 = seg.closest_point(&p1);
        assert!((closest1.x - 5.0).abs() < EPSILON);

        // Point beyond end
        let p2 = Point3::new(15.0, 0.0, 0.0);
        let closest2 = seg.closest_point(&p2);
        assert!((closest2.x - 10.0).abs() < EPSILON);
    }

    // Tests for robust predicate methods

    #[test]
    fn line2_robust_side_of_point() {
        use crate::robust_predicates::Orientation;

        // Horizontal line going right
        let line = Line2::from_points(Point2::new(0.0, 0.0), Point2::new(10.0, 0.0)).unwrap();

        // Point above (left when walking along line)
        assert_eq!(
            line.side_of_point(&Point2::new(5.0, 1.0)),
            Orientation::CounterClockwise
        );
        assert!(line.point_is_left(&Point2::new(5.0, 1.0)));

        // Point below (right when walking along line)
        assert_eq!(
            line.side_of_point(&Point2::new(5.0, -1.0)),
            Orientation::Clockwise
        );
        assert!(line.point_is_right(&Point2::new(5.0, -1.0)));

        // Point on line
        assert_eq!(
            line.side_of_point(&Point2::new(5.0, 0.0)),
            Orientation::Collinear
        );
        assert!(line.point_is_collinear(&Point2::new(5.0, 0.0)));
    }

    #[test]
    fn line2_robust_nearly_collinear() {
        use crate::robust_predicates::Orientation;

        // Test with a point very close to the line
        let line = Line2::from_points(Point2::new(0.0, 0.0), Point2::new(10.0, 0.0)).unwrap();

        // Very small offset - robust predicate should still detect it
        let tiny_offset = Point2::new(5.0, 1e-14);
        let result = line.side_of_point(&tiny_offset);

        // At this scale, might be collinear or CCW depending on precision
        // The key is it shouldn't incorrectly report the opposite side
        assert!(result == Orientation::Collinear || result == Orientation::CounterClockwise);

        // Larger offset should definitely be detected
        let small_offset = Point2::new(5.0, 1e-10);
        assert_eq!(
            line.side_of_point(&small_offset),
            Orientation::CounterClockwise
        );
    }

    #[test]
    fn segment2_robust_intersection() {
        // Test the robust segment intersection predicates
        let seg1 = LineSegment2::new(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0));
        let seg2 = LineSegment2::new(Point2::new(0.0, 10.0), Point2::new(10.0, 0.0));

        // Crossing segments
        assert!(seg1.intersects(&seg2));
        assert!(seg1.properly_intersects(&seg2));

        // Segments sharing endpoint
        let seg3 = LineSegment2::new(Point2::new(0.0, 0.0), Point2::new(5.0, 0.0));
        let seg4 = LineSegment2::new(Point2::new(5.0, 0.0), Point2::new(10.0, 0.0));

        assert!(seg3.intersects(&seg4)); // Touch counts as intersect
        assert!(!seg3.properly_intersects(&seg4)); // But not proper intersection

        // Non-intersecting segments
        let seg5 = LineSegment2::new(Point2::new(0.0, 0.0), Point2::new(1.0, 0.0));
        let seg6 = LineSegment2::new(Point2::new(0.0, 1.0), Point2::new(1.0, 1.0));

        assert!(!seg5.intersects(&seg6));
        assert!(!seg5.properly_intersects(&seg6));
    }
}
