/**
 * Spatial MCP Tool Mock Responses
 *
 * Mock data fixtures for spatial analysis MCP tools.
 */

import type { MCPToolResult } from "../types";

/**
 * Mock detect_rooms tool response
 */
export function mockDetectRooms(_args: Record<string, unknown>): MCPToolResult {
  return {
    success: true,
    data: {
      rooms: [
        {
          id: crypto.randomUUID(),
          area: 25.0,
          centroid: [2.5, 2.5],
          node_count: 4,
          edge_count: 4,
        },
      ],
      room_count: 1,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock compute_adjacency tool response
 */
export function mockComputeAdjacency(args: Record<string, unknown>): MCPToolResult {
  const rooms = (args.rooms as Array<{ id: string }>) || [];

  // Build mock adjacency (first room adjacent to second if exists)
  const adjacency = rooms.map((room, index) => ({
    room_id: room.id,
    adjacent_rooms: index < rooms.length - 1 ? [rooms[index + 1].id] : [],
    adjacent_count: index < rooms.length - 1 ? 1 : 0,
  }));

  return {
    success: true,
    data: {
      adjacency,
      room_count: rooms.length,
      total_adjacencies: Math.max(0, rooms.length - 1),
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock find_nearest tool response
 */
export function mockFindNearest(args: Record<string, unknown>): MCPToolResult {
  const x = (args.x as number) || 0;
  const y = (args.y as number) || 0;
  const radius = (args.radius as number) || 5;
  const limit = (args.limit as number) || 10;

  return {
    success: true,
    data: {
      results: [
        {
          element_id: "wall-1",
          element_type: "wall",
          distance: 0.5,
          element: { id: "wall-1", type: "wall" },
        },
      ],
      count: 1,
      search_point: [x, y],
      search_radius: radius,
      limit,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock compute_area tool response
 */
export function mockComputeArea(args: Record<string, unknown>): MCPToolResult {
  const polygon = (args.polygon as number[][]) || [];
  const holes = (args.include_holes as number[][][]) || [];

  // Simple area calculation for mock
  const grossArea = polygon.length >= 3 ? 25.0 : 0;
  const holeArea = holes.length * 2.0;

  return {
    success: true,
    data: {
      gross_area: grossArea,
      hole_area: holeArea,
      net_area: grossArea - holeArea,
      centroid: [2.5, 2.5],
      vertex_count: polygon.length,
      hole_count: holes.length,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock check_clearance tool response
 */
export function mockCheckClearance(args: Record<string, unknown>): MCPToolResult {
  const clearanceType = (args.clearance_type as string) || "furniture";
  const element = args.element as { id?: string } | undefined;
  const obstacles = (args.obstacles as Array<{ id?: string }>) || [];

  // Simulate one violation if there are obstacles
  const violations =
    obstacles.length > 0
      ? [
          {
            obstacle_id: obstacles[0]?.id || "unknown",
            obstacle_type: "furniture",
            distance: 0.4,
            required: 0.6,
            shortage: 0.2,
          },
        ]
      : [];

  return {
    success: true,
    data: {
      passed: violations.length === 0,
      clearance_type: clearanceType,
      clearance_spec: "Furniture clearance",
      required_clearance: 0.6,
      violations,
      violation_count: violations.length,
      element_id: element?.id || "unknown",
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock analyze_circulation tool response
 */
export function mockAnalyzeCirculation(args: Record<string, unknown>): MCPToolResult {
  const rooms = (args.rooms as Array<{ id: string }>) || [];
  const doors = (args.doors as unknown[]) || [];
  const startRoomId = args.start_room_id as string | undefined;
  const endRoomId = args.end_room_id as string | undefined;

  // Build mock graph
  const graph: Record<string, string[]> = {};
  rooms.forEach((room, index) => {
    graph[room.id] = index < rooms.length - 1 ? [rooms[index + 1].id] : [];
  });

  const result: Record<string, unknown> = {
    graph,
    room_count: rooms.length,
    door_count: doors.length,
    connected_rooms: rooms.length,
    dead_end_rooms: rooms.length > 0 ? [rooms[rooms.length - 1].id] : [],
    isolated_rooms: [],
  };

  // Add path if start/end specified
  if (startRoomId && endRoomId) {
    result.path = [startRoomId, endRoomId];
    result.path_length = 1;
    result.path_exists = true;
  }

  return {
    success: true,
    data: result,
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock point_in_polygon tool response
 */
export function mockPointInPolygon(args: Record<string, unknown>): MCPToolResult {
  const point = (args.point as number[]) || [0, 0];
  const polygon = (args.polygon as number[][]) || [];

  // Simple mock: point is inside if polygon has vertices
  const inside = polygon.length >= 3;

  return {
    success: true,
    data: {
      inside,
      point,
      vertex_count: polygon.length,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock analyze_wall_topology tool response
 */
export function mockAnalyzeTopology(_args: Record<string, unknown>): MCPToolResult {
  return {
    success: true,
    data: {
      node_count: 6,
      edge_count: 5,
      room_count: 2,
      interior_room_count: 1,
      is_connected: true,
      rooms: [
        {
          id: crypto.randomUUID(),
          area: 25.0,
          is_exterior: false,
        },
        {
          id: crypto.randomUUID(),
          area: 100.0,
          is_exterior: true,
        },
      ],
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}
