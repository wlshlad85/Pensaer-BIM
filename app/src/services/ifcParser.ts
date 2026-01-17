/**
 * IFC Parser Service using web-ifc
 *
 * Parses IFC files and converts them to Pensaer Element format.
 * Exports Pensaer elements to IFC format.
 * web-ifc is a WebAssembly-based IFC parser that runs entirely in the browser.
 */

import * as WebIFC from "web-ifc";
import type { Element, ElementType } from "../types";

// Additional IFC constants for export
const IFCPROJECT = 103090709;
const IFCSITE = 4097777520;
const IFCBUILDING = 4031249490;
const IFCBUILDINGSTOREY = 3124254112;
const IFCOWNERHISTORY = 1207048766;
const IFCPERSON = 2077209135;
const IFCORGANIZATION = 4251960020;
const IFCPERSONANDORGANIZATION = 101040310;
const IFCAPPLICATION = 639542469;
const IFCSIUNIT = 448429030;
const IFCUNITASSIGNMENT = 180925521;
const IFCLOCALPLACEMENT = 2624227202;
const IFCAXIS2PLACEMENT3D = 2740243338;
const IFCCARTESIANPOINT = 1123145078;
const IFCDIRECTION = 32440307;
const IFCRELCONTAINEDINSPATIALSTRUCTURE = 3242617779;
const IFCRELAGGREGATES = 160246688;

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

// Types for export results
export interface IfcExportResult {
  data: Uint8Array;
  filename: string;
  stats: IfcExportStats;
}

export interface IfcExportStats {
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
}

