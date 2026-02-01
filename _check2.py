import csv, glob

latest = sorted(glob.glob("pensaer_scaling_lab/out/2026*"))[-1]

# B2.2 - what scenarios exist?
rows = list(csv.DictReader(open(f"{latest}/b2.2/results.csv")))
scenarios = set(r["scenario"] for r in rows)
print(f"B2.2 scenarios: {scenarios}")
for s in scenarios:
    sr = [r for r in rows if r["scenario"] == s]
    overrides = [float(r["override_rate"]) for r in sr]
    print(f"  {s}: n={len(sr)}, override min={min(overrides):.4f} max={max(overrides):.4f} mean={sum(overrides)/len(overrides):.4f}")

# B2.3 - check verdict logic
import importlib.util
spec = importlib.util.spec_from_file_location("verdict", "pensaer_scaling_lab/reporters/verdict.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
# Check what thresholds are used
import inspect
src = inspect.getsource(mod.generate_verdict)
for line in src.split('\n'):
    if 'rollback' in line.lower() or 'threshold' in line.lower() or 'gate' in line.lower() or 'override' in line.lower():
        print(line.rstrip())
