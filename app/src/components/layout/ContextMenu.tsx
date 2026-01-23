/**
 * Pensaer BIM Platform - Context Menu Component
 *
 * Right-click context menu with context-aware options based on element type.
 * Supports element actions, canvas actions, keyboard shortcuts display,
 * and nested submenus.
 */

import { useEffect, useRef, useCallback, useMemo } from "react";
import {
  useUIStore,
  useModelStore,
  useSelectionStore,
  useHistoryStore,
} from "../../stores";
import type { ContextMenuItem, Element, ElementType } from "../../types";
import clsx from "clsx";

/**
 * Get context-specific menu items based on element type
 */
function getElementMenuItems(
  element: Element,
  actions: {
    onDelete: () => void;
    onDuplicate: () => void;
    onCopy: () => void;
    onSelectRelated: () => void;
    onShowProperties: () => void;
    onBringToFront: () => void;
    onSendToBack: () => void;
  }
): ContextMenuItem[] {
  const baseItems: ContextMenuItem[] = [
    {
      id: "properties",
      icon: "fa-solid fa-sliders",
      label: "Properties",
      shortcut: "P",
      action: actions.onShowProperties,
    },
    { id: "divider-1", type: "divider" },
    {
      id: "copy",
      icon: "fa-solid fa-copy",
      label: "Copy",
      shortcut: "Ctrl+C",
      action: actions.onCopy,
    },
    {
      id: "duplicate",
      icon: "fa-solid fa-clone",
      label: "Duplicate",
      shortcut: "Ctrl+D",
      action: actions.onDuplicate,
    },
    { id: "divider-2", type: "divider" },
    {
      id: "select-related",
      icon: "fa-solid fa-link",
      label: "Select Related",
      action: actions.onSelectRelated,
    },
  ];

  // Add element-type-specific items
  const typeSpecificItems = getTypeSpecificItems(element.type, element);

  const orderItems: ContextMenuItem[] = [
    { id: "divider-3", type: "divider" },
    {
      id: "bring-to-front",
      icon: "fa-solid fa-arrow-up",
      label: "Bring to Front",
      action: actions.onBringToFront,
    },
    {
      id: "send-to-back",
      icon: "fa-solid fa-arrow-down",
      label: "Send to Back",
      action: actions.onSendToBack,
    },
  ];

  const deleteItem: ContextMenuItem[] = [
    { id: "divider-4", type: "divider" },
    {
      id: "delete",
      icon: "fa-solid fa-trash",
      label: "Delete",
      shortcut: "Del",
      danger: true,
      action: actions.onDelete,
    },
  ];

  return [...baseItems, ...typeSpecificItems, ...orderItems, ...deleteItem];
}

/**
 * Get element-type-specific menu items
 */
function getTypeSpecificItems(type: ElementType, element: Element): ContextMenuItem[] {
  switch (type) {
    case "wall":
      return [
        { id: "divider-wall", type: "divider" },
        {
          id: "add-door",
          icon: "fa-solid fa-door-open",
          label: "Add Door",
        },
        {
          id: "add-window",
          icon: "fa-solid fa-window-maximize",
          label: "Add Window",
        },
        {
          id: "split-wall",
          icon: "fa-solid fa-scissors",
          label: "Split Wall",
        },
      ];

    case "door":
    case "window":
      return [
        { id: "divider-opening", type: "divider" },
        {
          id: "flip",
          icon: "fa-solid fa-arrows-rotate",
          label: type === "door" ? "Flip Swing" : "Flip Opening",
        },
        {
          id: "detach",
          icon: "fa-solid fa-unlink",
          label: "Detach from Wall",
        },
      ];

    case "room":
      return [
        { id: "divider-room", type: "divider" },
        {
          id: "calculate-area",
          icon: "fa-solid fa-ruler-combined",
          label: "Recalculate Area",
        },
        {
          id: "auto-detect-walls",
          icon: "fa-solid fa-wand-magic-sparkles",
          label: "Auto-detect Walls",
        },
      ];

    case "floor":
    case "roof":
      return [
        { id: "divider-slab", type: "divider" },
        {
          id: "edit-outline",
          icon: "fa-solid fa-draw-polygon",
          label: "Edit Outline",
        },
      ];

    default:
      return [];
  }
}

/**
 * Get menu items for canvas background (no element selected)
 */
