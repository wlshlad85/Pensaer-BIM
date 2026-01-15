//! Element trait and common types for BIM elements.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use pensaer_math::BoundingBox3;

use crate::error::GeometryResult;
use crate::mesh::TriangleMesh;

/// Type of BIM element.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ElementType {
    Wall,
    Floor,
    Ceiling,
    Roof,
    Column,
    Beam,
    Door,
    Window,
    Opening,
    Room,
    Stair,
    Railing,
    Furniture,
    Generic,
}

impl ElementType {
    /// Get a human-readable name for the element type.
    pub fn name(&self) -> &'static str {
        match self {
            ElementType::Wall => "Wall",
            ElementType::Floor => "Floor",
            ElementType::Ceiling => "Ceiling",
            ElementType::Roof => "Roof",
            ElementType::Column => "Column",
            ElementType::Beam => "Beam",
            ElementType::Door => "Door",
            ElementType::Window => "Window",
            ElementType::Opening => "Opening",
            ElementType::Room => "Room",
            ElementType::Stair => "Stair",
            ElementType::Railing => "Railing",
            ElementType::Furniture => "Furniture",
            ElementType::Generic => "Generic",
        }
    }
}

/// Common trait for all BIM elements.
///
/// All geometry elements in Pensaer implement this trait, providing:
/// - Unique identification via UUID
/// - Type classification
/// - Spatial bounds for queries
/// - Mesh generation for visualization
pub trait Element: Send + Sync {
    /// Get the unique identifier for this element.
    fn id(&self) -> Uuid;

    /// Get the type of this element.
    fn element_type(&self) -> ElementType;

    /// Compute the axis-aligned bounding box.
    fn bounding_box(&self) -> GeometryResult<BoundingBox3>;

    /// Generate a triangle mesh for visualization.
    fn to_mesh(&self) -> GeometryResult<TriangleMesh>;
}

/// Metadata common to all elements.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ElementMetadata {
    /// Element name (user-defined).
    pub name: Option<String>,

    /// Element description.
    pub description: Option<String>,

    /// Associated level/story ID.
    pub level_id: Option<Uuid>,

    /// Custom properties.
    pub properties: std::collections::HashMap<String, String>,
}

impl ElementMetadata {
    /// Create new empty metadata.
    pub fn new() -> Self {
        Self::default()
    }

    /// Create metadata with a name.
    pub fn with_name(name: impl Into<String>) -> Self {
        Self {
            name: Some(name.into()),
            ..Default::default()
        }
    }

    /// Set the level ID.
    pub fn set_level(&mut self, level_id: Uuid) {
        self.level_id = Some(level_id);
    }

    /// Add a custom property.
    pub fn set_property(&mut self, key: impl Into<String>, value: impl Into<String>) {
        self.properties.insert(key.into(), value.into());
    }

    /// Get a custom property.
    pub fn get_property(&self, key: &str) -> Option<&String> {
        self.properties.get(key)
    }
}
