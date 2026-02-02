/**
 * Abstract Syntax Tree nodes for the Pensaer DSL.
 *
 * This module defines all AST node types that represent parsed DSL commands.
 * Each node type corresponds to a grammar rule and can be executed against
 * the MCP tool servers.
 */

// =============================================================================
// Enums for typed values
// =============================================================================

export enum WallType {
  BASIC = "basic",
  STRUCTURAL = "structural",
  CURTAIN = "curtain",
  RETAINING = "retaining",
}

export enum DoorType {
  SINGLE = "single",
  DOUBLE = "double",
  SLIDING = "sliding",
  FOLDING = "folding",
  REVOLVING = "revolving",
  POCKET = "pocket",
}

export enum WindowType {
  FIXED = "fixed",
  CASEMENT = "casement",
  DOUBLE_HUNG = "double_hung",
  SLIDING = "sliding",
  AWNING = "awning",
  HOPPER = "hopper",
  PIVOT = "pivot",
}

export enum SwingDirection {
  LEFT = "left",
  RIGHT = "right",
  BOTH = "both",
  NONE = "none",
}

export enum RoofType {
  FLAT = "flat",
  GABLE = "gable",
  HIP = "hip",
  SHED = "shed",
  MANSARD = "mansard",
}

export enum RoomType {
  BEDROOM = "bedroom",
  BATHROOM = "bathroom",
  KITCHEN = "kitchen",
  LIVING = "living",
  DINING = "dining",
  OFFICE = "office",
  STORAGE = "storage",
  GENERIC = "generic",
}

export enum StairType {
  STRAIGHT = "straight",
  L_SHAPED = "L-shaped",
  U_SHAPED = "U-shaped",
  SPIRAL = "spiral",
  CURVED = "curved",
}

export enum VariableRef {
  LAST = "$last",
  SELECTED = "$selected",
  WALL = "$wall",
}

// =============================================================================
// Coordinate Types
// =============================================================================

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// =============================================================================
// Element References
// =============================================================================

export interface ElementRef {
  uuid?: string;
  variable?: VariableRef;
}

export function createElementRefFromUUID(uuid: string): ElementRef {
  return { uuid };
}

export function createElementRefFromVariable(variable: VariableRef): ElementRef {
  return { variable };
}

// =============================================================================
// Base Command
// =============================================================================

export interface BaseCommand {
  type: string;
  line: number;
  column: number;
}

// =============================================================================
// Wall Commands
// =============================================================================

export interface CreateWallCommand extends BaseCommand {
  type: "CreateWall";
  start: Point2D;
  end: Point2D;
  height: number;
  thickness: number;
  wallType?: WallType;
  levelId?: string;
  material?: string;
}

export interface CreateRectWallsCommand extends BaseCommand {
  type: "CreateRectWalls";
  minPoint: Point2D;
  maxPoint: Point2D;
  height: number;
  thickness: number;
}

export interface ModifyWallCommand extends BaseCommand {
  type: "ModifyWall";
  wallId: string;
  propertyName: string;
  value: number | string;
}

// =============================================================================
// Door Commands
// =============================================================================

export interface PlaceDoorCommand extends BaseCommand {
  type: "PlaceDoor";
  wallRef: ElementRef;
  offset: number;
  width: number;
  height: number;
  doorType?: DoorType;
  swing?: SwingDirection;
}

export interface ModifyDoorCommand extends BaseCommand {
  type: "ModifyDoor";
  doorId: string;
  propertyName: string;
  value: number | string;
}

// =============================================================================
// Window Commands
// =============================================================================

export interface PlaceWindowCommand extends BaseCommand {
  type: "PlaceWindow";
  wallRef: ElementRef;
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
  windowType?: WindowType;
}

export interface ModifyWindowCommand extends BaseCommand {
  type: "ModifyWindow";
  windowId: string;
  propertyName: string;
  value: number | string;
}

// =============================================================================
// Opening Command
// =============================================================================

export interface CreateOpeningCommand extends BaseCommand {
  type: "CreateOpening";
  wallRef: ElementRef;
  offset: number;
  width: number;
  height: number;
  baseHeight: number;
}

// =============================================================================
// Floor Command
// =============================================================================

export interface CreateFloorCommand extends BaseCommand {
  type: "CreateFloor";
  /** Polygon points defining the floor boundary */
  points: Point2D[];
  /** Floor thickness in meters (default 0.15) */
  thickness: number;
  /** Level/elevation (default 0) */
  level: number;
  /** Level ID string (e.g., "Level 1") */
  levelId?: string;
  /** Floor type (slab, deck, etc.) */
  floorType?: string;
}

// =============================================================================
// Roof Command
// =============================================================================

export interface CreateRoofCommand extends BaseCommand {
  type: "CreateRoof";
  /** Polygon points defining the roof boundary */
  points: Point2D[];
  /** Roof type (flat, gable, hip, shed, mansard) */
  roofType: RoofType;
  /** Slope in degrees (default 30) */
  slope: number;
  /** Overhang distance in meters (default 0.5) */
  overhang: number;
  /** Ridge direction (optional, for gable roofs) */
  ridgeDirection?: "x" | "y";
  /** Level ID string */
  levelId?: string;
}

// =============================================================================
// Room Command
// =============================================================================

