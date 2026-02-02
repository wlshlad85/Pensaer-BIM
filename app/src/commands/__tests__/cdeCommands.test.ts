/**
 * CDE Workflow Commands — Unit Tests
 *
 * Tests for share, publish, archive, and cde status commands.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useModelStore } from "../../stores/modelStore";
import { registerCDECommands } from "../handlers/cdeCommands";
import {
  dispatchCommand,
  parseArguments,
} from "../../services/commandDispatcher";
import type { Element } from "../../types";

// Helper to create a test element with CDE defaults
function makeElement(overrides: Partial<Element> = {}): Element {
  return {
    id: "wall-test-001",
    type: "wall",
    name: "Test Wall",
    x: 0,
    y: 0,
    width: 500,
    height: 12,
    relationships: { hosts: [], joins: [], bounds: [] },
    issues: [],
    aiSuggestions: [],
    cdeState: "WIP",
    suitabilityCode: "S0",
    cdeHistory: [],
    ...overrides,
  } as Element;
}

describe("CDE Workflow Commands", () => {
  beforeEach(() => {
    // Reset store and register commands
    useModelStore.getState().setElements([]);
    registerCDECommands();
  });

  // ========================================
  // share command
  // ========================================
  describe("share", () => {
    it("transitions WIP → Shared with suitability code", async () => {
      const el = makeElement();
      useModelStore.getState().addElement(el);

      const result = await dispatchCommand("share", {
        _positional: ["wall-test-001"],
        code: "S1",
      });

      expect(result.success).toBe(true);
      expect(result.data?.state).toBe("Shared");
      expect(result.data?.suitability_code).toBe("S1");

      const updated = useModelStore.getState().getElementById("wall-test-001");
      expect(updated?.cdeState).toBe("Shared");
      expect(updated?.suitabilityCode).toBe("S1");
      expect(updated?.cdeHistory).toHaveLength(1);
      expect(updated?.cdeHistory[0].fromState).toBe("WIP");
      expect(updated?.cdeHistory[0].toState).toBe("Shared");
    });

    it("rejects share without suitability code", async () => {
      useModelStore.getState().addElement(makeElement());

      const result = await dispatchCommand("share", {
        _positional: ["wall-test-001"],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("suitability code");
    });

    it("rejects sharing an already-Published element", async () => {
      useModelStore.getState().addElement(
        makeElement({ cdeState: "Published" } as Partial<Element>)
      );

      const result = await dispatchCommand("share", {
        _positional: ["wall-test-001"],
        code: "S2",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Published");
    });
  });

  // ========================================
  // publish command
  // ========================================
  describe("publish", () => {
    it("transitions Shared → Published", async () => {
      useModelStore.getState().addElement(
        makeElement({ cdeState: "Shared", suitabilityCode: "S4" } as Partial<Element>)
      );

      const result = await dispatchCommand("publish", {
        _positional: ["wall-test-001"],
      });

      expect(result.success).toBe(true);
      const updated = useModelStore.getState().getElementById("wall-test-001");
      expect(updated?.cdeState).toBe("Published");
      expect(updated?.cdeHistory).toHaveLength(1);
    });

    it("rejects publishing a WIP element", async () => {
      useModelStore.getState().addElement(makeElement());

      const result = await dispatchCommand("publish", {
        _positional: ["wall-test-001"],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("WIP");
    });
  });

  // ========================================
  // archive command
  // ========================================
  describe("archive", () => {
    it("transitions Published → Archived", async () => {
      useModelStore.getState().addElement(
        makeElement({ cdeState: "Published" } as Partial<Element>)
      );

      const result = await dispatchCommand("archive", {
        _positional: ["wall-test-001"],
      });

      expect(result.success).toBe(true);
      const updated = useModelStore.getState().getElementById("wall-test-001");
      expect(updated?.cdeState).toBe("Archived");
    });

    it("rejects archiving a WIP element", async () => {
      useModelStore.getState().addElement(makeElement());

      const result = await dispatchCommand("archive", {
        _positional: ["wall-test-001"],
      });

      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // cde status command
  // ========================================
  describe("cde status", () => {
    it("shows counts by state", async () => {
      useModelStore.getState().addElement(makeElement({ id: "w1" } as Partial<Element>));
      useModelStore.getState().addElement(
        makeElement({ id: "w2", cdeState: "Shared", suitabilityCode: "S1" } as Partial<Element>)
      );
      useModelStore.getState().addElement(
        makeElement({ id: "w3", cdeState: "Published" } as Partial<Element>)
      );

      const result = await dispatchCommand("cde", {});

      expect(result.success).toBe(true);
      expect(result.data?.counts).toEqual({
        WIP: 1,
        Shared: 1,
        Published: 1,
        Archived: 0,
      });
      expect(result.data?.total).toBe(3);
    });
  });

  // ========================================
  // Full lifecycle
  // ========================================
  describe("full lifecycle", () => {
    it("WIP → Shared → Published → Archived", async () => {
      useModelStore.getState().addElement(makeElement());

      // Share
      let r = await dispatchCommand("share", { _positional: ["wall-test-001"], code: "S3" });
      expect(r.success).toBe(true);

      // Publish
      r = await dispatchCommand("publish", { _positional: ["wall-test-001"] });
      expect(r.success).toBe(true);

      // Archive
      r = await dispatchCommand("archive", { _positional: ["wall-test-001"] });
      expect(r.success).toBe(true);

      const el = useModelStore.getState().getElementById("wall-test-001");
      expect(el?.cdeState).toBe("Archived");
      expect(el?.cdeHistory).toHaveLength(3);

      // Verify audit trail order
      expect(el?.cdeHistory[0].toState).toBe("Shared");
      expect(el?.cdeHistory[1].toState).toBe("Published");
      expect(el?.cdeHistory[2].toState).toBe("Archived");
    });
  });
});
