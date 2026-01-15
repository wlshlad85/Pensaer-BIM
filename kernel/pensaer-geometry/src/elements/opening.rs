//! Door and window elements for BIM modeling.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use pensaer_math::{BoundingBox3, Point3};

use crate::element::{Element, ElementMetadata, ElementType};
use crate::error::{GeometryError, GeometryResult};
use crate::mesh::TriangleMesh;

/// Door swing direction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub enum DoorSwing {
    /// Swings left when viewed from outside.
    #[default]
    Left,
    /// Swings right when viewed from outside.
    Right,
    /// Double door, swings both ways.
    Both,
    /// Sliding door, no swing.
    None,
}

/// Type of door.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub enum DoorType {
    /// Single hinged door.
    #[default]
    Single,
    /// Double hinged door.
    Double,
    /// Sliding door.
    Sliding,
    /// Folding/bi-fold door.
    Folding,
    /// Revolving door.
    Revolving,
    /// Pocket door (slides into wall).
    Pocket,
}

/// A door element hosted in a wall.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Door {
    /// Unique identifier.
    pub id: Uuid,
    /// ID of the host wall.
    pub host_wall_id: Uuid,
    /// Width of the door.
    pub width: f64,
    /// Height of the door.
    pub height: f64,
    /// Door type.
    pub door_type: DoorType,
    /// Door swing direction.
    pub swing: DoorSwing,
    /// Offset along wall from wall start to door center.
    pub offset_along_wall: f64,
    /// Metadata.
    pub metadata: ElementMetadata,
}

impl Door {
    /// Create a new door.
    pub fn new(
        host_wall_id: Uuid,
        width: f64,
        height: f64,
        offset_along_wall: f64,
    ) -> GeometryResult<Self> {
        if width <= 0.0 {
            return Err(GeometryError::NonPositiveThickness);
        }
        if height <= 0.0 {
            return Err(GeometryError::NonPositiveHeight);
        }

        Ok(Self {
            id: Uuid::new_v4(),
            host_wall_id,
            width,
            height,
            door_type: DoorType::default(),
            swing: DoorSwing::default(),
            offset_along_wall,
            metadata: ElementMetadata::new(),
        })
    }

    /// Set door type.
    pub fn set_type(&mut self, door_type: DoorType) {
        self.door_type = door_type;
    }

    /// Set door swing.
    pub fn set_swing(&mut self, swing: DoorSwing) {
        self.swing = swing;
    }
}

impl Element for Door {
    fn id(&self) -> Uuid {
        self.id
    }

    fn element_type(&self) -> ElementType {
        ElementType::Door
    }

    fn bounding_box(&self) -> GeometryResult<BoundingBox3> {
        // Door bounding box depends on host wall position
        // This is a placeholder - actual position comes from wall
        Ok(BoundingBox3::new(
            Point3::new(0.0, 0.0, 0.0),
            Point3::new(self.width, 0.1, self.height),
        ))
    }

    fn to_mesh(&self) -> GeometryResult<TriangleMesh> {
        // Simple rectangular door panel mesh
        let half_width = self.width / 2.0;
        let thickness = 0.05; // Door panel thickness

        let vertices = vec![
            Point3::new(-half_width, 0.0, 0.0),
            Point3::new(half_width, 0.0, 0.0),
            Point3::new(half_width, 0.0, self.height),
            Point3::new(-half_width, 0.0, self.height),
            Point3::new(-half_width, thickness, 0.0),
            Point3::new(half_width, thickness, 0.0),
            Point3::new(half_width, thickness, self.height),
            Point3::new(-half_width, thickness, self.height),
        ];

        let indices = vec![
            // Front
            [0, 1, 2],
            [0, 2, 3],
            // Back
            [5, 4, 7],
            [5, 7, 6],
            // Top
            [3, 2, 6],
            [3, 6, 7],
            // Bottom
            [0, 5, 1],
            [0, 4, 5],
            // Left
            [0, 3, 7],
            [0, 7, 4],
            // Right
            [1, 5, 6],
            [1, 6, 2],
        ];

        Ok(TriangleMesh::from_vertices_indices(vertices, indices))
    }
}

/// Type of window.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub enum WindowType {
    /// Fixed window (doesn't open).
    #[default]
    Fixed,
    /// Casement window (hinged on side).
    Casement,
    /// Double-hung window (slides vertically).
    DoubleHung,
    /// Sliding window (slides horizontally).
    Sliding,
    /// Awning window (hinged at top).
    Awning,
    /// Hopper window (hinged at bottom).
    Hopper,
    /// Pivot window (pivots on center axis).
    Pivot,
}

/// A window element hosted in a wall.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Window {
    /// Unique identifier.
    pub id: Uuid,
    /// ID of the host wall.
    pub host_wall_id: Uuid,
    /// Width of the window.
    pub width: f64,
    /// Height of the window.
    pub height: f64,
    /// Sill height (distance from floor to window bottom).
    pub sill_height: f64,
    /// Window type.
    pub window_type: WindowType,
    /// Offset along wall from wall start to window center.
    pub offset_along_wall: f64,
    /// Metadata.
    pub metadata: ElementMetadata,
}

