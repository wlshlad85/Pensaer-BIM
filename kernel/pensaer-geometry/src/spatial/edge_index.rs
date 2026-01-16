//! R*-tree index for geometry edges/segments.
//!
//! Provides O(log n) spatial queries for edge lookup and intersection detection.

use rstar::{RTree, RTreeObject, AABB};

/// An edge entry in the spatial index.
#[derive(Debug, Clone)]
pub struct EdgeEntry {
    pub id: String,
    pub start: [f64; 2],
    pub end: [f64; 2],
}

impl EdgeEntry {
    /// Create a new edge entry.
    pub fn new(id: String, start: [f64; 2], end: [f64; 2]) -> Self {
        Self { id, start, end }
    }

    /// Get the midpoint of the edge.
    pub fn midpoint(&self) -> [f64; 2] {
        [
            (self.start[0] + self.end[0]) / 2.0,
            (self.start[1] + self.end[1]) / 2.0,
        ]
    }

    /// Get the length of the edge.
    pub fn length(&self) -> f64 {
        let dx = self.end[0] - self.start[0];
        let dy = self.end[1] - self.start[1];
        (dx * dx + dy * dy).sqrt()
    }
}

impl RTreeObject for EdgeEntry {
    type Envelope = AABB<[f64; 2]>;

    fn envelope(&self) -> Self::Envelope {
        let min_x = self.start[0].min(self.end[0]);
        let max_x = self.start[0].max(self.end[0]);
        let min_y = self.start[1].min(self.end[1]);
        let max_y = self.start[1].max(self.end[1]);
        AABB::from_corners([min_x, min_y], [max_x, max_y])
    }
}

impl PartialEq for EdgeEntry {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

/// Spatial index for geometry edges using R*-tree.
pub struct EdgeIndex {
    tree: RTree<EdgeEntry>,
}

impl EdgeIndex {
    /// Create a new empty edge index.
    pub fn new() -> Self {
        Self {
            tree: RTree::new(),
        }
    }

    /// Create index from a list of edges.
    pub fn bulk_load(edges: Vec<(String, [f64; 2], [f64; 2])>) -> Self {
        let entries: Vec<EdgeEntry> = edges
            .into_iter()
            .map(|(id, start, end)| EdgeEntry { id, start, end })
            .collect();
        Self {
            tree: RTree::bulk_load(entries),
        }
    }

    /// Insert an edge into the index.
    pub fn insert(&mut self, id: String, start: [f64; 2], end: [f64; 2]) {
        self.tree.insert(EdgeEntry { id, start, end });
    }

    /// Remove an edge from the index.
    pub fn remove(&mut self, id: &str, start: [f64; 2], end: [f64; 2]) -> bool {
        let entry = EdgeEntry { id: id.to_string(), start, end };
        self.tree.remove(&entry).is_some()
    }

    /// Find all edges whose bounding boxes intersect with a bounding box.
    pub fn in_envelope(&self, min: [f64; 2], max: [f64; 2]) -> Vec<&EdgeEntry> {
        let envelope = AABB::from_corners(min, max);
        self.tree.locate_in_envelope(&envelope).collect()
    }

    /// Find all edges whose bounding boxes intersect with a point (with tolerance).
    pub fn near_point(&self, point: [f64; 2], tolerance: f64) -> Vec<&EdgeEntry> {
        let min = [point[0] - tolerance, point[1] - tolerance];
        let max = [point[0] + tolerance, point[1] + tolerance];
        self.in_envelope(min, max)
    }

    /// Find edges that potentially intersect with another edge.
    /// Returns edges whose bounding boxes overlap.
    pub fn potentially_intersecting(&self, start: [f64; 2], end: [f64; 2]) -> Vec<&EdgeEntry> {
        let min_x = start[0].min(end[0]);
        let max_x = start[0].max(end[0]);
        let min_y = start[1].min(end[1]);
        let max_y = start[1].max(end[1]);
        self.in_envelope([min_x, min_y], [max_x, max_y])
    }

    /// Get the number of edges in the index.
    pub fn len(&self) -> usize {
        self.tree.size()
    }

    /// Check if the index is empty.
    pub fn is_empty(&self) -> bool {
        self.tree.size() == 0
    }

    /// Iterate over all edges.
    pub fn iter(&self) -> impl Iterator<Item = &EdgeEntry> {
        self.tree.iter()
    }
}

impl Default for EdgeIndex {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_index_is_empty() {
        let index = EdgeIndex::new();
        assert!(index.is_empty());
    }

    #[test]
    fn insert_and_count() {
        let mut index = EdgeIndex::new();
        index.insert("e1".to_string(), [0.0, 0.0], [100.0, 0.0]);
        index.insert("e2".to_string(), [0.0, 0.0], [0.0, 100.0]);
        assert_eq!(index.len(), 2);
    }

    #[test]
    fn in_envelope_finds_edges() {
        let mut index = EdgeIndex::new();
        index.insert("e1".to_string(), [0.0, 0.0], [100.0, 0.0]);
        index.insert("e2".to_string(), [200.0, 0.0], [300.0, 0.0]);

        let edges = index.in_envelope([-10.0, -10.0], [110.0, 10.0]);
        assert_eq!(edges.len(), 1);
        assert_eq!(edges[0].id, "e1");
    }

    #[test]
    fn potentially_intersecting_finds_crossing_edges() {
        let mut index = EdgeIndex::new();
        // Horizontal edge
        index.insert("e1".to_string(), [0.0, 50.0], [100.0, 50.0]);
        // Vertical edge that crosses it
        index.insert("e2".to_string(), [50.0, 0.0], [50.0, 100.0]);
        // Edge far away
        index.insert("e3".to_string(), [200.0, 0.0], [300.0, 0.0]);

        // Query edges that might intersect with e1
        let candidates = index.potentially_intersecting([0.0, 50.0], [100.0, 50.0]);
        assert_eq!(candidates.len(), 2); // e1 and e2
    }

    #[test]
    fn edge_entry_midpoint() {
        let edge = EdgeEntry::new("e1".to_string(), [0.0, 0.0], [100.0, 100.0]);
        let mid = edge.midpoint();
        assert!((mid[0] - 50.0).abs() < 1e-10);
        assert!((mid[1] - 50.0).abs() < 1e-10);
    }

    #[test]
    fn edge_entry_length() {
        let edge = EdgeEntry::new("e1".to_string(), [0.0, 0.0], [3.0, 4.0]);
        assert!((edge.length() - 5.0).abs() < 1e-10);
    }
}
