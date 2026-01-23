/**
 * Accessibility utilities for Pensaer BIM Platform
 *
 * Provides helpers for:
 * - Screen reader announcements
 * - Focus management
 * - ARIA attributes
 */

/**
 * Announces a message to screen readers using a live region
 * @param message - The message to announce
 * @param priority - 'polite' (default) or 'assertive'
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  // Get or create the live region
  let liveRegion = document.getElementById("sr-announcements");

  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.id = "sr-announcements";
    liveRegion.setAttribute("aria-live", priority);
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.setAttribute("role", "status");
    // Visually hidden but accessible to screen readers
    liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(liveRegion);
  }

  // Update priority if needed
  liveRegion.setAttribute("aria-live", priority);

  // Clear and set message (this triggers the announcement)
  liveRegion.textContent = "";
  // Use setTimeout to ensure the DOM update is noticed by screen readers
  setTimeout(() => {
    liveRegion!.textContent = message;
  }, 100);
}

/**
 * Focuses the first focusable element within a container
 * @param container - The container element
 * @returns Whether focus was successfully moved
 */
export function focusFirstElement(container: HTMLElement): boolean {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[0].focus();
    return true;
  }
  return false;
}

/**
 * Gets all focusable elements within a container
 * @param container - The container element
 * @returns Array of focusable elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(", ");

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => {
      // Ensure element is visible
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    }
  );
}

/**
 * Creates a keyboard trap within a container (for modals, dialogs)
 * @param container - The container element
 * @param event - The keyboard event
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== "Tab") return;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Generates a unique ID for ARIA relationships
 * @param prefix - Prefix for the ID
 * @returns A unique ID string
 */
export function generateAriaId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Determines if reduced motion is preferred
 * @returns true if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Checks if high contrast mode is active
 * @returns true if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia("(prefers-contrast: more)").matches;
}

/**
 * Format a keyboard shortcut for screen readers
 * @param shortcut - The shortcut string (e.g., "Ctrl+K")
 * @returns Screen reader friendly version
 */
export function formatShortcutForSR(shortcut: string): string {
  return shortcut
    .replace(/\+/g, " plus ")
    .replace(/Ctrl/g, "Control")
    .replace(/⌘/g, "Command")
    .replace(/⇧/g, "Shift")
    .replace(/⌥/g, "Option")
    .replace(/↵/g, "Enter");
}

/**
 * Hook-compatible ref callback for managing focus on mount
 */
export function createFocusOnMountRef<T extends HTMLElement>(): (
  node: T | null
) => void {
  return (node: T | null) => {
    if (node) {
      node.focus();
    }
  };
}

/**
 * Common ARIA label helpers
 */
export const ariaLabels = {
  // Navigation
  mainContent: "Main content",
  sidebar: "Sidebar",
  toolbar: "Tools toolbar",
  header: "Application header",
  terminal: "Command terminal",
  propertiesPanel: "Properties panel",

  // Actions
  close: "Close",
  expand: "Expand",
  collapse: "Collapse",
  delete: "Delete",
  edit: "Edit",
  save: "Save",
  cancel: "Cancel",
  undo: "Undo",
  redo: "Redo",

  // Tools
  selectTool: "Select tool",
  wallTool: "Draw wall tool",
  doorTool: "Place door tool",
  windowTool: "Place window tool",
  roomTool: "Draw room tool",
  columnTool: "Place column tool",

  // View controls
  toggle2D: "Switch to 2D view",
  toggle3D: "Switch to 3D view",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoomFit: "Fit view to content",
};