export interface IfcExportOptions {
  projectName?: string;
  author?: string;
  organization?: string;
  ifcVersion?: "IFC2X3" | "IFC4";
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

// Reverse map: Pensaer types to IFC types (for export)
const pensaerToIfcType: Record<ElementType, number> = {
  wall: IFCWALLSTANDARDCASE,
  door: IFCDOOR,
  window: IFCWINDOW,
  floor: IFCSLAB,
  room: IFCSPACE,
  roof: IFCROOF,
  column: IFCCOLUMN,
  beam: IFCBEAM,
  stair: IFCSTAIR,
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

  // ============================================
  // EXPORT METHODS
  // ============================================

  /**
   * Export Pensaer elements to IFC format
   */
  async exportElements(
    elements: Element[],
    options: IfcExportOptions = {}
  ): Promise<IfcExportResult> {
    if (!this.ifcApi || !this.isInitialized) {
      await this.init();
    }

    const api = this.ifcApi!;
    const {
      projectName = "Pensaer Project",
      author = "Pensaer User",
      organization = "Pensaer BIM",
    } = options;

    // Create a new model
    const modelID = api.CreateModel({ schema: WebIFC.Schemas.IFC4 });

    const stats: IfcExportStats = {
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
    };

    let expressID = 1;

    try {
      // Create IFC header entities
      const { ownerHistoryId, projectId, siteId, buildingId, storeyId, nextId } =
        this.createIfcHeader(api, modelID, expressID, projectName, author, organization);
      expressID = nextId;

      // Track element express IDs for spatial containment
      const elementExpressIds: number[] = [];

      // Export each element
      for (const element of elements) {
        const ifcType = pensaerToIfcType[element.type];
        if (!ifcType) continue;

        const elementId = this.exportElement(
          api,
          modelID,
          expressID,
          element,
          ifcType,
          ownerHistoryId,
          storeyId
        );

        if (elementId) {
          elementExpressIds.push(elementId);
          expressID = elementId + 10; // Leave room for sub-entities
          stats.totalEntities++;
          this.incrementExportStat(stats, element.type);
        }
      }

      // Create spatial containment relationship
      if (elementExpressIds.length > 0) {
        this.createSpatialContainment(
          api,
          modelID,
          expressID,
          storeyId,
          elementExpressIds,
          ownerHistoryId
        );
      }

      // Save the model
      const data = api.SaveModel(modelID);

      return {
        data,
        filename: `${projectName.replace(/\s+/g, "_")}.ifc`,
        stats,
      };
    } finally {
      api.CloseModel(modelID);
    }
  }

  /**
   * Create IFC header entities (project, site, building, storey)
   */
  private createIfcHeader(
    api: WebIFC.IfcAPI,
    modelID: number,
    startId: number,
    projectName: string,
    author: string,
    organization: string
  ): {
    ownerHistoryId: number;
    projectId: number;
    siteId: number;
    buildingId: number;
    storeyId: number;
    nextId: number;
  } {
    let id = startId;

    // Origin point
    const originId = id++;
    api.WriteLine(modelID, {
      expressID: originId,
      type: IFCCARTESIANPOINT,
      Coordinates: [{ type: 4, value: 0 }, { type: 4, value: 0 }, { type: 4, value: 0 }],
    });

    // Z Direction
    const zDirId = id++;
    api.WriteLine(modelID, {
      expressID: zDirId,
      type: IFCDIRECTION,
      DirectionRatios: [{ type: 4, value: 0 }, { type: 4, value: 0 }, { type: 4, value: 1 }],
    });

    // X Direction
    const xDirId = id++;
    api.WriteLine(modelID, {
      expressID: xDirId,
      type: IFCDIRECTION,
      DirectionRatios: [{ type: 4, value: 1 }, { type: 4, value: 0 }, { type: 4, value: 0 }],
    });

    // World Coordinate System
    const wcsId = id++;
    api.WriteLine(modelID, {
      expressID: wcsId,
      type: IFCAXIS2PLACEMENT3D,
      Location: { type: 5, value: originId },
      Axis: { type: 5, value: zDirId },
      RefDirection: { type: 5, value: xDirId },
    });

    // Person
    const personId = id++;
    api.WriteLine(modelID, {
      expressID: personId,
      type: IFCPERSON,
      Identification: { type: 1, value: author },
      FamilyName: { type: 1, value: author },
      GivenName: null,
      MiddleNames: null,
      PrefixTitles: null,
      SuffixTitles: null,
      Roles: null,
      Addresses: null,
    });

    // Organization
    const orgId = id++;
    api.WriteLine(modelID, {
      expressID: orgId,
      type: IFCORGANIZATION,
      Identification: { type: 1, value: organization },
      Name: { type: 1, value: organization },
      Description: null,
      Roles: null,
      Addresses: null,
    });

    // Person and Organization
    const personOrgId = id++;
    api.WriteLine(modelID, {
      expressID: personOrgId,
      type: IFCPERSONANDORGANIZATION,
      ThePerson: { type: 5, value: personId },
      TheOrganization: { type: 5, value: orgId },
      Roles: null,
    });

    // Application
    const appId = id++;
    api.WriteLine(modelID, {
      expressID: appId,
      type: IFCAPPLICATION,
      ApplicationDeveloper: { type: 5, value: orgId },
      Version: { type: 1, value: "1.0" },
      ApplicationFullName: { type: 1, value: "Pensaer BIM" },
      ApplicationIdentifier: { type: 1, value: "PENSAER" },
    });

    // Owner History
    const ownerHistoryId = id++;
    api.WriteLine(modelID, {
      expressID: ownerHistoryId,
      type: IFCOWNERHISTORY,
      OwningUser: { type: 5, value: personOrgId },
      OwningApplication: { type: 5, value: appId },
      State: null,
      ChangeAction: { type: 3, value: "ADDED" },
      LastModifiedDate: null,
      LastModifyingUser: null,
      LastModifyingApplication: null,
      CreationDate: { type: 4, value: Math.floor(Date.now() / 1000) },
    });

    // SI Units
    const lengthUnitId = id++;
    api.WriteLine(modelID, {
      expressID: lengthUnitId,
      type: IFCSIUNIT,
      Dimensions: null,
      UnitType: { type: 3, value: "LENGTHUNIT" },
      Prefix: { type: 3, value: "MILLI" },
      Name: { type: 3, value: "METRE" },
    });

    const areaUnitId = id++;
    api.WriteLine(modelID, {
      expressID: areaUnitId,
      type: IFCSIUNIT,
      Dimensions: null,
      UnitType: { type: 3, value: "AREAUNIT" },
      Prefix: null,
      Name: { type: 3, value: "SQUARE_METRE" },
    });

    // Unit Assignment
    const unitAssignmentId = id++;
    api.WriteLine(modelID, {
      expressID: unitAssignmentId,
      type: IFCUNITASSIGNMENT,
      Units: [{ type: 5, value: lengthUnitId }, { type: 5, value: areaUnitId }],
    });

    // Project
    const projectId = id++;
    api.WriteLine(modelID, {
      expressID: projectId,
      type: IFCPROJECT,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: { type: 1, value: projectName },
      Description: { type: 1, value: "Exported from Pensaer BIM" },
      ObjectType: null,
      LongName: null,
      Phase: null,
      RepresentationContexts: null,
      UnitsInContext: { type: 5, value: unitAssignmentId },
    });

    // Site placement
    const sitePlacementId = id++;
    api.WriteLine(modelID, {
      expressID: sitePlacementId,
      type: IFCLOCALPLACEMENT,
      PlacementRelTo: null,
      RelativePlacement: { type: 5, value: wcsId },
    });

    // Site
    const siteId = id++;
    api.WriteLine(modelID, {
      expressID: siteId,
      type: IFCSITE,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: { type: 1, value: "Default Site" },
      Description: null,
      ObjectType: null,
      ObjectPlacement: { type: 5, value: sitePlacementId },
      Representation: null,
      LongName: null,
      CompositionType: { type: 3, value: "ELEMENT" },
      RefLatitude: null,
      RefLongitude: null,
      RefElevation: null,
      LandTitleNumber: null,
      SiteAddress: null,
    });

    // Building placement
    const buildingPlacementId = id++;
    api.WriteLine(modelID, {
      expressID: buildingPlacementId,
      type: IFCLOCALPLACEMENT,
      PlacementRelTo: { type: 5, value: sitePlacementId },
      RelativePlacement: { type: 5, value: wcsId },
    });

    // Building
    const buildingId = id++;
    api.WriteLine(modelID, {
      expressID: buildingId,
      type: IFCBUILDING,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: { type: 1, value: "Default Building" },
      Description: null,
      ObjectType: null,
      ObjectPlacement: { type: 5, value: buildingPlacementId },
      Representation: null,
      LongName: null,
      CompositionType: { type: 3, value: "ELEMENT" },
      ElevationOfRefHeight: null,
      ElevationOfTerrain: null,
      BuildingAddress: null,
    });

    // Storey placement
    const storeyPlacementId = id++;
    api.WriteLine(modelID, {
      expressID: storeyPlacementId,
      type: IFCLOCALPLACEMENT,
      PlacementRelTo: { type: 5, value: buildingPlacementId },
      RelativePlacement: { type: 5, value: wcsId },
    });

    // Building Storey
    const storeyId = id++;
    api.WriteLine(modelID, {
      expressID: storeyId,
      type: IFCBUILDINGSTOREY,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: { type: 1, value: "Level 1" },
      Description: null,
      ObjectType: null,
      ObjectPlacement: { type: 5, value: storeyPlacementId },
      Representation: null,
      LongName: null,
      CompositionType: { type: 3, value: "ELEMENT" },
      Elevation: { type: 4, value: 0 },
    });

    // Create aggregation relationships
    // Site aggregates to Project
    const relProjectSiteId = id++;
    api.WriteLine(modelID, {
      expressID: relProjectSiteId,
      type: IFCRELAGGREGATES,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: null,
      Description: null,
      RelatingObject: { type: 5, value: projectId },
      RelatedObjects: [{ type: 5, value: siteId }],
    });

    // Building aggregates to Site
    const relSiteBuildingId = id++;
    api.WriteLine(modelID, {
      expressID: relSiteBuildingId,
      type: IFCRELAGGREGATES,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: null,
      Description: null,
      RelatingObject: { type: 5, value: siteId },
      RelatedObjects: [{ type: 5, value: buildingId }],
    });

    // Storey aggregates to Building
    const relBuildingStoreyId = id++;
    api.WriteLine(modelID, {
      expressID: relBuildingStoreyId,
      type: IFCRELAGGREGATES,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: null,
      Description: null,
      RelatingObject: { type: 5, value: buildingId },
      RelatedObjects: [{ type: 5, value: storeyId }],
    });

    return {
      ownerHistoryId,
      projectId,
      siteId,
      buildingId,
      storeyId,
      nextId: id,
    };
  }

  /**
   * Export a single Pensaer element to IFC
   */
  private exportElement(
    api: WebIFC.IfcAPI,
    modelID: number,
    startId: number,
    element: Element,
    ifcType: number,
    ownerHistoryId: number,
    storeyPlacementId: number
  ): number | null {
    let id = startId;

    // Create placement point
    const pointId = id++;
    const x = (element.x - 400) / 100; // Convert from canvas to meters
    const y = (element.y - 300) / 100;
    const z = 0;

    api.WriteLine(modelID, {
      expressID: pointId,
      type: IFCCARTESIANPOINT,
      Coordinates: [
        { type: 4, value: x },
        { type: 4, value: y },
        { type: 4, value: z },
      ],
    });

    // Z direction
    const zDirId = id++;
    api.WriteLine(modelID, {
      expressID: zDirId,
      type: IFCDIRECTION,
      DirectionRatios: [
        { type: 4, value: 0 },
        { type: 4, value: 0 },
        { type: 4, value: 1 },
      ],
    });

    // X direction (consider rotation)
    const rotation = element.rotation || 0;
    const radians = (rotation * Math.PI) / 180;
    const xDirId = id++;
    api.WriteLine(modelID, {
      expressID: xDirId,
      type: IFCDIRECTION,
      DirectionRatios: [
        { type: 4, value: Math.cos(radians) },
        { type: 4, value: Math.sin(radians) },
        { type: 4, value: 0 },
      ],
    });

    // Axis placement
    const axisId = id++;
    api.WriteLine(modelID, {
      expressID: axisId,
      type: IFCAXIS2PLACEMENT3D,
      Location: { type: 5, value: pointId },
      Axis: { type: 5, value: zDirId },
      RefDirection: { type: 5, value: xDirId },
    });

    // Local placement
    const placementId = id++;
    api.WriteLine(modelID, {
      expressID: placementId,
      type: IFCLOCALPLACEMENT,
      PlacementRelTo: { type: 5, value: storeyPlacementId },
      RelativePlacement: { type: 5, value: axisId },
    });

    // Create the element
    const elementId = id++;
    const globalId = element.id.startsWith("ifc-")
      ? this.generateGlobalId()
      : element.id.length === 22
        ? element.id
        : this.generateGlobalId();

    api.WriteLine(modelID, {
      expressID: elementId,
      type: ifcType,
      GlobalId: { type: 1, value: globalId },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: { type: 1, value: element.name },
      Description: { type: 1, value: `Pensaer ${element.type}` },
      ObjectType: null,
      ObjectPlacement: { type: 5, value: placementId },
      Representation: null,
      Tag: null,
    });

    return elementId;
  }

  /**
   * Create spatial containment relationship
   */
  private createSpatialContainment(
    api: WebIFC.IfcAPI,
    modelID: number,
    id: number,
    storeyId: number,
    elementIds: number[],
    ownerHistoryId: number
  ): void {
    api.WriteLine(modelID, {
      expressID: id,
      type: IFCRELCONTAINEDINSPATIALSTRUCTURE,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: null,
      Description: null,
      RelatedElements: elementIds.map((eid) => ({ type: 5, value: eid })),
      RelatingStructure: { type: 5, value: storeyId },
    });
  }

  /**
   * Generate a unique IFC GlobalId (22 character base64)
   */
  private generateGlobalId(): string {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
    let result = "";
    for (let i = 0; i < 22; i++) {
      result += chars.charAt(Math.floor(Math.random() * 64));
    }
    return result;
  }

  /**
   * Increment export stat counter
   */
  private incrementExportStat(stats: IfcExportStats, type: ElementType): void {
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

/**
 * Export Pensaer elements to IFC format
 * Returns a Uint8Array that can be saved as .ifc file
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

  // Create blob and download
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
