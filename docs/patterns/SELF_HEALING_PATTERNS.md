# Self-Healing Code Patterns for Pensaer

**Document Version:** 1.0
**Date:** 2026-01-15
**Based on:** Analysis of MCP Geometry Server errors and web research
**Implementation:** `server/common/self_healing.py`

---

## Executive Summary

This document outlines self-correcting code patterns that can automatically detect and fix common runtime errors without human intervention. These patterns were identified by analyzing errors encountered during MCP server development and researching industry best practices.

---

## Error Analysis

### Errors Encountered During MCP Server Setup

| Error | Root Cause | Category |
|-------|------------|----------|
| `ModuleNotFoundError: No module named 'geometry_server'` | Package not in sys.path | Path Resolution |
| `ImportError: attempted relative import with no known parent package` | Directory named `geometry-server` (hyphen) instead of `geometry_server` (underscore) | Naming Convention |
| `KeyError: 'element_id'` | Response used `wall_id` instead of `element_id` | Schema Drift |
| `KeyError: 'mesh'` | Expected `data.mesh.vertices` but got `data.vertices` | Structure Mismatch |

---

## Self-Healing Pattern Categories

### Category A: Import/Module Resolution

**Problem:** ModuleNotFoundError, ImportError
**Solution:** Auto-path discovery with naming correction

```python
import sys
import importlib
import importlib.util
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class SelfHealingImporter:
    """Import hook that auto-corrects common module resolution issues.

    Features:
    - Auto-converts hyphens to underscores in package names
    - Searches filesystem for missing packages
    - Logs all corrections for audit

    Reference: https://packaging.python.org/guides/creating-and-discovering-plugins/
    """

    def __init__(self, search_roots: list[Path] = None):
        self.search_roots = search_roots or [Path.cwd()]
        self.corrections: list[dict] = []

    def find_module(self, fullname: str, path=None):
        """Legacy import hook interface."""
        if self._can_correct(fullname):
            return self
        return None

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
        corrected_name = fullname.replace('-', '_')
        if corrected_name != fullname:
            try:
                spec = importlib.util.find_spec(corrected_name)
                if spec:
                    self._log_correction(fullname, corrected_name, 'hyphen_to_underscore')
                    return spec
            except (ModuleNotFoundError, ValueError):
                pass

        # Correction 2: Filesystem search
        for root in self.search_roots:
            module_path = self._search_filesystem(root, corrected_name)
            if module_path:
                sys.path.insert(0, str(module_path.parent))
                self._log_correction(fullname, str(module_path), 'path_discovery')
                return importlib.util.find_spec(corrected_name)

        return None

    def _can_correct(self, fullname: str) -> bool:
        """Check if we might be able to correct this import."""
        return '-' in fullname or any(
            self._search_filesystem(root, fullname.replace('-', '_'))
            for root in self.search_roots
        )

    def _search_filesystem(self, root: Path, module_name: str) -> Optional[Path]:
        """Search for package in filesystem."""
        parts = module_name.split('.')
        package_name = parts[0]

        for candidate in root.rglob(f'**/{package_name}'):
            if candidate.is_dir() and (candidate / '__init__.py').exists():
                return candidate
        return None

    def _log_correction(self, original: str, corrected: str, strategy: str):
        """Log correction for audit trail."""
        correction = {
            'original': original,
            'corrected': corrected,
            'strategy': strategy,
            'timestamp': datetime.now().isoformat()
        }
        self.corrections.append(correction)
        logger.warning(
            f"Self-healed import: '{original}' -> '{corrected}' "
            f"(strategy: {strategy})"
        )


def install_import_hook(search_roots: list[Path] = None):
    """Install the self-healing import hook."""
    hook = SelfHealingImporter(search_roots)
    sys.meta_path.insert(0, hook)
    return hook
```

### Category B: Schema/Key Resolution

**Problem:** KeyError when accessing dictionary keys
**Solution:** Fuzzy key matching with configurable threshold

