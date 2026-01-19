/**
 * Pensaer BIM Platform - Persistence Hook
 *
 * Handles automatic saving and loading of model data from IndexedDB.
 * Uses debouncing to avoid excessive writes during rapid changes.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useModelStore } from "../stores";
import {
  saveElements,
  loadElements,
  isIndexedDBAvailable,
  saveProjectMetadata,
  loadProjectMetadata,
  type ProjectMetadata,
} from "../lib";

// ============================================
// CONFIGURATION
// ============================================

const DEBOUNCE_MS = 500; // Wait 500ms after last change before saving
const PROJECT_ID = "default-project"; // Single project for now

// ============================================
// HOOK
// ============================================

interface PersistenceState {
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  isAvailable: boolean;
}

export function usePersistence() {
  const elements = useModelStore((s) => s.elements);
  const setElements = useModelStore((s) => s.setElements);

  const [state, setState] = useState<PersistenceState>({
    isLoading: true,
    isSaving: false,
    lastSaved: null,
    error: null,
    isAvailable: isIndexedDBAvailable(),
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousElementsRef = useRef<string>("");
  const isInitializedRef = useRef(false);

  // Load data on mount
  useEffect(() => {
    if (!state.isAvailable || isInitializedRef.current) return;

    async function loadData() {
      try {
        const savedElements = await loadElements();

        if (savedElements.length > 0) {
          setElements(savedElements);
          console.log(
            `📂 Restored ${savedElements.length} elements from IndexedDB`,
          );
        }

        // Load project metadata
        const metadata = await loadProjectMetadata(PROJECT_ID);
        if (metadata) {
          console.log(
            `📋 Project: ${metadata.name}, last updated: ${new Date(metadata.updatedAt).toLocaleString()}`,
          );
        }

        setState((s) => ({ ...s, isLoading: false, error: null }));
        isInitializedRef.current = true;
      } catch (error) {
        console.error("Failed to load from IndexedDB:", error);
        setState((s) => ({
          ...s,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load data",
        }));
        isInitializedRef.current = true;
      }
    }

    loadData();
  }, [state.isAvailable, setElements]);

  // Debounced save function
  const debouncedSave = useCallback(async () => {
    if (!state.isAvailable) return;

    setState((s) => ({ ...s, isSaving: true }));

    try {
      await saveElements(elements);

      // Update project metadata
      const metadata: ProjectMetadata = {
        id: PROJECT_ID,
        name: "Office Building",
        createdAt: Date.now(), // Will be overwritten if exists
        updatedAt: Date.now(),
        elementCount: elements.length,
      };
      await saveProjectMetadata(metadata);

      setState((s) => ({
        ...s,
        isSaving: false,
        lastSaved: new Date(),
        error: null,
      }));
    } catch (error) {
      console.error("Failed to save to IndexedDB:", error);
      setState((s) => ({
        ...s,
        isSaving: false,
        error: error instanceof Error ? error.message : "Failed to save data",
      }));
    }
  }, [elements, state.isAvailable]);

  // Watch for changes and trigger debounced save
  useEffect(() => {
    if (!state.isAvailable || !isInitializedRef.current) return;

    // Serialize elements for comparison
    const currentElements = JSON.stringify(elements);

    // Skip if no changes
    if (currentElements === previousElementsRef.current) return;
    previousElementsRef.current = currentElements;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, DEBOUNCE_MS);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [elements, state.isAvailable, debouncedSave]);

  // Force save function (bypass debounce)
  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await debouncedSave();
  }, [debouncedSave]);

  return {
    ...state,
    forceSave,
  };
}
