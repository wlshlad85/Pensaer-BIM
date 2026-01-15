//! Extrusion operations for generating 3D meshes from 2D profiles.
//!
//! Extrusion takes a 2D polygon and extends it along the Z-axis to create
//! a 3D prism-like mesh. This is fundamental for generating wall, floor,
//! and other architectural elements.
//!
//! # Example
//!
//! ```ignore
//! use pensaer_math::Point2;
//!
//! let profile = vec![
//!     Point2::new(0.0, 0.0),
//!     Point2::new(1.0, 0.0),
//!     Point2::new(1.0, 1.0),
//!     Point2::new(0.0, 1.0),
//! ];
//!
//! let mesh = extrude_polygon(&profile, 3.0)?;
//! ```

use pensaer_math::{Point2, Point3, Vector3};

use crate::error::{GeometryError, GeometryResult};
use crate::mesh::TriangleMesh;
use super::triangulate::triangulate_polygon;

/// Extrude a 2D polygon along the Z-axis.
///
/// Creates a closed 3D mesh with:
/// - Bottom cap at z=base_z
/// - Top cap at z=base_z + height
/// - Side walls connecting the caps
///
/// # Arguments
/// * `profile` - 2D polygon vertices (CCW for outward-facing normals)
/// * `height` - Extrusion height (must be positive)
/// * `base_z` - Z-coordinate of the bottom cap (default: 0.0)
///
/// # Returns
/// A `TriangleMesh` with proper normals for rendering.
///
/// # Errors
/// - `InsufficientVertices` if profile has < 3 vertices
/// - `NonPositiveHeight` if height <= 0
pub fn extrude_polygon(
    profile: &[Point2],
    height: f64,
    base_z: f64,
) -> GeometryResult<TriangleMesh> {
    if profile.len() < 3 {
        return Err(GeometryError::InsufficientVertices);
    }

    if height <= 0.0 {
        return Err(GeometryError::NonPositiveHeight);
    }

    let top_z = base_z + height;
    let n = profile.len();

    // Triangulate the profile for caps
    let cap_triangles = triangulate_polygon(profile)?;

    // Calculate total vertices:
    // - Bottom cap: n vertices
    // - Top cap: n vertices
    // - Sides: 4 vertices per edge (n edges) for proper normals
    let side_vertex_count = n * 4;
    let total_vertices = n * 2 + side_vertex_count;

    let mut vertices = Vec::with_capacity(total_vertices);
    let mut normals = Vec::with_capacity(total_vertices);
    let mut indices = Vec::new();

    // === Bottom cap (facing down) ===
    for point in profile {
        vertices.push(Point3::new(point.x, point.y, base_z));
        normals.push(Vector3::new(0.0, 0.0, -1.0));
    }

    // Bottom cap triangles (reversed winding for downward normal)
    for tri in &cap_triangles {
        indices.push([tri[0] as u32, tri[2] as u32, tri[1] as u32]);
    }

    // === Top cap (facing up) ===
    let top_cap_start = n as u32;
    for point in profile {
        vertices.push(Point3::new(point.x, point.y, top_z));
        normals.push(Vector3::new(0.0, 0.0, 1.0));
    }

    // Top cap triangles (normal winding for upward normal)
    for tri in &cap_triangles {
        indices.push([
            top_cap_start + tri[0] as u32,
            top_cap_start + tri[1] as u32,
            top_cap_start + tri[2] as u32,
        ]);
    }

    // === Side walls ===
    let sides_start = (n * 2) as u32;

    for i in 0..n {
        let j = (i + 1) % n;

        let p0 = profile[i];
        let p1 = profile[j];

        // Bottom-left, bottom-right, top-right, top-left of this quad
        let bl = Point3::new(p0.x, p0.y, base_z);
        let br = Point3::new(p1.x, p1.y, base_z);
        let tr = Point3::new(p1.x, p1.y, top_z);
        let tl = Point3::new(p0.x, p0.y, top_z);

        // Compute outward normal for this face
        let edge = Vector3::new(p1.x - p0.x, p1.y - p0.y, 0.0);
        let up = Vector3::new(0.0, 0.0, 1.0);
        let normal = edge.cross(&up);
        let normal = normal.normalize().unwrap_or(Vector3::new(1.0, 0.0, 0.0));

        let base_idx = sides_start + (i as u32) * 4;

        // Add 4 vertices for this quad
        vertices.push(bl);
        vertices.push(br);
        vertices.push(tr);
        vertices.push(tl);

        normals.push(normal);
        normals.push(normal);
        normals.push(normal);
        normals.push(normal);

        // Two triangles for the quad
        indices.push([base_idx, base_idx + 1, base_idx + 2]);
        indices.push([base_idx, base_idx + 2, base_idx + 3]);
    }

    Ok(TriangleMesh {
        vertices,
        normals,
        uvs: Vec::new(),
        indices,
    })
}

