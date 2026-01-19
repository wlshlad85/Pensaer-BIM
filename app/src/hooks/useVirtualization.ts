/**
 * Pensaer BIM Platform - Virtualization Hook
 *
 * Provides viewport culling and spatial indexing for large models.
 * Uses R*-tree (rbush) for efficient spatial queries.
 */

import { useMemo, useCallback, useRef, useEffect } from "react";
import RBush from "rbush";
import type { Element } from "../types";
import type { Bounds } from "../utils/geometry";

// ============================================
// TYPES
// ============================================

/**
 * R-tree item for spatial indexing
 */
interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  element: Element;
}

/**
 * Viewport bounds for culling calculations
 */
export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Render budget configuration
 */
export interface RenderBudget {
  /** Maximum elements to render per frame */
  maxElements: number;
  /** Priority order for element types (lower = higher priority) */
  typePriority: Record<string, number>;
  /** Whether to enable progressive loading */
  progressiveLoading: boolean;
}

/**
 * Virtualization result
 */
export interface VirtualizationResult {
  /** Elements visible in current viewport */
  visibleElements: Element[];
  /** Total element count */
  totalCount: number;
  /** Visible element count */
  visibleCount: number;
  /** Whether render budget was exceeded */
  budgetExceeded: boolean;
  /** Query elements in a bounds region */
  queryBounds: (bounds: Bounds) => Element[];
  /** Query elements near a point */
  queryPoint: (x: number, y: number, radius: number) => Element[];
  /** Force rebuild of spatial index */
  rebuildIndex: () => void;
}

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_RENDER_BUDGET: RenderBudget = {
  maxElements: 10000,
  typePriority: {
    wall: 1,
    door: 2,
    window: 2,
    room: 3,
    floor: 4,
    roof: 5,
    column: 1,
    beam: 1,
    stair: 3,
  },
  progressiveLoading: true,
};

// ============================================
// SPATIAL INDEX CLASS
// ============================================

class SpatialIndex {
  private tree: RBush<SpatialItem>;
  private elementMap: Map<string, SpatialItem>;

  constructor() {
    this.tree = new RBush<SpatialItem>();
    this.elementMap = new Map();
  }

  /**
   * Build index from elements array
   */
  build(elements: Element[]): void {
    this.tree.clear();
    this.elementMap.clear();

    const items: SpatialItem[] = elements.map((element) => {
      const item: SpatialItem = {
        minX: element.x,
        minY: element.y,
        maxX: element.x + element.width,
        maxY: element.y + element.height,
        element,
      };
      this.elementMap.set(element.id, item);
      return item;
    });

    this.tree.load(items);
  }

  /**
   * Query elements within a bounding box
   */
  queryBounds(bounds: Bounds): Element[] {
    const results = this.tree.search({
      minX: bounds.x,
      minY: bounds.y,
      maxX: bounds.x + bounds.width,
      maxY: bounds.y + bounds.height,
    });
    return results.map((item) => item.element);
  }

  /**
   * Query elements within a radius of a point
   */
  queryPoint(x: number, y: number, radius: number): Element[] {
    const results = this.tree.search({
      minX: x - radius,
      minY: y - radius,
      maxX: x + radius,
      maxY: y + radius,
    });

    // Filter to circular region
    return results
      .filter((item) => {
        const centerX = (item.minX + item.maxX) / 2;
        const centerY = (item.minY + item.maxY) / 2;
        const dx = centerX - x;
        const dy = centerY - y;
        return dx * dx + dy * dy <= radius * radius;
      })
      .map((item) => item.element);
  }

  /**
   * Get all elements in the index
   */
  all(): Element[] {
    return this.tree.all().map((item) => item.element);
  }

  /**
   * Check if index is empty
   */
  isEmpty(): boolean {
    return this.elementMap.size === 0;
  }
}

// ============================================
// VIEWPORT CULLING
// ============================================

/**
 * Calculate the visible bounds in canvas coordinates
 * based on viewport dimensions and pan/zoom state
 */
