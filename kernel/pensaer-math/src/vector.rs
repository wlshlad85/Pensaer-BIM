//! Vector types for 2D and 3D vectors with full operations.

use serde::{Deserialize, Serialize};
use std::ops::{Add, AddAssign, Div, Mul, Neg, Sub, SubAssign};

use crate::error::{MathError, MathResult};

/// A vector in 2D space.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Vector2 {
    pub x: f64,
    pub y: f64,
}

impl Vector2 {
    /// Create a new 2D vector.
    #[inline]
    pub const fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    /// Zero vector.
    pub const ZERO: Self = Self { x: 0.0, y: 0.0 };

    /// Unit X vector.
    pub const UNIT_X: Self = Self { x: 1.0, y: 0.0 };

    /// Unit Y vector.
    pub const UNIT_Y: Self = Self { x: 0.0, y: 1.0 };

    /// Length (magnitude) of the vector.
    #[inline]
    pub fn length(&self) -> f64 {
        self.length_squared().sqrt()
    }

    /// Squared length (avoids sqrt).
    #[inline]
    pub fn length_squared(&self) -> f64 {
        self.x * self.x + self.y * self.y
    }

    /// Normalize to unit length. Returns error if zero length.
    ///
    /// # Postcondition (Design by Contract)
    /// The result vector has length approximately 1.0 (within floating-point tolerance).
    #[inline]
    pub fn normalize(&self) -> MathResult<Self> {
        let len = self.length();
        if len < 1e-15 {
            Err(MathError::ZeroLengthVector)
        } else {
            let result = Self::new(self.x / len, self.y / len);
            // Postcondition: result is unit length (self-verification)
            debug_assert!(
                (result.length() - 1.0).abs() < 1e-10,
                "normalize postcondition failed: length {} != 1.0",
                result.length()
            );
            Ok(result)
        }
    }

    /// Try to normalize, returning None if zero length.
    #[inline]
    pub fn try_normalize(&self) -> Option<Self> {
        self.normalize().ok()
    }

    /// Dot product with another vector.
    #[inline]
    pub fn dot(&self, other: &Self) -> f64 {
        self.x * other.x + self.y * other.y
    }

    /// 2D cross product (returns scalar: z-component of 3D cross).
    /// Positive if other is counter-clockwise from self.
    #[inline]
    pub fn cross(&self, other: &Self) -> f64 {
        self.x * other.y - self.y * other.x
    }

    /// Perpendicular vector (rotated 90° counter-clockwise).
    ///
    /// # Postcondition (Design by Contract)
    /// Result is orthogonal to self (dot product is zero).
    #[inline]
    pub fn perp(&self) -> Self {
        let result = Self::new(-self.y, self.x);
        // Postcondition: result is orthogonal to self
        debug_assert!(
            self.dot(&result).abs() < 1e-10,
            "perp postcondition failed: dot product {} != 0",
            self.dot(&result)
        );
        result
    }

    /// Perpendicular vector (rotated 90° clockwise).
    ///
    /// # Postcondition (Design by Contract)
    /// Result is orthogonal to self (dot product is zero).
    #[inline]
    pub fn perp_cw(&self) -> Self {
        let result = Self::new(self.y, -self.x);
        // Postcondition: result is orthogonal to self
        debug_assert!(
            self.dot(&result).abs() < 1e-10,
            "perp_cw postcondition failed: dot product {} != 0",
            self.dot(&result)
        );
        result
    }

    /// Angle to another vector in radians (-π to π).
    #[inline]
    pub fn angle_to(&self, other: &Self) -> f64 {
        let cross = self.cross(other);
        let dot = self.dot(other);
        cross.atan2(dot)
    }

    /// Angle from positive X axis in radians (-π to π).
    #[inline]
    pub fn angle(&self) -> f64 {
        self.y.atan2(self.x)
    }

