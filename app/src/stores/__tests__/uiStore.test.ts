/**
 * Pensaer BIM Platform - UI Store Tests
 *
 * Comprehensive unit tests for the UI store.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useUIStore } from "../uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUIStore.setState({
      activeTool: "select",
      isDrawing: false,
      drawStart: null,
      drawEnd: null,
      viewMode: "3d",
      zoom: 1,
      panX: 0,
      panY: 0,
      activeLevel: "Level 1",
      showCommandPalette: false,
      showPropertiesPanel: true,
      showLayersPanel: false,
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        targetId: null,
      },
      toasts: [],
      loadingOperations: [],
      isGlobalLoading: false,
    });

    // Mock timers for toast auto-dismiss
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Tool State", () => {
    it("should set active tool", () => {
      useUIStore.getState().setTool("wall");

      expect(useUIStore.getState().activeTool).toBe("wall");
    });

    it("should reset drawing state when changing tool", () => {
      useUIStore.getState().startDrawing(10, 20);
      expect(useUIStore.getState().isDrawing).toBe(true);

      useUIStore.getState().setTool("door");

      expect(useUIStore.getState().isDrawing).toBe(false);
      expect(useUIStore.getState().drawStart).toBeNull();
      expect(useUIStore.getState().drawEnd).toBeNull();
    });

    it("should start drawing", () => {
      useUIStore.getState().startDrawing(100, 200);

      expect(useUIStore.getState().isDrawing).toBe(true);
      expect(useUIStore.getState().drawStart).toEqual({ x: 100, y: 200 });
      expect(useUIStore.getState().drawEnd).toEqual({ x: 100, y: 200 });
    });

    it("should update drawing position", () => {
      useUIStore.getState().startDrawing(100, 200);
      useUIStore.getState().updateDrawing(300, 400);

      expect(useUIStore.getState().drawEnd).toEqual({ x: 300, y: 400 });
      expect(useUIStore.getState().drawStart).toEqual({ x: 100, y: 200 });
    });

    it("should not update drawing when not in drawing mode", () => {
      useUIStore.getState().updateDrawing(300, 400);

      expect(useUIStore.getState().drawEnd).toBeNull();
    });

    it("should finish drawing", () => {
      useUIStore.getState().startDrawing(100, 200);
      useUIStore.getState().finishDrawing();

      expect(useUIStore.getState().isDrawing).toBe(false);
      expect(useUIStore.getState().drawStart).toBeNull();
      expect(useUIStore.getState().drawEnd).toBeNull();
    });

    it("should cancel drawing", () => {
      useUIStore.getState().startDrawing(100, 200);
      useUIStore.getState().cancelDrawing();

      expect(useUIStore.getState().isDrawing).toBe(false);
      expect(useUIStore.getState().drawStart).toBeNull();
      expect(useUIStore.getState().drawEnd).toBeNull();
    });
  });

  describe("View State", () => {
    it("should set view mode", () => {
      useUIStore.getState().setViewMode("2d");

      expect(useUIStore.getState().viewMode).toBe("2d");
    });

    it("should set zoom level", () => {
      useUIStore.getState().setZoom(2.5);

      expect(useUIStore.getState().zoom).toBe(2.5);
    });

    it("should clamp zoom to minimum", () => {
      useUIStore.getState().setZoom(0.01);

      expect(useUIStore.getState().zoom).toBe(0.1);
    });

    it("should clamp zoom to maximum", () => {
      useUIStore.getState().setZoom(10);

      expect(useUIStore.getState().zoom).toBe(5);
    });

    it("should zoom in", () => {
      useUIStore.getState().setZoom(1);
      useUIStore.getState().zoomIn();

      expect(useUIStore.getState().zoom).toBeCloseTo(1.2);
    });

    it("should zoom out", () => {
      useUIStore.getState().setZoom(1);
      useUIStore.getState().zoomOut();

      expect(useUIStore.getState().zoom).toBeCloseTo(0.833, 2);
    });

    it("should zoom to fit", () => {
      useUIStore.getState().setZoom(2);
      useUIStore.getState().pan(100, 100);
      useUIStore.getState().zoomToFit();

      expect(useUIStore.getState().zoom).toBe(1);
      expect(useUIStore.getState().panX).toBe(0);
      expect(useUIStore.getState().panY).toBe(0);
    });

    it("should pan", () => {
      useUIStore.getState().pan(50, 30);

      expect(useUIStore.getState().panX).toBe(50);
      expect(useUIStore.getState().panY).toBe(30);
    });

    it("should accumulate pan values", () => {
      useUIStore.getState().pan(50, 30);
      useUIStore.getState().pan(20, 10);

      expect(useUIStore.getState().panX).toBe(70);
      expect(useUIStore.getState().panY).toBe(40);
    });

    it("should set active level", () => {
      useUIStore.getState().setActiveLevel("Level 2");

      expect(useUIStore.getState().activeLevel).toBe("Level 2");
    });
  });

  describe("Panel State", () => {
    it("should toggle command palette", () => {
      expect(useUIStore.getState().showCommandPalette).toBe(false);

      useUIStore.getState().toggleCommandPalette();
      expect(useUIStore.getState().showCommandPalette).toBe(true);

      useUIStore.getState().toggleCommandPalette();
      expect(useUIStore.getState().showCommandPalette).toBe(false);
    });

    it("should open command palette", () => {
      useUIStore.getState().openCommandPalette();

      expect(useUIStore.getState().showCommandPalette).toBe(true);
    });

    it("should close command palette", () => {
      useUIStore.getState().openCommandPalette();
      useUIStore.getState().closeCommandPalette();

      expect(useUIStore.getState().showCommandPalette).toBe(false);
    });

    it("should toggle properties panel", () => {
      expect(useUIStore.getState().showPropertiesPanel).toBe(true);

      useUIStore.getState().togglePropertiesPanel();
      expect(useUIStore.getState().showPropertiesPanel).toBe(false);

      useUIStore.getState().togglePropertiesPanel();
      expect(useUIStore.getState().showPropertiesPanel).toBe(true);
    });

    it("should toggle layers panel", () => {
      expect(useUIStore.getState().showLayersPanel).toBe(false);

      useUIStore.getState().toggleLayersPanel();
      expect(useUIStore.getState().showLayersPanel).toBe(true);
    });
  });

  describe("Context Menu", () => {
    it("should show context menu", () => {
      useUIStore.getState().showContextMenu(150, 200, "element-1");

      const { contextMenu } = useUIStore.getState();
      expect(contextMenu.visible).toBe(true);
      expect(contextMenu.x).toBe(150);
      expect(contextMenu.y).toBe(200);
      expect(contextMenu.targetId).toBe("element-1");
    });

    it("should show context menu with null target", () => {
      useUIStore.getState().showContextMenu(100, 100, null);

      expect(useUIStore.getState().contextMenu.targetId).toBeNull();
    });

    it("should hide context menu", () => {
      useUIStore.getState().showContextMenu(150, 200, "element-1");
      useUIStore.getState().hideContextMenu();

      expect(useUIStore.getState().contextMenu.visible).toBe(false);
    });
  });

  describe("Toast Notifications", () => {
    it("should add a toast", () => {
      useUIStore.getState().addToast("success", "Operation completed");

      expect(useUIStore.getState().toasts).toHaveLength(1);
      expect(useUIStore.getState().toasts[0].type).toBe("success");
      expect(useUIStore.getState().toasts[0].message).toBe("Operation completed");
    });

    it("should auto-dismiss success toast after 4 seconds", () => {
      useUIStore.getState().addToast("success", "Done!");

      expect(useUIStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(4000);

      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it("should auto-dismiss info toast after 4 seconds", () => {
      useUIStore.getState().addToast("info", "Info message");

      vi.advanceTimersByTime(4000);

      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it("should auto-dismiss warning toast after 6 seconds", () => {
      useUIStore.getState().addToast("warning", "Warning!");

      vi.advanceTimersByTime(4000);
      expect(useUIStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(2000);
      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it("should not auto-dismiss error toast", () => {
      useUIStore.getState().addToast("error", "Error occurred!");

      vi.advanceTimersByTime(10000);

      expect(useUIStore.getState().toasts).toHaveLength(1);
    });

    it("should remove toast manually", () => {
      useUIStore.getState().addToast("error", "Error!");
      const toastId = useUIStore.getState().toasts[0].id;

      useUIStore.getState().removeToast(toastId);

      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it("should limit toasts to 3 maximum", () => {
      useUIStore.getState().addToast("error", "Error 1");
      useUIStore.getState().addToast("error", "Error 2");
      useUIStore.getState().addToast("error", "Error 3");
      useUIStore.getState().addToast("error", "Error 4");

      expect(useUIStore.getState().toasts).toHaveLength(3);
      // First toast should have been removed
      expect(useUIStore.getState().toasts[0].message).toBe("Error 2");
    });

    it("should clear all toasts", () => {
      useUIStore.getState().addToast("error", "Error 1");
      useUIStore.getState().addToast("error", "Error 2");
      useUIStore.getState().clearToasts();

      expect(useUIStore.getState().toasts).toHaveLength(0);
    });
  });

  describe("Loading State", () => {
    it("should start loading operation", () => {
      useUIStore.getState().startLoading("op-1", "Loading data");

      const ops = useUIStore.getState().loadingOperations;
      expect(ops).toHaveLength(1);
      expect(ops[0].id).toBe("op-1");
      expect(ops[0].label).toBe("Loading data");
    });

    it("should not duplicate loading operations with same ID", () => {
      useUIStore.getState().startLoading("op-1", "Loading");
      useUIStore.getState().startLoading("op-1", "Loading again");

      expect(useUIStore.getState().loadingOperations).toHaveLength(1);
    });

    it("should update loading progress", () => {
      useUIStore.getState().startLoading("op-1", "Loading");
      useUIStore.getState().updateLoadingProgress("op-1", 50);

      const op = useUIStore.getState().loadingOperations[0];
      expect(op.progress).toBe(50);
    });

    it("should clamp progress to 0-100", () => {
      useUIStore.getState().startLoading("op-1", "Loading");

      useUIStore.getState().updateLoadingProgress("op-1", -10);
      expect(useUIStore.getState().loadingOperations[0].progress).toBe(0);

      useUIStore.getState().updateLoadingProgress("op-1", 150);
      expect(useUIStore.getState().loadingOperations[0].progress).toBe(100);
    });

    it("should stop loading operation", () => {
      useUIStore.getState().startLoading("op-1", "Loading");
      useUIStore.getState().startLoading("op-2", "Loading 2");

      useUIStore.getState().stopLoading("op-1");

      const ops = useUIStore.getState().loadingOperations;
      expect(ops).toHaveLength(1);
      expect(ops[0].id).toBe("op-2");
    });

    it("should stop all loading operations", () => {
      useUIStore.getState().startLoading("op-1", "Loading 1");
      useUIStore.getState().startLoading("op-2", "Loading 2");
      useUIStore.getState().setGlobalLoading(true);

      useUIStore.getState().stopAllLoading();

      expect(useUIStore.getState().loadingOperations).toHaveLength(0);
      expect(useUIStore.getState().isGlobalLoading).toBe(false);
    });

    it("should set global loading", () => {
      useUIStore.getState().setGlobalLoading(true);
      expect(useUIStore.getState().isGlobalLoading).toBe(true);

      useUIStore.getState().setGlobalLoading(false);
      expect(useUIStore.getState().isGlobalLoading).toBe(false);
    });

    it("should track cancellable operations", () => {
      useUIStore.getState().startLoading("op-1", "Loading", true);

      const op = useUIStore.getState().loadingOperations[0];
      expect(op.cancellable).toBe(true);
    });
  });
});
