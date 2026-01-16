/**
 * IFC Parser Service using web-ifc
 *
 * Parses IFC files and converts them to Pensaer Element format.
 * web-ifc is a WebAssembly-based IFC parser that runs entirely in the browser.
 */

import * as WebIFC from "web-ifc";
import type { Element, ElementType } from "../types";

// IFC Entity type constants from web-ifc
const IFCWALL = 2391406946;
const IFCWALLSTANDARDCASE = 3512223829;
const IFCDOOR = 395920057;
const IFCWINDOW = 3304561284;
const IFCSLAB = 1529196076;
const IFCSPACE = 3856911033;
const IFCROOF = 2016517767;
const IFCCOLUMN = 843113511;
const IFCBEAM = 753842376;
const IFCSTAIR = 331165859;
const IFCOPENINGELEMENT = 3588315303;
const IFCPROPERTYSINGLEVALUE = 3290496277;

// Types for import results
export interface IfcImportResult {
  elements: Element[];
  stats: IfcImportStats;
  warnings: string[];
}

export interface IfcImportStats {
  totalEntities: number;
  walls: number;
  doors: number;
  windows: number;
  rooms: number;
  floors: number;
  roofs: number;
  columns: number;
  beams: number;
  stairs: number;
  openings: number;
  unsupported: number;
}

// Map IFC entity types to Pensaer element types
const ifcTypeMap: Record<number, ElementType> = {
  [IFCWALL]: "wall",
  [IFCWALLSTANDARDCASE]: "wall",
  [IFCDOOR]: "door",
  [IFCWINDOW]: "window",
  [IFCSLAB]: "floor",
  [IFCSPACE]: "room",
  [IFCROOF]: "roof",
  [IFCCOLUMN]: "column",
  [IFCBEAM]: "beam",
  [IFCSTAIR]: "stair",
};

/**
 * IFC Parser class using web-ifc WASM module
 */
export class IfcParser {
  private ifcApi: WebIFC.IfcAPI | null = null;
  private isInitialized = false;

  /**
   * Initialize the web-ifc WASM module
   * Must be called before parsing any IFC files
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    this.ifcApi = new WebIFC.IfcAPI();

    // Set the WASM path - web-ifc expects the wasm file to be in a specific location
    // In Vite, we can use the public folder or node_modules path
    this.ifcApi.SetWasmPath("/node_modules/web-ifc/");

    await this.ifcApi.Init();
    this.isInitialized = true;
  }

  /**
   * Parse an IFC file from a File object (for browser file input)
   */
  async parseFile(file: File): Promise<IfcImportResult> {
    const buffer = await file.arrayBuffer();
    return this.parseBuffer(new Uint8Array(buffer));
  }

  /**
   * Parse IFC content from a string (for testing or direct input)
   */
  async parseString(content: string): Promise<IfcImportResult> {
    const encoder = new TextEncoder();
    return this.parseBuffer(encoder.encode(content));
  }

  /**
   * Parse IFC content from a Uint8Array buffer
   */
  async parseBuffer(data: Uint8Array): Promise<IfcImportResult> {
    if (!this.ifcApi || !this.isInitialized) {
      await this.init();
    }

    const api = this.ifcApi!;
    const modelID = api.OpenModel(data);
    const warnings: string[] = [];

    const stats: IfcImportStats = {
      totalEntities: 0,
      walls: 0,
      doors: 0,
      windows: 0,
      rooms: 0,
      floors: 0,
      roofs: 0,
      columns: 0,
      beams: 0,
      stairs: 0,
      openings: 0,
      unsupported: 0,
    };

    const elements: Element[] = [];

    try {
      // Process each supported IFC entity type
      for (const [ifcType, elementType] of Object.entries(ifcTypeMap)) {
        const typeId = parseInt(ifcType);
        const entityIds = api.GetLineIDsWithType(modelID, typeId);

        for (let i = 0; i < entityIds.size(); i++) {
          const expressID = entityIds.get(i);
          stats.totalEntities++;

          try {
            const element = this.extractElement(
              api,
              modelID,
              expressID,
              elementType
            );
            if (element) {
              elements.push(element);
              this.incrementStat(stats, elementType);
            }
          } catch (err) {
            warnings.push(
              `Failed to extract ${elementType} #${expressID}: ${err}`
            );
            stats.unsupported++;
          }
        }
      }

      // Count openings (for stats, not converted to elements)
      const openingIds = api.GetLineIDsWithType(modelID, IFCOPENINGELEMENT);
      stats.openings = openingIds.size();
      stats.totalEntities += stats.openings;
    } finally {
      api.CloseModel(modelID);
    }

    return { elements, stats, warnings };
  }

