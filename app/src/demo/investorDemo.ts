/**
 * Investor Demo — "Tramshed Tech HQ"
 *
 * A dramatic auto-demo that constructs a modern tech office building
 * step by step, designed to impress investors. Uses only commands that
 * currently exist in the Pensaer-BIM DSL.
 *
 * IMPORTANT: This demo is executed dynamically (not as a static command
 * list) because wall IDs are UUIDs generated at runtime. We must capture
 * them after creation to reference them for door/window placement.
 */

import { useModelStore } from "../stores/modelStore";

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
// STATIC COMMAND LIST (for metadata / display)
// ============================================

function comment(text: string): string {
  return `# ${text}`;
}

/**
 * Generate static command list for display purposes.
 * NOTE: The actual demo execution uses generateDynamicInvestorDemo()
 * which captures wall IDs at runtime.
 */
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

  // ── Phase 3: Doors (use {{wallRef:N}} placeholder) ─────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 3: Placing doors"));
  cmds.push(comment("  Main entrance (south facade)"));
  cmds.push("door --wall {{south}} --offset 4");
  cmds.push(comment("  Reception to corridor"));
  cmds.push("door --wall {{corridor}} --offset 3");
  cmds.push(comment("  Office to corridor"));
  cmds.push("door --wall {{receptionDiv}} --offset 2.5");
  cmds.push(comment("  Meeting room access"));
  cmds.push("door --wall {{meetingDiv}} --offset 2.5");
  cmds.push(comment("  Kitchen access"));
  cmds.push("door --wall {{kitchenDiv}} --offset 2.5");

  // ── Phase 4: Windows ───────────────────────────────────
  cmds.push(comment(""));
  cmds.push(comment("▸ Phase 4: Installing windows — bringing in natural light"));
  cmds.push(comment("  South windows (street-facing)"));
  cmds.push("window --wall {{south}} --offset 1.5 --sill 0.9");
  cmds.push("window --wall {{south}} --offset 9 --sill 0.9");
  cmds.push("window --wall {{south}} --offset 16 --sill 0.9");
  cmds.push(comment("  North windows"));
  cmds.push("window --wall {{north}} --offset 2 --sill 0.9");
  cmds.push("window --wall {{north}} --offset 7 --sill 0.9");
  cmds.push("window --wall {{north}} --offset 13 --sill 0.9");
  cmds.push("window --wall {{north}} --offset 18 --sill 0.9");
  cmds.push(comment("  East window"));
  cmds.push("window --wall {{east}} --offset 3 --sill 0.9");
  cmds.push(comment("  West window"));
  cmds.push("window --wall {{west}} --offset 3 --sill 0.9");

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
  cmds.push(`room --min 0,0 --max 8,6 --name "Reception" --number 001`);
  cmds.push(comment("  Open-plan office"));
  cmds.push(`room --min 8,0 --max 14,6 --name "Open Plan Office" --number 002`);
  cmds.push(comment("  Board meeting room"));
  cmds.push(`room --min 14,0 --max 20,6 --name "Meeting Room" --number 003`);
  cmds.push(comment("  Kitchen / break area"));
  cmds.push(`room --min 14,6 --max 20,12 --name "Kitchen" --number 004`);
  cmds.push(comment("  Main office space (north wing)"));
  cmds.push(`room --min 0,6 --max 14,12 --name "Office North" --number 005`);

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
// DYNAMIC DEMO GENERATOR
// ============================================

/**
 * Wall reference map — filled during demo execution.
 * Keys are human-readable names, values are actual UUIDs from the model store.
 */
export interface WallRefs {
  south: string;
  east: string;
  north: string;
  west: string;
  corridor: string;
  receptionDiv: string;
  meetingDiv: string;
  kitchenDiv: string;
}

/**
 * Resolve wall reference placeholders in a command string.
 * e.g. "door --wall {{south}} --offset 4" → "door --wall wall-a1b2c3d4 --offset 4"
 */
export function resolveWallRefs(command: string, refs: Partial<WallRefs>): string {
  return command.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const id = refs[key as keyof WallRefs];
    return id ?? `UNRESOLVED_${key}`;
  });
}

/**
 * Generate an async demo executor that captures wall IDs at runtime.
 *
 * This is the key fix: instead of a static command list with hardcoded
 * wall IDs, each wall creation captures the returned UUID and subsequent
 * door/window commands use those real IDs.
 */
export function generateDynamicInvestorDemo(): {
  commands: string[];
  wallNameOrder: string[];
} {
  const W = BUILDING.width;
  const D = BUILDING.depth;
  const H = BUILDING.height;

  // Wall commands in order — the DemoRunner will capture IDs as each is created
  const wallNameOrder: string[] = [
    "south",        // wall 0: south facade
    "east",         // wall 1: east facade
    "north",        // wall 2: north facade
    "west",         // wall 3: west facade
    "corridor",     // wall 4: corridor divider
    "receptionDiv", // wall 5: reception partition
    "meetingDiv",   // wall 6: meeting room partition
    "kitchenDiv",   // wall 7: kitchen partition
  ];

  const commands = generateInvestorDemoCommands();

  return { commands, wallNameOrder };
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
