"""
Governance middleware for Pensaer agent runtime.
Enforces soul constitution constraints:
- Approval gates for destructive operations
- Dry-run mode for all mutations
- Audit logging to event store
- Rate limiting and scope control
- Soul enforcement (forbidden actions, escalation paths)
"""
from __future__ import annotations

import fnmatch
import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from ..agents.state import (
    ActionResult,
    AgentPhase,
    AgentState,
    DESTRUCTIVE_TOOLS,
    MUTATING_TOOLS,
    OperationType,
    PlannedAction,
)


# --- Audit Event Store ---

@dataclass
class AuditEntry:
    """Immutable audit log entry."""
    id: UUID = field(default_factory=uuid4)
    timestamp: str = ""
    session_id: UUID | None = None
    agent_id: UUID | None = None
    action: str = ""
    tool_name: str = ""
    parameters: dict[str, Any] = field(default_factory=dict)
    result_success: bool | None = None
    event_id: UUID | None = None
    reasoning: str = ""
    dry_run: bool = False
    phase: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "timestamp": self.timestamp,
            "session_id": str(self.session_id) if self.session_id else None,
            "agent_id": str(self.agent_id) if self.agent_id else None,
            "action": self.action,
            "tool_name": self.tool_name,
            "parameters": self.parameters,
            "result_success": self.result_success,
            "event_id": str(self.event_id) if self.event_id else None,
            "reasoning": self.reasoning,
            "dry_run": self.dry_run,
            "phase": self.phase,
        }


class AuditStore:
    """In-memory audit store (swap for PostgreSQL event store in production)."""

    def __init__(self) -> None:
        self._entries: list[AuditEntry] = []

    def append(self, entry: AuditEntry) -> None:
        self._entries.append(entry)

    def query(
        self,
        agent_id: UUID | None = None,
        session_id: UUID | None = None,
        tool_name: str | None = None,
    ) -> list[AuditEntry]:
        results = self._entries
        if agent_id:
            results = [e for e in results if e.agent_id == agent_id]
        if session_id:
            results = [e for e in results if e.session_id == session_id]
        if tool_name:
            results = [e for e in results if e.tool_name == tool_name]
        return results

    @property
    def entries(self) -> list[AuditEntry]:
        return list(self._entries)

    def clear(self) -> None:
        self._entries.clear()


# --- Rate Limiter ---

class RateLimiter:
    """Token-bucket rate limiter for agent operations."""

    def __init__(self, max_ops: int = 1000, window_seconds: float = 3600.0):
        self.max_ops = max_ops
        self.window_seconds = window_seconds
        self._counts: dict[str, list[float]] = {}

    def check(self, key: str) -> tuple[bool, str]:
        now = time.monotonic()
        if key not in self._counts:
            self._counts[key] = []
        # Prune old entries
        self._counts[key] = [t for t in self._counts[key] if now - t < self.window_seconds]
        if len(self._counts[key]) >= self.max_ops:
            return False, f"Rate limit exceeded: {self.max_ops} ops per {self.window_seconds}s"
        return True, ""

    def record(self, key: str) -> None:
        now = time.monotonic()
        if key not in self._counts:
            self._counts[key] = []
        self._counts[key].append(now)


# --- Approval Gates ---

BULK_OPS_THRESHOLD = 50  # Elements affected triggers approval

APPROVAL_TRIGGERS = {
    "element.deleted",
    "branch.merged",
    "demolish_element",
    "delete_element",
}


def requires_approval(action: PlannedAction) -> tuple[bool, str]:
    """Check if an action requires human approval per soul_mcp.md."""
    # Destructive operations always need approval
    if action.tool_name in DESTRUCTIVE_TOOLS:
        return True, f"destructive_operation: {action.tool_name}"
    
    # Bulk operations need approval
    if action.affected_element_count > BULK_OPS_THRESHOLD:
        return True, f"bulk_operation: {action.affected_element_count} elements"
    
    return False, ""


# --- Soul Enforcement ---

# From soul_agent.md: 9 forbidden actions
FORBIDDEN_ACTIONS = {
    "invent_geometry": "Never invent geometry — do not fabricate dimensions, coordinates, element IDs",
    "bypass_mcp": "Never bypass MCP — no direct database access, no raw API calls",
    "suppress_audit": "Never suppress audit — every action must include reasoning",
    "claim_compliance": "Never claim compliance without running validation",
    "skip_approval": "Never execute destructive actions without approval",
    "operate_outside_scope": "Never operate outside permission scope",
    "auto_merge": "Never auto-merge branches without human approval",
    "claim_human": "Never claim to be human",
    "share_raw_data": "Never share raw model data externally except via export tools",
}


