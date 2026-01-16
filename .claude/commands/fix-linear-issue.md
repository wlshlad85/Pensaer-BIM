# /fix-linear-issue

Implement a Linear issue from start to finish.

## Pre-compute context

```bash
# Show current branch and status
git branch --show-current
git status --short
```

## Arguments

- `$ISSUE_ID` - Linear issue ID (e.g., PEN-42)

## Instructions

1. **Fetch issue details** from Linear:
   - Title, description, acceptance criteria
   - Priority and labels

2. **Create feature branch**:
   ```bash
   git checkout -b feat/$ISSUE_ID-brief-description
   ```

3. **Plan the implementation**:
   - Break down into subtasks
   - Identify files to modify
   - Note any dependencies

4. **Implement**:
   - Follow CLAUDE.md conventions
   - Write tests alongside code
   - Keep commits atomic

5. **Verify**:
   - Run `/verify-build`
   - Manual testing if UI changes

6. **Commit and PR**:
   - Use `[AI] feat: <description>` format
   - Reference issue: `Closes $ISSUE_ID`
   - Run `/commit-push-pr`

7. **Update Linear**:
   - Move to "In Review"
   - Add PR link to issue

## Labels

Apply appropriate Linear labels:
- `ai:full` - Fully AI-implemented
- `ai:assisted` - AI-assisted with human edits
