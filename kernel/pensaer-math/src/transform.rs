//! 4x4 transformation matrices for 3D operations.

use serde::{Deserialize, Serialize};

use crate::error::{MathError, MathResult};
use crate::point::Point3;
use crate::vector::Vector3;

/// A 4x4 transformation matrix for 3D operations.
/// Stored in column-major order.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Transform3 {
    /// Matrix elements in column-major order.
    /// m[col][row] - first index is column, second is row.
    pub m: [[f64; 4]; 4],
}

impl Transform3 {
    /// Create identity transform.
    #[inline]
    pub const fn identity() -> Self {
        Self {
            m: [
                [1.0, 0.0, 0.0, 0.0],
                [0.0, 1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ],
        }
    }

    /// Create translation transform.
    #[inline]
    pub fn translation(dx: f64, dy: f64, dz: f64) -> Self {
        Self {
            m: [
                [1.0, 0.0, 0.0, 0.0],
                [0.0, 1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0, 0.0],
                [dx, dy, dz, 1.0],
            ],
        }
    }

    /// Create uniform scale transform.
    #[inline]
    pub fn scale_uniform(s: f64) -> Self {
        Self::scale(s, s, s)
    }

    /// Create non-uniform scale transform.
    #[inline]
    pub fn scale(sx: f64, sy: f64, sz: f64) -> Self {
        Self {
            m: [
                [sx, 0.0, 0.0, 0.0],
                [0.0, sy, 0.0, 0.0],
                [0.0, 0.0, sz, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ],
        }
    }

    /// Create rotation around X axis.
    #[inline]
    pub fn rotation_x(angle_rad: f64) -> Self {
        let (sin, cos) = angle_rad.sin_cos();
        Self {
            m: [
                [1.0, 0.0, 0.0, 0.0],
                [0.0, cos, sin, 0.0],
                [0.0, -sin, cos, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ],
        }
    }

    /// Create rotation around Y axis.
    #[inline]
    pub fn rotation_y(angle_rad: f64) -> Self {
        let (sin, cos) = angle_rad.sin_cos();
        Self {
            m: [
                [cos, 0.0, -sin, 0.0],
                [0.0, 1.0, 0.0, 0.0],
                [sin, 0.0, cos, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ],
        }
    }

    /// Create rotation around Z axis.
    #[inline]
    pub fn rotation_z(angle_rad: f64) -> Self {
        let (sin, cos) = angle_rad.sin_cos();
        Self {
            m: [
                [cos, sin, 0.0, 0.0],
                [-sin, cos, 0.0, 0.0],
                [0.0, 0.0, 1.0, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ],
        }
    }

    /// Compose (multiply) two transforms. Result applies self first, then other.
    ///
    /// Example: `translate.compose(&scale)` will first translate, then scale.
    #[inline]
    pub fn compose(&self, other: &Self) -> Self {
        // To apply self first then other, we need: other * self
        // (since matrix multiplication applies right-to-left)
        let mut result = [[0.0f64; 4]; 4];
        for col in 0..4 {
            for row in 0..4 {
                result[col][row] = other.m[0][row] * self.m[col][0]
                    + other.m[1][row] * self.m[col][1]
                    + other.m[2][row] * self.m[col][2]
                    + other.m[3][row] * self.m[col][3];
            }
        }
        Self { m: result }
    }

    /// Transform a point (applies translation).
    #[inline]
    pub fn transform_point(&self, p: Point3) -> Point3 {
        let w = self.m[0][3] * p.x + self.m[1][3] * p.y + self.m[2][3] * p.z + self.m[3][3];
        Point3::new(
            (self.m[0][0] * p.x + self.m[1][0] * p.y + self.m[2][0] * p.z + self.m[3][0]) / w,
            (self.m[0][1] * p.x + self.m[1][1] * p.y + self.m[2][1] * p.z + self.m[3][1]) / w,
            (self.m[0][2] * p.x + self.m[1][2] * p.y + self.m[2][2] * p.z + self.m[3][2]) / w,
        )
    }

    /// Transform a vector (ignores translation).
    #[inline]
    pub fn transform_vector(&self, v: Vector3) -> Vector3 {
        Vector3::new(
            self.m[0][0] * v.x + self.m[1][0] * v.y + self.m[2][0] * v.z,
            self.m[0][1] * v.x + self.m[1][1] * v.y + self.m[2][1] * v.z,
            self.m[0][2] * v.x + self.m[1][2] * v.y + self.m[2][2] * v.z,
        )
    }

    /// Transform a normal vector (uses inverse transpose of upper 3x3).
    pub fn transform_normal(&self, n: Vector3) -> MathResult<Vector3> {
        let inv = self.inverse()?;
        // Transpose of inverse = use rows instead of columns
        let result = Vector3::new(
            inv.m[0][0] * n.x + inv.m[0][1] * n.y + inv.m[0][2] * n.z,
            inv.m[1][0] * n.x + inv.m[1][1] * n.y + inv.m[1][2] * n.z,
            inv.m[2][0] * n.x + inv.m[2][1] * n.y + inv.m[2][2] * n.z,
        );
        result.normalize()
    }

    /// Compute the inverse transform.
    pub fn inverse(&self) -> MathResult<Self> {
        let m = &self.m;

        // Compute cofactors for first row
        let c00 = m[1][1] * (m[2][2] * m[3][3] - m[3][2] * m[2][3])
            - m[2][1] * (m[1][2] * m[3][3] - m[3][2] * m[1][3])
            + m[3][1] * (m[1][2] * m[2][3] - m[2][2] * m[1][3]);

        let c01 = -(m[1][0] * (m[2][2] * m[3][3] - m[3][2] * m[2][3])
            - m[2][0] * (m[1][2] * m[3][3] - m[3][2] * m[1][3])
            + m[3][0] * (m[1][2] * m[2][3] - m[2][2] * m[1][3]));

        let c02 = m[1][0] * (m[2][1] * m[3][3] - m[3][1] * m[2][3])
            - m[2][0] * (m[1][1] * m[3][3] - m[3][1] * m[1][3])
            + m[3][0] * (m[1][1] * m[2][3] - m[2][1] * m[1][3]);

        let c03 = -(m[1][0] * (m[2][1] * m[3][2] - m[3][1] * m[2][2])
            - m[2][0] * (m[1][1] * m[3][2] - m[3][1] * m[1][2])
            + m[3][0] * (m[1][1] * m[2][2] - m[2][1] * m[1][2]));

        // Compute determinant
        let det = m[0][0] * c00 + m[0][1] * c01 + m[0][2] * c02 + m[0][3] * c03;

        if det.abs() < 1e-15 {
            return Err(MathError::SingularMatrix);
        }

        let inv_det = 1.0 / det;

        // Compute remaining cofactors and build inverse
        let c10 = -(m[0][1] * (m[2][2] * m[3][3] - m[3][2] * m[2][3])
            - m[2][1] * (m[0][2] * m[3][3] - m[3][2] * m[0][3])
            + m[3][1] * (m[0][2] * m[2][3] - m[2][2] * m[0][3]));

        let c11 = m[0][0] * (m[2][2] * m[3][3] - m[3][2] * m[2][3])
            - m[2][0] * (m[0][2] * m[3][3] - m[3][2] * m[0][3])
            + m[3][0] * (m[0][2] * m[2][3] - m[2][2] * m[0][3]);

        let c12 = -(m[0][0] * (m[2][1] * m[3][3] - m[3][1] * m[2][3])
            - m[2][0] * (m[0][1] * m[3][3] - m[3][1] * m[0][3])
            + m[3][0] * (m[0][1] * m[2][3] - m[2][1] * m[0][3]));

        let c13 = m[0][0] * (m[2][1] * m[3][2] - m[3][1] * m[2][2])
            - m[2][0] * (m[0][1] * m[3][2] - m[3][1] * m[0][2])
            + m[3][0] * (m[0][1] * m[2][2] - m[2][1] * m[0][2]);

        let c20 = m[0][1] * (m[1][2] * m[3][3] - m[3][2] * m[1][3])
            - m[1][1] * (m[0][2] * m[3][3] - m[3][2] * m[0][3])
            + m[3][1] * (m[0][2] * m[1][3] - m[1][2] * m[0][3]);

        let c21 = -(m[0][0] * (m[1][2] * m[3][3] - m[3][2] * m[1][3])
            - m[1][0] * (m[0][2] * m[3][3] - m[3][2] * m[0][3])
            + m[3][0] * (m[0][2] * m[1][3] - m[1][2] * m[0][3]));

        let c22 = m[0][0] * (m[1][1] * m[3][3] - m[3][1] * m[1][3])
            - m[1][0] * (m[0][1] * m[3][3] - m[3][1] * m[0][3])
            + m[3][0] * (m[0][1] * m[1][3] - m[1][1] * m[0][3]);

        let c23 = -(m[0][0] * (m[1][1] * m[3][2] - m[3][1] * m[1][2])
            - m[1][0] * (m[0][1] * m[3][2] - m[3][1] * m[0][2])
            + m[3][0] * (m[0][1] * m[1][2] - m[1][1] * m[0][2]));

        let c30 = -(m[0][1] * (m[1][2] * m[2][3] - m[2][2] * m[1][3])
            - m[1][1] * (m[0][2] * m[2][3] - m[2][2] * m[0][3])
            + m[2][1] * (m[0][2] * m[1][3] - m[1][2] * m[0][3]));

        let c31 = m[0][0] * (m[1][2] * m[2][3] - m[2][2] * m[1][3])
            - m[1][0] * (m[0][2] * m[2][3] - m[2][2] * m[0][3])
            + m[2][0] * (m[0][2] * m[1][3] - m[1][2] * m[0][3]);

        let c32 = -(m[0][0] * (m[1][1] * m[2][3] - m[2][1] * m[1][3])
            - m[1][0] * (m[0][1] * m[2][3] - m[2][1] * m[0][3])
            + m[2][0] * (m[0][1] * m[1][3] - m[1][1] * m[0][3]));

        let c33 = m[0][0] * (m[1][1] * m[2][2] - m[2][1] * m[1][2])
            - m[1][0] * (m[0][1] * m[2][2] - m[2][1] * m[0][2])
            + m[2][0] * (m[0][1] * m[1][2] - m[1][1] * m[0][2]);

        Ok(Self {
            m: [
                [c00 * inv_det, c10 * inv_det, c20 * inv_det, c30 * inv_det],
                [c01 * inv_det, c11 * inv_det, c21 * inv_det, c31 * inv_det],
                [c02 * inv_det, c12 * inv_det, c22 * inv_det, c32 * inv_det],
                [c03 * inv_det, c13 * inv_det, c23 * inv_det, c33 * inv_det],
            ],
        })
    }

    /// Get the determinant of the matrix.
    pub fn determinant(&self) -> f64 {
        let m = &self.m;

        let c00 = m[1][1] * (m[2][2] * m[3][3] - m[3][2] * m[2][3])
            - m[2][1] * (m[1][2] * m[3][3] - m[3][2] * m[1][3])
            + m[3][1] * (m[1][2] * m[2][3] - m[2][2] * m[1][3]);

        let c01 = -(m[1][0] * (m[2][2] * m[3][3] - m[3][2] * m[2][3])
            - m[2][0] * (m[1][2] * m[3][3] - m[3][2] * m[1][3])
            + m[3][0] * (m[1][2] * m[2][3] - m[2][2] * m[1][3]));

        let c02 = m[1][0] * (m[2][1] * m[3][3] - m[3][1] * m[2][3])
            - m[2][0] * (m[1][1] * m[3][3] - m[3][1] * m[1][3])
            + m[3][0] * (m[1][1] * m[2][3] - m[2][1] * m[1][3]);

        let c03 = -(m[1][0] * (m[2][1] * m[3][2] - m[3][1] * m[2][2])
            - m[2][0] * (m[1][1] * m[3][2] - m[3][1] * m[1][2])
            + m[3][0] * (m[1][1] * m[2][2] - m[2][1] * m[1][2]));

        m[0][0] * c00 + m[0][1] * c01 + m[0][2] * c02 + m[0][3] * c03
    }
}

impl Default for Transform3 {
    fn default() -> Self {
        Self::identity()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPSILON: f64 = 1e-10;

    #[test]
    fn identity_transform_point() {
        let t = Transform3::identity();
        let p = Point3::new(1.0, 2.0, 3.0);
        let result = t.transform_point(p);
        assert!((result.x - p.x).abs() < EPSILON);
        assert!((result.y - p.y).abs() < EPSILON);
        assert!((result.z - p.z).abs() < EPSILON);
    }

    #[test]
    fn translation_transform() {
        let t = Transform3::translation(1.0, 2.0, 3.0);
        let p = Point3::new(0.0, 0.0, 0.0);
        let result = t.transform_point(p);
        assert!((result.x - 1.0).abs() < EPSILON);
        assert!((result.y - 2.0).abs() < EPSILON);
        assert!((result.z - 3.0).abs() < EPSILON);
    }

    #[test]
    fn scale_transform() {
        let t = Transform3::scale(2.0, 3.0, 4.0);
        let p = Point3::new(1.0, 1.0, 1.0);
        let result = t.transform_point(p);
        assert!((result.x - 2.0).abs() < EPSILON);
        assert!((result.y - 3.0).abs() < EPSILON);
        assert!((result.z - 4.0).abs() < EPSILON);
    }

    #[test]
    fn rotation_z_90_degrees() {
        let t = Transform3::rotation_z(std::f64::consts::FRAC_PI_2);
        let p = Point3::new(1.0, 0.0, 0.0);
        let result = t.transform_point(p);
        assert!((result.x).abs() < EPSILON);
        assert!((result.y - 1.0).abs() < EPSILON);
        assert!((result.z).abs() < EPSILON);
    }

    #[test]
    fn compose_transforms() {
        let t1 = Transform3::translation(1.0, 0.0, 0.0);
        let t2 = Transform3::scale(2.0, 2.0, 2.0);
        // Apply translation first, then scale
        let composed = t1.compose(&t2);
        let p = Point3::new(0.0, 0.0, 0.0);
        let result = composed.transform_point(p);
        // (0,0,0) + (1,0,0) = (1,0,0), then * 2 = (2,0,0)
        assert!((result.x - 2.0).abs() < EPSILON);
    }

    #[test]
    fn inverse_transform() {
        let t = Transform3::translation(1.0, 2.0, 3.0);
        let inv = t.inverse().unwrap();
        let p = Point3::new(1.0, 2.0, 3.0);
        let result = inv.transform_point(p);
        assert!((result.x).abs() < EPSILON);
        assert!((result.y).abs() < EPSILON);
        assert!((result.z).abs() < EPSILON);
    }

    #[test]
    fn vector_ignores_translation() {
        let t = Transform3::translation(100.0, 100.0, 100.0);
        let v = Vector3::new(1.0, 0.0, 0.0);
        let result = t.transform_vector(v);
        assert!((result.x - 1.0).abs() < EPSILON);
        assert!((result.y).abs() < EPSILON);
        assert!((result.z).abs() < EPSILON);
    }
}
