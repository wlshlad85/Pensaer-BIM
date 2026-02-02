/**
 * Pensaer BIM Platform - GridLine Element Renderer
 *
 * Renders a single structural grid line as a dashed SVG line with bubble labels.
 */

import { memo } from "react";
import type { Element, GridLineElement as GridLineType } from "../../../types";
import { useSelectionStore } from "../../../stores";
import clsx from "clsx";

interface GridLineElementProps {
  element: Element;
  onClick?: (e: React.MouseEvent, element: Element) => void;
  onMouseDown?: (e: React.MouseEvent, element: Element) => void;
  onContextMenu?: (e: React.MouseEvent, element: Element) => void;
  onMouseEnter?: (element: Element) => void;
  onMouseLeave?: () => void;
}

export const GridLineElement = memo(function GridLineElement({
  element,
  onClick,
  onMouseDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: GridLineElementProps) {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const hoveredId = useSelectionStore((s) => s.hoveredId);
  const isSelected = selectedIds.includes(element.id);
  const isHovered = hoveredId === element.id;

  if (element.type !== "gridline") return null;
  const grid = element as GridLineType;

  const bubbleSize = grid.bubbleSize || 20;
  const lineColor = grid.lineColor || "#6366f1";
  const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : 1;
  const opacity = isSelected ? 0.9 : 0.6;

  // Determine line coordinates
  // axis "x" → vertical line, axis "y" → horizontal line
  const EXTENT = 5000; // pixels each direction
  const pos = grid.position * 100; // meters → pixels at SCALE=100

  let x1: number, y1: number, x2: number, y2: number;
  let bubbleX1: number, bubbleY1: number, bubbleX2: number, bubbleY2: number;

  if (grid.axis === "x") {
    // Vertical line at x = pos
    x1 = pos; y1 = -EXTENT;
    x2 = pos; y2 = EXTENT;
    bubbleX1 = pos; bubbleY1 = -EXTENT - bubbleSize;
    bubbleX2 = pos; bubbleY2 = EXTENT + bubbleSize;
  } else {
    // Horizontal line at y = pos
    x1 = -EXTENT; y1 = pos;
    x2 = EXTENT;  y2 = pos;
    bubbleX1 = -EXTENT - bubbleSize; bubbleY1 = pos;
    bubbleX2 = EXTENT + bubbleSize;  bubbleY2 = pos;
  }

  return (
    <g
      className={clsx("model-element", isSelected && "selected")}
      style={{ cursor: "pointer" }}
      onClick={(e) => onClick?.(e, element)}
      onMouseDown={(e) => onMouseDown?.(e, element)}
      onContextMenu={(e) => onContextMenu?.(e, element)}
      onMouseEnter={() => onMouseEnter?.(element)}
      onMouseLeave={() => onMouseLeave?.()}
    >
      {/* Dashed grid line */}
      <line
        x1={x1} y1={y1}
        x2={x2} y2={y2}
        stroke={isHovered ? "#818cf8" : lineColor}
        strokeWidth={strokeWidth}
        strokeDasharray="10 5"
        opacity={opacity}
      />

      {/* Hit area (wider invisible line for easier clicking) */}
      <line
        x1={x1} y1={y1}
        x2={x2} y2={y2}
        stroke="transparent"
        strokeWidth={12}
      />

      {/* Start bubble */}
      <circle
        cx={bubbleX1} cy={bubbleY1}
        r={bubbleSize / 2}
        fill={isSelected ? "#4f46e5" : "#1f2937"}
        stroke={lineColor}
        strokeWidth={1.5}
      />
      <text
        x={bubbleX1} y={bubbleY1 + 4}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={11}
        fontWeight="bold"
      >
        {grid.label}
      </text>

      {/* End bubble */}
      <circle
        cx={bubbleX2} cy={bubbleY2}
        r={bubbleSize / 2}
        fill={isSelected ? "#4f46e5" : "#1f2937"}
        stroke={lineColor}
        strokeWidth={1.5}
      />
      <text
        x={bubbleX2} y={bubbleY2 + 4}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={11}
        fontWeight="bold"
      >
        {grid.label}
      </text>
    </g>
  );
});
