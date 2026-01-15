//! Triangle mesh representation and operations.
//!
//! This module provides:
//! - `TriangleMesh`: Core mesh data structure with vertices, normals, UVs, and indices
//! - `triangulate`: Polygon triangulation algorithms (ear-clipping, holes)
//! - `extrude`: 2D to 3D extrusion for generating architectural elements

pub mod extrude;
pub mod triangulate;

pub use extrude::{extrude_polygon, extrude_polygon_with_hole, extrude_wall_with_openings};
pub use triangulate::{triangulate_polygon, triangulate_polygon_with_holes};

use serde::{Deserialize, Serialize};

use pensaer_math::{BoundingBox3, Point3, Transform3, Vector3};

use crate::error::{GeometryError, GeometryResult};

/// A triangle mesh for 3D visualization.
///
/// The mesh consists of:
/// - Vertices: 3D points defining the geometry
/// - Normals: Normal vectors for lighting (optional, can be computed)
/// - UVs: Texture coordinates (optional)
/// - Indices: Triangles defined by vertex indices
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TriangleMesh {
    /// Vertex positions.
    pub vertices: Vec<Point3>,

    /// Normal vectors (one per vertex, or empty for flat shading).
    pub normals: Vec<Vector3>,

    /// Texture coordinates (one per vertex, or empty).
    pub uvs: Vec<(f64, f64)>,

    /// Triangle indices (each [u32; 3] is one triangle).
    pub indices: Vec<[u32; 3]>,
}

impl TriangleMesh {
    /// Create an empty mesh.
    pub fn new() -> Self {
        Self {
            vertices: Vec::new(),
            normals: Vec::new(),
            uvs: Vec::new(),
            indices: Vec::new(),
        }
    }

    /// Create a mesh from vertices and indices.
    pub fn from_vertices_indices(vertices: Vec<Point3>, indices: Vec<[u32; 3]>) -> Self {
        Self {
            vertices,
            normals: Vec::new(),
            uvs: Vec::new(),
            indices,
        }
    }

    /// Number of vertices.
    #[inline]
    pub fn vertex_count(&self) -> usize {
        self.vertices.len()
    }

    /// Number of triangles.
    #[inline]
    pub fn triangle_count(&self) -> usize {
        self.indices.len()
    }

    /// Check if mesh has normals.
    #[inline]
    pub fn has_normals(&self) -> bool {
        !self.normals.is_empty()
    }

    /// Check if mesh has UVs.
    #[inline]
    pub fn has_uvs(&self) -> bool {
        !self.uvs.is_empty()
    }

    /// Check if the mesh is valid (all indices in bounds).
    pub fn is_valid(&self) -> bool {
        let vcount = self.vertices.len() as u32;
        if vcount == 0 && !self.indices.is_empty() {
            return false;
        }
        self.indices
            .iter()
            .all(|tri| tri[0] < vcount && tri[1] < vcount && tri[2] < vcount)
    }

    /// Validate and return error if invalid.
    pub fn validate(&self) -> GeometryResult<()> {
        if !self.is_valid() {
            return Err(GeometryError::InvalidMeshIndices);
        }
        Ok(())
    }

    /// Check if the mesh is manifold (each edge shared by exactly 2 triangles).
    pub fn is_manifold(&self) -> bool {
        use std::collections::HashMap;

        // Count edges
        let mut edge_count: HashMap<(u32, u32), u32> = HashMap::new();

        for tri in &self.indices {
            for i in 0..3 {
                let a = tri[i];
                let b = tri[(i + 1) % 3];
                let edge = if a < b { (a, b) } else { (b, a) };
                *edge_count.entry(edge).or_insert(0) += 1;
            }
        }

        // All edges should appear exactly twice (once per adjacent face)
        edge_count.values().all(|&count| count == 2)
    }

    /// Check for degenerate triangles (zero area).
    pub fn has_degenerate_triangles(&self) -> bool {
        for tri in &self.indices {
            let v0 = &self.vertices[tri[0] as usize];
            let v1 = &self.vertices[tri[1] as usize];
            let v2 = &self.vertices[tri[2] as usize];

            let e1 = *v1 - *v0;
            let e2 = *v2 - *v0;
            let cross = e1.cross(&e2);

            if cross.length_squared() < 1e-20 {
                return true;
            }
        }
        false
    }

    /// Compute axis-aligned bounding box.
    pub fn bounding_box(&self) -> Option<BoundingBox3> {
        BoundingBox3::from_points(&self.vertices)
    }

    /// Compute total surface area.
    pub fn surface_area(&self) -> f64 {
        let mut area = 0.0;
        for tri in &self.indices {
            let v0 = &self.vertices[tri[0] as usize];
            let v1 = &self.vertices[tri[1] as usize];
            let v2 = &self.vertices[tri[2] as usize];

            let e1 = *v1 - *v0;
            let e2 = *v2 - *v0;
            let cross = e1.cross(&e2);

            area += cross.length() * 0.5;
        }
        area
    }