/// Extrude a polygon with a hole.
///
/// Creates a 3D mesh with:
/// - Bottom cap with hole cut out
/// - Top cap with hole cut out
/// - Outer side walls
/// - Inner side walls (facing inward around the hole)
///
/// # Arguments
/// * `outer` - Outer boundary vertices (CCW)
/// * `hole` - Hole boundary vertices (CW for proper orientation)
/// * `height` - Extrusion height
/// * `base_z` - Base Z-coordinate
pub fn extrude_polygon_with_hole(
    outer: &[Point2],
    hole: &[Point2],
    height: f64,
    base_z: f64,
) -> GeometryResult<TriangleMesh> {
    if outer.len() < 3 {
        return Err(GeometryError::InsufficientVertices);
    }

    if height <= 0.0 {
        return Err(GeometryError::NonPositiveHeight);
    }

    let top_z = base_z + height;

    // Triangulate with hole using bridged polygon
    let holes_vec = if hole.len() >= 3 {
        vec![hole.to_vec()]
    } else {
        vec![]
    };

    let (combined_vertices, cap_triangles) =
        super::triangulate::triangulate_polygon_with_holes(outer, &holes_vec)?;

    let combined_n = combined_vertices.len();
    let _outer_n = outer.len();
    let hole_n = hole.len();

    let mut mesh = TriangleMesh::new();

    // === Bottom cap ===
    let bottom_start = 0u32;
    for point in &combined_vertices {
        mesh.vertices.push(Point3::new(point.x, point.y, base_z));
        mesh.normals.push(Vector3::new(0.0, 0.0, -1.0));
    }

    for tri in &cap_triangles {
        mesh.indices.push([
            bottom_start + tri[0] as u32,
            bottom_start + tri[2] as u32,
            bottom_start + tri[1] as u32,
        ]);
    }

    // === Top cap ===
    let top_start = combined_n as u32;
    for point in &combined_vertices {
        mesh.vertices.push(Point3::new(point.x, point.y, top_z));
        mesh.normals.push(Vector3::new(0.0, 0.0, 1.0));
    }

    for tri in &cap_triangles {
        mesh.indices.push([
            top_start + tri[0] as u32,
            top_start + tri[1] as u32,
            top_start + tri[2] as u32,
        ]);
    }

    // === Outer side walls ===
    let _outer_sides_start = mesh.vertices.len() as u32;
    add_side_walls(&mut mesh, outer, base_z, top_z, true);

    // === Inner (hole) side walls ===
    if hole_n >= 3 {
        add_side_walls(&mut mesh, hole, base_z, top_z, false);
    }

    Ok(mesh)
}

/// Add side walls for a closed profile.
fn add_side_walls(
    mesh: &mut TriangleMesh,
    profile: &[Point2],
    base_z: f64,
    top_z: f64,
    outward: bool,
) {
    let n = profile.len();

    for i in 0..n {
        let j = (i + 1) % n;

        let p0 = profile[i];
        let p1 = profile[j];

        // Bottom-left, bottom-right, top-right, top-left
        let bl = Point3::new(p0.x, p0.y, base_z);
        let br = Point3::new(p1.x, p1.y, base_z);
        let tr = Point3::new(p1.x, p1.y, top_z);
        let tl = Point3::new(p0.x, p0.y, top_z);

        // Compute normal
        let edge = Vector3::new(p1.x - p0.x, p1.y - p0.y, 0.0);
        let up = Vector3::new(0.0, 0.0, 1.0);
        let normal = if outward {
            edge.cross(&up)
        } else {
            up.cross(&edge) // Inward facing for hole
        };
        let normal = normal.normalize().unwrap_or(Vector3::new(1.0, 0.0, 0.0));

        let base_idx = mesh.vertices.len() as u32;

        mesh.vertices.push(bl);
        mesh.vertices.push(br);
        mesh.vertices.push(tr);
        mesh.vertices.push(tl);

        mesh.normals.push(normal);
        mesh.normals.push(normal);
        mesh.normals.push(normal);
        mesh.normals.push(normal);

        // Triangle winding
        if outward {
            mesh.indices.push([base_idx, base_idx + 1, base_idx + 2]);
            mesh.indices.push([base_idx, base_idx + 2, base_idx + 3]);
        } else {
            mesh.indices.push([base_idx, base_idx + 2, base_idx + 1]);
            mesh.indices.push([base_idx, base_idx + 3, base_idx + 2]);
        }
    }
}

