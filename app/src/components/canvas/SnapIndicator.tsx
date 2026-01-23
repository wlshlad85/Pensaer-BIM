/**
 * Pensaer BIM Platform - Snap Indicator
 *
 * Visual feedback when snapping to grid or elements.
 * Shows different icons for each snap type with smooth animations.
 */

import { memo, useState, useEffect } from "react";
import type { SnapType } from "../../utils/snap";
import { getSnapIndicatorStyle, getSnapTypeLabel } from "../../utils/snap";

interface SnapIndicatorProps {
  x: number;
  y: number;
  snapType: SnapType;
  visible: boolean;
  showTooltip?: boolean;
}

// CSS keyframes for pulse animation (defined inline for SVG)
const PULSE_ANIMATION = `
  @keyframes snap-pulse {
    0%, 100% { opacity: 0.8; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.15); }
  }
`;

export const SnapIndicator = memo(function SnapIndicator({
  x,
  y,
  snapType,
  visible,
  showTooltip = true,
}: SnapIndicatorProps) {
  // Track opacity for fade animation
  const [opacity, setOpacity] = useState(0);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle fade in/out animation
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        setOpacity(1);
      });
    } else {
      setOpacity(0);
      // Wait for fade out before removing from DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!shouldRender) return null;

  const style = getSnapIndicatorStyle(snapType);
  const label = getSnapTypeLabel(snapType);

  // Common group props for animation
  const groupStyle = {
    pointerEvents: "none" as const,
    opacity,
    transition: "opacity 150ms ease-in-out",
  };

  // Render the appropriate shape based on snap type
  const renderShape = () => {
    // Common style for all shapes
    const shapeStyle = {
      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
    };

    switch (style.shape) {
      case "circle":
        return (
          <>
            {/* Outer ring for better visibility */}
            <circle
              cx={x}
              cy={y}
              r={style.size + 3}
              fill="none"
              stroke={style.color}
              strokeWidth={1.5}
              strokeOpacity={0.4}
              style={shapeStyle}
            />
            {/* Main indicator */}
            <circle
              cx={x}
              cy={y}
              r={style.size}
              fill={style.color}
              stroke="#fff"
              strokeWidth={1.5}
              style={shapeStyle}
            />
          </>
        );

      case "square":
        return (
          <>
            {/* Outer ring for better visibility */}
            <rect
              x={x - style.size / 2 - 3}
              y={y - style.size / 2 - 3}
              width={style.size + 6}
              height={style.size + 6}
              fill="none"
              stroke={style.color}
              strokeWidth={1.5}
              strokeOpacity={0.4}
              style={shapeStyle}
            />
            {/* Main indicator */}
            <rect
              x={x - style.size / 2}
              y={y - style.size / 2}
              width={style.size}
              height={style.size}
              fill={style.color}
              stroke="#fff"
              strokeWidth={1.5}
              style={shapeStyle}
            />
          </>
        );

      case "diamond":
        const innerPoints = `
          ${x},${y - style.size}
          ${x + style.size},${y}
          ${x},${y + style.size}
          ${x - style.size},${y}
        `;
        const outerSize = style.size + 3;
        const outerPoints = `
          ${x},${y - outerSize}
          ${x + outerSize},${y}
          ${x},${y + outerSize}
          ${x - outerSize},${y}
        `;
        return (
          <>
            {/* Outer ring for better visibility */}
            <polygon
              points={outerPoints}
              fill="none"
              stroke={style.color}
              strokeWidth={1.5}
              strokeOpacity={0.4}
              style={shapeStyle}
            />
            {/* Main indicator */}
            <polygon
              points={innerPoints}
              fill={style.color}
              stroke="#fff"
              strokeWidth={1.5}
              style={shapeStyle}
            />
          </>
        );

      case "cross":
        // Perpendicular snap indicator - cross shape
        const crossSize = style.size;
        return (
          <>
            {/* Outer glow */}
            <circle
              cx={x}
              cy={y}
              r={crossSize + 4}
              fill="none"
              stroke={style.color}
              strokeWidth={1.5}
              strokeOpacity={0.4}
              style={shapeStyle}
            />
            {/* Horizontal line */}
            <line
              x1={x - crossSize}
              y1={y}
              x2={x + crossSize}
              y2={y}
              stroke={style.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              style={shapeStyle}
            />
            <line
              x1={x - crossSize}
              y1={y}
              x2={x + crossSize}
              y2={y}
              stroke="#fff"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            {/* Vertical line */}
            <line
              x1={x}
              y1={y - crossSize}
              x2={x}
              y2={y + crossSize}
              stroke={style.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              style={shapeStyle}
            />
            <line
              x1={x}
              y1={y - crossSize}
              x2={x}
              y2={y + crossSize}
              stroke="#fff"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <g style={groupStyle}>
      {/* Inject keyframes for animation */}
      <style>{PULSE_ANIMATION}</style>

      {/* Snap indicator shape */}
      <g
        style={{
          animation: "snap-pulse 1s ease-in-out infinite",
          transformOrigin: `${x}px ${y}px`,
        }}
      >
        {renderShape()}
      </g>

      {/* Tooltip label */}
      {showTooltip && label && (
        <g>
          {/* Background for tooltip */}
          <rect
            x={x - 25}
            y={y - style.size - 22}
            width={50}
            height={16}
            rx={3}
            fill="rgba(0,0,0,0.75)"
          />
          {/* Tooltip text */}
          <text
            x={x}
            y={y - style.size - 10}
            textAnchor="middle"
            fontSize={10}
            fontFamily="system-ui, sans-serif"
            fontWeight={500}
            fill="#fff"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
});
