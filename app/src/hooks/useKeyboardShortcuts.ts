/**
 * Pensaer BIM Platform - Keyboard Shortcuts Hook
 *
 * Global keyboard shortcut handling for the BIM editor.
 */

import { useEffect, useCallback } from "react";
import {
  useUIStore,
  useSelectionStore,
  useModelStore,
  useHistoryStore,
} from "../stores";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const setTool = useUIStore((s) => s.setTool);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const toggleLayersPanel = useUIStore((s) => s.toggleLayersPanel);
  const toggleKeyboardShortcuts = useUIStore((s) => s.toggleKeyboardShortcuts);
  const toggleTerminal = useUIStore((s) => s.toggleTerminal);
  const showAllLayers = useUIStore((s) => s.showAllLayers);
  const zoomIn = useUIStore((s) => s.zoomIn);
  const zoomOut = useUIStore((s) => s.zoomOut);
  const zoomToFit = useUIStore((s) => s.zoomToFit);
  const pan = useUIStore((s) => s.pan);
  const toggleSnapEnabled = useUIStore((s) => s.toggleSnapEnabled);
  const toggleGridSnap = useUIStore((s) => s.toggleGridSnap);
  const toggleObjectSnap = useUIStore((s) => s.toggleObjectSnap);
  const snap = useUIStore((s) => s.snap);
  const triggerDemo = useUIStore((s) => s.triggerDemo);

  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const selectedIds = useSelectionStore((s) => s.selectedIds);

  const elements = useModelStore((s) => s.elements);
  const deleteElements = useModelStore((s) => s.deleteElements);
  const selectAll = useSelectionStore((s) => s.selectAll);

  // Layer visibility and lock state for filtering selectable elements
  const hiddenLayers = useUIStore((s) => s.hiddenLayers);
  const lockedLayers = useUIStore((s) => s.lockedLayers);

  const addToast = useUIStore((s) => s.addToast);

  // History (undo/redo)
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const startBatch = useHistoryStore((s) => s.startBatch);
  const endBatch = useHistoryStore((s) => s.endBatch);

  // Element movement
  const updateElement = useModelStore((s) => s.updateElement);

  // Movement distance in mm (grid-aligned)
  const MOVE_DISTANCE = 50; // 50mm = 5cm default move
  const MOVE_DISTANCE_LARGE = 500; // 500mm = 50cm with Shift

  // Pan distance in pixels
  const PAN_DISTANCE = 50; // 50px default pan
  const PAN_DISTANCE_LARGE = 200; // 200px with Shift

  // Move selected elements by delta
  const moveSelectedElements = useCallback(
    (dx: number, dy: number, large: boolean) => {
      if (selectedIds.length === 0) return;

      const distance = large ? MOVE_DISTANCE_LARGE : MOVE_DISTANCE;
      const actualDx = dx * distance;
      const actualDy = dy * distance;

      // Use batch to group all moves as single undo action
      const batchId = startBatch(`Move ${selectedIds.length} element(s)`);

      selectedIds.forEach((id) => {
        const element = elements.find((el) => el.id === id);
        if (element) {
          updateElement(id, {
            x: element.x + actualDx,
            y: element.y + actualDy,
          });
        }
      });

      endBatch(batchId);
      addToast("info", `Moved ${selectedIds.length} element(s)`);
    },
    [selectedIds, elements, updateElement, startBatch, endBatch, addToast]
  );

  // Pan view by delta (when no selection)
  const panView = useCallback(
    (dx: number, dy: number, large: boolean) => {
      const distance = large ? PAN_DISTANCE_LARGE : PAN_DISTANCE;
      pan(dx * distance, dy * distance);
    },
    [pan]
  );

  // Cycle through elements with Tab
  const cycleSelection = useCallback(
    (reverse: boolean) => {
      const selectableElements = elements.filter(
        (e) => !hiddenLayers.has(e.type) && !lockedLayers.has(e.type)
      );

      if (selectableElements.length === 0) return;

      const currentId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
      const currentIndex = currentId
        ? selectableElements.findIndex((e) => e.id === currentId)
        : -1;

      let nextIndex: number;
      if (reverse) {
        nextIndex = currentIndex <= 0
          ? selectableElements.length - 1
          : currentIndex - 1;
      } else {
        nextIndex = currentIndex >= selectableElements.length - 1
          ? 0
          : currentIndex + 1;
      }

      const nextElement = selectableElements[nextIndex];
      if (nextElement) {
        clearSelection();
        useSelectionStore.getState().addToSelection(nextElement.id);
        addToast("info", `Selected: ${nextElement.name || nextElement.type}`);
      }
    },
    [elements, hiddenLayers, lockedLayers, selectedIds, clearSelection, addToast]
  );

  // Define shortcuts
  const shortcuts: ShortcutConfig[] = [
    // Tools
    { key: "v", action: () => setTool("select"), description: "Select tool" },
    { key: "w", action: () => setTool("wall"), description: "Wall tool" },
    { key: "d", action: () => setTool("door"), description: "Door tool" },
    { key: "n", action: () => setTool("window"), description: "Window tool" },
    { key: "m", action: () => setTool("room"), description: "Room tool" },
    { key: "f", action: () => setTool("floor"), description: "Floor tool" },
    { key: "r", action: () => setTool("roof"), description: "Roof tool" },

    // Views
    { key: "2", action: () => setViewMode("2d"), description: "2D view" },
    { key: "3", action: () => setViewMode("3d"), description: "3D view" },

    // Panels
    { key: "l", action: toggleLayersPanel, description: "Toggle layers panel" },
    {
      key: "l",
      shift: true,
      action: showAllLayers,
      description: "Show all layers",
    },

    // Snap toggles
    {
      key: "s",
      action: () => {
        toggleSnapEnabled();
        addToast("info", `Snap ${!snap.enabled ? "ON" : "OFF"}`);
      },
      description: "Toggle snap",
    },
    {
      key: "g",
      action: () => {
        toggleGridSnap();
        addToast("info", `Grid snap ${!snap.grid ? "ON" : "OFF"}`);
      },
      description: "Toggle grid snap",
    },
    {
      key: "o",
      action: () => {
        toggleObjectSnap();
        const objectSnapOn = !(snap.endpoint || snap.midpoint);
        addToast("info", `Object snap ${objectSnapOn ? "ON" : "OFF"}`);
      },
      description: "Toggle object snap",
    },

    // Zoom
    { key: "=", ctrl: true, action: zoomIn, description: "Zoom in" },
    { key: "-", ctrl: true, action: zoomOut, description: "Zoom out" },
    { key: "0", ctrl: true, action: zoomToFit, description: "Zoom to fit" },

    // Command palette
    {
      key: "k",
      ctrl: true,
      action: toggleCommandPalette,
      description: "Command palette",
    },
    {
      key: "k",
      meta: true,
      action: toggleCommandPalette,
      description: "Command palette",
    },

    // Terminal toggle (Ctrl+` or Cmd+`)
    {
      key: "`",
      ctrl: true,
      action: toggleTerminal,
      description: "Toggle terminal",
    },
    {
      key: "`",
      meta: true,
      action: toggleTerminal,
      description: "Toggle terminal",
    },

    // Selection - filter by layer visibility and lock state
    {
      key: "a",
      ctrl: true,
      action: () => {
        const selectableIds = elements
          .filter(
            (e) => !hiddenLayers.has(e.type) && !lockedLayers.has(e.type)
          )
          .map((e) => e.id);
        selectAll(selectableIds);
        addToast("info", `Selected ${selectableIds.length} element(s)`);
      },
      description: "Select all",
    },
    {
      key: "a",
      meta: true,
      action: () => {
        const selectableIds = elements
          .filter(
            (e) => !hiddenLayers.has(e.type) && !lockedLayers.has(e.type)
          )
          .map((e) => e.id);
        selectAll(selectableIds);
        addToast("info", `Selected ${selectableIds.length} element(s)`);
      },
      description: "Select all",
    },
    {
      key: "Escape",
      action: () => {
        if (selectedIds.length > 0) {
          clearSelection();
          addToast("info", "Selection cleared");
        }
      },
      description: "Clear selection",
    },

    // Delete
    {
      key: "Delete",
      action: () => {
        if (selectedIds.length > 0) {
          deleteElements(selectedIds);
          clearSelection();
          addToast("info", `Deleted ${selectedIds.length} element(s)`);
        }
      },
      description: "Delete selected",
    },
    {
      key: "Backspace",
      action: () => {
        if (selectedIds.length > 0) {
          deleteElements(selectedIds);
          clearSelection();
          addToast("info", `Deleted ${selectedIds.length} element(s)`);
        }
      },
      description: "Delete selected",
    },

    // Keyboard shortcuts help
    {
      key: "?",
      action: toggleKeyboardShortcuts,
      description: "Show keyboard shortcuts",
    },

    // Arrow key navigation - move selection OR pan view
    {
      key: "ArrowUp",
      action: () => {
        if (selectedIds.length > 0) {
          moveSelectedElements(0, -1, false);
        } else {
          panView(0, 1, false); // Pan up = positive Y
        }
      },
      description: "Move selection up / Pan view up",
    },
    {
      key: "ArrowDown",
      action: () => {
        if (selectedIds.length > 0) {
          moveSelectedElements(0, 1, false);
        } else {
          panView(0, -1, false); // Pan down = negative Y
        }
      },
      description: "Move selection down / Pan view down",
    },
    {
      key: "ArrowLeft",
      action: () => {
        if (selectedIds.length > 0) {
          moveSelectedElements(-1, 0, false);
        } else {
          panView(1, 0, false); // Pan left = positive X
        }
      },
      description: "Move selection left / Pan view left",
    },
    {
      key: "ArrowRight",
      action: () => {
        if (selectedIds.length > 0) {
          moveSelectedElements(1, 0, false);
        } else {
          panView(-1, 0, false); // Pan right = negative X
        }
      },
      description: "Move selection right / Pan view right",
    },
    // Arrow keys with Shift - larger movement/pan
    {
      key: "ArrowUp",
      shift: true,
      action: () => {
        if (selectedIds.length > 0) {
          moveSelectedElements(0, -1, true);
        } else {
          panView(0, 1, true);
        }
      },
      description: "Move selection up (large) / Pan view up (large)",
    },
    {
      key: "ArrowDown",
      shift: true,
      action: () => {
        if (selectedIds.length > 0) {
          moveSelectedElements(0, 1, true);
        } else {
          panView(0, -1, true);
        }
      },
      description: "Move selection down (large) / Pan view down (large)",
    },
    {
      key: "ArrowLeft",
      shift: true,
      action: () => {
        if (selectedIds.length > 0) {
          moveSelectedElements(-1, 0, true);
        } else {
          panView(1, 0, true);
        }
      },
      description: "Move selection left (large) / Pan view left (large)",
    },
    {
      key: "ArrowRight",
      shift: true,
      action: () => {
        if (selectedIds.length > 0) {
          moveSelectedElements(1, 0, true);
        } else {
          panView(-1, 0, true);
        }
      },
      description: "Move selection right (large) / Pan view right (large)",
    },

    // Tab - cycle through elements
    {
      key: "Tab",
      action: () => cycleSelection(false),
      description: "Select next element",
    },
    {
      key: "Tab",
      shift: true,
      action: () => cycleSelection(true),
      description: "Select previous element",
    },

    // Home - reset view to fit all
    {
      key: "Home",
      action: () => {
        zoomToFit();
        addToast("info", "View reset");
      },
      description: "Reset view to fit all",
    },

    // +/- zoom (without Ctrl)
    {
      key: "+",
      action: zoomIn,
      description: "Zoom in",
    },
    {
      key: "=",
      action: zoomIn,
      description: "Zoom in",
    },
    {
      key: "-",
      action: zoomOut,
      description: "Zoom out",
    },

    // Undo/Redo
    {
      key: "z",
      ctrl: true,
      action: () => {
        if (canUndo()) {
          undo();
          addToast("info", "Undo");
        }
      },
      description: "Undo",
    },
    {
      key: "z",
      meta: true,
      action: () => {
        if (canUndo()) {
          undo();
          addToast("info", "Undo");
        }
      },
      description: "Undo",
    },
    {
      key: "z",
      ctrl: true,
      shift: true,
      action: () => {
        if (canRedo()) {
          redo();
          addToast("info", "Redo");
        }
      },
      description: "Redo",
    },
    {
      key: "z",
      meta: true,
      shift: true,
      action: () => {
        if (canRedo()) {
          redo();
          addToast("info", "Redo");
        }
      },
      description: "Redo",
    },
    {
      key: "y",
      ctrl: true,
      action: () => {
        if (canRedo()) {
          redo();
          addToast("info", "Redo");
        }
      },
      description: "Redo (Ctrl+Y)",
    },

    // Demo automation
    {
      key: "d",
      ctrl: true,
      shift: true,
      action: () => {
        triggerDemo();
        addToast("info", "Starting demo...");
      },
      description: "Run demo",
    },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        // Handle both ctrl and meta for cross-platform
        const modifierMatch =
          shortcut.ctrl || shortcut.meta
            ? e.ctrlKey || e.metaKey
            : !e.ctrlKey && !e.metaKey;

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (shortcut.ctrl || shortcut.meta
            ? modifierMatch
            : ctrlMatch && metaMatch) &&
          shiftMatch &&
          altMatch
        ) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}
