/**
 * Validation MCP Tool Mock Responses
 *
 * Mock data fixtures for validation and clash detection MCP tools.
 */

import type { MCPToolResult } from "../types";

/**
 * Mock detect_clashes tool response
 */
export function mockDetectClashes(args: Record<string, unknown>): MCPToolResult {
  const tolerance = (args.tolerance as number) || 0.001;
  const clearance = (args.clearance as number) || 0;
  const elementIds = args.element_ids as string[] | undefined;

  // Mock clash detection - simulate finding some clashes
  const mockClashes = [
    {
      id: crypto.randomUUID(),
      element_a_id: "wall-1",
      element_b_id: "wall-2",
      element_a_type: "wall",
      element_b_type: "wall",
      clash_type: "Hard",
      clash_point: [2.5, 0.1, 1.5],
      distance: 0,
      overlap_volume: 0.024,
    },
  ];

  // If clearance is set, add a clearance violation
  const clashes =
    clearance > 0
      ? [
          ...mockClashes,
          {
            id: crypto.randomUUID(),
            element_a_id: "wall-3",
            element_b_id: "door-1",
            element_a_type: "wall",
            element_b_type: "door",
            clash_type: "Clearance",
            clash_point: [5.0, 0.0, 1.0],
            distance: clearance * 0.6,
            overlap_volume: 0,
          },
        ]
      : mockClashes;

  return {
    success: true,
    data: {
      clashes,
      count: clashes.length,
      elements_checked: elementIds?.length || 11,
      tolerance,
      clearance,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock detect_clashes_between_sets tool response
 */
export function mockDetectClashesBetweenSets(
  args: Record<string, unknown>
): MCPToolResult {
  const setAIds = args.set_a_ids as string[];
  const setBIds = args.set_b_ids as string[];
  const tolerance = (args.tolerance as number) || 0.001;
  const clearance = (args.clearance as number) || 0;

  // Mock cross-set clash detection
  const mockClashes =
    setAIds.length > 0 && setBIds.length > 0
      ? [
          {
            id: crypto.randomUUID(),
            element_a_id: setAIds[0],
            element_b_id: setBIds[0],
            element_a_type: "wall",
            element_b_type: "door",
            clash_type: "Hard",
            clash_point: [1.0, 0.1, 1.0],
            distance: 0,
            overlap_volume: 0.018,
          },
        ]
      : [];

  return {
    success: true,
    data: {
      clashes: mockClashes,
      count: mockClashes.length,
      set_a_count: setAIds.length,
      set_b_count: setBIds.length,
      tolerance,
      clearance,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}
