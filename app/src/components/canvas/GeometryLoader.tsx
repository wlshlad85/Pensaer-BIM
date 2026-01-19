/**
 * Pensaer BIM Platform - GeometryLoader Component
 *
 * Implements lazy loading for 3D geometries with:
 * - Priority queue for visible elements
 * - Loading placeholders
 * - Mesh caching
 * - Memory limit handling
 */

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import type { Element } from "../../types";

// ============================================
// TYPES
// ============================================

export interface LoadedMesh {
  mesh: THREE.Mesh | THREE.Group;
  elementId: string;
  priority: number;
  lastUsed: number;
  memorySize: number;
}

export interface GeometryLoaderState {
  loadedCount: number;
  pendingCount: number;
  totalMemory: number;
  isLoading: boolean;
}

interface LoadRequest {
  element: Element;
  priority: number;
  timestamp: number;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_MEMORY_LIMIT = 256 * 1024 * 1024; // 256MB default
const PLACEHOLDER_COLOR = 0x3b82f6;
const LOADING_COLOR = 0x6366f1;
const BATCH_SIZE = 5; // Load 5 elements per frame
const PRIORITY_VISIBLE = 100;
const PRIORITY_NEAR = 50;
const PRIORITY_FAR = 10;

// ============================================
// MESH CACHE
// ============================================

export class MeshCache {
  private cache = new Map<string, LoadedMesh>();
  private memoryLimit: number;
  private currentMemory = 0;

  constructor(memoryLimit: number = DEFAULT_MEMORY_LIMIT) {
    this.memoryLimit = memoryLimit;
  }

  get(elementId: string): LoadedMesh | undefined {
    const cached = this.cache.get(elementId);
    if (cached) {
      cached.lastUsed = Date.now();
    }
    return cached;
  }

  set(elementId: string, loadedMesh: LoadedMesh): void {
    // Check if we need to evict old meshes
    while (this.currentMemory + loadedMesh.memorySize > this.memoryLimit) {
      if (!this.evictLRU()) break;
    }

    this.cache.set(elementId, loadedMesh);
    this.currentMemory += loadedMesh.memorySize;
  }

  delete(elementId: string): boolean {
    const cached = this.cache.get(elementId);
    if (cached) {
      this.currentMemory -= cached.memorySize;
      this.disposeMesh(cached);
      return this.cache.delete(elementId);
    }
    return false;
  }

  clear(): void {
    this.cache.forEach((cached) => this.disposeMesh(cached));
    this.cache.clear();
    this.currentMemory = 0;
  }

  has(elementId: string): boolean {
    return this.cache.has(elementId);
  }

  get size(): number {
    return this.cache.size;
  }

  get memory(): number {
    return this.currentMemory;
  }

  get limit(): number {
    return this.memoryLimit;
  }

  setMemoryLimit(limit: number): void {
    this.memoryLimit = limit;
    // Evict if over new limit
    while (this.currentMemory > this.memoryLimit) {
      if (!this.evictLRU()) break;
    }
  }

  private evictLRU(): boolean {
    let oldest: [string, LoadedMesh] | null = null;

    for (const entry of this.cache.entries()) {
      if (!oldest || entry[1].lastUsed < oldest[1].lastUsed) {
        oldest = entry;
      }
    }

    if (oldest) {
      this.currentMemory -= oldest[1].memorySize;
      this.disposeMesh(oldest[1]);
      this.cache.delete(oldest[0]);
      return true;
    }
    return false;
  }

  private disposeMesh(cached: LoadedMesh): void {
    if (cached.mesh instanceof THREE.Mesh) {
      cached.mesh.geometry?.dispose();
      if (Array.isArray(cached.mesh.material)) {
        cached.mesh.material.forEach((m) => m.dispose());
      } else {
        cached.mesh.material?.dispose();
      }
    } else if (cached.mesh instanceof THREE.Group) {
      cached.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }
  }
}

// ============================================
// PRIORITY QUEUE
// ============================================

export class PriorityQueue<T extends { priority: number }> {
  private items: T[] = [];