```python
from difflib import SequenceMatcher
from typing import Any, TypeVar, Optional
import logging

logger = logging.getLogger(__name__)
T = TypeVar('T')

class FuzzyDict(dict):
    """Dictionary with fuzzy key matching.

    If exact key not found, returns value of closest matching key
    above the similarity threshold.

    Reference: https://github.com/pysnippet/fuzzymap
    """

    def __init__(self, *args, threshold: float = 0.75, **kwargs):
        super().__init__(*args, **kwargs)
        self.threshold = threshold
        self.corrections: list[dict] = []

    def __getitem__(self, key: str) -> Any:
        # Try exact match first
        if key in self.keys():
            return super().__getitem__(key)

        # Fuzzy match
        best_key, best_score = self._find_best_match(key)
        if best_score >= self.threshold:
            self._log_correction(key, best_key, best_score)
            return super().__getitem__(best_key)

        # Provide helpful error with suggestions
        raise KeyError(
            f"'{key}' not found. "
            f"Did you mean '{best_key}'? (similarity: {best_score:.0%})"
        )

    def get(self, key: str, default: T = None) -> T:
        try:
            return self[key]
        except KeyError:
            return default

    def _find_best_match(self, target: str) -> tuple[str, float]:
        """Find the key most similar to target."""
        best_key, best_score = None, 0.0

        for candidate in self.keys():
            # Case-insensitive comparison
            score = SequenceMatcher(
                None,
                target.lower(),
                str(candidate).lower()
            ).ratio()

            if score > best_score:
                best_key, best_score = candidate, score

        return best_key, best_score

    def _log_correction(self, requested: str, matched: str, score: float):
        """Log fuzzy match for audit."""
        correction = {
            'requested': requested,
            'matched': matched,
            'score': score,
            'strategy': 'fuzzy_key_match'
        }
        self.corrections.append(correction)
        logger.warning(
            f"Self-healed key access: '{requested}' -> '{matched}' "
            f"(similarity: {score:.0%})"
        )


def fuzzy_get(d: dict, key: str, default: T = None, threshold: float = 0.75) -> T:
    """Get value from dict with fuzzy key matching.

    Args:
        d: Dictionary to search
        key: Key to find
        default: Default value if not found
        threshold: Minimum similarity score (0-1) to accept match

    Returns:
        Value for matching key, or default
    """
    if key in d:
        return d[key]

    # Find best match
    best_key, best_score = None, 0.0
    for candidate in d.keys():
        score = SequenceMatcher(None, key.lower(), str(candidate).lower()).ratio()
        if score > best_score:
            best_key, best_score = candidate, score

    if best_score >= threshold:
        logger.warning(f"Fuzzy matched '{key}' to '{best_key}' ({best_score:.0%})")
        return d[best_key]

    return default
```

### Category C: Structure/Nesting Resolution

**Problem:** KeyError when data structure differs from expectation
**Solution:** Deep key search with structure discovery

