/**
 * Move & Modify Command Tests (P1-006)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerMoveModifyCommands } from "../handlers/moveModifyCommands";
import {
  dispatchCommand,
  dispatchCommandWithContext,
  getCommand,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useSelectionStore } from "../../stores/selectionStore";

// Mock MCP client (not used by move/modify but required by dispatcher)
vi.mock("../../services/mcpClient", () => ({
  mcpClient: {
    callTool: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

const SCALE = 100;

function makeWall(id: string, startX: number, startY: number, endX: number, endY: number) {
  const isHorizontal = Math.abs(endX - startX) >= Math.abs(endY - startY);
  const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
  return {
    id,
    type: "wall" as const,
    name: `Wall ${id}`,
    x: startX * SCALE,
    y: startY * SCALE,
    width: isHorizontal ? length * SCALE : 12,
    height: isHorizontal ? 12 : length * SCALE,
    properties: {
      start_x: startX,
      start_y: startY,
      end_x: endX,
      end_y: endY,
      height: "3000mm",
      thickness: "200mm",
      material: "Concrete",
      structural: false,
      level: "Level 1",
      wall_type: "basic",
    },
    relationships: { hosts: [], joins: [], bounds: [] },
    issues: [],
    aiSuggestions: [],
  };
}

function makeFloor(id: string) {
  return {
    id,
    type: "floor" as const,
    name: `Floor ${id}`,
    x: 0,
    y: 0,
    width: 500,
    height: 500,
    properties: { thickness: "150mm", material: "Concrete", level: "Level 1" },
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };
}

describe("Move & Modify Commands (P1-006)", () => {
  beforeEach(() => {
    useModelStore.setState({ elements: [], levels: [], isLoading: false, error: null });
    useSelectionStore.setState({ selectedIds: [], hoveredId: null, highlightedIds: [] });
    registerMoveModifyCommands();
  });

  // ── Registration ──────────────────────────────

  describe("Registration", () => {
    it("registers move command", () => {
      const cmd = getCommand("move");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("move");
    });

    it("registers modify command", () => {
      const cmd = getCommand("modify");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("modify");
    });
  });

  // ── Move Command ──────────────────────────────

  describe("move", () => {
    it("moves a floor element to new coordinates", async () => {
      useModelStore.setState({ elements: [makeFloor("floor-001")] as any });

      const result = await dispatchCommand("move", {
        _positional: ["floor-001"],
        to: [10, 5],
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("floor-001");

      const el = useModelStore.getState().getElementById("floor-001");
      expect(el?.x).toBe(10 * SCALE);
      expect(el?.y).toBe(5 * SCALE);
    });

    it("moves a wall and recalculates start/end", async () => {
      // Wall from (0,0) → (5,0)
      useModelStore.setState({ elements: [makeWall("w1", 0, 0, 5, 0)] as any });

      const result = await dispatchCommand("move", {
        _positional: ["w1"],
        to: [3, 2],
      });

      expect(result.success).toBe(true);

      const w = useModelStore.getState().getElementById("w1")!;
      // New start should be (3,2), end shifted by same delta → (8,2)
      expect(w.properties.start_x).toBe(3);
      expect(w.properties.start_y).toBe(2);
      expect(w.properties.end_x).toBe(8);
      expect(w.properties.end_y).toBe(2);
    });

    it("uses selected element when no id provided", async () => {
      useModelStore.setState({ elements: [makeFloor("f1")] as any });
      useSelectionStore.setState({ selectedIds: ["f1"] });

      const result = await dispatchCommandWithContext("move", { to: [7, 7] });
      expect(result.success).toBe(true);

      const el = useModelStore.getState().getElementById("f1");
      expect(el?.x).toBe(7 * SCALE);
    });

    it("fails when element not found", async () => {
      const result = await dispatchCommand("move", {
        _positional: ["nope"],
        to: [1, 1],
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("fails when --to is missing", async () => {
      useModelStore.setState({ elements: [makeFloor("f1")] as any });

      const result = await dispatchCommand("move", { _positional: ["f1"] });
      expect(result.success).toBe(false);
      expect(result.message).toContain("--to");
    });

    it("fails when no id and nothing selected", async () => {
      const result = await dispatchCommand("move", { to: [1, 1] });
      expect(result.success).toBe(false);
    });
  });

  // ── Modify Command ────────────────────────────

  describe("modify", () => {
    it("updates material property", async () => {
      useModelStore.setState({ elements: [makeWall("w1", 0, 0, 5, 0)] as any });

      const result = await dispatchCommand("modify", {
        _positional: ["w1"],
        material: "Brick",
      });

      expect(result.success).toBe(true);
      const w = useModelStore.getState().getElementById("w1")!;
      expect(w.properties.material).toBe("Brick");
    });

    it("converts height from meters to mm string", async () => {
      useModelStore.setState({ elements: [makeWall("w1", 0, 0, 5, 0)] as any });

      const result = await dispatchCommand("modify", {
        _positional: ["w1"],
        height: 3.5,
      });

      expect(result.success).toBe(true);
      const w = useModelStore.getState().getElementById("w1")!;
      expect(w.properties.height).toBe("3500mm");
    });

    it("updates multiple properties at once", async () => {
      useModelStore.setState({ elements: [makeWall("w1", 0, 0, 5, 0)] as any });

      const result = await dispatchCommand("modify", {
        _positional: ["w1"],
        height: 4.0,
        material: "Glass",
        structural: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.property_count).toBe(3);

      const w = useModelStore.getState().getElementById("w1")!;
      expect(w.properties.height).toBe("4000mm");
      expect(w.properties.material).toBe("Glass");
      expect(w.properties.structural).toBe(true);
    });

    it("uses selected element when no id provided", async () => {
      useModelStore.setState({ elements: [makeWall("w1", 0, 0, 5, 0)] as any });
      useSelectionStore.setState({ selectedIds: ["w1"] });

      const result = await dispatchCommandWithContext("modify", { material: "Wood" });
      expect(result.success).toBe(true);
    });

    it("fails when element not found", async () => {
      const result = await dispatchCommand("modify", {
        _positional: ["nope"],
        material: "Brick",
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("fails when no properties given", async () => {
      useModelStore.setState({ elements: [makeFloor("f1")] as any });

      const result = await dispatchCommand("modify", { _positional: ["f1"] });
      expect(result.success).toBe(false);
      expect(result.message).toContain("No properties");
    });
  });
});
