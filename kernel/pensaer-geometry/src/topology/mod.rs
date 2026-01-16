//! Topology graph for wall network representation.
//!
//! The topology graph stores walls as edges connecting nodes (endpoints).
//! This enables:
//! - Efficient spatial queries via R*-tree indexing
//! - Automatic node merging within SNAP_MERGE_TOL (0.5mm)
//! - T-junction and crossing detection
//! - Room boundary tracing
//!
//! # Architecture
//!
//! ```text
//! TopologyGraph
//! ├── nodes: HashMap<NodeId, TopoNode>     # All nodes
//! ├── edges: HashMap<EdgeId, TopoEdge>     # All edges
//! ├── rooms: HashMap<RoomId, TopoRoom>     # Detected rooms
//! ├── node_index: NodeIndex                # R*-tree for node queries
//! └── edge_index: EdgeIndex                # R*-tree for edge queries
//! ```
//!
//! # Example
//!
//! ```ignore
//! use pensaer_geometry::topology::TopologyGraph;
//!
//! let mut graph = TopologyGraph::new();
//!
//! // Add a wall - nodes are created/merged automatically
//! let edge_id = graph.add_edge([0.0, 0.0], [5000.0, 0.0], EdgeData::wall(200.0, 2700.0));
//!
//! // Query nodes near a point
//! let nearby = graph.nodes_within([100.0, 0.0], 500.0);
//!
//! // Detect rooms (closed regions)
//! graph.rebuild_rooms();
//! ```

mod edge;
mod graph;
mod node;
mod room;

pub use edge::{Baseline, EdgeData, EdgeId, OpeningRef, TopoEdge};
pub use graph::TopologyGraph;
pub use node::{NodeId, TopoNode};
pub use room::{HalfEdge, RoomId, TopoRoom};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_empty_graph() {
        let graph = TopologyGraph::new();
        assert_eq!(graph.node_count(), 0);
        assert_eq!(graph.edge_count(), 0);
    }

    #[test]
    fn add_single_edge() {
        let mut graph = TopologyGraph::new();
        let edge_id = graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        assert!(edge_id.is_some());
        assert_eq!(graph.node_count(), 2);
        assert_eq!(graph.edge_count(), 1);
    }

    #[test]
    fn nodes_merge_within_tolerance() {
        let mut graph = TopologyGraph::new();

        // Add first edge
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        // Add second edge starting very close to first edge's end (within 0.5mm)
        graph.add_edge([1000.3, 0.0], [2000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        // Should have 3 nodes (start, shared middle, end) not 4
        assert_eq!(graph.node_count(), 3);
        assert_eq!(graph.edge_count(), 2);
    }

    #[test]
    fn l_join_shares_node() {
        let mut graph = TopologyGraph::new();

        // Horizontal wall
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        // Vertical wall meeting at corner
        graph.add_edge(
            [1000.0, 0.0],
            [1000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );

        // Should share the corner node
        assert_eq!(graph.node_count(), 3);
        assert_eq!(graph.edge_count(), 2);
    }

    #[test]
    fn query_nodes_within_radius() {
        let mut graph = TopologyGraph::new();
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge([5000.0, 0.0], [6000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        // Query near origin
        let nearby = graph.nodes_within([50.0, 0.0], 100.0);
        assert_eq!(nearby.len(), 1);

        // Query in middle of nowhere
        let nearby = graph.nodes_within([3000.0, 3000.0], 100.0);
        assert_eq!(nearby.len(), 0);
    }

    #[test]
    fn remove_edge() {
        let mut graph = TopologyGraph::new();
        let edge_id = graph
            .add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0))
            .unwrap();

        assert_eq!(graph.edge_count(), 1);

        graph.remove_edge(edge_id);

        assert_eq!(graph.edge_count(), 0);
        // Orphaned nodes are cleaned up
        assert_eq!(graph.node_count(), 0);
    }
}
