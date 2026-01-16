"""In-memory state manager for the Geometry MCP Server.

This is a temporary implementation for development/testing.
In production, state will be managed by the PostgreSQL event store
and reconstructed from the event log.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import uuid4


@dataclass
class ElementRecord:
    """Record of an element with metadata."""

    id: str
    element_type: str
    element: Any  # The actual PyO3 object
    created_at: datetime = field(default_factory=datetime.utcnow)
    modified_at: datetime = field(default_factory=datetime.utcnow)
    level_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class GeometryState:
    """In-memory state manager for BIM elements.

    Stores all created elements and provides query/modification operations.
    Thread-safe for single-threaded async use.
    """

    def __init__(self):
        self._elements: dict[str, ElementRecord] = {}
        self._joins: dict[str, Any] = {}
        self._events: list[dict[str, Any]] = []

    # =========================================================================
    # Element Storage
    # =========================================================================

    def add_element(
        self,
        element: Any,
        element_type: str,
        level_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Add an element to the state store.

        Args:
            element: The PyO3 element object
            element_type: Type string (wall, floor, door, etc.)
            level_id: Optional hosting level UUID
            metadata: Optional additional metadata

        Returns:
            The element's UUID string
        """
        element_id = element.id if hasattr(element, "id") else str(uuid4())

        record = ElementRecord(
            id=element_id,
            element_type=element_type,
            element=element,
            level_id=level_id,
            metadata=metadata or {},
        )

        self._elements[element_id] = record
        self._record_event(
            "element_created", {"element_id": element_id, "element_type": element_type}
        )

        return element_id

    def get_element(self, element_id: str) -> ElementRecord | None:
        """Get an element by its UUID."""
        return self._elements.get(element_id)

    def get_element_obj(self, element_id: str) -> Any | None:
        """Get the raw element object by UUID."""
        record = self._elements.get(element_id)
        return record.element if record else None

    def update_element(self, element_id: str, element: Any) -> bool:
        """Update an element in the store."""
        if element_id not in self._elements:
            return False

        self._elements[element_id].element = element
        self._elements[element_id].modified_at = datetime.utcnow()
        self._record_event("element_modified", {"element_id": element_id})
        return True

    def delete_element(self, element_id: str) -> bool:
        """Delete an element from the store."""
        if element_id not in self._elements:
            return False

        del self._elements[element_id]
        self._record_event("element_deleted", {"element_id": element_id})
        return True

    def list_elements(
        self,
        category: str | None = None,
        level_id: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ElementRecord]:
        """List elements with optional filtering."""
        results = []

        for record in self._elements.values():
            # Apply category filter
            if category and record.element_type != category:
                continue

            # Apply level filter
            if level_id and record.level_id != level_id:
                continue

            results.append(record)

        # Apply pagination
        return results[offset : offset + limit]

    def count_elements(self, category: str | None = None) -> int:
        """Count elements, optionally by category."""
        if category is None:
            return len(self._elements)
        return sum(1 for r in self._elements.values() if r.element_type == category)

    # =========================================================================
    # Join Management
    # =========================================================================

    def add_join(self, join: Any) -> str:
        """Add a detected join to the store."""
        join_id = join.id if hasattr(join, "id") else str(uuid4())
        self._joins[join_id] = join
        return join_id

    def get_join(self, join_id: str) -> Any | None:
        """Get a join by ID."""
        return self._joins.get(join_id)

    def list_joins(self) -> list[Any]:
        """List all joins."""
        return list(self._joins.values())

    # =========================================================================
    # Event Logging
    # =========================================================================

    def _record_event(self, event_type: str, data: dict[str, Any]) -> str:
        """Record an event in the event log."""
        event_id = str(uuid4())
        event = {
            "id": event_id,
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self._events.append(event)
        return event_id

    def get_events(self, limit: int = 100) -> list[dict[str, Any]]:
        """Get recent events."""
        return self._events[-limit:]

    # =========================================================================
    # Serialization
    # =========================================================================

    def to_summary(self) -> dict[str, Any]:
        """Get a summary of the current state."""
        type_counts: dict[str, int] = {}
        for record in self._elements.values():
            type_counts[record.element_type] = (
                type_counts.get(record.element_type, 0) + 1
            )

        return {
            "total_elements": len(self._elements),
            "total_joins": len(self._joins),
            "total_events": len(self._events),
            "elements_by_type": type_counts,
        }

    def clear(self) -> None:
        """Clear all state (for testing)."""
        self._elements.clear()
        self._joins.clear()
        self._events.clear()


# Global state instance
_state: GeometryState | None = None


def get_state() -> GeometryState:
    """Get the global state instance."""
    global _state
    if _state is None:
        _state = GeometryState()
    return _state


def reset_state() -> None:
    """Reset the global state (for testing)."""
    global _state
    _state = GeometryState()