    /// Compute volume (assumes watertight mesh with consistent winding).
    pub fn volume(&self) -> f64 {
        let mut volume = 0.0;
        for tri in &self.indices {
            let v0 = &self.vertices[tri[0] as usize];
            let v1 = &self.vertices[tri[1] as usize];
            let v2 = &self.vertices[tri[2] as usize];

            // Signed volume of tetrahedron from origin
            volume += v0.x * (v1.y * v2.z - v1.z * v2.y)
                + v0.y * (v1.z * v2.x - v1.x * v2.z)
                + v0.z * (v1.x * v2.y - v1.y * v2.x);
        }
        (volume / 6.0).abs()
    }

    /// Merge another mesh into this one.
    pub fn merge(&mut self, other: &TriangleMesh) {
        let offset = self.vertices.len() as u32;

        self.vertices.extend(other.vertices.iter().cloned());
        self.normals.extend(other.normals.iter().cloned());
        self.uvs.extend(other.uvs.iter().cloned());

        for tri in &other.indices {
            self.indices
                .push([tri[0] + offset, tri[1] + offset, tri[2] + offset]);
        }
    }

    /// Apply a transform to all vertices.
    pub fn transform(&mut self, t: &Transform3) {
        for v in &mut self.vertices {
            *v = t.transform_point(*v);
        }
        for n in &mut self.normals {
            *n = t.transform_vector(*n);
            // Re-normalize in case of non-uniform scale
            if let Ok(normalized) = n.normalize() {
                *n = normalized;
            }
        }
    }

    /// Create a transformed copy.
    pub fn transformed(&self, t: &Transform3) -> Self {
        let mut result = self.clone();
        result.transform(t);
        result
    }

    /// Compute flat normals (one per triangle vertex).
    pub fn compute_flat_normals(&mut self) {
        self.normals.clear();
        self.normals.resize(self.vertices.len(), Vector3::ZERO);

        for tri in &self.indices {
            let v0 = &self.vertices[tri[0] as usize];
            let v1 = &self.vertices[tri[1] as usize];
            let v2 = &self.vertices[tri[2] as usize];

            let e1 = *v1 - *v0;
            let e2 = *v2 - *v0;
            let normal = e1.cross(&e2);

            if let Ok(n) = normal.normalize() {
                // For flat shading, we just assign the face normal
                self.normals[tri[0] as usize] = n;
                self.normals[tri[1] as usize] = n;
                self.normals[tri[2] as usize] = n;
            }
        }
    }

    /// Compute smooth normals (averaged per vertex).
    pub fn compute_smooth_normals(&mut self) {
        self.normals.clear();
        self.normals.resize(self.vertices.len(), Vector3::ZERO);

        // Accumulate face normals at each vertex
        for tri in &self.indices {
            let v0 = &self.vertices[tri[0] as usize];
            let v1 = &self.vertices[tri[1] as usize];
            let v2 = &self.vertices[tri[2] as usize];

            let e1 = *v1 - *v0;
            let e2 = *v2 - *v0;
            let face_normal = e1.cross(&e2);

            // Weight by area (cross product magnitude)
            self.normals[tri[0] as usize] += face_normal;
            self.normals[tri[1] as usize] += face_normal;
            self.normals[tri[2] as usize] += face_normal;
        }

        // Normalize all vertex normals
        for n in &mut self.normals {
            if let Ok(normalized) = n.normalize() {
                *n = normalized;
            }
        }
    }

    /// Flip all normals and reverse triangle winding.
    pub fn flip_normals(&mut self) {
        for n in &mut self.normals {
            *n = -*n;
        }
        for tri in &mut self.indices {
            tri.swap(1, 2);
        }
    }

    /// Export to OBJ format string.
    pub fn to_obj(&self) -> String {
        let mut obj = String::new();

        // Vertices
        for v in &self.vertices {
            obj.push_str(&format!("v {} {} {}\n", v.x, v.y, v.z));
        }

        // Normals
        for n in &self.normals {
            obj.push_str(&format!("vn {} {} {}\n", n.x, n.y, n.z));
        }

        // UVs
        for (u, v) in &self.uvs {
            obj.push_str(&format!("vt {} {}\n", u, v));
        }

        // Faces (OBJ indices are 1-based)
        let has_normals = self.has_normals();
        let has_uvs = self.has_uvs();

        for tri in &self.indices {
            if has_normals && has_uvs {
                obj.push_str(&format!(
                    "f {}/{}/{} {}/{}/{} {}/{}/{}\n",
                    tri[0] + 1,
                    tri[0] + 1,
                    tri[0] + 1,
                    tri[1] + 1,
                    tri[1] + 1,
                    tri[1] + 1,
                    tri[2] + 1,
                    tri[2] + 1,
                    tri[2] + 1
                ));
            } else if has_normals {
                obj.push_str(&format!(
                    "f {}//{} {}//{} {}//{}\n",
                    tri[0] + 1,
                    tri[0] + 1,
                    tri[1] + 1,
                    tri[1] + 1,
                    tri[2] + 1,
                    tri[2] + 1
                ));
            } else if has_uvs {
                obj.push_str(&format!(
                    "f {}/{} {}/{} {}/{}\n",
                    tri[0] + 1,
                    tri[0] + 1,
                    tri[1] + 1,
                    tri[1] + 1,
                    tri[2] + 1,
                    tri[2] + 1
                ));
            } else {
                obj.push_str(&format!("f {} {} {}\n", tri[0] + 1, tri[1] + 1, tri[2] + 1));
            }
        }

        obj
    }
}

