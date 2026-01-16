"""Self-healing utilities for automatic error recovery.

This module provides patterns for:
- Fuzzy key matching in dictionaries
- Deep recursive key search
- Adaptive response parsing with learning
- Circuit breaker for limiting self-correction
- Self-healing import hooks

Usage:
    from common.self_healing import SelfHealingResponse, fuzzy_get

    # Wrap API responses
    response = api_call()
    healed = SelfHealingResponse(response)
    value = healed['element_id']  # Auto-corrects to 'wall_id' if similar

    # Or use standalone functions
    value = fuzzy_get(data, 'element_id', threshold=0.75)
    value = deep_get(data, 'vertices')  # Finds at any nesting level
"""

from __future__ import annotations

import importlib
import importlib.util
import logging
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Optional, TypeVar, Union

logger = logging.getLogger(__name__)
T = TypeVar("T")


# =============================================================================
# Configuration
# =============================================================================


@dataclass
class SelfHealingConfig:
    """Configuration for self-healing behavior."""

    fuzzy_threshold: float = 0.75
    enable_deep_search: bool = True
    enable_path_learning: bool = True
    circuit_breaker_threshold: int = 5
    log_corrections: bool = True
    strict_mode: bool = False  # If True, raise on low-confidence corrections


# =============================================================================
# Semantic Aliases (for domain-specific mappings)
# =============================================================================

# Maps generic/expected keys to domain-specific equivalents
# These handle cases where strings are semantically related but not similar
SEMANTIC_ALIASES: dict[str, list[str]] = {
    # Generic ID aliases
    "element_id": [
        "wall_id",
        "floor_id",
        "door_id",
        "window_id",
        "room_id",
        "id",
        "uuid",
    ],
    "id": ["element_id", "wall_id", "floor_id", "uuid", "guid"],
    # Mesh/geometry aliases
    "mesh": ["vertices", "indices", "triangles", "geometry"],
    "vertex_count": ["num_vertices", "vertices_count", "vert_count"],
    "triangle_count": ["num_triangles", "indices_count", "tri_count", "face_count"],
    # Count/total aliases
    "count": ["total", "length", "size", "num"],
    "total": ["count", "length", "size"],
}


def get_semantic_aliases(key: str) -> list[str]:
    """Get semantic aliases for a key."""
    return SEMANTIC_ALIASES.get(key.lower(), [])


# =============================================================================
# Fuzzy Dictionary
# =============================================================================


class FuzzyDict(dict):
    """Dictionary with fuzzy key matching and semantic aliases.

    If exact key not found, tries:
    1. Semantic aliases (e.g., element_id -> wall_id)
    2. Fuzzy string matching above threshold

    Example:
        d = FuzzyDict({'wall_id': '123', 'floor_id': '456'}, threshold=0.75)
        print(d['element_id'])  # Returns '123' via semantic alias
        print(d['wal_id'])      # Returns '123' via fuzzy match (typo)
    """

    def __init__(
        self, *args, threshold: float = 0.75, use_aliases: bool = True, **kwargs
    ):
        super().__init__(*args, **kwargs)
        self.threshold = threshold
        self.use_aliases = use_aliases
        self.corrections: list[dict] = []

    def __getitem__(self, key: str) -> Any:
        # Try exact match first
        if key in self.keys():
            return super().__getitem__(key)

        # Try semantic aliases
        if self.use_aliases:
            for alias in get_semantic_aliases(key):
                if alias in self.keys():
                    self._log_correction(key, alias, 1.0, "semantic_alias")
                    return super().__getitem__(alias)

        # Fuzzy match
        best_key, best_score = self._find_best_match(key)
        if best_score >= self.threshold:
            self._log_correction(key, best_key, best_score, "fuzzy_match")
            return super().__getitem__(best_key)

        # Provide helpful error with suggestions
        aliases = get_semantic_aliases(key)
        alias_hint = f" Known aliases: {aliases}" if aliases else ""
        raise KeyError(
            f"'{key}' not found. "
            f"Did you mean '{best_key}'? (similarity: {best_score:.0%}){alias_hint}"
        )

    def get(self, key: str, default: T = None) -> T:
        try:
            return self[key]
        except KeyError:
            return default

    def _find_best_match(self, target: str) -> tuple[Optional[str], float]:
        """Find the key most similar to target."""
        best_key, best_score = None, 0.0

        for candidate in self.keys():
            score = SequenceMatcher(
                None, target.lower(), str(candidate).lower()
            ).ratio()

            if score > best_score:
                best_key, best_score = candidate, score

        return best_key, best_score

    def _log_correction(
        self, requested: str, matched: str, score: float, strategy: str = "fuzzy_match"
    ):
        """Log correction for audit."""
        correction = {
            "requested": requested,
            "matched": matched,
            "score": score,
            "strategy": strategy,
            "timestamp": datetime.now().isoformat(),
        }
        self.corrections.append(correction)
        if strategy == "semantic_alias":
            logger.warning(f"Self-healed via alias: '{requested}' -> '{matched}'")
        else:
            logger.warning(
                f"Self-healed key access: '{requested}' -> '{matched}' "
                f"(similarity: {score:.0%})"
            )


