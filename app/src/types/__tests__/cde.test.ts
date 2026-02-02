/**
 * CDE Types — Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  CDE_STATES,
  SUITABILITY_CODES,
  VALID_TRANSITIONS,
  CDE_STATE_COLOURS,
  isValidTransition,
} from "../cde";

describe("CDE Types", () => {
  it("defines 4 CDE states in order", () => {
    expect(CDE_STATES).toEqual(["WIP", "Shared", "Published", "Archived"]);
  });

  it("defines 5 suitability codes", () => {
    expect(Object.keys(SUITABILITY_CODES)).toHaveLength(5);
    expect(SUITABILITY_CODES.S0).toBe("Work in Progress");
    expect(SUITABILITY_CODES.S4).toBe("For Stage Approval");
  });

  it("validates correct transitions", () => {
    expect(isValidTransition("WIP", "Shared")).toBe(true);
    expect(isValidTransition("Shared", "Published")).toBe(true);
    expect(isValidTransition("Published", "Archived")).toBe(true);
    expect(isValidTransition("Shared", "WIP")).toBe(true); // rejection path
  });

  it("rejects invalid transitions", () => {
    expect(isValidTransition("WIP", "Published")).toBe(false);
    expect(isValidTransition("WIP", "Archived")).toBe(false);
    expect(isValidTransition("Published", "WIP")).toBe(false);
    expect(isValidTransition("Archived", "WIP")).toBe(false);
    expect(isValidTransition("Archived", "Shared")).toBe(false);
  });

  it("has colour config for every state", () => {
    for (const state of CDE_STATES) {
      expect(CDE_STATE_COLOURS[state]).toBeDefined();
      expect(CDE_STATE_COLOURS[state].fill).toBeTruthy();
      expect(CDE_STATE_COLOURS[state].stroke).toBeTruthy();
      expect(CDE_STATE_COLOURS[state].label).toBeTruthy();
    }
  });
});