function getCanvasMenuItems(actions: {
  onPaste: () => void;
  onSelectAll: () => void;
  onZoomToFit: () => void;
  onToggleGrid: () => void;
}): ContextMenuItem[] {
  return [
    {
      id: "paste",
      icon: "fa-solid fa-paste",
      label: "Paste",
      shortcut: "Ctrl+V",
      action: actions.onPaste,
    },
    { id: "divider-1", type: "divider" },
    {
      id: "select-all",
      icon: "fa-solid fa-object-group",
      label: "Select All",
      shortcut: "Ctrl+A",
      action: actions.onSelectAll,
    },
    { id: "divider-2", type: "divider" },
    {
      id: "zoom-fit",
      icon: "fa-solid fa-expand",
      label: "Zoom to Fit",
      shortcut: "F",
      action: actions.onZoomToFit,
    },
    {
      id: "toggle-grid",
      icon: "fa-solid fa-grid",
      label: "Toggle Grid",
      shortcut: "G",
      action: actions.onToggleGrid,
    },
  ];
}

/**
 * Get menu items for multi-selection
 */
function getMultiSelectionMenuItems(
  count: number,
  actions: {
    onDeleteAll: () => void;
    onGroupSelect: () => void;
    onAlignLeft: () => void;
    onAlignTop: () => void;
  }
): ContextMenuItem[] {
  return [
    {
      id: "group-info",
      icon: "fa-solid fa-layer-group",
      label: `${count} elements selected`,
    },
    { id: "divider-1", type: "divider" },
    {
      id: "align-left",
      icon: "fa-solid fa-align-left",
      label: "Align Left",
      action: actions.onAlignLeft,
    },
    {
      id: "align-top",
      icon: "fa-solid fa-align-left fa-rotate-90",
      label: "Align Top",
      action: actions.onAlignTop,
    },
    { id: "divider-2", type: "divider" },
    {
      id: "delete-all",
      icon: "fa-solid fa-trash",
      label: `Delete ${count} Elements`,
      shortcut: "Del",
      danger: true,
      action: actions.onDeleteAll,
    },
  ];
}

