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

interface BatchContext {
  id: string;
  description: string;
  startSnapshot: Element[];
}

interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number; // Points to current state (-1 means no history)
  isUndoing: boolean; // Prevents recursive history recording during undo/redo

  // Batch state for grouping multiple actions
  batchStack: BatchContext[]; // Stack for nested batches
  isBatching: boolean; // Whether we're currently in a batch
}

interface HistoryActions {
  // Core Operations
  recordAction: (description: string) => void;
  undo: () => void;
  redo: () => void;
  jumpToEntry: (index: number) => void;

  // Batch Operations
  startBatch: (description: string) => string; // Returns batch ID
  endBatch: (batchId?: string) => void; // Optionally specify batch ID
  cancelBatch: (batchId?: string) => void; // Cancel without recording
  isInBatch: () => boolean;
  getBatchDepth: () => number;

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
    batchStack: [],
    isBatching: false,

    // Record a new action (called after each mutation)
    recordAction: (description) => {
      // Don't record if we're in the middle of undo/redo
      if (get().isUndoing) return;

      // If batching, don't record individual actions - they'll be recorded at batch end
      if (get().isBatching) return;

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

    // Jump to a specific history entry by index
    jumpToEntry: (index) => {
      const { entries, currentIndex } = get();

      // Validate index
      if (index < 0 || index >= entries.length || index === currentIndex) return;

      set((state) => {
        state.isUndoing = true;
        state.currentIndex = index;
      });

      // Restore state at target index
      const targetEntry = entries[index];
      if (targetEntry) {
        const restoredElements = cloneElements(targetEntry.elements);
        useModelStore.getState().setElements(restoredElements);
      }

      set((state) => {
        state.isUndoing = false;
      });
    },

    // Start a batch operation - all actions until endBatch are grouped
    startBatch: (description) => {
      const batchId = generateId();
      const elements = useModelStore.getState().elements;
      const startSnapshot = cloneElements(elements);

      set((state) => {
        state.batchStack.push({
          id: batchId,
          description,
          startSnapshot,
        });
        state.isBatching = true;
      });

      return batchId;
    },

    // End a batch operation - records the combined changes as a single history entry
    endBatch: (batchId) => {
      const { batchStack, isUndoing } = get();

      if (batchStack.length === 0) return;

      // If batchId specified, verify it matches the top of stack
      const topBatch = batchStack[batchStack.length - 1];
      if (batchId && topBatch.id !== batchId) {
        console.warn(`Batch ID mismatch: expected ${topBatch.id}, got ${batchId}`);
        return;
      }

      set((state) => {
        state.batchStack.pop();
        state.isBatching = state.batchStack.length > 0;
      });

      // Only record if this is the outermost batch and not during undo/redo
      if (get().batchStack.length === 0 && !isUndoing) {
        const elements = useModelStore.getState().elements;
        const endSnapshot = cloneElements(elements);

        // Check if there were actual changes
        const startJson = JSON.stringify(topBatch.startSnapshot);
        const endJson = JSON.stringify(endSnapshot);

        if (startJson !== endJson) {
          set((state) => {
            // Truncate forward history
            if (state.currentIndex < state.entries.length - 1) {
              state.entries = state.entries.slice(0, state.currentIndex + 1);
            }

            // Create history entry for the entire batch
            const entry: HistoryEntry = {
              id: generateId(),
              timestamp: Date.now(),
              description: topBatch.description,
              elements: endSnapshot,
            };

            state.entries.push(entry);

            // Enforce maximum history size
            if (state.entries.length > MAX_HISTORY_SIZE) {
              state.entries.shift();
            } else {
              state.currentIndex++;
            }
          });
        }
      }
    },

    // Cancel a batch without recording any changes
    cancelBatch: (batchId) => {
      const { batchStack } = get();

      if (batchStack.length === 0) return;

      const topBatch = batchStack[batchStack.length - 1];
      if (batchId && topBatch.id !== batchId) {
        console.warn(`Batch ID mismatch: expected ${topBatch.id}, got ${batchId}`);
        return;
      }

      // Restore state to before batch started
      const restoredElements = cloneElements(topBatch.startSnapshot);
      useModelStore.getState().setElements(restoredElements);

      set((state) => {
        state.batchStack.pop();
        state.isBatching = state.batchStack.length > 0;
      });
    },

    // Check if currently in a batch
    isInBatch: () => {
      return get().isBatching;
    },

    // Get current batch nesting depth
    getBatchDepth: () => {
      return get().batchStack.length;
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
    batchStack: [],
    isBatching: false,
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
