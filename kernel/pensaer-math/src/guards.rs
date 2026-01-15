//! Self-correcting guards and domain utilities.
//!
//! This module provides:
//! - NaN/Infinity detection and guarding
//! - Domain clamping for trigonometric functions
//! - Floating-point sanitization utilities
//!
//! These are part of our "self-correcting code" strategy to catch and
//! handle floating-point issues before they propagate through calculations.

use crate::error::{MathError, MathResult};

// =============================================================================
// NaN/INFINITY GUARDS
// =============================================================================

/// Check if a value is finite (not NaN and not Infinite).
#[inline]
pub fn is_finite(value: f64) -> bool {
    value.is_finite()
}

/// Check if a value is valid (finite and not NaN).
#[inline]
pub fn is_valid(value: f64) -> bool {
    !value.is_nan() && value.is_finite()
}

/// Guard against NaN values. Returns error if value is NaN.
#[inline]
pub fn guard_nan(value: f64) -> MathResult<f64> {
    if value.is_nan() {
        Err(MathError::NaN)
    } else {
        Ok(value)
    }
}

/// Guard against infinite values. Returns error if value is infinite.
#[inline]
pub fn guard_infinite(value: f64) -> MathResult<f64> {
    if value.is_infinite() {
        Err(MathError::Infinite)
    } else {
        Ok(value)
    }
}

/// Guard against both NaN and infinite values.
#[inline]
pub fn guard_finite(value: f64) -> MathResult<f64> {
    if value.is_nan() {
        Err(MathError::NaN)
    } else if value.is_infinite() {
        Err(MathError::Infinite)
    } else {
        Ok(value)
    }
}

/// Sanitize a value: replace NaN with default, clamp infinities.
///
/// This is a "self-healing" function that converts bad values to usable ones:
/// - NaN becomes the default value
/// - +Infinity becomes f64::MAX
/// - -Infinity becomes f64::MIN
#[inline]
pub fn sanitize(value: f64, default: f64) -> f64 {
    if value.is_nan() {
        default
    } else if value.is_infinite() {
        if value.is_sign_positive() {
            f64::MAX
        } else {
            f64::MIN
        }
    } else {
        value
    }
}

/// Sanitize a value to zero if NaN or infinite.
#[inline]
pub fn sanitize_to_zero(value: f64) -> f64 {
    if is_valid(value) {
        value
    } else {
        0.0
    }
}

// =============================================================================
// DOMAIN CLAMPING (Self-correcting for trigonometric functions)
// =============================================================================

/// Clamp value to valid acos domain [-1, 1].
///
/// Floating-point errors can produce values slightly outside [-1, 1],
/// causing acos to return NaN. This self-corrects by clamping.
///
/// # Example
/// ```
/// use pensaer_math::guards::clamp_acos_domain;
///
/// // Slightly out of range due to float error
/// let bad_cos = 1.0000000001;
/// let safe_cos = clamp_acos_domain(bad_cos);
/// assert!(safe_cos.acos().is_finite());
/// ```
#[inline]
pub fn clamp_acos_domain(value: f64) -> f64 {
    value.clamp(-1.0, 1.0)
}

/// Safe acos that clamps input to valid domain.
///
/// Prevents NaN from being produced when floating-point errors
/// push the value slightly outside [-1, 1].
#[inline]
pub fn safe_acos(value: f64) -> f64 {
    clamp_acos_domain(value).acos()
}

/// Safe asin that clamps input to valid domain.
#[inline]
pub fn safe_asin(value: f64) -> f64 {
    value.clamp(-1.0, 1.0).asin()
}

/// Clamp value to valid log domain (positive values).
///
/// Returns EPSILON for values <= 0 to prevent -Infinity and NaN.
#[inline]
pub fn clamp_log_domain(value: f64) -> f64 {
    const MIN_LOG_INPUT: f64 = 1e-300;
    value.max(MIN_LOG_INPUT)
}

/// Safe natural log that prevents NaN/-Inf for non-positive values.
#[inline]
pub fn safe_ln(value: f64) -> f64 {
    clamp_log_domain(value).ln()
}

/// Clamp value to valid sqrt domain (non-negative).
///
/// Returns 0 for negative values to prevent NaN.
#[inline]
pub fn clamp_sqrt_domain(value: f64) -> f64 {
    value.max(0.0)
}

/// Safe sqrt that returns 0 for negative values instead of NaN.
#[inline]
pub fn safe_sqrt(value: f64) -> f64 {
    clamp_sqrt_domain(value).sqrt()
}

// =============================================================================
// DEGENERATE VALUE CORRECTION
// =============================================================================

/// Snap near-zero values to exactly zero.
///
/// This prevents accumulated floating-point errors from creating
/// "almost zero" values that should be exactly zero.
///
/// # Example
/// ```
/// use pensaer_math::guards::snap_to_zero;
///
/// let almost_zero = 1e-16;
/// assert_eq!(snap_to_zero(almost_zero, 1e-15), 0.0);
/// ```
#[inline]
pub fn snap_to_zero(value: f64, tolerance: f64) -> f64 {
    if value.abs() < tolerance {
        0.0
    } else {
        value
    }
}

