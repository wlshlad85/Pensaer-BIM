"""Scaling lab CLI runner."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

from pensaer_scaling_lab.experiments.b2_1_locality import run_locality_experiment
from pensaer_scaling_lab.experiments.b2_2_collaboration import run_collaboration_experiment
from pensaer_scaling_lab.experiments.b2_3_governance import run_governance_experiment
from pensaer_scaling_lab.experiments.b2_4_gpu_scaling import run_gpu_scaling_experiment
from pensaer_scaling_lab.experiments.b2_5_ifc_roundtrip import run_ifc_roundtrip_experiment
from pensaer_scaling_lab.experiments.b2_6_agent_throughput import run_agent_throughput_experiment
from pensaer_scaling_lab.reporters.verdict import generate_verdict
from pensaer_scaling_lab.utils.io import write_csv, write_jsonl


def _write_outputs(out_dir: Path, exp_id: str, results: list[dict], summary: dict) -> None:
    write_jsonl(out_dir / "results.jsonl", results)
    write_csv(out_dir / "results.csv", results)
    verdict = generate_verdict(exp_id, summary)
    (out_dir / "verdict.md").write_text(verdict, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Pensaer Scaling Lab experiments")
    parser.add_argument("--exp", default="all", help="b2.1|b2.2|b2.3|b2.4|b2.5|b2.6|all")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--ws-url", default="ws://localhost:8000/mcp/ws")
    parser.add_argument("--out", default="out", help="Output directory")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--runs-per-tier", type=int, default=10)
    parser.add_argument("--simulate", action="store_true", help="Run without server dependencies")
    parser.add_argument("--live", action="store_true", help="Use /api/benchmark/* endpoints (real server)")
    parser.add_argument("--quick", action="store_true", help="Run small configs for smoke tests")

    args = parser.parse_args()
    out_root = Path(args.out)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    run_root = out_root / run_id
    run_root.mkdir(parents=True, exist_ok=True)

    if args.exp in {"b2.1", "all"}:
        out_dir = run_root / "b2.1"
        out_dir.mkdir(parents=True, exist_ok=True)
        results, summary = run_locality_experiment(
            base_url=args.base_url,
            out_dir=out_dir,
            seed=args.seed,
            runs_per_tier=args.runs_per_tier,
            simulate=args.simulate,
            quick=args.quick,
            live=args.live,
        )
        _write_outputs(out_dir, "b2.1", results, summary)

    if args.exp in {"b2.2", "all"}:
        out_dir = run_root / "b2.2"
        out_dir.mkdir(parents=True, exist_ok=True)
        results, summary = run_collaboration_experiment(
            ws_url=args.ws_url,
            out_dir=out_dir,
            seed=args.seed,
            simulate=args.simulate,
            quick=args.quick,
            live=args.live,
            base_url=args.base_url,
        )
        _write_outputs(out_dir, "b2.2", results, summary)

    if args.exp in {"b2.3", "all"}:
        out_dir = run_root / "b2.3"
        out_dir.mkdir(parents=True, exist_ok=True)
        results, summary = run_governance_experiment(
            out_dir=out_dir,
            seed=args.seed,
            simulate=not args.live,
            quick=args.quick,
            live=args.live,
            base_url=args.base_url,
        )
        _write_outputs(out_dir, "b2.3", results, summary)


    if args.exp in {"b2.4", "all"}:
        out_dir = run_root / "b2.4"
        out_dir.mkdir(parents=True, exist_ok=True)
        results, summary = run_gpu_scaling_experiment(
            out_dir=out_dir,
            seed=args.seed,
            simulate=args.simulate,
            quick=args.quick,
            runs_per_tier=args.runs_per_tier,
        )
        _write_outputs(out_dir, "b2.4", results, summary)

    if args.exp in {"b2.5", "all"}:
        out_dir = run_root / "b2.5"
        out_dir.mkdir(parents=True, exist_ok=True)
        results, summary = run_ifc_roundtrip_experiment(
            out_dir=out_dir,
            seed=args.seed,
            simulate=args.simulate,
            quick=args.quick,
            runs_per_tier=args.runs_per_tier,
        )
        _write_outputs(out_dir, "b2.5", results, summary)

    if args.exp in {"b2.6", "all"}:
        out_dir = run_root / "b2.6"
        out_dir.mkdir(parents=True, exist_ok=True)
        results, summary = run_agent_throughput_experiment(
            out_dir=out_dir,
            seed=args.seed,
            simulate=args.simulate,
            quick=args.quick,
            runs_per_tier=args.runs_per_tier,
        )
        _write_outputs(out_dir, "b2.6", results, summary)


if __name__ == "__main__":
    main()
