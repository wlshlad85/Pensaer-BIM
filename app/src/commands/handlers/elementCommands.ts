/**
 * Element Command Handlers
 *
 * Command handlers for BIM element operations.
 * All handlers route through the MCP client for consistency.
 */

import {
  registerCommand,
  callMcpTool,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useHistoryStore } from "../../stores/historyStore";
import type { Element } from "../../types";

// Scale factor: 100 pixels per meter
const SCALE = 100;

// ============================================
// WALL COMMAND
// ============================================

async function createWallHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  // Support both --start/--end and positional syntax
  let start = args.start as number[] | undefined;
  let end = args.end as number[] | undefined;
  const positional = args._positional as unknown[] | undefined;

  // Support positional syntax: wall 0,0 5,0
  if (!start && !end && positional && positional.length >= 2) {
    const first = positional[0];
    const second = positional[1];
    if (Array.isArray(first) && first.length >= 2) {
      start = first as number[];
    }
    if (Array.isArray(second) && second.length >= 2) {
      end = second as number[];
    }
  }

  if (!start || !end) {
    return {
      success: false,
      message: "Missing required parameters: --start and --end (or positional: wall x1,y1 x2,y2)",
    };
  }

  // Validate start != end
  if (start[0] === end[0] && start[1] === end[1]) {
    return {
      success: false,
      message: "Wall start and end points cannot be the same",
    };
  }

  const height = (args.height as number) || 3.0;
  const thickness = (args.thickness as number) || 0.2;
  const material = (args.material as string) || "Concrete";
  const level = (args.level as string) || "Level 1";
  const wallType = (args.type as string) || (args.wall_type as string) || "basic";

  // Call MCP tool for geometry calculation
  const result = await callMcpTool("create_wall", {
    start,
    end,
    height,
    thickness,
    wall_type: wallType,
    material,
    level,
  });

  if (result.success && result.data) {
    // Create element in model store
    const wallId = result.data.wall_id as string || `wall-${crypto.randomUUID().slice(0, 8)}`;
    const length = result.data.length as number || Math.sqrt(
      Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
    );

    // Minimum length check (10cm = 0.1m)
    if (length < 0.1) {
      return {
        success: false,
        message: `Wall too short: ${length.toFixed(3)}m (minimum 0.1m)`,
      };
    }

    const isHorizontal = Math.abs(end[0] - start[0]) >= Math.abs(end[1] - start[1]);

    const wallElement: Element = {
      id: wallId,
      type: "wall",
      name: `Wall ${wallId.slice(-4)}`,
      x: start[0] * SCALE,
      y: start[1] * SCALE,
      width: isHorizontal ? length * SCALE : thickness * SCALE * 60,
      height: isHorizontal ? thickness * SCALE * 60 : length * SCALE,
      properties: {
        thickness: `${thickness * 1000}mm`,
        height: `${height * 1000}mm`,
        material,
        structural: wallType === "structural",
        level,
        wall_type: wallType,
        start_x: start[0],
        start_y: start[1],
        end_x: end[0],
        end_y: end[1],
      },
      relationships: {
        hosts: [],
        joins: [],
        bounds: [],
      },
      issues: [],
      aiSuggestions: [],
    };

    useModelStore.getState().addElement(wallElement);
    useHistoryStore.getState().recordAction(`Create wall ${wallId}`);

    return {
      success: true,
      message: `Created wall: ${wallId}`,
      data: {
        wall_id: wallId,
        length: length.toFixed(2),
        height,
        thickness,
      },
      elementCreated: { id: wallId, type: "wall" },
    };
  }

  return result;
}

// ============================================
// FLOOR COMMAND
// ============================================

async function createFloorHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  // Support both --points (polygon) and --min/--max (rectangle) formats
  const points = args.points as number[][] | undefined;
  const minPoint = args.min as number[] | undefined;
  const maxPoint = args.max as number[] | undefined;

  let boundaryPoints: number[][];
  let bbox: { minX: number; minY: number; maxX: number; maxY: number };

  if (points && Array.isArray(points) && points.length >= 3) {
    // Using --points parameter for arbitrary polygon
    boundaryPoints = points;

    // Validate points
    for (const point of boundaryPoints) {
      if (!Array.isArray(point) || point.length < 2) {
        return {
          success: false,
          message: "Invalid point format. Each point must be [x, y]",
        };
      }
    }

    // Auto-close polygon if needed
    if (!isPolygonClosed(boundaryPoints)) {
      boundaryPoints = [...boundaryPoints, boundaryPoints[0]];
    }

    bbox = calculateBoundingBox(boundaryPoints);
  } else if (minPoint && maxPoint) {
    // Using --min/--max for rectangular floor
    boundaryPoints = [
      [minPoint[0], minPoint[1]],
      [maxPoint[0], minPoint[1]],
      [maxPoint[0], maxPoint[1]],
      [minPoint[0], maxPoint[1]],
      [minPoint[0], minPoint[1]],
    ];
    bbox = {
      minX: minPoint[0],
      minY: minPoint[1],
      maxX: maxPoint[0],
      maxY: maxPoint[1],
    };
  } else {
    return {
      success: false,
      message: "Missing required parameters: --points x1,y1 x2,y2 x3,y3 ... or --min x,y --max x,y",
    };
  }

  const thickness = (args.thickness as number) || 0.15;
  const level = (args.level as string) || "Level 1";
  const material = (args.material as string) || "Concrete";

  // Calculate area using shoelace formula
  const area = calculatePolygonArea(boundaryPoints);

  // Call MCP tool
  const result = await callMcpTool("create_floor", {
    boundary_points: boundaryPoints,
    min_point: [bbox.minX, bbox.minY],
    max_point: [bbox.maxX, bbox.maxY],
    thickness,
    floor_type: args.floor_type || args.type || "slab",
    level,
    material,
  });

  if (result.success && result.data) {
    const floorId = result.data.floor_id as string || `floor-${crypto.randomUUID().slice(0, 8)}`;
    const calculatedArea = result.data.area as number || area;

    const floorElement: Element = {
      id: floorId,
      type: "floor",
      name: `Floor ${floorId.slice(-4)}`,
      x: bbox.minX * SCALE,
      y: bbox.minY * SCALE,
      width: (bbox.maxX - bbox.minX) * SCALE,
      height: (bbox.maxY - bbox.minY) * SCALE,
      properties: {
        thickness: `${thickness * 1000}mm`,
        elevation: 0,
        material,
        structural: true,
        level,
        area: `${calculatedArea.toFixed(2)} m²`,
        boundary_points: JSON.stringify(boundaryPoints),
        point_count: boundaryPoints.length - 1,
      },
      relationships: {
        supports: [],
        supportedBy: [],
      },
      issues: [],
      aiSuggestions: [],
    };

    useModelStore.getState().addElement(floorElement);
    useHistoryStore.getState().recordAction(`Create floor ${floorId}`);

    return {
      success: true,
      message: `Created floor: ${floorId} (${calculatedArea.toFixed(2)} m²)`,
      data: {
        floor_id: floorId,
        area: calculatedArea.toFixed(2),
        thickness,
        level,
        point_count: boundaryPoints.length - 1,
      },
      elementCreated: { id: floorId, type: "floor" },
    };
  }

  return result;
}

