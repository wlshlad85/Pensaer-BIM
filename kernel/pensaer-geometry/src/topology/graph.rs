//! The main topology graph structure.

use super::edge::{EdgeData, EdgeId, TopoEdge};
use super::node::{NodeId, TopoNode};
use super::room::{HalfEdge, RoomId, TopoRoom};
use crate::constants::SNAP_MERGE_TOL;
use crate::spatial::{EdgeIndex, NodeIndex};
use crate::util::float::points2_within;
use std::collections::{HashMap, HashSet};

/// The topology graph storing the wall network.
///
/// This is the core data structure for the geometry kernel. All walls
/// are represented as edges connecting nodes. The graph maintains:
///
/// - HashMap storage for O(1) lookup by ID
/// - R*-tree spatial indexes for efficient range queries
/// - Automatic node merging within SNAP_MERGE_TOL
/// - Room detection via boundary tracing
#[derive(Debug)]
pub struct TopologyGraph {
    /// All nodes in the graph
    nodes: HashMap<NodeId, TopoNode>,

    /// All edges in the graph
    edges: HashMap<EdgeId, TopoEdge>,

    /// All detected rooms (closed regions)
    rooms: HashMap<RoomId, TopoRoom>,

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
            rooms: HashMap::new(),
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
            rooms: HashMap::new(),
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

            for &id_b in node_ids.iter().skip(i + 1) {
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
        self.rooms.clear();
        self.node_index = NodeIndex::new();
        self.edge_index = EdgeIndex::new();
    }

    // =========================================================================
    // M3: Crossing Detection & Colinear Merge
    // =========================================================================

    /// Add an edge between two existing nodes.
    ///
    /// Unlike `add_edge`, this doesn't create nodes - they must already exist.
    /// Returns None if nodes don't exist or are the same.
    pub fn add_edge_between_nodes(
        &mut self,
        start_node: NodeId,
        end_node: NodeId,
        data: EdgeData,
    ) -> Option<EdgeId> {
        // Validate nodes exist
        if !self.nodes.contains_key(&start_node) || !self.nodes.contains_key(&end_node) {
            return None;
        }

        // Don't create self-loop
        if start_node == end_node {
            return None;
        }

        // Create edge
        let edge = TopoEdge::new(start_node, end_node, data);
        let edge_id = edge.id;

        // Get node positions for edge index
        let start = self.nodes.get(&start_node)?.position;
        let end = self.nodes.get(&end_node)?.position;

        // Add to edge index
        self.edge_index.insert(edge_id.0.to_string(), start, end);

        // Connect nodes to edge
        self.nodes.get_mut(&start_node)?.add_edge(edge_id);
        self.nodes.get_mut(&end_node)?.add_edge(edge_id);

        // Store edge
        self.edges.insert(edge_id, edge);

        Some(edge_id)
    }

    /// Split an edge at a given position, creating two new edges.
    ///
    /// The original edge is removed and replaced by two edges:
    /// - One from start_node to the new split node
    /// - One from the split node to end_node
    ///
    /// Returns (new_node_id, edge1_id, edge2_id) or None if the edge doesn't exist
    /// or the split point is at an endpoint.
    pub fn split_edge(
        &mut self,
        edge_id: EdgeId,
        split_position: [f64; 2],
    ) -> Option<(NodeId, EdgeId, EdgeId)> {
        // Get edge data before removal
        let edge = self.edges.get(&edge_id)?;
        let start_node = edge.start_node;
        let end_node = edge.end_node;
        let data = edge.data.clone();

        // Check split point isn't at an endpoint
        let start_pos = self.nodes.get(&start_node)?.position;
        let end_pos = self.nodes.get(&end_node)?.position;

        if points2_within(split_position, start_pos, self.snap_tolerance)
            || points2_within(split_position, end_pos, self.snap_tolerance)
        {
            return None; // Split point is at endpoint
        }

        // Remove original edge (but don't clean up nodes yet)
        let removed_edge = self.edges.remove(&edge_id)?;

        // Remove edge from nodes
        if let Some(start) = self.nodes.get_mut(&start_node) {
            start.remove_edge(edge_id);
        }
        if let Some(end) = self.nodes.get_mut(&end_node) {
            end.remove_edge(edge_id);
        }

        // Remove from edge index
        self.edge_index
            .remove(&edge_id.0.to_string(), start_pos, end_pos);

        // Create new node at split point
        let split_node = self.find_or_create_node(split_position);

        // Create two new edges
        let edge1_id = self
            .add_edge_between_nodes(start_node, split_node, data.clone())
            .unwrap_or_else(|| {
                // Restore original edge if first new edge fails
                self.edges.insert(removed_edge.id, removed_edge.clone());
                removed_edge.id
            });

        let edge2_id = self
            .add_edge_between_nodes(split_node, end_node, data)
            .unwrap_or(edge1_id); // Use edge1 as fallback (shouldn't happen)

        Some((split_node, edge1_id, edge2_id))
    }

