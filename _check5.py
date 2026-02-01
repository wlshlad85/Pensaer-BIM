import csv, glob
latest = sorted(glob.glob("pensaer_scaling_lab/out/2026*"))[-1]
print(f"Run: {latest}")
rows = list(csv.DictReader(open(f"{latest}/b2.3/results.csv")))

# Rollback rate narrow@1000
narrow_1k = [r for r in rows if r["permission_profile"] == "narrow" and int(r["agent_ops"]) == 1000]
rollbacks = [r for r in narrow_1k if r["rollback"] == "True"]
rate = len(rollbacks) / max(len(narrow_1k), 1)
print(f"Rollback narrow@1000: {len(rollbacks)}/{len(narrow_1k)} = {rate:.4f} (gate < 0.15)")

# RM100 values
from pensaer_scaling_lab.utils.metrics import compute_rm100
for ops in [100, 1000]:
    subset = [r for r in rows if int(r["agent_ops"]) == ops and r["permission_profile"] == "narrow"]
    rm = compute_rm100(subset)
    print(f"RM100 narrow ops={ops}: {rm:.4f}")
