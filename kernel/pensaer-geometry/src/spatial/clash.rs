//! Clash detection for BIM elements.
//!
//! Detects geometric intersections and clearance violations between elements.
//!
//! # Algorithm
//!
//! 1. **Broad Phase**: Use bounding box overlap to find candidate pairs
//! 2. **Narrow Phase**: Check actual geometry intersection for candidates
//!
//! # Example
//!
//! ```ignore
//! use pensaer_geometry::spatial::clash::{ClashDetector, ClashType};
//!
//! let walls = vec![wall1, wall2, wall3];
//! let clashes = ClashDetector::new(0.001).detect_clashes_in_list(&walls);
//! for clash in clashes {
//!     println!("Clash between {} and {}: {:?}", clash.element_a_id, clash.element_b_id, clash.clash_type);
//! }
//! ```

use pensaer_math::BoundingBox3;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Type of clash detected.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ClashType {
    /// Hard clash: solid geometry intersection (elements occupy same space).
    Hard,
    /// Soft clash: clearance violation (elements too close).
    Clearance,
    /// Duplicate: same geometry at same location.
    Duplicate,
}

impl ClashType {
    /// Get human-readable name.
    pub fn name(&self) -> &'static str {
        match self {
            ClashType::Hard => "Hard Clash",
            ClashType::Clearance => "Clearance Violation",
            ClashType::Duplicate => "Duplicate Element",
        }
    }

    /// Get severity level (higher = more severe).
    pub fn severity(&self) -> u8 {
        match self {
            ClashType::Hard => 3,
            ClashType::Clearance => 2,
            ClashType::Duplicate => 1,
        }
    }
}

/// A detected clash between two elements.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clash {
    /// Unique identifier for this clash.
    pub id: Uuid,
    /// ID of the first element involved.
    pub element_a_id: Uuid,
    /// ID of the second element involved.
    pub element_b_id: Uuid,
    /// Type of the first element.
    pub element_a_type: String,
    /// Type of the second element.
    pub element_b_type: String,
    /// Type of clash.
    pub clash_type: ClashType,
    /// Approximate point of clash (center of overlap region).
    pub clash_point: [f64; 3],
    /// Penetration depth (for hard clashes) or clearance gap (for soft clashes).
    pub distance: f64,
    /// Volume of overlap region (for hard clashes).
    pub overlap_volume: f64,
}

impl Clash {
    /// Create a new clash.
    pub fn new(
        element_a_id: Uuid,
        element_b_id: Uuid,
        element_a_type: impl Into<String>,
        element_b_type: impl Into<String>,
        clash_type: ClashType,
        clash_point: [f64; 3],
        distance: f64,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            element_a_id,
            element_b_id,
            element_a_type: element_a_type.into(),
            element_b_type: element_b_type.into(),
            clash_type,
            clash_point,
            distance,
            overlap_volume: 0.0,
        }
    }

    /// Set the overlap volume.
    pub fn with_overlap_volume(mut self, volume: f64) -> Self {
        self.overlap_volume = volume;
        self
    }
}

/// Element info for clash detection (lightweight representation).
#[derive(Debug, Clone)]
pub struct ClashElement {
    /// Element ID.
    pub id: Uuid,
    /// Element type name.
    pub element_type: String,
    /// Axis-aligned bounding box.
    pub bbox: BoundingBox3,
}

impl ClashElement {
    /// Create a new clash element.
    pub fn new(id: Uuid, element_type: impl Into<String>, bbox: BoundingBox3) -> Self {
        Self {
            id,
            element_type: element_type.into(),
            bbox,
        }
    }
}

/// Filter for clash detection.
#[derive(Debug, Clone, Default)]
pub struct ClashFilter {
    /// Only check clashes between these types (if empty, check all).
    pub types_a: Vec<String>,
    /// Only check clashes with these types (if empty, check all).
    pub types_b: Vec<String>,
    /// Ignore clashes between same type.
    pub ignore_same_type: bool,
    /// Minimum clearance for soft clash detection.
    pub clearance_distance: f64,
}

impl ClashFilter {
    /// Create a new filter with default settings.
    pub fn new() -> Self {
        Self::default()
    }

    /// Set clearance distance for soft clash detection.
    pub fn with_clearance(mut self, distance: f64) -> Self {
        self.clearance_distance = distance;
        self
    }

    /// Ignore clashes between same element types.
    pub fn ignore_same_type(mut self) -> Self {
        self.ignore_same_type = true;
        self
    }

