/**
 * IFC Importer
 *
 * Handles parsing IFC files and converting to Pensaer Element format.
 */

import * as WebIFC from "web-ifc";
import type { Element, ElementType } from "../../types";
import { PropertyMapper } from "./propertyMapper";
import { IFCOPENINGELEMENT } from "./constants";
import type {
  IfcImportResult,
  IfcImportStats,
  ExtractedGeometry,
} from "./types";
import { ifcTypeMap } from "./types";

/**
 * IFC Importer class
 */
export class IfcImporter {
  constructor(private api: WebIFC.IfcAPI) {}

  /**
   * Parse IFC content from a Uint8Array buffer
   */
  async parseBuffer(data: Uint8Array): Promise<IfcImportResult> {
    const modelID = this.api.OpenModel(data);
    const warnings: string[] = [];
    const stats = this.createEmptyStats();
    const elements: Element[] = [];

    try {
      // Process each supported IFC entity type
      for (const [ifcType, elementType] of Object.entries(ifcTypeMap)) {
        const typeId = parseInt(ifcType);
        const entityIds = this.api.GetLineIDsWithType(modelID, typeId);

        for (let i = 0; i < entityIds.size(); i++) {
          const expressID = entityIds.get(i);
          stats.totalEntities++;

          try {
            const element = this.extractElement(modelID, expressID, elementType);
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
      const openingIds = this.api.GetLineIDsWithType(modelID, IFCOPENINGELEMENT);
      stats.openings = openingIds.size();
      stats.totalEntities += stats.openings;
    } finally {
      this.api.CloseModel(modelID);
    }

    return { elements, stats, warnings };
  }

  /**
   * Extract a single element from the IFC model
   */
  private extractElement(
    modelID: number,
    expressID: number,
    elementType: ElementType
  ): Element | null {
    const props = this.api.GetLine(modelID, expressID);
    if (!props) return null;

    const globalId = this.extractGlobalId(props);
    const name = this.extractName(props) || `${elementType}-${expressID}`;
    const geometry = this.extractGeometry(modelID, expressID);

    // Extract property sets with preservation for round-trip fidelity
    const propertyMapper = new PropertyMapper(this.api);
    const { preserved, flattened } = propertyMapper.extractAllProperties(
      modelID,
      expressID
    );

    return {
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
        ...flattened,
        _ifcPropertySets: preserved as unknown as string | number | boolean,
      },
      relationships: {},
      issues: [],
      aiSuggestions: [],
    };
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
   */
  private extractGeometry(modelID: number, expressID: number): ExtractedGeometry {
    try {
      const flatMesh = this.api.GetFlatMesh(modelID, expressID);

      if (flatMesh.geometries.size() > 0) {
        const geometry = flatMesh.geometries.get(0);
        const placement = geometry.flatTransformation;

        // Extract position from transformation matrix (4x4)
        const x = placement[12] * 100;
        const y = placement[13] * 100;
        const rotation = Math.atan2(placement[1], placement[0]) * (180 / Math.PI);

        return {
          x: Math.round(x + 400),
          y: Math.round(y + 300),
          width: 100,
          height: 20,
          rotation: Math.abs(rotation) > 0.01 ? rotation : undefined,
        };
      }
    } catch {
      // Geometry extraction failed - use defaults
    }

    return {
      x: 400 + Math.random() * 400,
      y: 300 + Math.random() * 200,
      width: 100,
      height: 20,
    };
  }

  /**
   * Increment the appropriate stat counter
   */
  private incrementStat(stats: IfcImportStats, type: ElementType): void {
    const key = type === "room" ? "rooms" : `${type}s` as keyof IfcImportStats;
    if (key in stats && typeof stats[key] === "number") {
      (stats[key] as number)++;
    }
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): IfcImportStats {
    return {
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
  }
}
