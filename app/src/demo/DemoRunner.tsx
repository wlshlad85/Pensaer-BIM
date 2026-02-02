/**
 * DemoRunner — Auto-Play Component for Pensaer BIM Demos
 *
 * Provides a React hook that types commands into the terminal
 * with configurable delays for dramatic presentation effect.
 *
 * KEY FIX: Wall IDs are UUIDs generated at runtime. The demo runner
 * captures wall IDs after each wall command and resolves {{ref}}
 * placeholders in subsequent door/window commands.
 */

import { useCallback, useRef, useState } from "react";
import {
  HIGH_RISE_DEMO_COMMANDS,
  HIGH_RISE_METADATA,
} from "./highRiseDemo";
import {
  INVESTOR_DEMO_COMMANDS,
  INVESTOR_DEMO_METADATA,
  resolveWallRefs,
  type WallRefs,
} from "./investorDemo";
import { DEMO_COMMANDS } from "../services/demo";
import { useModelStore } from "../stores/modelStore";

// ============================================
// TIMING CONFIGURATION
// ============================================

export interface DemoTimingConfig {
  /** Delay per character while "typing" (ms) */
  charDelay: number;
  /** Pause after a comment line (ms) */
  commentPause: number;
  /** Pause after executing a command (ms) */
  postCommandPause: number;
  /** Pause at section breaks / phase transitions (ms) */
  sectionPause: number;
  /** Initial delay before demo starts (ms) */
  startDelay: number;
}

export const TIMING_PRESETS: Record<string, DemoTimingConfig> = {
  /** Presentation pace — slow enough to read, fast enough to impress */
  presentation: {
    charDelay: 30,
    commentPause: 1200,
    postCommandPause: 600,
    sectionPause: 1800,
    startDelay: 1500,
  },
  /** Fast — for quick internal demos */
  fast: {
    charDelay: 10,
    commentPause: 400,
    postCommandPause: 200,
    sectionPause: 600,
    startDelay: 500,
  },
  /** Instant — no animation, just execute */
  instant: {
    charDelay: 0,
    commentPause: 0,
    postCommandPause: 50,
    sectionPause: 0,
    startDelay: 0,
  },
};

// ============================================
// DEMO REGISTRY
// ============================================

export interface DemoScript {
  id: string;
  name: string;
  description: string;
  commands: string[];
  metadata?: Record<string, unknown>;
  /**
   * If true, wall IDs are captured after each `wall` command
   * and {{ref}} placeholders are resolved in door/window commands.
   */
  captureWallIds?: boolean;
  /**
   * Order of wall reference names (matches wall command order).
   * Used when captureWallIds is true.
   */
  wallNameOrder?: string[];
  /**
   * If true, clear all model data before starting the demo.
   */
  cleanStart?: boolean;
  /**
   * If true, trigger a "zoom to fit" after the demo completes.
   */
  zoomToFit?: boolean;
}

/** Wall name order for the investor demo (must match wall command order) */
const INVESTOR_WALL_NAMES: string[] = [
  "south",        // wall 0: south facade
  "east",         // wall 1: east facade
  "north",        // wall 2: north facade
  "west",         // wall 3: west facade
  "corridor",     // wall 4: corridor divider
  "receptionDiv", // wall 5: reception partition
  "meetingDiv",   // wall 6: meeting room partition
  "kitchenDiv",   // wall 7: kitchen partition
];

export const DEMO_SCRIPTS: DemoScript[] = [
  {
    id: "house",
    name: "Simple House",
    description: "Build a basic house with walls, doors, windows, and a roof",
    commands: DEMO_COMMANDS,
  },
  {
    id: "highrise",
    name: "20-Story High-Rise",
    description:
      `Build ${HIGH_RISE_METADATA.name} — a ${HIGH_RISE_METADATA.floors}-floor commercial tower ` +
      `with ${HIGH_RISE_METADATA.grossFloorArea.toLocaleString()}m² GFA`,
    commands: HIGH_RISE_DEMO_COMMANDS,
    metadata: HIGH_RISE_METADATA,
  },
  {
    id: "tramshed",
    name: "Tramshed Tech HQ",
    description:
      `Build ${INVESTOR_DEMO_METADATA.name} — a ${INVESTOR_DEMO_METADATA.width}m × ${INVESTOR_DEMO_METADATA.depth}m ` +
      `modern office with ${INVESTOR_DEMO_METADATA.rooms} rooms`,
    commands: INVESTOR_DEMO_COMMANDS,
    metadata: INVESTOR_DEMO_METADATA,
    captureWallIds: true,
    wallNameOrder: INVESTOR_WALL_NAMES,
    cleanStart: true,
    zoomToFit: true,
  },
];