// ============================================
// ROOF COMMAND
// ============================================

async function createRoofHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  // Support both --points (polygon) and --min/--max (rectangle) formats
  const points = args.points as number[][] | undefined;
  const minPoint = args.min as number[] | undefined;
  const maxPoint = args.max as number[] | undefined;

  let boundaryPoints: number[][];
  let bbox: { minX: number; minY: number; maxX: number; maxY: number };

  if (points && Array.isArray(points) && points.length >= 3) {
    // Using --points parameter for arbitrary polygon
    boundaryPoints = points;

    // Validate points
    for (const point of boundaryPoints) {
      if (!Array.isArray(point) || point.length < 2) {
        return {
          success: false,
          message: "Invalid point format. Each point must be [x, y]",
        };
      }
    }

    // Auto-close polygon if needed
    if (!isPolygonClosed(boundaryPoints)) {
      boundaryPoints = [...boundaryPoints, boundaryPoints[0]];
    }

    bbox = calculateBoundingBox(boundaryPoints);
  } else if (minPoint && maxPoint) {
    // Using --min/--max for rectangular roof
    boundaryPoints = [
      [minPoint[0], minPoint[1]],
      [maxPoint[0], minPoint[1]],
      [maxPoint[0], maxPoint[1]],
      [minPoint[0], maxPoint[1]],
      [minPoint[0], minPoint[1]],
    ];
    bbox = {
      minX: minPoint[0],
      minY: minPoint[1],
      maxX: maxPoint[0],
      maxY: maxPoint[1],
    };
  } else {
    return {
      success: false,
      message: "Missing required parameters: --points x1,y1 x2,y2 x3,y3 ... or --min x,y --max x,y",
    };
  }

  const roofType = (args.type as string) || "gable";
  const slope = (args.slope as number) || 30;
  const overhang = (args.overhang as number) || 0.5;
  const level = (args.level as string) || "Level 1";
  const material = (args.material as string) || "Metal Standing Seam";
  const ridgeDirection = (args.ridge as string) || "auto"; // auto, x, y

  // Calculate footprint area
  const footprintArea = calculatePolygonArea(boundaryPoints);

  // Call MCP tool
  const result = await callMcpTool("create_roof", {
    boundary_points: boundaryPoints,
    min_point: [bbox.minX, bbox.minY],
    max_point: [bbox.maxX, bbox.maxY],
    roof_type: roofType,
    slope_degrees: slope,
    overhang,
    level,
    material,
    ridge_direction: ridgeDirection,
  });

  if (result.success && result.data) {
    const roofId = result.data.roof_id as string || `roof-${crypto.randomUUID().slice(0, 8)}`;
    const calculatedArea = result.data.footprint_area as number || footprintArea;

    const roofElement: Element = {
      id: roofId,
      type: "roof",
      name: `Roof ${roofId.slice(-4)}`,
      x: bbox.minX * SCALE,
      y: bbox.minY * SCALE,
      width: (bbox.maxX - bbox.minX) * SCALE,
      height: (bbox.maxY - bbox.minY) * SCALE,
      properties: {
        roof_type: roofType,
        slope_degrees: slope,
        overhang,
        material,
        insulation: "R-30",
        level,
        ridge_direction: ridgeDirection,
        footprint_area: `${calculatedArea.toFixed(2)} m²`,
        boundary_points: JSON.stringify(boundaryPoints),
        point_count: boundaryPoints.length - 1,
      },
      relationships: {
        supportedBy: [],
        covers: [],
      },
      issues: [],
      aiSuggestions: [],
    };

    useModelStore.getState().addElement(roofElement);
    useHistoryStore.getState().recordAction(`Create roof ${roofId}`);

    return {
      success: true,
      message: `Created ${roofType} roof: ${roofId}`,
      data: {
        roof_id: roofId,
        roof_type: roofType,
        slope,
        overhang,
        footprint_area: calculatedArea.toFixed(2),
        point_count: boundaryPoints.length - 1,
      },
      elementCreated: { id: roofId, type: "roof" },
    };
  }

  return result;
}

// ============================================
// ROOM COMMAND
// ============================================

// Room type definitions
type RoomType =
  | "bedroom"
  | "bathroom"
  | "kitchen"
  | "living"
  | "dining"
  | "office"
  | "storage"
  | "hallway"
  | "utility"
  | "garage"
  | "other";

/**
 * Calculate polygon area using the Shoelace formula (Surveyor's formula)
 * Points should be in order (clockwise or counter-clockwise)
 */
function calculatePolygonArea(points: number[][]): number {
  if (points.length < 3) return 0;

  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }

  return Math.abs(area) / 2;
}

/**
 * Calculate centroid of a polygon
 */
function calculateCentroid(points: number[][]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };

  let cx = 0;
  let cy = 0;
  const n = points.length;

  for (const point of points) {
    cx += point[0];
    cy += point[1];
  }

  return { x: cx / n, y: cy / n };
}

/**
 * Calculate bounding box of a polygon
 */
function calculateBoundingBox(
  points: number[][]
): { minX: number; minY: number; maxX: number; maxY: number } {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point[0]);
    minY = Math.min(minY, point[1]);
    maxX = Math.max(maxX, point[0]);
    maxY = Math.max(maxY, point[1]);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Check if polygon is closed (first and last points are the same or very close)
 */
