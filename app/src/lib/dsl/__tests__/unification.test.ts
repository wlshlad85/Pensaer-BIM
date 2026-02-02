/**
 * DSL/Handler Unification Tests (P1-001)
 *
 * Verifies that ALL commands route through the unified DSL pipeline,
 * ensuring consistent behavior for:
 * - Variable references ($last, $selected, $wall)
 * - from/to syntax
 * - Passthrough commands (list, delete, status, etc.)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { parse } from "../parser";
import { executeDsl, executeCommand } from "../executor";
import type { PassthroughCommand, PlaceDoorCommand } from "../ast";
import { VariableRef } from "../ast";

// Mock the command dispatcher
vi.mock("../../../services/commandDispatcher", () => ({
  dispatchCommand: vi.fn(),
}));

import { dispatchCommand } from "../../../services/commandDispatcher";

const mockDispatchCommand = vi.mocked(dispatchCommand);

describe("DSL/Handler Unification (P1-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Passthrough Command Parsing
  // ===========================================================================

  describe("passthrough command parsing", () => {
    it("parses 'list' as passthrough", () => {
      const result = parse("list");
      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].type).toBe("Passthrough");
      const cmd = result.commands[0] as PassthroughCommand;
      expect(cmd.commandName).toBe("list");
    });

    it("parses 'list wall' with positional arg", () => {
      const result = parse("list wall");
      expect(result.success).toBe(true);
      const cmd = result.commands[0] as PassthroughCommand;
      expect(cmd.commandName).toBe("list");
      expect(cmd.rawArgs).toContain("wall");
    });

    it("parses 'delete' with --ids flag", () => {
      const result = parse("delete --ids wall-001,wall-002");
      expect(result.success).toBe(true);
      const cmd = result.commands[0] as PassthroughCommand;
      expect(cmd.commandName).toBe("delete");
      expect(cmd.parsedArgs.ids).toBeDefined();
    });

    it("parses 'status' as passthrough with no args", () => {
      const result = parse("status");
      expect(result.success).toBe(true);
      const cmd = result.commands[0] as PassthroughCommand;
      expect(cmd.commandName).toBe("status");
      expect(cmd.rawArgs).toHaveLength(0);
    });

    it("parses 'clear' as passthrough", () => {
      const result = parse("clear");
      expect(result.success).toBe(true);
      const cmd = result.commands[0] as PassthroughCommand;
      expect(cmd.commandName).toBe("clear");
    });

    it("parses 'version' as passthrough", () => {
      const result = parse("version");
      expect(result.success).toBe(true);
      const cmd = result.commands[0] as PassthroughCommand;
      expect(cmd.commandName).toBe("version");
    });

    it("parses passthrough with --key value args", () => {
      const result = parse("clash --clearance 0.1 --tolerance 0.001");
      expect(result.success).toBe(true);
      const cmd = result.commands[0] as PassthroughCommand;
      expect(cmd.commandName).toBe("clash");
      expect(cmd.parsedArgs.clearance).toBe(0.1);
      expect(cmd.parsedArgs.tolerance).toBe(0.001);
    });

    it("parses passthrough with boolean flags", () => {
      const result = parse("list --json");
      expect(result.success).toBe(true);
      const cmd = result.commands[0] as PassthroughCommand;
      expect(cmd.parsedArgs.json).toBe(true);
    });

    it("parses passthrough preserving coordinate arrays", () => {
      const result = parse("nearest --position 5,5");
      expect(result.success).toBe(true);
      const cmd = result.commands[0] as PassthroughCommand;
      expect(cmd.parsedArgs.position).toEqual([5, 5]);
    });
  });

  // ===========================================================================
  // Variable Resolution in Passthrough
  // ===========================================================================

  describe("variable resolution in passthrough commands", () => {
    it("resolves $last in passthrough 'get' command", async () => {
      mockDispatchCommand.mockResolvedValueOnce({
        success: true,
        message: "Element found",
        data: { id: "wall-1", type: "wall" },
      });

      const result = await executeDsl("get $last", { lastElementId: "wall-1" });

      expect(result.success).toBe(true);
      expect(mockDispatchCommand).toHaveBeenCalledWith(
        "get",
        expect.objectContaining({ element_id: "wall-1" })
      );
    });

    it("resolves $selected in passthrough 'delete' command", async () => {
      mockDispatchCommand.mockResolvedValueOnce({
        success: true,
        message: "Deleted 2 elements",
      });

      const result = await executeDsl("delete $selected", {
        selectedIds: ["wall-1", "wall-2"],
      });

      expect(result.success).toBe(true);
      expect(mockDispatchCommand).toHaveBeenCalledWith(
        "delete",
        expect.objectContaining({ element_ids: ["wall-1", "wall-2"] })
      );
    });

    it("resolves $wall in passthrough command", async () => {
      mockDispatchCommand.mockResolvedValueOnce({
        success: true,
        message: "OK",
      });

      const result = await executeDsl("get $wall", { wallId: "wall-abc" });

      expect(result.success).toBe(true);
      expect(mockDispatchCommand).toHaveBeenCalledWith(
        "get",
        expect.objectContaining({ wall: "wall-abc" })
      );
    });
  });

  // ===========================================================================
  // DSL Element Commands Still Work
  // ===========================================================================

  describe("DSL element commands remain functional", () => {
    it("wall with from/to syntax", async () => {
      mockDispatchCommand.mockResolvedValueOnce({
        success: true,
        message: "Wall created",
        elementCreated: { id: "wall-1", type: "wall" },
      });

      const result = await executeDsl("wall from (0, 0) to (5, 0)");

      expect(result.success).toBe(true);
      expect(mockDispatchCommand).toHaveBeenCalledWith(
        "wall",
        expect.objectContaining({
          start: [0, 0],
          end: [5, 0],
        })
      );
    });

    it("door with $last variable", async () => {
      mockDispatchCommand
        .mockResolvedValueOnce({
          success: true,
          message: "Wall created",
          elementCreated: { id: "wall-1", type: "wall" },
        })
        .mockResolvedValueOnce({
          success: true,
          message: "Door placed",
          elementCreated: { id: "door-1", type: "door" },
        });

      const result = await executeDsl(
        "wall (0, 0) (5, 0)\ndoor $last 2.5"
      );

      expect(result.success).toBe(true);
      expect(result.createdElementIds).toEqual(["wall-1", "door-1"]);
      // Door should reference wall-1 via $last
      expect(mockDispatchCommand).toHaveBeenLastCalledWith(
        "door",
        expect.objectContaining({ wall_id: "wall-1" })
      );
    });

    it("window with $wall variable", async () => {
      mockDispatchCommand.mockResolvedValueOnce({
        success: true,
        message: "Window placed",
        elementCreated: { id: "win-1", type: "window" },
      });

      const result = await executeDsl("window $wall 1.5", {
        wallId: "wall-abc",
      });

      expect(result.success).toBe(true);
      expect(mockDispatchCommand).toHaveBeenCalledWith(
        "window",
        expect.objectContaining({ wall_id: "wall-abc" })
      );
    });
  });

  // ===========================================================================
  // Mixed DSL + Passthrough in Multi-Command
  // ===========================================================================

  describe("mixed DSL and passthrough commands", () => {
    it("executes DSL wall then passthrough status", async () => {
      mockDispatchCommand
        .mockResolvedValueOnce({
          success: true,
          message: "Wall created",
          elementCreated: { id: "wall-1", type: "wall" },
        })
        .mockResolvedValueOnce({
          success: true,
          message: "Model status",
          data: { total_elements: 1 },
        });

      const result = await executeDsl("wall (0, 0) (5, 0)\nstatus");

      expect(result.success).toBe(true);
      expect(result.commandResults).toHaveLength(2);
      expect(mockDispatchCommand).toHaveBeenCalledTimes(2);
      expect(mockDispatchCommand).toHaveBeenNthCalledWith(1, "wall", expect.anything());
      expect(mockDispatchCommand).toHaveBeenNthCalledWith(2, "status", expect.anything());
    });
  });

  // ===========================================================================
  // Passthrough Execution
  // ===========================================================================

  describe("passthrough execution", () => {
    it("dispatches passthrough to command registry", async () => {
      mockDispatchCommand.mockResolvedValueOnce({
        success: true,
        message: "Found 5 elements",
        data: { count: 5 },
      });

      const result = await executeDsl("list wall");

      expect(result.success).toBe(true);
      expect(mockDispatchCommand).toHaveBeenCalledWith("list", expect.anything());
    });

    it("returns failure for unregistered passthrough command", async () => {
      mockDispatchCommand.mockResolvedValueOnce({
        success: false,
        message: "Unknown command: foobar",
      });

      const result = await executeDsl("foobar");

      expect(result.success).toBe(false);
      expect(mockDispatchCommand).toHaveBeenCalledWith("foobar", expect.anything());
    });
  });
});
