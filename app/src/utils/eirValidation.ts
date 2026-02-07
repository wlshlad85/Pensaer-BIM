/**
 * Pensaer BIM Platform - EIR Validation Engine
 *
 * Validates the current model against loaded EIR requirements.
 * Checks element counts, required properties, and level of information need.
 */

import type { Element, ElementType } from "../types/elements";
import type {
  EIRTemplate,
  ElementRequirement,
  EIRValidationItem,
  EIRValidationReport,
  EIRComplianceStatus,
  GeometryDetailLevel,
  InformationDetailLevel,
  RequiredProperty,
} from "../types/eir";

// ============================================
// GEOMETRY DETAIL SCORING
// ============================================

const GEOMETRY_SCORES: Record<string, number> = {
  none: 0,
  schematic: 1,
  approximate: 2,
  detailed: 3,
  manufacturer: 4,
};

const INFO_SCORES: Record<string, number> = {
  none: 0,
  basic: 1,
  preliminary: 2,
  detailed: 3,
  "as-built": 4,
};

/**
 * Infer geometry detail level from an element's properties.
 * Heuristic: more dimensional properties = higher detail.
 */
export function inferGeometryDetail(element: Element): GeometryDetailLevel {
  const props = element.properties ?? {};
  const geoKeys = ["width", "height", "thickness", "length", "depth", "radius", "area", "volume"];
  const count = geoKeys.filter((k) => k in props && props[k] !== undefined && props[k] !== "").length;

  if (count === 0) return "none";
  if (count <= 1) return "schematic";
  if (count <= 3) return "approximate";
  if (count <= 5) return "detailed";
  return "manufacturer";
}

/**
 * Infer information detail level from property completeness.
 */
export function inferInformationDetail(
  element: Element,
  requiredProps: RequiredProperty[]
): InformationDetailLevel {
  if (requiredProps.length === 0) return "basic";

  const props = element.properties ?? {};
  let filled = 0;
  for (const rp of requiredProps) {
    const val = props[rp.name];
    if (val !== undefined && val !== "") filled++;
  }

  const ratio = filled / requiredProps.length;
  if (ratio === 0) return "none";
  if (ratio < 0.4) return "basic";
  if (ratio < 0.75) return "preliminary";
  if (ratio < 1) return "detailed";
  return "as-built";
}

// ============================================
// PROPERTY VALIDATION
// ============================================

export function validateProperty(
  element: Element,
  req: RequiredProperty
): { ok: boolean; issue: string } {
  const props = element.properties ?? {};
  const val = props[req.name];

  if (val === undefined || val === "") {
    if (req.required) {
      return { ok: false, issue: `Missing required property '${req.name}'` };
    }
    return { ok: true, issue: "" };
  }

  // Type check
  if (req.valueType === "number" && typeof val !== "number" && isNaN(Number(val))) {
    return { ok: false, issue: `Property '${req.name}' should be a number, got '${val}'` };
  }
  if (req.valueType === "boolean" && typeof val !== "boolean") {
    return { ok: false, issue: `Property '${req.name}' should be a boolean` };
  }

  // Constraint (regex for strings, range for numbers)
  if (req.constraint) {
    if (req.valueType === "string") {
      const re = new RegExp(req.constraint);
      if (!re.test(String(val))) {
        return { ok: false, issue: `Property '${req.name}' does not match pattern '${req.constraint}'` };
      }
    }
  }

  return { ok: true, issue: "" };
}

// ============================================
// CORE VALIDATION
// ============================================

/**
 * Validate a set of elements against a single element requirement.
 */
export function validateElementRequirement(
  elements: Element[],
  requirement: ElementRequirement,
  dataDropId: string
): EIRValidationItem {
  const matching = elements.filter((e) => e.type === requirement.elementType);
  const foundCount = matching.length;
  const nonCompliantIds: string[] = [];
  const propertyIssues: EIRValidationItem["propertyIssues"] = [];
  const messages: string[] = [];

  // Count check
  if (foundCount < requirement.minCount) {
    messages.push(
      `Expected at least ${requirement.minCount} ${requirement.elementType}(s), found ${foundCount}`
    );
  }
  if (requirement.maxCount !== undefined && foundCount > requirement.maxCount) {
    messages.push(
      `Expected at most ${requirement.maxCount} ${requirement.elementType}(s), found ${foundCount}`
    );
  }

  // Per-element checks
  for (const el of matching) {
    let elementOk = true;

    // Property checks
    for (const rp of requirement.requiredProperties) {
      const result = validateProperty(el, rp);
      if (!result.ok) {
        elementOk = false;
        propertyIssues.push({
          elementId: el.id,
          propertyName: rp.name,
          issue: result.issue,
        });
      }
    }

    // Geometry detail check
    const actualGeo = inferGeometryDetail(el);
    const requiredGeoScore = GEOMETRY_SCORES[requirement.levelOfInformationNeed.geometry] ?? 0;
    const actualGeoScore = GEOMETRY_SCORES[actualGeo] ?? 0;
    if (actualGeoScore < requiredGeoScore) {
      elementOk = false;
      messages.push(
        `${el.type} '${el.name}' geometry detail: '${actualGeo}', required: '${requirement.levelOfInformationNeed.geometry}'`
      );
    }

    // Information detail check
    const actualInfo = inferInformationDetail(el, requirement.requiredProperties);
    const requiredInfoScore = INFO_SCORES[requirement.levelOfInformationNeed.information] ?? 0;
    const actualInfoScore = INFO_SCORES[actualInfo] ?? 0;
    if (actualInfoScore < requiredInfoScore) {
      elementOk = false;
      messages.push(
        `${el.type} '${el.name}' info detail: '${actualInfo}', required: '${requirement.levelOfInformationNeed.information}'`
      );
    }

    if (!elementOk) {
      nonCompliantIds.push(el.id);
    }
  }

  // Determine status
  let status: EIRComplianceStatus = "pass";
  if (
    foundCount < requirement.minCount ||
    (requirement.maxCount !== undefined && foundCount > requirement.maxCount)
  ) {
    status = "fail";
  } else if (nonCompliantIds.length > 0) {
    status = "fail";
  } else if (propertyIssues.length > 0) {
    status = "warning";
  }

  const detailParts = [...messages];
  if (propertyIssues.length > 0) {
    detailParts.push(`${propertyIssues.length} property issue(s)`);
  }
  if (status === "pass") {
    detailParts.push(`All ${foundCount} ${requirement.elementType}(s) compliant`);
  }

  return {
    requirement,
    dataDropId,
    status,
    details: detailParts.join("; "),
    nonCompliantElementIds: nonCompliantIds,
    propertyIssues,
    foundCount,
    requiredCount: requirement.minCount,
  };
}

