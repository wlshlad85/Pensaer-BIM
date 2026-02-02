/**
 * Pensaer BIM Platform - Building Element Renderer
 *
 * Renders a building container as an SVG bounding box with level indicators.
 */

import { memo } from "react";
import type { Element, BuildingElement as BuildingElementType } from "../../../types";
import { useSelectionStore } from "../../../stores";
import clsx from "clsx";

interface BuildingElementProps {
  element: Element;
  onClick?: (e: React.MouseEvent, element: Element) => void;
  onMouseDown?: (e: React.MouseEvent, element: Element) => void;
  onContextMenu?: (e: React.MouseEvent, element: Element) => void;
  onMouseEnter?: (element: Element) => void;
  onMouseLeave?: () => void;
}

export const BuildingElement = memo(function BuildingElement({
  element,
  onClick,
  onMouseDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: BuildingElementProps) {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const hoveredId = useSelectionStore((s) => s.hoveredId);
  const highlightedIds = useSelectionStore((s) => s.highlightedIds);
  const isSelected = selectedIds.includes(element.id);
  const isHovered = hoveredId === element.id;
  const isHighlighted = highlightedIds.includes(element.id);

  const hasIssues = element.issues.length > 0;
  const hasErrors = element.issues.some((i) => i.type === "error");

  // Type guard for building element
  if (element.type !== "building") return null;
  const building = element as BuildingElementType;

  // Colors based on occupancy type
  const occupancyColors: Record<string, { fill: string; stroke: string }> = {
    residential: { fill: "#10b981", stroke: "#059669" },
    commercial: { fill: "#3b82f6", stroke: "#2563eb" },
    mixed: { fill: "#8b5cf6", stroke: "#7c3aed" },
    industrial: { fill: "#f59e0b", stroke: "#d97706" },
    institutional: { fill: "#ec4899", stroke: "#db2777" },
  };

  const colors = occupancyColors[building.occupancyType || "commercial"] || occupancyColors.commercial;

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
      {/* Building outline - dashed to show it's a container */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={isSelected ? `${colors.fill}20` : `${colors.fill}10`}
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
        strokeDasharray="10 5"
      />

      {/* Corner markers */}
      {[
        { x: element.x, y: element.y },
        { x: element.x + element.width, y: element.y },
        { x: element.x + element.width, y: element.y + element.height },
        { x: element.x, y: element.y + element.height },
      ].map((corner, i) => (
        <g key={i}>
          <line
            x1={corner.x - (i === 0 || i === 3 ? 0 : 15)}
            y1={corner.y}
            x2={corner.x + (i === 0 || i === 3 ? 15 : 0)}
            y2={corner.y}
            stroke={colors.stroke}
            strokeWidth={2}
          />
          <line
            x1={corner.x}
            y1={corner.y - (i === 0 || i === 1 ? 0 : 15)}
            x2={corner.x}
            y2={corner.y + (i === 0 || i === 1 ? 15 : 0)}
            stroke={colors.stroke}
            strokeWidth={2}
          />
        </g>
      ))}

      {/* Building icon */}
      <g transform={`translate(${element.x + 15}, ${element.y + 15})`}>
        <rect x={0} y={0} width={24} height={28} fill={colors.fill} rx={2} />
        {/* Windows grid */}
        {[0, 1, 2].map((row) =>
          [0, 1].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={3 + col * 10}
              y={3 + row * 8}
              width={6}
              height={5}
              fill="#ffffff"
              opacity={0.7}
            />
          ))
        )}
        {/* Door */}
        <rect x={8} y={20} width={8} height={8} fill="#ffffff" opacity={0.9} />
      </g>

      {/* Building info panel */}
      <g transform={`translate(${element.x + 45}, ${element.y + 10})`}>
        <rect
          x={0}
          y={0}
          width={120}
          height={50}
          fill="rgba(15, 23, 42, 0.9)"
          rx={4}
        />
        <text x={8} y={16} fill="#ffffff" fontSize={11} fontWeight="bold">
          {element.name || "Building"}
        </text>
        <text x={8} y={30} fill="#94a3b8" fontSize={9}>
          {building.levelCount || 0} levels • {building.occupancyType || "commercial"}
        </text>
        <text x={8} y={42} fill="#94a3b8" fontSize={9}>
          {building.grossFloorArea ? `${building.grossFloorArea.toLocaleString()} m² GFA` : ""}
        </text>
      </g>

      {/* Level count indicator (bottom right) */}
      <g transform={`translate(${element.x + element.width - 35}, ${element.y + element.height - 35})`}>
        <circle cx={15} cy={15} r={15} fill={colors.fill} />
        <text
          x={15}
          y={15}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          fontSize={12}
          fontWeight="bold"
        >
          {building.levelCount || "?"}
        </text>
        <text
          x={15}
          y={35}
          textAnchor="middle"
          fill={colors.fill}
          fontSize={8}
        >
          LEVELS
        </text>
      </g>

      {/* Structural system indicator */}
      {building.structuralSystem && (
        <text
          x={element.x + element.width - 10}
          y={element.y + 15}
          textAnchor="end"
          fill={colors.fill}
          fontSize={9}
          opacity={0.8}
        >
          {building.structuralSystem.toUpperCase()}
        </text>
      )}

      {/* Issue indicator */}
      {hasIssues && (
        <circle
          cx={element.x + element.width - 10}
          cy={element.y + 10}
          r={8}
          fill={hasErrors ? "#ef4444" : "#f59e0b"}
          stroke="#1e293b"
          strokeWidth={1}
        />
      )}

      {/* Selection handles */}
      {isSelected && (
        <>
          <rect
            x={element.x - 5}
            y={element.y - 5}
            width={10}
            height={10}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1}
            className="cursor-nw-resize"
          />
          <rect
            x={element.x + element.width - 5}
            y={element.y - 5}
            width={10}
            height={10}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1}
            className="cursor-ne-resize"
          />
          <rect
            x={element.x + element.width - 5}
            y={element.y + element.height - 5}
            width={10}
            height={10}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1}
            className="cursor-se-resize"
          />
          <rect
            x={element.x - 5}
            y={element.y + element.height - 5}
            width={10}
            height={10}
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
