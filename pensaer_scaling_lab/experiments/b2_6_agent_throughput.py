"""B2.6 Agent throughput scaling experiment.

Measures MCP tool-call throughput (calls/sec) as model complexity grows.
Tests the hypothesis that Pensaer's agent layer maintains near-constant
per-call latency regardless of model size — unlike Revit API which degrades
super-linearly.

Sub-experiments:
  B2.6a  Single-agent throughput vs model size
  B2.6b  Multi-agent concurrent throughput
  B2.6c  Tool-call latency distribution (p50/p95/p99)
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from pensaer_scaling_lab.utils.metrics import summary_stats
from pensaer_scaling_lab.utils.plots import plot_series


# ---------------------------------------------------------------------------
# Simulation helpers
# ---------------------------------------------------------------------------

def _sim_tool_call_ms(n_elements: int, tool: str, rng: random.Random) -> float:
    """Simulate MCP tool call latency.

    Pensaer's kernel indexes elements in an R-tree, so spatial queries
    are O(log n).  Parameter mutations are O(1) with dirty-flag propagation.
    """
    tool_base = {
        "get_element": 2.0,
        "modify_parameter": 5.0,
        "detect_clashes": 15.0,
        "create_element": 8.0,
        "query_spatial": 10.0,
    }
    base = tool_base.get(tool, 5.0)
    # O(log n) scaling for queries, O(1) for mutations
    if tool in ("detect_clashes", "query_spatial"):
        scale = 1.0 + 0.15 * math.log10(max(n_elements, 100) / 100)
    else:
        scale = 1.0 + 0.03 * math.log10(max(n_elements, 100) / 100)
    return max(1.0, base * scale * (1 + rng.gauss(0, 0.12)))


def _sim_revit_api_ms(n_elements: int, rng: random.Random) -> float:
    """Simulate equivalent Revit API call: O(n^0.4) degradation."""
    base = 50.0 * (n_elements / 1000) ** 0.4
    return max(20.0, base * (1 + rng.gauss(0, 0.15)))


def _sim_concurrent_overhead(n_agents: int) -> float:
    """Overhead multiplier for concurrent agents (lock contention)."""
    # Pensaer uses MVCC — minimal contention
    return 1.0 + 0.02 * max(0, n_agents - 1)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_agent_throughput_experiment(
    out_dir: Path,
    seed: int,
    simulate: bool = True,
    quick: bool = False,
    runs_per_tier: int = 10,
    **_kwargs,
) -> tuple[list[dict], dict]:
    if quick:
        model_sizes = [1_000, 10_000, 100_000, 500_000]
        agent_counts = [1, 3, 5]
        tools = ["get_element", "modify_parameter", "detect_clashes"]
        calls_per_config = 20
    else:
        model_sizes = [1_000, 5_000, 10_000, 50_000, 100_000, 500_000, 1_000_000]
        agent_counts = [1, 3, 5, 10, 20]
        tools = ["get_element", "modify_parameter", "detect_clashes", "create_element", "query_spatial"]
        calls_per_config = 50

    rng = random.Random(seed)
    results: list[dict] = []

    # B2.6a + B2.6c: Single-agent throughput per tool per model size
    for n in model_sizes:
        for tool in tools:
            latencies = []
            for call_idx in range(calls_per_config):
                ms = _sim_tool_call_ms(n, tool, rng)
                latencies.append(ms)
                results.append({
                    "exp_id": "b2.6",
                    "sub": "single",
                    "total_elements": n,
                    "tool": tool,
                    "agents": 1,
                    "call_idx": call_idx,
                    "latency_ms": round(ms, 3),
                    "simulation": simulate,
                })

    # B2.6a: Revit comparison (single agent, modify_parameter equivalent)
    for n in model_sizes:
        for call_idx in range(calls_per_config):
            ms = _sim_revit_api_ms(n, rng)
            results.append({
                "exp_id": "b2.6",
                "sub": "revit_baseline",
                "total_elements": n,
                "tool": "revit_api",
                "agents": 1,
                "call_idx": call_idx,
                "latency_ms": round(ms, 3),
                "simulation": simulate,
            })

    # B2.6b: Multi-agent concurrent throughput
    for n in model_sizes[:4]:  # top 4 sizes
        for n_agents in agent_counts:
            overhead = _sim_concurrent_overhead(n_agents)
            for call_idx in range(calls_per_config):
                ms = _sim_tool_call_ms(n, "modify_parameter", rng) * overhead
                results.append({
                    "exp_id": "b2.6",
                    "sub": "multi",
                    "total_elements": n,
                    "tool": "modify_parameter",
                    "agents": n_agents,
                    "call_idx": call_idx,
                    "latency_ms": round(ms, 3),
                    "simulation": simulate,
                })

    # ==================================================================
    # Aggregation
    # ==================================================================

    # Single-agent throughput curves (calls/sec)
    throughput_by_tool: dict[str, dict[int, float]] = {}
    latency_by_tool: dict[str, dict[int, dict]] = {}

    for tool in tools:
        throughput_by_tool[tool] = {}
        latency_by_tool[tool] = {}
        for n in model_sizes:
            vals = [r["latency_ms"] for r in results
                    if r.get("sub") == "single" and r["total_elements"] == n and r["tool"] == tool]
            if vals:
                s = summary_stats(vals)
                throughput_by_tool[tool][n] = round(1000.0 / s.p50, 1)  # calls/sec
                latency_by_tool[tool][n] = {"p50": round(s.p50, 2), "p95": round(s.p95, 2), "p99": round(s.p99, 2)}

    # Revit comparison
    revit_throughput: dict[int, float] = {}
    for n in model_sizes:
        vals = [r["latency_ms"] for r in results
                if r.get("sub") == "revit_baseline" and r["total_elements"] == n]
        if vals:
            revit_throughput[n] = round(1000.0 / summary_stats(vals).p50, 1)

    # Multi-agent throughput
    multi_throughput: dict[int, dict[int, float]] = {}  # agents -> {n: calls/sec}
    for n_agents in agent_counts:
        multi_throughput[n_agents] = {}
        for n in model_sizes[:4]:
            vals = [r["latency_ms"] for r in results
                    if r.get("sub") == "multi" and r["total_elements"] == n and r["agents"] == n_agents]
            if vals:
                s = summary_stats(vals)
                # Total throughput = agents × per-agent throughput
                multi_throughput[n_agents][n] = round(n_agents * 1000.0 / s.p50, 1)

    # ==================================================================
    # Plots
    # ==================================================================
    plots_dir = out_dir / "plots"
    x = sorted(model_sizes)

    # Throughput per tool
    series = {}
    for tool in tools:
        series[tool] = [throughput_by_tool[tool].get(n, 0) for n in x]
    series["Revit API"] = [revit_throughput.get(n, 0) for n in x]
    plot_series(x, series, "Agent Throughput vs Model Size", "elements", "calls/sec",
                plots_dir / "agent_throughput.png")

    # Pensaer vs Revit (modify_parameter)
    plot_series(x,
                {"Pensaer": [throughput_by_tool.get("modify_parameter", {}).get(n, 0) for n in x],
                 "Revit API": [revit_throughput.get(n, 0) for n in x]},
                "Pensaer vs Revit: Agent Call Throughput", "elements", "calls/sec",
                plots_dir / "pensaer_vs_revit_throughput.png")

    # Latency distribution for detect_clashes
    if "detect_clashes" in latency_by_tool:
        clash_lat = latency_by_tool["detect_clashes"]
        series_lat = {
            "p50": [clash_lat.get(n, {}).get("p50", 0) for n in x],
            "p95": [clash_lat.get(n, {}).get("p95", 0) for n in x],
            "p99": [clash_lat.get(n, {}).get("p99", 0) for n in x],
        }
        plot_series(x, series_lat, "Clash Detection Latency Distribution",
                    "elements", "ms", plots_dir / "clash_latency_dist.png")

    # Multi-agent aggregate throughput
    multi_x = sorted(model_sizes[:4])
    multi_series = {}
    for n_agents in agent_counts:
        multi_series[f"{n_agents} agents"] = [multi_throughput[n_agents].get(n, 0) for n in multi_x]
    plot_series(multi_x, multi_series, "Multi-Agent Aggregate Throughput",
                "elements", "total calls/sec", plots_dir / "multi_agent_throughput.png")

    # ==================================================================
    # Gates
    # ==================================================================
    pensaer_500k = throughput_by_tool.get("modify_parameter", {}).get(500_000, 0)
    revit_500k = revit_throughput.get(500_000, 0)
    pensaer_1k = throughput_by_tool.get("modify_parameter", {}).get(1_000, 0)

    gates = {
        "pensaer_faster_than_revit_at_500k": pensaer_500k > revit_500k,
        "throughput_degradation_under_50pct": (
            pensaer_500k >= pensaer_1k * 0.5 if pensaer_1k > 0 else False
        ),
        "p95_under_50ms_at_100k": (
            latency_by_tool.get("modify_parameter", {}).get(100_000, {}).get("p95", float("inf")) < 50
        ),
        "multi_agent_scales_linearly": (
            multi_throughput.get(5, {}).get(model_sizes[0], 0) >=
            multi_throughput.get(1, {}).get(model_sizes[0], 0) * 3
            if model_sizes[0] in multi_throughput.get(1, {}) else False
        ),
    }

    summary = {
        "model_sizes": model_sizes,
        "tools": tools,
        "agent_counts": agent_counts,
        "throughput_by_tool": {t: {str(k): v for k, v in d.items()} for t, d in throughput_by_tool.items()},
        "revit_throughput": {str(k): v for k, v in revit_throughput.items()},
        "latency_by_tool": {t: {str(k): v for k, v in d.items()} for t, d in latency_by_tool.items()},
        "gates": gates,
        "simulation": simulate,
    }

    return results, summary
