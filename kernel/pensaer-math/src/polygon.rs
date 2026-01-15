//! Polygon types for 2D boundary representation.
//!
//! Uses **self-correcting robust predicates** for all geometric tests to ensure
//! correct results even for nearly-degenerate configurations.
//!
//! Used for floor plans, room boundaries, and wall profiles.

use serde::{Deserialize, Serialize};

use crate::bbox::BoundingBox2;
use crate::error::{MathError, MathResult};
use crate::line::LineSegment2;
use crate::point::Point2;
use crate::robust_predicates::{orientation_2d, segments_properly_intersect, Orientation};
use crate::vector::Vector2;

/// A 2D polygon defined by an ordered list of vertices.
///
/// Vertices are assumed to form a closed loop (last vertex implicitly connects to first).
/// The polygon can be either clockwise or counter-clockwise wound.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Polygon2 {
    pub vertices: Vec<Point2>,
}

impl Polygon2 {
    /// Create a new polygon from vertices.
    /// Requires at least 3 vertices.
    pub fn new(vertices: Vec<Point2>) -> MathResult<Self> {
        if vertices.len() < 3 {
            return Err(MathError::InsufficientVertices);
        }
        Ok(Self { vertices })
    }

    /// Create a rectangle polygon from min and max corners.
    pub fn rectangle(min: Point2, max: Point2) -> Self {
        Self {
            vertices: vec![
                Point2::new(min.x, min.y),
                Point2::new(max.x, min.y),
                Point2::new(max.x, max.y),
                Point2::new(min.x, max.y),
            ],
        }
    }

    /// Create a rectangle polygon centered at a point.
    pub fn centered_rectangle(center: Point2, width: f64, height: f64) -> Self {
        let half_w = width / 2.0;
        let half_h = height / 2.0;
        Self {
            vertices: vec![
                Point2::new(center.x - half_w, center.y - half_h),
                Point2::new(center.x + half_w, center.y - half_h),
                Point2::new(center.x + half_w, center.y + half_h),
                Point2::new(center.x - half_w, center.y + half_h),
            ],
        }
    }

    /// Number of vertices.
    #[inline]
    pub fn vertex_count(&self) -> usize {
        self.vertices.len()
    }

    /// Number of edges (same as vertex count for closed polygon).
    #[inline]
    pub fn edge_count(&self) -> usize {
        self.vertices.len()
    }

    /// Get edge as line segment by index.
    pub fn edge(&self, index: usize) -> LineSegment2 {
        let n = self.vertices.len();
        LineSegment2::new(self.vertices[index], self.vertices[(index + 1) % n])
    }

