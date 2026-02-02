/**
 * History Commands Tests
 *
 * Tests for the undo and redo terminal command handlers.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useHistoryStore, initializeHistory } from "../../stores/historyStore";
import { useModelStore } from "../../stores/modelStore";
import { registerHistoryCommands } from "../handlers/historyCommands";
import { dispatchCommand } from "../../services/commandDispatcher";
import type { Element } from "../../types";

// Mock the MCP client (required for command system initialization)
vi.mock("../../services/mcpClient", () => ({
  mcpClient: {
    callTool: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

// Helper to create a test element
const createTestElement = (id: string, name: string): Element => ({
  id,
  type: "wall",
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

describe("historyCommands", () => {
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
      batchStack: [],
      isBatching: false,
    });

    // Register commands and initialize history
    registerHistoryCommands();
    initializeHistory();
  });

  describe("undo command", () => {
    it("should return failure when nothing to undo", async () => {
      const result = await dispatchCommand("undo", {});
      expect(result.success).toBe(false);
      expect(result.message).toBe("Nothing to undo");
    });

    it("should undo the last action", async () => {
      // Add an element and record it
      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Create wall wall-1");

      expect(useModelStore.getState().elements).toHaveLength(1);

      const result = await dispatchCommand("undo", {});
      expect(result.success).toBe(true);
      expect(result.message).toContain("Undo");
      expect(result.message).toContain("Create wall wall-1");
      expect(useModelStore.getState().elements).toHaveLength(0);
    });

    it("should report undo/redo availability in data", async () => {
      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Create wall wall-1");

      useModelStore.getState().addElement(createTestElement("wall-2", "Wall 2"));
      useHistoryStore.getState().recordAction("Create wall wall-2");

      const result = await dispatchCommand("undo", {});
      expect(result.success).toBe(true);
      expect(result.data?.can_undo).toBe(true);
      expect(result.data?.can_redo).toBe(true);
    });

    it("should undo multiple times sequentially", async () => {
      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Create wall wall-1");

      useModelStore.getState().addElement(createTestElement("wall-2", "Wall 2"));
      useHistoryStore.getState().recordAction("Create wall wall-2");

      await dispatchCommand("undo", {});
      expect(useModelStore.getState().elements).toHaveLength(1);

      await dispatchCommand("undo", {});
      expect(useModelStore.getState().elements).toHaveLength(0);

      // Third undo should fail - at initial state
      const result = await dispatchCommand("undo", {});
      expect(result.success).toBe(false);
    });
  });

  describe("redo command", () => {
    it("should return failure when nothing to redo", async () => {
      const result = await dispatchCommand("redo", {});
      expect(result.success).toBe(false);
      expect(result.message).toBe("Nothing to redo");
    });

    it("should redo an undone action", async () => {
      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Create wall wall-1");

      // Undo then redo
      await dispatchCommand("undo", {});
      expect(useModelStore.getState().elements).toHaveLength(0);

      const result = await dispatchCommand("redo", {});
      expect(result.success).toBe(true);
      expect(result.message).toContain("Redo");
      expect(result.message).toContain("Create wall wall-1");
      expect(useModelStore.getState().elements).toHaveLength(1);
    });

    it("should report availability after redo", async () => {
      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Create wall wall-1");

      await dispatchCommand("undo", {});
      const result = await dispatchCommand("redo", {});

      expect(result.data?.can_undo).toBe(true);
      expect(result.data?.can_redo).toBe(false);
    });
  });

  describe("undo + redo interaction", () => {
    it("should support undo then redo round-trip", async () => {
      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Create wall wall-1");

      const elementsBefore = useModelStore.getState().elements.length;

      await dispatchCommand("undo", {});
      expect(useModelStore.getState().elements).toHaveLength(0);

      await dispatchCommand("redo", {});
      expect(useModelStore.getState().elements).toHaveLength(elementsBefore);
      expect(useModelStore.getState().elements[0].name).toBe("Wall 1");
    });
  });
});
