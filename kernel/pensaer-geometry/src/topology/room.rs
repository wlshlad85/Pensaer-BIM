//! Room detection and storage for topology graphs.
//!
//! Rooms are closed regions bounded by edges in the planar graph.
//! They are detected by tracing boundaries using the "turn-right" algorithm.

use super::edge::EdgeId;
use super::node::NodeId;
use std::fmt;
use uuid::Uuid;

/// Unique identifier for a topological room.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct RoomId(pub Uuid);

impl RoomId {
    /// Create a new random room ID.
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for RoomId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for RoomId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "room_{}", &self.0.to_string()[..8])
    }
}

/// A directed half-edge, representing one direction of traversal along an edge.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct HalfEdge {
    /// The underlying edge
    pub edge_id: EdgeId,
    /// The node we're coming from
    pub from_node: NodeId,
    /// The node we're going to
    pub to_node: NodeId,
}

impl HalfEdge {
    /// Create a new half-edge.
    pub fn new(edge_id: EdgeId, from_node: NodeId, to_node: NodeId) -> Self {
        Self {
            edge_id,
            from_node,
            to_node,
        }
    }

    /// Get the reversed half-edge (same edge, opposite direction).
    pub fn reversed(&self) -> Self {
        Self {
            edge_id: self.edge_id,
            from_node: self.to_node,
            to_node: self.from_node,
        }
    }
}

/// A topological room - a closed region bounded by edges.
#[derive(Debug, Clone)]
pub struct TopoRoom {
    /// Unique identifier
    pub id: RoomId,

    /// Nodes forming the boundary, in counter-clockwise order
    pub boundary_nodes: Vec<NodeId>,

    /// Edges forming the boundary (in traversal order)
    pub boundary_edges: Vec<EdgeId>,

    /// Half-edges used in the boundary (for tracking which faces are used)
    pub half_edges: Vec<HalfEdge>,

    /// Computed area (positive for CCW, negative for CW - exterior)
    pub signed_area: f64,

    /// Computed centroid
    pub centroid: [f64; 2],

    /// Whether this is the exterior (unbounded) region
    pub is_exterior: bool,
}

impl TopoRoom {
    /// Create a new room from boundary data.
    pub fn new(
        boundary_nodes: Vec<NodeId>,
        boundary_edges: Vec<EdgeId>,
        half_edges: Vec<HalfEdge>,
        signed_area: f64,
        centroid: [f64; 2],
    ) -> Self {
        Self {
            id: RoomId::new(),
            boundary_nodes,
            boundary_edges,
            half_edges,
            signed_area,
            centroid,
            is_exterior: signed_area < 0.0, // CW traversal = exterior
        }
    }

    /// Get the absolute area.
    pub fn area(&self) -> f64 {
        self.signed_area.abs()
    }

    /// Check if a node is on this room's boundary.
    pub fn contains_node(&self, node_id: NodeId) -> bool {
        self.boundary_nodes.contains(&node_id)
    }

    /// Check if an edge is on this room's boundary.
    pub fn contains_edge(&self, edge_id: EdgeId) -> bool {
        self.boundary_edges.contains(&edge_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn room_id_display() {
        let id = RoomId::new();
        let display = format!("{}", id);
        assert!(display.starts_with("room_"));
    }

    #[test]
    fn half_edge_reversed() {
        let node1 = NodeId::new();
        let node2 = NodeId::new();
        let edge = EdgeId::new();

        let he = HalfEdge::new(edge, node1, node2);
        let reversed = he.reversed();

        assert_eq!(reversed.edge_id, edge);
        assert_eq!(reversed.from_node, node2);
        assert_eq!(reversed.to_node, node1);
    }

    #[test]
    fn room_area() {
        let room = TopoRoom::new(vec![], vec![], vec![], 100.0, [0.0, 0.0]);
        assert_eq!(room.area(), 100.0);
        assert!(!room.is_exterior);

        let exterior = TopoRoom::new(vec![], vec![], vec![], -500.0, [0.0, 0.0]);
        assert_eq!(exterior.area(), 500.0);
        assert!(exterior.is_exterior);
    }
}
