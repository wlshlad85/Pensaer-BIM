//! Command execution wrapper with automatic healing.
//!
//! Every mutating operation goes through `exec_and_heal`, which:
//! 1. Applies the operation
//! 2. Runs all fixup passes (snap, split, merge, rooms)
//! 3. Returns a delta describing what changed
//!
//! This ensures the model is always in a valid, healed state.
//!
//! # Example
//!
//! ```ignore
//! use pensaer_geometry::exec::{exec_and_heal, Context};
//! use serde_json::json;
//!
//! let mut ctx = Context::new();
//! let params = json!({
//!     "start": [0, 0],
//!     "end": [5000, 0],
//!     "height": 2700,
//!     "thickness": 200
//! });
//!
//! let result = exec_and_heal("add_wall", &params, &mut ctx)?;
//! // result contains the healed delta
//! ```

use crate::fixup::{self, Delta, Model};
use crate::io::{prepare_input, prepare_output};
use serde_json::Value;

/// Execution context containing the model and metadata.
pub struct Context {
    /// The geometry model
    pub model: Model,
    /// Session ID for audit logging
    pub session_id: Option<String>,
    /// User ID for audit logging
    pub user_id: Option<String>,
}

impl Context {
    /// Create a new empty context.
    pub fn new() -> Self {
        Self {
            model: Model { _placeholder: () },
            session_id: None,
            user_id: None,
        }
    }

    /// Create context with audit metadata.
    pub fn with_audit(session_id: String, user_id: String) -> Self {
        Self {
            model: Model { _placeholder: () },
            session_id: Some(session_id),
            user_id: Some(user_id),
        }
    }
}

impl Default for Context {
    fn default() -> Self {
        Self::new()
    }
}

/// Result of executing a command.
#[derive(Debug)]
pub struct ExecResult {
    /// Whether the operation succeeded
    pub success: bool,
    /// The delta describing what changed (if successful)
    pub delta: Option<Delta>,
    /// Error message (if failed)
    pub error: Option<String>,
    /// Additional data returned by the operation
    pub data: Option<Value>,
}

impl ExecResult {
    /// Create a successful result.
    pub fn ok(delta: Delta, data: Option<Value>) -> Self {
        Self {
            success: true,
            delta: Some(delta),
            error: None,
            data,
        }
    }

    /// Create an error result.
    pub fn err(message: impl Into<String>) -> Self {
        Self {
            success: false,
            delta: None,
            error: Some(message.into()),
            data: None,
        }
    }

    /// Convert to JSON response.
    pub fn to_json(&self) -> Value {
        if self.success {
            let mut result = serde_json::json!({
                "success": true,
                "delta": self.delta.as_ref().map(|d| d.to_json())
            });
            if let Some(data) = &self.data {
                result["data"] = data.clone();
            }
            prepare_output(&result)
        } else {
            serde_json::json!({
                "success": false,
                "error": self.error.as_deref().unwrap_or("Unknown error")
            })
        }
    }
}

/// Execute a command and heal the model.
///
/// This is the main entry point for all mutating operations.
/// It ensures deterministic input/output and automatic healing.
///
/// # Arguments
/// * `method` - The RPC method name (e.g., "add_wall", "move_node")
/// * `params` - The method parameters as JSON
/// * `ctx` - The execution context containing the model
///
/// # Returns
/// An `ExecResult` with the delta and any additional data
pub fn exec_and_heal(method: &str, params: &Value, ctx: &mut Context) -> ExecResult {
    // 1. Quantize input parameters
    let params = prepare_input(params);

    // 2. Dispatch to the appropriate handler
    let result = dispatch(method, &params, ctx);

    match result {
        Ok((delta, data)) => {
            // 3. Run healing passes
            fixup::heal_all(&mut ctx.model, &delta);

            // 4. Return healed result
            ExecResult::ok(delta, data)
        }
        Err(e) => ExecResult::err(e),
    }
}

/// Dispatch to the appropriate method handler.
///
/// Returns (Delta, Option<Value>) on success.
fn dispatch(
    method: &str,
    params: &Value,
    ctx: &mut Context,
) -> Result<(Delta, Option<Value>), String> {
    match method {
        "add_wall" => handle_add_wall(params, ctx),
        "move_node" => handle_move_node(params, ctx),
        "delete_element" => handle_delete_element(params, ctx),
        "solve_joins" => handle_solve_joins(params, ctx),
        _ => Err(format!("Unknown method: {}", method)),
    }
}

