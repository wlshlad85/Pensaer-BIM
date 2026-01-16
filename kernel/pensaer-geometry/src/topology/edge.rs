//! Topology edge representing a wall segment between two nodes.

use super::NodeId;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Unique identifier for a topology edge.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct EdgeId(pub Uuid);

impl EdgeId {
    /// Generate a new unique edge ID.
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    /// Create from an existing UUID.
    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }
}

impl Default for EdgeId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for EdgeId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "edge_{}", &self.0.to_string()[..8])
    }
}

/// Data associated with a topology edge.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeData {
    /// Wall thickness in mm
    pub thickness: f64,

    /// Wall height in mm
    pub height: f64,

    /// Wall baseline (center, left, or right)
    pub baseline: Baseline,

    /// Optional wall type ID
    pub wall_type_id: Option<String>,

    /// Optional openings on this edge
    pub openings: Vec<OpeningRef>,
}

impl EdgeData {
    /// Create edge data for a wall with default baseline.
    pub fn wall(thickness: f64, height: f64) -> Self {
        Self {
            thickness,
            height,
            baseline: Baseline::Center,
            wall_type_id: None,
            openings: Vec::new(),
        }
    }

    /// Create edge data with all parameters.
    pub fn new(thickness: f64, height: f64, baseline: Baseline) -> Self {
        Self {
            thickness,
            height,
            baseline,
            wall_type_id: None,
            openings: Vec::new(),
        }
    }
}

/// Wall baseline position relative to the edge line.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum Baseline {
    /// Wall is centered on the edge line
    #[default]
    Center,
    /// Wall is to the left of the edge line (looking from start to end)
    Left,
    /// Wall is to the right of the edge line
    Right,
}

/// Reference to an opening on this edge.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpeningRef {
    /// ID of the opening element
    pub element_id: Uuid,

    /// Offset along the edge from start node (mm)
    pub offset: f64,

    /// Width of the opening (mm)
    pub width: f64,

    /// Height of the opening (mm)
    pub height: f64,

    /// Sill height from floor (mm)
    pub sill_height: f64,
}

/// A topology edge in the wall network.
///
/// Edges represent wall segments connecting two nodes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopoEdge {
    /// Unique identifier
    pub id: EdgeId,

    /// Start node ID
    pub start_node: NodeId,

    /// End node ID
    pub end_node: NodeId,

    /// Edge-specific data (thickness, height, etc.)
    pub data: EdgeData,

    /// Whether this edge is locked (cannot be modified by healing)
    pub locked: bool,
}

impl TopoEdge {
    /// Create a new edge between two nodes.
    pub fn new(start_node: NodeId, end_node: NodeId, data: EdgeData) -> Self {
        Self {
            id: EdgeId::new(),
            start_node,
            end_node,
            data,
            locked: false,
        }
    }

    /// Create an edge with a specific ID.
    pub fn with_id(id: EdgeId, start_node: NodeId, end_node: NodeId, data: EdgeData) -> Self {
        Self {
            id,
            start_node,
            end_node,
            data,
            locked: false,
        }
    }

    /// Get the other node given one node ID.
    pub fn other_node(&self, node_id: NodeId) -> Option<NodeId> {
        if self.start_node == node_id {
            Some(self.end_node)
        } else if self.end_node == node_id {
            Some(self.start_node)
        } else {
            None
        }
    }

    /// Check if this edge connects to a given node.
    pub fn connects_to(&self, node_id: NodeId) -> bool {
        self.start_node == node_id || self.end_node == node_id
    }

    /// Get both node IDs as a tuple.
    pub fn nodes(&self) -> (NodeId, NodeId) {
        (self.start_node, self.end_node)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn edge_creation() {
        let n1 = NodeId::new();
        let n2 = NodeId::new();
        let data = EdgeData::wall(200.0, 2700.0);

        let edge = TopoEdge::new(n1, n2, data);

        assert_eq!(edge.start_node, n1);
        assert_eq!(edge.end_node, n2);
        assert_eq!(edge.data.thickness, 200.0);
        assert_eq!(edge.data.height, 2700.0);
    }

    #[test]
    fn edge_other_node() {
        let n1 = NodeId::new();
        let n2 = NodeId::new();
        let edge = TopoEdge::new(n1, n2, EdgeData::wall(200.0, 2700.0));

        assert_eq!(edge.other_node(n1), Some(n2));
        assert_eq!(edge.other_node(n2), Some(n1));
        assert_eq!(edge.other_node(NodeId::new()), None);
    }

    #[test]
    fn edge_connects_to() {
        let n1 = NodeId::new();
        let n2 = NodeId::new();
        let n3 = NodeId::new();
        let edge = TopoEdge::new(n1, n2, EdgeData::wall(200.0, 2700.0));

        assert!(edge.connects_to(n1));
        assert!(edge.connects_to(n2));
        assert!(!edge.connects_to(n3));
    }

    #[test]
    fn edge_data_wall() {
        let data = EdgeData::wall(150.0, 3000.0);
        assert_eq!(data.thickness, 150.0);
        assert_eq!(data.height, 3000.0);
        assert_eq!(data.baseline, Baseline::Center);
    }

    #[test]
    fn edge_id_display() {
        let id = EdgeId::new();
        let s = format!("{}", id);
        assert!(s.starts_with("edge_"));
    }
}