function isPolygonClosed(points: number[][], tolerance: number = 0.01): boolean {
  if (points.length < 3) return false;

  const first = points[0];
  const last = points[points.length - 1];

  const distance = Math.sqrt(
    Math.pow(last[0] - first[0], 2) + Math.pow(last[1] - first[1], 2)
  );

  return distance < tolerance;
}

/**
 * Get room type display name and default finishes
 */
function getRoomTypeInfo(roomType: RoomType): {
  displayName: string;
  defaultFinishFloor: string;
  defaultFinishWalls: string;
  defaultOccupancy: string;
} {
  const typeInfo: Record<RoomType, {
    displayName: string;
    defaultFinishFloor: string;
    defaultFinishWalls: string;
    defaultOccupancy: string;
  }> = {
    bedroom: {
      displayName: "Bedroom",
      defaultFinishFloor: "Carpet",
      defaultFinishWalls: "Painted",
      defaultOccupancy: "Residential",
    },
    bathroom: {
      displayName: "Bathroom",
      defaultFinishFloor: "Tile",
      defaultFinishWalls: "Tile",
      defaultOccupancy: "Residential",
    },
    kitchen: {
      displayName: "Kitchen",
      defaultFinishFloor: "Tile",
      defaultFinishWalls: "Painted",
      defaultOccupancy: "Residential",
    },
    living: {
      displayName: "Living Room",
      defaultFinishFloor: "Hardwood",
      defaultFinishWalls: "Painted",
      defaultOccupancy: "Residential",
    },
    dining: {
      displayName: "Dining Room",
      defaultFinishFloor: "Hardwood",
      defaultFinishWalls: "Painted",
      defaultOccupancy: "Residential",
    },
    office: {
      displayName: "Office",
      defaultFinishFloor: "Carpet",
      defaultFinishWalls: "Painted",
      defaultOccupancy: "Commercial",
    },
    storage: {
      displayName: "Storage",
      defaultFinishFloor: "Concrete",
      defaultFinishWalls: "Painted",
      defaultOccupancy: "Storage",
    },
    hallway: {
      displayName: "Hallway",
      defaultFinishFloor: "Hardwood",
      defaultFinishWalls: "Painted",
      defaultOccupancy: "Circulation",
    },
    utility: {
      displayName: "Utility Room",
      defaultFinishFloor: "Concrete",
      defaultFinishWalls: "Painted",
      defaultOccupancy: "Utility",
    },
    garage: {
      displayName: "Garage",
      defaultFinishFloor: "Concrete",
      defaultFinishWalls: "Unfinished",
      defaultOccupancy: "Parking",
    },
    other: {
      displayName: "Room",
      defaultFinishFloor: "Hardwood",
      defaultFinishWalls: "Painted",
      defaultOccupancy: "Residential",
    },
  };

  return typeInfo[roomType] || typeInfo.other;
}

async function createRoomHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  // Support both --points (polygon) and --min/--max (rectangle) formats
  const points = args.points as number[][] | undefined;
  const minPoint = args.min as number[] | undefined;
  const maxPoint = args.max as number[] | undefined;

  let boundaryPoints: number[][];

  if (points && Array.isArray(points) && points.length >= 3) {
    // Using --points parameter for arbitrary polygon
    boundaryPoints = points;

    // Validate that each point has x,y coordinates
    for (const point of boundaryPoints) {
      if (!Array.isArray(point) || point.length < 2) {
        return {
          success: false,
          message: "Invalid point format. Each point must be [x, y]",
        };
      }
    }

    // Check if polygon is closed (or close it automatically)
    if (!isPolygonClosed(boundaryPoints)) {
      // Auto-close the polygon by adding the first point at the end
      boundaryPoints = [...boundaryPoints, boundaryPoints[0]];
    }

    // Validate minimum 3 distinct points
    const distinctPoints = new Set(
      boundaryPoints.map((p) => `${p[0]},${p[1]}`)
    );
    if (distinctPoints.size < 3) {
      return {
        success: false,
        message: "Room must have at least 3 distinct points",
      };
    }
  } else if (minPoint && maxPoint) {
    // Using --min/--max for rectangular room (backward compatible)
    boundaryPoints = [
      [minPoint[0], minPoint[1]],
      [maxPoint[0], minPoint[1]],
      [maxPoint[0], maxPoint[1]],
      [minPoint[0], maxPoint[1]],
      [minPoint[0], minPoint[1]], // Close the polygon
    ];
  } else {
    return {
      success: false,
      message:
        "Missing required parameters. Use --points x1,y1 x2,y2 x3,y3 ... or --min x,y --max x,y",
    };
  }

  // Calculate room geometry
  const area = calculatePolygonArea(boundaryPoints);
  const centroid = calculateCentroid(boundaryPoints);
  const bbox = calculateBoundingBox(boundaryPoints);

  // Parse room type
  const roomType = ((args.type as string) || "other").toLowerCase() as RoomType;
  const typeInfo = getRoomTypeInfo(roomType);

  // Call MCP tool for room creation
  const result = await callMcpTool("create_room", {
    boundary_points: boundaryPoints,
    min_point: [bbox.minX, bbox.minY],
    max_point: [bbox.maxX, bbox.maxY],
    name: args.name,
    number: args.number,
    room_type: roomType,
    height: args.height || 3.0,
    area: area,
  });

  if (result.success && result.data) {
    const roomId =
      (result.data.room_id as string) ||
      `room-${crypto.randomUUID().slice(0, 8)}`;
    const calculatedArea = (result.data.area as number) || area;
    const roomName = (args.name as string) || `${typeInfo.displayName} ${roomId.slice(-4)}`;

    const roomElement: Element = {
      id: roomId,
      type: "room",
      name: roomName,
      x: bbox.minX * SCALE,
      y: bbox.minY * SCALE,
      width: (bbox.maxX - bbox.minX) * SCALE,
      height: (bbox.maxY - bbox.minY) * SCALE,
      properties: {
        area: `${calculatedArea.toFixed(2)} m²`,
        height: `${((args.height as number) || 3.0) * 1000}mm`,
        room_type: roomType,
        occupancy: typeInfo.defaultOccupancy,
        finishFloor: typeInfo.defaultFinishFloor,
        finishCeiling: "Painted",
        finishWalls: typeInfo.defaultFinishWalls,
        level: "Level 1",
        number: (args.number as string) || "",
        // Store boundary points for polygon rendering
        boundary_points: JSON.stringify(boundaryPoints),
        centroid_x: centroid.x,
        centroid_y: centroid.y,
      },
      relationships: {
        boundedBy: [],
        accessVia: [],
      },
      issues: [],
      aiSuggestions: [],
    };

    useModelStore.getState().addElement(roomElement);
    useHistoryStore.getState().recordAction(`Create room ${roomId}`);

    return {
      success: true,
      message: `Created ${typeInfo.displayName.toLowerCase()}: ${roomName} (${calculatedArea.toFixed(2)} m²)`,
      data: {
        room_id: roomId,
        name: roomName,
        area: calculatedArea.toFixed(2),
        room_type: roomType,
        point_count: boundaryPoints.length - 1, // Exclude closing point
      },
      elementCreated: { id: roomId, type: "room" },
    };
  }

  return result;
}

