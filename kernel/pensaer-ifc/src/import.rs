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
    /// Number of entities skipped due to errors (self-healing mode)
    pub skipped_entities: usize,
    /// Number of entities repaired (self-healing mode)
    pub repaired_entities: usize,
}

/// Result of a self-healing import operation.
#[derive(Debug)]
pub struct HealingImportResult<T> {
    /// Successfully imported elements
    pub elements: Vec<T>,
    /// Number of elements skipped due to unrecoverable errors
    pub skipped_count: usize,
    /// Number of elements that were repaired
    pub repaired_count: usize,
    /// Error log with details of each issue
    pub error_log: Vec<String>,
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

    // =========================================================================
    // Self-Healing Import Methods
    // =========================================================================

    /// Import walls with automatic error recovery.
    ///
    /// Unlike `extract_walls()`, this method:
    /// - Skips invalid entities instead of failing
    /// - Attempts to repair common geometry issues
    /// - Returns detailed error log for diagnostics
    ///
    /// # Example
    ///
    /// ```ignore
    /// let mut importer = IfcImporter::from_file("building.ifc")?;
    /// let result = importer.extract_walls_healing();
    /// println!("Imported {} walls, skipped {}", result.elements.len(), result.skipped_count);
    /// for error in &result.error_log {
    ///     eprintln!("  Warning: {}", error);
    /// }
    /// ```
    pub fn extract_walls_healing(&mut self) -> HealingImportResult<WallExportData> {
        let mut elements = Vec::new();
        let mut error_log = Vec::new();
        let mut skipped = 0;
        let mut repaired = 0;

        let wall_entities: Vec<_> = self
            .entities
            .values()
            .filter(|e| e.entity_type == "IFCWALL" || e.entity_type == "IFCWALLSTANDARDCASE")
            .cloned()
            .collect();

        for entity in wall_entities {
            match self.parse_wall_healing(&entity) {
                Ok((wall, was_repaired)) => {
                    if was_repaired {
                        repaired += 1;
                        error_log.push(format!("#{}: geometry repaired", entity.id));
                    }
                    elements.push(wall);
                }
                Err(e) => {
                    error_log.push(format!("#{}: {} - skipped", entity.id, e));
                    skipped += 1;
                }
            }
        }

        self.statistics.walls_imported = elements.len();
        self.statistics.skipped_entities += skipped;
        self.statistics.repaired_entities += repaired;

        HealingImportResult {
            elements,
            skipped_count: skipped,
            repaired_count: repaired,
            error_log,
        }
    }

    /// Parse a wall entity with self-healing.
    ///
    /// Returns (WallExportData, was_repaired) on success.
    fn parse_wall_healing(&self, entity: &IfcEntity) -> Result<(WallExportData, bool)> {
        let mut was_repaired = false;

        // Get GlobalId - required field
        let global_id = if entity.parameters.is_empty() {
            return Err(IfcError::MissingAttribute {
                entity_id: entity.id,
                entity_type: entity.entity_type.clone(),
                attribute: "GlobalId".to_string(),
            });
        } else {
            self.parse_string(&entity.parameters[0])
        };

        // Get name - optional, default to empty
        let name = self
            .parse_string(&entity.parameters.get(2).cloned().unwrap_or_default());

        // Try to parse UUID, or generate new one
        let id = parse_global_id_to_uuid(&global_id).unwrap_or_else(Uuid::new_v4);

        // Get geometry with repair attempts
        let (start, end) = match self.extract_wall_geometry(entity) {
            Some((s, e)) => {
                // Validate and potentially repair geometry
                let (repaired_start, repaired_end, needed_repair) =
                    self.try_repair_wall_geometry(entity.id, s, e)?;
                if needed_repair {
                    was_repaired = true;
                }
                (repaired_start, repaired_end)
            }
            None => {
                // Use default geometry if extraction fails completely
                was_repaired = true;
                (Point2::new(0.0, 0.0), Point2::new(1.0, 0.0))
            }
        };

        // Extract height and thickness with defaults
        let height = self
            .extract_wall_height(entity)
            .unwrap_or(3.0)
            .clamp(0.1, 100.0);
        let thickness = self
            .extract_wall_thickness(entity)
            .unwrap_or(0.2)
            .clamp(0.01, 2.0);

        Ok((
            WallExportData {
                id,
                name,
                start,
                end,
                height,
                thickness,
                base_level: 0.0,
                wall_type: "Basic".to_string(),
            },
            was_repaired,
        ))
    }

