/**
 * Pensaer BIM Platform - Progress Bar Component
 *
 * Provides visual progress indication for long-running operations.
 * Supports determinate and indeterminate modes.
 */

import clsx from "clsx";

export type ProgressVariant = "default" | "success" | "warning" | "error";

interface ProgressBarProps {
  /** Progress value (0-100) - omit for indeterminate mode */
  value?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Visual variant */
  variant?: ProgressVariant;
  /** Show percentage label */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Height size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Whether the operation is cancellable */
  cancellable?: boolean;
  /** Cancel callback */
  onCancel?: () => void;
}

const variantClasses: Record<ProgressVariant, string> = {
  default: "bg-blue-500",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
};

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

/**
 * Progress Bar component
 */
export function ProgressBar({
  value,
  max = 100,
  variant = "default",
  showLabel = false,
  label,
  size = "md",
  className,
  cancellable = false,
  onCancel,
}: ProgressBarProps) {
  const isIndeterminate = value === undefined;
  const percentage = isIndeterminate ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={clsx("w-full", className)}>
      {/* Label row */}
      {(showLabel || label || cancellable) && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">
            {label || (showLabel && !isIndeterminate ? `${Math.round(percentage)}%` : "")}
          </span>
          {cancellable && onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              type="button"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Progress track */}
      <div
        className={clsx(
          "w-full bg-gray-700 rounded-full overflow-hidden",
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Progress fill */}
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-300",
            variantClasses[variant],
            isIndeterminate && "animate-progress-indeterminate"
          )}
          style={{
            width: isIndeterminate ? "30%" : `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Circular progress indicator
 */
interface CircularProgressProps {
  value?: number;
  size?: number;
  strokeWidth?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  className?: string;
}

export function CircularProgress({
  value,
  size = 40,
  strokeWidth = 4,
  variant = "default",
  showLabel = false,
  className,
}: CircularProgressProps) {
  const isIndeterminate = value === undefined;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = isIndeterminate ? 0 : Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const strokeColor = variant === "success" ? "#22c55e"
    : variant === "warning" ? "#eab308"
    : variant === "error" ? "#ef4444"
    : "#3b82f6";

  return (
    <div className={clsx("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={clsx(isIndeterminate && "animate-spin")}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={isIndeterminate ? circumference * 0.75 : strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-300"
        />
      </svg>
      {showLabel && !isIndeterminate && (
        <span className="absolute text-xs font-medium text-gray-300">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

export default ProgressBar;