    /// Only check clashes between specific types.
    pub fn between_types(mut self, types_a: Vec<&str>, types_b: Vec<&str>) -> Self {
        self.types_a = types_a.into_iter().map(|s| s.to_string()).collect();
        self.types_b = types_b.into_iter().map(|s| s.to_string()).collect();
        self
    }

    /// Check if a pair of elements should be tested according to this filter.
    fn should_test(&self, a: &ClashElement, b: &ClashElement) -> bool {
        // Check same type filter
        if self.ignore_same_type && a.element_type == b.element_type {
            return false;
        }

        // Check type filters
        if !self.types_a.is_empty() && !self.types_a.contains(&a.element_type) {
            return false;
        }
        if !self.types_b.is_empty() && !self.types_b.contains(&b.element_type) {
            return false;
        }

        true
    }
}

/// Clash detector with configurable tolerance.
pub struct ClashDetector {
    /// Tolerance for considering overlapping bounding boxes (meters).
    tolerance: f64,
    /// Filter for clash detection.
    filter: ClashFilter,
}

impl ClashDetector {
    /// Create a new clash detector with given tolerance.
    pub fn new(tolerance: f64) -> Self {
        Self {
            tolerance,
            filter: ClashFilter::default(),
        }
    }

    /// Set the clash filter.
    pub fn with_filter(mut self, filter: ClashFilter) -> Self {
        self.filter = filter;
        self
    }

    /// Detect clashes within a single list of elements.
    ///
    /// Checks all pairs (n*(n-1)/2 comparisons) with broad-phase AABB filtering.
    pub fn detect_clashes_in_list(&self, elements: &[ClashElement]) -> Vec<Clash> {
        let mut clashes = Vec::new();

        for i in 0..elements.len() {
            for j in (i + 1)..elements.len() {
                let a = &elements[i];
                let b = &elements[j];

                // Apply filter
                if !self.filter.should_test(a, b) {
                    continue;
                }

                // Check for clash
                if let Some(clash) = self.check_pair(a, b) {
                    clashes.push(clash);
                }
            }
        }

        clashes
    }

    /// Detect clashes between two sets of elements.
    ///
    /// Checks all pairs between set A and set B (n*m comparisons).
    pub fn detect_clashes_between(
        &self,
        set_a: &[ClashElement],
        set_b: &[ClashElement],
    ) -> Vec<Clash> {
        let mut clashes = Vec::new();

        for a in set_a {
            for b in set_b {
                // Skip same element
                if a.id == b.id {
                    continue;
                }

                // Apply filter
                if !self.filter.should_test(a, b) {
                    continue;
                }

                // Check for clash
                if let Some(clash) = self.check_pair(a, b) {
                    clashes.push(clash);
                }
            }
        }

        clashes
    }

    /// Check a single pair of elements for clash.
    fn check_pair(&self, a: &ClashElement, b: &ClashElement) -> Option<Clash> {
        // Get bounding boxes
        let bbox_a = &a.bbox;
        let bbox_b = &b.bbox;

        // Check for duplicate (nearly identical bounding boxes)
        if self.are_duplicates(bbox_a, bbox_b) {
            let center = bbox_a.center();
            return Some(Clash::new(
                a.id,
                b.id,
                &a.element_type,
                &b.element_type,
                ClashType::Duplicate,
                [center.x, center.y, center.z],
                0.0,
            ));
        }

        // Check for hard clash (bounding box intersection)
        if let Some((overlap_point, overlap_volume)) = self.bbox_intersection(bbox_a, bbox_b) {
            return Some(
                Clash::new(
                    a.id,
                    b.id,
                    &a.element_type,
                    &b.element_type,
                    ClashType::Hard,
                    overlap_point,
                    0.0, // penetration depth would require mesh analysis
                )
                .with_overlap_volume(overlap_volume),
            );
        }

        // Check for soft clash (clearance violation)
        if self.filter.clearance_distance > 0.0 {
            if let Some((closest_point, distance)) =
                self.clearance_violation(bbox_a, bbox_b, self.filter.clearance_distance)
            {
                return Some(Clash::new(
                    a.id,
                    b.id,
                    &a.element_type,
                    &b.element_type,
                    ClashType::Clearance,
                    closest_point,
                    distance,
                ));
            }
        }

        None
    }

