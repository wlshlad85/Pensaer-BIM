/**
 * Pensaer BIM Platform - Skeleton Components
 *
 * Provides loading placeholder components for panels and content areas.
 * Creates a visual hint of the content structure while loading.
 */

import clsx from "clsx";

interface SkeletonProps {
  /** Width - can be Tailwind class or pixel/percentage value */
  width?: string;
  /** Height - can be Tailwind class or pixel/percentage value */
  height?: string;
  /** Border radius */
  rounded?: "none" | "sm" | "md" | "lg" | "full";
  /** Additional CSS classes */
  className?: string;
}

const roundedClasses = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

/**
 * Base Skeleton element
 */
export function Skeleton({
  width = "w-full",
  height = "h-4",
  rounded = "md",
  className,
}: SkeletonProps) {
  // Check if width/height are Tailwind classes or inline values
  const widthStyle = width.startsWith("w-") ? undefined : width;
  const heightStyle = height.startsWith("h-") ? undefined : height;
  const widthClass = width.startsWith("w-") ? width : undefined;
  const heightClass = height.startsWith("h-") ? height : undefined;

  return (
    <div
      className={clsx(
        "animate-pulse bg-gray-800",
        roundedClasses[rounded],
        widthClass,
        heightClass,
        className
      )}
      style={{
        width: widthStyle,
        height: heightStyle,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Text line skeleton
 */
export function SkeletonText({
  lines = 1,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={clsx("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}
          height="h-3"
        />
      ))}
    </div>
  );
}

/**
 * Avatar/image skeleton
 */
export function SkeletonAvatar({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <Skeleton
      width={sizeClasses[size].split(" ")[0]}
      height={sizeClasses[size].split(" ")[1]}
      rounded="full"
      className={className}
    />
  );
}

/**
 * Button skeleton
 */
export function SkeletonButton({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-16 h-6",
    md: "w-24 h-8",
    lg: "w-32 h-10",
  };

  return (
    <Skeleton
      width={sizeClasses[size].split(" ")[0]}
      height={sizeClasses[size].split(" ")[1]}
      className={className}
    />
  );
}

/**
 * Card skeleton
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "p-4 bg-gray-900 rounded-lg border border-gray-800",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <SkeletonAvatar size="md" />
        <div className="flex-1 space-y-2">
          <Skeleton width="w-1/2" height="h-4" />
          <SkeletonText lines={2} />
        </div>
      </div>
    </div>
  );
}

/**
 * Panel skeleton (for PropertiesPanel, etc.)
 */
export function SkeletonPanel({ className }: { className?: string }) {
  return (
    <div className={clsx("space-y-4 p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton width="w-1/3" height="h-5" />
        <Skeleton width="w-8" height="h-8" rounded="md" />
      </div>

      {/* Content sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="w-1/4" height="h-3" />
          <Skeleton width="w-full" height="h-8" />
        </div>
      ))}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <SkeletonButton />
        <SkeletonButton />
      </div>
    </div>
  );
}

/**
 * List skeleton
 */
export function SkeletonList({
  items = 3,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={clsx("space-y-2", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-2 bg-gray-900/50 rounded-md"
        >
          <Skeleton width="w-4" height="h-4" rounded="sm" />
          <Skeleton width="w-full" height="h-4" />
        </div>
      ))}
    </div>
  );
}

/**
 * Table skeleton
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={clsx("space-y-1", className)}>
      {/* Header row */}
      <div className="flex gap-2 p-2 bg-gray-800/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="flex-1" height="h-4" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-2 p-2">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} width="flex-1" height="h-3" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