function calculateVisibleBounds(viewport: Viewport): Bounds {
  // Transform viewport bounds to canvas coordinates
  // The visible area is: (screenPos - pan) / zoom
  const visibleX = (0 - viewport.panX) / viewport.zoom;
  const visibleY = (0 - viewport.panY) / viewport.zoom;
  const visibleWidth = viewport.width / viewport.zoom;
  const visibleHeight = viewport.height / viewport.zoom;

  // Add a buffer zone (10% of viewport) for smoother scrolling
  const bufferX = visibleWidth * 0.1;
  const bufferY = visibleHeight * 0.1;

  return {
    x: visibleX - bufferX,
    y: visibleY - bufferY,
    width: visibleWidth + bufferX * 2,
    height: visibleHeight + bufferY * 2,
  };
}

/**
 * Apply render budget to element list
 * Prioritizes elements by type and culls excess
 */
function applyRenderBudget(
  elements: Element[],
  budget: RenderBudget
): { elements: Element[]; exceeded: boolean } {
  if (elements.length <= budget.maxElements) {
    return { elements, exceeded: false };
  }

  // Sort by priority (lower priority number = higher importance)
  const sorted = [...elements].sort((a, b) => {
    const priorityA = budget.typePriority[a.type] ?? 10;
    const priorityB = budget.typePriority[b.type] ?? 10;
    return priorityA - priorityB;
  });

  return {
    elements: sorted.slice(0, budget.maxElements),
    exceeded: true,
  };
}

// ============================================
// HOOK
// ============================================

/**
 * Hook for virtualized element rendering
 *
 * @param elements - All model elements
 * @param viewport - Current viewport state
 * @param renderBudget - Optional render budget configuration
 * @returns Virtualization result with visible elements and query functions
 *
 * @example
 * ```tsx
 * const {
 *   visibleElements,
 *   visibleCount,
 *   budgetExceeded,
 *   queryBounds
 * } = useVirtualization(elements, {
 *   x: 0,
 *   y: 0,
 *   width: window.innerWidth,
 *   height: window.innerHeight,
 *   zoom,
 *   panX,
 *   panY
 * });
 * ```
 */
export function useVirtualization(
  elements: Element[],
  viewport: Viewport,
  renderBudget: RenderBudget = DEFAULT_RENDER_BUDGET
): VirtualizationResult {
  // Maintain spatial index reference
  const indexRef = useRef<SpatialIndex>(new SpatialIndex());

  // Track element array reference for change detection
  const elementsRef = useRef<Element[]>([]);

  // Rebuild index when elements change
  useEffect(() => {
    // Only rebuild if elements array reference changed
    if (elementsRef.current !== elements) {
      elementsRef.current = elements;
      indexRef.current.build(elements);
    }
  }, [elements]);

  // Calculate visible bounds based on viewport
  const visibleBounds = useMemo(
    () => calculateVisibleBounds(viewport),
    [viewport.width, viewport.height, viewport.zoom, viewport.panX, viewport.panY]
  );

  // Query visible elements from spatial index
  const visibleElements = useMemo(() => {
    const index = indexRef.current;

    // If index is empty, return all elements (fallback)
    if (index.isEmpty()) {
      return elements;
    }

    return index.queryBounds(visibleBounds);
  }, [elements, visibleBounds]);

  // Apply render budget
  const budgetResult = useMemo(
    () => applyRenderBudget(visibleElements, renderBudget),
    [visibleElements, renderBudget]
  );

  // Query function for arbitrary bounds
  const queryBounds = useCallback(
    (bounds: Bounds): Element[] => {
      return indexRef.current.queryBounds(bounds);
    },
    []
  );

  // Query function for point + radius
  const queryPoint = useCallback(
    (x: number, y: number, radius: number): Element[] => {
      return indexRef.current.queryPoint(x, y, radius);
    },
    []
  );

  // Force rebuild function
  const rebuildIndex = useCallback(() => {
    indexRef.current.build(elements);
  }, [elements]);

  return {
    visibleElements: budgetResult.elements,
    totalCount: elements.length,
    visibleCount: budgetResult.elements.length,
    budgetExceeded: budgetResult.exceeded,
    queryBounds,
    queryPoint,
    rebuildIndex,
  };
}

// ============================================
// 3D FRUSTUM CULLING UTILITIES
// ============================================

/**
 * Simple 3D bounding box for frustum culling
 */
