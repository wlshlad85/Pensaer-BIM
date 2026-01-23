/**
 * Geometry Parsing Utilities
 *
 * Functions for parsing dimension and property values from elements.
 */

/**
 * Roof type enumeration for geometry generation
 */
export type RoofType = "flat" | "gable" | "hip";

/**
 * Parse wall thickness from property value (e.g., "200mm" -> 0.2 meters)
 * Supports mm, cm, m units. Defaults to 0.2m if unparseable.
 */
export function parseThickness(value: string | number | boolean | undefined): number {
  if (typeof value === "number") return value / 1000; // Assume mm
  if (typeof value !== "string") return 0.2; // Default 200mm

  const match = value.match(/^([\d.]+)\s*(mm|cm|m)?$/i);
  if (!match) return 0.2;

  const num = parseFloat(match[1]);
  const unit = (match[2] || "mm").toLowerCase();

  switch (unit) {
    case "m":
      return num;
    case "cm":
      return num / 100;
    case "mm":
    default:
      return num / 1000;
  }
}

/**
 * Parse height from property value (e.g., "2800mm" -> 2.8 meters)
 * Supports mm, cm, m units. Defaults to specified default if unparseable.
 */
export function parseHeight(
  value: string | number | boolean | undefined,
  defaultMeters: number = 2.8
): number {
  if (typeof value === "number") return value / 1000; // Assume mm
  if (typeof value !== "string") return defaultMeters;

  const match = value.match(/^([\d.]+)\s*(mm|cm|m)?$/i);
  if (!match) return defaultMeters;

  const num = parseFloat(match[1]);
  const unit = (match[2] || "mm").toLowerCase();

  switch (unit) {
    case "m":
      return num;
    case "cm":
      return num / 100;
    case "mm":
    default:
      return num / 1000;
  }
}

/**
 * Parse roof type from element properties
 * Supports: "flat", "gable", "hip" (defaults to "gable")
 */
export function parseRoofType(
  properties: Record<string, string | number | boolean>
): RoofType {
  const roofType = properties.roof_type || properties.type;
  if (typeof roofType === "string") {
    const normalized = roofType.toLowerCase().trim();
    if (normalized === "flat") return "flat";
    if (normalized === "hip" || normalized === "hipped") return "hip";
    if (normalized === "gable" || normalized === "pitched") return "gable";
  }
  return "gable"; // Default to gable roof
}

/**
 * Parse slope from properties (supports degrees or ratio format)
 * - "30" or 30 -> 30 degrees
 * - "4:12" -> approximately 18.4 degrees
 * - "slope_degrees: 45" -> 45 degrees
 * Returns slope in radians
 */
export function parseRoofSlope(
  properties: Record<string, string | number | boolean>
): number {
  // Check for slope_degrees first (from MCP)
  if (typeof properties.slope_degrees === "number") {
    return (properties.slope_degrees * Math.PI) / 180;
  }
  if (typeof properties.slope_degrees === "string") {
    const degrees = parseFloat(properties.slope_degrees);
    if (!isNaN(degrees)) return (degrees * Math.PI) / 180;
  }

  // Check for slope in ratio format (e.g., "4:12")
  const slope = properties.slope;
  if (typeof slope === "string") {
    const ratioMatch = slope.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
    if (ratioMatch) {
      const rise = parseFloat(ratioMatch[1]);
      const run = parseFloat(ratioMatch[2]);
      return Math.atan(rise / run);
    }
    // Try parsing as degrees
    const degrees = parseFloat(slope);
    if (!isNaN(degrees)) return (degrees * Math.PI) / 180;
  }

  // Default to ~30 degrees (common roof pitch)
  return Math.PI / 6;
}