/// Extrude a wall profile with multiple openings.
///
/// This creates a wall mesh where openings (doors, windows) are cut through.
/// Each opening creates a rectangular hole in the wall.
///
/// # Arguments
/// * `wall_profile` - The 2D outline of the wall (4 corners)
/// * `openings` - List of rectangular openings, each as (x_offset, y_offset, width, height)
///   where x_offset is along the wall, y_offset is from the bottom
/// * `wall_thickness` - Thickness of the wall (Z dimension)
pub fn extrude_wall_with_openings(
    wall_length: f64,
    wall_height: f64,
    wall_thickness: f64,
    openings: &[(f64, f64, f64, f64)], // (x_offset, y_offset, width, height)
) -> GeometryResult<TriangleMesh> {
    if wall_length <= 0.0 || wall_height <= 0.0 || wall_thickness <= 0.0 {
        return Err(GeometryError::NonPositiveThickness);
    }

    // Create the wall front face with holes
    let mut mesh = TriangleMesh::new();

    // Front and back faces
    let half_thick = wall_thickness / 2.0;

    // Create outer rectangle
    let outer = vec![
        Point2::new(0.0, 0.0),
        Point2::new(wall_length, 0.0),
        Point2::new(wall_length, wall_height),
        Point2::new(0.0, wall_height),
    ];

    // Create holes for openings
    // Use small epsilon to avoid coincident edges with outer boundary
    const HOLE_EPSILON: f64 = 1e-6;

    let holes: Vec<Vec<Point2>> = openings
        .iter()
        .filter_map(|&(x, y, w, h)| {
            // Validate opening
            if x < 0.0 || y < 0.0 || w <= 0.0 || h <= 0.0 {
                return None;
            }
            if x + w > wall_length || y + h > wall_height {
                return None;
            }

            // Adjust coordinates to avoid coincident edges with outer boundary
            // This prevents degenerate triangulation when hole touches wall edge
            let x0 = if x <= HOLE_EPSILON { HOLE_EPSILON } else { x };
            let y0 = if y <= HOLE_EPSILON { HOLE_EPSILON } else { y };
            let x1 = if x + w >= wall_length - HOLE_EPSILON {
                wall_length - HOLE_EPSILON
            } else {
                x + w
            };
            let y1 = if y + h >= wall_height - HOLE_EPSILON {
                wall_height - HOLE_EPSILON
            } else {
                y + h
            };

            // CW winding for hole
            Some(vec![
                Point2::new(x0, y0),
                Point2::new(x0, y1),
                Point2::new(x1, y1),
                Point2::new(x1, y0),
            ])
        })
        .collect();

    // Triangulate front face with holes
    let hole_refs: Vec<Vec<Point2>> = holes.clone();
    let (front_vertices, front_triangles) =
        super::triangulate::triangulate_polygon_with_holes(&outer, &hole_refs)?;

    // === Front face (at Y = -half_thick) ===
    let front_start = 0u32;
    for v in &front_vertices {
        mesh.vertices.push(Point3::new(v.x, -half_thick, v.y)); // X along wall, Z is height
        mesh.normals.push(Vector3::new(0.0, -1.0, 0.0));
    }

    for tri in &front_triangles {
        mesh.indices.push([
            front_start + tri[0] as u32,
            front_start + tri[2] as u32,
            front_start + tri[1] as u32,
        ]);
    }

    // === Back face (at Y = +half_thick) ===
    let back_start = mesh.vertices.len() as u32;
    for v in &front_vertices {
        mesh.vertices.push(Point3::new(v.x, half_thick, v.y));
        mesh.normals.push(Vector3::new(0.0, 1.0, 0.0));
    }

    for tri in &front_triangles {
        mesh.indices.push([
            back_start + tri[0] as u32,
            back_start + tri[1] as u32,
            back_start + tri[2] as u32,
        ]);
    }

    // === Outer edges (top, bottom, left, right) ===
    add_wall_edge(&mut mesh,
        Point2::new(0.0, 0.0), Point2::new(wall_length, 0.0),
        -half_thick, half_thick, Vector3::new(0.0, 0.0, -1.0));

    add_wall_edge(&mut mesh,
        Point2::new(wall_length, wall_height), Point2::new(0.0, wall_height),
        -half_thick, half_thick, Vector3::new(0.0, 0.0, 1.0));

    add_wall_edge(&mut mesh,
        Point2::new(0.0, wall_height), Point2::new(0.0, 0.0),
        -half_thick, half_thick, Vector3::new(-1.0, 0.0, 0.0));

    add_wall_edge(&mut mesh,
        Point2::new(wall_length, 0.0), Point2::new(wall_length, wall_height),
        -half_thick, half_thick, Vector3::new(1.0, 0.0, 0.0));

    // === Opening reveals (inner edges of openings) ===
    for &(x, y, w, h) in openings {
        if x < 0.0 || y < 0.0 || w <= 0.0 || h <= 0.0 {
            continue;
        }
        if x + w > wall_length || y + h > wall_height {
            continue;
        }

        // Bottom of opening
        add_wall_edge(&mut mesh,
            Point2::new(x + w, y), Point2::new(x, y),
            -half_thick, half_thick, Vector3::new(0.0, 0.0, -1.0));

        // Top of opening
        add_wall_edge(&mut mesh,
            Point2::new(x, y + h), Point2::new(x + w, y + h),
            -half_thick, half_thick, Vector3::new(0.0, 0.0, 1.0));

        // Left of opening
        add_wall_edge(&mut mesh,
            Point2::new(x, y), Point2::new(x, y + h),
            -half_thick, half_thick, Vector3::new(-1.0, 0.0, 0.0));

        // Right of opening
        add_wall_edge(&mut mesh,
            Point2::new(x + w, y + h), Point2::new(x + w, y),
            -half_thick, half_thick, Vector3::new(1.0, 0.0, 0.0));
    }

    Ok(mesh)
}

