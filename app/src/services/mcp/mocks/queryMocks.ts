/**
 * Query MCP Tool Mock Responses
 *
 * Mock data fixtures for query and state-related MCP tools.
 */

import type { MCPToolResult } from "../types";

/**
 * Mock list_elements tool response
 */
export function mockListElements(args: Record<string, unknown>): MCPToolResult {
  const category = args.category as string | undefined;

  // Mock element list
  const mockElements = [
    { id: "wall-1", type: "wall", created_at: new Date().toISOString() },
    { id: "wall-2", type: "wall", created_at: new Date().toISOString() },
    { id: "floor-1", type: "floor", created_at: new Date().toISOString() },
    { id: "room-1", type: "room", created_at: new Date().toISOString() },
  ];

  const filtered = category
    ? mockElements.filter((e) => e.type === category)
    : mockElements;

  return {
    success: true,
    data: {
      elements: filtered,
      count: filtered.length,
      total: mockElements.length,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock get_element tool response
 */
export function mockGetElement(args: Record<string, unknown>): MCPToolResult {
  const elementId = args.element_id as string;

  return {
    success: true,
    data: {
      id: elementId,
      type: "wall",
      length: 5.0,
      height: 3.0,
      thickness: 0.2,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock delete_element tool response
 */
export function mockDeleteElement(args: Record<string, unknown>): MCPToolResult {
  const elementIds = args.element_ids as string[];

  return {
    success: true,
    data: {
      deleted: elementIds,
      deleted_count: elementIds.length,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock modify_element tool response
 */
export function mockModifyElement(args: Record<string, unknown>): MCPToolResult {
  const elementId = args.element_id as string;
  const properties = args.properties as Record<string, unknown> | undefined;
  const geometry = args.geometry as Record<string, unknown> | undefined;

  const modifiedFields: string[] = [
    ...Object.keys(properties || {}),
    ...Object.keys(geometry || {}),
  ];

  return {
    success: true,
    data: {
      element_id: elementId,
      element_type: "wall",
      modified_fields: modifiedFields,
      previous_values: modifiedFields.reduce(
        (acc, field) => {
          acc[field] = "previous_value";
          return acc;
        },
        {} as Record<string, unknown>
      ),
      undo_data: {
        element_id: elementId,
        restore_properties: properties ? { ...properties } : undefined,
        restore_geometry: geometry ? { ...geometry } : undefined,
      },
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock get_state_summary tool response
 */
export function mockGetStateSummary(): MCPToolResult {
  return {
    success: true,
    data: {
      element_counts: {
        wall: 4,
        floor: 1,
        door: 2,
        window: 3,
        room: 1,
        roof: 0,
      },
      total_elements: 11,
      selected_count: 0,
      join_count: 4,
      group_count: 0,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}