// ============================================
// DEMO RUNNER HOOK
// ============================================

export interface DemoRunnerCallbacks {
  /** Write a single character/string to the terminal input display */
  writeToTerminal: (text: string) => void;
  /** Write a full line to the terminal output */
  writeLineToTerminal: (text: string) => void;
  /** Execute a command string and wait for completion */
  executeCommand: (command: string) => Promise<void>;
  /** Clear the terminal */
  clearTerminal: () => void;
  /** Optional: trigger zoom-to-fit on the 3D view */
  zoomToFit?: () => void;
}

export interface DemoRunnerState {
  isRunning: boolean;
  isPaused: boolean;
  progress: number; // 0–1
  currentPhase: string;
  commandIndex: number;
  totalCommands: number;
}

export function useDemoRunner(callbacks: DemoRunnerCallbacks) {
  const [state, setState] = useState<DemoRunnerState>({
    isRunning: false,
    isPaused: false,
    progress: 0,
    currentPhase: "",
    commandIndex: 0,
    totalCommands: 0,
  });

  const abortRef = useRef(false);
  const pauseRef = useRef(false);

  // Helpers
  const delay = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        if (ms <= 0) return resolve();
        const start = Date.now();
        const tick = () => {
          if (abortRef.current) return resolve();
          if (Date.now() - start >= ms) return resolve();
          if (pauseRef.current) {
            requestAnimationFrame(tick);
          } else {
            setTimeout(tick, Math.min(50, ms - (Date.now() - start)));
          }
        };
        tick();
      }),
    []
  );

  const typeCommand = useCallback(
    async (command: string, charDelay: number) => {
      const { writeToTerminal } = callbacks;
      writeToTerminal("\x1b[32mpensaer\x1b[0m:\x1b[34m~\x1b[0m$ ");

      if (charDelay === 0) {
        writeToTerminal(command);
      } else {
        for (const char of command) {
          if (abortRef.current) break;
          writeToTerminal(char);
          await delay(charDelay);
        }
      }
      callbacks.writeLineToTerminal("");
    },
    [callbacks, delay]
  );

  /**
   * Run a demo script by id or command array.
   */
  const startDemo = useCallback(
    async (
      scriptIdOrCommands: string | string[],
      timingPreset: keyof typeof TIMING_PRESETS = "presentation"
    ) => {
      // Find script config
      const script = !Array.isArray(scriptIdOrCommands)
        ? DEMO_SCRIPTS.find((s) => s.id === scriptIdOrCommands)
        : undefined;

      const commands = Array.isArray(scriptIdOrCommands)
        ? scriptIdOrCommands
        : script?.commands;

      if (!commands || commands.length === 0) {
        callbacks.writeLineToTerminal(
          `\x1b[31mUnknown demo script: ${scriptIdOrCommands}\x1b[0m`
        );
        return;
      }

      const timing = TIMING_PRESETS[timingPreset] ?? TIMING_PRESETS.presentation;

      abortRef.current = false;
      pauseRef.current = false;

      // ── Clean start: wipe model store before demo ──
      if (script?.cleanStart) {
        const store = useModelStore.getState();
        store.clearElements();
        store.setLevels([]);
      }

      setState({
        isRunning: true,
        isPaused: false,
        progress: 0,
        currentPhase: "Starting…",
        commandIndex: 0,
        totalCommands: commands.length,
      });

      // ── Wall ID capture state ──
      const wallRefs: Partial<WallRefs> = {};
      let wallCommandIndex = 0;
      const wallNameOrder = script?.wallNameOrder ?? [];
      const captureWallIds = script?.captureWallIds ?? false;

      // Intro banner
      callbacks.writeLineToTerminal("");
      callbacks.writeLineToTerminal(
        "\x1b[1;36m╔══════════════════════════════════════════════╗\x1b[0m"
      );
      callbacks.writeLineToTerminal(
        "\x1b[1;36m║     PENSAER BIM — Auto-Play Demo            ║\x1b[0m"
      );
      callbacks.writeLineToTerminal(
        "\x1b[1;36m╚══════════════════════════════════════════════╝\x1b[0m"
      );
      callbacks.writeLineToTerminal(
        "\x1b[90m  Press Escape to stop · Space to pause/resume\x1b[0m"
      );
      callbacks.writeLineToTerminal("");

      await delay(timing.startDelay);

      // Execute commands
      for (let i = 0; i < commands.length; i++) {
        if (abortRef.current) break;

        let cmd = commands[i];

        setState((prev) => ({
          ...prev,
          commandIndex: i,
          progress: i / commands.length,
          currentPhase: cmd.startsWith("# ▸") ? cmd.slice(2) : prev.currentPhase,
        }));

        // Handle comments
        if (cmd.startsWith("#")) {
          const text = cmd.slice(2);
          const isSection = text.startsWith("▸") || text.startsWith("═");
          callbacks.writeLineToTerminal(`\x1b[36m${cmd}\x1b[0m`);
          await delay(isSection ? timing.sectionPause : timing.commentPause);
          continue;
        }

        // Handle clear — also purge model on cleanStart demos
        if (cmd === "clear") {
          if (script?.cleanStart) {
            const store = useModelStore.getState();
            store.clearElements();
            store.setLevels([]);
          }
          callbacks.clearTerminal();
          await delay(200);
          continue;
        }

        // ── Resolve wall ref placeholders ──
        if (captureWallIds && cmd.includes("{{")) {
          cmd = resolveWallRefs(cmd, wallRefs);
        }

        // Snapshot element count before executing (for wall ID capture)
        const elementsBefore = captureWallIds
          ? useModelStore.getState().elements.length
          : 0;
        const isWallCommand = captureWallIds && cmd.startsWith("wall ");

        // Type and execute
        await typeCommand(cmd, timing.charDelay);

        try {
          await callbacks.executeCommand(cmd);
        } catch (err) {
          callbacks.writeLineToTerminal(
            `\x1b[31mError: ${err instanceof Error ? err.message : String(err)}\x1b[0m`
          );
        }

        // ── Capture wall ID after wall command ──
        if (isWallCommand && wallCommandIndex < wallNameOrder.length) {
          const elementsAfter = useModelStore.getState().elements;
          if (elementsAfter.length > elementsBefore) {
            // The last added element should be our new wall
            const newWall = elementsAfter[elementsAfter.length - 1];
            if (newWall.type === "wall") {
              const refName = wallNameOrder[wallCommandIndex] as keyof WallRefs;
              wallRefs[refName] = newWall.id;
            }
          }
          wallCommandIndex++;
        }

        await delay(timing.postCommandPause);
      }

      // Completion
      if (!abortRef.current) {
        callbacks.writeLineToTerminal("");
        callbacks.writeLineToTerminal(
          "\x1b[1;32m╔══════════════════════════════════════════════╗\x1b[0m"
        );
        callbacks.writeLineToTerminal(
          "\x1b[1;32m║     Demo Complete! Explore the model.        ║\x1b[0m"
        );
        callbacks.writeLineToTerminal(
          "\x1b[1;32m╚══════════════════════════════════════════════╝\x1b[0m"
        );
        callbacks.writeLineToTerminal("");

        // ── Zoom to fit after demo ──
        if (script?.zoomToFit) {
          if (callbacks.zoomToFit) {
            callbacks.zoomToFit();
          }
          // Also fire a custom event that Canvas3D listens for
          window.dispatchEvent(new CustomEvent("pensaer:zoomToFit"));
        }
      } else {
        callbacks.writeLineToTerminal("");
        callbacks.writeLineToTerminal("\x1b[33mDemo stopped by user.\x1b[0m");
      }

      setState({
        isRunning: false,
        isPaused: false,
        progress: 1,
        currentPhase: "Complete",
        commandIndex: commands.length,
        totalCommands: commands.length,
      });
    },
    [callbacks, delay, typeCommand]
  );

  const stopDemo = useCallback(() => {
    abortRef.current = true;
    setState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  const togglePause = useCallback(() => {
    pauseRef.current = !pauseRef.current;
    setState((prev) => ({ ...prev, isPaused: pauseRef.current }));
  }, []);

  return {
    ...state,
    startDemo,
    stopDemo,
    togglePause,
    scripts: DEMO_SCRIPTS,
  };
}
