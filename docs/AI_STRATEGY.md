# Pensaer AI-First Development Strategy v2.0

**Document Version:** 2.0  
**Last Updated:** January 16, 2026  
**Sources:** Boris Cherny (Claude Code creator), Base44 playbook, GitClear research, Anthropic best practices

---

## Executive Summary

This document defines Pensaer's production AI development methodology, synthesizing:
- **Boris Cherny's workflow** (259 PRs/30 days, 100% Claude Code + Opus 4.5)
- **Base44's visual-first approach** ($80M exit, 90%+ AI-generated code)
- **Current best practices** from Anthropic engineering and community research

**Target Outcomes:**
| Metric | Target | Measurement |
|--------|--------|-------------|
| AI-generated code | >80% | Git attribution + Linear labels |
| Iteration feedback loop | <60 seconds | File change → visual result |
| CLAUDE.md coverage | 100% | Every major directory |
| Verification loops | All PRs | Automated testing before merge |

---

## Part 1: Boris Cherny Methodology

### 1.1 Core Principles

> "Give Claude a way to verify its work. If Claude has that feedback loop, it will 2-3x the quality of the final result." — Boris Cherny

| Principle | Implementation |
|-----------|----------------|
| **Parallel sessions** | 5 local terminals + 5-10 web sessions |
| **Opus 4.5 with thinking** | For everything (slower but needs less steering) |
| **Plan mode first** | Iterate on plan → auto-accept for execution |
| **Team CLAUDE.md** | Shared, in git, updated on every mistake |
| **Verification loops** | Browser testing, test suites, type checking |
| **Slash commands** | Codify repetitive workflows |
| **PostToolUse hooks** | Auto-format on every write |

### 1.2 Session Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PARALLEL EXECUTION                        │
├─────────────────────────────────────────────────────────────┤
│  Local Terminal Sessions (5x)                               │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ kernel/  │ server/  │ app/     │ docs/    │ testing  │  │
│  │ Opus 4.5 │ Opus 4.5 │ Opus 4.5 │ Sonnet   │ Haiku    │  │
│  │ geometry │ MCP tools│ React UI │ markdown │ quick fix│  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Web/Mobile Sessions (5-10x)                                │
│  • claude.ai/code for long-running tasks                    │
│  • --teleport to move sessions between local/web            │
│  • iOS app for async task kickoff                           │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Git Checkout Strategy (Not Branches)

Boris uses **separate git checkouts** per session, not worktrees or branches:

```bash
# Create isolated checkouts for parallel work
cd ~/projects
git clone pensaer-bim pensaer-kernel    # Rust work
git clone pensaer-bim pensaer-server    # Python work
git clone pensaer-bim pensaer-app       # React work
git clone pensaer-bim pensaer-testing   # Test work

# Each Claude session operates in its own checkout
# No merge conflicts, no context switching
```

### 1.4 Plan Mode → Auto-Accept Flow

```
┌──────────────────────────────────────────────────────────┐
│  PLAN MODE (Shift+Tab twice)                              │
│  ┌──────────────────────────────────────────────────────┐│
│  │ 1. Describe goal: "Implement clash detection MCP"    ││
│  │ 2. Claude proposes plan                              ││
│  │ 3. Iterate: "Add spatial index step"                 ││
│  │ 4. Iterate: "Handle edge cases for thin walls"       ││
│  │ 5. Plan approved ✓                                   ││
│  └──────────────────────────────────────────────────────┘│
│                           ↓                               │
│  AUTO-ACCEPT MODE (Shift+Tab)                             │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Claude executes entire implementation                ││
│  │ Usually 1-shots it if plan was good                  ││
│  │ No back-and-forth, minimal steering                  ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

## Part 2: Visual-First Iteration Loop

### 2.1 Base44 Insight

> "The interaction model is visual-first: you see the app running, notice what's off, and iterate by describing changes. Errors surface in the UI, not logs." — Maor Shlomo

### 2.2 Pensaer Implementation

**Target: <60 second file change → visual result**

| Component | Tool | Feedback Time |
|-----------|------|---------------|
| React client | Vite HMR | <1 second |
| Python MCP servers | uvicorn --reload | 2-5 seconds |
| Rust kernel | cargo-watch incremental | 5-15 seconds |
| Full stack integration | Concurrently | 15-30 seconds |

### 2.3 Hot Reload Setup

#### React Client (app/)
```json
// vite.config.ts - already fast with Vite
{
  "server": {
    "hmr": true,
    "watch": {
      "usePolling": false
    }
  }
}
```

#### Python Server (server/)
```bash
# Start with auto-reload
uvicorn main:app --reload --reload-dir server/

