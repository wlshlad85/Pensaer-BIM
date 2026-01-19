/**
 * Pensaer BIM Platform - Selection Store Tests
 *
 * Comprehensive unit tests for the selection store.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSelectionStore } from "../selectionStore";

describe("selectionStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useSelectionStore.setState({
      selectedIds: [],
      hoveredId: null,
      highlightedIds: [],
    });
  });

  describe("Selection Operations", () => {
    it("should select a single element", () => {
      useSelectionStore.getState().select("element-1");

      expect(useSelectionStore.getState().selectedIds).toEqual(["element-1"]);
    });

    it("should replace selection when selecting new element", () => {
      useSelectionStore.getState().select("element-1");
      useSelectionStore.getState().select("element-2");

      expect(useSelectionStore.getState().selectedIds).toEqual(["element-2"]);
    });

    it("should select multiple elements at once", () => {
      useSelectionStore.getState().selectMultiple(["el-1", "el-2", "el-3"]);

      expect(useSelectionStore.getState().selectedIds).toHaveLength(3);
      expect(useSelectionStore.getState().selectedIds).toContain("el-1");
      expect(useSelectionStore.getState().selectedIds).toContain("el-2");
      expect(useSelectionStore.getState().selectedIds).toContain("el-3");
    });

    it("should add element to existing selection", () => {
      useSelectionStore.getState().select("element-1");
      useSelectionStore.getState().addToSelection("element-2");

      expect(useSelectionStore.getState().selectedIds).toEqual([
        "element-1",
        "element-2",
      ]);
    });

    it("should not duplicate element when adding to selection", () => {
      useSelectionStore.getState().select("element-1");
      useSelectionStore.getState().addToSelection("element-1");

      expect(useSelectionStore.getState().selectedIds).toEqual(["element-1"]);
    });

    it("should remove element from selection", () => {
      useSelectionStore.getState().selectMultiple(["el-1", "el-2", "el-3"]);
      useSelectionStore.getState().removeFromSelection("el-2");

      expect(useSelectionStore.getState().selectedIds).toEqual(["el-1", "el-3"]);
    });

    it("should handle removing non-existent element", () => {
      useSelectionStore.getState().selectMultiple(["el-1", "el-2"]);
      useSelectionStore.getState().removeFromSelection("non-existent");

      expect(useSelectionStore.getState().selectedIds).toEqual(["el-1", "el-2"]);
    });

    it("should toggle selection - add when not selected", () => {
      useSelectionStore.getState().toggleSelection("element-1");

      expect(useSelectionStore.getState().selectedIds).toContain("element-1");
    });

    it("should toggle selection - remove when selected", () => {
      useSelectionStore.getState().select("element-1");
      useSelectionStore.getState().toggleSelection("element-1");

      expect(useSelectionStore.getState().selectedIds).not.toContain("element-1");
    });

    it("should clear all selections", () => {
      useSelectionStore.getState().selectMultiple(["el-1", "el-2", "el-3"]);
      useSelectionStore.getState().clearSelection();

      expect(useSelectionStore.getState().selectedIds).toHaveLength(0);
    });

    it("should select all provided IDs", () => {
      const allIds = ["el-1", "el-2", "el-3", "el-4", "el-5"];
      useSelectionStore.getState().selectAll(allIds);

      expect(useSelectionStore.getState().selectedIds).toHaveLength(5);
      expect(useSelectionStore.getState().selectedIds).toEqual(allIds);
    });

    it("should replace existing selection when selecting all", () => {
      useSelectionStore.getState().select("old-element");
      useSelectionStore.getState().selectAll(["new-1", "new-2"]);

      expect(useSelectionStore.getState().selectedIds).toEqual(["new-1", "new-2"]);
    });
  });

  describe("Hover Operations", () => {
    it("should set hovered element", () => {
      useSelectionStore.getState().setHovered("element-1");

      expect(useSelectionStore.getState().hoveredId).toBe("element-1");
    });

    it("should clear hovered element", () => {
      useSelectionStore.getState().setHovered("element-1");
      useSelectionStore.getState().setHovered(null);

      expect(useSelectionStore.getState().hoveredId).toBeNull();
    });

    it("should replace hovered element", () => {
      useSelectionStore.getState().setHovered("element-1");
      useSelectionStore.getState().setHovered("element-2");

      expect(useSelectionStore.getState().hoveredId).toBe("element-2");
    });
  });

  describe("Highlight Operations", () => {
    it("should highlight multiple elements", () => {
      useSelectionStore.getState().highlight(["el-1", "el-2", "el-3"]);

      expect(useSelectionStore.getState().highlightedIds).toHaveLength(3);
    });

    it("should replace existing highlights", () => {
      useSelectionStore.getState().highlight(["old-1", "old-2"]);
      useSelectionStore.getState().highlight(["new-1"]);

      expect(useSelectionStore.getState().highlightedIds).toEqual(["new-1"]);
    });

    it("should clear all highlights", () => {
      useSelectionStore.getState().highlight(["el-1", "el-2"]);
      useSelectionStore.getState().clearHighlights();

      expect(useSelectionStore.getState().highlightedIds).toHaveLength(0);
    });
  });

  describe("Query Helpers", () => {
    beforeEach(() => {
      useSelectionStore.getState().selectMultiple(["sel-1", "sel-2"]);
      useSelectionStore.getState().setHovered("hov-1");
      useSelectionStore.getState().highlight(["hl-1", "hl-2", "hl-3"]);
    });

    it("should check if element is selected", () => {
      expect(useSelectionStore.getState().isSelected("sel-1")).toBe(true);
      expect(useSelectionStore.getState().isSelected("sel-2")).toBe(true);
      expect(useSelectionStore.getState().isSelected("not-selected")).toBe(false);
    });

    it("should check if element is hovered", () => {
      expect(useSelectionStore.getState().isHovered("hov-1")).toBe(true);
      expect(useSelectionStore.getState().isHovered("not-hovered")).toBe(false);
    });

    it("should check if element is highlighted", () => {
      expect(useSelectionStore.getState().isHighlighted("hl-1")).toBe(true);
      expect(useSelectionStore.getState().isHighlighted("hl-2")).toBe(true);
      expect(useSelectionStore.getState().isHighlighted("not-highlighted")).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty arrays", () => {
      useSelectionStore.getState().selectMultiple([]);
      useSelectionStore.getState().highlight([]);

      expect(useSelectionStore.getState().selectedIds).toHaveLength(0);
      expect(useSelectionStore.getState().highlightedIds).toHaveLength(0);
    });

    it("should handle rapid selection changes", () => {
      for (let i = 0; i < 100; i++) {
        useSelectionStore.getState().select(`element-${i}`);
      }

      expect(useSelectionStore.getState().selectedIds).toEqual(["element-99"]);
    });

    it("should maintain state independence", () => {
      // All three states should be independent
      useSelectionStore.getState().select("same-id");
      useSelectionStore.getState().setHovered("same-id");
      useSelectionStore.getState().highlight(["same-id"]);

      expect(useSelectionStore.getState().isSelected("same-id")).toBe(true);
      expect(useSelectionStore.getState().isHovered("same-id")).toBe(true);
      expect(useSelectionStore.getState().isHighlighted("same-id")).toBe(true);

      // Clearing one shouldn't affect others
      useSelectionStore.getState().clearSelection();

      expect(useSelectionStore.getState().isSelected("same-id")).toBe(false);
      expect(useSelectionStore.getState().isHovered("same-id")).toBe(true);
      expect(useSelectionStore.getState().isHighlighted("same-id")).toBe(true);
    });
  });
});
