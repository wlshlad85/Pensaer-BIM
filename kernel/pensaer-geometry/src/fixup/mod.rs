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
use crate::spatial::segment_intersection;
use crate::topology::{EdgeId, TopologyGraph};
use crate::util::float::points2_within;
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
    let mut split_count = 0;
    let tolerance = graph.snap_tolerance();

    // We need to iterate until no more crossings are found,
    // since splitting can create new crossings
    loop {
        let crossing = find_crossing(graph, tolerance);

        match crossing {
            Some((edge1_id, edge2_id, intersection)) => {
                // Split both edges at the intersection point
                if let Some((_node1, _e1a, _e1b)) = graph.split_edge(edge1_id, intersection) {
                    // After splitting edge1, edge2 might still exist
                    // (if they don't share the intersection point)
                    if graph.get_edge(edge2_id).is_some() {
                        let _ = graph.split_edge(edge2_id, intersection);
                    }
                    split_count += 1;
                }
            }
            None => break,
        }
    }

    split_count
}

/// Find a crossing between two edges that don't share a node.
fn find_crossing(graph: &TopologyGraph, tolerance: f64) -> Option<(EdgeId, EdgeId, [f64; 2])> {
    let edge_ids = graph.edge_ids();

    for (i, &edge1_id) in edge_ids.iter().enumerate() {
        let (a1, a2) = match graph.edge_positions(edge1_id) {
            Some(p) => p,
            None => continue,
        };

        for &edge2_id in edge_ids.iter().skip(i + 1) {
            // Skip if edges share a node (they meet at a vertex, not a crossing)
            if graph.edges_share_node(edge1_id, edge2_id) {
                continue;
            }

            let (b1, b2) = match graph.edge_positions(edge2_id) {
                Some(p) => p,
                None => continue,
            };

            // Check for intersection
            if let Some(intersection) = segment_intersection(a1, a2, b1, b2) {
                // Make sure intersection is not at an endpoint of either edge
                if points2_within(intersection, a1, tolerance)
                    || points2_within(intersection, a2, tolerance)
                    || points2_within(intersection, b1, tolerance)
                    || points2_within(intersection, b2, tolerance)
                {
                    continue;
                }

                return Some((edge1_id, edge2_id, intersection));
            }
        }
    }

    None
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
    let mut merged_count = 0;
    let tolerance = graph.snap_tolerance();

    // We need to iterate until no more colinear pairs are found
    loop {
        let colinear_pair = find_colinear_pair(graph, tolerance);

        match colinear_pair {
            Some((edge1_id, edge2_id, shared_node_id)) => {
                // Get the edge data before merging
                let edge1 = match graph.get_edge(edge1_id) {
                    Some(e) => e.clone(),
                    None => continue,
                };
                let edge2 = match graph.get_edge(edge2_id) {
                    Some(e) => e.clone(),
                    None => continue,
                };

                // Determine the outer endpoints (not the shared node)
                let outer1 = edge1.other_node(shared_node_id).unwrap();
                let outer2 = edge2.other_node(shared_node_id).unwrap();

                // Get positions
                let pos1 = graph.get_node(outer1).map(|n| n.position);
                let pos2 = graph.get_node(outer2).map(|n| n.position);

                if let (Some(p1), Some(p2)) = (pos1, pos2) {
                    // Use the data from the first edge (could also merge properties)
                    let data = edge1.data.clone();

                    // Remove both old edges
                    graph.remove_edge(edge1_id);
                    graph.remove_edge(edge2_id);

                    // Create new merged edge
                    graph.add_edge(p1, p2, data);

                    merged_count += 1;
                }
            }
            None => break,
        }
    }

    merged_count
}

/// Find a pair of colinear edges that share a node.
fn find_colinear_pair(
    graph: &TopologyGraph,
    tolerance: f64,
) -> Option<(EdgeId, EdgeId, crate::topology::NodeId)> {
    // Look for nodes with exactly 2 edges
    for node in graph.nodes() {
        if node.edges.len() != 2 {
            continue;
        }

        // Skip pinned nodes
        if node.pinned {
            continue;
        }

        let edges: Vec<EdgeId> = node.edges.iter().copied().collect();
        let edge1_id = edges[0];
        let edge2_id = edges[1];

        // Get edge positions
        let (a1, a2) = match graph.edge_positions(edge1_id) {
            Some(p) => p,
            None => continue,
        };
        let (b1, b2) = match graph.edge_positions(edge2_id) {
            Some(p) => p,
            None => continue,
        };

        // Check if edges are colinear
        if are_colinear(a1, a2, b1, b2, tolerance) {
            return Some((edge1_id, edge2_id, node.id));
        }
    }

    None
}

