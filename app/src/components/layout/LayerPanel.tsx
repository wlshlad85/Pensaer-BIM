/**
 * Layer Panel Component
 *
 * Displays element type layers in a collapsible panel with:
 * - Layer list with color-coded icons
 * - Click to toggle visibility
 * - Lock layers to prevent selection/editing
 * - Element count per layer
 */

import { useState } from "react";
import clsx from "clsx";
import { useModelStore, useUIStore } from "../../stores";
import type { ElementType } from "../../types";

// Layer configuration with icons and colors
const LAYER_CONFIG: Record<
  ElementType,
  { icon: string; color: string; bgColor: string }
> = {
  wall: {
    icon: "fa-square",
    color: "text-slate-300",
    bgColor: "bg-slate-500/30",
  },
  door: {
    icon: "fa-door-open",
    color: "text-blue-300",
    bgColor: "bg-blue-500/30",
  },
  window: {
    icon: "fa-window-maximize",
    color: "text-cyan-300",
    bgColor: "bg-cyan-500/30",
  },
  room: {
    icon: "fa-vector-square",
    color: "text-purple-300",
    bgColor: "bg-purple-500/30",
  },
  floor: {
    icon: "fa-layer-group",
    color: "text-green-300",
    bgColor: "bg-green-500/30",
  },
  roof: {
    icon: "fa-home",
    color: "text-orange-300",
    bgColor: "bg-orange-500/30",
  },
  column: {
    icon: "fa-grip-lines-vertical",
    color: "text-gray-300",
    bgColor: "bg-gray-500/30",
  },
  beam: {
    icon: "fa-minus",
    color: "text-amber-300",
    bgColor: "bg-amber-500/30",
  },
  stair: {
    icon: "fa-stairs",
    color: "text-indigo-300",
    bgColor: "bg-indigo-500/30",
  },
};

// Order layers should appear in panel
const LAYER_ORDER: ElementType[] = [
  "room",
  "wall",
  "door",
  "window",
  "floor",
  "roof",
  "column",
  "beam",
  "stair",
];

interface LayerPanelProps {
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
}

