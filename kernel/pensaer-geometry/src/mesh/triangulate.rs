//! Polygon triangulation algorithms.
//!
//! This module provides algorithms for converting 2D polygons into triangles:
//! - Ear-clipping for simple polygons (O(n²) but robust)
//! - Ear-clipping with hole bridging for polygons with holes
//!
//! # Algorithm Overview
//!
//! ## Ear Clipping
//! An "ear" is a triangle formed by three consecutive vertices where:
//! 1. The middle vertex is convex (interior angle < 180°)
//! 2. No other polygon vertex lies inside the triangle
//!
//! We repeatedly find and remove ears until only a triangle remains.
//!
//! ## Holes
//! Holes are handled by creating "bridges" - connecting the outer boundary
//! to each hole to form a single simple polygon that can be triangulated.

use pensaer_math::robust_predicates::{
    is_convex_vertex, point_in_triangle as robust_point_in_triangle,
    segments_properly_intersect as robust_segments_intersect,
};
use pensaer_math::Point2;

use crate::error::{GeometryError, GeometryResult};

/// Minimum number of vertices for a valid polygon.
const MIN_POLYGON_VERTICES: usize = 3;

/// Tolerance for collinearity and point-in-triangle tests.
const EPSILON: f64 = 1e-10;

/// Triangulate a simple polygon using ear clipping.
///
/// # Arguments
/// * `vertices` - Counter-clockwise ordered polygon vertices
///
/// # Returns
/// A list of triangle indices, each `[a, b, c]` refers to indices in `vertices`.
///
/// # Errors
/// - `InsufficientVertices` if fewer than 3 vertices
/// - `TriangulationFailed` if triangulation fails (e.g., self-intersecting polygon)
///
/// # Example
/// ```ignore
/// let square = vec![
///     Point2::new(0.0, 0.0),
///     Point2::new(1.0, 0.0),
///     Point2::new(1.0, 1.0),
///     Point2::new(0.0, 1.0),
/// ];
/// let triangles = triangulate_polygon(&square)?;
/// assert_eq!(triangles.len(), 2); // Square → 2 triangles
/// ```
pub fn triangulate_polygon(vertices: &[Point2]) -> GeometryResult<Vec<[usize; 3]>> {
    let n = vertices.len();

    if n < MIN_POLYGON_VERTICES {
        return Err(GeometryError::InsufficientVertices);
    }

    // For a triangle, return it directly
    if n == 3 {
        return Ok(vec![[0, 1, 2]]);
    }

    // Ensure counter-clockwise winding
    let signed_area = compute_signed_area(vertices);
    let is_ccw = signed_area > 0.0;

    // Create working list of vertex indices
    let mut indices: Vec<usize> = if is_ccw {
        (0..n).collect()
    } else {
        // Reverse to make CCW
        (0..n).rev().collect()
    };

    let mut triangles = Vec::with_capacity(n - 2);
    let mut safety_counter = n * n; // Prevent infinite loop

    while indices.len() > 3 {
        safety_counter -= 1;
        if safety_counter == 0 {
            return Err(GeometryError::TriangulationFailed(
                "ear clipping exceeded iteration limit".to_string(),
            ));
        }

        let ear_index = find_ear(vertices, &indices)?;

        // Get the ear triangle
        let len = indices.len();
        let prev = indices[(ear_index + len - 1) % len];
        let curr = indices[ear_index];
        let next = indices[(ear_index + 1) % len];

        // Output triangle with consistent winding
        triangles.push([prev, curr, next]);

        // Remove the ear tip
        indices.remove(ear_index);
    }

    // Final triangle
    if indices.len() == 3 {
        triangles.push([indices[0], indices[1], indices[2]]);
    }

    Ok(triangles)
}

