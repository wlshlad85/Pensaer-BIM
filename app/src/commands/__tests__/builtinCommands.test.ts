/**
 * Built-in Command Handlers Tests
 *
 * Tests for local command handlers (help, clear, status, version, echo, macro).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerBuiltinCommands } from "../handlers/builtinCommands";
import {
  dispatchCommand,
  getCommand,
  getAllCommands,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useHistoryStore } from "../../stores/historyStore";
import { useMacroStore } from "../../stores/macroStore";
import { useSelectionStore } from "../../stores/selectionStore";
import type { Element } from "../../types";

// Mock the MCP client (required for command system initialization)
vi.mock("../../services/mcpClient", () => ({
  mcpClient: {
    callTool: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

// Helper to create a test element
const createTestElement = (id: string, type: string, name: string): Element => ({
  id,
  type,
  name,
  x: 0,
  y: 0,
  width: 100,
  height: 10,
  properties: {},
  relationships: {},
  issues: [],
  aiSuggestions: [],
});

describe("Built-in Command Handlers", () => {
  beforeEach(() => {
    // Reset stores
    useModelStore.setState({
      elements: [],
      levels: [],
      isLoading: false,
      error: null,
    });

    useHistoryStore.setState({
      entries: [],
      currentIndex: -1,
      isUndoing: false,
      lastAction: null,
      undoStack: [],
      redoStack: [],
    });

    useSelectionStore.setState({
      selectedIds: [],
      hoveredId: null,
      highlightedIds: [],
    });

    useMacroStore.setState({
      macros: {},
      isRecording: false,
      recordingMacroName: null,
      recordingCommands: [],
      recordingStartedAt: null,
      isPlaying: false,
      playbackState: null,
    });

    // Register commands
    registerBuiltinCommands();
  });

  describe("Command Registration", () => {
    it("registers help command", () => {
      const cmd = getCommand("help");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("help");
      expect(cmd?.description).toContain("commands");
    });

    it("registers clear command", () => {
      const cmd = getCommand("clear");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("clear");
    });

    it("registers status command", () => {
      const cmd = getCommand("status");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("status");
    });

    it("registers version command", () => {
      const cmd = getCommand("version");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("version");
    });

    it("registers echo command", () => {
      const cmd = getCommand("echo");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("echo");
    });

    it("registers macro command", () => {
      const cmd = getCommand("macro");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("macro");
    });
  });

  describe("Help Command", () => {
    it("returns list of all commands when no argument", async () => {
      const result = await dispatchCommand("help", {});

      expect(result.success).toBe(true);
      expect(result.message).toContain("commands");
      expect(result.data?.total_commands).toBeGreaterThan(0);
    });

    it("returns detailed help for specific command", async () => {
      const result = await dispatchCommand("help", { command: "help" });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("help");
      expect(result.data?.usage).toBeDefined();
      expect(result.data?.examples).toBeDefined();
    });

    it("returns error for unknown command", async () => {
      const result = await dispatchCommand("help", { command: "unknown-cmd" });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Unknown command");
    });

    it("groups commands by category", async () => {
      const result = await dispatchCommand("help", {});

      expect(result.data?.builtin).toBeDefined();
      expect(Array.isArray(result.data?.builtin)).toBe(true);
    });
  });

  describe("Clear Command", () => {
    it("returns clear terminal signal", async () => {
      const result = await dispatchCommand("clear", {});

      expect(result.success).toBe(true);
      expect(result.message).toBe("__CLEAR_TERMINAL__");
      expect(result.data?.action).toBe("clear_terminal");
    });
  });

  describe("Status Command", () => {
    it("returns model status with no elements", async () => {
      const result = await dispatchCommand("status", {});

      expect(result.success).toBe(true);
      expect(result.message).toContain("status");
      expect(result.data?.total_elements).toBe(0);
    });

    it("includes element counts by type", async () => {
      useModelStore.setState({
        elements: [
          createTestElement("wall-1", "wall", "Wall 1"),
          createTestElement("wall-2", "wall", "Wall 2"),
          createTestElement("floor-1", "floor", "Floor 1"),
        ],
      });

      const result = await dispatchCommand("status", {});

      expect(result.success).toBe(true);
      expect(result.data?.total_elements).toBe(3);
      expect(result.data?.elements_by_type?.wall).toBe(2);
      expect(result.data?.elements_by_type?.floor).toBe(1);
    });

    it("includes selection count", async () => {
      useSelectionStore.setState({
        selectedIds: ["wall-1", "wall-2"],
      });

      const result = await dispatchCommand("status", {});

      expect(result.data?.selected).toBe(2);
    });

    it("includes history information", async () => {
      useHistoryStore.setState({
        lastAction: "Added wall",
        undoStack: [{ description: "Action 1" }],
        redoStack: [{ description: "Action 2" }],
      });

      const result = await dispatchCommand("status", {});

      expect(result.data?.history).toBeDefined();
      expect(result.data?.history?.last_action).toBe("Added wall");
    });

    it("includes issue counts", async () => {
      useModelStore.setState({
        elements: [
          {
            ...createTestElement("wall-1", "wall", "Wall 1"),
            issues: [
              { id: "issue-1", message: "Issue 1", priority: "high" },
              { id: "issue-2", message: "Issue 2", priority: "low" },
            ],
          },
        ],
      });

      const result = await dispatchCommand("status", {});

      expect(result.data?.issues?.total).toBe(2);
      expect(result.data?.issues?.by_priority?.high).toBe(1);
      expect(result.data?.issues?.by_priority?.low).toBe(1);
    });

    it("includes AI suggestion count", async () => {
      useModelStore.setState({
        elements: [
          {
            ...createTestElement("wall-1", "wall", "Wall 1"),
            aiSuggestions: [
              { id: "sug-1", suggestion: "Suggestion 1" },
            ],
          },
        ],
      });

      const result = await dispatchCommand("status", {});

      expect(result.data?.ai_suggestions).toBe(1);
    });
  });

  describe("Version Command", () => {
    it("returns version information", async () => {
      const result = await dispatchCommand("version", {});

      expect(result.success).toBe(true);
      expect(result.message).toContain("Pensaer");
      expect(result.data?.version).toBeDefined();
      expect(result.data?.phase).toBeDefined();
      expect(result.data?.kernel).toBeDefined();
    });

    it("includes environment info", async () => {
      const result = await dispatchCommand("version", {});

      expect(result.data?.client).toBeDefined();
      expect(result.data?.build_date).toBeDefined();
    });
  });

  describe("Echo Command", () => {
    it("echoes text argument", async () => {
      const result = await dispatchCommand("echo", { text: "Hello World" });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Hello World");
      expect(result.data?.output).toBe("Hello World");
    });

    it("handles empty input", async () => {
      const result = await dispatchCommand("echo", {});

      expect(result.success).toBe(true);
      expect(result.message).toBe("");
    });

    it("uses raw args when text not provided", async () => {
      const result = await dispatchCommand("echo", { _raw: ["Hello", "World"] });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Hello World");
    });
  });

  describe("Macro Command", () => {
    describe("No subcommand", () => {
      it("shows macro help when no subcommand", async () => {
        const result = await dispatchCommand("macro", {});

        expect(result.success).toBe(true);
        expect(result.message).toContain("Macro");
        expect(result.data?.subcommands).toBeDefined();
        expect(Array.isArray(result.data?.subcommands)).toBe(true);
      });
    });

    describe("macro record", () => {
      it("starts recording a new macro", async () => {
        const result = await dispatchCommand("macro", {
          subcommand: "record",
          name: "test-macro",
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain("Recording");
        expect(result.data?.macro_name).toBe("test-macro");
        expect(result.data?.status).toBe("recording");
      });

      it("fails without name", async () => {
        const result = await dispatchCommand("macro", { subcommand: "record" });

        expect(result.success).toBe(false);
        expect(result.message).toContain("Usage");
      });
    });

    describe("macro stop", () => {
      it("stops recording and saves macro", async () => {
        // Start recording
        useMacroStore.getState().startRecording("test-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");

        const result = await dispatchCommand("macro", { subcommand: "stop" });

        expect(result.success).toBe(true);
        expect(result.message).toContain("saved");
        expect(result.data?.macro_name).toBe("test-macro");
        expect(result.data?.commands).toBe(1);
      });

      it("fails if not recording", async () => {
        const result = await dispatchCommand("macro", { subcommand: "stop" });

        expect(result.success).toBe(false);
        expect(result.message).toContain("Not currently recording");
      });
    });

    describe("macro cancel", () => {
      it("cancels recording without saving", async () => {
        useMacroStore.getState().startRecording("test-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");

        const result = await dispatchCommand("macro", { subcommand: "cancel" });

        expect(result.success).toBe(true);
        expect(result.message).toContain("cancelled");
        expect(useMacroStore.getState().macros["test-macro"]).toBeUndefined();
      });

      it("fails if not recording", async () => {
        const result = await dispatchCommand("macro", { subcommand: "cancel" });

        expect(result.success).toBe(false);
        expect(result.message).toContain("Not currently recording");
      });
    });

    describe("macro list", () => {
      it("lists saved macros", async () => {
        // Create some macros
        useMacroStore.getState().startRecording("macro-1");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().stopRecording();

        useMacroStore.getState().startRecording("macro-2");
        useMacroStore.getState().recordCommand("floor --min 0,0 --max 5,5");
        useMacroStore.getState().stopRecording();

        const result = await dispatchCommand("macro", { subcommand: "list" });

        expect(result.success).toBe(true);
        expect(result.data?.macros).toHaveLength(2);
        expect(result.data?.total).toBe(2);
      });

      it("handles empty macro list", async () => {
        const result = await dispatchCommand("macro", { subcommand: "list" });

        expect(result.success).toBe(true);
        expect(result.message).toContain("No macros");
        expect(result.data?.macros).toHaveLength(0);
      });
    });

    describe("macro play", () => {
      beforeEach(() => {
        // Create a macro for playback tests
        useMacroStore.getState().startRecording("playback-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().stopRecording();
      });

      it("starts playback of existing macro", async () => {
        const result = await dispatchCommand("macro", {
          subcommand: "play",
          name: "playback-macro",
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain("Playing");
        expect(result.data?.macro_name).toBe("playback-macro");
        expect(result.data?.status).toBe("playing");
      });

      it("fails without name", async () => {
        const result = await dispatchCommand("macro", { subcommand: "play" });

        expect(result.success).toBe(false);
        expect(result.message).toContain("Usage");
      });

      it("fails for non-existent macro", async () => {
        const result = await dispatchCommand("macro", {
          subcommand: "play",
          name: "non-existent",
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain("not found");
      });
    });

    describe("macro delete", () => {
      beforeEach(() => {
        useMacroStore.getState().startRecording("delete-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().stopRecording();
      });

      it("deletes existing macro", async () => {
        const result = await dispatchCommand("macro", {
          subcommand: "delete",
          name: "delete-macro",
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain("deleted");
        expect(useMacroStore.getState().macros["delete-macro"]).toBeUndefined();
      });

      it("fails without name", async () => {
        const result = await dispatchCommand("macro", { subcommand: "delete" });

        expect(result.success).toBe(false);
        expect(result.message).toContain("Usage");
      });

      it("fails for non-existent macro", async () => {
        const result = await dispatchCommand("macro", {
          subcommand: "delete",
          name: "non-existent",
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain("not found");
      });
    });

    describe("macro export", () => {
      it("exports macros as JSON", async () => {
        useMacroStore.getState().startRecording("export-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().stopRecording();

        const result = await dispatchCommand("macro", { subcommand: "export" });

        expect(result.success).toBe(true);
        expect(result.message).toContain("exported");
        expect(result.data?.json).toBeDefined();
        expect(typeof result.data?.json).toBe("string");
        expect(result.data?.macro_count).toBe(1);
      });
    });

    describe("unknown subcommand", () => {
      it("returns error for unknown subcommand", async () => {
        const result = await dispatchCommand("macro", { subcommand: "invalid" });

        expect(result.success).toBe(false);
        expect(result.message).toContain("Unknown");
        expect(result.data?.valid_subcommands).toBeDefined();
      });
    });
  });
});
