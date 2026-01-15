/**
 * Pensaer BIM Platform - Selection Store
 *
 * Manages element selection state, hover state, and highlights.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface SelectionState {
  selectedIds: string[];
  hoveredId: string | null;
  highlightedIds: string[];
}

interface SelectionActions {
  // Selection
  select: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: (allIds: string[]) => void;

  // Hover
  setHovered: (id: string | null) => void;

  // Highlights (for AI suggestions, issues, etc.)
  highlight: (ids: string[]) => void;
  clearHighlights: () => void;

  // Queries
  isSelected: (id: string) => boolean;
  isHovered: (id: string) => boolean;
  isHighlighted: (id: string) => boolean;
}

type SelectionStore = SelectionState & SelectionActions;

export const useSelectionStore = create<SelectionStore>()(
  immer((set, get) => ({
    // Initial State
    selectedIds: [],
    hoveredId: null,
    highlightedIds: [],

    // Selection Actions
    select: (id) =>
      set((state) => {
        state.selectedIds = [id];
      }),

    selectMultiple: (ids) =>
      set((state) => {
        state.selectedIds = ids;
      }),

    addToSelection: (id) =>
      set((state) => {
        if (!state.selectedIds.includes(id)) {
          state.selectedIds.push(id);
        }
      }),

    removeFromSelection: (id) =>
      set((state) => {
        state.selectedIds = state.selectedIds.filter((i) => i !== id);
      }),

    toggleSelection: (id) =>
      set((state) => {
        const index = state.selectedIds.indexOf(id);
        if (index === -1) {
          state.selectedIds.push(id);
        } else {
          state.selectedIds.splice(index, 1);
        }
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedIds = [];
      }),

    selectAll: (allIds) =>
      set((state) => {
        state.selectedIds = [...allIds];
      }),

    // Hover Actions
    setHovered: (id) =>
      set((state) => {
        state.hoveredId = id;
      }),

    // Highlight Actions
    highlight: (ids) =>
      set((state) => {
        state.highlightedIds = ids;
      }),

    clearHighlights: () =>
      set((state) => {
        state.highlightedIds = [];
      }),

    // Query Helpers
    isSelected: (id) => get().selectedIds.includes(id),
    isHovered: (id) => get().hoveredId === id,
    isHighlighted: (id) => get().highlightedIds.includes(id),
  }))
);
