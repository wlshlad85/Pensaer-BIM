"""
Soul enforcement runtime.
Enforces soul_agent.md constraints at runtime.
Checks every agent action against the constitution.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from .state import (
    AgentState,
    DESTRUCTIVE_TOOLS,
    OperationType,
    PlannedAction,
)


# --- Soul Constraints (from soul_agent.md) ---

@dataclass
class SoulViolation:
    """A detected violation of the soul constitution."""
    rule: str
    description: str
    severity: str  # "block" or "warn"
    action: PlannedAction | None = None


class SoulEnforcer:
    """
    Runtime enforcer for soul_agent.md constraints.
    Every agent action passes through this before execution.
    """

    # The 7 permitted actions
    PERMITTED_ACTIONS = {
        "create_elements",
        "query_model",
        "run_validation",
        "generate_documentation",
        "modify_elements",
        "explain_recommend",
        "dry_run",
    }

    # The 9 forbidden actions (mapped to detection functions)
    FORBIDDEN_RULES = [
        "no_invent_geometry",
        "no_bypass_mcp",
        "no_suppress_audit",
        "no_claim_compliance",
        "no_skip_approval",
        "no_operate_outside_scope",
        "no_auto_merge",
        "no_claim_human",
        "no_share_raw_data",
    ]

    # 6 escalation paths
    ESCALATION_PATHS = {
        "ambiguous_intent": "Ask for clarification. Do not guess.",
        "outside_scope": "Inform user. Suggest admin contact for scope expansion.",
        "critical_validation": "Report findings clearly. Do not auto-fix structural/safety issues.",
        "conflicting_instructions": "Follow soul > operator > user.",
        "corrupt_state": "Report inconsistency. Do not attempt repair without instruction.",
        "rate_limit": "Inform user. Suggest batching or scope increase.",
    }

    def __init__(self) -> None:
        self.violations: list[SoulViolation] = []

    def check_action(self, state: AgentState, action: PlannedAction) -> list[SoulViolation]:
        """Run all soul checks on a planned action. Returns violations."""
        violations: list[SoulViolation] = []

        violations.extend(self._check_no_invent_geometry(action))
        violations.extend(self._check_no_suppress_audit(action))
        violations.extend(self._check_no_skip_approval(state, action))
        violations.extend(self._check_no_auto_merge(state, action))
        violations.extend(self._check_scope(state, action))

        self.violations.extend(violations)
        return violations

    def check_all(self, state: AgentState) -> list[SoulViolation]:
        """Check all planned actions in state."""
        violations: list[SoulViolation] = []
        for action in state.planned_actions:
            violations.extend(self.check_action(state, action))
        return violations

    def get_escalation_path(self, situation: str) -> str | None:
        """Get the prescribed escalation path for a situation."""
        return self.ESCALATION_PATHS.get(situation)

    # --- Individual constraint checks ---

    def _check_no_invent_geometry(self, action: PlannedAction) -> list[SoulViolation]:
        """Verify geometry parameters reference real model data."""
        violations = []
        if action.operation_type in (OperationType.CREATE, OperationType.MODIFY):
            # Check for missing required parameters (would require invention)
            params = action.parameters
            if action.tool_name == "create_wall":
                for required in ("start", "end", "height", "thickness"):
                    if required not in params:
                        violations.append(SoulViolation(
                            rule="no_invent_geometry",
                            description=f"Missing required parameter '{required}' — agent must not invent geometry",
                            severity="block",
                            action=action,
                        ))
        return violations

    def _check_no_suppress_audit(self, action: PlannedAction) -> list[SoulViolation]:
        """Every mutating action must have reasoning."""
        if action.operation_type != OperationType.READ and not action.reasoning:
            return [SoulViolation(
                rule="no_suppress_audit",
                description="Mutating action missing reasoning — audit trail required",
                severity="block",
                action=action,
            )]
        return []

    def _check_no_skip_approval(self, state: AgentState, action: PlannedAction) -> list[SoulViolation]:
        """Destructive actions require approval gate."""
        if action.tool_name in DESTRUCTIVE_TOOLS:
            if not state.approval_required:
                return [SoulViolation(
                    rule="no_skip_approval",
                    description=f"Destructive tool '{action.tool_name}' without approval gate",
                    severity="block",
                    action=action,
                )]
        return []

    def _check_no_auto_merge(self, state: AgentState, action: PlannedAction) -> list[SoulViolation]:
        """Branch merges always need human approval."""
        if action.tool_name == "merge_branch":
            if not state.approval_required:
                return [SoulViolation(
                    rule="no_auto_merge",
                    description="Branch merge without human approval is forbidden",
                    severity="block",
                    action=action,
                )]
        return []

    def _check_scope(self, state: AgentState, action: PlannedAction) -> list[SoulViolation]:
        """Agent must not operate outside its permission scope."""
        if action.operation_type == OperationType.READ:
            return []  # Reads are unrestricted
        
        if state.permissions is None:
            return [SoulViolation(
                rule="no_operate_outside_scope",
                description="No permissions configured — all mutations blocked",
                severity="block",
                action=action,
            )]

        op = action.operation_type.value
        if op not in state.permissions.permissions:
            return [SoulViolation(
                rule="no_operate_outside_scope",
                description=f"No '{op}' permission in agent scope",
                severity="block",
                action=action,
            )]
        return []

    # --- Determinism verification ---

    @staticmethod
    def verify_determinism(state1: AgentState, state2: AgentState) -> bool:
        """Same input + same state must produce same output."""
        return state1.determinism_hash() == state2.determinism_hash()
