# ADR: Zustand for State Management

**Date:** 2026-01-20
**Status:** Accepted
**Decision Makers:** Development Team

## Context

The Pensaer-BIM client needs a state management solution that handles:
- BIM model elements (potentially thousands)
- Selection and UI state
- History for undo/redo
- Type safety with TypeScript

## Decision

Use **Zustand** with **Immer** middleware for state management.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Redux Toolkit | Mature, DevTools | Boilerplate, learning curve |
| MobX | Reactive, minimal code | Implicit, harder to trace |
| Zustand | Simple, TypeScript-native | Less ecosystem |
| Jotai | Atomic, flexible | May be overkill |

## Rationale

1. **Minimal boilerplate** - No action creators, reducers, or selectors needed
2. **Immer integration** - Clean immutable updates with mutable syntax
3. **TypeScript-first** - Excellent type inference
4. **Performance** - Fine-grained subscriptions prevent unnecessary re-renders
5. **Testing** - Easy to access state outside React for testing

## Consequences

- Store state is accessible outside React components via `getState()`
- Need discipline to use selective subscriptions for performance
- Limited middleware ecosystem compared to Redux

## References

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Immer Documentation](https://immerjs.github.io/immer/)