/// Check if two edges are colinear (all four points lie on the same line).
fn are_colinear(a1: [f64; 2], a2: [f64; 2], b1: [f64; 2], b2: [f64; 2], tolerance: f64) -> bool {
    // Use the cross product to check colinearity
    // Two edges are colinear if all points lie on the same line

    // Direction of first edge
    let dx = a2[0] - a1[0];
    let dy = a2[1] - a1[1];
    let len = (dx * dx + dy * dy).sqrt();

    if len < tolerance {
        return false; // Degenerate edge
    }

    // Normalize direction
    let nx = dx / len;
    let ny = dy / len;

    // Check if b1 is on the line through a1-a2
    // Cross product of (a2-a1) and (b1-a1) should be near zero
    let cross1 = nx * (b1[1] - a1[1]) - ny * (b1[0] - a1[0]);
    if cross1.abs() > tolerance / len {
        return false;
    }

    // Check if b2 is on the line through a1-a2
    let cross2 = nx * (b2[1] - a1[1]) - ny * (b2[0] - a1[0]);
    if cross2.abs() > tolerance / len {
        return false;
    }

    true
}

/// Rebuild room boundaries affected by topology changes.
///
/// This pass:
/// - Identifies rooms that contain affected nodes
/// - Invalidates those rooms
/// - Rebuilds all rooms (full rebuild for simplicity)
///
/// # Arguments
/// * `graph` - The topology graph to modify
/// * `delta` - Description of what changed (for incremental update)
///
/// # Returns
/// Number of rooms after rebuild
pub fn rooms_rebuild_dirty(graph: &mut TopologyGraph, delta: &Delta) -> usize {
    // If no affected nodes, check if we need initial room detection
    if delta.affected_nodes.is_empty() {
        // If rooms already exist, nothing to do
        if graph.room_count() > 0 {
            return graph.room_count();
        }
    }

    // For now, do a full rebuild.
    // A more sophisticated implementation could:
    // 1. Parse affected_nodes to NodeIds
    // 2. Use invalidate_rooms_at_nodes to remove only affected rooms
    // 3. Do incremental room tracing from affected edges
    //
    // Full rebuild is simpler and correct, though less efficient for large graphs.
    graph.rebuild_rooms()
}

