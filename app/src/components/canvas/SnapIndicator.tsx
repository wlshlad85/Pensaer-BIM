/**
 * Pensaer BIM Platform - Snap Indicator
 *
 * Visual feedback when snapping to grid or elements.
 */

import { memo } from 'react';
import type { SnapType } from '../../utils/snap';
import { getSnapIndicatorStyle } from '../../utils/snap';

interface SnapIndicatorProps {
  x: number;
  y: number;
  snapType: SnapType;
  visible: boolean;
}

export const SnapIndicator = memo(function SnapIndicator({
  x,
  y,
  snapType,
  visible,
}: SnapIndicatorProps) {
  if (!visible) return null;

  const style = getSnapIndicatorStyle(snapType);

  if (style.shape === 'circle') {
    return (
      <circle
        cx={x}
        cy={y}
        r={style.size}
        fill={style.color}
        stroke="#fff"
        strokeWidth={1}
        style={{ pointerEvents: 'none' }}
      />
    );
  }

  if (style.shape === 'square') {
    return (
      <rect
        x={x - style.size / 2}
        y={y - style.size / 2}
        width={style.size}
        height={style.size}
        fill={style.color}
        stroke="#fff"
        strokeWidth={1}
        style={{ pointerEvents: 'none' }}
      />
    );
  }

  if (style.shape === 'diamond') {
    const points = `
      ${x},${y - style.size}
      ${x + style.size},${y}
      ${x},${y + style.size}
      ${x - style.size},${y}
    `;
    return (
      <polygon
        points={points}
        fill={style.color}
        stroke="#fff"
        strokeWidth={1}
        style={{ pointerEvents: 'none' }}
      />
    );
  }

  return null;
});
