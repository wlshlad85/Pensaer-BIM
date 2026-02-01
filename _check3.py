import csv, glob
latest = sorted(glob.glob("pensaer_scaling_lab/out/2026*"))[-1]
rows = list(csv.DictReader(open(f"{latest}/b2.2/results.csv")))
scenarios = set(r["scenario"] for r in rows)
print(f"Scenarios: {scenarios}")
for s in sorted(scenarios):
    sr = [r for r in rows if r["scenario"] == s]
    overrides = [float(r["override_rate"]) for r in sr]
    over_5 = [o for o in overrides if o >= 0.05]
    over_20 = [o for o in overrides if o >= 0.20]
    print(f"  {s}: n={len(sr)}, mean={sum(overrides)/len(overrides):.4f}, max={max(overrides):.4f}, >5%={len(over_5)}, >20%={len(over_20)}")
