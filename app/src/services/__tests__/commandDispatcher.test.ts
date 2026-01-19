/**
 * Command Dispatcher Tests
 *
 * Tests for the central command dispatcher service.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerCommand,
  getCommand,
  getAllCommands,
  dispatchCommand,
  dispatchCommandWithContext,
  getCommandContext,
  callMcpTool,
  parseCommandString,
  parseArguments,
  parseValue,
  setLoggingEnabled,
  isLoggingEnabled,
  getCommandLog,
  clearCommandLog,
  type CommandDefinition,
  type CommandResult,
  type CommandContext,
} from "../commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useSelectionStore } from "../../stores/selectionStore";

// Mock the MCP client
vi.mock("../mcpClient", () => ({
  mcpClient: {
    callTool: vi.fn().mockImplementation(({ tool }) => {
      if (tool === "test_tool") {
        return Promise.resolve({
          success: true,
          data: { result: "test_result" },
          event_id: "evt-test",
        });
      }
      if (tool === "failing_tool") {
        return Promise.resolve({
          success: false,
          error: { code: -1, message: "Test error" },
        });
      }
      return Promise.resolve({
        success: false,
        error: { code: -32601, message: "Unknown tool" },
      });
    }),
  },
}));

describe("Command Dispatcher", () => {
  beforeEach(() => {
    // Reset stores
    useModelStore.setState({ elements: [], isLoading: false, error: null });
    useSelectionStore.setState({
      selectedIds: [],
      hoveredId: null,
      highlightedIds: [],
    });

    // Clear command log before each test
    clearCommandLog();
    setLoggingEnabled(true);
  });

  describe("registerCommand", () => {
    it("registers a new command", () => {
      const testCommand: CommandDefinition = {
        name: "test-cmd",
        description: "A test command",
        usage: "test-cmd [args]",
        examples: ["test-cmd --foo bar"],
        handler: async () => ({ success: true, message: "Test success" }),
      };

      registerCommand(testCommand);

      const retrieved = getCommand("test-cmd");
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("test-cmd");
      expect(retrieved?.description).toBe("A test command");
    });

    it("overwrites existing command with same name", () => {
      const cmd1: CommandDefinition = {
        name: "overwrite-test",
        description: "First version",
        usage: "",
        examples: [],
        handler: async () => ({ success: true, message: "v1" }),
      };

      const cmd2: CommandDefinition = {
        name: "overwrite-test",
        description: "Second version",
        usage: "",
        examples: [],
        handler: async () => ({ success: true, message: "v2" }),
      };

      registerCommand(cmd1);
      registerCommand(cmd2);

      const retrieved = getCommand("overwrite-test");
      expect(retrieved?.description).toBe("Second version");
    });
  });

  describe("getCommand", () => {
    it("returns undefined for non-existent command", () => {
      const cmd = getCommand("non-existent-command-xyz");
      expect(cmd).toBeUndefined();
    });
  });

  describe("getAllCommands", () => {
    it("returns all registered commands", () => {
      registerCommand({
        name: "list-test-1",
        description: "Test 1",
        usage: "",
        examples: [],
        handler: async () => ({ success: true, message: "ok" }),
      });

      registerCommand({
        name: "list-test-2",
        description: "Test 2",
        usage: "",
        examples: [],
        handler: async () => ({ success: true, message: "ok" }),
      });

      const commands = getAllCommands();
      const names = commands.map((c) => c.name);

      expect(names).toContain("list-test-1");
      expect(names).toContain("list-test-2");
    });
  });

  describe("dispatchCommand", () => {
    beforeEach(() => {
      registerCommand({
        name: "dispatch-test",
        description: "Dispatch test",
        usage: "",
        examples: [],
        handler: async (args) => ({
          success: true,
          message: `Received: ${JSON.stringify(args)}`,
        }),
      });

      registerCommand({
        name: "failing-cmd",
        description: "A failing command",
        usage: "",
        examples: [],
        handler: async () => {
          throw new Error("Intentional failure");
        },
      });
    });

    it("dispatches command with arguments", async () => {
      const result = await dispatchCommand("dispatch-test", { foo: "bar" });

      expect(result.success).toBe(true);
      expect(result.message).toContain("foo");
      expect(result.message).toContain("bar");
    });

    it("returns error for unknown command", async () => {
      const result = await dispatchCommand("unknown-cmd-xyz", {});

      expect(result.success).toBe(false);
      expect(result.message).toContain("Unknown command");
    });

    it("handles command handler errors", async () => {
      const result = await dispatchCommand("failing-cmd", {});

      expect(result.success).toBe(false);
      expect(result.message).toContain("Intentional failure");
    });

    it("calls onStart callback", async () => {
      const onStart = vi.fn();

      await dispatchCommand("dispatch-test", {}, { onStart });

      expect(onStart).toHaveBeenCalled();
    });

    it("calls onComplete callback on success", async () => {
      const onComplete = vi.fn();

      await dispatchCommand("dispatch-test", {}, { onComplete });

      expect(onComplete).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it("calls onError callback on failure", async () => {
      const onError = vi.fn();

      await dispatchCommand("failing-cmd", {}, { onError });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("getCommandContext", () => {
    it("returns empty context when no elements", () => {
      const context = getCommandContext();

      expect(context.selectedIds).toEqual([]);
      expect(context.allElementIds).toEqual([]);
      expect(context.elementCounts.size).toBe(0);
    });

    it("includes selected element IDs", () => {
      useSelectionStore.setState({ selectedIds: ["id-1", "id-2"] });

      const context = getCommandContext();

      expect(context.selectedIds).toEqual(["id-1", "id-2"]);
    });

    it("includes all element IDs", () => {
      useModelStore.setState({
        elements: [
          {
            id: "el-1",
            type: "wall",
            name: "Wall",
            x: 0,
            y: 0,
            width: 100,
            height: 12,
            properties: {},
            relationships: {},
            issues: [],
            aiSuggestions: [],
          },
          {
            id: "el-2",
            type: "floor",
            name: "Floor",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            properties: {},
            relationships: {},
            issues: [],
            aiSuggestions: [],
          },
        ],
      });

      const context = getCommandContext();

      expect(context.allElementIds).toContain("el-1");
      expect(context.allElementIds).toContain("el-2");
    });

    it("calculates element counts by type", () => {
      useModelStore.setState({
        elements: [
          {
            id: "w1",
            type: "wall",
            name: "W1",
            x: 0,
            y: 0,
            width: 100,
            height: 12,
            properties: {},
            relationships: {},
            issues: [],
            aiSuggestions: [],
          },
          {
            id: "w2",
            type: "wall",
            name: "W2",
            x: 0,
            y: 0,
            width: 100,
            height: 12,
            properties: {},
            relationships: {},
            issues: [],
            aiSuggestions: [],
          },
          {
            id: "f1",
            type: "floor",
            name: "F1",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            properties: {},
            relationships: {},
            issues: [],
            aiSuggestions: [],
          },
        ],
      });

      const context = getCommandContext();

      expect(context.elementCounts.get("wall")).toBe(2);
      expect(context.elementCounts.get("floor")).toBe(1);
    });
  });

  describe("dispatchCommandWithContext", () => {
    beforeEach(() => {
      registerCommand({
        name: "context-test",
        description: "Context test",
        usage: "",
        examples: [],
        handler: async (args, context) => ({
          success: true,
          message: `Selected: ${context.selectedIds.join(",")}`,
          data: { args, context },
        }),
      });
    });

    it("passes context to handler", async () => {
      useSelectionStore.setState({ selectedIds: ["sel-1", "sel-2"] });

      const result = await dispatchCommandWithContext("context-test", {});

      expect(result.success).toBe(true);
      expect(result.message).toContain("sel-1");
      expect(result.message).toContain("sel-2");
    });
  });

  describe("callMcpTool", () => {
    it("calls MCP client and returns success", async () => {
      const result = await callMcpTool("test_tool", { arg: "value" });

      expect(result.success).toBe(true);
      expect(result.data?.result).toBe("test_result");
    });

    it("handles MCP tool failure", async () => {
      const result = await callMcpTool("failing_tool", {});

      expect(result.success).toBe(false);
      expect(result.message).toContain("Test error");
    });
  });

  describe("parseCommandString", () => {
    it("parses simple command with no arguments", () => {
      const { command, rawArgs } = parseCommandString("help");

      expect(command).toBe("help");
      expect(rawArgs).toEqual([]);
    });

    it("parses command with arguments", () => {
      const { command, rawArgs } = parseCommandString("wall --start 0,0 --end 5,0");

      expect(command).toBe("wall");
      expect(rawArgs).toEqual(["--start", "0,0", "--end", "5,0"]);
    });

    it("handles double-quoted strings", () => {
      const { command, rawArgs } = parseCommandString('echo "Hello World"');

      expect(command).toBe("echo");
      expect(rawArgs).toEqual(["Hello World"]);
    });

    it("handles single-quoted strings", () => {
      const { command, rawArgs } = parseCommandString("echo 'Hello World'");

      expect(command).toBe("echo");
      expect(rawArgs).toEqual(["Hello World"]);
    });

    it("handles mixed quotes and arguments", () => {
      const { command, rawArgs } = parseCommandString(
        'wall --name "My Wall" --start 0,0 --end 5,0'
      );

      expect(command).toBe("wall");
      expect(rawArgs).toEqual(["--name", "My Wall", "--start", "0,0", "--end", "5,0"]);
    });

    it("handles quoted strings with spaces", () => {
      const { command, rawArgs } = parseCommandString(
        'room --name "Living Room" --number "101"'
      );

      expect(command).toBe("room");
      expect(rawArgs).toEqual(["--name", "Living Room", "--number", "101"]);
    });

    it("handles escaped characters in strings", () => {
      const { command, rawArgs } = parseCommandString(
        'echo "Hello \\"World\\""'
      );

      expect(command).toBe("echo");
      expect(rawArgs).toEqual(['Hello "World"']);
    });

    it("returns empty command for empty input", () => {
      const { command, rawArgs } = parseCommandString("");

      expect(command).toBe("");
      expect(rawArgs).toEqual([]);
    });

    it("trims whitespace", () => {
      const { command, rawArgs } = parseCommandString("  help  ");

      expect(command).toBe("help");
      expect(rawArgs).toEqual([]);
    });
  });

  describe("parseArguments", () => {
    it("parses --key value syntax", () => {
      const result = parseArguments(["--start", "0,0", "--end", "5,0"]);

      expect(result.start).toEqual([0, 0]);
      expect(result.end).toEqual([5, 0]);
    });

    it("parses --key=value syntax", () => {
      const result = parseArguments(["--height=3.0", "--thickness=0.2"]);

      expect(result.height).toBe(3.0);
      expect(result.thickness).toBe(0.2);
    });

    it("parses boolean flags", () => {
      const result = parseArguments(["--verbose", "--debug"]);

      expect(result.verbose).toBe(true);
      expect(result.debug).toBe(true);
    });

    it("parses string values", () => {
      const result = parseArguments(["--name", "My Wall"]);

      expect(result.name).toBe("My Wall");
    });

    it("handles positional arguments", () => {
      const result = parseArguments(["wall-1", "wall-2", "--force"]);

      expect(result._positional).toEqual(["wall-1", "wall-2"]);
      expect(result.force).toBe(true);
    });
  });

  describe("parseValue", () => {
    it("parses integers", () => {
      expect(parseValue("42")).toBe(42);
      expect(parseValue("-10")).toBe(-10);
    });

    it("parses floats", () => {
      expect(parseValue("3.14")).toBe(3.14);
      expect(parseValue("-0.5")).toBe(-0.5);
    });

    it("parses coordinate pairs", () => {
      expect(parseValue("0,0")).toEqual([0, 0]);
      expect(parseValue("5.5,10")).toEqual([5.5, 10]);
      expect(parseValue("1,2,3")).toEqual([1, 2, 3]);
    });

    it("parses booleans", () => {
      expect(parseValue("true")).toBe(true);
      expect(parseValue("false")).toBe(false);
      expect(parseValue("TRUE")).toBe(true);
      expect(parseValue("FALSE")).toBe(false);
    });

    it("returns strings for non-numeric values", () => {
      expect(parseValue("hello")).toBe("hello");
      expect(parseValue("My Wall")).toBe("My Wall");
    });
  });

  describe("Command Logging", () => {
    beforeEach(() => {
      registerCommand({
        name: "log-test",
        description: "Log test",
        usage: "",
        examples: [],
        handler: async () => ({ success: true, message: "logged" }),
      });
    });

    it("logs successful commands", async () => {
      await dispatchCommand("log-test", { foo: "bar" });

      const log = getCommandLog();
      expect(log.length).toBe(1);
      expect(log[0].command).toBe("log-test");
      expect(log[0].args).toEqual({ foo: "bar" });
      expect(log[0].result.success).toBe(true);
      expect(log[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    it("logs failed commands", async () => {
      await dispatchCommand("unknown-command-xyz", {});

      const log = getCommandLog();
      expect(log.length).toBe(1);
      expect(log[0].command).toBe("unknown-command-xyz");
      expect(log[0].result.success).toBe(false);
    });

    it("respects logging enabled flag", async () => {
      setLoggingEnabled(false);

      await dispatchCommand("log-test", {});

      expect(getCommandLog().length).toBe(0);

      setLoggingEnabled(true);
    });

    it("clears log correctly", async () => {
      await dispatchCommand("log-test", {});
      expect(getCommandLog().length).toBe(1);

      clearCommandLog();
      expect(getCommandLog().length).toBe(0);
    });

    it("returns log entries in reverse order (most recent first)", async () => {
      await dispatchCommand("log-test", { order: 1 });
      await dispatchCommand("log-test", { order: 2 });
      await dispatchCommand("log-test", { order: 3 });

      const log = getCommandLog();
      expect(log[0].args).toEqual({ order: 3 });
      expect(log[1].args).toEqual({ order: 2 });
      expect(log[2].args).toEqual({ order: 1 });
    });

    it("isLoggingEnabled returns correct state", () => {
      expect(isLoggingEnabled()).toBe(true);

      setLoggingEnabled(false);
      expect(isLoggingEnabled()).toBe(false);

      setLoggingEnabled(true);
      expect(isLoggingEnabled()).toBe(true);
    });
  });
});
