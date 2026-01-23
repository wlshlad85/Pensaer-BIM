/**
 * Pensaer BIM Platform - FPS Counter Component
 *
 * Lightweight FPS counter overlay specifically for the 3D view.
 * Displays real-time FPS with color coding based on performance.
 * Toggle visibility with F8 (dedicated to 3D view, separate from F3 global monitor).
 * Only visible in development mode.
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface FPSCounterProps {
  /** Whether the counter is visible (controlled mode) */
  visible?: boolean;
  /** Callback when visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
  /** Position on screen */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

interface FPSStats {
  fps: number;
  frameTime: number;
}

// Rolling average window size
const SAMPLE_SIZE = 60;

export function FPSCounter({
  visible: controlledVisible,
  onVisibilityChange,
  position = "bottom-left",
}: FPSCounterProps): JSX.Element | null {
  // Only show in development mode
  const isDev = import.meta.env.DEV;

  const [internalVisible, setInternalVisible] = useState(isDev);
  const [stats, setStats] = useState<FPSStats>({ fps: 0, frameTime: 0 });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const frameTimesRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Use controlled visibility if provided, otherwise internal state
  const isVisible =
    controlledVisible !== undefined ? controlledVisible : internalVisible;

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    if (controlledVisible !== undefined && onVisibilityChange) {
      onVisibilityChange(!controlledVisible);
    } else {
      setInternalVisible((prev) => !prev);
    }
  }, [controlledVisible, onVisibilityChange]);

  // Handle F8 keyboard shortcut (separate from F3 global monitor)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F8") {
        event.preventDefault();
        toggleVisibility();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleVisibility]);

  // Performance monitoring loop using requestAnimationFrame
  useEffect(() => {
    if (!isVisible) return;

    const updateStats = () => {
      const now = performance.now();
      frameCountRef.current++;

      // Calculate frame time
      const frameTime = now - lastTimeRef.current;
      frameTimesRef.current.push(frameTime);

      // Keep only last SAMPLE_SIZE frame times for rolling average
      if (frameTimesRef.current.length > SAMPLE_SIZE) {
        frameTimesRef.current.shift();
      }

      // Update display every ~500ms for stability
      if (frameCountRef.current % 30 === 0) {
        const avgFrameTime =
          frameTimesRef.current.reduce((a, b) => a + b, 0) /
          frameTimesRef.current.length;
        const fps = Math.round(1000 / avgFrameTime);

        setStats({
          fps,
          frameTime: Math.round(avgFrameTime * 10) / 10,
        });
      }

      lastTimeRef.current = now;
      animationFrameRef.current = requestAnimationFrame(updateStats);
    };

    animationFrameRef.current = requestAnimationFrame(updateStats);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible]);

  // Don't render in production or when hidden
  if (!isDev || !isVisible) return null;

  // Position classes (offset to avoid conflicts with Canvas3D controls)
  const positionClasses = {
    "top-left": "top-14 left-4",
    "top-right": "top-24 right-4",
    "bottom-left": "bottom-28 left-4",
    "bottom-right": "bottom-14 right-4",
  };

  // FPS color based on performance
  const getFpsColor = (fps: number): string => {
    if (fps >= 55) return "text-green-400";
    if (fps >= 30) return "text-yellow-400";
    return "text-red-400";
  };

  // Background color based on performance
  const getBgColor = (fps: number): string => {
    if (fps >= 55) return "bg-green-900/20";
    if (fps >= 30) return "bg-yellow-900/20";
    return "bg-red-900/20";
  };

  return (
    <div
      className={`absolute ${positionClasses[position]} z-40 ${getBgColor(stats.fps)} backdrop-blur-sm rounded px-2 py-1 text-xs font-mono border border-gray-700/50 select-none pointer-events-none`}
    >
      <div className="flex items-baseline gap-1.5">
        <span className={`font-bold ${getFpsColor(stats.fps)}`}>
          {stats.fps}
        </span>
        <span className="text-gray-500 text-[10px]">FPS</span>
        <span className="text-gray-600 text-[10px]">{stats.frameTime}ms</span>
      </div>
    </div>
  );
}

export default FPSCounter;
