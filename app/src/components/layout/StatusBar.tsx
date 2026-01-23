/**
 * StatusBar Component
 *
 * Displays model statistics, selection info, and system status
 * at the bottom of the application.
 *
 * Features:
 * - Element count display
 * - Selection count
 * - Current tool indicator
 * - Cursor coordinates
 * - Zoom level
 * - Save status indicator
 * - Token usage (optional)
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useUIStore, useModelStore, useSelectionStore, useHistoryStore } from "../../stores";
import { useTokenStore } from "../../stores/tokenStore";
import type { Element } from "../../types";

interface StatusBarProps {
  /** Loading state from persistence */
  isLoading?: boolean;
  /** Saving state from persistence */
  isSaving?: boolean;
  /** Last saved timestamp */
  lastSaved?: Date | null;
  /** Whether IndexedDB persistence is available */
  dbAvailable?: boolean;
}

export function StatusBar({
  isLoading = false,
  isSaving = false,
  lastSaved = null,
  dbAvailable = true,
}: StatusBarProps) {
  // UI State
  const activeLevel = useUIStore((s) => s.activeLevel);
  const activeTool = useUIStore((s) => s.activeTool);
  const zoom = useUIStore((s) => s.zoom);
  const viewMode = useUIStore((s) => s.viewMode);

  // Model State
  const elements = useModelStore((s) => s.elements);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const historyCount = useHistoryStore((s) => s.entries.length);

  // Token State
  const totalCalls = useTokenStore((s) => s.totalCalls);
  const inputTokens = useTokenStore((s) => s.inputTokens);
  const outputTokens = useTokenStore((s) => s.outputTokens);
  const totalCostUsd = useTokenStore((s) => s.totalCostUsd);

  // Cursor coordinates (tracked via mouse move)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Selection details popup state
  const [showSelectionDetails, setShowSelectionDetails] = useState(false);

  // Get selected elements from store
  const selectedElements = useMemo(() => {
    return elements.filter((el) => selectedIds.has(el.id));
  }, [elements, selectedIds]);

  // Group selected elements by type for summary
  const selectionByType = useMemo(() => {
    return selectedElements.reduce((acc, el) => {
      acc[el.type] = (acc[el.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [selectedElements]);

  // Format selection info based on count
  const selectionInfo = useMemo(() => {
    const count = selectedIds.size;
    if (count === 0) {
      return { text: "Nothing selected", icon: "fa-object-group", color: "text-gray-500" };
    }
    if (count === 1) {
      const el = selectedElements[0];
      const typeName = el?.type ? el.type.charAt(0).toUpperCase() + el.type.slice(1) : "Element";
      const name = el?.name || el?.id || "Unknown";
      return { text: `${typeName}: ${name}`, icon: getElementIcon(el?.type || ""), color: "text-yellow-400" };
    }
    // Multiple selection - show count with type breakdown in tooltip
    const typeBreakdown = Object.entries(selectionByType)
      .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
      .join(", ");
    return { text: `${count} elements selected`, icon: "fa-object-group", color: "text-yellow-400", tooltip: typeBreakdown };
  }, [selectedIds, selectedElements, selectionByType]);

  // Track cursor position on canvas
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Get canvas element
      const canvas = document.querySelector("[data-canvas]") as HTMLElement | null;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const isOverCanvas =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (isOverCanvas) {
        // Convert to canvas coordinates (accounting for zoom and pan)
        const panX = useUIStore.getState().panX;
        const panY = useUIStore.getState().panY;
        const currentZoom = useUIStore.getState().zoom;

        const canvasX = (e.clientX - rect.left - panX) / currentZoom;
        const canvasY = (e.clientY - rect.top - panY) / currentZoom;

        // Convert to meters (assuming 1 pixel = 0.01m at scale 1)
        const SCALE = 100; // pixels per meter
        const metersX = canvasX / SCALE;
        const metersY = canvasY / SCALE;

        setCursorPos({ x: metersX, y: metersY });
      } else {
        setCursorPos(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Format cursor position
  const formatCoord = useCallback((value: number) => {
    return value.toFixed(2);
  }, []);

  // Element count by type
  const elementCounts = elements.reduce((acc, el) => {
    acc[el.type] = (acc[el.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Format element counts summary
  const elementSummary = Object.entries(elementCounts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
    .join(", ");

  // Token usage display
  const totalTokens = inputTokens + outputTokens;
  const showTokens = totalCalls > 0;

  return (
    <footer
      className="h-7 flex items-center justify-between px-4 text-xs text-gray-400 border-t border-gray-700/50 bg-gray-900/80 select-none"
      role="status"
      aria-label="Status bar"
    >
      {/* Left section: Location and tool info */}
      <div className="flex items-center gap-3">
        {/* Level */}
        <span
          className="text-blue-400 font-medium"
          title="Active level"
        >
          {activeLevel}
        </span>

        <Separator />

        {/* Tool */}
        <span title="Active tool">
          <i className="fa-solid fa-wrench mr-1.5 text-gray-500" />
          <span className="capitalize">{activeTool}</span>
        </span>

        <Separator />

        {/* Cursor Position */}
        {cursorPos ? (
          <span
            className="font-mono text-gray-500"
            title="Cursor position (meters)"
          >
            <i className="fa-solid fa-crosshairs mr-1.5" />
            {formatCoord(cursorPos.x)}, {formatCoord(cursorPos.y)}
          </span>
        ) : (
          <span className="text-gray-600">
            <i className="fa-solid fa-crosshairs mr-1.5" />
            —, —
          </span>
        )}

        <Separator />

        {/* Zoom (2D only) */}
        {viewMode === "2d" && (
          <>
            <span title="Zoom level">
              <i className="fa-solid fa-magnifying-glass mr-1.5 text-gray-500" />
              {Math.round(zoom * 100)}%
            </span>
            <Separator />
          </>
        )}

        {/* Grid */}
        <span
          className="text-gray-500"
          title="Grid spacing"
        >
          Grid: 50mm
        </span>
      </div>

      {/* Right section: Model stats and status */}
      <div className="flex items-center gap-3">
        {/* Element Count */}
        <span
          className="cursor-help"
          title={elementSummary || "No elements"}
        >
          <i className="fa-solid fa-cube mr-1.5 text-gray-500" />
          {elements.length} element{elements.length !== 1 ? "s" : ""}
        </span>

        <Separator />

        {/* Selection Info */}
        <div className="relative">
          <button
            type="button"
            className={`flex items-center gap-1.5 hover:text-white transition-colors ${selectionInfo.color}`}
            title={selectionInfo.tooltip || selectionInfo.text}
            onClick={() => selectedIds.size > 0 && setShowSelectionDetails(!showSelectionDetails)}
            disabled={selectedIds.size === 0}
            aria-expanded={showSelectionDetails}
            aria-haspopup="true"
          >
            <i className={`fa-solid ${selectionInfo.icon} text-gray-500`} />
            <span className="max-w-[150px] truncate">{selectionInfo.text}</span>
            {selectedIds.size > 0 && (
              <i className={`fa-solid fa-chevron-${showSelectionDetails ? "up" : "down"} text-[8px] text-gray-500`} />
            )}
          </button>

          {/* Selection Details Popup */}
          {showSelectionDetails && selectedIds.size > 0 && (
            <SelectionDetailsPopup
              selectedElements={selectedElements}
              selectionByType={selectionByType}
              onClose={() => setShowSelectionDetails(false)}
            />
          )}
        </div>

        <Separator />

        {/* History */}
        <span title="Undo history entries">
          <i className="fa-solid fa-clock-rotate-left mr-1.5 text-gray-500" />
          {historyCount}
        </span>

        {/* Token Usage (if any) */}
        {showTokens && (
          <>
            <Separator />
            <span
              className="text-purple-400 cursor-help"
              title={`API Calls: ${totalCalls}\nInput: ${inputTokens.toLocaleString()}\nOutput: ${outputTokens.toLocaleString()}\nCost: $${totalCostUsd.toFixed(4)}`}
            >
              <i className="fa-solid fa-microchip mr-1.5" />
              {totalTokens.toLocaleString()} tokens
            </span>
          </>
        )}

        <Separator />

        {/* Save Status */}
        <SaveStatusIndicator
          isLoading={isLoading}
          isSaving={isSaving}
          lastSaved={lastSaved}
          dbAvailable={dbAvailable}
        />
      </div>
    </footer>
  );
}

/**
 * Visual separator between status items
 */
function Separator() {
  return <span className="text-gray-700">•</span>;
}

/**
 * Save status indicator with different states
 */
interface SaveStatusIndicatorProps {
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  dbAvailable: boolean;
}

function SaveStatusIndicator({
  isLoading,
  isSaving,
  lastSaved,
  dbAvailable,
}: SaveStatusIndicatorProps) {
  if (isLoading) {
    return (
      <span className="text-yellow-400 animate-pulse">
        <i className="fa-solid fa-circle text-[6px] mr-1.5" />
        Loading...
      </span>
    );
  }

  if (isSaving) {
    return (
      <span className="text-blue-400">
        <i className="fa-solid fa-circle text-[6px] mr-1.5 animate-pulse" />
        Saving...
      </span>
    );
  }

  if (!dbAvailable) {
    return (
      <span
        className="text-orange-400"
        title="IndexedDB not available - changes won't persist"
      >
        <i className="fa-solid fa-circle text-[6px] mr-1.5" />
        No persistence
      </span>
    );
  }

  return (
    <span
      className="text-green-400"
      title={lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : "Auto-save enabled"}
    >
      <i className="fa-solid fa-circle text-[6px] mr-1.5" />
      Saved
    </span>
  );
}

/**
 * Get icon class for element type
 */
function getElementIcon(type: string): string {
  switch (type) {
    case "wall":
      return "fa-grip-lines";
    case "door":
      return "fa-door-open";
    case "window":
      return "fa-window-maximize";
    case "room":
      return "fa-vector-square";
    case "floor":
      return "fa-layer-group";
    case "roof":
      return "fa-home";
    case "column":
      return "fa-h";
    case "beam":
      return "fa-minus";
    case "stair":
      return "fa-stairs";
    default:
      return "fa-cube";
  }
}

/**
 * Selection details popup showing breakdown of selected elements
 */
interface SelectionDetailsPopupProps {
  selectedElements: Element[];
  selectionByType: Record<string, number>;
  onClose: () => void;
}

function SelectionDetailsPopup({
  selectedElements,
  selectionByType,
  onClose,
}: SelectionDetailsPopupProps) {
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".selection-details-popup")) {
        onClose();
      }
    };

    // Close on Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="selection-details-popup absolute bottom-full right-0 mb-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50"
      role="dialog"
      aria-label="Selection details"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-sm font-medium text-white">
          Selection Details
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <i className="fa-solid fa-times" />
        </button>
      </div>

      {/* Type breakdown */}
      <div className="px-3 py-2 border-b border-gray-700/50">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">
          By Type
        </div>
        <div className="space-y-1">
          {Object.entries(selectionByType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-gray-300">
                <i className={`fa-solid ${getElementIcon(type)} text-gray-500 w-4`} />
                <span className="capitalize">{type}</span>
              </span>
              <span className="text-gray-400">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Element list (scrollable) */}
      <div className="max-h-40 overflow-y-auto">
        <div className="px-3 py-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">
            Elements ({selectedElements.length})
          </div>
          <div className="space-y-0.5">
            {selectedElements.slice(0, 20).map((el) => (
              <div
                key={el.id}
                className="flex items-center gap-1.5 text-xs text-gray-400 py-0.5"
                title={el.id}
              >
                <i className={`fa-solid ${getElementIcon(el.type)} w-3 text-gray-600`} />
                <span className="truncate">{el.name || el.id}</span>
              </div>
            ))}
            {selectedElements.length > 20 && (
              <div className="text-xs text-gray-500 italic pt-1">
                +{selectedElements.length - 20} more...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-700/50 text-xs text-gray-500">
        Press <kbd className="px-1 py-0.5 bg-gray-700 rounded">Esc</kbd> to clear selection
      </div>
    </div>
  );
}

export default StatusBar;