export interface BoundingBox3D {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/**
 * Convert 2D element bounds to 3D bounding box
 * Uses scale factor and estimated height
 */
export function elementTo3DBounds(
  element: Element,
  scale: number = 0.01,
  offsetX: number = 0,
  offsetZ: number = 0,
  wallHeight: number = 3
): BoundingBox3D {
  const x = element.x * scale + offsetX;
  const z = element.y * scale + offsetZ;
  const width = element.width * scale;
  const depth = element.height * scale;

  // Height varies by element type
  let height = 0.1; // Default thin
  switch (element.type) {
    case "wall":
      height = wallHeight;
      break;
    case "door":
      height = 2.1;
      break;
    case "window":
      height = 1.2;
      break;
    case "room":
      height = 0.05;
      break;
    case "floor":
      height = 0.15;
      break;
    case "roof":
      height = 1.5;
      break;
    case "column":
      height = wallHeight;
      break;
    case "beam":
      height = 0.4;
      break;
    case "stair":
      height = wallHeight;
      break;
  }

  return {
    minX: x,
    minY: 0,
    minZ: z,
    maxX: x + width,
    maxY: height,
    maxZ: z + depth,
  };
}

/**
 * Check if a 3D bounding box is visible to a frustum
 * Uses conservative sphere-based check for performance
 *
 * @param bounds - Element bounding box
 * @param cameraPosition - Camera position in world space
 * @param viewDistance - Maximum view distance
 * @returns Whether the element is potentially visible
 */
export function isVisibleToCamera(
  bounds: BoundingBox3D,
  cameraPosition: { x: number; y: number; z: number },
  viewDistance: number = 100
): boolean {
  // Calculate bounding sphere center
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  // Calculate bounding sphere radius (conservative)
  const radiusX = (bounds.maxX - bounds.minX) / 2;
  const radiusY = (bounds.maxY - bounds.minY) / 2;
  const radiusZ = (bounds.maxZ - bounds.minZ) / 2;
  const radius = Math.sqrt(radiusX * radiusX + radiusY * radiusY + radiusZ * radiusZ);

  // Distance from camera to sphere center
  const dx = centerX - cameraPosition.x;
  const dy = centerY - cameraPosition.y;
  const dz = centerZ - cameraPosition.z;
  const distanceToCamera = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Element is visible if its sphere is within view distance
  return distanceToCamera - radius <= viewDistance;
}

// ============================================
// LEVEL OF DETAIL (LOD) UTILITIES
// ============================================

export type LODLevel = "high" | "medium" | "low" | "hidden";

/**
 * Calculate appropriate LOD level based on distance from camera
 */
export function calculateLOD(
  distanceToCamera: number,
  thresholds: { medium: number; low: number; hidden: number } = {
    medium: 20,
    low: 50,
    hidden: 100,
  }
): LODLevel {
  if (distanceToCamera < thresholds.medium) return "high";
  if (distanceToCamera < thresholds.low) return "medium";
  if (distanceToCamera < thresholds.hidden) return "low";
  return "hidden";
}

/**
 * Get simplified geometry detail level for an element
 * Returns a multiplier for geometry complexity (1.0 = full detail)
 */
export function getLODGeometryMultiplier(lod: LODLevel): number {
  switch (lod) {
    case "high":
      return 1.0;
    case "medium":
      return 0.5;
    case "low":
      return 0.25;
    case "hidden":
      return 0;
  }
}

// ============================================
// PROGRESSIVE LOADING UTILITIES
// ============================================

/**
 * Split elements into loading batches for progressive rendering
 *
 * @param elements - All elements to batch
 * @param batchSize - Elements per batch
 * @returns Array of element batches
 */
export function createLoadingBatches(
  elements: Element[],
  batchSize: number = 100
): Element[][] {
  const batches: Element[][] = [];

  // Sort by type priority for better progressive UX
  const sorted = [...elements].sort((a, b) => {
    const priorityA = DEFAULT_RENDER_BUDGET.typePriority[a.type] ?? 10;
    const priorityB = DEFAULT_RENDER_BUDGET.typePriority[b.type] ?? 10;
    return priorityA - priorityB;
  });

  for (let i = 0; i < sorted.length; i += batchSize) {
    batches.push(sorted.slice(i, i + batchSize));
  }

  return batches;
}

export default useVirtualization;
