# Pensaer Code Automation System

**Version:** 1.0
**Created:** January 16, 2026
**Purpose:** Systematic approach to maximize AI code contribution while maintaining quality

---

## Executive Summary

This document defines how to use AI (Claude Opus 4.5) as a **force multiplier** for Pensaer development. The goal is:

- **80%+ of tasks completed by AI** without human code intervention
- **<5 minute human review** per PR
- **Zero architectural regressions**
- **<5% merge conflict rate** across parallel sessions

---

## 1. Task Decomposition Framework

### The Goldilocks Principle

Tasks must be sized correctly:
- **Too large** → AI loses context, makes architectural errors, hallucinates
- **Too small** → Coordination overhead exceeds coding time
- **Just right** → Single responsibility, 1-3 files, testable outcome

### Task Size Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TASK SIZE TAXONOMY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ATOMIC (15-30 min AI time)                                                  │
│  ═══════════════════════════                                                 │
│  • Fix a specific bug with known location                                    │
│  • Add a single property to existing component                               │
│  • Write unit tests for existing function                                    │
│  • Update types/interfaces                                                   │
│  • Refactor: rename, extract method, inline                                  │
│  Files: 1-2 | Lines changed: <100 | Review: 2 min                           │
│                                                                               │
│  MOLECULAR (30-60 min AI time)                                               │
│  ════════════════════════════                                                │
│  • Implement new React component (with tests)                                │
│  • Add new MCP tool (handler + schema + tests)                               │
│  • Create new Zustand store slice                                            │
│  • Implement new kernel function with PyO3 binding                           │
│  Files: 2-4 | Lines changed: 100-300 | Review: 5 min                        │
│                                                                               │
│  COMPOUND (1-2 hours AI time, may need iteration)                            │
│  ═══════════════════════════════════════════════                             │
│  • New feature end-to-end (component + store + API)                          │
│  • Refactor module structure                                                 │
│  • Implement new element type across stack                                   │
│  Files: 4-8 | Lines changed: 300-800 | Review: 10 min                       │
│                                                                               │
│  EPIC (Break down further - DO NOT assign as single task)                    │
│  ════════════════════════════════════════════════════════                    │
│  • "Implement collaboration" ❌                                              │
│  • "Add IFC support" ❌                                                      │
│  • "Build terminal" ❌                                                       │
│  → These must be decomposed into ATOMIC/MOLECULAR tasks                      │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Decomposition Decision Tree

```
START: "I need to implement X"
         │
         ▼
┌─────────────────────────┐
│ Can I describe X in     │
│ one sentence without    │──── NO ───→ DECOMPOSE FURTHER
│ using "and"?            │              │
└───────────┬─────────────┘              │
            │ YES                         │
            ▼                             │
┌─────────────────────────┐              │
│ Does X touch more than  │              │
│ 4 files?                │──── YES ──→ DECOMPOSE FURTHER
└───────────┬─────────────┘              │
            │ NO                          │
            ▼                             │
┌─────────────────────────┐              │
│ Can X be verified with  │              │
│ a single test or visual │──── NO ───→ DECOMPOSE FURTHER
│ check?                  │              │
└───────────┬─────────────┘              │
            │ YES                         │
            ▼                             │
    ✅ TASK IS CORRECTLY SIZED
       Assign to AI session
```

### Example: Decomposing "Add Terminal Panel"

**❌ BAD: Single Epic Task**
```
"Implement terminal panel with xterm.js, DSL parser, command execution, history, and autocomplete"
```

**✅ GOOD: Decomposed Tasks**
```
1. [ATOMIC] Install xterm.js and xterm-addon-fit dependencies
2. [MOLECULAR] Create TerminalPanel.tsx component with basic xterm rendering
3. [ATOMIC] Add terminal toggle to uiStore
4. [MOLECULAR] Create useTerminal.ts hook for terminal lifecycle
5. [ATOMIC] Add keyboard shortcut (Ctrl+`) to toggle terminal
6. [MOLECULAR] Create DSL lexer (tokenize: wall, door, window, room, select)
7. [MOLECULAR] Create DSL parser (AST from tokens)
8. [MOLECULAR] Create command executor (AST → store mutations)
9. [ATOMIC] Wire executor to terminal input handler
10. [MOLECULAR] Add command history with up/down navigation
11. [MOLECULAR] Add autocomplete dropdown component
12. [ATOMIC] Write E2E test: type "wall 0,0 to 10,0" → wall appears
```

### Task Template

Every task assigned to AI should follow this format:

```markdown
## Task: [ATOMIC|MOLECULAR|COMPOUND] - [Brief Title]

