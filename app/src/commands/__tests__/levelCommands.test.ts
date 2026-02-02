/**
 * Level Command Handlers Tests
 *
 * P0-002: Tests for level add/list/delete/set-active commands.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerLevelCommands } from "../handlers/levelCommands";
import {
  dispatchCommand,
  getCommand,
  parseCommandString,
  parseArguments,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useUIStore } from "../../stores/uiStore";

// Mock the MCP client (not used by level commands, but required by dispatcher)
vi.mock("../../services/mcpClient", () => ({
  mcpClient: {
    callTool: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

describe("Level Commands", () => {
  beforeEach(() => {
    useModelStore.getState().setLevels([]);
    registerLevelCommands();
  });

  describe("registration", () => {
    it("registers the level command", () => {
      const cmd = getCommand("level");
      expect(cmd).toBeDefined();
      expect(cmd!.name).toBe("level");
    });
  });

  describe("level add", () => {
    it("adds a level with name, elevation, and height", async () => {
      const result = await dispatchCommand("level", {
        _positional: ["add", "Level 2"],
        elevation: 3.0,
        height: 3.0,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Level 2");

      const levels = useModelStore.getState().getLevelsOrdered();
      expect(levels).toHaveLength(1);
      expect(levels[0].name).toBe("Level 2");
      expect(levels[0].elevation).toBe(3000);
      expect(levels[0].height).toBe(3000);
    });

    it("rejects duplicate level names", async () => {
      await dispatchCommand("level", {
        _positional: ["add", "Level 1"],
        elevation: 0,
        height: 3.0,
      });

      const result = await dispatchCommand("level", {
        _positional: ["add", "Level 1"],
        elevation: 3.0,
        height: 3.0,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("already exists");
    });

    it("defaults height to 3.0m when not specified", async () => {
      const result = await dispatchCommand("level", {
        _positional: ["add", "Ground"],
        elevation: 0,
      });

      expect(result.success).toBe(true);
      const levels = useModelStore.getState().getLevelsOrdered();
      expect(levels[0].height).toBe(3000);
    });

    it("fails when name is missing", async () => {
      const result = await dispatchCommand("level", {
        _positional: ["add"],
        elevation: 3.0,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Missing level name");
    });
  });

  describe("level list", () => {
    it("shows empty message when no levels", async () => {
      const result = await dispatchCommand("level", {
        _positional: ["list"],
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("No levels");
      expect(result.data?.count).toBe(0);
    });

    it("lists levels ordered by elevation", async () => {
      await dispatchCommand("level", {
        _positional: ["add", "Level 2"],
        elevation: 3.0,
        height: 3.0,
      });
      await dispatchCommand("level", {
        _positional: ["add", "Level 1"],
        elevation: 0,
        height: 3.0,
      });

      const result = await dispatchCommand("level", {
        _positional: ["list"],
      });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(2);
      const levels = result.data?.levels as Array<{ name: string }>;
      expect(levels[0].name).toBe("Level 1");
      expect(levels[1].name).toBe("Level 2");
    });
  });

  describe("level delete", () => {
    it("deletes a level by ID", async () => {
      const addResult = await dispatchCommand("level", {
        _positional: ["add", "Temp Level"],
        elevation: 0,
        height: 3.0,
      });
      const id = addResult.data?.id as string;

      const result = await dispatchCommand("level", {
        _positional: ["delete", id],
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Deleted");
      expect(useModelStore.getState().getLevelsOrdered()).toHaveLength(0);
    });

    it("fails for non-existent level", async () => {
      const result = await dispatchCommand("level", {
        _positional: ["delete", "nonexistent"],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("fails when missing ID", async () => {
      const result = await dispatchCommand("level", {
        _positional: ["delete"],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Missing level ID");
    });
  });

  describe("level set-active", () => {
    it("sets the active level", async () => {
      const addResult = await dispatchCommand("level", {
        _positional: ["add", "Level 2"],
        elevation: 3.0,
        height: 3.0,
      });
      const id = addResult.data?.id as string;

      const result = await dispatchCommand("level", {
        _positional: ["set-active", id],
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Level 2");
      expect(useUIStore.getState().activeLevel).toBe(id);
    });

    it("fails for non-existent level", async () => {
      const result = await dispatchCommand("level", {
        _positional: ["set-active", "nonexistent"],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });
  });

  describe("subcommand routing", () => {
    it("shows usage when no subcommand given", async () => {
      const result = await dispatchCommand("level", {
        _positional: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Usage");
    });

    it("shows usage for unknown subcommand", async () => {
      const result = await dispatchCommand("level", {
        _positional: ["unknown"],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Usage");
    });
  });

  describe("CLI parsing integration", () => {
    it("parses level add command string correctly", () => {
      const { command, rawArgs } = parseCommandString(
        'level add "Level 2" --elevation 3.0 --height 3.0'
      );
      expect(command).toBe("level");

      const args = parseArguments(rawArgs);
      expect(args._positional).toEqual(["add", "Level 2"]);
      expect(args.elevation).toBe(3.0);
      expect(args.height).toBe(3.0);
    });

    it("parses level list command string correctly", () => {
      const { command, rawArgs } = parseCommandString("level list");
      expect(command).toBe("level");

      const args = parseArguments(rawArgs);
      expect(args._positional).toEqual(["list"]);
    });

    it("parses level delete command string correctly", () => {
      const { command, rawArgs } = parseCommandString("level delete level-2");
      expect(command).toBe("level");

      const args = parseArguments(rawArgs);
      expect(args._positional).toEqual(["delete", "level-2"]);
    });

    it("parses level set-active command string correctly", () => {
      const { command, rawArgs } = parseCommandString("level set-active level-2");
      expect(command).toBe("level");

      const args = parseArguments(rawArgs);
      expect(args._positional).toEqual(["set-active", "level-2"]);
    });
  });
});
