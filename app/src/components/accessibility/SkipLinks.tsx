/**
 * Skip Links Component
 *
 * Provides keyboard navigation shortcuts to skip to main content areas.
 * These links are visually hidden but become visible when focused.
 */

import { useCallback } from "react";

interface SkipLink {
  id: string;
  label: string;
  target: string;
}

const skipLinks: SkipLink[] = [
  { id: "skip-main", label: "Skip to main content", target: "main-content" },
  { id: "skip-canvas", label: "Skip to canvas", target: "canvas-area" },
  { id: "skip-terminal", label: "Skip to terminal", target: "terminal-area" },
];

export function SkipLinks() {
  const handleClick = useCallback((e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      // Set focus to the target element
      target.setAttribute("tabindex", "-1");
      target.focus();
      // Scroll into view
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <nav
      aria-label="Skip navigation"
      className="skip-links"
    >
      {skipLinks.map((link) => (
        <a
          key={link.id}
          href={`#${link.target}`}
          onClick={(e) => handleClick(e, link.target)}
          className="
            sr-only focus:not-sr-only
            focus:absolute focus:top-2 focus:left-2 focus:z-[100]
            focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white
            focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400
            focus:font-medium focus:text-sm
            transition-all
          "
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

export default SkipLinks;
