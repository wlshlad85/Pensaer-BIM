# Pensaer App - AI Navigation Guide

> **Language:** TypeScript
> **Framework:** React 18 + Vite
> **Model Hint:** Use **Sonnet 4** for UI work ("Sonnet's like the best designer")

## Purpose

The app is the React/TypeScript web client providing:

- 2D canvas for floor plan editing
- 3D view via Three.js
- Command palette and terminal
- Properties panel
- Real-time collaboration UI

## Directory Structure

```
app/
├── src/
│   ├── components/
│   │   ├── canvas/       # Canvas2D, Canvas3D, Grid, SelectionBox
│   │   │   └── elements/ # WallElement, DoorElement, RoomElement
│   │   └── layout/       # Header, Toolbar, PropertiesPanel
│   │
│   ├── stores/           # Zustand state management
│   │   ├── modelStore.ts     # BIM model state
│   │   ├── selectionStore.ts # Selection state
│   │   ├── uiStore.ts        # UI state (panels, modes)
│   │   └── historyStore.ts   # Undo/redo
│   │
│   ├── hooks/            # Custom React hooks
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useModelWithHistory.ts
│   │   └── usePersistence.ts
│   │
│   ├── utils/            # Utility functions
│   │   ├── geometry.ts   # Client-side geometry helpers
│   │   ├── snap.ts       # Snapping logic
│   │   └── validation.ts # Input validation
│   │
│   ├── lib/              # External integrations
│   │   └── indexedDB.ts  # Local persistence
│   │
│   └── types/            # TypeScript type definitions
│       └── index.ts
│
├── public/
└── index.html
```

## Key Patterns

### Zustand Stores

```typescript
// stores/modelStore.ts
interface ModelState {
  elements: Map<string, Element>;
  addElement: (element: Element) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  removeElement: (id: string) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  elements: new Map(),
  addElement: (element) =>
    set((state) => ({
      elements: new Map(state.elements).set(element.id, element),
    })),
  // ...
}));
```

### Component Pattern

```typescript
// components/canvas/elements/WallElement.tsx
interface WallElementProps {
  wall: Wall;
  selected: boolean;
  onSelect: (id: string) => void;
}

export const WallElement: React.FC<WallElementProps> = ({
  wall,
  selected,
  onSelect
}) => {
  return (
    <line
      x1={wall.start.x}
      y1={wall.start.y}
      x2={wall.end.x}
      y2={wall.end.y}
      stroke={selected ? '#3b82f6' : '#374151'}
      strokeWidth={wall.thickness * 100}
      onClick={() => onSelect(wall.id)}
    />
  );
};
```

### Hooks Pattern

```typescript
// hooks/useKeyboardShortcuts.ts
export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete") {
        deleteSelectedElements();
      }
      if (e.metaKey && e.key === "z") {
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
};
```

## What You CAN Do

- Add new UI components
- Modify styling (Tailwind classes)
- Add new keyboard shortcuts
- Implement new canvas interactions
- Add new store slices

## What You Should NOT Do

- Don't use class components (functional only)
- Don't add CSS files (use Tailwind)
- Don't add new state management (use Zustand)
- Don't write geometry calculations (use server MCP tools)

## Running Locally

```bash
cd app
npm install
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
```

## Visual-First Development Loop

Following the Base44 pattern:

1. Run `npm run dev` to see app running
2. Notice what's off visually
3. Describe changes in natural language
4. AI generates code
5. Errors surface in browser console
6. Iterate by prompting

## Performance Targets

| Metric            | Target         |
| ----------------- | -------------- |
| Initial load      | < 2s           |
| Element selection | < 16ms         |
| Canvas re-render  | < 16ms (60fps) |
| 3D view toggle    | < 200ms        |
