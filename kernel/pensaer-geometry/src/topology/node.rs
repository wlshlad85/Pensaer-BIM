//! Topology node representing an endpoint or junction in the wall network.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use uuid::Uuid;

/// Unique identifier for a topology node.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct NodeId(pub Uuid);

impl NodeId {
    /// Generate a new unique node ID.
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    /// Create from an existing UUID.
    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }
}

impl Default for NodeId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for NodeId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "node_{}", &self.0.to_string()[..8])
    }
}

/// A topology node in the wall network.
///
/// Nodes represent:
/// - Wall endpoints
/// - T-junctions (where one wall meets another)
/// - Crossings (where walls intersect)
/// - Corners (L-joins, miters)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopoNode {
    /// Unique identifier
    pub id: NodeId,

    /// Position in 2D plan coordinates (mm)
    pub position: [f64; 2],

    /// IDs of edges connected to this node
    pub edges: HashSet<super::EdgeId>,

    /// Whether this node is pinned (cannot be moved by healing)
    pub pinned: bool,

    /// Optional label for debugging
    pub label: Option<String>,
}

impl TopoNode {
    /// Create a new node at the given position.
    pub fn new(position: [f64; 2]) -> Self {
        Self {
            id: NodeId::new(),
            position,
            edges: HashSet::new(),
            pinned: false,
            label: None,
        }
    }

    /// Create a new node with a specific ID.
    pub fn with_id(id: NodeId, position: [f64; 2]) -> Self {
        Self {
            id,
            position,
            edges: HashSet::new(),
            pinned: false,
            label: None,
        }
    }

    /// Get the number of edges connected to this node.
    pub fn degree(&self) -> usize {
        self.edges.len()
    }

    /// Check if this is a terminal node (degree 1).
    pub fn is_terminal(&self) -> bool {
        self.edges.len() == 1
    }

    /// Check if this is a junction node (degree > 2).
    pub fn is_junction(&self) -> bool {
        self.edges.len() > 2
    }

    /// Check if this is a through node (degree 2, potentially colinear).
    pub fn is_through(&self) -> bool {
        self.edges.len() == 2
    }

    /// Check if this node is orphaned (no edges).
    pub fn is_orphaned(&self) -> bool {
        self.edges.is_empty()
    }

    /// Add an edge connection.
    pub fn add_edge(&mut self, edge_id: super::EdgeId) {
        self.edges.insert(edge_id);
    }

    /// Remove an edge connection.
    pub fn remove_edge(&mut self, edge_id: super::EdgeId) {
        self.edges.remove(&edge_id);
    }

    /// Get position as x, y tuple.
    pub fn xy(&self) -> (f64, f64) {
        (self.position[0], self.position[1])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn node_creation() {
        let node = TopoNode::new([100.0, 200.0]);
        assert_eq!(node.position, [100.0, 200.0]);
        assert_eq!(node.degree(), 0);
        assert!(node.is_orphaned());
    }

    #[test]
    fn node_degree() {
        let mut node = TopoNode::new([0.0, 0.0]);
        assert!(node.is_orphaned());

        let edge1 = super::super::EdgeId::new();
        node.add_edge(edge1);
        assert!(node.is_terminal());

        let edge2 = super::super::EdgeId::new();
        node.add_edge(edge2);
        assert!(node.is_through());

        let edge3 = super::super::EdgeId::new();
        node.add_edge(edge3);
        assert!(node.is_junction());
    }

    #[test]
    fn node_id_display() {
        let id = NodeId::new();
        let s = format!("{}", id);
        assert!(s.starts_with("node_"));
    }
}
