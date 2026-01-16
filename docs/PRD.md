# Pensaer-BIM: Product Requirements Document

**Version:** 1.0
**Date:** January 16, 2026
**Author:** Rich (Founder & CEO)
**Status:** DRAFT

---

## Document Purpose

This PRD defines the **Minimum Viable Product (MVP)** for Pensaer-BIM, a developer-first Building Information Modeling platform. It serves as the single source of truth for what to build, why, and how to verify completion.

---

# PART 1: PRODUCT OVERVIEW

## 1.1 Vision Statement

> **Pensaer** is a developer-first BIM platform where architects who think in code can design buildings through terminal, keyboard shortcuts, and AI agents—with the same precision they expect from modern developer tools.

## 1.2 The Sacred Invariant

> "All outputs must remain consistent projections of a single authoritative model state. Change propagation scales with the size of the change, not the size of the model."

Every view (2D, 3D, schedules) is a derived projection. The Rust kernel is the single source of truth.

## 1.3 Target User

**Primary Persona: The Computational Designer**

- Architects aged 25-40 who write code
- Frustrated by Revit's click-heavy UI and lack of version control
- Uses Dynamo, pyRevit, Grasshopper as workarounds
- Wants keyboard-first, scriptable, git-native BIM

## 1.4 Core Differentiators

| Feature | Revit | Pensaer |
|---------|-------|---------|
| Primary interface | Mouse + ribbon menus | Terminal + command palette |
| Scripting | C# SDK (difficult) | MCP tools + Python/JS |
| Version control | File naming ("v2_final") | Git-native branching |
| Collaboration | Clunky worksharing | Real-time CRDT sync |
| AI integration | None | Native agent runtime |
| Cost | $2,545/year | Open core (free base) |

---

# PART 2: TECHNICAL ARCHITECTURE

## 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│                    React + TypeScript + Vite + Tailwind                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │ 2D Canvas   │  │ 3D View     │  │ Command     │  │ Properties        │  │
│  │ (SVG)       │  │ (Three.js)  │  │ Palette     │  │ Panel             │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ JSON-RPC 2.0 over WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PYTHON BRIDGE LAYER                                │
│                         FastAPI + asyncio WebSocket                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │ WebSocket   │  │ MCP Server  │  │ Validation  │  │ Session           │  │
│  │ Server      │  │ Registry    │  │ Server      │  │ Manager           │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ PyO3 FFI / subprocess
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RUST GEOMETRY KERNEL                                 │
│                      (Single Source of Truth)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │ Element     │  │ Constraint  │  │ Spatial     │  │ Topology          │  │
│  │ Graph       │  │ Solver      │  │ Index       │  │ Repair            │  │
│  │             │  │             │  │ (R*-tree)   │  │                   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │ Boolean Ops │  │ Triangulate │  │ Regen       │  │ Event             │  │
│  │ (Clipper2)  │  │ (earcutr)   │  │ Engine      │  │ Store             │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Technology Stack

### Client (app/)

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 18+ |
| Language | TypeScript | 5.x |
| Build | Vite | 7.x |
| Styling | Tailwind CSS | 3.x |
| State | Zustand + Immer | Latest |
| 3D Engine | Three.js | Latest |
| Transport | WebSocket (JSON-RPC 2.0) | - |

### Server (server/)

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | FastAPI | 0.109+ |
| Language | Python | 3.12+ |
| Async | asyncio + uvicorn | - |
| MCP SDK | Official Python SDK | Latest |
| Validation | Pydantic v2 | 2.5+ |

### Kernel (kernel/)

| Component | Technology | Version |
|-----------|------------|---------|
| Language | Rust | 1.75+ |
| Python FFI | PyO3 | 0.20+ |
| Spatial Index | rstar | Latest |
| Booleans | clipper2 | Latest |
| Triangulation | earcutr | Latest |
| Serialization | serde + serde_json | 1.0 |

