/**
 * Pensaer BIM Platform - Curtain Wall Element Renderer
 *
 * Renders a curtain wall as an SVG rectangle with grid pattern.
 */

import { memo } from "react";
import type { Element } from "../../../types";
import { useSelectionStore } from "../../../stores";
import clsx from "clsx";

interface CurtainWallElementProps {
  element: Element;
  onClick?: (e: React.MouseEvent, element: Element) => void;
  onMouseDown?: (e: React.MouseEvent, element: Element) => void;
  onContextMenu?: (e: React.MouseEvent, element: Element) => void;
  onMouseEnter?: (element: Element) => void;
  onMouseLeave?: () => void;
}

export const CurtainWallElement = memo(function CurtainWallElement({
  element,
  onClick,
  onMouseDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: CurtainWallElementProps) {
  const isSelected = useSelectionStore((s) => s.isSelected(element.id));
  const isHovered = useSelectionStore((s) => s.isHovered(element.id));
  const isHighlighted = useSelectionStore((s) => s.isHighlighted(element.id));

  const hasIssues = element.issues.length > 0;
  const hasErrors = element.issues.some((i) => i.type === "error");

  // Get grid divisions for the pattern
  const uDivisions = element.uDivisions || 5;
  const vDivisions = element.vDivisions || 8;

  // Calculate grid line positions
  const horizontalLines = [];
  const verticalLines = [];

  for (let i = 1; i < uDivisions; i++) {
    const y = element.y + (element.height / uDivisions) * i;
    horizontalLines.push(y);
  }

  for (let i = 1; i < vDivisions; i++) {
    const x = element.x + (element.width / vDivisions) * i;
    verticalLines.push(x);
  }

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
      {/* Main curtain wall rectangle (glass fill) */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={isSelected ? "#38bdf8" : "#87ceeb"}
        fillOpacity={0.3}
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
      />

      {/* Horizontal grid lines (floor divisions) */}
      {horizontalLines.map((y, i) => (
        <line
          key={`h-${i}`}
          x1={element.x}
          y1={y}
          x2={element.x + element.width}
          y2={y}
          stroke="#708090"
          strokeWidth={1}
        />
      ))}

      {/* Vertical grid lines (panel divisions) */}
      {verticalLines.map((x, i) => (
        <line
          key={`v-${i}`}
          x1={x}
          y1={element.y}
          x2={x}
          y2={element.y + element.height}
          stroke="#708090"
          strokeWidth={1}
        />
      ))}

      {/* Border mullions (thicker frame) */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill="none"
        stroke="#475569"
        strokeWidth={isSelected ? 3 : 2}
      />

      {/* Curtain wall icon indicator */}
      <text
        x={element.x + 4}
        y={element.y + 12}
        fontSize={10}
        fill="#1e3a5f"
        fontFamily="monospace"
      >
        CW
      </text>

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
