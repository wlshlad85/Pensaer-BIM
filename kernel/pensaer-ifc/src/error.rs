//! Error types for IFC operations.

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
}
