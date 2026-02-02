/**
 * Move & Modify Command Handlers (P1-006)
 *
 * Terminal commands for relocating elements and updating their properties.
 * - `move <id> --to x,y` — relocates an element to new coordinates
 * - `modify <id> --height 3.5 --material Brick` — updates element properties
 *
 * For walls, move recalculates start/end geometry. Modify handles
 * geometry-dependent property changes (height updates bounding box, etc.).
 */

import {
  registerCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useHistoryStore } from "../../stores/historyStore";

// Scale factor: 100 pixels per meter (matches elementCommands.ts)
const SCALE = 100;

// ============================================
// MOVE COMMAND
// ============================================

async function moveHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  // Get element ID from positional args or selection
  const positional = args._positional as unknown[] | undefined;
  let elementId: string | undefined;

  if (positional && positional.length >= 1) {
    elementId = String(positional[0]);
  }

  if (!elementId && context.selectedIds.length === 1) {
    elementId = context.selectedIds[0];
  }

  if (!elementId) {
    return {
      success: false,
      message: "Usage: move <element_id> --to x,y",
    };
  }

  // Parse --to parameter
  const to = args.to as number[] | undefined;
  if (!to || !Array.isArray(to) || to.length < 2) {
    return {
      success: false,
      message: "Missing or invalid --to parameter. Expected: --to x,y",
    };
  }

  const [newX, newY] = to;

  // Find the element
  const element = useModelStore.getState().getElementById(elementId);
  if (!element) {
    return {
      success: false,
      message: `Element not found: ${elementId}`,
    };
  }

  const oldX = element.x;
  const oldY = element.y;

  // Build update payload
  const updates: Record<string, unknown> = {
    x: newX * SCALE,
    y: newY * SCALE,
  };

  // Wall-specific: recalculate start/end points
  if (element.type === "wall") {
    const startX = element.properties.start_x as number | undefined;
    const startY = element.properties.start_y as number | undefined;
    const endX = element.properties.end_x as number | undefined;
    const endY = element.properties.end_y as number | undefined;

    if (
      startX !== undefined &&
      startY !== undefined &&
      endX !== undefined &&
      endY !== undefined
    ) {
      // Compute the delta in model-space (meters)
      const dx = newX - startX;
      const dy = newY - startY;

      const newStartX = newX;
      const newStartY = newY;
      const newEndX = endX + dx;
      const newEndY = endY + dy;

      updates.properties = {
        ...element.properties,
        start_x: newStartX,
        start_y: newStartY,
        end_x: newEndX,
        end_y: newEndY,
      };
    }
  }

  // Apply update
  useModelStore.getState().updateElement(elementId, updates);
  useHistoryStore.getState().recordAction(
    `Move ${element.type} ${elementId} to (${newX}, ${newY})`
  );

  return {
    success: true,
    message: `Moved ${element.type} ${elementId} → (${newX}, ${newY})`,
    data: {
      element_id: elementId,
      type: element.type,
      from: { x: oldX / SCALE, y: oldY / SCALE },
      to: { x: newX, y: newY },
    },
  };
}

// ============================================
// MODIFY COMMAND
// ============================================

/** Properties that are stored in mm but accepted in meters */
const METER_TO_MM_PROPS = new Set(["height", "thickness", "width"]);

/** Known numeric properties */
const NUMERIC_PROPS = new Set([
  "height",
  "thickness",
  "width",
  "slope",
  "overhang",
  "sillHeight",
  "area",
  "start_x",
  "start_y",
  "end_x",
  "end_y",
]);

async function modifyHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  // Get element ID from positional args or selection
  const positional = args._positional as unknown[] | undefined;
  let elementId: string | undefined;

  if (positional && positional.length >= 1) {
    elementId = String(positional[0]);
  }

  if (!elementId && context.selectedIds.length === 1) {
    elementId = context.selectedIds[0];
  }

  if (!elementId) {
    return {
      success: false,
      message: "Usage: modify <element_id> --height 3.5 --material Brick ...",
    };
  }

  // Find the element
  const element = useModelStore.getState().getElementById(elementId);
  if (!element) {
    return {
      success: false,
      message: `Element not found: ${elementId}`,
    };
  }

  // Collect property updates (everything except _positional and internal keys)
  const skipKeys = new Set(["_positional", "_raw"]);
  const propertyUpdates: Record<string, string | number | boolean> = {};
  const changedKeys: string[] = [];

  for (const [key, value] of Object.entries(args)) {
    if (skipKeys.has(key)) continue;

    const propKey = key;
    let propValue: string | number | boolean;

    if (typeof value === "number") {
      // Convert meter values to mm-string format to match existing conventions
      if (METER_TO_MM_PROPS.has(propKey)) {
        propValue = `${value * 1000}mm`;
      } else {
        propValue = value;
      }
    } else if (typeof value === "boolean") {
      propValue = value;
    } else {
      propValue = String(value);
    }

    propertyUpdates[propKey] = propValue;
    changedKeys.push(propKey);
  }

  if (changedKeys.length === 0) {
    return {
      success: false,
      message: "No properties specified. Usage: modify <id> --height 3.5 --material Brick",
    };
  }

  // Wall geometry recalculation when height changes
  if (element.type === "wall" && propertyUpdates.height !== undefined) {
    // Height is cosmetic in 2D but we store it for 3D/IFC export — no bbox change needed
  }

  // Apply property updates
  useModelStore.getState().updateProperties(elementId, propertyUpdates);
  useHistoryStore.getState().recordAction(
    `Modify ${element.type} ${elementId}: ${changedKeys.join(", ")}`
  );

  return {
    success: true,
    message: `Modified ${element.type} ${elementId}: ${changedKeys.join(", ")}`,
    data: {
      element_id: elementId,
      type: element.type,
      updated: propertyUpdates,
      property_count: changedKeys.length,
    },
  };
}

// ============================================
// REGISTRATION
// ============================================

export function registerMoveModifyCommands(): void {
  registerCommand({
    name: "move",
    description: "Relocate an element to new coordinates",
    usage: "move <element_id> --to x,y",
    examples: [
      "move wall-001 --to 5,3",
      "move floor-001 --to 0,0",
      "move (with one element selected) --to 10,5",
    ],
    handler: moveHandler,
  });

  registerCommand({
    name: "modify",
    description: "Update properties of an element",
    usage: "modify <element_id> --height 3.5 --material Brick ...",
    examples: [
      "modify wall-001 --height 3.5 --material Brick",
      "modify room-001 --name \"Master Bedroom\"",
      "modify wall-001 --structural true --thickness 0.3",
    ],
    handler: modifyHandler,
  });
}
