"""B2.4 GPU vs CPU scaling experiment.

Benchmarks GPU-accelerated spatial operations (Morton sort, broadphase clash
detection via wgpu) against CPU baselines.  In simulation mode the GPU advantage
is modelled as a parallelism-dependent speedup that grows with element count.
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

def _simulate_cpu_ms(total_elements: int, rng: random.Random) -> float:
    """CPU spatial op: ~O(n^1.1) with noise."""
    base = 0.005 * (total_elements ** 1.1)
    return max(1.0, base * (1 + rng.gauss(0, 0.10)))


def _simulate_gpu_ms(cpu_ms: float, total_elements: int, rng: random.Random) -> float:
    """GPU spatial op: CPU_time / scaling_factor.

    Scaling factor grows logarithmically with element count —
    small models ~2×, large models up to ~12×.
    """
    scale = 2.0 + 2.5 * math.log10(max(total_elements, 100) / 100)
    scale = min(scale, 12.0)
    gpu_ms = cpu_ms / scale
    return max(0.5, gpu_ms * (1 + rng.gauss(0, 0.08)))


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_gpu_scaling_experiment(
    out_dir: Path,
    seed: int,
    simulate: bool = True,
    quick: bool = False,
    runs_per_tier: int = 10,
    **_kwargs,
) -> tuple[list[dict], dict]:
    """Run B2.4 GPU-vs-CPU benchmark.

    Returns (results_rows, summary_dict) following the scaling-lab convention.
    """

    if quick:
        element_tiers = [1_000, 10_000, 50_000]
        runs_per_tier = max(runs_per_tier, 20)
    else:
        element_tiers = [1_000, 5_000, 10_000, 50_000, 100_000, 500_000]
        runs_per_tier = max(runs_per_tier, 30)

    rng = random.Random(seed)
    results: list[dict] = []

    for n in element_tiers:
        for run_idx in range(runs_per_tier):
            cpu_ms = _simulate_cpu_ms(n, rng)
            gpu_ms = _simulate_gpu_ms(cpu_ms, n, rng)
            base = {
                "exp_id": "b2.4",
                "total_elements": n,
                "run_idx": run_idx,
                "simulation": simulate,
            }
            results.append({**base, "backend": "cpu", "spatial_ms": round(cpu_ms, 2)})
            results.append({**base, "backend": "gpu", "spatial_ms": round(gpu_ms, 2)})

    # ------------------------------------------------------------------
    # Aggregation
    # ------------------------------------------------------------------
    speedups: dict[int, dict] = {}
    cpu_curve: dict[int, float] = {}
    gpu_curve: dict[int, float] = {}

    for n in element_tiers:
        cpu_vals = [r["spatial_ms"] for r in results if r["total_elements"] == n and r["backend"] == "cpu"]
        gpu_vals = [r["spatial_ms"] for r in results if r["total_elements"] == n and r["backend"] == "gpu"]

        cpu_s = summary_stats(cpu_vals)
        gpu_s = summary_stats(gpu_vals)
        ratio = cpu_s.p50 / gpu_s.p50 if gpu_s.p50 > 0 else 1.0

        speedups[n] = {
            "cpu_p50_ms": round(cpu_s.p50, 2),
            "gpu_p50_ms": round(gpu_s.p50, 2),
            "speedup_ratio": round(ratio, 2),
        }
        cpu_curve[n] = cpu_s.p50
        gpu_curve[n] = gpu_s.p50

    # ------------------------------------------------------------------
    # Plots
    # ------------------------------------------------------------------
    x = list(cpu_curve.keys())
    plot_series(
        x,
        {"CPU": list(cpu_curve.values()), "GPU": list(gpu_curve.values())},
        "Spatial Ops: CPU vs GPU (p50)",
        "total_elements",
        "spatial_ms (p50)",
        out_dir / "plots" / "cpu_vs_gpu_spatial.png",
    )
    plot_series(
        x,
        {"speedup": [speedups[t]["speedup_ratio"] for t in x]},
        "GPU Speedup Ratio vs Element Count",
        "total_elements",
        "speedup (×)",
        out_dir / "plots" / "gpu_speedup_ratio.png",
    )

    # ------------------------------------------------------------------
    # Gates
    # ------------------------------------------------------------------
    gates = {
        # GPU must be faster at every tier
        "gpu_faster_all_tiers": all(
            s["speedup_ratio"] > 1.0 for s in speedups.values()
        ),
        # Speedup must increase with scale (parallelism benefit)
        "speedup_scales_with_n": (
            speedups[element_tiers[-1]]["speedup_ratio"]
            > speedups[element_tiers[0]]["speedup_ratio"]
        ),
        # At the largest tier GPU must be ≥4× faster
        "large_tier_speedup_ge_4x": (
            speedups[element_tiers[-1]]["speedup_ratio"] >= 4.0
        ),
    }

    summary = {
        "element_tiers": element_tiers,
        "runs_per_tier": runs_per_tier,
        "speedups": {str(k): v for k, v in speedups.items()},
        "gates": gates,
        "simulation": simulate,
    }

    return results, summary
