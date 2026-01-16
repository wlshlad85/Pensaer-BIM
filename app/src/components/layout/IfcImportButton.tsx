/**
 * IFC Import Button Component
 *
 * Provides a button to import IFC files using the web-ifc parser.
 * Displays import progress and results.
 */

import { useRef, useState } from "react";
import { parseIfcFile, type IfcImportResult } from "../../services";
import { useModelStore } from "../../stores";

type ImportState = "idle" | "loading" | "success" | "error";

export function IfcImportButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [importResult, setImportResult] = useState<IfcImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const setElements = useModelStore((s) => s.setElements);
  const addElement = useModelStore((s) => s.addElement);
  const elements = useModelStore((s) => s.elements);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setImportState("loading");
    setError(null);
    setImportResult(null);

    try {
      const result = await parseIfcFile(file);
      setImportResult(result);

      if (result.elements.length > 0) {
        // Merge with existing elements (avoid ID conflicts)
        const existingIds = new Set(elements.map((el) => el.id));
        const newElements = result.elements.filter((el) => !existingIds.has(el.id));

        if (newElements.length > 0) {
          newElements.forEach((el) => addElement(el));
        }

        // If all elements replaced, use setElements instead
        if (newElements.length === result.elements.length) {
          setElements([...elements, ...newElements]);
        }

        setImportState("success");
      } else {
        setImportState("success");
      }

      // Show tooltip with results
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse IFC file");
      setImportState("error");
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 5000);
    }

    // Reset file input to allow re-importing same file
    e.target.value = "";
  };

  const getButtonIcon = () => {
    switch (importState) {
      case "loading":
        return "fa-spinner fa-spin";
      case "success":
        return "fa-check";
      case "error":
        return "fa-exclamation-triangle";
      default:
        return "fa-file-import";
    }
  };

  const getButtonColor = () => {
    switch (importState) {
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".ifc"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        onClick={handleClick}
        disabled={importState === "loading"}
        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${getButtonColor()}`}
        title="Import IFC File"
      >
        <i className={`fa-solid ${getButtonIcon()}`}></i>
      </button>

      {/* Tooltip showing import results */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl px-3 py-2 text-sm whitespace-nowrap">
            {importState === "success" && importResult && (
              <div className="text-gray-300">
                <div className="font-medium text-white mb-1">IFC Import Complete</div>
                <div className="text-xs space-y-0.5">
                  <div>Walls: {importResult.stats.walls}</div>
                  <div>Doors: {importResult.stats.doors}</div>
                  <div>Windows: {importResult.stats.windows}</div>
                  <div>Rooms: {importResult.stats.rooms}</div>
                  {importResult.stats.floors > 0 && (
                    <div>Floors: {importResult.stats.floors}</div>
                  )}
                  {importResult.warnings.length > 0 && (
                    <div className="text-orange-400 mt-1">
                      {importResult.warnings.length} warning(s)
                    </div>
                  )}
                </div>
              </div>
            )}
            {importState === "error" && (
              <div className="text-red-400">
                <div className="font-medium">Import Failed</div>
                <div className="text-xs">{error}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