/// Triangulate a polygon with holes.
///
/// This works by:
/// 1. Finding bridge points between outer boundary and each hole
/// 2. Creating a single simple polygon by inserting hole vertices
/// 3. Triangulating the resulting simple polygon
///
/// # Arguments
/// * `outer` - Counter-clockwise ordered outer boundary vertices
/// * `holes` - Clockwise ordered hole boundary vertices
///
/// # Returns
/// Triangle indices referring to a combined vertex list where:
/// - Indices 0..outer.len() refer to outer boundary
/// - Subsequent indices refer to hole vertices in order
///
/// # Errors
/// - `InsufficientVertices` if outer boundary has < 3 vertices
/// - `TriangulationFailed` if bridging or triangulation fails
pub fn triangulate_polygon_with_holes(
    outer: &[Point2],
    holes: &[Vec<Point2>],
) -> GeometryResult<(Vec<Point2>, Vec<[usize; 3]>)> {
    if outer.len() < MIN_POLYGON_VERTICES {
        return Err(GeometryError::InsufficientVertices);
    }

    // If no holes, use simple triangulation
    if holes.is_empty() {
        let triangles = triangulate_polygon(outer)?;
        return Ok((outer.to_vec(), triangles));
    }

    // Ensure outer is CCW, holes are CW
    let mut outer_vertices: Vec<Point2> = outer.to_vec();
    if compute_signed_area(&outer_vertices) < 0.0 {
        outer_vertices.reverse();
    }

    // Process holes - ensure CW winding and sort by rightmost x-coordinate
    let mut processed_holes: Vec<(usize, Vec<Point2>)> = holes
        .iter()
        .enumerate()
        .map(|(i, hole)| {
            let mut h = hole.clone();
            if compute_signed_area(&h) > 0.0 {
                h.reverse(); // Make CW
            }
            (i, h)
        })
        .collect();

    // Sort holes by rightmost x-coordinate (descending) for proper bridging order
    processed_holes.sort_by(|(_, a), (_, b)| {
        let max_x_a = a.iter().map(|p| p.x).fold(f64::NEG_INFINITY, f64::max);
        let max_x_b = b.iter().map(|p| p.x).fold(f64::NEG_INFINITY, f64::max);
        max_x_b
            .partial_cmp(&max_x_a)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    // Build combined polygon by bridging holes
    let mut combined = outer_vertices;

    for (_hole_idx, hole) in processed_holes {
        combined = bridge_hole_to_polygon(&combined, &hole)?;
    }

    // Now triangulate the simple polygon
    let triangles = triangulate_polygon(&combined)?;

    Ok((combined, triangles))
}

/// Compute signed area of a polygon (positive = CCW, negative = CW).
fn compute_signed_area(vertices: &[Point2]) -> f64 {
    let n = vertices.len();
    if n < 3 {
        return 0.0;
    }

    let mut area = 0.0;
    for i in 0..n {
        let j = (i + 1) % n;
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
    }
    area / 2.0
}

/// Find an ear in the polygon.
///
/// An ear is a convex vertex where the triangle formed with its neighbors
/// contains no other polygon vertices.
fn find_ear(vertices: &[Point2], indices: &[usize]) -> GeometryResult<usize> {
    let n = indices.len();

    for i in 0..n {
        if is_ear(vertices, indices, i) {
            return Ok(i);
        }
    }

    // If no ear found, the polygon may be degenerate or self-intersecting
    Err(GeometryError::TriangulationFailed(
        "no ear found - polygon may be self-intersecting or degenerate".to_string(),
    ))
}

/// Check if vertex at index i (in indices list) is an ear.
fn is_ear(vertices: &[Point2], indices: &[usize], i: usize) -> bool {
    let n = indices.len();
    let prev_idx = indices[(i + n - 1) % n];
    let curr_idx = indices[i];
    let next_idx = indices[(i + 1) % n];

    let prev = &vertices[prev_idx];
    let curr = &vertices[curr_idx];
    let next = &vertices[next_idx];

    // Check if vertex is convex (interior angle < 180°)
    if !is_convex(prev, curr, next) {
        return false;
    }

    // Check that no other vertices are inside the ear triangle
    for j in 0..n {
        let test_idx = indices[j];
        if test_idx == prev_idx || test_idx == curr_idx || test_idx == next_idx {
            continue;
        }

        let test_point = &vertices[test_idx];

        // Skip if test point is nearly coincident with any triangle vertex
        // This handles bridge duplicate vertices in polygon-with-holes
        if points_nearly_equal(test_point, prev)
            || points_nearly_equal(test_point, curr)
            || points_nearly_equal(test_point, next)
        {
            continue;
        }

        if point_in_triangle(test_point, prev, curr, next) {
            return false;
        }
    }

    true
}

/// Check if two points are nearly equal within tolerance.
#[inline]
fn points_nearly_equal(a: &Point2, b: &Point2) -> bool {
    (a.x - b.x).abs() < EPSILON && (a.y - b.y).abs() < EPSILON
}

/// Check if the middle vertex creates a convex angle (CCW turn).
///
/// Uses robust geometric predicates to handle nearly-collinear vertices correctly.
fn is_convex(prev: &Point2, curr: &Point2, next: &Point2) -> bool {
    // Use robust predicate for reliable orientation test
    is_convex_vertex(*prev, *curr, *next)
}

/// Check if a point is strictly inside a triangle.
///
/// Uses robust geometric predicates to handle edge cases correctly.
fn point_in_triangle(p: &Point2, a: &Point2, b: &Point2, c: &Point2) -> bool {
    // Use robust predicate with automatic self-correction for ambiguous cases
    robust_point_in_triangle(*p, *a, *b, *c)
}

/// Bridge a hole into the outer polygon to create a single simple polygon.
///
/// Algorithm:
/// 1. Find the rightmost vertex of the hole
/// 2. Find the closest mutually-visible vertex on the outer boundary
/// 3. Create a bridge by inserting hole vertices into the outer polygon
/// 4. The bridge consists of coincident but distinct vertices (a zero-length edge)
fn bridge_hole_to_polygon(outer: &[Point2], hole: &[Point2]) -> GeometryResult<Vec<Point2>> {
    if hole.is_empty() {
        return Ok(outer.to_vec());
    }

    if hole.len() < 3 {
        return Err(GeometryError::InsufficientVertices);
    }

    // Find rightmost vertex of hole
    let (hole_vertex_idx, _) = hole
        .iter()
        .enumerate()
        .max_by(|(_, a), (_, b)| {
            a.x.partial_cmp(&b.x)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| a.y.partial_cmp(&b.y).unwrap_or(std::cmp::Ordering::Equal))
        })
        .ok_or_else(|| GeometryError::TriangulationFailed("empty hole".to_string()))?;

    let hole_point = hole[hole_vertex_idx];

    // Find the best bridge point on outer polygon
    let bridge_idx = find_best_bridge_vertex(outer, hole, hole_point)?;

    // Create combined polygon by inserting hole at bridge point
    // Structure: outer[0..bridge_idx+1], hole (rotated), outer[bridge_idx..]
    // This creates two coincident edges (the "bridge")

    let mut combined = Vec::with_capacity(outer.len() + hole.len() + 2);

    // Add outer vertices up to and including bridge point
    for i in 0..=bridge_idx {
        combined.push(outer[i]);
    }

    // Add all hole vertices, starting from the rightmost and going around the hole
    // The hole is CW, so we traverse it in CW order
    for i in 0..hole.len() {
        let idx = (hole_vertex_idx + i) % hole.len();
        combined.push(hole[idx]);
    }

    // Close the bridge back to outer by duplicating the bridge points
    // Add hole's rightmost vertex again
    combined.push(hole[hole_vertex_idx]);

    // Add outer's bridge vertex again
    combined.push(outer[bridge_idx]);

    // Add remaining outer vertices (after bridge point)
    for i in (bridge_idx + 1)..outer.len() {
        combined.push(outer[i]);
    }

    Ok(combined)
}

/// Find the best vertex on outer polygon to bridge to a hole point.
///
/// This uses a visibility-based approach:
/// 1. Cast ray from hole point to the right
/// 2. Find intersection with outer boundary
/// 3. Select the vertex that creates the shortest visible bridge
fn find_best_bridge_vertex(
    outer: &[Point2],
    _hole: &[Point2],
    hole_point: Point2,
) -> GeometryResult<usize> {
    let n = outer.len();

    // Find candidate by shooting ray to the right
    let mut best_idx = 0;
    let mut best_score = f64::INFINITY;

    for i in 0..n {
        let j = (i + 1) % n;
        let p1 = outer[i];
        let p2 = outer[j];

        // Check if this edge is intersected by horizontal ray from hole_point
        let min_y = p1.y.min(p2.y);
        let max_y = p1.y.max(p2.y);

        // Edge must straddle or touch the ray's y-coordinate
        if hole_point.y < min_y - EPSILON || hole_point.y > max_y + EPSILON {
            continue;
        }

        // Compute x-coordinate of intersection
        let x_intersect = if (p2.y - p1.y).abs() < EPSILON {
            // Horizontal edge - use the leftmost point that's to the right
            if p1.x > hole_point.x || p2.x > hole_point.x {
                p1.x.min(p2.x).max(hole_point.x)
            } else {
                continue;
            }
        } else {
            // Compute intersection
            let t = (hole_point.y - p1.y) / (p2.y - p1.y);
            if t < -EPSILON || t > 1.0 + EPSILON {
                continue;
            }
            p1.x + t * (p2.x - p1.x)
        };

        // Must be to the right of hole point
        if x_intersect < hole_point.x - EPSILON {
            continue;
        }

        // Score based on distance and prefer vertices over edge midpoints
        let _dist = x_intersect - hole_point.x;

        // Check both endpoints as candidates
        for &vertex_idx in &[i, j] {
            let v = outer[vertex_idx];

            // Vertex must be to the right of hole point (or very close)
            if v.x < hole_point.x - EPSILON {
                continue;
            }

            // Score: prefer close vertices, with slight preference for direct x-alignment
            let dx = v.x - hole_point.x;
            let dy = (v.y - hole_point.y).abs();
            let vertex_score = dx + dy * 0.1;

            if vertex_score < best_score {
                // Verify visibility (no edges block the bridge)
                if is_bridge_visible(outer, hole_point, vertex_idx) {
                    best_score = vertex_score;
                    best_idx = vertex_idx;
                }
            }
        }
    }

    // If no good candidate found via ray casting, find closest visible vertex
    if best_score == f64::INFINITY {
        for i in 0..n {
            let v = outer[i];
            if v.x >= hole_point.x - EPSILON && is_bridge_visible(outer, hole_point, i) {
                let dist = (v.x - hole_point.x).powi(2) + (v.y - hole_point.y).powi(2);
                if dist < best_score {
                    best_score = dist;
                    best_idx = i;
                }
            }
        }
    }

    Ok(best_idx)
}

/// Check if a bridge from hole_point to outer[vertex_idx] is visible (doesn't cross any edges).
fn is_bridge_visible(outer: &[Point2], hole_point: Point2, vertex_idx: usize) -> bool {
    let target = outer[vertex_idx];
    let n = outer.len();

    for i in 0..n {
        let j = (i + 1) % n;

        // Skip edges adjacent to the target vertex
        if i == vertex_idx || j == vertex_idx {
            continue;
        }

        if segments_properly_intersect(hole_point, target, outer[i], outer[j]) {
            return false;
        }
    }

    true
}

/// Check if two segments properly intersect (cross each other, not just touch).
///
/// Uses robust geometric predicates to handle nearly-parallel segments correctly.
fn segments_properly_intersect(a1: Point2, a2: Point2, b1: Point2, b2: Point2) -> bool {
    // Use robust predicate with automatic self-correction
    robust_segments_intersect(a1, a2, b1, b2)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn triangulate_triangle() {
        let vertices = vec![
            Point2::new(0.0, 0.0),
            Point2::new(1.0, 0.0),
            Point2::new(0.5, 1.0),
        ];

        let triangles = triangulate_polygon(&vertices).unwrap();
        assert_eq!(triangles.len(), 1);
        assert_eq!(triangles[0], [0, 1, 2]);
    }

    #[test]
    fn triangulate_square() {
        // CCW square
        let vertices = vec![
            Point2::new(0.0, 0.0),
            Point2::new(1.0, 0.0),
            Point2::new(1.0, 1.0),
            Point2::new(0.0, 1.0),
        ];

        let triangles = triangulate_polygon(&vertices).unwrap();
        assert_eq!(triangles.len(), 2);

        // Verify all vertices are used
        let mut used: Vec<bool> = vec![false; 4];
        for tri in &triangles {
            for &idx in tri {
                used[idx] = true;
            }
        }
        assert!(used.iter().all(|&u| u));
    }

    #[test]
    fn triangulate_pentagon() {
        // Regular pentagon (CCW)
        let n = 5;
        let vertices: Vec<Point2> = (0..n)
            .map(|i| {
                let angle = 2.0 * std::f64::consts::PI * i as f64 / n as f64;
                Point2::new(angle.cos(), angle.sin())
            })
            .collect();

        let triangles = triangulate_polygon(&vertices).unwrap();
        assert_eq!(triangles.len(), 3); // n-2 triangles for n vertices
    }

    #[test]
    fn triangulate_l_shape() {
        // L-shaped polygon (CCW)
        let vertices = vec![
            Point2::new(0.0, 0.0),
            Point2::new(2.0, 0.0),
            Point2::new(2.0, 1.0),
            Point2::new(1.0, 1.0),
            Point2::new(1.0, 2.0),
            Point2::new(0.0, 2.0),
        ];

        let triangles = triangulate_polygon(&vertices).unwrap();
        assert_eq!(triangles.len(), 4); // 6-2 = 4 triangles
    }

    #[test]
    fn triangulate_clockwise_square() {
        // CW square - should be auto-corrected
        let vertices = vec![
            Point2::new(0.0, 0.0),
            Point2::new(0.0, 1.0),
            Point2::new(1.0, 1.0),
            Point2::new(1.0, 0.0),
        ];

        let triangles = triangulate_polygon(&vertices).unwrap();
        assert_eq!(triangles.len(), 2);
    }

    #[test]
    fn triangulate_with_single_hole() {
        // Outer square
        let outer = vec![
            Point2::new(0.0, 0.0),
            Point2::new(4.0, 0.0),
            Point2::new(4.0, 4.0),
            Point2::new(0.0, 4.0),
        ];

        // Inner square hole (CW)
        let hole = vec![
            Point2::new(1.0, 1.0),
            Point2::new(1.0, 3.0),
            Point2::new(3.0, 3.0),
            Point2::new(3.0, 1.0),
        ];

        let (combined, triangles) = triangulate_polygon_with_holes(&outer, &[hole]).unwrap();

        // Should have more triangles than just the outer boundary
        assert!(triangles.len() >= 6);

        // Verify all triangles are valid
        for tri in &triangles {
            assert!(tri[0] < combined.len());
            assert!(tri[1] < combined.len());
            assert!(tri[2] < combined.len());
        }
    }

    #[test]
    fn triangulate_insufficient_vertices() {
        let vertices = vec![Point2::new(0.0, 0.0), Point2::new(1.0, 0.0)];
        let result = triangulate_polygon(&vertices);
        assert!(matches!(result, Err(GeometryError::InsufficientVertices)));
    }

    #[test]
    fn signed_area_ccw() {
        // CCW triangle
        let vertices = vec![
            Point2::new(0.0, 0.0),
            Point2::new(1.0, 0.0),
            Point2::new(0.5, 1.0),
        ];
        assert!(compute_signed_area(&vertices) > 0.0);
    }

    #[test]
    fn signed_area_cw() {
        // CW triangle
        let vertices = vec![
            Point2::new(0.0, 0.0),
            Point2::new(0.5, 1.0),
            Point2::new(1.0, 0.0),
        ];
        assert!(compute_signed_area(&vertices) < 0.0);
    }

    #[test]
    fn point_in_triangle_inside() {
        let a = Point2::new(0.0, 0.0);
        let b = Point2::new(2.0, 0.0);
        let c = Point2::new(1.0, 2.0);
        let p = Point2::new(1.0, 0.5);

        assert!(point_in_triangle(&p, &a, &b, &c));
    }

    #[test]
    fn point_in_triangle_outside() {
        let a = Point2::new(0.0, 0.0);
        let b = Point2::new(2.0, 0.0);
        let c = Point2::new(1.0, 2.0);
        let p = Point2::new(3.0, 3.0);

        assert!(!point_in_triangle(&p, &a, &b, &c));
    }

    #[test]
    fn is_convex_check() {
        let prev = Point2::new(0.0, 0.0);
        let curr = Point2::new(1.0, 0.0);
        let next = Point2::new(1.0, 1.0);

        // 90 degree left turn is convex
        assert!(is_convex(&prev, &curr, &next));

        // Reverse is reflex
        assert!(!is_convex(&next, &curr, &prev));
    }
}
