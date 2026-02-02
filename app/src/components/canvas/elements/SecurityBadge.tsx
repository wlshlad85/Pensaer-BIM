/**
 * Security Classification Badge for Canvas2D
 *
 * Renders a lock icon overlay on elements with elevated security classification
 * per ISO 19650-5.
 */

import { memo } from "react";
import type { Element } from "../../../types";
import { isElevatedSecurity, getSecurityLabel } from "../../../types/elements";

interface SecurityBadgeProps {
  element: Element;
}

const BADGE_COLORS: Record<string, { bg: string; stroke: string; text: string }> = {
  OfficialSensitive: { bg: "#f59e0b", stroke: "#d97706", text: "#000" },
  Secret: { bg: "#ef4444", stroke: "#dc2626", text: "#fff" },
  TopSecret: { bg: "#7c3aed", stroke: "#6d28d9", text: "#fff" },
};

export const SecurityBadge = memo(function SecurityBadge({ element }: SecurityBadgeProps) {
  const cls = element.securityClassification;
  if (!cls || !isElevatedSecurity(cls)) return null;

  const colors = BADGE_COLORS[cls] ?? BADGE_COLORS.OfficialSensitive;
  const bx = element.x + element.width - 8;
  const by = element.y - 4;

  return (
    <g>
      {/* Badge circle */}
      <circle
        cx={bx}
        cy={by}
        r={9}
        fill={colors.bg}
        stroke={colors.stroke}
        strokeWidth={1.5}
      />
      {/* Lock icon (simplified SVG path) */}
      <g transform={`translate(${bx - 5}, ${by - 6})`}>
        {/* Lock body */}
        <rect x={1.5} y={5} width={7} height={6} rx={1} fill={colors.text} opacity={0.9} />
        {/* Lock shackle */}
        <path
          d="M3 5 V3.5 C3 1.5 7 1.5 7 3.5 V5"
          fill="none"
          stroke={colors.text}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.9}
        />
      </g>
      {/* Tooltip on hover via SVG title */}
      <title>{`Security: ${getSecurityLabel(cls)}`}</title>
    </g>
  );
});