## 2.3 Unit System

| Parameter | Value | Notes |
|-----------|-------|-------|
| Base unit | **mm** (millimeters) | All geometry stored in mm |
| Geometry tolerance | **1mm** | Join/intersection detection |
| Snap tolerance | **10mm** | UI snapping (user-facing) |
| Display precision | **0 decimal places** | Whole mm in UI |

---

# PART 3: ELEMENT TYPES

## 3.1 Core Element Types (MVP)

| Type | Category | Geometry | Hosts | Can Host |
|------|----------|----------|-------|----------|
| `wall` | Walls | Line-based | - | door, window |
| `door` | Doors | Point-based | wall | - |
| `window` | Windows | Point-based | wall | - |
| `room` | Rooms | Boundary | - | - |
| `floor` | Floors | Surface | - | - |
| `roof` | Roofs | Surface | - | - |
| `column` | Structure | Point-based | - | - |
| `beam` | Structure | Line-based | - | - |
| `stair` | Circulation | Parametric | - | - |

## 3.2 Element Data Model

```typescript
interface Element {
  id: string;                    // UUID
  type: ElementType;             // wall, door, window, etc.
  name: string;                  // User-visible name

  // Geometry (in mm)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;              // Degrees

  // Relationships
  relationships: {
    hostedBy?: string;           // Parent element ID
    hosts: string[];             // Child element IDs
    joins: string[];             // Connected elements
    bounds?: string;             // Room boundary
  };

  // Properties (type-specific)
  properties: Record<string, PropertyValue>;

  // Validation
  issues: Issue[];
}
```

## 3.3 Standard Properties by Type

### Wall Properties

| Property | Type | Unit | Default | Description |
|----------|------|------|---------|-------------|
| thickness | number | mm | 200 | Wall thickness |
| height | number | mm | 2700 | Unconnected height |
| material | string | - | "Concrete" | Construction material |
| fireRating | string | - | "None" | Fire rating (e.g., "60min") |
| structural | boolean | - | false | Load-bearing |

### Door Properties

| Property | Type | Unit | Default | Description |
|----------|------|------|---------|-------------|
| leafWidth | number | mm | 900 | Single leaf width |
| leafHeight | number | mm | 2100 | Leaf height |
| swingDirection | string | - | "inward" | Swing direction |
| fireRating | string | - | "None" | Fire rating |
| accessible | boolean | - | false | ADA/DDA compliant |

### Window Properties

| Property | Type | Unit | Default | Description |
|----------|------|------|---------|-------------|
| frameWidth | number | mm | 1200 | Frame width |
| frameHeight | number | mm | 1500 | Frame height |
| sillHeight | number | mm | 900 | Height above floor |
| glazingType | string | - | "double" | Glazing type |
| uValue | number | W/m²K | 1.4 | Thermal transmittance |

### Room Properties

| Property | Type | Unit | Default | Description |
|----------|------|------|---------|-------------|
| area | number | m² | computed | Floor area |
| perimeter | number | mm | computed | Boundary perimeter |
| function | string | - | "Office" | Room function |
| department | string | - | "" | Department assignment |
| occupancy | number | - | 0 | Maximum occupants |

---

# PART 4: FUNCTIONAL REQUIREMENTS

## 4.1 Canvas Interactions

### FR-CANVAS-001: Pan and Zoom

| Requirement | Description |
|-------------|-------------|
| Mouse wheel | Zoom in/out centered on cursor |
| Middle drag | Pan canvas |
| Touch pinch | Zoom (mobile) |
| Touch drag | Pan (mobile) |
| Zoom range | 10% to 500% |
| Zoom to fit | ⌘0 / Ctrl+0 |

### FR-CANVAS-002: Selection

| Requirement | Description |
|-------------|-------------|
| Click | Select single element |
| Shift+Click | Add/remove from selection |
| Box select | Drag to select multiple |
| ⌘A | Select all elements |
| Escape | Clear selection |
| Delete | Delete selected elements |