### Objective
One sentence describing the outcome.

### Context
- Related files: [list paths]
- Depends on: [prior tasks if any]
- Architectural constraint: [if any]

### Acceptance Criteria
- [ ] Criterion 1 (testable)
- [ ] Criterion 2 (testable)
- [ ] Tests pass
- [ ] Types check
- [ ] Lint clean

### Anti-patterns to Avoid
- Don't [specific thing to not do]
- Don't [another thing]

### Reference
- Similar existing code: [path]
- Pattern to follow: [description or path]
```

---

## 2. Context Injection Strategy

### The Context Hierarchy

AI needs context at multiple levels. Pensaer uses a **layered CLAUDE.md strategy**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTEXT HIERARCHY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  LAYER 0: Global (~/.claude/CLAUDE.md)                                       │
│  ══════════════════════════════════════                                      │
│  • Hardware capabilities (RTX 5070, 12GB VRAM)                               │
│  • User preferences (no emojis, concise output)                              │
│  • Cross-project conventions                                                 │
│                                                                               │
│  LAYER 1: Project Root (Pensaer-BIM/CLAUDE.md)                               │
│  ═════════════════════════════════════════════                               │
│  • Sacred Invariant (single source of truth)                                 │
│  • Repository structure overview                                             │
│  • Quick navigation table                                                    │
│  • Model routing hints (Opus for kernel, Sonnet for UI)                      │
│  • "What NOT to do" anti-patterns                                            │
│  • Links to deeper CLAUDE.md files                                           │
│                                                                               │
│  LAYER 2: Component (kernel/CLAUDE.md, app/CLAUDE.md, server/CLAUDE.md)      │
│  ══════════════════════════════════════════════════════════════════════      │
│  • Language-specific conventions                                             │
│  • File organization within component                                        │
│  • Common patterns with code examples                                        │
│  • Testing conventions                                                       │
│  • Error handling patterns                                                   │
│                                                                               │
│  LAYER 3: Task-Specific (provided in prompt)                                 │
│  ═══════════════════════════════════════════                                 │
│  • Specific files to read/modify                                             │
│  • Acceptance criteria                                                       │
│  • Anti-patterns for this task                                               │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### CLAUDE.md Best Practices

**1. Keep them updated** — Stale context causes AI errors

**2. Include "What NOT to Do"** — Negative examples prevent common mistakes:
```markdown
## What NOT to Do
- Don't write raw geometry math — use MCP tools
- Don't bypass event sourcing — all changes through commands
- Don't add dependencies without checking TECH_STACK.md
```

**3. Include code snippets** — Show, don't just tell:
```markdown
## Error Handling Pattern
```rust
// ✅ CORRECT
pub fn create_wall(params: WallParams) -> Result<Wall, PensaerError> {
    if params.thickness <= 0.0 {
        return Err(PensaerError::InvalidParameter("thickness must be positive"));
    }
    // ...
}

// ❌ WRONG - Don't panic
pub fn create_wall(params: WallParams) -> Wall {
    assert!(params.thickness > 0.0); // NO!
}
```

**4. Include architectural decision links**:
```markdown
## Key Decisions
- Why Rust kernel? → See `docs/adr/001-rust-kernel.md`
- Why Loro over Yjs? → See `docs/adr/002-crdt-choice.md`
```

### Context Injection Checklist

Before assigning a task, ensure AI has:

- [ ] Read relevant CLAUDE.md files (auto-loaded)
- [ ] Explicit file paths to read
- [ ] Example of similar existing code
- [ ] Clear acceptance criteria
- [ ] Known anti-patterns for this task type

---

## 3. Verification Pipeline

### The Verification Stack

