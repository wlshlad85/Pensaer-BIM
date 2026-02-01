import csv, glob, numpy as np
latest = sorted(glob.glob("pensaer_scaling_lab/out/2026*"))[-1]
print(f"Run: {latest}")
rows = list(csv.DictReader(open(f"{latest}/b2.2/results.csv")))

for s in ["disjoint_edits", "same_wall_edits", "host_collision"]:
    sr = [float(r["override_rate"]) for r in rows if r["scenario"] == s]
    if sr:
        p95_idx = int(len(sr) * 0.95)
        p95_val = sorted(sr)[p95_idx] if p95_idx < len(sr) else sorted(sr)[-1]
        print(f"  {s}: n={len(sr)}, p50={np.median(sr):.4f}, p95={p95_val:.4f}, max={max(sr):.4f}")
        if s == "disjoint_edits":
            print(f"    Gate: p95 < 0.05 => {'PASS' if p95_val < 0.05 else 'FAIL'} ({p95_val:.4f})")
        if s == "same_wall_edits":
            print(f"    Gate: p95 < 0.25 => {'PASS' if p95_val < 0.25 else 'FAIL'} ({p95_val:.4f})")