    /// Check if two bounding boxes are nearly identical (potential duplicates).
    fn are_duplicates(&self, a: &BoundingBox3, b: &BoundingBox3) -> bool {
        let tol = self.tolerance;

        (a.min.x - b.min.x).abs() < tol
            && (a.min.y - b.min.y).abs() < tol
            && (a.min.z - b.min.z).abs() < tol
            && (a.max.x - b.max.x).abs() < tol
            && (a.max.y - b.max.y).abs() < tol
            && (a.max.z - b.max.z).abs() < tol
    }

    /// Check if two bounding boxes intersect and return overlap info.
    fn bbox_intersection(
        &self,
        a: &BoundingBox3,
        b: &BoundingBox3,
    ) -> Option<([f64; 3], f64)> {
        // Check for overlap in each axis
        let overlap_x = (a.max.x.min(b.max.x) - a.min.x.max(b.min.x)).max(0.0);
        let overlap_y = (a.max.y.min(b.max.y) - a.min.y.max(b.min.y)).max(0.0);
        let overlap_z = (a.max.z.min(b.max.z) - a.min.z.max(b.min.z)).max(0.0);

        // If any dimension has no overlap, boxes don't intersect
        if overlap_x <= self.tolerance
            || overlap_y <= self.tolerance
            || overlap_z <= self.tolerance
        {
            return None;
        }

        // Calculate overlap volume
        let volume = overlap_x * overlap_y * overlap_z;

        // Calculate center of overlap region
        let center_x = (a.min.x.max(b.min.x) + a.max.x.min(b.max.x)) / 2.0;
        let center_y = (a.min.y.max(b.min.y) + a.max.y.min(b.max.y)) / 2.0;
        let center_z = (a.min.z.max(b.min.z) + a.max.z.min(b.max.z)) / 2.0;

        Some(([center_x, center_y, center_z], volume))
    }

    /// Check for clearance violation between non-intersecting bounding boxes.
    fn clearance_violation(
        &self,
        a: &BoundingBox3,
        b: &BoundingBox3,
        min_clearance: f64,
    ) -> Option<([f64; 3], f64)> {
        // Calculate gap in each axis
        let gap_x = if a.max.x < b.min.x {
            b.min.x - a.max.x
        } else if b.max.x < a.min.x {
            a.min.x - b.max.x
        } else {
            0.0 // overlapping in this axis
        };

        let gap_y = if a.max.y < b.min.y {
            b.min.y - a.max.y
        } else if b.max.y < a.min.y {
            a.min.y - b.max.y
        } else {
            0.0
        };

        let gap_z = if a.max.z < b.min.z {
            b.min.z - a.max.z
        } else if b.max.z < a.min.z {
            a.min.z - b.max.z
        } else {
            0.0
        };

        // Calculate minimum distance between boxes
        let distance = (gap_x * gap_x + gap_y * gap_y + gap_z * gap_z).sqrt();

        // If boxes overlap (distance ~= 0), this isn't a clearance violation
        if distance < self.tolerance {
            return None;
        }

        // Check if within clearance threshold
        if distance < min_clearance {
            // Calculate closest point (midpoint between closest faces)
            let closest_x = if gap_x > 0.0 {
                (a.max.x + b.min.x) / 2.0
            } else {
                (a.min.x.max(b.min.x) + a.max.x.min(b.max.x)) / 2.0
            };
            let closest_y = if gap_y > 0.0 {
                (a.max.y + b.min.y) / 2.0
            } else {
                (a.min.y.max(b.min.y) + a.max.y.min(b.max.y)) / 2.0
            };
            let closest_z = if gap_z > 0.0 {
                (a.max.z + b.min.z) / 2.0
            } else {
                (a.min.z.max(b.min.z) + a.max.z.min(b.max.z)) / 2.0
            };

            return Some(([closest_x, closest_y, closest_z], distance));
        }

        None
    }
}

