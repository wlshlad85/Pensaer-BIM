/**
 * Pensaer BIM Platform - History Store Tests
 *
 * Comprehensive unit tests for the history store (undo/redo).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useHistoryStore, initializeHistory } from "../historyStore";
import { useModelStore } from "../modelStore";
import type { Element } from "../../types";

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

describe("historyStore", () => {
  beforeEach(() => {
    // Reset both stores before each test
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
    });
  });

  describe("Initialization", () => {
    it("should initialize history with current model state", () => {
      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));

      initializeHistory();

      const { entries, currentIndex } = useHistoryStore.getState();
      expect(entries).toHaveLength(1);
      expect(currentIndex).toBe(0);
      expect(entries[0].description).toBe("Initial state");
      expect(entries[0].elements).toHaveLength(1);
    });

    it("should initialize with empty model", () => {
      initializeHistory();

      const { entries } = useHistoryStore.getState();
      expect(entries[0].elements).toHaveLength(0);
    });
  });

  describe("Recording Actions", () => {
    beforeEach(() => {
      initializeHistory();
    });

    it("should record a new action", () => {
      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Added wall");

      const { entries, currentIndex } = useHistoryStore.getState();
      expect(entries).toHaveLength(2);
      expect(currentIndex).toBe(1);
      expect(entries[1].description).toBe("Added wall");
    });

    it("should snapshot current elements", () => {
      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Added wall");

      const { entries } = useHistoryStore.getState();
      expect(entries[1].elements).toHaveLength(1);
      expect(entries[1].elements[0].name).toBe("Wall 1");
    });

    it("should truncate forward history when recording after undo", () => {
      // Record 3 actions
      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Added wall 1");

      useModelStore.getState().addElement(createTestElement("wall-2", "Wall 2"));
      useHistoryStore.getState().recordAction("Added wall 2");

      useModelStore.getState().addElement(createTestElement("wall-3", "Wall 3"));
      useHistoryStore.getState().recordAction("Added wall 3");

      // Undo twice
      useHistoryStore.getState().undo();
      useHistoryStore.getState().undo();

      // Record new action
      useModelStore.getState().addElement(createTestElement("wall-4", "Wall 4"));
      useHistoryStore.getState().recordAction("Added wall 4");

      const { entries, currentIndex } = useHistoryStore.getState();
      // Should have: initial + wall1 + wall4
      expect(entries).toHaveLength(3);
      expect(currentIndex).toBe(2);
      expect(entries[2].description).toBe("Added wall 4");
    });

    it("should not record action during undo/redo", () => {
      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Added wall");

      // Manually set isUndoing (simulating mid-undo)
      useHistoryStore.setState({ isUndoing: true });

      useModelStore.getState().addElement(createTestElement("wall-2", "Wall 2"));
      useHistoryStore.getState().recordAction("Should not record");

      expect(useHistoryStore.getState().entries).toHaveLength(2);
    });

    it("should enforce maximum history size", () => {
      // Record more than MAX_HISTORY_SIZE (50) actions
      for (let i = 0; i < 55; i++) {
        useModelStore.getState().addElement(createTestElement(`wall-${i}`, `Wall ${i}`));
        useHistoryStore.getState().recordAction(`Added wall ${i}`);
      }

      expect(useHistoryStore.getState().entries.length).toBeLessThanOrEqual(50);
    });
  });

  describe("Undo", () => {
    beforeEach(() => {
      initializeHistory();

      // Set up some history
      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Added wall 1");

      useModelStore.getState().addElement(createTestElement("wall-2", "Wall 2"));
      useHistoryStore.getState().recordAction("Added wall 2");
    });

    it("should undo last action", () => {
      expect(useModelStore.getState().elements).toHaveLength(2);

      useHistoryStore.getState().undo();

      expect(useHistoryStore.getState().currentIndex).toBe(1);
      expect(useModelStore.getState().elements).toHaveLength(1);
      expect(useModelStore.getState().elements[0].name).toBe("Wall 1");
    });

    it("should undo multiple times", () => {
      useHistoryStore.getState().undo();
      useHistoryStore.getState().undo();

      expect(useHistoryStore.getState().currentIndex).toBe(0);
      expect(useModelStore.getState().elements).toHaveLength(0);
    });

    it("should not undo past initial state", () => {
      useHistoryStore.getState().undo();
      useHistoryStore.getState().undo();
      useHistoryStore.getState().undo(); // Should do nothing

      expect(useHistoryStore.getState().currentIndex).toBe(0);
    });

    it("should report canUndo correctly", () => {
      expect(useHistoryStore.getState().canUndo()).toBe(true);

      useHistoryStore.getState().undo();
      expect(useHistoryStore.getState().canUndo()).toBe(true);

      useHistoryStore.getState().undo();
      expect(useHistoryStore.getState().canUndo()).toBe(false);
    });
  });

  describe("Redo", () => {
    beforeEach(() => {
      initializeHistory();

      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Added wall 1");

      useModelStore.getState().addElement(createTestElement("wall-2", "Wall 2"));
      useHistoryStore.getState().recordAction("Added wall 2");

      // Undo both
      useHistoryStore.getState().undo();
      useHistoryStore.getState().undo();
    });

    it("should redo last undone action", () => {
      expect(useModelStore.getState().elements).toHaveLength(0);

      useHistoryStore.getState().redo();

      expect(useHistoryStore.getState().currentIndex).toBe(1);
      expect(useModelStore.getState().elements).toHaveLength(1);
    });

    it("should redo multiple times", () => {
      useHistoryStore.getState().redo();
      useHistoryStore.getState().redo();

      expect(useHistoryStore.getState().currentIndex).toBe(2);
      expect(useModelStore.getState().elements).toHaveLength(2);
    });

    it("should not redo past latest state", () => {
      useHistoryStore.getState().redo();
      useHistoryStore.getState().redo();
      useHistoryStore.getState().redo(); // Should do nothing

      expect(useHistoryStore.getState().currentIndex).toBe(2);
    });

    it("should report canRedo correctly", () => {
      expect(useHistoryStore.getState().canRedo()).toBe(true);

      useHistoryStore.getState().redo();
      expect(useHistoryStore.getState().canRedo()).toBe(true);

      useHistoryStore.getState().redo();
      expect(useHistoryStore.getState().canRedo()).toBe(false);
    });
  });

  describe("Descriptions", () => {
    beforeEach(() => {
      initializeHistory();

      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Added wall 1");

      useModelStore.getState().addElement(createTestElement("wall-2", "Wall 2"));
      useHistoryStore.getState().recordAction("Added wall 2");
    });

    it("should get undo description", () => {
      expect(useHistoryStore.getState().getUndoDescription()).toBe("Added wall 2");
    });

    it("should get redo description after undo", () => {
      useHistoryStore.getState().undo();

      expect(useHistoryStore.getState().getRedoDescription()).toBe("Added wall 2");
    });

    it("should return null when nothing to undo", () => {
      useHistoryStore.getState().undo();
      useHistoryStore.getState().undo();

      expect(useHistoryStore.getState().getUndoDescription()).toBeNull();
    });

    it("should return null when nothing to redo", () => {
      expect(useHistoryStore.getState().getRedoDescription()).toBeNull();
    });
  });

  describe("History Management", () => {
    beforeEach(() => {
      initializeHistory();

      useModelStore.getState().addElement(createTestElement("wall-1", "Wall 1"));
      useHistoryStore.getState().recordAction("Added wall 1");
    });

    it("should clear history", () => {
      useHistoryStore.getState().clearHistory();

      const { entries, currentIndex } = useHistoryStore.getState();
      expect(entries).toHaveLength(0);
      expect(currentIndex).toBe(-1);
    });

    it("should get history count", () => {
      expect(useHistoryStore.getState().getHistoryCount()).toBe(2);

      useModelStore.getState().addElement(createTestElement("wall-2", "Wall 2"));
      useHistoryStore.getState().recordAction("Added wall 2");

      expect(useHistoryStore.getState().getHistoryCount()).toBe(3);
    });
  });

  describe("Element Independence", () => {
    it("should create independent snapshots", () => {
      initializeHistory();

      useModelStore.getState().addElement(createTestElement("wall-1", "Original"));
      useHistoryStore.getState().recordAction("Added wall");

      // Modify the element in model store
      useModelStore.getState().updateElement("wall-1", { name: "Modified" });
      useHistoryStore.getState().recordAction("Modified wall");

      // Undo should restore the original name
      useHistoryStore.getState().undo();

      const element = useModelStore.getState().getElementById("wall-1");
      expect(element?.name).toBe("Original");
    });
  });
});
