"""
Agent state machine for LangGraph orchestration.
Implements plan → execute → validate → commit cycle.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4


class AgentPhase(str, Enum):
    """Phases in the agent execution cycle."""
    PLAN = "plan"
    EXECUTE = "execute"
    VALIDATE = "validate"
    COMMIT = "commit"
    AWAITING_APPROVAL = "awaiting_approval"
    ESCALATED = "escalated"
    COMPLETED = "completed"
    FAILED = "failed"


class OperationType(str, Enum):
    READ = "read"
    CREATE = "create"
    MODIFY = "modify"
    DELETE = "delete"
    EXPORT = "export"
    VALIDATE = "validate"


@dataclass
class PermissionScope:
    """Defines what an agent is allowed to touch."""
    categories: list[str] | None = None
    levels: list[str] | None = None
    branch_patterns: list[str] | None = None


@dataclass
class AgentPermissions:
    agent_id: UUID
    permissions: dict[str, PermissionScope] = field(default_factory=dict)
    requires_approval: list[str] = field(default_factory=list)
    max_elements_per_operation: int = 100
    max_operations_per_session: int = 1000


@dataclass
class PlannedAction:
    """A single planned action within an agent workflow."""
    action_id: UUID = field(default_factory=uuid4)
    tool_name: str = ""
    server: str = ""
    parameters: dict[str, Any] = field(default_factory=dict)
    operation_type: OperationType = OperationType.READ
    reasoning: str = ""
    dry_run: bool = True
    affected_element_count: int = 0


@dataclass
class ActionResult:
    action_id: UUID = field(default_factory=uuid4)
    success: bool = False
    data: dict[str, Any] = field(default_factory=dict)
    event_id: UUID | None = None
    warnings: list[str] = field(default_factory=list)
    error: str | None = None


@dataclass
class AgentState:
    """
    Complete state for a LangGraph agent workflow.
    Immutable transitions — each phase produces a new state.
    """
    session_id: UUID = field(default_factory=uuid4)
    agent_id: UUID = field(default_factory=uuid4)
    branch_id: UUID = field(default_factory=uuid4)
    phase: AgentPhase = AgentPhase.PLAN
    permissions: AgentPermissions | None = None

    # User request
    user_request: str = ""
    parsed_intent: dict[str, Any] = field(default_factory=dict)

    # Plan
    planned_actions: list[PlannedAction] = field(default_factory=list)

    # Execution
    dry_run_results: list[ActionResult] = field(default_factory=list)
    execution_results: list[ActionResult] = field(default_factory=list)

    # Validation
    validation_results: list[dict[str, Any]] = field(default_factory=list)
    validation_passed: bool = False

    # Governance
    approval_required: bool = False
    approval_reason: str | None = None
    approval_granted: bool = False
    escalation_reason: str | None = None

    # Audit
    events: list[dict[str, Any]] = field(default_factory=list)
    operation_count: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def transition(self, new_phase: AgentPhase) -> "AgentState":
        """Record phase transition in event log."""
        self.events.append({
            "type": "phase_transition",
            "from": self.phase.value,
            "to": new_phase.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        self.phase = new_phase
        return self

    def determinism_hash(self) -> str:
        """Hash of input state for determinism verification."""
        content = json.dumps({
            "user_request": self.user_request,
            "branch_id": str(self.branch_id),
            "planned_actions": [
                {"tool": a.tool_name, "params": a.parameters}
                for a in self.planned_actions
            ],
        }, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()


# Tool routing table: tool_name → MCP server
TOOL_ROUTING: dict[str, str] = {
    # Geometry server
    "create_wall": "geometry",
    "create_floor": "geometry",
    "create_roof": "geometry",
    "create_column": "geometry",
    "create_opening": "geometry",
    "place_door": "geometry",
    "place_window": "geometry",
    "boolean_operation": "geometry",
    "join_elements": "geometry",
    "modify_parameter": "geometry",
    "move_element": "geometry",
    "copy_element": "geometry",
    # Spatial server
    "room_analysis": "spatial",
    "circulation_check": "spatial",
    "adjacency_matrix": "spatial",
    "spatial_query": "spatial",
    "path_finding": "spatial",
    "bounding_analysis": "spatial",
    "level_elements": "spatial",
    "relationship_query": "spatial",
    # Validation server
    "clash_detection": "validation",
    "code_compliance": "validation",
    "accessibility_check": "validation",
    "validate_constraints": "validation",
    "fire_rating_check": "validation",
    "egress_analysis": "validation",
    "structural_check": "validation",
    "data_completeness": "validation",
    # Documentation server
    "generate_schedule": "documentation",
    "create_section": "documentation",
    "create_plan": "documentation",
    "quantity_takeoff": "documentation",
    "export_ifc": "documentation",
    "export_bcf": "documentation",
    "create_sheet": "documentation",
}


def route_tool(tool_name: str) -> str:
    """Route a tool name to its MCP server."""
    server = TOOL_ROUTING.get(tool_name)
    if server is None:
        raise ValueError(f"Unknown tool: {tool_name}")
    return server


# Operation type classification
MUTATING_TOOLS = {
    "create_wall", "create_floor", "create_roof", "create_column",
    "create_opening", "place_door", "place_window", "boolean_operation",
    "join_elements", "modify_parameter", "move_element", "copy_element",
    "generate_schedule", "create_section", "create_plan", "export_ifc",
    "export_bcf", "create_sheet",
}

DESTRUCTIVE_TOOLS = {"delete_element", "demolish_element"}

READ_ONLY_TOOLS = {
    "room_analysis", "circulation_check", "adjacency_matrix", "spatial_query",
    "path_finding", "bounding_analysis", "level_elements", "relationship_query",
    "clash_detection", "code_compliance", "accessibility_check",
    "validate_constraints", "fire_rating_check", "egress_analysis",
    "structural_check", "data_completeness", "quantity_takeoff",
}


def classify_operation(tool_name: str) -> OperationType:
    if tool_name in DESTRUCTIVE_TOOLS:
        return OperationType.DELETE
    if tool_name in MUTATING_TOOLS:
        if tool_name.startswith("create_") or tool_name.startswith("place_"):
            return OperationType.CREATE
        if tool_name.startswith("export_"):
            return OperationType.EXPORT
        return OperationType.MODIFY
    if tool_name in READ_ONLY_TOOLS:
        return OperationType.READ
    return OperationType.READ
