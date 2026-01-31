# Scaling Lab Results Summary

**Latest Run**: 2026-01-30 11:25 UTC  
**Run ID**: `20260130_112520`  
**Mode**: Simulation (server not required)  
**Configuration**: Quick mode, 2 runs per tier

---

## Experiment Results

### B2.1: Locality Scaling

**Measured Scaling Law**:
```
regen_ms ≈ 1.05 × (affected_elements)^0.35
```

**Key Findings**:
- Sub-linear scaling (α = 0.35)
- 100× increase in affected elements → only 5× regen time
- Validation overhead remains constant at ~28-30% of TVC
- Zero rollbacks in simulation

**Data Points**:
- 1 element affected: 1.05ms regen, 1.47ms TVC
- 10 elements affected: 2.35ms regen, 3.29ms TVC
- 100 elements affected: 5.26ms regen, 7.37ms TVC

**Gates**: ✅ All PASS

---

### B2.2: Collaboration Scaling

**Measured Scaling Law**:
```
latency_ms ≈ 50 + 5 × concurrency (for disjoint edits)
```

**Key Findings**:
- Linear latency growth with concurrency
- p95 latency <80ms for 3 concurrent users
- Conflict rate: 0.002 per user (low)
- Override rate: 0.015 for 3 users (⚠️ exceeds 0.01 threshold)

**Data Points**:
- 1 user: 53.7ms p50, 62.0ms p95
- 3 users: 66.1ms p50, 78.1ms p95

**Gates**: ⚠️ 4/5 PASS (override rate needs tuning)

**Action Item**: Refine conflict detection for disjoint edits

---

### B2.3: Governance Scaling

**Measured Scaling Law**:
```
RM100 ≈ 0 (constant for narrow permission profile)
```

**Key Findings**:
- Constant rework overhead (no scaling penalty)
- TVC remains ~60ms regardless of operation count
- Zero rollbacks with narrow permissions
- Approval latency adds linearly when triggered

**Data Points**:
- 10 operations: RM100 = 0, TVC = 60ms
- 100 operations: RM100 = 0, TVC = 60ms

**Gates**: ✅ All PASS

---

## Scaling Exponents Summary

| Experiment | Metric | Exponent (α) | Interpretation |
|------------|--------|--------------|----------------|
| B2.1 | Regeneration | 0.35 | Sub-linear (excellent) |
| B2.2 | Latency | 1.0 | Linear (acceptable) |
| B2.3 | RM100 | 0.0 | Constant (ideal) |

**Benchmark**: 
- Linear (α = 1.0) = scales proportionally
- Sub-linear (α < 1.0) = scales better than proportionally
- Super-linear (α > 1.0) = scales worse than proportionally

Revit exhibits super-linear scaling (α > 1.0) for regeneration.

---

## Reproduction Instructions

### Simulation Mode (No Server Required)

```bash
cd C:\Users\RICHARD\Pensaer-BIM
python -m pensaer_scaling_lab.run --exp all --simulate --quick --runs-per-tier 2
```

**Output**: `out/<timestamp>/`

### Full Mode (Server-Backed)

1. Start Postgres + server
2. Apply migration `server/migrations/002_add_operation_metrics.sql`
3. Run experiments:

```bash
python -m pensaer_scaling_lab.run --exp all --runs-per-tier 10
```

### Individual Experiments

```bash
# Locality only
python -m pensaer_scaling_lab.run --exp b2.1 --simulate

# Collaboration only
python -m pensaer_scaling_lab.run --exp b2.2 --simulate

# Governance only
python -m pensaer_scaling_lab.run --exp b2.3 --simulate
```

---

## Output Files

Each experiment generates:
- `results.jsonl`: Raw per-operation metrics
- `results.csv`: Same data in CSV format
- `verdict.md`: One-page pass/fail summary
- `plots/*.png`: Scaling law visualizations

---

## Key Metrics Explained

### TVC (Time-to-Verified-Change)
Total time from user intent to validated change:
```
TVC = t_validation_done - t_intent_start
```

Includes:
- Kernel commit time
- Regeneration time
- Validation time
- Approval latency (if required)

### RM100 (Rework Minutes per 100 Operations)
Penalty score for governance overhead:
```
RM100 = (rollbacks × 5 + violations × 2 + overrides × 1) / ops × 100
```

Lower is better. RM100 < 50 is excellent.

### VCSR (Verified Change Success Rate)
Percentage of operations that succeed without rollback:
```
VCSR = successful_ops / total_ops
```

Target: >99% for production workloads.

---

## Next Steps

### For Engineering

1. **Validate with real server**
   - Compare simulation vs. server-backed metrics
   - Ensure synthetic data matches production patterns

2. **Extend to xlarge tier**
   - Test 1M element models
   - Validate scaling law extrapolation

3. **Automate in CI/CD**
   - Run on every release
   - Alert if scaling exponents regress

### For Product

1. **Build customer dashboard**
   - Show predicted performance for their model
   - Display real-time scaling metrics

2. **Create scaling guarantees**
   - SLA-backed performance promises
   - "We guarantee <100ms p50 for models up to 500K elements"

---

## References

- **Kaplan et al. (2020)**: "Scaling Laws for Neural Language Models"
- **Scaling lab source**: `pensaer_scaling_lab/`
- **Full analysis**: `pitch/scaling-analysis.md`

---

**Maintained by**: Max (CTO)  
**Last updated**: 2026-01-30