# =============================================================================
# Standalone Functions
# =============================================================================


def fuzzy_get(
    d: dict,
    key: str,
    default: T = None,
    threshold: float = 0.75,
    use_aliases: bool = True,
) -> T:
    """Get value from dict with semantic aliases and fuzzy key matching.

    Args:
        d: Dictionary to search
        key: Key to find
        default: Default value if not found
        threshold: Minimum similarity score (0-1) to accept match
        use_aliases: Whether to check semantic aliases first

    Returns:
        Value for matching key, or default

    Example:
        data = {'wall_id': '123'}
        value = fuzzy_get(data, 'element_id')  # Returns '123' via semantic alias
    """
    if key in d:
        return d[key]

    # Try semantic aliases first
    if use_aliases:
        for alias in get_semantic_aliases(key):
            if alias in d:
                logger.warning(f"Resolved '{key}' via semantic alias -> '{alias}'")
                return d[alias]

    # Find best fuzzy match
    best_key, best_score = None, 0.0
    for candidate in d.keys():
        score = SequenceMatcher(None, key.lower(), str(candidate).lower()).ratio()
        if score > best_score:
            best_key, best_score = candidate, score

    if best_score >= threshold:
        logger.warning(f"Fuzzy matched '{key}' to '{best_key}' ({best_score:.0%})")
        return d[best_key]

    return default


def deep_get(
    data: Union[dict, list], key: str, default: T = None, threshold: float = 0.75
) -> T:
    """Recursively search for key at any nesting level.

    Args:
        data: Dictionary or list to search
        key: Key to find
        default: Default value if not found
        threshold: Minimum similarity for fuzzy matching

    Returns:
        Value if found, else default

    Example:
        data = {'response': {'data': {'vertices': [...]}}}
        verts = deep_get(data, 'vertices')  # Found at data.response.data.vertices
    """
    if isinstance(data, dict):
        # Check current level (exact)
        if key in data:
            return data[key]

        # Check current level (fuzzy)
        for k in data.keys():
            score = SequenceMatcher(None, key.lower(), k.lower()).ratio()
            if score >= threshold:
                logger.debug(f"Deep search fuzzy matched '{key}' to '{k}'")
                return data[k]

        # Recurse into children
        for v in data.values():
            result = deep_get(v, key, default, threshold)
            if result is not default:
                return result

    elif isinstance(data, list):
        for item in data:
            result = deep_get(item, key, default, threshold)
            if result is not default:
                return result

    return default


# =============================================================================
# Adaptive Response Parser
# =============================================================================