Every PR must pass automated gates before human review:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERIFICATION PIPELINE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  GATE 1: Static Analysis (Fastest, catches 40% of errors)                    │
│  ════════════════════════════════════════════════════════                    │
│  ┌─────────────┬─────────────┬─────────────┐                                │
│  │ TypeScript  │ Rust        │ Python      │                                │
│  │ tsc --noEmit│ cargo clippy│ ruff check  │                                │
│  │ eslint      │ cargo fmt   │ mypy        │                                │
│  └─────────────┴─────────────┴─────────────┘                                │
│  Time: ~30 seconds | Blocks: type errors, lint violations                    │
│                                                                               │
│  GATE 2: Unit Tests (Fast, catches 30% of errors)                            │
│  ════════════════════════════════════════════════                            │
│  ┌─────────────┬─────────────┬─────────────┐                                │
│  │ Vitest      │ cargo test  │ pytest      │                                │
│  │ (app/)      │ (kernel/)   │ (server/)   │                                │
│  └─────────────┴─────────────┴─────────────┘                                │
│  Time: ~60 seconds | Blocks: logic errors, regressions                       │
│                                                                               │
│  GATE 3: Integration Tests (Medium, catches 15% of errors)                   │
│  ══════════════════════════════════════════════════════════                  │
│  • MCP tool → kernel → response validation                                   │
│  • Store mutation → UI update verification                                   │
│  Time: ~2 minutes | Blocks: integration failures                             │
│                                                                               │
│  GATE 4: Visual Regression (Critical for UI, catches 10% of errors)          │
│  ═══════════════════════════════════════════════════════════════════         │
│  • Playwright screenshot comparison                                          │
│  • Storybook visual tests (future)                                           │
│  Time: ~3 minutes | Blocks: UI regressions AI can't "see"                    │
│                                                                               │
│  GATE 5: E2E Smoke Tests (Slowest, catches 5% of errors)                     │
│  ═══════════════════════════════════════════════════════                     │
│  • Critical user flows                                                       │
│  • "Create wall → add door → export" type scenarios                          │
│  Time: ~5 minutes | Blocks: full-stack breakage                              │
│                                                                               │
│  ═══════════════════════════════════════════════════════════════════════     │
│  TOTAL PIPELINE TIME: ~10 minutes                                            │
│  AUTOMATED ERROR CATCH RATE: ~95%                                            │
│  HUMAN REVIEW FOCUS: Architecture, naming, edge cases (5%)                   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### GitHub Actions Workflow

```yaml
# .github/workflows/ai-pr-validation.yml
name: AI PR Validation

on:
  pull_request:
    branches: [main]

jobs:
  # GATE 1: Static Analysis (parallel)
  static-analysis:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        check: [typescript, rust, python]
    steps:
      - uses: actions/checkout@v4

      - name: TypeScript Check
        if: matrix.check == 'typescript'
        run: |
          cd app
          npm ci
          npm run typecheck
          npm run lint

      - name: Rust Check
        if: matrix.check == 'rust'
        run: |
          cd kernel
          cargo fmt --check
          cargo clippy -- -D warnings

      - name: Python Check
        if: matrix.check == 'python'
        run: |
          cd server
          pip install ruff mypy
          ruff check .
          mypy .

  # GATE 2: Unit Tests (parallel)
  unit-tests:
    needs: static-analysis
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: [app, kernel, server]
    steps:
      - uses: actions/checkout@v4

      - name: App Tests
        if: matrix.component == 'app'
        run: |
          cd app
          npm ci
          npm test

      - name: Kernel Tests
        if: matrix.component == 'kernel'
        run: |
          cd kernel
          cargo test

      - name: Server Tests
        if: matrix.component == 'server'
        run: |
          cd server
          pip install -e ".[test]"
          pytest

  # GATE 3: Integration Tests
  integration-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Integration Tests
        run: |
          # Start server
          cd server && uvicorn app.main:app &
          sleep 5
          # Run integration tests
          cd app && npm run test:integration

  # GATE 4: Visual Regression
  visual-regression:
    needs: unit-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Playwright
        run: |
          cd app
          npm ci
          npx playwright install --with-deps
      - name: Run Visual Tests
        run: |
          cd app
          npm run dev &
          sleep 10
          npx playwright test --project=visual
      - name: Upload Diff Artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diff
          path: app/test-results/

  # GATE 5: E2E Smoke
  e2e-smoke:
    needs: [integration-tests, visual-regression]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: E2E Tests
        run: |
          cd app
          npm ci
          npx playwright install --with-deps
          npm run dev &
          sleep 10
          npx playwright test --project=e2e

  # Final gate - all must pass
  pr-ready:
    needs: [static-analysis, unit-tests, integration-tests, visual-regression, e2e-smoke]
    runs-on: ubuntu-latest
    steps:
      - name: All checks passed
        run: echo "PR is ready for human review"
```

