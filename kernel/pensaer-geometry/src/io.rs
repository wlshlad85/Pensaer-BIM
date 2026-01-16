//! I/O utilities for deterministic JSON serialization.
//!
//! All geometry data is quantized at API boundaries to ensure:
//! 1. Deterministic output (same input → identical bytes)
//! 2. No floating point accumulation errors
//! 3. Stable diffs for version control
//!
//! # Quantization Rules
//! - Coordinates: rounded to 0.01 mm (QUANTIZE_PRECISION)
//! - IDs: sorted alphabetically for stable ordering
//! - Arrays: sorted by a deterministic key

use crate::constants::{quantize, quantize_point2, quantize_point3};
use serde_json::{json, Map, Value};

/// Quantize all numeric values in a JSON Value recursively.
///
/// This ensures deterministic output regardless of floating point
/// representation differences across platforms.
pub fn quantize_json(value: &Value) -> Value {
    match value {
        Value::Number(n) => {
            if let Some(f) = n.as_f64() {
                // Quantize and re-encode
                let q = quantize(f);
                // Avoid -0.0
                let q = if q == 0.0 { 0.0 } else { q };
                json!(q)
            } else {
                value.clone()
            }
        }
        Value::Array(arr) => {
            Value::Array(arr.iter().map(quantize_json).collect())
        }
        Value::Object(obj) => {
            let mut new_obj = Map::new();
            for (k, v) in obj {
                new_obj.insert(k.clone(), quantize_json(v));
            }
            Value::Object(new_obj)
        }
        _ => value.clone(),
    }
}

/// Sort object keys and array elements for deterministic output.
///
/// # Sorting Rules
/// - Object keys: alphabetical
/// - Arrays of objects with "id" field: sorted by id
/// - Other arrays: preserved order (assumed intentional)
pub fn sort_for_determinism(value: &Value) -> Value {
    match value {
        Value::Object(obj) => {
            // Sort keys alphabetically
            let mut sorted: Vec<_> = obj.iter().collect();
            sorted.sort_by(|(a, _), (b, _)| a.cmp(b));

            let mut new_obj = Map::new();
            for (k, v) in sorted {
                new_obj.insert(k.clone(), sort_for_determinism(v));
            }
            Value::Object(new_obj)
        }
        Value::Array(arr) => {
            // Check if this is an array of objects with "id" fields
            let all_have_id = arr.iter().all(|v| {
                v.as_object()
                    .map(|o| o.contains_key("id"))
                    .unwrap_or(false)
            });

            if all_have_id && !arr.is_empty() {
                // Sort by id
                let mut sorted: Vec<_> = arr.iter().map(sort_for_determinism).collect();
                sorted.sort_by(|a, b| {
                    let id_a = a.get("id").and_then(|v| v.as_str()).unwrap_or("");
                    let id_b = b.get("id").and_then(|v| v.as_str()).unwrap_or("");
                    id_a.cmp(id_b)
                });
                Value::Array(sorted)
            } else {
                // Preserve order, just recurse
                Value::Array(arr.iter().map(sort_for_determinism).collect())
            }
        }
        _ => value.clone(),
    }
}

/// Prepare a JSON value for API output.
/// Applies both quantization and deterministic sorting.
pub fn prepare_output(value: &Value) -> Value {
    sort_for_determinism(&quantize_json(value))
}

/// Quantize incoming API parameters.
/// Only quantizes numeric values, preserves structure.
pub fn prepare_input(value: &Value) -> Value {
    quantize_json(value)
}

/// Serialize to deterministic JSON string.
/// Uses 2-space indentation for readability.
pub fn to_deterministic_json(value: &Value) -> String {
    let prepared = prepare_output(value);
    serde_json::to_string_pretty(&prepared).unwrap_or_else(|_| "{}".to_string())
}

/// Serialize to compact deterministic JSON (no whitespace).
pub fn to_deterministic_json_compact(value: &Value) -> String {
    let prepared = prepare_output(value);
    serde_json::to_string(&prepared).unwrap_or_else(|_| "{}".to_string())
}

