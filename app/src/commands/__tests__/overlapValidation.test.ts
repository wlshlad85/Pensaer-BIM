/**
 * P1-007: Door/Window Overlap Validation Tests
 *
 * Ensures that placing a door or window that overlaps an existing
 * hosted element on the same wall is rejected.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerElementCommands,
  checkHostedElementOverlap,
} from "../handlers/elementCommands";
import {
  dispatchCommand,
  dispatchCommandWithContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useSelectionStore } from "../../stores/selectionStore";
import type { Element } from "../../types";

// Mock MCP client — support wall, door, and window creation
vi.mock("../../services/mcpClient", () => ({
  mcpClient: {
    callTool: vi.fn().mockImplementation(({ tool, arguments: args }) => {
      switch (tool) {
        case "create_wall":
          return Promise.resolve({
            success: true,
            data: {
              wall_id: `wall-${Math.random().toString(36).slice(2, 6)}`,
              length: 5.0,
              height: args.height || 3.0,
              thickness: args.thickness || 0.2,
            },
          });
        case "place_door":
          return Promise.resolve({
            success: true,
            data: {
              door_id: `door-${Math.random().toString(36).slice(2, 6)}`,
              wall_id: args.wall_id,
              position: args.position,
              width: args.width,
            },
          });
        case "place_window":
          return Promise.resolve({
            success: true,
            data: {
              window_id: `window-${Math.random().toString(36).slice(2, 6)}`,
              wall_id: args.wall_id,
              position: args.position,
              width: args.width,
            },
          });
        default:
          return Promise.resolve({ success: false, error: { code: -32601, message: `Unknown tool: ${tool}` } });
      }
    }),
  },
}));

// Helper: create a wall element directly in the store
function createWall(id: string, length: number = 5.0): Element {
  const wall: Element = {
    id,
    type: "wall",
    name: `Wall ${id}`,
    x: 0,
    y: 0,
    width: length * 100,
    height: 12,
    properties: {
      start_x: 0,
      start_y: 0,
      end_x: length,
      end_y: 0,
      height: "3000mm",
      thickness: "200mm",
      level: "Level 1",
    },
    relationships: { hosts: [] as string[], joins: [], bounds: [] },
    issues: [],
    aiSuggestions: [],
  };
  useModelStore.getState().addElement(wall);
  return wall;
}

// Helper: create a hosted element (door/window) already in the store
function createHosted(
  id: string,
  type: "door" | "window",
  wallId: string,
  offset: number,
  widthMm: number,
): void {
  const el: Element = {
    id,
    type,
    name: `${type} ${id}`,
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    properties: {
      offset,
      width: `${widthMm}mm`,
      height: type === "door" ? "2100mm" : "1000mm",
      level: "Level 1",
    },
    relationships: { hostedBy: wallId },
    issues: [],
    aiSuggestions: [],
  };
  useModelStore.getState().addElement(el);

  // Update wall hosts list
  const wall = useModelStore.getState().getElementById(wallId)!;
  const hosts = (wall.relationships.hosts as string[]) || [];
  useModelStore.getState().updateElement(wallId, {
    relationships: { ...wall.relationships, hosts: [...hosts, id] },
  });
}

describe("P1-007 Overlap Validation", () => {
  beforeEach(() => {
    useModelStore.setState({ elements: [], isLoading: false, error: null });
    useSelectionStore.setState({ selectedIds: [], hoveredId: null, highlightedIds: [] });
    registerElementCommands();
  });

  // ========== Unit tests for checkHostedElementOverlap ==========

  describe("checkHostedElementOverlap", () => {
    it("returns no overlap when wall has no hosted elements", () => {
      const wall = createWall("w1", 5);
      const result = checkHostedElementOverlap(wall, 2.5, 0.9);
      expect(result.overlaps).toBe(false);
    });

    it("detects exact same offset overlap", () => {
      const wall = createWall("w1", 5);
      createHosted("d1", "door", "w1", 2.5, 900);
      const freshWall = useModelStore.getState().getElementById("w1")!;
      const result = checkHostedElementOverlap(freshWall, 2.5, 0.9);
      expect(result.overlaps).toBe(true);
      expect(result.conflictId).toBe("d1");
    });

    it("detects partial overlap", () => {
      const wall = createWall("w1", 5);
      createHosted("d1", "door", "w1", 2.0, 900); // occupies 1.55–2.45
      const freshWall = useModelStore.getState().getElementById("w1")!;
      // New door at 2.5 occupies 2.05–2.95 → overlaps with d1
      const result = checkHostedElementOverlap(freshWall, 2.5, 0.9);
      expect(result.overlaps).toBe(true);
    });

    it("allows non-overlapping placement", () => {
      const wall = createWall("w1", 5);
      createHosted("d1", "door", "w1", 1.0, 900); // occupies 0.55–1.45
      const freshWall = useModelStore.getState().getElementById("w1")!;
      // New door at 3.0 occupies 2.55–3.45 → no overlap
      const result = checkHostedElementOverlap(freshWall, 3.0, 0.9);
      expect(result.overlaps).toBe(false);
    });

    it("detects door-window cross-type overlap", () => {
      const wall = createWall("w1", 5);
      createHosted("win1", "window", "w1", 2.0, 1200); // occupies 1.4–2.6
      const freshWall = useModelStore.getState().getElementById("w1")!;
      // Door at 2.5 occupies 2.05–2.95 → overlaps with window
      const result = checkHostedElementOverlap(freshWall, 2.5, 0.9);
      expect(result.overlaps).toBe(true);
      expect(result.conflictId).toBe("win1");
    });

    it("allows adjacent but non-overlapping elements", () => {
      const wall = createWall("w1", 5);
      // Door at 1.0 occupies 0.55–1.45; door at 1.9 occupies 1.45–2.35
      // They just touch but don't overlap (within tolerance)
      createHosted("d1", "door", "w1", 1.0, 900);
      const freshWall = useModelStore.getState().getElementById("w1")!;
      const result = checkHostedElementOverlap(freshWall, 1.9, 0.9);
      expect(result.overlaps).toBe(false);
    });
  });

  // ========== Integration: door handler rejects overlap ==========

  describe("Door placement overlap rejection", () => {
    it("rejects placing a door that overlaps an existing door", async () => {
      createWall("w1", 5);
      createHosted("d1", "door", "w1", 2.5, 900);

      const result = await dispatchCommand("door", {
        wall: "w1",
        offset: 2.5,
        width: 0.9,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Overlaps");
      expect(result.data?.conflict_element).toBe("d1");
    });

    it("allows placing a door with no overlap", async () => {
      createWall("w1", 5);
      createHosted("d1", "door", "w1", 1.0, 900);

      const result = await dispatchCommand("door", {
        wall: "w1",
        offset: 3.5,
        width: 0.9,
      });

      expect(result.success).toBe(true);
    });
  });

  // ========== Integration: window handler rejects overlap ==========

  describe("Window placement overlap rejection", () => {
    it("rejects placing a window that overlaps an existing window", async () => {
      createWall("w1", 5);
      createHosted("win1", "window", "w1", 2.5, 1200);

      const result = await dispatchCommand("window", {
        wall: "w1",
        offset: 2.5,
        width: 1.2,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Overlaps");
    });

    it("rejects placing a window that overlaps an existing door", async () => {
      createWall("w1", 5);
      createHosted("d1", "door", "w1", 2.0, 900);

      const result = await dispatchCommand("window", {
        wall: "w1",
        offset: 2.3,
        width: 1.2,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Overlaps");
    });

    it("allows placing a window with no overlap", async () => {
      createWall("w1", 5);
      createHosted("d1", "door", "w1", 1.0, 900);

      const result = await dispatchCommand("window", {
        wall: "w1",
        offset: 3.5,
        width: 1.2,
      });

      expect(result.success).toBe(true);
    });
  });
});
