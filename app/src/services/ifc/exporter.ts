/**
 * IFC Exporter
 *
 * Handles exporting Pensaer elements to IFC format.
 */

import * as WebIFC from "web-ifc";
import type { Element, ElementType } from "../../types";
import {
  PropertyMapper,
  getPreservedProperties,
  createDefaultPropertySets,
} from "./propertyMapper";
import {
  IFCPROJECT,
  IFCSITE,
  IFCBUILDING,
  IFCBUILDINGSTOREY,
  IFCOWNERHISTORY,
  IFCPERSON,
  IFCORGANIZATION,
  IFCPERSONANDORGANIZATION,
  IFCAPPLICATION,
  IFCSIUNIT,
  IFCUNITASSIGNMENT,
  IFCLOCALPLACEMENT,
  IFCAXIS2PLACEMENT3D,
  IFCCARTESIANPOINT,
  IFCDIRECTION,
  IFCRELCONTAINEDINSPATIALSTRUCTURE,
  IFCRELAGGREGATES,
} from "./constants";
import type {
  IfcExportResult,
  IfcExportStats,
  IfcExportOptions,
  IfcHeaderIds,
} from "./types";
import { pensaerToIfcType } from "./types";

/**
 * IFC Exporter class
 */
export class IfcExporter {
  constructor(private api: WebIFC.IfcAPI) {}

  /**
   * Export Pensaer elements to IFC format
   */
  async exportElements(
    elements: Element[],
    options: IfcExportOptions = {}
  ): Promise<IfcExportResult> {
    const {
      projectName = "Pensaer Project",
      author = "Pensaer User",
      organization = "Pensaer BIM",
    } = options;

    const modelID = this.api.CreateModel({ schema: WebIFC.Schemas.IFC4 });
    const stats = this.createEmptyStats();
    let expressID = 1;

    try {
      // Create IFC header entities
      const headerIds = this.createIfcHeader(
        modelID,
        expressID,
        projectName,
        author,
        organization
      );
      expressID = headerIds.nextId;

      // Track element express IDs for spatial containment
      const elementExpressIds: number[] = [];

      // Export each element
      for (const element of elements) {
        const ifcType = pensaerToIfcType[element.type];
        if (!ifcType) continue;

        const elementId = this.exportElement(
          modelID,
          expressID,
          element,
          ifcType,
          headerIds.ownerHistoryId,
          headerIds.storeyId
        );

        if (elementId) {
          elementExpressIds.push(elementId);
          expressID = elementId + 10;
          stats.totalEntities++;
          this.incrementStat(stats, element.type);
        }
      }

      // Create spatial containment relationship
      if (elementExpressIds.length > 0) {
        this.createSpatialContainment(
          modelID,
          expressID,
          headerIds.storeyId,
          elementExpressIds,
          headerIds.ownerHistoryId
        );
      }

      const data = this.api.SaveModel(modelID);

      return {
        data,
        filename: `${projectName.replace(/\s+/g, "_")}.ifc`,
        stats,
      };
    } finally {
      this.api.CloseModel(modelID);
    }
  }

