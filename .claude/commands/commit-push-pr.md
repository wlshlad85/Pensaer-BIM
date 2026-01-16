# /commit-push-pr

Commit current changes, push to remote, and create a pull request.

## Pre-compute context

```bash
git status --short
git diff --stat HEAD~1..HEAD 2>/dev/null || git diff --stat
git branch --show-current
git log -1 --oneline 2>/dev/null || echo "No commits yet"
```

## Instructions

1. Review the staged/unstaged changes shown above
2. If changes are unstaged, stage them with `git add -A`
3. Generate a conventional commit message:
   - `feat:` new features
   - `fix:` bug fixes  
   - `refactor:` code improvements
   - `docs:` documentation changes
   - `test:` test additions/changes
   - `chore:` maintenance tasks
4. **Prefix with `[AI]`** if this code was AI-generated
5. Commit with the generated message
6. Push to the current branch (create remote if needed)
7. Create a PR with:
   - Title matching the commit message
   - Description summarizing what changed and why
   - Link to Linear issue if referenced in branch name

## Example Output

```
[AI] feat: Add clash detection MCP tool

- Implements spatial indexing for wall intersections
- Returns clash points with severity levels
- Includes unit tests for edge cases

Closes PEN-42
```