    /// Rotate by angle in radians (counter-clockwise).
    ///
    /// # Postcondition (Design by Contract)
    /// Rotation preserves vector length.
    #[inline]
    pub fn rotate(&self, angle_rad: f64) -> Self {
        let original_len = self.length();
        let (sin, cos) = angle_rad.sin_cos();
        let result = Self::new(
            self.x * cos - self.y * sin,
            self.x * sin + self.y * cos,
        );
        // Postcondition: rotation preserves length
        debug_assert!(
            (result.length() - original_len).abs() < 1e-10 * (1.0 + original_len),
            "rotate postcondition failed: length {} != {}",
            result.length(),
            original_len
        );
        result
    }

    /// Linear interpolation between two vectors.
    #[inline]
    pub fn lerp(&self, other: &Self, t: f64) -> Self {
        Self::new(
            self.x + (other.x - self.x) * t,
            self.y + (other.y - self.y) * t,
        )
    }

    /// Project this vector onto another.
    #[inline]
    pub fn project_onto(&self, other: &Self) -> MathResult<Self> {
        let other_len_sq = other.length_squared();
        if other_len_sq < 1e-15 {
            Err(MathError::ZeroLengthVector)
        } else {
            let scale = self.dot(other) / other_len_sq;
            Ok(*other * scale)
        }
    }

    /// Reflect this vector across a normal.
    #[inline]
    pub fn reflect(&self, normal: &Self) -> MathResult<Self> {
        let n = normal.normalize()?;
        Ok(*self - n * (2.0 * self.dot(&n)))
    }

    /// Check if vectors are approximately equal within tolerance.
    #[inline]
    pub fn approx_eq(&self, other: &Self, tolerance: f64) -> bool {
        (self.x - other.x).abs() < tolerance && (self.y - other.y).abs() < tolerance
    }
}

impl Default for Vector2 {
    fn default() -> Self {
        Self::ZERO
    }
}

impl Add for Vector2 {
    type Output = Self;

    #[inline]
    fn add(self, rhs: Self) -> Self::Output {
        Self::new(self.x + rhs.x, self.y + rhs.y)
    }
}

impl AddAssign for Vector2 {
    #[inline]
    fn add_assign(&mut self, rhs: Self) {
        self.x += rhs.x;
        self.y += rhs.y;
    }
}

impl Sub for Vector2 {
    type Output = Self;

    #[inline]
    fn sub(self, rhs: Self) -> Self::Output {
        Self::new(self.x - rhs.x, self.y - rhs.y)
    }
}

impl SubAssign for Vector2 {
    #[inline]
    fn sub_assign(&mut self, rhs: Self) {
        self.x -= rhs.x;
        self.y -= rhs.y;
    }
}

impl Mul<f64> for Vector2 {
    type Output = Self;

    #[inline]
    fn mul(self, rhs: f64) -> Self::Output {
        Self::new(self.x * rhs, self.y * rhs)
    }
}

impl Mul<Vector2> for f64 {
    type Output = Vector2;

    #[inline]
    fn mul(self, rhs: Vector2) -> Self::Output {
        Vector2::new(self * rhs.x, self * rhs.y)
    }
}

impl Div<f64> for Vector2 {
    type Output = Self;

    #[inline]
    fn div(self, rhs: f64) -> Self::Output {
        Self::new(self.x / rhs, self.y / rhs)
    }
}

impl Neg for Vector2 {
    type Output = Self;

    #[inline]
    fn neg(self) -> Self::Output {
        Self::new(-self.x, -self.y)
    }
}

