/**
 * P1-007: Door/Window Overlap Validation Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerElementCommands,
  checkHostedElementOverlap,
} from "../handlers/elementCommands";
import { dispatchCommand } from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useSelectionStore } from "../../stores/selectionStore";
import type { Element } from "../../types";

vi.mock("../../services/mcpClient", () => ({
  mcpClient: {
    callTool: vi.fn().mockImplementation(({ tool, arguments: args }) => {
      switch (tool) {
        case "create_wall":
          return Promise.resolve({ success: true, data: { wall_id: `wall-t`, length: 5.0, height: 3.0, thickness: 0.2 } });
        case "place_door":
          return Promise.resolve({ success: true, data: { door_id: `door-${Math.random().toString(36).slice(2,6)}`, wall_id: args.wall_id, position: args.position, width: args.width } });
        case "place_window":
          return Promise.resolve({ success: true, data: { window_id: `window-${Math.random().toString(36).slice(2,6)}`, wall_id: args.wall_id, position: args.position, width: args.width } });
        default:
          return Promise.resolve({ success: false, error: { code: -32601, message: `Unknown tool: ${tool}` } });
      }
    }),
  },
}));

function createWall(id: string, length: number = 5.0): Element {
  const wall: Element = {
    id, type: "wall", name: `Wall ${id}`, x: 0, y: 0, width: length * 100, height: 12,
    properties: { start_x: 0, start_y: 0, end_x: length, end_y: 0, height: "3000mm", thickness: "200mm", level: "Level 1" },
    relationships: { hosts: [] as string[], joins: [], bounds: [] },
    issues: [], aiSuggestions: [],
  };
  useModelStore.getState().addElement(wall);
  return wall;
}

function createHosted(id: string, type: "door" | "window", wallId: string, offset: number, widthMm: number): void {
  const el: Element = {
    id, type, name: `${type} ${id}`, x: 0, y: 0, width: 20, height: 20,
    properties: { offset, width: `${widthMm}mm`, height: type === "door" ? "2100mm" : "1000mm", level: "Level 1" },
    relationships: { hostedBy: wallId }, issues: [], aiSuggestions: [],
  };
  useModelStore.getState().addElement(el);
  const wall = useModelStore.getState().getElementById(wallId)!;
  const hosts = (wall.relationships.hosts as string[]) || [];
  useModelStore.getState().updateElement(wallId, { relationships: { ...wall.relationships, hosts: [...hosts, id] } });
}

describe("P1-007 Overlap Validation", () => {
  beforeEach(() => {
    useModelStore.setState({ elements: [], isLoading: false, error: null });
    useSelectionStore.setState({ selectedIds: [], hoveredId: null, highlightedIds: [] });
    registerElementCommands();
  });

  describe("checkHostedElementOverlap", () => {
    it("returns no overlap when wall has no hosted elements", () => {
      const wall = createWall("w1", 5);
      expect(checkHostedElementOverlap(wall, 2.5, 0.9).overlaps).toBe(false);
    });

    it("detects exact same offset overlap", () => {
      createWall("w1", 5);
      createHosted("d1", "door", "w1", 2.5, 900);
      const wall = useModelStore.getState().getElementById("w1")!;
      const r = checkHostedElementOverlap(wall, 2.5, 0.9);
      expect(r.overlaps).toBe(true);
      expect(r.conflictId).toBe("d1");
    });

    it("detects partial overlap", () => {
      createWall("w1", 5);
      createHosted("d1", "door", "w1", 2.0, 900);
      const wall = useModelStore.getState().getElementById("w1")!;
      expect(checkHostedElementOverlap(wall, 2.5, 0.9).overlaps).toBe(true);
    });

    it("allows non-overlapping placement", () => {
      createWall("w1", 5);
      createHosted("d1", "door", "w1", 1.0, 900);
      const wall = useModelStore.getState().getElementById("w1")!;
      expect(checkHostedElementOverlap(wall, 3.0, 0.9).overlaps).toBe(false);
    });

    it("detects door-window cross-type overlap", () => {
      createWall("w1", 5);
      createHosted("win1", "window", "w1", 2.0, 1200);
      const wall = useModelStore.getState().getElementById("w1")!;
      expect(checkHostedElementOverlap(wall, 2.5, 0.9).overlaps).toBe(true);
    });

    it("allows adjacent but non-overlapping elements", () => {
      createWall("w1", 5);
      createHosted("d1", "door", "w1", 1.0, 900);
      const wall = useModelStore.getState().getElementById("w1")!;
      expect(checkHostedElementOverlap(wall, 1.9, 0.9).overlaps).toBe(false);
    });
  });

  describe("Door handler rejects overlap", () => {
    it("rejects overlapping door", async () => {
      createWall("w1", 5);
      createHosted("d1", "door", "w1", 2.5, 900);
      const r = await dispatchCommand("door", { wall: "w1", offset: 2.5, width: 0.9 });
      expect(r.success).toBe(false);
      expect(r.message).toContain("Overlaps");
      expect(r.data?.conflict_element).toBe("d1");
    });

    it("allows non-overlapping door", async () => {
      createWall("w1", 5);
      createHosted("d1", "door", "w1", 1.0, 900);
      const r = await dispatchCommand("door", { wall: "w1", offset: 3.5, width: 0.9 });
      expect(r.success).toBe(true);
    });
  });

  describe("Window handler rejects overlap", () => {
    it("rejects overlapping window", async () => {
      createWall("w1", 5);
      createHosted("win1", "window", "w1", 2.5, 1200);
      const r = await dispatchCommand("window", { wall: "w1", offset: 2.5, width: 1.2 });
      expect(r.success).toBe(false);
      expect(r.message).toContain("Overlaps");
    });

    it("rejects window overlapping existing door", async () => {
      createWall("w1", 5);
      createHosted("d1", "door", "w1", 2.0, 900);
      const r = await dispatchCommand("window", { wall: "w1", offset: 2.3, width: 1.2 });
      expect(r.success).toBe(false);
      expect(r.message).toContain("Overlaps");
    });

    it("allows non-overlapping window", async () => {
      createWall("w1", 5);
      createHosted("d1", "door", "w1", 1.0, 900);
      const r = await dispatchCommand("window", { wall: "w1", offset: 3.5, width: 1.2 });
      expect(r.success).toBe(true);
    });
  });
});