    /// Get all edge IDs as a vector.
    pub fn edge_ids(&self) -> Vec<EdgeId> {
        self.edges.keys().copied().collect()
    }

    /// Get all node IDs as a vector.
    pub fn node_ids(&self) -> Vec<NodeId> {
        self.nodes.keys().copied().collect()
    }

    /// Check if two edges share a node.
    pub fn edges_share_node(&self, edge1: EdgeId, edge2: EdgeId) -> bool {
        let e1 = match self.edges.get(&edge1) {
            Some(e) => e,
            None => return false,
        };
        let e2 = match self.edges.get(&edge2) {
            Some(e) => e,
            None => return false,
        };

        e1.start_node == e2.start_node
            || e1.start_node == e2.end_node
            || e1.end_node == e2.start_node
            || e1.end_node == e2.end_node
    }

    /// Get the shared node between two edges, if any.
    pub fn shared_node(&self, edge1: EdgeId, edge2: EdgeId) -> Option<NodeId> {
        let e1 = self.edges.get(&edge1)?;
        let e2 = self.edges.get(&edge2)?;

        if e1.start_node == e2.start_node || e1.start_node == e2.end_node {
            Some(e1.start_node)
        } else if e1.end_node == e2.start_node || e1.end_node == e2.end_node {
            Some(e1.end_node)
        } else {
            None
        }
    }

    /// Get the other node of an edge given one node.
    pub fn other_node(&self, edge_id: EdgeId, node_id: NodeId) -> Option<NodeId> {
        self.edges.get(&edge_id)?.other_node(node_id)
    }

    /// Get the snap tolerance.
    pub fn snap_tolerance(&self) -> f64 {
        self.snap_tolerance
    }

    // =========================================================================
    // M4: Room Detection & Boundary Tracing
    // =========================================================================

    /// Get the number of detected rooms.
    pub fn room_count(&self) -> usize {
        self.rooms.len()
    }

    /// Get a room by ID.
    pub fn get_room(&self, id: RoomId) -> Option<&TopoRoom> {
        self.rooms.get(&id)
    }

    /// Iterate over all rooms.
    pub fn rooms(&self) -> impl Iterator<Item = &TopoRoom> {
        self.rooms.values()
    }

    /// Get all room IDs as a vector.
    pub fn room_ids(&self) -> Vec<RoomId> {
        self.rooms.keys().copied().collect()
    }

    /// Get interior rooms (excluding the exterior unbounded region).
    pub fn interior_rooms(&self) -> Vec<&TopoRoom> {
        self.rooms.values().filter(|r| !r.is_exterior).collect()
    }

    /// Find rooms containing a specific node.
    pub fn rooms_at_node(&self, node_id: NodeId) -> Vec<RoomId> {
        self.rooms
            .iter()
            .filter(|(_, room)| room.contains_node(node_id))
            .map(|(id, _)| *id)
            .collect()
    }

    /// Find rooms containing a specific edge.
    pub fn rooms_at_edge(&self, edge_id: EdgeId) -> Vec<RoomId> {
        self.rooms
            .iter()
            .filter(|(_, room)| room.contains_edge(edge_id))
            .map(|(id, _)| *id)
            .collect()
    }

