/**
 * IFC Module
 *
 * Provides IFC import/export functionality using web-ifc.
 *
 * @module services/ifc
 */

import * as WebIFC from "web-ifc";
import { IfcImporter } from "./importer";
import { IfcExporter } from "./exporter";
import type { Element } from "../../types";
import type {
  IfcImportResult,
  IfcExportResult,
  IfcExportOptions,
} from "./types";

// Re-export types
export type {
  IfcImportResult,
  IfcImportStats,
  IfcExportResult,
  IfcExportStats,
  IfcExportOptions,
  IfcHeaderIds,
  ExtractedGeometry,
} from "./types";

// Re-export constants
export * from "./constants";

// Re-export type mappings
export { ifcTypeMap, pensaerToIfcType } from "./types";

// Re-export classes
export { IfcImporter } from "./importer";
export { IfcExporter } from "./exporter";
export { PropertyMapper } from "./propertyMapper";

// ============================================
// IFC PARSER (UNIFIED API)
// ============================================

/**
 * IFC Parser class using web-ifc WASM module
 *
 * Provides a unified API for both import and export operations.
 */
export class IfcParser {
  private ifcApi: WebIFC.IfcAPI | null = null;
  private isInitialized = false;

  /**
   * Initialize the web-ifc WASM module
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    this.ifcApi = new WebIFC.IfcAPI();
    this.ifcApi.SetWasmPath("/node_modules/web-ifc/");
    await this.ifcApi.Init();
    this.isInitialized = true;
  }

  /**
   * Parse an IFC file from a File object
   */
  async parseFile(file: File): Promise<IfcImportResult> {
    const buffer = await file.arrayBuffer();
    return this.parseBuffer(new Uint8Array(buffer));
  }

  /**
   * Parse IFC content from a string
   */
  async parseString(content: string): Promise<IfcImportResult> {
    const encoder = new TextEncoder();
    return this.parseBuffer(encoder.encode(content));
  }

  /**
   * Parse IFC content from a Uint8Array buffer
   */
  async parseBuffer(data: Uint8Array): Promise<IfcImportResult> {
    await this.ensureInitialized();
    const importer = new IfcImporter(this.ifcApi!);
    return importer.parseBuffer(data);
  }

  /**
   * Export Pensaer elements to IFC format
   */
  async exportElements(
    elements: Element[],
    options: IfcExportOptions = {}
  ): Promise<IfcExportResult> {
    await this.ensureInitialized();
    const exporter = new IfcExporter(this.ifcApi!);
    return exporter.exportElements(elements, options);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.ifcApi = null;
    this.isInitialized = false;
  }

  /**
   * Ensure the API is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.ifcApi || !this.isInitialized) {
      await this.init();
    }
  }
}

// ============================================
// SINGLETON & CONVENIENCE FUNCTIONS
// ============================================

let parserInstance: IfcParser | null = null;

/**
 * Get the singleton IFC parser instance
 */
export function getIfcParser(): IfcParser {
  if (!parserInstance) {
    parserInstance = new IfcParser();
  }
  return parserInstance;
}

/**
 * Parse an IFC file and return Pensaer elements
 */
export async function parseIfcFile(file: File): Promise<IfcImportResult> {
  const parser = getIfcParser();
  await parser.init();
  return parser.parseFile(file);
}

/**
 * Parse IFC content from a string
 */
export async function parseIfcString(content: string): Promise<IfcImportResult> {
  const parser = getIfcParser();
  await parser.init();
  return parser.parseString(content);
}

/**
 * Export Pensaer elements to IFC format
 */
export async function exportToIfc(
  elements: Element[],
  options?: IfcExportOptions
): Promise<IfcExportResult> {
  const parser = getIfcParser();
  await parser.init();
  return parser.exportElements(elements, options);
}

/**
 * Export elements and trigger browser download
 */
export async function downloadIfcFile(
  elements: Element[],
  options?: IfcExportOptions
): Promise<void> {
  const result = await exportToIfc(elements, options);

  const blob = new Blob([result.data], { type: "application/x-step" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
