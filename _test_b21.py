import sys, time
print("Starting b2.1...", flush=True)
t0 = time.time()

from pathlib import Path
from pensaer_scaling_lab.experiments.b2_1_locality import run_locality_experiment

out = Path("pensaer_scaling_lab/out/_test")
out.mkdir(parents=True, exist_ok=True)

print(f"Import took {time.time()-t0:.1f}s", flush=True)
t1 = time.time()

results, summary = run_locality_experiment(
    base_url="http://127.0.0.1:8000",
    out_dir=out,
    seed=42,
    runs_per_tier=10,
    simulate=False,
    quick=False,
    live=True,
)

print(f"Experiment took {time.time()-t1:.1f}s", flush=True)
print(f"Results: {len(results)} rows", flush=True)
print(f"Summary: {summary}", flush=True)
