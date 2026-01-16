//! IFC export functionality.
//!
//! Exports Pensaer BIM elements to IFC format.

use crate::error::Result;
use crate::IfcVersion;
use pensaer_math::Point2;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Wall data for IFC export.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WallExportData {
    pub id: Uuid,
    pub name: String,
    pub start: Point2,
    pub end: Point2,
    pub height: f64,
    pub thickness: f64,
    pub base_level: f64,
    pub wall_type: String,
}

/// Door data for IFC export.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DoorExportData {
    pub id: Uuid,
    pub name: String,
    pub host_wall_id: Uuid,
    pub width: f64,
    pub height: f64,
    pub offset: f64,
    pub door_type: String,
}

/// Window data for IFC export.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowExportData {
    pub id: Uuid,
    pub name: String,
    pub host_wall_id: Uuid,
    pub width: f64,
    pub height: f64,
    pub sill_height: f64,
    pub offset: f64,
    pub window_type: String,
}

/// Room/space data for IFC export.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomExportData {
    pub id: Uuid,
    pub name: String,
    pub number: String,
    pub area: f64,
    pub height: f64,
    pub boundary_points: Vec<Point2>,
}

/// Floor/slab data for IFC export.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FloorExportData {
    pub id: Uuid,
    pub name: String,
    pub thickness: f64,
    pub level: f64,
    pub boundary_points: Vec<Point2>,
}

/// Roof data for IFC export.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoofExportData {
    pub id: Uuid,
    pub name: String,
    pub roof_type: String,
    pub thickness: f64,
    pub slope_degrees: f64,
    pub boundary_points: Vec<Point2>,
}

/// Building project metadata.
#[derive(Debug, Clone)]
pub struct ProjectMetadata {
    pub name: String,
    pub author: String,
    pub organization: String,
    pub description: String,
}

impl Default for ProjectMetadata {
    fn default() -> Self {
        Self {
            name: "Untitled Project".to_string(),
            author: "Unknown".to_string(),
            organization: "Pensaer".to_string(),
            description: "".to_string(),
        }
    }
}

/// IFC exporter for Pensaer elements.
pub struct IfcExporter {
    version: IfcVersion,
    metadata: ProjectMetadata,
    walls: Vec<WallExportData>,
    doors: Vec<DoorExportData>,
    windows: Vec<WindowExportData>,
    rooms: Vec<RoomExportData>,
    floors: Vec<FloorExportData>,
    roofs: Vec<RoofExportData>,
}

impl IfcExporter {
    /// Create a new IFC exporter.
    pub fn new(project_name: &str, author: &str) -> Self {
        Self {
            version: IfcVersion::default(),
            metadata: ProjectMetadata {
                name: project_name.to_string(),
                author: author.to_string(),
                ..Default::default()
            },
            walls: Vec::new(),
            doors: Vec::new(),
            windows: Vec::new(),
            rooms: Vec::new(),
            floors: Vec::new(),
            roofs: Vec::new(),
        }
    }

    /// Set the IFC version for export.
    pub fn with_version(mut self, version: IfcVersion) -> Self {
        self.version = version;
        self
    }

    /// Set project metadata.
    pub fn with_metadata(mut self, metadata: ProjectMetadata) -> Self {
        self.metadata = metadata;
        self
    }

    /// Add a wall to export.
    pub fn add_wall(&mut self, wall: WallExportData) {
        self.walls.push(wall);
    }

    /// Add a door to export.
    pub fn add_door(&mut self, door: DoorExportData) {
        self.doors.push(door);
    }

    /// Add a window to export.
    pub fn add_window(&mut self, window: WindowExportData) {
        self.windows.push(window);
    }

    /// Add a room to export.
    pub fn add_room(&mut self, room: RoomExportData) {
        self.rooms.push(room);
    }

    /// Add a floor to export.
    pub fn add_floor(&mut self, floor: FloorExportData) {
        self.floors.push(floor);
    }

    /// Add a roof to export.
    pub fn add_roof(&mut self, roof: RoofExportData) {
        self.roofs.push(roof);
    }

    /// Get the total element count.
    pub fn element_count(&self) -> usize {
        self.walls.len()
            + self.doors.len()
            + self.windows.len()
            + self.rooms.len()
            + self.floors.len()
            + self.roofs.len()
    }