    /// Iterate over all edges as line segments.
    pub fn edges(&self) -> impl Iterator<Item = LineSegment2> + '_ {
        let n = self.vertices.len();
        (0..n).map(move |i| LineSegment2::new(self.vertices[i], self.vertices[(i + 1) % n]))
    }

    /// Calculate signed area using shoelace formula.
    /// Positive = counter-clockwise, Negative = clockwise.
    pub fn signed_area(&self) -> f64 {
        let n = self.vertices.len();
        if n < 3 {
            return 0.0;
        }

        let mut sum = 0.0;
        for i in 0..n {
            let j = (i + 1) % n;
            sum += self.vertices[i].x * self.vertices[j].y;
            sum -= self.vertices[j].x * self.vertices[i].y;
        }
        sum / 2.0
    }

    /// Calculate absolute area.
    #[inline]
    pub fn area(&self) -> f64 {
        self.signed_area().abs()
    }

    /// Calculate perimeter (sum of edge lengths).
    pub fn perimeter(&self) -> f64 {
        self.edges().map(|e| e.length()).sum()
    }

    /// Calculate centroid (center of mass for uniform density).
    pub fn centroid(&self) -> Point2 {
        let n = self.vertices.len();
        if n == 0 {
            return Point2::ORIGIN;
        }

        let signed_area = self.signed_area();
        if signed_area.abs() < 1e-15 {
            // Degenerate polygon - return average of vertices
            let sum_x: f64 = self.vertices.iter().map(|v| v.x).sum();
            let sum_y: f64 = self.vertices.iter().map(|v| v.y).sum();
            return Point2::new(sum_x / n as f64, sum_y / n as f64);
        }

        let mut cx = 0.0;
        let mut cy = 0.0;

        for i in 0..n {
            let j = (i + 1) % n;
            let cross =
                self.vertices[i].x * self.vertices[j].y - self.vertices[j].x * self.vertices[i].y;
            cx += (self.vertices[i].x + self.vertices[j].x) * cross;
            cy += (self.vertices[i].y + self.vertices[j].y) * cross;
        }

        let factor = 1.0 / (6.0 * signed_area);
        Point2::new(cx * factor, cy * factor)
    }

    /// Check if polygon is wound clockwise.
    #[inline]
    pub fn is_clockwise(&self) -> bool {
        self.signed_area() < 0.0
    }

    /// Check if polygon is wound counter-clockwise.
    #[inline]
    pub fn is_counter_clockwise(&self) -> bool {
        self.signed_area() > 0.0
    }

    /// Reverse the winding order.
    pub fn reverse(&mut self) {
        self.vertices.reverse();
    }

    /// Return a new polygon with reversed winding.
    pub fn reversed(&self) -> Self {
        let mut vertices = self.vertices.clone();
        vertices.reverse();
        Self { vertices }
    }

    /// Ensure counter-clockwise winding (standard for BIM).
    pub fn ensure_ccw(&mut self) {
        if self.is_clockwise() {
            self.reverse();
        }
    }

    /// Ensure clockwise winding.
    pub fn ensure_cw(&mut self) {
        if self.is_counter_clockwise() {
            self.reverse();
        }
    }

    /// Check if the polygon is convex.
    ///
    /// Uses robust predicates for self-correcting orientation tests.
    pub fn is_convex(&self) -> bool {
        let n = self.vertices.len();
        if n < 3 {
            return false;
        }

        let mut expected_orientation: Option<Orientation> = None;

        for i in 0..n {
            let p0 = self.vertices[i];
            let p1 = self.vertices[(i + 1) % n];
            let p2 = self.vertices[(i + 2) % n];

            // Use robust predicate for orientation test
            let orient = orientation_2d(p0, p1, p2);

            // Skip collinear vertices (they don't affect convexity)
            if orient == Orientation::Collinear {
                continue;
            }

            match expected_orientation {
                None => expected_orientation = Some(orient),
                Some(expected) if expected != orient => return false,
                _ => {}
            }
        }

        true
    }

    /// Check if a point is inside the polygon using winding number algorithm.
    ///
    /// Uses robust predicates for self-correcting orientation tests.
    /// The winding number method is more robust than ray casting for
    /// points near edges.
    pub fn contains_point(&self, p: &Point2) -> bool {
        let n = self.vertices.len();
        if n < 3 {
            return false;
        }

        let mut winding = 0i32;

        for i in 0..n {
            let vi = self.vertices[i];
            let vj = self.vertices[(i + 1) % n];

            if vi.y <= p.y {
                if vj.y > p.y {
                    // Upward crossing - use robust orientation test
                    if orientation_2d(vi, vj, *p) == Orientation::CounterClockwise {
                        winding += 1;
                    }
                }
            } else if vj.y <= p.y {
                // Downward crossing - use robust orientation test
                if orientation_2d(vi, vj, *p) == Orientation::Clockwise {
                    winding -= 1;
                }
            }
        }

        winding != 0
    }

    /// Check if a point is on the boundary of the polygon.
    pub fn point_on_boundary(&self, p: &Point2, tolerance: f64) -> bool {
        for edge in self.edges() {
            if edge.distance_to_point(p) < tolerance {
                return true;
            }
        }
        false
    }

    /// Check if a point is inside or on boundary.
    pub fn contains_point_inclusive(&self, p: &Point2, tolerance: f64) -> bool {
        self.contains_point(p) || self.point_on_boundary(p, tolerance)
    }

    /// Compute bounding box.
    pub fn bounding_box(&self) -> Option<BoundingBox2> {
        BoundingBox2::from_points(&self.vertices)
    }

    /// Check if this polygon intersects with another (edges cross).
    pub fn intersects(&self, other: &Polygon2) -> bool {
        // Check if any edges intersect
        for edge1 in self.edges() {
            for edge2 in other.edges() {
                if edge1.intersects(&edge2) {
                    return true;
                }
            }
        }

        // Check if one polygon is entirely inside the other
        if !self.vertices.is_empty() && other.contains_point(&self.vertices[0]) {
            return true;
        }
        if !other.vertices.is_empty() && self.contains_point(&other.vertices[0]) {
            return true;
        }

        false
    }

    /// Check if polygon has any self-intersecting edges.
    ///
    /// Uses robust predicates for self-correcting segment intersection tests.
    pub fn is_simple(&self) -> bool {
        let n = self.vertices.len();
        if n < 4 {
            return true; // Triangle can't self-intersect
        }

        for i in 0..n {
            let a1 = self.vertices[i];
            let a2 = self.vertices[(i + 1) % n];

            // Check against non-adjacent edges
            for j in (i + 2)..n {
                // Skip adjacent edge at wrap-around
                if i == 0 && j == n - 1 {
                    continue;
                }

                let b1 = self.vertices[j];
                let b2 = self.vertices[(j + 1) % n];

                // Use robust predicate for proper intersection test
                // (excludes endpoint touches which are normal in polygons)
                if segments_properly_intersect(a1, a2, b1, b2) {
                    return false;
                }
            }
        }

        true
    }

    /// Validate polygon for use in geometry operations.
    pub fn validate(&self) -> MathResult<()> {
        if self.vertices.len() < 3 {
            return Err(MathError::InsufficientVertices);
        }
        if !self.is_simple() {
            return Err(MathError::SelfIntersecting);
        }
        Ok(())
    }

    /// Offset the polygon by a distance (positive = expand, negative = shrink).
    /// Uses simple parallel offset (may produce self-intersections for concave polygons).
    pub fn offset(&self, distance: f64) -> MathResult<Self> {
        let n = self.vertices.len();
        if n < 3 {
            return Err(MathError::InsufficientVertices);
        }

        let mut new_vertices = Vec::with_capacity(n);

        // Determine winding direction for correct normal direction
        let sign = if self.is_counter_clockwise() {
            1.0
        } else {
            -1.0
        };

        for i in 0..n {
            let prev = (i + n - 1) % n;
            let next = (i + 1) % n;

            // Edge vectors
            let e1 = self.vertices[i] - self.vertices[prev];
            let e2 = self.vertices[next] - self.vertices[i];

            // Outward normals (perpendicular)
            let n1 = Vector2::new(-e1.y, e1.x);
            let n2 = Vector2::new(-e2.y, e2.x);

            // Normalize
            let n1 = n1.try_normalize().unwrap_or(Vector2::UNIT_X);
            let n2 = n2.try_normalize().unwrap_or(Vector2::UNIT_X);

            // Average normal (bisector direction)
            let avg = n1 + n2;
            let avg_normalized = avg.try_normalize().unwrap_or(n1);

            // Calculate offset distance at corner (accounts for angle)
            let dot = n1.dot(&avg_normalized);
            let corner_distance = if dot.abs() > 1e-10 {
                distance / dot
            } else {
                distance
            };

            let offset_vec = avg_normalized * (corner_distance * sign);
            new_vertices.push(self.vertices[i] + offset_vec);
        }

        Polygon2::new(new_vertices)
    }

    /// Simplify polygon by removing collinear points.
    ///
    /// Uses robust predicates for self-correcting collinearity detection.
    /// The `angle_tolerance` parameter is still used for near-collinear cases
    /// where we want to simplify slightly non-collinear vertices.
    pub fn simplify(&self, angle_tolerance: f64) -> Self {
        let n = self.vertices.len();
        if n < 3 {
            return self.clone();
        }

        let mut simplified = Vec::new();

        for i in 0..n {
            let prev = (i + n - 1) % n;
            let next = (i + 1) % n;

            let p_prev = self.vertices[prev];
            let p_curr = self.vertices[i];
            let p_next = self.vertices[next];

            // Use robust predicate for exact collinearity detection
            let orient = orientation_2d(p_prev, p_curr, p_next);

            if orient != Orientation::Collinear {
                // Not exactly collinear - check if nearly collinear using angle
                let v1 = p_curr - p_prev;
                let v2 = p_next - p_curr;

                if let (Some(n1), Some(n2)) = (v1.try_normalize(), v2.try_normalize()) {
                    let dot = n1.dot(&n2);
                    // If dot product is close to 1, points are nearly collinear
                    // Keep vertex only if it creates a significant angle
                    if dot < 1.0 - angle_tolerance {
                        simplified.push(p_curr);
                    }
                }
                // Zero-length edge - skip this vertex (degenerate)
            }
            // Exactly collinear vertices are removed (skipped)
        }

        if simplified.len() < 3 {
            return self.clone();
        }

        Self {
            vertices: simplified,
        }
    }

    /// Transform all vertices by applying a function.
    pub fn map_vertices<F>(&self, f: F) -> Self
    where
        F: Fn(&Point2) -> Point2,
    {
        Self {
            vertices: self.vertices.iter().map(f).collect(),
        }
    }

    /// Translate polygon by a vector.
    pub fn translate(&self, offset: Vector2) -> Self {
        self.map_vertices(|p| *p + offset)
    }

    /// Scale polygon around a center point.
    pub fn scale(&self, center: Point2, factor: f64) -> Self {
        self.map_vertices(|p| {
            let v = *p - center;
            center + v * factor
        })
    }

    /// Rotate polygon around a center point.
    pub fn rotate(&self, center: Point2, angle_rad: f64) -> Self {
        let (sin, cos) = angle_rad.sin_cos();
        self.map_vertices(|p| {
            let v = *p - center;
            let rotated = Vector2::new(v.x * cos - v.y * sin, v.x * sin + v.y * cos);
            center + rotated
        })
    }
}

