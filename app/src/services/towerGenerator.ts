/**
 * Pensaer BIM Platform - Tower Generator Service
 *
 * Generates complete tower buildings with:
 * - Building container
 * - Multiple levels/floors
 * - Structural grid
 * - Core(s) for vertical circulation
 * - Columns at grid intersections
 * - Floor slabs with core penetrations
 * - Curtain wall facade
 *
 * @module services/towerGenerator
 */

import type {
  TowerConfig,
  TowerGenerationResult,
  BuildingElement,
  GridElement,
  CoreElement,
  GridLine,
  ColumnElement,
  FloorElement,
  CurtainWallElement,
  ElementId,
  LevelId,
} from "../types";
import type { Level } from "../types/store";

// Scale factor: model units are mm
const MM_PER_M = 1000;

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Generate grid line labels
 * @param start - Starting label ("1" for numbers, "A" for letters)
 * @param count - Number of labels to generate
 */
function generateLabels(start: string, count: number): string[] {
  const labels: string[] = [];
  
  if (/^\d+$/.test(start)) {
    // Numeric labels: 1, 2, 3...
    const startNum = parseInt(start, 10);
    for (let i = 0; i < count; i++) {
      labels.push(String(startNum + i));
    }
  } else {
    // Alphabetic labels: A, B, C...
    const startCode = start.toUpperCase().charCodeAt(0);
    for (let i = 0; i < count; i++) {
      labels.push(String.fromCharCode(startCode + i));
    }
  }
  
  return labels;
}

/**
 * Generate a complete tower building
 */
export function generateTower(config: TowerConfig): TowerGenerationResult {
  const {
    name,
    position,
    footprint,
    floorCount,
    floorHeight = 3500, // Default commercial floor height
    groundFloorHeight = 5000, // Ground floor typically taller
    buildingType = "commercial",
    grid,
    core,
    facade,
    generateColumns = true,
    generateSlabs = true,
    generateFacade = true,
  } = config;

  // Calculate building dimensions
  const buildingWidth = footprint.width;
  const buildingDepth = footprint.depth;
  const totalHeight = groundFloorHeight + (floorCount - 1) * floorHeight;
  const footprintArea = (buildingWidth * buildingDepth) / (MM_PER_M * MM_PER_M);
  const grossFloorArea = footprintArea * floorCount;

  // Generate levels
  const levels = generateLevels(floorCount, groundFloorHeight, floorHeight);

  // Generate building element
  const buildingId = generateId("building") as ElementId;
  const building: BuildingElement = {
    id: buildingId,
    type: "building",
    name,
    x: position.x,
    y: position.y,
    width: buildingWidth,
    height: buildingDepth,
    buildingHeight: totalHeight,
    levelCount: floorCount,
    footprintArea,
    grossFloorArea,
    occupancyType: buildingType === "commercial" ? "commercial" : buildingType === "residential" ? "residential" : "mixed",
    structuralSystem: floorCount > 20 ? "core-outrigger" : "frame",
    coreType: "central",
    baseElevation: 0,
    levelIds: levels.map(l => l.id),
    gridIds: [],
    coreIds: [],
    relationships: {},
    issues: [],
    aiSuggestions: [],
    properties: {
      buildingType,
      floorCount,
      totalHeight: totalHeight / MM_PER_M,
      footprintArea,
      grossFloorArea,
    },
  };

  // Generate structural grid
  let gridElement: GridElement | undefined;
  if (grid) {
    gridElement = generateGrid(
      buildingId,
      position,
      buildingWidth,
      buildingDepth,
      grid.xSpacing,
      grid.ySpacing,
      grid.xLabels || "1",
      grid.yLabels || "A"
    );
    building.gridIds = [gridElement.id];
  }

  // Generate core(s)
  const cores: CoreElement[] = [];
  if (core) {
    const coreElement = generateCore(
      buildingId,
      position,
      buildingWidth,
      buildingDepth,
      core,
      levels
    );
    cores.push(coreElement);
    building.coreIds = [coreElement.id];
  }

  // Generate columns at grid intersections
  const columns: ColumnElement[] = [];
  if (generateColumns && gridElement) {
    columns.push(...generateColumnsFromGrid(
      buildingId,
      gridElement,
      position,
      levels,
      cores
    ));
  }

  // Generate floor slabs
  const floors: FloorElement[] = [];
  if (generateSlabs) {
    floors.push(...generateFloorSlabs(
      buildingId,
      position,
      buildingWidth,
      buildingDepth,
      levels,
      cores
    ));
  }

  // Generate curtain wall facade
  const curtainWalls: CurtainWallElement[] = [];
  if (generateFacade && facade?.type === "curtainwall") {
    curtainWalls.push(...generateCurtainWalls(
      buildingId,
      position,
      buildingWidth,
      buildingDepth,
      totalHeight,
      floorCount,
      facade
    ));
  }

  // Calculate total elements
  const totalElements = 1 + // building
    (gridElement ? 1 : 0) +
    cores.length +
    columns.length +
    floors.length +
    curtainWalls.length;

  return {
    building,
    levels,
    grid: gridElement,
    cores,
    columns,
    floors,
    curtainWalls,
    stats: {
      totalElements,
      totalLevels: levels.length,
      grossFloorArea,
      buildingHeight: totalHeight,
    },
  };
}

