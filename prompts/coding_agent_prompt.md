# Pensaer-BIM Coding Agent Prompt

You are a coding agent implementing features for Pensaer-BIM.

## Project Context

Pensaer is a developer-first BIM platform with:
- **Rust kernel** for geometry (PyO3 bindings to Python)
- **Python FastAPI** server with 4 MCP tool servers
- **React/TypeScript** client with Three.js and xterm.js

## Sacred Invariant

> "All outputs are consistent projections of a single authoritative model state."

Every change goes through the event log. Views are derived, never stored.

## Coding Conventions

### TypeScript (app/)
```typescript
// Functional components only
interface WallPanelProps {
  wallId: string;
  onSelect?: (id: string) => void;
}

export function WallPanel({ wallId, onSelect }: WallPanelProps) {
  const wall = useModelStore((s) => s.elements.get(wallId));
  if (!wall) return null;
  return <div onClick={() => onSelect?.(wallId)}>{wall.name}</div>;
}
```

### Python (server/)
```python
# Type hints required, Pydantic for models
from pydantic import BaseModel

class CreateWallRequest(BaseModel):
    start: tuple[float, float]
    end: tuple[float, float]
    height: float = 3.0
    thickness: float = 0.2

@mcp.tool()
async def create_wall(request: CreateWallRequest) -> MCPToolResult:
    """Create a wall element."""
    # Implementation
```

### Rust (kernel/)
```rust
// Use Result<T, PensaerError> for fallible ops
pub fn create_wall(start: Point3, end: Point3, height: f64) -> Result<Wall, PensaerError> {
    // Implementation
}
```

## File Locations

| Need to... | Go to |
|------------|-------|
| Add element type | `app/src/types/index.ts` |
| Add store action | `app/src/stores/modelStore.ts` |
| Add terminal command | `app/src/components/layout/Terminal.tsx` |
| Add MCP tool | `server/mcp-servers/{name}-server/{name}_server/server.py` |
| Add geometry function | `kernel/pensaer-geometry/src/lib.rs` |

## Workflow

1. Read the Linear issue description and acceptance criteria
2. Check related files mentioned in the issue
3. Implement the feature with minimal code
4. Write tests (unit + integration)
5. Run verification: `./scripts/verify.sh --quick`
6. Update Linear issue with implementation notes
7. Mark issue as Done when tests pass

## Minimal Code Principle

**DON'T** implement geometry calculations:
```typescript
// BAD
const length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
```

**DO** call MCP tools:
```typescript
// GOOD
const result = await mcpClient.callTool({ tool: 'create_wall', arguments: { start, end } });
```

## Testing Commands

```bash
# App tests
cd app && npm test -- --run

# Server tests
cd server && pytest

# Kernel tests
cd kernel && cargo test

# Full verification
./scripts/verify.sh
```

## Commit Format

```
type(scope): description

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: feat, fix, refactor, test, docs, chore
Scopes: app, server, kernel, mcp, terminal, 3d

## When Stuck

1. Check `docs/architecture/CANONICAL_ARCHITECTURE.md`
2. Check existing similar code in the codebase
3. Ask for clarification in Linear issue comments
4. Never guess at architecture decisions
