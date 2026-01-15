# 🏛️ Pensaer Architecture Document

**Document Version:** 1.0
**Initiated:** January 13, 2026
**Status:** Founding Document

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PENSAER ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         PRESENTATION LAYER                           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ Command  │ │ Terminal │ │  Canvas  │ │Properties│ │  3D View │  │   │
│  │  │ Palette  │ │  Panel   │ │  (2D)    │ │  Panel   │ │ (Three)  │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          STATE LAYER (Zustand)                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ Elements │ │Selection │ │  Tools   │ │  History │ │   UI     │  │   │
│  │  │  Store   │ │  Store   │ │  Store   │ │  Store   │ │  Store   │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           CORE LAYER                                 │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ Geometry │ │  Model   │ │Constraint│ │Transaction│ │   AI     │  │   │
│  │  │  Engine  │ │  Graph   │ │  Solver  │ │  Manager │ │ Engine   │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       PERSISTENCE LAYER                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │IndexedDB │ │ Supabase │ │   IFC    │ │   JSON   │ │   Yjs    │  │   │
│  │  │ (local)  │ │ (cloud)  │ │ Import/  │ │  Export  │ │  (CRDT)  │  │   │
│  │  │          │ │          │ │  Export  │ │          │ │          │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Data Model

### Element Schema

```typescript
interface Element {
  // Identity
  id: string;                    // Unique identifier (UUID)
  type: ElementType;             // 'wall' | 'door' | 'window' | 'room' | 'roof' | etc.
  name: string;                  // Human-readable name (e.g., "Wall-101")

  // Geometry
  geometry: Geometry;            // Type-specific geometry data
  transform: Transform;          // Position, rotation, scale

  // BIM Data
  properties: PropertySet;       // Type-specific properties
  relationships: Relationships;  // Connections to other elements
  level: string;                 // Level/floor reference

  // Metadata
  issues: Issue[];               // Detected problems
  aiSuggestions: Suggestion[];   // AI-generated recommendations
  history: HistoryEntry[];       // Change log

  // System
  createdAt: Date;
  modifiedAt: Date;
  createdBy: string;
  modifiedBy: string;
}

type ElementType =
  | 'wall'
  | 'door'
  | 'window'
  | 'room'
  | 'roof'
  | 'floor'
  | 'column'
  | 'beam'
  | 'stair'
  | 'railing'
  | 'furniture'
  | 'equipment';
```

### Relationship Schema

```typescript
interface Relationships {
  // Hosting relationships
  hosts?: string[];           // Elements hosted by this element (wall hosts door)
  hostedBy?: string;          // Parent host element

  // Spatial relationships
  joins?: string[];           // Connected elements (wall-to-wall joints)
  bounds?: string[];          // Rooms/spaces bounded by this element
  boundedBy?: string[];       // Bounding elements for spaces

  // Access relationships
  leadsTo?: string[];         // Spaces accessible through this element (door)
  accessVia?: string[];       // Access points for spaces

  // Structural relationships
  supports?: string[];        // Elements supported by this element
  supportedBy?: string[];     // Supporting elements

  // System relationships
  connectedTo?: string[];     // MEP system connections
  partOf?: string;            // Assembly/group membership
}
```

### Issue and Suggestion Schemas

```typescript
interface Issue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'fire' | 'clash' | 'code' | 'geometry' | 'data';
  message: string;
  detectedAt: Date;
  autoFixable: boolean;
  fixAction?: string;
}

interface Suggestion {
  id: string;
  icon: string;
  text: string;
  priority: 'high' | 'medium' | 'low' | 'info';
  action: string;
  params?: Record<string, any>;
  confidence: number;        // 0-1 confidence score
}
```

---

## File Structure

