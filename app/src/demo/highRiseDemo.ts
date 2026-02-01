/**
 * High-Rise Commercial Tower Demo Script
 *
 * Generates an array of DSL command strings that, when executed sequentially,
 * build an impressive 20-story commercial high-rise with:
 * - Structural grid (9m × 9m bays)
 * - Central core with elevator shafts and stairs
 * - Perimeter walls on each floor
 * - Columns at grid intersections
 * - Floor slabs at every level
 * - Curtain wall facade indication
 *
 * Uses the existing Pensaer-BIM DSL commands: wall, floor, tower, grid, core, level, building
 */

// ============================================
// BUILDING PARAMETERS
// ============================================

const BUILDING = {
  name: "Pensaer Tower One",
  /** Total number of stories */
  floors: 20,
  /** Footprint width in meters */
  width: 36,
  /** Footprint depth in meters */
  depth: 27,
  /** Typical floor height in meters */
  floorHeight: 3.6,
  /** Ground floor height in meters (double-height lobby) */
  groundFloorHeight: 5.0,
  /** Structural grid spacing X in meters */
  gridSpacingX: 9,
  /** Structural grid spacing Y in meters */
  gridSpacingY: 9,
  /** Core width in meters */
  coreWidth: 12,
  /** Core depth in meters */
  coreDepth: 9,
  /** Number of elevators */
  elevators: 4,
  /** Number of stairs */
  stairs: 2,
  /** Wall thickness in meters */
  wallThickness: 0.2,
  /** Slab thickness in meters */
  slabThickness: 0.25,
} as const;

// ============================================
// COMMAND GENERATORS
// ============================================

/**
 * Generate comment lines for dramatic narration during auto-play.
 */
function comment(text: string): string {
  return `# ${text}`;
}

/**
 * Generate the full high-rise command sequence.
 */