/// A vector in 3D space.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Vector3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vector3 {
    /// Create a new 3D vector.
    #[inline]
    pub const fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    /// Zero vector.
    pub const ZERO: Self = Self { x: 0.0, y: 0.0, z: 0.0 };

    /// Unit X vector.
    pub const UNIT_X: Self = Self { x: 1.0, y: 0.0, z: 0.0 };

    /// Unit Y vector.
    pub const UNIT_Y: Self = Self { x: 0.0, y: 1.0, z: 0.0 };

    /// Unit Z vector.
    pub const UNIT_Z: Self = Self { x: 0.0, y: 0.0, z: 1.0 };

    /// Length (magnitude) of the vector.
    #[inline]
    pub fn length(&self) -> f64 {
        self.length_squared().sqrt()
    }

    /// Squared length (avoids sqrt).
    #[inline]
    pub fn length_squared(&self) -> f64 {
        self.x * self.x + self.y * self.y + self.z * self.z
    }

    /// Normalize to unit length. Returns error if zero length.
    ///
    /// # Postcondition (Design by Contract)
    /// The result vector has length approximately 1.0 (within floating-point tolerance).
    #[inline]
    pub fn normalize(&self) -> MathResult<Self> {
        let len = self.length();
        if len < 1e-15 {
            Err(MathError::ZeroLengthVector)
        } else {
            let result = Self::new(self.x / len, self.y / len, self.z / len);
            // Postcondition: result is unit length (self-verification)
            debug_assert!(
                (result.length() - 1.0).abs() < 1e-10,
                "normalize postcondition failed: length {} != 1.0",
                result.length()
            );
            Ok(result)
        }
    }

    /// Try to normalize, returning None if zero length.
    #[inline]
    pub fn try_normalize(&self) -> Option<Self> {
        self.normalize().ok()
    }

    /// Dot product with another vector.
    #[inline]
    pub fn dot(&self, other: &Self) -> f64 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    /// Cross product with another vector.
    #[inline]
    pub fn cross(&self, other: &Self) -> Self {
        Self::new(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x,
        )
    }

    /// Linear interpolation between two vectors.
    #[inline]
    pub fn lerp(&self, other: &Self, t: f64) -> Self {
        Self::new(
            self.x + (other.x - self.x) * t,
            self.y + (other.y - self.y) * t,
            self.z + (other.z - self.z) * t,
        )
    }

    /// Project this vector onto another.
    #[inline]
    pub fn project_onto(&self, other: &Self) -> MathResult<Self> {
        let other_len_sq = other.length_squared();
        if other_len_sq < 1e-15 {
            Err(MathError::ZeroLengthVector)
        } else {
            let scale = self.dot(other) / other_len_sq;
            Ok(*other * scale)
        }
    }

    /// Reflect this vector across a normal.
    #[inline]
    pub fn reflect(&self, normal: &Self) -> MathResult<Self> {
        let n = normal.normalize()?;
        Ok(*self - n * (2.0 * self.dot(&n)))
    }

    /// Project to 2D by dropping Z component.
    #[inline]
    pub fn to_vector2(&self) -> Vector2 {
        Vector2::new(self.x, self.y)
    }

    /// Create 3D vector from 2D with given Z.
    #[inline]
    pub fn from_vector2(v: Vector2, z: f64) -> Self {
        Self::new(v.x, v.y, z)
    }

    /// Check if vectors are approximately equal within tolerance.
    #[inline]
    pub fn approx_eq(&self, other: &Self, tolerance: f64) -> bool {
        (self.x - other.x).abs() < tolerance
            && (self.y - other.y).abs() < tolerance
            && (self.z - other.z).abs() < tolerance
    }
}

impl Default for Vector3 {
    fn default() -> Self {
        Self::ZERO
    }
}

impl Add for Vector3 {
    type Output = Self;

    #[inline]
    fn add(self, rhs: Self) -> Self::Output {
        Self::new(self.x + rhs.x, self.y + rhs.y, self.z + rhs.z)
    }
}

impl AddAssign for Vector3 {
    #[inline]
    fn add_assign(&mut self, rhs: Self) {
        self.x += rhs.x;
        self.y += rhs.y;
        self.z += rhs.z;
    }
}

impl Sub for Vector3 {
    type Output = Self;

    #[inline]
    fn sub(self, rhs: Self) -> Self::Output {
        Self::new(self.x - rhs.x, self.y - rhs.y, self.z - rhs.z)
    }
}

impl SubAssign for Vector3 {
    #[inline]
    fn sub_assign(&mut self, rhs: Self) {
        self.x -= rhs.x;
        self.y -= rhs.y;
        self.z -= rhs.z;
    }
}

impl Mul<f64> for Vector3 {
    type Output = Self;

    #[inline]
    fn mul(self, rhs: f64) -> Self::Output {
        Self::new(self.x * rhs, self.y * rhs, self.z * rhs)
    }
}

impl Mul<Vector3> for f64 {
    type Output = Vector3;

    #[inline]
    fn mul(self, rhs: Vector3) -> Self::Output {
        Vector3::new(self * rhs.x, self * rhs.y, self * rhs.z)
    }
}

