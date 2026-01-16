//! Pensaer Geometry Constants
//!
//! Canonical tolerance values and units for the geometry kernel.
//! All geometry is in millimeters (mm).
//!
//! # Tolerance Hierarchy
//!
//! ```text
//! ┌─────────────────────────────────────────┐
//! │  UI_SNAP_DIST: 10mm                     │  ← User interaction
//! ├─────────────────────────────────────────┤
//! │  GEOM_TOL: 1mm                          │  ← "Are these the same?"
//! ├─────────────────────────────────────────┤
//! │  SNAP_MERGE_TOL: 0.5mm                  │  ← Auto-merge near nodes
//! ├─────────────────────────────────────────┤
//! │  QUANTIZE_PRECISION: 0.01mm             │  ← Floating point storage
//! └─────────────────────────────────────────┘
//! ```

/// Snap merge tolerance in mm.
/// Nodes within this distance are automatically merged.
/// Used by `fixup::snap_merge_nodes`.
pub const SNAP_MERGE_TOL: f64 = 0.5;

/// Geometry comparison tolerance in mm.
/// Used for determining if two points/lines are "the same".
pub const GEOM_TOL: f64 = 1.0;

/// UI snap distance in mm.
/// Cursor snaps to elements within this distance.
pub const UI_SNAP_DIST: f64 = 10.0;

/// Quantization precision in mm.
/// All coordinates are rounded to this precision at API boundaries.
pub const QUANTIZE_PRECISION: f64 = 0.01;

/// Epsilon for floating point comparisons.
/// Used internally for near-zero checks.
pub const EPSILON: f64 = 1e-10;

/// Quantize a value to QUANTIZE_PRECISION (0.01 mm).
///
/// # Example
/// ```
/// use pensaer_geometry::constants::quantize;
/// assert_eq!(quantize(0.123456), 0.12);
/// assert_eq!(quantize(0.125), 0.13);  // rounds to nearest
/// assert_eq!(quantize(-0.125), -0.13);
/// ```
#[inline]
pub fn quantize(x: f64) -> f64 {
    (x / QUANTIZE_PRECISION).round() * QUANTIZE_PRECISION
}

/// Quantize a 2D point.
#[inline]
pub fn quantize_point2(p: [f64; 2]) -> [f64; 2] {
    [quantize(p[0]), quantize(p[1])]
}

/// Quantize a 3D point.
#[inline]
pub fn quantize_point3(p: [f64; 3]) -> [f64; 3] {
    [quantize(p[0]), quantize(p[1]), quantize(p[2])]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quantize_rounds_correctly() {
        assert_eq!(quantize(0.123456), 0.12);
        assert_eq!(quantize(0.125), 0.13); // 0.5 rounds up
        assert_eq!(quantize(0.124), 0.12);
        assert_eq!(quantize(0.126), 0.13);
        assert_eq!(quantize(-0.125), -0.13);
        assert_eq!(quantize(0.0), 0.0);
        assert_eq!(quantize(1000.009), 1000.01);
    }

    #[test]
    fn quantize_point2_works() {
        let p = quantize_point2([1.234567, 2.345678]);
        assert_eq!(p, [1.23, 2.35]);
    }

    #[test]
    fn quantize_point3_works() {
        let p = quantize_point3([1.234, 2.345, 3.456]);
        assert_eq!(p, [1.23, 2.35, 3.46]);
    }

    #[test]
    fn tolerance_hierarchy_is_correct() {
        // Verify the tolerance hierarchy makes sense (using const blocks for compile-time checks)
        const { assert!(QUANTIZE_PRECISION < SNAP_MERGE_TOL) };
        const { assert!(SNAP_MERGE_TOL < GEOM_TOL) };
        const { assert!(GEOM_TOL < UI_SNAP_DIST) };
    }
}