### FR-CANVAS-003: Element Creation

| Requirement | Description |
|-------------|-------------|
| Wall tool (W) | Click-drag to draw wall |
| Door tool (D) | Click on wall to place |
| Window tool (I) | Click on wall to place |
| Room tool (R) | Click to define room boundary |
| Escape | Cancel current tool |

### FR-CANVAS-004: Snapping

| Requirement | Description |
|-------------|-------------|
| Grid snap | Snap to grid intersections (10mm default) |
| Endpoint snap | Snap to element endpoints |
| Midpoint snap | Snap to element midpoints |
| Perpendicular | Snap to perpendicular angles |
| Toggle | S key to toggle snapping |

## 4.2 Command Palette

### FR-PALETTE-001: Core Functionality

| Requirement | Description |
|-------------|-------------|
| Trigger | ⌘K / Ctrl+K |
| Search | Fuzzy search across all commands |
| Categories | Group commands by category |
| Shortcuts | Show keyboard shortcuts |
| Recent | Show recently used commands |

### FR-PALETTE-002: Command Categories

| Category | Example Commands |
|----------|------------------|
| Tools | Select, Wall, Door, Window, Room |
| Edit | Undo, Redo, Cut, Copy, Paste, Delete |
| View | Zoom In, Zoom Out, Fit, 2D/3D Toggle |
| Selection | Select All, Invert, By Type |
| Model | Validate, Export IFC |

## 4.3 Properties Panel

### FR-PROPS-001: Element Editing

| Requirement | Description |
|-------------|-------------|
| Display | Show properties of selected element |
| Multi-select | Show common properties when multiple selected |
| Edit | Inline editing of property values |
| Validation | Show errors for invalid values |
| Units | Display units next to numeric fields |

## 4.4 3D Visualization

### FR-3D-001: View Controls

| Requirement | Description |
|-------------|-------------|
| Orbit | Right-drag to orbit camera |
| Pan | Middle-drag to pan |
| Zoom | Scroll wheel to zoom |
| Home | H key to reset view |
| Section | Toggle section plane |

### FR-3D-002: Rendering

| Requirement | Description |
|-------------|-------------|
| Walls | Extruded from 2D with proper thickness |
| Doors | 3D door geometry with frame |
| Windows | 3D window with glazing |
| Roofs | Pitched roof geometry |
| Floors | Flat slab geometry |
| Materials | Basic material colors |

## 4.5 Undo/Redo

### FR-HISTORY-001: Transaction System

| Requirement | Description |
|-------------|-------------|
| Undo | ⌘Z / Ctrl+Z |
| Redo | ⌘Shift+Z / Ctrl+Y |
| History depth | Unlimited (session) |
| Persistence | Survive browser refresh |
| Batching | Group related changes |

## 4.6 Persistence

### FR-PERSIST-001: Local Storage

| Requirement | Description |
|-------------|-------------|
| Auto-save | Save to IndexedDB every 30 seconds |
| Manual save | ⌘S / Ctrl+S |
| Load on startup | Restore last session |
| Export | Download as JSON |
| Import | Load from JSON file |

---

# PART 5: NON-FUNCTIONAL REQUIREMENTS

## 5.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial load | < 2 seconds | First contentful paint |
| Element selection | < 16ms | Click to highlight |
| Canvas re-render | < 16ms | 60 FPS maintained |
| 3D view toggle | < 200ms | Switch view modes |
| Undo/redo | < 50ms | Operation response |
| 1000 elements | No degradation | Stress test |

## 5.2 Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 100+ |
| Firefox | 100+ |
| Safari | 15+ |
| Edge | 100+ |

## 5.3 Accessibility

| Requirement | Description |
|-------------|-------------|
| Keyboard navigation | All features accessible via keyboard |
| Screen reader | ARIA labels on interactive elements |
| Color contrast | WCAG 2.1 AA compliance |
| Focus indicators | Visible focus states |

