//! IFC import functionality.
//!
//! Parses IFC files (STEP format) into Pensaer elements.

use crate::error::{IfcError, Result};
use crate::export::{FloorExportData, RoomExportData, WallExportData};
use pensaer_math::Point2;
use std::collections::HashMap;
use std::path::Path;
use uuid::Uuid;

/// Parsed IFC entity from STEP format.
#[derive(Debug, Clone)]
struct IfcEntity {
    id: u64,
    entity_type: String,
    parameters: Vec<String>,
}

/// Statistics from IFC import.
#[derive(Debug, Clone, Default)]
pub struct ImportStatistics {
    pub walls_imported: usize,
    pub doors_imported: usize,
    pub windows_imported: usize,
    pub rooms_imported: usize,
    pub floors_imported: usize,
    pub roofs_imported: usize,
    pub unknown_entities: usize,
}

impl ImportStatistics {
    pub fn total_imported(&self) -> usize {
        self.walls_imported
            + self.doors_imported
            + self.windows_imported
            + self.rooms_imported
            + self.floors_imported
            + self.roofs_imported
    }
}

/// IFC importer for parsing IFC files.
pub struct IfcImporter {
    content: String,
    entities: HashMap<u64, IfcEntity>,
    statistics: ImportStatistics,
}

impl IfcImporter {
    /// Create an importer from file path.
    pub fn from_file(path: &Path) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        Self::from_string(content)
    }

    /// Create an importer from IFC content string.
    pub fn from_string(content: String) -> Result<Self> {
        let mut importer = Self {
            content,
            entities: HashMap::new(),
            statistics: ImportStatistics::default(),
        };
        importer.parse_entities()?;
        Ok(importer)
    }

    /// Parse STEP entities from the content.
    fn parse_entities(&mut self) -> Result<()> {
        // Find DATA section
        let data_start = self
            .content
            .find("DATA;")
            .ok_or_else(|| IfcError::InvalidStructure("Missing DATA section".to_string()))?;

        let data_end = self.content[data_start..]
            .find("ENDSEC;")
            .map(|pos| data_start + pos)
            .ok_or_else(|| IfcError::InvalidStructure("Missing ENDSEC".to_string()))?;

        let data_section = &self.content[data_start + 5..data_end];

        // Parse each line
        for line in data_section.lines() {
            let line = line.trim();
            if line.is_empty() || !line.starts_with('#') {
                continue;
            }

            if let Some(entity) = self.parse_entity_line(line) {
                self.entities.insert(entity.id, entity);
            }
        }

        Ok(())
    }

    /// Parse a single entity line.
    fn parse_entity_line(&self, line: &str) -> Option<IfcEntity> {
        // Format: #123=IFCENTITYTYPE(param1,param2,...);
        let line = line.trim_end_matches(';');

        let equals_pos = line.find('=')?;
        let id_str = line[1..equals_pos].trim();
        let id: u64 = id_str.parse().ok()?;

        let rest = &line[equals_pos + 1..];
        let paren_pos = rest.find('(')?;
        let entity_type = rest[..paren_pos].trim().to_uppercase();

        let params_str = &rest[paren_pos + 1..rest.len() - 1];
        let parameters = self.parse_parameters(params_str);

        Some(IfcEntity {
            id,
            entity_type,
            parameters,
        })
    }

    /// Parse parameters from a parameter string.
    fn parse_parameters(&self, params: &str) -> Vec<String> {
        let mut result = Vec::new();
        let mut current = String::new();
        let mut depth = 0;
        let mut in_string = false;

        for ch in params.chars() {
            match ch {
                '\'' => {
                    in_string = !in_string;
                    current.push(ch);
                }
                '(' if !in_string => {
                    depth += 1;
                    current.push(ch);
                }
                ')' if !in_string => {
                    depth -= 1;
                    current.push(ch);
                }
                ',' if depth == 0 && !in_string => {
                    result.push(current.trim().to_string());
                    current.clear();
                }
                _ => current.push(ch),
            }
        }

        if !current.is_empty() {
            result.push(current.trim().to_string());
        }

        result
    }

    /// Get import statistics.
    pub fn statistics(&self) -> &ImportStatistics {
        &self.statistics
    }

    /// Get total entity count.
    pub fn entity_count(&self) -> usize {
        self.entities.len()
    }

    /// Get entities of a specific type.
    fn get_entities_by_type(&self, entity_type: &str) -> Vec<&IfcEntity> {
        self.entities
            .values()
            .filter(|e| e.entity_type == entity_type)
            .collect()
    }

    /// Extract walls from the IFC file.
    pub fn extract_walls(&mut self) -> Result<Vec<WallExportData>> {
        let mut walls = Vec::new();

        // Get all wall entities
        let wall_entities: Vec<_> = self
            .entities
            .values()
            .filter(|e| e.entity_type == "IFCWALL" || e.entity_type == "IFCWALLSTANDARDCASE")
            .cloned()
            .collect();

        for entity in wall_entities {
            if let Some(wall) = self.parse_wall(&entity) {
                walls.push(wall);
            }
        }

        self.statistics.walls_imported = walls.len();
        Ok(walls)
    }

    /// Parse a wall entity into WallExportData.
    fn parse_wall(&self, entity: &IfcEntity) -> Option<WallExportData> {
        // Parameters: GlobalId, OwnerHistory, Name, Description, ObjectType, ObjectPlacement, Representation, Tag, PredefinedType
        if entity.parameters.len() < 3 {
            return None;
        }

        let global_id = self.parse_string(&entity.parameters[0]);
        let name = self.parse_string(&entity.parameters.get(2).cloned().unwrap_or_default());

        // Try to parse UUID from global_id, or generate new one
        let id = parse_global_id_to_uuid(&global_id).unwrap_or_else(Uuid::new_v4);

        // Get placement and extract coordinates
        let (start, end) = self.extract_wall_geometry(entity)?;

        Some(WallExportData {
            id,
            name,
            start,
            end,
            height: 3.0,      // Default, should be extracted from representation
            thickness: 0.2,   // Default, should be extracted from representation
            base_level: 0.0,
            wall_type: "Basic".to_string(),
        })
    }

    /// Extract wall geometry from placement and representation.
    fn extract_wall_geometry(&self, entity: &IfcEntity) -> Option<(Point2, Point2)> {
        // Get ObjectPlacement reference (parameter 5, 0-indexed = 5)
        let placement_ref = entity.parameters.get(5)?;
        if placement_ref == "$" {
            return Some((Point2::new(0.0, 0.0), Point2::new(1.0, 0.0)));
        }

        let placement_id = self.parse_reference(placement_ref)?;
        let placement = self.entities.get(&placement_id)?;

        // Navigate to axis placement and extract origin
        if placement.entity_type == "IFCLOCALPLACEMENT" && !placement.parameters.is_empty() {
            let axis_ref = placement.parameters.get(1)?;
            if let Some(axis_id) = self.parse_reference(axis_ref) {
                if let Some(axis) = self.entities.get(&axis_id) {
                    if let Some(origin_ref) = axis.parameters.first() {
                        if let Some(origin_id) = self.parse_reference(origin_ref) {
                            if let Some(point) = self.entities.get(&origin_id) {
                                if let Some(coords) = self.parse_cartesian_point(point) {
                                    // Default: 1 meter wall from origin
                                    let start = Point2::new(coords.0, coords.1);
                                    let end = Point2::new(coords.0 + 1.0, coords.1);
                                    return Some((start, end));
                                }
                            }
                        }
                    }
                }
            }
        }

        // Default geometry if parsing fails
        Some((Point2::new(0.0, 0.0), Point2::new(1.0, 0.0)))
    }

    /// Parse a Cartesian point entity.
    fn parse_cartesian_point(&self, entity: &IfcEntity) -> Option<(f64, f64, f64)> {
        if entity.entity_type != "IFCCARTESIANPOINT" {
            return None;
        }

        // Parameter format: ((x,y,z)) or ((x,y))
        let coords_str = entity.parameters.first()?;
        let coords_str = coords_str.trim_start_matches('(').trim_end_matches(')');
        let coords: Vec<f64> = coords_str
            .split(',')
            .filter_map(|s| s.trim().parse().ok())
            .collect();

        let x = coords.first().copied().unwrap_or(0.0);
        let y = coords.get(1).copied().unwrap_or(0.0);
        let z = coords.get(2).copied().unwrap_or(0.0);

        Some((x, y, z))
    }

    /// Parse a string value (remove quotes).
    fn parse_string(&self, s: &str) -> String {
        s.trim_matches('\'').to_string()
    }

    /// Parse a reference to another entity (#123 -> 123).
    fn parse_reference(&self, s: &str) -> Option<u64> {
        if s.starts_with('#') {
            s[1..].parse().ok()
        } else {
            None
        }
    }

    /// Extract rooms/spaces from the IFC file.
    pub fn extract_rooms(&mut self) -> Result<Vec<RoomExportData>> {
        let mut rooms = Vec::new();

        let space_entities: Vec<_> = self
            .entities
            .values()
            .filter(|e| e.entity_type == "IFCSPACE")
            .cloned()
            .collect();

        for entity in space_entities {
            if let Some(room) = self.parse_room(&entity) {
                rooms.push(room);
            }
        }

        self.statistics.rooms_imported = rooms.len();
        Ok(rooms)
    }

    /// Parse a room/space entity.
    fn parse_room(&self, entity: &IfcEntity) -> Option<RoomExportData> {
        // Parameters: GlobalId, OwnerHistory, Name, Description, ObjectType, ObjectPlacement, Representation, LongName, CompositionType, PredefinedType, ElevationWithFlooring
        let global_id = self.parse_string(&entity.parameters.get(0).cloned().unwrap_or_default());
        let number = self.parse_string(&entity.parameters.get(2).cloned().unwrap_or_default());
        let name = self.parse_string(&entity.parameters.get(3).cloned().unwrap_or_default());

        let id = parse_global_id_to_uuid(&global_id).unwrap_or_else(Uuid::new_v4);

        Some(RoomExportData {
            id,
            name: if name.is_empty() { number.clone() } else { name },
            number,
            area: 0.0,    // Would need to be calculated from geometry
            height: 2.7,  // Default
            boundary_points: Vec::new(),
        })
    }

    /// Extract floors/slabs from the IFC file.
    pub fn extract_floors(&mut self) -> Result<Vec<FloorExportData>> {
        let mut floors = Vec::new();

        let slab_entities: Vec<_> = self
            .entities
            .values()
            .filter(|e| e.entity_type == "IFCSLAB")
            .cloned()
            .collect();

        for entity in slab_entities {
            if let Some(floor) = self.parse_floor(&entity) {
                floors.push(floor);
            }
        }

        self.statistics.floors_imported = floors.len();
        Ok(floors)
    }

    /// Parse a floor/slab entity.
    fn parse_floor(&self, entity: &IfcEntity) -> Option<FloorExportData> {
        let global_id = self.parse_string(&entity.parameters.get(0).cloned().unwrap_or_default());
        let name = self.parse_string(&entity.parameters.get(2).cloned().unwrap_or_default());

        let id = parse_global_id_to_uuid(&global_id).unwrap_or_else(Uuid::new_v4);

        Some(FloorExportData {
            id,
            name,
            thickness: 0.3,  // Default
            level: 0.0,
            boundary_points: Vec::new(),
        })
    }

    /// Get a summary of what was found in the IFC file.
    pub fn get_summary(&self) -> HashMap<String, usize> {
        let mut summary = HashMap::new();

        for entity in self.entities.values() {
            *summary.entry(entity.entity_type.clone()).or_insert(0) += 1;
        }

        summary
    }
}

