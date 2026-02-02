/**
 * Level Resolver — P1-009 Level Enforcement
 *
 * Validates that a level name exists in the model's levelStore before
 * element creation.  Falls back to the active level when none is specified.
 * Rejects creation when the resolved level doesn't exist.
 */

import { useModelStore } from "../stores/modelStore";
import { useUIStore } from "../stores/uiStore";
import type { Level } from "../types";

export interface LevelResolution {
  ok: boolean;
  level?: Level;
  levelName?: string;
  error?: string;
}

/**
 * Resolve and validate a level for element creation.
 *
 * 1. If `specifiedLevel` is provided, look it up by name (case-insensitive).
 * 2. If not provided, use the UI store's active level.
 * 3. If the resolved name doesn't match any level in the store → error.
 */
export function resolveLevel(specifiedLevel?: string): LevelResolution {
  const levels = useModelStore.getState().levels;
  const activeLevel = useUIStore.getState().activeLevel;

  const targetName = specifiedLevel || activeLevel;

  if (!targetName) {
    return {
      ok: false,
      error: "No level specified and no active level set.",
    };
  }

  const found = levels.find(
    (l) => l.name.toLowerCase() === targetName.toLowerCase(),
  );

  if (!found) {
    const available = levels.map((l) => l.name).join(", ");
    return {
      ok: false,
      error: `Level "${targetName}" does not exist. Available levels: ${available || "(none)"}`,
    };
  }

  return { ok: true, level: found, levelName: found.name };
}
