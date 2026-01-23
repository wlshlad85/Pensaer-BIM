/**
 * Pensaer BIM Platform - Async Operation Hook
 *
 * Provides a convenient way to manage async operations with loading states,
 * progress tracking, error handling, and timeouts.
 */

import { useState, useCallback, useRef } from "react";
import { useUIStore } from "../stores";

export type OperationStatus = "idle" | "loading" | "success" | "error";

interface AsyncOperationState<T> {
  status: OperationStatus;
  data: T | null;
  error: Error | null;
  progress?: number;
}

interface UseAsyncOperationOptions {
  /** Unique ID for the operation (for global loading state) */
  id: string;
  /** Label to show in loading indicator */
  label: string;
  /** Whether the operation can be cancelled */
  cancellable?: boolean;
  /** Timeout in milliseconds (0 = no timeout) */
  timeout?: number;
  /** Whether to track in global loading state */
  trackGlobal?: boolean;
  /** Callback when operation completes successfully */
  onSuccess?: (data: unknown) => void;
  /** Callback when operation fails */
  onError?: (error: Error) => void;
}

/**
 * Hook for managing async operations with loading states
 */
export function useAsyncOperation<T>(options: UseAsyncOperationOptions) {
  const {
    id,
    label,
    cancellable = false,
    timeout = 30000,
    trackGlobal = true,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<AsyncOperationState<T>>({
    status: "idle",
    data: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useUIStore((s) => s.startLoading);
  const updateLoadingProgress = useUIStore((s) => s.updateLoadingProgress);
  const stopLoading = useUIStore((s) => s.stopLoading);
  const addToast = useUIStore((s) => s.addToast);

  /**
   * Execute an async operation
   */
  const execute = useCallback(
    async (
      operation: (signal?: AbortSignal) => Promise<T>,
      operationLabel?: string
    ): Promise<T | null> => {
      // Cancel any existing operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      // Start loading state
      setState({ status: "loading", data: null, error: null });
      if (trackGlobal) {
        startLoading(id, operationLabel || label, cancellable);
      }

      // Set timeout if specified
      if (timeout > 0) {
        timeoutRef.current = setTimeout(() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            const error = new Error(`Operation timed out after ${timeout}ms`);
            setState({ status: "error", data: null, error });
            if (trackGlobal) {
              stopLoading(id);
            }
            addToast("error", `${label}: Timed out`);
            onError?.(error);
          }
        }, timeout);
      }

      try {
        const result = await operation(signal);

        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setState({ status: "success", data: result, error: null });
        if (trackGlobal) {
          stopLoading(id);
        }
        onSuccess?.(result);
        return result;
      } catch (err) {
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Ignore abort errors from cancellation
        if (err instanceof Error && err.name === "AbortError") {
          setState({ status: "idle", data: null, error: null });
          if (trackGlobal) {
            stopLoading(id);
          }
          return null;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        setState({ status: "error", data: null, error });
        if (trackGlobal) {
          stopLoading(id);
        }
        addToast("error", `${label}: ${error.message}`);
        onError?.(error);
        return null;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [id, label, cancellable, timeout, trackGlobal, startLoading, stopLoading, addToast, onSuccess, onError]
  );

  /**
   * Update progress (0-100)
   */
  const setProgress = useCallback(
    (progress: number) => {
      setState((prev) => ({ ...prev, progress }));
      if (trackGlobal) {
        updateLoadingProgress(id, progress);
      }
    },
    [id, trackGlobal, updateLoadingProgress]
  );

  /**
   * Cancel the current operation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState({ status: "idle", data: null, error: null });
    if (trackGlobal) {
      stopLoading(id);
    }
  }, [id, trackGlobal, stopLoading]);

  /**
   * Reset the state to idle
   */
  const reset = useCallback(() => {
    setState({ status: "idle", data: null, error: null });
  }, []);

  return {
    ...state,
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    isIdle: state.status === "idle",
    execute,
    setProgress,
    cancel,
    reset,
  };
}

export default useAsyncOperation;
