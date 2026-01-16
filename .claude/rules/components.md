---
paths:
  - "app/src/components/**/*.tsx"
  - "app/src/pages/**/*.tsx"
---

# React Component Rules

When working on React components:

1. **Props Interface**: Define explicit interface above component
2. **Null Checks**: Handle missing/loading data gracefully
3. **Accessibility**: Include aria labels for interactive elements
4. **Memoization**: Use `useMemo`/`useCallback` for expensive operations
5. **Error Boundaries**: Wrap complex components in error boundaries

## Naming Conventions
- Components: `PascalCase` (e.g., `WallPanel`)
- Hooks: `useCamelCase` (e.g., `useModelStore`)
- Event handlers: `handleAction` (e.g., `handleClick`)
- Booleans: `is`/`has` prefix (e.g., `isLoading`)

## File Structure
```tsx
// 1. Imports
import { useState } from 'react';
import { useModelStore } from '@/stores/model';

// 2. Types
interface Props { ... }

// 3. Component
export function ComponentName({ prop1, prop2 }: Props) {
  // hooks first
  // then handlers
  // then render
}
```
