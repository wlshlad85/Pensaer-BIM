//! Robust geometric predicates.
//!
//! Uses the `robust` crate for numerically stable orientation tests.
//! These predicates are essential for avoiding edge cases in intersection detection.
//!
//! # Example
//!
//! ```
//! use pensaer_geometry::spatial::{orient2d, Orientation};
//!
//! let a = [0.0, 0.0];
//! let b = [1.0, 0.0];
//! let c = [0.5, 1.0];
//!
//! // c is to the left of line a→b (counter-clockwise)
//! assert_eq!(orient2d(a, b, c), Orientation::CounterClockwise);
//! ```

use crate::constants::EPSILON;

/// Orientation of a point relative to a directed line.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Orientation {
    /// Point is to the left of the line (counter-clockwise).
    CounterClockwise,
    /// Point is to the right of the line (clockwise).
    Clockwise,
    /// Point is on the line (collinear).
    Collinear,
}

/// Compute the orientation of point c relative to line a→b.
///
/// Uses a simple cross product for speed. For edge cases near collinear,
/// use `orient2d_robust` instead.
///
/// # Returns
/// - `CounterClockwise` if c is to the left of a→b
/// - `Clockwise` if c is to the right of a→b
/// - `Collinear` if c is on the line a→b
#[inline]
pub fn orient2d(a: [f64; 2], b: [f64; 2], c: [f64; 2]) -> Orientation {
    let det = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

    if det > EPSILON {
        Orientation::CounterClockwise
    } else if det < -EPSILON {
        Orientation::Clockwise
    } else {
        Orientation::Collinear
    }
}

/// Compute the orientation of point c relative to line a→b using robust predicates.
///
/// This version uses the `robust` crate's adaptive precision arithmetic
/// to handle edge cases where the determinant is very close to zero.
#[inline]
pub fn orient2d_robust(a: [f64; 2], b: [f64; 2], c: [f64; 2]) -> Orientation {
    let det = robust::orient2d(
        robust::Coord { x: a[0], y: a[1] },
        robust::Coord { x: b[0], y: b[1] },
        robust::Coord { x: c[0], y: c[1] },
    );

    if det > 0.0 {
        Orientation::CounterClockwise
    } else if det < 0.0 {
        Orientation::Clockwise
    } else {
        Orientation::Collinear
    }
}

/// Check if two line segments intersect.
///
/// Uses orientation tests to determine if segments (a1, a2) and (b1, b2) intersect.
/// Returns true if they intersect (including endpoint touching).
pub fn segments_intersect(
    a1: [f64; 2],
    a2: [f64; 2],
    b1: [f64; 2],
    b2: [f64; 2],
) -> bool {
    let o1 = orient2d_robust(a1, a2, b1);
    let o2 = orient2d_robust(a1, a2, b2);
    let o3 = orient2d_robust(b1, b2, a1);
    let o4 = orient2d_robust(b1, b2, a2);

    // General case: segments straddle each other
    if o1 != o2 && o3 != o4 {
        return true;
    }

    // Special cases: collinear segments
    if o1 == Orientation::Collinear && on_segment(a1, b1, a2) {
        return true;
    }
    if o2 == Orientation::Collinear && on_segment(a1, b2, a2) {
        return true;
    }
    if o3 == Orientation::Collinear && on_segment(b1, a1, b2) {
        return true;
    }
    if o4 == Orientation::Collinear && on_segment(b1, a2, b2) {
        return true;
    }

    false
}

/// Check if point q lies on segment (p, r) given that they are collinear.
#[inline]
fn on_segment(p: [f64; 2], q: [f64; 2], r: [f64; 2]) -> bool {
    q[0] >= p[0].min(r[0])
        && q[0] <= p[0].max(r[0])
        && q[1] >= p[1].min(r[1])
        && q[1] <= p[1].max(r[1])
}

