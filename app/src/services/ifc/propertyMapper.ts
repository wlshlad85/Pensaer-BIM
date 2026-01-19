/**
 * IFC Property Mapper
 *
 * Handles preservation of IFC property sets through import/export round-trip.
 * Maps IFC property sets (Pset_*) and quantity sets (Qto_*) to Pensaer properties
 * while preserving original names for faithful round-trip export.
 */

import type * as WebIFC from "web-ifc";

// IFC constants for property-related entities
const IFCPROPERTYSET = 1451395588;
const IFCPROPERTYSINGLEVALUE = 3290496277;
const IFCELEMENTQUANTITY = 2090586900;
const IFCQUANTITYLENGTH = 931644368;
const IFCQUANTITYAREA = 2044713172;
const IFCQUANTITYVOLUME = 3252649465;
const IFCQUANTITYCOUNT = 2093928680;
const IFCQUANTITYWEIGHT = 825690147;
const IFCRELDEFINESBYPROPERTIES = 4186316022;

/**
 * A single property value from an IFC property set
 */
export interface IfcPropertyValue {
  name: string;
  value: string | number | boolean;
  type?: string; // IFC type like "IfcLabel", "IfcReal", etc.
  unit?: string;
}

/**
 * An IFC property set with its preserved name and properties
 */
export interface IfcPropertySet {
  name: string; // e.g., "Pset_WallCommon", "Pset_DoorCommon"
  expressID?: number;
  properties: IfcPropertyValue[];
}

/**
 * An IFC quantity set with its preserved name and quantities
 */
export interface IfcQuantitySet {
  name: string; // e.g., "Qto_WallBaseQuantities"
  expressID?: number;
  quantities: IfcPropertyValue[];
}

/**
 * Preserved IFC properties structure stored in Element.properties
 * Stored under the key `_ifcPropertySets` to avoid collision with flattened properties
 */
export interface PreservedIfcProperties {
  propertySets: IfcPropertySet[];
  quantitySets: IfcQuantitySet[];
}

/**
 * Property Mapper class for IFC property set preservation
 */
export class PropertyMapper {
  private api: WebIFC.IfcAPI;

  constructor(api: WebIFC.IfcAPI) {
    this.api = api;
  }

