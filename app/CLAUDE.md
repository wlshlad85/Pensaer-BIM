# Pensaer App - React/TypeScript Guidance

## Overview

React client with Zustand state management and Tailwind CSS.

## Structure

```
app/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Route-level components
│   ├── stores/          # Zustand state stores
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API/MCP client calls
│   └── types/           # TypeScript definitions
└── public/              # Static assets
```

## Component Pattern

```tsx
// Functional components only, no class components
interface WallPanelProps {
  wallId: string;
  onSelect?: (id: string) => void;
}

export function WallPanel({ wallId, onSelect }: WallPanelProps) {
  const wall = useModelStore((s) => s.walls.get(wallId));

  if (!wall) return null;

  return (
    <div className="p-4 border rounded" onClick={() => onSelect?.(wallId)}>
      {wall.name}
    </div>
  );
}
```

## Zustand Store Pattern

```tsx
interface ModelState {
  walls: Map<string, Wall>;
  selectedId: string | null;
  setSelected: (id: string | null) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  walls: new Map(),
  selectedId: null,
  setSelected: (id) => set({ selectedId: id }),
}));
```

## Styling

- Tailwind CSS only (no CSS modules)
- Use `cn()` helper for conditional classes
- Prefer composition over complex selectors

## Testing

```bash
npm test -- --run          # Run once
npm test                   # Watch mode
npm run test:coverage      # With coverage
```

## Don't

- Use class components
- Use inline styles
- Import CSS files directly
- Use Redux (we use Zustand)
