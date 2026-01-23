# ADR: Terminal-First Interface

**Date:** 2026-01-20
**Status:** Accepted
**Decision Makers:** Development Team

## Context

Pensaer-BIM targets developers who prefer keyboard-driven workflows. The interface must support:
- Rapid element creation
- Command history and autocomplete
- Scriptable operations (macros)
- Natural integration with AI agents

## Decision

Implement a **terminal-first interface** using xterm.js with:
- DSL commands for element creation (`wall 0,0 5,0`)
- Readline-style history and editing
- Macro recording and playback
- ANSI color output

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| GUI-only | Familiar to users | Slow for experts |
| Terminal-only | Fast for power users | Learning curve |
| Terminal + GUI | Best of both | More complexity |
| Chat interface | Natural language | Ambiguous, slow |

## Rationale

1. **Developer audience** - Target users are comfortable with terminals
2. **Speed** - Commands faster than mouse interactions
3. **Scriptability** - Commands compose into macros
4. **AI-native** - Terminal maps directly to MCP tool calls
5. **History** - Easy to repeat and modify commands

## Command Syntax

```bash
# Element creation
wall <start_x>,<start_y> <end_x>,<end_y> [--height=3] [--thickness=0.2]
door <wall_id> <position> [--width=0.9] [--type=single]

# Queries
list walls
select --type=door
info <element_id>

# Operations
delete <id>
undo
redo
```

## Consequences

- Must support autocomplete for discoverability
- Help system required for new users
- Validation must provide helpful error messages
- GUI duplicates some terminal functionality

## References

- [xterm.js](https://xtermjs.org/)
- [DSL Design](../dsl/SYNTAX.md)