def check_soul_constraints(state: AgentState, action: PlannedAction) -> tuple[bool, str | None]:
    """
    Runtime soul enforcement.
    Returns (ok, violation_description).
    """
    # No reasoning = audit suppression
    if action.operation_type != OperationType.READ and not action.reasoning:
        return False, FORBIDDEN_ACTIONS["suppress_audit"]

    # Destructive without approval gate = skip_approval
    if action.tool_name in DESTRUCTIVE_TOOLS and not state.approval_required:
        return False, FORBIDDEN_ACTIONS["skip_approval"]

    # Branch merge without approval
    if action.tool_name == "merge_branch" and not state.approval_required:
        return False, FORBIDDEN_ACTIONS["auto_merge"]

    return True, None


# --- Scope Checking ---

def check_scope(permissions: Any, action: PlannedAction) -> tuple[bool, str]:
    """Check if action falls within agent's permission scope."""
    if permissions is None:
        return False, "No permissions configured"

    op_type = action.operation_type.value
    if op_type not in permissions.permissions:
        # READ is always allowed by default per soul_agent.md
        if action.operation_type == OperationType.READ:
            return True, ""
        return False, f"No {op_type} permission"

    scope = permissions.permissions[op_type]

    # Check category scope
    category = action.parameters.get("category") or action.parameters.get("source_category")
    if category and scope.categories:
        if category not in scope.categories:
            return False, f"Category '{category}' not in scope"

    # Check level scope
    level = action.parameters.get("level_id")
    if level and scope.levels:
        if str(level) not in scope.levels:
            return False, f"Level '{level}' not in scope"

    return True, ""


# --- Main Governance Class ---

class Governance:
    """
    Central governance middleware.
    Implements GovernanceMiddleware protocol from orchestrator.
    """

    def __init__(
        self,
        audit_store: AuditStore | None = None,
        rate_limiter: RateLimiter | None = None,
    ):
        self.audit_store = audit_store or AuditStore()
        self.rate_limiter = rate_limiter or RateLimiter()

    def check_permission(self, state: AgentState, action: PlannedAction) -> tuple[bool, str]:
        """Check if agent has permission for this action."""
        # Soul constraint check first
        ok, violation = check_soul_constraints(state, action)
        if not ok:
            return False, f"Soul violation: {violation}"

        # Scope check
        if state.permissions:
            ok, reason = check_scope(state.permissions, action)
            if not ok:
                return False, reason

        return True, ""

    def check_approval_required(self, state: AgentState, action: PlannedAction) -> tuple[bool, str]:
        """Check if action needs human approval."""
        return requires_approval(action)

    def check_rate_limit(self, state: AgentState) -> tuple[bool, str]:
        """Check rate limits for the agent session."""
        key = str(state.agent_id)

        # Per-operation limit
        if state.permissions and state.operation_count >= state.permissions.max_operations_per_session:
            return False, "Session operation limit reached"

        # Time-based rate limit
        ok, reason = self.rate_limiter.check(key)
        if not ok:
            return False, reason

        return True, ""

    def log_action(self, state: AgentState, action: PlannedAction, result: ActionResult) -> None:
        """Log action to audit store. Never suppress (soul constraint)."""
        entry = AuditEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            session_id=state.session_id,
            agent_id=state.agent_id,
            action=f"{action.operation_type.value}:{action.tool_name}",
            tool_name=action.tool_name,
            parameters=action.parameters,
            result_success=result.success,
            event_id=result.event_id,
            reasoning=action.reasoning,
            dry_run=action.dry_run,
            phase=state.phase.value,
        )
        self.audit_store.append(entry)
        self.rate_limiter.record(str(state.agent_id))


# --- Dry-Run Mode ---

def wrap_dry_run_result(data: dict[str, Any]) -> dict[str, Any]:
    """Wrap a tool response in dry-run envelope per soul_mcp.md."""
    return {
        "success": True,
        "data": data,
        "event_id": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "warnings": [],
        "dry_run": True,
        "audit": {
            "user_id": None,
            "agent_id": None,
            "reasoning": None,
        },
    }


# --- Determinism Verification ---

def verify_determinism(state1: AgentState, state2: AgentState) -> bool:
    """
    Verify that two runs with same input produce same output.
    Per soul_agent.md: same input + same model state = same output.
    """
    return state1.determinism_hash() == state2.determinism_hash()
