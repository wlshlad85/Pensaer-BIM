/**
 * Pensaer BIM Platform - Model Store
 *
 * Zustand store for managing BIM elements with Immer for immutability.
 * This is the core data store for all building elements.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Element, ElementType, Level } from "../types";
import { createInitialElements, createInitialLevels } from "./demo";

// ============================================
// STORE INTERFACE
// ============================================

interface ModelState {
  elements: Element[];
  levels: Level[];
  isLoading: boolean;
  error: string | null;
}

interface ModelActions {
  // CRUD Operations
  addElement: (element: Element) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;

  // Z-Order Operations
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  moveForward: (id: string) => void;
  moveBackward: (id: string) => void;

  // Bulk Operations
  setElements: (elements: Element[]) => void;
  clearElements: () => void;

  // Query Helpers
  getElementById: (id: string) => Element | undefined;
  getElementsByType: (type: ElementType) => Element[];
  getRelatedElements: (id: string) => Element[];

  // Level CRUD Operations
  addLevel: (level: Level) => void;
  updateLevel: (id: string, updates: Partial<Level>) => void;
  deleteLevel: (id: string) => void;
  setLevels: (levels: Level[]) => void;

  // Level Query Helpers
  getLevelById: (id: string) => Level | undefined;
  getLevelByName: (name: string) => Level | undefined;
  getLevelsOrdered: () => Level[];
  getElementsByLevel: (levelId: string) => Element[];

  // Properties
  updateProperties: (
    id: string,
    properties: Record<string, string | number | boolean>,
  ) => void;

  // Loading State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type ModelStore = ModelState & ModelActions;

// ============================================
// STORE CREATION
// ============================================

export const useModelStore = create<ModelStore>()(
  immer((set, get) => ({
    // Initial State
    elements: createInitialElements(),
    levels: createInitialLevels(),
    isLoading: false,
    error: null,

    // CRUD Operations
    addElement: (element) =>
      set((state) => {
        state.elements.push(element);
      }),

    updateElement: (id, updates) =>
      set((state) => {
        const index = state.elements.findIndex((el) => el.id === id);
        if (index !== -1) {
          state.elements[index] = { ...state.elements[index], ...updates };
        }
      }),

    deleteElement: (id) =>
      set((state) => {
        state.elements = state.elements.filter((el) => el.id !== id);
      }),

    deleteElements: (ids) =>
      set((state) => {
        state.elements = state.elements.filter((el) => !ids.includes(el.id));
      }),

    // Z-Order Operations - elements at end of array render on top
    bringToFront: (id) =>
      set((state) => {
        const index = state.elements.findIndex((el) => el.id === id);
        if (index !== -1 && index < state.elements.length - 1) {
          const [element] = state.elements.splice(index, 1);
          state.elements.push(element);
        }
      }),

    sendToBack: (id) =>
      set((state) => {
        const index = state.elements.findIndex((el) => el.id === id);
        if (index > 0) {
          const [element] = state.elements.splice(index, 1);
          state.elements.unshift(element);
        }
      }),

    moveForward: (id) =>
      set((state) => {
        const index = state.elements.findIndex((el) => el.id === id);
        if (index !== -1 && index < state.elements.length - 1) {
          // Swap with element in front
          const temp = state.elements[index];
          state.elements[index] = state.elements[index + 1];
          state.elements[index + 1] = temp;
        }
      }),

    moveBackward: (id) =>
      set((state) => {
        const index = state.elements.findIndex((el) => el.id === id);
        if (index > 0) {
          // Swap with element behind
          const temp = state.elements[index];
          state.elements[index] = state.elements[index - 1];
          state.elements[index - 1] = temp;
        }
      }),

    // Bulk Operations
    setElements: (elements) =>
      set((state) => {
        state.elements = elements;
      }),

    clearElements: () =>
      set((state) => {
        state.elements = [];
      }),

    // Query Helpers (non-mutating, use get())
    getElementById: (id) => get().elements.find((el) => el.id === id),

    getElementsByType: (type) =>
      get().elements.filter((el) => el.type === type),

    getRelatedElements: (id) => {
      const element = get().getElementById(id);
      if (!element) return [];

      const relatedIds = new Set<string>();

      // Collect all relationship IDs
      const { relationships } = element;
      if (relationships.hostedBy) relatedIds.add(relationships.hostedBy);
      relationships.hosts?.forEach((id) => relatedIds.add(id));
      relationships.joins?.forEach((id) => relatedIds.add(id));
      relationships.bounds?.forEach((id) => relatedIds.add(id));
      relationships.boundedBy?.forEach((id) => relatedIds.add(id));
      relationships.leadsTo?.forEach((id) => relatedIds.add(id));
      relationships.accessVia?.forEach((id) => relatedIds.add(id));
      if (relationships.facesRoom) relatedIds.add(relationships.facesRoom);

      return get().elements.filter((el) => relatedIds.has(el.id));
    },

    // Level CRUD Operations
    addLevel: (level) =>
      set((state) => {
        state.levels.push(level);
      }),

    updateLevel: (id, updates) =>
      set((state) => {
        const index = state.levels.findIndex((l) => l.id === id);
        if (index !== -1) {
          state.levels[index] = { ...state.levels[index], ...updates };
        }
      }),

    deleteLevel: (id) =>
      set((state) => {
        state.levels = state.levels.filter((l) => l.id !== id);
      }),

    setLevels: (levels) =>
      set((state) => {
        state.levels = levels;
      }),

    // Level Query Helpers (non-mutating)
    getLevelById: (id) => get().levels.find((l) => l.id === id),

    getLevelByName: (name) => get().levels.find((l) => l.name === name),

    getLevelsOrdered: () =>
      [...get().levels].sort((a, b) => a.elevation - b.elevation),

    getElementsByLevel: (levelId) => {
      const level = get().getLevelById(levelId);
      if (!level) return [];
      return get().elements.filter(
        (el) => el.level === level.name || el.properties.level === level.name
      );
    },

    // Properties
    updateProperties: (id, properties) =>
      set((state) => {
        const index = state.elements.findIndex((el) => el.id === id);
        if (index !== -1) {
          Object.assign(state.elements[index].properties, properties);
        }
      }),

    // Loading State
    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),
  })),
);
