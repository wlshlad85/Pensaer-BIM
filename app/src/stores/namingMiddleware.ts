/**
 * ISO 19650 Naming Middleware
 *
 * Subscribes to modelStore changes and auto-generates ISO names
 * for newly added elements.
 */

import { useModelStore } from "./modelStore";
import { useNamingStore } from "./namingStore";
import type { Element } from "../types";

let previousElementIds = new Set<string>();

/**
 * Initialize the naming middleware.
 * Call once during app startup (after stores are created).
 */
export function initializeNamingMiddleware(): void {
  // Seed with current elements
  const initialElements = useModelStore.getState().elements;
  previousElementIds = new Set(initialElements.map((el) => el.id));

  // Generate names for existing elements
  const naming = useNamingStore.getState();
  for (const el of initialElements) {
    if (!naming.getName(el.id)) {
      const level = el.level || (el.properties.level as string) || "Level 1";
      naming.generateName(el.id, el.type, level);
    }
  }

  // Subscribe to element changes
  useModelStore.subscribe((state) => {
    const currentIds = new Set(state.elements.map((el) => el.id));

    // Detect new elements
    for (const el of state.elements) {
      if (!previousElementIds.has(el.id)) {
        const naming = useNamingStore.getState();
        if (!naming.getName(el.id)) {
          const level = el.level || (el.properties.level as string) || "Level 1";
          naming.generateName(el.id, el.type, level);
        }
      }
    }

    // Detect deleted elements
    for (const id of previousElementIds) {
      if (!currentIds.has(id)) {
        useNamingStore.getState().removeName(id);
      }
    }

    previousElementIds = currentIds;
  });
}