### Local Verification Script

AI should run this before committing:

```bash
#!/bin/bash
# scripts/verify.sh - Run before every commit

set -e  # Exit on first error

echo "🔍 GATE 1: Static Analysis"
echo "=========================="

echo "→ TypeScript..."
(cd app && npm run typecheck && npm run lint)

echo "→ Rust..."
(cd kernel && cargo fmt --check && cargo clippy -- -D warnings)

echo "→ Python..."
(cd server && ruff check . && mypy .)

echo ""
echo "🧪 GATE 2: Unit Tests"
echo "====================="

echo "→ App tests..."
(cd app && npm test -- --run)

echo "→ Kernel tests..."
(cd kernel && cargo test)

echo "→ Server tests..."
(cd server && pytest -q)

echo ""
echo "✅ All gates passed - safe to commit"
```

### AI Self-Correction Loop

When verification fails, AI should:

1. **Read the error output** completely
2. **Identify root cause** (not just the symptom)
3. **Fix and re-run verification locally**
4. **Only commit when all gates pass**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AI SELF-CORRECTION PROTOCOL                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Write Code                                                                  │
│       │                                                                       │
│       ▼                                                                       │
│   Run verify.sh ──────────────────────────────────────────┐                  │
│       │                                                    │                  │
│       ▼                                                    │                  │
│   ┌─────────┐                                              │                  │
│   │ PASS?   │─── YES ───→ Commit + Push ───→ Done        │                  │
│   └────┬────┘                                              │                  │
│        │ NO                                                │                  │
│        ▼                                                   │                  │
│   Read Error Output                                        │                  │
│        │                                                   │                  │
│        ▼                                                   │                  │
│   Identify Root Cause                                      │                  │
│        │                                                   │                  │
│        ▼                                                   │                  │
│   Fix Code ─────────────────────────────────────────────────┘                │
│                                                                               │
│   NO ITERATION LIMIT - Keep trying until verify.sh passes                    │
│   Verification is the only gate. If it passes, ship it.                      │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Parallel Execution Protocol

### The Conflict Prevention Strategy

Running multiple AI sessions simultaneously requires coordination:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PARALLEL EXECUTION MODEL                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  OWNERSHIP BOUNDARIES (No overlap allowed)                                   │
│  ═════════════════════════════════════════                                   │
│                                                                               │
│  Session 1 (Kernel)     Session 2 (App)       Session 3 (Server)            │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐            │
│  │ kernel/         │   │ app/src/        │   │ server/         │            │
│  │   pensaer-math  │   │   components/   │   │   mcp-servers/  │            │
│  │   pensaer-geom  │   │   stores/       │   │   app/          │            │
│  │   pensaer-crdt  │   │   hooks/        │   │   tests/        │            │
│  │   pensaer-ifc   │   │   utils/        │   │                 │            │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘            │
│         │                      │                      │                      │
│         └──────────────────────┴──────────────────────┘                      │
│                                │                                             │
│                        SHARED (Coordinate)                                   │
│                        ┌──────────────────┐                                  │
│                        │ docs/            │                                  │
│                        │ .github/         │                                  │
│                        │ package.json(s)  │                                  │
│                        │ Cargo.toml       │                                  │
│                        └──────────────────┘                                  │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Session Assignment Rules

1. **One session per component boundary** — Kernel, App, Server are independent
2. **Shared files require coordination** — docs/, configs, dependencies
3. **Interface changes need sync** — If Session 1 changes kernel API, Session 2 must wait

### Branch Strategy

```
main
  │
  ├─── ai/kernel-topology        (Session 1: Kernel work)
  │
  ├─── ai/app-terminal           (Session 2: App work)
  │
  └─── ai/server-geometry-tools  (Session 3: Server work)
```

