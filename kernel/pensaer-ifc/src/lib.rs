//! Pensaer IFC Module
//!
//! This module provides IFC (Industry Foundation Classes) import and export
//! functionality for Pensaer BIM elements.
//!
//! # Features
//!
//! - Parse IFC files (STEP format) into Pensaer elements
//! - Export Pensaer elements to IFC format
//! - Map between Pensaer element types and IFC entity types
//!
//! # IFC Entity Mapping
//!
//! | Pensaer Type | IFC Entity |
//! |--------------|------------|
//! | Wall | IfcWall |
//! | Door | IfcDoor |
//! | Window | IfcWindow |
//! | Floor | IfcSlab |
//! | Room | IfcSpace |
//! | Roof | IfcRoof |
//!
//! # Example
//!
//! ```ignore
//! use pensaer_ifc::{IfcExporter, IfcImporter};
//!
//! // Export walls to IFC
//! let exporter = IfcExporter::new("My Project", "Pensaer");
//! exporter.add_wall(&wall);
//! let ifc_content = exporter.export()?;
//!
//! // Import IFC file
//! let importer = IfcImporter::from_file("building.ifc")?;
//! let walls = importer.extract_walls()?;
//! ```

mod error;
mod export;
mod import;
mod mapping;

pub use error::{IfcError, Result};
pub use export::IfcExporter;
pub use import::IfcImporter;
pub use mapping::{ElementType, IfcEntityType, TypeMapping};

/// IFC schema versions supported
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IfcVersion {
    /// IFC 2x3 Technical Corrigendum 1
    Ifc2x3,
    /// IFC 4 Add2 Technical Corrigendum 1
    Ifc4,
    /// IFC 4.3 (ISO 16739-1:2024)
    Ifc4x3,
}

impl Default for IfcVersion {
    fn default() -> Self {
        Self::Ifc4
    }
}

impl std::fmt::Display for IfcVersion {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Ifc2x3 => write!(f, "IFC2X3"),
            Self::Ifc4 => write!(f, "IFC4"),
            Self::Ifc4x3 => write!(f, "IFC4X3"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ifc_version_display() {
        assert_eq!(format!("{}", IfcVersion::Ifc2x3), "IFC2X3");
        assert_eq!(format!("{}", IfcVersion::Ifc4), "IFC4");
        assert_eq!(format!("{}", IfcVersion::Ifc4x3), "IFC4X3");
    }

    #[test]
    fn default_version_is_ifc4() {
        assert_eq!(IfcVersion::default(), IfcVersion::Ifc4);
    }
}
