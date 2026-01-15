//! Error types for pensaer-geometry crate.

use thiserror::Error;

/// Errors that can occur in geometry operations.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum GeometryError {
    /// Wall baseline has zero length.
    #[error("wall baseline has zero length")]
    ZeroLengthWall,

    /// Height must be positive.
    #[error("height must be positive")]
    NonPositiveHeight,

    /// Thickness must be positive.
    #[error("thickness must be positive")]
    NonPositiveThickness,

    /// Floor bounds are invalid (min >= max).
    #[error("floor bounds are invalid")]
    InvalidFloorBounds,

    /// Polygon has fewer than 3 vertices.
    #[error("polygon must have at least 3 vertices")]
    InsufficientVertices,

    /// Opening extends beyond wall bounds.
    #[error("opening extends beyond wall bounds")]
    OpeningOutOfBounds,

    /// Opening overlaps with existing opening.
    #[error("opening overlaps with existing opening")]
    OverlappingOpenings,

    /// Invalid element ID reference.
    #[error("invalid element reference: {0}")]
    InvalidElementRef(String),

    /// Mesh has invalid indices.
    #[error("mesh has invalid vertex indices")]
    InvalidMeshIndices,

    /// Triangulation failed.
    #[error("triangulation failed: {0}")]
    TriangulationFailed(String),

    /// Invalid join configuration.
    #[error("invalid wall join configuration")]
    InvalidJoinConfiguration,

    /// Join computation failed.
    #[error("join computation failed: {0}")]
    JoinComputationFailed(String),

    /// Math error propagated from pensaer-math.
    #[error("math error: {0}")]
    MathError(#[from] pensaer_math::MathError),
}

/// Result type for geometry operations.
pub type GeometryResult<T> = Result<T, GeometryError>;