/// Try to parse an IFC GlobalId to a UUID.
fn parse_global_id_to_uuid(global_id: &str) -> Option<Uuid> {
    // IFC GlobalId is a 22-character base64-encoded value
    // Try to parse it, or return None
    if global_id.len() >= 22 {
        // Simplified: try parsing as hex
        u128::from_str_radix(&global_id[..22], 16)
            .ok()
            .map(Uuid::from_u128)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_ifc() -> String {
        r#"ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition'),'2;1');
FILE_NAME('test.ifc','2026-01-16',('Author'),('Org'),'Pensaer','Pensaer','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('1234567890ABCDEFGHIJ01',#2,'Test Project','',*,*,*,(#10),#11);
#2=IFCOWNERHISTORY(#3,$,.NOCHANGE.,$,$,$,$,0);
#3=IFCPERSONANDORGANIZATION(#4,#5,$);
#4=IFCPERSON($,'Test','',(),$,$,$,$);
#5=IFCORGANIZATION($,'TestOrg','',$,$);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-05,#12,*,$);
#11=IFCUNITASSIGNMENT((#13));
#12=IFCAXIS2PLACEMENT3D(#14,*,$);
#13=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#14=IFCCARTESIANPOINT((0.,0.,0.));
#100=IFCWALLSTANDARDCASE('WALL00000000000000001',#2,'Test Wall','','',$,$,$,.NOTDEFINED.);
#200=IFCSPACE('SPACE0000000000000001',#2,'101','Room 1','',$,$,$,.INTERNAL.,.ELEMENT.,$);
ENDSEC;
END-ISO-10303-21;
"#
        .to_string()
    }

    #[test]
    fn parse_ifc_content() {
        let importer = IfcImporter::from_string(create_test_ifc()).unwrap();
        assert!(importer.entity_count() > 0);
    }

    #[test]
    fn extract_walls() {
        let mut importer = IfcImporter::from_string(create_test_ifc()).unwrap();
        let walls = importer.extract_walls().unwrap();
        assert_eq!(walls.len(), 1);
        assert_eq!(walls[0].name, "Test Wall");
    }

    #[test]
    fn extract_rooms() {
        let mut importer = IfcImporter::from_string(create_test_ifc()).unwrap();
        let rooms = importer.extract_rooms().unwrap();
        assert_eq!(rooms.len(), 1);
    }

    #[test]
    fn get_summary() {
        let importer = IfcImporter::from_string(create_test_ifc()).unwrap();
        let summary = importer.get_summary();
        assert!(summary.contains_key("IFCPROJECT"));
        assert!(summary.contains_key("IFCWALLSTANDARDCASE"));
    }
}