impl Default for TriangleMesh {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cube_mesh() -> TriangleMesh {
        // Simple unit cube
        let vertices = vec![
            Point3::new(0.0, 0.0, 0.0),
            Point3::new(1.0, 0.0, 0.0),
            Point3::new(1.0, 1.0, 0.0),
            Point3::new(0.0, 1.0, 0.0),
            Point3::new(0.0, 0.0, 1.0),
            Point3::new(1.0, 0.0, 1.0),
            Point3::new(1.0, 1.0, 1.0),
            Point3::new(0.0, 1.0, 1.0),
        ];

        let indices = vec![
            // Bottom
            [0, 2, 1],
            [0, 3, 2],
            // Top
            [4, 5, 6],
            [4, 6, 7],
            // Front
            [0, 1, 5],
            [0, 5, 4],
            // Back
            [2, 3, 7],
            [2, 7, 6],
            // Left
            [0, 4, 7],
            [0, 7, 3],
            // Right
            [1, 2, 6],
            [1, 6, 5],
        ];

        TriangleMesh::from_vertices_indices(vertices, indices)
    }

    #[test]
    fn mesh_is_valid() {
        let mesh = cube_mesh();
        assert!(mesh.is_valid());
    }

    #[test]
    fn mesh_invalid_indices() {
        let mesh = TriangleMesh {
            vertices: vec![Point3::new(0.0, 0.0, 0.0)],
            normals: Vec::new(),
            uvs: Vec::new(),
            indices: vec![[0, 1, 2]], // indices 1, 2 out of bounds
        };
        assert!(!mesh.is_valid());
    }

    #[test]
    fn mesh_bounding_box() {
        let mesh = cube_mesh();
        let bbox = mesh.bounding_box().unwrap();
        assert_eq!(bbox.min, Point3::new(0.0, 0.0, 0.0));
        assert_eq!(bbox.max, Point3::new(1.0, 1.0, 1.0));
    }

    #[test]
    fn mesh_surface_area() {
        let mesh = cube_mesh();
        // Cube with side 1 has surface area 6
        assert!((mesh.surface_area() - 6.0).abs() < 0.01);
    }

    #[test]
    fn mesh_volume() {
        let mesh = cube_mesh();
        // Unit cube has volume 1
        assert!((mesh.volume() - 1.0).abs() < 0.01);
    }

    #[test]
    fn mesh_merge() {
        let mut mesh1 = TriangleMesh::from_vertices_indices(
            vec![
                Point3::new(0.0, 0.0, 0.0),
                Point3::new(1.0, 0.0, 0.0),
                Point3::new(0.5, 1.0, 0.0),
            ],
            vec![[0, 1, 2]],
        );

        let mesh2 = TriangleMesh::from_vertices_indices(
            vec![
                Point3::new(2.0, 0.0, 0.0),
                Point3::new(3.0, 0.0, 0.0),
                Point3::new(2.5, 1.0, 0.0),
            ],
            vec![[0, 1, 2]],
        );

        mesh1.merge(&mesh2);

        assert_eq!(mesh1.vertex_count(), 6);
        assert_eq!(mesh1.triangle_count(), 2);
        assert!(mesh1.is_valid());
    }

    #[test]
    fn mesh_transform() {
        let mut mesh =
            TriangleMesh::from_vertices_indices(vec![Point3::new(0.0, 0.0, 0.0)], vec![]);

        let t = Transform3::translation(1.0, 2.0, 3.0);
        mesh.transform(&t);

        assert!((mesh.vertices[0].x - 1.0).abs() < 1e-10);
        assert!((mesh.vertices[0].y - 2.0).abs() < 1e-10);
        assert!((mesh.vertices[0].z - 3.0).abs() < 1e-10);
    }

    #[test]
    fn mesh_to_obj() {
        let mesh = TriangleMesh::from_vertices_indices(
            vec![
                Point3::new(0.0, 0.0, 0.0),
                Point3::new(1.0, 0.0, 0.0),
                Point3::new(0.5, 1.0, 0.0),
            ],
            vec![[0, 1, 2]],
        );

        let obj = mesh.to_obj();
        assert!(obj.contains("v 0 0 0"));
        assert!(obj.contains("v 1 0 0"));
        assert!(obj.contains("f 1 2 3"));
    }
}