impl Default for Polygon2 {
    fn default() -> Self {
        Self {
            vertices: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPSILON: f64 = 1e-10;

    fn square() -> Polygon2 {
        Polygon2::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0))
    }

    #[test]
    fn polygon_new_requires_3_vertices() {
        assert!(Polygon2::new(vec![]).is_err());
        assert!(Polygon2::new(vec![Point2::ORIGIN]).is_err());
        assert!(Polygon2::new(vec![Point2::ORIGIN, Point2::new(1.0, 0.0)]).is_err());
        assert!(Polygon2::new(vec![
            Point2::new(0.0, 0.0),
            Point2::new(1.0, 0.0),
            Point2::new(0.5, 1.0)
        ])
        .is_ok());
    }

    #[test]
    fn polygon_area() {
        let poly = square();
        assert!((poly.area() - 100.0).abs() < EPSILON);
    }

    #[test]
    fn polygon_perimeter() {
        let poly = square();
        assert!((poly.perimeter() - 40.0).abs() < EPSILON);
    }

    #[test]
    fn polygon_centroid() {
        let poly = square();
        let c = poly.centroid();
        assert!((c.x - 5.0).abs() < EPSILON);
        assert!((c.y - 5.0).abs() < EPSILON);
    }

    #[test]
    fn polygon_winding() {
        let ccw = Polygon2::new(vec![
            Point2::new(0.0, 0.0),
            Point2::new(1.0, 0.0),
            Point2::new(0.0, 1.0),
        ])
        .unwrap();
        assert!(ccw.is_counter_clockwise());

        let cw = ccw.reversed();
        assert!(cw.is_clockwise());
    }