  /**
   * Create IFC header entities (project, site, building, storey)
   */
  private createIfcHeader(
    modelID: number,
    startId: number,
    projectName: string,
    author: string,
    organization: string
  ): IfcHeaderIds {
    let id = startId;

    // Origin point
    const originId = id++;
    this.api.WriteLine(modelID, {
      expressID: originId,
      type: IFCCARTESIANPOINT,
      Coordinates: [
        { type: 4, value: 0 },
        { type: 4, value: 0 },
        { type: 4, value: 0 },
      ],
    });

    // Z Direction
    const zDirId = id++;
    this.api.WriteLine(modelID, {
      expressID: zDirId,
      type: IFCDIRECTION,
      DirectionRatios: [
        { type: 4, value: 0 },
        { type: 4, value: 0 },
        { type: 4, value: 1 },
      ],
    });

    // X Direction
    const xDirId = id++;
    this.api.WriteLine(modelID, {
      expressID: xDirId,
      type: IFCDIRECTION,
      DirectionRatios: [
        { type: 4, value: 1 },
        { type: 4, value: 0 },
        { type: 4, value: 0 },
      ],
    });

    // World Coordinate System
    const wcsId = id++;
    this.api.WriteLine(modelID, {
      expressID: wcsId,
      type: IFCAXIS2PLACEMENT3D,
      Location: { type: 5, value: originId },
      Axis: { type: 5, value: zDirId },
      RefDirection: { type: 5, value: xDirId },
    });

    // Person
    const personId = id++;
    this.api.WriteLine(modelID, {
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
    this.api.WriteLine(modelID, {
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
    this.api.WriteLine(modelID, {
      expressID: personOrgId,
      type: IFCPERSONANDORGANIZATION,
      ThePerson: { type: 5, value: personId },
      TheOrganization: { type: 5, value: orgId },
      Roles: null,
    });

    // Application
    const appId = id++;
    this.api.WriteLine(modelID, {
      expressID: appId,
      type: IFCAPPLICATION,
      ApplicationDeveloper: { type: 5, value: orgId },
      Version: { type: 1, value: "1.0" },
      ApplicationFullName: { type: 1, value: "Pensaer BIM" },
      ApplicationIdentifier: { type: 1, value: "PENSAER" },
    });

    // Owner History
    const ownerHistoryId = id++;
    this.api.WriteLine(modelID, {
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
    this.api.WriteLine(modelID, {
      expressID: lengthUnitId,
      type: IFCSIUNIT,
      Dimensions: null,
      UnitType: { type: 3, value: "LENGTHUNIT" },
      Prefix: { type: 3, value: "MILLI" },
      Name: { type: 3, value: "METRE" },
    });

    const areaUnitId = id++;
    this.api.WriteLine(modelID, {
      expressID: areaUnitId,
      type: IFCSIUNIT,
      Dimensions: null,
      UnitType: { type: 3, value: "AREAUNIT" },
      Prefix: null,
      Name: { type: 3, value: "SQUARE_METRE" },
    });

    // Unit Assignment
    const unitAssignmentId = id++;
    this.api.WriteLine(modelID, {
      expressID: unitAssignmentId,
      type: IFCUNITASSIGNMENT,
      Units: [
        { type: 5, value: lengthUnitId },
        { type: 5, value: areaUnitId },
      ],
    });

    // Project
    const projectId = id++;
    this.api.WriteLine(modelID, {
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
    this.api.WriteLine(modelID, {
      expressID: sitePlacementId,
      type: IFCLOCALPLACEMENT,
      PlacementRelTo: null,
      RelativePlacement: { type: 5, value: wcsId },
    });

    // Site
    const siteId = id++;
    this.api.WriteLine(modelID, {
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
    this.api.WriteLine(modelID, {
      expressID: buildingPlacementId,
      type: IFCLOCALPLACEMENT,
      PlacementRelTo: { type: 5, value: sitePlacementId },
      RelativePlacement: { type: 5, value: wcsId },
    });

    // Building
    const buildingId = id++;
    this.api.WriteLine(modelID, {
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
    this.api.WriteLine(modelID, {
      expressID: storeyPlacementId,
      type: IFCLOCALPLACEMENT,
      PlacementRelTo: { type: 5, value: buildingPlacementId },
      RelativePlacement: { type: 5, value: wcsId },
    });

    // Building Storey
    const storeyId = id++;
    this.api.WriteLine(modelID, {
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
    this.createAggregationRelationships(
      modelID,
      id,
      ownerHistoryId,
      projectId,
      siteId,
      buildingId,
      storeyId
    );
    id += 3;

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
   * Create aggregation relationships for spatial hierarchy
   */
  private createAggregationRelationships(
    modelID: number,
    startId: number,
    ownerHistoryId: number,
    projectId: number,
    siteId: number,
    buildingId: number,
    storeyId: number
  ): void {
    let id = startId;

    // Site aggregates to Project
    this.api.WriteLine(modelID, {
      expressID: id++,
      type: IFCRELAGGREGATES,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: null,
      Description: null,
      RelatingObject: { type: 5, value: projectId },
      RelatedObjects: [{ type: 5, value: siteId }],
    });

    // Building aggregates to Site
    this.api.WriteLine(modelID, {
      expressID: id++,
      type: IFCRELAGGREGATES,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: null,
      Description: null,
      RelatingObject: { type: 5, value: siteId },
      RelatedObjects: [{ type: 5, value: buildingId }],
    });

    // Storey aggregates to Building
    this.api.WriteLine(modelID, {
      expressID: id++,
      type: IFCRELAGGREGATES,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: null,
      Description: null,
      RelatingObject: { type: 5, value: buildingId },
      RelatedObjects: [{ type: 5, value: storeyId }],
    });
  }

  /**
   * Export a single Pensaer element to IFC
   */
  private exportElement(
    modelID: number,
    startId: number,
    element: Element,
    ifcType: number,
    ownerHistoryId: number,
    storeyPlacementId: number
  ): number | null {
    let id = startId;

    // Create placement
    const { placementId, nextId } = this.createElementPlacement(
      modelID,
      id,
      element,
      storeyPlacementId
    );
    id = nextId;

    // Create the element
    const elementId = id++;
    const globalId = this.resolveGlobalId(element.id);

    this.api.WriteLine(modelID, {
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

    // Write property sets
    this.writeElementPropertySets(
      modelID,
      elementId,
      element,
      id,
      ownerHistoryId
    );

    return elementId;
  }

  /**
   * Create placement entities for an element
   */
  private createElementPlacement(
    modelID: number,
    startId: number,
    element: Element,
    storeyPlacementId: number
  ): { placementId: number; nextId: number } {
    let id = startId;

    // Create placement point
    const pointId = id++;
    const x = (element.x - 400) / 100;
    const y = (element.y - 300) / 100;

    this.api.WriteLine(modelID, {
      expressID: pointId,
      type: IFCCARTESIANPOINT,
      Coordinates: [
        { type: 4, value: x },
        { type: 4, value: y },
        { type: 4, value: 0 },
      ],
    });

    // Z direction
    const zDirId = id++;
    this.api.WriteLine(modelID, {
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
    this.api.WriteLine(modelID, {
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
    this.api.WriteLine(modelID, {
      expressID: axisId,
      type: IFCAXIS2PLACEMENT3D,
      Location: { type: 5, value: pointId },
      Axis: { type: 5, value: zDirId },
      RefDirection: { type: 5, value: xDirId },
    });

    // Local placement
    const placementId = id++;
    this.api.WriteLine(modelID, {
      expressID: placementId,
      type: IFCLOCALPLACEMENT,
      PlacementRelTo: { type: 5, value: storeyPlacementId },
      RelativePlacement: { type: 5, value: axisId },
    });

    return { placementId, nextId: id };
  }

  /**
   * Write property sets for an element
   */
  private writeElementPropertySets(
    modelID: number,
    elementId: number,
    element: Element,
    startId: number,
    ownerHistoryId: number
  ): void {
    const preserved = getPreservedProperties(element.properties);
    const propertyMapper = new PropertyMapper(this.api);

    if (preserved) {
      propertyMapper.writePropertySets(
        modelID,
        elementId,
        preserved,
        startId,
        ownerHistoryId
      );
    } else {
      const defaultPsets = createDefaultPropertySets(
        element.type,
        element.properties as Record<string, string | number | boolean>
      );
      if (defaultPsets.propertySets.length > 0 || defaultPsets.quantitySets.length > 0) {
        propertyMapper.writePropertySets(
          modelID,
          elementId,
          defaultPsets,
          startId,
          ownerHistoryId
        );
      }
    }
  }

  /**
   * Create spatial containment relationship
   */
  private createSpatialContainment(
    modelID: number,
    id: number,
    storeyId: number,
    elementIds: number[],
    ownerHistoryId: number
  ): void {
    this.api.WriteLine(modelID, {
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
   * Resolve element ID to IFC GlobalId
   */
  private resolveGlobalId(elementId: string): string {
    if (elementId.startsWith("ifc-")) {
      return this.generateGlobalId();
    }
    if (elementId.length === 22) {
      return elementId;
    }
    return this.generateGlobalId();
  }

  /**
   * Generate a unique IFC GlobalId (22 character base64)
   */
  private generateGlobalId(): string {
    const chars =
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
    let result = "";
    for (let i = 0; i < 22; i++) {
      result += chars.charAt(Math.floor(Math.random() * 64));
    }
    return result;
  }

  /**
   * Increment export stat counter
   */
  private incrementStat(stats: IfcExportStats, type: ElementType): void {
    const key = type === "room" ? "rooms" : (`${type}s` as keyof IfcExportStats);
    if (key in stats && typeof stats[key] === "number") {
      (stats[key] as number)++;
    }
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): IfcExportStats {
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
    };
  }
}
