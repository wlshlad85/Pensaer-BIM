"""
Agent tools: NL→DSL translation, model analysis, batch operations.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import UUID, uuid4

from .state import ActionResult, PlannedAction, OperationType


# --- Natural Language → DSL Translation ---

# DSL keyword mapping from the Pensaer DSL (server/app/pensaer/dsl/)
NL_TO_DSL_PATTERNS: dict[str, str] = {
    "create a wall": "WALL",
    "add a wall": "WALL",
    "place a door": "DOOR",
    "add a door": "DOOR",
    "place a window": "WINDOW",
    "add a window": "WINDOW",
    "create a floor": "FLOOR",
    "add a column": "COLUMN",
    "create a column": "COLUMN",
    "create a roof": "ROOF",
}

NL_PARAM_PATTERNS: dict[str, str] = {
    "from": "start",
    "to": "end",
    "height": "height",
    "thick": "thickness",
    "wide": "width",
    "at": "location",
    "on level": "level_id",
    "type": "wall_type",
}


@dataclass
class DSLTranslation:
    """Result of NL → DSL translation."""
    original_text: str = ""
    dsl_command: str = ""
    tool_name: str = ""
    parameters: dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0
    ambiguous: bool = False
    clarification_needed: str | None = None


def translate_nl_to_dsl(text: str) -> DSLTranslation:
    """
    Translate natural language to Pensaer DSL.
    Returns a DSLTranslation with confidence score.
    If ambiguous, sets clarification_needed per soul_agent.md escalation.
    """
    text_lower = text.lower().strip()
    result = DSLTranslation(original_text=text)

    # Match against known patterns
    matched = False
    for pattern, dsl_type in NL_TO_DSL_PATTERNS.items():
        if pattern in text_lower:
            result.dsl_command = dsl_type
            result.confidence = 0.8
            matched = True
            break

    if not matched:
        result.ambiguous = True
        result.confidence = 0.0
        result.clarification_needed = "Could not parse intent. Please specify the element type and parameters."
        return result

    # Map tool name
    dsl_to_tool = {
        "WALL": "create_wall",
        "DOOR": "place_door",
        "WINDOW": "place_window",
        "FLOOR": "create_floor",
        "COLUMN": "create_column",
        "ROOF": "create_roof",
    }
    result.tool_name = dsl_to_tool.get(result.dsl_command, "")
    return result


# --- Model Analysis ---

@dataclass
class AnalysisResult:
    """Result from model analysis tools."""
    analysis_type: str = ""
    findings: list[dict[str, Any]] = field(default_factory=list)
    summary: str = ""
    severity: str = "info"  # info, warning, error, critical


def plan_room_analysis(room_id: UUID) -> list[PlannedAction]:
    """Plan a comprehensive room analysis."""
    return [
        PlannedAction(
            tool_name="room_analysis",
            parameters={"room_id": str(room_id)},
            operation_type=OperationType.READ,
            reasoning="Analyzing room properties (area, volume, adjacencies)",
        ),
        PlannedAction(
            tool_name="accessibility_check",
            parameters={"model_id": str(room_id), "standard": "both"},
            operation_type=OperationType.VALIDATE,
            reasoning="Checking accessibility compliance for room",
        ),
    ]


def plan_clash_detection(source_category: str, target_category: str, tolerance: int = 10) -> list[PlannedAction]:
    """Plan clash detection between element categories."""
    return [
        PlannedAction(
            tool_name="clash_detection",
            parameters={
                "source_category": source_category,
                "target_category": target_category,
                "tolerance": tolerance,
            },
            operation_type=OperationType.READ,
            reasoning=f"Detecting clashes between {source_category} and {target_category}",
        ),
    ]


def plan_compliance_check(model_id: UUID, standard: str, severity: str = "warning") -> list[PlannedAction]:
    """Plan a code compliance check."""
    return [
        PlannedAction(
            tool_name="code_compliance",
            parameters={
                "model_id": str(model_id),
                "standard": standard,
                "severity_threshold": severity,
            },
            operation_type=OperationType.READ,
            reasoning=f"Running {standard} compliance check at {severity} threshold",
        ),
    ]


# --- Batch Operations with Rollback ---

@dataclass
class BatchOperation:
    """A batch of related actions with rollback support."""
    batch_id: UUID = field(default_factory=uuid4)
    actions: list[PlannedAction] = field(default_factory=list)
    committed_event_ids: list[UUID] = field(default_factory=list)
    rollback_actions: list[PlannedAction] = field(default_factory=list)
    status: str = "pending"  # pending, executing, committed, rolled_back, failed

    @property
    def element_count(self) -> int:
        return sum(max(a.affected_element_count, 1) for a in self.actions)

    def add_action(self, action: PlannedAction) -> None:
        self.actions.append(action)
        # Auto-generate rollback for create operations
        if action.operation_type == OperationType.CREATE:
            self.rollback_actions.append(PlannedAction(
                tool_name="delete_element",
                parameters={"element_id": "pending"},  # Filled after commit
                operation_type=OperationType.DELETE,
                reasoning=f"Rollback of {action.tool_name}",
            ))

    def mark_committed(self, event_ids: list[UUID]) -> None:
        self.committed_event_ids = event_ids
        self.status = "committed"

    def mark_rolled_back(self) -> None:
        self.status = "rolled_back"

    def mark_failed(self) -> None:
        self.status = "failed"
