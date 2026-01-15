/**
 * Pensaer BIM Platform - Model with History Hook
 *
 * A custom hook that wraps model operations with automatic history recording.
 * Use this hook instead of directly calling useModelStore when you want
 * mutations to be undoable.
 */

import { useCallback } from 'react';
import { useModelStore, useHistoryStore } from '../stores';
import type { Element } from '../types';

/**
 * Hook that provides model operations with automatic history recording.
 * Every mutation through this hook can be undone with Ctrl+Z.
 */
export const useModelWithHistory = () => {
  const modelStore = useModelStore();
  const historyStore = useHistoryStore();

  // Add element with history recording
  const addElement = useCallback(
    (element: Element) => {
      modelStore.addElement(element);
      historyStore.recordAction(`Add ${element.type}: ${element.name}`);
    },
    [modelStore, historyStore]
  );

  // Update element with history recording
  const updateElement = useCallback(
    (id: string, updates: Partial<Element>, description?: string) => {
      const element = modelStore.getElementById(id);
      const elementName = element?.name || id;
      modelStore.updateElement(id, updates);
      historyStore.recordAction(description || `Update ${elementName}`);
    },
    [modelStore, historyStore]
  );

  // Delete element with history recording
  const deleteElement = useCallback(
    (id: string) => {
      const element = modelStore.getElementById(id);
      const elementName = element?.name || id;
      modelStore.deleteElement(id);
      historyStore.recordAction(`Delete ${elementName}`);
    },
    [modelStore, historyStore]
  );

  // Delete multiple elements with history recording
  const deleteElements = useCallback(
    (ids: string[]) => {
      modelStore.deleteElements(ids);
      historyStore.recordAction(`Delete ${ids.length} elements`);
    },
    [modelStore, historyStore]
  );

  // Update properties with history recording
  const updateProperties = useCallback(
    (id: string, properties: Record<string, string | number | boolean>) => {
      const element = modelStore.getElementById(id);
      const elementName = element?.name || id;
      const propNames = Object.keys(properties).join(', ');
      modelStore.updateProperties(id, properties);
      historyStore.recordAction(`Edit ${elementName} (${propNames})`);
    },
    [modelStore, historyStore]
  );

  // Move element (update x, y) with history recording
  const moveElement = useCallback(
    (id: string, x: number, y: number) => {
      const element = modelStore.getElementById(id);
      const elementName = element?.name || id;
      modelStore.updateElement(id, { x, y });
      historyStore.recordAction(`Move ${elementName}`);
    },
    [modelStore, historyStore]
  );

  // Resize element with history recording
  const resizeElement = useCallback(
    (id: string, width: number, height: number) => {
      const element = modelStore.getElementById(id);
      const elementName = element?.name || id;
      modelStore.updateElement(id, { width, height });
      historyStore.recordAction(`Resize ${elementName}`);
    },
    [modelStore, historyStore]
  );

  // Batch operation with single history entry
  const batchUpdate = useCallback(
    (updates: Array<{ id: string; changes: Partial<Element> }>, description: string) => {
      updates.forEach(({ id, changes }) => {
        modelStore.updateElement(id, changes);
      });
      historyStore.recordAction(description);
    },
    [modelStore, historyStore]
  );

  return {
    // Wrapped operations (with history)
    addElement,
    updateElement,
    deleteElement,
    deleteElements,
    updateProperties,
    moveElement,
    resizeElement,
    batchUpdate,

    // Direct access to stores for queries (no history needed)
    elements: modelStore.elements,
    getElementById: modelStore.getElementById,
    getElementsByType: modelStore.getElementsByType,
    getRelatedElements: modelStore.getRelatedElements,

    // History operations
    undo: historyStore.undo,
    redo: historyStore.redo,
    canUndo: historyStore.canUndo,
    canRedo: historyStore.canRedo,
    undoDescription: historyStore.getUndoDescription(),
    redoDescription: historyStore.getRedoDescription(),
  };
};