/// Compute the signed area of triangle (a, b, c).
///
/// Returns positive if counter-clockwise, negative if clockwise, zero if collinear.
#[inline]
pub fn signed_area_2(a: [f64; 2], b: [f64; 2], c: [f64; 2]) -> f64 {
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

/// Compute the intersection point of two line segments if they intersect.
///
/// Returns None if segments don't intersect or are collinear.
pub fn segment_intersection(
    a1: [f64; 2],
    a2: [f64; 2],
    b1: [f64; 2],
    b2: [f64; 2],
) -> Option<[f64; 2]> {
    let d1 = signed_area_2(b1, b2, a1);
    let d2 = signed_area_2(b1, b2, a2);
    let d3 = signed_area_2(a1, a2, b1);
    let d4 = signed_area_2(a1, a2, b2);

    // Check for proper intersection
    if ((d1 > 0.0 && d2 < 0.0) || (d1 < 0.0 && d2 > 0.0))
        && ((d3 > 0.0 && d4 < 0.0) || (d3 < 0.0 && d4 > 0.0))
    {
        let t = d1 / (d1 - d2);
        return Some([
            a1[0] + t * (a2[0] - a1[0]),
            a1[1] + t * (a2[1] - a1[1]),
        ]);
    }

    // Check for endpoint intersection (within tolerance)
    if d1.abs() < EPSILON && on_segment(b1, a1, b2) {
        return Some(a1);
    }
    if d2.abs() < EPSILON && on_segment(b1, a2, b2) {
        return Some(a2);
    }
    if d3.abs() < EPSILON && on_segment(a1, b1, a2) {
        return Some(b1);
    }
    if d4.abs() < EPSILON && on_segment(a1, b2, a2) {
        return Some(b2);
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn orient2d_counter_clockwise() {
        let a = [0.0, 0.0];
        let b = [1.0, 0.0];
        let c = [0.5, 1.0];
        assert_eq!(orient2d(a, b, c), Orientation::CounterClockwise);
    }

    #[test]
    fn orient2d_clockwise() {
        let a = [0.0, 0.0];
        let b = [1.0, 0.0];
        let c = [0.5, -1.0];
        assert_eq!(orient2d(a, b, c), Orientation::Clockwise);
    }

    #[test]
    fn orient2d_collinear() {
        let a = [0.0, 0.0];
        let b = [1.0, 0.0];
        let c = [2.0, 0.0];
        assert_eq!(orient2d(a, b, c), Orientation::Collinear);
    }

    #[test]
    fn orient2d_robust_near_collinear() {
        // Points very close to collinear
        let a = [0.0, 0.0];
        let b = [1.0, 0.0];
        let c = [0.5, 1e-15]; // Tiny offset
        // Robust version should still work
        let _ = orient2d_robust(a, b, c);
    }

    #[test]
    fn segments_intersect_crossing() {
        // X pattern
        let a1 = [0.0, 0.0];
        let a2 = [10.0, 10.0];
        let b1 = [0.0, 10.0];
        let b2 = [10.0, 0.0];
        assert!(segments_intersect(a1, a2, b1, b2));
    }

    #[test]
    fn segments_intersect_parallel() {
        // Parallel lines
        let a1 = [0.0, 0.0];
        let a2 = [10.0, 0.0];
        let b1 = [0.0, 1.0];
        let b2 = [10.0, 1.0];
        assert!(!segments_intersect(a1, a2, b1, b2));
    }

    #[test]
    fn segments_intersect_t_junction() {
        // T junction
        let a1 = [0.0, 0.0];
        let a2 = [10.0, 0.0];
        let b1 = [5.0, 0.0];
        let b2 = [5.0, 10.0];
        assert!(segments_intersect(a1, a2, b1, b2));
    }

    #[test]
    fn segment_intersection_point() {
        // X pattern - intersection at (5, 5)
        let a1 = [0.0, 0.0];
        let a2 = [10.0, 10.0];
        let b1 = [0.0, 10.0];
        let b2 = [10.0, 0.0];

        let point = segment_intersection(a1, a2, b1, b2).unwrap();
        assert!((point[0] - 5.0).abs() < 1e-10);
        assert!((point[1] - 5.0).abs() < 1e-10);
    }

    #[test]
    fn segment_intersection_none() {
        // Parallel lines
        let a1 = [0.0, 0.0];
        let a2 = [10.0, 0.0];
        let b1 = [0.0, 1.0];
        let b2 = [10.0, 1.0];
        assert!(segment_intersection(a1, a2, b1, b2).is_none());
    }

    #[test]
    fn signed_area_positive() {
        // Counter-clockwise triangle
        let a = [0.0, 0.0];
        let b = [1.0, 0.0];
        let c = [0.5, 1.0];
        assert!(signed_area_2(a, b, c) > 0.0);
    }

    #[test]
    fn signed_area_negative() {
        // Clockwise triangle
        let a = [0.0, 0.0];
        let b = [0.5, 1.0];
        let c = [1.0, 0.0];
        assert!(signed_area_2(a, b, c) < 0.0);
    }
}