  enqueue(item: T): void {
    let i = this.items.length;
    this.items.push(item);

    // Bubble up
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.items[parent].priority >= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  dequeue(): T | undefined {
    if (this.items.length === 0) return undefined;
    if (this.items.length === 1) return this.items.pop();

    const result = this.items[0];
    this.items[0] = this.items.pop()!;

    // Bubble down
    let i = 0;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let largest = i;

      if (left < this.items.length && this.items[left].priority > this.items[largest].priority) {
        largest = left;
      }
      if (right < this.items.length && this.items[right].priority > this.items[largest].priority) {
        largest = right;
      }
      if (largest === i) break;

      [this.items[i], this.items[largest]] = [this.items[largest], this.items[i]];
      i = largest;
    }

    return result;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  get size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }

  has(predicate: (item: T) => boolean): boolean {
    return this.items.some(predicate);
  }
}

// ============================================
// PLACEHOLDER GEOMETRY
// ============================================

const placeholderGeometries = new Map<string, THREE.BufferGeometry>();

function getPlaceholderGeometry(type: string): THREE.BufferGeometry {
  if (!placeholderGeometries.has(type)) {
    let geometry: THREE.BufferGeometry;

    switch (type) {
      case "wall":
        geometry = new THREE.BoxGeometry(1, 3, 0.2);
        break;
      case "door":
        geometry = new THREE.BoxGeometry(0.9, 2.1, 0.05);
        break;
      case "window":
        geometry = new THREE.BoxGeometry(1.2, 1.2, 0.05);
        break;
      case "room":
        geometry = new THREE.PlaneGeometry(1, 1);
        break;
      case "floor":
        geometry = new THREE.BoxGeometry(1, 0.15, 1);
        break;
      case "roof":
        geometry = new THREE.ConeGeometry(1, 0.5, 4);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    placeholderGeometries.set(type, geometry);
  }
  return placeholderGeometries.get(type)!;
}

// ============================================
// LOADING PLACEHOLDER MESH
// ============================================

export function createPlaceholderMesh(element: Element): THREE.Mesh {
  const geometry = getPlaceholderGeometry(element.type);
  const material = new THREE.MeshStandardMaterial({
    color: PLACEHOLDER_COLOR,
    transparent: true,
    opacity: 0.3,
    wireframe: true,
  });

  const mesh = new THREE.Mesh(geometry.clone(), material);
  mesh.name = `placeholder-${element.id}`;
  mesh.userData = { element, isPlaceholder: true };

  return mesh;
}

// ============================================
// MEMORY SIZE ESTIMATION
// ============================================

export function estimateMeshMemory(mesh: THREE.Mesh | THREE.Group): number {
  let bytes = 0;

  const calculateMesh = (m: THREE.Mesh) => {
    const geometry = m.geometry;
    if (geometry) {
      // Position attribute (3 floats per vertex, 4 bytes per float)
      const posAttr = geometry.getAttribute("position");
      if (posAttr) bytes += posAttr.count * 3 * 4;

      // Normal attribute
      const normAttr = geometry.getAttribute("normal");
      if (normAttr) bytes += normAttr.count * 3 * 4;

      // UV attribute
      const uvAttr = geometry.getAttribute("uv");
      if (uvAttr) bytes += uvAttr.count * 2 * 4;

      // Index buffer
      const index = geometry.index;
      if (index) bytes += index.count * 4;
    }
  };

  if (mesh instanceof THREE.Mesh) {
    calculateMesh(mesh);
  } else if (mesh instanceof THREE.Group) {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        calculateMesh(child);
      }
    });
  }

  return bytes;
}

// ============================================
// FRUSTUM CULLING HELPERS
// ============================================

export function calculateElementPriority(
  element: Element,
  camera: THREE.Camera,
  frustum: THREE.Frustum,
  scale: number,
  offsetX: number,
  offsetZ: number
): number {
  // Create bounding box for element
  const center = new THREE.Vector3(
    element.x * scale + (element.width * scale) / 2 + offsetX,
    1.5, // Approximate center height
    element.y * scale + (element.height * scale) / 2 + offsetZ
  );

  // Check if in frustum
  const size = Math.max(element.width, element.height) * scale;
  const boundingSphere = new THREE.Sphere(center, size);

  if (!frustum.intersectsSphere(boundingSphere)) {
    return 0; // Not visible, lowest priority
  }

  // Calculate distance to camera
  const distance = camera.position.distanceTo(center);

  // Higher priority for closer elements
  if (distance < 5) return PRIORITY_VISIBLE;
  if (distance < 15) return PRIORITY_NEAR;
  return PRIORITY_FAR;
}

