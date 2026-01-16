/**
 * Pensaer BIM Platform - Canvas Grid
 *
 * Renders the background grid pattern for the 2D canvas.
 */

import { memo, type ReactElement } from "react";

interface GridProps {
  width: number;
  height: number;
  gridSize?: number;
  majorGridInterval?: number;
}

export const Grid = memo(function Grid({
  width,
  height,
  gridSize = 50,
  majorGridInterval = 5,
}: GridProps) {
  const minorLines: ReactElement[] = [];
  const majorLines: ReactElement[] = [];

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    const isMajor = (x / gridSize) % majorGridInterval === 0;
    const line = (
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={isMajor ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"}
        strokeWidth={isMajor ? 1 : 0.5}
      />
    );
    if (isMajor) {
      majorLines.push(line);
    } else {
      minorLines.push(line);
    }
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    const isMajor = (y / gridSize) % majorGridInterval === 0;
    const line = (
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={isMajor ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"}
        strokeWidth={isMajor ? 1 : 0.5}
      />
    );
    if (isMajor) {
      majorLines.push(line);
    } else {
      minorLines.push(line);
    }
  }

  return (
    <g className="grid-lines" style={{ pointerEvents: "none" }}>
      {minorLines}
      {majorLines}
    </g>
  );
});
