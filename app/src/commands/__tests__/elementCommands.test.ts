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
        case "create_stair":
          return Promise.resolve({
            success: true,
            data: {
              stair_id: "stair-test-123",
              risers: args.risers || 14,
              riser_height: args.riser_height || 0.17,
              tread_depth: args.tread_depth || 0.28,
              width: args.width || 1.0,
              stair_type: args.stair_type || "straight",
            },
            event_id: "evt-130",
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

    it("registers stair command", () => {
      const cmd = getCommand("stair");
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe("stair");
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

  describe("Stair Command", () => {
    it("creates stair with valid parameters", async () => {
      const result = await dispatchCommand("stair", {
        position: [2, 3],
        width: 1.2,
        risers: 14,
        "riser-height": 0.17,
        "tread-depth": 0.28,
        type: "straight",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("stair");
      expect(result.elementCreated).toBeDefined();
      expect(result.elementCreated?.type).toBe("stair");
    });

    it("fails without position parameter", async () => {
      const result = await dispatchCommand("stair", { risers: 14 });
      expect(result.success).toBe(false);
      expect(result.message).toContain("position");
    });

    it("fails without risers parameter", async () => {
      const result = await dispatchCommand("stair", { position: [0, 0] });
      expect(result.success).toBe(false);
      expect(result.message).toContain("risers");
    });

    it("fails with invalid stair type", async () => {
      const result = await dispatchCommand("stair", {
        position: [0, 0],
        risers: 14,
        type: "zigzag",
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid stair type");
    });

    it("adds stair to model store", async () => {
      const result = await dispatchCommand("stair", {
        position: [0, 0],
        risers: 14,
        type: "straight",
      });
      expect(result.success).toBe(true);
      const elements = useModelStore.getState().elements;
      expect(elements.some((e) => e.type === "stair")).toBe(true);
    });

    it("uses default values for optional parameters", async () => {
      const result = await dispatchCommand("stair", {
        position: [0, 0],
        risers: 10,
        type: "straight",
      });
      expect(result.success).toBe(true);
      expect(result.data?.width).toBe(1.0);
      expect(result.data?.riser_height).toBe(0.17);
      expect(result.data?.tread_depth).toBe(0.28);
    });

    it("supports L-shaped stair type", async () => {
      const result = await dispatchCommand("stair", {
        position: [0, 0],
        risers: 20,
        type: "L",
      });
      expect(result.success).toBe(true);
      expect(result.data?.stair_type).toBe("L");
    });

    it("supports spiral stair type", async () => {
      const result = await dispatchCommand("stair", {
        position: [5, 5],
        risers: 18,
        width: 0.9,
        type: "spiral",
      });
      expect(result.success).toBe(true);
      expect(result.data?.stair_type).toBe("spiral");
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
});
