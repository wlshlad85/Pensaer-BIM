/**
 * DSL Executor Tests
 *
 * Tests for the DSL command executor that bridges parsed AST
 * to MCP tool calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeDsl, executeCommand, executeCommands } from "./executor";
import type { CreateWallCommand, PlaceDoorCommand } from "./ast";
import { VariableRef } from "./ast";

// Mock the command dispatcher
vi.mock("../../services/commandDispatcher", () => ({
  dispatchCommand: vi.fn(),
}));

import { dispatchCommand } from "../../services/commandDispatcher";

const mockDispatchCommand = vi.mocked(dispatchCommand);

describe("DSL Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executeCommand", () => {
    it("executes a CreateWall command", async () => {
      mockDispatchCommand.mockResolvedValueOnce({
        success: true,
        message: "Wall created",
        elementCreated: { id: "wall-1", type: "wall" },
      });

      const command: CreateWallCommand = {
        type: "CreateWall",
        start: { x: 0, y: 0 },
        end: { x: 5, y: 0 },
        height: 3.0,
        thickness: 0.2,
        line: 1,
        column: 1,
      };

      const result = await executeCommand(command);

      expect(result.success).toBe(true);
      expect(mockDispatchCommand).toHaveBeenCalledWith("wall", {
        start: [0, 0],
        end: [5, 0],
        height: 3.0,
        thickness: 0.2,
      });
    });

    it("executes a PlaceDoor command with explicit wall ID", async () => {
      mockDispatchCommand.mockResolvedValueOnce({
        success: true,
        message: "Door placed",
        elementCreated: { id: "door-1", type: "door" },
      });

      const command: PlaceDoorCommand = {
        type: "PlaceDoor",
        wallRef: { uuid: "wall-abc" },
        offset: 0.5,
        width: 0.9,
        height: 2.1,
        line: 1,
        column: 1,
      };

      const result = await executeCommand(command);

      expect(result.success).toBe(true);
      expect(mockDispatchCommand).toHaveBeenCalledWith("door", {
        wall_id: "wall-abc",
        offset: 0.5,
        width: 0.9,
        height: 2.1,
      });
    });

    it("resolves $last variable for door placement", async () => {
      mockDispatchCommand.mockResolvedValueOnce({
        success: true,
        message: "Door placed",
        elementCreated: { id: "door-1", type: "door" },
      });

      const command: PlaceDoorCommand = {
        type: "PlaceDoor",
        wallRef: { variable: VariableRef.LAST },
        offset: 0.5,
        width: 0.9,
        height: 2.1,
        line: 1,
        column: 1,
      };

      const result = await executeCommand(command, { lastElementId: "wall-123" });

      expect(result.success).toBe(true);
      expect(mockDispatchCommand).toHaveBeenCalledWith("door", {
        wall_id: "wall-123",
        offset: 0.5,
        width: 0.9,
        height: 2.1,
      });
    });

    it("fails when variable cannot be resolved", async () => {
      const command: PlaceDoorCommand = {
        type: "PlaceDoor",
        wallRef: { variable: VariableRef.LAST },
        offset: 0.5,
        width: 0.9,
        height: 2.1,
        line: 1,
        column: 1,
      };

      const result = await executeCommand(command, {}); // No context

      expect(result.success).toBe(false);
      expect(result.message).toContain("Cannot resolve wall reference");
    });
  });

  describe("executeCommands", () => {
    it("executes multiple commands in sequence", async () => {
      mockDispatchCommand
        .mockResolvedValueOnce({
          success: true,
          message: "Wall created",
          elementCreated: { id: "wall-1", type: "wall" },
        })
        .mockResolvedValueOnce({
          success: true,
          message: "Wall created",
          elementCreated: { id: "wall-2", type: "wall" },
        });

      const commands: CreateWallCommand[] = [
        {
          type: "CreateWall",
          start: { x: 0, y: 0 },
          end: { x: 5, y: 0 },
          height: 3.0,
          thickness: 0.2,
          line: 1,
          column: 1,
        },
        {
          type: "CreateWall",
          start: { x: 5, y: 0 },
          end: { x: 5, y: 5 },
          height: 3.0,
          thickness: 0.2,
          line: 2,
          column: 1,
        },
      ];

      const result = await executeCommands(commands);

      expect(result.success).toBe(true);
      expect(result.createdElementIds).toEqual(["wall-1", "wall-2"]);
      expect(mockDispatchCommand).toHaveBeenCalledTimes(2);
    });

    it("updates context with last created element", async () => {
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

      // Wall command followed by door using $last
      const commands = [
        {
          type: "CreateWall" as const,
          start: { x: 0, y: 0 },
          end: { x: 5, y: 0 },
          height: 3.0,
          thickness: 0.2,
          line: 1,
          column: 1,
        },
        {
          type: "PlaceDoor" as const,
          wallRef: { variable: VariableRef.LAST },
          offset: 0.5,
          width: 0.9,
          height: 2.1,
          line: 2,
          column: 1,
        },
      ];

      const result = await executeCommands(commands);

      expect(result.success).toBe(true);
      expect(result.createdElementIds).toEqual(["wall-1", "door-1"]);

      // The door command should have used the wall-1 ID from context
      expect(mockDispatchCommand).toHaveBeenLastCalledWith("door", {
        wall_id: "wall-1",
        offset: 0.5,
        width: 0.9,
        height: 2.1,
      });
    });

    it("stops on first error", async () => {
      mockDispatchCommand
        .mockResolvedValueOnce({
          success: true,
          message: "Wall created",
          elementCreated: { id: "wall-1", type: "wall" },
        })
        .mockResolvedValueOnce({
          success: false,
          message: "Failed to create wall",
        });

      const commands: CreateWallCommand[] = [
        {
          type: "CreateWall",
          start: { x: 0, y: 0 },
          end: { x: 5, y: 0 },
          height: 3.0,
          thickness: 0.2,
          line: 1,
          column: 1,
        },
        {
          type: "CreateWall",
          start: { x: 5, y: 0 },
          end: { x: 5, y: 5 },
          height: 3.0,
          thickness: 0.2,
          line: 2,
          column: 1,
        },
        {
          type: "CreateWall",
          start: { x: 5, y: 5 },
          end: { x: 0, y: 5 },
          height: 3.0,
          thickness: 0.2,
          line: 3,
          column: 1,
        },
      ];

      const result = await executeCommands(commands);

      expect(result.success).toBe(false);
      expect(result.createdElementIds).toEqual(["wall-1"]);
      // Should have stopped after second command failed
      expect(mockDispatchCommand).toHaveBeenCalledTimes(2);
    });
  });

  describe("executeDsl", () => {
    it("parses and executes a wall command", async () => {
      mockDispatchCommand.mockResolvedValueOnce({
        success: true,
        message: "Wall created",
        elementCreated: { id: "wall-1", type: "wall" },
      });

      const result = await executeDsl("wall (0, 0) (5, 0) height 3");

      expect(result.success).toBe(true);
      expect(result.createdElementIds).toEqual(["wall-1"]);
      expect(mockDispatchCommand).toHaveBeenCalledWith("wall", expect.objectContaining({
        start: [0, 0],
        end: [5, 0],
        height: 3,
      }));
    });

    it("handles parse errors gracefully", async () => {
      const result = await executeDsl("invalid command syntax !!!");

      expect(result.success).toBe(false);
      expect(result.terminalOutput.length).toBeGreaterThan(0);
      expect(mockDispatchCommand).not.toHaveBeenCalled();
    });

    it("handles empty input", async () => {
      const result = await executeDsl("");

      expect(result.success).toBe(true);
      expect(result.commandResults).toHaveLength(0);
    });

    it("handles whitespace-only input", async () => {
      const result = await executeDsl("   \n   ");

      expect(result.success).toBe(true);
      expect(result.commandResults).toHaveLength(0);
    });

    it("parses wall command with units", async () => {
      mockDispatchCommand.mockResolvedValueOnce({
        success: true,
        message: "Wall created",
        elementCreated: { id: "wall-1", type: "wall" },
      });

      const result = await executeDsl("wall (0, 0) (5000mm, 0) height 3m");

      expect(result.success).toBe(true);
      expect(mockDispatchCommand).toHaveBeenCalledWith("wall", expect.objectContaining({
        start: [0, 0],
        end: [5, 0], // 5000mm = 5m
        height: 3,
      }));
    });
  });
});
