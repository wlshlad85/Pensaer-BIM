/**
 * Geometry MCP Tool Mock Responses
 *
 * Mock data fixtures for geometry-related MCP tools.
 */

import type { MCPToolResult } from "../types";

/**
 * Mock create_wall tool response
 */
export function mockCreateWall(args: Record<string, unknown>): MCPToolResult {
  const start = (args.start as number[]) || [0, 0];
  const end = (args.end as number[]) || [5, 0];
  const height = (args.height as number) || 3.0;
  const thickness = (args.thickness as number) || 0.2;

  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
  );

  return {
    success: true,
    data: {
      wall_id: crypto.randomUUID(),
      length: Math.round(length * 1000) / 1000,
      height,
      thickness,
      wall_type: args.wall_type || "basic",
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock create_floor tool response
 */
export function mockCreateFloor(args: Record<string, unknown>): MCPToolResult {
  const minPoint = (args.min_point as number[]) || [0, 0];
  const maxPoint = (args.max_point as number[]) || [10, 10];
  const thickness = (args.thickness as number) || 0.3;

  const area = Math.abs(
    (maxPoint[0] - minPoint[0]) * (maxPoint[1] - minPoint[1])
  );

  return {
    success: true,
    data: {
      floor_id: crypto.randomUUID(),
      area: Math.round(area * 1000) / 1000,
      thickness,
      floor_type: args.floor_type || "slab",
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock create_room tool response
 */
export function mockCreateRoom(args: Record<string, unknown>): MCPToolResult {
  const minPoint = (args.min_point as number[]) || [0, 0];
  const maxPoint = (args.max_point as number[]) || [5, 5];
  const height = (args.height as number) || 3.0;

  const area = Math.abs(
    (maxPoint[0] - minPoint[0]) * (maxPoint[1] - minPoint[1])
  );
  const volume = area * height;

  return {
    success: true,
    data: {
      room_id: crypto.randomUUID(),
      name: args.name,
      number: args.number,
      area: Math.round(area * 1000) / 1000,
      volume: Math.round(volume * 1000) / 1000,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock create_roof tool response
 */
export function mockCreateRoof(args: Record<string, unknown>): MCPToolResult {
  const minPoint = (args.min_point as number[]) || [0, 0];
  const maxPoint = (args.max_point as number[]) || [10, 10];

  const footprintArea = Math.abs(
    (maxPoint[0] - minPoint[0]) * (maxPoint[1] - minPoint[1])
  );

  return {
    success: true,
    data: {
      roof_id: crypto.randomUUID(),
      roof_type: args.roof_type || "flat",
      slope_degrees: args.slope_degrees || 30,
      footprint_area: Math.round(footprintArea * 1000) / 1000,
      surface_area: Math.round(footprintArea * 1.15 * 1000) / 1000,
      ridge_height: args.roof_type === "flat" ? 0 : 2.5,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock create_opening tool response
 *
 * Creates a generic rectangular opening (cut) in a wall.
 */
export function mockCreateOpening(args: Record<string, unknown>): MCPToolResult {
  const hostId = args.host_id as string;
  const width = (args.width as number) || 1.0;
  const height = (args.height as number) || 2.0;
  const baseHeight = (args.base_height as number) || 0.0;
  const openingType = (args.opening_type as string) || "generic";

  return {
    success: true,
    data: {
      opening_id: crypto.randomUUID(),
      wall_id: hostId,
      width,
      height,
      base_height: baseHeight,
      opening_type: openingType,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock place_door tool response
 */
export function mockPlaceDoor(args: Record<string, unknown>): MCPToolResult {
  return {
    success: true,
    data: {
      door_id: crypto.randomUUID(),
      wall_id: args.wall_id,
      width: args.width || 0.9,
      height: args.height || 2.1,
      door_type: args.door_type || "single",
      swing: args.swing || "left",
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock place_window tool response
 */
export function mockPlaceWindow(args: Record<string, unknown>): MCPToolResult {
  return {
    success: true,
    data: {
      window_id: crypto.randomUUID(),
      wall_id: args.wall_id,
      width: args.width || 1.2,
      height: args.height || 1.0,
      sill_height: args.sill_height || 0.9,
      window_type: args.window_type || "fixed",
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mock compute_mesh tool response
 *
 * Generates glTF-compatible mesh data with optional normals and UVs.
 */
export function mockComputeMesh(args: Record<string, unknown>): MCPToolResult {
  const elementId = args.element_id as string;
  const includeNormals = (args.include_normals as boolean) ?? true;
  const includeUvs = (args.include_uvs as boolean) ?? false;
  const lodLevel = (args.lod_level as number) ?? 0;
  const format = (args.format as string) ?? "gltf";

  // Mock a simple box mesh (8 vertices, 12 triangles)
  const vertices = [
    // Front face
    0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,
    // Back face
    0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
  ];

  const indices = [
    // Front
    0, 1, 2, 0, 2, 3,
    // Back
    5, 4, 7, 5, 7, 6,
    // Top
    3, 2, 6, 3, 6, 7,
    // Bottom
    4, 5, 1, 4, 1, 0,
    // Right
    1, 5, 6, 1, 6, 2,
    // Left
    4, 0, 3, 4, 3, 7,
  ];

  const normals = includeNormals
    ? [
        // Front (z-)
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // Back (z+)
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      ]
    : undefined;

  const uvs = includeUvs
    ? [
        0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1,
      ]
    : undefined;

  const bbox = {
    min: [0, 0, 0],
    max: [1, 1, 1],
  };

  if (format === "obj") {
    return {
      success: true,
      data: {
        format: "obj",
        content:
          "# Mock OBJ\nv 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3\nf 1 3 4\n",
        element_id: elementId,
        element_type: "wall",
        vertex_count: 8,
        triangle_count: 12,
        lod_level: lodLevel,
        has_normals: includeNormals,
        has_uvs: includeUvs,
        bounding_box: bbox,
      },
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  if (format === "json") {
    const result: Record<string, unknown> = {
      format: "json",
      element_id: elementId,
      element_type: "wall",
      vertices,
      indices,
      vertex_count: 8,
      triangle_count: 12,
      lod_level: lodLevel,
      bounding_box: bbox,
    };
    if (normals) result.normals = normals;
    if (uvs) result.uvs = uvs;

    return {
      success: true,
      data: result,
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  // glTF format (default)
  const primitiveAttrs: Record<string, unknown> = {
    POSITION: {
      type: "VEC3",
      componentType: 5126,
      count: 8,
      data: vertices,
      min: bbox.min,
      max: bbox.max,
    },
  };

  if (normals) {
    primitiveAttrs.NORMAL = {
      type: "VEC3",
      componentType: 5126,
      count: 8,
      data: normals,
    };
  }

  if (uvs) {
    primitiveAttrs.TEXCOORD_0 = {
      type: "VEC2",
      componentType: 5126,
      count: 8,
      data: uvs,
    };
  }

  return {
    success: true,
    data: {
      format: "gltf",
      element_id: elementId,
      element_type: "wall",
      lod_level: lodLevel,
      mesh: {
        primitives: [
          {
            attributes: primitiveAttrs,
            indices: {
              type: "SCALAR",
              componentType: 5125,
              count: 36,
              data: indices,
            },
            mode: 4,
          },
        ],
      },
      vertex_count: 8,
      triangle_count: 12,
      bounding_box: bbox,
    },
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}
