/**
 * MockMCPClient Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockMCPClient } from "./MockMCPClient";

describe("MockMCPClient", () => {
  let client: MockMCPClient;

  beforeEach(() => {
    // Create client with minimal delay for faster tests
    client = new MockMCPClient({
      baseDelay: 0,
      delayVariance: 0,
      simulateErrors: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("mode and configuration", () => {
    it("should return mock mode", () => {
      expect(client.getMode()).toBe("mock");
    });

    it("should always report as mock mode", () => {
      expect(client.isMockMode()).toBe(true);
    });

    it("should allow updating configuration", () => {
      client.setConfig({ baseDelay: 500 });
      const config = client.getConfig();
      expect(config.baseDelay).toBe(500);
    });

    it("should preserve other config when updating", () => {
      client.setConfig({ baseDelay: 500 });
      const config = client.getConfig();
      expect(config.delayVariance).toBe(0);
    });
  });

  describe("geometry tools", () => {
    it("should mock create_wall", async () => {
      const result = await client.callTool({
        tool: "create_wall",
        arguments: {
          start: [0, 0],
          end: [5, 0],
          height: 3.0,
          thickness: 0.2,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.wall_id).toBeDefined();
      expect(result.data?.length).toBeCloseTo(5, 2);
      expect(result.data?.height).toBe(3.0);
      expect(result.data?.thickness).toBe(0.2);
      expect(result.event_id).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it("should mock create_floor", async () => {
      const result = await client.callTool({
        tool: "create_floor",
        arguments: {
          min_point: [0, 0],
          max_point: [10, 10],
          thickness: 0.3,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.floor_id).toBeDefined();
      expect(result.data?.area).toBe(100);
      expect(result.data?.thickness).toBe(0.3);
    });

    it("should mock create_room", async () => {
      const result = await client.callTool({
        tool: "create_room",
        arguments: {
          min_point: [0, 0],
          max_point: [5, 4],
          height: 3.0,
          name: "Living Room",
          number: "101",
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.room_id).toBeDefined();
      expect(result.data?.area).toBe(20);
      expect(result.data?.volume).toBe(60);
      expect(result.data?.name).toBe("Living Room");
    });

    it("should mock create_roof", async () => {
      const result = await client.callTool({
        tool: "create_roof",
        arguments: {
          min_point: [0, 0],
          max_point: [10, 8],
          roof_type: "gable",
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.roof_id).toBeDefined();
      expect(result.data?.footprint_area).toBe(80);
      expect(result.data?.roof_type).toBe("gable");
    });

    it("should mock place_door", async () => {
      const result = await client.callTool({
        tool: "place_door",
        arguments: {
          wall_id: "wall-123",
          width: 0.9,
          height: 2.1,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.door_id).toBeDefined();
      expect(result.data?.wall_id).toBe("wall-123");
      expect(result.data?.width).toBe(0.9);
    });

    it("should mock place_window", async () => {
      const result = await client.callTool({
        tool: "place_window",
        arguments: {
          wall_id: "wall-456",
          width: 1.2,
          height: 1.0,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.window_id).toBeDefined();
      expect(result.data?.wall_id).toBe("wall-456");
    });
  });

  describe("query tools", () => {
    it("should mock list_elements", async () => {
      const result = await client.callTool({
        tool: "list_elements",
        arguments: {},
      });

      expect(result.success).toBe(true);
      expect(result.data?.elements).toBeInstanceOf(Array);
      expect(result.data?.count).toBeGreaterThan(0);
    });

    it("should mock list_elements with category filter", async () => {
      const result = await client.callTool({
        tool: "list_elements",
        arguments: { category: "wall" },
      });

      expect(result.success).toBe(true);
      const elements = result.data?.elements as Array<{ type: string }>;
      expect(elements.every((e) => e.type === "wall")).toBe(true);
    });

    it("should mock get_element", async () => {
      const result = await client.callTool({
        tool: "get_element",
        arguments: { element_id: "wall-abc" },
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("wall-abc");
    });

    it("should mock delete_element", async () => {
      const result = await client.callTool({
        tool: "delete_element",
        arguments: { element_ids: ["wall-1", "wall-2"] },
      });

      expect(result.success).toBe(true);
      expect(result.data?.deleted_count).toBe(2);
    });

    it("should mock get_state_summary", async () => {
      const result = await client.callTool({
        tool: "get_state_summary",
        arguments: {},
      });

      expect(result.success).toBe(true);
      expect(result.data?.element_counts).toBeDefined();
      expect(result.data?.total_elements).toBeGreaterThan(0);
    });
  });

  describe("spatial tools", () => {
    it("should mock detect_rooms", async () => {
      const result = await client.callTool({
        tool: "detect_rooms",
        arguments: {},
      });

      expect(result.success).toBe(true);
      expect(result.data?.rooms).toBeInstanceOf(Array);
      expect(result.data?.room_count).toBeGreaterThanOrEqual(0);
    });

    it("should mock analyze_wall_topology", async () => {
      const result = await client.callTool({
        tool: "analyze_wall_topology",
        arguments: {},
      });

      expect(result.success).toBe(true);
      expect(result.data?.node_count).toBeDefined();
      expect(result.data?.edge_count).toBeDefined();
      expect(result.data?.is_connected).toBe(true);
    });
  });

  describe("validation tools", () => {
    it("should mock detect_clashes", async () => {
      const result = await client.callTool({
        tool: "detect_clashes",
        arguments: { tolerance: 0.001 },
      });

      expect(result.success).toBe(true);
      expect(result.data?.clashes).toBeInstanceOf(Array);
      expect(result.data?.tolerance).toBe(0.001);
    });

    it("should mock detect_clashes with clearance", async () => {
      const result = await client.callTool({
        tool: "detect_clashes",
        arguments: { clearance: 0.5 },
      });

      expect(result.success).toBe(true);
      const clashes = result.data?.clashes as Array<{ clash_type: string }>;
      expect(clashes.some((c) => c.clash_type === "Clearance")).toBe(true);
    });

    it("should mock detect_clashes_between_sets", async () => {
      const result = await client.callTool({
        tool: "detect_clashes_between_sets",
        arguments: {
          set_a_ids: ["wall-1"],
          set_b_ids: ["door-1"],
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.set_a_count).toBe(1);
      expect(result.data?.set_b_count).toBe(1);
    });
  });

  describe("unknown tool", () => {
    it("should return error for unknown tool", async () => {
      const result = await client.callTool({
        tool: "nonexistent_tool",
        arguments: {},
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(-32601);
      expect(result.error?.message).toContain("Unknown tool");
    });

    it("should include available tools in error", async () => {
      const result = await client.callTool({
        tool: "nonexistent_tool",
        arguments: {},
      });

      expect(result.error?.data?.available_tools).toBeInstanceOf(Array);
    });
  });

  describe("delay simulation", () => {
    it("should simulate delay", async () => {
      const delayClient = new MockMCPClient({
        baseDelay: 50,
        delayVariance: 0,
      });

      const start = Date.now();
      await delayClient.callTool({
        tool: "get_state_summary",
        arguments: {},
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow 5ms tolerance
    });
  });

  describe("error simulation", () => {
    it("should simulate errors when enabled", async () => {
      const errorClient = new MockMCPClient({
        baseDelay: 0,
        delayVariance: 0,
        simulateErrors: true,
        errorRate: 1.0, // Always error
      });

      const result = await errorClient.callTool({
        tool: "create_wall",
        arguments: { start: [0, 0], end: [5, 0] },
      });

      expect(result.success).toBe(false);
      expect(result.error?.data?.simulated).toBe(true);
    });

    it("should not simulate errors when disabled", async () => {
      const noErrorClient = new MockMCPClient({
        baseDelay: 0,
        delayVariance: 0,
        simulateErrors: false,
      });

      const result = await noErrorClient.callTool({
        tool: "create_wall",
        arguments: { start: [0, 0], end: [5, 0] },
      });

      expect(result.success).toBe(true);
    });
  });

  describe("static methods", () => {
    it("should return available tools", () => {
      const tools = MockMCPClient.getAvailableTools();
      expect(tools).toContain("create_wall");
      expect(tools).toContain("create_floor");
      expect(tools).toContain("detect_clashes");
    });

    it("should allow registering custom handlers", async () => {
      const customHandler = vi.fn().mockReturnValue({
        success: true,
        data: { custom: "data" },
      });

      MockMCPClient.registerMockHandler("custom_tool", customHandler);

      const result = await client.callTool({
        tool: "custom_tool",
        arguments: { foo: "bar" },
      });

      expect(customHandler).toHaveBeenCalledWith({ foo: "bar" });
      expect(result.data?.custom).toBe("data");
    });
  });
});
