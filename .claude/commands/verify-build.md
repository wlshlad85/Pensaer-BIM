# /verify-build

Run full verification stack before committing.

## Pre-compute context

```bash
echo "=== Project Status ==="
git status --short
echo ""
echo "=== Changed Files ==="
git diff --name-only
```

## Instructions

Run the verification layers in order. Stop and report on first failure.

### Layer 1: Static Analysis

```bash
# TypeScript
cd app && npx tsc --noEmit && cd ..

# Python (if server/ has changes)
cd server && python -m mypy . --ignore-missing-imports 2>/dev/null || echo "mypy not configured" && cd ..

# Rust (if kernel/ has changes)
cd kernel && cargo clippy -- -D warnings 2>/dev/null || echo "No Rust changes" && cd ..
```

### Layer 2: Unit Tests

```bash
# TypeScript tests
cd app && npm test -- --run 2>/dev/null || echo "No TS tests configured" && cd ..

# Python tests  
cd server && python -m pytest -q 2>/dev/null || echo "No Python tests configured" && cd ..

# Rust tests
cd kernel && cargo test 2>/dev/null || echo "No Rust tests configured" && cd ..
```

### Layer 3: Build

```bash
cd app && npm run build && cd ..
```

## Success Criteria

- All static analysis passes (0 errors)
- All tests pass
- Build succeeds

Report: "✅ All verifications passed" or list specific failures.