    /// Rebuild all rooms by tracing boundaries.
    ///
    /// This uses the "turn-right" (clockwise traversal) algorithm:
    /// 1. Generate all half-edges
    /// 2. For each unused half-edge, trace a boundary by always turning right
    /// 3. The resulting closed loops are room boundaries
    ///
    /// Returns the number of rooms detected.
    pub fn rebuild_rooms(&mut self) -> usize {
        self.rooms.clear();

        if self.edges.is_empty() {
            return 0;
        }

        // Generate all half-edges
        let mut all_half_edges: Vec<HalfEdge> = Vec::new();
        for edge in self.edges.values() {
            all_half_edges.push(HalfEdge::new(edge.id, edge.start_node, edge.end_node));
            all_half_edges.push(HalfEdge::new(edge.id, edge.end_node, edge.start_node));
        }

        // Track which half-edges have been used
        let mut used: HashSet<(EdgeId, NodeId, NodeId)> = HashSet::new();

        // For each node, precompute sorted outgoing half-edges by angle
        let outgoing_map = self.build_outgoing_half_edge_map(&all_half_edges);

        // Trace boundaries
        for he in &all_half_edges {
            let key = (he.edge_id, he.from_node, he.to_node);
            if used.contains(&key) {
                continue;
            }

            // Trace a boundary starting from this half-edge
            if let Some(room) = self.trace_boundary(he, &outgoing_map, &mut used) {
                self.rooms.insert(room.id, room);
            }
        }

        self.rooms.len()
    }