/// Add a wall edge (quad connecting front and back faces).
fn add_wall_edge(
    mesh: &mut TriangleMesh,
    p0: Point2, // Start point in wall local coords (X along wall, Y is height)
    p1: Point2, // End point
    y_front: f64, // Y coordinate of front face
    y_back: f64, // Y coordinate of back face
    normal: Vector3,
) {
    let base_idx = mesh.vertices.len() as u32;

    // Four corners: front-start, front-end, back-end, back-start
    mesh.vertices.push(Point3::new(p0.x, y_front, p0.y));
    mesh.vertices.push(Point3::new(p1.x, y_front, p1.y));
    mesh.vertices.push(Point3::new(p1.x, y_back, p1.y));
    mesh.vertices.push(Point3::new(p0.x, y_back, p0.y));

    mesh.normals.push(normal);
    mesh.normals.push(normal);
    mesh.normals.push(normal);
    mesh.normals.push(normal);

    mesh.indices.push([base_idx, base_idx + 1, base_idx + 2]);
    mesh.indices.push([base_idx, base_idx + 2, base_idx + 3]);
}

#[cfg(test)]
mod tests {
    use super::*;
    use pensaer_math::Point2;

    #[test]
    fn extrude_square() {
        let profile = vec![
            Point2::new(0.0, 0.0),
            Point2::new(1.0, 0.0),
            Point2::new(1.0, 1.0),
            Point2::new(0.0, 1.0),
        ];

        let mesh = extrude_polygon(&profile, 2.0, 0.0).unwrap();

        // Should have: 2 cap triangles each * 3 verts = doesn't work this way
        // Actually: 4 verts bottom + 4 verts top + 4*4 side verts = 8 + 16 = 24
        assert!(mesh.vertex_count() > 0);
        assert!(mesh.triangle_count() > 0);
        assert!(mesh.is_valid());

        // Check bounding box
        let bbox = mesh.bounding_box().unwrap();
        assert!((bbox.min.x - 0.0).abs() < 0.01);
        assert!((bbox.min.y - 0.0).abs() < 0.01);
        assert!((bbox.min.z - 0.0).abs() < 0.01);
        assert!((bbox.max.x - 1.0).abs() < 0.01);
        assert!((bbox.max.y - 1.0).abs() < 0.01);
        assert!((bbox.max.z - 2.0).abs() < 0.01);
    }

