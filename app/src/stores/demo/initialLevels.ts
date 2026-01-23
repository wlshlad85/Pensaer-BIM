/**
 * Demo Initial Levels
 *
 * Sample building levels for demonstrating Pensaer features.
 */

import type { Level } from "../../types";

/**
 * Create initial demo levels for a multi-story building
 */
export function createInitialLevels(): Level[] {
  return [
    {
      id: "level-1",
      name: "Level 1",
      elevation: 0,
      height: 3000, // 3m floor-to-floor
    },
    {
      id: "level-2",
      name: "Level 2",
      elevation: 3000,
      height: 3000,
    },
    {
      id: "level-roof",
      name: "Roof Level",
      elevation: 6000,
      height: 0,
    },
  ];
}