```
pensaer-bim/
├── docs/
│   ├── VISION.md
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   └── PRD.md
│
├── prototype/
│   └── pensaer-prototype.html    # Current working prototype
│
├── src/
│   ├── core/
│   │   ├── geometry/
│   │   │   ├── engine.ts
│   │   │   ├── primitives.ts
│   │   │   ├── operations.ts
│   │   │   └── snap.ts
│   │   ├── model/
│   │   │   ├── element.ts
│   │   │   ├── relationships.ts
│   │   │   ├── graph.ts
│   │   │   └── queries.ts
│   │   ├── constraints/
│   │   │   ├── solver.ts
│   │   │   ├── types.ts
│   │   │   └── propagation.ts
│   │   ├── transactions/
│   │   │   ├── manager.ts
│   │   │   ├── operation.ts
│   │   │   └── history.ts
│   │   └── ai/
│   │       ├── engine.ts
│   │       ├── suggestions.ts
│   │       ├── compliance.ts
│   │       └── nlp.ts
│   │
│   ├── ui/
│   │   ├── components/
│   │   │   ├── CommandPalette/
│   │   │   ├── Terminal/
│   │   │   ├── Canvas/
│   │   │   ├── Canvas3D/
│   │   │   ├── PropertiesPanel/
│   │   │   ├── ContextMenu/
│   │   │   └── common/
│   │   ├── hooks/
│   │   │   ├── useKeyboard.ts
│   │   │   ├── useSelection.ts
│   │   │   ├── useSnap.ts
│   │   │   └── useDrag.ts
│   │   └── layouts/
│   │       └── MainLayout.tsx
│   │
│   ├── stores/
│   │   ├── model.ts
│   │   ├── selection.ts
│   │   ├── ui.ts
│   │   ├── history.ts
│   │   └── index.ts
│   │
│   ├── dsl/
│   │   ├── parser.ts
│   │   ├── lexer.ts
│   │   ├── commands/
│   │   └── completions.ts
│   │
│   ├── persistence/
│   │   ├── indexeddb.ts
│   │   ├── cloud.ts
│   │   ├── ifc/
│   │   └── json.ts
│   │
│   ├── collaboration/
│   │   ├── yjs-provider.ts
│   │   ├── presence.ts
│   │   └── sync.ts
│   │
│   └── plugins/
│       ├── registry.ts
│       ├── api.ts
│       └── loader.ts
│
├── packages/                      # Future: component libraries
│   └── families/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── public/
│   └── assets/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## Technology Decisions

### Decision Record

| Decision | Choice | Rationale | Alternatives Considered |
|----------|--------|-----------|-------------------------|
| Framework | React 18 | Industry standard, rich ecosystem | Vue, Svelte, Solid |
| Language | TypeScript | Type safety critical for BIM data | JavaScript |
| Styling | Tailwind CSS | Rapid iteration, utility-first | CSS Modules, Styled Components |
| State | Zustand + Immer | Simple, performant, immutable | Redux, MobX, Jotai |
| 3D Engine | Three.js | Mature, documented, performant | Babylon.js, PlayCanvas |
| Build | Vite | Fast HMR, ESM-native | Webpack, Parcel |
| Terminal | xterm.js | Full terminal emulator, extensible | Custom implementation |
| Geometry | web-ifc | IFC-native, WASM performance | Open CASCADE, CGAL |
| Persistence | IndexedDB | Offline-first, large datasets | LocalStorage |
| Cloud | Supabase | OSS, real-time, auth included | Firebase, custom |
| Collab | Yjs | CRDT, mature, offline support | Automerge, ShareDB |

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial load | < 2s | First contentful paint |
| Command palette open | < 50ms | Keypress to visible |
| Element selection | < 16ms | Click to highlight |
| 3D view toggle | < 200ms | Click to rendered |
| Model with 10K elements | < 100MB RAM | Browser memory |
| Undo/Redo | < 50ms | Action to state change |
| IFC import (100MB) | < 30s | File select to model |

---

*Document authored: January 13, 2026*
*Pensaer Architecture: v0.1.0-alpha*
