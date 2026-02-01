/**
 * Pensaer BIM Platform - Snap Settings Dropdown
 *
 * Dropdown panel for configuring snap settings.
 */

import { useEffect, useRef } from "react";
import { useUIStore } from "../../stores";

export function SnapSettingsDropdown() {
  const snap = useUIStore((s) => s.snap);
  const showSnapSettings = useUIStore((s) => s.showSnapSettings);
  const setSnapSettings = useUIStore((s) => s.setSnapSettings);
  const closeSnapSettings = useUIStore((s) => s.closeSnapSettings);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        closeSnapSettings();
      }
    };

    if (showSnapSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSnapSettings, closeSnapSettings]);

  if (!showSnapSettings) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute left-14 bottom-0 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-2"
    >
      <div className="px-3 py-1 text-xs text-gray-400 font-medium uppercase tracking-wide">
        Snap Settings
      </div>

      <div className="px-2 py-1">
        <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded cursor-pointer">
          <input
            id="snap-enabled"
            type="checkbox"
            checked={snap.enabled}
            onChange={() => setSnapSettings({ enabled: !snap.enabled })}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-300">Snap Enabled</span>
        </label>
      </div>

      <div className="h-px bg-gray-700 my-1" />

      <div className="px-3 py-1 text-xs text-gray-500 font-medium">
        Snap Types
      </div>

      <div className="px-2 py-1 space-y-0.5">
        <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded cursor-pointer">
          <input
            id="snap-grid"
            type="checkbox"
            checked={snap.grid}
            onChange={() => setSnapSettings({ grid: !snap.grid })}
            disabled={!snap.enabled}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
          />
          <i className="fa-solid fa-grip text-gray-400 w-4" />
          <span
            className={`text-sm ${snap.enabled ? "text-gray-300" : "text-gray-500"}`}
          >
            Grid
          </span>
        </label>

        <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded cursor-pointer">
          <input
            id="snap-endpoint"
            type="checkbox"
            checked={snap.endpoint}
            onChange={() => setSnapSettings({ endpoint: !snap.endpoint })}
            disabled={!snap.enabled}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
          />
          <i className="fa-solid fa-circle text-gray-400 w-4 text-xs" />
          <span
            className={`text-sm ${snap.enabled ? "text-gray-300" : "text-gray-500"}`}
          >
            Endpoint
          </span>
        </label>

        <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded cursor-pointer">
          <input
            id="snap-midpoint"
            type="checkbox"
            checked={snap.midpoint}
            onChange={() => setSnapSettings({ midpoint: !snap.midpoint })}
            disabled={!snap.enabled}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
          />
          <i className="fa-solid fa-minus text-gray-400 w-4 text-xs" />
          <span
            className={`text-sm ${snap.enabled ? "text-gray-300" : "text-gray-500"}`}
          >
            Midpoint
          </span>
        </label>

        <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded cursor-pointer">
          <input
            id="snap-perpendicular"
            type="checkbox"
            checked={snap.perpendicular}
            onChange={() =>
              setSnapSettings({ perpendicular: !snap.perpendicular })
            }
            disabled={!snap.enabled}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
          />
          <i className="fa-solid fa-turn-up text-gray-400 w-4 text-xs" />
          <span
            className={`text-sm ${snap.enabled ? "text-gray-300" : "text-gray-500"}`}
          >
            Perpendicular
          </span>
        </label>
      </div>

      <div className="h-px bg-gray-700 my-1" />

      <div className="px-3 py-1">
        <div className="text-xs text-gray-500 mb-1">
          Threshold: {snap.threshold}px
        </div>
        <input
          id="snap-threshold"
          type="range"
          min={5}
          max={30}
          value={snap.threshold}
          onChange={(e) =>
            setSnapSettings({ threshold: parseInt(e.target.value, 10) })
          }
          disabled={!snap.enabled}
          className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer disabled:opacity-50"
        />
      </div>
    </div>
  );
}