// ============================================================================
// Method Handlers (stubs for M0, implemented in M2)
// ============================================================================

fn handle_add_wall(params: &Value, _ctx: &mut Context) -> Result<(Delta, Option<Value>), String> {
    // TODO: Implement in M2
    // 1. Parse start, end, height, thickness from params
    // 2. Create or find start/end nodes
    // 3. Create wall edge between nodes
    // 4. Return delta with created IDs

    let _start = params.get("start").ok_or("Missing 'start' parameter")?;
    let _end = params.get("end").ok_or("Missing 'end' parameter")?;

    let delta = Delta {
        created: vec!["wall_placeholder".to_string()],
        modified: vec![],
        deleted: vec![],
        affected_nodes: vec![],
    };

    let data = serde_json::json!({
        "wall_id": "wall_placeholder",
        "message": "add_wall stub - implement in M2"
    });

    Ok((delta, Some(data)))
}

fn handle_move_node(params: &Value, _ctx: &mut Context) -> Result<(Delta, Option<Value>), String> {
    // TODO: Implement in M2
    let _node_id = params.get("node_id").ok_or("Missing 'node_id' parameter")?;
    let _position = params
        .get("position")
        .ok_or("Missing 'position' parameter")?;

    let delta = Delta {
        created: vec![],
        modified: vec!["node_placeholder".to_string()],
        deleted: vec![],
        affected_nodes: vec!["node_placeholder".to_string()],
    };

    Ok((delta, None))
}

fn handle_delete_element(
    params: &Value,
    _ctx: &mut Context,
) -> Result<(Delta, Option<Value>), String> {
    // TODO: Implement in M2
    let _element_id = params
        .get("element_id")
        .ok_or("Missing 'element_id' parameter")?;

    let delta = Delta {
        created: vec![],
        modified: vec![],
        deleted: vec!["element_placeholder".to_string()],
        affected_nodes: vec![],
    };

    Ok((delta, None))
}

fn handle_solve_joins(
    _params: &Value,
    _ctx: &mut Context,
) -> Result<(Delta, Option<Value>), String> {
    // TODO: Implement in M2
    // This triggers a full heal pass on all walls
    let delta = Delta::default();

    let data = serde_json::json!({
        "joins_resolved": 0,
        "message": "solve_joins stub - implement in M2"
    });

    Ok((delta, Some(data)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn exec_and_heal_unknown_method() {
        let mut ctx = Context::new();
        let result = exec_and_heal("unknown_method", &json!({}), &mut ctx);

        assert!(!result.success);
        assert!(result.error.unwrap().contains("Unknown method"));
    }

    #[test]
    fn exec_and_heal_add_wall_stub() {
        let mut ctx = Context::new();
        let params = json!({
            "start": [0, 0],
            "end": [5000, 0],
            "height": 2700,
            "thickness": 200
        });

        let result = exec_and_heal("add_wall", &params, &mut ctx);

        assert!(result.success);
        assert!(result.delta.is_some());
        assert_eq!(result.delta.as_ref().unwrap().created.len(), 1);
    }

    #[test]
    fn exec_and_heal_missing_params() {
        let mut ctx = Context::new();
        let params = json!({}); // Missing required params

        let result = exec_and_heal("add_wall", &params, &mut ctx);

        assert!(!result.success);
        assert!(result.error.unwrap().contains("Missing"));
    }

    #[test]
    fn exec_result_to_json_success() {
        let delta = Delta {
            created: vec!["w1".to_string()],
            modified: vec![],
            deleted: vec![],
            affected_nodes: vec![],
        };
        let result = ExecResult::ok(delta, Some(json!({"wall_id": "w1"})));
        let json = result.to_json();

        assert_eq!(json["success"], true);
        assert!(json["delta"].is_object());
        assert!(json["data"].is_object());
    }

    #[test]
    fn exec_result_to_json_error() {
        let result = ExecResult::err("Something went wrong");
        let json = result.to_json();

        assert_eq!(json["success"], false);
        assert_eq!(json["error"], "Something went wrong");
    }

    #[test]
    fn context_with_audit() {
        let ctx = Context::with_audit("sess123".to_string(), "user456".to_string());

        assert_eq!(ctx.session_id, Some("sess123".to_string()));
        assert_eq!(ctx.user_id, Some("user456".to_string()));
    }
}