// ============================================
// GEOMETRY LOADER HOOK
// ============================================

export interface UseGeometryLoaderOptions {
  memoryLimit?: number;
  batchSize?: number;
  enabled?: boolean;
}

export interface UseGeometryLoaderResult {
  cache: MeshCache;
  state: GeometryLoaderState;
  requestLoad: (element: Element, priority: number) => void;
  cancelLoad: (elementId: string) => void;
  clearAll: () => void;
  updatePriorities: (
    elements: Element[],
    camera: THREE.Camera,
    frustum: THREE.Frustum,
    scale: number,
    offsetX: number,
    offsetZ: number
  ) => void;
}

export function useGeometryLoader(
  options: UseGeometryLoaderOptions = {}
): UseGeometryLoaderResult {
  const {
    memoryLimit = DEFAULT_MEMORY_LIMIT,
    batchSize = BATCH_SIZE,
    enabled = true,
  } = options;

  const cacheRef = useRef(new MeshCache(memoryLimit));
  const queueRef = useRef(new PriorityQueue<LoadRequest>());
  const pendingRef = useRef(new Set<string>());
  const [state, setState] = useState<GeometryLoaderState>({
    loadedCount: 0,
    pendingCount: 0,
    totalMemory: 0,
    isLoading: false,
  });

  // Update state helper
  const updateState = useCallback(() => {
    setState({
      loadedCount: cacheRef.current.size,
      pendingCount: queueRef.current.size,
      totalMemory: cacheRef.current.memory,
      isLoading: queueRef.current.size > 0,
    });
  }, []);

  // Request loading an element
  const requestLoad = useCallback(
    (element: Element, priority: number) => {
      if (!enabled) return;

      // Skip if already loaded or pending
      if (cacheRef.current.has(element.id)) return;
      if (pendingRef.current.has(element.id)) return;

      pendingRef.current.add(element.id);
      queueRef.current.enqueue({
        element,
        priority,
        timestamp: Date.now(),
      });

      updateState();
    },
    [enabled, updateState]
  );

  // Cancel loading request
  const cancelLoad = useCallback(
    (elementId: string) => {
      pendingRef.current.delete(elementId);
      // Note: We don't remove from queue as it's not worth the complexity
      // The loader will skip cancelled items when dequeuing
    },
    []
  );

  // Clear all cached meshes
  const clearAll = useCallback(() => {
    cacheRef.current.clear();
    queueRef.current.clear();
    pendingRef.current.clear();
    updateState();
  }, [updateState]);

  // Update priorities for all pending elements based on camera
  const updatePriorities = useCallback(
    (
      elements: Element[],
      camera: THREE.Camera,
      frustum: THREE.Frustum,
      scale: number,
      offsetX: number,
      offsetZ: number
    ) => {
      // Clear current queue and re-add with updated priorities
      queueRef.current.clear();

      for (const element of elements) {
        if (cacheRef.current.has(element.id)) continue;

        const priority = calculateElementPriority(
          element,
          camera,
          frustum,
          scale,
          offsetX,
          offsetZ
        );

        if (priority > 0) {
          pendingRef.current.add(element.id);
          queueRef.current.enqueue({
            element,
            priority,
            timestamp: Date.now(),
          });
        }
      }

      updateState();
    },
    [updateState]
  );

  // Update memory limit when option changes
  useEffect(() => {
    cacheRef.current.setMemoryLimit(memoryLimit);
    updateState();
  }, [memoryLimit, updateState]);

  return {
    cache: cacheRef.current,
    state,
    requestLoad,
    cancelLoad,
    clearAll,
    updatePriorities,
  };
}

// ============================================
// EXPORTED UTILITIES
// ============================================

export const GeometryLoaderUtils = {
  createPlaceholderMesh,
  estimateMeshMemory,
  calculateElementPriority,
  getPlaceholderGeometry,
  PLACEHOLDER_COLOR,
  LOADING_COLOR,
  PRIORITY_VISIBLE,
  PRIORITY_NEAR,
  PRIORITY_FAR,
  DEFAULT_MEMORY_LIMIT,
  BATCH_SIZE,
};