---

# PART 6: MCP TOOL SURFACE

## 6.1 Geometry Server Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `create_wall` | Create a wall element | start, end, height, thickness |
| `create_opening` | Create door/window in wall | wall_id, position, type, dimensions |
| `create_room` | Create room from boundary | boundary_points, name, function |
| `move_element` | Move element to new position | element_id, new_position |
| `delete_element` | Delete element | element_id |
| `compute_mesh` | Generate 3D mesh | element_ids |

## 6.2 Spatial Server Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `compute_adjacency` | Find adjacent rooms | room_id |
| `find_nearest` | Find nearest elements | point, radius, types |
| `compute_area` | Calculate room area | room_id |
| `check_clearance` | Verify door clearances | door_id |

## 6.3 Validation Server Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `validate_model` | Run all validation rules | - |
| `check_fire_compliance` | Fire rating validation | element_ids |
| `check_accessibility` | ADA/DDA compliance | element_ids |
| `detect_clashes` | Clash detection | element_ids |

## 6.4 Documentation Server Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `generate_schedule` | Create element schedule | type, properties |
| `export_ifc` | Export to IFC format | element_ids |
| `export_report` | Generate compliance report | report_type |

---

# PART 7: VALIDATION RULES

## 7.1 Fire Safety Rules

| Rule ID | Description | Severity |
|---------|-------------|----------|
| FIRE-001 | Door fire rating must match wall rating | Error |
| FIRE-002 | Maximum travel distance to exit | Warning |
| FIRE-003 | Minimum corridor width | Error |

## 7.2 Accessibility Rules

| Rule ID | Description | Severity |
|---------|-------------|----------|
| ADA-001 | Accessible door minimum width (815mm) | Error |
| ADA-002 | Maximum door threshold height (13mm) | Error |
| ADA-003 | Maneuvering clearance at doors | Warning |

## 7.3 Model Integrity Rules

| Rule ID | Description | Severity |
|---------|-------------|----------|
| MODEL-001 | Doors must be hosted by walls | Error |
| MODEL-002 | Windows must be hosted by walls | Error |
| MODEL-003 | Rooms must have closed boundaries | Warning |
| MODEL-004 | Walls should not overlap | Warning |

---

# PART 8: MVP ACCEPTANCE CRITERIA

## 8.1 Phase 1: Core Engine (Weeks 1-4) ✅ COMPLETE

| # | Criterion | Status |
|---|-----------|--------|
| 1 | 2D canvas renders walls, doors, windows, rooms | ✅ |
| 2 | Click selection works on all element types | ✅ |
| 3 | Box selection selects multiple elements | ✅ |
| 4 | Wall tool creates walls via click-drag | ✅ |
| 5 | Door/window tools place on walls | ✅ |
| 6 | Undo/redo works for all operations | ✅ |
| 7 | Auto-save persists to IndexedDB | ✅ |
| 8 | Model loads on page refresh | ✅ |
| 9 | Properties panel shows element data | ✅ |
| 10 | 3D view displays extruded geometry | ✅ |

## 8.2 Phase 2: Developer Experience (Weeks 5-8)

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Command palette opens with ⌘K | ✅ |
| 2 | Fuzzy search finds commands | ✅ |
| 3 | Commands execute on selection | ✅ |
| 4 | Terminal panel renders (xterm.js) | ⬜ |
| 5 | Basic DSL commands work | ⬜ |
| 6 | Command history with ↑/↓ | ⬜ |
| 7 | Autocomplete suggestions | ⬜ |
| 8 | Keyboard shortcuts documented | ⬜ |
| 9 | Macro recording captures actions | ⬜ |
| 10 | Natural language command hints | ⬜ |

## 8.3 Phase 3: BIM Compliance (Weeks 9-12)