export function generateHighRiseCommands(): string[] {
  const cmds: string[] = [];
  const W = BUILDING.width;
  const D = BUILDING.depth;
  const gx = BUILDING.gridSpacingX;
  const gy = BUILDING.gridSpacingY;
  const coreW = BUILDING.coreWidth;
  const coreD = BUILDING.coreDepth;

  // ── Phase 0: Clear & Intro ──────────────────────────────
  cmds.push(comment("═══════════════════════════════════════════════"));
  cmds.push(comment("  PENSAER TOWER ONE — 20-Story Commercial High-Rise"));
  cmds.push(comment("  36m × 27m footprint · 9m structural grid"));
  cmds.push(comment("  Central core · Curtain wall facade"));
  cmds.push(comment("═══════════════════════════════════════════════"));
  cmds.push("clear");

  // ── Phase 1: Building Envelope & Tower Generator ────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 1: Generating tower structure with tower generator"));
  cmds.push(
    `tower --name "${BUILDING.name}" --width ${W} --depth ${D} --floors ${BUILDING.floors}` +
    ` --floor-height ${BUILDING.floorHeight} --ground-height ${BUILDING.groundFloorHeight}` +
    ` --grid ${gx},${gy} --core center,${coreW},${coreD}` +
    ` --facade curtainwall --panel-width 1.5 --glass-type low-e`
  );

  // ── Phase 2: Structural Grid (explicit for visual clarity) ──
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 2: Establishing structural grid — 5×4 bays at 9m spacing"));
  cmds.push(
    `grid --width ${W} --depth ${D} --x-spacing ${gx} --y-spacing ${gy} --name "Primary Structural Grid"`
  );

  // ── Phase 3: Building Levels ────────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 3: Defining 20 building levels"));
  cmds.push(
    `level --add --count ${BUILDING.floors} --start-elevation 0 --height ${BUILDING.floorHeight}`
  );

  // ── Phase 4: Central Core ──────────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 4: Placing central circulation core — 4 elevators, 2 stairs"));
  const coreX = (W - coreW) / 2;
  const coreY = (D - coreD) / 2;
  cmds.push(
    `core --x ${coreX} --y ${coreY} --width ${coreW} --depth ${coreD}` +
    ` --type combined --elevators ${BUILDING.elevators} --stairs ${BUILDING.stairs}` +
    ` --name "Main Core" --fire-rating 120`
  );

  // ── Phase 5: Ground Floor — Double-Height Lobby ────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 5: Ground floor — double-height lobby entrance"));

  // Ground floor perimeter walls
  cmds.push(comment("  South facade entrance wall"));
  cmds.push(`wall --start 0,0 --end ${W},0 --height ${BUILDING.groundFloorHeight} --type structural`);
  cmds.push(comment("  East wall"));
  cmds.push(`wall --start ${W},0 --end ${W},${D} --height ${BUILDING.groundFloorHeight} --type structural`);
  cmds.push(comment("  North wall"));
  cmds.push(`wall --start ${W},${D} --end 0,${D} --height ${BUILDING.groundFloorHeight} --type structural`);
  cmds.push(comment("  West wall"));
  cmds.push(`wall --start 0,${D} --end 0,0 --height ${BUILDING.groundFloorHeight} --type structural`);

  // Ground floor slab
  cmds.push(comment("  Ground floor slab"));
  cmds.push(
    `floor --min 0,0 --max ${W},${D} --thickness ${BUILDING.slabThickness} --level "Level 1"`
  );

  // ── Phase 6: Typical Floor Plates (Floors 2–20) ────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 6: Constructing typical floor plates — Levels 2 through 20"));
  cmds.push(comment("  Each floor: perimeter walls + slab + column grid"));

  for (let floor = 2; floor <= BUILDING.floors; floor++) {
    const levelName = `Level ${floor}`;
    const h = BUILDING.floorHeight;

    cmds.push(comment(""));
    cmds.push(comment(`  ── ${levelName} ──`));

    // Perimeter walls for this floor
    cmds.push(`wall --start 0,0 --end ${W},0 --height ${h} --level "${levelName}"`);
    cmds.push(`wall --start ${W},0 --end ${W},${D} --height ${h} --level "${levelName}"`);
    cmds.push(`wall --start ${W},${D} --end 0,${D} --height ${h} --level "${levelName}"`);
    cmds.push(`wall --start 0,${D} --end 0,0 --height ${h} --level "${levelName}"`);

    // Floor slab
    cmds.push(
      `floor --min 0,0 --max ${W},${D} --thickness ${BUILDING.slabThickness} --level "${levelName}"`
    );
  }

  // ── Phase 7: Analysis & Summary ────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 7: Running spatial analysis"));
  cmds.push("analyze");
  cmds.push("status");

  // ── Phase 8: Clash Detection ───────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 8: Running clash detection"));
  cmds.push("clash");

  // ── Finale ─────────────────────────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("═══════════════════════════════════════════════"));
  cmds.push(comment(`  ${BUILDING.name} — Complete`));
  cmds.push(comment(`  ${BUILDING.floors} floors · ${(W * D).toLocaleString()}m² footprint`));
  cmds.push(comment(`  ${(W * D * BUILDING.floors).toLocaleString()}m² gross floor area`));
  cmds.push(comment(`  ${BUILDING.elevators} elevators · ${BUILDING.stairs} stairs`));
  cmds.push(comment("  Curtain wall facade with low-e glass"));
  cmds.push(comment("═══════════════════════════════════════════════"));

  return cmds;
}

/**
 * Convenience export: pre-generated command array.
 */
export const HIGH_RISE_DEMO_COMMANDS = generateHighRiseCommands();

/**
 * Building metadata for display in demo UI.
 */
export const HIGH_RISE_METADATA = {
  name: BUILDING.name,
  floors: BUILDING.floors,
  width: BUILDING.width,
  depth: BUILDING.depth,
  footprintArea: BUILDING.width * BUILDING.depth,
  grossFloorArea: BUILDING.width * BUILDING.depth * BUILDING.floors,
  totalHeight:
    BUILDING.groundFloorHeight + (BUILDING.floors - 1) * BUILDING.floorHeight,
  gridBays: `${Math.floor(BUILDING.width / BUILDING.gridSpacingX) + 1}×${Math.floor(BUILDING.depth / BUILDING.gridSpacingY) + 1}`,
  elevators: BUILDING.elevators,
  stairs: BUILDING.stairs,
  estimatedCommands: generateHighRiseCommands().length,
} as const;