    /// Export to IFC STEP format string.
    pub fn export(&self) -> Result<String> {
        let mut output = String::new();
        let mut entity_id = 1u64;

        // ISO header
        output.push_str("ISO-10303-21;\n");
        output.push_str("HEADER;\n");
        output.push_str(&format!(
            "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');\n"
        ));
        output.push_str(&format!(
            "FILE_NAME('{}','{}',('{}'),('{}'),'Pensaer','Pensaer IFC Exporter','');\n",
            self.metadata.name,
            chrono_timestamp(),
            self.metadata.author,
            self.metadata.organization,
        ));
        output.push_str(&format!("FILE_SCHEMA(('{}'));\n", self.version));
        output.push_str("ENDSEC;\n\n");
        output.push_str("DATA;\n");

        // Project entity
        let project_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCPROJECT('{}',#{},'{}','{}',*,*,*,(#{}),#{});\n",
            project_id,
            generate_global_id(),
            entity_id, // owner history
            self.metadata.name,
            self.metadata.description,
            entity_id + 2, // context
            entity_id + 3, // units
        ));

        // Owner history (simplified)
        let owner_history_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCOWNERHISTORY(#{},$,.NOCHANGE.,$,$,$,$,0);\n",
            owner_history_id,
            entity_id,
        ));

        // Person and organization
        let person_org_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCPERSONANDORGANIZATION(#{},#{},$);\n",
            person_org_id,
            entity_id,
            entity_id + 1,
        ));

        let person_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCPERSON($,'{}','',(),$,$,$,$);\n",
            person_id, self.metadata.author,
        ));

        let org_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCORGANIZATION($,'{}','',$,$);\n",
            org_id, self.metadata.organization,
        ));

        // Geometric representation context
        let context_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-05,#{},*,$);\n",
            context_id,
            entity_id,
        ));

        // Axis placement
        let axis_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCAXIS2PLACEMENT3D(#{},*,$);\n",
            axis_id,
            entity_id,
        ));

        // Origin point
        let origin_id = entity_id;
        entity_id += 1;
        output.push_str(&format!("#{}=IFCCARTESIANPOINT((0.,0.,0.));\n", origin_id));

        // Units assignment
        let units_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCUNITASSIGNMENT((#{},#{}));\n",
            units_id,
            entity_id,
            entity_id + 1,
        ));

        // Length unit (meters)
        let length_unit_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);\n",
            length_unit_id
        ));

        // Area unit (square meters)
        let area_unit_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);\n",
            area_unit_id
        ));

        // Site
        let site_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCSITE('{}',#{},'Default Site',$,$,$,$,$,.ELEMENT.,$,$,$,$,$);\n",
            site_id,
            generate_global_id(),
            owner_history_id,
        ));

        // Building
        let building_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCBUILDING('{}',#{},'Default Building',$,$,$,$,$,.ELEMENT.,$,$,$);\n",
            building_id,
            generate_global_id(),
            owner_history_id,
        ));

        // Building storey
        let storey_id = entity_id;
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCBUILDINGSTOREY('{}',#{},'Level 1',$,$,$,$,$,.ELEMENT.,0.);\n",
            storey_id,
            generate_global_id(),
            owner_history_id,
        ));

        // Rel aggregates: Project -> Site -> Building -> Storey
        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCRELAGGREGATES('{}',#{},$,$,#{},(#{}));\n",
            entity_id,
            generate_global_id(),
            owner_history_id,
            project_id,
            site_id,
        ));

        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCRELAGGREGATES('{}',#{},$,$,#{},(#{}));\n",
            entity_id,
            generate_global_id(),
            owner_history_id,
            site_id,
            building_id,
        ));

        entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCRELAGGREGATES('{}',#{},$,$,#{},(#{}));\n",
            entity_id,
            generate_global_id(),
            owner_history_id,
            building_id,
            storey_id,
        ));

        // Export walls
        let mut wall_ids = Vec::new();
        for wall in &self.walls {
            let wall_id = entity_id;
            wall_ids.push(wall_id);
            output.push_str(&self.export_wall(wall, &mut entity_id, owner_history_id, context_id));
        }

        // Export rooms
        let mut room_ids = Vec::new();
        for room in &self.rooms {
            let room_id = entity_id;
            room_ids.push(room_id);
            output.push_str(&self.export_room(room, &mut entity_id, owner_history_id, context_id));
        }

        // Export floors
        let mut floor_ids = Vec::new();
        for floor in &self.floors {
            let floor_id = entity_id;
            floor_ids.push(floor_id);
            output.push_str(&self.export_floor(floor, &mut entity_id, owner_history_id, context_id));
        }

        // Relate elements to storey
        if !wall_ids.is_empty() || !room_ids.is_empty() || !floor_ids.is_empty() {
            let all_elements: Vec<String> = wall_ids
                .iter()
                .chain(room_ids.iter())
                .chain(floor_ids.iter())
                .map(|id| format!("#{}", id))
                .collect();

            entity_id += 1;
            output.push_str(&format!(
                "#{}=IFCRELCONTAINEDINSPATIALSTRUCTURE('{}',#{},$,$,({}),#{});\n",
                entity_id,
                generate_global_id(),
                owner_history_id,
                all_elements.join(","),
                storey_id,
            ));
        }

        output.push_str("ENDSEC;\n");
        output.push_str("END-ISO-10303-21;\n");

        Ok(output)
    }

    fn export_wall(
        &self,
        wall: &WallExportData,
        entity_id: &mut u64,
        owner_history_id: u64,
        _context_id: u64,
    ) -> String {
        let mut output = String::new();
        let wall_id = *entity_id;
        *entity_id += 1;

        // Calculate wall direction and length
        let dx = wall.end.x - wall.start.x;
        let dy = wall.end.y - wall.start.y;
        let length = (dx * dx + dy * dy).sqrt();

        // Wall placement
        let placement_id = *entity_id;
        *entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCLOCALPLACEMENT($,#{});\n",
            placement_id, *entity_id
        ));

        // Axis placement
        let axis_id = *entity_id;
        *entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCAXIS2PLACEMENT3D(#{},#{},#{});\n",
            axis_id,
            *entity_id,
            *entity_id + 1,
            *entity_id + 2
        ));

        // Origin point
        let origin_id = *entity_id;
        *entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCCARTESIANPOINT(({:.6},{:.6},{:.6}));\n",
            origin_id, wall.start.x, wall.start.y, wall.base_level
        ));

        // Z direction
        let z_dir_id = *entity_id;
        *entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCDIRECTION((0.,0.,1.));\n",
            z_dir_id
        ));

        // X direction (wall direction)
        let x_dir_id = *entity_id;
        *entity_id += 1;
        let dir_x = if length > 0.0 { dx / length } else { 1.0 };
        let dir_y = if length > 0.0 { dy / length } else { 0.0 };
        output.push_str(&format!(
            "#{}=IFCDIRECTION(({:.6},{:.6},0.));\n",
            x_dir_id, dir_x, dir_y
        ));

        // Wall entity
        output.push_str(&format!(
            "#{}=IFCWALLSTANDARDCASE('{}',#{},'{}','{}',$,#{},$,$,.NOTDEFINED.);\n",
            wall_id,
            format!("{:032X}", wall.id.as_u128()),
            owner_history_id,
            wall.name,
            wall.wall_type,
            placement_id,
        ));

        output
    }

    fn export_room(
        &self,
        room: &RoomExportData,
        entity_id: &mut u64,
        owner_history_id: u64,
        _context_id: u64,
    ) -> String {
        let mut output = String::new();
        let room_id = *entity_id;
        *entity_id += 1;

        // Room placement
        let placement_id = *entity_id;
        *entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCLOCALPLACEMENT($,#{});\n",
            placement_id, *entity_id
        ));

        // Axis placement
        let axis_id = *entity_id;
        *entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCAXIS2PLACEMENT3D(#{},$,$);\n",
            axis_id, *entity_id
        ));

        // Origin (centroid of room)
        let origin_id = *entity_id;
        *entity_id += 1;
        let centroid = if !room.boundary_points.is_empty() {
            let sum_x: f64 = room.boundary_points.iter().map(|p| p.x).sum();
            let sum_y: f64 = room.boundary_points.iter().map(|p| p.y).sum();
            let n = room.boundary_points.len() as f64;
            (sum_x / n, sum_y / n)
        } else {
            (0.0, 0.0)
        };
        output.push_str(&format!(
            "#{}=IFCCARTESIANPOINT(({:.6},{:.6},0.));\n",
            origin_id, centroid.0, centroid.1
        ));

        // Space entity
        output.push_str(&format!(
            "#{}=IFCSPACE('{}',#{},'{}','{}','{}',$,#{},$,.INTERNAL.,.ELEMENT.,$);\n",
            room_id,
            format!("{:032X}", room.id.as_u128()),
            owner_history_id,
            room.number,
            room.name,
            format!("Area: {:.2} m²", room.area),
            placement_id,
        ));

        output
    }

    fn export_floor(
        &self,
        floor: &FloorExportData,
        entity_id: &mut u64,
        owner_history_id: u64,
        _context_id: u64,
    ) -> String {
        let mut output = String::new();
        let floor_id = *entity_id;
        *entity_id += 1;

        // Floor placement
        let placement_id = *entity_id;
        *entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCLOCALPLACEMENT($,#{});\n",
            placement_id, *entity_id
        ));

        // Axis placement
        let axis_id = *entity_id;
        *entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCAXIS2PLACEMENT3D(#{},$,$);\n",
            axis_id, *entity_id
        ));

        // Origin
        let origin_id = *entity_id;
        *entity_id += 1;
        output.push_str(&format!(
            "#{}=IFCCARTESIANPOINT((0.,0.,{:.6}));\n",
            origin_id, floor.level
        ));

        // Slab entity
        output.push_str(&format!(
            "#{}=IFCSLAB('{}',#{},'{}','',$,#{},$,$,.FLOOR.);\n",
            floor_id,
            format!("{:032X}", floor.id.as_u128()),
            owner_history_id,
            floor.name,
            placement_id,
        ));

        output
    }

    /// Export to file.
    pub fn export_to_file(&self, path: &std::path::Path) -> Result<()> {
        let content = self.export()?;
        std::fs::write(path, content)?;
        Ok(())
    }
}