// ============================================
// DOOR COMMAND
// ============================================

// Door type definitions
type DoorType = "single" | "double" | "sliding";

interface DoorValidation {
  valid: boolean;
  message?: string;
  wallLength?: number;
  requiredSpace?: number;
}

/**
 * Validate that a door fits in the host wall
 */
function validateDoorPlacement(
  wall: Element,
  offset: number,
  width: number
): DoorValidation {
  // Get wall length from properties or calculate from dimensions
  const startX = wall.properties.start_x as number | undefined;
  const startY = wall.properties.start_y as number | undefined;
  const endX = wall.properties.end_x as number | undefined;
  const endY = wall.properties.end_y as number | undefined;

  let wallLength: number;
  if (startX !== undefined && startY !== undefined && endX !== undefined && endY !== undefined) {
    wallLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  } else {
    // Fallback to pixel dimensions / scale
    const isHorizontal = wall.width > wall.height;
    wallLength = (isHorizontal ? wall.width : wall.height) / SCALE;
  }

  // Check if offset is within wall bounds
  if (offset < 0) {
    return {
      valid: false,
      message: "Offset cannot be negative",
      wallLength,
      requiredSpace: width,
    };
  }

  // Check if door fits (offset + width/2 should be within wall length)
  const doorStart = offset - width / 2;
  const doorEnd = offset + width / 2;

  if (doorStart < 0) {
    return {
      valid: false,
      message: `Door extends ${Math.abs(doorStart).toFixed(2)}m past wall start`,
      wallLength,
      requiredSpace: width,
    };
  }

  if (doorEnd > wallLength) {
    return {
      valid: false,
      message: `Door extends ${(doorEnd - wallLength).toFixed(2)}m past wall end (wall is ${wallLength.toFixed(2)}m long)`,
      wallLength,
      requiredSpace: width,
    };
  }

  return { valid: true, wallLength, requiredSpace: width };
}

async function placeDoorHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  const wallId = args.wall as string | undefined;

  // If no wall specified but one wall is selected, use it
  const targetWallId = wallId || (context.selectedIds.length === 1 ? context.selectedIds[0] : undefined);

  if (!targetWallId) {
    return {
      success: false,
      message: "Missing required parameter: --wall (or select a wall first)",
    };
  }

  // Validate wall exists and is actually a wall
  const wall = useModelStore.getState().getElementById(targetWallId);
  if (!wall) {
    return {
      success: false,
      message: `Wall not found: ${targetWallId}`,
    };
  }
  if (wall.type !== "wall") {
    return {
      success: false,
      message: `Element ${targetWallId} is not a wall (type: ${wall.type})`,
    };
  }

  // Parse door parameters with defaults
  const offset = args.offset as number | undefined;
  const position = args.position as number | undefined;
  const doorOffset = offset ?? position ?? 0.5; // Default to center if no offset given
  const width = (args.width as number) || 0.9;
  const height = (args.height as number) || 2.1;
  const doorType = (args.type as DoorType) || "single";
  const swing = (args.swing as string) || "left";

  // Adjust width for double doors
  const effectiveWidth = doorType === "double" ? width * 2 : width;

  // Validate placement
  const validation = validateDoorPlacement(wall, doorOffset, effectiveWidth);
  if (!validation.valid) {
    return {
      success: false,
      message: `Door placement invalid: ${validation.message}`,
      data: {
        wall_length: validation.wallLength,
        door_width: effectiveWidth,
        offset: doorOffset,
      },
    };
  }

  // Call MCP tool for door placement
  const result = await callMcpTool("place_door", {
    wall_id: targetWallId,
    position: doorOffset,
    width: effectiveWidth,
    height,
    door_type: doorType,
    swing,
  });

  if (result.success && result.data) {
    // Create door element in model store
    const doorId = result.data.door_id as string || `door-${crypto.randomUUID().slice(0, 8)}`;

    // Calculate door position on wall
    const isHorizontal = wall.width > wall.height;
    let doorX: number, doorY: number, doorW: number, doorH: number;

    if (isHorizontal) {
      // Horizontal wall: door placed along x-axis
      doorX = wall.x + doorOffset * SCALE - (effectiveWidth * SCALE) / 2;
      doorY = wall.y - 6; // Centered on wall
      doorW = effectiveWidth * SCALE;
      doorH = 24;
    } else {
      // Vertical wall: door placed along y-axis
      doorX = wall.x - 6;
      doorY = wall.y + doorOffset * SCALE - (effectiveWidth * SCALE) / 2;
      doorW = 24;
      doorH = effectiveWidth * SCALE;
    }

    const doorElement: Element = {
      id: doorId,
      type: "door",
      name: `Door ${doorId.slice(-4)}`,
      x: doorX,
      y: doorY,
      width: doorW,
      height: doorH,
      properties: {
        width: `${effectiveWidth * 1000}mm`,
        height: `${height * 1000}mm`,
        material: "Wood",
        door_type: doorType,
        swingDirection: swing === "left" ? "Left" : "Right",
        handleSide: swing === "left" ? "Right" : "Left",
        offset: doorOffset,
        level: wall.properties.level as string || "Level 1",
      },
      relationships: {
        hostedBy: targetWallId,
        leadsTo: [],
      },
      issues: [],
      aiSuggestions: [],
    };

    // Add door to model
    useModelStore.getState().addElement(doorElement);

    // Update wall's hosts relationship
    const currentHosts = wall.relationships.hosts || [];
    useModelStore.getState().updateElement(targetWallId, {
      relationships: {
        ...wall.relationships,
        hosts: [...currentHosts, doorId],
      },
    });

    useHistoryStore.getState().recordAction(`Place door ${doorId} in ${targetWallId}`);

    return {
      success: true,
      message: `Placed ${doorType} door: ${doorId}`,
      data: {
        door_id: doorId,
        wall_id: targetWallId,
        offset: doorOffset,
        width: effectiveWidth,
        height,
        door_type: doorType,
        wall_length: validation.wallLength,
      },
      elementCreated: { id: doorId, type: "door" },
    };
  }

  return result;
}

