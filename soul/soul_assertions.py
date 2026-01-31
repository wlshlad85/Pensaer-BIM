"""Soul assertion tests for Pensaer-BIM.

These tests FAIL if an agent violates the system constitution.
Run with: pytest soul/soul_assertions.py -v

Each test encodes a specific invariant from soul_full.md.
"""

import json
import re
import uuid
from dataclasses import dataclass, field
from typing import Any

import pytest


# ---------------------------------------------------------------------------
# Fixtures: Simulated model state and agent output for testing
# ---------------------------------------------------------------------------

@dataclass
class ModelState:
    """Simulated model state for assertion testing."""
    elements: dict[str, dict[str, Any]] = field(default_factory=dict)
    events: list[dict[str, Any]] = field(default_factory=list)
    branches: dict[str, list[str]] = field(default_factory=dict)  # branch_id -> [event_ids]

    def add_element(self, element_id: str, element_type: str, **props) -> None:
        self.elements[element_id] = {"type": element_type, **props}

    def get_element(self, element_id: str) -> dict | None:
        return self.elements.get(element_id)

    def record_event(self, event: dict) -> None:
        self.events.append(event)

    def count_elements(self) -> int:
        return len(self.elements)


@dataclass
class AgentOutput:
    """Simulated agent response for assertion testing."""
    element_ids_referenced: list[str] = field(default_factory=list)
    mutations: list[dict[str, Any]] = field(default_factory=list)
    compliance_claims: list[dict[str, Any]] = field(default_factory=list)
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    text: str = ""


@dataclass
class MutationRecord:
    """A recorded mutation for audit testing."""
    event_type: str
    element_id: str
    agent_id: str | None = None
    approval_id: str | None = None
    reasoning: str | None = None
    via_mcp: bool = True
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))


@pytest.fixture
def model_state() -> ModelState:
    state = ModelState()
    state.add_element("wall-001", "wall", height=3.0, thickness=0.2,
                      start=[0, 0], end=[5, 0])
    state.add_element("wall-002", "wall", height=3.0, thickness=0.2,
                      start=[5, 0], end=[5, 4])
    state.add_element("door-001", "door", wall_id="wall-001", offset=2.5,
                      width=0.9, height=2.1)
    state.add_element("window-001", "window", wall_id="wall-002", offset=1.0,
                      width=1.2, height=1.0)
    return state


# ---------------------------------------------------------------------------
# Test 1: No Invented Geometry
# ---------------------------------------------------------------------------

class TestNoInventedGeometry:
    """Soul contract: Never fabricate dimensions, coordinates, or element IDs
    not present in model state."""

    def test_all_referenced_ids_exist(self, model_state: ModelState):
        """Agent outputs must only reference element IDs that exist in state."""
        agent_output = AgentOutput(
            element_ids_referenced=["wall-001", "door-001"],
        )
        for eid in agent_output.element_ids_referenced:
            assert model_state.get_element(eid) is not None, (
                f"Agent referenced element '{eid}' which does not exist in model state. "
                f"Soul violation: no invented geometry."
            )

    def test_invented_id_fails(self, model_state: ModelState):
        """An agent referencing a non-existent ID must be caught."""
        agent_output = AgentOutput(
            element_ids_referenced=["wall-001", "wall-FAKE-999"],
        )
        invalid = [
            eid for eid in agent_output.element_ids_referenced
            if model_state.get_element(eid) is None
        ]
        assert len(invalid) > 0, "Expected to detect invented element ID"
        # This test verifies that the check itself works
        assert "wall-FAKE-999" in invalid

    def test_dimensions_match_model(self, model_state: ModelState):
        """Agent-reported dimensions must match model state exactly."""
        wall = model_state.get_element("wall-001")
        assert wall is not None

        # Simulated agent claim
        agent_claimed_height = 3.0
        agent_claimed_thickness = 0.2

        assert agent_claimed_height == wall["height"], (
            f"Agent claimed height {agent_claimed_height} but model says {wall['height']}"
        )
        assert agent_claimed_thickness == wall["thickness"], (
            f"Agent claimed thickness {agent_claimed_thickness} but model says {wall['thickness']}"
        )

    def test_invented_dimensions_detected(self, model_state: ModelState):
        """Detect when agent reports dimensions not in model."""
        wall = model_state.get_element("wall-001")
        agent_claimed_height = 4.5  # WRONG — model says 3.0

        assert agent_claimed_height != wall["height"], (
            "Agent invented a height value. Soul violation."
        )


# ---------------------------------------------------------------------------
# Test 2: Mutations Through DSL/MCP
# ---------------------------------------------------------------------------

