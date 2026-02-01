/**
 * Tower Building Command Handlers
 *
 * DSL commands for tower/building creation and management.
 * Includes: tower, grid, core, level, propagate
 */

import {
  registerCommand,
  type CommandResult,
  type CommandContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useHistoryStore } from "../../stores/historyStore";
import { generateTower, TOWER_PRESETS, type TowerPresetName } from "../../services/towerGenerator";
import type { TowerConfig, GridElement, CoreElement, Level } from "../../types";

// Scale factor: 100 pixels per meter for 2D canvas
const SCALE = 100;
const MM_PER_M = 1000;

// ============================================
// TOWER COMMAND
// ============================================

/**
 * Create a complete tower building
 *
 * Usage:
 *   tower --preset small-office
 *   tower --preset residential --floors 25
 *   tower --name "Tower A" --width 30 --depth 20 --floors 15
 *   tower --name "Custom" --width 40 --depth 30 --floors 30 --grid 9,9 --core center,8,6
 */
async function towerHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  // Check for preset
  const presetName = args.preset as string | undefined;
  let config: TowerConfig;

  if (presetName) {
    // Map preset names to keys
    const presetMap: Record<string, TowerPresetName> = {
      "small-office": "smallOffice",
      "smalloffice": "smallOffice",
      "office": "smallOffice",
      "residential": "residentialTower",
      "residential-tower": "residentialTower",
      "apartment": "residentialTower",
      "commercial": "commercialHighrise",
      "commercial-highrise": "commercialHighrise",
      "highrise": "commercialHighrise",
    };

    const mappedPreset = presetMap[presetName.toLowerCase()];
    if (!mappedPreset) {
      return {
        success: false,
        message: `Unknown preset: ${presetName}. Available: small-office, residential, commercial-highrise`,
      };
    }

    const preset = TOWER_PRESETS[mappedPreset];
    config = {
      ...preset,
      position: {
        x: ((args.x as number) || 0) * MM_PER_M,
        y: ((args.y as number) || 0) * MM_PER_M,
      },
    };

    // Allow overrides
    if (args.floors) config.floorCount = args.floors as number;
    if (args.name) config.name = args.name as string;
  } else {
    // Custom tower configuration
    const name = (args.name as string) || "Tower";
    const width = (args.width as number) || 20;
    const depth = (args.depth as number) || 15;
    const floors = (args.floors as number) || 10;
    const floorHeight = (args["floor-height"] as number) || (args.floorHeight as number) || 3.5;
    const groundFloorHeight = (args["ground-height"] as number) || (args.groundHeight as number) || 5;
    const buildingType = (args.type as string) || "commercial";

    // Parse grid: "8,8" or "--grid-x 8 --grid-y 8"
    let gridConfig: TowerConfig["grid"] | undefined;
    const gridArg = args.grid as string | undefined;
    if (gridArg) {
      const [gx, gy] = gridArg.split(",").map(Number);
      gridConfig = {
        xSpacing: (gx || 8) * MM_PER_M,
        ySpacing: (gy || gx || 8) * MM_PER_M,
        xLabels: "1",
        yLabels: "A",
      };
    } else if (args["grid-x"] || args["grid-y"]) {
      gridConfig = {
        xSpacing: ((args["grid-x"] as number) || 8) * MM_PER_M,
        ySpacing: ((args["grid-y"] as number) || 8) * MM_PER_M,
        xLabels: "1",
        yLabels: "A",
      };
    }

    // Parse core: "center,6,6" or individual args
    let coreConfig: TowerConfig["core"] | undefined;
    const coreArg = args.core as string | undefined;
    if (coreArg) {
      const parts = coreArg.split(",");
      const position = parts[0] as "center" | "north" | "south" | "east" | "west";
      const coreWidth = parseFloat(parts[1] || "6") * MM_PER_M;
      const coreDepth = parseFloat(parts[2] || parts[1] || "6") * MM_PER_M;
      coreConfig = {
        type: "combined",
        position: position || "center",
        width: coreWidth,
        depth: coreDepth,
        elevatorCount: floors > 20 ? 4 : 2,
        stairCount: 2,
      };
    } else if (args["core-position"]) {
      coreConfig = {
        type: "combined",
        position: (args["core-position"] as string) as "center" | "north" | "south" | "east" | "west",
        width: ((args["core-width"] as number) || 6) * MM_PER_M,
        depth: ((args["core-depth"] as number) || 6) * MM_PER_M,
        elevatorCount: floors > 20 ? 4 : 2,
        stairCount: 2,
      };
    } else {
      // Default core
      coreConfig = {
        type: "combined",
        position: "center",
        width: Math.min(width * 0.3, 8) * MM_PER_M,
        depth: Math.min(depth * 0.3, 6) * MM_PER_M,
        elevatorCount: floors > 20 ? 4 : 2,
        stairCount: 2,
      };
    }

    // Facade config
    const facadeType = (args.facade as string) || "curtainwall";
    const facadeConfig: TowerConfig["facade"] = facadeType === "curtainwall" ? {
      type: "curtainwall",
      panelWidth: ((args["panel-width"] as number) || 1.5) * MM_PER_M,
      glassType: (args["glass-type"] as string) as "clear" | "tinted" | "reflective" | "low-e" || "low-e",
    } : undefined;

    config = {
      name,
      position: {
        x: ((args.x as number) || 0) * MM_PER_M,
        y: ((args.y as number) || 0) * MM_PER_M,
      },
      footprint: {
        width: width * MM_PER_M,
        depth: depth * MM_PER_M,
      },
      floorCount: floors,
      floorHeight: floorHeight * MM_PER_M,
      groundFloorHeight: groundFloorHeight * MM_PER_M,
      buildingType: buildingType as "residential" | "commercial" | "mixed",
      grid: gridConfig,
      core: coreConfig,
      facade: facadeConfig,
      generateColumns: args["no-columns"] !== true,
      generateSlabs: args["no-slabs"] !== true,
      generateFacade: args["no-facade"] !== true,
    };
  }

  // Generate the tower
  try {
    const result = generateTower(config);
    const modelStore = useModelStore.getState();

    // Convert mm coordinates to canvas units (SCALE / MM_PER_M = 0.1)
    // Canvas3D uses scale=0.01, so mm * 0.1 * 0.01 = mm * 0.001 = meters in 3D ✓
    const mmToCanvas = (mm: number) => mm * SCALE / MM_PER_M;

    // Convert spatial fields (x, y, width, height) from mm to canvas coordinates
    const convertElement = <T extends { x: number; y: number; width: number; height: number }>(el: T): T => ({
      ...el,
      x: mmToCanvas(el.x),
      y: mmToCanvas(el.y),
      width: mmToCanvas(el.width),
      height: mmToCanvas(el.height),
    });

    // Add building
    modelStore.addElement(convertElement(result.building));

    // Add levels
    for (const level of result.levels) {
      modelStore.addLevel(level);
    }

    // Add grid if generated
    if (result.grid) {
      modelStore.addElement(convertElement(result.grid));
    }

    // Add cores
    for (const core of result.cores) {
      modelStore.addElement(convertElement(core));
    }

    // Add columns
    for (const column of result.columns) {
      modelStore.addElement(convertElement(column));
    }

    // Add floors
    for (const floor of result.floors) {
      modelStore.addElement(convertElement(floor));
    }

    // Add curtain walls
    for (const cw of result.curtainWalls) {
      modelStore.addElement(convertElement(cw));
    }

    // Record history
    useHistoryStore.getState().recordAction(
      `Create tower: ${config.name} (${config.floorCount} floors, ${result.stats.totalElements} elements)`
    );

    return {
      success: true,
      message: `Created tower: ${config.name}`,
      data: {
        building_id: result.building.id,
        name: config.name,
        floors: config.floorCount,
        height_m: result.stats.buildingHeight / MM_PER_M,
        gross_floor_area_m2: result.stats.grossFloorArea,
        total_elements: result.stats.totalElements,
        total_levels: result.stats.totalLevels,
        columns: result.columns.length,
        floor_slabs: result.floors.length,
        curtain_walls: result.curtainWalls.length,
        cores: result.cores.length,
        has_grid: !!result.grid,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Tower generation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================
// GRID COMMAND
// ============================================

/**
 * Create a structural grid
 *
 * Usage:
 *   grid --width 30 --depth 20 --spacing 8
 *   grid --width 40 --depth 30 --x-spacing 9 --y-spacing 8
 */
async function gridHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const width = ((args.width as number) || 20) * MM_PER_M;
  const depth = ((args.depth as number) || 15) * MM_PER_M;
  const xSpacing = ((args["x-spacing"] as number) || (args.spacing as number) || 8) * MM_PER_M;
  const ySpacing = ((args["y-spacing"] as number) || (args.spacing as number) || 8) * MM_PER_M;
  const posX = ((args.x as number) || 0) * MM_PER_M;
  const posY = ((args.y as number) || 0) * MM_PER_M;

  // Calculate grid lines
  const xCount = Math.floor(width / xSpacing) + 1;
  const yCount = Math.floor(depth / ySpacing) + 1;

  const verticalLines = Array.from({ length: xCount }, (_, i) => ({
    id: String(i + 1),
    position: i * xSpacing,
  }));

  const horizontalLines = Array.from({ length: yCount }, (_, i) => ({
    id: String.fromCharCode(65 + i), // A, B, C...
    position: i * ySpacing,
  }));

  const gridElement: GridElement = {
    id: `grid-${crypto.randomUUID().slice(0, 8)}`,
    type: "grid",
    name: (args.name as string) || "Structural Grid",
    x: posX,
    y: posY,
    width,
    height: depth,
    horizontalLines,
    verticalLines,
    horizontalSpacing: ySpacing,
    verticalSpacing: xSpacing,
    bubbleSize: 1000,
    showBubbles: true,
    lineColor: "#666666",
    rotation: 0,
    relationships: {},
    issues: [],
    aiSuggestions: [],
    properties: {
      xSpacing: xSpacing / MM_PER_M,
      ySpacing: ySpacing / MM_PER_M,
      xCount,
      yCount,
    },
  };

  useModelStore.getState().addElement(gridElement);
  useHistoryStore.getState().recordAction(`Create grid: ${xCount}×${yCount}`);

  return {
    success: true,
    message: `Created structural grid: ${xCount}×${yCount}`,
    data: {
      grid_id: gridElement.id,
      x_lines: xCount,
      y_lines: yCount,
      x_spacing_m: xSpacing / MM_PER_M,
      y_spacing_m: ySpacing / MM_PER_M,
    },
    elementCreated: { id: gridElement.id, type: "grid" },
  };
}

// ============================================
// CORE COMMAND
// ============================================

/**
 * Create a vertical circulation core
 *
 * Usage:
 *   core --x 10 --y 8 --width 6 --depth 6
 *   core --x 10 --y 8 --width 8 --depth 6 --type combined --elevators 4 --stairs 2
 */
async function coreHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const posX = ((args.x as number) || 0) * MM_PER_M;
  const posY = ((args.y as number) || 0) * MM_PER_M;
  const width = ((args.width as number) || 6) * MM_PER_M;
  const depth = ((args.depth as number) || 6) * MM_PER_M;
  const coreType = (args.type as string) || "combined";
  const elevatorCount = (args.elevators as number) || 2;
  const stairCount = (args.stairs as number) || 2;
  const fireRating = (args["fire-rating"] as number) || 120;

  const coreElement: CoreElement = {
    id: `core-${crypto.randomUUID().slice(0, 8)}`,
    type: "core",
    name: (args.name as string) || "Core",
    x: posX,
    y: posY,
    width,
    height: depth,
    coreType: coreType as "elevator" | "stair" | "service" | "combined",
    elevatorCount,
    stairCount,
    wallThickness: 300,
    isFireRated: true,
    fireRating,
    isPressurized: true,
    rotation: 0,
    relationships: {},
    issues: [],
    aiSuggestions: [],
    properties: {
      coreType,
      elevatorCount,
      stairCount,
      fireRating,
    },
  };

  useModelStore.getState().addElement(coreElement);
  useHistoryStore.getState().recordAction(`Create core: ${coreType}`);

  return {
    success: true,
    message: `Created ${coreType} core`,
    data: {
      core_id: coreElement.id,
      type: coreType,
      width_m: width / MM_PER_M,
      depth_m: depth / MM_PER_M,
      elevators: elevatorCount,
      stairs: stairCount,
    },
    elementCreated: { id: coreElement.id, type: "core" },
  };
}

// ============================================
// LEVEL COMMAND
// ============================================

/**
 * Create or manage building levels
 *
 * Usage:
 *   level --name "Level 3" --elevation 6000 --height 3500
 *   level --add --count 10 --start-elevation 0 --height 3500
 *   level --list
 */
async function levelHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const modelStore = useModelStore.getState();

  // List levels
  if (args.list) {
    const levels = modelStore.getLevelsOrdered();
    return {
      success: true,
      message: `${levels.length} levels in model`,
      data: {
        levels: levels.map(l => ({
          id: l.id,
          name: l.name,
          elevation_mm: l.elevation,
          elevation_m: l.elevation / MM_PER_M,
          height_mm: l.height,
        })),
      },
    };
  }

  // Add multiple levels
  if (args.add && args.count) {
    const count = args.count as number;
    const startElevation = ((args["start-elevation"] as number) || 0) * MM_PER_M;
    const height = ((args.height as number) || 3.5) * MM_PER_M;
    const startNum = (args["start-num"] as number) || 1;

    const newLevels: Level[] = [];
    let elevation = startElevation;

    for (let i = 0; i < count; i++) {
      const levelNum = startNum + i;
      const level: Level = {
        id: `level-${levelNum}` as import("../../types").LevelId,
        name: levelNum === 1 ? "Ground Floor" : `Level ${levelNum}`,
        elevation,
        height,
        visible: true,
      };
      newLevels.push(level);
      modelStore.addLevel(level);
      elevation += height;
    }

    useHistoryStore.getState().recordAction(`Add ${count} levels`);

    return {
      success: true,
      message: `Added ${count} levels`,
      data: {
        levels_added: count,
        start_elevation_m: startElevation / MM_PER_M,
        end_elevation_m: elevation / MM_PER_M,
        floor_height_m: height / MM_PER_M,
      },
    };
  }

  // Create single level
  const name = (args.name as string) || `Level ${modelStore.levels.length + 1}`;
  const elevation = ((args.elevation as number) || 0) * MM_PER_M;
  const height = ((args.height as number) || 3.5) * MM_PER_M;

  const level: Level = {
    id: `level-${crypto.randomUUID().slice(0, 8)}` as import("../../types").LevelId,
    name,
    elevation,
    height,
    visible: true,
  };

  modelStore.addLevel(level);
  useHistoryStore.getState().recordAction(`Create level: ${name}`);

  return {
    success: true,
    message: `Created level: ${name}`,
    data: {
      level_id: level.id,
      name,
      elevation_m: elevation / MM_PER_M,
      height_m: height / MM_PER_M,
    },
  };
}

