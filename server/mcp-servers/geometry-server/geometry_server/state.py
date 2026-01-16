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
        self._selected: set[str] = set()  # Current selection
        self._groups: dict[str, dict[str, Any]] = {}  # Named element groups

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
    # Selection Management
    # =========================================================================

    def select_elements(
        self,
        element_ids: list[str],
        mode: str = "replace",
    ) -> dict[str, Any]:
        """Select elements with specified mode.

        Args:
            element_ids: List of element UUIDs to select
            mode: Selection mode - replace, add, remove, toggle

        Returns:
            Dict with selection results including valid/invalid IDs
        """
        # Validate element IDs exist
        valid_ids = [eid for eid in element_ids if eid in self._elements]
        invalid_ids = [eid for eid in element_ids if eid not in self._elements]

        if mode == "replace":
            self._selected = set(valid_ids)
        elif mode == "add":
            self._selected.update(valid_ids)
        elif mode == "remove":
            self._selected.difference_update(valid_ids)
        elif mode == "toggle":
            for eid in valid_ids:
                if eid in self._selected:
                    self._selected.discard(eid)
                else:
                    self._selected.add(eid)

        self._record_event(
            "selection_changed",
            {
                "mode": mode,
                "requested_ids": element_ids,
                "valid_ids": valid_ids,
                "selected_count": len(self._selected),
            },
        )

        return {
            "selected_ids": list(self._selected),
            "selected_count": len(self._selected),
            "valid_ids": valid_ids,
            "invalid_ids": invalid_ids,
        }

    def deselect_elements(self, element_ids: list[str]) -> dict[str, Any]:
        """Remove elements from selection."""
        return self.select_elements(element_ids, mode="remove")

    def clear_selection(self) -> int:
        """Clear all selections.

        Returns:
            Count of elements that were deselected
        """
        count = len(self._selected)
        self._selected.clear()
        self._record_event("selection_cleared", {"cleared_count": count})
        return count

    def get_selected(self) -> list[ElementRecord]:
        """Get all selected element records."""
        return [
            self._elements[eid]
            for eid in self._selected
            if eid in self._elements
        ]

    def get_selected_ids(self) -> list[str]:
        """Get list of selected element IDs."""
        return list(self._selected)

    def is_selected(self, element_id: str) -> bool:
        """Check if an element is selected."""
        return element_id in self._selected

    def get_selection_summary(self) -> dict[str, Any]:
        """Get summary of current selection."""
        type_counts: dict[str, int] = {}
        for eid in self._selected:
            if eid in self._elements:
                etype = self._elements[eid].element_type
                type_counts[etype] = type_counts.get(etype, 0) + 1

        return {
            "selected_count": len(self._selected),
            "selected_ids": list(self._selected),
            "elements_by_type": type_counts,
        }

    # =========================================================================
    # Group Management
    # =========================================================================

    def create_group(
        self,
        name: str,
        element_ids: list[str],
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Create a named group of elements.

        Args:
            name: Group name
            element_ids: Elements to include in group
            metadata: Optional group metadata

        Returns:
            Group ID (UUID)
        """
        group_id = str(uuid4())
        valid_ids = [eid for eid in element_ids if eid in self._elements]

        self._groups[group_id] = {
            "id": group_id,
            "name": name,
            "element_ids": set(valid_ids),
            "created_at": datetime.utcnow().isoformat(),
            "metadata": metadata or {},
        }

        self._record_event(
            "group_created",
            {"group_id": group_id, "name": name, "element_count": len(valid_ids)},
        )

        return group_id

    def add_to_group(self, group_id: str, element_ids: list[str]) -> bool:
        """Add elements to an existing group.

        Returns:
            True if group exists and elements were added
        """
        if group_id not in self._groups:
            return False

        valid_ids = [eid for eid in element_ids if eid in self._elements]
        self._groups[group_id]["element_ids"].update(valid_ids)

        self._record_event(
            "group_modified",
            {"group_id": group_id, "added_count": len(valid_ids)},
        )

        return True

    def remove_from_group(self, group_id: str, element_ids: list[str]) -> bool:
        """Remove elements from a group.

        Returns:
            True if group exists and elements were removed
        """
        if group_id not in self._groups:
            return False

        self._groups[group_id]["element_ids"].difference_update(element_ids)

        self._record_event(
            "group_modified",
            {"group_id": group_id, "removed_count": len(element_ids)},
        )

        return True

    def delete_group(self, group_id: str) -> bool:
        """Delete a group (elements remain).

        Returns:
            True if group was deleted
        """
        if group_id not in self._groups:
            return False

        del self._groups[group_id]
        self._record_event("group_deleted", {"group_id": group_id})
        return True

    def get_group(self, group_id: str) -> dict[str, Any] | None:
        """Get a group by ID."""
        group = self._groups.get(group_id)
        if group:
            # Return copy with element_ids as list for JSON serialization
            return {
                **group,
                "element_ids": list(group["element_ids"]),
            }
        return None

    def list_groups(self) -> list[dict[str, Any]]:
        """List all groups."""
        return [
            {
                **group,
                "element_ids": list(group["element_ids"]),
                "element_count": len(group["element_ids"]),
            }
            for group in self._groups.values()
        ]

    def select_group(self, group_id: str, mode: str = "replace") -> dict[str, Any]:
        """Select all elements in a group.

        Args:
            group_id: The group to select
            mode: Selection mode (replace, add, toggle)

        Returns:
            Selection result dict
        """
        if group_id not in self._groups:
            return {
                "selected_ids": list(self._selected),
                "selected_count": len(self._selected),
                "valid_ids": [],
                "invalid_ids": [],
                "error": f"Group {group_id} not found",
            }

        element_ids = list(self._groups[group_id]["element_ids"])
        return self.select_elements(element_ids, mode=mode)

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
            "total_selected": len(self._selected),
            "total_groups": len(self._groups),
            "elements_by_type": type_counts,
        }

    def clear(self) -> None:
        """Clear all state (for testing)."""
        self._elements.clear()
        self._joins.clear()
        self._events.clear()
        self._selected.clear()
        self._groups.clear()


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