/// Helper: quantize a point from JSON params.
pub fn extract_point2(value: &Value) -> Option<[f64; 2]> {
    if let Value::Array(arr) = value {
        if arr.len() >= 2 {
            let x = arr[0].as_f64()?;
            let y = arr[1].as_f64()?;
            return Some(quantize_point2([x, y]));
        }
    }
    if let Value::Object(obj) = value {
        let x = obj.get("x").and_then(|v| v.as_f64())?;
        let y = obj.get("y").and_then(|v| v.as_f64())?;
        return Some(quantize_point2([x, y]));
    }
    None
}

/// Helper: quantize a point from JSON params.
pub fn extract_point3(value: &Value) -> Option<[f64; 3]> {
    if let Value::Array(arr) = value {
        if arr.len() >= 3 {
            let x = arr[0].as_f64()?;
            let y = arr[1].as_f64()?;
            let z = arr[2].as_f64()?;
            return Some(quantize_point3([x, y, z]));
        }
    }
    if let Value::Object(obj) = value {
        let x = obj.get("x").and_then(|v| v.as_f64())?;
        let y = obj.get("y").and_then(|v| v.as_f64())?;
        let z = obj.get("z").and_then(|v| v.as_f64()).unwrap_or(0.0);
        return Some(quantize_point3([x, y, z]));
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn quantize_json_works() {
        let input = json!({
            "x": 0.123456789,
            "y": 0.125,
            "nested": {
                "z": 1000.001
            }
        });

        let output = quantize_json(&input);

        assert_eq!(output["x"], 0.12);
        assert_eq!(output["y"], 0.13); // 0.125 rounds to 0.13
        assert_eq!(output["nested"]["z"], 1000.0);
    }

    #[test]
    fn sort_for_determinism_works() {
        let input = json!({
            "z": 1,
            "a": 2,
            "m": 3
        });

        let output = to_deterministic_json_compact(&input);

        // Keys should be in alphabetical order
        assert!(output.find("\"a\"").unwrap() < output.find("\"m\"").unwrap());
        assert!(output.find("\"m\"").unwrap() < output.find("\"z\"").unwrap());
    }

    #[test]
    fn array_of_objects_sorted_by_id() {
        let input = json!([
            {"id": "c", "value": 3},
            {"id": "a", "value": 1},
            {"id": "b", "value": 2}
        ]);

        let output = sort_for_determinism(&input);
        let arr = output.as_array().unwrap();

        assert_eq!(arr[0]["id"], "a");
        assert_eq!(arr[1]["id"], "b");
        assert_eq!(arr[2]["id"], "c");
    }

    #[test]
    fn extract_point2_from_array() {
        let input = json!([1.234, 5.678]);
        let point = extract_point2(&input).unwrap();
        assert_eq!(point, [1.23, 5.68]);
    }

    #[test]
    fn extract_point2_from_object() {
        let input = json!({"x": 1.234, "y": 5.678});
        let point = extract_point2(&input).unwrap();
        assert_eq!(point, [1.23, 5.68]);
    }

    #[test]
    fn round_trip_is_stable() {
        let input = json!({
            "walls": [
                {"id": "w2", "start": [0.0, 0.0], "end": [5000.0, 0.0]},
                {"id": "w1", "start": [5000.0, 0.0], "end": [5000.0, 3000.0]}
            ],
            "tolerance": 0.5
        });

        let output1 = to_deterministic_json_compact(&input);
        let parsed: Value = serde_json::from_str(&output1).unwrap();
        let output2 = to_deterministic_json_compact(&parsed);

        // Round-trip should be byte-identical
        assert_eq!(output1, output2);
    }

    #[test]
    fn negative_zero_avoided() {
        let input = json!(-0.0);
        let output = quantize_json(&input);

        // Should be positive zero, not -0.0
        let s = serde_json::to_string(&output).unwrap();
        assert!(!s.contains("-0"));
    }
}
