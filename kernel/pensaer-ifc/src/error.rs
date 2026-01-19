//! Error types for IFC operations.
//!
//! Provides detailed error types with context for self-healing recovery.

use thiserror::Error;

/// Result type for IFC operations.
pub type Result<T> = std::result::Result<T, IfcError>;

/// Errors that can occur during IFC operations.
#[derive(Error, Debug)]
pub enum IfcError {
    /// Failed to parse IFC file
    #[error("IFC parse error: {0}")]
    ParseError(String),

    /// Invalid IFC structure
    #[error("Invalid IFC structure: {0}")]
    InvalidStructure(String),

    /// Unsupported IFC version
    #[error("Unsupported IFC version: {0}")]
    UnsupportedVersion(String),

    /// Element not found in IFC file
    #[error("Element not found: {0}")]
    ElementNotFound(String),

    /// Invalid geometry data
    #[error("Invalid geometry: {0}")]
    InvalidGeometry(String),

    /// File I/O error
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    /// Serialization error
    #[error("Serialization error: {0}")]
    SerializationError(String),

    /// Mapping error between Pensaer and IFC types
    #[error("Type mapping error: {0}")]
    MappingError(String),

    /// UUID parsing error
    #[error("UUID error: {0}")]
    UuidError(#[from] uuid::Error),

    // =========================================================================
    // Self-healing error types with context
    // =========================================================================

    /// Missing required attribute on IFC entity
    #[error("Missing required attribute: entity #{entity_id} ({entity_type}) requires {attribute}")]
    MissingAttribute {
        entity_id: u64,
        entity_type: String,
        attribute: String,
    },

    /// Invalid geometry with entity context
    #[error("Invalid geometry in entity #{entity_id}: {message}")]
    InvalidEntityGeometry {
        entity_id: u64,
        message: String,
    },

    /// Coordinate value out of valid range
    #[error("Coordinate out of range in entity #{entity_id}: {coord} = {value} (valid: {min}..{max})")]
    CoordinateOutOfRange {
        entity_id: u64,
        coord: String,
        value: f64,
        min: f64,
        max: f64,
    },

    /// Degenerate geometry that cannot be repaired
    #[error("Degenerate geometry in entity #{entity_id}: {description}")]
    DegenerateGeometry {
        entity_id: u64,
        description: String,
    },

    /// Type mapping failed with source and target context
    #[error("Type mapping failed: {source_type} -> {target_type} ({reason})")]
    MappingFailed {
        source_type: String,
        target_type: String,
        reason: String,
    },

    /// Entity reference points to non-existent entity
    #[error("Broken reference: entity #{from_id} references non-existent #{to_id}")]
    BrokenReference {
        from_id: u64,
        to_id: u64,
    },

    /// Multiple errors collected during batch operation
    #[error("Multiple errors ({count} total): {first_error}")]
    MultipleErrors {
        count: usize,
        first_error: String,
        all_errors: Vec<String>,
    },
}

impl IfcError {
    /// Check if this error is recoverable (can be skipped during healing import).
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            Self::MissingAttribute { .. }
                | Self::InvalidEntityGeometry { .. }
                | Self::CoordinateOutOfRange { .. }
                | Self::DegenerateGeometry { .. }
                | Self::BrokenReference { .. }
        )
    }

    /// Get the entity ID associated with this error, if any.
    pub fn entity_id(&self) -> Option<u64> {
        match self {
            Self::MissingAttribute { entity_id, .. } => Some(*entity_id),
            Self::InvalidEntityGeometry { entity_id, .. } => Some(*entity_id),
            Self::CoordinateOutOfRange { entity_id, .. } => Some(*entity_id),
            Self::DegenerateGeometry { entity_id, .. } => Some(*entity_id),
            Self::BrokenReference { from_id, .. } => Some(*from_id),
            _ => None,
        }
    }

    /// Create a multiple errors container.
    pub fn multiple(errors: Vec<IfcError>) -> Self {
        let count = errors.len();
        let all_errors: Vec<String> = errors.iter().map(|e| e.to_string()).collect();
        let first_error = all_errors.first().cloned().unwrap_or_default();
        Self::MultipleErrors {
            count,
            first_error,
            all_errors,
        }
    }
}

/// Log entry for self-healing operations.
#[derive(Debug, Clone)]
pub struct HealingLogEntry {
    /// Entity ID that was healed
    pub entity_id: u64,
    /// Type of healing applied
    pub healing_type: HealingType,
    /// Original error that triggered healing
    pub original_error: String,
    /// Description of the fix applied
    pub fix_description: String,
}

/// Types of self-healing that can be applied.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HealingType {
    /// Skipped invalid entity entirely
    Skipped,
    /// Clamped coordinate to valid range
    CoordinateClamped,
    /// Snapped near-zero value to zero
    SnappedToZero,
    /// Used default value for missing attribute
    DefaultApplied,
    /// Fixed degenerate geometry (e.g., zero-length wall)
    GeometryRepaired,
    /// Resolved broken reference
    ReferenceResolved,
}
