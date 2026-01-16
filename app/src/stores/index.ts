/**
 * Pensaer BIM Platform - Store Exports
 */

export { useModelStore } from "./modelStore";
export { useSelectionStore } from "./selectionStore";
export { useUIStore } from "./uiStore";
export {
  useHistoryStore,
  initializeHistory,
  handleUndoRedo,
} from "./historyStore";

// Expose stores globally for testing/debugging (development only)
if (typeof window !== "undefined") {
  import("./modelStore").then(
    (m) =>
      ((window as unknown as Record<string, unknown>).modelStore =
        m.useModelStore),
  );
  import("./selectionStore").then(
    (m) =>
      ((window as unknown as Record<string, unknown>).selectionStore =
        m.useSelectionStore),
  );
  import("./uiStore").then(
    (m) =>
      ((window as unknown as Record<string, unknown>).uiStore = m.useUIStore),
  );
}
