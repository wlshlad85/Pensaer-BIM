//! Axis-aligned bounding boxes for 2D and 3D.

use serde::{Deserialize, Serialize};

use crate::point::{Point2, Point3};
use crate::vector::{Vector2, Vector3};

/// A 2D axis-aligned bounding box.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct BoundingBox2 {
    pub min: Point2,
    pub max: Point2,
}

impl BoundingBox2 {
    /// Create a new bounding box from min and max points.
    #[inline]
    pub fn new(min: Point2, max: Point2) -> Self {
        Self {
            min: Point2::new(min.x.min(max.x), min.y.min(max.y)),
            max: Point2::new(min.x.max(max.x), min.y.max(max.y)),
        }
    }

    /// Create a bounding box from a set of points.
    pub fn from_points(points: &[Point2]) -> Option<Self> {
        if points.is_empty() {
            return None;
        }

        let mut min = points[0];
        let mut max = points[0];

        for p in points.iter().skip(1) {
            min.x = min.x.min(p.x);
            min.y = min.y.min(p.y);
            max.x = max.x.max(p.x);
            max.y = max.y.max(p.y);
        }

        Some(Self { min, max })
    }

    /// Width of the bounding box.
    #[inline]
    pub fn width(&self) -> f64 {
        self.max.x - self.min.x
    }

    /// Height of the bounding box.
    #[inline]
    pub fn height(&self) -> f64 {
        self.max.y - self.min.y
    }

    /// Size as a vector.
    #[inline]
    pub fn size(&self) -> Vector2 {
        Vector2::new(self.width(), self.height())
    }

    /// Center point.
    #[inline]
    pub fn center(&self) -> Point2 {
        self.min.midpoint(&self.max)
    }

    /// Area of the bounding box.
    #[inline]
    pub fn area(&self) -> f64 {
        self.width() * self.height()
    }

    /// Check if a point is inside (inclusive).
    #[inline]
    pub fn contains_point(&self, p: &Point2) -> bool {
        p.x >= self.min.x && p.x <= self.max.x && p.y >= self.min.y && p.y <= self.max.y
    }

    /// Check if this bbox intersects another.
    #[inline]
    pub fn intersects(&self, other: &Self) -> bool {
        self.min.x <= other.max.x
            && self.max.x >= other.min.x
            && self.min.y <= other.max.y
            && self.max.y >= other.min.y
    }

    /// Check if this bbox fully contains another.
    #[inline]
    pub fn contains(&self, other: &Self) -> bool {
        self.min.x <= other.min.x
            && self.max.x >= other.max.x
            && self.min.y <= other.min.y
            && self.max.y >= other.max.y
    }

    /// Compute union of two bounding boxes.
    #[inline]
    pub fn union(&self, other: &Self) -> Self {
        Self {
            min: Point2::new(self.min.x.min(other.min.x), self.min.y.min(other.min.y)),
            max: Point2::new(self.max.x.max(other.max.x), self.max.y.max(other.max.y)),
        }
    }

    /// Compute intersection of two bounding boxes.
    pub fn intersection(&self, other: &Self) -> Option<Self> {
        let min_x = self.min.x.max(other.min.x);
        let min_y = self.min.y.max(other.min.y);
        let max_x = self.max.x.min(other.max.x);
        let max_y = self.max.y.min(other.max.y);

        if min_x <= max_x && min_y <= max_y {
            Some(Self {
                min: Point2::new(min_x, min_y),
                max: Point2::new(max_x, max_y),
            })
        } else {
            None
        }
    }

    /// Expand the bounding box by a margin.
    #[inline]
    pub fn expand(&self, margin: f64) -> Self {
        Self {
            min: Point2::new(self.min.x - margin, self.min.y - margin),
            max: Point2::new(self.max.x + margin, self.max.y + margin),
        }
    }
}

/// A 3D axis-aligned bounding box.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct BoundingBox3 {
    pub min: Point3,
    pub max: Point3,
}