    #[test]
    fn extrude_triangle() {
        let profile = vec![
            Point2::new(0.0, 0.0),
            Point2::new(1.0, 0.0),
            Point2::new(0.5, 1.0),
        ];

        let mesh = extrude_polygon(&profile, 1.0, 0.5).unwrap();

        assert!(mesh.is_valid());

        // Base should be at z=0.5, top at z=1.5
        let bbox = mesh.bounding_box().unwrap();
        assert!((bbox.min.z - 0.5).abs() < 0.01);
        assert!((bbox.max.z - 1.5).abs() < 0.01);
    }

    #[test]
    fn extrude_with_normals() {
        let profile = vec![
            Point2::new(0.0, 0.0),
            Point2::new(1.0, 0.0),
            Point2::new(1.0, 1.0),
            Point2::new(0.0, 1.0),
        ];

        let mesh = extrude_polygon(&profile, 1.0, 0.0).unwrap();

        // Should have normals
        assert!(mesh.has_normals());
        assert_eq!(mesh.normals.len(), mesh.vertices.len());
    }

    #[test]
    fn extrude_zero_height_fails() {
        let profile = vec![
            Point2::new(0.0, 0.0),
            Point2::new(1.0, 0.0),
            Point2::new(1.0, 1.0),
        ];

        let result = extrude_polygon(&profile, 0.0, 0.0);
        assert!(result.is_err());
    }

    #[test]
    fn extrude_negative_height_fails() {
        let profile = vec![
            Point2::new(0.0, 0.0),
            Point2::new(1.0, 0.0),
            Point2::new(1.0, 1.0),
        ];

        let result = extrude_polygon(&profile, -1.0, 0.0);
        assert!(matches!(result, Err(GeometryError::NonPositiveHeight)));
    }

    #[test]
    fn extrude_insufficient_vertices() {
        let profile = vec![Point2::new(0.0, 0.0), Point2::new(1.0, 0.0)];

        let result = extrude_polygon(&profile, 1.0, 0.0);
        assert!(matches!(result, Err(GeometryError::InsufficientVertices)));
    }

    #[test]
    fn extrude_wall_simple() {
        let mesh = extrude_wall_with_openings(5.0, 3.0, 0.2, &[]).unwrap();

        assert!(mesh.is_valid());
        assert!(mesh.triangle_count() > 0);

        // Check dimensions
        let bbox = mesh.bounding_box().unwrap();
        assert!((bbox.max.x - bbox.min.x - 5.0).abs() < 0.01);
        assert!((bbox.max.y - bbox.min.y - 0.2).abs() < 0.01);
        assert!((bbox.max.z - bbox.min.z - 3.0).abs() < 0.01);
    }

    #[test]
    fn extrude_wall_with_door() {
        let mesh = extrude_wall_with_openings(
            5.0, 3.0, 0.2,
            &[(2.0, 0.0, 0.9, 2.1)], // Door opening
        ).unwrap();

        assert!(mesh.is_valid());

        // Should have more triangles than wall without openings
        let simple_mesh = extrude_wall_with_openings(5.0, 3.0, 0.2, &[]).unwrap();
        assert!(mesh.triangle_count() >= simple_mesh.triangle_count());
    }

    #[test]
    fn extrude_wall_with_window() {
        let mesh = extrude_wall_with_openings(
            5.0, 3.0, 0.2,
            &[(1.0, 0.9, 1.2, 1.2)], // Window opening
        ).unwrap();

        assert!(mesh.is_valid());
    }

    #[test]
    fn extrude_wall_multiple_openings() {
        let mesh = extrude_wall_with_openings(
            10.0, 3.0, 0.2,
            &[
                (1.0, 0.0, 0.9, 2.1),   // Door
                (4.0, 0.9, 1.2, 1.2),   // Window 1
                (7.0, 0.9, 1.2, 1.2),   // Window 2
            ],
        ).unwrap();

        assert!(mesh.is_valid());
    }

    #[test]
    fn extrude_polygon_with_single_hole() {
        let outer = vec![
            Point2::new(0.0, 0.0),
            Point2::new(4.0, 0.0),
            Point2::new(4.0, 4.0),
            Point2::new(0.0, 4.0),
        ];

        let hole = vec![
            Point2::new(1.0, 1.0),
            Point2::new(1.0, 3.0),
            Point2::new(3.0, 3.0),
            Point2::new(3.0, 1.0),
        ];

        let mesh = extrude_polygon_with_hole(&outer, &hole, 1.0, 0.0).unwrap();

        assert!(mesh.is_valid());
        assert!(mesh.vertex_count() > 0);
    }
}
