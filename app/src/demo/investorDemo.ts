/**
 * Investor Demo — "Tramshed Tech HQ"
 *
 * A dramatic auto-demo that constructs a modern tech office building
 * step by step, designed to impress investors. Uses only commands that
 * currently exist in the Pensaer-BIM DSL: wall, floor, roof, room,
 * door, window, analyze, clash, status.
 */

// ============================================
// BUILDING PARAMETERS
// ============================================

const BUILDING = {
  name: "Tramshed Tech HQ",
  width: 20,    // metres
  depth: 12,    // metres
  height: 3.2,  // storey height
  wallThickness: 0.2,
  slabThickness: 0.25,
} as const;

// ============================================
// COMMAND GENERATOR
// ============================================

function comment(text: string): string {
  return `# ${text}`;
}

export function generateInvestorDemoCommands(): string[] {
  const cmds: string[] = [];
  const W = BUILDING.width;
  const D = BUILDING.depth;
  const H = BUILDING.height;

  // ── Title ──────────────────────────────────────────────
  cmds.push(comment("═══════════════════════════════════════════════════"));
  cmds.push(comment("  PENSAER-BIM — Building the Future"));
  cmds.push(comment(""));
  cmds.push(comment("  Project: Tramshed Tech HQ"));
  cmds.push(comment("  20m × 12m footprint · 2 storeys · Modern office"));
  cmds.push(comment("═══════════════════════════════════════════════════"));
  cmds.push("clear");

  // ── Phase 1: Ground Floor Exterior Walls ───────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 1: Constructing ground floor — exterior walls"));
  cmds.push(comment("  South facade"));
  cmds.push(`wall --start 0,0 --end ${W},0 --height ${H}`);
  cmds.push(comment("  East facade"));
  cmds.push(`wall --start ${W},0 --end ${W},${D} --height ${H}`);
  cmds.push(comment("  North facade"));
  cmds.push(`wall --start ${W},${D} --end 0,${D} --height ${H}`);
  cmds.push(comment("  West facade"));
  cmds.push(`wall --start 0,${D} --end 0,0 --height ${H}`);

  // ── Phase 2: Interior Partitions ───────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 2: Adding interior partitions"));
  cmds.push(comment("  Main corridor wall (east-west)"));
  cmds.push(`wall --start 0,${D / 2} --end ${W},${D / 2} --height ${H}`);
  cmds.push(comment("  Reception divider"));
  cmds.push(`wall --start 8,0 --end 8,${D / 2} --height ${H}`);
  cmds.push(comment("  Meeting room partition"));
  cmds.push(`wall --start 14,0 --end 14,${D / 2} --height ${H}`);
  cmds.push(comment("  Kitchen partition"));
  cmds.push(`wall --start 14,${D / 2} --end 14,${D} --height ${H}`);

  // ── Phase 3: Doors ─────────────────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 3: Placing doors"));
  cmds.push(comment("  Main entrance (south facade)"));
  cmds.push("door --wall wall-1 --offset 4000");
  cmds.push(comment("  Reception to corridor"));
  cmds.push("door --wall wall-6 --offset 3000");
  cmds.push(comment("  Office to corridor"));
  cmds.push("door --wall wall-5 --offset 5000");
  cmds.push(comment("  Meeting room access"));
  cmds.push("door --wall wall-7 --offset 2500");
  cmds.push(comment("  Kitchen access"));
  cmds.push("door --wall wall-8 --offset 2500");

  // ── Phase 4: Windows ───────────────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 4: Installing windows — bringing in natural light"));
  cmds.push(comment("  South windows (street-facing)"));
  cmds.push("window --wall wall-1 --offset 1500 --sill 900");
  cmds.push("window --wall wall-1 --offset 9000 --sill 900");
  cmds.push("window --wall wall-1 --offset 16000 --sill 900");
  cmds.push(comment("  North windows"));
  cmds.push("window --wall wall-3 --offset 2000 --sill 900");
  cmds.push("window --wall wall-3 --offset 7000 --sill 900");
  cmds.push("window --wall wall-3 --offset 13000 --sill 900");
  cmds.push("window --wall wall-3 --offset 18000 --sill 900");
  cmds.push(comment("  East window"));
  cmds.push("window --wall wall-2 --offset 3000 --sill 900");
  cmds.push(comment("  West window"));
  cmds.push("window --wall wall-4 --offset 3000 --sill 900");

  // ── Phase 5: Ground Floor Slab ─────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 5: Pouring ground floor slab"));
  cmds.push(`floor --min 0,0 --max ${W},${D} --thickness ${BUILDING.slabThickness}`);

  // ── Phase 6: Roof ──────────────────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 6: Adding roof structure"));
  cmds.push(`roof --min 0,0 --max ${W},${D} --type flat`);

  // ── Phase 7: Room Definitions ──────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 7: Defining functional spaces"));
  cmds.push(comment("  Reception — first impression matters"));
  cmds.push('room --name "Reception" --number 001');
  cmds.push(comment("  Open-plan office"));
  cmds.push('room --name "Open Plan Office" --number 002');
  cmds.push(comment("  Board meeting room"));
  cmds.push('room --name "Meeting Room" --number 003');
  cmds.push(comment("  Kitchen / break area"));
  cmds.push('room --name "Kitchen" --number 004');
  cmds.push(comment("  Main office space (north wing)"));
  cmds.push('room --name "Office North" --number 005');

  // ── Phase 8: Analysis ──────────────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 8: Running spatial analysis & clash detection"));
  cmds.push("analyze");
  cmds.push("clash");

  // ── Phase 9: Final Stats ───────────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 9: Final building summary"));
  cmds.push("status");

  // ── Finale ─────────────────────────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("═══════════════════════════════════════════════════"));
  cmds.push(comment(`  ${BUILDING.name} — Complete`));
  cmds.push(comment(`  ${W}m × ${D}m footprint · ${W * D}m² floor area`));
  cmds.push(comment("  5 rooms · 9 windows · 5 doors"));
  cmds.push(comment("  Designed in Pensaer-BIM — from DSL to building"));
  cmds.push(comment("═══════════════════════════════════════════════════"));

  return cmds;
}

// ============================================
// EXPORTS
// ============================================

export const INVESTOR_DEMO_COMMANDS = generateInvestorDemoCommands();

export const INVESTOR_DEMO_METADATA = {
  name: BUILDING.name,
  width: BUILDING.width,
  depth: BUILDING.depth,
  footprintArea: BUILDING.width * BUILDING.depth,
  rooms: 5,
  windows: 9,
  doors: 5,
  estimatedCommands: generateInvestorDemoCommands().length,
} as const;
