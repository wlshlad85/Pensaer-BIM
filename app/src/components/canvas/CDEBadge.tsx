/**
 * CDE State Badge — visual indicator for ISO 19650 workflow state.
 *
 * Renders a small colour-coded badge at the top-right of an element
 * showing its CDE state (WIP/Shared/Published/Archived).
 */

import { memo } from "react";
import type { Element } from "../../types";
import { CDE_STATE_COLOURS } from "../../types/cde";
import type { CDEState } from "../../types/cde";

interface CDEBadgeProps {
  element: Element;
}

export const CDEBadge = memo(function CDEBadge({ element }: CDEBadgeProps) {
  const state: CDEState = element.cdeState || "WIP";
  const colours = CDE_STATE_COLOURS[state];

  // Position badge at top-right of the element
  const badgeX = element.x + element.width - 2;
  const badgeY = element.y - 2;
  const badgeW = 24;
  const badgeH = 12;

  return (
    <g className="pointer-events-none cde-badge">
      {/* Badge background */}
      <rect
        x={badgeX - badgeW}
        y={badgeY}
        width={badgeW}
        height={badgeH}
        rx={3}
        ry={3}
        fill={colours.fill}
        stroke={colours.stroke}
        strokeWidth={1}
      />
      {/* Badge label */}
      <text
        x={badgeX - badgeW / 2}
        y={badgeY + badgeH / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={7}
        fontWeight={600}
        fontFamily="monospace"
        fill={colours.stroke}
      >
        {colours.label}
      </text>
      {/* Suitability code (if Shared) */}
      {state === "Shared" && element.suitabilityCode && element.suitabilityCode !== "S0" && (
        <text
          x={badgeX - badgeW - 3}
          y={badgeY + badgeH / 2 + 1}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={6}
          fontWeight={500}
          fontFamily="monospace"
          fill={colours.stroke}
        >
          {element.suitabilityCode}
        </text>
      )}
    </g>
  );
});
