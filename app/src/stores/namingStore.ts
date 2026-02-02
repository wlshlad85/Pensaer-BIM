/**
 * Pensaer BIM Platform - ISO 19650 Naming Store
 *
 * Manages ISO 19650 information naming conventions per UK National Annex.
 * Container naming: [Project]-[Originator]-[Volume/System]-[Level/Location]-[Type]-[Discipline]-[Number]
 *
 * @module stores/namingStore
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ElementType } from "../types";

// ============================================
// ISO 19650 CODES
// ============================================

/** Information container type codes per ISO 19650 */
export const TYPE_CODES: Record<string, string> = {
  DR: "Drawing",
  M3: "3D Model",
  SP: "Specification",
  SH: "Schedule",
  RP: "Report",
};

/** Discipline codes per ISO 19650 UK National Annex */
export const DISCIPLINE_CODES: Record<string, string> = {
  A: "Architecture",
  S: "Structural",
  M: "Mechanical",
  E: "Electrical",
  C: "Civil",
};

/** Default discipline mapping from BIM element types */
export const ELEMENT_DISCIPLINE_MAP: Record<ElementType, string> = {
  wall: "S",
  door: "A",
  window: "A",
  room: "A",
  floor: "S",
  roof: "S",
  column: "S",
  beam: "S",
  stair: "A",
};

/** Default volume/system code (ZZ = not applicable / mixed) */
export const DEFAULT_VOLUME = "ZZ";

/** Default type code for BIM model elements */
export const DEFAULT_TYPE = "M3";

// ============================================
// INTERFACES
// ============================================

export interface NamingConfig {
  /** Project code (e.g., "PRJ01") */
  project: string;
  /** Originator code (e.g., "PEN" for Pensaer) */
  originator: string;
  /** Default volume/system code */
  defaultVolume: string;
  /** Default type code */
  defaultType: string;
}

export interface IsoName {
  /** The element ID this name belongs to */
  elementId: string;
  /** Full ISO 19650 name string */
  fullName: string;
  /** Breakdown of name fields */
  fields: {
    project: string;
    originator: string;
    volume: string;
    level: string;
    type: string;
    discipline: string;
    number: string;
  };
}

interface NamingState {
  config: NamingConfig;
  /** Sequential counter per discipline for number generation */
  counters: Record<string, number>;
  /** Cache of generated ISO names by element ID */
  names: Record<string, IsoName>;
}

interface NamingActions {
  /** Update naming configuration */
  setConfig: (updates: Partial<NamingConfig>) => void;
  /** Generate an ISO name for an element */
  generateName: (
    elementId: string,
    elementType: ElementType,
    level?: string,
    discipline?: string,
    volume?: string,
    type?: string,
  ) => IsoName;
  /** Get the ISO name for an element */
  getName: (elementId: string) => IsoName | undefined;
  /** Get all ISO names */
  getAllNames: () => IsoName[];
  /** Clear a specific name (e.g., on element delete) */
  removeName: (elementId: string) => void;
  /** Reset all counters */
  resetCounters: () => void;
}

type NamingStore = NamingState & NamingActions;

// ============================================
// HELPERS
// ============================================

/**
 * Convert a level name to an ISO level code.
 * "Level 1" → "L1", "Ground Floor" → "GF", "Basement" → "B1"
 */
export function levelToCode(level: string): string {
  if (!level) return "XX";
  const lower = level.toLowerCase().trim();

  // Ground floor variants
  if (lower === "ground" || lower === "ground floor" || lower === "gf") return "GF";

  // Basement variants
  const basementMatch = lower.match(/basement\s*(\d*)/);
  if (basementMatch) return `B${basementMatch[1] || "1"}`;

  // "Level N" or "L N" pattern
  const levelMatch = lower.match(/(?:level|l)\s*(\d+)/);
  if (levelMatch) return `L${levelMatch[1]}`;

  // Roof
  if (lower === "roof" || lower === "roof level") return "RF";

  // Fallback: take first 2 chars uppercase
  return level.replace(/\s/g, "").substring(0, 2).toUpperCase();
}

/**
 * Pad a number to 4 digits for the sequential number field.
 */
export function padNumber(n: number): string {
  return String(n).padStart(4, "0");
}

// ============================================
// STORE
// ============================================

export const useNamingStore = create<NamingStore>()(
  immer((set, get) => ({
    config: {
      project: "PRJ01",
      originator: "PEN",
      defaultVolume: DEFAULT_VOLUME,
      defaultType: DEFAULT_TYPE,
    },
    counters: {},
    names: {},

    setConfig: (updates) =>
      set((state) => {
        Object.assign(state.config, updates);
      }),

    generateName: (elementId, elementType, level, discipline, volume, type) => {
      const state = get();
      const cfg = state.config;

      const disc = discipline || ELEMENT_DISCIPLINE_MAP[elementType] || "A";
      const vol = volume || cfg.defaultVolume;
      const typ = type || cfg.defaultType;
      const lvl = levelToCode(level || "Level 1");

      // Increment counter for this discipline
      const counterKey = disc;
      const currentCount = (state.counters[counterKey] || 0) + 1;

      const fields = {
        project: cfg.project,
        originator: cfg.originator,
        volume: vol,
        level: lvl,
        type: typ,
        discipline: disc,
        number: padNumber(currentCount),
      };

      const fullName = `${fields.project}-${fields.originator}-${fields.volume}-${fields.level}-${fields.type}-${fields.discipline}-${fields.number}`;

      const isoName: IsoName = { elementId, fullName, fields };

      set((state) => {
        state.counters[counterKey] = currentCount;
        state.names[elementId] = isoName;
      });

      return isoName;
    },

    getName: (elementId) => get().names[elementId],

    getAllNames: () => Object.values(get().names),

    removeName: (elementId) =>
      set((state) => {
        delete state.names[elementId];
      }),

    resetCounters: () =>
      set((state) => {
        state.counters = {};
      }),
  })),
);
