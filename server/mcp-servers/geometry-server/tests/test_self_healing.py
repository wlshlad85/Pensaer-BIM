"""Tests for self-healing integration in the Geometry MCP Server.

These tests verify that:
1. Argument healing corrects common parameter name variations
2. Semantic aliases work for BIM domain terms
3. Circuit breaker opens after repeated failures
4. Self-healing status reports correctly
"""

import pytest
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from geometry_server.self_healing import (
    heal_tool_args,
    get_argument_healer,
    get_circuit_breaker,
    reset_circuit_breaker,
    BIM_SEMANTIC_ALIASES,
    get_bim_aliases,
    ArgumentHealer,
)


class TestArgumentHealing:
    """Test argument healing with fuzzy matching and aliases."""

    def setup_method(self):
        """Reset state before each test."""
        reset_circuit_breaker()
        # Reset argument healer
        import geometry_server.self_healing as sh

        sh._argument_healer = None

    def test_exact_match_passes_through(self):
        """Arguments with correct names should pass through unchanged."""
        args = {"start": [0, 0], "end": [5, 0], "height": 3.0}
        healed = heal_tool_args("create_wall", args)
        assert healed == args

    def test_semantic_alias_start_point(self):
        """'start_point' should heal to 'start'."""
        args = {"start_point": [0, 0], "end_point": [5, 0], "height": 3.0}
        healed = heal_tool_args("create_wall", args)
        assert "start" in healed
        assert "end" in healed
        assert healed["start"] == [0, 0]
        assert healed["end"] == [5, 0]

    def test_semantic_alias_p1_p2(self):
        """'p1' and 'p2' should heal to 'start' and 'end'."""
        args = {"p1": [0, 0], "p2": [5, 0]}
        healed = heal_tool_args("create_wall", args)
        assert "start" in healed
        assert "end" in healed

    def test_semantic_alias_wall_height(self):
        """'wall_height' should heal to 'height'."""
        args = {"start": [0, 0], "end": [5, 0], "wall_height": 3.0}
        healed = heal_tool_args("create_wall", args)
        assert "height" in healed
        assert healed["height"] == 3.0

    def test_semantic_alias_element_id(self):
        """'id' should heal to 'element_id'."""
        args = {"id": "abc-123"}
        healed = heal_tool_args("get_element", args)
        assert "element_id" in healed
        assert healed["element_id"] == "abc-123"

    def test_semantic_alias_wall_id(self):
        """'wall_id' should remain for place_door tool."""
        args = {"wall_id": "wall-123", "offset": 1.5}
        healed = heal_tool_args("place_door", args)
        assert "wall_id" in healed
        assert healed["wall_id"] == "wall-123"

    def test_fuzzy_match_typo(self):
        """Typos like 'thicness' should heal to 'thickness'."""
        args = {"start": [0, 0], "end": [5, 0], "thicness": 0.2}
        healed = heal_tool_args("create_wall", args)
        assert "thickness" in healed
        assert healed["thickness"] == 0.2

    def test_corrections_logged(self):
        """Corrections should be logged in the healer."""
        args = {"start_point": [0, 0], "end_point": [5, 0]}
        heal_tool_args("create_wall", args)

        healer = get_argument_healer()
        assert len(healer.corrections) > 0

        # Check at least one correction is for our tool
        wall_corrections = [c for c in healer.corrections if c["tool"] == "create_wall"]
        assert len(wall_corrections) > 0

    def test_unknown_args_preserved(self):
        """Unknown arguments should be preserved (not dropped)."""
        args = {"start": [0, 0], "end": [5, 0], "custom_metadata": {"key": "value"}}
        healed = heal_tool_args("create_wall", args)
        assert "custom_metadata" in healed


class TestBIMSemanticAliases:
    """Test BIM-specific semantic aliases."""

    def test_element_id_aliases(self):
        """Element ID should have wall_id, floor_id, etc. as aliases."""
        aliases = get_bim_aliases("element_id")
        assert "wall_id" in aliases
        assert "floor_id" in aliases
        assert "door_id" in aliases

    def test_start_aliases(self):
        """Start should have various point aliases."""
        aliases = get_bim_aliases("start")
        assert "start_point" in aliases
        assert "from" in aliases
        assert "p1" in aliases
        assert "origin" in aliases

    def test_height_aliases(self):
        """Height should have wall_height, h, z as aliases."""
        aliases = get_bim_aliases("height")
        assert "wall_height" in aliases
        assert "h" in aliases
        assert "elevation" in aliases

    def test_thickness_aliases(self):
        """Thickness should have various aliases."""
        aliases = get_bim_aliases("thickness")
        assert "wall_thickness" in aliases
        assert "width" in aliases
        assert "depth" in aliases


class TestCircuitBreaker:
    """Test circuit breaker functionality."""

    def setup_method(self):
        """Reset circuit breaker before each test."""
        reset_circuit_breaker()

    def test_circuit_breaker_starts_closed(self):
        """Circuit breaker should start in closed state."""
        cb = get_circuit_breaker()
        assert cb.can_attempt_correction() is True

    def test_circuit_breaker_opens_after_failures(self):
        """Circuit breaker should open after repeated failures."""
        cb = get_circuit_breaker()

        # Record failures up to threshold
        for _ in range(cb.failure_threshold):
            cb.record_failure()

        # Should now be open
        assert cb.can_attempt_correction() is False

    def test_circuit_breaker_records_success(self):
        """Successful operations should be recorded."""
        cb = get_circuit_breaker()
        cb.record_success()
        # In CLOSED state, record_success increments corrections_successful
        # successes only increments in HALF_OPEN state
        assert cb.corrections_successful >= 1

    def test_healing_skipped_when_circuit_open(self):
        """When circuit is open, healing should pass through unchanged."""
        cb = get_circuit_breaker()

        # Open the circuit
        for _ in range(cb.failure_threshold):
            cb.record_failure()

        # Healing should now be skipped
        args = {"start_point": [0, 0], "end_point": [5, 0]}
        healed = heal_tool_args("create_wall", args)

        # Should be unchanged because circuit is open
        assert healed == args


class TestArgumentHealerExpectedKeys:
    """Test that ArgumentHealer knows expected keys for each tool."""

    def test_create_wall_keys(self):
        """create_wall should expect start, end, height, thickness."""
        healer = ArgumentHealer()
        keys = healer._get_expected_keys("create_wall")
        assert "start" in keys
        assert "end" in keys
        assert "height" in keys
        assert "thickness" in keys

    def test_place_door_keys(self):
        """place_door should expect wall_id, offset, width, height."""
        healer = ArgumentHealer()
        keys = healer._get_expected_keys("place_door")
        assert "wall_id" in keys
        assert "offset" in keys
        assert "width" in keys
        assert "height" in keys

    def test_get_element_keys(self):
        """get_element should expect element_id."""
        healer = ArgumentHealer()
        keys = healer._get_expected_keys("get_element")
        assert "element_id" in keys

    def test_unknown_tool_returns_empty(self):
        """Unknown tool should return empty set."""
        healer = ArgumentHealer()
        keys = healer._get_expected_keys("unknown_tool")
        assert keys == set()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