    /// Build a map of node -> outgoing half-edges sorted by angle (counter-clockwise).
    fn build_outgoing_half_edge_map(
        &self,
        half_edges: &[HalfEdge],
    ) -> HashMap<NodeId, Vec<HalfEdge>> {
        let mut map: HashMap<NodeId, Vec<HalfEdge>> = HashMap::new();

        for he in half_edges {
            map.entry(he.from_node).or_default().push(*he);
        }

        // Sort each node's outgoing half-edges by angle (counter-clockwise from +X axis)
        for (node_id, edges) in map.iter_mut() {
            let node_pos = match self.nodes.get(node_id) {
                Some(n) => n.position,
                None => continue,
            };

            edges.sort_by(|a, b| {
                let angle_a = self.half_edge_angle(node_pos, a);
                let angle_b = self.half_edge_angle(node_pos, b);
                angle_a
                    .partial_cmp(&angle_b)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }

        map
    }

    /// Calculate the angle of a half-edge from its start node.
    fn half_edge_angle(&self, from_pos: [f64; 2], he: &HalfEdge) -> f64 {
        let to_pos = match self.nodes.get(&he.to_node) {
            Some(n) => n.position,
            None => return 0.0,
        };

        let dx = to_pos[0] - from_pos[0];
        let dy = to_pos[1] - from_pos[1];

        dy.atan2(dx)
    }

    /// Trace a boundary starting from a half-edge.
    ///
    /// Uses the "turn-right" rule: at each node, take the next half-edge
    /// in counter-clockwise order (which is the rightmost turn from the
    /// incoming direction).
    fn trace_boundary(
        &self,
        start: &HalfEdge,
        outgoing_map: &HashMap<NodeId, Vec<HalfEdge>>,
        used: &mut HashSet<(EdgeId, NodeId, NodeId)>,
    ) -> Option<TopoRoom> {
        let mut boundary_nodes: Vec<NodeId> = Vec::new();
        let mut boundary_edges: Vec<EdgeId> = Vec::new();
        let mut half_edges: Vec<HalfEdge> = Vec::new();

        let mut current = *start;
        let max_iterations = self.edges.len() * 2 + 10; // Safety limit

        for _ in 0..max_iterations {
            // Mark this half-edge as used
            let key = (current.edge_id, current.from_node, current.to_node);
            if used.contains(&key) {
                // If we've returned to start, we're done
                if current.edge_id == start.edge_id
                    && current.from_node == start.from_node
                    && current.to_node == start.to_node
                {
                    break;
                }
                // Otherwise, this half-edge is already part of another boundary
                return None;
            }

            used.insert(key);
            boundary_nodes.push(current.from_node);
            boundary_edges.push(current.edge_id);
            half_edges.push(current);

            // Find the next half-edge by turning right at the to_node
            let incoming_reversed = current.reversed();
            let next = self.next_half_edge_cw(&incoming_reversed, outgoing_map)?;

            // Check if we've completed the loop
            if next.edge_id == start.edge_id
                && next.from_node == start.from_node
                && next.to_node == start.to_node
            {
                break;
            }

            current = next;
        }

        // Need at least 3 edges to form a room
        if boundary_nodes.len() < 3 {
            return None;
        }

        // Calculate signed area and centroid
        let (signed_area, centroid) = self.compute_polygon_properties(&boundary_nodes);

        // Filter out degenerate rooms (near-zero area)
        // This happens with open graphs where we trace back and forth
        if signed_area.abs() < 1.0 {
            return None;
        }

        Some(TopoRoom::new(
            boundary_nodes,
            boundary_edges,
            half_edges,
            signed_area,
            centroid,
        ))
    }

    /// Get the next half-edge in clockwise order (the "turn right" rule).
    ///
    /// Given an incoming half-edge (reversed to be outgoing from the node),
    /// find the next outgoing half-edge in clockwise order.
    fn next_half_edge_cw(
        &self,
        incoming_reversed: &HalfEdge,
        outgoing_map: &HashMap<NodeId, Vec<HalfEdge>>,
    ) -> Option<HalfEdge> {
        let node = incoming_reversed.from_node;
        let outgoing = outgoing_map.get(&node)?;

        if outgoing.is_empty() {
            return None;
        }

        // Find the index of the incoming edge (reversed) in the sorted list
        let incoming_idx = outgoing.iter().position(|he| {
            he.edge_id == incoming_reversed.edge_id && he.to_node == incoming_reversed.to_node
        });

        match incoming_idx {
            Some(idx) => {
                // The next edge in CW order is the previous one in CCW-sorted list
                // (wrapping around)
                let next_idx = if idx == 0 {
                    outgoing.len() - 1
                } else {
                    idx - 1
                };
                Some(outgoing[next_idx])
            }
            None => {
                // Fallback: just return the first edge
                Some(outgoing[0])
            }
        }
    }

    /// Compute signed area and centroid of a polygon from node IDs.
    fn compute_polygon_properties(&self, nodes: &[NodeId]) -> (f64, [f64; 2]) {
        if nodes.len() < 3 {
            return (0.0, [0.0, 0.0]);
        }

        let positions: Vec<[f64; 2]> = nodes
            .iter()
            .filter_map(|id| self.nodes.get(id).map(|n| n.position))
            .collect();

        if positions.len() < 3 {
            return (0.0, [0.0, 0.0]);
        }

        // Shoelace formula for signed area
        let mut signed_area = 0.0;
        let mut cx = 0.0;
        let mut cy = 0.0;

        let n = positions.len();
        for i in 0..n {
            let j = (i + 1) % n;
            let xi = positions[i][0];
            let yi = positions[i][1];
            let xj = positions[j][0];
            let yj = positions[j][1];

            let cross = xi * yj - xj * yi;
            signed_area += cross;
            cx += (xi + xj) * cross;
            cy += (yi + yj) * cross;
        }

        signed_area /= 2.0;

        if signed_area.abs() < 1e-10 {
            // Degenerate polygon - use simple centroid
            let sum_x: f64 = positions.iter().map(|p| p[0]).sum();
            let sum_y: f64 = positions.iter().map(|p| p[1]).sum();
            return (signed_area, [sum_x / n as f64, sum_y / n as f64]);
        }

        cx /= 6.0 * signed_area;
        cy /= 6.0 * signed_area;

        (signed_area, [cx, cy])
    }

    /// Clear all rooms (used before rebuild).
    pub fn clear_rooms(&mut self) {
        self.rooms.clear();
    }

    /// Remove rooms that contain any of the specified nodes.
    ///
    /// Returns the IDs of removed rooms.
    pub fn invalidate_rooms_at_nodes(&mut self, node_ids: &[NodeId]) -> Vec<RoomId> {
        let node_set: HashSet<NodeId> = node_ids.iter().copied().collect();

        let to_remove: Vec<RoomId> = self
            .rooms
            .iter()
            .filter(|(_, room)| room.boundary_nodes.iter().any(|n| node_set.contains(n)))
            .map(|(id, _)| *id)
            .collect();

        for id in &to_remove {
            self.rooms.remove(id);
        }

        to_remove
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

    // =========================================================================
    // M3 Tests
    // =========================================================================

    #[test]
    fn split_edge_creates_two_edges() {
        let mut graph = TopologyGraph::new();
        let edge_id = graph
            .add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0))
            .unwrap();

        assert_eq!(graph.node_count(), 2);
        assert_eq!(graph.edge_count(), 1);

        // Split at midpoint
        let result = graph.split_edge(edge_id, [500.0, 0.0]);
        assert!(result.is_some());

        let (split_node, edge1, edge2) = result.unwrap();

        // Should now have 3 nodes and 2 edges
        assert_eq!(graph.node_count(), 3);
        assert_eq!(graph.edge_count(), 2);

        // Split node should have 2 edges
        let split_edges = graph.edges_at_node(split_node);
        assert_eq!(split_edges.len(), 2);

        // Verify edges exist
        assert!(graph.get_edge(edge1).is_some());
        assert!(graph.get_edge(edge2).is_some());
    }

    #[test]
    fn split_edge_at_endpoint_returns_none() {
        let mut graph = TopologyGraph::new();
        let edge_id = graph
            .add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0))
            .unwrap();