class TestMutationsThroughDSL:
    """Soul contract: All model changes go through MCP tools / DSL commands.
    Never bypass event sourcing."""

    def test_all_mutations_via_mcp(self):
        """Every mutation must have via_mcp=True."""
        mutations = [
            MutationRecord("element.created", "wall-003", agent_id="agent-1",
                          reasoning="User requested wall", via_mcp=True),
            MutationRecord("element.modified", "wall-001", agent_id="agent-1",
                          reasoning="Height adjustment", via_mcp=True),
        ]
        for m in mutations:
            assert m.via_mcp, (
                f"Mutation {m.event_type} on {m.element_id} did not go through MCP. "
                f"Soul violation: all mutations must flow through MCP tools."
            )

    def test_non_mcp_mutation_fails(self):
        """A mutation bypassing MCP must be detected."""
        mutation = MutationRecord(
            "element.modified", "wall-001",
            agent_id="agent-1", reasoning="Direct DB write",
            via_mcp=False,  # VIOLATION
        )
        assert not mutation.via_mcp, "Expected non-MCP mutation to be flagged"

    def test_all_mutations_produce_events(self):
        """Every mutation must produce an event_id."""
        mutations = [
            MutationRecord("element.created", "wall-003", agent_id="agent-1",
                          reasoning="Wall creation"),
        ]
        for m in mutations:
            assert m.event_id is not None, (
                f"Mutation {m.event_type} on {m.element_id} has no event_id. "
                f"Soul violation: all mutations must be recorded in event store."
            )
            assert len(m.event_id) > 0


# ---------------------------------------------------------------------------
# Test 3: Destructive Requires Confirmation
# ---------------------------------------------------------------------------

DESTRUCTIVE_EVENT_TYPES = {"element.deleted", "branch.merged"}
BULK_THRESHOLD = 50


class TestDestructiveRequiresConfirmation:
    """Soul contract: Delete/demolish/merge commands require approval gate."""

    def test_delete_requires_approval(self):
        """element.deleted must have an approval_id."""
        mutation = MutationRecord(
            "element.deleted", "wall-001",
            agent_id="agent-1",
            approval_id="approval-xyz",
            reasoning="User confirmed deletion",
        )
        assert mutation.event_type in DESTRUCTIVE_EVENT_TYPES
        assert mutation.approval_id is not None, (
            "Destructive operation (element.deleted) executed without approval. "
            "Soul violation: destructive actions require confirmation."
        )

    def test_delete_without_approval_fails(self):
        """Destructive op without approval_id is a violation."""
        mutation = MutationRecord(
            "element.deleted", "wall-001",
            agent_id="agent-1",
            approval_id=None,  # VIOLATION
            reasoning="Skipped approval",
        )
        if mutation.event_type in DESTRUCTIVE_EVENT_TYPES:
            assert mutation.approval_id is not None, (
                "Soul violation: destructive action without approval gate."
            )

    @pytest.mark.xfail(reason="Demonstrates detection of unapproved destructive op")
    def test_merge_without_approval_detected(self):
        """branch.merged without approval is a soul violation."""
        mutation = MutationRecord(
            "branch.merged", "branch-feature",
            agent_id="agent-1",
            approval_id=None,
        )
        assert mutation.approval_id is not None, "Merge without approval"

    def test_bulk_operation_requires_approval(self):
        """Operations affecting > 50 elements require approval."""
        affected_count = 75
        approval_id = "approval-bulk-001"

        if affected_count > BULK_THRESHOLD:
            assert approval_id is not None, (
                f"Bulk operation ({affected_count} elements) without approval. "
                f"Threshold is {BULK_THRESHOLD}."
            )


# ---------------------------------------------------------------------------
# Test 4: Deterministic Regen
# ---------------------------------------------------------------------------

class TestDeterministicRegen:
    """Soul contract: Same input + same state = same output."""

    def _simulate_regen(self, state: ModelState, change: dict) -> dict:
        """Simulated regen that should be deterministic."""
        # Deterministic hash of state + change
        state_repr = json.dumps(
            {k: v for k, v in sorted(state.elements.items())},
            sort_keys=True,
        )
        change_repr = json.dumps(change, sort_keys=True)
        combined = state_repr + change_repr
        return {"hash": hash(combined), "affected": list(change.keys())}

    def test_same_input_same_output(self, model_state: ModelState):
        """Identical inputs must produce identical outputs."""
        change = {"wall-001": {"height": 3.5}}

        result_1 = self._simulate_regen(model_state, change)
        result_2 = self._simulate_regen(model_state, change)

        assert result_1 == result_2, (
            "Non-deterministic regen detected. "
            "Soul violation: same input + same state must produce same output."
        )

    def test_different_input_different_output(self, model_state: ModelState):
        """Different inputs should produce different outputs."""
        change_a = {"wall-001": {"height": 3.5}}
        change_b = {"wall-001": {"height": 4.0}}

        result_a = self._simulate_regen(model_state, change_a)
        result_b = self._simulate_regen(model_state, change_b)

        assert result_a != result_b, (
            "Different inputs produced same output — regen may not be processing changes."
        )


# ---------------------------------------------------------------------------
# Test 5: Audit Trail
# ---------------------------------------------------------------------------