    #[test]
    fn polygon_is_convex() {
        // Square is convex
        assert!(square().is_convex());

        // L-shape is concave
        let l_shape = Polygon2::new(vec![
            Point2::new(0.0, 0.0),
            Point2::new(2.0, 0.0),
            Point2::new(2.0, 1.0),
            Point2::new(1.0, 1.0),
            Point2::new(1.0, 2.0),
            Point2::new(0.0, 2.0),
        ])
        .unwrap();
        assert!(!l_shape.is_convex());
    }

    #[test]
    fn polygon_contains_point() {
        let poly = square();

        // Inside
        assert!(poly.contains_point(&Point2::new(5.0, 5.0)));
        assert!(poly.contains_point(&Point2::new(1.0, 1.0)));

        // Outside
        assert!(!poly.contains_point(&Point2::new(-1.0, 5.0)));
        assert!(!poly.contains_point(&Point2::new(15.0, 5.0)));
        assert!(!poly.contains_point(&Point2::new(5.0, 15.0)));
    }

    #[test]
    fn polygon_is_simple() {
        // Simple square
        assert!(square().is_simple());

        // Self-intersecting (figure-8)
        let fig8 = Polygon2 {
            vertices: vec![
                Point2::new(0.0, 0.0),
                Point2::new(2.0, 2.0),
                Point2::new(2.0, 0.0),
                Point2::new(0.0, 2.0),
            ],
        };
        assert!(!fig8.is_simple());
    }

    #[test]
    fn polygon_bounding_box() {
        let poly = square();
        let bbox = poly.bounding_box().unwrap();
        assert_eq!(bbox.min, Point2::new(0.0, 0.0));
        assert_eq!(bbox.max, Point2::new(10.0, 10.0));
    }

    #[test]
    fn polygon_translate() {
        let poly = square();
        let translated = poly.translate(Vector2::new(5.0, 5.0));
        let bbox = translated.bounding_box().unwrap();
        assert!((bbox.min.x - 5.0).abs() < EPSILON);
        assert!((bbox.min.y - 5.0).abs() < EPSILON);
        assert!((bbox.max.x - 15.0).abs() < EPSILON);
        assert!((bbox.max.y - 15.0).abs() < EPSILON);
    }

    #[test]
    fn polygon_scale() {
        let poly = square();
        let center = poly.centroid();
        let scaled = poly.scale(center, 2.0);
        assert!((scaled.area() - 400.0).abs() < EPSILON);
    }

    #[test]
    fn polygon_rotate() {
        let poly = Polygon2::centered_rectangle(Point2::ORIGIN, 2.0, 2.0);
        let rotated = poly.rotate(Point2::ORIGIN, std::f64::consts::FRAC_PI_4);

        // After 45 degree rotation, area should be the same
        assert!((rotated.area() - poly.area()).abs() < EPSILON);

        // Corners should be at sqrt(2) distance from origin
        let dist = rotated.vertices[0].distance_to(&Point2::ORIGIN);
        assert!((dist - std::f64::consts::SQRT_2).abs() < EPSILON);
    }

    #[test]
    fn polygon_edges_iterator() {
        let poly = square();
        let edges: Vec<_> = poly.edges().collect();
        assert_eq!(edges.len(), 4);
    }
}
