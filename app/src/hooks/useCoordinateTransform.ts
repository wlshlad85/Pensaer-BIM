/**
 * Pensaer BIM Platform - Coordinate Transform Hook
 *
 * React hook for easy access to coordinate transformation functions
 * that automatically use the current viewport state.
 */

import { useCallback, useMemo } from "react";
import { useUIStore } from "../stores";
import {
  screenToModel,
  modelToScreen,
  screenDistanceToModel,
  modelDistanceToScreen,
  getVisibleBounds,
  isPointVisible,
  clampToViewport,
  snapToGrid,
  calculateZoomToFit,
  type Viewport2D,
} from "../utils/coordinates";
import type { Point } from "../utils/geometry";

/**
 * Hook for coordinate transformations with current viewport state
 *
 * @param viewportSize - Current viewport dimensions (from container ref)
 * @returns Object with transform functions
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const [size, setSize] = useState({ width: 800, height: 600 });
 *
 * useEffect(() => {
 *   const observer = new ResizeObserver(entries => {
 *     const { width, height } = entries[0].contentRect;
 *     setSize({ width, height });
 *   });
 *   if (containerRef.current) observer.observe(containerRef.current);
 *   return () => observer.disconnect();
 * }, []);
 *
 * const { toModel, toScreen } = useCoordinateTransform(size);
 *
 * const handleClick = (e: React.MouseEvent) => {
 *   const screenPoint = { x: e.clientX, y: e.clientY };
 *   const modelPoint = toModel(screenPoint);
 *   console.log('Clicked at model coords:', modelPoint);
 * };
 * ```
 */
export function useCoordinateTransform(viewportSize: {
  width: number;
  height: number;
}) {
  const zoom = useUIStore((s) => s.zoom);
  const panX = useUIStore((s) => s.panX);
  const panY = useUIStore((s) => s.panY);
  const snap = useUIStore((s) => s.snap);

  // Memoize viewport configuration
  const viewport: Viewport2D = useMemo(
    () => ({
      zoom,
      panX,
      panY,
      width: viewportSize.width,
      height: viewportSize.height,
    }),
    [zoom, panX, panY, viewportSize.width, viewportSize.height]
  );

  /**
   * Convert screen coordinates to model coordinates
   */
  const toModel = useCallback(
    (screenPoint: Point): Point => {
      return screenToModel(screenPoint, viewport);
    },
    [viewport]
  );

  /**
   * Convert model coordinates to screen coordinates
   */
  const toScreen = useCallback(
    (modelPoint: Point): Point => {
      return modelToScreen(modelPoint, viewport);
    },
    [viewport]
  );

  /**
   * Convert screen distance to model distance
   */
  const distanceToModel = useCallback(
    (screenDistance: number): number => {
      return screenDistanceToModel(screenDistance, zoom);
    },
    [zoom]
  );

  /**
   * Convert model distance to screen distance
   */
  const distanceToScreen = useCallback(
    (modelDistance: number): number => {
      return modelDistanceToScreen(modelDistance, zoom);
    },
    [zoom]
  );

  /**
   * Get the visible model bounds
   */
  const visibleBounds = useMemo(() => {
    return getVisibleBounds(viewport);
  }, [viewport]);

  /**
   * Check if a model point is visible
   */
  const isVisible = useCallback(
    (modelPoint: Point, margin = 0): boolean => {
      return isPointVisible(modelPoint, viewport, margin);
    },
    [viewport]
  );

  /**
   * Clamp a screen point to the viewport
   */
  const clamp = useCallback(
    (screenPoint: Point): Point => {
      return clampToViewport(screenPoint, viewportSize);
    },
    [viewportSize]
  );

  /**
   * Snap a model point to the grid (if snap is enabled)
   */
  const snapPoint = useCallback(
    (modelPoint: Point): Point => {
      if (!snap.enabled || !snap.grid) {
        return modelPoint;
      }
      return snapToGrid(modelPoint, snap.gridSize);
    },
    [snap.enabled, snap.grid, snap.gridSize]
  );

  /**
   * Convert screen point to model with optional grid snapping
   */
  const toModelSnapped = useCallback(
    (screenPoint: Point): Point => {
      const modelPoint = toModel(screenPoint);
      return snapPoint(modelPoint);
    },
    [toModel, snapPoint]
  );

  /**
   * Calculate zoom to fit given bounds
   */
  const getZoomToFit = useCallback(
    (bounds: { width: number; height: number }, padding = 50): number => {
      return calculateZoomToFit(bounds, viewportSize, padding);
    },
    [viewportSize]
  );

  return {
    // Core transforms
    toModel,
    toScreen,
    toModelSnapped,

    // Distance transforms
    distanceToModel,
    distanceToScreen,

    // Visibility
    visibleBounds,
    isVisible,

    // Utilities
    clamp,
    snapPoint,
    getZoomToFit,

    // Raw viewport for advanced use
    viewport,
  };
}

export default useCoordinateTransform;