# Or use watchdog for more control
pip install watchdog
watchmedo auto-restart -d server/ -p "*.py" -- python -m uvicorn main:app
```

#### Rust Kernel (kernel/)
```bash
# Install cargo-watch
cargo install cargo-watch

# Watch and rebuild on changes
cargo watch -w kernel -x 'build --release'

# For hot-reload development (optional, advanced)
# Consider hot-lib-reloader crate for game-dev style iteration
```

#### Unified Startup Script
```bash
#!/bin/bash
# dev.sh - Start all services with hot reload

# Use concurrently to run all in parallel
npx concurrently \
  "cd app && npm run dev" \
  "cd server && uvicorn main:app --reload" \
  "cd kernel && cargo watch -x build" \
  --names "app,server,kernel" \
  --prefix-colors "cyan,yellow,magenta"
```

### 2.4 Error Surfacing in UI

Instead of log diving, surface errors visually:

```typescript
// app/src/components/ErrorBoundary.tsx
export function DevErrorDisplay({ error }: { error: Error }) {
  if (import.meta.env.DEV) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-900 text-white p-4 rounded-lg max-w-md">
        <h3 className="font-bold">🔴 Dev Error</h3>
        <pre className="text-xs overflow-auto">{error.message}</pre>
        <pre className="text-xs opacity-50">{error.stack?.slice(0, 200)}</pre>
      </div>
    );
  }
  return null;
}
```

---

## Part 3: CLAUDE.md Architecture

### 3.1 Best Practices (Synthesized)

| Practice | Rationale |
|----------|-----------|
| **<300 lines root** | LLMs follow ~150-200 instructions reliably |
| **Progressive disclosure** | Subdirectory CLAUDE.md files for specifics |
| **Update on every mistake** | "Every mistake becomes a rule" |
| **@.claude tag on PRs** | Compound knowledge through code review |
| **Concise, not comprehensive** | If you can't explain it briefly, it's not ready |

### 3.2 Pensaer CLAUDE.md Structure

```
Pensaer-BIM/
├── CLAUDE.md                 # Root: project overview, sacred invariant, model routing
├── kernel/
│   └── CLAUDE.md             # Rust conventions, error handling, no_mangle rules
├── server/
│   └── CLAUDE.md             # Python patterns, MCP tool templates, FastAPI conventions
├── app/
│   └── CLAUDE.md             # React patterns, Zustand usage, Tailwind rules
└── .claude/
    ├── commands/             # Slash commands
    │   ├── commit-push-pr.md
    │   ├── verify-build.md
    │   └── run-tests.md
    └── rules/                # Conditional rules by path
        ├── api.md            # paths: ["server/mcp-servers/**/*.py"]
        └── components.md     # paths: ["app/src/components/**/*.tsx"]
```

### 3.3 Root CLAUDE.md Template (Optimized)

```markdown
# Pensaer BIM - AI Navigation

## Sacred Invariant
> All outputs are consistent projections of a single authoritative model state.

## Quick Nav
| Need | Location |
|------|----------|
| Geometry | kernel/pensaer-geometry/src/lib.rs |
| MCP tools | server/mcp-servers/ |
| UI components | app/src/components/ |
| State stores | app/src/stores/ |

## Model Routing
- **Opus 4.5**: Rust kernel, MCP architecture, complex reasoning
- **Sonnet**: React UI, Python CRUD, documentation
- **Haiku**: Quick fixes, simple refactors

## Code Rules
1. Call MCP tools, don't implement geometry
2. All changes through event sourcing
3. Type hints required (Python), strict TS (TypeScript)
4. <20 line functions

## Don't
- Write raw geometry math
- Bypass event log
- Add deps without checking TECH_STACK.md
- Modify kernel/ without Rust expertise

## See Also
- kernel/CLAUDE.md (Rust specifics)
- server/CLAUDE.md (MCP patterns)
- app/CLAUDE.md (React conventions)
```

---

## Part 4: AI Code Measurement

### 4.1 Measurement Approaches

| Method | Pros | Cons |
|--------|------|------|
| **Git attribution** | Objective, historical | Doesn't capture inline suggestions |
| **Linear labels** | Task-level tracking | Manual effort |
| **Commit message convention** | Simple, searchable | Requires discipline |
| **IDE telemetry** | Granular | Privacy concerns, vendor lock-in |

### 4.2 Recommended: Hybrid Approach

#### A. Commit Message Convention
```bash
# Convention: [AI] prefix for AI-assisted commits
git commit -m "[AI] Implement clash detection MCP tool"
git commit -m "[AI:partial] Add room adjacency queries (human edited)"
git commit -m "Fix typo in README"  # Human-only, no prefix