// ============================================
// WINDOW COMMAND
// ============================================

// Window type definitions
type WindowType = "fixed" | "casement" | "awning" | "sliding" | "double_hung";

interface WindowValidation {
  valid: boolean;
  message?: string;
  wallLength?: number;
  wallHeight?: number;
  requiredSpace?: number;
}

/**
 * Validate that a window fits in the host wall
 */
function validateWindowPlacement(
  wall: Element,
  offset: number,
  width: number,
  height: number,
  sillHeight: number
): WindowValidation {
  // Get wall dimensions from properties or calculate
  const startX = wall.properties.start_x as number | undefined;
  const startY = wall.properties.start_y as number | undefined;
  const endX = wall.properties.end_x as number | undefined;
  const endY = wall.properties.end_y as number | undefined;

  let wallLength: number;
  if (startX !== undefined && startY !== undefined && endX !== undefined && endY !== undefined) {
    wallLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  } else {
    const isHorizontal = wall.width > wall.height;
    wallLength = (isHorizontal ? wall.width : wall.height) / SCALE;
  }

  // Get wall height from properties
  const wallHeightStr = wall.properties.height as string | undefined;
  const wallHeight = wallHeightStr
    ? parseFloat(wallHeightStr.replace("mm", "")) / 1000
    : 2.8; // Default 2.8m

  // Check if offset is within wall bounds
  if (offset < 0) {
    return {
      valid: false,
      message: "Offset cannot be negative",
      wallLength,
      wallHeight,
      requiredSpace: width,
    };
  }

  // Check horizontal fit
  const windowStart = offset - width / 2;
  const windowEnd = offset + width / 2;

  if (windowStart < 0) {
    return {
      valid: false,
      message: `Window extends ${Math.abs(windowStart).toFixed(2)}m past wall start`,
      wallLength,
      wallHeight,
      requiredSpace: width,
    };
  }

  if (windowEnd > wallLength) {
    return {
      valid: false,
      message: `Window extends ${(windowEnd - wallLength).toFixed(2)}m past wall end (wall is ${wallLength.toFixed(2)}m long)`,
      wallLength,
      wallHeight,
      requiredSpace: width,
    };
  }

  // Check vertical fit (sill + window height must be below wall height)
  const windowTop = sillHeight + height;
  if (windowTop > wallHeight) {
    return {
      valid: false,
      message: `Window top (${windowTop.toFixed(2)}m) exceeds wall height (${wallHeight.toFixed(2)}m)`,
      wallLength,
      wallHeight,
      requiredSpace: width,
    };
  }

  // Check minimum sill height (typically > 0)
  if (sillHeight < 0) {
    return {
      valid: false,
      message: "Sill height cannot be negative",
      wallLength,
      wallHeight,
      requiredSpace: width,
    };
  }

  return { valid: true, wallLength, wallHeight, requiredSpace: width };
}

/**
 * Check if a new hosted element (door/window/opening) overlaps with existing ones on a wall
 */
function checkHostedElementOverlap(
  wall: Element,
  offset: number,
  width: number
): { overlaps: boolean; message?: string; conflictId?: string } {
  const hostedIds = (wall.relationships.hosts as string[]) || [];
  if (hostedIds.length === 0) return { overlaps: false };

  const newStart = offset - width / 2;
  const newEnd = offset + width / 2;

  for (const hostedId of hostedIds) {
    const hosted = useModelStore.getState().getElementById(hostedId);
    if (!hosted) continue;

    const hostedOffset = hosted.properties.offset as number | undefined;
    const hostedWidthStr = hosted.properties.width as string | undefined;
    if (hostedOffset === undefined || !hostedWidthStr) continue;

    const hostedWidth = parseFloat(hostedWidthStr.replace("mm", "")) / 1000;
    const hostedStart = hostedOffset - hostedWidth / 2;
    const hostedEnd = hostedOffset + hostedWidth / 2;

    // Check overlap
    if (newStart < hostedEnd && newEnd > hostedStart) {
      return {
        overlaps: true,
        message: `Overlaps with existing element ${hostedId}`,
        conflictId: hostedId,
      };
    }
  }

  return { overlaps: false };
}