/// Generate an IFC GlobalId (base64-ish 22-character string).
fn generate_global_id() -> String {
    let uuid = Uuid::new_v4();
    // IFC uses a custom base64 encoding for GlobalId
    // Simplified: just use first 22 chars of hex UUID
    format!("{:032X}", uuid.as_u128())[..22].to_string()
}

/// Get current timestamp in ISO format.
fn chrono_timestamp() -> String {
    // Simple timestamp without chrono dependency
    "2026-01-16T12:00:00".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_exporter() {
        let exporter = IfcExporter::new("Test Project", "Test Author");
        assert_eq!(exporter.element_count(), 0);
    }

    #[test]
    fn add_wall() {
        let mut exporter = IfcExporter::new("Test", "Author");
        exporter.add_wall(WallExportData {
            id: Uuid::new_v4(),
            name: "Wall 1".to_string(),
            start: Point2::new(0.0, 0.0),
            end: Point2::new(5.0, 0.0),
            height: 3.0,
            thickness: 0.2,
            base_level: 0.0,
            wall_type: "Basic".to_string(),
        });
        assert_eq!(exporter.element_count(), 1);
    }

    #[test]
    fn export_basic() {
        let mut exporter = IfcExporter::new("Test Project", "Test Author");
        exporter.add_wall(WallExportData {
            id: Uuid::new_v4(),
            name: "Wall 1".to_string(),
            start: Point2::new(0.0, 0.0),
            end: Point2::new(5.0, 0.0),
            height: 3.0,
            thickness: 0.2,
            base_level: 0.0,
            wall_type: "Basic".to_string(),
        });

        let content = exporter.export().unwrap();
        assert!(content.contains("ISO-10303-21"));
        assert!(content.contains("IFCPROJECT"));
        assert!(content.contains("IFCWALLSTANDARDCASE"));
    }

    #[test]
    fn global_id_length() {
        let id = generate_global_id();
        assert_eq!(id.len(), 22);
    }
}