# Query AI commits
git log --oneline --grep="\[AI" | wc -l
git log --oneline | wc -l
# Calculate: (AI commits / total commits) * 100
```

#### B. Linear Label Strategy
```yaml
# Linear labels for issue tracking
labels:
  - name: "ai:full"
    description: "Fully AI-implemented"
    color: "#22c55e"
  - name: "ai:assisted"
    description: "AI-assisted with human edits"
    color: "#eab308"
  - name: "human"
    description: "Human-only implementation"
    color: "#3b82f6"
```

#### C. Weekly Metrics Script
```bash
#!/bin/bash
# ai-metrics.sh - Calculate AI code percentage

TOTAL=$(git log --oneline --since="1 week ago" | wc -l)
AI_FULL=$(git log --oneline --since="1 week ago" --grep="\[AI\]" | wc -l)
AI_PARTIAL=$(git log --oneline --since="1 week ago" --grep="\[AI:partial\]" | wc -l)

AI_TOTAL=$((AI_FULL + AI_PARTIAL))
PERCENT=$((AI_TOTAL * 100 / TOTAL))

echo "=== AI Code Metrics (Last 7 Days) ==="
echo "Total commits: $TOTAL"
echo "AI-full commits: $AI_FULL"
echo "AI-partial commits: $AI_PARTIAL"
echo "AI percentage: ${PERCENT}%"
```

### 4.3 Quality Gates

> "More expensive models = lower total cost (fewer iterations)." — Maor Shlomo

Track not just volume, but quality:

| Metric | Target | Why |
|--------|--------|-----|
| AI commit % | >80% | Productivity measure |
| AI revert % | <5% | Quality measure |
| PR first-pass rate | >70% | Plan mode effectiveness |
| Test coverage on AI code | >80% | Verification loops working |

---

## Part 5: Slash Commands & Automation

### 5.1 Essential Commands

```
.claude/commands/
├── commit-push-pr.md       # Daily inner loop (dozens of times/day)
├── verify-build.md         # Pre-commit validation
├── run-tests.md            # Test suite execution
├── create-mcp-tool.md      # MCP tool scaffolding
├── code-simplifier.md      # Post-implementation cleanup
└── fix-linear-issue.md     # Issue → branch → implementation
```

### 5.2 commit-push-pr.md Example

```markdown
# /commit-push-pr

Commit, push, and create PR for current changes.

## Pre-compute context
\`\`\`bash
git status --short
git diff --stat
git log -1 --oneline
\`\`\`

## Instructions
1. Review the staged changes above
2. Generate a conventional commit message:
   - feat: new features
   - fix: bug fixes
   - refactor: code improvements
   - docs: documentation
   - test: test additions
3. Prefix with [AI] if this was AI-generated code
4. Commit and push to current branch
5. Create PR with:
   - Title matching commit message
   - Description summarizing changes
   - Link to Linear issue if applicable
```

### 5.3 PostToolUse Hook

```json
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npm run format || cargo fmt || black . || true"
          }
        ]
      }
    ]
  }
}
```

---

## Part 6: Verification Infrastructure

### 6.1 Boris's Key Insight

> "Probably the most important thing to get great results out of Claude Code—give Claude a way to verify its work."

### 6.2 Verification Layers

```
┌────────────────────────────────────────────────────────────┐
│                    VERIFICATION STACK                       │
├────────────────────────────────────────────────────────────┤
│  Layer 4: Visual Verification                               │
│  • Browser automation (Playwright)                          │
│  • Screenshot comparison                                    │
│  • UI interaction testing                                   │
├────────────────────────────────────────────────────────────┤
│  Layer 3: Integration Tests                                 │
│  • MCP tool end-to-end tests                               │
│  • API contract tests                                       │
│  • Event sourcing round-trip                               │
├────────────────────────────────────────────────────────────┤
│  Layer 2: Unit Tests                                        │
│  • Rust: cargo test                                         │
│  • Python: pytest                                           │
│  • TypeScript: vitest                                       │
├────────────────────────────────────────────────────────────┤
│  Layer 1: Static Analysis                                   │
│  • cargo clippy (Rust)                                      │
│  • mypy (Python)                                            │
│  • tsc --noEmit (TypeScript)                               │
│  • eslint (JavaScript)                                      │
└────────────────────────────────────────────────────────────┘
```

