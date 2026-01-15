/**
 * Pensaer BIM Platform - Window Element Renderer
 *
 * Renders a window with glazing pattern.
 */

import { memo } from 'react';
import type { Element } from '../../../types';
import { useSelectionStore } from '../../../stores';
import clsx from 'clsx';

interface WindowElementProps {
  element: Element;
  onClick?: (e: React.MouseEvent, element: Element) => void;
  onMouseDown?: (e: React.MouseEvent, element: Element) => void;
  onContextMenu?: (e: React.MouseEvent, element: Element) => void;
  onMouseEnter?: (element: Element) => void;
  onMouseLeave?: () => void;
}

export const WindowElement = memo(function WindowElement({
  element,
  onClick,
  onMouseDown,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: WindowElementProps) {
  const isSelected = useSelectionStore((s) => s.isSelected(element.id));
  const isHovered = useSelectionStore((s) => s.isHovered(element.id));
  const isHighlighted = useSelectionStore((s) => s.isHighlighted(element.id));

  const hasIssues = element.issues.length > 0;

  return (
    <g
      className={clsx(
        'model-element',
        isSelected && 'selected',
        isHighlighted && 'highlighted'
      )}
      style={{ cursor: 'move' }}
      onClick={(e) => onClick?.(e, element)}
      onMouseDown={(e) => onMouseDown?.(e, element)}
      onContextMenu={(e) => onContextMenu?.(e, element)}
      onMouseEnter={() => onMouseEnter?.(element)}
      onMouseLeave={() => onMouseLeave?.()}
    >
      {/* Window opening */}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill="#1a1a2e"
        stroke="none"
      />

      {/* Window frame */}
      <rect
        x={element.x + 1}
        y={element.y + 1}
        width={element.width - 2}
        height={element.height - 2}
        fill="none"
        stroke={isHovered ? '#60a5fa' : '#0ea5e9'}
        strokeWidth={2}
      />

      {/* Glazing (glass) */}
      <rect
        x={element.x + 3}
        y={element.y + 3}
        width={element.width - 6}
        height={element.height - 6}
        fill={isSelected ? 'rgba(56, 189, 248, 0.4)' : 'rgba(56, 189, 248, 0.2)'}
        stroke="none"
      />

      {/* Center mullion (divider) */}
      <line
        x1={element.x + element.width / 2}
        y1={element.y + 2}
        x2={element.x + element.width / 2}
        y2={element.y + element.height - 2}
        stroke="#0ea5e9"
        strokeWidth={1}
      />

      {/* Issue indicator */}
      {hasIssues && (
        <circle
          cx={element.x + element.width / 2}
          cy={element.y - 8}
          r={5}
          fill="#f59e0b"
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
