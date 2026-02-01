/**
 * Pensaer BIM Platform - Grid Element Renderer
 *
 * Renders a structural grid as SVG lines with bubble labels.
 */

import { memo } from "react";
import type { Element, GridElement as GridElementType } from "../../../types";
import { useSelectionStore } from "../../../stores";
import clsx from "clsx";

interface GridElementProps {
  element: Element;
  onClick?: (e: React.MouseEvent, element: Element) => void;
  onMouseDown?: (e: React.MouseEvent, element: Element) => void;
  onContextMenu?: (e: React.MouseEvent, element: Element) => void;
  onMouseEnter?: (element: Element) => void;
  onMouseLeave?: () => void;
}

export const GridElement = memo(function GridElement({
  element,
  onClick,
  onMouseDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: GridElementProps) {
  const isSelected = useSelectionStore((s) => s.isSelected(element.id));
  const isHovered = useSelectionStore((s) => s.isHovered(element.id));
  const isHighlighted = useSelectionStore((s) => s.isHighlighted(element.id));

  // Type guard for grid element
  if (element.type !== "grid") return null;
  const grid = element as GridElementType;

  const bubbleSize = grid.bubbleSize || 24;
  const lineColor = grid.lineColor || "#6366f1";
  const strokeWidth = isSelected ? 2 : 1;

  // Calculate scale factor (element dimensions are in mm, convert to pixels)
  const scale = 0.1; // 1mm = 0.1px for display

  return (
    <g
      className={clsx(
        "model-element",
        isSelected && "selected",
        isHighlighted && "highlighted",
      )}
      style={{ cursor: "pointer" }}
      onClick={(e) => onClick?.(e, element)}
      onMouseDown={(e) => onMouseDown?.(e, element)}
      onContextMenu={(e) => onContextMenu?.(e, element)}
      onMouseEnter={() => onMouseEnter?.(element)}
      onMouseLeave={() => onMouseLeave?.()}
    >
      {/* Grid bounding box (subtle) */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill="none"
        stroke={isSelected ? "#6366f1" : "#374151"}
        strokeWidth={0.5}
        strokeDasharray="4 4"
        opacity={0.3}
      />

      {/* Horizontal grid lines */}
      {grid.horizontalLines.map((line) => {
        const y = element.y + line.position * scale;
        const extendOffset = bubbleSize + 10;

        return (
          <g key={`h-${line.id}`}>
            {/* Grid line */}
            <line
              x1={element.x - extendOffset}
              y1={y}
              x2={element.x + element.width + extendOffset}
              y2={y}
              stroke={isHovered ? "#818cf8" : lineColor}
              strokeWidth={strokeWidth}
              strokeDasharray="8 4"
              opacity={0.7}
            />

            {/* Left bubble */}
            {grid.showBubbles !== false && (
              <>
                <circle
                  cx={element.x - extendOffset - bubbleSize / 2}
                  cy={y}
                  r={bubbleSize / 2}
                  fill={isSelected ? "#4f46e5" : "#1f2937"}
                  stroke={lineColor}
                  strokeWidth={1}
                />
                <text
                  x={element.x - extendOffset - bubbleSize / 2}
                  y={y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={12}
                  fontWeight="bold"
                >
                  {line.id}
                </text>
              </>
            )}

            {/* Right bubble */}
            {grid.showBubbles !== false && (
              <>
                <circle
                  cx={element.x + element.width + extendOffset + bubbleSize / 2}
                  cy={y}
                  r={bubbleSize / 2}
                  fill={isSelected ? "#4f46e5" : "#1f2937"}
                  stroke={lineColor}
                  strokeWidth={1}
                />
                <text
                  x={element.x + element.width + extendOffset + bubbleSize / 2}
                  y={y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={12}
                  fontWeight="bold"
                >
                  {line.id}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Vertical grid lines */}
      {grid.verticalLines.map((line) => {
        const x = element.x + line.position * scale;
        const extendOffset = bubbleSize + 10;

        return (
          <g key={`v-${line.id}`}>
            {/* Grid line */}
            <line
              x1={x}
              y1={element.y - extendOffset}
              x2={x}
              y2={element.y + element.height + extendOffset}
              stroke={isHovered ? "#818cf8" : lineColor}
              strokeWidth={strokeWidth}
              strokeDasharray="8 4"
              opacity={0.7}
            />

            {/* Top bubble */}
            {grid.showBubbles !== false && (
              <>
                <circle
                  cx={x}
                  cy={element.y - extendOffset - bubbleSize / 2}
                  r={bubbleSize / 2}
                  fill={isSelected ? "#4f46e5" : "#1f2937"}
                  stroke={lineColor}
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={element.y - extendOffset - bubbleSize / 2 + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={12}
                  fontWeight="bold"
                >
                  {line.id}
                </text>
              </>
            )}

            {/* Bottom bubble */}
            {grid.showBubbles !== false && (
              <>
                <circle
                  cx={x}
                  cy={element.y + element.height + extendOffset + bubbleSize / 2}
                  r={bubbleSize / 2}
                  fill={isSelected ? "#4f46e5" : "#1f2937"}
                  stroke={lineColor}
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={element.y + element.height + extendOffset + bubbleSize / 2 + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={12}
                  fontWeight="bold"
                >
                  {line.id}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Grid name label */}
      {element.name && (
        <text
          x={element.x + 5}
          y={element.y - 5}
          fill="#6366f1"
          fontSize={10}
          fontWeight="bold"
        >
          {element.name}
        </text>
      )}

      {/* Highlight animation */}
      {isHighlighted && (
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          fill="none"
          stroke="#818cf8"
          strokeWidth={3}
          className="animate-highlight-pulse"
        />
      )}
    </g>
  );
});
