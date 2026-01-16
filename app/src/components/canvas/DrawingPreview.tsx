/**
 * Pensaer BIM Platform - Drawing Preview
 *
 * Shows preview of element being drawn before placement.
 */

import { memo } from "react";
import type { ToolType } from "../../types";

interface DrawingPreviewProps {
  tool: ToolType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const DrawingPreview = memo(function DrawingPreview({
  tool,
  startX,
  startY,
  endX,
  endY,
}: DrawingPreviewProps) {
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);

  if (tool === "wall") {
    // Determine if wall is more horizontal or vertical
    const isHorizontal = width > height;
    const thickness = 12; // Default wall thickness in canvas units

    if (isHorizontal) {
      return (
        <rect
          x={Math.min(startX, endX)}
          y={Math.min(startY, endY) - thickness / 2}
          width={width}
          height={thickness}
          className="drawing-preview"
        />
      );
    } else {
      return (
        <rect
          x={Math.min(startX, endX) - thickness / 2}
          y={Math.min(startY, endY)}
          width={thickness}
          height={height}
          className="drawing-preview"
        />
      );
    }
  }

  if (tool === "room") {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(59, 130, 246, 0.2)"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="8 4"
      />
    );
  }

  // Default rectangle preview
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      className="drawing-preview"
    />
  );
});
