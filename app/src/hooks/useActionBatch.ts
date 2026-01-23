/**
 * Pensaer BIM Platform - Action Batch Hook
 *
 * Hook for grouping multiple actions into a single undo/redo operation.
 * Supports nested batches and automatic cleanup.
 */

import { useCallback, useRef } from "react";
import { useHistoryStore } from "../stores";

/**
 * Hook for batching multiple actions into a single history entry.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { startBatch, endBatch, runBatched } = useActionBatch();
 *
 *   // Manual batch control
 *   const handleBulkDelete = () => {
 *     startBatch("Delete multiple elements");
 *     elements.forEach(deleteElement);
 *     endBatch();
 *   };
 *
 *   // Automatic batch with runBatched
 *   const handleComplexOperation = () => {
 *     runBatched("Complex operation", () => {
 *       createWall();
 *       createDoor();
 *       createWindow();
 *     });
 *   };
 *
 *   // Async batch
 *   const handleAsyncOperation = async () => {
 *     await runBatchedAsync("Import elements", async () => {
 *       await importFromFile();
 *       await processElements();
 *     });
 *   };
 * }
 * ```
 */
export function useActionBatch() {
  const storeStartBatch = useHistoryStore((s) => s.startBatch);
  const storeEndBatch = useHistoryStore((s) => s.endBatch);
  const storeCancelBatch = useHistoryStore((s) => s.cancelBatch);
  const isInBatch = useHistoryStore((s) => s.isInBatch);
  const getBatchDepth = useHistoryStore((s) => s.getBatchDepth);

  // Track active batch ID for this hook instance
  const activeBatchId = useRef<string | null>(null);

  /**
   * Start a new batch. All history recordings until endBatch()
   * will be grouped into a single undo step.
   */
  const startBatch = useCallback(
    (description: string): string => {
      const batchId = storeStartBatch(description);
      activeBatchId.current = batchId;
      return batchId;
    },
    [storeStartBatch]
  );

  /**
   * End the current batch. If changes were made, they'll be recorded
   * as a single history entry.
   */
  const endBatch = useCallback(
    (batchId?: string): void => {
      const idToEnd = batchId ?? activeBatchId.current;
      if (idToEnd) {
        storeEndBatch(idToEnd);
        if (idToEnd === activeBatchId.current) {
          activeBatchId.current = null;
        }
      }
    },
    [storeEndBatch]
  );

  /**
   * Cancel the current batch without recording changes.
   * Reverts the model to the state before the batch started.
   */
  const cancelBatch = useCallback(
    (batchId?: string): void => {
      const idToCancel = batchId ?? activeBatchId.current;
      if (idToCancel) {
        storeCancelBatch(idToCancel);
        if (idToCancel === activeBatchId.current) {
          activeBatchId.current = null;
        }
      }
    },
    [storeCancelBatch]
  );

  /**
   * Run a synchronous function within a batch.
   * The batch is automatically ended when the function completes.
   * If an error occurs, the batch is cancelled.
   */
  const runBatched = useCallback(
    <T>(description: string, fn: () => T): T => {
      const batchId = storeStartBatch(description);
      try {
        const result = fn();
        storeEndBatch(batchId);
        return result;
      } catch (error) {
        storeCancelBatch(batchId);
        throw error;
      }
    },
    [storeStartBatch, storeEndBatch, storeCancelBatch]
  );

  /**
   * Run an asynchronous function within a batch.
   * The batch is automatically ended when the promise resolves.
   * If the promise rejects, the batch is cancelled.
   */
  const runBatchedAsync = useCallback(
    async <T>(description: string, fn: () => Promise<T>): Promise<T> => {
      const batchId = storeStartBatch(description);
      try {
        const result = await fn();
        storeEndBatch(batchId);
        return result;
      } catch (error) {
        storeCancelBatch(batchId);
        throw error;
      }
    },
    [storeStartBatch, storeEndBatch, storeCancelBatch]
  );

  return {
    startBatch,
    endBatch,
    cancelBatch,
    runBatched,
    runBatchedAsync,
    isInBatch,
    getBatchDepth,
  };
}

/**
 * Standalone batch utilities for use outside of React components.
 * Useful for terminal commands, macros, or other non-React code.
 */
export const batchUtils = {
  /**
   * Start a batch operation
   */
  start: (description: string): string => {
    return useHistoryStore.getState().startBatch(description);
  },

  /**
   * End a batch operation
   */
  end: (batchId?: string): void => {
    useHistoryStore.getState().endBatch(batchId);
  },

  /**
   * Cancel a batch operation
   */
  cancel: (batchId?: string): void => {
    useHistoryStore.getState().cancelBatch(batchId);
  },

  /**
   * Run a function within a batch
   */
  run: <T>(description: string, fn: () => T): T => {
    const store = useHistoryStore.getState();
    const batchId = store.startBatch(description);
    try {
      const result = fn();
      store.endBatch(batchId);
      return result;
    } catch (error) {
      store.cancelBatch(batchId);
      throw error;
    }
  },

  /**
   * Run an async function within a batch
   */
  runAsync: async <T>(description: string, fn: () => Promise<T>): Promise<T> => {
    const store = useHistoryStore.getState();
    const batchId = store.startBatch(description);
    try {
      const result = await fn();
      store.endBatch(batchId);
      return result;
    } catch (error) {
      store.cancelBatch(batchId);
      throw error;
    }
  },

  /**
   * Check if currently in a batch
   */
  isActive: (): boolean => {
    return useHistoryStore.getState().isInBatch();
  },

  /**
   * Get current batch nesting depth
   */
  depth: (): number => {
    return useHistoryStore.getState().getBatchDepth();
  },
};

export default useActionBatch;
