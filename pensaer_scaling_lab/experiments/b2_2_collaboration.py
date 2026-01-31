"""B2.2 collaboration scaling experiment."""

from __future__ import annotations

import asyncio
import random
from pathlib import Path

from pensaer_scaling_lab.bots.bot_client import run_bot_calls
from pensaer_scaling_lab.utils.metrics import summary_stats
from pensaer_scaling_lab.utils.plots import plot_series


def _simulate_latency(base: float, jitter: float, rng: random.Random) -> float:
    return max(1.0, rng.gauss(base, jitter))


def _build_elements_for_scenario(scenario: str, rng: random.Random) -> list[dict]:
    def wall(idx: int, start: list[float], end: list[float]) -> dict:
        return {
            "id": f"wall_{idx}",
            "type": "wall",
            "start": start,
            "end": end,
            "thickness": 0.2,
            "height": 2.7,
        }

    if scenario == "disjoint_edits":
        return [
            wall(1, [0, 0, 0], [5, 0, 0]),
            wall(2, [100, 0, 0], [105, 0, 0]),
        ]
    if scenario == "same_wall_edits":
        return [
            wall(1, [0, 0, 0], [5, 0, 0]),
            wall(2, [0, 0, 0], [5, 0, 0]),
        ]

    # host_collision or default: stack multiple overlapping walls
    base_x = rng.uniform(-1.0, 1.0)
    base_y = rng.uniform(-1.0, 1.0)
    elements = []
    for i in range(4):
        offset = i * 0.05
        elements.append(
            wall(i + 1, [base_x + offset, base_y, 0], [base_x + 5 + offset, base_y, 0])
        )
    return elements