```python
from typing import Any, TypeVar, Union
import logging

logger = logging.getLogger(__name__)
T = TypeVar('T')

class AdaptiveResponseParser:
    """Parser that adapts to different response structures.

    Features:
    - Recursive key search at any nesting level
    - Structure learning - remembers where keys were found
    - Fuzzy key matching combined with deep search

    Reference: Microsoft Azure Well-Architected Framework
    https://learn.microsoft.com/azure/well-architected/reliability/self-preservation
    """

    def __init__(self, threshold: float = 0.75):
        self.threshold = threshold
        self.learned_paths: dict[str, str] = {}  # key -> json path
        self.corrections: list[dict] = []

    def get(self, data: dict, key: str, default: T = None) -> T:
        """Get value using adaptive strategies.

        Strategy order:
        1. Direct key access
        2. Check learned paths
        3. Fuzzy key match at current level
        4. Deep recursive search
        5. Return default
        """
        # Strategy 1: Direct access
        if isinstance(data, dict) and key in data:
            return data[key]

        # Strategy 2: Use learned path
        if key in self.learned_paths:
            result = self._follow_path(data, self.learned_paths[key])
            if result is not None:
                return result

        # Strategy 3: Fuzzy match at current level
        if isinstance(data, dict):
            result, matched_key = self._fuzzy_match(data, key)
            if result is not None:
                self._learn_path(key, matched_key)
                return result

        # Strategy 4: Deep search
        result, path = self._deep_search(data, key)
        if result is not None:
            self._learn_path(key, path)
            self._log_correction(key, path, 'deep_search')
            return result

        return default

    def _fuzzy_match(self, data: dict, key: str) -> tuple[Any, str]:
        """Fuzzy match key at current level."""
        best_key, best_score = None, 0.0

        for candidate in data.keys():
            from difflib import SequenceMatcher
            score = SequenceMatcher(None, key.lower(), str(candidate).lower()).ratio()
            if score > best_score:
                best_key, best_score = candidate, score

        if best_score >= self.threshold:
            self._log_correction(key, best_key, 'fuzzy_match', best_score)
            return data[best_key], best_key

        return None, None

    def _deep_search(
        self,
        data: Union[dict, list],
        key: str,
        path: str = '$'
    ) -> tuple[Any, str]:
        """Recursively search for key at any depth."""
        if isinstance(data, dict):
            # Check current level (with fuzzy)
            for k, v in data.items():
                from difflib import SequenceMatcher
                score = SequenceMatcher(None, key.lower(), k.lower()).ratio()
                if score >= self.threshold:
                    return v, f'{path}.{k}'

            # Recurse into children
            for k, v in data.items():
                result, found_path = self._deep_search(v, key, f'{path}.{k}')
                if result is not None:
                    return result, found_path

        elif isinstance(data, list):
            for i, item in enumerate(data):
                result, found_path = self._deep_search(item, key, f'{path}[{i}]')
                if result is not None:
                    return result, found_path

        return None, None

    def _follow_path(self, data: Any, path: str) -> Any:
        """Follow a learned JSON path to retrieve value."""
        import re
        parts = re.findall(r'\.(\w+)|\[(\d+)\]', path)

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

    def _log_correction(
        self,
        key: str,
        found: str,
        strategy: str,
        score: float = None
    ):
        """Log correction for audit."""
        correction = {
            'requested': key,
            'found': found,
            'strategy': strategy,
            'score': score
        }
        self.corrections.append(correction)
        logger.warning(
            f"Self-healed data access: '{key}' found at '{found}' "
            f"(strategy: {strategy})"
        )
```

### Category D: Circuit Breaker for Self-Healing

**Problem:** Self-healing can mask real bugs or create infinite loops
**Solution:** Circuit breaker pattern to limit corrections

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Callable, Any
import logging

logger = logging.getLogger(__name__)

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation, self-healing active
    OPEN = "open"          # Too many failures, self-healing disabled
    HALF_OPEN = "half_open"  # Testing if we can re-enable

@dataclass
class CircuitBreaker:
    """Circuit breaker to prevent runaway self-correction.

    If too many corrections fail (correction didn't help),
    disable self-healing and escalate to human.

    Reference: https://learn.microsoft.com/azure/architecture/guide/design-principles/self-healing
    """

    failure_threshold: int = 5
    success_threshold: int = 2
    timeout_seconds: int = 60

    state: CircuitState = field(default=CircuitState.CLOSED)
    failures: int = field(default=0)
    successes: int = field(default=0)
    last_failure_time: datetime = field(default=None)
    corrections_attempted: int = field(default=0)
    corrections_successful: int = field(default=0)

    def can_attempt_correction(self) -> bool:
        """Check if we should attempt self-correction."""
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            # Check if timeout has passed
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
        """Record failed correction (correction didn't help)."""
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
            'state': self.state.value,
            'corrections_attempted': self.corrections_attempted,
            'corrections_successful': self.corrections_successful,
            'success_rate': (
                self.corrections_successful / self.corrections_attempted
                if self.corrections_attempted > 0 else 0
            ),
            'current_failures': self.failures,
            'failure_threshold': self.failure_threshold
        }


def with_circuit_breaker(
    breaker: CircuitBreaker,
    fallback: Callable[[], Any] = None
):
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
            except Exception as e:
                breaker.record_failure()
                raise

        return wrapper
    return decorator
```

---

## Complete Self-Healing Wrapper

Combining all patterns into a unified wrapper:

```python
from dataclasses import dataclass, field
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)

@dataclass
class SelfHealingConfig:
    """Configuration for self-healing behavior."""
    fuzzy_threshold: float = 0.75
    enable_deep_search: bool = True
    enable_path_learning: bool = True
    circuit_breaker_threshold: int = 5
    log_corrections: bool = True

