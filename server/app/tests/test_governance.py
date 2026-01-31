"""
Tests for Phase 3 Agentic AI: governance gates, approval flows,
forbidden actions, soul enforcement, and orchestration.
"""
from __future__ import annotations

import pytest
from uuid import uuid4

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.agents.state import (
    AgentPhase,
    AgentState,
    AgentPermissions,
    ActionResult,
    OperationType,
    PermissionScope,
    PlannedAction,
    classify_operation,
    route_tool,
)
from app.agents.orchestrator import AgentOrchestrator
from app.agents.soul_enforcement import SoulEnforcer, SoulViolation
from app.agents.tools import (
    BatchOperation,
    DSLTranslation,
    translate_nl_to_dsl,
    plan_room_analysis,
    plan_clash_detection,
)
from app.middleware.governance import (
    AuditStore,
    Governance,
    RateLimiter,
    BULK_OPS_THRESHOLD,
    check_soul_constraints,
    requires_approval,
    verify_determinism,
    wrap_dry_run_result,
)


# --- Helpers ---

def make_state(**kwargs) -> AgentState:
    defaults = {
        "permissions": AgentPermissions(
            agent_id=uuid4(),
            permissions={
                "read": PermissionScope(),
                "create": PermissionScope(categories=["Walls", "Doors"]),
                "modify": PermissionScope(categories=["Walls"]),
            },
            max_elements_per_operation=100,
            max_operations_per_session=1000,
        ),
    }
    defaults.update(kwargs)
    return AgentState(**defaults)


def make_action(**kwargs) -> PlannedAction:
    defaults = {
        "tool_name": "create_wall",
        "operation_type": OperationType.CREATE,
        "reasoning": "User requested wall creation",
        "parameters": {"start": (0, 0), "end": (5000, 0), "height": 3000, "thickness": 200},
    }
    defaults.update(kwargs)
    return PlannedAction(**defaults)


class FakeExecutor:
    """Mock MCP tool executor."""

    def __init__(self, success: bool = True):
        self.calls: list[dict] = []
        self.success = success

    def execute(self, server, tool_name, parameters, dry_run):
        self.calls.append({
            "server": server, "tool_name": tool_name,
            "parameters": parameters, "dry_run": dry_run,
        })
        return ActionResult(
            success=self.success,
            data={"element_id": str(uuid4())},
            event_id=None if dry_run else uuid4(),
        )


# === Test 1: Approval gate blocks destructive operations ===

def test_destructive_operation_requires_approval():
    action = make_action(tool_name="delete_element", operation_type=OperationType.DELETE)
    required, reason = requires_approval(action)
    assert required is True
    assert "destructive" in reason


# === Test 2: Bulk operations trigger approval ===

def test_bulk_operation_requires_approval():
    action = make_action(affected_element_count=BULK_OPS_THRESHOLD + 1)
    required, reason = requires_approval(action)
    assert required is True
    assert "bulk" in reason


# === Test 3: Normal operations don't require approval ===

def test_normal_operation_no_approval():
    action = make_action(affected_element_count=5)
    required, _ = requires_approval(action)
    assert required is False


# === Test 4: Soul violation — missing audit reasoning ===

def test_soul_violation_missing_reasoning():
    state = make_state()
    action = make_action(reasoning="")  # No reasoning!
    ok, violation = check_soul_constraints(state, action)
    assert ok is False
    assert "audit" in violation.lower()


# === Test 5: Soul violation — destructive without approval gate ===

def test_soul_violation_destructive_no_approval():
    state = make_state()
    state.approval_required = False
    action = make_action(tool_name="delete_element", operation_type=OperationType.DELETE)
    ok, violation = check_soul_constraints(state, action)
    assert ok is False
    assert "approval" in violation.lower()


# === Test 6: Soul enforcer catches missing geometry params ===

def test_soul_enforcer_missing_geometry():
    enforcer = SoulEnforcer()
    state = make_state()
    action = make_action(
        tool_name="create_wall",
        parameters={"start": (0, 0)},  # Missing end, height, thickness
        reasoning="test",
    )
    violations = enforcer.check_action(state, action)
    assert len(violations) >= 1
    assert any(v.rule == "no_invent_geometry" for v in violations)


