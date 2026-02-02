/**
 * Rect/Box Command Handler Tests
 *
 * P1-002: Tests for the rect command that creates 4 walls forming a rectangle.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerElementCommands } from "../handlers/elementCommands";
import {
  dispatchCommand,
  getCommand,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useSelectionStore } from "../../stores/selectionStore";

// Mock the MCP client
vi.mock("../../services/mcpClient", () => ({
  mcpClient: {
    callTool: vi.fn().mockImplementation(({ tool, arguments: args }) => {
      if (tool === "create_wall") {
        return Promise.resolve({
          success: true,
          data: {
            wall_id: `wall-${Math.random().toString(36).slice(2, 10)}`,
            length: 5.0,
            height: args.height || 3.0,
            thickness: args.thickness || 0.2,
          },
          event_id: "evt-rect",
        });
      }
      return Promise.resolve({
        success: false,
        error: { code: -32601, message: `Unknown tool: ${tool}` },
      });
    }),
  },
}));

describe("Rect/Box Command Handler", () => {
  beforeEach(() => {
    useModelStore.setState({ elements: [], isLoading: false, error: null });
    useSelectionStore.setState({
      selectedIds: [],
      hoveredId: null,
      highlightedIds: [],
    });
    registerElementCommands();
  });

  describe("Command Registration", () => {
    it("registers rect command", () => {
      const cmd = getCommand("rect");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("rect");
      expect(cmd?.description).toContain("rectangle");
    });

    it("registers box command as alias", () => {
      const cmd = getCommand("box");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("box");
    });
  });

  describe("createRectHandler", () => {
    it("creates 4 walls with --min/--max", async () => {
      const result = await dispatchCommand("rect", {
        min: [0, 0],
        max: [10, 8],
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("4 walls");
      expect(result.data?.count).toBe(4);
      expect(result.data?.wall_ids).toHaveLength(4);
      expect(result.data?.width).toBe(10);
      expect(result.data?.height).toBe(8);

      // Should have created 4 wall elements in the store
      const elements = useModelStore.getState().elements;
      expect(elements).toHaveLength(4);
      expect(elements.every((e) => e.type === "wall")).toBe(true);
    });

    it("creates 4 walls with positional syntax", async () => {
      const result = await dispatchCommand("rect", {
        _positional: [[0, 0], [5, 5]],
      });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(4);
      expect(result.data?.width).toBe(5);
      expect(result.data?.height).toBe(5);
    });

    it("normalises min/max when reversed", async () => {
      const result = await dispatchCommand("rect", {
        min: [10, 8],
        max: [0, 0],
      });

      expect(result.success).toBe(true);
      expect(result.data?.min).toEqual([0, 0]);
      expect(result.data?.max).toEqual([10, 8]);
    });

    it("fails when min equals max on one axis (zero-area)", async () => {
      const result = await dispatchCommand("rect", {
        min: [0, 0],
        max: [10, 0],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("non-zero");
    });

    it("fails when parameters are missing", async () => {
      const result = await dispatchCommand("rect", {});

      expect(result.success).toBe(false);
      expect(result.message).toContain("Missing");
    });

    it("passes custom height and thickness", async () => {
      const result = await dispatchCommand("rect", {
        min: [0, 0],
        max: [6, 4],
        height: 4.0,
        thickness: 0.3,
      });

      expect(result.success).toBe(true);

      // Verify wall properties stored in model
      const walls = useModelStore.getState().elements;
      expect(walls[0].properties.height).toBe("4000mm");
      expect(walls[0].properties.thickness).toBe("300mm");
    });

    it("passes custom material and level", async () => {
      const result = await dispatchCommand("rect", {
        min: [0, 0],
        max: [5, 5],
        material: "Brick",
        level: "Level 2",
      });

      expect(result.success).toBe(true);
      const walls = useModelStore.getState().elements;
      expect(walls[0].properties.material).toBe("Brick");
      expect(walls[0].properties.level).toBe("Level 2");
    });

    it("box command works identically to rect", async () => {
      const result = await dispatchCommand("box", {
        min: [0, 0],
        max: [8, 6],
      });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(4);
      expect(result.data?.width).toBe(8);
      expect(result.data?.height).toBe(6);
    });

    it("reports elementCreated with last wall id", async () => {
      const result = await dispatchCommand("rect", {
        min: [0, 0],
        max: [4, 3],
      });

      expect(result.success).toBe(true);
      expect(result.elementCreated).toBeDefined();
      expect(result.elementCreated?.type).toBe("wall");
      // Last wall ID should match the last entry in wall_ids
      expect(result.elementCreated?.id).toBe(
        result.data?.wall_ids[result.data.wall_ids.length - 1]
      );
    });

    it("creates walls with correct start/end coordinates", async () => {
      await dispatchCommand("rect", {
        min: [2, 3],
        max: [7, 9],
      });

      const walls = useModelStore.getState().elements;
      expect(walls).toHaveLength(4);

      // Verify corners: bottom (2,3)→(7,3), right (7,3)→(7,9), top (7,9)→(2,9), left (2,9)→(2,3)
      const coords = walls.map((w) => ({
        sx: w.properties.start_x,
        sy: w.properties.start_y,
        ex: w.properties.end_x,
        ey: w.properties.end_y,
      }));

      expect(coords[0]).toEqual({ sx: 2, sy: 3, ex: 7, ey: 3 }); // bottom
      expect(coords[1]).toEqual({ sx: 7, sy: 3, ex: 7, ey: 9 }); // right
      expect(coords[2]).toEqual({ sx: 7, sy: 9, ex: 2, ey: 9 }); // top
      expect(coords[3]).toEqual({ sx: 2, sy: 9, ex: 2, ey: 3 }); // left
    });
  });
});
