#!/bin/bash
# Pensaer Verification Pipeline
# Run this before every commit to catch errors locally
#
# Usage: ./scripts/verify.sh [--quick]
#   --quick: Skip slow tests (integration, visual, e2e)

set -e  # Exit on first error

QUICK_MODE=false
if [ "$1" == "--quick" ]; then
    QUICK_MODE=true
    echo "⚡ Quick mode: Skipping slow tests"
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}$1${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Track timing
START_TIME=$(date +%s)

#############################################
# GATE 1: Static Analysis
#############################################
print_header "GATE 1: Static Analysis"

# TypeScript
if [ -d "app" ]; then
    echo "→ TypeScript type check..."
    (cd app && npm run typecheck 2>/dev/null) && print_success "TypeScript types" || { print_error "TypeScript types failed"; exit 1; }

    echo "→ ESLint..."
    (cd app && npm run lint 2>/dev/null) && print_success "ESLint" || { print_error "ESLint failed"; exit 1; }
fi

# Rust
if [ -d "kernel" ]; then
    echo "→ Rust format check..."
    (cd kernel && cargo fmt --check 2>/dev/null) && print_success "Rust format" || { print_error "Rust format failed"; exit 1; }

    echo "→ Clippy..."
    (cd kernel && cargo clippy -- -D warnings 2>/dev/null) && print_success "Clippy" || { print_error "Clippy failed"; exit 1; }
fi

# Python
if [ -d "server" ]; then
    echo "→ Ruff check..."
    (cd server && ruff check . 2>/dev/null) && print_success "Ruff" || { print_error "Ruff failed"; exit 1; }

    echo "→ MyPy..."
    (cd server && mypy . 2>/dev/null) && print_success "MyPy" || { print_error "MyPy failed"; exit 1; }
fi

#############################################
# GATE 2: Unit Tests
#############################################
print_header "GATE 2: Unit Tests"

# App tests
if [ -d "app" ]; then
    echo "→ Vitest..."
    (cd app && npm test -- --run 2>/dev/null) && print_success "App tests" || { print_error "App tests failed"; exit 1; }
fi

# Kernel tests
if [ -d "kernel" ]; then
    echo "→ Cargo test..."
    (cd kernel && cargo test 2>/dev/null) && print_success "Kernel tests" || { print_error "Kernel tests failed"; exit 1; }
fi

# Server tests
if [ -d "server" ]; then
    echo "→ Pytest..."
    (cd server && pytest -q 2>/dev/null) && print_success "Server tests" || { print_error "Server tests failed"; exit 1; }
fi

#############################################
# GATE 3-5: Slow Tests (skip in quick mode)
#############################################
if [ "$QUICK_MODE" = false ]; then

    print_header "GATE 3: Integration Tests"
    if [ -f "app/package.json" ] && grep -q "test:integration" app/package.json; then
        echo "→ Integration tests..."
        (cd app && npm run test:integration 2>/dev/null) && print_success "Integration tests" || { print_error "Integration tests failed"; exit 1; }
    else
        echo "→ Integration tests: Not configured (skipping)"
    fi

    print_header "GATE 4: Visual Regression"
    if [ -f "app/package.json" ] && grep -q "test:visual" app/package.json; then
        echo "→ Visual regression..."
        (cd app && npm run test:visual 2>/dev/null) && print_success "Visual tests" || { print_error "Visual tests failed"; exit 1; }
    else
        echo "→ Visual tests: Not configured (skipping)"
    fi

    print_header "GATE 5: E2E Smoke Tests"
    if [ -f "app/package.json" ] && grep -q "test:e2e" app/package.json; then
        echo "→ E2E tests..."
        (cd app && npm run test:e2e 2>/dev/null) && print_success "E2E tests" || { print_error "E2E tests failed"; exit 1; }
    else
        echo "→ E2E tests: Not configured (skipping)"
    fi
fi

#############################################
# Summary
#############################################
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_header "VERIFICATION COMPLETE"
echo ""
echo -e "${GREEN}✅ All gates passed${NC}"
echo "   Duration: ${DURATION}s"
echo ""
echo "Safe to commit and push."
echo ""