class SelfHealingResponse:
    """Wrapper that makes API responses self-healing.

    Usage:
        response = api_call()
        healed = SelfHealingResponse(response)

        # These will auto-correct if possible:
        wall_id = healed['element_id']  # Finds 'wall_id' via fuzzy match
        vertices = healed['mesh']['vertices']  # Finds at data.vertices via deep search
    """

    def __init__(
        self,
        data: dict,
        config: SelfHealingConfig = None
    ):
        self.data = data
        self.config = config or SelfHealingConfig()
        self.parser = AdaptiveResponseParser(self.config.fuzzy_threshold)
        self.corrections: list[dict] = []

    def __getitem__(self, key: str) -> Any:
        result = self.parser.get(self.data, key)
        if result is None:
            raise KeyError(
                f"'{key}' not found even after self-healing. "
                f"Available keys: {list(self.data.keys())}"
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
```

---

## Application to MCP Server

Here's how these patterns would have auto-corrected our specific errors:

### Error 1: ModuleNotFoundError

**Before:**
```python
from geometry_server.server import TOOLS  # Fails - not in path
```

**After (with self-healing):**
```python
install_import_hook([Path('/server/mcp-servers')])
from geometry_server.server import TOOLS  # Auto-discovers and adds to path
```

### Error 2: ImportError (hyphen naming)

**Before:**
```python
# Directory is 'geometry-server', Python needs 'geometry_server'
from geometry_server import server  # Fails
```

**After (with self-healing):**
```python
# SelfHealingImporter auto-converts geometry-server -> geometry_server
from geometry_server import server  # Works!
```

### Error 3: KeyError (element_id vs wall_id)

**Before:**
```python
wall_id = response['data']['element_id']  # KeyError - key is 'wall_id'
```

**After (with self-healing):**
```python
healed = SelfHealingResponse(response)
wall_id = healed['data']['element_id']  # Fuzzy matches to 'wall_id'
```

### Error 4: KeyError (structure mismatch)

**Before:**
```python
vertices = response['data']['mesh']['vertex_count']  # KeyError - no 'mesh' wrapper
```

**After (with self-healing):**
```python
healed = SelfHealingResponse(response)
vertex_count = healed['data']['vertex_count']  # Deep search finds it directly
# Or even:
vertex_count = healed['vertex_count']  # Deep search through whole structure
```

---

## Best Practices

### When to Use Self-Healing

| Use Case | Recommended |
|----------|-------------|
| Development/testing | No - fail fast with clear errors |
| Production API clients | Yes - with audit logging |
| Internal service calls | Yes - with circuit breaker |
| User-facing applications | Yes - for resilience |
| Security-critical code | No - fail closed |

### Threshold Tuning

| Threshold | Use Case |
|-----------|----------|
| 0.90+ | Strict - only very similar keys |
| 0.75-0.90 | Balanced - recommended default |
| 0.60-0.75 | Permissive - more corrections, more risk |
| Below 0.60 | Not recommended - too many false positives |

### Audit Requirements

All self-healing corrections MUST be logged with:
- Original requested value
- Corrected/matched value
- Similarity score (for fuzzy matching)
- Strategy used
- Timestamp
- Call stack context

---

## References

- [Self-Healing Code - Stack Overflow Blog](https://stackoverflow.blog/2023/12/28/self-healing-code-is-the-future-of-software-development/)
- [Design for Self-Healing - Azure Architecture Center](https://learn.microsoft.com/azure/architecture/guide/design-principles/self-healing)
- [Microservices Resilience Patterns - GeeksforGeeks](https://www.geeksforgeeks.org/microservices-resilience-patterns/)
- [FuzzyMap - Python Fuzzy Dictionary](https://github.com/pysnippet/fuzzymap)
- [Python Plugin Discovery](https://packaging.python.org/guides/creating-and-discovering-plugins/)
- [Self-Correcting Code Generation Using SLMs (2025)](https://arxiv.org/html/2505.23060)
- [Defensive Programming in Python](https://www.kubeblogs.com/defensive-programming-in-python-part-2-input-validation/)
- [Pydantic Schema Validation](https://medium.com/@vamshiginna1606/ultimate-crash-course-build-smarter-python-apps-with-pydantic-f05d4316b579)
