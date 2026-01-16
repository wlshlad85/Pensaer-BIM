//! The main topology graph structure.

use super::edge::{EdgeData, EdgeId, TopoEdge};
use super::node::{NodeId, TopoNode};
use crate::constants::SNAP_MERGE_TOL;
use crate::spatial::{EdgeIndex, NodeIndex};
use crate::util::float::points2_within;
use std::collections::HashMap;

/// The topology graph storing the wall network.
///
/// This is the core data structure for the geometry kernel. All walls
/// are represented as edges connecting nodes. The graph maintains:
///
/// - HashMap storage for O(1) lookup by ID
/// - R*-tree spatial indexes for efficient range queries
/// - Automatic node merging within SNAP_MERGE_TOL
#[derive(Debug)]
pub struct TopologyGraph {
    /// All nodes in the graph
    nodes: HashMap<NodeId, TopoNode>,

    /// All edges in the graph
    edges: HashMap<EdgeId, TopoEdge>,

    /// Spatial index for nodes
    node_index: NodeIndex,

    /// Spatial index for edges
    edge_index: EdgeIndex,

    /// Snap/merge tolerance (default: SNAP_MERGE_TOL = 0.5mm)
    snap_tolerance: f64,
}

impl TopologyGraph {
    /// Create a new empty topology graph.
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
            edges: HashMap::new(),
            node_index: NodeIndex::new(),
            edge_index: EdgeIndex::new(),
            snap_tolerance: SNAP_MERGE_TOL,
        }
    }

    /// Create a graph with custom snap tolerance.
    pub fn with_tolerance(snap_tolerance: f64) -> Self {
        Self {
            nodes: HashMap::new(),
            edges: HashMap::new(),
            node_index: NodeIndex::new(),
            edge_index: EdgeIndex::new(),
            snap_tolerance,
        }
    }

    // =========================================================================
    // Node Operations
    // =========================================================================

    /// Get the number of nodes.
    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    /// Get a node by ID.
    pub fn get_node(&self, id: NodeId) -> Option<&TopoNode> {
        self.nodes.get(&id)
    }

    /// Get a mutable node by ID.
    pub fn get_node_mut(&mut self, id: NodeId) -> Option<&mut TopoNode> {
        self.nodes.get_mut(&id)
    }

    /// Find or create a node at a position.
    ///
    /// If a node exists within snap_tolerance, returns that node's ID.
    /// Otherwise, creates a new node and returns its ID.
    pub fn find_or_create_node(&mut self, position: [f64; 2]) -> NodeId {
        // Check for existing node within tolerance
        let nearby = self.node_index.within_radius(position, self.snap_tolerance);

        if let Some((_id_str, _pos)) = nearby.first() {
            // Parse the ID back - we stored it as string in the index
            if let Some((id, _node)) = self
                .nodes
                .iter()
                .find(|(_, n)| points2_within(n.position, position, self.snap_tolerance))
            {
                return *id;
            }
        }

        // Create new node
        let node = TopoNode::new(position);
        let id = node.id;

        // Add to index
        self.node_index.insert(id.0.to_string(), position);

        // Add to storage
        self.nodes.insert(id, node);

        id
    }

    /// Get all nodes within a radius of a point.
    pub fn nodes_within(&self, center: [f64; 2], radius: f64) -> Vec<NodeId> {
        self.nodes
            .iter()
            .filter(|(_, node)| points2_within(node.position, center, radius))
            .map(|(id, _)| *id)
            .collect()
    }

    /// Remove a node if it's orphaned.
    fn remove_if_orphaned(&mut self, node_id: NodeId) {
        if let Some(node) = self.nodes.get(&node_id) {
            if node.is_orphaned() {
                let pos = node.position;
                self.nodes.remove(&node_id);
                self.node_index.remove(&node_id.0.to_string(), pos);
            }
        }
    }

    /// Iterate over all nodes.
    pub fn nodes(&self) -> impl Iterator<Item = &TopoNode> {
        self.nodes.values()
    }

    // =========================================================================
    // Edge Operations
    // =========================================================================

    /// Get the number of edges.
    pub fn edge_count(&self) -> usize {
        self.edges.len()
    }

    /// Get an edge by ID.
    pub fn get_edge(&self, id: EdgeId) -> Option<&TopoEdge> {
        self.edges.get(&id)
    }

    /// Get a mutable edge by ID.
    pub fn get_edge_mut(&mut self, id: EdgeId) -> Option<&mut TopoEdge> {
        self.edges.get_mut(&id)
    }

    /// Add an edge between two positions.
    ///
    /// Nodes are found or created automatically. If start and end positions
    /// are the same (within tolerance), returns None.
    pub fn add_edge(
        &mut self,
        start_pos: [f64; 2],
        end_pos: [f64; 2],
        data: EdgeData,
    ) -> Option<EdgeId> {
        // Don't create zero-length edges
        if points2_within(start_pos, end_pos, self.snap_tolerance) {
            return None;
        }

        // Find or create nodes
        let start_node = self.find_or_create_node(start_pos);
        let end_node = self.find_or_create_node(end_pos);

        // Don't create edge if nodes merged to same point
        if start_node == end_node {
            return None;
        }

        // Create edge
        let edge = TopoEdge::new(start_node, end_node, data);
        let edge_id = edge.id;

        // Get node positions for edge index
        let start = self.nodes.get(&start_node).unwrap().position;
        let end = self.nodes.get(&end_node).unwrap().position;

        // Add to edge index
        self.edge_index.insert(edge_id.0.to_string(), start, end);

        // Connect nodes to edge
        self.nodes.get_mut(&start_node).unwrap().add_edge(edge_id);
        self.nodes.get_mut(&end_node).unwrap().add_edge(edge_id);

        // Store edge
        self.edges.insert(edge_id, edge);

        Some(edge_id)
    }

    /// Remove an edge and clean up orphaned nodes.
    pub fn remove_edge(&mut self, edge_id: EdgeId) -> Option<TopoEdge> {
        let edge = self.edges.remove(&edge_id)?;

        // Remove from nodes
        if let Some(start_node) = self.nodes.get_mut(&edge.start_node) {
            start_node.remove_edge(edge_id);
        }
        if let Some(end_node) = self.nodes.get_mut(&edge.end_node) {
            end_node.remove_edge(edge_id);
        }

        // Get positions for index removal
        let start_pos = self.nodes.get(&edge.start_node).map(|n| n.position);
        let end_pos = self.nodes.get(&edge.end_node).map(|n| n.position);

        // Remove from edge index
        if let (Some(start), Some(end)) = (start_pos, end_pos) {
            self.edge_index.remove(&edge_id.0.to_string(), start, end);
        }

        // Clean up orphaned nodes
        self.remove_if_orphaned(edge.start_node);
        self.remove_if_orphaned(edge.end_node);

        Some(edge)
    }

    /// Iterate over all edges.
    pub fn edges(&self) -> impl Iterator<Item = &TopoEdge> {
        self.edges.values()
    }

    /// Get edges connected to a node.
    pub fn edges_at_node(&self, node_id: NodeId) -> Vec<EdgeId> {
        self.nodes
            .get(&node_id)
            .map(|n| n.edges.iter().copied().collect())
            .unwrap_or_default()
    }

    // =========================================================================
    // Healing Operations (M2)
    // =========================================================================

    /// Merge nodes that are within tolerance of each other.
    ///
    /// When two nodes are merged:
    /// - The merged node position is the midpoint
    /// - All edges referencing either node now reference the merged node
    /// - Duplicate edges are removed
    ///
    /// Returns the number of nodes merged.
    pub fn snap_merge_nodes(&mut self) -> usize {
        let mut merged_count = 0;
        let mut merge_map: HashMap<NodeId, NodeId> = HashMap::new();

        // Find all node pairs within tolerance using union-find approach
        let node_ids: Vec<NodeId> = self.nodes.keys().copied().collect();

        for i in 0..node_ids.len() {
            let id_a = node_ids[i];

            // Skip if already merged
            if merge_map.contains_key(&id_a) {
                continue;
            }

            let pos_a = match self.nodes.get(&id_a) {
                Some(n) => n.position,
                None => continue,
            };

            // Skip pinned nodes
            if self.nodes.get(&id_a).map(|n| n.pinned).unwrap_or(false) {
                continue;
            }

            for j in (i + 1)..node_ids.len() {
                let id_b = node_ids[j];

                // Skip if already merged
                if merge_map.contains_key(&id_b) {
                    continue;
                }

                let pos_b = match self.nodes.get(&id_b) {
                    Some(n) => n.position,
                    None => continue,
                };

                // Skip pinned nodes
                if self.nodes.get(&id_b).map(|n| n.pinned).unwrap_or(false) {
                    continue;
                }

                // Check if within tolerance
                if points2_within(pos_a, pos_b, self.snap_tolerance) {
                    // Merge b into a
                    merge_map.insert(id_b, id_a);

                    // Update position to midpoint
                    if let Some(node_a) = self.nodes.get_mut(&id_a) {
                        node_a.position =
                            [(pos_a[0] + pos_b[0]) / 2.0, (pos_a[1] + pos_b[1]) / 2.0];
                    }

                    merged_count += 1;
                }
            }
        }

        // Apply merges to edges
        for edge in self.edges.values_mut() {
            if let Some(&new_start) = merge_map.get(&edge.start_node) {
                edge.start_node = new_start;
            }
            if let Some(&new_end) = merge_map.get(&edge.end_node) {
                edge.end_node = new_end;
            }
        }

        // Transfer edge connections to merged nodes
        for (old_id, new_id) in &merge_map {
            if let Some(old_node) = self.nodes.get(old_id) {
                let edges: Vec<EdgeId> = old_node.edges.iter().copied().collect();
                for edge_id in edges {
                    if let Some(new_node) = self.nodes.get_mut(new_id) {
                        new_node.add_edge(edge_id);
                    }
                }
            }
        }

        // Remove merged nodes
        for old_id in merge_map.keys() {
            if let Some(node) = self.nodes.remove(old_id) {
                self.node_index.remove(&old_id.0.to_string(), node.position);
            }
        }

        // Remove self-loop edges (start == end after merge)
        let self_loops: Vec<EdgeId> = self
            .edges
            .iter()
            .filter(|(_, e)| e.start_node == e.end_node)
            .map(|(id, _)| *id)
            .collect();

        for edge_id in self_loops {
            self.remove_edge(edge_id);
        }

        // Rebuild spatial indexes
        self.rebuild_indexes();

        merged_count
    }

    /// Rebuild spatial indexes from current state.
    fn rebuild_indexes(&mut self) {
        // Rebuild node index
        let nodes: Vec<(String, [f64; 2])> = self
            .nodes
            .iter()
            .map(|(id, node)| (id.0.to_string(), node.position))
            .collect();
        self.node_index = NodeIndex::bulk_load(nodes);

        // Rebuild edge index
        let edges: Vec<(String, [f64; 2], [f64; 2])> = self
            .edges
            .iter()
            .filter_map(|(id, edge)| {
                let start = self.nodes.get(&edge.start_node)?.position;
                let end = self.nodes.get(&edge.end_node)?.position;
                Some((id.0.to_string(), start, end))
            })
            .collect();
        self.edge_index = EdgeIndex::bulk_load(edges);
    }

    /// Get the position of an edge's start node.
    pub fn edge_start_position(&self, edge_id: EdgeId) -> Option<[f64; 2]> {
        let edge = self.edges.get(&edge_id)?;
        self.nodes.get(&edge.start_node).map(|n| n.position)
    }

    /// Get the position of an edge's end node.
    pub fn edge_end_position(&self, edge_id: EdgeId) -> Option<[f64; 2]> {
        let edge = self.edges.get(&edge_id)?;
        self.nodes.get(&edge.end_node).map(|n| n.position)
    }

    /// Get both endpoint positions of an edge.
    pub fn edge_positions(&self, edge_id: EdgeId) -> Option<([f64; 2], [f64; 2])> {
        let start = self.edge_start_position(edge_id)?;
        let end = self.edge_end_position(edge_id)?;
        Some((start, end))
    }

    /// Clear the graph.
    pub fn clear(&mut self) {
        self.nodes.clear();
        self.edges.clear();
        self.node_index = NodeIndex::new();
        self.edge_index = EdgeIndex::new();
    }
}

