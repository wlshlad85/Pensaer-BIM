# /code-simplifier

Simplify and clean up code after implementation is complete.

## Pre-compute context

```bash
echo "=== Recently Modified Files ==="
git diff --name-only HEAD~3..HEAD 2>/dev/null || git diff --name-only
```

## Instructions

Review the recently modified files and apply these simplifications:

### 1. Remove Dead Code
- Unused imports
- Commented-out code blocks
- Unreachable code paths
- Unused variables/functions

### 2. Reduce Complexity
- Extract repeated logic into functions (3+ occurrences)
- Simplify nested conditionals
- Replace complex expressions with named variables
- Break functions >20 lines into smaller units

### 3. Improve Readability
- Add missing type hints (Python/TypeScript)
- Ensure consistent naming conventions
- Add docstrings/JSDoc for public APIs
- Group related code together

### 4. Apply DRY Principle
- Identify duplicated patterns
- Create shared utilities where appropriate
- But DON'T over-abstract (wait for 3+ uses)

## Constraints

- Don't change functionality
- Don't add new features
- Don't modify tests (unless fixing imports)
- Preserve all public APIs

## Output

List each simplification made:
```
✂️ Removed unused import: lodash
🔄 Extracted duplicate validation to validateWall()
📝 Added type hints to createRoom()
```