export function LayerPanel({
  collapsed: controlledCollapsed,
  onCollapseChange,
}: LayerPanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;

  const elements = useModelStore((s) => s.elements);
  const hiddenLayers = useUIStore((s) => s.hiddenLayers);
  const lockedLayers = useUIStore((s) => s.lockedLayers);
  const toggleLayerVisibility = useUIStore((s) => s.toggleLayerVisibility);
  const toggleLayerLock = useUIStore((s) => s.toggleLayerLock);
  const showAllLayers = useUIStore((s) => s.showAllLayers);
  const hideAllLayers = useUIStore((s) => s.hideAllLayers);
  const unlockAllLayers = useUIStore((s) => s.unlockAllLayers);

  const toggleCollapse = () => {
    const newState = !collapsed;
    setInternalCollapsed(newState);
    onCollapseChange?.(newState);
  };

  // Count elements by type
  const elementCounts = LAYER_ORDER.reduce(
    (acc, type) => {
      acc[type] = elements.filter((el) => el.type === type).length;
      return acc;
    },
    {} as Record<ElementType, number>
  );

  // Count how many layers have elements
  const activeLayers = LAYER_ORDER.filter((type) => elementCounts[type] > 0);
  const visibleCount = activeLayers.filter(
    (type) => !hiddenLayers.has(type)
  ).length;

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={toggleCollapse}
        className="w-full h-8 flex items-center justify-between px-3 hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-layer-group text-purple-400 text-xs"></i>
          <span className="text-xs font-medium text-gray-300">Layers</span>
          <span className="text-xs text-gray-500">
            ({visibleCount}/{activeLayers.length})
          </span>
        </div>
        <i
          className={clsx(
            "fa-solid text-gray-500 text-xs transition-transform",
            collapsed ? "fa-chevron-right" : "fa-chevron-down"
          )}
        ></i>
      </button>

      {/* Layer List */}
      {!collapsed && (
        <div className="px-2 pb-2">
          {/* Column Headers */}
          <div className="flex items-center text-[10px] text-gray-500 px-2 py-1 border-b border-gray-700/30 mb-1">
            <span className="flex-1">Layer</span>
            <span className="w-12 text-center">Count</span>
            <span className="w-8 text-center">Vis</span>
            <span className="w-8 text-center">Lock</span>
          </div>

          {/* Layers */}
          <div className="space-y-0.5">
            {LAYER_ORDER.map((layerType) => {
              const config = LAYER_CONFIG[layerType];
              const count = elementCounts[layerType];
              const isHidden = hiddenLayers.has(layerType);
              const isLocked = lockedLayers.has(layerType);
              const hasElements = count > 0;

              return (
                <div
                  key={layerType}
                  className={clsx(
                    "flex items-center px-2 py-1.5 rounded transition-colors group",
                    hasElements
                      ? "hover:bg-gray-700/30"
                      : "opacity-50 cursor-not-allowed"
                  )}
                >
                  {/* Layer Icon & Name */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div
                      className={clsx(
                        "w-5 h-5 rounded flex items-center justify-center text-xs",
                        config.bgColor,
                        config.color
                      )}
                    >
                      <i className={`fa-solid ${config.icon}`}></i>
                    </div>
                    <span
                      className={clsx(
                        "text-xs font-medium truncate capitalize",
                        isHidden ? "text-gray-500 line-through" : "text-gray-300"
                      )}
                    >
                      {layerType}s
                    </span>
                  </div>

                  {/* Element Count */}
                  <span
                    className={clsx(
                      "w-12 text-center text-[10px] font-mono",
                      count > 0 ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    {count}
                  </span>

                  {/* Visibility Toggle */}
                  <button
                    onClick={() => hasElements && toggleLayerVisibility(layerType)}
                    disabled={!hasElements}
                    className={clsx(
                      "w-8 flex justify-center text-xs transition-colors",
                      !hasElements
                        ? "text-gray-700 cursor-not-allowed"
                        : isHidden
                          ? "text-gray-600 hover:text-gray-400"
                          : "text-gray-400 hover:text-gray-200"
                    )}
                    title={isHidden ? "Show layer" : "Hide layer"}
                  >
                    <i
                      className={clsx(
                        "fa-solid",
                        isHidden ? "fa-eye-slash" : "fa-eye"
                      )}
                    ></i>
                  </button>

                  {/* Lock Toggle */}
                  <button
                    onClick={() => hasElements && toggleLayerLock(layerType)}
                    disabled={!hasElements}
                    className={clsx(
                      "w-8 flex justify-center text-xs transition-colors",
                      !hasElements
                        ? "text-gray-700 cursor-not-allowed"
                        : isLocked
                          ? "text-yellow-500 hover:text-yellow-400"
                          : "text-gray-600 hover:text-gray-400"
                    )}
                    title={isLocked ? "Unlock layer" : "Lock layer"}
                  >
                    <i
                      className={clsx(
                        "fa-solid",
                        isLocked ? "fa-lock" : "fa-lock-open"
                      )}
                    ></i>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-1 mt-2 pt-2 border-t border-gray-700/30">
            <button
              onClick={showAllLayers}
              className="flex-1 text-[10px] text-gray-500 hover:text-gray-300 py-1 transition-colors"
              title="Show all layers"
            >
              <i className="fa-solid fa-eye mr-1"></i>
              Show All
            </button>
            <button
              onClick={hideAllLayers}
              className="flex-1 text-[10px] text-gray-500 hover:text-gray-300 py-1 transition-colors"
              title="Hide all layers"
            >
              <i className="fa-solid fa-eye-slash mr-1"></i>
              Hide All
            </button>
            <button
              onClick={unlockAllLayers}
              className="flex-1 text-[10px] text-gray-500 hover:text-gray-300 py-1 transition-colors"
              title="Unlock all layers"
            >
              <i className="fa-solid fa-lock-open mr-1"></i>
              Unlock
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LayerPanel;