/**
 * Generate building levels
 */
function generateLevels(
  count: number,
  groundFloorHeight: number,
  typicalFloorHeight: number
): Level[] {
  const levels: Level[] = [];
  let elevation = 0;

  for (let i = 0; i < count; i++) {
    const isGroundFloor = i === 0;
    const height = isGroundFloor ? groundFloorHeight : typicalFloorHeight;
    const levelNum = i + 1;

    levels.push({
      id: `level-${levelNum}` as LevelId,
      name: isGroundFloor ? "Ground Floor" : `Level ${levelNum}`,
      elevation,
      height,
      visible: true,
    });

    elevation += height;
  }

  // Add roof level
  levels.push({
    id: "level-roof" as LevelId,
    name: "Roof Level",
    elevation,
    height: 0,
    visible: true,
  });

  return levels;
}

/**
 * Generate structural grid
 */
function generateGrid(
  buildingId: ElementId,
  position: { x: number; y: number },
  width: number,
  depth: number,
  xSpacing: number,
  ySpacing: number,
  xLabelStart: string,
  yLabelStart: string
): GridElement {
  // Calculate number of grid lines
  const xCount = Math.floor(width / xSpacing) + 1;
  const yCount = Math.floor(depth / ySpacing) + 1;

  // Generate grid lines
  const xLabels = generateLabels(xLabelStart, xCount);
  const yLabels = generateLabels(yLabelStart, yCount);

  const verticalLines: GridLine[] = xLabels.map((label, i) => ({
    id: label,
    position: i * xSpacing,
  }));

  const horizontalLines: GridLine[] = yLabels.map((label, i) => ({
    id: label,
    position: i * ySpacing,
  }));

  return {
    id: generateId("grid") as ElementId,
    type: "grid",
    name: "Structural Grid",
    x: position.x,
    y: position.y,
    width,
    height: depth,
    horizontalLines,
    verticalLines,
    horizontalSpacing: ySpacing,
    verticalSpacing: xSpacing,
    bubbleSize: 1000,
    showBubbles: true,
    lineColor: "#666666",
    buildingId,
    rotation: 0,
    relationships: {},
    issues: [],
    aiSuggestions: [],
    properties: {
      xSpacing,
      ySpacing,
      xCount,
      yCount,
    },
  };
}

/**
 * Generate core element
 */
