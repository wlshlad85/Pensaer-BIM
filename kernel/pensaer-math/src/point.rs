//! Point types for 2D and 3D coordinates.

use serde::{Deserialize, Serialize};
use std::ops::{Add, Sub};

use crate::vector::{Vector2, Vector3};

/// A point in 2D space.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Point2 {
    pub x: f64,
    pub y: f64,
}

impl Point2 {
    /// Create a new 2D point.
    #[inline]
    pub const fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    /// Origin point (0, 0).
    pub const ORIGIN: Self = Self { x: 0.0, y: 0.0 };

    /// Distance to another point.
    #[inline]
    pub fn distance_to(&self, other: &Self) -> f64 {
        (*other - *self).length()
    }

    /// Squared distance to another point (avoids sqrt).
    #[inline]
    pub fn distance_squared_to(&self, other: &Self) -> f64 {
        (*other - *self).length_squared()
    }

    /// Linear interpolation between two points.
    #[inline]
    pub fn lerp(&self, other: &Self, t: f64) -> Self {
        Self {
            x: self.x + (other.x - self.x) * t,
            y: self.y + (other.y - self.y) * t,
        }
    }

    /// Midpoint between two points.
    #[inline]
    pub fn midpoint(&self, other: &Self) -> Self {
        self.lerp(other, 0.5)
    }

    /// Convert to Vector2 (treating point as position vector from origin).
    #[inline]
    pub fn to_vector(&self) -> Vector2 {
        Vector2::new(self.x, self.y)
    }
}

impl Default for Point2 {
    fn default() -> Self {
        Self::ORIGIN
    }
}

impl Add<Vector2> for Point2 {
    type Output = Point2;

    #[inline]
    fn add(self, rhs: Vector2) -> Self::Output {
        Point2::new(self.x + rhs.x, self.y + rhs.y)
    }
}

impl Sub for Point2 {
    type Output = Vector2;

    #[inline]
    fn sub(self, rhs: Point2) -> Self::Output {
        Vector2::new(self.x - rhs.x, self.y - rhs.y)
    }
}

impl Sub<Vector2> for Point2 {
    type Output = Point2;

    #[inline]
    fn sub(self, rhs: Vector2) -> Self::Output {
        Point2::new(self.x - rhs.x, self.y - rhs.y)
    }
}

/// A point in 3D space.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Point3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Point3 {
    /// Create a new 3D point.
    #[inline]
    pub const fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    /// Origin point (0, 0, 0).
    pub const ORIGIN: Self = Self {
        x: 0.0,
        y: 0.0,
        z: 0.0,
    };

    /// Distance to another point.
    #[inline]
    pub fn distance_to(&self, other: &Self) -> f64 {
        (*other - *self).length()
    }

    /// Squared distance to another point (avoids sqrt).
    #[inline]
    pub fn distance_squared_to(&self, other: &Self) -> f64 {
        (*other - *self).length_squared()
    }

    /// Linear interpolation between two points.
    #[inline]
    pub fn lerp(&self, other: &Self, t: f64) -> Self {
        Self {
            x: self.x + (other.x - self.x) * t,
            y: self.y + (other.y - self.y) * t,
            z: self.z + (other.z - self.z) * t,
        }
    }

    /// Midpoint between two points.
    #[inline]
    pub fn midpoint(&self, other: &Self) -> Self {
        self.lerp(other, 0.5)
    }

    /// Convert to Vector3 (treating point as position vector from origin).
    #[inline]
    pub fn to_vector(&self) -> Vector3 {
        Vector3::new(self.x, self.y, self.z)
    }

    /// Project to 2D by dropping Z coordinate.
    #[inline]
    pub fn to_point2(&self) -> Point2 {
        Point2::new(self.x, self.y)
    }

    /// Create 3D point from 2D point with given Z.
    #[inline]
    pub fn from_point2(p: Point2, z: f64) -> Self {
        Self::new(p.x, p.y, z)
    }
}

impl Default for Point3 {
    fn default() -> Self {
        Self::ORIGIN
    }
}

impl Add<Vector3> for Point3 {
    type Output = Point3;

    #[inline]
    fn add(self, rhs: Vector3) -> Self::Output {
        Point3::new(self.x + rhs.x, self.y + rhs.y, self.z + rhs.z)
    }
}

impl Sub for Point3 {
    type Output = Vector3;

    #[inline]
    fn sub(self, rhs: Point3) -> Self::Output {
        Vector3::new(self.x - rhs.x, self.y - rhs.y, self.z - rhs.z)
    }
}

impl Sub<Vector3> for Point3 {
    type Output = Point3;

    #[inline]
    fn sub(self, rhs: Vector3) -> Self::Output {
        Point3::new(self.x - rhs.x, self.y - rhs.y, self.z - rhs.z)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn point2_distance() {
        let a = Point2::new(0.0, 0.0);
        let b = Point2::new(3.0, 4.0);
        assert!((a.distance_to(&b) - 5.0).abs() < 1e-10);
    }

    #[test]
    fn point2_lerp() {
        let a = Point2::new(0.0, 0.0);
        let b = Point2::new(10.0, 10.0);
        let mid = a.lerp(&b, 0.5);
        assert_eq!(mid, Point2::new(5.0, 5.0));
    }

    #[test]
    fn point3_distance() {
        let a = Point3::new(0.0, 0.0, 0.0);
        let b = Point3::new(1.0, 2.0, 2.0);
        assert!((a.distance_to(&b) - 3.0).abs() < 1e-10);
    }

    #[test]
    fn point_vector_ops() {
        let p = Point2::new(1.0, 2.0);
        let v = Vector2::new(3.0, 4.0);
        assert_eq!(p + v, Point2::new(4.0, 6.0));
        assert_eq!(p - v, Point2::new(-2.0, -2.0));
    }
}
