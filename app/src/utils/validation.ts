/**
 * Pensaer BIM Platform - Dynamic Validation Engine
 *
 * Rule-based validation system for building code compliance,
 * fire safety, accessibility, and structural integrity checks.
 */

import type { Element, Issue } from '../types';

// ============================================
// VALIDATION RULE TYPES
// ============================================

export interface ValidationRule {
  id: string;
  name: string;
  category: ValidationCategory;
  description: string;
  appliesTo: string[]; // Element types this rule applies to
  validate: (element: Element, allElements: Element[]) => Issue | null;
}

export type ValidationCategory =
  | 'fire-safety'
  | 'accessibility'
  | 'structural'
  | 'energy'
  | 'code-compliance'
  | 'model-integrity';

export interface ValidationResult {
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  issuesByCategory: Record<ValidationCategory, number>;
  elementsWithIssues: string[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseMillimeters(value: string | number | boolean): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return 0;
  const match = String(value).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseFireRating(value: string | number | boolean): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return 0;
  const match = String(value).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseUValue(value: string | number | boolean): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return 0;
  const match = String(value).match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

// ============================================
// VALIDATION RULES
// ============================================

const validationRules: ValidationRule[] = [
  // ─────────────────────────────────────────
  // FIRE SAFETY RULES
  // ─────────────────────────────────────────
  {
    id: 'FIRE-001',
    name: 'Door Fire Rating Compliance',
    category: 'fire-safety',
    description: 'Doors on fire-rated walls must have matching or higher fire rating',
    appliesTo: ['door'],
    validate: (element, allElements) => {
      const hostWallId = element.relationships.hostedBy;
      if (!hostWallId) return null;

      const hostWall = allElements.find((e) => e.id === hostWallId);
      if (!hostWall) return null;

      const wallRating = parseFireRating(hostWall.properties.fireRating);
      const doorRating = parseFireRating(element.properties.fireRating);

      if (wallRating > 0 && doorRating < wallRating) {
        return {
          id: `${element.id}-FIRE-001`,
          type: 'error',
          severity: 'high',
          code: 'FIRE-001',
          message: `Door fire rating (${doorRating}min) is less than wall rating (${wallRating}min)`,
          fixable: true,
        };
      }
      return null;
    },
  },

  // ─────────────────────────────────────────
  // ACCESSIBILITY RULES
  // ─────────────────────────────────────────
  {
    id: 'ADA-001',
    name: 'Minimum Door Width',
    category: 'accessibility',
    description: 'Doors must meet minimum width requirements for accessibility',
    appliesTo: ['door'],
    validate: (element) => {
      const width = parseMillimeters(element.properties.width);
      const minWidth = 820; // ADA minimum clear width

      if (width > 0 && width < minWidth) {
        return {
          id: `${element.id}-ADA-001`,
          type: 'warning',
          severity: 'medium',
          code: 'ADA-001',
          message: `Door width (${width}mm) is below accessibility minimum (${minWidth}mm)`,
          fixable: true,
        };
      }
      return null;
    },
  },

  {
    id: 'ADA-002',
    name: 'Door Height Clearance',
    category: 'accessibility',
    description: 'Doors must meet minimum height requirements',
    appliesTo: ['door'],
    validate: (element) => {
      const height = parseMillimeters(element.properties.height);
      const minHeight = 2030; // Minimum door height

      if (height > 0 && height < minHeight) {
        return {
          id: `${element.id}-ADA-002`,
          type: 'info',
          severity: 'low',
          code: 'ADA-002',
          message: `Door height (${height}mm) is below recommended minimum (${minHeight}mm)`,
          fixable: true,
        };
      }
      return null;
    },
  },

  // ─────────────────────────────────────────
  // WINDOW SAFETY RULES
  // ─────────────────────────────────────────
  {
    id: 'SAFE-001',
    name: 'Low Sill Safety Glazing',
    category: 'code-compliance',
    description: 'Windows with low sill heights should have safety glazing',
    appliesTo: ['window'],
    validate: (element) => {
      const sillHeight = parseMillimeters(element.properties.sillHeight);
      const glazingType = String(element.properties.glazingType || '').toLowerCase();

      if (sillHeight > 0 && sillHeight < 600 && !glazingType.includes('tempered') && !glazingType.includes('laminated')) {
        return {
          id: `${element.id}-SAFE-001`,
          type: 'warning',
          severity: 'high',
          code: 'SAFE-001',
          message: `Window sill height (${sillHeight}mm) below 600mm should use safety glazing`,
          fixable: true,
        };
      }
      return null;
    },
  },

  // ─────────────────────────────────────────
  // ENERGY COMPLIANCE RULES
  // ─────────────────────────────────────────
  {
    id: 'ENERGY-001',
    name: 'Window U-Value Compliance',
    category: 'energy',
    description: 'Windows should meet energy efficiency requirements',
    appliesTo: ['window'],
    validate: (element) => {
      const uValue = parseUValue(element.properties.uValue);
      const maxUValue = 1.6; // Typical code requirement

      if (uValue > maxUValue) {
        return {
          id: `${element.id}-ENERGY-001`,
          type: 'warning',
          severity: 'medium',
          code: 'ENERGY-001',
          message: `Window U-value (${uValue} W/m²K) exceeds recommended maximum (${maxUValue} W/m²K)`,
          fixable: true,
        };
      }
      return null;
    },
  },

  // ─────────────────────────────────────────
  // STRUCTURAL RULES
  // ─────────────────────────────────────────
  {
    id: 'STRUCT-001',
    name: 'Roof Support Verification',
    category: 'structural',
    description: 'Roofs should be supported by structural walls',
    appliesTo: ['roof'],
    validate: (element, allElements) => {
      const supportedBy = element.relationships.supportedBy || [];

      for (const wallId of supportedBy) {
        const wall = allElements.find((e) => e.id === wallId);
        if (wall && wall.properties.structural === false) {
          return {
            id: `${element.id}-STRUCT-001`,
            type: 'warning',
            severity: 'high',
            code: 'STRUCT-001',
            message: `Roof is supported by non-structural wall (${wall.name})`,
            fixable: false,
          };
        }
      }
      return null;
    },
  },

  // ─────────────────────────────────────────
  // MODEL INTEGRITY RULES
  // ─────────────────────────────────────────
  {
    id: 'MODEL-001',
    name: 'Orphan Door Check',
    category: 'model-integrity',
    description: 'Doors should be hosted by a wall',
    appliesTo: ['door'],
    validate: (element, allElements) => {
      const hostWallId = element.relationships.hostedBy;

      if (!hostWallId) {
        return {
          id: `${element.id}-MODEL-001`,
          type: 'error',
          severity: 'critical',
          code: 'MODEL-001',
          message: 'Door is not hosted by any wall',
          fixable: false,
        };
      }

      const hostWall = allElements.find((e) => e.id === hostWallId);
      if (!hostWall) {
        return {
          id: `${element.id}-MODEL-001`,
          type: 'error',
          severity: 'critical',
          code: 'MODEL-001',
          message: 'Door references non-existent host wall',
          fixable: false,
        };
      }

      return null;
    },
  },

  {
    id: 'MODEL-002',
    name: 'Orphan Window Check',
    category: 'model-integrity',
    description: 'Windows should be hosted by a wall',
    appliesTo: ['window'],
    validate: (element, allElements) => {
      const hostWallId = element.relationships.hostedBy;

      if (!hostWallId) {
        return {
          id: `${element.id}-MODEL-002`,
          type: 'error',
          severity: 'critical',
          code: 'MODEL-002',
          message: 'Window is not hosted by any wall',
          fixable: false,
        };
      }

      const hostWall = allElements.find((e) => e.id === hostWallId);
      if (!hostWall) {
        return {
          id: `${element.id}-MODEL-002`,
          type: 'error',
          severity: 'critical',
          code: 'MODEL-002',
          message: 'Window references non-existent host wall',
          fixable: false,
        };
      }

      return null;
    },
  },

  {
    id: 'MODEL-003',
    name: 'Wall Thickness Validation',
    category: 'model-integrity',
    description: 'Wall thickness should be within reasonable bounds',
    appliesTo: ['wall'],
    validate: (element) => {
      const thickness = parseMillimeters(element.properties.thickness);

      if (thickness > 0 && thickness < 75) {
        return {
          id: `${element.id}-MODEL-003`,
          type: 'warning',
          severity: 'low',
          code: 'MODEL-003',
          message: `Wall thickness (${thickness}mm) is unusually thin`,
          fixable: true,
        };
      }

      if (thickness > 600) {
        return {
          id: `${element.id}-MODEL-003`,
          type: 'info',
          severity: 'low',
          code: 'MODEL-003',
          message: `Wall thickness (${thickness}mm) is unusually thick - verify intent`,
          fixable: false,
        };
      }

      return null;
    },
  },

  {
    id: 'MODEL-004',
    name: 'Room Area Validation',
    category: 'model-integrity',
    description: 'Rooms should have reasonable minimum area',
    appliesTo: ['room'],
    validate: (element) => {
      const areaStr = String(element.properties.area || '');
      const areaMatch = areaStr.match(/([\d.]+)/);
      const area = areaMatch ? parseFloat(areaMatch[1]) : 0;

      if (area > 0 && area < 4) {
        return {
          id: `${element.id}-MODEL-004`,
          type: 'warning',
          severity: 'medium',
          code: 'MODEL-004',
          message: `Room area (${area} m²) is very small - verify boundaries`,
          fixable: false,
        };
      }

      return null;
    },
  },
];

// ============================================
// VALIDATION ENGINE
// ============================================

/**
 * Run all validation rules against the model.
 * Returns issues found and updates elements' issue arrays.
 */
export function validateModel(elements: Element[]): {
  result: ValidationResult;
  updatedElements: Element[];
} {
  const issuesByCategory: Record<ValidationCategory, number> = {
    'fire-safety': 0,
    'accessibility': 0,
    'structural': 0,
    'energy': 0,
    'code-compliance': 0,
    'model-integrity': 0,
  };

  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  const elementsWithIssues: string[] = [];

  // Create updated elements with issues
  const updatedElements = elements.map((element) => {
    const issues: Issue[] = [];

    // Run all applicable rules
    for (const rule of validationRules) {
      if (!rule.appliesTo.includes(element.type)) continue;

      const issue = rule.validate(element, elements);
      if (issue) {
        issues.push(issue);
        issuesByCategory[rule.category]++;

        if (issue.type === 'error') {
          if (issue.severity === 'critical') criticalCount++;
          else warningCount++;
        } else if (issue.type === 'warning') {
          warningCount++;
        } else {
          infoCount++;
        }
      }
    }

    if (issues.length > 0 && !elementsWithIssues.includes(element.id)) {
      elementsWithIssues.push(element.id);
    }

    return { ...element, issues };
  });

  const totalIssues = criticalCount + warningCount + infoCount;

  return {
    result: {
      totalIssues,
      criticalCount,
      warningCount,
      infoCount,
      issuesByCategory,
      elementsWithIssues,
    },
    updatedElements,
  };
}

/**
 * Get all available validation rules.
 */
export function getValidationRules(): ValidationRule[] {
  return validationRules;
}

/**
 * Validate a single element.
 */
export function validateElement(element: Element, allElements: Element[]): Issue[] {
  const issues: Issue[] = [];

  for (const rule of validationRules) {
    if (!rule.appliesTo.includes(element.type)) continue;

    const issue = rule.validate(element, allElements);
    if (issue) {
      issues.push(issue);
    }
  }

  return issues;
}

/**
 * Get validation summary text.
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.totalIssues === 0) {
    return 'No issues found - model is valid';
  }

  const parts: string[] = [];

  if (result.criticalCount > 0) {
    parts.push(`${result.criticalCount} critical`);
  }
  if (result.warningCount > 0) {
    parts.push(`${result.warningCount} warning${result.warningCount > 1 ? 's' : ''}`);
  }
  if (result.infoCount > 0) {
    parts.push(`${result.infoCount} info`);
  }

  return `${result.totalIssues} issue${result.totalIssues > 1 ? 's' : ''} found: ${parts.join(', ')}`;
}

// ============================================
// SELF-CORRECTING GEOMETRY VALIDATION
// ============================================

/**
 * Minimum dimension thresholds (in 2D canvas units)
 */
const MIN_DIMENSIONS: Record<string, { width: number; height: number }> = {
  wall: { width: 10, height: 10 },
  door: { width: 40, height: 20 },
  window: { width: 40, height: 20 },
  room: { width: 50, height: 50 },
  roof: { width: 100, height: 100 },
  floor: { width: 50, height: 50 },
  column: { width: 10, height: 10 },
  beam: { width: 10, height: 10 },
  stair: { width: 50, height: 50 },
};

export interface GeometryValidationResult {
  valid: boolean;
  corrected: boolean;
  corrections: string[];
  element: Element;
}

/**
 * Validate and auto-correct element geometry.
 * Implements self-correcting code pattern.
 */
export function validateAndCorrectGeometry(element: Element): GeometryValidationResult {
  const corrections: string[] = [];
  let corrected = false;
  const fixed = { ...element };

  const minDims = MIN_DIMENSIONS[element.type] || { width: 10, height: 10 };

  // Fix negative dimensions
  if (element.width < 0) {
    corrections.push(`Negative width (${element.width}) → positive`);
    fixed.width = Math.abs(element.width);
    fixed.x = element.x + element.width;
    corrected = true;
  }

  if (element.height < 0) {
    corrections.push(`Negative height (${element.height}) → positive`);
    fixed.height = Math.abs(element.height);
    fixed.y = element.y + element.height;
    corrected = true;
  }

  // Fix too-small dimensions
  if (fixed.width < minDims.width) {
    corrections.push(`Width ${fixed.width} → ${minDims.width} (minimum)`);
    fixed.width = minDims.width;
    corrected = true;
  }

  if (fixed.height < minDims.height) {
    corrections.push(`Height ${fixed.height} → ${minDims.height} (minimum)`);
    fixed.height = minDims.height;
    corrected = true;
  }

  // Fix NaN/Infinity
  if (!isFinite(element.x) || !isFinite(element.y)) {
    corrections.push('Invalid position → origin');
    fixed.x = isFinite(element.x) ? element.x : 0;
    fixed.y = isFinite(element.y) ? element.y : 0;
    corrected = true;
  }

  if (!isFinite(element.width) || !isFinite(element.height)) {
    corrections.push('Invalid dimensions → minimum');
    fixed.width = isFinite(element.width) ? element.width : minDims.width;
    fixed.height = isFinite(element.height) ? element.height : minDims.height;
    corrected = true;
  }

  if (corrected) {
    console.warn(`[Pensaer Self-Correct] ${element.type} ${element.id}:`, corrections);
  }

  return { valid: !corrected, corrected, corrections, element: fixed };
}

/**
 * Validate hosted element (door/window) placement on wall.
 */
export function validateHostedPlacement(
  hosted: Element,
  wall: Element | undefined
): GeometryValidationResult {
  const corrections: string[] = [];
  let corrected = false;
  const fixed = { ...hosted };

  if (!wall) {
    return { valid: false, corrected: false, corrections: ['Host wall not found'], element: hosted };
  }

  const isHorizontalWall = wall.width > wall.height;

  if (isHorizontalWall) {
    // Align to wall's Y center
    const wallCenterY = wall.y + wall.height / 2;
    const expectedY = wallCenterY - hosted.height / 2;
    if (Math.abs(hosted.y - expectedY) > 5) {
      corrections.push(`Y aligned to wall center`);
      fixed.y = expectedY;
      corrected = true;
    }

    // Clamp X within wall bounds
    if (fixed.x < wall.x) {
      corrections.push(`X clamped to wall start`);
      fixed.x = wall.x;
      corrected = true;
    }
    if (fixed.x + fixed.width > wall.x + wall.width) {
      corrections.push(`X clamped to wall end`);
      fixed.x = wall.x + wall.width - fixed.width;
      corrected = true;
    }
  } else {
    // Vertical wall - align to X center
    const wallCenterX = wall.x + wall.width / 2;
    const expectedX = wallCenterX - hosted.width / 2;
    if (Math.abs(hosted.x - expectedX) > 5) {
      corrections.push(`X aligned to wall center`);
      fixed.x = expectedX;
      corrected = true;
    }

    // Clamp Y within wall bounds
    if (fixed.y < wall.y) {
      corrections.push(`Y clamped to wall start`);
      fixed.y = wall.y;
      corrected = true;
    }
    if (fixed.y + fixed.height > wall.y + wall.height) {
      corrections.push(`Y clamped to wall end`);
      fixed.y = wall.y + wall.height - fixed.height;
      corrected = true;
    }
  }

  if (corrected) {
    console.warn(`[Pensaer Self-Correct] ${hosted.type} ${hosted.id} on ${wall.id}:`, corrections);
  }

  return { valid: !corrected, corrected, corrections, element: fixed };
}

/**
 * Validate 3D geometry parameters.
 */
export function validate3DParams(params: {
  width: number;
  height: number;
  depth: number;
  type: string;
}): { width: number; height: number; depth: number; corrections: string[] } {
  const corrections: string[] = [];
  const MIN = 0.1;
  const MAX = 100;

  let { width, height, depth } = params;

  if (width < MIN) { corrections.push(`3D width → ${MIN}`); width = MIN; }
  if (height < MIN) { corrections.push(`3D height → ${MIN}`); height = MIN; }
  if (depth < MIN) { corrections.push(`3D depth → ${MIN}`); depth = MIN; }
  if (width > MAX) { corrections.push(`3D width clamped to ${MAX}`); width = MAX; }
  if (height > MAX) { corrections.push(`3D height clamped to ${MAX}`); height = MAX; }
  if (depth > MAX) { corrections.push(`3D depth clamped to ${MAX}`); depth = MAX; }

  if (corrections.length > 0) {
    console.warn(`[Pensaer 3D Self-Correct] ${params.type}:`, corrections);
  }

  return { width, height, depth, corrections };
}