    /// Attempt to repair wall geometry issues.
    ///
    /// Common repairs:
    /// - Snap near-zero coordinates to zero
    /// - Clamp coordinates to valid range (-10km to +10km)
    /// - Ensure minimum wall length
    fn try_repair_wall_geometry(
        &self,
        entity_id: u64,
        start: Point2,
        end: Point2,
    ) -> Result<(Point2, Point2, bool)> {
        const MAX_COORD: f64 = 10_000.0; // 10km sanity limit
        const MIN_WALL_LENGTH: f64 = 0.001; // 1mm minimum
        const SNAP_THRESHOLD: f64 = 1e-10;

        let mut repaired = false;

        // Helper to sanitize a coordinate
        let sanitize = |v: f64| -> f64 {
            if !v.is_finite() {
                0.0
            } else if v.abs() < SNAP_THRESHOLD {
                0.0
            } else {
                v.clamp(-MAX_COORD, MAX_COORD)
            }
        };

        // Sanitize coordinates
        let start_x = sanitize(start.x);
        let start_y = sanitize(start.y);
        let end_x = sanitize(end.x);
        let end_y = sanitize(end.y);

        // Check if repair was needed
        if (start_x - start.x).abs() > SNAP_THRESHOLD
            || (start_y - start.y).abs() > SNAP_THRESHOLD
            || (end_x - end.x).abs() > SNAP_THRESHOLD
            || (end_y - end.y).abs() > SNAP_THRESHOLD
        {
            repaired = true;
        }

        let mut new_start = Point2::new(start_x, start_y);
        let mut new_end = Point2::new(end_x, end_y);

        // Check wall length
        let dx = new_end.x - new_start.x;
        let dy = new_end.y - new_start.y;
        let length = (dx * dx + dy * dy).sqrt();

        if length < MIN_WALL_LENGTH {
            // Wall is too short - make it minimum length in X direction
            new_end = Point2::new(new_start.x + MIN_WALL_LENGTH, new_start.y);
            repaired = true;
        }

        // Validate final length isn't unreasonable
        let final_length = {
            let dx = new_end.x - new_start.x;
            let dy = new_end.y - new_start.y;
            (dx * dx + dy * dy).sqrt()
        };

        if final_length > MAX_COORD {
            return Err(IfcError::DegenerateGeometry {
                entity_id,
                description: format!("Wall length {} exceeds maximum {}", final_length, MAX_COORD),
            });
        }

        Ok((new_start, new_end, repaired))
    }

    /// Try to extract wall height from entity (placeholder - would parse representation).
    fn extract_wall_height(&self, _entity: &IfcEntity) -> Option<f64> {
        // In a full implementation, this would parse the IfcExtrudedAreaSolid
        // depth from the wall's representation
        None
    }

    /// Try to extract wall thickness from entity (placeholder - would parse representation).
    fn extract_wall_thickness(&self, _entity: &IfcEntity) -> Option<f64> {
        // In a full implementation, this would parse the IfcRectangleProfileDef
        // from the wall's representation
        None
    }

    /// Import rooms with automatic error recovery.
    pub fn extract_rooms_healing(&mut self) -> HealingImportResult<RoomExportData> {
        let mut elements = Vec::new();
        let mut error_log = Vec::new();
        let mut skipped = 0;
        let repaired = 0;

        let space_entities: Vec<_> = self
            .entities
            .values()
            .filter(|e| e.entity_type == "IFCSPACE")
            .cloned()
            .collect();

        for entity in space_entities {
            match self.parse_room(&entity) {
                Some(room) => elements.push(room),
                None => {
                    error_log.push(format!("#{}: failed to parse room - skipped", entity.id));
                    skipped += 1;
                }
            }
        }

        self.statistics.rooms_imported = elements.len();
        self.statistics.skipped_entities += skipped;

        HealingImportResult {
            elements,
            skipped_count: skipped,
            repaired_count: repaired,
            error_log,
        }
    }

    /// Import floors with automatic error recovery.
    pub fn extract_floors_healing(&mut self) -> HealingImportResult<FloorExportData> {
        let mut elements = Vec::new();
        let mut error_log = Vec::new();
        let mut skipped = 0;
        let repaired = 0;

        let slab_entities: Vec<_> = self
            .entities
            .values()
            .filter(|e| e.entity_type == "IFCSLAB")
            .cloned()
            .collect();

        for entity in slab_entities {
            match self.parse_floor(&entity) {
                Some(floor) => elements.push(floor),
                None => {
                    error_log.push(format!("#{}: failed to parse floor - skipped", entity.id));
                    skipped += 1;
                }
            }
        }

        self.statistics.floors_imported = elements.len();
        self.statistics.skipped_entities += skipped;

        HealingImportResult {
            elements,
            skipped_count: skipped,
            repaired_count: repaired,
            error_log,
        }
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