async function placeWindowHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  const wallId = args.wall as string | undefined;

  // If no wall specified but one wall is selected, use it
  const targetWallId = wallId || (context.selectedIds.length === 1 ? context.selectedIds[0] : undefined);

  if (!targetWallId) {
    return {
      success: false,
      message: "Missing required parameter: --wall (or select a wall first)",
    };
  }

  // Validate wall exists and is actually a wall
  const wall = useModelStore.getState().getElementById(targetWallId);
  if (!wall) {
    return {
      success: false,
      message: `Wall not found: ${targetWallId}`,
    };
  }
  if (wall.type !== "wall") {
    return {
      success: false,
      message: `Element ${targetWallId} is not a wall (type: ${wall.type})`,
    };
  }

  // Parse window parameters with defaults
  const offset = args.offset as number | undefined;
  const position = args.position as number | undefined;
  const windowOffset = offset ?? position ?? 0.5; // Default to center if no offset given
  const width = (args.width as number) || 1.2;
  const height = (args.height as number) || 1.0;
  const sillHeight = (args.sill as number) || 0.9;
  const windowType = (args.type as WindowType) || "fixed";

  // Validate placement
  const validation = validateWindowPlacement(wall, windowOffset, width, height, sillHeight);
  if (!validation.valid) {
    return {
      success: false,
      message: `Window placement invalid: ${validation.message}`,
      data: {
        wall_length: validation.wallLength,
        wall_height: validation.wallHeight,
        window_width: width,
        window_height: height,
        offset: windowOffset,
        sill_height: sillHeight,
      },
    };
  }

  // Check for overlap with existing hosted elements
  const overlap = checkHostedElementOverlap(wall, windowOffset, width);
  if (overlap.overlaps) {
    return {
      success: false,
      message: `Window placement invalid: ${overlap.message}`,
      data: { wall_id: targetWallId, offset: windowOffset, width, conflict_element: overlap.conflictId },
    };
  }

  // Call MCP tool for window placement
  const result = await callMcpTool("place_window", {
    wall_id: targetWallId,
    position: windowOffset,
    width,
    height,
    sill_height: sillHeight,
    window_type: windowType,
  });

  if (result.success && result.data) {
    // Create window element in model store
    const windowId = result.data.window_id as string || `window-${crypto.randomUUID().slice(0, 8)}`;

    // Calculate window position on wall
    const isHorizontal = wall.width > wall.height;
    let windowX: number, windowY: number, windowW: number, windowH: number;

    if (isHorizontal) {
      // Horizontal wall: window placed along x-axis
      windowX = wall.x + windowOffset * SCALE - (width * SCALE) / 2;
      windowY = wall.y - 6; // Centered on wall
      windowW = width * SCALE;
      windowH = 24;
    } else {
      // Vertical wall: window placed along y-axis
      windowX = wall.x - 6;
      windowY = wall.y + windowOffset * SCALE - (width * SCALE) / 2;
      windowW = 24;
      windowH = width * SCALE;
    }

    // Determine glazing type based on window type
    const glazingType = windowType === "fixed" ? "Double" : "Double Low-E";
    const openingType = windowType === "fixed" ? "Fixed" :
                        windowType === "casement" ? "Casement" :
                        windowType === "awning" ? "Awning" :
                        windowType === "sliding" ? "Sliding" : "Double Hung";

    const windowElement: Element = {
      id: windowId,
      type: "window",
      name: `Window ${windowId.slice(-4)}`,
      x: windowX,
      y: windowY,
      width: windowW,
      height: windowH,
      properties: {
        width: `${width * 1000}mm`,
        height: `${height * 1000}mm`,
        sillHeight: `${sillHeight * 1000}mm`,
        glazingType,
        uValue: "1.4 W/m²K",
        openingType,
        window_type: windowType,
        frame: "Aluminum",
        offset: windowOffset,
        level: wall.properties.level as string || "Level 1",
      },
      relationships: {
        hostedBy: targetWallId,
        facesRoom: undefined,
      },
      issues: [],
      aiSuggestions: [],
    };

    // Add window to model
    useModelStore.getState().addElement(windowElement);

    // Update wall's hosts relationship
    const currentHosts = wall.relationships.hosts || [];
    useModelStore.getState().updateElement(targetWallId, {
      relationships: {
        ...wall.relationships,
        hosts: [...currentHosts, windowId],
      },
    });

    useHistoryStore.getState().recordAction(`Place window ${windowId} in ${targetWallId}`);

    return {
      success: true,
      message: `Placed ${windowType} window: ${windowId}`,
      data: {
        window_id: windowId,
        wall_id: targetWallId,
        offset: windowOffset,
        width,
        height,
        sill_height: sillHeight,
        window_type: windowType,
        wall_length: validation.wallLength,
      },
      elementCreated: { id: windowId, type: "window" },
    };
  }

  return result;
}

// ============================================
// OPENING COMMAND
// ============================================

/**
 * Validate that an opening fits in the host wall
 */
function validateOpeningPlacement(
  wall: Element,
  offset: number,
  width: number,
  height: number,
  baseHeight: number
): { valid: boolean; message?: string; wallLength?: number; wallHeight?: number } {
  const startX = wall.properties.start_x as number | undefined;
  const startY = wall.properties.start_y as number | undefined;
  const endX = wall.properties.end_x as number | undefined;
  const endY = wall.properties.end_y as number | undefined;

  let wallLength: number;
  if (startX !== undefined && startY !== undefined && endX !== undefined && endY !== undefined) {
    wallLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  } else {
    const isHorizontal = wall.width > wall.height;
    wallLength = (isHorizontal ? wall.width : wall.height) / SCALE;
  }

  const wallHeightStr = wall.properties.height as string | undefined;
  const wallHeight = wallHeightStr
    ? parseFloat(wallHeightStr.replace("mm", "")) / 1000
    : 2.8;

  // Horizontal fit
  if (offset < 0) {
    return { valid: false, message: "Offset cannot be negative", wallLength, wallHeight };
  }

  const openingStart = offset - width / 2;
  const openingEnd = offset + width / 2;

  if (openingStart < 0) {
    return {
      valid: false,
      message: `Opening extends ${Math.abs(openingStart).toFixed(2)}m past wall start`,
      wallLength,
      wallHeight,
    };
  }

  if (openingEnd > wallLength) {
    return {
      valid: false,
      message: `Opening extends ${(openingEnd - wallLength).toFixed(2)}m past wall end (wall is ${wallLength.toFixed(2)}m long)`,
      wallLength,
      wallHeight,
    };
  }

  // Vertical fit
  const openingTop = baseHeight + height;
  if (openingTop > wallHeight) {
    return {
      valid: false,
      message: `Opening top (${openingTop.toFixed(2)}m) exceeds wall height (${wallHeight.toFixed(2)}m)`,
      wallLength,
      wallHeight,
    };
  }

  if (baseHeight < 0) {
    return { valid: false, message: "Base height cannot be negative", wallLength, wallHeight };
  }

  return { valid: true, wallLength, wallHeight };
}