impl Default for ClashDetector {
    fn default() -> Self {
        Self::new(0.001) // 1mm default tolerance
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pensaer_math::Point3;

    fn make_bbox(min: [f64; 3], max: [f64; 3]) -> BoundingBox3 {
        BoundingBox3::new(
            Point3::new(min[0], min[1], min[2]),
            Point3::new(max[0], max[1], max[2]),
        )
    }

    fn make_element(id: &str, element_type: &str, min: [f64; 3], max: [f64; 3]) -> ClashElement {
        ClashElement::new(
            Uuid::parse_str(id).unwrap_or_else(|_| Uuid::new_v4()),
            element_type,
            make_bbox(min, max),
        )
    }

    #[test]
    fn no_clash_separate_elements() {
        let detector = ClashDetector::new(0.001);

        let elements = vec![
            make_element(
                "00000000-0000-0000-0000-000000000001",
                "wall",
                [0.0, 0.0, 0.0],
                [1.0, 0.2, 3.0],
            ),
            make_element(
                "00000000-0000-0000-0000-000000000002",
                "wall",
                [5.0, 0.0, 0.0],
                [6.0, 0.2, 3.0],
            ),
        ];

        let clashes = detector.detect_clashes_in_list(&elements);
        assert!(clashes.is_empty());
    }

    #[test]
    fn hard_clash_overlapping_boxes() {
        let detector = ClashDetector::new(0.001);

        let elements = vec![
            make_element(
                "00000000-0000-0000-0000-000000000001",
                "wall",
                [0.0, 0.0, 0.0],
                [2.0, 0.2, 3.0],
            ),
            make_element(
                "00000000-0000-0000-0000-000000000002",
                "wall",
                [1.0, 0.0, 0.0],
                [3.0, 0.2, 3.0],
            ),
        ];

        let clashes = detector.detect_clashes_in_list(&elements);
        assert_eq!(clashes.len(), 1);
        assert_eq!(clashes[0].clash_type, ClashType::Hard);
        assert!(clashes[0].overlap_volume > 0.0);
    }

    #[test]
    fn duplicate_detection() {
        let detector = ClashDetector::new(0.001);

        let elements = vec![
            make_element(
                "00000000-0000-0000-0000-000000000001",
                "wall",
                [0.0, 0.0, 0.0],
                [2.0, 0.2, 3.0],
            ),
            make_element(
                "00000000-0000-0000-0000-000000000002",
                "wall",
                [0.0, 0.0, 0.0],
                [2.0, 0.2, 3.0],
            ),
        ];

        let clashes = detector.detect_clashes_in_list(&elements);
        assert_eq!(clashes.len(), 1);
        assert_eq!(clashes[0].clash_type, ClashType::Duplicate);
    }

    #[test]
    fn clearance_violation() {
        let filter = ClashFilter::new().with_clearance(0.5); // 50cm clearance
        let detector = ClashDetector::new(0.001).with_filter(filter);

        let elements = vec![
            make_element(
                "00000000-0000-0000-0000-000000000001",
                "wall",
                [0.0, 0.0, 0.0],
                [1.0, 0.2, 3.0],
            ),
            make_element(
                "00000000-0000-0000-0000-000000000002",
                "wall",
                [1.3, 0.0, 0.0], // 30cm gap - violates 50cm clearance
                [2.3, 0.2, 3.0],
            ),
        ];

        let clashes = detector.detect_clashes_in_list(&elements);
        assert_eq!(clashes.len(), 1);
        assert_eq!(clashes[0].clash_type, ClashType::Clearance);
        assert!(clashes[0].distance < 0.5);
    }

    #[test]
    fn filter_same_type() {
        let filter = ClashFilter::new().ignore_same_type();
        let detector = ClashDetector::new(0.001).with_filter(filter);

        let elements = vec![
            make_element(
                "00000000-0000-0000-0000-000000000001",
                "wall",
                [0.0, 0.0, 0.0],
                [2.0, 0.2, 3.0],
            ),
            make_element(
                "00000000-0000-0000-0000-000000000002",
                "wall",
                [1.0, 0.0, 0.0],
                [3.0, 0.2, 3.0],
            ),
        ];

        let clashes = detector.detect_clashes_in_list(&elements);
        assert!(clashes.is_empty()); // Same type ignored
    }

    #[test]
    fn between_sets_detects_clashes() {
        let detector = ClashDetector::new(0.001);

        let walls = vec![make_element(
            "00000000-0000-0000-0000-000000000001",
            "wall",
            [0.0, 0.0, 0.0],
            [2.0, 0.2, 3.0],
        )];

        let doors = vec![make_element(
            "00000000-0000-0000-0000-000000000002",
            "door",
            [0.5, 0.0, 0.0], // Door overlaps wall
            [1.5, 0.2, 2.1],
        )];

        let clashes = detector.detect_clashes_between(&walls, &doors);
        assert_eq!(clashes.len(), 1);
        assert_eq!(clashes[0].element_a_type, "wall");
        assert_eq!(clashes[0].element_b_type, "door");
    }
}
