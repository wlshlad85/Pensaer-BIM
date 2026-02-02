/**
 * Grid Command Handler Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerGridCommands } from "../handlers/gridCommands";
import {
  dispatchCommand,
  getCommand,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";

// Mock the MCP client
vi.mock("../../services/mcpClient", () => ({
  mcpClient: {
    callTool: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

describe("Grid Commands", () => {
  beforeEach(() => {
    useModelStore.setState({ elements: [] });
    registerGridCommands();
  });

  describe("Registration", () => {
    it("should register the grid command", () => {
      const cmd = getCommand("grid");
      expect(cmd).toBeDefined();
      expect(cmd!.name).toBe("grid");
    });
  });

  describe("grid add", () => {
    it("should add an x-axis grid line", async () => {
      const result = await dispatchCommand("grid", {
        _positional: ["add", "A"],
        axis: "x",
        position: 0,
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("A");
      expect(result.message).toContain("x-axis");
      expect(result.data?.label).toBe("A");
      expect(result.data?.axis).toBe("x");
      expect(result.data?.position).toBe(0);

      const elements = useModelStore.getState().elements;
      const gridLine = elements.find((el) => el.type === "gridline");
      expect(gridLine).toBeDefined();
      expect((gridLine as any).label).toBe("A");
      expect((gridLine as any).axis).toBe("x");
    });

    it("should add a y-axis grid line", async () => {
      const result = await dispatchCommand("grid", {
        _positional: ["add", "1"],
        axis: "y",
        position: 0,
      });
      expect(result.success).toBe(true);
      expect(result.data?.label).toBe("1");
      expect(result.data?.axis).toBe("y");
    });

    it("should add grid line at non-zero position", async () => {
      const result = await dispatchCommand("grid", {
        _positional: ["add", "B"],
        axis: "x",
        position: 6,
      });
      expect(result.success).toBe(true);
      expect(result.data?.position).toBe(6);
    });

    it("should reject duplicate labels", async () => {
      await dispatchCommand("grid", {
        _positional: ["add", "A"],
        axis: "x",
        position: 0,
      });
      const result = await dispatchCommand("grid", {
        _positional: ["add", "A"],
        axis: "x",
        position: 5,
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("already exists");
    });

    it("should reject missing axis", async () => {
      const result = await dispatchCommand("grid", {
        _positional: ["add", "A"],
        position: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("axis");
    });

    it("should reject missing position", async () => {
      const result = await dispatchCommand("grid", {
        _positional: ["add", "A"],
        axis: "x",
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("position");
    });

    it("should reject missing label", async () => {
      const result = await dispatchCommand("grid", {
        _positional: ["add"],
        axis: "x",
        position: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("label");
    });

    it("should reject invalid axis value", async () => {
      const result = await dispatchCommand("grid", {
        _positional: ["add", "A"],
        axis: "z",
        position: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("axis");
    });
  });

  describe("grid list", () => {
    it("should list no grid lines when empty", async () => {
      const result = await dispatchCommand("grid", {
        _positional: ["list"],
      });
      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(0);
    });

    it("should list added grid lines", async () => {
      await dispatchCommand("grid", { _positional: ["add", "A"], axis: "x", position: 0 });
      await dispatchCommand("grid", { _positional: ["add", "B"], axis: "x", position: 6 });
      await dispatchCommand("grid", { _positional: ["add", "1"], axis: "y", position: 0 });

      const result = await dispatchCommand("grid", { _positional: ["list"] });
      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(3);
      expect(result.data?.gridLines).toHaveLength(3);
    });

    it("should sort x-axis lines before y-axis", async () => {
      await dispatchCommand("grid", { _positional: ["add", "1"], axis: "y", position: 0 });
      await dispatchCommand("grid", { _positional: ["add", "A"], axis: "x", position: 0 });

      const result = await dispatchCommand("grid", { _positional: ["list"] });
      expect(result.data?.gridLines[0].axis).toBe("x");
      expect(result.data?.gridLines[1].axis).toBe("y");
    });
  });

  describe("grid delete", () => {
    it("should delete a grid line by label", async () => {
      await dispatchCommand("grid", { _positional: ["add", "A"], axis: "x", position: 0 });

      const result = await dispatchCommand("grid", { _positional: ["delete", "A"] });
      expect(result.success).toBe(true);
      expect(result.message).toContain("A");

      const elements = useModelStore.getState().elements;
      expect(elements.filter((el) => el.type === "gridline")).toHaveLength(0);
    });

    it("should fail to delete non-existent grid line", async () => {
      const result = await dispatchCommand("grid", { _positional: ["delete", "Z"] });
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("should require a target argument", async () => {
      const result = await dispatchCommand("grid", { _positional: ["delete"] });
      expect(result.success).toBe(false);
    });
  });

  describe("grid (no subcommand)", () => {
    it("should show usage when no subcommand given", async () => {
      const result = await dispatchCommand("grid", { _positional: [] });
      expect(result.success).toBe(false);
      expect(result.message).toContain("Usage");
    });
  });
});
