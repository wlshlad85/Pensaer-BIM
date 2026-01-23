/**
 * Performance Monitor Component
 *
 * Displays real-time FPS, frame time, memory usage, and render statistics.
 * Toggleable with F3 keyboard shortcut.
 * Dev mode only by default.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type * as THREE from 'three';
import { useModelStore } from '../../stores';

interface PerformanceStats {
  fps: number;
  frameTime: number;
  memoryUsed: number;
  memoryLimit: number;
  elementCount: number;
  triangles: number;
  drawCalls: number;
  textures: number;
  geometries: number;
}

interface FrameTimeEntry {
  time: number;
  frameTime: number;
}

interface Props {
  /** Whether the monitor is visible */
  visible?: boolean;
  /** Callback when visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
  /** Three.js renderer for render stats */
  renderer?: THREE.WebGLRenderer | null;
  /** Position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Show frame time graph */
  showGraph?: boolean;
}

// Circular buffer for frame time history
const FRAME_HISTORY_SIZE = 60;

export function PerformanceMonitor({
  visible: controlledVisible,
  onVisibilityChange,
  renderer,
  position = 'top-left',
  showGraph = true,
}: Props): JSX.Element | null {
  const [internalVisible, setInternalVisible] = useState(false);
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    memoryUsed: 0,
    memoryLimit: 0,
    elementCount: 0,
    triangles: 0,
    drawCalls: 0,
    textures: 0,
    geometries: 0,
  });
  const [frameHistory, setFrameHistory] = useState<FrameTimeEntry[]>([]);

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const frameTimesRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Use controlled visibility if provided, otherwise internal state
  const isVisible = controlledVisible !== undefined ? controlledVisible : internalVisible;

  // Get element count from store
  const elements = useModelStore((s) => s.elements);
  const elementCount = elements.length;

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    if (controlledVisible !== undefined && onVisibilityChange) {
      onVisibilityChange(!controlledVisible);
    } else {
      setInternalVisible((prev) => !prev);
    }
  }, [controlledVisible, onVisibilityChange]);

  // Handle F3 keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F3') {
        event.preventDefault();
        toggleVisibility();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleVisibility]);

  // Performance monitoring loop
  useEffect(() => {
    if (!isVisible) return;

    const updateStats = () => {
      const now = performance.now();
      frameCountRef.current++;

      // Calculate frame time
      const frameTime = now - lastTimeRef.current;
      frameTimesRef.current.push(frameTime);

      // Keep only last second of frame times
      if (frameTimesRef.current.length > 120) {
        frameTimesRef.current.shift();
      }

      // Calculate FPS every 500ms
      const elapsed = now - (lastTimeRef.current - frameTime);
      if (elapsed >= 500 || frameCountRef.current === 1) {
        const avgFrameTime =
          frameTimesRef.current.reduce((a, b) => a + b, 0) /
          frameTimesRef.current.length;
        const fps = Math.round(1000 / avgFrameTime);

        // Get memory info if available
        let memoryUsed = 0;
        let memoryLimit = 0;
        if ((performance as any).memory) {
          const memory = (performance as any).memory;
          memoryUsed = Math.round(memory.usedJSHeapSize / 1024 / 1024);
          memoryLimit = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        }

        // Get renderer stats if available
        let triangles = 0;
        let drawCalls = 0;
        let textures = 0;
        let geometries = 0;
        if (renderer) {
          const info = renderer.info;
          triangles = info.render.triangles;
          drawCalls = info.render.calls;
          textures = info.memory.textures;
          geometries = info.memory.geometries;
        }

        setStats({
          fps,
          frameTime: Math.round(avgFrameTime * 10) / 10,
          memoryUsed,
          memoryLimit,
          elementCount,
          triangles,
          drawCalls,
          textures,
          geometries,
        });

        // Update frame history for graph
        if (showGraph) {
          setFrameHistory((prev) => {
            const newHistory = [
              ...prev,
              { time: now, frameTime: avgFrameTime },
            ];
            // Keep only last N entries
            if (newHistory.length > FRAME_HISTORY_SIZE) {
              return newHistory.slice(-FRAME_HISTORY_SIZE);
            }
            return newHistory;
          });
        }
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
  }, [isVisible, elementCount, renderer, showGraph]);

  if (!isVisible) return null;

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  // FPS color based on performance
  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 text-xs font-mono shadow-lg border border-gray-700`}
      style={{ minWidth: '180px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
        <span className="text-gray-400 font-semibold">Performance</span>
        <button
          onClick={toggleVisibility}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          title="Close (F3)"
        >
          <i className="fa-solid fa-times" />
        </button>
      </div>

      {/* FPS Display */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-2xl font-bold ${getFpsColor(stats.fps)}`}>
          {stats.fps}
        </span>
        <span className="text-gray-500">FPS</span>
        <span className="text-gray-600 ml-auto">{stats.frameTime}ms</span>
      </div>

      {/* Frame Time Graph */}
      {showGraph && frameHistory.length > 1 && (
        <FrameTimeGraph history={frameHistory} />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pt-2 border-t border-gray-700">
        <StatRow label="Elements" value={stats.elementCount} />
        <StatRow label="Memory" value={`${stats.memoryUsed}MB`} />
        {renderer && (
          <>
            <StatRow label="Triangles" value={formatNumber(stats.triangles)} />
            <StatRow label="Draw Calls" value={stats.drawCalls} />
            <StatRow label="Textures" value={stats.textures} />
            <StatRow label="Geometries" value={stats.geometries} />
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-2 pt-2 border-t border-gray-700 text-gray-600 text-center">
        Press F3 to toggle
      </div>
    </div>
  );
}

/**
 * Single stat row component
 */
function StatRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}): JSX.Element {
  return (
    <>
      <span className="text-gray-500">{label}:</span>
      <span className="text-gray-300 text-right">{value}</span>
    </>
  );
}

/**
 * Frame time graph visualization
 */
function FrameTimeGraph({
  history,
}: {
  history: FrameTimeEntry[];
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    // Draw target frame time lines (60fps = 16.67ms, 30fps = 33.33ms)
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // 60fps line (16.67ms)
    const fps60Y = height - (16.67 / 50) * height;
    ctx.beginPath();
    ctx.moveTo(0, fps60Y);
    ctx.lineTo(width, fps60Y);
    ctx.stroke();

    // 30fps line (33.33ms)
    const fps30Y = height - (33.33 / 50) * height;
    ctx.beginPath();
    ctx.moveTo(0, fps30Y);
    ctx.lineTo(width, fps30Y);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw frame time graph
    if (history.length < 2) return;

    const maxFrameTime = 50; // Cap at 50ms for visualization
    const stepX = width / (FRAME_HISTORY_SIZE - 1);

    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;

    history.forEach((entry, i) => {
      const x = i * stepX;
      const normalizedFrameTime = Math.min(entry.frameTime, maxFrameTime);
      const y = height - (normalizedFrameTime / maxFrameTime) * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      // Color segments based on performance
      if (i > 0 && entry.frameTime > 33.33) {
        ctx.strokeStyle = entry.frameTime > 50 ? '#ef4444' : '#f59e0b';
      } else if (i > 0) {
        ctx.strokeStyle = '#10b981';
      }
    });

    ctx.stroke();
  }, [history]);

  return (
    <div className="mb-2">
      <canvas
        ref={canvasRef}
        width={160}
        height={40}
        className="w-full rounded border border-gray-700"
      />
      <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
        <span>60fps</span>
        <span>30fps</span>
      </div>
    </div>
  );
}

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export default PerformanceMonitor;
