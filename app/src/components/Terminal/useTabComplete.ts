/**
 * useTabComplete - Hook for terminal Tab autocomplete functionality
 *
 * Provides intelligent tab completion for:
 * - Command names (wall, door, help, etc.)
 * - Element IDs from the model store
 * - File paths (for import/export commands)
 *
 * Features:
 * - Tab cycles through multiple matches
 * - Double-tab shows all matches
 * - Visual feedback for matches
 * - Prefix-based completion matching
 */

import { useState, useCallback, useRef, useMemo } from "react";
import type { Terminal as XTerminal } from "@xterm/xterm";
import { useModelStore } from "../../stores";

// Available commands for autocomplete
const AVAILABLE_COMMANDS = [
  "help",
  "clear",
  "status",
  "version",
  "echo",
  "list",
  "wall",
  "floor",
  "room",
  "roof",
  "door",
  "window",
  "detect-rooms",
  "analyze",
  "clash",
  "clash-between",
  "delete",
  "get",
  "adjacency",
  "nearest",
  "area",
  "clearance",
  "macro",
  "undo",
  "redo",
  "select",
  "export",
  "import",
];

// Command argument completions - maps command to argument completers
const COMMAND_ARG_COMPLETIONS: Record<string, string[]> = {
  list: ["walls", "doors", "windows", "rooms", "floors", "roofs", "all"],
  macro: ["record", "stop", "play", "list", "show", "delete"],
  clash: ["--tolerance", "--clearance", "--ids", "--ignore_same_type"],
  "clash-between": ["--a", "--b", "--tolerance", "--clearance"],
  wall: ["--start", "--end", "--height", "--thickness", "--name"],
  floor: ["--min", "--max", "--thickness", "--name"],
  room: ["--min", "--max", "--name", "--number", "--height"],
  roof: ["--min", "--max", "--type", "--slope", "--name"],
  door: ["--wall", "--offset", "--width", "--height", "--type"],
  window: ["--wall", "--offset", "--width", "--height", "--sill", "--type"],
  delete: [], // Will complete element IDs
  get: [], // Will complete element IDs
  nearest: ["--x", "--y", "--radius", "--type"],
  area: ["--room"],
  clearance: ["--element", "--type"],
  help: AVAILABLE_COMMANDS, // Can get help on any command
};

// Door/window types for --type completion
const DOOR_TYPES = ["single", "double", "sliding", "pocket", "bifold"];
const WINDOW_TYPES = ["fixed", "casement", "awning", "sliding", "hung"];
const ROOF_TYPES = ["flat", "gable", "hip", "shed", "mansard"];
const CLEARANCE_TYPES = ["door_swing", "wheelchair", "furniture"];

export interface TabCompleteState {
  /** Current completion matches */
  matches: string[];
  /** Current index in matches (for cycling) */
  matchIndex: number;
  /** The prefix being completed */
  prefix: string;
  /** Time of last tab press (for double-tab detection) */
  lastTabTime: number;
}

export interface UseTabCompleteOptions {
  /** Double-tab threshold in milliseconds (default: 300) */
  doubleTabThreshold?: number;
  /** Maximum completions to show (default: 20) */
  maxCompletions?: number;
}

export interface UseTabCompleteResult {
  /** Current matches being cycled through */
  matches: string[];
  /** Current match index */
  matchIndex: number;
  /** Handle tab key press - returns new input if completion occurred */
  handleTab: (terminal: XTerminal, currentInput: string) => string | null;
  /** Reset completion state (call when user types or edits) */
  resetCompletion: () => void;
  /** Show all matches to terminal */
  showAllMatches: (terminal: XTerminal, prompt: string, currentInput: string) => void;
}

/**
 * Get completions for element IDs from the model store
 */
function getElementIdCompletions(partial: string, elements: { id: string; type: string }[]): string[] {
  if (!partial) return [];
  const lower = partial.toLowerCase();
  return elements
    .map((el) => el.id)
    .filter((id) => id.toLowerCase().startsWith(lower))
    .slice(0, 20);
}

/**
 * Get completions for a specific argument value
 */
function getArgValueCompletions(
  command: string,
  argName: string,
  partial: string
): string[] {
  const lower = partial.toLowerCase();

  // Type-specific completions
  if (argName === "--type") {
    let types: string[] = [];
    if (command === "door") types = DOOR_TYPES;
    else if (command === "window") types = WINDOW_TYPES;
    else if (command === "roof") types = ROOF_TYPES;
    return types.filter((t) => t.toLowerCase().startsWith(lower));
  }

  if (argName === "--type" && command === "clearance") {
    return CLEARANCE_TYPES.filter((t) => t.toLowerCase().startsWith(lower));
  }

  return [];
}

/**
 * Hook for terminal Tab autocomplete
 */
