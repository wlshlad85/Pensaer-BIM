/**
 * @vitest-environment jsdom
 */

/**
 * Pensaer BIM Platform - Selection Hook Tests
 *
 * Tests for the useSelection hook and box selection logic.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSelection } from "../useSelection";
import { useModelStore } from "../../stores/modelStore";
import { useSelectionStore } from "../../stores/selectionStore";
import type { Element } from "../../types";

// Test elements for box selection
const createTestElements = (): Element[] => [
  {
    id: "wall-1",
    type: "wall",
    name: "Wall 1",
    x: 100,
    y: 100,
    width: 200,
    height: 12,
    properties: {},
    relationships: {},
    issues: [],
    aiSuggestions: [],
  },
  {
    id: "wall-2",
    type: "wall",
    name: "Wall 2",
    x: 100,
    y: 200,
    width: 200,
    height: 12,
    properties: {},
    relationships: {},
    issues: [],
    aiSuggestions: [],
  },
  {
    id: "wall-3",
    type: "wall",
    name: "Wall 3",
    x: 400,
    y: 100,
    width: 200,
    height: 12,
    properties: {},
    relationships: {},
    issues: [],
    aiSuggestions: [],
  },
  {
    id: "room-1",
    type: "room",
    name: "Room 1",
    x: 110,
    y: 110,
    width: 180,
    height: 80,
    properties: {},
    relationships: {},
    issues: [],
    aiSuggestions: [],
  },
];

describe("useSelection Hook", () => {
  beforeEach(() => {
    // Reset stores before each test
    useSelectionStore.setState({
      selectedIds: [],
      hoveredId: null,
      highlightedIds: [],
    });
    useModelStore.setState({
      elements: createTestElements(),
    });
  });

  describe("handleClick", () => {
    it("should select single element on click", () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleClick("wall-1", { shift: false, ctrl: false });
      });

      expect(result.current.selectedIds).toEqual(["wall-1"]);
    });

    it("should replace selection on new click", () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleClick("wall-1", { shift: false, ctrl: false });
      });
      act(() => {
        result.current.handleClick("wall-2", { shift: false, ctrl: false });
      });

      expect(result.current.selectedIds).toEqual(["wall-2"]);
    });

    it("should add to selection with shift-click", () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleClick("wall-1", { shift: false, ctrl: false });
      });
      act(() => {
        result.current.handleClick("wall-2", { shift: true, ctrl: false });
      });

      expect(result.current.selectedIds).toContain("wall-1");
      expect(result.current.selectedIds).toContain("wall-2");
    });

    it("should toggle selection with ctrl-click", () => {
      const { result } = renderHook(() => useSelection());

      // Select wall-1
      act(() => {
        result.current.handleClick("wall-1", { shift: false, ctrl: false });
      });
      expect(result.current.selectedIds).toEqual(["wall-1"]);

      // Ctrl-click wall-1 to deselect
      act(() => {
        result.current.handleClick("wall-1", { shift: false, ctrl: true });
      });
      expect(result.current.selectedIds).toEqual([]);

      // Ctrl-click wall-1 to select again
      act(() => {
        result.current.handleClick("wall-1", { shift: false, ctrl: true });
      });
      expect(result.current.selectedIds).toEqual(["wall-1"]);
    });
  });

  describe("getElementsInBox", () => {
    it("should find elements that intersect with box", () => {
      const { result } = renderHook(() => useSelection());

      // Box that covers wall-1 and wall-2 but not wall-3
      const ids = result.current.getElementsInBox(50, 50, 350, 250, "intersect");

      expect(ids).toContain("wall-1");
      expect(ids).toContain("wall-2");
      expect(ids).toContain("room-1");
      expect(ids).not.toContain("wall-3");
    });

    it("should find elements fully contained in box", () => {
      const { result } = renderHook(() => useSelection());

      // Box that contains room-1 fully
      const ids = result.current.getElementsInBox(100, 100, 300, 200, "contain");

      expect(ids).toContain("room-1");
      // wall-1 extends to x=300, so should be contained
      expect(ids).toContain("wall-1");
    });

    it("should return empty array for small box", () => {
      const { result } = renderHook(() => useSelection());

      // Box too small (< 5x5)
      const ids = result.current.getElementsInBox(100, 100, 102, 102, "intersect");

      expect(ids).toEqual([]);
    });

    it("should handle reversed box coordinates", () => {
      const { result } = renderHook(() => useSelection());

      // Drag from bottom-right to top-left
      const ids = result.current.getElementsInBox(350, 250, 50, 50, "intersect");

      expect(ids).toContain("wall-1");
      expect(ids).toContain("wall-2");
    });
  });

  describe("completeBoxSelection", () => {
    it("should select elements in box", () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.completeBoxSelection(50, 50, 350, 150, false, "intersect");
      });

      expect(result.current.selectedIds).toContain("wall-1");
      expect(result.current.selectedIds).toContain("room-1");
      expect(result.current.selectedIds).not.toContain("wall-2"); // Below box
      expect(result.current.selectedIds).not.toContain("wall-3"); // To the right
    });

    it("should add to existing selection with additive=true", () => {
      const { result } = renderHook(() => useSelection());

      // First select wall-3
      act(() => {
        result.current.handleClick("wall-3", { shift: false, ctrl: false });
      });

      // Then add elements in box
      act(() => {
        result.current.completeBoxSelection(50, 50, 350, 150, true, "intersect");
      });

      // Should have wall-3 plus elements from box
      expect(result.current.selectedIds).toContain("wall-3");
      expect(result.current.selectedIds).toContain("wall-1");
      expect(result.current.selectedIds).toContain("room-1");
    });

    it("should clear selection when box is empty and not additive", () => {
      const { result } = renderHook(() => useSelection());

      // First select something
      act(() => {
        result.current.handleClick("wall-1", { shift: false, ctrl: false });
      });
      expect(result.current.selectedIds).toEqual(["wall-1"]);

      // Box select in empty area
      act(() => {
        result.current.completeBoxSelection(700, 700, 800, 800, false, "intersect");
      });

      expect(result.current.selectedIds).toEqual([]);
    });
  });

  describe("selectAll and clearSelection", () => {
    it("should select all elements", () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds).toHaveLength(4);
      expect(result.current.selectedIds).toContain("wall-1");
      expect(result.current.selectedIds).toContain("wall-2");
      expect(result.current.selectedIds).toContain("wall-3");
      expect(result.current.selectedIds).toContain("room-1");
    });

    it("should clear all selections", () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.selectAll();
      });
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds).toEqual([]);
    });
  });

  describe("getSelectionInfo", () => {
    it("should return 'Nothing selected' when empty", () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.getSelectionInfo()).toBe("Nothing selected");
    });

    it("should return element name when one selected", () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleClick("wall-1", { shift: false, ctrl: false });
      });

      expect(result.current.getSelectionInfo()).toBe("Wall 1 selected");
    });

    it("should return count when multiple selected", () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.handleClick("wall-1", { shift: false, ctrl: false });
        result.current.handleClick("wall-2", { shift: true, ctrl: false });
      });

      expect(result.current.getSelectionInfo()).toBe("2 elements selected");
    });
  });
});
