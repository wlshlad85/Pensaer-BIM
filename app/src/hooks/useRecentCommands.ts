/**
 * Pensaer BIM Platform - Recent Commands Hook
 *
 * Tracks and persists recently used commands for the command palette.
 * Stores last 5 commands in localStorage, removes duplicates (keeps most recent).
 */

import { useState, useCallback, useMemo } from "react";
import {
  commandDefinitions,
  type CommandDefinition,
} from "../lib/commands";

const RECENT_KEY = "pensaer:recent-commands";
const MAX_RECENT = 5;

/**
 * Load recent command IDs from localStorage
 */
function loadRecentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save recent command IDs to localStorage
 */
function saveRecentIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
  } catch {
    // localStorage may be full or disabled
  }
}

/**
 * Hook for managing recent commands
 */
export function useRecentCommands() {
  const [recentIds, setRecentIds] = useState<string[]>(loadRecentIds);

  /**
   * Add a command to recent list
   * Removes duplicates (keeps most recent) and limits to MAX_RECENT
   */
  const addRecent = useCallback((commandId: string) => {
    setRecentIds((prev) => {
      // Remove existing entry if present
      const filtered = prev.filter((id) => id !== commandId);
      // Add to front and limit size
      const updated = [commandId, ...filtered].slice(0, MAX_RECENT);
      // Persist
      saveRecentIds(updated);
      return updated;
    });
  }, []);

  /**
   * Clear all recent commands
   */
  const clearRecent = useCallback(() => {
    setRecentIds([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(RECENT_KEY);
    }
  }, []);

  /**
   * Get full command definitions for recent IDs
   * Filters out any IDs that no longer exist in command registry
   */
  const recentCommands = useMemo((): CommandDefinition[] => {
    return recentIds
      .map((id) => commandDefinitions.find((c) => c.id === id))
      .filter((cmd): cmd is CommandDefinition => cmd !== undefined);
  }, [recentIds]);

  /**
   * Check if there are any recent commands
   */
  const hasRecentCommands = recentCommands.length > 0;

  return {
    recentIds,
    recentCommands,
    hasRecentCommands,
    addRecent,
    clearRecent,
  };
}

export default useRecentCommands;