class AdaptiveResponseParser:
    """Parser that adapts to different response structures.

    Features:
    - Semantic aliases (element_id -> wall_id)
    - Recursive key search at any nesting level
    - Structure learning - remembers where keys were found
    - Fuzzy key matching combined with deep search
    """

    def __init__(self, threshold: float = 0.75, use_aliases: bool = True):
        self.threshold = threshold
        self.use_aliases = use_aliases
        self.learned_paths: dict[str, str] = {}
        self.corrections: list[dict] = []

    def get(self, data: dict, key: str, default: T = None) -> T:
        """Get value using adaptive strategies.

        Strategy order:
        1. Direct key access
        2. Semantic aliases
        3. Use learned path
        4. Fuzzy match at current level
        5. Deep recursive search
        """
        # Strategy 1: Direct access
        if isinstance(data, dict) and key in data:
            return data[key]

        # Strategy 2: Semantic aliases
        if self.use_aliases and isinstance(data, dict):
            for alias in get_semantic_aliases(key):
                if alias in data:
                    self._log_correction(key, alias, "semantic_alias", 1.0)
                    self._learn_path(key, alias)
                    return data[alias]

        # Strategy 3: Use learned path
        if key in self.learned_paths:
            result = self._follow_path(data, self.learned_paths[key])
            if result is not None:
                return result

        # Strategy 4: Fuzzy match at current level
        if isinstance(data, dict):
            result, matched_key = self._fuzzy_match(data, key)
            if result is not None:
                self._learn_path(key, matched_key)
                return result

        # Strategy 5: Deep search
        result, path = self._deep_search(data, key)
        if result is not None:
            self._learn_path(key, path)
            self._log_correction(key, path, "deep_search")
            return result

        return default

    def _fuzzy_match(self, data: dict, key: str) -> tuple[Any, Optional[str]]:
        """Fuzzy match key at current level."""
        best_key, best_score = None, 0.0

        for candidate in data.keys():
            score = SequenceMatcher(None, key.lower(), str(candidate).lower()).ratio()
            if score > best_score:
                best_key, best_score = candidate, score

        if best_score >= self.threshold:
            self._log_correction(key, best_key, "fuzzy_match", best_score)
            return data[best_key], best_key

        return None, None

    def _deep_search(
        self, data: Union[dict, list], key: str, path: str = "$"
    ) -> tuple[Any, Optional[str]]:
        """Recursively search for key at any depth."""
        if isinstance(data, dict):
            # Check current level (with fuzzy)
            for k, v in data.items():
                score = SequenceMatcher(None, key.lower(), k.lower()).ratio()
                if score >= self.threshold:
                    return v, f"{path}.{k}"

            # Recurse into children
            for k, v in data.items():
                result, found_path = self._deep_search(v, key, f"{path}.{k}")
                if result is not None:
                    return result, found_path

        elif isinstance(data, list):
            for i, item in enumerate(data):
                result, found_path = self._deep_search(item, key, f"{path}[{i}]")
                if result is not None:
                    return result, found_path

        return None, None

    def _follow_path(self, data: Any, path: str) -> Any:
        """Follow a learned JSON path to retrieve value."""
        parts = re.findall(r"\.(\w+)|\[(\d+)\]", path)

        current = data
        for dot_key, bracket_idx in parts:
            if dot_key:
                if isinstance(current, dict) and dot_key in current:
                    current = current[dot_key]
                else:
                    return None
            elif bracket_idx:
                idx = int(bracket_idx)
                if isinstance(current, list) and len(current) > idx:
                    current = current[idx]
                else:
                    return None

        return current

    def _learn_path(self, key: str, path: str):
        """Remember where a key was found."""
        self.learned_paths[key] = path
        logger.debug(f"Learned path for '{key}': {path}")

    def _log_correction(self, key: str, found: str, strategy: str, score: float = None):
        """Log correction for audit."""
        correction = {
            "requested": key,
            "found": found,
            "strategy": strategy,
            "score": score,
            "timestamp": datetime.now().isoformat(),
        }
        self.corrections.append(correction)
        logger.warning(
            f"Self-healed data access: '{key}' found at '{found}' "
            f"(strategy: {strategy})"
        )


# =============================================================================
# Self-Healing Response Wrapper
# =============================================================================


class SelfHealingResponse:
    """Wrapper that makes API responses self-healing.

    Usage:
        response = api_call()
        healed = SelfHealingResponse(response)

        # These will auto-correct if possible:
        wall_id = healed['element_id']  # Finds 'wall_id' via fuzzy match
        vertices = healed['mesh']['vertices']  # Deep search finds it
    """

    def __init__(self, data: dict, config: SelfHealingConfig = None):
        self.data = data
        self.config = config or SelfHealingConfig()
        self.parser = AdaptiveResponseParser(self.config.fuzzy_threshold)

    def __getitem__(self, key: str) -> Any:
        result = self.parser.get(self.data, key)
        if result is None:
            raise KeyError(
                f"'{key}' not found even after self-healing. "
                f"Available keys: {list(self.data.keys()) if isinstance(self.data, dict) else 'N/A'}"
            )

        # If result is dict, wrap it for chained access
        if isinstance(result, dict):
            return SelfHealingResponse(result, self.config)

        return result

    def get(self, key: str, default: Any = None) -> Any:
        try:
            return self[key]
        except KeyError:
            return default

    def raw(self) -> dict:
        """Get the raw, unprocessed data."""
        return self.data

    def get_corrections(self) -> list[dict]:
        """Get list of all corrections applied."""
        return self.parser.corrections

    def __repr__(self) -> str:
        return f"SelfHealingResponse({self.data})"


# =============================================================================
# Circuit Breaker
# =============================================================================


class CircuitState(Enum):
    CLOSED = "closed"  # Normal operation, self-healing active
    OPEN = "open"  # Too many failures, self-healing disabled
    HALF_OPEN = "half_open"  # Testing if we can re-enable