/**
 * Validate all elements against a full EIR template.
 * Optionally filter to a specific data drop.
 */
export function validateAgainstEIR(
  elements: Element[],
  eir: EIRTemplate,
  dataDropId?: string
): EIRValidationReport {
  const items: EIRValidationItem[] = [];

  // Global requirements
  for (const req of eir.globalRequirements) {
    items.push(validateElementRequirement(elements, req, "global"));
  }

  // Data drop requirements
  const drops = dataDropId
    ? eir.dataDrops.filter((d) => d.id === dataDropId)
    : eir.dataDrops;

  for (const drop of drops) {
    for (const req of drop.requirements) {
      items.push(validateElementRequirement(elements, req, drop.id));
    }
  }

  const summary = {
    total: items.length,
    passed: items.filter((i) => i.status === "pass").length,
    failed: items.filter((i) => i.status === "fail").length,
    warnings: items.filter((i) => i.status === "warning").length,
    notApplicable: items.filter((i) => i.status === "not-applicable").length,
  };

  return {
    timestamp: new Date().toISOString(),
    eirId: eir.id,
    dataDropId: dataDropId ?? "all",
    items,
    summary,
  };
}

/**
 * Build per-element compliance map from a validation report.
 * Returns a map of elementId -> { status, messages }.
 */
export function buildElementComplianceMap(
  report: EIRValidationReport
): Record<string, { status: "pass" | "fail" | "warning"; messages: string[] }> {
  const map: Record<string, { status: "pass" | "fail" | "warning"; messages: string[] }> = {};

  for (const item of report.items) {
    for (const eid of item.nonCompliantElementIds) {
      if (!map[eid]) {
        map[eid] = { status: "fail", messages: [] };
      }
      map[eid].status = "fail";
    }
    for (const pi of item.propertyIssues) {
      if (!map[pi.elementId]) {
        map[pi.elementId] = { status: "warning", messages: [] };
      }
      map[pi.elementId].messages.push(pi.issue);
      if (map[pi.elementId].status !== "fail") {
        map[pi.elementId].status = "warning";
      }
    }
  }

  return map;
}

/**
 * Format a validation report as a human-readable string.
 */
export function formatEIRReport(report: EIRValidationReport): string {
  const lines: string[] = [];
  lines.push(`╔══════════════════════════════════════════════════╗`);
  lines.push(`║          EIR COMPLIANCE REPORT                  ║`);
  lines.push(`╠══════════════════════════════════════════════════╣`);
  lines.push(`║ EIR: ${report.eirId.padEnd(43)}║`);
  lines.push(`║ Scope: ${(report.dataDropId === "all" ? "All Data Drops" : report.dataDropId).padEnd(41)}║`);
  lines.push(`║ Time: ${report.timestamp.substring(0, 19).padEnd(43)}║`);
  lines.push(`╠══════════════════════════════════════════════════╣`);
  lines.push(
    `║ ✅ Pass: ${String(report.summary.passed).padEnd(5)} ❌ Fail: ${String(report.summary.failed).padEnd(5)} ⚠️  Warn: ${String(report.summary.warnings).padEnd(4)}║`
  );
  lines.push(`╠══════════════════════════════════════════════════╣`);

  for (const item of report.items) {
    const icon =
      item.status === "pass" ? "✅" : item.status === "fail" ? "❌" : "⚠️";
    lines.push(
      `║ ${icon} ${item.requirement.elementType.padEnd(12)} [${item.dataDropId.padEnd(10)}] ${item.foundCount}/${item.requiredCount}`
    );
    if (item.status !== "pass") {
      lines.push(`║   └─ ${item.details.substring(0, 44)}`);
    }
  }

  lines.push(`╚══════════════════════════════════════════════════╝`);
  return lines.join("\n");
}
