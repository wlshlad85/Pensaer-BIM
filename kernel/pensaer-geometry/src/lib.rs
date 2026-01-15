use std::error::Error;
use std::fmt;

use pensaer_math::{BoundingBox3, Point2, Point3};

#[derive(Debug, Clone, PartialEq)]
pub struct TriangleMesh {
    pub vertices: Vec<Point3>,
    pub indices: Vec<[u32; 3]>,
}

impl TriangleMesh {
    pub fn bbox(&self) -> Option<BoundingBox3> {
        BoundingBox3::from_points(&self.vertices)
    }

    pub fn is_valid(&self) -> bool {
        let vcount = self.vertices.len() as u32;
        if vcount == 0 {
            return false;
        }
        self.indices
            .iter()
            .all(|tri| tri[0] < vcount && tri[1] < vcount && tri[2] < vcount)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GeometryError {
    ZeroLength,
    NonPositiveHeight,
    NonPositiveThickness,
    InvalidFloorBounds,
}

impl fmt::Display for GeometryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            GeometryError::ZeroLength => write!(f, "wall baseline has zero length"),
            GeometryError::NonPositiveHeight => write!(f, "height must be positive"),
            GeometryError::NonPositiveThickness => write!(f, "thickness must be positive"),
            GeometryError::InvalidFloorBounds => write!(f, "floor bounds are invalid"),
        }
    }
}

impl Error for GeometryError {}

pub type GeometryResult<T> = Result<T, GeometryError>;

pub struct Wall {
    pub start: Point2,
    pub end: Point2,
    pub height: f64,
    pub thickness: f64,
}

impl Wall {
    pub fn to_mesh(&self) -> GeometryResult<TriangleMesh> {
        if self.height <= 0.0 {
            return Err(GeometryError::NonPositiveHeight);
        }
        if self.thickness <= 0.0 {
            return Err(GeometryError::NonPositiveThickness);
        }

        let dir = self.end - self.start;
        let unit = dir.normalize().ok_or(GeometryError::ZeroLength)?;
        let perp = unit.perp() * (self.thickness * 0.5);

        let a = self.start + perp;
        let b = self.start - perp;
        let c = self.end - perp;
        let d = self.end + perp;

        Ok(extrude_quad([a, b, c, d], self.height))
    }
}

pub struct Floor {
    pub min: Point2,
    pub max: Point2,
    pub thickness: f64,
}

impl Floor {
    pub fn to_mesh(&self) -> GeometryResult<TriangleMesh> {
        if self.thickness <= 0.0 {
            return Err(GeometryError::NonPositiveThickness);
        }
        if self.min.x >= self.max.x || self.min.y >= self.max.y {
            return Err(GeometryError::InvalidFloorBounds);
        }

        let a = Point2::new(self.min.x, self.min.y);
        let b = Point2::new(self.max.x, self.min.y);
        let c = Point2::new(self.max.x, self.max.y);
        let d = Point2::new(self.min.x, self.max.y);

        Ok(extrude_quad([a, b, c, d], self.thickness))
    }
}

fn extrude_quad(base: [Point2; 4], height: f64) -> TriangleMesh {
    let z0 = 0.0;
    let z1 = height;

    let vertices = vec![
        Point3::new(base[0].x, base[0].y, z0),
        Point3::new(base[1].x, base[1].y, z0),
        Point3::new(base[2].x, base[2].y, z0),
        Point3::new(base[3].x, base[3].y, z0),
        Point3::new(base[0].x, base[0].y, z1),
        Point3::new(base[1].x, base[1].y, z1),
        Point3::new(base[2].x, base[2].y, z1),
        Point3::new(base[3].x, base[3].y, z1),
    ];

    let indices = vec![
        [0, 1, 2],
        [0, 2, 3],
        [4, 6, 5],
        [4, 7, 6],
        [0, 4, 5],
        [0, 5, 1],
        [1, 5, 6],
        [1, 6, 2],
        [2, 6, 7],
        [2, 7, 3],
        [3, 7, 4],
        [3, 4, 0],
    ];

    TriangleMesh { vertices, indices }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wall_mesh_bbox_matches_dimensions() {
        let wall = Wall {
            start: Point2::new(0.0, 0.0),
            end: Point2::new(4.0, 0.0),
            height: 3.0,
            thickness: 0.2,
        };

        let mesh = wall.to_mesh().unwrap();
        let bbox = mesh.bbox().unwrap();

        assert_eq!(bbox.min, Point3::new(0.0, -0.1, 0.0));
        assert_eq!(bbox.max, Point3::new(4.0, 0.1, 3.0));
        assert!(mesh.is_valid());
    }

    #[test]
    fn floor_mesh_rejects_invalid_bounds() {
        let floor = Floor {
            min: Point2::new(1.0, 1.0),
            max: Point2::new(1.0, 2.0),
            thickness: 0.3,
        };

        assert_eq!(floor.to_mesh().unwrap_err(), GeometryError::InvalidFloorBounds);
    }
}
