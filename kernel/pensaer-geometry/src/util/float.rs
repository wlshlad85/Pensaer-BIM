//! Floating point comparison utilities.
//!
//! **CRITICAL:** Never use `==` on floats in this codebase.
//! Always use these epsilon-based comparisons.
//!
//! # Example
//! ```
//! use pensaer_geometry::util::float::{feq, fzero, flt, fgt};
//!
//! // Instead of: a == b
//! assert!(feq(1.0, 1.0 + 1e-12, 1e-10));
//!
//! // Instead of: x == 0.0
//! assert!(fzero(1e-15, 1e-10));
//!
//! // Instead of: a < b (with tolerance)
//! assert!(flt(1.0, 2.0, 1e-10));
//! ```

use crate::constants::EPSILON;

/// Check if two floats are equal within epsilon.
///
/// # Arguments
/// * `a` - First value
/// * `b` - Second value
/// * `eps` - Tolerance (use `EPSILON` for default)
#[inline]
pub fn feq(a: f64, b: f64, eps: f64) -> bool {
    (a - b).abs() <= eps
}

/// Check if two floats are equal using default EPSILON.
#[inline]
pub fn feq_default(a: f64, b: f64) -> bool {
    feq(a, b, EPSILON)
}

/// Check if a float is effectively zero.
#[inline]
pub fn fzero(x: f64, eps: f64) -> bool {
    x.abs() <= eps
}

/// Check if a float is effectively zero using default EPSILON.
#[inline]
pub fn fzero_default(x: f64) -> bool {
    fzero(x, EPSILON)
}

/// Check if a < b with epsilon tolerance.
/// Returns true if a is definitively less than b.
#[inline]
pub fn flt(a: f64, b: f64, eps: f64) -> bool {
    a < b - eps
}

/// Check if a > b with epsilon tolerance.
/// Returns true if a is definitively greater than b.
#[inline]
pub fn fgt(a: f64, b: f64, eps: f64) -> bool {
    a > b + eps
}

/// Check if a <= b with epsilon tolerance.
#[inline]
pub fn fle(a: f64, b: f64, eps: f64) -> bool {
    a <= b + eps
}

/// Check if a >= b with epsilon tolerance.
#[inline]
pub fn fge(a: f64, b: f64, eps: f64) -> bool {
    a >= b - eps
}

/// Clamp a value to zero if it's within epsilon of zero.
/// Useful for avoiding -0.0 and tiny negative values.
#[inline]
pub fn clamp_zero(x: f64, eps: f64) -> f64 {
    if fzero(x, eps) {
        0.0
    } else {
        x
    }
}

/// Check if two 2D points are equal within epsilon.
#[inline]
pub fn points2_eq(a: [f64; 2], b: [f64; 2], eps: f64) -> bool {
    feq(a[0], b[0], eps) && feq(a[1], b[1], eps)
}

/// Check if two 3D points are equal within epsilon.
#[inline]
pub fn points3_eq(a: [f64; 3], b: [f64; 3], eps: f64) -> bool {
    feq(a[0], b[0], eps) && feq(a[1], b[1], eps) && feq(a[2], b[2], eps)
}

/// Compute squared distance between two 2D points.
/// Avoids sqrt for performance in comparisons.
#[inline]
pub fn dist2_squared(a: [f64; 2], b: [f64; 2]) -> f64 {
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    dx * dx + dy * dy
}

/// Compute distance between two 2D points.
#[inline]
pub fn dist2(a: [f64; 2], b: [f64; 2]) -> f64 {
    dist2_squared(a, b).sqrt()
}

/// Compute squared distance between two 3D points.
#[inline]
pub fn dist3_squared(a: [f64; 3], b: [f64; 3]) -> f64 {
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    let dz = b[2] - a[2];
    dx * dx + dy * dy + dz * dz
}

/// Compute distance between two 3D points.
#[inline]
pub fn dist3(a: [f64; 3], b: [f64; 3]) -> f64 {
    dist3_squared(a, b).sqrt()
}

/// Check if two 2D points are within a distance threshold.
#[inline]
pub fn points2_within(a: [f64; 2], b: [f64; 2], max_dist: f64) -> bool {
    dist2_squared(a, b) <= max_dist * max_dist
}

/// Check if two 3D points are within a distance threshold.
#[inline]
pub fn points3_within(a: [f64; 3], b: [f64; 3], max_dist: f64) -> bool {
    dist3_squared(a, b) <= max_dist * max_dist
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn feq_works() {
        assert!(feq(1.0, 1.0, 1e-10));
        assert!(feq(1.0, 1.0 + 1e-12, 1e-10));
        assert!(!feq(1.0, 1.1, 1e-10));
        assert!(feq(0.0, 0.0, 1e-10));
        assert!(feq(-1.0, -1.0, 1e-10));
    }

    #[test]
    fn fzero_works() {
        assert!(fzero(0.0, 1e-10));
        assert!(fzero(1e-12, 1e-10));
        assert!(fzero(-1e-12, 1e-10));
        assert!(!fzero(1e-8, 1e-10));
    }

    #[test]
    fn flt_fgt_work() {
        let eps = 1e-10;
        assert!(flt(1.0, 2.0, eps));
        assert!(!flt(2.0, 1.0, eps));
        assert!(!flt(1.0, 1.0 + 1e-12, eps)); // within tolerance

        assert!(fgt(2.0, 1.0, eps));
        assert!(!fgt(1.0, 2.0, eps));
    }

    #[test]
    fn points2_eq_works() {
        let eps = 1e-10;
        assert!(points2_eq([1.0, 2.0], [1.0, 2.0], eps));
        assert!(points2_eq([1.0, 2.0], [1.0 + 1e-12, 2.0], eps));
        assert!(!points2_eq([1.0, 2.0], [1.1, 2.0], eps));
    }

    #[test]
    fn dist2_works() {
        assert!(feq(dist2([0.0, 0.0], [3.0, 4.0]), 5.0, 1e-10));
        assert!(feq(dist2([1.0, 1.0], [1.0, 1.0]), 0.0, 1e-10));
    }

    #[test]
    fn points2_within_works() {
        assert!(points2_within([0.0, 0.0], [0.3, 0.4], 0.5)); // dist = 0.5
        assert!(points2_within([0.0, 0.0], [0.3, 0.3], 0.5)); // dist ≈ 0.42
        assert!(!points2_within([0.0, 0.0], [1.0, 0.0], 0.5)); // dist = 1.0
    }

    #[test]
    fn clamp_zero_works() {
        let eps = 1e-10;
        assert_eq!(clamp_zero(1e-12, eps), 0.0);
        assert_eq!(clamp_zero(-1e-12, eps), 0.0);
        assert_eq!(clamp_zero(1.0, eps), 1.0);
        assert_eq!(clamp_zero(-1.0, eps), -1.0);
    }
}
