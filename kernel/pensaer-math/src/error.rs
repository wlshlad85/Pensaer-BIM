//! Error types for pensaer-math crate.

use thiserror::Error;

/// Errors that can occur in mathematical operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum MathError {
    /// Vector has zero length, cannot normalize.
    #[error("cannot normalize zero-length vector")]
    ZeroLengthVector,

    /// Line has zero length (start == end).
    #[error("line has zero length")]
    ZeroLengthLine,

    /// Lines are parallel, no intersection.
    #[error("lines are parallel")]
    ParallelLines,

    /// Polygon has fewer than 3 vertices.
    #[error("polygon must have at least 3 vertices")]
    InsufficientVertices,

    /// Polygon has self-intersecting edges.
    #[error("polygon has self-intersecting edges")]
    SelfIntersecting,

    /// Matrix is singular, cannot invert.
    #[error("matrix is singular, cannot invert")]
    SingularMatrix,

    /// Division by zero.
    #[error("division by zero")]
    DivisionByZero,

    /// Value is NaN (not a number).
    #[error("value is NaN (not a number)")]
    NaN,

    /// Value is infinite.
    #[error("value is infinite")]
    Infinite,

    /// Value is out of valid domain.
    #[error("value is out of valid domain")]
    DomainError,
}

/// Result type for math operations.
pub type MathResult<T> = Result<T, MathError>;