| # | Criterion | Status |
|---|-----------|--------|
| 1 | 3D walls have proper thickness | ⬜ |
| 2 | 3D doors show frames and leaves | ⬜ |
| 3 | 3D windows show glazing | ⬜ |
| 4 | IFC import loads elements | ⬜ |
| 5 | IFC export produces valid file | ⬜ |
| 6 | Multi-level support (Level entity) | ⬜ |
| 7 | Level browser panel works | ⬜ |
| 8 | Fire rating validation runs | ⬜ |
| 9 | Accessibility checks run | ⬜ |
| 10 | Clash detection identifies issues | ⬜ |

## 8.4 Phase 4: Collaboration (Weeks 13-16)

| # | Criterion | Status |
|---|-----------|--------|
| 1 | User authentication works | ⬜ |
| 2 | Projects save to cloud | ⬜ |
| 3 | Real-time sync between clients | ⬜ |
| 4 | Cursor presence shows other users | ⬜ |
| 5 | Conflict resolution works | ⬜ |
| 6 | Comments attach to elements | ⬜ |
| 7 | Change history viewable | ⬜ |
| 8 | Branch creation works | ⬜ |
| 9 | Branch merge succeeds | ⬜ |
| 10 | Performance stable with 10 users | ⬜ |

---

# PART 9: RELEASE CRITERIA

## 9.1 MVP Release (v0.4.0-beta)

**PENSAER MVP IS COMPLETE WHEN:**

- ✅ All 40 criteria in Part 8 are marked complete
- ✅ Zero critical bugs in issue tracker
- ✅ Performance targets in 5.1 are met
- ✅ Browser support in 5.2 is verified
- ✅ Documentation covers installation and basic usage
- ✅ Demo project included

## 9.2 Definition of Done (Per Feature)

Every feature must:

1. **Work** - Functionality matches specification
2. **Test** - Automated tests pass (where applicable)
3. **Document** - User-facing docs updated
4. **Review** - Code reviewed and approved
5. **Deploy** - Merged to main branch

---

# APPENDIX A: Keyboard Shortcuts

| Action | Mac | Windows |
|--------|-----|---------|
| Command palette | ⌘K | Ctrl+K |
| Undo | ⌘Z | Ctrl+Z |
| Redo | ⌘⇧Z | Ctrl+Y |
| Save | ⌘S | Ctrl+S |
| Select all | ⌘A | Ctrl+A |
| Delete | ⌫ | Delete |
| Zoom to fit | ⌘0 | Ctrl+0 |
| Wall tool | W | W |
| Door tool | D | D |
| Window tool | I | I |
| Room tool | R | R |
| Select tool | V | V |
| Pan tool | H | H |
| Toggle snap | S | S |
| Toggle 3D | 3 | 3 |
| Escape | Esc | Esc |

---

# APPENDIX B: File Format

## B.1 Pensaer Project File (.pensaer)

```json
{
  "version": "1.0",
  "metadata": {
    "name": "Project Name",
    "created": "2026-01-16T00:00:00Z",
    "modified": "2026-01-16T00:00:00Z",
    "author": "user@example.com"
  },
  "units": {
    "length": "mm",
    "area": "m2",
    "angle": "degrees"
  },
  "levels": [...],
  "elements": [...],
  "views": [...]
}
```

---

# APPENDIX C: Related Documents

| Document | Purpose |
|----------|---------|
| [ROADMAP.md](./ROADMAP.md) | Development timeline |
| [CANONICAL_ARCHITECTURE.md](./architecture/CANONICAL_ARCHITECTURE.md) | System architecture |
| [TECH_STACK.md](./architecture/TECH_STACK.md) | Technology decisions |
| [GLOSSARY.md](./architecture/GLOSSARY.md) | Terminology reference |
| [TOOL_SURFACE.md](./mcp/TOOL_SURFACE.md) | MCP tool definitions |

---

**END OF DOCUMENT**

*Last updated: January 16, 2026*
