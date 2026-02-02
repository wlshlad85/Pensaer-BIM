/**
 * Element Command Handlers Tests
 *
 * Tests for command handlers that route through MCP client.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerElementCommands,
} from "../handlers/elementCommands";
import {
  dispatchCommand,
  dispatchCommandWithContext,
  getCommand,
  getCommandContext,
} from "../../services/commandDispatcher";
import { useModelStore } from "../../stores/modelStore";
import { useSelectionStore } from "../../stores/selectionStore";

// Mock the MCP client
vi.mock("../../services/mcpClient", () => ({
  mcpClient: {
    callTool: vi.fn().mockImplementation(({ tool, arguments: args }) => {
      // Return mock success responses
      switch (tool) {
        case "create_wall":
          return Promise.resolve({
            success: true,
            data: {
              wall_id: "wall-test-123",
              length: 5.0,
              height: args.height || 3.0,
              thickness: args.thickness || 0.2,
            },
            event_id: "evt-123",
          });
        case "create_floor":
          return Promise.resolve({
            success: true,
            data: {
              floor_id: "floor-test-123",
              area: 25.0,
              thickness: args.thickness || 0.15,
            },
            event_id: "evt-124",
          });
        case "create_roof":
          return Promise.resolve({
            success: true,
            data: {
              roof_id: "roof-test-123",
              roof_type: args.roof_type || "gable",
              slope_degrees: args.slope_degrees || 30,
              footprint_area: 25.0,
            },
            event_id: "evt-125",
          });
        case "create_room":
          return Promise.resolve({
            success: true,
            data: {
              room_id: "room-test-123",
              name: args.name || "Room",
              area: 25.0,
              volume: 75.0,
            },
            event_id: "evt-126",
          });
        case "detect_rooms":
          return Promise.resolve({
            success: true,
            data: {
              rooms: [{ id: "room-1", area: 25.0 }],
              room_count: 1,
            },
          });
        case "detect_clashes":
          return Promise.resolve({
            success: true,
            data: {
              clashes: [],
              count: 0,
              elements_checked: 5,
            },
          });
        case "create_opening":
          return Promise.resolve({
            success: true,
            data: {
              opening_id: "opening-test-123",
              wall_id: args.wall_id,
              width: args.width || 1.0,
              height: args.height || 2.1,
              base_height: args.base_height || 0,
            },
            event_id: "evt-130",
          });
        default:
          return Promise.resolve({
            success: false,
            error: { code: -32601, message: `Unknown tool: ${tool}` },
          });
      }
    }),
  },
}));

describe("Element Command Handlers", () => {
  beforeEach(() => {
    // Reset stores
    useModelStore.setState({ elements: [], isLoading: false, error: null });
    useSelectionStore.setState({
      selectedIds: [],
      hoveredId: null,
      highlightedIds: [],
    });

    // Register commands
    registerElementCommands();
  });

  describe("Command Registration", () => {
    it("registers wall command", () => {
      const cmd = getCommand("wall");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("wall");
      expect(cmd?.description).toContain("wall");
    });

    it("registers floor command", () => {
      const cmd = getCommand("floor");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("floor");
    });

    it("registers roof command", () => {
      const cmd = getCommand("roof");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("roof");
    });

    it("registers room command", () => {
      const cmd = getCommand("room");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("room");
    });

    it("registers detect-rooms command", () => {
      const cmd = getCommand("detect-rooms");
      expect(cmd).toBeDefined();
    });

    it("registers clash command", () => {
      const cmd = getCommand("clash");
      expect(cmd).toBeDefined();
    });
  });

  describe("Wall Command", () => {
    it("creates wall with valid parameters", async () => {
      const result = await dispatchCommand("wall", {
        start: [0, 0],
        end: [5, 0],
        height: 3.0,
        thickness: 0.2,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Created wall");
      expect(result.elementCreated).toBeDefined();
      expect(result.elementCreated?.type).toBe("wall");
    });

    it("fails without start parameter", async () => {
      const result = await dispatchCommand("wall", {
        end: [5, 0],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Missing");
    });

    it("fails without end parameter", async () => {
      const result = await dispatchCommand("wall", {
        start: [0, 0],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Missing");
    });

    it("adds wall to model store", async () => {
      const result = await dispatchCommand("wall", {
        start: [0, 0],
        end: [5, 0],
      });

      expect(result.success).toBe(true);

      const elements = useModelStore.getState().elements;
      expect(elements.length).toBe(1);
      expect(elements[0].type).toBe("wall");
    });
  });

  describe("Floor Command", () => {
    it("creates floor with valid parameters", async () => {
      const result = await dispatchCommand("floor", {
        min: [0, 0],
        max: [5, 5],
        thickness: 0.15,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Created floor");
      expect(result.elementCreated?.type).toBe("floor");
    });

    it("fails without min parameter", async () => {
      const result = await dispatchCommand("floor", {
        max: [5, 5],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Missing");
    });

    it("adds floor to model store", async () => {
      await dispatchCommand("floor", {
        min: [0, 0],
        max: [5, 5],
      });

      const elements = useModelStore.getState().elements;
      expect(elements.some((e) => e.type === "floor")).toBe(true);
    });
  });

  describe("Roof Command", () => {
    it("creates roof with valid parameters", async () => {
      const result = await dispatchCommand("roof", {
        min: [0, 0],
        max: [10, 10],
        type: "gable",
        slope: 30,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("roof");
      expect(result.elementCreated?.type).toBe("roof");
    });

    it("uses default roof type if not specified", async () => {
      const result = await dispatchCommand("roof", {
        min: [0, 0],
        max: [10, 10],
      });

      expect(result.success).toBe(true);
      expect(result.data?.roof_type).toBe("gable");
    });
  });

  describe("Room Command", () => {
    it("creates room with valid parameters", async () => {
      const result = await dispatchCommand("room", {
        min: [0, 0],
        max: [5, 5],
        name: "Kitchen",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Created room");
    });

    it("creates room with custom name", async () => {
      const result = await dispatchCommand("room", {
        min: [0, 0],
        max: [5, 5],
        name: "Living Room",
        number: "101",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Context-Aware Commands", () => {
    it("uses selected elements for delete command", async () => {
      // Add a wall to the store
      useModelStore.setState({
        elements: [
          {
            id: "wall-to-delete",
            type: "wall",
            name: "Wall",
            x: 0,
            y: 0,
            width: 100,
            height: 12,
            properties: {},
            relationships: {},
            issues: [],
            aiSuggestions: [],
          },
        ],
      });

      // Select it
      useSelectionStore.setState({ selectedIds: ["wall-to-delete"] });

      // Get context
      const context = getCommandContext();
      expect(context.selectedIds).toContain("wall-to-delete");
    });

    it("includes element counts in context", async () => {
      useModelStore.setState({
        elements: [
          {
            id: "wall-1",
            type: "wall",
            name: "Wall 1",
            x: 0,
            y: 0,
            width: 100,
            height: 12,
            properties: {},
            relationships: {},
            issues: [],
            aiSuggestions: [],
          },
          {
            id: "wall-2",
            type: "wall",
            name: "Wall 2",
            x: 0,
            y: 100,
            width: 100,
            height: 12,
            properties: {},
            relationships: {},
            issues: [],
            aiSuggestions: [],
          },
          {
            id: "floor-1",
            type: "floor",
            name: "Floor 1",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            properties: {},
            relationships: {},
            issues: [],
            aiSuggestions: [],
          },
        ],
      });

      const context = getCommandContext();
      expect(context.elementCounts.get("wall")).toBe(2);
      expect(context.elementCounts.get("floor")).toBe(1);
    });
  });

  describe("Detect Rooms Command", () => {
    it("calls MCP tool for room detection", async () => {
      const result = await dispatchCommand("detect-rooms", {});

      expect(result.success).toBe(true);
      expect(result.data?.rooms).toBeDefined();
    });
  });

  describe("Clash Detection Command", () => {
    it("detects clashes without parameters", async () => {
      const result = await dispatchCommand("clash", {});

      expect(result.success).toBe(true);
      expect(result.data?.clashes).toBeDefined();
    });

    it("uses selected elements when available", async () => {
      useSelectionStore.setState({ selectedIds: ["wall-1", "wall-2"] });

      const result = await dispatchCommandWithContext("clash", {});

      expect(result.success).toBe(true);
    });
  });

  describe("List Command", () => {
    beforeEach(() => {
      useModelStore.setState({
        elements: [
          {
            id: "wall-1",
            type: "wall",
            name: "Wall 1",
            x: 0,
            y: 0,
            width: 100,
            height: 12,
            properties: {},
            relationships: {},
            issues: [],
            aiSuggestions: [],
          },
          {
            id: "floor-1",
            type: "floor",
            name: "Floor 1",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            properties: {},
            relationships: {},
            issues: [],
            aiSuggestions: [],
          },
        ],
      });
    });

    it("lists all elements", async () => {
      const result = await dispatchCommand("list", {});

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(2);
    });

    it("filters by category", async () => {
      const result = await dispatchCommand("list", { category: "wall" });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(1);
    });
  });

  describe("Opening Command", () => {
    it("registers opening command", () => {
      const cmd = getCommand("opening");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("opening");
      expect(cmd?.description).toContain("opening");
    });

    it("creates opening with valid parameters", async () => {
      // First create a wall to host the opening
      const wallResult = await dispatchCommand("wall", {
        start: [0, 0],
        end: [5, 0],
        height: 3.0,
        thickness: 0.2,
      });
      expect(wallResult.success).toBe(true);
      const wallId = wallResult.elementCreated?.id;

      const result = await dispatchCommand("opening", {
        wall: wallId,
        offset: 2.5,
        width: 1.0,
        height: 2.1,
        base_height: 0,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("opening");
      expect(result.elementCreated).toBeDefined();
      expect(result.elementCreated?.type).toBe("opening");
    });

    it("fails without wall parameter", async () => {
      const result = await dispatchCommand("opening", {
        offset: 2.0,
        width: 1.0,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("wall");
    });

    it("fails when wall does not exist", async () => {
      const result = await dispatchCommand("opening", {
        wall: "nonexistent-wall",
        offset: 1.0,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("fails when target is not a wall", async () => {
      // Add a floor element
      useModelStore.setState({
        elements: [
          {
            id: "floor-1",
            type: "floor",
            name: "Floor 1",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            properties: {},
            relationships: {},
            issues: [],
            aiSuggestions: [],
          },
        ],
      });

      const result = await dispatchCommand("opening", {
        wall: "floor-1",
        offset: 1.0,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("not a wall");
    });

    it("adds opening to model store and updates wall hosts", async () => {
      const wallResult = await dispatchCommand("wall", {
        start: [0, 0],
        end: [5, 0],
        height: 3.0,
        thickness: 0.2,
      });
      const wallId = wallResult.elementCreated?.id;

      const result = await dispatchCommand("opening", {
        wall: wallId,
        offset: 2.5,
        width: 1.0,
        height: 2.1,
      });

      expect(result.success).toBe(true);
      const openingId = result.elementCreated?.id;

      // Verify opening exists in store
      const opening = useModelStore.getState().getElementById(openingId!);
      expect(opening).toBeDefined();
      expect(opening?.type).toBe("opening");

      // Verify wall hosts relationship updated
      const wall = useModelStore.getState().getElementById(wallId!);
      expect(wall?.relationships.hosts).toContain(openingId);
    });

    it("validates opening fits within wall bounds", async () => {
      const wallResult = await dispatchCommand("wall", {
        start: [0, 0],
        end: [2, 0],
        height: 3.0,
        thickness: 0.2,
      });
      const wallId = wallResult.elementCreated?.id;

      // Try to place opening that extends past wall end
      const result = await dispatchCommand("opening", {
        wall: wallId,
        offset: 1.8,
        width: 1.0,
        height: 2.1,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("invalid");
    });

    it("uses default values when optional params omitted", async () => {
      const wallResult = await dispatchCommand("wall", {
        start: [0, 0],
        end: [10, 0],
        height: 3.0,
        thickness: 0.2,
      });
      const wallId = wallResult.elementCreated?.id;

      const result = await dispatchCommand("opening", {
        wall: wallId,
        offset: 5.0,
      });

      expect(result.success).toBe(true);
      expect(result.data?.width).toBe(1.0);
      expect(result.data?.height).toBe(2.1);
      expect(result.data?.base_height).toBe(0);
    });
  });
});
