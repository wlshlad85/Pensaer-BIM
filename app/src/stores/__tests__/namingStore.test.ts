/**
 * Tests for ISO 19650 Naming Store
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useNamingStore, levelToCode, padNumber } from "../namingStore";

describe("namingStore", () => {
  beforeEach(() => {
    const store = useNamingStore.getState();
    // Reset state
    useNamingStore.setState({
      config: {
        project: "PRJ01",
        originator: "PEN",
        defaultVolume: "ZZ",
        defaultType: "M3",
      },
      counters: {},
      names: {},
    });
  });

  describe("levelToCode", () => {
    it("converts 'Level 1' to 'L1'", () => {
      expect(levelToCode("Level 1")).toBe("L1");
    });

    it("converts 'Level 10' to 'L10'", () => {
      expect(levelToCode("Level 10")).toBe("L10");
    });

    it("converts 'Ground Floor' to 'GF'", () => {
      expect(levelToCode("Ground Floor")).toBe("GF");
    });

    it("converts 'Basement' to 'B1'", () => {
      expect(levelToCode("Basement")).toBe("B1");
    });

    it("converts 'Basement 2' to 'B2'", () => {
      expect(levelToCode("Basement 2")).toBe("B2");
    });

    it("converts 'Roof' to 'RF'", () => {
      expect(levelToCode("Roof")).toBe("RF");
    });

    it("returns 'XX' for empty string", () => {
      expect(levelToCode("")).toBe("XX");
    });
  });

  describe("padNumber", () => {
    it("pads single digit to 4", () => {
      expect(padNumber(1)).toBe("0001");
    });

    it("pads double digit to 4", () => {
      expect(padNumber(42)).toBe("0042");
    });

    it("handles 4-digit number", () => {
      expect(padNumber(9999)).toBe("9999");
    });
  });

  describe("config", () => {
    it("has sensible defaults", () => {
      const { config } = useNamingStore.getState();
      expect(config.project).toBe("PRJ01");
      expect(config.originator).toBe("PEN");
      expect(config.defaultVolume).toBe("ZZ");
      expect(config.defaultType).toBe("M3");
    });

    it("updates config partially", () => {
      useNamingStore.getState().setConfig({ project: "NEWPRJ" });
      const { config } = useNamingStore.getState();
      expect(config.project).toBe("NEWPRJ");
      expect(config.originator).toBe("PEN"); // unchanged
    });
  });

  describe("generateName", () => {
    it("generates ISO-compliant name for wall", () => {
      const name = useNamingStore.getState().generateName(
        "wall-001", "wall", "Level 1"
      );
      expect(name.fullName).toBe("PRJ01-PEN-ZZ-L1-M3-S-0001");
      expect(name.fields.project).toBe("PRJ01");
      expect(name.fields.originator).toBe("PEN");
      expect(name.fields.volume).toBe("ZZ");
      expect(name.fields.level).toBe("L1");
      expect(name.fields.type).toBe("M3");
      expect(name.fields.discipline).toBe("S");
      expect(name.fields.number).toBe("0001");
    });

    it("generates ISO name for door (Architecture discipline)", () => {
      const name = useNamingStore.getState().generateName(
        "door-001", "door", "Level 2"
      );
      expect(name.fullName).toBe("PRJ01-PEN-ZZ-L2-M3-A-0001");
      expect(name.fields.discipline).toBe("A");
    });

    it("increments counter per discipline", () => {
      const store = useNamingStore.getState();
      store.generateName("wall-001", "wall", "Level 1");
      const name2 = store.generateName("wall-002", "wall", "Level 1");
      expect(name2.fields.number).toBe("0002");
    });

    it("tracks counters independently per discipline", () => {
      const store = useNamingStore.getState();
      store.generateName("wall-001", "wall", "Level 1"); // S-0001
      store.generateName("door-001", "door", "Level 1"); // A-0001
      const wall2 = store.generateName("wall-002", "wall", "Level 1"); // S-0002
      expect(wall2.fields.number).toBe("0002");
      expect(wall2.fields.discipline).toBe("S");
    });

    it("allows custom discipline override", () => {
      const name = useNamingStore.getState().generateName(
        "wall-001", "wall", "Level 1", "C"
      );
      expect(name.fields.discipline).toBe("C");
    });

    it("caches generated names", () => {
      const store = useNamingStore.getState();
      store.generateName("wall-001", "wall", "Level 1");
      const cached = store.getName("wall-001");
      expect(cached).toBeDefined();
      expect(cached!.fullName).toBe("PRJ01-PEN-ZZ-L1-M3-S-0001");
    });

    it("uses updated config", () => {
      const store = useNamingStore.getState();
      store.setConfig({ project: "HOUSE", originator: "ABC" });
      const name = store.generateName("wall-001", "wall", "Ground Floor");
      expect(name.fullName).toBe("HOUSE-ABC-ZZ-GF-M3-S-0001");
    });
  });

  describe("removeName", () => {
    it("removes a cached name", () => {
      const store = useNamingStore.getState();
      store.generateName("wall-001", "wall", "Level 1");
      expect(store.getName("wall-001")).toBeDefined();
      store.removeName("wall-001");
      expect(useNamingStore.getState().getName("wall-001")).toBeUndefined();
    });
  });

  describe("getAllNames", () => {
    it("returns all generated names", () => {
      const store = useNamingStore.getState();
      store.generateName("wall-001", "wall", "Level 1");
      store.generateName("door-001", "door", "Level 2");
      const all = useNamingStore.getState().getAllNames();
      expect(all).toHaveLength(2);
    });
  });
});
