/**
 * Pensaer BIM Platform - History Store
 *
 * Zustand store for managing undo/redo history.
 * Captures snapshots of element state and allows navigation through history.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Element, HistoryEntry } from "../types";
import { useModelStore } from "./modelStore";

// ============================================
// CONFIGURATION
// ============================================

const MAX_HISTORY_SIZE = 100; // Maximum number of undo steps

// ============================================
// STORE INTERFACE
// ============================================

interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number; // Points to current state (-1 means no history)
  isUndoing: boolean; // Prevents recursive history recording during undo/redo
}

interface HistoryActions {
  // Core Operations
  recordAction: (description: string) => void;
  undo: () => void;
  redo: () => void;

  // State Queries
  canUndo: () => boolean;
  canRedo: () => boolean;
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;

  // History Management
  clearHistory: () => void;
  getHistoryCount: () => number;
}

type HistoryStore = HistoryState & HistoryActions;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique ID for history entries
 */
const generateId = (): string => {
  return `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Deep clone elements to prevent reference issues
 */
const cloneElements = (elements: Element[]): Element[] => {
  return JSON.parse(JSON.stringify(elements));
};

// ============================================
// STORE CREATION
// ============================================

export const useHistoryStore = create<HistoryStore>()(
  immer((set, get) => ({
    // Initial State
    entries: [],
    currentIndex: -1,
    isUndoing: false,

    // Record a new action (called after each mutation)
    recordAction: (description) => {
      // Don't record if we're in the middle of undo/redo
      if (get().isUndoing) return;

      const elements = useModelStore.getState().elements;
      const snapshot = cloneElements(elements);

      set((state) => {
        // If we're not at the end of history, truncate forward history
        if (state.currentIndex < state.entries.length - 1) {
          state.entries = state.entries.slice(0, state.currentIndex + 1);
        }

        // Create new history entry
        const entry: HistoryEntry = {
          id: generateId(),
          timestamp: Date.now(),
          description,
          elements: snapshot,
        };

        // Add to history
        state.entries.push(entry);

        // Enforce maximum history size
        if (state.entries.length > MAX_HISTORY_SIZE) {
          state.entries.shift(); // Remove oldest entry
        } else {
          state.currentIndex++;
        }
      });
    },

    // Undo to previous state
    undo: () => {
      const { currentIndex, entries } = get();

      if (currentIndex <= 0) return; // Nothing to undo

      set((state) => {
        state.isUndoing = true;
        state.currentIndex--;
      });

      // Restore previous state
      const previousEntry = entries[currentIndex - 1];
      if (previousEntry) {
        const restoredElements = cloneElements(previousEntry.elements);
        useModelStore.getState().setElements(restoredElements);
      }

      set((state) => {
        state.isUndoing = false;
      });
    },

    // Redo to next state
    redo: () => {
      const { currentIndex, entries } = get();

      if (currentIndex >= entries.length - 1) return; // Nothing to redo

      set((state) => {
        state.isUndoing = true;
        state.currentIndex++;
      });

      // Restore next state
      const nextEntry = entries[currentIndex + 1];
      if (nextEntry) {
        const restoredElements = cloneElements(nextEntry.elements);
        useModelStore.getState().setElements(restoredElements);
      }

      set((state) => {
        state.isUndoing = false;
      });
    },

    // Query: Can we undo?
    canUndo: () => {
      return get().currentIndex > 0;
    },

    // Query: Can we redo?
    canRedo: () => {
      const { currentIndex, entries } = get();
      return currentIndex < entries.length - 1;
    },

    // Get description of action to undo
    getUndoDescription: () => {
      const { currentIndex, entries } = get();
      if (currentIndex > 0) {
        return entries[currentIndex].description;
      }
      return null;
    },

    // Get description of action to redo
    getRedoDescription: () => {
      const { currentIndex, entries } = get();
      if (currentIndex < entries.length - 1) {
        return entries[currentIndex + 1].description;
      }
      return null;
    },

    // Clear all history
    clearHistory: () => {
      set((state) => {
        state.entries = [];
        state.currentIndex = -1;
      });
    },

    // Get total history count
    getHistoryCount: () => {
      return get().entries.length;
    },
  })),
);

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize history with the current model state.
 * Call this once when the application starts.
 */
export const initializeHistory = (): void => {
  const elements = useModelStore.getState().elements;
  const snapshot = cloneElements(elements);

  useHistoryStore.setState({
    entries: [
      {
        id: generateId(),
        timestamp: Date.now(),
        description: "Initial state",
        elements: snapshot,
      },
    ],
    currentIndex: 0,
    isUndoing: false,
  });
};

// ============================================
// KEYBOARD SHORTCUTS HELPER
// ============================================

/**
 * Global keyboard handler for undo/redo.
 * Can be called from useKeyboardShortcuts hook.
 */
export const handleUndoRedo = (event: KeyboardEvent): boolean => {
  const { key, ctrlKey, metaKey, shiftKey } = event;
  const modifier = ctrlKey || metaKey;

  if (modifier && key.toLowerCase() === "z") {
    if (shiftKey) {
      // Ctrl+Shift+Z = Redo
      useHistoryStore.getState().redo();
    } else {
      // Ctrl+Z = Undo
      useHistoryStore.getState().undo();
    }
    return true;
  }

  if (modifier && key.toLowerCase() === "y") {
    // Ctrl+Y = Redo (Windows convention)
    useHistoryStore.getState().redo();
    return true;
  }

  return false;
};