/// Run all fixup passes in the correct order.
///
/// This is the main entry point for healing after any mutation.
///
/// # Returns
/// Number of rooms after rebuild
pub fn heal_all(graph: &mut TopologyGraph, delta: &Delta) -> usize {
    snap_merge_nodes(graph, SNAP_MERGE_TOL);
    split_crossings(graph);
    merge_colinear(graph);
    rooms_rebuild_dirty(graph, delta)
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

        // Add another edge that is NOT colinear with the first two
        // (so merge_colinear won't affect it)
        graph.add_edge(
            [3000.0, 0.0],
            [4000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );

        // Now we have 5 nodes
        assert_eq!(graph.node_count(), 5);

        let delta = Delta::new();
        heal_all(&mut graph, &delta);

        // After heal_all:
        // - snap_merge_nodes: no merges (nodes far apart)
        // - split_crossings: no crossings
        // - merge_colinear: merges the first two colinear edges into one
        //   This removes the shared node at (1000,0), leaving 4 nodes:
        //   (0,0), (2000,0), (3000,0), (4000,1000)
        assert_eq!(graph.node_count(), 4);
    }

    // =========================================================================
    // M3 Tests: split_crossings
    // =========================================================================

    #[test]
    fn split_crossings_splits_x_pattern() {
        let mut graph = TopologyGraph::new();

        // Create X pattern - two crossing walls
        // Wall 1: (0,0) to (1000,1000) diagonal
        graph.add_edge([0.0, 0.0], [1000.0, 1000.0], EdgeData::wall(200.0, 2700.0));
        // Wall 2: (0,1000) to (1000,0) diagonal
        graph.add_edge([0.0, 1000.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        assert_eq!(graph.node_count(), 4);
        assert_eq!(graph.edge_count(), 2);

        let splits = split_crossings(&mut graph);

        // Should have split at the center (500, 500)
        assert_eq!(splits, 1);
        assert_eq!(graph.node_count(), 5); // 4 corners + 1 center
        assert_eq!(graph.edge_count(), 4); // Each original edge split into 2
    }

    #[test]
    fn split_crossings_ignores_t_junction() {
        let mut graph = TopologyGraph::new();

        // Create a proper T-junction by first creating the horizontal edge,
        // then splitting it to create the junction point, then adding vertical edge.
        let h_edge = graph
            .add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0))
            .unwrap();

        // Split the horizontal edge at (500, 0) to create the T-junction node
        let (t_node, _h1, _h2) = graph.split_edge(h_edge, [500.0, 0.0]).unwrap();

        // Add vertical edge starting from the T-junction node
        let top_node = graph.find_or_create_node([500.0, 500.0]);
        graph.add_edge_between_nodes(t_node, top_node, EdgeData::wall(200.0, 2700.0));

        // Now we have a proper T-junction:
        // - 4 nodes: (0,0), (500,0), (1000,0), (500,500)
        // - 3 edges: horizontal left, horizontal right, vertical
        assert_eq!(graph.node_count(), 4);
        assert_eq!(graph.edge_count(), 3);

        let splits = split_crossings(&mut graph);

        // T-junction should NOT be split (edges share the T-node)
        assert_eq!(splits, 0);
        assert_eq!(graph.node_count(), 4);
        assert_eq!(graph.edge_count(), 3);
    }

    #[test]
    fn split_crossings_ignores_l_join() {
        let mut graph = TopologyGraph::new();

        // Create L-join
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge(
            [1000.0, 0.0],
            [1000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );

        let splits = split_crossings(&mut graph);

        // L-join should not be split
        assert_eq!(splits, 0);
        assert_eq!(graph.edge_count(), 2);
    }

    // =========================================================================
    // M3 Tests: merge_colinear
    // =========================================================================

    #[test]
    fn merge_colinear_merges_aligned_edges() {
        let mut graph = TopologyGraph::new();

        // Create two colinear edges sharing a middle node
        // Edge 1: (0,0) to (500,0)
        // Edge 2: (500,0) to (1000,0)
        graph.add_edge([0.0, 0.0], [500.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge([500.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        assert_eq!(graph.node_count(), 3); // start, middle, end
        assert_eq!(graph.edge_count(), 2);

        let merged = merge_colinear(&mut graph);

        // Should merge into a single edge
        assert_eq!(merged, 1);
        assert_eq!(graph.edge_count(), 1);
        // Middle node should be removed
        assert_eq!(graph.node_count(), 2);

        // Verify the merged edge spans the full length
        let edge_id = graph.edge_ids()[0];
        let (start, end) = graph.edge_positions(edge_id).unwrap();

        // The merged edge should go from (0,0) to (1000,0)
        assert!(
            (points2_within(start, [0.0, 0.0], 1.0) && points2_within(end, [1000.0, 0.0], 1.0))
                || (points2_within(start, [1000.0, 0.0], 1.0)
                    && points2_within(end, [0.0, 0.0], 1.0))
        );
    }

    #[test]
    fn merge_colinear_ignores_l_join() {
        let mut graph = TopologyGraph::new();

        // Create L-join (not colinear)
        graph.add_edge([0.0, 0.0], [500.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge([500.0, 0.0], [500.0, 500.0], EdgeData::wall(200.0, 2700.0));

        assert_eq!(graph.node_count(), 3);
        assert_eq!(graph.edge_count(), 2);

        let merged = merge_colinear(&mut graph);

        // Should NOT merge (edges are perpendicular)
        assert_eq!(merged, 0);
        assert_eq!(graph.edge_count(), 2);
        assert_eq!(graph.node_count(), 3);
    }

    #[test]
    fn merge_colinear_ignores_junction() {
        let mut graph = TopologyGraph::new();

        // Create T-junction (node with 3 edges)
        graph.add_edge([0.0, 0.0], [500.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge([500.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge([500.0, 0.0], [500.0, 500.0], EdgeData::wall(200.0, 2700.0));

        // Middle node has 3 edges
        let middle_node = graph.nodes_within([500.0, 0.0], 1.0)[0];
        assert_eq!(graph.edges_at_node(middle_node).len(), 3);

        let merged = merge_colinear(&mut graph);

        // Should NOT merge (middle node is a junction with 3 edges)
        assert_eq!(merged, 0);
        assert_eq!(graph.edge_count(), 3);
    }

    #[test]
    fn are_colinear_detects_aligned_segments() {
        // Horizontal aligned segments
        assert!(are_colinear(
            [0.0, 0.0],
            [100.0, 0.0],
            [100.0, 0.0],
            [200.0, 0.0],
            0.5
        ));

        // Vertical aligned segments
        assert!(are_colinear(
            [0.0, 0.0],
            [0.0, 100.0],
            [0.0, 100.0],
            [0.0, 200.0],
            0.5
        ));

        // Diagonal aligned segments
        assert!(are_colinear(
            [0.0, 0.0],
            [100.0, 100.0],
            [100.0, 100.0],
            [200.0, 200.0],
            0.5
        ));
    }

    #[test]
    fn are_colinear_rejects_perpendicular() {
        // Perpendicular segments (L-join)
        assert!(!are_colinear(
            [0.0, 0.0],
            [100.0, 0.0],
            [100.0, 0.0],
            [100.0, 100.0],
            0.5
        ));
    }

    #[test]
    fn are_colinear_rejects_parallel_offset() {
        // Parallel but offset segments
        assert!(!are_colinear(
            [0.0, 0.0],
            [100.0, 0.0],
            [0.0, 10.0],
            [100.0, 10.0],
            0.5
        ));
    }

    #[test]
    fn heal_all_with_crossings_and_colinear() {
        let mut graph = TopologyGraph::new();

        // Create a scenario that needs both passes:
        // Two crossing walls, one of which will create a colinear situation

        // Horizontal wall through center
        graph.add_edge([0.0, 500.0], [1000.0, 500.0], EdgeData::wall(200.0, 2700.0));

        // Vertical wall crossing it
        graph.add_edge([500.0, 0.0], [500.0, 1000.0], EdgeData::wall(200.0, 2700.0));

        assert_eq!(graph.node_count(), 4);
        assert_eq!(graph.edge_count(), 2);

        let delta = Delta::new();
        heal_all(&mut graph, &delta);

        // After healing:
        // - Crossings should be split: 4 edges
        // - No colinear merges (the edges form a cross, not aligned)
        assert_eq!(graph.edge_count(), 4);
        assert_eq!(graph.node_count(), 5); // 4 corners + 1 center
    }

    // =========================================================================
    // M4 Tests: rooms_rebuild_dirty
    // =========================================================================

    #[test]
    fn rooms_rebuild_dirty_detects_rooms() {
        let mut graph = TopologyGraph::new();

        // Create a rectangular room
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge(
            [1000.0, 0.0],
            [1000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );
        graph.add_edge(
            [1000.0, 1000.0],
            [0.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );
        graph.add_edge([0.0, 1000.0], [0.0, 0.0], EdgeData::wall(200.0, 2700.0));

        let delta = Delta::new();
        let room_count = rooms_rebuild_dirty(&mut graph, &delta);

        // Should detect 2 rooms (interior + exterior)
        assert_eq!(room_count, 2);
        assert_eq!(graph.room_count(), 2);
        assert_eq!(graph.interior_rooms().len(), 1);
    }

    #[test]
    #[ignore] // TODO: Requires proper T-junction and crossing split to detect all quadrant rooms
    fn heal_all_detects_rooms_after_healing() {
        let mut graph = TopologyGraph::new();

        // Create crossing walls that form 4 quadrants after split
        //
        //       |
        //   Q2  |  Q1
        // ------+------
        //   Q3  |  Q4
        //       |
        //
        graph.add_edge([-1000.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge([0.0, -1000.0], [0.0, 1000.0], EdgeData::wall(200.0, 2700.0));

        // Close the outer rectangle
        graph.add_edge(
            [-1000.0, -1000.0],
            [1000.0, -1000.0],
            EdgeData::wall(200.0, 2700.0),
        );
        graph.add_edge(
            [1000.0, -1000.0],
            [1000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );
        graph.add_edge(
            [1000.0, 1000.0],
            [-1000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );
        graph.add_edge(
            [-1000.0, 1000.0],
            [-1000.0, -1000.0],
            EdgeData::wall(200.0, 2700.0),
        );

        let delta = Delta::new();
        let room_count = heal_all(&mut graph, &delta);

        // After healing:
        // - Crossings at center and at perimeter are split
        // - Should have 4 interior quadrant rooms + 1 exterior
        assert!(
            room_count >= 5,
            "Expected at least 5 rooms, got {}",
            room_count
        );
        assert!(graph.interior_rooms().len() >= 4);
    }

    #[test]
    fn rooms_rebuild_preserves_existing_rooms() {
        let mut graph = TopologyGraph::new();

        // Create a rectangular room
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge(
            [1000.0, 0.0],
            [1000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );
        graph.add_edge(
            [1000.0, 1000.0],
            [0.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );
        graph.add_edge([0.0, 1000.0], [0.0, 0.0], EdgeData::wall(200.0, 2700.0));

        // First rebuild
        let delta1 = Delta::new();
        rooms_rebuild_dirty(&mut graph, &delta1);
        let initial_count = graph.room_count();

        // Second rebuild with empty delta (no changes)
        let delta2 = Delta::new();
        rooms_rebuild_dirty(&mut graph, &delta2);

        // Room count should be preserved (but we do full rebuild, so it's same)
        assert_eq!(graph.room_count(), initial_count);
    }
}