// ============================================
// PROPAGATE COMMAND
// ============================================

/**
 * Copy elements to multiple levels
 *
 * Usage:
 *   propagate --element wall-1234 --to-levels level-2,level-3,level-4
 *   propagate --element wall-1234 --levels 2-10
 *   propagate --selection --levels 2-5
 */
async function propagateHandler(
  args: Record<string, unknown>,
  context: CommandContext
): Promise<CommandResult> {
  const modelStore = useModelStore.getState();
  const levels = modelStore.getLevelsOrdered();

  // Get source elements
  let sourceIds: string[] = [];
  
  if (args.selection) {
    sourceIds = Array.from(context.selectedElements || []);
    if (sourceIds.length === 0) {
      return {
        success: false,
        message: "No elements selected. Select elements first or use --element",
      };
    }
  } else if (args.element) {
    sourceIds = [(args.element as string)];
  } else {
    return {
      success: false,
      message: "Specify --element <id> or --selection",
    };
  }

  // Get target levels
  let targetLevelIds: string[] = [];

  if (args["to-levels"]) {
    targetLevelIds = (args["to-levels"] as string).split(",");
  } else if (args.levels) {
    const levelsArg = args.levels as string;
    if (levelsArg.includes("-")) {
      // Range: "2-10"
      const [start, end] = levelsArg.split("-").map(Number);
      for (let i = start; i <= end; i++) {
        targetLevelIds.push(`level-${i}`);
      }
    } else {
      targetLevelIds = levelsArg.split(",").map(l => `level-${l}`);
    }
  } else {
    return {
      success: false,
      message: "Specify target levels with --levels or --to-levels",
    };
  }

  // Get source elements
  const sourceElements = sourceIds
    .map(id => modelStore.getElementById(id))
    .filter(Boolean);

  if (sourceElements.length === 0) {
    return {
      success: false,
      message: "No valid source elements found",
    };
  }

  // Copy elements to each target level
  let copiedCount = 0;
  const copiedElements: string[] = [];

  for (const levelId of targetLevelIds) {
    const targetLevel = levels.find(l => l.id === levelId);
    if (!targetLevel) continue;

    for (const source of sourceElements) {
      if (!source) continue;

      // Calculate elevation offset
      const sourceLevelId = source.level;
      const sourceLevel = levels.find(l => l.id === sourceLevelId);
      const elevationOffset = targetLevel.elevation - (sourceLevel?.elevation || 0);

      // Create copy with new ID and level
      const copy = {
        ...source,
        id: `${source.type}-${crypto.randomUUID().slice(0, 8)}`,
        name: `${source.name} @ ${targetLevel.name}`,
        level: levelId,
        properties: {
          ...source.properties,
          level: targetLevel.name,
          copiedFrom: source.id,
        },
      };

      // Adjust elevation-related properties
      if ("baseElevation" in copy && typeof copy.baseElevation === "number") {
        (copy as any).baseElevation += elevationOffset;
      }
      if ("topElevation" in copy && typeof copy.topElevation === "number") {
        (copy as any).topElevation += elevationOffset;
      }
      if ("elevation" in copy && typeof copy.elevation === "number") {
        (copy as any).elevation = targetLevel.elevation;
      }

      modelStore.addElement(copy as any);
      copiedElements.push(copy.id);
      copiedCount++;
    }
  }

  useHistoryStore.getState().recordAction(
    `Propagate ${sourceElements.length} elements to ${targetLevelIds.length} levels`
  );

  return {
    success: true,
    message: `Propagated ${sourceElements.length} elements to ${targetLevelIds.length} levels (${copiedCount} copies)`,
    data: {
      source_count: sourceElements.length,
      target_levels: targetLevelIds.length,
      total_copies: copiedCount,
      copied_element_ids: copiedElements,
    },
  };
}

