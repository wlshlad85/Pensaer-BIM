import csv, glob, os

latest = sorted(glob.glob("pensaer_scaling_lab/out/2026*"))[-1]
print(f"Run: {latest}\n")

# B2.2
print("=== B2.2 ===")
rows = list(csv.DictReader(open(f"{latest}/b2.2/results.csv")))
for scenario in ["disjoint", "same_wall", "offline"]:
    sr = [r for r in rows if r["scenario"] == scenario]
    if sr:
        overrides = [float(r["override_rate"]) for r in sr]
        print(f"  {scenario}: override_rate min={min(overrides):.4f} max={max(overrides):.4f} mean={sum(overrides)/len(overrides):.4f} n={len(sr)}")

# B2.3
print("\n=== B2.3 ===")
rows = list(csv.DictReader(open(f"{latest}/b2.3/results.csv")))
rollbacks = [r for r in rows if r.get("rollback") == "True"]
total = len(rows)
print(f"  Total rows: {total}, rollbacks: {len(rollbacks)}, rate: {len(rollbacks)/total:.4f}")
for profile in ["narrow", "medium", "broad"]:
    pr = [r for r in rows if r["permission_profile"] == profile]
    rb = [r for r in pr if r.get("rollback") == "True"]
    if pr:
        print(f"  {profile}: {len(rb)}/{len(pr)} = {len(rb)/len(pr):.4f}")
