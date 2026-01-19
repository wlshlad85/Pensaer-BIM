/**
 * Pensaer BIM Platform - Model Store Tests
 *
 * Comprehensive unit tests for the model store.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useModelStore } from "../modelStore";
import type { Element, Level } from "../../types";

// Helper to create a test element
const createTestElement = (overrides: Partial<Element> = {}): Element => ({
  id: `test-${Date.now()}-${Math.random()}`,
  type: "wall",
  name: "Test Wall",
  x: 0,
  y: 0,
  width: 100,
  height: 10,
  properties: {},
  relationships: {},
  issues: [],
  aiSuggestions: [],
  ...overrides,
});

// Helper to create a test level
const createTestLevel = (overrides: Partial<Level> = {}): Level => ({
  id: `level-${Date.now()}-${Math.random()}`,
  name: "Test Level",
  elevation: 0,
  height: 3000,
  ...overrides,
});

describe("modelStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useModelStore.setState({
      elements: [],
      levels: [],
      isLoading: false,
      error: null,
    });
  });

  describe("Element CRUD Operations", () => {
    it("should add an element", () => {
      const element = createTestElement({ id: "wall-1", name: "Wall 1" });

      useModelStore.getState().addElement(element);

      const elements = useModelStore.getState().elements;
      expect(elements).toHaveLength(1);
      expect(elements[0].id).toBe("wall-1");
      expect(elements[0].name).toBe("Wall 1");
    });

    it("should update an element", () => {
      const element = createTestElement({ id: "wall-1", name: "Original Name" });
      useModelStore.getState().addElement(element);

      useModelStore.getState().updateElement("wall-1", { name: "Updated Name" });

      const updated = useModelStore.getState().getElementById("wall-1");
      expect(updated?.name).toBe("Updated Name");
    });

    it("should not modify other elements when updating", () => {
      const element1 = createTestElement({ id: "wall-1", name: "Wall 1" });
      const element2 = createTestElement({ id: "wall-2", name: "Wall 2" });
      useModelStore.getState().addElement(element1);
      useModelStore.getState().addElement(element2);

      useModelStore.getState().updateElement("wall-1", { name: "Updated" });

      const wall2 = useModelStore.getState().getElementById("wall-2");
      expect(wall2?.name).toBe("Wall 2");
    });

    it("should handle updating non-existent element", () => {
      useModelStore.getState().updateElement("non-existent", { name: "Test" });

      // Should not throw, just do nothing
      expect(useModelStore.getState().elements).toHaveLength(0);
    });

    it("should delete a single element", () => {
      const element = createTestElement({ id: "wall-1" });
      useModelStore.getState().addElement(element);
      expect(useModelStore.getState().elements).toHaveLength(1);

      useModelStore.getState().deleteElement("wall-1");

      expect(useModelStore.getState().elements).toHaveLength(0);
    });

    it("should delete multiple elements", () => {
      const elements = [
        createTestElement({ id: "wall-1" }),
        createTestElement({ id: "wall-2" }),
        createTestElement({ id: "wall-3" }),
      ];
      elements.forEach((el) => useModelStore.getState().addElement(el));

      useModelStore.getState().deleteElements(["wall-1", "wall-3"]);

      const remaining = useModelStore.getState().elements;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("wall-2");
    });
  });

  describe("Bulk Operations", () => {
    it("should set all elements", () => {
      const elements = [
        createTestElement({ id: "wall-1" }),
        createTestElement({ id: "wall-2" }),
      ];

      useModelStore.getState().setElements(elements);

      expect(useModelStore.getState().elements).toHaveLength(2);
    });

    it("should replace existing elements when setting", () => {
      useModelStore.getState().addElement(createTestElement({ id: "old-wall" }));

      useModelStore.getState().setElements([
        createTestElement({ id: "new-wall" }),
      ]);

      const elements = useModelStore.getState().elements;
      expect(elements).toHaveLength(1);
      expect(elements[0].id).toBe("new-wall");
    });

    it("should clear all elements", () => {
      useModelStore.getState().setElements([
        createTestElement({ id: "wall-1" }),
        createTestElement({ id: "wall-2" }),
      ]);

      useModelStore.getState().clearElements();

      expect(useModelStore.getState().elements).toHaveLength(0);
    });
  });

  describe("Query Helpers", () => {
    beforeEach(() => {
      useModelStore.getState().setElements([
        createTestElement({ id: "wall-1", type: "wall" }),
        createTestElement({ id: "wall-2", type: "wall" }),
        createTestElement({ id: "door-1", type: "door" }),
        createTestElement({ id: "window-1", type: "window" }),
      ]);
    });

    it("should get element by ID", () => {
      const element = useModelStore.getState().getElementById("door-1");

      expect(element).toBeDefined();
      expect(element?.id).toBe("door-1");
      expect(element?.type).toBe("door");
    });

    it("should return undefined for non-existent ID", () => {
      const element = useModelStore.getState().getElementById("non-existent");

      expect(element).toBeUndefined();
    });

    it("should get elements by type", () => {
      const walls = useModelStore.getState().getElementsByType("wall");

      expect(walls).toHaveLength(2);
      expect(walls.every((el) => el.type === "wall")).toBe(true);
    });

    it("should return empty array for type with no elements", () => {
      const rooms = useModelStore.getState().getElementsByType("room");

      expect(rooms).toHaveLength(0);
    });

    it("should get related elements", () => {
      // Set up relationships
      useModelStore.getState().setElements([
        createTestElement({
          id: "wall-1",
          type: "wall",
          relationships: { hosts: ["door-1", "window-1"] },
        }),
        createTestElement({ id: "door-1", type: "door" }),
        createTestElement({ id: "window-1", type: "window" }),
        createTestElement({ id: "wall-2", type: "wall" }),
      ]);

      const related = useModelStore.getState().getRelatedElements("wall-1");

      expect(related).toHaveLength(2);
      expect(related.map((el) => el.id)).toContain("door-1");
      expect(related.map((el) => el.id)).toContain("window-1");
    });

    it("should return empty array for element with no relationships", () => {
      const related = useModelStore.getState().getRelatedElements("wall-1");

      expect(related).toHaveLength(0);
    });

    it("should return empty array for non-existent element", () => {
      const related = useModelStore.getState().getRelatedElements("non-existent");

      expect(related).toHaveLength(0);
    });
  });

  describe("Level Operations", () => {
    it("should add a level", () => {
      const level = createTestLevel({ id: "level-1", name: "Ground Floor" });

      useModelStore.getState().addLevel(level);

      expect(useModelStore.getState().levels).toHaveLength(1);
      expect(useModelStore.getState().levels[0].name).toBe("Ground Floor");
    });

    it("should update a level", () => {
      const level = createTestLevel({ id: "level-1", elevation: 0 });
      useModelStore.getState().addLevel(level);

      useModelStore.getState().updateLevel("level-1", { elevation: 3000 });

      const updated = useModelStore.getState().getLevelById("level-1");
      expect(updated?.elevation).toBe(3000);
    });

    it("should delete a level", () => {
      useModelStore.getState().addLevel(createTestLevel({ id: "level-1" }));
      useModelStore.getState().addLevel(createTestLevel({ id: "level-2" }));

      useModelStore.getState().deleteLevel("level-1");

      expect(useModelStore.getState().levels).toHaveLength(1);
      expect(useModelStore.getState().levels[0].id).toBe("level-2");
    });

    it("should set all levels", () => {
      const levels = [
        createTestLevel({ id: "level-1" }),
        createTestLevel({ id: "level-2" }),
      ];

      useModelStore.getState().setLevels(levels);

      expect(useModelStore.getState().levels).toHaveLength(2);
    });
  });

  describe("Level Query Helpers", () => {
    beforeEach(() => {
      useModelStore.getState().setLevels([
        createTestLevel({ id: "level-1", name: "Ground Floor", elevation: 0 }),
        createTestLevel({ id: "level-2", name: "First Floor", elevation: 3000 }),
        createTestLevel({ id: "level-3", name: "Second Floor", elevation: 6000 }),
      ]);
    });

    it("should get level by ID", () => {
      const level = useModelStore.getState().getLevelById("level-2");

      expect(level).toBeDefined();
      expect(level?.name).toBe("First Floor");
    });

    it("should get level by name", () => {
      const level = useModelStore.getState().getLevelByName("First Floor");

      expect(level).toBeDefined();
      expect(level?.id).toBe("level-2");
    });

    it("should get levels ordered by elevation", () => {
      // Add levels in random order
      useModelStore.getState().setLevels([
        createTestLevel({ id: "l2", name: "Level 2", elevation: 6000 }),
        createTestLevel({ id: "l0", name: "Level 0", elevation: 0 }),
        createTestLevel({ id: "l1", name: "Level 1", elevation: 3000 }),
      ]);

      const ordered = useModelStore.getState().getLevelsOrdered();

      expect(ordered[0].elevation).toBe(0);
      expect(ordered[1].elevation).toBe(3000);
      expect(ordered[2].elevation).toBe(6000);
    });

    it("should get elements by level", () => {
      useModelStore.getState().setLevels([
        createTestLevel({ id: "level-1", name: "Ground Floor" }),
      ]);
      useModelStore.getState().setElements([
        createTestElement({ id: "wall-1", level: "Ground Floor" }),
        createTestElement({ id: "wall-2", properties: { level: "Ground Floor" } }),
        createTestElement({ id: "wall-3", level: "First Floor" }),
      ]);

      const groundFloorElements = useModelStore.getState().getElementsByLevel("level-1");

      expect(groundFloorElements).toHaveLength(2);
    });
  });

  describe("Properties", () => {
    it("should update element properties", () => {
      const element = createTestElement({
        id: "wall-1",
        properties: { material: "Concrete", thickness: "200mm" },
      });
      useModelStore.getState().addElement(element);

      useModelStore.getState().updateProperties("wall-1", {
        thickness: "300mm",
        fireRating: "60min",
      });

      const updated = useModelStore.getState().getElementById("wall-1");
      expect(updated?.properties.material).toBe("Concrete");
      expect(updated?.properties.thickness).toBe("300mm");
      expect(updated?.properties.fireRating).toBe("60min");
    });
  });

  describe("Loading State", () => {
    it("should set loading state", () => {
      expect(useModelStore.getState().isLoading).toBe(false);

      useModelStore.getState().setLoading(true);

      expect(useModelStore.getState().isLoading).toBe(true);

      useModelStore.getState().setLoading(false);

      expect(useModelStore.getState().isLoading).toBe(false);
    });

    it("should set error state", () => {
      expect(useModelStore.getState().error).toBeNull();

      useModelStore.getState().setError("Something went wrong");

      expect(useModelStore.getState().error).toBe("Something went wrong");

      useModelStore.getState().setError(null);

      expect(useModelStore.getState().error).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty array operations", () => {
      useModelStore.getState().setElements([]);
      useModelStore.getState().deleteElements([]);

      expect(useModelStore.getState().elements).toHaveLength(0);
    });

    it("should handle duplicate element IDs gracefully", () => {
      const element1 = createTestElement({ id: "same-id", name: "First" });
      const element2 = createTestElement({ id: "same-id", name: "Second" });

      useModelStore.getState().addElement(element1);
      useModelStore.getState().addElement(element2);

      // Both are added (store doesn't enforce uniqueness)
      expect(useModelStore.getState().elements).toHaveLength(2);

      // getElementById returns the first match
      const found = useModelStore.getState().getElementById("same-id");
      expect(found?.name).toBe("First");
    });

    it("should handle complex nested updates", () => {
      const element = createTestElement({
        id: "wall-1",
        properties: { nested: { value: 1 } as unknown as string },
      });
      useModelStore.getState().addElement(element);

      useModelStore.getState().updateElement("wall-1", {
        properties: { nested: { value: 2 } as unknown as string },
      });

      const updated = useModelStore.getState().getElementById("wall-1");
      expect((updated?.properties.nested as unknown as { value: number })?.value).toBe(2);
    });
  });
});