// ============================================
// BUILDING COMMAND
// ============================================

/**
 * Create a building container element
 *
 * Usage:
 *   building --name "Tower A" --width 30 --depth 20 --floors 15
 */
async function buildingHandler(
  args: Record<string, unknown>,
  _context: CommandContext
): Promise<CommandResult> {
  const name = (args.name as string) || "Building";
  const width = ((args.width as number) || 20) * MM_PER_M;
  const depth = ((args.depth as number) || 15) * MM_PER_M;
  const floors = (args.floors as number) || 1;
  const floorHeight = ((args["floor-height"] as number) || 3.5) * MM_PER_M;
  const groundFloorHeight = ((args["ground-height"] as number) || 5) * MM_PER_M;

  const buildingHeight = groundFloorHeight + (floors - 1) * floorHeight;
  const footprintArea = (width * depth) / (MM_PER_M * MM_PER_M);
  const grossFloorArea = footprintArea * floors;

  const buildingElement: import("../../types").BuildingElement = {
    id: `building-${crypto.randomUUID().slice(0, 8)}` as import("../../types").ElementId,
    type: "building",
    name,
    x: ((args.x as number) || 0) * MM_PER_M,
    y: ((args.y as number) || 0) * MM_PER_M,
    width,
    height: depth,
    buildingHeight,
    levelCount: floors,
    footprintArea,
    grossFloorArea,
    occupancyType: (args.type as string) as any || "commercial",
    structuralSystem: floors > 20 ? "core-outrigger" : "frame",
    coreType: "central",
    baseElevation: 0,
    rotation: 0,
    relationships: {},
    issues: [],
    aiSuggestions: [],
    properties: {
      floors,
      buildingHeight: buildingHeight / MM_PER_M,
      footprintArea,
      grossFloorArea,
    },
  };

  useModelStore.getState().addElement(buildingElement);
  useHistoryStore.getState().recordAction(`Create building: ${name}`);

  return {
    success: true,
    message: `Created building: ${name}`,
    data: {
      building_id: buildingElement.id,
      name,
      floors,
      height_m: buildingHeight / MM_PER_M,
      footprint_area_m2: footprintArea,
      gross_floor_area_m2: grossFloorArea,
    },
    elementCreated: { id: buildingElement.id, type: "building" },
  };
}

