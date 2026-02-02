/**
 * Tests for P1-009: Level enforcement via resolveLevel()
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resolveLevel } from "../levelResolver";
import { useModelStore } from "../../stores/modelStore";
import { useUIStore } from "../../stores/uiStore";

describe("resolveLevel", () => {
  beforeEach(() => {
    useModelStore.getState().setLevels([
      { id: "level-1", name: "Level 1", elevation: 0, height: 3000 },
      { id: "level-2", name: "Level 2", elevation: 3000, height: 3000 },
      { id: "level-roof", name: "Roof Level", elevation: 6000, height: 0 },
    ]);
    useUIStore.getState().setActiveLevel("Level 1");
  });

  it("resolves an explicitly specified level that exists", () => {
    const res = resolveLevel("Level 2");
    expect(res.ok).toBe(true);
    expect(res.levelName).toBe("Level 2");
    expect(res.level?.id).toBe("level-2");
  });

  it("is case-insensitive", () => {
    const res = resolveLevel("level 2");
    expect(res.ok).toBe(true);
    expect(res.levelName).toBe("Level 2");
  });

  it("falls back to the active level when none specified", () => {
    useUIStore.getState().setActiveLevel("Level 2");
    const res = resolveLevel(undefined);
    expect(res.ok).toBe(true);
    expect(res.levelName).toBe("Level 2");
  });

  it("rejects a level name that does not exist", () => {
    const res = resolveLevel("Level 99");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Level 99");
    expect(res.error).toContain("does not exist");
    expect(res.error).toContain("Level 1");
  });

  it("rejects when active level is also invalid", () => {
    useUIStore.getState().setActiveLevel("Nonexistent");
    const res = resolveLevel(undefined);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Nonexistent");
  });

  it("returns the level object with correct elevation", () => {
    const res = resolveLevel("Roof Level");
    expect(res.ok).toBe(true);
    expect(res.level?.elevation).toBe(6000);
  });

  it("rejects when store has no levels at all", () => {
    useModelStore.getState().setLevels([]);
    const res = resolveLevel("Level 1");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("does not exist");
  });
});
