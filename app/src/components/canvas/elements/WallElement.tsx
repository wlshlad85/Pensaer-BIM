/**
 * Pensaer BIM Platform - Wall Element Renderer
 *
 * Renders a wall as an SVG rectangle with proper styling.
 */

import { memo } from "react";
import type { Element } from "../../../types";
import { useSelectionStore } from "../../../stores";
import clsx from "clsx";

interface WallElementProps {
  element: Element;
  onClick?: (e: React.MouseEvent, element: Element) => void;
  onMouseDown?: (e: React.MouseEvent, element: Element) => void;
  onContextMenu?: (e: React.MouseEvent, element: Element) => void;
  onMouseEnter?: (element: Element) => void;
  onMouseLeave?: () => void;
}

export const WallElement = memo(function WallElement({
  element,
  onClick,
  onMouseDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: WallElementProps) {
  const isSelected = useSelectionStore((s) => s.isSelected(element.id));
  const isHovered = useSelectionStore((s) => s.isHovered(element.id));
  const isHighlighted = useSelectionStore((s) => s.isHighlighted(element.id));

  const hasIssues = element.issues.length > 0;
  const hasErrors = element.issues.some((i) => i.type === "error");

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
      {/* Main wall rectangle */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={isSelected ? "#64748b" : "#94a3b8"}
        stroke={
          hasErrors
            ? "#ef4444"
            : hasIssues
              ? "#f59e0b"
              : isHovered
                ? "#60a5fa"
                : "#475569"
        }
        strokeWidth={isSelected ? 2 : 1}
        rx={1}
      />

      {/* Center line for structural walls */}
      {element.properties.structural && (
        <line
          x1={element.x + element.width / 2}
          y1={element.y + 2}
          x2={element.x + element.width / 2}
          y2={element.y + element.height - 2}
          stroke="#1e293b"
          strokeWidth={1}
          strokeDasharray="4 2"
          style={{
            display: element.height > element.width ? "block" : "none",
          }}
        />
      )}
      {element.properties.structural && element.width > element.height && (
        <line
          x1={element.x + 2}
          y1={element.y + element.height / 2}
          x2={element.x + element.width - 2}
          y2={element.y + element.height / 2}
          stroke="#1e293b"
          strokeWidth={1}
          strokeDasharray="4 2"
        />
      )}

      {/* Issue indicator */}
      {hasIssues && (
        <circle
          cx={element.x + element.width - 6}
          cy={element.y + 6}
          r={5}
          fill={hasErrors ? "#ef4444" : "#f59e0b"}
          stroke="#1e293b"
          strokeWidth={1}
        />
      )}

      {/* Selection handles */}
      {isSelected && (
        <>
          <rect
            x={element.x - 4}
            y={element.y - 4}
            width={8}
            height={8}
            fill="#3b82f6"
            stroke="#1e40af"
            strokeWidth={1}
            className="cursor-nw-resize"
          />
          <rect
            x={element.x + element.width - 4}
            y={element.y - 4}
            width={8}
            height={8}
            fill="#3b82f6"
            stroke="#1e40af"
            strokeWidth={1}
            className="cursor-ne-resize"
          />
          <rect
            x={element.x + element.width - 4}
            y={element.y + element.height - 4}
            width={8}
            height={8}
            fill="#3b82f6"
            stroke="#1e40af"
            strokeWidth={1}
            className="cursor-se-resize"
          />
          <rect
            x={element.x - 4}
            y={element.y + element.height - 4}
            width={8}
            height={8}
            fill="#3b82f6"
            stroke="#1e40af"
            strokeWidth={1}
            className="cursor-sw-resize"
          />
        </>
      )}
    </g>
  );
});
