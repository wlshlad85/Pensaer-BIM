/**
 * GuideLine component for perpendicular snap visual feedback
 *
 * Shows a guide line during drawing to indicate perpendicular alignment
 * with existing walls.
 */

import type { Point } from "../../utils/geometry";

interface GuideLineProps {
  /** Start point of the guide line */
  start: Point;
  /** End point of the guide line */
  end: Point;
  /** Whether the guide line is visible */
  visible?: boolean;
  /** Line color (default: cyan for perpendicular) */
  color?: string;
  /** Line width (default: 1) */
  strokeWidth?: number;
  /** Show perpendicular indicator symbol */
  showPerpendicularSymbol?: boolean;
  /** Label to display (e.g., "90°") */
  label?: string;
}

/**
 * Renders a guide line with optional perpendicular symbol and label.
 */
export function GuideLine({
  start,
  end,
  visible = true,
  color = "#06b6d4",
  strokeWidth = 1.5,
  showPerpendicularSymbol = true,
  label,
}: GuideLineProps) {
  if (!visible) return null;

  // Calculate the distance for label positioning
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  // Calculate perpendicular symbol position and rotation
  // Symbol is placed at the start point, oriented relative to the line
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Size of the perpendicular symbol (small square corner indicator)
  const symbolSize = 10;

  return (
    <g className="pointer-events-none">
      {/* Dashed guide line */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6 4"
        strokeOpacity={0.8}
      />

      {/* Extension line beyond the end point (subtle) */}
      <line
        x1={end.x}
        y1={end.y}
        x2={end.x + dx * 0.3}
        y2={end.y + dy * 0.3}
        stroke={color}
        strokeWidth={strokeWidth * 0.5}
        strokeDasharray="3 3"
        strokeOpacity={0.4}
      />

      {/* Perpendicular symbol at start point */}
      {showPerpendicularSymbol && (
        <g transform={`translate(${start.x}, ${start.y}) rotate(${angle})`}>
          {/* Small right-angle corner symbol */}
          <path
            d={`M ${symbolSize} 0 L ${symbolSize} ${symbolSize} L 0 ${symbolSize}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeOpacity={0.9}
          />
        </g>
      )}

      {/* End point indicator */}
      <circle
        cx={end.x}
        cy={end.y}
        r={4}
        fill={color}
        fillOpacity={0.6}
        stroke={color}
        strokeWidth={1}
      />

      {/* Label (e.g., "90°" or "PERP") */}
      {label && (
        <text
          x={midX + 8}
          y={midY - 8}
          fontSize={11}
          fontFamily="monospace"
          fill={color}
          fontWeight="bold"
        >
          {label}
        </text>
      )}
    </g>
  );
}

export default GuideLine;
