/**
 * Pensaer BIM Platform - Loading Component
 *
 * Provides consistent loading spinners and states across the application.
 * Supports multiple sizes, variants, and optional labels.
 */

import clsx from "clsx";

export type LoadingSize = "xs" | "sm" | "md" | "lg" | "xl";
export type LoadingVariant = "spinner" | "dots" | "pulse";

interface LoadingProps {
  /** Size of the loading indicator */
  size?: LoadingSize;
  /** Visual variant */
  variant?: LoadingVariant;
  /** Optional label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to center in parent container */
  centered?: boolean;
  /** Whether this is a full-screen overlay */
  overlay?: boolean;
}

const sizeClasses: Record<LoadingSize, string> = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const labelSizeClasses: Record<LoadingSize, string> = {
  xs: "text-xs",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

/**
 * Spinner loading indicator (default)
 */
function Spinner({ size = "md", className }: { size?: LoadingSize; className?: string }) {
  return (
    <svg
      className={clsx("animate-spin text-blue-400", sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Dots loading indicator (typing style)
 */
function Dots({ size = "md", className }: { size?: LoadingSize; className?: string }) {
  const dotSize = size === "xs" || size === "sm" ? "w-1 h-1" : size === "md" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <div className={clsx("typing-indicator", className)}>
      <span className={clsx(dotSize, "bg-blue-400 rounded-full")} />
      <span className={clsx(dotSize, "bg-blue-400 rounded-full")} />
      <span className={clsx(dotSize, "bg-blue-400 rounded-full")} />
    </div>
  );
}

/**
 * Pulse loading indicator
 */
function Pulse({ size = "md", className }: { size?: LoadingSize; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-full bg-blue-400 animate-ping",
        sizeClasses[size],
        className
      )}
      aria-hidden="true"
    />
  );
}

/**
 * Main Loading component
 */
export function Loading({
  size = "md",
  variant = "spinner",
  label,
  className,
  centered = false,
  overlay = false,
}: LoadingProps) {
  const LoadingIndicator = variant === "dots" ? Dots : variant === "pulse" ? Pulse : Spinner;

  const content = (
    <div
      className={clsx(
        "flex items-center gap-2",
        centered && "justify-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <LoadingIndicator size={size} />
      {label && (
        <span className={clsx("text-gray-400", labelSizeClasses[size])}>
          {label}
        </span>
      )}
      <span className="sr-only">{label || "Loading..."}</span>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-xl">
          <LoadingIndicator size="lg" />
          {label && <span className="text-gray-300 text-sm">{label}</span>}
        </div>
      </div>
    );
  }

  return content;
}

/**
 * Loading spinner for buttons (inline, smaller)
 */
export function ButtonLoading({ className }: { className?: string }) {
  return <Loading size="sm" className={className} />;
}

/**
 * Full-page loading overlay
 */
export function PageLoading({ label = "Loading..." }: { label?: string }) {
  return <Loading overlay label={label} />;
}

/**
 * Inline loading indicator for text
 */
export function InlineLoading({ label }: { label?: string }) {
  return <Loading size="xs" variant="dots" label={label} />;
}

export default Loading;
