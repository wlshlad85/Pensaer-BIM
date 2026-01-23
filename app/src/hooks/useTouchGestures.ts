/**
 * useTouchGestures - Hook for touch gesture handling on mobile devices
 *
 * Provides support for:
 * - Two-finger pinch to zoom
 * - Two-finger pan
 * - Single-finger pan (when in pan mode)
 */

import { useCallback, useRef, useEffect } from "react";

export interface TouchGestureOptions {
  /** Callback for zoom gesture */
  onZoom?: (delta: number, center: { x: number; y: number }) => void;
  /** Callback for pan gesture */
  onPan?: (deltaX: number, deltaY: number) => void;
  /** Callback for tap gesture */
  onTap?: (position: { x: number; y: number }) => void;
  /** Callback for double tap */
  onDoubleTap?: (position: { x: number; y: number }) => void;
  /** Minimum distance for pan to register */
  panThreshold?: number;
  /** Time window for double tap (ms) */
  doubleTapDelay?: number;
}

export interface UseTouchGesturesResult {
  /** Ref to attach to the target element */
  ref: React.RefObject<HTMLElement | SVGSVGElement | null>;
  /** Whether a gesture is currently in progress */
  isGestureActive: boolean;
}

/**
 * Hook for handling touch gestures (pinch zoom, pan) on mobile devices
 */
export function useTouchGestures(
  options: TouchGestureOptions = {},
): UseTouchGesturesResult {
  const {
    onZoom,
    onPan,
    onTap,
    onDoubleTap,
    panThreshold = 5,
    doubleTapDelay = 300,
  } = options;

  const ref = useRef<HTMLElement | SVGSVGElement | null>(null);
  const isGestureActiveRef = useRef(false);

  // Track touch state
  const touchStateRef = useRef({
    startTouches: [] as { x: number; y: number }[],
    lastPinchDistance: 0,
    lastPinchCenter: { x: 0, y: 0 },
    lastPanPosition: { x: 0, y: 0 },
    lastTapTime: 0,
    lastTapPosition: { x: 0, y: 0 },
    touchStartTime: 0,
    hasMoved: false,
  });

  /**
   * Calculate distance between two touch points
   */
  const getTouchDistance = useCallback(
    (touch1: { x: number; y: number }, touch2: { x: number; y: number }) => {
      return Math.sqrt(
        Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2),
      );
    },
    [],
  );

  /**
   * Calculate center between two touch points
   */
  const getTouchCenter = useCallback(
    (touch1: { x: number; y: number }, touch2: { x: number; y: number }) => {
      return {
        x: (touch1.x + touch2.x) / 2,
        y: (touch1.y + touch2.y) / 2,
      };
    },
    [],
  );

  /**
   * Get touch point from TouchEvent relative to element
   */
  const getTouchPoint = useCallback(
    (touch: Touch, element: HTMLElement | SVGSVGElement) => {
      const rect = element.getBoundingClientRect();
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    },
    [],
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const state = touchStateRef.current;
      state.touchStartTime = Date.now();
      state.hasMoved = false;

      // Convert touches to array
      state.startTouches = Array.from(e.touches).map((t) =>
        getTouchPoint(t, element),
      );

      if (e.touches.length === 2) {
        // Two-finger gesture - pinch/pan
        e.preventDefault();
        isGestureActiveRef.current = true;

        const touch1 = getTouchPoint(e.touches[0], element);
        const touch2 = getTouchPoint(e.touches[1], element);

        state.lastPinchDistance = getTouchDistance(touch1, touch2);
        state.lastPinchCenter = getTouchCenter(touch1, touch2);
      } else if (e.touches.length === 1) {
        // Single finger - potential tap or pan
        const touch = getTouchPoint(e.touches[0], element);
        state.lastPanPosition = touch;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const state = touchStateRef.current;
      state.hasMoved = true;

      if (e.touches.length === 2) {
        // Pinch zoom
        e.preventDefault();
        isGestureActiveRef.current = true;

        const touch1 = getTouchPoint(e.touches[0], element);
        const touch2 = getTouchPoint(e.touches[1], element);

        const currentDistance = getTouchDistance(touch1, touch2);
        const currentCenter = getTouchCenter(touch1, touch2);

        // Zoom
        if (state.lastPinchDistance > 0 && onZoom) {
          const zoomDelta = currentDistance / state.lastPinchDistance;
          onZoom(zoomDelta, currentCenter);
        }

        // Pan (movement of center)
        if (onPan) {
          const panDeltaX = currentCenter.x - state.lastPinchCenter.x;
          const panDeltaY = currentCenter.y - state.lastPinchCenter.y;
          if (Math.abs(panDeltaX) > 1 || Math.abs(panDeltaY) > 1) {
            onPan(panDeltaX, panDeltaY);
          }
        }

        state.lastPinchDistance = currentDistance;
        state.lastPinchCenter = currentCenter;
      } else if (e.touches.length === 1 && onPan) {
        // Single finger pan
        const touch = getTouchPoint(e.touches[0], element);
        const deltaX = touch.x - state.lastPanPosition.x;
        const deltaY = touch.y - state.lastPanPosition.y;

        if (Math.abs(deltaX) > panThreshold || Math.abs(deltaY) > panThreshold) {
          isGestureActiveRef.current = true;
          onPan(deltaX, deltaY);
          state.lastPanPosition = touch;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const state = touchStateRef.current;
      const now = Date.now();
      const touchDuration = now - state.touchStartTime;

      if (e.touches.length === 0) {
        // All fingers lifted
        isGestureActiveRef.current = false;

        // Check for tap (short touch, no movement)
        if (!state.hasMoved && touchDuration < 300) {
          const tapPosition = state.startTouches[0];
          if (tapPosition) {
            // Check for double tap
            if (
              onDoubleTap &&
              now - state.lastTapTime < doubleTapDelay &&
              getTouchDistance(tapPosition, state.lastTapPosition) < 30
            ) {
              onDoubleTap(tapPosition);
              state.lastTapTime = 0; // Reset to prevent triple tap
            } else {
              // Single tap
              if (onTap) {
                onTap(tapPosition);
              }
              state.lastTapTime = now;
              state.lastTapPosition = tapPosition;
            }
          }
        }

        state.lastPinchDistance = 0;
      }
    };

    // Add event listeners with passive: false for preventDefault support
    element.addEventListener("touchstart", handleTouchStart, { passive: false });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    onZoom,
    onPan,
    onTap,
    onDoubleTap,
    panThreshold,
    doubleTapDelay,
    getTouchPoint,
    getTouchDistance,
    getTouchCenter,
  ]);

  return {
    ref,
    isGestureActive: isGestureActiveRef.current,
  };
}

export default useTouchGestures;
