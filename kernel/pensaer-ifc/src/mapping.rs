//! Type mapping between Pensaer elements and IFC entities.

use crate::error::{IfcError, Result};

/// Pensaer element types that can be mapped to IFC.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ElementType {
    Wall,
    Door,
    Window,
    Floor,
    Room,
    Roof,
    Column,
    Beam,
    Stair,
    Opening,
}

impl ElementType {
    /// Parse element type from string.
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "wall" => Some(Self::Wall),
            "door" => Some(Self::Door),
            "window" => Some(Self::Window),
            "floor" | "slab" => Some(Self::Floor),
            "room" | "space" => Some(Self::Room),
            "roof" => Some(Self::Roof),
            "column" => Some(Self::Column),
            "beam" => Some(Self::Beam),
            "stair" | "stairs" => Some(Self::Stair),
            "opening" => Some(Self::Opening),
            _ => None,
        }
    }

    /// Get the string representation.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Wall => "wall",
            Self::Door => "door",
            Self::Window => "window",
            Self::Floor => "floor",
            Self::Room => "room",
            Self::Roof => "roof",
            Self::Column => "column",
            Self::Beam => "beam",
            Self::Stair => "stair",
            Self::Opening => "opening",
        }
    }
}

/// IFC entity types.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum IfcEntityType {
    IfcWall,
    IfcWallStandardCase,
    IfcDoor,
    IfcWindow,
    IfcSlab,
    IfcSpace,
    IfcRoof,
    IfcColumn,
    IfcBeam,
    IfcStair,
    IfcOpeningElement,
    IfcBuildingStorey,
    IfcBuilding,
    IfcSite,
    IfcProject,
}

impl IfcEntityType {
    /// Get the IFC entity name.
    pub fn ifc_name(&self) -> &'static str {
        match self {
            Self::IfcWall => "IfcWall",
            Self::IfcWallStandardCase => "IfcWallStandardCase",
            Self::IfcDoor => "IfcDoor",
            Self::IfcWindow => "IfcWindow",
            Self::IfcSlab => "IfcSlab",
            Self::IfcSpace => "IfcSpace",
            Self::IfcRoof => "IfcRoof",
            Self::IfcColumn => "IfcColumn",
            Self::IfcBeam => "IfcBeam",
            Self::IfcStair => "IfcStair",
            Self::IfcOpeningElement => "IfcOpeningElement",
            Self::IfcBuildingStorey => "IfcBuildingStorey",
            Self::IfcBuilding => "IfcBuilding",
            Self::IfcSite => "IfcSite",
            Self::IfcProject => "IfcProject",
        }
    }
}

/// Mapping configuration between Pensaer and IFC types.
pub struct TypeMapping;

impl TypeMapping {
    /// Convert Pensaer element type to IFC entity type.
    pub fn pensaer_to_ifc(element_type: ElementType) -> IfcEntityType {
        match element_type {
            ElementType::Wall => IfcEntityType::IfcWallStandardCase,
            ElementType::Door => IfcEntityType::IfcDoor,
            ElementType::Window => IfcEntityType::IfcWindow,
            ElementType::Floor => IfcEntityType::IfcSlab,
            ElementType::Room => IfcEntityType::IfcSpace,
            ElementType::Roof => IfcEntityType::IfcRoof,
            ElementType::Column => IfcEntityType::IfcColumn,
            ElementType::Beam => IfcEntityType::IfcBeam,
            ElementType::Stair => IfcEntityType::IfcStair,
            ElementType::Opening => IfcEntityType::IfcOpeningElement,
        }
    }

