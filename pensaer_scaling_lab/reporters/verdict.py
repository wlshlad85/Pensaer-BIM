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
        lines.append(f"- GPU faster (clash) all tiers: {'PASS' if gates.get('gpu_faster_clash_all_tiers') else 'FAIL'}")
        lines.append(f"- GPU faster (meshgen) all tiers: {'PASS' if gates.get('gpu_faster_meshgen_all_tiers') else 'FAIL'}")
        lines.append(f"- Clash speedup scales with N: {'PASS' if gates.get('clash_speedup_scales') else 'FAIL'}")
        lines.append(f"- Large tier clash ≥8× speedup: {'PASS' if gates.get('large_tier_clash_ge_8x') else 'FAIL'}")
        lines.append(f"- Large tier meshgen ≥4× speedup: {'PASS' if gates.get('large_tier_meshgen_ge_4x') else 'FAIL'}")
        lines.append(f"- VRAM fits 500K elements: {'PASS' if gates.get('vram_fits_500k') else 'FAIL'}")
        lines.append(f"- LOD3 faster than LOD0: {'PASS' if gates.get('lod3_faster_than_lod0') else 'FAIL'}")
        lines.append(f"- Max elements in 12GB VRAM: {gates.get('vram_max_elements', 'N/A'):,}")
        lines.append("")
        lines.append("### Clash Detection Speedups")
        for tier, s in summary.get("clash_speedups", {}).items():
            lines.append(f"  - N={tier}: CPU={s['cpu_p50_ms']}ms, GPU={s['gpu_p50_ms']}ms, **{s['speedup']}×**")
        lines.append("")
        lines.append("### Mesh Gen Speedups")
        for tier, s in summary.get("meshgen_speedups", {}).items():
            lines.append(f"  - N={tier}: CPU={s['cpu_p50_ms']}ms, GPU={s['gpu_p50_ms']}ms, **{s['speedup']}×**")

    elif exp_id == "b2.5":
        gates = summary.get("gates", {})
        lines.append(f"- Export <100ms at 10K: {'PASS' if gates.get('export_under_100ms_at_10k') else 'FAIL'}")
        lines.append(f"- Export <500ms at 50K: {'PASS' if gates.get('export_under_500ms_at_50k') else 'FAIL'}")
        lines.append(f"- Reimport <3s at 10K: {'PASS' if gates.get('reimport_under_3s_at_10k') else 'FAIL'}")
        lines.append(f"- Diff rate <0.1%: {'PASS' if gates.get('diff_rate_under_0_1pct') else 'FAIL'}")
        lines.append("")
        lines.append("### Export/Reimport Times (p50)")
        for tier, v in summary.get("export_p50", {}).items():
            rt = summary.get("roundtrip_p50", {}).get(tier, "?")
            lines.append(f"  - N={tier}: export={v}ms, round-trip={rt}ms")

    elif exp_id == "b2.6":
        gates = summary.get("gates", {})
        lines.append(f"- Pensaer faster than Revit at 500K: {'PASS' if gates.get('pensaer_faster_than_revit_at_500k') else 'FAIL'}")
        lines.append(f"- Throughput degradation <50%: {'PASS' if gates.get('throughput_degradation_under_50pct') else 'FAIL'}")
        lines.append(f"- p95 <50ms at 100K: {'PASS' if gates.get('p95_under_50ms_at_100k') else 'FAIL'}")
        lines.append(f"- Multi-agent scales linearly: {'PASS' if gates.get('multi_agent_scales_linearly') else 'FAIL'}")
        lines.append("")
        lines.append("### Throughput (calls/sec)")
        for tool, data in summary.get("throughput_by_tool", {}).items():
            vals = ", ".join(f"N={k}: {v}" for k, v in list(data.items())[:4])
            lines.append(f"  - {tool}: {vals}")
        lines.append("")
        revit = summary.get("revit_throughput", {})
        vals = ", ".join(f"N={k}: {v}" for k, v in list(revit.items())[:4])
        lines.append(f"  - Revit API: {vals}")

    lines.append("")
    lines.append("## Notes")
    if summary.get("simulation"):
        lines.append("- Results generated in simulation mode (server not reachable).")
    else:
        lines.append("- Results sourced from server metrics export.")

    return "\n".join(lines) + "\n"