function generateCore(
  buildingId: ElementId,
  buildingPosition: { x: number; y: number },
  buildingWidth: number,
  buildingDepth: number,
  coreConfig: TowerConfig["core"],
  levels: Level[]
): CoreElement {
  if (!coreConfig) {
    throw new Error("Core config required");
  }

  // Calculate core position based on configuration
  let coreX = buildingPosition.x;
  let coreY = buildingPosition.y;

  switch (coreConfig.position) {
    case "center":
      coreX += (buildingWidth - coreConfig.width) / 2;
      coreY += (buildingDepth - coreConfig.depth) / 2;
      break;
    case "north":
      coreX += (buildingWidth - coreConfig.width) / 2;
      coreY += buildingDepth - coreConfig.depth - 1000; // 1m from edge
      break;
    case "south":
      coreX += (buildingWidth - coreConfig.width) / 2;
      coreY += 1000;
      break;
    case "east":
      coreX += buildingWidth - coreConfig.width - 1000;
      coreY += (buildingDepth - coreConfig.depth) / 2;
      break;
    case "west":
      coreX += 1000;
      coreY += (buildingDepth - coreConfig.depth) / 2;
      break;
  }

  const fromLevel = levels[0]?.id;
  const toLevel = levels[levels.length - 1]?.id;

  return {
    id: generateId("core") as ElementId,
    type: "core",
    name: "Main Core",
    x: coreX,
    y: coreY,
    width: coreConfig.width,
    height: coreConfig.depth,
    coreType: coreConfig.type,
    elevatorCount: coreConfig.elevatorCount || 4,
    stairCount: coreConfig.stairCount || 2,
    wallThickness: 300, // 300mm core walls
    isFireRated: true,
    fireRating: 120, // 2-hour fire rating
    fromLevel,
    toLevel,
    isPressurized: true,
    buildingId,
    rotation: 0,
    relationships: {},
    issues: [],
    aiSuggestions: [],
    properties: {
      coreType: coreConfig.type,
      position: coreConfig.position,
      elevatorCount: coreConfig.elevatorCount || 4,
      stairCount: coreConfig.stairCount || 2,
    },
  };
}

/**
 * Generate columns at grid intersections
 */
function generateColumnsFromGrid(
  buildingId: ElementId,
  grid: GridElement,
  position: { x: number; y: number },
  levels: Level[],
  cores: CoreElement[]
): ColumnElement[] {
  const columns: ColumnElement[] = [];
  const columnSize = 600; // 600mm square columns

  // Get core bounds for collision detection
  const coreBounds = cores.map(core => ({
    minX: core.x,
    maxX: core.x + core.width,
    minY: core.y,
    maxY: core.y + core.height,
  }));

  // Generate columns at each grid intersection
  for (const vLine of grid.verticalLines) {
    for (const hLine of grid.horizontalLines) {
      const colX = position.x + vLine.position;
      const colY = position.y + hLine.position;

      // Check if column is inside a core (skip if so)
      const insideCore = coreBounds.some(bounds =>
        colX >= bounds.minX &&
        colX <= bounds.maxX &&
        colY >= bounds.minY &&
        colY <= bounds.maxY
      );

      if (insideCore) continue;

      // Create column for each floor (except roof)
      for (let i = 0; i < levels.length - 1; i++) {
        const level = levels[i];
        const nextLevel = levels[i + 1];

        columns.push({
          id: generateId("column") as ElementId,
          type: "column",
          name: `Column ${vLine.id}-${hLine.id} @ ${level.name}`,
          x: colX - columnSize / 2,
          y: colY - columnSize / 2,
          width: columnSize,
          height: columnSize,
          depth: columnSize,
          shape: "rectangular",
          material: "concrete",
          baseElevation: level.elevation,
          topElevation: nextLevel.elevation,
          level: level.id,
          rotation: 0,
          relationships: {
            containedIn: [buildingId],
          },
          issues: [],
          aiSuggestions: [],
          properties: {
            gridX: vLine.id,
            gridY: hLine.id,
            level: level.name,
            columnHeight: nextLevel.elevation - level.elevation,
          },
        });
      }
    }
  }

  return columns;
}

/**
 * Generate floor slabs
 */