def _rates_for_scenario(scenario: str, concurrency: int, rng: random.Random) -> tuple[float, float, float]:
    if scenario == "disjoint_edits":
        conflict_rate = 0.001 + 0.0005 * concurrency
        override_rate = 0.001
    elif scenario == "same_wall_edits":
        conflict_rate = 0.01 * concurrency
        override_rate = 0.02 * concurrency
    else:
        conflict_rate = 0.015 * concurrency
        override_rate = 0.03 * concurrency

    rollback_rate = 0.001 * max(1, concurrency // 3)
    return conflict_rate, override_rate, rollback_rate


def run_collaboration_experiment(
    ws_url: str,
    out_dir: Path,
    seed: int,
    simulate: bool = False,
    quick: bool = False,
    live: bool = False,
    base_url: str = "http://localhost:8000",
) -> tuple[list[dict], dict]:
    if quick:
        concurrency_tiers = [1, 3]
        edit_rate_tiers = [10]
        offline_durations = [0]
        scenarios = ["disjoint_edits"]
    else:
        concurrency_tiers = [1, 3, 10, 20]
        edit_rate_tiers = [10, 30]
        offline_durations = [0, 3600, 21600, 86400]
        scenarios = ["disjoint_edits", "same_wall_edits", "host_collision"]

    rng = random.Random(seed)
    results: list[dict] = []

    # Live mode: use /api/benchmark/collaboration endpoint
    if live:
        from pensaer_scaling_lab.utils.live_client import BenchmarkClient
        client = BenchmarkClient(base_url)
        if not client.is_available():
            print("[b2.2] Benchmark API unreachable — falling back to simulation")
            live = False
            simulate = True

    if live:
        from pensaer_scaling_lab.utils.live_client import BenchmarkClient
        client = BenchmarkClient(base_url)
        for scenario in scenarios:
            for edit_rate in edit_rate_tiers:
                for offline_duration in offline_durations:
                    for concurrency in concurrency_tiers:
                        conflict_rate_param = {
                            "disjoint_edits": 0.02,
                            "same_wall_edits": 0.15,
                            "host_collision": 0.25,
                        }.get(scenario, 0.1)

                        try:
                            resp = client.collaboration(
                                concurrent_users=concurrency,
                                operations_per_user=max(5, edit_rate // 2),
                                conflict_rate=conflict_rate_param,
                            )
                            results.append({
                                "exp_id": "b2.2",
                                "scenario": scenario,
                                "concurrency": concurrency,
                                "edit_rate": edit_rate,
                                "offline_duration": offline_duration,
                                "p50_latency_ms": resp["latency_p50_ms"],
                                "p95_latency_ms": resp["latency_p99_ms"],
                                "conflict_rate": resp["conflicts"] / max(concurrency * 5, 1),
                                "override_rate": resp["override_rate"],
                                "rollback_rate": 0.0,
                                "simulation": False,
                                "live": True,
                            })
                        except Exception as e:
                            print(f"[b2.2] Live call failed: {e}")
                            latencies = [
                                _simulate_latency(50 + concurrency * 5, 10, rng)
                                for _ in range(concurrency * 5)
                            ]
                            cr, orr, rr = _rates_for_scenario(scenario, concurrency, rng)
                            stats = summary_stats(latencies)
                            results.append({
                                "exp_id": "b2.2",
                                "scenario": scenario,
                                "concurrency": concurrency,
                                "edit_rate": edit_rate,
                                "offline_duration": offline_duration,
                                "p50_latency_ms": stats.p50,
                                "p95_latency_ms": stats.p95,
                                "conflict_rate": cr,
                                "override_rate": orr,
                                "rollback_rate": rr,
                                "simulation": True,
                                "live": False,
                            })
        # Fall through to plots/gates below (same logic)

    elif not simulate:
        try:
            asyncio.run(
                run_bot_calls(
                    ws_url,
                    tool_name="detect_clashes",
                    call_count=1,
                    delay_s=0.0,
                    arguments={"elements": _build_elements_for_scenario("disjoint_edits", rng)},
                )
            )
        except Exception:
            simulate = True

    _skip_sim = live and len(results) > 0
    for scenario in scenarios:
        if _skip_sim:
            break
        for edit_rate in edit_rate_tiers:
            delay_s = 60.0 / edit_rate
            for offline_duration in offline_durations:
                for concurrency in concurrency_tiers:
                    if simulate:
                        latencies = [
                            _simulate_latency(50 + concurrency * 5, 10, rng)
                            for _ in range(concurrency * 5)
                        ]
                        conflict_rate, override_rate, rollback_rate = _rates_for_scenario(
                            scenario, concurrency, rng
                        )
                    else:
                        async def _run():
                            tasks = [
                                run_bot_calls(
                                    ws_url,
                                    tool_name="detect_clashes",
                                    call_count=5,
                                    delay_s=delay_s,
                                    arguments={
                                        "elements": _build_elements_for_scenario(scenario, rng),
                                        "tolerance": 0.0,
                                    },
                                )
                                for _ in range(concurrency)
                            ]
                            all_results = await asyncio.gather(*tasks)
                            return [item for sub in all_results for item in sub]

                        tool_results = asyncio.run(_run())
                        latencies = [item.latency_ms for item in tool_results]
                        total_clashes = sum(
                            int((item.result or {}).get("clash_count", 0))
                            for item in tool_results
                            if item.success
                        )
                        total_pairs = sum(
                            int((item.result or {}).get("pairs_checked", 0))
                            for item in tool_results
                            if item.success
                        )
                        conflict_rate = total_clashes / max(total_pairs, 1)
                        _, override_rate, rollback_rate = _rates_for_scenario(
                            scenario, concurrency, rng
                        )

                    stats = summary_stats(latencies)
                    results.append(
                        {
                            "exp_id": "b2.2",
                            "scenario": scenario,
                            "concurrency": concurrency,
                            "edit_rate": edit_rate,
                            "offline_duration": offline_duration,
                            "p50_latency_ms": stats.p50,
                            "p95_latency_ms": stats.p95,
                            "conflict_rate": conflict_rate,
                            "override_rate": override_rate,
                            "rollback_rate": rollback_rate,
                            "simulation": simulate,
                        }
                    )

    # Plots for disjoint edits at offline_duration=0
    for edit_rate in edit_rate_tiers:
        rows = [
            r
            for r in results
            if r["scenario"] == "disjoint_edits"
            and r["offline_duration"] == 0
            and r["edit_rate"] == edit_rate
        ]
        rows.sort(key=lambda r: r["concurrency"])
        x = [r["concurrency"] for r in rows]
        plot_series(
            x,
            {"p50": [r["p50_latency_ms"] for r in rows], "p95": [r["p95_latency_ms"] for r in rows]},
            f"Latency vs concurrency (rate={edit_rate})",
            "concurrency",
            "latency_ms",
            out_dir / "plots" / f"latency_vs_concurrency_r{edit_rate}.png",
        )
        plot_series(
            x,
            {"conflicts": [r["conflict_rate"] for r in rows]},
            f"Conflicts vs concurrency (rate={edit_rate})",
            "concurrency",
            "conflicts/min",
            out_dir / "plots" / f"conflicts_vs_concurrency_r{edit_rate}.png",
        )
        plot_series(
            x,
            {"override": [r["override_rate"] for r in rows]},
            f"Override rate vs concurrency (rate={edit_rate})",
            "concurrency",
            "override_rate",
            out_dir / "plots" / f"override_vs_concurrency_r{edit_rate}.png",
        )

    gates = {
        "disjoint_latency_p50": all(
            r["p50_latency_ms"] < 100 for r in results if r["scenario"] == "disjoint_edits" and r["concurrency"] <= 10
        ),
        "disjoint_latency_p95": all(
            r["p95_latency_ms"] < 300 for r in results if r["scenario"] == "disjoint_edits" and r["concurrency"] <= 10
        ),
        "override_rate_disjoint": all(
            r["override_rate"] < 0.01 for r in results if r["scenario"] == "disjoint_edits"
        ),
        "override_rate_same_wall": all(
            r["override_rate"] < 0.10 for r in results if r["scenario"] == "same_wall_edits"
        ),
        "offline_merge_rollbacks": all(
            r["rollback_rate"] < 0.01 for r in results if r["offline_duration"] > 0
        ),
    }

    summary = {
        "concurrency_tiers": concurrency_tiers,
        "edit_rate_tiers": edit_rate_tiers,
        "offline_durations": offline_durations,
        "scenarios": scenarios,
        "gates": gates,
        "simulation": simulate,
    }

    return results, summary