    /// Convert IFC entity type to Pensaer element type.
    pub fn ifc_to_pensaer(ifc_type: IfcEntityType) -> Result<ElementType> {
        match ifc_type {
            IfcEntityType::IfcWall | IfcEntityType::IfcWallStandardCase => Ok(ElementType::Wall),
            IfcEntityType::IfcDoor => Ok(ElementType::Door),
            IfcEntityType::IfcWindow => Ok(ElementType::Window),
            IfcEntityType::IfcSlab => Ok(ElementType::Floor),
            IfcEntityType::IfcSpace => Ok(ElementType::Room),
            IfcEntityType::IfcRoof => Ok(ElementType::Roof),
            IfcEntityType::IfcColumn => Ok(ElementType::Column),
            IfcEntityType::IfcBeam => Ok(ElementType::Beam),
            IfcEntityType::IfcStair => Ok(ElementType::Stair),
            IfcEntityType::IfcOpeningElement => Ok(ElementType::Opening),
            _ => Err(IfcError::MappingError(format!(
                "No Pensaer equivalent for {}",
                ifc_type.ifc_name()
            ))),
        }
    }

    /// Parse IFC entity type from string.
    pub fn parse_ifc_type(s: &str) -> Option<IfcEntityType> {
        match s.to_uppercase().as_str() {
            "IFCWALL" => Some(IfcEntityType::IfcWall),
            "IFCWALLSTANDARDCASE" => Some(IfcEntityType::IfcWallStandardCase),
            "IFCDOOR" => Some(IfcEntityType::IfcDoor),
            "IFCWINDOW" => Some(IfcEntityType::IfcWindow),
            "IFCSLAB" => Some(IfcEntityType::IfcSlab),
            "IFCSPACE" => Some(IfcEntityType::IfcSpace),
            "IFCROOF" => Some(IfcEntityType::IfcRoof),
            "IFCCOLUMN" => Some(IfcEntityType::IfcColumn),
            "IFCBEAM" => Some(IfcEntityType::IfcBeam),
            "IFCSTAIR" => Some(IfcEntityType::IfcStair),
            "IFCOPENINGELEMENT" => Some(IfcEntityType::IfcOpeningElement),
            "IFCBUILDINGSTOREY" => Some(IfcEntityType::IfcBuildingStorey),
            "IFCBUILDING" => Some(IfcEntityType::IfcBuilding),
            "IFCSITE" => Some(IfcEntityType::IfcSite),
            "IFCPROJECT" => Some(IfcEntityType::IfcProject),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn element_type_from_str() {
        assert_eq!(ElementType::from_str("wall"), Some(ElementType::Wall));
        assert_eq!(ElementType::from_str("WALL"), Some(ElementType::Wall));
        assert_eq!(ElementType::from_str("door"), Some(ElementType::Door));
        assert_eq!(ElementType::from_str("slab"), Some(ElementType::Floor));
        assert_eq!(ElementType::from_str("space"), Some(ElementType::Room));
        assert_eq!(ElementType::from_str("unknown"), None);
    }

    #[test]
    fn pensaer_to_ifc_mapping() {
        assert_eq!(
            TypeMapping::pensaer_to_ifc(ElementType::Wall),
            IfcEntityType::IfcWallStandardCase
        );
        assert_eq!(
            TypeMapping::pensaer_to_ifc(ElementType::Door),
            IfcEntityType::IfcDoor
        );
        assert_eq!(
            TypeMapping::pensaer_to_ifc(ElementType::Floor),
            IfcEntityType::IfcSlab
        );
    }

    #[test]
    fn ifc_to_pensaer_mapping() {
        assert_eq!(
            TypeMapping::ifc_to_pensaer(IfcEntityType::IfcWall).unwrap(),
            ElementType::Wall
        );
        assert_eq!(
            TypeMapping::ifc_to_pensaer(IfcEntityType::IfcWallStandardCase).unwrap(),
            ElementType::Wall
        );
        assert!(TypeMapping::ifc_to_pensaer(IfcEntityType::IfcProject).is_err());
    }

    #[test]
    fn parse_ifc_type() {
        assert_eq!(
            TypeMapping::parse_ifc_type("IFCWALL"),
            Some(IfcEntityType::IfcWall)
        );
        assert_eq!(
            TypeMapping::parse_ifc_type("IfcDoor"),
            Some(IfcEntityType::IfcDoor)
        );
        assert_eq!(TypeMapping::parse_ifc_type("unknown"), None);
    }
}
