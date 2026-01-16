# /run-tests

Run test suites across the stack.

## Pre-compute context

```bash
# Show what's changed to target tests
git diff --name-only HEAD~1 2>/dev/null || git diff --name-only
```

## Arguments

- `$SCOPE` - Optional: `app`, `server`, `kernel`, or `all` (default: all)

## Instructions

Based on changed files or explicit scope, run relevant tests:

### TypeScript (app/)
```bash
cd app
npm test -- --run           # Single run
npm test -- --coverage      # With coverage
npm test -- -t "ComponentName"  # Specific test
```

### Python (server/)
```bash
cd server
python -m pytest -q                    # Quick
python -m pytest -v                    # Verbose
python -m pytest --cov=.               # Coverage
python -m pytest -k "test_wall"        # Pattern match
```

### Rust (kernel/)
```bash
cd kernel
cargo test                             # All tests
cargo test wall                        # Pattern match
cargo test -- --nocapture              # Show prints
```

## Smart Targeting

If `$SCOPE` is not specified:
- Changed `app/**` → run app tests
- Changed `server/**` → run server tests  
- Changed `kernel/**` → run kernel tests
- Multiple areas → run all

## Output

Report:
- Pass/fail count
- Failed test names
- Coverage % if available
