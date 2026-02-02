# Pensaer Engineering Encyclopedia — Part 4
# TESTING STRATEGY, QUALITY GATES, AND FAIL-PROOFING

> **Author:** Max, CTO — Pensaer-BIM  
> **Version:** 1.0 | **Date:** 2025-07-13  
> **Audience:** Every engineer who touches this codebase  
> **Mandate:** If you follow this document, nothing ships broken. Period.

---

## Table of Contents

1. [Testing Pyramid](#1-testing-pyramid)
2. [Quality Gates for Every Feature](#2-quality-gates-for-every-feature)
3. [The Golden Path Test](#3-the-golden-path-test)
4. [Fail-Proofing Checklist](#4-fail-proofing-checklist)
5. [Known Anti-Patterns](#5-known-anti-patterns)
6. [Test Coverage Map](#6-test-coverage-map)
7. [CI/CD Pipeline](#7-cicd-pipeline)

---

## 1. Testing Pyramid

Our testing strategy follows the classic pyramid: many fast unit tests at the base, fewer integration tests in the middle, and a small number of slow E2E tests at the top. Every layer serves a purpose. Skip none.

```
         ╱ ‾‾‾‾‾‾‾‾‾‾ ╲
        ╱   E2E Tests    ╲           ← 5-10 Playwright workflows
       ╱  (Playwright)     ╲            Slow, expensive, high-confidence
      ╱────────────────────╲
     ╱  Integration Tests    ╲       ← 20-50 tests
    ╱  (pipeline, MCP, IFC)   ╲        Medium speed, cross-boundary
   ╱──────────────────────────╲
  ╱      Unit Tests             ╲    ← 200+ tests
 ╱  (stores, commands, DSL,      ╲     Fast, isolated, exhaustive
╱    utils, hooks, components)    ╲
‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
```

### 1.1 Unit Tests

**Runner:** Vitest  
**Location:** `app/src/**/__tests__/*.test.ts` and co-located `*.test.ts` files  
**Scope:** One function, one store slice, one component, one parser rule

#### What Gets Unit Tested

| Category | Examples | Test Pattern |
|----------|----------|--------------|
| **Stores** | modelStore, historyStore, uiStore, selectionStore, macroStore, tokenStore | Create store → call action → assert state |
| **Command Handlers** | builtinCommands, elementCommands | Call handler with args → assert element created / output correct |
| **DSL** | lexer, parser, executor, errorFormatter, errors | Input string → assert tokens / AST / execution result |
| **Utils** | snap, geometry, coordinates, validation, tableFormatter | Input → output, pure function testing |
| **Hooks** | useSelection, useVirtualization, useTabComplete, useTerminalInput | Render hook → simulate interaction → assert state |
| **Services** | MCPClient, factory, timeout, tokenCounter, logging, errorFormatter | Mock dependencies → call method → assert behavior |
| **MCP Types** | types.test.ts | Schema validation, type guard checks |
| **IFC** | ifcParser, roundTrip | Parse IFC string → assert model, Export model → re-import → assert equality |
| **Components** | StatusBar, Terminal, GeometryLoader | Render → assert DOM / interactions |

#### Unit Test Rules

1. **No network calls.** Mock all MCP/HTTP/WebSocket interactions.
2. **No filesystem.** Mock IndexedDB and persistence.
3. **No timers.** Use `vi.useFakeTimers()` for anything time-dependent.
4. **One assertion per logical concept.** Multiple `expect()` calls are fine if they test one thing.
5. **Descriptive names.** `it('creates a wall with default thickness when --thickness omitted')` not `it('works')`.
6. **Reset state between tests.** Every test starts from a clean store. Use `beforeEach` to reset Zustand stores.

### 1.2 Integration Tests

**Runner:** Vitest  
**Location:** `app/src/services/__tests__/`, `app/src/tests/`  
**Scope:** Multiple units working together across boundaries

#### Integration Test Scenarios

| Scenario | What It Tests |
|----------|---------------|
| **Command → Store → Render** | Type `wall --start 0,0 --end 5,0` → wall appears in modelStore → 2D canvas renders `WallElement` |
| **DSL Fallback Pipeline** | Command not in switch/case → falls through to DSL parser → executor creates element |
| **MCP Client → Server** | MCPClient sends `detect_clashes` → server returns results → client formats output |
| **IFC Round Trip** | Create model → export IFC → re-import → assert model equality |
| **Command Dispatcher** | `commandDispatcher.test.ts` — routes commands through the full dispatch chain |
| **Self-Healing** | Circuit breaker trips → recovery → reconnection (see `tests/self-healing-patterns/`) |
| **History Integration** | Create element → undo → assert removed → redo → assert restored |

#### Integration Test Rules

1. **Real stores, mocked externals.** Use actual Zustand stores but mock MCP servers.
2. **Test the seams.** Focus on the boundaries: command→store, store→renderer, client→server.
3. **Assert intermediate state.** Don't just check the final result — check the pipeline stages.

### 1.3 E2E Tests (Playwright)

**Runner:** Playwright  
**Location:** `app/e2e/`  
**Scope:** Full browser, real app, real user workflows

#### Current E2E Specs

| Spec | What It Tests |
|------|---------------|
| `workflows/floorPlan.spec.ts` | Create walls, floors, complete floor plan |
| `workflows/selection.spec.ts` | Click-select, multi-select, deselect |
| `workflows/terminal.spec.ts` | Type commands, see output, command history |
| `workflows/undoRedo.spec.ts` | Ctrl+Z / Ctrl+Y full workflow |
| `responsive/mobile.spec.ts` | Mobile viewport layout, touch interactions |

#### E2E Test Rules

1. **Each test is independent.** No test depends on another test's state.
2. **Use data-testid for selectors.** Never select by CSS class or DOM structure.
3. **Wait for state, not time.** Use `waitForSelector` / `waitForFunction`, never `page.waitForTimeout`.
4. **Screenshot on failure.** Playwright auto-captures; ensure CI stores artifacts.
5. **Test the golden path first.** Happy path E2E > edge case E2E.

### 1.4 Snapshot Tests (3D Render Regression)

**Status:** Not yet implemented — **P1 priority**

#### Plan

1. Use Playwright to render the 3D Canvas (`Canvas3D.tsx`) with a known model
2. Capture a screenshot
3. Compare pixel-by-pixel against a stored baseline (tolerance: 0.1% diff)
4. Tests: empty scene, single wall, full house, roof types (gable/hip/flat)

#### Why This Matters

Three.js renders are fragile. A single matrix change can flip an entire scene. Snapshot tests catch what unit tests cannot: visual regressions in 3D geometry.

---

## 2. Quality Gates for Every Feature

Every feature area has specific acceptance criteria, regression tests, performance benchmarks, and edge cases. This is the contract.

### 2.1 Walls

| Gate | Criteria |
|------|----------|
| **Acceptance** | `wall --start x,y --end x,y` creates wall in store, renders in 2D and 3D, appears in `list wall` |
| **Regression** | Existing walls unchanged. Door/window hosts survive. History undo works. DSL `wall (x,y) (x,y)` still works. |
| **Performance** | 100 walls render at ≥30 FPS in 3D. Wall creation <50ms. |
| **Edge Cases** | Zero-length wall (start==end) → reject. Duplicate wall at same coords → allow but warn. Wall with negative thickness → reject. Max wall length (>1000m) → warn. |

### 2.2 Doors & Windows

| Gate | Criteria |
|------|----------|
| **Acceptance** | `door --wall <id> --offset <m>` places door, updates wall's `hosts[]`, renders in 2D/3D with cutout |
| **Regression** | Moving/deleting host wall cascades to door. Other doors on same wall unaffected. |
| **Performance** | 50 doors render at ≥30 FPS. Door placement <50ms. |
| **Edge Cases** | Offset beyond wall length → reject. Door wider than wall → reject. Two doors overlapping → reject. Door on deleted wall → error with helpful message. Invalid wall ID → error listing valid IDs. |

### 2.3 Floors & Roofs

| Gate | Criteria |
|------|----------|
| **Acceptance** | `floor --min x,y --max x,y` creates floor. Renders in 2D AND 3D. `roof --type gable` creates roof with correct geometry. |
| **Regression** | Existing elements unaffected. Floor doesn't interfere with wall selection. |
| **Performance** | Floor/roof with 100 vertices renders at ≥30 FPS. Creation <100ms. |
| **Edge Cases** | Zero-area floor (min==max) → reject. Non-convex polygon floor → handle correctly. Roof with 0° slope → becomes flat type. Roof with >89° slope → reject. |

### 2.4 Rooms

| Gate | Criteria |
|------|----------|
| **Acceptance** | `room --min x,y --max x,y --name "X" --type Y` creates room. `detect-rooms` finds rooms from wall topology. |
| **Regression** | Room detection doesn't modify walls. Room types map to correct default finishes. |
| **Performance** | `detect-rooms` on 50-wall model <2s. Room rendering <10ms. |
| **Edge Cases** | Unclosed wall topology → detect-rooms reports gaps. Overlapping rooms → warn. Room with no walls → allow (space planning). |

### 2.5 DSL Parser

| Gate | Criteria |
|------|----------|
| **Acceptance** | All token types lex correctly. All grammar rules parse correctly. Executor creates correct elements. Error messages are human-readable. |
| **Regression** | Every existing DSL example in tests still parses. No new ambiguities introduced. |
| **Performance** | Parse 100 commands <100ms total. |
| **Edge Cases** | Malformed input → clear error with line/column. Unterminated strings → specific error. Unknown commands → suggest similar. Deeply nested expressions → no stack overflow. |

### 2.6 MCP Client/Server

| Gate | Criteria |
|------|----------|
| **Acceptance** | Client connects, calls tools, receives results. Self-healing reconnects after failure. Circuit breaker trips after N failures. |
| **Regression** | Existing tool calls still work. Mock client matches real client interface. |
| **Performance** | Tool call round-trip <500ms (local). Connection establishment <1s. |
| **Edge Cases** | Server unreachable → graceful fallback with message. Server returns malformed JSON → handle without crash. Timeout → configurable, with clear error. Concurrent calls → no race conditions. |

### 2.7 Terminal

| Gate | Criteria |
|------|----------|
| **Acceptance** | Commands execute, output displays, history navigable with ↑/↓, tab completion works |
| **Regression** | All existing commands still work. Output formatting unchanged. |
| **Performance** | Command execution feedback <100ms. Terminal scroll smooth at 1000+ lines. |
| **Edge Cases** | Empty command → no-op. Very long command (>1000 chars) → handle. Rapid command spam → queue, don't drop. Special characters in arguments → escape correctly. |

### 2.8 3D Viewport

| Gate | Criteria |
|------|----------|
| **Acceptance** | Scene renders all element types. Camera orbits/pans/zooms. Elements selectable. ViewCube works. |
| **Regression** | Adding new element types doesn't break existing rendering. Camera state persists. |
| **Performance** | 500-element model at ≥30 FPS. Initial render <2s. |
| **Edge Cases** | Empty scene → shows grid only. Camera at extreme zoom → clamp. Very large model (>10000 elements) → progressive loading. WebGL context loss → recover gracefully. |

### 2.9 Stores (Zustand)

| Gate | Criteria |
|------|----------|
| **Acceptance** | All CRUD operations work. Selectors return correct data. Subscriptions fire on relevant changes only. |
| **Regression** | Store shape changes are backwards-compatible with persisted data. |
| **Performance** | Store operations <1ms. No unnecessary re-renders from selector changes. |
| **Edge Cases** | Concurrent mutations → deterministic. Large state (10000 elements) → selectors stay fast. Corrupted persisted state → fallback to defaults. |

---

## 3. The Golden Path Test

This is the most important test in the entire codebase. It validates the complete "Build a Simple House" workflow from `CONSTRUCTION_BIBLE.md`. If this test passes, the product works.

### 3.1 Test Scenario

```typescript
// golden-path.spec.ts — THE test that must never fail

describe('Golden Path: Build a Simple House', () => {

  // Phase 3: Envelope — Create exterior walls
  test('Step 1: Create 4 exterior walls via rect command', async () => {
    await terminal.execute('rect (0,0) (10,8) --height 3.0 --thickness 0.2');
    
    const elements = modelStore.getState().elements;
    const walls = elements.filter(e => e.type === 'wall');
    
    expect(walls).toHaveLength(4);
    
    // Verify wall geometry covers the perimeter
    const coords = walls.map(w => ({
      start: { x: w.x, y: w.y },
      end: { x: w.properties.endX, y: w.properties.endY }
    }));
    
    // All walls should have height 3.0 and thickness 0.2
    walls.forEach(w => {
      expect(w.properties.height).toBe(3.0);
      expect(w.properties.thickness).toBe(0.2);
    });
  });

  // Phase 4: Interior partition
  test('Step 2: Add interior wall', async () => {
    await terminal.execute('wall --start 5,0 --end 5,8 --height 3.0 --thickness 0.1');
    
    const walls = modelStore.getState().elements.filter(e => e.type === 'wall');
    expect(walls).toHaveLength(5); // 4 exterior + 1 interior
    
    const interior = walls.find(w => w.properties.thickness === 0.1);
    expect(interior).toBeDefined();
    expect(interior.x).toBe(5);
    expect(interior.y).toBe(0);
  });

  // Phase 4: Openings
  test('Step 3: Place front door', async () => {
    const walls = modelStore.getState().elements.filter(e => e.type === 'wall');
    const southWall = walls.find(w => /* south wall detection logic */);
    
    await terminal.execute(`door --wall ${southWall.id} --offset 2.5 --type single`);
    
    const doors = modelStore.getState().elements.filter(e => e.type === 'door');
    expect(doors).toHaveLength(1);
    expect(doors[0].properties.wallId).toBe(southWall.id);
    
    // Verify wall hosts relationship updated
    const updatedWall = modelStore.getState().elements.find(e => e.id === southWall.id);
    expect(updatedWall.relationships?.hosts).toContain(doors[0].id);
  });

  test('Step 4: Place windows', async () => {
    const walls = modelStore.getState().elements.filter(e => e.type === 'wall');
    // Place window on each exterior wall
    const exteriorWalls = walls.filter(w => w.properties.thickness === 0.2);
    
    for (const wall of exteriorWalls) {
      await terminal.execute(`window --wall ${wall.id} --offset 3.0 --sill 0.9`);
    }
    
    const windows = modelStore.getState().elements.filter(e => e.type === 'window');
    expect(windows.length).toBeGreaterThanOrEqual(4);
  });

  // Phase 2: Structure
  test('Step 5: Create floor slab', async () => {
    await terminal.execute('floor --min 0,0 --max 10,8 --thickness 0.15');
    
    const floors = modelStore.getState().elements.filter(e => e.type === 'floor');
    expect(floors).toHaveLength(1);
    expect(floors[0].properties.thickness).toBe(0.15);
  });

  // Phase 3: Roof
  test('Step 6: Create gable roof', async () => {
    await terminal.execute('roof --type gable --min 0,0 --max 10,8 --slope 30');
    
    const roofs = modelStore.getState().elements.filter(e => e.type === 'roof');
    expect(roofs).toHaveLength(1);
    expect(roofs[0].properties.roofType).toBe('gable');
    expect(roofs[0].properties.slope).toBe(30);
  });

  // Phase 7: Rooms
  test('Step 7: Define rooms', async () => {
    await terminal.execute('room --min 0,0 --max 5,8 --name "Living Room" --type living');
    await terminal.execute('room --min 5,0 --max 10,8 --name "Bedroom" --type bedroom');
    
    const rooms = modelStore.getState().elements.filter(e => e.type === 'room');
    expect(rooms).toHaveLength(2);
    expect(rooms.find(r => r.properties.name === 'Living Room')).toBeDefined();
    expect(rooms.find(r => r.properties.name === 'Bedroom')).toBeDefined();
  });

  // Phase 8: Validation
  test('Step 8: Analyze and check model', async () => {
    await terminal.execute('status');
    
    const elements = modelStore.getState().elements;
    // Final element count: 5 walls + 1 door + 4+ windows + 1 floor + 1 roof + 2 rooms
    expect(elements.length).toBeGreaterThanOrEqual(14);
    
    // No elements should have critical issues
    const criticalIssues = elements.flatMap(e => e.issues || [])
      .filter(i => i.severity === 'error');
    expect(criticalIssues).toHaveLength(0);
  });

  // Verify the complete model
  test('Final: Model integrity check', () => {
    const state = modelStore.getState();
    const elements = state.elements;
    
    // Type counts
    expect(elements.filter(e => e.type === 'wall').length).toBe(5);
    expect(elements.filter(e => e.type === 'door').length).toBe(1);
    expect(elements.filter(e => e.type === 'window').length).toBeGreaterThanOrEqual(4);
    expect(elements.filter(e => e.type === 'floor').length).toBe(1);
    expect(elements.filter(e => e.type === 'roof').length).toBe(1);
    expect(elements.filter(e => e.type === 'room').length).toBe(2);
    
    // All elements have valid IDs
    elements.forEach(e => {
      expect(e.id).toBeTruthy();
      expect(e.type).toBeTruthy();
    });
    
    // Door is hosted by a wall
    const door = elements.find(e => e.type === 'door');
    expect(door.properties.wallId).toBeTruthy();
    
    // Host wall exists
    const hostWall = elements.find(e => e.id === door.properties.wallId);
    expect(hostWall).toBeDefined();
    expect(hostWall.type).toBe('wall');
  });
});
```

### 3.2 Expected Model State After Each Step

| Step | Elements | Walls | Doors | Windows | Floors | Roofs | Rooms |
|------|----------|-------|-------|---------|--------|-------|-------|
| 1. rect | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| 2. interior wall | 5 | 5 | 0 | 0 | 0 | 0 | 0 |
| 3. front door | 6 | 5 | 1 | 0 | 0 | 0 | 0 |
| 4. windows | 10+ | 5 | 1 | 4+ | 0 | 0 | 0 |
| 5. floor slab | 11+ | 5 | 1 | 4+ | 1 | 0 | 0 |
| 6. roof | 12+ | 5 | 1 | 4+ | 1 | 1 | 0 |
| 7. rooms | 14+ | 5 | 1 | 4+ | 1 | 1 | 2 |

### 3.3 Geometry Assertions

```typescript
// Every wall in the rect should form a closed perimeter
function assertClosedPerimeter(walls: WallElement[]) {
  const endpoints = walls.flatMap(w => [
    `${w.x},${w.y}`,
    `${w.properties.endX},${w.properties.endY}`
  ]);
  // Each corner point should appear exactly twice (two walls meet)
  const counts = {};
  endpoints.forEach(p => counts[p] = (counts[p] || 0) + 1);
  Object.values(counts).forEach(count => expect(count).toBe(2));
}

// Floor covers the building footprint
function assertFloorCoversFootprint(floor: FloorElement, walls: WallElement[]) {
  const wallBounds = getWallsBoundingBox(walls);
  expect(floor.properties.minX).toBeLessThanOrEqual(wallBounds.minX);
  expect(floor.properties.maxX).toBeGreaterThanOrEqual(wallBounds.maxX);
}
```

---

## 4. Fail-Proofing Checklist

Every PR must pass ALL of the following before merge. No exceptions. Copy this into your PR template.

### 4.1 The Checklist

```markdown
## PR Checklist — REQUIRED

### Compilation & Types
- [ ] `npx tsc --noEmit` passes clean (zero errors)
- [ ] No `// @ts-ignore` or `// @ts-expect-error` added (remove or fix)
- [ ] All imports use `import type` for type-only imports (verbatimModuleSyntax)
- [ ] No `any` types added without justification comment

### Tests
- [ ] All existing unit tests pass (`npm test`)
- [ ] New code has unit tests (functions, handlers, store actions)
- [ ] Golden Path test still passes
- [ ] No test files deleted without replacement

### Zustand
- [ ] No inline selectors in render: `useStore(s => ({ a: s.a, b: s.b }))` ← BANNED
- [ ] Selectors use `useShallow` or are atomic: `useStore(s => s.singleValue)`
- [ ] No `subscribe()` calls inside render
- [ ] Store resets work in tests (no leaked state)

### Browser Safety
- [ ] No Node-only imports in browser code (path, fs, stream, opossum, etc.)
- [ ] Dynamic imports used for Node-only modules if needed at all
- [ ] No `window.` or `document.` without guards in SSR-capable code

### Docker
- [ ] `docker compose build` succeeds
- [ ] `docker compose up` starts without errors
- [ ] Server healthcheck passes (`/health` endpoint)
- [ ] Container logs show no crash loops

### Terminal
- [ ] New commands produce visible output (success message or error)
- [ ] Commands registered in help system
- [ ] Tab completion updated for new commands
- [ ] `help <new-command>` works

### 3D Viewport
- [ ] 3D canvas renders without WebGL errors
- [ ] New element types render in both 2D and 3D (NOT just one)
- [ ] No console errors (`console.error`, Three.js warnings)
- [ ] FPS stays above 30 for demo model

### General
- [ ] No `console.log` left in production code (use proper logging)
- [ ] No hardcoded secrets, tokens, or API keys
- [ ] README/docs updated if behavior changed
- [ ] No `node_modules` or build artifacts committed
```

### 4.2 Automated Enforcement

These checks MUST be automated in CI. Human checklists fail. Machines don't:

| Check | Automation |
|-------|-----------|
| TypeScript compilation | `npx tsc --noEmit` in CI |
| Unit tests | `npm test -- --run` in CI |
| Import type violations | `tsc` with `verbatimModuleSyntax: true` catches these |
| Console.log detection | ESLint rule `no-console` (warn → error in CI) |
| Zustand anti-patterns | Custom ESLint rule (see §5.1) |
| Docker build | `docker compose build` in CI |
| E2E tests | Playwright in CI with Xvfb |

---

## 5. Known Anti-Patterns

These are bugs we've actually hit. Every one cost us hours. Learn from our pain.

### 5.1 Zustand Selector Infinite Loops

**The Bug:**
```typescript
// ❌ CAUSES INFINITE RE-RENDER
const { elements, selectedIds } = useModelStore(state => ({
  elements: state.elements,
  selectedIds: state.selectedIds
}));
```

**Why:** The selector returns a new object reference every render. Zustand uses `Object.is()` for equality. New object ≠ old object → re-render → new object → re-render → ∞

**The Fix:**
```typescript
// ✅ Option A: Separate selectors (preferred)
const elements = useModelStore(state => state.elements);
const selectedIds = useModelStore(state => state.selectedIds);

// ✅ Option B: useShallow (when you need multiple values)
import { useShallow } from 'zustand/react/shallow';
const { elements, selectedIds } = useModelStore(
  useShallow(state => ({ elements: state.elements, selectedIds: state.selectedIds }))
);
```

**Detection:** If your React DevTools show a component rendering >10 times per second with no user interaction, you have this bug.

**Prevention:** ESLint rule — ban object-returning selectors without `useShallow`.

---

### 5.2 Stale Closure in xterm.js onData

**The Bug:**
```typescript
// ❌ CAPTURES STALE STATE
useEffect(() => {
  terminal.onData((data) => {
    // `commandHistory` is stale — captured at mount time
    const lastCmd = commandHistory[commandHistory.length - 1];
    processInput(data, lastCmd);
  });
}, []); // Empty deps = closure never updates
```

**Why:** `onData` captures `commandHistory` from the initial render. As the user types commands, `commandHistory` grows, but the closure still sees the original empty array.

**The Fix:**
```typescript
// ✅ Use a ref to escape the closure
const historyRef = useRef(commandHistory);
historyRef.current = commandHistory; // Update ref every render

useEffect(() => {
  const disposable = terminal.onData((data) => {
    const lastCmd = historyRef.current[historyRef.current.length - 1];
    processInput(data, lastCmd);
  });
  return () => disposable.dispose();
}, [terminal]);
```

**Detection:** Terminal commands work once but break after navigating history or state updates.

**Prevention:** Any callback registered with xterm.js MUST use refs for mutable state, not direct state variables.

---

### 5.3 opossum Node-Only Imports in Browser

**The Bug:**
```typescript
// ❌ CRASHES BROWSER — opossum imports 'events', 'stream', etc.
import CircuitBreaker from 'opossum';
```

**Why:** `opossum` is a circuit breaker library designed for Node.js. It imports Node built-ins (`events`, `stream`, `perf_hooks`) that don't exist in the browser. Vite/webpack tries to polyfill or errors.

**The Fix:**
```typescript
// ✅ Option A: Dynamic import behind environment check
let CircuitBreaker: any;
if (typeof window === 'undefined') {
  CircuitBreaker = (await import('opossum')).default;
}

// ✅ Option B: Use a browser-compatible alternative
// Our SelfHealingMCPClient implements its own circuit breaker pattern
// without opossum — see services/mcp/SelfHealingMCPClient.ts
```

**Detection:** Vite build fails with "Module 'events' not found" or similar Node polyfill errors.

**Prevention:** 
- Rule: **Never import a Node-only package at the top level of browser code.**
- Add to Vite config: `resolve.alias` to stub Node modules or error explicitly.
- Check package.json `engines` field before adding dependencies.

---

### 5.4 verbatimModuleSyntax Violations

**The Bug:**
```typescript
// ❌ FAILS with verbatimModuleSyntax
import { BIMElement, createWall } from './types';
// BIMElement is a type-only import — must use `import type`
```

**Why:** TypeScript's `verbatimModuleSyntax` (our tsconfig has this enabled) requires that type-only imports use the `import type` syntax. This ensures the bundler can safely tree-shake type imports without needing to understand TypeScript.

**The Fix:**
```typescript
// ✅ Separate type imports
import type { BIMElement } from './types';
import { createWall } from './types';

// ✅ Or inline type annotation
import { type BIMElement, createWall } from './types';
```

**Detection:** `npx tsc --noEmit` will flag these immediately.

**Prevention:** 
- Configure your editor to auto-add `type` qualifier.
- Run `tsc --noEmit` in pre-commit hook.
- Never suppress with `@ts-ignore`.

---

### 5.5 Docker Windows NAT Issues

**The Bug:** Docker containers start but can't communicate with each other or the host. `localhost` inside a container doesn't resolve to the Windows host.

**Why:** Docker on Windows uses a NAT network by default. `localhost` inside a container means the container itself, not the Windows host. Port mapping (`-p 3000:3000`) works host→container but internal container→host routing requires `host.docker.internal`.

**The Fix:**
```yaml
# docker-compose.yml
services:
  app:
    environment:
      - API_URL=http://host.docker.internal:3001  # NOT localhost
    extra_hosts:
      - "host.docker.internal:host-gateway"

  server:
    ports:
      - "3001:3001"  # Host port:Container port
```

**Detection:** App loads in browser but MCP calls fail with connection refused. Server logs show no incoming requests.

**Prevention:**
- Always use `host.docker.internal` for container→host communication.
- Test Docker Compose locally before pushing.
- Include healthchecks in docker-compose.yml.

---

### 5.6 selectedIds Type Confusion (string[] vs Set)

**The Bug:**
```typescript
// ❌ SOMETIMES WORKS, SOMETIMES DOESN'T
if (selectedIds.includes(element.id)) { ... }     // Works if string[]
if (selectedIds.has(element.id)) { ... }           // Works if Set<string>

// But which is it? Depends on which store version you're looking at.
```

**Why:** During development, `selectedIds` was changed from `string[]` to `Set<string>` for performance (O(1) lookup vs O(n)). Some code was updated, some wasn't. The TypeScript types said one thing, the runtime said another.

**The Fix:**
```typescript
// ✅ Canonical type: string[] (current implementation in selectionStore)
// Always use: selectedIds.includes(id)
// Never use: selectedIds.has(id)

// If we migrate to Set<string>, update ALL references in one PR.
```

**Detection:** Runtime error "selectedIds.has is not a function" or "selectedIds.includes is not a function".

**Prevention:**
- The type is defined ONCE in `types/store.ts`. All stores reference it.
- Search entire codebase when changing a core type: `grep -r "selectedIds" --include="*.ts" --include="*.tsx"`
- Add a unit test that explicitly checks the type: `expect(Array.isArray(selectedIds)).toBe(true)`

---

### 5.7 DSL Parser ≠ Terminal Parser Confusion

**The Bug:** A command works in DSL syntax (`wall (0,0) (5,0)`) but not in flag syntax (`wall --start 0,0 --end 5,0`), or vice versa.

**Why:** Two completely separate parsing paths exist:
1. Terminal `switch/case` with `parseArgs()` — flag-based
2. DSL parser with positional syntax — falls through only if switch/case doesn't match

Since `wall` IS a case in the switch, the DSL path only activates if `parseArgs` fails.

**The Fix:** Always implement BOTH paths for every command. Or better: converge to one parser.

**Prevention:** Every command test must test BOTH syntaxes:
```typescript
test('wall via flags', () => terminal.execute('wall --start 0,0 --end 5,0'));
test('wall via DSL', () => terminal.execute('wall (0,0) (5,0)'));
// Both must produce identical elements
```

---

### 5.8 Three.js Memory Leaks

**The Bug:** FPS degrades over time. Browser tab memory grows continuously. Eventually crashes.

**Why:** Three.js geometries, materials, and textures are GPU resources. Creating new ones without disposing the old ones leaks VRAM.

**The Fix:**
```typescript
// ✅ Always dispose in cleanup
useEffect(() => {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshStandardMaterial({ color });
  
  return () => {
    geometry.dispose();
    material.dispose();
  };
}, [w, h, d, color]);
```

**Prevention:** Every `new THREE.*Geometry()` or `new THREE.*Material()` MUST have a corresponding `.dispose()` in a cleanup function.

---

## 6. Test Coverage Map

Current state of test coverage across the entire codebase. Updated 2025-07-13.

### 6.1 Legend

- ✅ **Covered** — Test file exists and covers primary functionality
- ⚠️ **Partial** — Test file exists but coverage is incomplete
- ❌ **Missing** — No test file exists
- **P0** — Must have tests before next release
- **P1** — Should have tests within 2 sprints
- **P2** — Nice to have, lower risk

### 6.2 Stores

| Module | Test File | Status | Priority | Tests Needed |
|--------|-----------|--------|----------|--------------|
| `stores/modelStore.ts` | `stores/__tests__/modelStore.test.ts` | ✅ Covered | — | — |
| `stores/historyStore.ts` | `stores/__tests__/historyStore.test.ts` | ✅ Covered | — | — |
| `stores/selectionStore.ts` | `stores/__tests__/selectionStore.test.ts` | ✅ Covered | — | — |
| `stores/uiStore.ts` | `stores/__tests__/uiStore.test.ts` | ✅ Covered | — | — |
| `stores/macroStore.ts` | `stores/__tests__/macroStore.test.ts` | ✅ Covered | — | — |
| `stores/tokenStore.ts` | `stores/__tests__/tokenStore.test.ts` | ✅ Covered | — | — |
| `stores/selfHealing.ts` | — | ❌ Missing | P1 | Circuit breaker state, recovery triggers |

### 6.3 Commands

| Module | Test File | Status | Priority | Tests Needed |
|--------|-----------|--------|----------|--------------|
| `commands/handlers/builtinCommands.ts` | `commands/__tests__/builtinCommands.test.ts` | ✅ Covered | — | — |
| `commands/handlers/elementCommands.ts` | `commands/__tests__/elementCommands.test.ts` | ✅ Covered | — | — |
| `commands/index.ts` | — | ❌ Missing | P1 | Command registration, dispatch routing |

### 6.4 DSL

| Module | Test File | Status | Priority | Tests Needed |
|--------|-----------|--------|----------|--------------|
| `lib/dsl/lexer.ts` | `lib/dsl/lexer.test.ts` | ✅ Covered | — | — |
| `lib/dsl/parser.ts` | `lib/dsl/parser.test.ts` | ✅ Covered | — | — |
| `lib/dsl/executor.ts` | `lib/dsl/executor.test.ts` | ✅ Covered | — | — |
| `lib/dsl/errors.ts` | `lib/dsl/errors.test.ts` | ✅ Covered | — | — |
| `lib/dsl/errorFormatter.ts` | `lib/dsl/errorFormatter.test.ts` | ✅ Covered | — | — |
| `lib/dsl/ast.ts` | — | ❌ Missing | P2 | AST node creation helpers |
| `lib/dsl/grammar.ts` | — | ❌ Missing | P2 | Grammar rule validation |
| `lib/dsl/tokens.ts` | — | ❌ Missing | P2 | Token type definitions |

### 6.5 Services

| Module | Test File | Status | Priority | Tests Needed |
|--------|-----------|--------|----------|--------------|
| `services/commandDispatcher.ts` | `services/__tests__/commandDispatcher.test.ts` | ✅ Covered | — | — |
| `services/ifcParser.ts` | `services/ifcParser.test.ts` | ✅ Covered | — | — |
| `services/ifc/` | `services/ifc/tests/roundTrip.test.ts` | ✅ Covered | — | — |
| `services/__tests__/ifcRoundTrip.test.ts` | `services/__tests__/ifcRoundTrip.test.ts` | ✅ Covered | — | — |
| `services/mcp/MCPClient.ts` | `services/mcp/MCPClient.test.ts` | ✅ Covered | — | — |
| `services/mcp/MockMCPClient.ts` | `services/mcp/MockMCPClient.test.ts` | ✅ Covered | — | — |
| `services/mcp/factory.ts` | `services/mcp/factory.test.ts` | ✅ Covered | — | — |
| `services/mcp/timeout.ts` | `services/mcp/timeout.test.ts` | ✅ Covered | — | — |
| `services/mcp/tokenCounter.ts` | `services/mcp/tokenCounter.test.ts` | ✅ Covered | — | — |
| `services/mcp/logging.ts` | `services/mcp/logging.test.ts` | ✅ Covered | — | — |
| `services/mcp/errorFormatter.ts` | `services/mcp/errorFormatter.test.ts` | ✅ Covered | — | — |
| `services/mcp/types.ts` | `services/mcp/types.test.ts` | ✅ Covered | — | — |
| `services/mcp/HttpMCPClient.ts` | — | ❌ Missing | **P0** | HTTP transport, error handling, retry |
| `services/mcp/WebSocketMCPClient.ts` | — | ❌ Missing | **P0** | WS connect/disconnect, message framing, reconnect |
| `services/mcp/SelfHealingMCPClient.ts` | — | ❌ Missing | **P0** | Circuit breaker, auto-recovery, fallback |
| `services/mcp/resultFormatter.ts` | — | ❌ Missing | P1 | Result formatting for terminal output |
| `services/mcpClient.ts` | — | ❌ Missing | P1 | Legacy client wrapper |
| `services/mcpLogger.ts` | — | ❌ Missing | P2 | Log formatting |
| `services/modelIO.ts` | — | ❌ Missing | P1 | Save/load model, export formats |
| `services/demo.ts` | — | ❌ Missing | P2 | Demo data generation |

### 6.6 Components

| Module | Test File | Status | Priority | Tests Needed |
|--------|-----------|--------|----------|--------------|
| `components/layout/StatusBar.tsx` | `components/layout/StatusBar.test.tsx` | ✅ Covered | — | — |
| `components/layout/Terminal.tsx` | `components/layout/Terminal.test.ts` | ✅ Covered | — | — |
| `components/Terminal/useTabComplete.ts` | `components/Terminal/useTabComplete.test.ts` | ✅ Covered | — | — |
| `components/Terminal/useTerminalInput.ts` | `components/Terminal/useTerminalInput.test.ts` | ✅ Covered | — | — |
| `components/canvas/GeometryLoader.tsx` | `components/canvas/__tests__/GeometryLoader.test.ts` | ✅ Covered | — | — |
| `components/canvas/Canvas2D.tsx` | — | ❌ Missing | **P0** | Element rendering, selection, pan/zoom |
| `components/canvas/Canvas3D.tsx` | — | ❌ Missing | **P0** | 3D scene, element rendering, camera |
| `components/canvas/elements/*.tsx` | — | ❌ Missing | P1 | Each element type renders correctly |
| `components/layout/Header.tsx` | — | ❌ Missing | P2 | Toolbar buttons, state |
| `components/layout/Toolbar.tsx` | — | ❌ Missing | P2 | Tool selection |
| `components/layout/PropertiesPanel.tsx` | — | ❌ Missing | P1 | Property display, editing |
| `components/layout/LevelPanel.tsx` | — | ❌ Missing | P1 | Level CRUD UI |
| `components/layout/LayerPanel.tsx` | — | ❌ Missing | P2 | Layer visibility |
| `components/layout/HistoryPanel.tsx` | — | ❌ Missing | P2 | History display |
| `components/layout/CommandPalette.tsx` | — | ❌ Missing | P1 | Fuzzy search, command execution |
| `components/layout/ContextMenu.tsx` | — | ❌ Missing | P2 | Right-click actions |
| `App.tsx` | — | ❌ Missing | P1 | Layout rendering, store initialization |

### 6.7 Hooks

| Module | Test File | Status | Priority | Tests Needed |
|--------|-----------|--------|----------|--------------|
| `hooks/useSelection.ts` | `hooks/__tests__/useSelection.test.ts` | ✅ Covered | — | — |
| `hooks/useVirtualization.ts` | `hooks/__tests__/useVirtualization.test.ts` | ✅ Covered | — | — |
| `hooks/useKeyboardShortcuts.ts` | — | ❌ Missing | P1 | Shortcut registration, conflict detection |
| `hooks/useCoordinateTransform.ts` | — | ❌ Missing | P1 | Screen↔world coordinate mapping |
| `hooks/useModelWithHistory.ts` | — | ❌ Missing | P1 | History-wrapped model operations |
| `hooks/useActionBatch.ts` | — | ❌ Missing | P2 | Batched store updates |
| `hooks/useAsyncOperation.ts` | — | ❌ Missing | P2 | Loading/error state |
| `hooks/useMediaQuery.ts` | — | ❌ Missing | P2 | Responsive breakpoints |
| `hooks/useModal.ts` | — | ❌ Missing | P2 | Modal state |
| `hooks/usePersistence.ts` | — | ❌ Missing | P1 | IndexedDB save/load |
| `hooks/useRecentCommands.ts` | — | ❌ Missing | P2 | Command history |
| `hooks/useTouchGestures.ts` | — | ❌ Missing | P2 | Touch pan/zoom/rotate |

### 6.8 Utils

| Module | Test File | Status | Priority | Tests Needed |
|--------|-----------|--------|----------|--------------|
| `utils/snap.ts` | `utils/__tests__/snap.test.ts`, `snap.perpendicular.test.ts` | ✅ Covered | — | — |
| `utils/geometry.ts` | — | ❌ Missing | **P0** | Distance, intersection, area calculations |
| `utils/coordinates.ts` | — | ❌ Missing | P1 | Coordinate transforms |
| `utils/validation.ts` | — | ❌ Missing | P1 | Element validation rules |
| `utils/errorRecovery.ts` | — | ❌ Missing | P1 | Error recovery strategies |
| `utils/retry.ts` | — | ❌ Missing | P1 | Retry with backoff |
| `utils/tableFormatter.ts` | — | ❌ Missing | P2 | Table output formatting |
| `utils/accessibility.ts` | — | ❌ Missing | P2 | A11y helpers |
| `utils/canvas/*.ts` | — | ❌ Missing | P1 | Boundary detection, wall detection |
| `utils/geometry/*.ts` | — | ❌ Missing | **P0** | Parsers, roof builder, wall utils |

### 6.9 Types

| Module | Test File | Status | Priority | Tests Needed |
|--------|-----------|--------|----------|--------------|
| `types/elements.ts` | — | ❌ Missing | P1 | Type guard tests, factory functions |
| `types/validation.ts` | — | ❌ Missing | P1 | Validation schema tests |

### 6.10 E2E

| Spec | Status | Priority | Tests Needed |
|------|--------|----------|--------------|
| `e2e/workflows/floorPlan.spec.ts` | ✅ Exists | — | — |
| `e2e/workflows/selection.spec.ts` | ✅ Exists | — | — |
| `e2e/workflows/terminal.spec.ts` | ✅ Exists | — | — |
| `e2e/workflows/undoRedo.spec.ts` | ✅ Exists | — | — |
| `e2e/responsive/mobile.spec.ts` | ✅ Exists | — | — |
| `e2e/workflows/goldenPath.spec.ts` | ❌ Missing | **P0** | Full house build workflow |
| `e2e/workflows/ifcExport.spec.ts` | ❌ Missing | P1 | Export and verify IFC |
| `e2e/workflows/mcpCommands.spec.ts` | ❌ Missing | P1 | MCP tool usage via terminal |
| `e2e/visual/3dSnapshot.spec.ts` | ❌ Missing | P1 | 3D render regression |

### 6.11 Self-Healing Tests

| Module | Status | Priority | Notes |
|--------|--------|----------|-------|
| `tests/self-healing-patterns/auto-recovery-test.ts` | ✅ Exists | — | Manual test runner |
| `tests/self-healing-patterns/circuit-breaker-test.ts` | ✅ Exists | — | Manual test runner |
| `tests/self-healing-patterns/retry-backoff-test.ts` | ✅ Exists | — | Manual test runner |
| `tests/self-healing-patterns/simple-test.js` | ✅ Exists | — | Smoke test |
| Integration into Vitest suite | ❌ Missing | P1 | Need to convert to Vitest format |

### 6.12 Coverage Summary

| Category | Files | Covered | Missing | Coverage |
|----------|-------|---------|---------|----------|
| Stores | 7 | 6 | 1 | 86% |
| Commands | 3 | 2 | 1 | 67% |
| DSL | 8 | 5 | 3 | 63% |
| Services | 17 | 11 | 6 | 65% |
| Components | ~25 | 5 | ~20 | 20% |
| Hooks | 12 | 2 | 10 | 17% |
| Utils | ~10 | 1 | ~9 | 10% |
| E2E | 9 | 5 | 4 | 56% |
| **Total** | **~91** | **~37** | **~54** | **~41%** |

### 6.13 P0 Test Gaps (Must Fix Immediately)

1. **`services/mcp/HttpMCPClient.ts`** — Primary production MCP transport. Zero tests.
2. **`services/mcp/WebSocketMCPClient.ts`** — WebSocket transport. Zero tests.
3. **`services/mcp/SelfHealingMCPClient.ts`** — Wraps both clients with circuit breaker. Zero tests.
4. **`components/canvas/Canvas2D.tsx`** — Main 2D rendering surface. Zero tests.
5. **`components/canvas/Canvas3D.tsx`** — Main 3D rendering surface. Zero tests.
6. **`utils/geometry.ts`** and **`utils/geometry/*.ts`** — Core math. Zero tests.
7. **`e2e/workflows/goldenPath.spec.ts`** — The golden path. Doesn't exist yet.

---

## 7. CI/CD Pipeline

### 7.1 Pipeline Stages

```
┌─────────┐   ┌────────────┐   ┌───────────┐   ┌─────────┐   ┌──────────────────┐   ┌─────────┐   ┌────────┐
│  Lint   │──▶│ Type Check │──▶│ Unit Test │──▶│  Build  │──▶│ Integration Test │──▶│   E2E   │──▶│ Deploy │
└─────────┘   └────────────┘   └───────────┘   └─────────┘   └──────────────────┘   └─────────┘   └────────┘
    1min          1min             2min           3min              3min               5min          2min
                                                                                              Total: ~17min
```

### 7.2 Stage Details

#### Stage 1: Lint (~1 min)

```yaml
lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 24 }
    - run: npm ci
      working-directory: app
    - run: npx eslint . --max-warnings 0
      working-directory: app
```

**What it catches:** Formatting issues, unused imports, console.log, React hook violations, Zustand anti-patterns.  
**Blocks merge:** Yes. Zero warnings policy.

#### Stage 2: Type Check (~1 min)

```yaml
typecheck:
  runs-on: ubuntu-latest
  needs: lint
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
      working-directory: app
    - run: npx tsc --noEmit
      working-directory: app
    - run: npx tsc --noEmit
      working-directory: server
```

**What it catches:** Type errors, `import type` violations, missing exports, incompatible types.  
**Blocks merge:** Yes. Zero errors.

#### Stage 3: Unit Tests (~2 min)

```yaml
unit-test:
  runs-on: ubuntu-latest
  needs: typecheck
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
      working-directory: app
    - run: npx vitest run --coverage
      working-directory: app
    - uses: actions/upload-artifact@v4
      with:
        name: coverage-report
        path: app/coverage/
```

**What it catches:** Logic errors, regressions, store behavior, parser bugs.  
**Blocks merge:** Yes. All tests must pass. Coverage must not decrease.

#### Stage 4: Build (~3 min)

```yaml
build:
  runs-on: ubuntu-latest
  needs: unit-test
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci && npm run build
      working-directory: app
    - run: npm ci && npm run build
      working-directory: server
    - run: docker compose build
```

**What it catches:** Import resolution failures, bundler errors, Docker build issues, missing environment variables.  
**Blocks merge:** Yes. If it doesn't build, it doesn't ship.

#### Stage 5: Integration Tests (~3 min)

```yaml
integration-test:
  runs-on: ubuntu-latest
  needs: build
  services:
    pensaer-server:
      image: pensaer-bim-server:${{ github.sha }}
      ports: ['3001:3001']
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
      working-directory: app
    - run: npx vitest run --config vitest.integration.config.ts
      working-directory: app
      env:
        MCP_SERVER_URL: http://localhost:3001
```

**What it catches:** MCP client↔server protocol issues, IFC round-trip failures, command→store pipeline breaks.  
**Blocks merge:** Yes.

#### Stage 6: E2E Tests (~5 min)

```yaml
e2e-test:
  runs-on: ubuntu-latest
  needs: build
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npx playwright install --with-deps chromium
    - run: docker compose up -d
    - run: npx playwright test
      working-directory: app
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: app/playwright-report/
```

**What it catches:** Full workflow regressions, UI rendering issues, terminal interaction bugs, responsive layout breaks.  
**Blocks merge:** Yes. Golden path must pass.

#### Stage 7: Deploy (~2 min)

```yaml
deploy:
  runs-on: ubuntu-latest
  needs: [integration-test, e2e-test]
  if: github.ref == 'refs/heads/main'
  steps:
    - run: echo "Deploy to staging/production"
    # Docker push, k8s apply, or similar
```

**Triggers:** Only on merge to `main`. All previous stages must pass.

### 7.3 What Blocks Merge

| Check | Required | Can Override |
|-------|----------|-------------|
| Lint (0 warnings) | ✅ Yes | No |
| Type check (0 errors) | ✅ Yes | No |
| Unit tests (all pass) | ✅ Yes | No |
| Build (success) | ✅ Yes | No |
| Integration tests (all pass) | ✅ Yes | No |
| E2E tests (all pass) | ✅ Yes | No |
| Code review (1 approval) | ✅ Yes | CTO override only |
| Coverage decrease | ⚠️ Warning | Yes, with justification |

### 7.4 Pre-Commit Hooks (Local)

Don't wait for CI. Catch issues before you push:

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
npx tsc --noEmit --incremental
```

```bash
# .husky/pre-push
npm test -- --run
```

### 7.5 Branch Strategy

```
main ──────────────────────────────────────── (protected, deploy-ready)
  │
  ├── feature/add-column-command ──── PR ──── (must pass all gates)
  ├── fix/zustand-selector-loop ──── PR ──── (must pass all gates)
  └── chore/update-deps ──────────── PR ──── (must pass all gates)
```

- **`main`** is always deployable. No direct pushes. PRs only.
- **Feature branches** must be up-to-date with `main` before merge.
- **Squash merge** preferred. Clean history.

---

## Appendix A: Test File Template

Use this when creating a new test file:

```typescript
// src/path/to/__tests__/myModule.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import the module under test
import { myFunction } from '../myModule';

// Import types
import type { MyType } from '../../types';

describe('myModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset stores if needed:
    // useModelStore.getState().reset();
  });

  describe('myFunction', () => {
    it('does the expected thing with valid input', () => {
      const result = myFunction({ valid: 'input' });
      expect(result).toEqual({ expected: 'output' });
    });

    it('throws on invalid input', () => {
      expect(() => myFunction(null)).toThrow('Input required');
    });

    it('handles edge case: empty array', () => {
      const result = myFunction({ items: [] });
      expect(result.items).toHaveLength(0);
    });
  });
});
```

---

## Appendix B: Running Tests

```bash
# All unit tests
cd app && npx vitest run

# Unit tests in watch mode (development)
cd app && npx vitest

# Single test file
cd app && npx vitest run src/stores/__tests__/modelStore.test.ts

# With coverage
cd app && npx vitest run --coverage

# E2E tests
cd app && npx playwright test

# E2E with UI (debug mode)
cd app && npx playwright test --ui

# Type check only
cd app && npx tsc --noEmit

# Lint only
cd app && npx eslint . --max-warnings 0
```

---

## Appendix C: Priority Action Items

Based on the coverage map, these are the immediate next steps:

### This Sprint (P0)

1. Write `goldenPath.spec.ts` E2E test — the single most valuable test we can add
2. Write unit tests for `utils/geometry.ts` and `utils/geometry/*.ts` — core math must be proven
3. Write unit tests for `SelfHealingMCPClient.ts` — production resilience code with no tests
4. Write unit tests for `HttpMCPClient.ts` and `WebSocketMCPClient.ts` — transport layer

### Next Sprint (P1)

5. Write component tests for `Canvas2D.tsx` and `Canvas3D.tsx`
6. Write hook tests for `useKeyboardShortcuts`, `useCoordinateTransform`, `usePersistence`
7. Convert self-healing pattern tests to Vitest format
8. Implement 3D snapshot regression tests

### Backlog (P2)

9. Remaining component tests (Header, Toolbar, panels)
10. Remaining hook tests
11. Remaining util tests
12. DSL grammar/token tests

---

*This is a living document. Update it when you add tests, find new anti-patterns, or change the pipeline. The goal is simple: if you follow this, nothing ships broken.*

— **Max, CTO**
