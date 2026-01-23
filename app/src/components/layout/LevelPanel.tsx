/**
 * Level Panel Component
 *
 * Displays building levels in a collapsible panel with:
 * - Level list sorted by elevation
 * - Active level indicator
 * - Click to switch active level
 * - Level visibility toggles
 * - Elevation display
 */

import { useState } from "react";
import clsx from "clsx";
import { useModelStore, useUIStore } from "../../stores";

interface LevelPanelProps {
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
}

export function LevelPanel({
  collapsed: controlledCollapsed,
  onCollapseChange,
}: LevelPanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;

  const levels = useModelStore((s) => s.getLevelsOrdered());
  const getElementsByLevel = useModelStore((s) => s.getElementsByLevel);
  const activeLevel = useUIStore((s) => s.activeLevel);
  const setActiveLevel = useUIStore((s) => s.setActiveLevel);

  // Track which levels are visible (all visible by default)
  const [hiddenLevels, setHiddenLevels] = useState<Set<string>>(new Set());

  const toggleCollapse = () => {
    const newState = !collapsed;
    setInternalCollapsed(newState);
    onCollapseChange?.(newState);
  };

  const toggleLevelVisibility = (levelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHiddenLevels((prev) => {
      const next = new Set(prev);
      if (next.has(levelId)) {
        next.delete(levelId);
      } else {
        next.add(levelId);
      }
      return next;
    });
  };

  const handleLevelClick = (levelName: string) => {
    setActiveLevel(levelName);
  };

  // Format elevation for display
  const formatElevation = (elevationMm: number): string => {
    if (elevationMm === 0) return "0.000";
    const meters = elevationMm / 1000;
    return meters >= 0 ? `+${meters.toFixed(3)}` : meters.toFixed(3);
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden" data-testid="level-panel">
      {/* Header */}
      <button
        onClick={toggleCollapse}
        className="w-full h-8 flex items-center justify-between px-3 hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-layer-group text-blue-400 text-xs"></i>
          <span className="text-xs font-medium text-gray-300">Levels</span>
          <span className="text-xs text-gray-500">({levels.length})</span>
        </div>
        <i
          className={clsx(
            "fa-solid text-gray-500 text-xs transition-transform",
            collapsed ? "fa-chevron-right" : "fa-chevron-down"
          )}
        ></i>
      </button>

      {/* Level List */}
      {!collapsed && (
        <div className="px-2 pb-2">
          {/* Column Headers */}
          <div className="flex items-center text-[10px] text-gray-500 px-2 py-1 border-b border-gray-700/30 mb-1">
            <span className="flex-1">Level</span>
            <span className="w-16 text-right">Elevation</span>
            <span className="w-8 text-center">Vis</span>
          </div>

          {/* Levels (reversed to show highest first) */}
          <div className="space-y-0.5">
            {[...levels].reverse().map((level) => {
              const isActive = activeLevel === level.name;
              const isHidden = hiddenLevels.has(level.id);
              const elementCount = getElementsByLevel(level.id).length;

              return (
                <div
                  key={level.id}
                  onClick={() => handleLevelClick(level.name)}
                  className={clsx(
                    "flex items-center px-2 py-1.5 rounded cursor-pointer transition-colors group",
                    isActive
                      ? "bg-blue-500/20 text-blue-300"
                      : "hover:bg-gray-700/30 text-gray-400"
                  )}
                >
                  {/* Level Name & Icon */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <i
                      className={clsx(
                        "fa-solid text-xs",
                        level.elevation === 0
                          ? "fa-home"
                          : level.height === 0
                          ? "fa-arrow-up"
                          : "fa-building"
                      )}
                    ></i>
                    <span className="text-xs font-medium truncate">
                      {level.name}
                    </span>
                    {elementCount > 0 && (
                      <span className="text-[10px] text-gray-500">
                        ({elementCount})
                      </span>
                    )}
                  </div>

                  {/* Elevation */}
                  <span className="w-16 text-right text-[10px] font-mono">
                    {formatElevation(level.elevation)}
                  </span>

                  {/* Visibility Toggle */}
                  <button
                    onClick={(e) => toggleLevelVisibility(level.id, e)}
                    className={clsx(
                      "w-8 flex justify-center text-xs transition-colors",
                      isHidden
                        ? "text-gray-600 hover:text-gray-400"
                        : "text-gray-400 hover:text-gray-200"
                    )}
                    title={isHidden ? "Show level" : "Hide level"}
                  >
                    <i
                      className={clsx(
                        "fa-solid",
                        isHidden ? "fa-eye-slash" : "fa-eye"
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
              onClick={() => setHiddenLevels(new Set())}
              className="flex-1 text-[10px] text-gray-500 hover:text-gray-300 py-1 transition-colors"
              title="Show all levels"
            >
              <i className="fa-solid fa-eye mr-1"></i>
              Show All
            </button>
            <button
              onClick={() => {
                const allIds = new Set(levels.map((l) => l.id));
                // Keep only active level visible
                const activeId = levels.find((l) => l.name === activeLevel)?.id;
                if (activeId) allIds.delete(activeId);
                setHiddenLevels(allIds);
              }}
              className="flex-1 text-[10px] text-gray-500 hover:text-gray-300 py-1 transition-colors"
              title="Isolate active level"
            >
              <i className="fa-solid fa-crosshairs mr-1"></i>
              Isolate Active
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LevelPanel;
