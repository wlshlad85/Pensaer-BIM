//! Pensaer Geometry Kernel
//!
//! This crate provides the core geometry operations for the Pensaer BIM platform:
//!
//! - **Elements**: Parametric BIM elements (walls, floors, doors, windows, rooms)
//! - **Meshing**: Triangle mesh generation for 3D visualization
//! - **Element System**: Common traits and types for all BIM elements
//! - **PyO3 Bindings**: Python integration for MCP tool servers (enable with `python` feature)
//!
//! # Example
//!
//! ```rust
//! use pensaer_geometry::elements::{Wall, Floor, Room};
//! use pensaer_geometry::element::Element;
//! use pensaer_math::Point2;
//!
//! // Create a wall
//! let wall = Wall::new(
//!     Point2::new(0.0, 0.0),
//!     Point2::new(5.0, 0.0),
//!     3.0,  // height
//!     0.2,  // thickness
//! ).unwrap();
//!
//! // Generate mesh for visualization
//! let mesh = wall.to_mesh().unwrap();
//! assert!(mesh.is_valid());
//! ```
//!
//! # Python Usage
//!
//! Build with the `python` feature to enable PyO3 bindings:
//!
//! ```bash
//! cd kernel/pensaer-geometry
//! maturin develop --features python
//! ```
//!
//! Then in Python:
//!
//! ```python
//! import pensaer_geometry as pg
//!
//! # Create a wall
//! wall = pg.create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
//! print(wall.length())  # 5.0
//!
//! # Add a door
//! result = pg.place_door(wall, offset=2.5, width=0.9, height=2.1)
//! door = result['door']
//!
//! # Generate mesh for 3D visualization
//! mesh = wall.to_mesh()
//! obj_string = mesh.to_obj()  # Export to OBJ format
//! ```
//!
//! # Performance Targets
//!
//! | Operation | Target |
//! |-----------|--------|
//! | Wall creation | < 1ms |
//! | Wall mesh (no openings) | < 5ms |
//! | Wall mesh (3 openings) | < 10ms |
//! | Room detection (20 walls) | < 50ms |
//! | Join detection (10 walls) | < 10ms |

pub mod element;
pub mod elements;
pub mod error;
pub mod joins;
pub mod mesh;

// M0: Ground truth & guardrails
pub mod constants;
pub mod exec;
pub mod fixup;
pub mod io;
pub mod util;

// M1: Spatial indexing
pub mod spatial;

// PyO3 Python bindings (enabled with "python" feature)
#[cfg(feature = "python")]
pub mod bindings;

// Re-export main types at crate root for convenience
pub use element::{Element, ElementMetadata, ElementType};
pub use elements::{
    Door, DoorSwing, DoorType, Floor, FloorType, OpeningType, RidgeDirection, Roof, RoofType, Room,
    Wall, WallBaseline, WallOpening, WallType, Window, WindowType,
};
pub use error::{GeometryError, GeometryResult};
pub use joins::{
    JoinDetector, JoinGeometry, JoinResolver, JoinType, WallEnd, WallJoin, WallJoinProfile,
};
pub use mesh::{
    extrude_polygon, extrude_polygon_with_hole, extrude_wall_with_openings, triangulate_polygon,
    triangulate_polygon_with_holes, TriangleMesh,
};

// M0 re-exports
pub use constants::{
    quantize, quantize_point2, quantize_point3, EPSILON, GEOM_TOL, QUANTIZE_PRECISION,
    SNAP_MERGE_TOL, UI_SNAP_DIST,
};
pub use exec::{exec_and_heal, Context, ExecResult};
pub use io::{prepare_input, prepare_output, to_deterministic_json, to_deterministic_json_compact};
pub use spatial::{orient2d, orient2d_robust, EdgeEntry, EdgeIndex, NodeIndex, Orientation};

#[cfg(test)]
mod tests {
    use super::*;
    use pensaer_math::Point2;

    #[test]
    fn wall_mesh_bbox_matches_dimensions() {
        let wall = Wall::new(Point2::new(0.0, 0.0), Point2::new(4.0, 0.0), 3.0, 0.2).unwrap();

        let mesh = wall.to_mesh().unwrap();
        let bbox = mesh.bounding_box().unwrap();

        assert!((bbox.min.x - 0.0).abs() < 1e-10);
        assert!((bbox.min.y - (-0.1)).abs() < 1e-10);
        assert!((bbox.min.z - 0.0).abs() < 1e-10);
        assert!((bbox.max.x - 4.0).abs() < 1e-10);
        assert!((bbox.max.y - 0.1).abs() < 1e-10);
        assert!((bbox.max.z - 3.0).abs() < 1e-10);
        assert!(mesh.is_valid());
    }