impl Window {
    /// Create a new window.
    pub fn new(
        host_wall_id: Uuid,
        width: f64,
        height: f64,
        sill_height: f64,
        offset_along_wall: f64,
    ) -> GeometryResult<Self> {
        if width <= 0.0 {
            return Err(GeometryError::NonPositiveThickness);
        }
        if height <= 0.0 {
            return Err(GeometryError::NonPositiveHeight);
        }

        Ok(Self {
            id: Uuid::new_v4(),
            host_wall_id,
            width,
            height,
            sill_height,
            window_type: WindowType::default(),
            offset_along_wall,
            metadata: ElementMetadata::new(),
        })
    }

    /// Set window type.
    pub fn set_type(&mut self, window_type: WindowType) {
        self.window_type = window_type;
    }

    /// Head height (top of window from floor).
    pub fn head_height(&self) -> f64 {
        self.sill_height + self.height
    }
}

impl Element for Window {
    fn id(&self) -> Uuid {
        self.id
    }

    fn element_type(&self) -> ElementType {
        ElementType::Window
    }

    fn bounding_box(&self) -> GeometryResult<BoundingBox3> {
        // Window bounding box depends on host wall position
        // This is a placeholder - actual position comes from wall
        Ok(BoundingBox3::new(
            Point3::new(0.0, 0.0, self.sill_height),
            Point3::new(self.width, 0.1, self.head_height()),
        ))
    }

    fn to_mesh(&self) -> GeometryResult<TriangleMesh> {
        // Simple window frame mesh (rectangular with glass)
        let half_width = self.width / 2.0;
        let frame_depth = 0.1;
        let z0 = self.sill_height;
        let z1 = self.head_height();

        // Simple frame (4 vertices per face, front and back)
        let vertices = vec![
            // Front face
            Point3::new(-half_width, 0.0, z0),
            Point3::new(half_width, 0.0, z0),
            Point3::new(half_width, 0.0, z1),
            Point3::new(-half_width, 0.0, z1),
            // Back face
            Point3::new(-half_width, frame_depth, z0),
            Point3::new(half_width, frame_depth, z0),
            Point3::new(half_width, frame_depth, z1),
            Point3::new(-half_width, frame_depth, z1),
        ];

        let indices = vec![
            // Front
            [0, 1, 2],
            [0, 2, 3],
            // Back
            [5, 4, 7],
            [5, 7, 6],
            // Top
            [3, 2, 6],
            [3, 6, 7],
            // Bottom
            [0, 5, 1],
            [0, 4, 5],
            // Left
            [0, 3, 7],
            [0, 7, 4],
            // Right
            [1, 5, 6],
            [1, 6, 2],
        ];

        Ok(TriangleMesh::from_vertices_indices(vertices, indices))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn door_creation() {
        let wall_id = Uuid::new_v4();
        let door = Door::new(wall_id, 0.9, 2.1, 2.0).unwrap();

        assert!((door.width - 0.9).abs() < 1e-10);
        assert!((door.height - 2.1).abs() < 1e-10);
        assert_eq!(door.host_wall_id, wall_id);
    }

    #[test]
    fn door_element_trait() {
        let wall_id = Uuid::new_v4();
        let door = Door::new(wall_id, 0.9, 2.1, 2.0).unwrap();

        assert_eq!(door.element_type(), ElementType::Door);
        assert!(!door.id().is_nil());
    }

    #[test]
    fn door_mesh_valid() {
        let wall_id = Uuid::new_v4();
        let door = Door::new(wall_id, 0.9, 2.1, 2.0).unwrap();
        let mesh = door.to_mesh().unwrap();

        assert!(mesh.is_valid());
    }

    #[test]
    fn window_creation() {
        let wall_id = Uuid::new_v4();
        let window = Window::new(wall_id, 1.2, 1.5, 0.9, 3.0).unwrap();

        assert!((window.width - 1.2).abs() < 1e-10);
        assert!((window.height - 1.5).abs() < 1e-10);
        assert!((window.sill_height - 0.9).abs() < 1e-10);
        assert!((window.head_height() - 2.4).abs() < 1e-10);
    }

    #[test]
    fn window_element_trait() {
        let wall_id = Uuid::new_v4();
        let window = Window::new(wall_id, 1.2, 1.5, 0.9, 3.0).unwrap();

        assert_eq!(window.element_type(), ElementType::Window);
        assert!(!window.id().is_nil());
    }

    #[test]
    fn window_mesh_valid() {
        let wall_id = Uuid::new_v4();
        let window = Window::new(wall_id, 1.2, 1.5, 0.9, 3.0).unwrap();
        let mesh = window.to_mesh().unwrap();

        assert!(mesh.is_valid());
    }
}