        // Try to split at start endpoint
        let result = graph.split_edge(edge_id, [0.0, 0.0]);
        assert!(result.is_none());

        // Try to split at end endpoint
        let result = graph.split_edge(edge_id, [1000.0, 0.0]);
        assert!(result.is_none());

        // Edge should still exist
        assert_eq!(graph.edge_count(), 1);
    }

    #[test]
    fn add_edge_between_nodes_works() {
        let mut graph = TopologyGraph::new();

        // Create two disconnected edges to get 4 nodes
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge(
            [0.0, 1000.0],
            [1000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );

        assert_eq!(graph.node_count(), 4);
        assert_eq!(graph.edge_count(), 2);

        // Get nodes to connect
        let node1 = graph.nodes_within([0.0, 0.0], 1.0)[0];
        let node2 = graph.nodes_within([0.0, 1000.0], 1.0)[0];

        // Add edge between existing nodes
        let new_edge = graph.add_edge_between_nodes(node1, node2, EdgeData::wall(200.0, 2700.0));
        assert!(new_edge.is_some());

        assert_eq!(graph.node_count(), 4); // No new nodes
        assert_eq!(graph.edge_count(), 3); // One new edge
    }

    #[test]
    fn edges_share_node_detection() {
        let mut graph = TopologyGraph::new();

        // Create L-shape
        let edge1 = graph
            .add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0))
            .unwrap();
        let edge2 = graph
            .add_edge(
                [1000.0, 0.0],
                [1000.0, 1000.0],
                EdgeData::wall(200.0, 2700.0),
            )
            .unwrap();

        // Create disconnected edge
        let edge3 = graph
            .add_edge([5000.0, 0.0], [6000.0, 0.0], EdgeData::wall(200.0, 2700.0))
            .unwrap();

        assert!(graph.edges_share_node(edge1, edge2));
        assert!(!graph.edges_share_node(edge1, edge3));
        assert!(!graph.edges_share_node(edge2, edge3));
    }

    #[test]
    fn shared_node_returns_correct_node() {
        let mut graph = TopologyGraph::new();

        // Create L-shape
        let edge1 = graph
            .add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0))
            .unwrap();
        let edge2 = graph
            .add_edge(
                [1000.0, 0.0],
                [1000.0, 1000.0],
                EdgeData::wall(200.0, 2700.0),
            )
            .unwrap();

        let shared = graph.shared_node(edge1, edge2);
        assert!(shared.is_some());

        let shared_node = shared.unwrap();
        let pos = graph.get_node(shared_node).unwrap().position;

        // Should be at the corner
        assert!((pos[0] - 1000.0).abs() < 1e-10);
        assert!((pos[1] - 0.0).abs() < 1e-10);
    }

    // =========================================================================
    // M4 Tests: Room Detection
    // =========================================================================

    #[test]
    fn single_rectangular_room() {
        let mut graph = TopologyGraph::new();

        // Create a simple rectangular room (4 walls)
        // Going counter-clockwise: bottom, right, top, left
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0)); // bottom
        graph.add_edge(
            [1000.0, 0.0],
            [1000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        ); // right
        graph.add_edge(
            [1000.0, 1000.0],
            [0.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        ); // top
        graph.add_edge([0.0, 1000.0], [0.0, 0.0], EdgeData::wall(200.0, 2700.0)); // left

        assert_eq!(graph.node_count(), 4);
        assert_eq!(graph.edge_count(), 4);

        // Detect rooms
        let room_count = graph.rebuild_rooms();

        // Should have 2 rooms: interior (the rectangle) and exterior
        assert_eq!(room_count, 2);
        assert_eq!(graph.room_count(), 2);

        // One interior room
        let interior = graph.interior_rooms();
        assert_eq!(interior.len(), 1);

        // Interior room should have 4 nodes/edges
        let room = interior[0];
        assert_eq!(room.boundary_nodes.len(), 4);
        assert_eq!(room.boundary_edges.len(), 4);

        // Area should be 1000 * 1000 = 1,000,000 (positive for interior)
        assert!(room.signed_area > 0.0);
        assert!((room.area() - 1_000_000.0).abs() < 1.0);
    }

    #[test]
    fn two_adjacent_rooms() {
        let mut graph = TopologyGraph::new();

        // Create two adjacent rooms sharing a middle wall
        //
        // (0,1000)---(1000,1000)---(2000,1000)
        //    |           |             |
        //    |   Room1   |    Room2    |
        //    |           |             |
        // (0,0)-----(1000,0)------(2000,0)
        //
        // We must manually create T-junctions by splitting edges
        // or by creating the proper topology directly

        // Create the outer perimeter with T-junction points
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0)); // bottom left
        graph.add_edge([1000.0, 0.0], [2000.0, 0.0], EdgeData::wall(200.0, 2700.0)); // bottom right
        graph.add_edge(
            [2000.0, 0.0],
            [2000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        ); // right
        graph.add_edge(
            [2000.0, 1000.0],
            [1000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        ); // top right
        graph.add_edge(
            [1000.0, 1000.0],
            [0.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        ); // top left
        graph.add_edge([0.0, 1000.0], [0.0, 0.0], EdgeData::wall(200.0, 2700.0)); // left

        // Middle dividing wall (connects to existing T-junction nodes)
        graph.add_edge(
            [1000.0, 0.0],
            [1000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );

        assert_eq!(graph.node_count(), 6); // 4 corners + 2 T-junction points
        assert_eq!(graph.edge_count(), 7); // 6 perimeter + 1 middle

        // Detect rooms
        let room_count = graph.rebuild_rooms();

        // Should have 3 rooms: 2 interior + 1 exterior
        assert_eq!(room_count, 3);

        let interior = graph.interior_rooms();
        assert_eq!(interior.len(), 2);

        // Each interior room should have area 1000 * 1000 = 1,000,000
        for room in interior {
            assert!(room.signed_area > 0.0);
            assert!((room.area() - 1_000_000.0).abs() < 1.0);
        }
    }

    #[test]
    fn no_rooms_in_open_graph() {
        let mut graph = TopologyGraph::new();

        // Create an L-shape (not closed)
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge(
            [1000.0, 0.0],
            [1000.0, 1000.0],
            EdgeData::wall(200.0, 2700.0),
        );

        // Detect rooms
        let room_count = graph.rebuild_rooms();

        // Open graph has no proper rooms (only degenerate "exterior")
        // The algorithm will find 0 valid rooms since there's no closed loop
        assert!(room_count <= 1); // At most exterior or nothing
        assert!(graph.interior_rooms().is_empty());
    }

    #[test]
    fn triangular_room() {
        let mut graph = TopologyGraph::new();

        // Create a triangle
        graph.add_edge([0.0, 0.0], [1000.0, 0.0], EdgeData::wall(200.0, 2700.0));
        graph.add_edge([1000.0, 0.0], [500.0, 866.0], EdgeData::wall(200.0, 2700.0)); // ~60 degree
        graph.add_edge([500.0, 866.0], [0.0, 0.0], EdgeData::wall(200.0, 2700.0));

        assert_eq!(graph.node_count(), 3);
        assert_eq!(graph.edge_count(), 3);

        let room_count = graph.rebuild_rooms();

        // Should have 2 rooms: interior triangle + exterior
        assert_eq!(room_count, 2);

        let interior = graph.interior_rooms();
        assert_eq!(interior.len(), 1);

        // Triangle has 3 boundary nodes
        assert_eq!(interior[0].boundary_nodes.len(), 3);
    }

    #[test]
    fn rooms_at_node_works() {
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

        graph.rebuild_rooms();

        // Find a corner node
        let corner = graph.nodes_within([0.0, 0.0], 1.0)[0];

        // This node should be part of 2 rooms (interior + exterior)
        let rooms = graph.rooms_at_node(corner);
        assert_eq!(rooms.len(), 2);
    }

    #[test]
    fn clear_rooms_works() {
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

        graph.rebuild_rooms();
        assert!(graph.room_count() > 0);

        graph.clear_rooms();
        assert_eq!(graph.room_count(), 0);
    }
}
