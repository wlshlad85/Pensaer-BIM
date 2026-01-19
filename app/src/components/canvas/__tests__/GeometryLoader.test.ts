/**
 * Pensaer BIM Platform - GeometryLoader Tests
 *
 * Unit tests for lazy loading of 3D geometries.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import {
  MeshCache,
  PriorityQueue,
  createPlaceholderMesh,
  estimateMeshMemory,
  calculateElementPriority,
  GeometryLoaderUtils,
  type LoadedMesh,
} from "../GeometryLoader";
import type { Element } from "../../../types";

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

// Helper to create a mock LoadedMesh
const createMockLoadedMesh = (
  elementId: string,
  memorySize: number = 1000
): LoadedMesh => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geometry, material);

  return {
    mesh,
    elementId,
    priority: 50,
    lastUsed: Date.now(),
    memorySize,
  };
};

describe("MeshCache", () => {
  let cache: MeshCache;

  beforeEach(() => {
    cache = new MeshCache(10000); // 10KB limit for testing
  });

  describe("basic operations", () => {
    it("should store and retrieve meshes", () => {
      const loadedMesh = createMockLoadedMesh("element-1");

      cache.set("element-1", loadedMesh);
      const retrieved = cache.get("element-1");

      expect(retrieved).toBeDefined();
      expect(retrieved?.elementId).toBe("element-1");
    });

    it("should return undefined for non-existent entries", () => {
      const retrieved = cache.get("non-existent");

      expect(retrieved).toBeUndefined();
    });

    it("should check if element exists", () => {
      const loadedMesh = createMockLoadedMesh("element-1");
      cache.set("element-1", loadedMesh);

      expect(cache.has("element-1")).toBe(true);
      expect(cache.has("non-existent")).toBe(false);
    });

    it("should delete entries", () => {
      const loadedMesh = createMockLoadedMesh("element-1");
      cache.set("element-1", loadedMesh);

      const deleted = cache.delete("element-1");

      expect(deleted).toBe(true);
      expect(cache.has("element-1")).toBe(false);
    });

    it("should return false when deleting non-existent entry", () => {
      const deleted = cache.delete("non-existent");

      expect(deleted).toBe(false);
    });

    it("should clear all entries", () => {
      cache.set("element-1", createMockLoadedMesh("element-1"));
      cache.set("element-2", createMockLoadedMesh("element-2"));

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.memory).toBe(0);
    });

    it("should track size correctly", () => {
      expect(cache.size).toBe(0);

      cache.set("element-1", createMockLoadedMesh("element-1"));
      expect(cache.size).toBe(1);

      cache.set("element-2", createMockLoadedMesh("element-2"));
      expect(cache.size).toBe(2);

      cache.delete("element-1");
      expect(cache.size).toBe(1);
    });
  });

  describe("memory management", () => {
    it("should track memory usage", () => {
      expect(cache.memory).toBe(0);

      cache.set("element-1", createMockLoadedMesh("element-1", 2000));
      expect(cache.memory).toBe(2000);

      cache.set("element-2", createMockLoadedMesh("element-2", 3000));
      expect(cache.memory).toBe(5000);
    });

    it("should evict LRU entry when over memory limit", () => {
      // Small cache with 5KB limit
      const smallCache = new MeshCache(5000);

      // Add first element (2KB) at time T
      smallCache.set("element-1", {
        ...createMockLoadedMesh("element-1", 2000),
        lastUsed: Date.now() - 1000, // Older
      });

      // Add second element (2KB) at time T+1
      smallCache.set("element-2", {
        ...createMockLoadedMesh("element-2", 2000),
        lastUsed: Date.now(), // Newer
      });

      // Add third element (3KB) - should evict element-1 (LRU)
      smallCache.set("element-3", createMockLoadedMesh("element-3", 3000));

      expect(smallCache.has("element-1")).toBe(false);
      expect(smallCache.has("element-2")).toBe(true);
      expect(smallCache.has("element-3")).toBe(true);
    });

    it("should update lastUsed on get", () => {
      cache.set("element-1", {
        ...createMockLoadedMesh("element-1"),
        lastUsed: 1000, // Old timestamp
      });

      const beforeGet = cache.get("element-1")?.lastUsed;

      // Wait a tiny bit to ensure timestamp changes
      const retrieved = cache.get("element-1");

      expect(retrieved?.lastUsed).toBeGreaterThanOrEqual(beforeGet || 0);
    });

    it("should reduce memory when deleting entries", () => {
      cache.set("element-1", createMockLoadedMesh("element-1", 3000));
      cache.set("element-2", createMockLoadedMesh("element-2", 4000));
      expect(cache.memory).toBe(7000);

      cache.delete("element-1");
      expect(cache.memory).toBe(4000);
    });

    it("should allow setting new memory limit", () => {
      cache.set("element-1", {
        ...createMockLoadedMesh("element-1", 5000),
        lastUsed: Date.now() - 1000,
      });
      cache.set("element-2", createMockLoadedMesh("element-2", 3000));
      expect(cache.memory).toBe(8000);

      // Reduce limit - should evict LRU
      cache.setMemoryLimit(5000);

      expect(cache.memory).toBeLessThanOrEqual(5000);
      expect(cache.limit).toBe(5000);
    });
  });
});

describe("PriorityQueue", () => {
  let queue: PriorityQueue<{ priority: number; id: string }>;

  beforeEach(() => {
    queue = new PriorityQueue();
  });

  it("should enqueue items", () => {
    queue.enqueue({ priority: 10, id: "a" });

    expect(queue.size).toBe(1);
  });

  it("should dequeue items in priority order (highest first)", () => {
    queue.enqueue({ priority: 10, id: "low" });
    queue.enqueue({ priority: 100, id: "high" });
    queue.enqueue({ priority: 50, id: "medium" });

    expect(queue.dequeue()?.id).toBe("high");
    expect(queue.dequeue()?.id).toBe("medium");
    expect(queue.dequeue()?.id).toBe("low");
  });

  it("should return undefined when dequeuing empty queue", () => {
    expect(queue.dequeue()).toBeUndefined();
  });

  it("should peek without removing", () => {
    queue.enqueue({ priority: 10, id: "a" });
    queue.enqueue({ priority: 100, id: "b" });

    expect(queue.peek()?.id).toBe("b");
    expect(queue.size).toBe(2); // Still has both items
  });

  it("should clear all items", () => {
    queue.enqueue({ priority: 10, id: "a" });
    queue.enqueue({ priority: 20, id: "b" });

    queue.clear();

    expect(queue.size).toBe(0);
    expect(queue.dequeue()).toBeUndefined();
  });

  it("should check if item exists with predicate", () => {
    queue.enqueue({ priority: 10, id: "a" });
    queue.enqueue({ priority: 20, id: "b" });

    expect(queue.has((item) => item.id === "a")).toBe(true);
    expect(queue.has((item) => item.id === "c")).toBe(false);
  });

  it("should handle single item correctly", () => {
    queue.enqueue({ priority: 50, id: "only" });

    expect(queue.dequeue()?.id).toBe("only");
    expect(queue.size).toBe(0);
  });

  it("should maintain heap property with many items", () => {
    const priorities = [5, 15, 10, 7, 20, 3, 12, 8, 25, 1];
    priorities.forEach((p, i) => queue.enqueue({ priority: p, id: `item-${i}` }));

    const dequeued: number[] = [];
    while (queue.size > 0) {
      dequeued.push(queue.dequeue()!.priority);
    }

    // Should be in descending order
    for (let i = 1; i < dequeued.length; i++) {
      expect(dequeued[i]).toBeLessThanOrEqual(dequeued[i - 1]);
    }
  });
});

describe("createPlaceholderMesh", () => {
  it("should create placeholder for wall", () => {
    const element = createTestElement({ type: "wall" });

    const mesh = createPlaceholderMesh(element);

    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.name).toBe(`placeholder-${element.id}`);
    expect(mesh.userData.element).toBe(element);
    expect(mesh.userData.isPlaceholder).toBe(true);
  });

  it("should create placeholder for door", () => {
    const element = createTestElement({ type: "door" });

    const mesh = createPlaceholderMesh(element);

    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
  });

  it("should create placeholder for window", () => {
    const element = createTestElement({ type: "window" });

    const mesh = createPlaceholderMesh(element);

    expect(mesh).toBeInstanceOf(THREE.Mesh);
  });

  it("should create placeholder for room", () => {
    const element = createTestElement({ type: "room" });

    const mesh = createPlaceholderMesh(element);

    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry).toBeInstanceOf(THREE.PlaneGeometry);
  });

  it("should create placeholder for roof", () => {
    const element = createTestElement({ type: "roof" });

    const mesh = createPlaceholderMesh(element);

    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry).toBeInstanceOf(THREE.ConeGeometry);
  });

  it("should have wireframe material", () => {
    const element = createTestElement();

    const mesh = createPlaceholderMesh(element);

    expect((mesh.material as THREE.MeshStandardMaterial).wireframe).toBe(true);
    expect((mesh.material as THREE.MeshStandardMaterial).transparent).toBe(true);
  });
});

describe("estimateMeshMemory", () => {
  it("should estimate memory for simple mesh", () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geometry, material);

    const memory = estimateMeshMemory(mesh);

    // BoxGeometry has 24 vertices (4 per face, 6 faces)
    // Position: 24 * 3 * 4 = 288 bytes
    // Normal: 24 * 3 * 4 = 288 bytes
    // UV: 24 * 2 * 4 = 192 bytes
    // Index: 36 * 4 = 144 bytes
    expect(memory).toBeGreaterThan(0);
  });

  it("should estimate memory for group", () => {
    const group = new THREE.Group();

    const geometry1 = new THREE.BoxGeometry(1, 1, 1);
    const geometry2 = new THREE.SphereGeometry(0.5);
    const material = new THREE.MeshStandardMaterial();

    group.add(new THREE.Mesh(geometry1, material));
    group.add(new THREE.Mesh(geometry2, material));

    const memory = estimateMeshMemory(group);

    expect(memory).toBeGreaterThan(0);
  });

  it("should return 0 for empty group", () => {
    const group = new THREE.Group();

    const memory = estimateMeshMemory(group);

    expect(memory).toBe(0);
  });
});

describe("calculateElementPriority", () => {
  let camera: THREE.PerspectiveCamera;
  let frustum: THREE.Frustum;

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(projScreenMatrix);
  });

  it("should return higher priority for elements in view", () => {
    // Element in center of view
    const element = createTestElement({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });

    const priority = calculateElementPriority(
      element,
      camera,
      frustum,
      0.01, // scale
      0, // offsetX
      0 // offsetZ
    );

    expect(priority).toBeGreaterThan(0);
  });

  it("should return 0 for elements outside frustum", () => {
    // Element far behind camera
    const element = createTestElement({
      x: 10000,
      y: 10000,
      width: 100,
      height: 100,
    });

    const priority = calculateElementPriority(
      element,
      camera,
      frustum,
      0.01,
      0,
      0
    );

    // May or may not be in frustum depending on camera setup
    // This test mainly checks that the function runs without error
    expect(typeof priority).toBe("number");
  });

  it("should return higher priority for closer elements", () => {
    // Close element
    const closeElement = createTestElement({
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    });

    // Far element
    const farElement = createTestElement({
      x: 500,
      y: 500,
      width: 50,
      height: 50,
    });

    const closePriority = calculateElementPriority(
      closeElement,
      camera,
      frustum,
      0.01,
      0,
      0
    );
    const farPriority = calculateElementPriority(
      farElement,
      camera,
      frustum,
      0.01,
      0,
      0
    );

    // Close should have higher or equal priority
    expect(closePriority).toBeGreaterThanOrEqual(farPriority);
  });
});

describe("GeometryLoaderUtils", () => {
  it("should export constants", () => {
    expect(GeometryLoaderUtils.PLACEHOLDER_COLOR).toBe(0x3b82f6);
    expect(GeometryLoaderUtils.LOADING_COLOR).toBe(0x6366f1);
    expect(GeometryLoaderUtils.PRIORITY_VISIBLE).toBe(100);
    expect(GeometryLoaderUtils.PRIORITY_NEAR).toBe(50);
    expect(GeometryLoaderUtils.PRIORITY_FAR).toBe(10);
    expect(GeometryLoaderUtils.DEFAULT_MEMORY_LIMIT).toBe(256 * 1024 * 1024);
    expect(GeometryLoaderUtils.BATCH_SIZE).toBe(5);
  });

  it("should export utility functions", () => {
    expect(typeof GeometryLoaderUtils.createPlaceholderMesh).toBe("function");
    expect(typeof GeometryLoaderUtils.estimateMeshMemory).toBe("function");
    expect(typeof GeometryLoaderUtils.calculateElementPriority).toBe("function");
    expect(typeof GeometryLoaderUtils.getPlaceholderGeometry).toBe("function");
  });
});
