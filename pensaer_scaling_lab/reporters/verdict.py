"""Verdict memo generator for scaling lab."""

from __future__ import annotations

from datetime import datetime
from typing import Any


def generate_verdict(exp_id: str, summary: dict[str, Any]) -> str:
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    lines = [
        f"# Scaling Verdict Memo: {exp_id}",
        "",
        f"Generated: {timestamp}",
        "",
        "## Executive Summary",
    ]

    if exp_id == "b2.1":
        rollback_pass = summary.get("rollback_gate_pass")
        lines.append(f"- Rollback rate gate: {'PASS' if rollback_pass else 'FAIL'}")
        lines.append("- Regen scaling gate per affected tier:")
        for affected, gate in summary.get("regen_increase_gate", {}).items():
            lines.append(f"  - A={affected}: {'PASS' if gate.get('pass') else 'FAIL'} ({gate.get('increase_pct')}%)")
    elif exp_id == "b2.2":
        gates = summary.get("gates", {})
        lines.append(f"- Disjoint latency p50 gate: {'PASS' if gates.get('disjoint_latency_p50') else 'FAIL'}")
        lines.append(f"- Disjoint latency p95 gate: {'PASS' if gates.get('disjoint_latency_p95') else 'FAIL'}")
        lines.append(f"- Override disjoint gate: {'PASS' if gates.get('override_rate_disjoint') else 'FAIL'}")
        lines.append(f"- Override same-wall gate: {'PASS' if gates.get('override_rate_same_wall') else 'FAIL'}")
        lines.append(f"- Offline rollback gate: {'PASS' if gates.get('offline_merge_rollbacks') else 'FAIL'}")
    elif exp_id == "b2.3":
        gates = summary.get("gates", {})
        lines.append(f"- Rollback rate narrow@1000: {'PASS' if gates.get('rollback_rate_narrow_at_1000') else 'FAIL'}")
        lines.append(f"- RM100 superlinear gate: {'PASS' if gates.get('rm100_superlinear') else 'FAIL'}")
        lines.append(f"- TVC improvement gate: {'PASS' if gates.get('tvc_improvement') else 'FAIL'}")
    elif exp_id == "b2.4":
        gates = summary.get("gates", {})
        lines.append(f"- GPU faster at all tiers: {'PASS' if gates.get('gpu_faster_all_tiers') else 'FAIL'}")
        lines.append(f"- Speedup scales with N: {'PASS' if gates.get('speedup_scales_with_n') else 'FAIL'}")
        lines.append(f"- Large tier ≥4× speedup: {'PASS' if gates.get('large_tier_speedup_ge_4x') else 'FAIL'}")
        speedups = summary.get("speedups", {})
        for tier, s in speedups.items():
            lines.append(f"  - N={tier}: CPU p50={s['cpu_p50_ms']}ms, GPU p50={s['gpu_p50_ms']}ms, speedup={s['speedup_ratio']}×")

    lines.append("")
    lines.append("## Notes")
    if summary.get("simulation"):
        lines.append("- Results generated in simulation mode (server not reachable).")
    else:
        lines.append("- Results sourced from server metrics export.")

    return "\n".join(lines) + "\n"
