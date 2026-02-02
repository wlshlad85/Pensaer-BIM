/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the MCP client (required for command system initialization)
vi.mock("../../../services/mcpClient", () => ({
  mcpClient: {
    callTool: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

import { useSelectionStore } from "../../../stores/selectionStore";
import { useModelStore } from "../../../stores/modelStore";
import { dispatchCommand } from "../../../services/commandDispatcher";
import { registerSelectionCommands } from "../selectionCommands";
import type { Element } from "../../../types";

function makeElement(id: string, type: string): Element {
  return {
    id,
    type,
    name: `${type} ${id}`,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    properties: {},
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };
}

describe("selectionCommands", () => {
  beforeEach(() => {
    useSelectionStore.getState().clearSelection();
    const model = useModelStore.getState();
    const ids = model.elements.map((e) => e.id);
    if (ids.length) model.deleteElements(ids);

    registerSelectionCommands();

    model.addElement(makeElement("wall-001", "wall"));
    model.addElement(makeElement("wall-002", "wall"));
    model.addElement(makeElement("door-001", "door"));
  });

  // ----- select <id> -----
  it("selects a single element by id", async () => {
    const res = await dispatchCommand("select", { _positional: ["wall-001"] });
    expect(res.success).toBe(true);
    expect(useSelectionStore.getState().selectedIds).toEqual(["wall-001"]);
  });

  it("selects multiple elements by id", async () => {
    const res = await dispatchCommand("select", { _positional: ["wall-001", "door-001"] });
    expect(res.success).toBe(true);
    expect(useSelectionStore.getState().selectedIds).toEqual(["wall-001", "door-001"]);
  });

  it("fails for non-existent id", async () => {
    const res = await dispatchCommand("select", { _positional: ["ghost-999"] });
    expect(res.success).toBe(false);
    expect(res.message).toContain("not found");
  });

  // ----- select --type -----
  it("selects all elements of a type", async () => {
    const res = await dispatchCommand("select", { type: "wall" });
    expect(res.success).toBe(true);
    const ids = useSelectionStore.getState().selectedIds;
    expect(ids).toContain("wall-001");
    expect(ids).toContain("wall-002");
    expect(ids).not.toContain("door-001");
  });

  it("fails when no elements match the type", async () => {
    const res = await dispatchCommand("select", { type: "window" });
    expect(res.success).toBe(false);
  });

  // ----- select --all -----
  it("selects all elements", async () => {
    const res = await dispatchCommand("select", { all: true });
    expect(res.success).toBe(true);
    expect(useSelectionStore.getState().selectedIds.length).toBe(3);
  });

  it("returns success with message when model is empty", async () => {
    useModelStore.getState().deleteElements(["wall-001", "wall-002", "door-001"]);
    const res = await dispatchCommand("select", { all: true });
    expect(res.success).toBe(true);
    expect(res.message).toContain("No elements");
  });

  // ----- deselect -----
  it("clears the selection", async () => {
    useSelectionStore.getState().selectMultiple(["wall-001", "wall-002"]);
    const res = await dispatchCommand("deselect", {});
    expect(res.success).toBe(true);
    expect(useSelectionStore.getState().selectedIds).toEqual([]);
    expect(res.message).toContain("2");
  });

  it("handles deselect when nothing is selected", async () => {
    const res = await dispatchCommand("deselect", {});
    expect(res.success).toBe(true);
    expect(res.message).toContain("Nothing");
  });

  // ----- no args -----
  it("returns usage when called with no arguments", async () => {
    const res = await dispatchCommand("select", {});
    expect(res.success).toBe(false);
    expect(res.message).toContain("Usage");
  });
});