// ============================================
// REGISTER COMMANDS
// ============================================

export function registerTowerCommands(): void {
  registerCommand({
    name: "tower",
    description: "Create a complete tower building with all components",
    usage: "tower --preset <preset> | tower --name <name> --width <m> --depth <m> --floors <n>",
    examples: [
      "tower --preset small-office",
      "tower --preset residential --floors 25",
      "tower --name 'Tower A' --width 30 --depth 20 --floors 15",
      "tower --name 'Custom' --width 40 --depth 30 --floors 30 --grid 9,9 --core center,8,6",
    ],
    handler: towerHandler,
  });

  registerCommand({
    name: "grid",
    description: "Create a structural grid for column/beam placement",
    usage: "grid --width <m> --depth <m> --spacing <m>",
    examples: [
      "grid --width 30 --depth 20 --spacing 8",
      "grid --width 40 --depth 30 --x-spacing 9 --y-spacing 8",
    ],
    handler: gridHandler,
  });

  registerCommand({
    name: "core",
    description: "Create a vertical circulation core (elevators/stairs)",
    usage: "core --x <m> --y <m> --width <m> --depth <m>",
    examples: [
      "core --x 10 --y 8 --width 6 --depth 6",
      "core --x 10 --y 8 --width 8 --depth 6 --type combined --elevators 4 --stairs 2",
    ],
    handler: coreHandler,
  });

  registerCommand({
    name: "level",
    description: "Create or manage building levels",
    usage: "level --name <name> --elevation <mm> --height <mm> | level --list",
    examples: [
      "level --name 'Level 3' --elevation 6 --height 3.5",
      "level --add --count 10 --start-elevation 0 --height 3.5",
      "level --list",
    ],
    handler: levelHandler,
  });

  registerCommand({
    name: "propagate",
    description: "Copy elements to multiple levels",
    usage: "propagate --element <id> --levels <range> | propagate --selection --levels <range>",
    examples: [
      "propagate --element wall-1234 --levels 2-10",
      "propagate --selection --levels 2-5",
      "propagate --element wall-1234 --to-levels level-2,level-3,level-4",
    ],
    handler: propagateHandler,
  });

  registerCommand({
    name: "building",
    description: "Create a building container element",
    usage: "building --name <name> --width <m> --depth <m> --floors <n>",
    examples: [
      "building --name 'Tower A' --width 30 --depth 20 --floors 15",
    ],
    handler: buildingHandler,
  });
}