async function placeOpeningHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  const wallId = args.wall as string | undefined;

  // If no wall specified but one wall is selected, use it
  const targetWallId = wallId || (context.selectedIds.length === 1 ? context.selectedIds[0] : undefined);

  if (!targetWallId) {
    return {
      success: false,
      message: "Missing required parameter: --wall (or select a wall first)",
    };
  }

  // Validate wall exists and is actually a wall
  const wall = useModelStore.getState().getElementById(targetWallId);
  if (!wall) {
    return {
      success: false,
      message: `Wall not found: ${targetWallId}`,
    };
  }
  if (wall.type !== "wall") {
    return {
      success: false,
      message: `Element ${targetWallId} is not a wall (type: ${wall.type})`,
    };
  }

  // Parse opening parameters with defaults
  const offset = args.offset as number | undefined;
  const position = args.position as number | undefined;
  const openingOffset = offset ?? position ?? 0.5;
  const width = (args.width as number) || 1.0;
  const height = (args.height as number) || 2.1;
  const baseHeight = (args.base_height as number) ?? (args.baseHeight as number) ?? 0;

  // Validate placement
  const validation = validateOpeningPlacement(wall, openingOffset, width, height, baseHeight);
  if (!validation.valid) {
    return {
      success: false,
      message: `Opening placement invalid: ${validation.message}`,
      data: {
        wall_length: validation.wallLength,
        wall_height: validation.wallHeight,
        opening_width: width,
        opening_height: height,
        offset: openingOffset,
        base_height: baseHeight,
      },
    };
  }

  // Call MCP tool for opening creation
  const result = await callMcpTool("create_opening", {
    wall_id: targetWallId,
    position: openingOffset,
    width,
    height,
    base_height: baseHeight,
    opening_type: "generic",
  });

  if (result.success && result.data) {
    const openingId = result.data.opening_id as string || `opening-${crypto.randomUUID().slice(0, 8)}`;

    // Calculate opening position on wall
    const isHorizontal = wall.width > wall.height;
    let openingX: number, openingY: number, openingW: number, openingH: number;

    if (isHorizontal) {
      openingX = wall.x + openingOffset * SCALE - (width * SCALE) / 2;
      openingY = wall.y - 6;
      openingW = width * SCALE;
      openingH = 24;
    } else {
      openingX = wall.x - 6;
      openingY = wall.y + openingOffset * SCALE - (width * SCALE) / 2;
      openingW = 24;
      openingH = width * SCALE;
    }

    const openingElement: Element = {
      id: openingId,
      type: "opening",
      name: `Opening ${openingId.slice(-4)}`,
      x: openingX,
      y: openingY,
      width: openingW,
      height: openingH,
      properties: {
        width: `${width * 1000}mm`,
        height: `${height * 1000}mm`,
        baseHeight: `${baseHeight * 1000}mm`,
        offset: openingOffset,
        level: wall.properties.level as string || "Level 1",
      },
      relationships: {
        hostedBy: targetWallId,
      },
      issues: [],
      aiSuggestions: [],
    };

    // Add opening to model
    useModelStore.getState().addElement(openingElement);

    // Update wall's hosts relationship
    const currentHosts = wall.relationships.hosts || [];
    useModelStore.getState().updateElement(targetWallId, {
      relationships: {
        ...wall.relationships,
        hosts: [...currentHosts, openingId],
      },
    });

    useHistoryStore.getState().recordAction(`Place opening ${openingId} in ${targetWallId}`);

    return {
      success: true,
      message: `Placed opening: ${openingId}`,
      data: {
        opening_id: openingId,
        wall_id: targetWallId,
        offset: openingOffset,
        width,
        height,
        base_height: baseHeight,
        wall_length: validation.wallLength,
      },
      elementCreated: { id: openingId, type: "opening" },
    };
  }

  return result;
}

// ============================================
// DELETE COMMAND
// ============================================

async function deleteElementsHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  // Use provided IDs or fall back to selected elements
  let elementIds = args.element_ids as string[] | undefined;

  if (!elementIds || elementIds.length === 0) {
    if (context.selectedIds.length === 0) {
      return {
        success: false,
        message: "No elements specified. Provide IDs or select elements first.",
      };
    }
    elementIds = context.selectedIds;
  }

  const result = await callMcpTool("delete_element", {
    element_ids: elementIds,
  });

  if (result.success) {
    // Also delete from model store
    useModelStore.getState().deleteElements(elementIds);
    useHistoryStore.getState().recordAction(`Delete ${elementIds.length} element(s)`);

    return {
      success: true,
      message: `Deleted ${elementIds.length} element(s)`,
      data: { deleted: elementIds, deleted_count: elementIds.length },
    };
  }

  return result;
}

// ============================================
// GET ELEMENT COMMAND
// ============================================

async function getElementHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  let elementId = args.element_id as string | undefined;

  // Fall back to selected element
  if (!elementId && context.selectedIds.length === 1) {
    elementId = context.selectedIds[0];
  }

  if (!elementId) {
    return {
      success: false,
      message: "No element specified. Provide ID or select an element first.",
    };
  }

  // Get from model store (faster than MCP for local data)
  const element = useModelStore.getState().getElementById(elementId);
  if (element) {
    return {
      success: true,
      message: `Element: ${element.name}`,
      data: {
        id: element.id,
        type: element.type,
        name: element.name,
        ...element.properties,
      },
    };
  }

  // Fall back to MCP
  return callMcpTool("get_element", { element_id: elementId });
}

// ============================================
// LIST ELEMENTS COMMAND
// ============================================

async function listElementsHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const category = args.category as string | undefined;

  // Use model store for local listing
  const elements = useModelStore.getState().elements;
  const filtered = category
    ? elements.filter((el) => el.type === category)
    : elements;

  // Group by type
  const byType = new Map<string, typeof filtered>();
  for (const el of filtered) {
    if (!byType.has(el.type)) byType.set(el.type, []);
    byType.get(el.type)!.push(el);
  }

  const typesCounts: Record<string, number> = {};
  for (const [type, els] of byType) {
    typesCounts[type] = els.length;
  }

  return {
    success: true,
    message: `Found ${filtered.length} element(s)`,
    data: {
      elements: filtered.map((el) => ({
        id: el.id,
        type: el.type,
        name: el.name,
      })),
      count: filtered.length,
      by_type: typesCounts,
    },
  };
}

// ============================================
// DETECT ROOMS COMMAND
// ============================================

async function detectRoomsHandler(
  _args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  return callMcpTool("detect_rooms", {});
}

// ============================================
// ANALYZE TOPOLOGY COMMAND
// ============================================

async function analyzeTopologyHandler(
  _args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  return callMcpTool("analyze_wall_topology", {});
}

// ============================================
// CLASH DETECTION COMMAND
// ============================================

async function detectClashesHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  const elementIds = (args.ids as string)?.split(",") ||
    (args.element_ids as string[] | undefined) ||
    (context.selectedIds.length > 0 ? context.selectedIds : undefined);

  return callMcpTool("detect_clashes", {
    element_ids: elementIds,
    tolerance: args.tolerance || 0.001,
    clearance: args.clearance || 0,
    ignore_same_type: args.ignore_same_type || false,
  });
}

