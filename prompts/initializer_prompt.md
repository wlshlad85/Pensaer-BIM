# Pensaer-BIM Project Initializer Prompt

You are initializing a Linear project for Pensaer-BIM, a developer-first BIM platform.

## Your Task

Create Linear issues from the app_spec.txt task breakdown. Each issue should:

1. Have a clear, actionable title
2. Include detailed acceptance criteria
3. Include test steps (unit, integration, visual, E2E)
4. Be properly labeled by component (kernel, server, app, mcp, terminal, 3d, ifc)
5. Have dependencies linked where applicable

## Issue Template

```markdown
## Description
[What this task accomplishes]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Technical Notes
[Implementation hints, file locations, patterns to follow]

## Test Steps
1. **Unit Test:** [specific test case]
2. **Integration Test:** [how it works with other components]
3. **Visual Test:** [what it should look like]
4. **Puppeteer Test:** [E2E validation command]

## Dependencies
- Blocked by: [issue numbers]
- Blocks: [issue numbers]

## Files to Modify
- `path/to/file1.ts`
- `path/to/file2.py`
```

## Component Mapping

| Step Range | Component | Labels |
|------------|-----------|--------|
| 1-4 | Project Setup | app |
| 5-8 | Canvas Components | app, 3d |
| 9-10 | Terminal | app, terminal |
| 11-14 | MCP Tools | server, mcp |
| 15-18 | UI Components | app |
| 19-20 | Testing | all |

## Priority Order

1. **Critical Path (do first):**
   - Step 1: Project setup
   - Step 2: Types/interfaces
   - Step 3: State management
   - Step 9: MCP client
   - Step 10: Geometry server

2. **High Priority:**
   - Step 4: 2D canvas
   - Step 7: Terminal
   - Step 11: Spatial server

3. **Can Parallel:**
   - Step 5: 3D canvas
   - Step 12: Validation server
   - Step 13: Documentation server

## After Creating Issues

1. Create a META issue summarizing the project
2. Add all issues to a "Phase 1 Foundation" project
3. Set up issue dependencies based on step order
4. Assign estimates (1 = 1 day, 2 = 2-3 days, 3 = 1 week)

## Reference Files

- Architecture: `docs/architecture/CANONICAL_ARCHITECTURE.md`
- Tech Stack: `docs/architecture/TECH_STACK.md`
- MCP Tools: `docs/mcp/TOOL_SURFACE.md`
- Roadmap: `docs/ROADMAP.md`