**Rules:**
- Each session works on its own branch
- Branches prefixed with `ai/` for visibility
- Rebase from main at task start
- Merge via PR (automated gates must pass)

### Dependency Coordination Protocol

When tasks have dependencies:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY COORDINATION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  SCENARIO: App needs new kernel function                                     │
│                                                                               │
│  1. Session 1 (Kernel): Implement function + PyO3 binding                    │
│     └─ Create PR, merge to main                                              │
│                                                                               │
│  2. Session 2 (App): WAIT for kernel PR to merge                             │
│     └─ Pull main, then implement app feature                                 │
│                                                                               │
│  SCENARIO: Server needs new app types                                        │
│                                                                               │
│  1. Define interface in shared types file FIRST                              │
│  2. Both sessions can then work in parallel against interface                │
│                                                                               │
│  ANTI-PATTERN: Two sessions editing same file                                │
│  ═══════════════════════════════════════════                                 │
│  ❌ Session 1: Edit app/src/stores/modelStore.ts                             │
│  ❌ Session 2: Edit app/src/stores/modelStore.ts                             │
│  → GUARANTEED MERGE CONFLICT                                                 │
│                                                                               │
│  SOLUTION: Decompose into separate store slices                              │
│  ✅ Session 1: Edit app/src/stores/modelStore.ts                             │
│  ✅ Session 2: Edit app/src/stores/terminalStore.ts (NEW FILE)               │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Session Startup Checklist

Before starting an AI session:

```markdown
## Session Startup Protocol

1. [ ] Pull latest main
2. [ ] Create feature branch: `git checkout -b ai/[component]-[feature]`
3. [ ] Verify no other session is working on same files
4. [ ] Read relevant CLAUDE.md files
5. [ ] Load task with full context
6. [ ] Confirm acceptance criteria are clear
```

### Session Handoff Protocol

When a session completes:

```markdown
## Session Handoff Protocol

1. [ ] Run verify.sh - all gates pass
2. [ ] Commit with conventional commit message
3. [ ] Push branch
4. [ ] Create PR with:
   - [ ] Summary of changes
   - [ ] Files modified
   - [ ] Test coverage
   - [ ] Screenshots (if UI)
5. [ ] Wait for CI to pass
6. [ ] Request human review (if needed) or auto-merge
```

---

## 5. Prompt Templates

### Template 1: New React Component

```markdown
## Task: [MOLECULAR] Create [ComponentName] Component

### Objective
Create a new React component that [one sentence description].

### Context
- Location: `app/src/components/[ComponentName].tsx`
- Similar component: `app/src/components/[SimilarComponent].tsx`
- Uses store: `app/src/stores/[relevantStore].ts`

### Requirements
- Functional component with TypeScript
- Props interface defined and exported
- Tailwind CSS for styling
- Zustand for state (if needed)
- No external dependencies without approval

### Acceptance Criteria
- [ ] Component renders without errors
- [ ] Props are properly typed
- [ ] Responsive design (mobile-friendly)
- [ ] Keyboard accessible
- [ ] Unit tests in `[ComponentName].test.tsx`
- [ ] Types check: `npm run typecheck`
- [ ] Lint clean: `npm run lint`

### Anti-patterns
- Don't use `any` type
- Don't use inline styles (use Tailwind)
- Don't add new dependencies
- Don't use class components

### Code Pattern
```tsx
import { memo } from 'react';

interface ComponentNameProps {
  // props here
}

export const ComponentName = memo(function ComponentName({
  ...props
}: ComponentNameProps) {
  return (
    <div className="...">
      {/* component content */}
    </div>
  );
});
```
```

### Template 2: New MCP Tool

