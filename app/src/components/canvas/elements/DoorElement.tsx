/**
 * Pensaer BIM Platform - Door Element Renderer
 *
 * Renders a door with swing arc indicator.
 */

import { memo } from "react";
import type { Element } from "../../../types";
import { useSelectionStore } from "../../../stores";
import clsx from "clsx";

interface DoorElementProps {
  element: Element;
  onClick?: (e: React.MouseEvent, element: Element) => void;
  onMouseDown?: (e: React.MouseEvent, element: Element) => void;
  onContextMenu?: (e: React.MouseEvent, element: Element) => void;
  onMouseEnter?: (element: Element) => void;
  onMouseLeave?: () => void;
}

export const DoorElement = memo(function DoorElement({
  element,
  onClick,
  onMouseDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: DoorElementProps) {
  const isSelected = useSelectionStore((s) => s.isSelected(element.id));
  const isHovered = useSelectionStore((s) => s.isHovered(element.id));
  const isHighlighted = useSelectionStore((s) => s.isHighlighted(element.id));

  const hasIssues = element.issues.length > 0;
  const hasErrors = element.issues.some((i) => i.type === "error");

  // Calculate swing arc
  const swingRadius = Math.max(element.width, element.height) * 1.5;
  const isHorizontal = element.width > element.height;

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
      {/* Door opening (gap in wall) */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill="#1a1a2e"
        stroke="none"
      />

      {/* Door panel */}
      <rect
        x={element.x + 2}
        y={element.y + 2}
        width={element.width - 4}
        height={element.height - 4}
        fill={isSelected ? "#d97706" : "#fbbf24"}
        stroke={
          hasErrors
            ? "#ef4444"
            : hasIssues
              ? "#f59e0b"
              : isHovered
                ? "#60a5fa"
                : "#92400e"
        }
        strokeWidth={isSelected ? 2 : 1}
        rx={1}
      />

      {/* Swing arc */}
      {isHorizontal ? (
        <path
          d={`M ${element.x} ${element.y + element.height / 2}
              A ${swingRadius} ${swingRadius} 0 0 1
              ${element.x + swingRadius} ${element.y + element.height / 2 + swingRadius}`}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={1}
          strokeDasharray="4 2"
          opacity={0.5}
        />
      ) : (
        <path
          d={`M ${element.x + element.width / 2} ${element.y}
              A ${swingRadius} ${swingRadius} 0 0 1
              ${element.x + element.width / 2 + swingRadius} ${element.y + swingRadius}`}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={1}
          strokeDasharray="4 2"
          opacity={0.5}
        />
      )}

      {/* Issue indicator */}
      {hasIssues && (
        <circle
          cx={element.x + element.width / 2}
          cy={element.y - 8}
          r={5}
          fill={hasErrors ? "#ef4444" : "#f59e0b"}
          stroke="#1e293b"
          strokeWidth={1}
        />
      )}

      {/* Selection indicator */}
      {isSelected && (
        <rect
          x={element.x - 2}
          y={element.y - 2}
          width={element.width + 4}
          height={element.height + 4}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      )}
    </g>
  );
});
