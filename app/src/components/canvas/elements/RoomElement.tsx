/**
 * Pensaer BIM Platform - Room Element Renderer
 *
 * Renders a room as a semi-transparent fill with label.
 */

import { memo } from "react";
import type { Element } from "../../../types";
import { useSelectionStore } from "../../../stores";
import clsx from "clsx";

interface RoomElementProps {
  element: Element;
  onClick?: (e: React.MouseEvent, element: Element) => void;
  onMouseDown?: (e: React.MouseEvent, element: Element) => void;
  onContextMenu?: (e: React.MouseEvent, element: Element) => void;
  onMouseEnter?: (element: Element) => void;
  onMouseLeave?: () => void;
}

export const RoomElement = memo(function RoomElement({
  element,
  onClick,
  onMouseDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: RoomElementProps) {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const hoveredId = useSelectionStore((s) => s.hoveredId);
  const highlightedIds = useSelectionStore((s) => s.highlightedIds);
  const isSelected = selectedIds.includes(element.id);
  const isHovered = hoveredId === element.id;
  const isHighlighted = highlightedIds.includes(element.id);

  const area = (element.properties.area as string) || "";

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
      {/* Room fill */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={
          isSelected
            ? "rgba(59, 130, 246, 0.25)"
            : isHovered
              ? "rgba(59, 130, 246, 0.2)"
              : "rgba(59, 130, 246, 0.1)"
        }
        stroke={isSelected ? "#3b82f6" : "none"}
        strokeWidth={isSelected ? 1 : 0}
        strokeDasharray={isSelected ? "4 2" : "none"}
      />

      {/* Room label background */}
      <rect
        x={element.x + element.width / 2 - 50}
        y={element.y + element.height / 2 - 20}
        width={100}
        height={40}
        fill="rgba(15, 23, 42, 0.8)"
        rx={4}
        style={{ pointerEvents: "none" }}
      />

      {/* Room name */}
      <text
        x={element.x + element.width / 2}
        y={element.y + element.height / 2 - 4}
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize={12}
        fontWeight={500}
        style={{ pointerEvents: "none" }}
      >
        {element.name}
      </text>

      {/* Room area */}
      <text
        x={element.x + element.width / 2}
        y={element.y + element.height / 2 + 12}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={10}
        style={{ pointerEvents: "none" }}
      >
        {area}
      </text>

      {/* Highlight border */}
      {isHighlighted && (
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2}
          className="animate-highlight-pulse"
        />
      )}
    </g>
  );
});
