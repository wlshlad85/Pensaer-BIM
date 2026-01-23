/**
 * Pensaer BIM Platform - Selection Hook
 *
 * Encapsulates selection logic including hit testing and box selection.
 * Syncs selection between 2D and 3D views automatically via selectionStore.
 */

import { useCallback } from "react";
import { useSelectionStore, useModelStore } from "../stores";
import type { Element } from "../types";

/**
 * Box bounds for selection rectangle
 */
interface BoxBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Check if an element intersects with a selection box.
 * Uses axis-aligned bounding box (AABB) intersection test.
 */
function elementIntersectsBox(element: Element, box: BoxBounds): boolean {
  // Element bounds
  const elMinX = element.x;
  const elMinY = element.y;
  const elMaxX = element.x + element.width;
  const elMaxY = element.y + element.height;

  // AABB intersection test
  return (
    elMinX < box.maxX &&
    elMaxX > box.minX &&
    elMinY < box.maxY &&
    elMaxY > box.minY
  );
}

/**
 * Check if an element is fully contained within a selection box.
 */
function elementContainedInBox(element: Element, box: BoxBounds): boolean {
  const elMinX = element.x;
  const elMinY = element.y;
  const elMaxX = element.x + element.width;
  const elMaxY = element.y + element.height;

  return (
    elMinX >= box.minX &&
    elMaxX <= box.maxX &&
    elMinY >= box.minY &&
    elMaxY <= box.maxY
  );
}

/**
 * Selection mode for box selection:
 * - "intersect": Select elements that touch the box
 * - "contain": Only select elements fully inside the box
 */
export type BoxSelectMode = "intersect" | "contain";

export function useSelection() {
  const elements = useModelStore((s) => s.elements);

  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const select = useSelectionStore((s) => s.select);
  const selectMultiple = useSelectionStore((s) => s.selectMultiple);
  const addToSelection = useSelectionStore((s) => s.addToSelection);
  const removeFromSelection = useSelectionStore((s) => s.removeFromSelection);
  const toggleSelection = useSelectionStore((s) => s.toggleSelection);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const selectAll = useSelectionStore((s) => s.selectAll);
  const setHovered = useSelectionStore((s) => s.setHovered);

  /**
   * Handle single-click selection on an element.
   * @param elementId - The element to select
   * @param modifiers - Keyboard modifiers (shift, ctrl/cmd)
   */
  const handleClick = useCallback(
    (
      elementId: string,
      modifiers: { shift: boolean; ctrl: boolean } = { shift: false, ctrl: false }
    ) => {
      if (modifiers.ctrl) {
        // Ctrl+click: Toggle element in selection
        toggleSelection(elementId);
      } else if (modifiers.shift) {
        // Shift+click: Add to selection
        addToSelection(elementId);
      } else {
        // Regular click: Replace selection
        select(elementId);
      }
    },
    [select, addToSelection, toggleSelection]
  );

  /**
   * Get elements within a box selection rectangle.
   * @param startX - Box start X
   * @param startY - Box start Y
   * @param endX - Box end X
   * @param endY - Box end Y
   * @param mode - Selection mode ("intersect" or "contain")
   * @returns Array of element IDs within the box
   */
  const getElementsInBox = useCallback(
    (
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      mode: BoxSelectMode = "intersect"
    ): string[] => {
      // Normalize box bounds (handle negative drag directions)
      const box: BoxBounds = {
        minX: Math.min(startX, endX),
        minY: Math.min(startY, endY),
        maxX: Math.max(startX, endX),
        maxY: Math.max(startY, endY),
      };

      // Skip if box is too small
      const boxWidth = box.maxX - box.minX;
      const boxHeight = box.maxY - box.minY;
      if (boxWidth < 5 && boxHeight < 5) {
        return [];
      }

      // Find elements that match the selection criteria
      const matchingIds: string[] = [];
      const testFn =
        mode === "contain" ? elementContainedInBox : elementIntersectsBox;

      for (const element of elements) {
        if (testFn(element, box)) {
          matchingIds.push(element.id);
        }
      }

      return matchingIds;
    },
    [elements]
  );

  /**
   * Complete a box selection, updating the selection store.
   * @param startX - Box start X
   * @param startY - Box start Y
   * @param endX - Box end X
   * @param endY - Box end Y
   * @param additive - If true, add to existing selection (shift key)
   * @param mode - Selection mode ("intersect" or "contain")
   */
  const completeBoxSelection = useCallback(
    (
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      additive: boolean = false,
      mode: BoxSelectMode = "intersect"
    ) => {
      const idsInBox = getElementsInBox(startX, startY, endX, endY, mode);

      if (idsInBox.length === 0) {
        // No elements in box - clear selection if not additive
        if (!additive) {
          clearSelection();
        }
        return;
      }

      if (additive) {
        // Add new elements to existing selection (avoid duplicates)
        const newSelection = [...selectedIds];
        for (const id of idsInBox) {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        }
        selectMultiple(newSelection);
      } else {
        // Replace selection with box contents
        selectMultiple(idsInBox);
      }
    },
    [getElementsInBox, selectedIds, clearSelection, selectMultiple]
  );

  /**
   * Select all elements in the model.
   */
  const handleSelectAll = useCallback(() => {
    selectAll(elements.map((el) => el.id));
  }, [elements, selectAll]);

  /**
   * Deselect all elements (usually on Escape key).
   */
  const handleDeselect = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  /**
   * Get currently selected elements.
   */
  const getSelectedElements = useCallback((): Element[] => {
    return elements.filter((el) => selectedIds.includes(el.id));
  }, [elements, selectedIds]);

  /**
   * Get selection count info for status bar.
   */
  const getSelectionInfo = useCallback((): string => {
    const count = selectedIds.length;
    if (count === 0) return "Nothing selected";
    if (count === 1) {
      const element = elements.find((el) => el.id === selectedIds[0]);
      return element ? `${element.name} selected` : "1 selected";
    }
    return `${count} elements selected`;
  }, [selectedIds, elements]);

  return {
    // State
    selectedIds,

    // Single element actions
    handleClick,
    select,
    toggleSelection,
    addToSelection,
    removeFromSelection,

    // Multi-element actions
    selectMultiple,
    selectAll: handleSelectAll,
    clearSelection: handleDeselect,

    // Box selection
    getElementsInBox,
    completeBoxSelection,

    // Hover
    setHovered,

    // Queries
    getSelectedElements,
    getSelectionInfo,
  };
}