function generateFloorSlabs(
  buildingId: ElementId,
  position: { x: number; y: number },
  width: number,
  depth: number,
  levels: Level[],
  cores: CoreElement[]
): FloorElement[] {
  const floors: FloorElement[] = [];
  const slabThickness = 200; // 200mm slab

  // Generate slab for each level (except roof)
  for (let i = 0; i < levels.length - 1; i++) {
    const level = levels[i];
    const area = (width * depth) / (MM_PER_M * MM_PER_M);

    // Subtract core areas
    let netArea = area;
    for (const core of cores) {
      const coreArea = (core.width * core.height) / (MM_PER_M * MM_PER_M);
      netArea -= coreArea;
    }

    floors.push({
      id: generateId("floor") as ElementId,
      type: "floor",
      name: `Floor Slab @ ${level.name}`,
      x: position.x,
      y: position.y,
      width,
      height: depth,
      thickness: slabThickness,
      area: netArea,
      elevation: level.elevation,
      level: level.id,
      finishMaterial: i === 0 ? "stone" : "carpet",
      loadCapacity: 5, // 5 kN/m² live load
      rotation: 0,
      relationships: {
        containedIn: [buildingId],
      },
      issues: [],
      aiSuggestions: [],
      properties: {
        level: level.name,
        grossArea: area,
        netArea,
        slabThickness: slabThickness,
        hasCorePenetrations: cores.length > 0,
      },
    });
  }

  return floors;
}

/**
 * Generate curtain wall facade
 */
function generateCurtainWalls(
  buildingId: ElementId,
  position: { x: number; y: number },
  width: number,
  depth: number,
  height: number,
  floorCount: number,
  facade: NonNullable<TowerConfig["facade"]>
): CurtainWallElement[] {
  const walls: CurtainWallElement[] = [];
  const panelWidth = facade.panelWidth || 1500; // 1.5m default panel width
  const glassType = facade.glassType || "low-e";

  // Calculate divisions
  const uDivisions = floorCount; // One division per floor
  const vDivisionsNorth = Math.ceil(width / panelWidth);
  const vDivisionsEast = Math.ceil(depth / panelWidth);

  // North facade
  walls.push({
    id: generateId("cw") as ElementId,
    type: "curtainwall",
    name: "North Facade",
    x: position.x,
    y: position.y + depth,
    width,
    height: 100, // 2D representation
    uDivisions,
    vDivisions: vDivisionsNorth,
    systemHeight: height,
    panelType: "glass",
    glassType,
    mullionWidth: 50,
    mullionDepth: 150,
    panelThickness: 32,
    uValue: 1.4,
    shgc: 0.25,
    vlt: 0.6,
    isUnitized: true,
    baseElevation: 0,
    startPoint: { x: position.x, y: position.y + depth },
    endPoint: { x: position.x + width, y: position.y + depth },
    rotation: 0,
    relationships: {
      containedIn: [buildingId],
    },
    issues: [],
    aiSuggestions: [],
    properties: {
      facade: "north",
      panelCount: uDivisions * vDivisionsNorth,
      glassType,
    },
  });

  // South facade
  walls.push({
    id: generateId("cw") as ElementId,
    type: "curtainwall",
    name: "South Facade",
    x: position.x,
    y: position.y,
    width,
    height: 100,
    uDivisions,
    vDivisions: vDivisionsNorth,
    systemHeight: height,
    panelType: "glass",
    glassType,
    mullionWidth: 50,
    mullionDepth: 150,
    panelThickness: 32,
    uValue: 1.4,
    shgc: 0.25,
    vlt: 0.6,
    isUnitized: true,
    baseElevation: 0,
    startPoint: { x: position.x, y: position.y },
    endPoint: { x: position.x + width, y: position.y },
    rotation: 0,
    relationships: {
      containedIn: [buildingId],
    },
    issues: [],
    aiSuggestions: [],
    properties: {
      facade: "south",
      panelCount: uDivisions * vDivisionsNorth,
      glassType,
    },
  });

  // East facade
  walls.push({
    id: generateId("cw") as ElementId,
    type: "curtainwall",
    name: "East Facade",
    x: position.x + width,
    y: position.y,
    width: depth,
    height: 100,
    uDivisions,
    vDivisions: vDivisionsEast,
    systemHeight: height,
    panelType: "glass",
    glassType,
    mullionWidth: 50,
    mullionDepth: 150,
    panelThickness: 32,
    uValue: 1.4,
    shgc: 0.25,
    vlt: 0.6,
    isUnitized: true,
    baseElevation: 0,
    startPoint: { x: position.x + width, y: position.y },
    endPoint: { x: position.x + width, y: position.y + depth },
    rotation: 90,
    relationships: {
      containedIn: [buildingId],
    },
    issues: [],
    aiSuggestions: [],
    properties: {
      facade: "east",
      panelCount: uDivisions * vDivisionsEast,
      glassType,
    },
  });

  // West facade
  walls.push({
    id: generateId("cw") as ElementId,
    type: "curtainwall",
    name: "West Facade",
    x: position.x,
    y: position.y,
    width: depth,
    height: 100,
    uDivisions,
    vDivisions: vDivisionsEast,
    systemHeight: height,
    panelType: "glass",
    glassType,
    mullionWidth: 50,
    mullionDepth: 150,
    panelThickness: 32,
    uValue: 1.4,
    shgc: 0.25,
    vlt: 0.6,
    isUnitized: true,
    baseElevation: 0,
    startPoint: { x: position.x, y: position.y },
    endPoint: { x: position.x, y: position.y + depth },
    rotation: 90,
    relationships: {
      containedIn: [buildingId],
    },
    issues: [],
    aiSuggestions: [],
    properties: {
      facade: "west",
      panelCount: uDivisions * vDivisionsEast,
      glassType,
    },
  });

  return walls;
}