impl Div<f64> for Vector3 {
    type Output = Self;

    #[inline]
    fn div(self, rhs: f64) -> Self::Output {
        Self::new(self.x / rhs, self.y / rhs, self.z / rhs)
    }
}

impl Neg for Vector3 {
    type Output = Self;

    #[inline]
    fn neg(self) -> Self::Output {
        Self::new(-self.x, -self.y, -self.z)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPSILON: f64 = 1e-10;

    // =========================================================================
    // Property-based tests for mathematical invariants
    // =========================================================================

    mod proptest_invariants {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            /// Rotation preserves vector length (isometry property)
            #[test]
            fn rotation_preserves_length(
                x in -1000.0..1000.0,
                y in -1000.0..1000.0,
                angle in -std::f64::consts::TAU..std::f64::consts::TAU
            ) {
                let v = Vector2::new(x, y);
                let rotated = v.rotate(angle);
                let original_len = v.length();
                let rotated_len = rotated.length();
                // Allow for floating-point tolerance scaled by magnitude
                let tolerance = 1e-10 * (1.0 + original_len);
                prop_assert!(
                    (original_len - rotated_len).abs() < tolerance,
                    "length changed from {} to {}", original_len, rotated_len
                );
            }

            /// Dot product is commutative: a·b = b·a
            #[test]
            fn dot_product_commutative(
                ax in -1000.0..1000.0,
                ay in -1000.0..1000.0,
                bx in -1000.0..1000.0,
                by in -1000.0..1000.0
            ) {
                let a = Vector2::new(ax, ay);
                let b = Vector2::new(bx, by);
                let ab = a.dot(&b);
                let ba = b.dot(&a);
                prop_assert!(
                    (ab - ba).abs() < 1e-10 * (1.0 + ab.abs()),
                    "dot not commutative: {} != {}", ab, ba
                );
            }

            /// Perpendicular vector is orthogonal: v · v.perp() = 0
            #[test]
            fn perp_is_orthogonal(
                x in -1000.0..1000.0,
                y in -1000.0..1000.0
            ) {
                let v = Vector2::new(x, y);
                let p = v.perp();
                let dot = v.dot(&p);
                prop_assert!(
                    dot.abs() < 1e-10 * (1.0 + v.length_squared()),
                    "perp not orthogonal: dot = {}", dot
                );
            }

            /// Perpendicular vector preserves length: |v| = |v.perp()|
            #[test]
            fn perp_preserves_length(
                x in -1000.0..1000.0,
                y in -1000.0..1000.0
            ) {
                let v = Vector2::new(x, y);
                let p = v.perp();
                let diff = v.length() - p.length();
                prop_assert!(
                    diff.abs() < 1e-10 * (1.0 + v.length()),
                    "perp changed length: {} vs {}", v.length(), p.length()
                );
            }

            /// Normalized vectors have unit length
            #[test]
            fn normalize_produces_unit_length(
                x in -1000.0..1000.0,
                y in -1000.0..1000.0
            ) {
                let v = Vector2::new(x, y);
                if let Ok(n) = v.normalize() {
                    let len = n.length();
                    prop_assert!(
                        (len - 1.0).abs() < 1e-10,
                        "normalized length {} != 1.0", len
                    );
                }
            }

            /// Double rotation by π equals negation
            #[test]
            fn rotate_pi_equals_negation(
                x in -1000.0..1000.0,
                y in -1000.0..1000.0
            ) {
                let v = Vector2::new(x, y);
                let rotated = v.rotate(std::f64::consts::PI);
                let negated = -v;
                prop_assert!(
                    rotated.approx_eq(&negated, 1e-10 * (1.0 + v.length())),
                    "rotate(π) != -v: {:?} vs {:?}", rotated, negated
                );
            }

            /// Cross product is anti-commutative: a×b = -b×a
            #[test]
            fn cross_product_anticommutative(
                ax in -1000.0..1000.0,
                ay in -1000.0..1000.0,
                bx in -1000.0..1000.0,
                by in -1000.0..1000.0
            ) {
                let a = Vector2::new(ax, ay);
                let b = Vector2::new(bx, by);
                let ab = a.cross(&b);
                let ba = b.cross(&a);
                prop_assert!(
                    (ab + ba).abs() < 1e-10 * (1.0 + ab.abs()),
                    "cross not anti-commutative: {} + {} != 0", ab, ba
                );
            }

            /// 3D: Cross product is perpendicular to both inputs
            #[test]
            fn cross_3d_perpendicular(
                ax in -100.0..100.0,
                ay in -100.0..100.0,
                az in -100.0..100.0,
                bx in -100.0..100.0,
                by in -100.0..100.0,
                bz in -100.0..100.0
            ) {
                let a = Vector3::new(ax, ay, az);
                let b = Vector3::new(bx, by, bz);
                let c = a.cross(&b);
                let dot_a = c.dot(&a);
                let dot_b = c.dot(&b);
                let scale = 1.0 + a.length() * b.length();
                prop_assert!(
                    dot_a.abs() < 1e-10 * scale,
                    "cross not perp to a: dot = {}", dot_a
                );
                prop_assert!(
                    dot_b.abs() < 1e-10 * scale,
                    "cross not perp to b: dot = {}", dot_b
                );
            }

            /// Reflection twice returns original vector
            #[test]
            fn double_reflection_identity(
                vx in -100.0..100.0,
                vy in -100.0..100.0,
                nx in -100.0..100.0,
                ny in -100.0..100.0
            ) {
                let v = Vector2::new(vx, vy);
                let n = Vector2::new(nx, ny);
                if let Ok(r1) = v.reflect(&n) {
                    if let Ok(r2) = r1.reflect(&n) {
                        let tolerance = 1e-10 * (1.0 + v.length());
                        prop_assert!(
                            r2.approx_eq(&v, tolerance),
                            "double reflection failed: {:?} vs {:?}", r2, v
                        );
                    }
                }
            }
        }
    }

