/**
 * Pensaer BIM Platform - Selection Box
 *
 * Renders the box selection rectangle when dragging to select multiple elements.
 */

import { memo } from 'react';

interface SelectionBoxProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const SelectionBox = memo(function SelectionBox({
  startX,
  startY,
  endX,
  endY,
}: SelectionBoxProps) {
  // Calculate normalized bounds (handle negative drag directions)
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  if (width < 2 && height < 2) return null;

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(59, 130, 246, 0.1)"
      stroke="#3b82f6"
      strokeWidth={1}
      strokeDasharray="4 2"
      style={{ pointerEvents: 'none' }}
    />
  );
});