```markdown
## Task: [MOLECULAR] Implement [tool_name] MCP Tool

### Objective
Add a new MCP tool `[tool_name]` to the [geometry|spatial|validation|documentation] server.

### Context
- Server: `server/mcp-servers/[server-name]/`
- Similar tool: `[existing_tool_name]` in same server
- Kernel function (if applicable): `kernel/pensaer-geometry/src/[module].rs`

### Tool Specification
```json
{
  "name": "[tool_name]",
  "description": "[What this tool does]",
  "inputSchema": {
    "type": "object",
    "properties": {
      // define properties
    },
    "required": []
  }
}
```

### Implementation Requirements
- Handler in `handlers.py` or server main file
- Pydantic request/response models in `schemas.py`
- Input validation with clear error messages
- Call kernel via PyO3 if geometry operation
- Return structured response

### Acceptance Criteria
- [ ] Tool appears in MCP tool list
- [ ] Valid inputs produce correct output
- [ ] Invalid inputs return helpful error
- [ ] Unit tests cover happy path + edge cases
- [ ] Integration test with mock client
- [ ] Types pass: `mypy .`
- [ ] Lint clean: `ruff check .`

### Anti-patterns
- Don't implement geometry math in Python (use kernel)
- Don't return raw exceptions to client
- Don't skip input validation
```

### Template 3: Bug Fix

```markdown
## Task: [ATOMIC] Fix [Brief Bug Description]

### Bug Report
- **Symptom**: [What user sees]
- **Expected**: [What should happen]
- **Location**: [File path if known]
- **Reproduction**: [Steps to reproduce]

### Investigation Guidance
1. Read the relevant code
2. Identify root cause (not just symptom)
3. Consider edge cases
4. Check if similar bugs exist elsewhere

### Fix Requirements
- Minimal change (don't refactor unrelated code)
- Add regression test
- Update any affected tests

### Acceptance Criteria
- [ ] Bug no longer reproduces
- [ ] Regression test added
- [ ] No new bugs introduced
- [ ] All existing tests pass
- [ ] Types check
- [ ] Lint clean

### Anti-patterns
- Don't fix symptoms without understanding cause
- Don't make unrelated changes
- Don't skip the regression test
```

### Template 4: Kernel Function

```markdown
## Task: [MOLECULAR] Implement [function_name] in Kernel

### Objective
Add `[function_name]` to the [pensaer-math|pensaer-geometry|pensaer-crdt|pensaer-ifc] crate.

### Context
- Location: `kernel/[crate]/src/[module].rs`
- Similar function: `[existing_function]`
- Called by: [Python server | other kernel code | both]

### Function Signature
```rust
/// [Doc comment describing function]
///
/// # Arguments
/// * `param1` - Description
///
/// # Returns
/// Description of return value
///
/// # Errors
/// When this function returns an error
pub fn function_name(param1: Type1) -> Result<ReturnType, PensaerError> {
    // implementation
}
```

### Implementation Requirements
- Use `Result<T, PensaerError>` for fallible operations
- Document with `///` comments
- Add PyO3 binding if called from Python
- Follow existing patterns in crate

### Acceptance Criteria
- [ ] Function compiles
- [ ] Unit tests cover normal cases
- [ ] Unit tests cover error cases
- [ ] PyO3 binding works (if applicable)
- [ ] `cargo test` passes
- [ ] `cargo clippy` clean
- [ ] `cargo fmt` applied

### Anti-patterns
- Don't use `unwrap()` or `expect()` (return Result)
- Don't panic (return error)
- Don't use unsafe without justification
```

### Template 5: Refactor

```markdown
## Task: [ATOMIC|MOLECULAR] Refactor [What] - [Why]

### Objective
Refactor [specific thing] to [achieve specific goal].

