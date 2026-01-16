//! Spatial indexing for geometry elements.
//!
//! Uses R*-tree (rstar) for efficient spatial queries:
//! - Find nodes within radius
//! - Find edges intersecting a bounding box
//! - Nearest neighbor queries
//! - Clash detection between elements
//!
//! # Example
//!
//! ```ignore
//! use pensaer_geometry::spatial::{NodeIndex, EdgeIndex};
//!
//! let mut nodes = NodeIndex::new();
//! nodes.insert("n1", [0.0, 0.0]);
//! nodes.insert("n2", [1000.0, 0.0]);
//!
//! // Find nodes within 10mm of a point
//! let nearby = nodes.within_radius([500.0, 0.0], 10.0);
//! ```

mod clash;
mod edge_index;
mod node_index;
mod predicates;

pub use clash::{Clash, ClashDetector, ClashElement, ClashFilter, ClashType};
pub use edge_index::{EdgeEntry, EdgeIndex};
pub use node_index::NodeIndex;
pub use predicates::{
    orient2d, orient2d_robust, segment_intersection, segments_intersect, signed_area_2, Orientation,
};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn node_index_insert_and_query() {
        let mut index = NodeIndex::new();
        index.insert("n1".to_string(), [0.0, 0.0]);
        index.insert("n2".to_string(), [1000.0, 0.0]);
        index.insert("n3".to_string(), [500.0, 500.0]);

        // Query within radius
        let nearby = index.within_radius([0.0, 0.0], 100.0);
        assert_eq!(nearby.len(), 1);
        assert_eq!(nearby[0].0, "n1");

        // Query bounding box
        let in_box = index.in_envelope([0.0, 0.0], [600.0, 600.0]);
        assert_eq!(in_box.len(), 2); // n1 and n3
    }

    #[test]
    fn edge_index_insert_and_query() {
        let mut index = EdgeIndex::new();
        // Horizontal edge (matching working test pattern)
        index.insert("e1".to_string(), [0.0, 0.0], [100.0, 0.0]);
        index.insert("e2".to_string(), [200.0, 0.0], [300.0, 0.0]);

        // Verify insertion worked
        assert_eq!(index.len(), 2);

        // Query should find e1 only (using working test pattern)
        let edges = index.in_envelope([-10.0, -10.0], [110.0, 10.0]);
        assert_eq!(edges.len(), 1);
        assert_eq!(edges[0].id, "e1");
    }

    #[test]
    fn orient2d_works() {
        // Counter-clockwise
        assert_eq!(
            orient2d([0.0, 0.0], [1.0, 0.0], [0.5, 1.0]),
            Orientation::CounterClockwise
        );
        // Clockwise
        assert_eq!(
            orient2d([0.0, 0.0], [1.0, 0.0], [0.5, -1.0]),
            Orientation::Clockwise
        );
        // Collinear
        assert_eq!(
            orient2d([0.0, 0.0], [1.0, 0.0], [2.0, 0.0]),
            Orientation::Collinear
        );
    }
}