impl Default for TopologyGraph {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snap_merge_basic() {
        let mut graph = TopologyGraph::new();

        // Add two edges with nodes that should merge
        // Edge 1: (0,0) to (1000,0)
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        // Edge 2: (1000.3,0) to (2000,0) - start is within 0.5mm of edge1's end
        graph.add_edge([1000.3, 0.0], [2000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        // Before explicit merge, nodes may already be merged due to find_or_create_node
        assert_eq!(graph.node_count(), 3);

        // Add more nodes that need merging
        graph.add_edge([2000.2, 0.0], [3000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        // Should have 4 nodes (start, 2 middles that merged, end)
        assert_eq!(graph.node_count(), 4);
    }

    #[test]
    fn edge_positions() {
        let mut graph = TopologyGraph::new();
        let edge_id = graph
            .add_edge(
                [100.0, 200.0],
                [300.0, 400.0],
                EdgeData::wall(200.0, 2700.0),
            )
            .unwrap();

        let (start, end) = graph.edge_positions(edge_id).unwrap();
        assert_eq!(start, [100.0, 200.0]);
        assert_eq!(end, [300.0, 400.0]);
    }

    #[test]
    fn edges_at_node() {
        let mut graph = TopologyGraph::new();

        // Create L-shape
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge(
            [1000.0, 0.0],
            [1000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );

        // Find the corner node
        let corner_nodes = graph.nodes_within([1000.0, 0.0], 1.0);
        assert_eq!(corner_nodes.len(), 1);

        let edges = graph.edges_at_node(corner_nodes[0]);
        assert_eq!(edges.len(), 2);
    }

    #[test]
    fn clear_graph() {
        let mut graph = TopologyGraph::new();
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));

        assert!(graph.node_count() > 0);
        assert!(graph.edge_count() > 0);

        graph.clear();

        assert_eq!(graph.node_count(), 0);
        assert_eq!(graph.edge_count(), 0);
    }
}
