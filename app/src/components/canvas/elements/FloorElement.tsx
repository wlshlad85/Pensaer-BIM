/**
 * Pensaer BIM Platform - Floor Element Renderer
 *
 * Renders a floor slab as an SVG polygon with hatching pattern.
 * Shows edge lines and selection highlights in 2D plan view.
 */

import { memo } from "react";
import type { Element } from "../../../types";
import { useSelectionStore } from "../../../stores";
import clsx from "clsx";

interface FloorElementProps {
  element: Element;
  onClick?: (e: React.MouseEvent, element: Element) => void;
  onMouseDown?: (e: React.MouseEvent, element: Element) => void;
  onContextMenu?: (e: React.MouseEvent, element: Element) => void;
  onMouseEnter?: (element: Element) => void;
  onMouseLeave?: () => void;
}

export const FloorElement = memo(function FloorElement({
  element,
  onClick,
  onMouseDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: FloorElementProps) {
  const isSelected = useSelectionStore((s) => s.isSelected(element.id));
  const isHovered = useSelectionStore((s) => s.isHovered(element.id));
  const isHighlighted = useSelectionStore((s) => s.isHighlighted(element.id));

  // Pattern ID unique to this floor
  const patternId = `floor-hatch-${element.id}`;

  return (
    <g
      className={clsx(
        "model-element",
        isSelected && "selected",
        isHighlighted && "highlighted",
      )}
      onClick={(e) => onClick?.(e, element)}
      onMouseDown={(e) => onMouseDown?.(e, element)}
      onContextMenu={(e) => onContextMenu?.(e, element)}
      onMouseEnter={() => onMouseEnter?.(element)}
      onMouseLeave={() => onMouseLeave?.()}
      style={{ pointerEvents: "all", cursor: "pointer" }}
    >
      {/* Hatching pattern definition */}
      <defs>
        <pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke={isSelected ? "#10b981" : "#4b5563"}
            strokeWidth="1"
            strokeOpacity={0.3}
          />
        </pattern>
      </defs>

      {/* Floor fill with hatching */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={`url(#${patternId})`}
      />

      {/* Floor outline */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill="none"
        stroke={
          isHighlighted
            ? "#22c55e"
            : isSelected
              ? "#10b981"
              : isHovered
                ? "#34d399"
                : "#6b7280"
        }
        strokeWidth={isSelected ? 2 : 1}
      />

      {/* Thickness indicator (diagonal corners) */}
      <line
        x1={element.x}
        y1={element.y}
        x2={element.x + 10}
        y2={element.y + 10}
        stroke={isSelected ? "#10b981" : "#6b7280"}
        strokeWidth={1}
      />
      <line
        x1={element.x + element.width}
        y1={element.y + element.height}
        x2={element.x + element.width - 10}
        y2={element.y + element.height - 10}
        stroke={isSelected ? "#10b981" : "#6b7280"}
        strokeWidth={1}
      />

      {/* Floor label */}
      {element.name && (
        <>
          <rect
            x={element.x + element.width / 2 - 30}
            y={element.y + element.height / 2 - 10}
            width={60}
            height={20}
            fill="rgba(15, 23, 42, 0.8)"
            rx={3}
            style={{ pointerEvents: "none" }}
          />
          <text
            x={element.x + element.width / 2}
            y={element.y + element.height / 2 + 4}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={10}
            style={{ pointerEvents: "none" }}
          >
            {element.name}
          </text>
        </>
      )}

      {/* Selection handles */}
      {isSelected && (
        <>
          <rect
            x={element.x - 4}
            y={element.y - 4}
            width={8}
            height={8}
            fill="#10b981"
            stroke="#065f46"
            strokeWidth={1}
            className="cursor-nw-resize"
          />
          <rect
            x={element.x + element.width - 4}
            y={element.y - 4}
            width={8}
            height={8}
            fill="#10b981"
            stroke="#065f46"
            strokeWidth={1}
            className="cursor-ne-resize"
          />
          <rect
            x={element.x + element.width - 4}
            y={element.y + element.height - 4}
            width={8}
            height={8}
            fill="#10b981"
            stroke="#065f46"
            strokeWidth={1}
            className="cursor-se-resize"
          />
          <rect
            x={element.x - 4}
            y={element.y + element.height - 4}
            width={8}
            height={8}
            fill="#10b981"
            stroke="#065f46"
            strokeWidth={1}
            className="cursor-sw-resize"
          />
        </>
      )}

      {/* Highlight animation */}
      {isHighlighted && (
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          fill="none"
          stroke="#22c55e"
          strokeWidth={3}
          className="animate-highlight-pulse"
        />
      )}
    </g>
  );
});
