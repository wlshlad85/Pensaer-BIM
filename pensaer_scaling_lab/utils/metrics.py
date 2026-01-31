"""Metrics computation utilities for scaling experiments."""

import statistics
from dataclasses import dataclass
from typing import Any


@dataclass
class SummaryStats:
    """Summary statistics for a collection of values."""

    count: int
    mean: float
    std: float
    min: float
    max: float
    p50: float
    p95: float
    p99: float


def summary_stats(values: list[float]) -> SummaryStats:
    """Compute summary statistics for a list of numeric values.

    Args:
        values: List of numeric values

    Returns:
        SummaryStats with count, mean, std, min, max, p50, p95, p99
    """
    if not values:
        return SummaryStats(
            count=0, mean=0.0, std=0.0, min=0.0, max=0.0,
            p50=0.0, p95=0.0, p99=0.0
        )

    sorted_vals = sorted(values)
    n = len(sorted_vals)

    def percentile(p: float) -> float:
        idx = int(n * p / 100)
        return sorted_vals[min(idx, n - 1)]

    return SummaryStats(
        count=n,
        mean=statistics.mean(sorted_vals),
        std=statistics.stdev(sorted_vals) if n > 1 else 0.0,
        min=sorted_vals[0],
        max=sorted_vals[-1],
        p50=percentile(50),
        p95=percentile(95),
        p99=percentile(99),
    )


def compute_percentile(metrics: list[dict[str, Any]], field: str, percentile: int) -> float:
    """Compute percentile for a metric field."""
    values = [m[field] for m in metrics if field in m and m[field] is not None]
    if not values:
        return 0.0
    values.sort()
    idx = int(len(values) * percentile / 100)
    return float(values[min(idx, len(values) - 1)])


def compute_rm100(metrics: list[dict[str, Any]]) -> float:
    """Compute RM100 proxy score per 100 operations."""
    if not metrics:
        return 0.0
    total_penalty = 0.0
    for m in metrics:
        if m.get("rollback"):
            total_penalty += 5.0
        issues = m.get("validation_issues", [])
        if isinstance(issues, list):
            for issue in issues:
                severity = issue.get("severity", "medium") if isinstance(issue, dict) else "medium"
                total_penalty += {"critical": 2.0, "high": 1.5, "medium": 1.0}.get(severity, 0.5)
        conflicts_enc = m.get("conflicts_encountered", 0)
        conflicts_res = m.get("conflicts_resolved", 0)
        overrides = max(0, conflicts_enc - conflicts_res)
        total_penalty += overrides * 1.0
    return (total_penalty / len(metrics)) * 100


def compute_vcsr(metrics: list[dict[str, Any]]) -> float:
    """Compute Validated Change Set Success Rate."""
    if not metrics:
        return 0.0
    successes = sum(
        1 for m in metrics
        if not m.get("rollback", False)
        and (not m.get("validation_issues") or len(m.get("validation_issues", [])) == 0)
    )
    return successes / len(metrics)