export interface CreateRoomCommand extends BaseCommand {
  type: "CreateRoom";
  /** Polygon points defining the room boundary */
  points: Point2D[];
  /** Room name (e.g., "Living Room") */
  name?: string;
  /** Room number (e.g., "101") */
  number?: string;
  /** Room type (bedroom, bathroom, kitchen, etc.) */
  roomType?: RoomType;
  /** Room height in meters (default 3.0) */
  height: number;
  /** Level ID string */
  levelId?: string;
}

// =============================================================================
// Stair Command
// =============================================================================

export interface CreateStairCommand extends BaseCommand {
  type: "CreateStair";
  /** Position of the stair base */
  position: Point2D;
  /** Number of risers */
  risers: number;
  /** Riser height in meters */
  riserHeight: number;
  /** Tread depth in meters */
  treadDepth: number;
  /** Stair width in meters */
  stairWidth: number;
  /** Stair type/configuration */
  stairType: StairType;
  /** Level ID string */
  levelId?: string;
}

// =============================================================================
// Help Command
// =============================================================================

export interface HelpCommand extends BaseCommand {
  type: "Help";
  topic?: string;
}

// =============================================================================
// Command Union Type
// =============================================================================

export type Command =
  | CreateWallCommand
  | CreateRectWallsCommand
  | ModifyWallCommand
  | CreateFloorCommand
  | CreateRoofCommand
  | CreateRoomCommand
  | CreateStairCommand
  | PlaceDoorCommand
  | ModifyDoorCommand
  | PlaceWindowCommand
  | ModifyWindowCommand
  | CreateOpeningCommand
  | HelpCommand;

// =============================================================================
// Parse Result
// =============================================================================

export interface ParseError {
  message: string;
  line: number;
  column: number;
  tokenValue?: string;
}

export interface ParseResult {
  commands: Command[];
  errors: ParseError[];
  success: boolean;
}

// =============================================================================
// MCP Conversion Helpers
// =============================================================================

export function commandToMcpArgs(cmd: Command): Record<string, unknown> {
  switch (cmd.type) {
    case "CreateWall":
      return {
        start: [cmd.start.x, cmd.start.y],
        end: [cmd.end.x, cmd.end.y],
        height: cmd.height,
        thickness: cmd.thickness,
        ...(cmd.wallType && { wall_type: cmd.wallType }),
        ...(cmd.levelId && { level_id: cmd.levelId }),
        ...(cmd.material && { material: cmd.material }),
      };

    case "CreateRectWalls":
      return {
        min_point: [cmd.minPoint.x, cmd.minPoint.y],
        max_point: [cmd.maxPoint.x, cmd.maxPoint.y],
        height: cmd.height,
        thickness: cmd.thickness,
      };

    case "ModifyWall":
      return {
        element_id: cmd.wallId,
        parameter_name: cmd.propertyName,
        value: cmd.value,
      };

    case "PlaceDoor":
      return {
        ...(cmd.wallRef.uuid && { wall_id: cmd.wallRef.uuid }),
        offset: cmd.offset,
        width: cmd.width,
        height: cmd.height,
        ...(cmd.doorType && { door_type: cmd.doorType }),
        ...(cmd.swing && { swing: cmd.swing }),
      };

    case "ModifyDoor":
      return {
        element_id: cmd.doorId,
        parameter_name: cmd.propertyName,
        value: cmd.value,
      };

    case "PlaceWindow":
      return {
        ...(cmd.wallRef.uuid && { wall_id: cmd.wallRef.uuid }),
        offset: cmd.offset,
        width: cmd.width,
        height: cmd.height,
        sill_height: cmd.sillHeight,
        ...(cmd.windowType && { window_type: cmd.windowType }),
      };

    case "ModifyWindow":
      return {
        element_id: cmd.windowId,
        parameter_name: cmd.propertyName,
        value: cmd.value,
      };

    case "CreateOpening":
      return {
        ...(cmd.wallRef.uuid && { host_id: cmd.wallRef.uuid }),
        offset: cmd.offset,
        width: cmd.width,
        height: cmd.height,
        base_height: cmd.baseHeight,
        opening_type: "generic",
      };

    case "CreateFloor":
      return {
        points: cmd.points.map((p) => [p.x, p.y]),
        thickness: cmd.thickness,
        level: cmd.level,
        ...(cmd.levelId && { level_id: cmd.levelId }),
        ...(cmd.floorType && { floor_type: cmd.floorType }),
      };

    case "CreateRoof":
      return {
        points: cmd.points.map((p) => [p.x, p.y]),
        roof_type: cmd.roofType,
        slope_degrees: cmd.slope,
        overhang: cmd.overhang,
        ...(cmd.ridgeDirection && { ridge_direction: cmd.ridgeDirection }),
        ...(cmd.levelId && { level_id: cmd.levelId }),
      };

    case "CreateRoom":
      return {
        points: cmd.points.map((p) => [p.x, p.y]),
        ...(cmd.name && { name: cmd.name }),
        ...(cmd.number && { number: cmd.number }),
        ...(cmd.roomType && { room_type: cmd.roomType }),
        height: cmd.height,
        ...(cmd.levelId && { level_id: cmd.levelId }),
      };

    case "CreateStair":
      return {
        position: [cmd.position.x, cmd.position.y],
        risers: cmd.risers,
        riser_height: cmd.riserHeight,
        tread_depth: cmd.treadDepth,
        stair_width: cmd.stairWidth,
        stair_type: cmd.stairType,
        ...(cmd.levelId && { level_id: cmd.levelId }),
      };

    case "Help":
      return { topic: cmd.topic };

    default:
      return {};
  }
}