impl BoundingBox3 {
    /// Create a new bounding box from min and max points.
    #[inline]
    pub fn new(min: Point3, max: Point3) -> Self {
        Self {
            min: Point3::new(min.x.min(max.x), min.y.min(max.y), min.z.min(max.z)),
            max: Point3::new(min.x.max(max.x), min.y.max(max.y), min.z.max(max.z)),
        }
    }

    /// Create a bounding box from a set of points.
    pub fn from_points(points: &[Point3]) -> Option<Self> {
        if points.is_empty() {
            return None;
        }

        let mut min = points[0];
        let mut max = points[0];

        for p in points.iter().skip(1) {
            min.x = min.x.min(p.x);
            min.y = min.y.min(p.y);
            min.z = min.z.min(p.z);
            max.x = max.x.max(p.x);
            max.y = max.y.max(p.y);
            max.z = max.z.max(p.z);
        }

        Some(Self { min, max })
    }

    /// Width (X extent).
    #[inline]
    pub fn width(&self) -> f64 {
        self.max.x - self.min.x
    }

    /// Depth (Y extent).
    #[inline]
    pub fn depth(&self) -> f64 {
        self.max.y - self.min.y
    }

    /// Height (Z extent).
    #[inline]
    pub fn height(&self) -> f64 {
        self.max.z - self.min.z
    }

    /// Size as a vector.
    #[inline]
    pub fn size(&self) -> Vector3 {
        Vector3::new(self.width(), self.depth(), self.height())
    }

    /// Center point.
    #[inline]
    pub fn center(&self) -> Point3 {
        self.min.midpoint(&self.max)
    }

    /// Volume of the bounding box.
    #[inline]
    pub fn volume(&self) -> f64 {
        self.width() * self.depth() * self.height()
    }

    /// Surface area of the bounding box.
    #[inline]
    pub fn surface_area(&self) -> f64 {
        let w = self.width();
        let d = self.depth();
        let h = self.height();
        2.0 * (w * d + w * h + d * h)
    }

    /// Check if a point is inside (inclusive).
    #[inline]
    pub fn contains_point(&self, p: &Point3) -> bool {
        p.x >= self.min.x
            && p.x <= self.max.x
            && p.y >= self.min.y
            && p.y <= self.max.y
            && p.z >= self.min.z
            && p.z <= self.max.z
    }

    /// Check if this bbox intersects another.
    #[inline]
    pub fn intersects(&self, other: &Self) -> bool {
        self.min.x <= other.max.x
            && self.max.x >= other.min.x
            && self.min.y <= other.max.y
            && self.max.y >= other.min.y
            && self.min.z <= other.max.z
            && self.max.z >= other.min.z
    }

    /// Check if this bbox fully contains another.
    #[inline]
    pub fn contains(&self, other: &Self) -> bool {
        self.min.x <= other.min.x
            && self.max.x >= other.max.x
            && self.min.y <= other.min.y
            && self.max.y >= other.max.y
            && self.min.z <= other.min.z
            && self.max.z >= other.max.z
    }

    /// Compute union of two bounding boxes.
    #[inline]
    pub fn union(&self, other: &Self) -> Self {
        Self {
            min: Point3::new(
                self.min.x.min(other.min.x),
                self.min.y.min(other.min.y),
                self.min.z.min(other.min.z),
            ),
            max: Point3::new(
                self.max.x.max(other.max.x),
                self.max.y.max(other.max.y),
                self.max.z.max(other.max.z),
            ),
        }
    }

    /// Compute intersection of two bounding boxes.
    pub fn intersection(&self, other: &Self) -> Option<Self> {
        let min_x = self.min.x.max(other.min.x);
        let min_y = self.min.y.max(other.min.y);
        let min_z = self.min.z.max(other.min.z);
        let max_x = self.max.x.min(other.max.x);
        let max_y = self.max.y.min(other.max.y);
        let max_z = self.max.z.min(other.max.z);

        if min_x <= max_x && min_y <= max_y && min_z <= max_z {
            Some(Self {
                min: Point3::new(min_x, min_y, min_z),
                max: Point3::new(max_x, max_y, max_z),
            })
        } else {
            None
        }
    }