### 6.3 Pre-Commit Verification Script

```bash
#!/bin/bash
# verify.sh - Run before every commit

set -e

echo "🔍 Running verification..."

# Layer 1: Static analysis
echo "  → TypeScript..."
cd app && npx tsc --noEmit && cd ..

echo "  → Python..."
cd server && mypy . && cd ..

echo "  → Rust..."
cd kernel && cargo clippy -- -D warnings && cd ..

# Layer 2: Unit tests
echo "  → Unit tests..."
cd app && npm test -- --run && cd ..
cd server && pytest -q && cd ..
cd kernel && cargo test && cd ..

# Layer 3: Build
echo "  → Build..."
cd app && npm run build && cd ..

echo "✅ All verifications passed"
```

---

## Part 7: Implementation Roadmap

### Week 1: Foundation
- [ ] Set up 5 parallel git checkouts
- [ ] Configure Opus 4.5 as default model
- [ ] Create `/commit-push-pr` slash command
- [ ] Add [AI] commit message convention
- [ ] Set up PostToolUse formatting hook

### Week 2: Hot Reload
- [ ] Configure Vite HMR (verify sub-second)
- [ ] Set up uvicorn --reload for Python
- [ ] Add cargo-watch for Rust kernel
- [ ] Create unified `dev.sh` startup script
- [ ] Add DevErrorDisplay component

### Week 3: CLAUDE.md Optimization
- [ ] Audit root CLAUDE.md (<300 lines)
- [ ] Create kernel/CLAUDE.md
- [ ] Create server/CLAUDE.md
- [ ] Create app/CLAUDE.md
- [ ] Set up .claude/rules/ conditional rules

### Week 4: Verification & Metrics
- [ ] Create verify.sh pre-commit script
- [ ] Set up weekly ai-metrics.sh
- [ ] Add Linear label workflow
- [ ] Configure browser automation (Playwright MCP)
- [ ] Create verification subagent

### Ongoing
- [ ] Update CLAUDE.md on every mistake
- [ ] Tag @.claude on PR reviews
- [ ] Track AI code % weekly
- [ ] Iterate on slash commands as patterns emerge

---

## Appendix A: Model Selection Matrix

| Task | Model | Rationale |
|------|-------|-----------|
| Rust kernel implementation | Opus 4.5 + thinking | Complex geometry math, needs deep reasoning |
| MCP tool creation | Opus 4.5 + thinking | Architectural decisions, error handling |
| IFC parsing | Opus 4.5 + thinking | Domain complexity, spec compliance |
| React components | Sonnet 4 | Fast iteration, design-focused |
| Python API routes | Sonnet 4 | Standard patterns, quick |
| Documentation | Sonnet 4 | Clear writing, fast |
| Quick fixes | Haiku 4 | Speed over depth |
| Code review | Opus 4.5 | Catch subtle issues |
| Test generation | Sonnet 4 | Pattern matching |

---

## Appendix B: Daily Workflow Template

```
Morning:
  1. Check overnight Claude web sessions
  2. Review PRs from yesterday's parallel work
  3. Kick off 2-3 long-running tasks on claude.ai/code

Active Development:
  1. Plan mode: describe goal
  2. Iterate on plan until solid
  3. Switch to auto-accept
  4. Let Claude execute
  5. Verify with tests/browser
  6. /commit-push-pr

End of Day:
  1. Push all branches
  2. Create PRs for review
  3. Start 2-3 overnight tasks on web
  4. Update CLAUDE.md with any new learnings
```

---

## Appendix C: Key Quotes to Remember

> "Even though it's bigger & slower than Sonnet, since you have to steer it less and it's better at tool use, it is almost always faster than using a smaller model in the end." — Boris Cherny

> "The less code it writes, the fewer mistakes or confusion it can cause." — Maor Shlomo

> "Every mistake becomes a rule." — via CLAUDE.md updates

> "Don't make one brain do all jobs; run many partial brains." — Fleet approach

> "A wrong fast answer is slower than a right slow answer." — Total iteration cost

---

## Appendix D: Legacy v1.0 Reference

Previous version (January 15, 2026) focused on Base44 patterns only. This v2.0 adds:
- Boris Cherny's parallel session methodology
- Concrete measurement approaches for AI code %
- Slash command templates
- Verification infrastructure design
- Weekly implementation roadmap

---

*Document created: January 15, 2026*  
*Updated to v2.0: January 16, 2026*  
*Based on Boris Cherny's workflow, Base44 patterns, and community best practices*