    // =========================================================================
    // Traditional unit tests
    // =========================================================================

    #[test]
    fn vector2_length() {
        let v = Vector2::new(3.0, 4.0);
        assert!((v.length() - 5.0).abs() < EPSILON);
    }

    #[test]
    fn vector2_normalize() {
        let v = Vector2::new(3.0, 4.0);
        let n = v.normalize().unwrap();
        assert!((n.length() - 1.0).abs() < EPSILON);
        assert!((n.x - 0.6).abs() < EPSILON);
        assert!((n.y - 0.8).abs() < EPSILON);
    }

    #[test]
    fn vector2_normalize_zero() {
        let v = Vector2::ZERO;
        assert!(v.normalize().is_err());
    }

    #[test]
    fn vector2_dot() {
        let a = Vector2::new(1.0, 2.0);
        let b = Vector2::new(3.0, 4.0);
        assert!((a.dot(&b) - 11.0).abs() < EPSILON);
    }

    #[test]
    fn vector2_cross() {
        let a = Vector2::new(1.0, 0.0);
        let b = Vector2::new(0.0, 1.0);
        assert!((a.cross(&b) - 1.0).abs() < EPSILON);
    }

    #[test]
    fn vector2_perp_is_orthogonal() {
        let v = Vector2::new(3.0, 4.0);
        let p = v.perp();
        assert!((v.dot(&p)).abs() < EPSILON);
    }

    #[test]
    fn vector2_rotate() {
        let v = Vector2::UNIT_X;
        let rotated = v.rotate(std::f64::consts::FRAC_PI_2);
        assert!((rotated.x).abs() < EPSILON);
        assert!((rotated.y - 1.0).abs() < EPSILON);
    }

    #[test]
    fn vector3_cross() {
        let x = Vector3::UNIT_X;
        let y = Vector3::UNIT_Y;
        let z = x.cross(&y);
        assert!(z.approx_eq(&Vector3::UNIT_Z, EPSILON));
    }

    #[test]
    fn vector3_project_onto() {
        let v = Vector3::new(3.0, 4.0, 0.0);
        let onto = Vector3::UNIT_X;
        let proj = v.project_onto(&onto).unwrap();
        assert!(proj.approx_eq(&Vector3::new(3.0, 0.0, 0.0), EPSILON));
    }
}