/**
 * Quick tower preset configurations
 */
export const TOWER_PRESETS = {
  smallOffice: {
    name: "Small Office Tower",
    footprint: { width: 20000, depth: 15000 }, // 20m x 15m
    floorCount: 8,
    floorHeight: 3800,
    groundFloorHeight: 5000,
    buildingType: "commercial" as const,
    grid: { xSpacing: 8000, ySpacing: 8000, xLabels: "1", yLabels: "A" },
    core: { type: "combined" as const, position: "center" as const, width: 6000, depth: 6000, elevatorCount: 2, stairCount: 2 },
    facade: { type: "curtainwall" as const, panelWidth: 1500, glassType: "low-e" as const },
    generateColumns: true,
    generateSlabs: true,
    generateFacade: true,
  },
  residentialTower: {
    name: "Residential Tower",
    footprint: { width: 25000, depth: 20000 }, // 25m x 20m
    floorCount: 20,
    floorHeight: 3000,
    groundFloorHeight: 4500,
    buildingType: "residential" as const,
    grid: { xSpacing: 8500, ySpacing: 6500, xLabels: "1", yLabels: "A" },
    core: { type: "combined" as const, position: "center" as const, width: 8000, depth: 6000, elevatorCount: 3, stairCount: 2 },
    facade: { type: "curtainwall" as const, panelWidth: 1200, glassType: "clear" as const },
    generateColumns: true,
    generateSlabs: true,
    generateFacade: true,
  },
  commercialHighrise: {
    name: "Commercial Highrise",
    footprint: { width: 45000, depth: 30000 }, // 45m x 30m
    floorCount: 40,
    floorHeight: 4000,
    groundFloorHeight: 6000,
    buildingType: "commercial" as const,
    grid: { xSpacing: 9000, ySpacing: 9000, xLabels: "1", yLabels: "A" },
    core: { type: "combined" as const, position: "center" as const, width: 15000, depth: 12000, elevatorCount: 8, stairCount: 4 },
    facade: { type: "curtainwall" as const, panelWidth: 1500, glassType: "reflective" as const },
    generateColumns: true,
    generateSlabs: true,
    generateFacade: true,
  },
} as const;

export type TowerPresetName = keyof typeof TOWER_PRESETS;