@dataclass
class CircuitBreaker:
    """Circuit breaker to prevent runaway self-correction.

    If too many corrections fail, disable self-healing and escalate.
    """

    failure_threshold: int = 5
    success_threshold: int = 2
    timeout_seconds: int = 60

    state: CircuitState = field(default=CircuitState.CLOSED)
    failures: int = field(default=0)
    successes: int = field(default=0)
    last_failure_time: Optional[datetime] = field(default=None)
    corrections_attempted: int = field(default=0)
    corrections_successful: int = field(default=0)

    def can_attempt_correction(self) -> bool:
        """Check if we should attempt self-correction."""
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            if self.last_failure_time:
                elapsed = datetime.now() - self.last_failure_time
                if elapsed > timedelta(seconds=self.timeout_seconds):
                    self.state = CircuitState.HALF_OPEN
                    self.successes = 0
                    logger.info("Circuit breaker entering HALF_OPEN state")
                    return True
            return False

        if self.state == CircuitState.HALF_OPEN:
            return True

        return False

    def record_success(self):
        """Record successful correction."""
        self.corrections_attempted += 1
        self.corrections_successful += 1
        self.failures = 0

        if self.state == CircuitState.HALF_OPEN:
            self.successes += 1
            if self.successes >= self.success_threshold:
                self.state = CircuitState.CLOSED
                logger.info("Circuit breaker CLOSED - self-healing restored")

    def record_failure(self):
        """Record failed correction."""
        self.corrections_attempted += 1
        self.failures += 1
        self.last_failure_time = datetime.now()

        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            logger.warning("Circuit breaker OPEN - self-healing disabled")
        elif self.failures >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(
                f"Circuit breaker OPEN after {self.failures} failures - "
                "self-healing disabled, human intervention required"
            )

    def get_stats(self) -> dict:
        """Get circuit breaker statistics."""
        return {
            "state": self.state.value,
            "corrections_attempted": self.corrections_attempted,
            "corrections_successful": self.corrections_successful,
            "success_rate": (
                self.corrections_successful / self.corrections_attempted
                if self.corrections_attempted > 0
                else 0
            ),
            "current_failures": self.failures,
            "failure_threshold": self.failure_threshold,
        }


def with_circuit_breaker(breaker: CircuitBreaker, fallback: Callable[[], Any] = None):
    """Decorator to wrap function with circuit breaker protection."""

    def decorator(func: Callable):
        def wrapper(*args, **kwargs):
            if not breaker.can_attempt_correction():
                logger.warning(
                    f"Circuit breaker OPEN - skipping self-healing in {func.__name__}"
                )
                if fallback:
                    return fallback()
                raise RuntimeError("Self-healing disabled by circuit breaker")

            try:
                result = func(*args, **kwargs)
                breaker.record_success()
                return result
            except Exception:
                breaker.record_failure()
                raise

        return wrapper

    return decorator


# =============================================================================
# Self-Healing Import Hook
# =============================================================================


class SelfHealingImporter:
    """Import hook that auto-corrects common module resolution issues."""

    def __init__(self, search_roots: list[Path] = None):
        self.search_roots = search_roots or [Path.cwd()]
        self.corrections: list[dict] = []

    def find_spec(self, fullname: str, path=None, target=None):
        """Modern import hook interface (PEP 451)."""
        # Try standard import first
        try:
            spec = importlib.util.find_spec(fullname)
            if spec:
                return None  # Let normal import handle it
        except (ModuleNotFoundError, ValueError):
            pass

        # Correction 1: Hyphen to underscore
        corrected_name = fullname.replace("-", "_")
        if corrected_name != fullname:
            try:
                spec = importlib.util.find_spec(corrected_name)
                if spec:
                    self._log_correction(
                        fullname, corrected_name, "hyphen_to_underscore"
                    )
                    return spec
            except (ModuleNotFoundError, ValueError):
                pass

        # Correction 2: Filesystem search
        for root in self.search_roots:
            module_path = self._search_filesystem(root, corrected_name)
            if module_path:
                sys.path.insert(0, str(module_path.parent))
                self._log_correction(fullname, str(module_path), "path_discovery")
                try:
                    return importlib.util.find_spec(corrected_name)
                except (ModuleNotFoundError, ValueError):
                    pass

        return None

    def _search_filesystem(self, root: Path, module_name: str) -> Optional[Path]:
        """Search for package in filesystem."""
        parts = module_name.split(".")
        package_name = parts[0]

        try:
            for candidate in root.rglob(f"**/{package_name}"):
                if candidate.is_dir() and (candidate / "__init__.py").exists():
                    return candidate
        except (PermissionError, OSError):
            pass

        return None

    def _log_correction(self, original: str, corrected: str, strategy: str):
        """Log correction for audit trail."""
        correction = {
            "original": original,
            "corrected": corrected,
            "strategy": strategy,
            "timestamp": datetime.now().isoformat(),
        }
        self.corrections.append(correction)
        logger.warning(
            f"Self-healed import: '{original}' -> '{corrected}' (strategy: {strategy})"
        )


def install_import_hook(search_roots: list[Path] = None) -> SelfHealingImporter:
    """Install the self-healing import hook.

    Args:
        search_roots: Directories to search for packages

    Returns:
        The installed hook instance

    Example:
        hook = install_import_hook([Path('/my/project')])
        import my_module  # Will auto-discover if not in sys.path
    """
    hook = SelfHealingImporter(search_roots)
    sys.meta_path.insert(0, hook)
    return hook
