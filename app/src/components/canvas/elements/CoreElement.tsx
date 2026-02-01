/**
 * Pensaer BIM Platform - Core Element Renderer
 *
 * Renders a vertical core (elevator/stair) as an SVG rectangle with icon indicators.
 */

import { memo } from "react";
import type { Element, CoreElement as CoreElementType } from "../../../types";
import { useSelectionStore } from "../../../stores";
import clsx from "clsx";

interface CoreElementProps {
  element: Element;
  onClick?: (e: React.MouseEvent, element: Element) => void;
  onMouseDown?: (e: React.MouseEvent, element: Element) => void;
  onContextMenu?: (e: React.MouseEvent, element: Element) => void;
  onMouseEnter?: (element: Element) => void;
  onMouseLeave?: () => void;
}

export const CoreElement = memo(function CoreElement({
  element,
  onClick,
  onMouseDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: CoreElementProps) {
  const isSelected = useSelectionStore((s) => s.isSelected(element.id));
  const isHovered = useSelectionStore((s) => s.isHovered(element.id));
  const isHighlighted = useSelectionStore((s) => s.isHighlighted(element.id));

  const hasIssues = element.issues.length > 0;
  const hasErrors = element.issues.some((i) => i.type === "error");

  // Type guard for core element
  if (element.type !== "core") return null;
  const core = element as CoreElementType;

  // Wall thickness for core walls (default 200mm = 20px at 0.1 scale)
  const wallThickness = (core.wallThickness || 200) * 0.1;

  // Colors based on core type
  const coreColors = {
    elevator: { fill: "#a855f7", stroke: "#7c3aed" },
    stair: { fill: "#10b981", stroke: "#059669" },
    service: { fill: "#f59e0b", stroke: "#d97706" },
    combined: { fill: "#3b82f6", stroke: "#2563eb" },
  };

  const colors = coreColors[core.coreType] || coreColors.combined;

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
      {/* Outer core boundary */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={isSelected ? colors.fill : `${colors.fill}80`}
        stroke={
          hasErrors
            ? "#ef4444"
            : hasIssues
              ? "#f59e0b"
              : isHovered
                ? "#60a5fa"
                : colors.stroke
        }
        strokeWidth={isSelected ? 3 : 2}
      />

      {/* Inner void (the shaft) */}
      <rect
        x={element.x + wallThickness}
        y={element.y + wallThickness}
        width={Math.max(element.width - wallThickness * 2, 0)}
        height={Math.max(element.height - wallThickness * 2, 0)}
        fill="#1f2937"
        stroke={colors.stroke}
        strokeWidth={1}
        opacity={0.5}
      />

      {/* Core type indicator icon */}
      <g transform={`translate(${element.x + element.width / 2}, ${element.y + element.height / 2})`}>
        {core.coreType === "elevator" && (
          <>
            {/* Elevator icon - arrows up/down */}
            <rect x={-10} y={-15} width={20} height={30} fill="none" stroke="#ffffff" strokeWidth={1.5} />
            <path d="M-5 -8 L0 -12 L5 -8" fill="none" stroke="#ffffff" strokeWidth={1.5} />
            <path d="M-5 8 L0 12 L5 8" fill="none" stroke="#ffffff" strokeWidth={1.5} />
          </>
        )}
        {core.coreType === "stair" && (
          <>
            {/* Stair icon - steps */}
            <path
              d="M-12 10 L-12 4 L-4 4 L-4 -2 L4 -2 L4 -8 L12 -8 L12 -14"
              fill="none"
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </>
        )}
        {core.coreType === "service" && (
          <>
            {/* Service icon - wrench/pipe */}
            <circle cx={0} cy={0} r={8} fill="none" stroke="#ffffff" strokeWidth={1.5} />
            <line x1={-5} y1={-5} x2={5} y2={5} stroke="#ffffff" strokeWidth={1.5} />
            <line x1={-5} y1={5} x2={5} y2={-5} stroke="#ffffff" strokeWidth={1.5} />
          </>
        )}
        {core.coreType === "combined" && (
          <>
            {/* Combined icon - elevator + stair */}
            <line x1={0} y1={-12} x2={0} y2={12} stroke="#ffffff" strokeWidth={1} opacity={0.5} />
            {/* Left: elevator arrows */}
            <path d="M-8 -5 L-5 -8 L-2 -5" fill="none" stroke="#ffffff" strokeWidth={1.5} />
            <path d="M-8 5 L-5 8 L-2 5" fill="none" stroke="#ffffff" strokeWidth={1.5} />
            {/* Right: stair steps */}
            <path d="M2 6 L2 2 L6 2 L6 -2 L10 -2 L10 -6" fill="none" stroke="#ffffff" strokeWidth={1.5} />
          </>
        )}
      </g>

      {/* Core info (elevator/stair counts) */}
      {(core.elevatorCount || core.stairCount) && (
        <g>
          {core.elevatorCount && (
            <text
              x={element.x + 5}
              y={element.y + element.height - 5}
              fill="#ffffff"
              fontSize={9}
              opacity={0.8}
            >
              {core.elevatorCount}E
            </text>
          )}
          {core.stairCount && (
            <text
              x={element.x + element.width - 20}
              y={element.y + element.height - 5}
              fill="#ffffff"
              fontSize={9}
              opacity={0.8}
            >
              {core.stairCount}S
            </text>
          )}
        </g>
      )}

      {/* Core name label */}
      {element.name && (
        <text
          x={element.x + element.width / 2}
          y={element.y - 5}
          textAnchor="middle"
          fill={colors.fill}
          fontSize={10}
          fontWeight="bold"
        >
          {element.name}
        </text>
      )}

      {/* Issue indicator */}
      {hasIssues && (
        <circle
          cx={element.x + element.width - 8}
          cy={element.y + 8}
          r={6}
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
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1}
            className="cursor-nw-resize"
          />
          <rect
            x={element.x + element.width - 4}
            y={element.y - 4}
            width={8}
            height={8}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1}
            className="cursor-ne-resize"
          />
          <rect
            x={element.x + element.width - 4}
            y={element.y + element.height - 4}
            width={8}
            height={8}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1}
            className="cursor-se-resize"
          />
          <rect
            x={element.x - 4}
            y={element.y + element.height - 4}
            width={8}
            height={8}
            fill={colors.fill}
            stroke={colors.stroke}
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
          stroke={colors.fill}
          strokeWidth={4}
          className="animate-highlight-pulse"
        />
      )}
    </g>
  );
});