    #[test]
    fn floor_mesh_rejects_invalid_bounds() {
        let floor = Floor::rectangle(Point2::new(1.0, 1.0), Point2::new(1.0, 2.0), 0.3);

        assert!(matches!(floor, Err(GeometryError::InvalidFloorBounds)));
    }

    #[test]
    fn create_simple_building() {
        // Create 4 walls forming a rectangle
        let wall1 = Wall::new(Point2::new(0.0, 0.0), Point2::new(10.0, 0.0), 3.0, 0.2).unwrap();
        let wall2 = Wall::new(Point2::new(10.0, 0.0), Point2::new(10.0, 8.0), 3.0, 0.2).unwrap();
        let wall3 = Wall::new(Point2::new(10.0, 8.0), Point2::new(0.0, 8.0), 3.0, 0.2).unwrap();
        let wall4 = Wall::new(Point2::new(0.0, 8.0), Point2::new(0.0, 0.0), 3.0, 0.2).unwrap();

        // Create a floor
        let floor = Floor::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 8.0), 0.3).unwrap();

        // Create a room
        let room = Room::rectangle(
            "Living Room",
            "101",
            Point2::new(0.0, 0.0),
            Point2::new(10.0, 8.0),
            3.0,
        )
        .unwrap();

        // Verify all meshes are valid
        assert!(wall1.to_mesh().unwrap().is_valid());
        assert!(wall2.to_mesh().unwrap().is_valid());
        assert!(wall3.to_mesh().unwrap().is_valid());
        assert!(wall4.to_mesh().unwrap().is_valid());
        assert!(floor.to_mesh().unwrap().is_valid());
        assert!(room.to_mesh().unwrap().is_valid());

        // Verify room calculations
        assert!((room.area() - 80.0).abs() < 1e-10);
        assert!((room.volume() - 240.0).abs() < 1e-10);
    }

    #[test]
    fn wall_with_opening() {
        let mut wall = Wall::new(Point2::new(0.0, 0.0), Point2::new(5.0, 0.0), 3.0, 0.2).unwrap();

        // Add a door opening
        let opening = WallOpening::new(2.5, 0.0, 0.9, 2.1, OpeningType::Door);
        assert!(wall.add_opening(opening).is_ok());
        assert_eq!(wall.openings.len(), 1);

        // Create a door element
        let door = Door::new(wall.id, 0.9, 2.1, 2.5).unwrap();
        assert_eq!(door.host_wall_id, wall.id);
    }

    #[test]
    fn element_types() {
        let wall = Wall::new(Point2::new(0.0, 0.0), Point2::new(5.0, 0.0), 3.0, 0.2).unwrap();
        let floor = Floor::rectangle(Point2::new(0.0, 0.0), Point2::new(10.0, 10.0), 0.3).unwrap();

        assert_eq!(wall.element_type(), ElementType::Wall);
        assert_eq!(floor.element_type(), ElementType::Floor);
    }

    #[test]
    fn wall_joins_detection() {
        // Create L-shaped corner
        let wall1 = Wall::new(Point2::new(0.0, 0.0), Point2::new(5.0, 0.0), 3.0, 0.2).unwrap();

        let wall2 = Wall::new(Point2::new(5.0, 0.0), Point2::new(5.0, 4.0), 3.0, 0.2).unwrap();

        let resolver = JoinResolver::new(0.001);
        let joins = resolver.detect_joins(&[&wall1, &wall2]);

        assert_eq!(joins.len(), 1);
        assert!(matches!(
            joins[0].join_type,
            JoinType::LJoin | JoinType::Miter
        ));

        // Compute join geometry
        let geometry = resolver
            .compute_join_geometry(&[&wall1, &wall2], &joins[0])
            .unwrap();
        assert_eq!(geometry.wall_profiles.len(), 2);
    }

    #[test]
    fn rectangular_building_joins() {
        // Create 4 walls forming a rectangle
        let wall1 = Wall::new(Point2::new(0.0, 0.0), Point2::new(10.0, 0.0), 3.0, 0.2).unwrap();
        let wall2 = Wall::new(Point2::new(10.0, 0.0), Point2::new(10.0, 8.0), 3.0, 0.2).unwrap();
        let wall3 = Wall::new(Point2::new(10.0, 8.0), Point2::new(0.0, 8.0), 3.0, 0.2).unwrap();
        let wall4 = Wall::new(Point2::new(0.0, 8.0), Point2::new(0.0, 0.0), 3.0, 0.2).unwrap();

        let resolver = JoinResolver::new(0.001);
        let joins = resolver.detect_joins(&[&wall1, &wall2, &wall3, &wall4]);

        // Should detect 4 L-joins at corners
        assert_eq!(joins.len(), 4);
        for join in &joins {
            assert_eq!(join.join_type, JoinType::LJoin);
        }
    }
}
