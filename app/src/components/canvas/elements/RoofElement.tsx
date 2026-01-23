/**
 * Pensaer BIM Platform - Roof Element Renderer
 *
 * Renders a roof as an SVG polygon with ridge/hip lines.
 * Supports flat, gable, and hip roof types in 2D plan view.
 * Dashed lines indicate elements above the cut plane.
 */

import { memo, useMemo } from "react";
import type { Element } from "../../../types";
import { useSelectionStore } from "../../../stores";
import clsx from "clsx";

interface RoofElementProps {
  element: Element;
  onClick?: (e: React.MouseEvent, element: Element) => void;
  onMouseDown?: (e: React.MouseEvent, element: Element) => void;
  onContextMenu?: (e: React.MouseEvent, element: Element) => void;
  onMouseEnter?: (element: Element) => void;
  onMouseLeave?: () => void;
}

type RoofType = "flat" | "gable" | "hip";

/**
 * Calculate ridge line for gable roof
 */
function calculateRidgeLine(
  x: number,
  y: number,
  width: number,
  height: number,
  orientation: "horizontal" | "vertical" = "horizontal"
): { x1: number; y1: number; x2: number; y2: number } {
  if (orientation === "horizontal") {
    // Ridge runs horizontally (parallel to width)
    return {
      x1: x,
      y1: y + height / 2,
      x2: x + width,
      y2: y + height / 2,
    };
  }
  // Ridge runs vertically (parallel to height)
  return {
    x1: x + width / 2,
    y1: y,
    x2: x + width / 2,
    y2: y + height,
  };
}

/**
 * Calculate hip lines from corners to ridge
 */
function calculateHipLines(
  x: number,
  y: number,
  width: number,
  height: number
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return [
    // Corner to center lines
    { x1: x, y1: y, x2: centerX, y2: centerY },
    { x1: x + width, y1: y, x2: centerX, y2: centerY },
    { x1: x + width, y1: y + height, x2: centerX, y2: centerY },
    { x1: x, y1: y + height, x2: centerX, y2: centerY },
  ];
}

export const RoofElement = memo(function RoofElement({
  element,
  onClick,
  onMouseDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: RoofElementProps) {
  const isSelected = useSelectionStore((s) => s.isSelected(element.id));
  const isHovered = useSelectionStore((s) => s.isHovered(element.id));
  const isHighlighted = useSelectionStore((s) => s.isHighlighted(element.id));

  const roofType = (element.properties.roofType as RoofType) || "flat";
  const orientation =
    (element.properties.orientation as "horizontal" | "vertical") ||
    (element.width > element.height ? "horizontal" : "vertical");

  // Calculate roof structure lines
  const ridgeLine = useMemo(() => {
    if (roofType === "gable") {
      return calculateRidgeLine(
        element.x,
        element.y,
        element.width,
        element.height,
        orientation
      );
    }
    return null;
  }, [element.x, element.y, element.width, element.height, roofType, orientation]);

  const hipLines = useMemo(() => {
    if (roofType === "hip") {
      return calculateHipLines(
        element.x,
        element.y,
        element.width,
        element.height
      );
    }
    return [];
  }, [element.x, element.y, element.width, element.height, roofType]);

  const strokeColor = isHighlighted
    ? "#22c55e"
    : isSelected
      ? "#f97316"
      : isHovered
        ? "#fb923c"
        : "#9ca3af";

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
      {/* Roof outline - dashed to indicate above cut plane */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={
          isSelected
            ? "rgba(249, 115, 22, 0.1)"
            : isHovered
              ? "rgba(249, 115, 22, 0.05)"
              : "none"
        }
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1}
        strokeDasharray="8 4"
      />

      {/* Gable roof ridge line */}
      {ridgeLine && (
        <line
          x1={ridgeLine.x1}
          y1={ridgeLine.y1}
          x2={ridgeLine.x2}
          y2={ridgeLine.y2}
          stroke={strokeColor}
          strokeWidth={isSelected ? 2 : 1}
          strokeDasharray="4 2"
        />
      )}

      {/* Hip roof lines from corners */}
      {hipLines.map((line, index) => (
        <line
          key={index}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={strokeColor}
          strokeWidth={1}
          strokeDasharray="4 2"
        />
      ))}

      {/* Hip roof center point */}
      {roofType === "hip" && (
        <circle
          cx={element.x + element.width / 2}
          cy={element.y + element.height / 2}
          r={3}
          fill={strokeColor}
        />
      )}

      {/* Roof type indicator icon */}
      <text
        x={element.x + 8}
        y={element.y + 14}
        fill={strokeColor}
        fontSize={10}
        style={{ pointerEvents: "none" }}
      >
        {roofType === "flat" ? "F" : roofType === "gable" ? "G" : "H"}
      </text>

      {/* Roof label */}
      {element.name && (
        <>
          <rect
            x={element.x + element.width / 2 - 35}
            y={element.y + element.height / 2 - 10}
            width={70}
            height={20}
            fill="rgba(15, 23, 42, 0.8)"
            rx={3}
            style={{ pointerEvents: "none" }}
          />
          <text
            x={element.x + element.width / 2}
            y={element.y + element.height / 2 + 4}
            textAnchor="middle"
            fill="#fb923c"
            fontSize={10}
            style={{ pointerEvents: "none" }}
          >
            {element.name}
          </text>
        </>
      )}

      {/* Slope direction arrows for gable roof */}
      {roofType === "gable" && (
        <>
          {orientation === "horizontal" ? (
            <>
              {/* Up arrow above ridge */}
              <path
                d={`M ${element.x + element.width / 2} ${element.y + element.height / 4}
                    l -5 8 l 10 0 Z`}
                fill={strokeColor}
                opacity={0.6}
              />
              {/* Down arrow below ridge */}
              <path
                d={`M ${element.x + element.width / 2} ${element.y + (3 * element.height) / 4}
                    l -5 -8 l 10 0 Z`}
                fill={strokeColor}
                opacity={0.6}
              />
            </>
          ) : (
            <>
              {/* Left arrow */}
              <path
                d={`M ${element.x + element.width / 4} ${element.y + element.height / 2}
                    l 8 -5 l 0 10 Z`}
                fill={strokeColor}
                opacity={0.6}
              />
              {/* Right arrow */}
              <path
                d={`M ${element.x + (3 * element.width) / 4} ${element.y + element.height / 2}
                    l -8 -5 l 0 10 Z`}
                fill={strokeColor}
                opacity={0.6}
              />
            </>
          )}
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
            fill="#f97316"
            stroke="#c2410c"
            strokeWidth={1}
            className="cursor-nw-resize"
          />
          <rect
            x={element.x + element.width - 4}
            y={element.y - 4}
            width={8}
            height={8}
            fill="#f97316"
            stroke="#c2410c"
            strokeWidth={1}
            className="cursor-ne-resize"
          />
          <rect
            x={element.x + element.width - 4}
            y={element.y + element.height - 4}
            width={8}
            height={8}
            fill="#f97316"
            stroke="#c2410c"
            strokeWidth={1}
            className="cursor-se-resize"
          />
          <rect
            x={element.x - 4}
            y={element.y + element.height - 4}
            width={8}
            height={8}
            fill="#f97316"
            stroke="#c2410c"
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
