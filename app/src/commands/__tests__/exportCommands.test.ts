/**
 * Export Command Handlers Tests
 *
 * Tests for the `export ifc` terminal command (P2-010).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerExportCommands } from "../handlers/exportCommands";
import {
  dispatchCommand,
  getCommand,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import type {
  WallElement,
  FloorElement,
  ColumnElement,
  BeamElement,
  RoofElement,
  RoomElement,
  DoorElement,
  WindowElement,
  StairElement,
} from "../../types";
import { createElementId } from "../../types";

// Mock the IFC module
const mockExportResult = {
  data: new Uint8Array(1024),
  filename: "pensaer-export.ifc",
  stats: {
    totalEntities: 5,
    walls: 2,
    doors: 1,
    windows: 1,
    rooms: 0,
    floors: 1,
    roofs: 0,
    columns: 0,
    beams: 0,
    stairs: 0,
  },
};

vi.mock("../../services/ifc", () => ({
  exportToIfc: vi.fn().mockResolvedValue({
    data: new Uint8Array(1024),
    filename: "pensaer-export.ifc",
    stats: {
      totalEntities: 5,
      walls: 2,
      doors: 1,
      windows: 1,
      rooms: 0,
      floors: 1,
      roofs: 0,
      columns: 0,
      beams: 0,
      stairs: 0,
    },
  }),
  downloadIfcFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock MCP client
vi.mock("../../services/mcpClient", () => ({
  mcpClient: {
    callTool: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

// Helper to create test elements
function makeWall(id: string): WallElement {
  return {
    id: createElementId(id),
    type: "wall" as const,
    name: `Wall ${id}`,
    x: 0,
    y: 0,
    width: 5000,
    height: 3000,
    thickness: 200,
    wallHeight: 3000,
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };
}

function makeFloor(id: string): FloorElement {
  return {
    id: createElementId(id),
    type: "floor" as const,
    name: `Floor ${id}`,
    x: 0,
    y: 0,
    width: 10000,
    height: 10000,
    thickness: 150,
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };
}

function makeColumn(id: string): ColumnElement {
  return {
    id: createElementId(id),
    type: "column" as const,
    name: `Column ${id}`,
    x: 0,
    y: 0,
    width: 400,
    height: 3000,
    depth: 400,
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };
}

function makeBeam(id: string): BeamElement {
  return {
    id: createElementId(id),
    type: "beam" as const,
    name: `Beam ${id}`,
    x: 0,
    y: 0,
    width: 200,
    height: 400,
    depth: 400,
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };
}

function makeRoof(id: string): RoofElement {
  return {
    id: createElementId(id),
    type: "roof" as const,
    name: `Roof ${id}`,
    x: 0,
    y: 0,
    width: 10000,
    height: 10000,
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };
}

function makeRoom(id: string): RoomElement {
  return {
    id: createElementId(id),
    type: "room" as const,
    name: `Room ${id}`,
    x: 0,
    y: 0,
    width: 5000,
    height: 4000,
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };
}

function makeDoor(id: string): DoorElement {
  return {
    id: createElementId(id),
    type: "door" as const,
    name: `Door ${id}`,
    x: 1000,
    y: 0,
    width: 900,
    height: 2100,
    doorWidth: 900,
    doorHeight: 2100,
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };
}

function makeWindow(id: string): WindowElement {
  return {
    id: createElementId(id),
    type: "window" as const,
    name: `Window ${id}`,
    x: 2000,
    y: 0,
    width: 1200,
    height: 1500,
    windowWidth: 1200,
    windowHeight: 1500,
    sillHeight: 900,
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };
}

function makeStair(id: string): StairElement {
  return {
    id: createElementId(id),
    type: "stair" as const,
    name: `Stair ${id}`,
    x: 0,
    y: 0,
    width: 1200,
    height: 2800,
    risers: 14,
    riserHeight: 175,
    treadDepth: 280,
    stairWidth: 1200,
    relationships: {},
    issues: [],
    aiSuggestions: [],
  };
}

describe("Export Commands", () => {
  beforeEach(() => {
    // Reset store
    useModelStore.getState().clearElements();
    // Register commands
    registerExportCommands();
    // Clear mocks
    vi.clearAllMocks();
  });

  describe("Registration", () => {
    it("should register the export command", () => {
      const cmd = getCommand("export");
      expect(cmd).toBeDefined();
      expect(cmd!.name).toBe("export");
      expect(cmd!.description).toContain("IFC");
    });

    it("should have examples", () => {
      const cmd = getCommand("export");
      expect(cmd!.examples.length).toBeGreaterThan(0);
      expect(cmd!.examples.some((e) => e.includes("ifc"))).toBe(true);
    });
  });

  describe("export ifc", () => {
    it("should fail with empty model", async () => {
      const result = await dispatchCommand("export", {
        _positional: ["ifc"],
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("No elements");
    });

    it("should reject unknown format", async () => {
      useModelStore.getState().addElement(makeWall("w1"));
      const result = await dispatchCommand("export", {
        _positional: ["obj"],
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("Unknown export format");
    });

    it("should reject missing subcommand", async () => {
      useModelStore.getState().addElement(makeWall("w1"));
      const result = await dispatchCommand("export", {});
      expect(result.success).toBe(false);
      expect(result.message).toContain("Unknown export format");
    });

    it("should export walls", async () => {
      useModelStore.getState().addElement(makeWall("w1"));
      useModelStore.getState().addElement(makeWall("w2"));

      const result = await dispatchCommand("export", {
        _positional: ["ifc"],
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("Exported");
      expect(result.data?.elementCount).toBe(2);
    });

    it("should export all element types", async () => {
      useModelStore.getState().addElement(makeWall("w1"));
      useModelStore.getState().addElement(makeColumn("c1"));
      useModelStore.getState().addElement(makeBeam("b1"));
      useModelStore.getState().addElement(makeFloor("f1"));
      useModelStore.getState().addElement(makeRoof("r1"));
      useModelStore.getState().addElement(makeRoom("rm1"));
      useModelStore.getState().addElement(makeDoor("d1"));
      useModelStore.getState().addElement(makeWindow("win1"));
      useModelStore.getState().addElement(makeStair("s1"));

      const result = await dispatchCommand("export", {
        _positional: ["ifc"],
      });
      expect(result.success).toBe(true);
      expect(result.data?.elementCount).toBe(9);
    });

    it("should accept --version IFC2X3", async () => {
      const { exportToIfc } = await import("../../services/ifc");
      useModelStore.getState().addElement(makeWall("w1"));

      await dispatchCommand("export", {
        _positional: ["ifc"],
        version: "IFC2X3",
      });

      expect(exportToIfc).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ ifcVersion: "IFC2X3" })
      );
    });

    it("should accept --version IFC4", async () => {
      const { exportToIfc } = await import("../../services/ifc");
      useModelStore.getState().addElement(makeWall("w1"));

      await dispatchCommand("export", {
        _positional: ["ifc"],
        version: "IFC4",
      });

      expect(exportToIfc).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ ifcVersion: "IFC4" })
      );
    });

    it("should reject invalid version", async () => {
      useModelStore.getState().addElement(makeWall("w1"));

      const result = await dispatchCommand("export", {
        _positional: ["ifc"],
        version: "IFC5",
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("Unsupported IFC version");
    });

    it("should support --dry-run", async () => {
      const { downloadIfcFile } = await import("../../services/ifc");
      useModelStore.getState().addElement(makeWall("w1"));

      const result = await dispatchCommand("export", {
        _positional: ["ifc"],
        "dry-run": true,
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("validated");
      // Should NOT trigger download
      expect(downloadIfcFile).not.toHaveBeenCalled();
    });

    it("should pass project/author/org options", async () => {
      const { exportToIfc } = await import("../../services/ifc");
      useModelStore.getState().addElement(makeWall("w1"));

      await dispatchCommand("export", {
        _positional: ["ifc"],
        project: "Test Building",
        author: "Max",
        org: "Pensaer",
        "dry-run": true,
      });

      expect(exportToIfc).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          projectName: "Test Building",
          author: "Max",
          organization: "Pensaer",
        })
      );
    });

    it("should trigger download without --dry-run", async () => {
      const { downloadIfcFile } = await import("../../services/ifc");
      useModelStore.getState().addElement(makeWall("w1"));

      await dispatchCommand("export", {
        _positional: ["ifc"],
      });
      expect(downloadIfcFile).toHaveBeenCalled();
    });

    it("should include file stats in result data", async () => {
      useModelStore.getState().addElement(makeWall("w1"));

      const result = await dispatchCommand("export", {
        _positional: ["ifc"],
        "dry-run": true,
      });
      expect(result.data?.filename).toBeDefined();
      expect(result.data?.fileSize).toBeDefined();
      expect(result.data?.stats).toBeDefined();
    });

    it("should accept shorthand version 2X3", async () => {
      const { exportToIfc } = await import("../../services/ifc");
      useModelStore.getState().addElement(makeWall("w1"));

      await dispatchCommand("export", {
        _positional: ["ifc"],
        version: "2X3",
        "dry-run": true,
      });

      expect(exportToIfc).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ ifcVersion: "IFC2X3" })
      );
    });
  });
});