### Motivation
- Current problem: [What's wrong now]
- Desired state: [What we want]
- Benefit: [Why this matters]

### Scope
- Files to modify: [list]
- Files NOT to modify: [list - important!]

### Refactoring Type
- [ ] Rename (symbol, file, module)
- [ ] Extract (function, component, module)
- [ ] Inline (remove unnecessary abstraction)
- [ ] Move (relocate code)
- [ ] Simplify (reduce complexity)

### Constraints
- Behavior must remain identical
- All existing tests must pass unchanged
- No new features (refactor only)

### Acceptance Criteria
- [ ] Behavior unchanged (tests pass)
- [ ] Code is measurably better (explain how)
- [ ] No functionality added or removed
- [ ] Types check
- [ ] Lint clean

### Anti-patterns
- Don't add features during refactor
- Don't change behavior
- Don't refactor unrelated code
- Don't skip running tests after each step
```

---

## 6. Quality Metrics Dashboard

Track these metrics to measure automation effectiveness:

### Weekly Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| AI task completion rate | >80% | Tasks completed without human code intervention |
| PR merge rate | >90% | PRs that pass CI on first push |
| Human review time | <5 min | Time from PR open to approval |
| Merge conflict rate | <5% | PRs with merge conflicts |
| Regression rate | <2% | PRs that introduce bugs |

### Task Tracking Template

```markdown
## Week of [Date]

### Tasks Assigned
| Task | Type | AI Session | Status | Human Intervention |
|------|------|------------|--------|-------------------|
| Add TerminalPanel | MOLECULAR | Session 2 | ✅ Merged | None |
| Fix snap bug | ATOMIC | Session 2 | ✅ Merged | None |
| Kernel topology | COMPOUND | Session 1 | ⏳ Review | Architecture guidance |

### Metrics
- Tasks assigned: 12
- AI completed: 10 (83%)
- Human intervention: 2 (17%)
- Avg review time: 4.2 min
- Merge conflicts: 0

### Learnings
- [What worked well]
- [What to improve]
- [Patterns to document]
```

---

## Appendix A: Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PENSAER CODE AUTOMATION QUICK REFERENCE                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  TASK SIZING                           VERIFICATION                          │
│  ───────────                           ────────────                          │
│  ATOMIC:    1-2 files, <100 lines      1. tsc/clippy/ruff                   │
│  MOLECULAR: 2-4 files, 100-300 lines   2. Unit tests                         │
│  COMPOUND:  4-8 files, 300-800 lines   3. Integration tests                  │
│  EPIC:      DECOMPOSE FIRST            4. Visual regression                  │
│                                        5. E2E smoke                          │
│                                                                               │
│  CONTEXT LAYERS                        PARALLEL RULES                        │
│  ──────────────                        ──────────────                        │
│  L0: ~/.claude/CLAUDE.md               • 1 session per component             │
│  L1: Pensaer-BIM/CLAUDE.md             • Own branch per session              │
│  L2: kernel|app|server/CLAUDE.md       • Rebase before start                 │
│  L3: Task-specific prompt              • No shared file edits                │
│                                                                               │
│  BRANCH NAMING                         COMMIT MESSAGE                        │
│  ─────────────                         ──────────────                        │
│  ai/kernel-[feature]                   type(scope): description              │
│  ai/app-[feature]                      │                                     │
│  ai/server-[feature]                   types: feat, fix, refactor,           │
│                                               test, docs, chore              │
│                                                                               │
│  SUCCESS METRICS                       AUTONOMY PRINCIPLE                    │
│  ───────────────                       ─────────────────                     │
│  • >80% AI completion                  • Keep trying until verify.sh passes  │
│  • <5 min review time                  • Verification is the only gate       │
│  • <5% merge conflicts                 • No human approval needed            │
│  • <2% regressions                     • If it passes CI, ship it            │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix B: Example Session Log

```markdown
# AI Session Log: 2026-01-16

## Session Info
- ID: session-2-app
- Component: app/
- Branch: ai/app-terminal-panel
- Start: 14:00

## Tasks Completed

### Task 1: [ATOMIC] Install xterm.js dependencies
- Time: 5 min
- Files: package.json
- Status: ✅ Merged
- Notes: Added xterm, xterm-addon-fit

### Task 2: [MOLECULAR] Create TerminalPanel component
- Time: 25 min
- Files:
  - app/src/components/TerminalPanel.tsx (new)
  - app/src/components/TerminalPanel.test.tsx (new)
- Status: ✅ Merged
- Notes: Basic xterm rendering working

### Task 3: [ATOMIC] Add terminal toggle to uiStore
- Time: 10 min
- Files: app/src/stores/uiStore.ts
- Status: ✅ Merged
- Notes: Added isTerminalOpen state + toggle action

### Task 4: [MOLECULAR] Create useTerminal hook
- Time: 20 min
- Files:
  - app/src/hooks/useTerminal.ts (new)
  - app/src/hooks/useTerminal.test.ts (new)
- Status: ✅ Merged
- Notes: Handles terminal lifecycle, resize

## Session Summary
- Tasks assigned: 4
- Tasks completed: 4 (100%)
- Human intervention: 0
- Verification failures: 1 (lint error, self-corrected)
- Total time: 60 min

## End: 15:00
```

---

*Document created: January 16, 2026*
*Pensaer Code Automation System v1.0*
