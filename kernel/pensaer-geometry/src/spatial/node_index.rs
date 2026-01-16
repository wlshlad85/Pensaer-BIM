//! R*-tree index for geometry nodes.
//!
//! Provides O(log n) spatial queries for node lookup.

use rstar::{PointDistance, RTree, RTreeObject, AABB};

/// A node entry in the spatial index.
#[derive(Debug, Clone)]
pub struct NodeEntry {
    pub id: String,
    pub position: [f64; 2],
}

impl RTreeObject for NodeEntry {
    type Envelope = AABB<[f64; 2]>;

    fn envelope(&self) -> Self::Envelope {
        AABB::from_point(self.position)
    }
}

impl PointDistance for NodeEntry {
    fn distance_2(&self, point: &[f64; 2]) -> f64 {
        let dx = self.position[0] - point[0];
        let dy = self.position[1] - point[1];
        dx * dx + dy * dy
    }
}

/// Spatial index for geometry nodes using R*-tree.
pub struct NodeIndex {
    tree: RTree<NodeEntry>,
}

impl NodeIndex {
    /// Create a new empty node index.
    pub fn new() -> Self {
        Self { tree: RTree::new() }
    }

    /// Create index from a list of nodes.
    pub fn bulk_load(nodes: Vec<(String, [f64; 2])>) -> Self {
        let entries: Vec<NodeEntry> = nodes
            .into_iter()
            .map(|(id, position)| NodeEntry { id, position })
            .collect();
        Self {
            tree: RTree::bulk_load(entries),
        }
    }

    /// Insert a node into the index.
    pub fn insert(&mut self, id: String, position: [f64; 2]) {
        self.tree.insert(NodeEntry { id, position });
    }

    /// Remove a node from the index by ID.
    /// Returns true if the node was found and removed.
    pub fn remove(&mut self, id: &str, position: [f64; 2]) -> bool {
        let entry = NodeEntry {
            id: id.to_string(),
            position,
        };
        self.tree.remove(&entry).is_some()
    }

    /// Find all nodes within a radius of a point.
    pub fn within_radius(&self, center: [f64; 2], radius: f64) -> Vec<(&str, [f64; 2])> {
        let radius_squared = radius * radius;
        self.tree
            .locate_within_distance(center, radius_squared)
            .map(|entry| (entry.id.as_str(), entry.position))
            .collect()
    }

    /// Find the nearest node to a point.
    pub fn nearest(&self, point: [f64; 2]) -> Option<(&str, [f64; 2])> {
        self.tree
            .nearest_neighbor(&point)
            .map(|entry| (entry.id.as_str(), entry.position))
    }

    /// Find the k nearest nodes to a point.
    pub fn k_nearest(&self, point: [f64; 2], k: usize) -> Vec<(&str, [f64; 2])> {
        self.tree
            .nearest_neighbor_iter(&point)
            .take(k)
            .map(|entry| (entry.id.as_str(), entry.position))
            .collect()
    }

    /// Find all nodes within a bounding box.
    pub fn in_envelope(&self, min: [f64; 2], max: [f64; 2]) -> Vec<(&str, [f64; 2])> {
        let envelope = AABB::from_corners(min, max);
        self.tree
            .locate_in_envelope(&envelope)
            .map(|entry| (entry.id.as_str(), entry.position))
            .collect()
    }

    /// Get the number of nodes in the index.
    pub fn len(&self) -> usize {
        self.tree.size()
    }

    /// Check if the index is empty.
    pub fn is_empty(&self) -> bool {
        self.tree.size() == 0
    }

    /// Iterate over all nodes.
    pub fn iter(&self) -> impl Iterator<Item = (&str, [f64; 2])> {
        self.tree
            .iter()
            .map(|entry| (entry.id.as_str(), entry.position))
    }
}

impl Default for NodeIndex {
    fn default() -> Self {
        Self::new()
    }
}

// Implement PartialEq for NodeEntry to support removal
impl PartialEq for NodeEntry {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_index_is_empty() {
        let index = NodeIndex::new();
        assert!(index.is_empty());
        assert_eq!(index.len(), 0);
    }

    #[test]
    fn insert_and_count() {
        let mut index = NodeIndex::new();
        index.insert("n1".to_string(), [0.0, 0.0]);
        index.insert("n2".to_string(), [100.0, 0.0]);
        assert_eq!(index.len(), 2);
    }

    #[test]
    fn within_radius_finds_nodes() {
        let mut index = NodeIndex::new();
        index.insert("n1".to_string(), [0.0, 0.0]);
        index.insert("n2".to_string(), [5.0, 0.0]);
        index.insert("n3".to_string(), [100.0, 0.0]);

        let nearby = index.within_radius([0.0, 0.0], 10.0);
        assert_eq!(nearby.len(), 2);
    }

    #[test]
    fn nearest_finds_closest() {
        let mut index = NodeIndex::new();
        index.insert("n1".to_string(), [0.0, 0.0]);
        index.insert("n2".to_string(), [100.0, 0.0]);
        index.insert("n3".to_string(), [50.0, 50.0]);

        let nearest = index.nearest([45.0, 45.0]);
        assert!(nearest.is_some());
        assert_eq!(nearest.unwrap().0, "n3");
    }

    #[test]
    fn bulk_load_works() {
        let nodes = vec![
            ("n1".to_string(), [0.0, 0.0]),
            ("n2".to_string(), [100.0, 0.0]),
            ("n3".to_string(), [50.0, 50.0]),
        ];
        let index = NodeIndex::bulk_load(nodes);
        assert_eq!(index.len(), 3);
    }

    #[test]
    fn in_envelope_finds_nodes() {
        let mut index = NodeIndex::new();
        index.insert("n1".to_string(), [10.0, 10.0]);
        index.insert("n2".to_string(), [50.0, 50.0]);
        index.insert("n3".to_string(), [100.0, 100.0]);

        let in_box = index.in_envelope([0.0, 0.0], [60.0, 60.0]);
        assert_eq!(in_box.len(), 2); // n1 and n2
    }
}
