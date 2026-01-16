"""BIM-specific self-healing utilities for the Geometry MCP Server.

This module extends the common self-healing framework with:
- BIM domain semantic aliases
- Tool argument normalization
- Response healing for AI agent consumption
- Circuit breaker for resilience

Usage:
    from .self_healing import (
        heal_tool_args,
        heal_response,
        get_circuit_breaker
    )

    # Heal incoming arguments
    args = heal_tool_args('create_wall', raw_args)

    # Heal outgoing response
    response = heal_response(raw_response)
"""

import logging
import sys
from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass, field
from datetime import datetime

# Add common utilities to path
_common_path = Path(__file__).parent.parent.parent.parent / "common"
if str(_common_path) not in sys.path:
    sys.path.insert(0, str(_common_path))

from self_healing import (  # noqa: E402
    SelfHealingConfig,
    SelfHealingResponse,
    FuzzyDict,
    AdaptiveResponseParser,
    CircuitBreaker,
    CircuitState,
    fuzzy_get,
    deep_get,
    SEMANTIC_ALIASES,
)

logger = logging.getLogger("pensaer-geometry.self-healing")


# =============================================================================
# BIM Domain Semantic Aliases
# =============================================================================

# Extend the base aliases with BIM-specific mappings
BIM_SEMANTIC_ALIASES: dict[str, list[str]] = {
    # Element ID variations
    "element_id": [
        "wall_id",
        "floor_id",
        "door_id",
        "window_id",
        "room_id",
        "id",
        "uuid",
        "element_uuid",
    ],
    "wall_id": ["element_id", "id", "uuid"],
    "floor_id": ["element_id", "id", "uuid"],
    "door_id": ["element_id", "opening_id", "id", "uuid"],
    "window_id": ["element_id", "opening_id", "id", "uuid"],
    "room_id": ["element_id", "space_id", "id", "uuid"],
    # Geometry parameter variations
    "start": ["start_point", "from", "from_point", "p1", "point1", "origin"],
    "end": ["end_point", "to", "to_point", "p2", "point2", "destination"],
    "min_point": ["min", "bottom_left", "origin", "start", "lower_left"],
    "max_point": ["max", "top_right", "corner", "end", "upper_right"],
    # Dimension variations
    "height": ["wall_height", "h", "elevation", "z"],
    "thickness": ["wall_thickness", "width", "depth", "t"],
    "length": ["wall_length", "len", "l", "distance"],
    "offset": ["position", "distance", "offset_along_wall", "location"],
    "sill_height": ["sill", "sill_elevation", "base_height"],
    # Type variations
    "wall_type": ["type", "category", "classification"],
    "floor_type": ["type", "category", "slab_type"],
    "door_type": ["type", "style", "door_style"],
    "window_type": ["type", "style", "window_style"],
    # Mesh/geometry variations
    "vertices": ["verts", "points", "vertex_list", "coords"],
    "indices": ["faces", "triangles", "tris", "face_indices"],
    "vertex_count": ["num_vertices", "vert_count", "point_count"],
    "triangle_count": ["num_triangles", "face_count", "tri_count"],
    # Response variations
    "success": ["ok", "succeeded", "status"],
    "data": ["result", "response", "payload"],
    "error": ["err", "failure", "exception"],
    "message": ["msg", "description", "text"],
    # List parameter variations
    "element_ids": ["elements", "ids", "uuids", "wall_ids"],
    "wall_ids": ["walls", "element_ids", "ids"],
}


def get_bim_aliases(key: str) -> list[str]:
    """Get BIM-specific semantic aliases for a key."""
    # Check BIM aliases first, then fall back to base aliases
    key_lower = key.lower()
    if key_lower in BIM_SEMANTIC_ALIASES:
        return BIM_SEMANTIC_ALIASES[key_lower]
    return SEMANTIC_ALIASES.get(key_lower, [])


# =============================================================================
# Argument Healing
# =============================================================================