export function ContextMenu() {
  const menuRef = useRef<HTMLDivElement>(null);

  // Store state
  const contextMenu = useUIStore((s) => s.contextMenu);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);
  const zoomToFit = useUIStore((s) => s.zoomToFit);
  const addToast = useUIStore((s) => s.addToast);
  const showPropertiesPanel = useUIStore((s) => s.showPropertiesPanel);
  const togglePropertiesPanel = useUIStore((s) => s.togglePropertiesPanel);

  const elements = useModelStore((s) => s.elements);
  const deleteElement = useModelStore((s) => s.deleteElement);
  const deleteElements = useModelStore((s) => s.deleteElements);
  const addElement = useModelStore((s) => s.addElement);
  const getRelatedElements = useModelStore((s) => s.getRelatedElements);
  const bringToFront = useModelStore((s) => s.bringToFront);
  const sendToBack = useModelStore((s) => s.sendToBack);

  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const select = useSelectionStore((s) => s.select);
  const selectMultiple = useSelectionStore((s) => s.selectMultiple);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const selectAll = useSelectionStore((s) => s.selectAll);

  const recordAction = useHistoryStore((s) => s.recordAction);

  // Get target element if any
  const targetElement = useMemo(() => {
    if (!contextMenu.targetId) return null;
    return elements.find((el) => el.id === contextMenu.targetId) || null;
  }, [contextMenu.targetId, elements]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hideContextMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu.visible, hideContextMenu]);

  // Position adjustment to keep menu in viewport
  useEffect(() => {
    if (!contextMenu.visible || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position
    if (rect.right > viewportWidth) {
      menu.style.left = `${viewportWidth - rect.width - 8}px`;
    }

    // Adjust vertical position
    if (rect.bottom > viewportHeight) {
      menu.style.top = `${viewportHeight - rect.height - 8}px`;
    }
  }, [contextMenu.visible, contextMenu.x, contextMenu.y]);

  // Action handlers
  const handleDelete = useCallback(() => {
    if (targetElement) {
      deleteElement(targetElement.id);
      recordAction(`Delete ${targetElement.name}`);
      addToast("success", `Deleted ${targetElement.name}`);
      clearSelection();
    }
    hideContextMenu();
  }, [targetElement, deleteElement, recordAction, addToast, clearSelection, hideContextMenu]);

  const handleDeleteAll = useCallback(() => {
    if (selectedIds.length > 0) {
      deleteElements(selectedIds);
      recordAction(`Delete ${selectedIds.length} elements`);
      addToast("success", `Deleted ${selectedIds.length} elements`);
      clearSelection();
    }
    hideContextMenu();
  }, [selectedIds, deleteElements, recordAction, addToast, clearSelection, hideContextMenu]);

  const handleDuplicate = useCallback(() => {
    if (targetElement) {
      const newElement = {
        ...targetElement,
        id: `${targetElement.type}-${Date.now()}`,
        name: `${targetElement.name} (Copy)`,
        x: targetElement.x + 20,
        y: targetElement.y + 20,
      };
      addElement(newElement);
      select(newElement.id);
      recordAction(`Duplicate ${targetElement.name}`);
      addToast("success", `Duplicated ${targetElement.name}`);
    }
    hideContextMenu();
  }, [targetElement, addElement, select, recordAction, addToast, hideContextMenu]);

  const handleCopy = useCallback(() => {
    if (targetElement) {
      // Store in clipboard (simple implementation using sessionStorage)
      sessionStorage.setItem("pensaer-clipboard", JSON.stringify(targetElement));
      addToast("info", `Copied ${targetElement.name}`);
    }
    hideContextMenu();
  }, [targetElement, addToast, hideContextMenu]);

  const handlePaste = useCallback(() => {
    const clipboardData = sessionStorage.getItem("pensaer-clipboard");
    if (clipboardData) {
      try {
        const element = JSON.parse(clipboardData);
        const newElement = {
          ...element,
          id: `${element.type}-${Date.now()}`,
          name: `${element.name} (Pasted)`,
          x: element.x + 40,
          y: element.y + 40,
        };
        addElement(newElement);
        select(newElement.id);
        recordAction(`Paste ${newElement.name}`);
        addToast("success", `Pasted ${element.name}`);
      } catch {
        addToast("error", "Failed to paste element");
      }
    } else {
      addToast("warning", "Nothing to paste");
    }
    hideContextMenu();
  }, [addElement, select, recordAction, addToast, hideContextMenu]);

  const handleSelectRelated = useCallback(() => {
    if (targetElement) {
      const relatedElements = getRelatedElements(targetElement.id);
      const relatedIds = relatedElements.map((el) => el.id);
      selectMultiple([targetElement.id, ...relatedIds]);
      addToast("info", `Selected ${relatedIds.length + 1} related elements`);
    }
    hideContextMenu();
  }, [targetElement, getRelatedElements, selectMultiple, addToast, hideContextMenu]);

  const handleShowProperties = useCallback(() => {
    if (!showPropertiesPanel) {
      togglePropertiesPanel();
    }
    hideContextMenu();
  }, [showPropertiesPanel, togglePropertiesPanel, hideContextMenu]);

  const handleSelectAll = useCallback(() => {
    selectAll(elements.map((el) => el.id));
    addToast("info", `Selected ${elements.length} elements`);
    hideContextMenu();
  }, [elements, selectAll, addToast, hideContextMenu]);

  const handleZoomToFit = useCallback(() => {
    zoomToFit();
    hideContextMenu();
  }, [zoomToFit, hideContextMenu]);

  // Get snap state for grid toggle
  const snapEnabled = useUIStore((s) => s.snap.grid);
  const toggleGridSnap = useUIStore((s) => s.toggleGridSnap);

  const handleToggleGrid = useCallback(() => {
    toggleGridSnap();
    addToast("info", snapEnabled ? "Grid snap disabled" : "Grid snap enabled");
    hideContextMenu();
  }, [toggleGridSnap, snapEnabled, addToast, hideContextMenu]);

  const handleBringToFront = useCallback(() => {
    if (targetElement) {
      bringToFront(targetElement.id);
      recordAction(`Bring ${targetElement.name} to front`);
      addToast("success", `Brought ${targetElement.name} to front`);
    }
    hideContextMenu();
  }, [targetElement, bringToFront, recordAction, addToast, hideContextMenu]);

  const handleSendToBack = useCallback(() => {
    if (targetElement) {
      sendToBack(targetElement.id);
      recordAction(`Send ${targetElement.name} to back`);
      addToast("success", `Sent ${targetElement.name} to back`);
    }
    hideContextMenu();
  }, [targetElement, sendToBack, recordAction, addToast, hideContextMenu]);

  // Get updateElement for alignment operations
  const updateElement = useModelStore((s) => s.updateElement);

  const handleAlignLeft = useCallback(() => {
    if (selectedIds.length < 2) {
      addToast("warning", "Select at least 2 elements to align");
      hideContextMenu();
      return;
    }

    // Find the minimum x coordinate among selected elements
    const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
    const minX = Math.min(...selectedElements.map((el) => el.x));

    // Align all selected elements to the leftmost x
    selectedElements.forEach((el) => {
      if (el.x !== minX) {
        updateElement(el.id, { x: minX });
      }
    });

    recordAction(`Align ${selectedIds.length} elements left`);
    addToast("success", `Aligned ${selectedIds.length} elements to the left`);
    hideContextMenu();
  }, [selectedIds, elements, updateElement, recordAction, addToast, hideContextMenu]);

  const handleAlignTop = useCallback(() => {
    if (selectedIds.length < 2) {
      addToast("warning", "Select at least 2 elements to align");
      hideContextMenu();
      return;
    }

    // Find the minimum y coordinate among selected elements
    const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
    const minY = Math.min(...selectedElements.map((el) => el.y));

    // Align all selected elements to the topmost y
    selectedElements.forEach((el) => {
      if (el.y !== minY) {
        updateElement(el.id, { y: minY });
      }
    });

    recordAction(`Align ${selectedIds.length} elements top`);
    addToast("success", `Aligned ${selectedIds.length} elements to the top`);
    hideContextMenu();
  }, [selectedIds, elements, updateElement, recordAction, addToast, hideContextMenu]);

  const handleGroupSelect = useCallback(() => {
    // Group selection means selecting all elements that overlap with the selection box
    // For now, we'll select all elements of the same type as the first selected element
    if (selectedIds.length === 0) {
      addToast("warning", "Select at least one element first");
      hideContextMenu();
      return;
    }

    const firstElement = elements.find((el) => el.id === selectedIds[0]);
    if (!firstElement) {
      hideContextMenu();
      return;
    }

    const sameTypeIds = elements
      .filter((el) => el.type === firstElement.type)
      .map((el) => el.id);

    selectMultiple(sameTypeIds);
    addToast("info", `Selected all ${sameTypeIds.length} ${firstElement.type}(s)`);
    hideContextMenu();
  }, [selectedIds, elements, selectMultiple, addToast, hideContextMenu]);

  // Determine which menu items to show
  const menuItems = useMemo(() => {
    // Multi-selection menu
    if (selectedIds.length > 1) {
      return getMultiSelectionMenuItems(selectedIds.length, {
        onDeleteAll: handleDeleteAll,
        onGroupSelect: handleGroupSelect,
        onAlignLeft: handleAlignLeft,
        onAlignTop: handleAlignTop,
      });
    }

    // Single element menu
    if (targetElement) {
      return getElementMenuItems(targetElement, {
        onDelete: handleDelete,
        onDuplicate: handleDuplicate,
        onCopy: handleCopy,
        onSelectRelated: handleSelectRelated,
        onShowProperties: handleShowProperties,
        onBringToFront: handleBringToFront,
        onSendToBack: handleSendToBack,
      });
    }

    // Canvas background menu
    return getCanvasMenuItems({
      onPaste: handlePaste,
      onSelectAll: handleSelectAll,
      onZoomToFit: handleZoomToFit,
      onToggleGrid: handleToggleGrid,
    });
  }, [
    selectedIds,
    targetElement,
    handleDelete,
    handleDeleteAll,
    handleDuplicate,
    handleCopy,
    handlePaste,
    handleSelectRelated,
    handleShowProperties,
    handleSelectAll,
    handleZoomToFit,
    handleToggleGrid,
    handleBringToFront,
    handleSendToBack,
    handleAlignLeft,
    handleAlignTop,
    handleGroupSelect,
  ]);

  // Handle menu item click
  const handleItemClick = useCallback(
    (item: ContextMenuItem) => {
      if (item.type === "divider" || !item.action) return;
      item.action();
    },
    []
  );

  if (!contextMenu.visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] py-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl"
      style={{
        left: contextMenu.x,
        top: contextMenu.y,
      }}
      role="menu"
      aria-label="Context menu"
    >
      {menuItems.map((item) => {
        if (item.type === "divider") {
          return (
            <div
              key={item.id}
              className="my-1 border-t border-gray-700"
              role="separator"
            />
          );
        }

        const isDisabled = !item.action;

        return (
          <button
            key={item.id}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-1.5 text-sm text-left transition-colors",
              isDisabled
                ? "text-gray-500 cursor-default"
                : item.danger
                  ? "text-red-400 hover:bg-red-500/20"
                  : "text-gray-200 hover:bg-gray-700"
            )}
            onClick={() => handleItemClick(item)}
            disabled={isDisabled}
            role="menuitem"
          >
            {item.icon && (
              <i
                className={clsx(item.icon, "w-4 text-center")}
                aria-hidden="true"
              />
            )}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-gray-500 ml-4">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
