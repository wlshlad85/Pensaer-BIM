//! Pensaer Math - Mathematical primitives for the Pensaer BIM kernel.
//!
//! This crate provides foundational geometry types and operations:
//! - [`Point2`] and [`Point3`] - 2D and 3D point types
//! - [`Vector2`] and [`Vector3`] - 2D and 3D vector types with full operations
//! - [`Transform3`] - 4x4 transformation matrix
//! - [`BoundingBox2`] and [`BoundingBox3`] - Axis-aligned bounding boxes
//! - [`Line2`], [`Line3`], [`LineSegment2`], [`LineSegment3`] - Line types
//! - [`Polygon2`] - 2D polygon for floor/room boundaries
//!
//! # Performance Targets
//!
//! All operations are designed for BIM/CAD use cases:
//! - Point/vector operations: < 1μs
//! - Polygon area/centroid: < 10μs for 100 vertices
//! - Line intersection: < 1μs
//!
//! # Example
//!
//! ```rust
//! use pensaer_math::{Point2, Vector2, Line2};
//!
//! // Create points and compute distance
//! let a = Point2::new(0.0, 0.0);
//! let b = Point2::new(3.0, 4.0);
//! assert!((a.distance_to(&b) - 5.0).abs() < 1e-10);
//!
//! // Create a line and find closest point
//! let line = Line2::from_points(a, b).unwrap();
//! let p = Point2::new(2.0, 3.0);
//! let closest = line.closest_point(&p);
//! ```

pub mod bbox;
pub mod error;
pub mod guards;
pub mod line;
pub mod point;
pub mod polygon;
pub mod robust_predicates;
pub mod transform;
pub mod vector;

// Re-export main types at crate root for convenience
pub use bbox::{BoundingBox2, BoundingBox3};
pub use error::{MathError, MathResult};
pub use line::{Line2, Line3, LineSegment2, LineSegment3};
pub use point::{Point2, Point3};
pub use polygon::Polygon2;
pub use robust_predicates::{
    orientation_2d, orientation_3d, incircle_2d, insphere_3d,
    segments_intersect, segments_properly_intersect, point_in_triangle,
    is_convex_vertex, is_reflex_vertex,
    Orientation, CirclePosition,
};
pub use transform::Transform3;
pub use vector::{Vector2, Vector3};

// Self-correcting guards and domain utilities
pub use guards::{
    // NaN/Infinity guards
    is_finite, is_valid, guard_nan, guard_infinite, guard_finite,
    sanitize, sanitize_to_zero,
    // Domain clamping
    clamp_acos_domain, safe_acos, safe_asin, clamp_log_domain, safe_ln,
    clamp_sqrt_domain, safe_sqrt,
    // Degenerate correction
    snap_to_zero, snap_to_integer, snap_to_grid,
    // Safe division
    safe_div, safe_div_or,
};

/// Tolerance for floating point comparisons (1e-10).
/// This is suitable for most BIM operations.
pub const EPSILON: f64 = 1e-10;

/// Tolerance for geometric coincidence checks (1mm in model units).
/// Use this for "are these points the same location" checks.
pub const COINCIDENCE_TOLERANCE: f64 = 0.001;

/// Check if two f64 values are approximately equal.
#[inline]
pub fn approx_eq(a: f64, b: f64, tolerance: f64) -> bool {
    (a - b).abs() < tolerance
}

/// Check if a value is approximately zero.
#[inline]
pub fn approx_zero(value: f64, tolerance: f64) -> bool {
    value.abs() < tolerance
}

/// Linear interpolation between two values.
#[inline]
pub fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

/// Clamp a value to a range.
#[inline]
pub fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.max(min).min(max)
}

/// Convert degrees to radians.
#[inline]
pub fn deg_to_rad(degrees: f64) -> f64 {
    degrees * std::f64::consts::PI / 180.0
}

/// Convert radians to degrees.
#[inline]
pub fn rad_to_deg(radians: f64) -> f64 {
    radians * 180.0 / std::f64::consts::PI
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_approx_eq() {
        assert!(approx_eq(1.0, 1.0 + 1e-11, EPSILON));
        assert!(!approx_eq(1.0, 1.0 + 1e-9, EPSILON));
    }

    #[test]
    fn test_lerp() {
        assert!((lerp(0.0, 10.0, 0.5) - 5.0).abs() < EPSILON);
        assert!((lerp(0.0, 10.0, 0.0) - 0.0).abs() < EPSILON);
        assert!((lerp(0.0, 10.0, 1.0) - 10.0).abs() < EPSILON);
    }

    #[test]
    fn test_deg_rad_conversion() {
        assert!((deg_to_rad(180.0) - std::f64::consts::PI).abs() < EPSILON);
        assert!((rad_to_deg(std::f64::consts::PI) - 180.0).abs() < EPSILON);
    }

    // Integration tests to verify all modules work together
    #[test]
    fn integration_point_vector_ops() {
        let p = Point2::new(1.0, 2.0);
        let v = Vector2::new(3.0, 4.0);
        let result = p + v;
        assert_eq!(result, Point2::new(4.0, 6.0));
    }

    #[test]
    fn integration_line_intersection() {
        let line1 = Line2::from_points(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0)).unwrap();
        let line2 = Line2::from_points(Point2::new(0.0, 10.0), Point2::new(10.0, 0.0)).unwrap();
        let intersection = line1.intersect(&line2).unwrap();
        assert!((intersection.x - 5.0).abs() < EPSILON);
        assert!((intersection.y - 5.0).abs() < EPSILON);
    }

    #[test]
    fn integration_polygon_area() {
        let poly = Polygon2::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0));
        assert!((poly.area() - 100.0).abs() < EPSILON);
    }

    #[test]
    fn integration_transform_point() {
        let p = Point3::new(1.0, 2.0, 3.0);
        let t = Transform3::translation(10.0, 20.0, 30.0);
        let result = t.transform_point(p);
        assert!((result.x - 11.0).abs() < EPSILON);
        assert!((result.y - 22.0).abs() < EPSILON);
        assert!((result.z - 33.0).abs() < EPSILON);
    }

    #[test]
    fn integration_bbox_contains() {
        let bbox = BoundingBox3::new(
            Point3::new(0.0, 0.0, 0.0),
            Point3::new(10.0, 10.0, 10.0),
        );
        assert!(bbox.contains_point(&Point3::new(5.0, 5.0, 5.0)));
        assert!(!bbox.contains_point(&Point3::new(15.0, 5.0, 5.0)));
    }
}
