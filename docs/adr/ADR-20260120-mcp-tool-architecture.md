# ADR: MCP Tool Server Architecture

**Date:** 2026-01-20
**Status:** Accepted
**Decision Makers:** Development Team

## Context

AI agents need to interact with Pensaer-BIM for:
- Creating and modifying BIM elements
- Running spatial queries and validations
- Generating documentation and exports

## Decision

Implement four specialized **MCP tool servers** communicating via JSON-RPC 2.0:

1. **Geometry Server** - Element creation and mesh generation
2. **Spatial Server** - Adjacency, proximity, and area calculations
3. **Validation Server** - Code compliance and clash detection
4. **Documentation Server** - Schedules, reports, and exports

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Single monolithic server | Simpler deployment | Hard to scale, tight coupling |
| Four specialized servers | Separation of concerns | More services to manage |
| Microservices | Maximum flexibility | Overkill for current scale |

## Rationale

1. **Separation of concerns** - Each server has clear responsibility
2. **Independent scaling** - Can scale validation separately from geometry
3. **Testability** - Each server tested in isolation
4. **AI-friendly** - Tools grouped by intent match LLM reasoning

## Tool Categories

| Server | Tools | Example |
|--------|-------|---------|
| Geometry | `create_wall`, `create_door`, `compute_mesh` | Create elements |
| Spatial | `compute_adjacency`, `find_nearest`, `compute_area` | Spatial queries |
| Validation | `validate_model`, `detect_clashes`, `check_accessibility` | Compliance |
| Documentation | `generate_schedule`, `export_ifc`, `export_bcf` | Output generation |

## Consequences

- Need coordination layer for cross-server operations
- Transport overhead for JSON-RPC calls
- Consistent error handling across servers required

## References

- [MCP Specification](https://modelcontextprotocol.io/)
- [Tool Surface Documentation](../mcp/TOOL_SURFACE.md)