  /**
   * Extract a single element from the IFC model
   */
  private extractElement(
    api: WebIFC.IfcAPI,
    modelID: number,
    expressID: number,
    elementType: ElementType
  ): Element | null {
    const props = api.GetLine(modelID, expressID);

    if (!props) return null;

    // Extract basic properties
    const globalId = this.extractGlobalId(props);
    const name = this.extractName(props) || `${elementType}-${expressID}`;

    // Extract geometry placement (simplified - uses local placement coordinates)
    const geometry = this.extractGeometry(api, modelID, expressID);

    // Extract property sets
    const properties = this.extractProperties(api, modelID, expressID);

    const element: Element = {
      id: globalId || `ifc-${expressID}`,
      type: elementType,
      name,
      x: geometry.x,
      y: geometry.y,
      width: geometry.width,
      height: geometry.height,
      rotation: geometry.rotation,
      properties: {
        ifcExpressId: expressID,
        ...properties,
      },
      relationships: {},
      issues: [],
      aiSuggestions: [],
    };

    return element;
  }

  /**
   * Extract GlobalId from IFC entity
   */
  private extractGlobalId(props: Record<string, unknown>): string | null {
    const globalId = props.GlobalId;
    if (globalId && typeof globalId === "object" && "value" in globalId) {
      return String((globalId as { value: unknown }).value);
    }
    return null;
  }

  /**
   * Extract Name from IFC entity
   */
  private extractName(props: Record<string, unknown>): string | null {
    const name = props.Name;
    if (name && typeof name === "object" && "value" in name) {
      return String((name as { value: unknown }).value);
    }
    return null;
  }

  /**
   * Extract geometry information from an IFC entity
   * This is simplified - real IFC geometry is much more complex
   */
  private extractGeometry(
    api: WebIFC.IfcAPI,
    modelID: number,
    expressID: number
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  } {
    try {
      // Try to get flat mesh coordinates for bounding box
      const flatMesh = api.GetFlatMesh(modelID, expressID);

      if (flatMesh.geometries.size() > 0) {
        const geometry = flatMesh.geometries.get(0);
        const placement = geometry.flatTransformation;

        // Extract position from transformation matrix (4x4)
        // Matrix layout: [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33]
        const x = placement[12] * 100; // Convert to canvas units (assuming meters to mm scale)
        const y = placement[13] * 100;

        // Calculate rotation from transformation matrix
        const rotation = Math.atan2(placement[1], placement[0]) * (180 / Math.PI);

        return {
          x: Math.round(x + 400), // Offset to center on canvas
          y: Math.round(y + 300),
          width: 100, // Default width (would need full geometry extraction for accurate size)
          height: 20, // Default height for walls
          rotation: Math.abs(rotation) > 0.01 ? rotation : undefined,
        };
      }
    } catch {
      // Geometry extraction failed - use defaults
    }

    // Default geometry for elements without extractable geometry
    return {
      x: 400 + Math.random() * 400,
      y: 300 + Math.random() * 200,
      width: 100,
      height: 20,
    };
  }

  /**
   * Extract property sets from an IFC entity
   */
  private extractProperties(
    api: WebIFC.IfcAPI,
    modelID: number,
    expressID: number
  ): Record<string, string | number | boolean> {
    const properties: Record<string, string | number | boolean> = {};

    try {
      // Get property sets defined by this element
      const propSets = api.GetPropertySets(modelID, expressID);

      for (const pset of propSets) {
        if (pset.HasProperties) {
          for (const prop of pset.HasProperties) {
            if (prop.type === IFCPROPERTYSINGLEVALUE) {
              const propLine = api.GetLine(modelID, prop.expressID);
              if (propLine && propLine.Name && propLine.NominalValue) {
                const propName = propLine.Name.value || propLine.Name;
                const propValue = propLine.NominalValue.value ?? propLine.NominalValue;

                if (
                  typeof propValue === "string" ||
                  typeof propValue === "number" ||
                  typeof propValue === "boolean"
                ) {
                  properties[String(propName)] = propValue;
                }
              }
            }
          }
        }
      }
    } catch {
      // Property extraction is optional, continue without
    }

    return properties;
  }

  /**
   * Increment the appropriate stat counter
   */
  private incrementStat(stats: IfcImportStats, type: ElementType): void {
    switch (type) {
      case "wall":
        stats.walls++;
        break;
      case "door":
        stats.doors++;
        break;
      case "window":
        stats.windows++;
        break;
      case "room":
        stats.rooms++;
        break;
      case "floor":
        stats.floors++;
        break;
      case "roof":
        stats.roofs++;
        break;
      case "column":
        stats.columns++;
        break;
      case "beam":
        stats.beams++;
        break;
      case "stair":
        stats.stairs++;
        break;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.ifcApi = null;
    this.isInitialized = false;
  }
}

// Singleton instance for convenience
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
 * Convenience function that handles initialization automatically
 */
export async function parseIfcFile(file: File): Promise<IfcImportResult> {
  const parser = getIfcParser();
  await parser.init();
  return parser.parseFile(file);
}

/**
 * Parse IFC content from a string
 * Convenience function for testing
 */
export async function parseIfcString(content: string): Promise<IfcImportResult> {
  const parser = getIfcParser();
  await parser.init();
  return parser.parseString(content);
}