@dataclass
class ArgumentHealer:
    """Heals incoming tool arguments with fuzzy matching and aliases."""

    threshold: float = 0.75
    use_aliases: bool = True
    corrections: list[dict] = field(default_factory=list)

    def heal(self, tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
        """Heal arguments for a specific tool.

        Args:
            tool_name: Name of the tool being called
            args: Raw arguments from the caller

        Returns:
            Healed arguments with corrected keys
        """
        expected_keys = self._get_expected_keys(tool_name)
        healed = {}

        # First pass: copy exact matches
        for key, value in args.items():
            if key in expected_keys:
                healed[key] = value
            else:
                # Try to heal the key
                healed_key = self._heal_key(key, expected_keys)
                if healed_key:
                    healed[healed_key] = value
                    self._log_correction(tool_name, key, healed_key)
                else:
                    # Keep original (might be optional/extra)
                    healed[key] = value

        return healed

    def _heal_key(self, key: str, expected_keys: set[str]) -> Optional[str]:
        """Try to heal a key to match expected keys."""
        from difflib import SequenceMatcher

        # Check BIM aliases - check if incoming key is an alias of any expected key
        if self.use_aliases:
            # First, check if any expected key has 'key' as an alias
            for expected in expected_keys:
                aliases = get_bim_aliases(expected)
                if key in aliases or key.lower() in [a.lower() for a in aliases]:
                    return expected

            # Also check reverse: if key has an alias that matches expected
            for alias in get_bim_aliases(key):
                if alias in expected_keys:
                    return alias

        # Fuzzy match
        best_match, best_score = None, 0.0
        for expected in expected_keys:
            score = SequenceMatcher(None, key.lower(), expected.lower()).ratio()
            if score > best_score:
                best_match, best_score = expected, score

        if best_score >= self.threshold:
            return best_match

        return None

    def _get_expected_keys(self, tool_name: str) -> set[str]:
        """Get expected parameter keys for a tool."""
        # Tool -> expected parameters mapping
        TOOL_PARAMS = {
            "create_wall": {
                "start",
                "end",
                "height",
                "thickness",
                "wall_type",
                "level_id",
                "reasoning",
            },
            "create_rectangular_walls": {
                "min_point",
                "max_point",
                "height",
                "thickness",
                "reasoning",
            },
            "create_floor": {
                "min_point",
                "max_point",
                "thickness",
                "floor_type",
                "level_id",
                "reasoning",
            },
            "create_room": {
                "name",
                "number",
                "min_point",
                "max_point",
                "height",
                "reasoning",
            },
            "place_door": {
                "wall_id",
                "offset",
                "width",
                "height",
                "door_type",
                "swing",
                "reasoning",
            },
            "place_window": {
                "wall_id",
                "offset",
                "width",
                "height",
                "sill_height",
                "window_type",
                "reasoning",
            },
            "detect_joins": {"wall_ids", "tolerance", "reasoning"},
            "get_element": {"element_id"},
            "list_elements": {"category", "level_id", "limit", "offset"},
            "delete_element": {"element_ids", "reasoning"},
            "generate_mesh": {"element_id", "format"},
            "validate_mesh": {"element_id"},
            "create_simple_building": {
                "min_point",
                "max_point",
                "wall_height",
                "wall_thickness",
                "floor_thickness",
                "room_name",
                "room_number",
                "reasoning",
            },
            "get_state_summary": set(),
        }
        return TOOL_PARAMS.get(tool_name, set())

    def _log_correction(self, tool: str, original: str, corrected: str):
        """Log argument correction."""
        correction = {
            "tool": tool,
            "original_key": original,
            "corrected_key": corrected,
            "timestamp": datetime.now().isoformat(),
        }
        self.corrections.append(correction)
        logger.warning(f"Healed arg for {tool}: '{original}' -> '{corrected}'")


# =============================================================================
# Response Healing
# =============================================================================


class BIMResponseParser(AdaptiveResponseParser):
    """Response parser with BIM-specific semantic aliases."""

    def __init__(self, threshold: float = 0.75):
        super().__init__(threshold=threshold, use_aliases=True)

    def _get_aliases(self, key: str) -> list[str]:
        """Override to use BIM aliases."""
        return get_bim_aliases(key)


class BIMSelfHealingResponse(SelfHealingResponse):
    """Self-healing response wrapper with BIM-specific behavior."""

    def __init__(self, data: dict, config: SelfHealingConfig = None):
        super().__init__(data, config)
        # Use BIM-specific parser
        self.parser = BIMResponseParser(self.config.fuzzy_threshold)


def heal_response(response: dict) -> BIMSelfHealingResponse:
    """Wrap a response with BIM-specific self-healing.

    Args:
        response: Raw response dictionary

    Returns:
        Self-healing response wrapper
    """
    return BIMSelfHealingResponse(response)


# =============================================================================
# Circuit Breaker
# =============================================================================

# Global circuit breaker instance
_circuit_breaker: Optional[CircuitBreaker] = None


def get_circuit_breaker() -> CircuitBreaker:
    """Get the global circuit breaker instance."""
    global _circuit_breaker
    if _circuit_breaker is None:
        _circuit_breaker = CircuitBreaker(
            failure_threshold=5, success_threshold=2, timeout_seconds=60
        )
    return _circuit_breaker


def reset_circuit_breaker():
    """Reset the circuit breaker (for testing)."""
    global _circuit_breaker
    _circuit_breaker = None


# =============================================================================
# Convenience Functions
# =============================================================================

# Global argument healer
_argument_healer: Optional[ArgumentHealer] = None


def get_argument_healer() -> ArgumentHealer:
    """Get the global argument healer instance."""
    global _argument_healer
    if _argument_healer is None:
        _argument_healer = ArgumentHealer()
    return _argument_healer


def heal_tool_args(tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Heal tool arguments with fuzzy matching and aliases.

    Args:
        tool_name: Name of the tool being called
        args: Raw arguments

    Returns:
        Healed arguments

    Example:
        # Caller used 'start_point' instead of 'start'
        args = {'start_point': [0, 0], 'end_point': [5, 0]}
        healed = heal_tool_args('create_wall', args)
        # healed = {'start': [0, 0], 'end': [5, 0]}
    """
    cb = get_circuit_breaker()
    if not cb.can_attempt_correction():
        logger.warning("Circuit breaker OPEN - skipping argument healing")
        return args

    try:
        healer = get_argument_healer()
        healed = healer.heal(tool_name, args)
        if healer.corrections:
            cb.record_success()
        return healed
    except Exception as e:
        logger.error(f"Argument healing failed: {e}")
        cb.record_failure()
        return args


def bim_fuzzy_get(
    d: dict, key: str, default: Any = None, threshold: float = 0.75
) -> Any:
    """Get value from dict with BIM-specific fuzzy matching.

    Args:
        d: Dictionary to search
        key: Key to find
        default: Default value if not found
        threshold: Minimum similarity

    Returns:
        Value or default
    """
    # Direct match
    if key in d:
        return d[key]

    # BIM aliases
    for alias in get_bim_aliases(key):
        if alias in d:
            logger.debug(f"BIM alias: '{key}' -> '{alias}'")
            return d[alias]

    # Fuzzy match
    return fuzzy_get(d, key, default, threshold, use_aliases=False)


def bim_deep_get(
    data: Any, key: str, default: Any = None, threshold: float = 0.75
) -> Any:
    """Deep get with BIM-specific aliases.

    Args:
        data: Data structure to search
        key: Key to find
        default: Default value
        threshold: Minimum similarity

    Returns:
        Value or default
    """
    return deep_get(data, key, default, threshold)


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # BIM Aliases
    "BIM_SEMANTIC_ALIASES",
    "get_bim_aliases",
    # Argument Healing
    "ArgumentHealer",
    "heal_tool_args",
    "get_argument_healer",
    # Response Healing
    "BIMResponseParser",
    "BIMSelfHealingResponse",
    "heal_response",
    # Circuit Breaker
    "CircuitBreaker",
    "CircuitState",
    "get_circuit_breaker",
    "reset_circuit_breaker",
    # Convenience Functions
    "bim_fuzzy_get",
    "bim_deep_get",
    # Re-exports from common
    "SelfHealingConfig",
    "FuzzyDict",
    "fuzzy_get",
    "deep_get",
]