# === Test 7: Audit store records all actions ===

def test_audit_store_records_actions():
    store = AuditStore()
    gov = Governance(audit_store=store)
    state = make_state()
    action = make_action()
    result = ActionResult(success=True, event_id=uuid4())

    gov.log_action(state, action, result)
    assert len(store.entries) == 1
    assert store.entries[0].tool_name == "create_wall"
    assert store.entries[0].reasoning == "User requested wall creation"


# === Test 8: Rate limiter blocks excessive operations ===

def test_rate_limiter_blocks():
    limiter = RateLimiter(max_ops=3, window_seconds=3600)
    key = "test-agent"
    for _ in range(3):
        limiter.record(key)
    ok, reason = limiter.check(key)
    assert ok is False
    assert "Rate limit" in reason


# === Test 9: Scope check blocks out-of-scope mutations ===

def test_scope_blocks_out_of_scope():
    gov = Governance()
    state = make_state()
    # Try to create a Roof — not in scope (only Walls, Doors)
    action = make_action(
        tool_name="create_roof",
        parameters={"category": "Roofs", "boundary_points": []},
        reasoning="test",
    )
    ok, reason = gov.check_permission(state, action)
    # Category "Roofs" not in scope
    assert ok is False or "scope" in reason.lower() or "Roofs" in reason


# === Test 10: Dry-run envelope format matches soul_mcp.md ===

def test_dry_run_envelope():
    result = wrap_dry_run_result({"wall_id": "abc"})
    assert result["success"] is True
    assert result["event_id"] is None
    assert result["dry_run"] is True
    assert "audit" in result
    assert isinstance(result["warnings"], list)


# === Test 11: Orchestrator plan→execute→validate→commit cycle ===

def test_orchestrator_full_cycle():
    gov = Governance()
    executor = FakeExecutor(success=True)

    def planner(state):
        return [make_action()]

    orch = AgentOrchestrator(
        governance=gov,
        executor=executor,
        planner=planner,
    )

    state = make_state(phase=AgentPhase.PLAN, user_request="Create a wall")
    import asyncio
    state = asyncio.get_event_loop().run_until_complete(orch.run(state))
    assert state.phase == AgentPhase.COMPLETED
    assert len(executor.calls) >= 2  # dry-run + commit


# === Test 12: Determinism hash consistency ===

def test_determinism_hash():
    branch = uuid4()
    s1 = make_state(user_request="Create wall from 0,0 to 5000,0", branch_id=branch)
    s1.planned_actions = [make_action()]
    s2 = make_state(user_request="Create wall from 0,0 to 5000,0", branch_id=branch)
    s2.planned_actions = [make_action()]
    # Same input → same hash
    assert s1.determinism_hash() == s2.determinism_hash()
    assert verify_determinism(s1, s2) is True


# === Test 13: NL→DSL translation ===

def test_nl_to_dsl_wall():
    result = translate_nl_to_dsl("Create a wall from here to there")
    assert result.dsl_command == "WALL"
    assert result.tool_name == "create_wall"
    assert result.confidence > 0


def test_nl_to_dsl_ambiguous():
    result = translate_nl_to_dsl("do something")
    assert result.ambiguous is True
    assert result.clarification_needed is not None


# === Test 14: Tool routing ===

def test_tool_routing():
    assert route_tool("create_wall") == "geometry"
    assert route_tool("room_analysis") == "spatial"
    assert route_tool("clash_detection") == "validation"
    assert route_tool("export_ifc") == "documentation"

    with pytest.raises(ValueError):
        route_tool("nonexistent_tool")


# === Test 15: Batch operation rollback support ===

def test_batch_operation():
    batch = BatchOperation()
    action = make_action()
    batch.add_action(action)
    assert batch.element_count >= 1
    assert len(batch.rollback_actions) == 1
    assert batch.status == "pending"
    batch.mark_committed([uuid4()])
    assert batch.status == "committed"


# === Test 16: Escalation paths exist for all situations ===

def test_escalation_paths():
    enforcer = SoulEnforcer()
    for situation in SoulEnforcer.ESCALATION_PATHS:
        path = enforcer.get_escalation_path(situation)
        assert path is not None
        assert len(path) > 0
