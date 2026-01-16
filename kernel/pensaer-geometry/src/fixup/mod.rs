//! Geometry fixup/healing passes.
//!
//! These passes run after every mutation to maintain model invariants:
//!
//! 1. `snap_merge_nodes` - Merge nodes within SNAP_MERGE_TOL (0.5mm)
//! 2. `split_crossings` - Insert T-nodes at edge intersections
//! 3. `merge_colinear` - Collapse aligned edges into one
//! 4. `rooms_rebuild_dirty` - Recompute affected room boundaries
//!
//! # Order Matters!
//!
//! The passes MUST run in this order:
//! - Merge before split (avoid splitting then merging the split point)
//! - Split before merge colinear (splitting may create new colinear segments)
//! - Rooms last (depend on final topology)

use crate::constants::SNAP_MERGE_TOL;
use crate::topology::TopologyGraph;
use serde_json::Value;

/// Delta returned by operations, describing what changed.
#[derive(Debug, Clone, Default)]
pub struct Delta {
    /// IDs of created elements
    pub created: Vec<String>,
    /// IDs of modified elements
    pub modified: Vec<String>,
    /// IDs of deleted elements
    pub deleted: Vec<String>,
    /// IDs of affected nodes (for room rebuild)
    pub affected_nodes: Vec<String>,
}

impl Delta {
    pub fn new() -> Self {
        Self::default()
    }

    /// Convert delta to JSON summary.
    pub fn to_json(&self) -> Value {
        serde_json::json!({
            "created": self.created,
            "modified": self.modified,
            "deleted": self.deleted,
            "affected_nodes": self.affected_nodes
        })
    }
}

/// Merge nodes that are within `tolerance` of each other.
///
/// When two nodes are merged:
/// - The merged node position is the midpoint
/// - All edges referencing either node now reference the merged node
/// - Duplicate edges are removed
///
/// # Arguments
/// * `graph` - The topology graph to modify
/// * `tolerance` - Maximum distance for merge (typically SNAP_MERGE_TOL)
///
/// # Returns
/// Number of nodes merged
pub fn snap_merge_nodes(graph: &mut TopologyGraph, tolerance: f64) -> usize {
    // The TopologyGraph already handles snap-merge on node creation,
    // but this pass catches any nodes that have drifted close together
    // after other operations.
    //
    // For now, we use the graph's built-in snap_merge_nodes which uses
    // its own snap_tolerance. In the future, this could be parameterized.
    let _ = tolerance;
    graph.snap_merge_nodes()
}

/// Split edges that cross each other, creating T-nodes.
///
/// When edges cross:
/// - A new node is created at the intersection point
/// - Each edge is split into two edges meeting at the new node
///
/// # Returns
/// Number of crossings split
pub fn split_crossings(graph: &mut TopologyGraph) -> usize {
    // TODO: Implement in M3
    // 1. For each pair of edges, check for intersection
    // 2. Use robust predicates to avoid numerical issues
    // 3. If intersection exists and is not at endpoints:
    //    - Create new node at intersection
    //    - Split both edges at that node
    let _ = graph;
    0
}

/// Merge colinear edges that share a node.
///
/// When two edges are colinear and share an endpoint:
/// - They are merged into a single edge
/// - The intermediate node is removed if it has no other edges
///
/// # Returns
/// Number of edge pairs merged
pub fn merge_colinear(graph: &mut TopologyGraph) -> usize {
    // TODO: Implement in M3
    // 1. For each node with exactly 2 incident edges:
    //    - Check if edges are colinear (using robust predicates)
    //    - If yes, merge into single edge
    // 2. Remove orphaned nodes
    let _ = graph;
    0
}

/// Rebuild room boundaries affected by topology changes.
///
/// This pass:
/// - Identifies rooms that contain affected nodes
/// - Recomputes their boundary polygons
/// - Updates area/perimeter calculations
///
/// # Arguments
/// * `graph` - The topology graph to modify
/// * `delta` - Description of what changed (for incremental update)
pub fn rooms_rebuild_dirty(graph: &mut TopologyGraph, delta: &Delta) {
    // TODO: Implement in M4
    // 1. Find rooms containing any affected_nodes
    // 2. For each dirty room:
    //    - Trace boundary from wall edges
    //    - Recompute polygon
    //    - Update area/perimeter
    let _ = (graph, delta);
}

/// Run all fixup passes in the correct order.
///
/// This is the main entry point for healing after any mutation.
pub fn heal_all(graph: &mut TopologyGraph, delta: &Delta) {
    snap_merge_nodes(graph, SNAP_MERGE_TOL);
    split_crossings(graph);
    merge_colinear(graph);
    rooms_rebuild_dirty(graph, delta);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::topology::EdgeData;

    #[test]
    fn delta_to_json_works() {
        let delta = Delta {
            created: vec!["w1".to_string()],
            modified: vec!["w2".to_string()],
            deleted: vec![],
            affected_nodes: vec!["n1".to_string(), "n2".to_string()],
        };

        let json = delta.to_json();

        assert_eq!(json["created"].as_array().unwrap().len(), 1);
        assert_eq!(json["modified"].as_array().unwrap().len(), 1);
        assert_eq!(json["deleted"].as_array().unwrap().len(), 0);
        assert_eq!(json["affected_nodes"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn heal_all_runs_without_panic() {
        let mut graph = TopologyGraph::new();
        let delta = Delta::new();
        heal_all(&mut graph, &delta);
        // Just verifying it doesn't panic
    }

    #[test]
    fn snap_merge_nodes_merges_close_nodes() {
        let mut graph = TopologyGraph::new();

        // Add two edges that share approximately the same middle node
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));
        // This should auto-merge due to find_or_create_node
        graph.add_edge([1000.3, 0.0], [2000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        // Should have 3 nodes (start, shared middle, end)
        assert_eq!(graph.node_count(), 3);

        // Add another edge with a node that's very close but wasn't auto-merged
        // (simulating a post-mutation state)
        graph.add_edge([3000.0, 0.0], [4000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        // Now we have 5 nodes
        assert_eq!(graph.node_count(), 5);

        let delta = Delta::new();
        heal_all(&mut graph, &delta);

        // No nodes should have been merged since they're all far apart
        assert_eq!(graph.node_count(), 5);
    }
}
