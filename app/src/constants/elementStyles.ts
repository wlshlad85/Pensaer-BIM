/**
 * Element Style Constants
 *
 * Icon and color mappings for BIM element types.
 */

import type { ElementType } from "../types";

/**
 * Icon mapping for element types (FontAwesome classes)
 */
export const TYPE_ICONS: Record<string, string> = {
  wall: "fa-square",
  door: "fa-door-open",
  window: "fa-window-maximize",
  room: "fa-vector-square",
  roof: "fa-home",
  floor: "fa-layer-group",
  column: "fa-grip-lines-vertical",
  beam: "fa-minus",
  stair: "fa-stairs",
};

/**
 * Color mapping for element types (Tailwind classes)
 */
export const TYPE_COLORS: Record<string, string> = {
  wall: "bg-slate-500/30 text-slate-300",
  door: "bg-blue-500/30 text-blue-300",
  window: "bg-cyan-500/30 text-cyan-300",
  room: "bg-purple-500/30 text-purple-300",
  roof: "bg-orange-500/30 text-orange-300",
  floor: "bg-green-500/30 text-green-300",
  column: "bg-gray-500/30 text-gray-300",
  beam: "bg-amber-500/30 text-amber-300",
  stair: "bg-indigo-500/30 text-indigo-300",
};

/**
 * Get icon class for an element type
 */
export function getTypeIcon(type: ElementType | string): string {
  return TYPE_ICONS[type] || "fa-cube";
}

/**
 * Get color classes for an element type
 */
export function getTypeColor(type: ElementType | string): string {
  return TYPE_COLORS[type] || "bg-gray-500/30 text-gray-300";
}

/**
 * Issue severity styles
 */
export const SEVERITY_STYLES = {
  critical: {
    bg: "bg-red-900/30",
    text: "text-red-300",
    border: "border-red-800/50",
    icon: "fa-circle-xmark",
    iconColor: "text-red-400",
  },
  high: {
    bg: "bg-orange-900/30",
    text: "text-orange-300",
    border: "border-orange-800/50",
    icon: "fa-exclamation-triangle",
    iconColor: "text-orange-400",
  },
  warning: {
    bg: "bg-yellow-900/30",
    text: "text-yellow-300",
    border: "border-yellow-800/50",
    icon: "fa-exclamation-circle",
    iconColor: "text-yellow-400",
  },
  info: {
    bg: "bg-blue-900/30",
    text: "text-blue-300",
    border: "border-blue-800/50",
    icon: "fa-info-circle",
    iconColor: "text-blue-400",
  },
};

/**
 * Get severity styles based on type and severity level
 */
export function getSeverityStyles(
  severity: string | undefined,
  type: string
): typeof SEVERITY_STYLES.info {
  if (type === "error" && severity === "critical") {
    return SEVERITY_STYLES.critical;
  } else if (type === "error" || severity === "high") {
    return SEVERITY_STYLES.high;
  } else if (type === "warning") {
    return SEVERITY_STYLES.warning;
  }
  return SEVERITY_STYLES.info;
}
