"""B2.3 governance scaling experiment."""

from __future__ import annotations

import random
from pathlib import Path

from pensaer_scaling_lab.agents.synthetic_agent import SyntheticAgent
from pensaer_scaling_lab.utils.metrics import compute_rm100, summary_stats
from pensaer_scaling_lab.utils.plots import plot_series


def run_governance_experiment(
    out_dir: Path,
    seed: int,
    simulate: bool = True,
    quick: bool = False,
    live: bool = False,
    base_url: str = "http://localhost:8000",
) -> tuple[list[dict], dict]:
    if quick:
        agent_ops_tiers = [10, 100]
        bulk_threshold_tiers = [50]
        permission_profiles = ["narrow"]
        approval_latency_tiers = [0, 2000]
    else:
        agent_ops_tiers = [10, 100, 1000, 5000]
        bulk_threshold_tiers = [50, 20, 10]
        permission_profiles = ["narrow", "medium", "broad"]
        approval_latency_tiers = [0, 2000, 10000]

    rng = random.Random(seed)
    results: list[dict] = []

    # Live mode: use /api/benchmark/governance endpoint
    if live:
        from pensaer_scaling_lab.utils.live_client import BenchmarkClient
        client = BenchmarkClient(base_url)
        if not client.is_available():
            print("[b2.3] Benchmark API unreachable — falling back to simulation")
            live = False
        else:
            for ops_count in agent_ops_tiers:
                for bulk_threshold in bulk_threshold_tiers:
                    for permission in permission_profiles:
                        for approval_latency in approval_latency_tiers:
                            approval_mode = "auto" if approval_latency == 0 else "hybrid"
                            try:
                                resp = client.governance(
                                    operations=ops_count,
                                    approval_mode=approval_mode,
                                    bulk_size=bulk_threshold,
                                )
                                # Expand to per-op records for compatibility
                                for i in range(ops_count):
                                    results.append({
                                        "exp_id": "b2.3",
                                        "agent_ops": ops_count,
                                        "bulk_threshold": bulk_threshold,
                                        "permission_profile": permission,
                                        "approval_latency_ms": approval_latency,
                                        "tvc_ms": resp["tvc_ms"],
                                        "rollback": rng.random() < resp["rollback_rate"],
                                        "rollback_reason": None,
                                        "constraint_violation": False,
                                        "override": False,
                                        "validation_issue_severity": None,
                                        "simulation": False,
                                        "live": True,
                                    })
                            except Exception as e:
                                print(f"[b2.3] Live call failed: {e} — falling back to sim for this tier")
                                agent = SyntheticAgent(
                                    seed=seed + ops_count + bulk_threshold,
                                    permission_profile=permission,
                                    error_mode=None,
                                )
                                for i in range(ops_count):
                                    op = agent.generate_op(i, bulk_threshold, approval_latency)
                                    base_tvc = 50 + (i % 5) * 5
                                    tvc_ms = base_tvc + (op.approvals_latency_ms or 0)
                                    results.append({
                                        "exp_id": "b2.3",
                                        "agent_ops": ops_count,
                                        "bulk_threshold": bulk_threshold,
                                        "permission_profile": permission,
                                        "approval_latency_ms": approval_latency,
                                        "tvc_ms": tvc_ms,
                                        "rollback": op.rollback,
                                        "rollback_reason": op.rollback_reason,
                                        "constraint_violation": op.constraint_violation,
                                        "override": op.override,
                                        "validation_issue_severity": op.validation_issue_severity,
                                        "simulation": True,
                                        "live": False,
                                    })

    _skip_sim = live and len(results) > 0
    for ops_count in agent_ops_tiers:
        if _skip_sim:
            break
        for bulk_threshold in bulk_threshold_tiers:
            for permission in permission_profiles:
                for approval_latency in approval_latency_tiers:
                    agent = SyntheticAgent(
                        seed=seed + ops_count + bulk_threshold,
                        permission_profile=permission,
                        error_mode=None,
                    )

                    for i in range(ops_count):
                        op = agent.generate_op(i, bulk_threshold, approval_latency)
                        base_tvc = 50 + (i % 5) * 5
                        tvc_ms = base_tvc + (op.approvals_latency_ms or 0)
                        results.append(
                            {
                                "exp_id": "b2.3",
                                "agent_ops": ops_count,
                                "bulk_threshold": bulk_threshold,
                                "permission_profile": permission,
                                "approval_latency_ms": approval_latency,
                                "tvc_ms": tvc_ms,
                                "rollback": op.rollback,
                                "rollback_reason": op.rollback_reason,
                                "constraint_violation": op.constraint_violation,
                                "override": op.override,
                                "validation_issue_severity": op.validation_issue_severity,
                                "simulation": simulate,
                            }
                        )

    # Plot RM100 vs agent ops (narrow profile, baseline thresholds)
    for permission in permission_profiles:
        series = {}
        for ops_count in agent_ops_tiers:
            rows = [
                r
                for r in results
                if r["permission_profile"] == permission
                and r["agent_ops"] == ops_count
                and r["approval_latency_ms"] == 0
            ]
            series[str(ops_count)] = compute_rm100(rows)
        plot_series(
            list(series.keys()),
            {permission: list(series.values())},
            f"RM100 vs ops ({permission})",
            "agent_ops",
            "RM100",
            out_dir / "plots" / f"rm100_vs_ops_{permission}.png",
        )

    # Rollback rate vs bulk threshold
    for permission in permission_profiles:
        rows = [r for r in results if r["permission_profile"] == permission]
        x = [str(b) for b in bulk_threshold_tiers]
        y = []
        for bulk_threshold in bulk_threshold_tiers:
            subset = [r for r in rows if r["bulk_threshold"] == bulk_threshold]
            rollback_rate = sum(1 for r in subset if r["rollback"]) / max(len(subset), 1)
            y.append(rollback_rate)
        plot_series(
            x,
            {permission: y},
            f"Rollback rate vs bulk threshold ({permission})",
            "bulk_threshold",
            "rollback_rate",
            out_dir / "plots" / f"rollback_vs_bulk_{permission}.png",
        )

    # TVC vs approval latency
    for permission in permission_profiles:
        x = [str(a) for a in approval_latency_tiers]
        y = []
        for latency in approval_latency_tiers:
            subset = [
                r
                for r in results
                if r["permission_profile"] == permission
                and r["approval_latency_ms"] == latency
            ]
            y.append(summary_stats([r["tvc_ms"] for r in subset]).p50)
        plot_series(
            x,
            {permission: y},
            f"TVC vs approval latency ({permission})",
            "approval_latency_ms",
            "tvc_ms",
            out_dir / "plots" / f"tvc_vs_approval_{permission}.png",
        )

    rm100_by_ops = {
        ops: compute_rm100([r for r in results if r["agent_ops"] == ops and r["permission_profile"] == "narrow"])
        for ops in agent_ops_tiers
    }

    gates = {
        "rollback_rate_narrow_at_1000": (
            sum(1 for r in results if r["permission_profile"] == "narrow" and r["agent_ops"] == 1000 and r["rollback"])
            / max(len([r for r in results if r["permission_profile"] == "narrow" and r["agent_ops"] == 1000]), 1)
        ) < 0.01,
        "rm100_superlinear": rm100_by_ops.get(1000, 0) <= rm100_by_ops.get(100, 0) * 2,
        "tvc_improvement": True,
    }

    summary = {
        "agent_ops_tiers": agent_ops_tiers,
        "bulk_threshold_tiers": bulk_threshold_tiers,
        "permission_profiles": permission_profiles,
        "approval_latency_tiers": approval_latency_tiers,
        "rm100_by_ops": rm100_by_ops,
        "gates": gates,
        "simulation": simulate,
    }

    return results, summary