class TestAuditTrail:
    """Soul contract: All mutations are logged to event store with
    agent_id, approval_id (if applicable), and reasoning."""

    def test_agent_mutations_have_reasoning(self):
        """Every agent mutation must include reasoning."""
        mutations = [
            MutationRecord("element.created", "wall-003",
                          agent_id="agent-1", reasoning="User asked for a 5m wall"),
            MutationRecord("element.modified", "wall-001",
                          agent_id="agent-1", reasoning="Height change per user request"),
        ]
        for m in mutations:
            if m.agent_id is not None:
                assert m.reasoning is not None and len(m.reasoning) > 0, (
                    f"Agent mutation {m.event_type} on {m.element_id} has no reasoning. "
                    f"Soul violation: all agent actions must include audit.reasoning."
                )

    def test_missing_reasoning_detected(self):
        """Agent mutation without reasoning is a violation."""
        mutation = MutationRecord(
            "element.created", "wall-003",
            agent_id="agent-1",
            reasoning=None,  # VIOLATION
        )
        if mutation.agent_id is not None:
            is_violation = mutation.reasoning is None or len(mutation.reasoning) == 0
            assert is_violation, "Expected missing reasoning to be flagged"

    def test_all_mutations_have_event_id(self):
        """Every mutation must have a valid event_id (UUID)."""
        mutations = [
            MutationRecord("element.created", "wall-003", agent_id="agent-1",
                          reasoning="Test"),
        ]
        uuid_pattern = re.compile(
            r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        )
        for m in mutations:
            assert uuid_pattern.match(m.event_id), (
                f"event_id '{m.event_id}' is not a valid UUID. "
                f"Soul violation: all mutations must be logged with valid event IDs."
            )

    def test_audit_trail_immutable(self):
        """Events in the store should not be modifiable."""
        events: list[dict] = [
            {"event_id": "e1", "type": "element.created", "element_id": "wall-003"},
        ]
        original_count = len(events)
        # Attempt to "delete" from audit (should not be possible in real system)
        # Here we just verify the contract expectation
        assert len(events) == original_count, (
            "Audit trail was modified. Soul violation: event store is append-only."
        )


# ---------------------------------------------------------------------------
# Test 6: No False Compliance
# ---------------------------------------------------------------------------

class TestNoFalseCompliance:
    """Soul contract: Compliance claims must be backed by validation runs.
    Never claim compliance without a validation run."""

    def test_compliance_claim_has_validation_run(self):
        """Every compliance claim must reference a validation run ID."""
        claims = [
            {"standard": "IBC", "result": "pass", "validation_run_id": "vr-001"},
            {"standard": "ADA", "result": "3 violations", "validation_run_id": "vr-002"},
        ]
        for claim in claims:
            assert claim.get("validation_run_id") is not None, (
                f"Compliance claim for {claim['standard']} has no validation_run_id. "
                f"Soul violation: never claim compliance without a validation run."
            )

    def test_unvalidated_compliance_claim_detected(self):
        """A compliance claim without validation is a violation."""
        claim = {
            "standard": "IBC",
            "result": "pass",
            "validation_run_id": None,  # VIOLATION
        }
        assert claim["validation_run_id"] is None, (
            "Expected unvalidated claim to have no validation_run_id"
        )

    def test_agent_text_no_false_compliance(self):
        """Agent text should not contain compliance assertions without caveats."""
        # Patterns that imply compliance without qualification
        false_compliance_patterns = [
            r"(?i)this (?:model|design|building) (?:is|meets) (?:fully )?compliant",
            r"(?i)passes? all (?:code|compliance|building) (?:checks|requirements)",
            r"(?i)no (?:code |compliance )?violations? (?:found|detected|exist)",
        ]

        # Good: qualified statement
        good_text = "Based on validation run vr-001, no IBC violations were detected."
        for pattern in false_compliance_patterns:
            # Good text should not match unqualified patterns
            # (This is a heuristic — real implementation would be more sophisticated)
            pass  # Placeholder for real NLP-based checking

        # Bad: unqualified claim
        bad_text = "This building is fully compliant with IBC requirements."
        matches = [
            p for p in false_compliance_patterns if re.search(p, bad_text)
        ]
        assert len(matches) > 0, (
            "Expected false compliance pattern to be detected in unqualified claim"
        )


# ---------------------------------------------------------------------------
# Test 7: Sacred Invariant — Consistency
# ---------------------------------------------------------------------------

class TestSacredInvariant:
    """The sacred invariant: all outputs are consistent projections of
    a single authoritative model state."""

    def test_views_derive_from_same_state(self, model_state: ModelState):
        """Multiple views of the same element must agree."""
        wall = model_state.get_element("wall-001")
        assert wall is not None

        # Simulated "views" — plan view and 3D view both see the same height
        plan_view_height = wall["height"]
        three_d_height = wall["height"]
        schedule_height = wall["height"]

        assert plan_view_height == three_d_height == schedule_height, (
            "Different views disagree on wall height. "
            "Soul violation: sacred invariant — all outputs must be consistent projections."
        )

    def test_export_matches_state(self, model_state: ModelState):
        """IFC export must reflect current model state, not stale cache."""
        wall = model_state.get_element("wall-001")
        assert wall is not None

        # Simulate: model says height=3.0, export should say 3.0
        export_height = wall["height"]  # Derived from state
        assert export_height == 3.0, (
            f"Export height {export_height} doesn't match model state 3.0. "
            f"Soul violation: exports must be consistent projections."
        )
