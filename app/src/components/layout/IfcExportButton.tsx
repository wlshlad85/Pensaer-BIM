/**
 * IFC Export Button Component
 *
 * Provides a button to export the current model to IFC format.
 * Displays export progress and results.
 */

import { useState } from "react";
import { downloadIfcFile, type IfcExportResult } from "../../services";
import { useModelStore } from "../../stores";

type ExportState = "idle" | "loading" | "success" | "error";

export function IfcExportButton() {
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [exportStats, setExportStats] = useState<IfcExportResult["stats"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const elements = useModelStore((s) => s.elements);

  const handleExport = async () => {
    if (elements.length === 0) {
      setError("No elements to export");
      setExportState("error");
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }

    setExportState("loading");
    setError(null);
    setExportStats(null);

    try {
      const result = await downloadIfcFile(elements, {
        projectName: "Pensaer Project",
        author: "Pensaer User",
        organization: "Pensaer BIM",
      });

      // downloadIfcFile doesn't return result, but we can get stats from exportToIfc
      // For now, just show success
      setExportStats({
        totalEntities: elements.length,
        walls: elements.filter((e) => e.type === "wall").length,
        doors: elements.filter((e) => e.type === "door").length,
        windows: elements.filter((e) => e.type === "window").length,
        rooms: elements.filter((e) => e.type === "room").length,
        floors: elements.filter((e) => e.type === "floor").length,
        roofs: elements.filter((e) => e.type === "roof").length,
        columns: elements.filter((e) => e.type === "column").length,
        beams: elements.filter((e) => e.type === "beam").length,
        stairs: elements.filter((e) => e.type === "stair").length,
      });

      setExportState("success");
      setShowTooltip(true);
      setTimeout(() => {
        setShowTooltip(false);
        setExportState("idle");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export IFC file");
      setExportState("error");
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 5000);
    }
  };

  const getButtonIcon = () => {
    switch (exportState) {
      case "loading":
        return "fa-spinner fa-spin";
      case "success":
        return "fa-check";
      case "error":
        return "fa-exclamation-triangle";
      default:
        return "fa-file-export";
    }
  };

  const getButtonColor = () => {
    switch (exportState) {
      case "loading":
        return "text-blue-400";
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      default:
        return "text-gray-400 hover:text-white hover:bg-gray-800";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleExport}
        disabled={exportState === "loading"}
        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${getButtonColor()}`}
        title="Export to IFC"
      >
        <i className={`fa-solid ${getButtonIcon()}`}></i>
      </button>

      {/* Tooltip showing export results */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl px-3 py-2 text-sm whitespace-nowrap">
            {exportState === "success" && exportStats && (
              <div className="text-gray-300">
                <div className="font-medium text-white mb-1">IFC Export Complete</div>
                <div className="text-xs space-y-0.5">
                  <div>Total: {exportStats.totalEntities} elements</div>
                  {exportStats.walls > 0 && <div>Walls: {exportStats.walls}</div>}
                  {exportStats.doors > 0 && <div>Doors: {exportStats.doors}</div>}
                  {exportStats.windows > 0 && <div>Windows: {exportStats.windows}</div>}
                  {exportStats.rooms > 0 && <div>Rooms: {exportStats.rooms}</div>}
                </div>
              </div>
            )}
            {exportState === "error" && (
              <div className="text-red-400">
                <div className="font-medium">Export Failed</div>
                <div className="text-xs">{error}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
