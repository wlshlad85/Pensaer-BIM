/**
 * Pensaer BIM Platform - Global Loading Indicator
 *
 * Displays a global loading overlay when operations are in progress.
 * Shows multiple concurrent operations with their individual progress.
 */

import { useUIStore, type LoadingOperation } from "../../stores/uiStore";
import { Loading } from "./Loading";
import { ProgressBar } from "./ProgressBar";
import clsx from "clsx";

/**
 * Single loading operation display
 */
function LoadingOperationItem({
  operation,
  onCancel,
}: {
  operation: LoadingOperation;
  onCancel?: () => void;
}) {
  const hasProgress = operation.progress !== undefined;
  const elapsed = Math.round((Date.now() - operation.startedAt) / 1000);

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loading size="sm" />
          <span className="text-sm text-gray-300">{operation.label}</span>
        </div>
        {operation.cancellable && onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1"
          >
            Cancel
          </button>
        )}
      </div>
      {hasProgress && (
        <ProgressBar value={operation.progress} size="sm" showLabel />
      )}
      {!hasProgress && elapsed > 2 && (
        <span className="text-xs text-gray-500">{elapsed}s elapsed</span>
      )}
    </div>
  );
}

/**
 * Global loading indicator that shows all active operations
 */
export function GlobalLoadingIndicator() {
  const loadingOperations = useUIStore((s) => s.loadingOperations);
  const isGlobalLoading = useUIStore((s) => s.isGlobalLoading);
  const stopLoading = useUIStore((s) => s.stopLoading);

  // Nothing to show
  if (!isGlobalLoading && loadingOperations.length === 0) {
    return null;
  }

  // Global loading without specific operations
  if (isGlobalLoading && loadingOperations.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-xl animate-modal-in">
          <Loading size="lg" />
          <span className="text-gray-300">Loading...</span>
        </div>
      </div>
    );
  }

  // Multiple operations - show in corner
  return (
    <div
      className={clsx(
        "fixed bottom-20 right-4 z-40",
        "bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-800 shadow-xl",
        "min-w-[250px] max-w-[350px] p-3",
        "animate-slide-up"
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
        <span className="text-xs font-medium text-gray-400">
          {loadingOperations.length} operation{loadingOperations.length !== 1 ? "s" : ""} in progress
        </span>
      </div>
      <div className="divide-y divide-gray-800">
        {loadingOperations.map((op) => (
          <LoadingOperationItem
            key={op.id}
            operation={op}
            onCancel={op.cancellable ? () => stopLoading(op.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default GlobalLoadingIndicator;
