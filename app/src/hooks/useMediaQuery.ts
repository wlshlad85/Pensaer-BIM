/**
 * useMediaQuery - Hook for responsive design using CSS media queries
 *
 * Provides breakpoint detection for mobile, tablet, and desktop layouts.
 */

import { useState, useEffect } from "react";

/**
 * Custom hook that returns true if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }

    // Legacy API fallback
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [query]);

  return matches;
}

/**
 * Breakpoint sizes (matching Tailwind defaults)
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/**
 * Hook that returns responsive breakpoint booleans
 */
export function useBreakpoints() {
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
  const isTablet = useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  );
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
  const isLargeDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);

  // Convenience flags
  const isTouchDevice = useMediaQuery("(pointer: coarse)");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isTouchDevice,
    prefersReducedMotion,
    prefersDarkMode,
    // Compound checks
    isMobileOrTablet: isMobile || isTablet,
    isTabletOrDesktop: isTablet || isDesktop,
  };
}

export default useMediaQuery;