// ============================================
// CLASH BETWEEN SETS COMMAND
// ============================================

async function detectClashesBetweenSetsHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const setA = (args.a as string)?.split(",");
  const setB = (args.b as string)?.split(",");

  if (!setA || !setB) {
    return {
      success: false,
      message: "Missing required parameters: --a and --b (comma-separated IDs)",
    };
  }

  return callMcpTool("detect_clashes_between_sets", {
    set_a_ids: setA,
    set_b_ids: setB,
    tolerance: args.tolerance || 0.001,
    clearance: args.clearance || 0,
  });
}

// ============================================
// REGISTER ALL COMMANDS
// ============================================

export function registerElementCommands(): void {
  registerCommand({
    name: "wall",
    description: "Create a wall element",
    usage: "wall --start x,y --end x,y [--height h] [--thickness t] [--material m] [--level l]",
    examples: [
      "wall --start 0,0 --end 5,0",
      "wall 0,0 5,0",
      "wall --start 0,0 --end 10,0 --height 3.0",
      "wall --start 0,0 --end 5,0 --material Brick --level \"Level 2\"",
      "wall --start 0,0 --end 5,0 --type structural",
    ],
    handler: createWallHandler,
  });

  registerCommand({
    name: "floor",
    description: "Create a floor slab with polygon or rectangular bounds",
    usage: "floor --points x1,y1 x2,y2 x3,y3 ... [--thickness t] [--level l]",
    examples: [
      "floor --points 0,0 10,0 10,8 0,8",
      "floor --min 0,0 --max 10,10",
      "floor --min 0,0 --max 5,5 --thickness 0.15 --level \"Level 2\"",
      "floor --points 0,0 6,0 6,4 3,4 3,2 0,2 --thickness 0.2",
    ],
    handler: createFloorHandler,
  });

  registerCommand({
    name: "roof",
    description: "Create a roof element with polygon or rectangular bounds",
    usage: "roof --type gable|hip|flat|shed --points x1,y1 x2,y2 ... [--slope deg] [--overhang m] [--ridge x|y]",
    examples: [
      "roof --type gable --points 0,0 10,0 10,8 0,8",
      "roof --type hip --min 0,0 --max 10,10 --slope 30",
      "roof --type flat --min 0,0 --max 10,10 --overhang 0.5",
      "roof --type gable --points 0,0 12,0 12,8 0,8 --slope 35 --ridge x",
    ],
    handler: createRoofHandler,
  });

  registerCommand({
    name: "room",
    description: "Create a room space with polygon boundary or rectangular bounds",
    usage: "room --points x1,y1 x2,y2 x3,y3 [...] [--name name] [--number num] [--type type]",
    examples: [
      "room --points 0,0 5,0 5,4 0,4 --name \"Living Room\"",
      "room --points 0,0 3,0 3,2 0,2 --name Bathroom --number 101 --type bathroom",
      "room --min 0,0 --max 5,5 --name Kitchen --type kitchen",
      "room --points 0,0 6,0 6,4 3,4 3,2 0,2 --name \"L-Shaped Room\"",
    ],
    handler: createRoomHandler,
  });

  registerCommand({
    name: "door",
    description: "Place a door in a wall with offset positioning",
    usage: "door --wall <wall_id> --offset <m> [--width w] [--height h] [--type single|double|sliding]",
    examples: [
      "door --wall wall-001 --offset 2.5",
      "door --wall wall-001 --offset 1.5 --type double",
      "door --wall wall-001 --offset 3.0 --width 0.9 --height 2.1 --type sliding",
    ],
    handler: placeDoorHandler,
  });

  registerCommand({
    name: "window",
    description: "Place a window in a wall with offset positioning",
    usage: "window --wall <wall_id> --offset <m> [--width w] [--height h] [--sill s] [--type fixed|casement|awning]",
    examples: [
      "window --wall wall-001 --offset 2.0",
      "window --wall wall-001 --offset 1.5 --sill 0.9 --type casement",
      "window --wall wall-001 --offset 2.5 --width 1.2 --height 1.5 --type awning",
    ],
    handler: placeWindowHandler,
  });

  registerCommand({
    name: "opening",
    description: "Place an opening (void) in a wall without a door or window",
    usage: "opening --wall <wall_id> --offset <m> [--width w] [--height h] [--base_height bh]",
    examples: [
      "opening --wall wall-001 --offset 2.5",
      "opening --wall wall-001 --offset 1.5 --width 1.2 --height 0.6 --base_height 2.0",
      "opening --wall wall-001 --offset 3.0 --width 2.0 --height 2.4",
    ],
    handler: placeOpeningHandler,
  });

  registerCommand({
    name: "delete",
    description: "Delete elements by ID or selection",
    usage: "delete <id1> [<id2> ...] (or select elements first)",
    examples: [
      "delete wall-001 wall-002",
      "delete (with selected elements)",
    ],
    handler: deleteElementsHandler,
  });

  registerCommand({
    name: "get",
    description: "Get element details",
    usage: "get <element_id> (or select an element first)",
    examples: ["get wall-001"],
    handler: getElementHandler,
  });

  registerCommand({
    name: "list",
    description: "List elements in the model",
    usage: "list [category]",
    examples: ["list", "list wall", "list room"],
    handler: listElementsHandler,
  });

  registerCommand({
    name: "detect-rooms",
    description: "Detect rooms from wall topology",
    usage: "detect-rooms",
    examples: ["detect-rooms"],
    handler: detectRoomsHandler,
  });

  registerCommand({
    name: "analyze",
    description: "Analyze wall topology",
    usage: "analyze",
    examples: ["analyze"],
    handler: analyzeTopologyHandler,
  });

  registerCommand({
    name: "clash",
    description: "Detect clashes between elements",
    usage: "clash [--ids id1,id2,...] [--clearance 0.1] [--tolerance 0.001]",
    examples: [
      "clash",
      "clash --clearance 0.1",
      "clash --ids wall-001,wall-002",
    ],
    handler: detectClashesHandler,
  });

  registerCommand({
    name: "clash-between",
    description: "Detect clashes between two sets of elements",
    usage: "clash-between --a id1,id2 --b id3,id4 [--clearance 0.1]",
    examples: ["clash-between --a wall-001,wall-002 --b door-001,door-002"],
    handler: detectClashesBetweenSetsHandler,
  });
}