    /// Expand the bounding box by a margin.
    #[inline]
    pub fn expand(&self, margin: f64) -> Self {
        Self {
            min: Point3::new(
                self.min.x - margin,
                self.min.y - margin,
                self.min.z - margin,
            ),
            max: Point3::new(
                self.max.x + margin,
                self.max.y + margin,
                self.max.z + margin,
            ),
        }
    }

    /// Project to 2D bounding box by dropping Z.
    #[inline]
    pub fn to_bbox2(&self) -> BoundingBox2 {
        BoundingBox2 {
            min: self.min.to_point2(),
            max: self.max.to_point2(),
        }
    }

    /// Get the 8 corner points.
    pub fn corners(&self) -> [Point3; 8] {
        [
            Point3::new(self.min.x, self.min.y, self.min.z),
            Point3::new(self.max.x, self.min.y, self.min.z),
            Point3::new(self.max.x, self.max.y, self.min.z),
            Point3::new(self.min.x, self.max.y, self.min.z),
            Point3::new(self.min.x, self.min.y, self.max.z),
            Point3::new(self.max.x, self.min.y, self.max.z),
            Point3::new(self.max.x, self.max.y, self.max.z),
            Point3::new(self.min.x, self.max.y, self.max.z),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bbox2_from_points() {
        let pts = vec![
            Point2::new(-1.0, 2.0),
            Point2::new(3.0, -4.0),
            Point2::new(0.0, 0.0),
        ];
        let bbox = BoundingBox2::from_points(&pts).unwrap();
        assert_eq!(bbox.min, Point2::new(-1.0, -4.0));
        assert_eq!(bbox.max, Point2::new(3.0, 2.0));
    }

    #[test]
    fn bbox2_contains_point() {
        let bbox = BoundingBox2::new(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0));
        assert!(bbox.contains_point(&Point2::new(5.0, 5.0)));
        assert!(bbox.contains_point(&Point2::new(0.0, 0.0)));
        assert!(!bbox.contains_point(&Point2::new(-1.0, 5.0)));
    }

    #[test]
    fn bbox2_intersects() {
        let a = BoundingBox2::new(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0));
        let b = BoundingBox2::new(Point2::new(5.0, 5.0), Point2::new(15.0, 15.0));
        let c = BoundingBox2::new(Point2::new(20.0, 20.0), Point2::new(30.0, 30.0));
        assert!(a.intersects(&b));
        assert!(!a.intersects(&c));
    }

    #[test]
    fn bbox3_from_points() {
        let pts = vec![Point3::new(-1.0, 2.0, 0.0), Point3::new(3.0, -4.0, 5.0)];
        let bbox = BoundingBox3::from_points(&pts).unwrap();
        assert_eq!(bbox.min, Point3::new(-1.0, -4.0, 0.0));
        assert_eq!(bbox.max, Point3::new(3.0, 2.0, 5.0));
    }

    #[test]
    fn bbox3_volume() {
        let bbox = BoundingBox3::new(Point3::new(0.0, 0.0, 0.0), Point3::new(2.0, 3.0, 4.0));
        assert!((bbox.volume() - 24.0).abs() < 1e-10);
    }

    #[test]
    fn bbox3_union() {
        let a = BoundingBox3::new(Point3::new(0.0, 0.0, 0.0), Point3::new(1.0, 1.0, 1.0));
        let b = BoundingBox3::new(Point3::new(2.0, 2.0, 2.0), Point3::new(3.0, 3.0, 3.0));
        let u = a.union(&b);
        assert_eq!(u.min, Point3::new(0.0, 0.0, 0.0));
        assert_eq!(u.max, Point3::new(3.0, 3.0, 3.0));
    }
}
