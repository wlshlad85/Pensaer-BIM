/**
 * Pensaer BIM Platform - Model Store
 *
 * Zustand store for managing BIM elements with Immer for immutability.
 * This is the core data store for all building elements.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Element, ElementType } from '../types';

// ============================================
// STORE INTERFACE
// ============================================

interface ModelState {
  elements: Element[];
  isLoading: boolean;
  error: string | null;
}

interface ModelActions {
  // CRUD Operations
  addElement: (element: Element) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;

  // Bulk Operations
  setElements: (elements: Element[]) => void;
  clearElements: () => void;

  // Query Helpers
  getElementById: (id: string) => Element | undefined;
  getElementsByType: (type: ElementType) => Element[];
  getRelatedElements: (id: string) => Element[];

  // Properties
  updateProperties: (id: string, properties: Record<string, string | number | boolean>) => void;

  // Loading State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type ModelStore = ModelState & ModelActions;

// ============================================
// INITIAL DEMO DATA - AI Simulation Building
// ============================================

const createInitialElements = (): Element[] => [
  // === ROOMS ===
  {
    id: 'room-001',
    type: 'room',
    name: 'Living Room',
    x: 300,
    y: 200,
    width: 500,
    height: 350,
    properties: {
      area: '17.5 m²',
      height: '2800mm',
      occupancy: 'Residential',
      finishFloor: 'Hardwood',
      finishCeiling: 'Painted',
      finishWalls: 'Painted',
      level: 'Level 1',
    },
    relationships: {
      boundedBy: ['wall-north', 'wall-south', 'wall-west', 'wall-east'],
      accessVia: ['door-001'],
    },
    issues: [],
    aiSuggestions: [
      { icon: 'fa-couch', text: 'Space supports L-shaped sofa + coffee table', priority: 'info' },
    ],
  },
  {
    id: 'room-002',
    type: 'room',
    name: 'Bedroom',
    x: 800,
    y: 200,
    width: 400,
    height: 350,
    properties: {
      area: '14.0 m²',
      height: '2800mm',
      occupancy: 'Residential',
      finishFloor: 'Carpet',
      finishCeiling: 'Painted',
      finishWalls: 'Painted',
      level: 'Level 1',
    },
    relationships: {
      boundedBy: ['wall-bedroom-north', 'wall-bedroom-south', 'wall-east', 'wall-bedroom-east'],
      accessVia: ['door-002'],
      connectedTo: ['room-001'],
    },
    issues: [],
    aiSuggestions: [
      { icon: 'fa-bed', text: 'Fits queen bed + wardrobe + desk', priority: 'info' },
    ],
  },

  // === WALLS ===
  {
    id: 'wall-north',
    type: 'wall',
    name: 'North Wall',
    x: 300,
    y: 200,
    width: 500,
    height: 12,
    properties: {
      thickness: '200mm',
      height: '2800mm',
      material: 'Concrete',
      fireRating: '60 min',
      structural: true,
      level: 'Level 1',
    },
    relationships: {
      hosts: ['window-001'],
      joins: ['wall-west', 'wall-east'],
      bounds: ['room-001'],
    },
    issues: [],
    aiSuggestions: [],
  },
  {
    id: 'wall-south',
    type: 'wall',
    name: 'South Wall',
    x: 300,
    y: 538,
    width: 500,
    height: 12,
    properties: {
      thickness: '200mm',
      height: '2800mm',
      material: 'Concrete',
      fireRating: '60 min',
      structural: true,
      level: 'Level 1',
    },
    relationships: {
      hosts: ['door-001'],
      joins: ['wall-west', 'wall-east'],
      bounds: ['room-001'],
    },
    issues: [],
    aiSuggestions: [],
  },
  {
    id: 'wall-west',
    type: 'wall',
    name: 'West Wall',
    x: 300,
    y: 200,
    width: 12,
    height: 350,
    properties: {
      thickness: '200mm',
      height: '2800mm',
      material: 'Concrete',
      fireRating: '60 min',
      structural: true,
      level: 'Level 1',
    },
    relationships: {
      hosts: [],
      joins: ['wall-north', 'wall-south'],
      bounds: ['room-001'],
    },
    issues: [],
    aiSuggestions: [],
  },
  {
    id: 'wall-east',
    type: 'wall',
    name: 'East Wall (Shared)',
    x: 788,
    y: 200,
    width: 12,
    height: 350,
    properties: {
      thickness: '200mm',
      height: '2800mm',
      material: 'Concrete',
      fireRating: '60 min',
      structural: true,
      level: 'Level 1',
    },
    relationships: {
      hosts: ['door-002'],
      joins: ['wall-north', 'wall-south', 'wall-bedroom-north', 'wall-bedroom-south'],
      bounds: ['room-001', 'room-002'],
    },
    issues: [],
    aiSuggestions: [
      { icon: 'fa-volume-mute', text: 'Add acoustic insulation between rooms', priority: 'medium' },
    ],
  },
  {
    id: 'wall-bedroom-east',
    type: 'wall',
    name: 'Bedroom East Wall',
    x: 1188,
    y: 200,
    width: 12,
    height: 350,
    properties: {
      thickness: '200mm',
      height: '2800mm',
      material: 'Concrete',
      fireRating: '60 min',
      structural: true,
      level: 'Level 1',
    },
    relationships: {
      hosts: [],
      joins: ['wall-bedroom-north', 'wall-bedroom-south'],
      bounds: ['room-002'],
    },
    issues: [],
    aiSuggestions: [],
  },
  {
    id: 'wall-bedroom-north',
    type: 'wall',
    name: 'Bedroom North Wall',
    x: 800,
    y: 200,
    width: 400,
    height: 12,
    properties: {
      thickness: '200mm',
      height: '2800mm',
      material: 'Concrete',
      fireRating: '60 min',
      structural: true,
      level: 'Level 1',
    },
    relationships: {
      hosts: ['window-002'],
      joins: ['wall-east', 'wall-bedroom-east'],
      bounds: ['room-002'],
    },
    issues: [],
    aiSuggestions: [],
  },
  {
    id: 'wall-bedroom-south',
    type: 'wall',
    name: 'Bedroom South Wall',
    x: 800,
    y: 538,
    width: 400,
    height: 12,
    properties: {
      thickness: '200mm',
      height: '2800mm',
      material: 'Concrete',
      fireRating: '60 min',
      structural: true,
      level: 'Level 1',
    },
    relationships: {
      hosts: [],
      joins: ['wall-east', 'wall-bedroom-east'],
      bounds: ['room-002'],
    },
    issues: [],
    aiSuggestions: [],
  },

  // === DOORS ===
  {
    id: 'door-001',
    type: 'door',
    name: 'Main Entry',
    x: 500,
    y: 530,
    width: 90,
    height: 24,
    properties: {
      width: '900mm',
      height: '2100mm',
      material: 'Wood',
      fireRating: '30 min',
      swingDirection: 'Inward',
      handleSide: 'Right',
      level: 'Level 1',
    },
    relationships: {
      hostedBy: 'wall-south',
      leadsTo: ['room-001', 'exterior'],
    },
    issues: [],
    aiSuggestions: [
      { icon: 'fa-lock', text: 'Add smart lock for keyless entry', priority: 'low' },
    ],
  },
  {
    id: 'door-002',
    type: 'door',
    name: 'Interior Door',
    x: 788,
    y: 350,
    width: 24,
    height: 80,
    properties: {
      width: '800mm',
      height: '2100mm',
      material: 'Wood',
      fireRating: 'None',
      swingDirection: 'Inward',
      handleSide: 'Left',
      level: 'Level 1',
    },
    relationships: {
      hostedBy: 'wall-east',
      leadsTo: ['room-001', 'room-002'],
    },
    issues: [],
    aiSuggestions: [],
  },

  // === WINDOWS ===
  {
    id: 'window-001',
    type: 'window',
    name: 'Living Room Window',
    x: 450,
    y: 194,
    width: 120,
    height: 24,
    properties: {
      width: '1200mm',
      height: '1500mm',
      sillHeight: '900mm',
      glazingType: 'Double',
      uValue: '1.4 W/m²K',
      openingType: 'Casement',
      frame: 'Aluminum',
      level: 'Level 1',
    },
    relationships: {
      hostedBy: 'wall-north',
      facesRoom: 'room-001',
    },
    issues: [],
    aiSuggestions: [
      { icon: 'fa-sun', text: 'North-facing - good for diffused light', priority: 'info' },
    ],
  },
  {
    id: 'window-002',
    type: 'window',
    name: 'Bedroom Window',
    x: 950,
    y: 194,
    width: 100,
    height: 24,
    properties: {
      width: '1000mm',
      height: '1200mm',
      sillHeight: '900mm',
      glazingType: 'Double',
      uValue: '1.4 W/m²K',
      openingType: 'Casement',
      frame: 'Aluminum',
      level: 'Level 1',
    },
    relationships: {
      hostedBy: 'wall-bedroom-north',
      facesRoom: 'room-002',
    },
    issues: [],
    aiSuggestions: [
      { icon: 'fa-moon', text: 'Add blackout blinds for better sleep', priority: 'low' },
    ],
  },
];

// ============================================
// STORE CREATION
// ============================================

export const useModelStore = create<ModelStore>()(
  immer((set, get) => ({
    // Initial State
    elements: createInitialElements(),
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

    getElementsByType: (type) => get().elements.filter((el) => el.type === type),

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
  }))
);