/// Snap near-integer values to exact integers.
///
/// Useful for grid-snapping and preventing floating-point drift.
#[inline]
pub fn snap_to_integer(value: f64, tolerance: f64) -> f64 {
    let rounded = value.round();
    if (value - rounded).abs() < tolerance {
        rounded
    } else {
        value
    }
}

/// Snap value to grid with given spacing.
///
/// # Example
/// ```
/// use pensaer_math::guards::snap_to_grid;
///
/// // Value 10.45 is within tolerance (0.1) of grid point 10.5
/// let value = 10.45;
/// assert_eq!(snap_to_grid(value, 0.5, 0.1), 10.5);
///
/// // Value 10.3 is not within tolerance of any grid point, stays unchanged
/// let value2 = 10.3;
/// assert_eq!(snap_to_grid(value2, 0.5, 0.1), 10.3);
/// ```
#[inline]
pub fn snap_to_grid(value: f64, grid_size: f64, tolerance: f64) -> f64 {
    if grid_size <= 0.0 {
        return value;
    }
    let snapped = (value / grid_size).round() * grid_size;
    if (value - snapped).abs() < tolerance {
        snapped
    } else {
        value
    }
}

// =============================================================================
// SAFE DIVISION
// =============================================================================

/// Safe division that returns error instead of NaN/Inf.
#[inline]
pub fn safe_div(numerator: f64, denominator: f64) -> MathResult<f64> {
    if denominator.abs() < 1e-300 {
        Err(MathError::DivisionByZero)
    } else {
        let result = numerator / denominator;
        guard_finite(result)
    }
}

/// Safe division that returns a default value for division by zero.
#[inline]
pub fn safe_div_or(numerator: f64, denominator: f64, default: f64) -> f64 {
    safe_div(numerator, denominator).unwrap_or(default)
}

// =============================================================================
// TESTS
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_guard_nan() {
        assert!(guard_nan(1.0).is_ok());
        assert!(guard_nan(f64::NAN).is_err());
    }

    #[test]
    fn test_guard_infinite() {
        assert!(guard_infinite(1.0).is_ok());
        assert!(guard_infinite(f64::INFINITY).is_err());
        assert!(guard_infinite(f64::NEG_INFINITY).is_err());
    }

    #[test]
    fn test_guard_finite() {
        assert!(guard_finite(1.0).is_ok());
        assert!(guard_finite(f64::NAN).is_err());
        assert!(guard_finite(f64::INFINITY).is_err());
    }

    #[test]
    fn test_sanitize() {
        assert_eq!(sanitize(1.0, 0.0), 1.0);
        assert_eq!(sanitize(f64::NAN, 0.0), 0.0);
        assert_eq!(sanitize(f64::INFINITY, 0.0), f64::MAX);
        assert_eq!(sanitize(f64::NEG_INFINITY, 0.0), f64::MIN);
    }

    #[test]
    fn test_safe_acos() {
        // Valid input
        assert!((safe_acos(0.5) - 0.5_f64.acos()).abs() < 1e-10);

        // Slightly out of range - should not produce NaN
        let result = safe_acos(1.0000001);
        assert!(!result.is_nan());
        assert!((result - 0.0).abs() < 1e-6);

        let result = safe_acos(-1.0000001);
        assert!(!result.is_nan());
        assert!((result - std::f64::consts::PI).abs() < 1e-6);
    }

    #[test]
    fn test_safe_sqrt() {
        assert!((safe_sqrt(4.0) - 2.0).abs() < 1e-10);
        assert_eq!(safe_sqrt(-0.0001), 0.0);
        assert!(!safe_sqrt(-1.0).is_nan());
    }

    #[test]
    fn test_snap_to_zero() {
        assert_eq!(snap_to_zero(1e-16, 1e-15), 0.0);
        assert_eq!(snap_to_zero(1e-14, 1e-15), 1e-14);
        assert_eq!(snap_to_zero(-1e-16, 1e-15), 0.0);
    }

    #[test]
    fn test_snap_to_integer() {
        assert_eq!(snap_to_integer(5.0000001, 1e-6), 5.0);
        assert_eq!(snap_to_integer(5.1, 1e-6), 5.1);
    }

    #[test]
    fn test_snap_to_grid() {
        assert_eq!(snap_to_grid(10.24, 0.5, 0.1), 10.24);
        assert_eq!(snap_to_grid(10.48, 0.5, 0.1), 10.5);
    }

    #[test]
    fn test_safe_div() {
        assert!((safe_div(10.0, 2.0).unwrap() - 5.0).abs() < 1e-10);
        assert!(safe_div(1.0, 0.0).is_err());
        assert!(safe_div(1.0, 1e-301).is_err());
    }

    #[test]
    fn test_safe_div_or() {
        assert!((safe_div_or(10.0, 2.0, 0.0) - 5.0).abs() < 1e-10);
        assert_eq!(safe_div_or(1.0, 0.0, -1.0), -1.0);
    }
}