  /**
   * Extract all property sets and quantity sets for an element
   * Preserves original pset names for round-trip fidelity
   */
  extractAllProperties(
    modelID: number,
    expressID: number
  ): {
    preserved: PreservedIfcProperties;
    flattened: Record<string, string | number | boolean>;
  } {
    const preserved: PreservedIfcProperties = {
      propertySets: [],
      quantitySets: [],
    };
    const flattened: Record<string, string | number | boolean> = {};

    try {
      // Get property sets using web-ifc GetPropertySets
      const propSets = this.api.GetPropertySets(modelID, expressID);

      for (const pset of propSets) {
        if (!pset) continue;

        const psetName = this.extractValue(pset.Name) || `PropertySet_${pset.expressID}`;

        // Check if it's a quantity set (IfcElementQuantity)
        if (pset.type === IFCELEMENTQUANTITY) {
          const quantitySet = this.extractQuantitySet(modelID, pset, psetName);
          if (quantitySet.quantities.length > 0) {
            preserved.quantitySets.push(quantitySet);
            // Also flatten quantities
            for (const qty of quantitySet.quantities) {
              flattened[`${psetName}:${qty.name}`] = qty.value;
            }
          }
        }
        // Property set (IfcPropertySet)
        else if (pset.HasProperties) {
          const propertySet = this.extractPropertySet(modelID, pset, psetName);
          if (propertySet.properties.length > 0) {
            preserved.propertySets.push(propertySet);
            // Also flatten properties
            for (const prop of propertySet.properties) {
              flattened[`${psetName}:${prop.name}`] = prop.value;
              // Also add without prefix for common properties
              if (psetName.startsWith("Pset_")) {
                flattened[prop.name] = prop.value;
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to extract properties for element ${expressID}:`, error);
    }

    return { preserved, flattened };
  }

  /**
   * Extract a single property set
   */
  private extractPropertySet(
    modelID: number,
    pset: { expressID: number; Name?: unknown; HasProperties?: Array<{ expressID: number; type: number }> },
    name: string
  ): IfcPropertySet {
    const properties: IfcPropertyValue[] = [];

    if (pset.HasProperties) {
      for (const propRef of pset.HasProperties) {
        try {
          if (propRef.type === IFCPROPERTYSINGLEVALUE) {
            const propLine = this.api.GetLine(modelID, propRef.expressID);
            if (propLine) {
              const propName = this.extractValue(propLine.Name);
              const propValue = this.extractNominalValue(propLine.NominalValue);
              const propUnit = this.extractValue(propLine.Unit);

              if (propName && propValue !== undefined) {
                properties.push({
                  name: propName,
                  value: propValue,
                  type: propLine.NominalValue?.label,
                  unit: propUnit,
                });
              }
            }
          }
          // Could add support for IfcPropertyEnumeratedValue, IfcPropertyBoundedValue, etc.
        } catch (error) {
          console.warn(`Failed to extract property ${propRef.expressID}:`, error);
        }
      }
    }

    return {
      name,
      expressID: pset.expressID,
      properties,
    };
  }

  /**
   * Extract a quantity set
   */
  private extractQuantitySet(
    modelID: number,
    qset: { expressID: number; Name?: unknown; Quantities?: Array<{ expressID: number; type: number }> },
    name: string
  ): IfcQuantitySet {
    const quantities: IfcPropertyValue[] = [];

    if (qset.Quantities) {
      for (const qtyRef of qset.Quantities) {
        try {
          const qtyLine = this.api.GetLine(modelID, qtyRef.expressID);
          if (qtyLine) {
            const qtyName = this.extractValue(qtyLine.Name);
            let qtyValue: number | undefined;
            let qtyUnit: string | undefined;

            // Extract quantity value based on type
            switch (qtyRef.type) {
              case IFCQUANTITYLENGTH:
                qtyValue = this.extractNumericValue(qtyLine.LengthValue);
                qtyUnit = "length";
                break;
              case IFCQUANTITYAREA:
                qtyValue = this.extractNumericValue(qtyLine.AreaValue);
                qtyUnit = "area";
                break;
              case IFCQUANTITYVOLUME:
                qtyValue = this.extractNumericValue(qtyLine.VolumeValue);
                qtyUnit = "volume";
                break;
              case IFCQUANTITYCOUNT:
                qtyValue = this.extractNumericValue(qtyLine.CountValue);
                qtyUnit = "count";
                break;
              case IFCQUANTITYWEIGHT:
                qtyValue = this.extractNumericValue(qtyLine.WeightValue);
                qtyUnit = "weight";
                break;
            }

            if (qtyName && qtyValue !== undefined) {
              quantities.push({
                name: qtyName,
                value: qtyValue,
                unit: qtyUnit,
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to extract quantity ${qtyRef.expressID}:`, error);
        }
      }
    }

    return {
      name,
      expressID: qset.expressID,
      quantities,
    };
  }

  /**
   * Extract a value from an IFC attribute (handles {value: x} wrapper)
   */
  private extractValue(attr: unknown): string | undefined {
    if (attr === null || attr === undefined) return undefined;
    if (typeof attr === "string") return attr;
    if (typeof attr === "object" && "value" in attr) {
      return String((attr as { value: unknown }).value);
    }
    return String(attr);
  }

  /**
   * Extract numeric value from IFC attribute
   */
  private extractNumericValue(attr: unknown): number | undefined {
    if (attr === null || attr === undefined) return undefined;
    if (typeof attr === "number") return attr;
    if (typeof attr === "object" && "value" in attr) {
      const val = (attr as { value: unknown }).value;
      if (typeof val === "number") return val;
      if (typeof val === "string") return parseFloat(val);
    }
    return undefined;
  }

  /**
   * Extract nominal value (supports various IFC value types)
   */
  private extractNominalValue(nominal: unknown): string | number | boolean | undefined {
    if (nominal === null || nominal === undefined) return undefined;

    if (typeof nominal === "object" && "value" in nominal) {
      const val = (nominal as { value: unknown }).value;
      if (typeof val === "boolean") return val;
      if (typeof val === "number") return val;
      if (typeof val === "string") return val;
    }

    if (typeof nominal === "boolean") return nominal;
    if (typeof nominal === "number") return nominal;
    if (typeof nominal === "string") return nominal;

    return undefined;
  }

  /**
   * Write property sets to an IFC model for an element
   * Used during export to preserve round-trip fidelity
   */
  writePropertySets(
    modelID: number,
    elementExpressID: number,
    preserved: PreservedIfcProperties,
    startID: number,
    ownerHistoryId: number
  ): number {
    let nextId = startID;

    // Write property sets
    for (const pset of preserved.propertySets) {
      nextId = this.writePropertySet(
        modelID,
        elementExpressID,
        pset,
        nextId,
        ownerHistoryId
      );
    }

    // Write quantity sets
    for (const qset of preserved.quantitySets) {
      nextId = this.writeQuantitySet(
        modelID,
        elementExpressID,
        qset,
        nextId,
        ownerHistoryId
      );
    }

    return nextId;
  }

  /**
   * Write a single property set
   */
  private writePropertySet(
    modelID: number,
    elementExpressID: number,
    pset: IfcPropertySet,
    startID: number,
    ownerHistoryId: number
  ): number {
    let id = startID;
    const propertyIds: number[] = [];

    // Create property single values
    for (const prop of pset.properties) {
      const propId = id++;
      this.api.WriteLine(modelID, {
        expressID: propId,
        type: IFCPROPERTYSINGLEVALUE,
        Name: { type: 1, value: prop.name },
        Description: null,
        NominalValue: this.createIfcValue(prop.value, prop.type),
        Unit: null,
      });
      propertyIds.push(propId);
    }

    // Create property set
    const psetId = id++;
    this.api.WriteLine(modelID, {
      expressID: psetId,
      type: IFCPROPERTYSET,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: { type: 1, value: pset.name },
      Description: null,
      HasProperties: propertyIds.map((pid) => ({ type: 5, value: pid })),
    });

    // Create relationship
    const relId = id++;
    this.api.WriteLine(modelID, {
      expressID: relId,
      type: IFCRELDEFINESBYPROPERTIES,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: null,
      Description: null,
      RelatedObjects: [{ type: 5, value: elementExpressID }],
      RelatingPropertyDefinition: { type: 5, value: psetId },
    });

    return id;
  }

  /**
   * Write a single quantity set
   */
  private writeQuantitySet(
    modelID: number,
    elementExpressID: number,
    qset: IfcQuantitySet,
    startID: number,
    ownerHistoryId: number
  ): number {
    let id = startID;
    const quantityIds: number[] = [];

    // Create quantities
    for (const qty of qset.quantities) {
      const qtyId = id++;
      const qtyType = this.getQuantityType(qty.unit);

      this.api.WriteLine(modelID, {
        expressID: qtyId,
        type: qtyType,
        Name: { type: 1, value: qty.name },
        Description: null,
        Unit: null,
        ...this.getQuantityValueAttribute(qty.unit, qty.value as number),
      });
      quantityIds.push(qtyId);
    }

    // Create element quantity
    const qsetId = id++;
    this.api.WriteLine(modelID, {
      expressID: qsetId,
      type: IFCELEMENTQUANTITY,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: { type: 1, value: qset.name },
      Description: null,
      MethodOfMeasurement: null,
      Quantities: quantityIds.map((qid) => ({ type: 5, value: qid })),
    });

    // Create relationship
    const relId = id++;
    this.api.WriteLine(modelID, {
      expressID: relId,
      type: IFCRELDEFINESBYPROPERTIES,
      GlobalId: { type: 1, value: this.generateGlobalId() },
      OwnerHistory: { type: 5, value: ownerHistoryId },
      Name: null,
      Description: null,
      RelatedObjects: [{ type: 5, value: elementExpressID }],
      RelatingPropertyDefinition: { type: 5, value: qsetId },
    });

    return id;
  }

  /**
   * Create an IFC value object from a property value
   */
  private createIfcValue(
    value: string | number | boolean,
    ifcType?: string
  ): { type: number; value: unknown; label?: string } {
    if (typeof value === "boolean") {
      return { type: 3, value: value ? ".TRUE." : ".FALSE.", label: "IfcBoolean" };
    }
    if (typeof value === "number") {
      return { type: 4, value, label: ifcType || "IfcReal" };
    }
    return { type: 1, value: String(value), label: ifcType || "IfcLabel" };
  }

  /**
   * Get the IFC quantity type constant based on unit type
   */
  private getQuantityType(unit?: string): number {
    switch (unit) {
      case "length":
        return IFCQUANTITYLENGTH;
      case "area":
        return IFCQUANTITYAREA;
      case "volume":
        return IFCQUANTITYVOLUME;
      case "count":
        return IFCQUANTITYCOUNT;
      case "weight":
        return IFCQUANTITYWEIGHT;
      default:
        return IFCQUANTITYLENGTH;
    }
  }

  /**
   * Get the value attribute name for a quantity type
   */
  private getQuantityValueAttribute(
    unit?: string,
    value?: number
  ): Record<string, { type: number; value: number }> {
    const wrappedValue = { type: 4, value: value ?? 0 };
    switch (unit) {
      case "area":
        return { AreaValue: wrappedValue };
      case "volume":
        return { VolumeValue: wrappedValue };
      case "count":
        return { CountValue: wrappedValue };
      case "weight":
        return { WeightValue: wrappedValue };
      default:
        return { LengthValue: wrappedValue };
    }
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
}

/**
 * Helper to check if preserved properties exist in element properties
 */
export function hasPreservedProperties(
  properties: Record<string, unknown>
): properties is Record<string, unknown> & { _ifcPropertySets: PreservedIfcProperties } {
  return (
    "_ifcPropertySets" in properties &&
    properties._ifcPropertySets !== null &&
    typeof properties._ifcPropertySets === "object"
  );
}

/**
 * Extract preserved properties from element properties
 */
export function getPreservedProperties(
  properties: Record<string, unknown>
): PreservedIfcProperties | null {
  if (hasPreservedProperties(properties)) {
    return properties._ifcPropertySets as PreservedIfcProperties;
  }
  return null;
}

/**
 * Create default property sets for element types when exporting new elements
 */
export function createDefaultPropertySets(
  elementType: string,
  properties: Record<string, string | number | boolean>
): PreservedIfcProperties {
  const preserved: PreservedIfcProperties = {
    propertySets: [],
    quantitySets: [],
  };

  // Create a default Pset based on element type
  const psetName = `Pset_${elementType.charAt(0).toUpperCase() + elementType.slice(1)}Common`;
  const psetProperties: IfcPropertyValue[] = [];

  // Add existing properties to the pset
  for (const [key, value] of Object.entries(properties)) {
    // Skip internal properties
    if (key.startsWith("_") || key === "ifcExpressId") continue;
    // Skip prefixed properties (already have their pset)
    if (key.includes(":")) continue;

    psetProperties.push({
      name: key,
      value,
    });
  }

  if (psetProperties.length > 0) {
    preserved.propertySets.push({
      name: psetName,
      properties: psetProperties,
    });
  }

  return preserved;
}