export function useTabComplete(
  options: UseTabCompleteOptions = {}
): UseTabCompleteResult {
  const { doubleTabThreshold = 300, maxCompletions = 20 } = options;

  // State for completion cycling
  const [matches, setMatches] = useState<string[]>([]);
  const [matchIndex, setMatchIndex] = useState(-1);
  const [prefix, setPrefix] = useState("");
  const lastTabTimeRef = useRef(0);

  // Get elements from model store for ID completion
  const elements = useModelStore((state) => state.elements);
  const elementList = useMemo(
    () => elements.map((el) => ({ id: el.id, type: el.type })),
    [elements]
  );

  /**
   * Reset completion state (call when user types or edits)
   */
  const resetCompletion = useCallback(() => {
    setMatches([]);
    setMatchIndex(-1);
    setPrefix("");
  }, []);

  /**
   * Get completions based on context
   */
  const getCompletions = useCallback(
    (currentInput: string): string[] => {
      const parts = currentInput.trimStart().split(/\s+/);
      const lastPart = parts[parts.length - 1] || "";
      const command = parts[0]?.toLowerCase() || "";

      // First word - complete command names
      if (parts.length === 1) {
        const lower = lastPart.toLowerCase();
        return AVAILABLE_COMMANDS.filter((cmd) =>
          cmd.toLowerCase().startsWith(lower)
        ).slice(0, maxCompletions);
      }

      // Check if last part is an argument flag
      if (lastPart.startsWith("--")) {
        const argCompletions = COMMAND_ARG_COMPLETIONS[command] || [];
        const lower = lastPart.toLowerCase();
        return argCompletions
          .filter((arg) => arg.toLowerCase().startsWith(lower))
          .slice(0, maxCompletions);
      }

      // Check previous part to see if we're completing an argument value
      const prevPart = parts[parts.length - 2];
      if (prevPart?.startsWith("--")) {
        // Special handling for --wall, --element, --room - complete element IDs
        if (["--wall", "--element", "--room"].includes(prevPart)) {
          return getElementIdCompletions(lastPart, elementList);
        }

        // Type-specific completions
        if (prevPart === "--type") {
          return getArgValueCompletions(command, prevPart, lastPart);
        }
      }

      // Commands that take element IDs as positional args
      if (["delete", "get"].includes(command) && parts.length >= 2) {
        return getElementIdCompletions(lastPart, elementList);
      }

      // Subcommand completion for macro
      if (command === "macro" && parts.length === 2) {
        const subcommands = COMMAND_ARG_COMPLETIONS.macro || [];
        const lower = lastPart.toLowerCase();
        return subcommands
          .filter((sub) => sub.toLowerCase().startsWith(lower))
          .slice(0, maxCompletions);
      }

      // Help command completion
      if (command === "help" && parts.length === 2) {
        const lower = lastPart.toLowerCase();
        return AVAILABLE_COMMANDS.filter((cmd) =>
          cmd.toLowerCase().startsWith(lower)
        ).slice(0, maxCompletions);
      }

      // List subcommand completion
      if (command === "list" && parts.length === 2) {
        const categories = COMMAND_ARG_COMPLETIONS.list || [];
        const lower = lastPart.toLowerCase();
        return categories
          .filter((cat) => cat.toLowerCase().startsWith(lower))
          .slice(0, maxCompletions);
      }

      return [];
    },
    [elementList, maxCompletions]
  );

  /**
   * Handle tab key press
   * Returns the new input string if completion occurred, null otherwise
   */
  const handleTab = useCallback(
    (terminal: XTerminal, currentInput: string): string | null => {
      const now = Date.now();
      const timeSinceLastTab = now - lastTabTimeRef.current;
      lastTabTimeRef.current = now;

      const parts = currentInput.trimStart().split(/\s+/);
      const lastPart = parts[parts.length - 1] || "";

      // Check if we're cycling through existing matches
      if (matches.length > 1 && lastPart === matches[matchIndex]) {
        // Cycle to next match
        const nextIndex = (matchIndex + 1) % matches.length;
        const nextMatch = matches[nextIndex];
        parts[parts.length - 1] = nextMatch;
        setMatchIndex(nextIndex);
        return parts.join(" ");
      }

      // Get fresh completions
      const newMatches = getCompletions(currentInput);

      if (newMatches.length === 0) {
        // No matches - beep or visual feedback
        terminal.write("\x07"); // Bell
        return null;
      }

      if (newMatches.length === 1) {
        // Single match - complete it and add space
        parts[parts.length - 1] = newMatches[0];
        resetCompletion();
        return parts.join(" ") + " ";
      }

      // Multiple matches
      // Check for double-tab to show all
      if (timeSinceLastTab < doubleTabThreshold && prefix === lastPart) {
        // Double-tab detected - show all matches (will be handled by showAllMatches)
        return null;
      }

      // Complete to first match and set up cycling
      const firstMatch = newMatches[0];
      parts[parts.length - 1] = firstMatch;
      setMatches(newMatches);
      setMatchIndex(0);
      setPrefix(lastPart);

      return parts.join(" ");
    },
    [matches, matchIndex, prefix, getCompletions, resetCompletion, doubleTabThreshold]
  );

  /**
   * Show all matches to terminal (for double-tab)
   */
  const showAllMatches = useCallback(
    (terminal: XTerminal, prompt: string, currentInput: string) => {
      const completions = getCompletions(currentInput);
      if (completions.length <= 1) return;

      // New line and show matches
      terminal.writeln("");

      // Format matches in columns
      const maxLen = Math.max(...completions.map((c) => c.length));
      const termWidth = terminal.cols || 80;
      const colWidth = maxLen + 2;
      const numCols = Math.max(1, Math.floor(termWidth / colWidth));

      let line = "";
      completions.forEach((match, i) => {
        line += match.padEnd(colWidth);
        if ((i + 1) % numCols === 0 || i === completions.length - 1) {
          terminal.writeln(`\x1b[33m${line.trimEnd()}\x1b[0m`);
          line = "";
        }
      });

      // Rewrite prompt and input
      terminal.write(prompt);
      terminal.write(currentInput);
    },
    [getCompletions]
  );

  return {
    matches,
    matchIndex,
    handleTab,
    resetCompletion,
    showAllMatches,
  };
}

export default useTabComplete;
