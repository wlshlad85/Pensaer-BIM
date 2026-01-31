# Soul: UI Constitution (Client Layer)

**Scope:** React + TypeScript + Three.js client, terminal integration, rendering contract.

---

## Terminal-First Principles

1. **The terminal is the primary interface.** Every operation available in the GUI must also be available as a DSL command or MCP tool call.
2. **Keyboard-centric.** All common operations have keyboard shortcuts. Mouse is optional for spatial operations (3D navigation, element selection in viewport), never required for data operations.
3. **Command palette is primary navigation.** VS Code-style ⌘K interface with fuzzy matching and context awareness.
4. **Integrated terminal.** xterm.js embedded in the client. DSL commands execute directly. Output streams in real-time.

## Rendering Contract

### 3D Viewport (Three.js / WebGL)

1. **Views are projections, never source.** The 3D viewport renders from model state. It never holds its own version of element data.
2. **Mesh updates follow events.** When an `element.modified` event arrives, the affected mesh is recomputed from kernel output and re-rendered. No stale geometry.
3. **Selection state is client-side.** Selected element IDs are UI state, not model state. Selection does not emit events.
4. **Camera state is per-user.** View angle, zoom, and pan are user preferences, not model data.

### Rendering Pipeline

```
Model State (server) → WebSocket event → Zustand store update
→ Three.js scene graph update → WebGL render
```

### Performance Targets

| Metric | Target |
|--------|--------|
| Frame rate | 60 FPS for models < 10K elements |
| Mesh update latency | < 16ms (one frame) for single element |
| Initial load | < 3s for 1000-element model |

## State Management

- **Zustand + Immer** for immutable client state.
- **Single source of truth:** Server model state, synced via WebSocket.
- **Optimistic updates:** Client can show predicted state before server confirmation, but must reconcile on server response.
- **Rollback on conflict:** If server rejects a mutation, client state reverts to server truth.

## Accessibility

1. **ARIA labels** on all interactive elements.
2. **Keyboard navigation** for all UI panels (not just 3D viewport).
3. **High contrast mode** available.
4. **Screen reader support** for element properties, validation results, and command output.
5. **Terminal output is text-first** — always readable without visual rendering.

## UI Component Rules

1. **Functional components only.** No class components.
2. **TypeScript strict mode.** No `any` types in component props.
3. **Tailwind CSS for styling.** No inline styles, no CSS modules.
4. **No UI-level business logic.** Components render state and dispatch actions. Computation happens in stores or server.

## DSL Integration

- The integrated terminal accepts all DSL commands.
- `$last` and `$selected` resolve to client-side state (last created element, currently selected element).
- NL mode (`#` prefix) sends text to the agent runtime and streams the response.
- Command history persists across sessions (stored locally).

## Error Display

- **Validation errors:** Inline in terminal + highlighted elements in viewport.
- **Clash detection:** 3D markers at clash locations + list in validation panel.
- **Agent errors:** Displayed in terminal with event_id for traceability.
- **Network errors:** Toast notification + automatic reconnection for WebSocket.

## What the UI Never Does

1. **Never stores model state independently.** All element data comes from server.
2. **Never mutates model directly.** All changes go through MCP tools or DSL commands via server.
3. **Never caches stale geometry.** If the WebSocket reconnects, full state sync occurs.
4. **Never shows compliance status without a validation run.**

---

*This constitution governs all code in `app/` and `src/`. UI behavior that violates these rules is a bug.*
