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

    case "Help":
      return { topic: cmd.topic };

    default:
      return {};
  }
}
