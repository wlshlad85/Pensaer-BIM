"""Live benchmark client — hits the /api/benchmark/* endpoints."""

from __future__ import annotations

import logging
from typing import Optional

from pensaer_scaling_lab.utils.http import get_json, post_json

logger = logging.getLogger(__name__)


class BenchmarkClient:
    """Client for the server benchmark API endpoints."""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")

    def is_available(self) -> bool:
        """Check if the benchmark API is reachable."""
        try:
            status = get_json(f"{self.base_url}/api/benchmark/status", timeout=3.0)
            return "benchmarks" in status
        except Exception as e:
            logger.warning(f"Benchmark API unreachable: {e}")
            return False

    def status(self) -> dict:
        return get_json(f"{self.base_url}/api/benchmark/status")

    def regen(
        self,
        total_elements: int,
        affected_elements: int,
        element_type: str = "wall",
    ) -> dict:
        """Call B2.1 regen benchmark endpoint."""
        return post_json(
            f"{self.base_url}/api/benchmark/regen",
            {
                "total_elements": total_elements,
                "affected_elements": affected_elements,
                "element_type": element_type,
            },
        )

    def collaboration(
        self,
        concurrent_users: int,
        operations_per_user: int,
        conflict_rate: float = 0.1,
    ) -> dict:
        """Call B2.2 collaboration benchmark endpoint."""
        return post_json(
            f"{self.base_url}/api/benchmark/collaboration",
            {
                "concurrent_users": concurrent_users,
                "operations_per_user": operations_per_user,
                "conflict_rate": conflict_rate,
            },
        )

    def governance(
        self,
        operations: int,
        approval_mode: str = "auto",
        bulk_size: int = 50,
    ) -> dict:
        """Call B2.3 governance benchmark endpoint."""
        return post_json(
            f"{self.base_url}/api/benchmark/governance",
            {
                "operations": operations,
                "approval_mode": approval_mode,
                "bulk_size": bulk_size,
            },
        )
