/**
 * Pensaer BIM Platform - Model Import/Export Service
 *
 * Handles JSON import/export for model data with validation,
 * versioning, and merge/replace options.
 */

import { useModelStore } from "../stores";
import type { Element, Level } from "../types";

// ============================================
// VERSION & CONSTANTS
// ============================================

const EXPORT_VERSION = "1.0.0";
const SUPPORTED_VERSIONS = ["1.0.0"];

// ============================================
// TYPES
// ============================================

/**
 * Model export format with version metadata
 */
export interface ModelExport {
  /** Export format version */
  version: string;
  /** ISO timestamp of export */
  exportedAt: string;
  /** Application identifier */
  application: string;
  /** Model data */
  model: {
    /** Project name */
    name: string;
    /** BIM elements */
    elements: Element[];
    /** Building levels */
    levels: Level[];
  };
}

/**
 * Import options
 */
export interface ImportOptions {
  /** How to handle existing data */
  mode: "replace" | "merge";
  /** Whether to validate schema before import */
  validateSchema?: boolean;
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  /** Number of elements imported */
  elementsImported: number;
  /** Number of levels imported */
  levelsImported: number;
  /** Warning messages */
  warnings: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export model data as JSON string
 */
export function exportModel(projectName = "Untitled Project"): string {
  const { elements, levels } = useModelStore.getState();

  const data: ModelExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    application: "Pensaer BIM",
    model: {
      name: projectName,
      elements: [...elements],
      levels: [...levels],
    },
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Export model and trigger file download
 */
export function downloadModel(
  projectName = "Untitled Project",
  filename?: string
): void {
  const json = exportModel(projectName);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ?? `pensaer-model-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate imported JSON structure
 */
export function validateModelExport(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if data is an object
  if (typeof data !== "object" || data === null) {
    return { valid: false, errors: ["Invalid data: expected object"], warnings };
  }

  const obj = data as Record<string, unknown>;

  // Check version
  if (typeof obj.version !== "string") {
    errors.push("Missing or invalid 'version' field");
  } else if (!SUPPORTED_VERSIONS.includes(obj.version)) {
    warnings.push(
      `Unknown version '${obj.version}'. Import may have compatibility issues.`
    );
  }

  // Check exportedAt
  if (typeof obj.exportedAt !== "string") {
    warnings.push("Missing 'exportedAt' field");
  }

  // Check model object
  if (typeof obj.model !== "object" || obj.model === null) {
    errors.push("Missing or invalid 'model' field");
    return { valid: errors.length === 0, errors, warnings };
  }

  const model = obj.model as Record<string, unknown>;

  // Check elements array
  if (!Array.isArray(model.elements)) {
    errors.push("Missing or invalid 'model.elements' field (expected array)");
  } else {
    // Validate each element has required fields
    model.elements.forEach((el, index) => {
      if (typeof el !== "object" || el === null) {
        errors.push(`Element at index ${index} is not an object`);
        return;
      }
      const element = el as Record<string, unknown>;
      if (typeof element.id !== "string") {
        errors.push(`Element at index ${index} missing 'id' field`);
      }
      if (typeof element.type !== "string") {
        errors.push(`Element at index ${index} missing 'type' field`);
      }
    });
  }

  // Check levels array (optional)
  if (model.levels !== undefined && !Array.isArray(model.levels)) {
    errors.push("Invalid 'model.levels' field (expected array)");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================
// IMPORT FUNCTIONS
// ============================================

/**
 * Import model from JSON string
 */
export function importModel(
  jsonString: string,
  options: ImportOptions = { mode: "replace", validateSchema: true }
): ImportResult {
  const warnings: string[] = [];

  // Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch (error) {
    return {
      success: false,
      elementsImported: 0,
      levelsImported: 0,
      warnings: [],
      error: `Invalid JSON: ${error instanceof Error ? error.message : "Parse error"}`,
    };
  }

  // Validate schema
  if (options.validateSchema !== false) {
    const validation = validateModelExport(data);
    if (!validation.valid) {
      return {
        success: false,
        elementsImported: 0,
        levelsImported: 0,
        warnings: validation.warnings,
        error: `Validation failed: ${validation.errors.join("; ")}`,
      };
    }
    warnings.push(...validation.warnings);
  }

  // Extract model data
  const exportData = data as ModelExport;
  const { elements: newElements, levels: newLevels } = exportData.model;

  const store = useModelStore.getState();

  if (options.mode === "replace") {
    // Replace all data
    store.setElements(newElements);
    if (newLevels && newLevels.length > 0) {
      store.setLevels(newLevels);
    }
  } else {
    // Merge mode - add elements that don't exist
    const existingIds = new Set(store.elements.map((e) => e.id));

    let addedCount = 0;
    for (const element of newElements) {
      if (!existingIds.has(element.id)) {
        store.addElement(element);
        addedCount++;
      } else {
        warnings.push(`Skipped duplicate element: ${element.id}`);
      }
    }

    // Merge levels
    if (newLevels && newLevels.length > 0) {
      const existingLevelIds = new Set(store.levels.map((l) => l.id));
      for (const level of newLevels) {
        if (!existingLevelIds.has(level.id)) {
          store.addLevel(level);
        }
      }
    }
  }

  return {
    success: true,
    elementsImported: newElements.length,
    levelsImported: newLevels?.length ?? 0,
    warnings,
  };
}

/**
 * Import model from File object (for file upload handling)
 */
export async function importModelFromFile(
  file: File,
  options?: ImportOptions
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== "string") {
        resolve({
          success: false,
          elementsImported: 0,
          levelsImported: 0,
          warnings: [],
          error: "Failed to read file content",
        });
        return;
      }

      const result = importModel(content, options);
      resolve(result);
    };

    reader.onerror = () => {
      resolve({
        success: false,
        elementsImported: 0,
        levelsImported: 0,
        warnings: [],
        error: "Failed to read file",
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Create a file input and trigger file selection dialog
 * Returns a promise that resolves with the import result
 */
export function promptImportModel(
  options?: ImportOptions
): Promise<ImportResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const result = await importModelFromFile(file, options);
      resolve(result);
    };

    input.oncancel = () => {
      resolve(null);
    };

    input.click();
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get model statistics for display
 */
export function getModelStats(): {
  elementCount: number;
  levelCount: number;
  elementsByType: Record<string, number>;
} {
  const { elements, levels } = useModelStore.getState();

  const elementsByType: Record<string, number> = {};
  for (const element of elements) {
    elementsByType[element.type] = (elementsByType[element.type] ?? 0) + 1;
  }

  return {
    elementCount: elements.length,
    levelCount: levels.length,
    elementsByType,
  };
}
