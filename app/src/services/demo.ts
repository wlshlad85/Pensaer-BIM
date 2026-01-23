/**
 * Pensaer BIM Platform - Demo Automation Service
 *
 * Provides automated demo functionality that showcases the platform's
 * capabilities by building a sample model with animated command typing.
 */

import { create } from "zustand";

// ============================================
// DEMO STATE STORE
// ============================================

interface DemoState {
  isRunning: boolean;
  isPaused: boolean;
  currentCommandIndex: number;
  totalCommands: number;
  currentCommand: string;
}

interface DemoActions {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setProgress: (index: number, command: string) => void;
  reset: () => void;
}

type DemoStore = DemoState & DemoActions;

export const useDemoStore = create<DemoStore>((set) => ({
  // Initial State
  isRunning: false,
  isPaused: false,
  currentCommandIndex: 0,
  totalCommands: 0,
  currentCommand: "",

  // Actions
  start: () =>
    set({
      isRunning: true,
      isPaused: false,
      currentCommandIndex: 0,
    }),

  pause: () => set({ isPaused: true }),

  resume: () => set({ isPaused: false }),

  stop: () =>
    set({
      isRunning: false,
      isPaused: false,
      currentCommandIndex: 0,
      currentCommand: "",
    }),

  setProgress: (index, command) =>
    set({
      currentCommandIndex: index,
      currentCommand: command,
    }),

  reset: () =>
    set({
      isRunning: false,
      isPaused: false,
      currentCommandIndex: 0,
      totalCommands: 0,
      currentCommand: "",
    }),
}));

// ============================================
// DEMO COMMANDS
// ============================================

/**
 * Demo command sequence that creates a simple house layout.
 * Comments (starting with #) are displayed but not executed.
 */
export const DEMO_COMMANDS = [
  "# Creating a simple house layout",
  "clear",
  "# Drawing exterior walls",
  "wall --start 0,0 --end 6000,0 --height 3000",
  "wall --start 6000,0 --end 6000,4000 --height 3000",
  "wall --start 6000,4000 --end 0,4000 --height 3000",
  "wall --start 0,4000 --end 0,0 --height 3000",
  "# Adding interior wall",
  "wall --start 3000,0 --end 3000,4000 --height 3000",
  "# Adding doors",
  "door --wall wall-1 --offset 1500",
  "door --wall wall-5 --offset 1500",
  "# Adding windows",
  "window --wall wall-1 --offset 4500 --sill 900",
  "window --wall wall-3 --offset 1500 --sill 900",
  "window --wall wall-3 --offset 4500 --sill 900",
  "# Creating rooms",
  'room --name "Living Room" --number 101',
  'room --name "Bedroom" --number 102',
  "# Demo complete!",
  "status",
];

// ============================================
// DEMO EXECUTION
// ============================================

/**
 * Delay helper
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if demo should continue (not stopped or paused)
 */
const shouldContinue = (): boolean => {
  const state = useDemoStore.getState();
  return state.isRunning && !state.isPaused;
};

/**
 * Wait while paused
 */
const waitWhilePaused = async (): Promise<boolean> => {
  while (useDemoStore.getState().isPaused) {
    if (!useDemoStore.getState().isRunning) {
      return false; // Demo was stopped
    }
    await delay(100);
  }
  return useDemoStore.getState().isRunning;
};

/**
 * Callback types for demo integration
 */
export interface DemoCallbacks {
  /** Write text to terminal */
  writeToTerminal: (text: string) => void;
  /** Write line to terminal */
  writeLineToTerminal: (text: string) => void;
  /** Execute a command and return result */
  executeCommand: (command: string) => Promise<void>;
  /** Clear terminal */
  clearTerminal: () => void;
}

/**
 * Run the automated demo
 */
export async function runDemo(callbacks: DemoCallbacks): Promise<void> {
  const { writeToTerminal, writeLineToTerminal, executeCommand, clearTerminal } =
    callbacks;
  const store = useDemoStore.getState();

  // Initialize demo state
  store.start();
  useDemoStore.setState({ totalCommands: DEMO_COMMANDS.length });

  // Intro message
  writeLineToTerminal("");
  writeLineToTerminal("\x1b[1;33m========================================\x1b[0m");
  writeLineToTerminal("\x1b[1;33m  PENSAER BIM - Interactive Demo\x1b[0m");
  writeLineToTerminal("\x1b[1;33m========================================\x1b[0m");
  writeLineToTerminal("");
  writeLineToTerminal("\x1b[90mPress Escape to stop, Space to pause/resume\x1b[0m");
  writeLineToTerminal("");

  await delay(1000);

  // Execute commands
  for (let i = 0; i < DEMO_COMMANDS.length; i++) {
    // Check if demo should continue
    if (!shouldContinue()) {
      const canContinue = await waitWhilePaused();
      if (!canContinue) break;
    }

    const command = DEMO_COMMANDS[i];
    useDemoStore.getState().setProgress(i, command);

    // Handle comments (display only, don't execute)
    if (command.startsWith("#")) {
      writeLineToTerminal(`\x1b[36m${command}\x1b[0m`);
      await delay(800);
      continue;
    }

    // Handle clear command specially
    if (command === "clear") {
      clearTerminal();
      await delay(300);
      continue;
    }

    // Animate typing the command
    writeToTerminal("\x1b[32mpensaer\x1b[0m:\x1b[34m~\x1b[0m$ ");

    for (const char of command) {
      if (!shouldContinue()) {
        const canContinue = await waitWhilePaused();
        if (!canContinue) {
          writeLineToTerminal("");
          break;
        }
      }
      writeToTerminal(char);
      await delay(25); // 25ms per character for smooth animation
    }

    writeLineToTerminal("");

    // Execute the command
    try {
      await executeCommand(command);
    } catch (error) {
      writeLineToTerminal(`\x1b[31mError: ${error}\x1b[0m`);
    }

    // Delay between commands
    await delay(500);
  }

  // Check if demo completed or was stopped
  if (useDemoStore.getState().isRunning) {
    writeLineToTerminal("");
    writeLineToTerminal("\x1b[1;32m========================================\x1b[0m");
    writeLineToTerminal("\x1b[1;32m  Demo Complete!\x1b[0m");
    writeLineToTerminal("\x1b[1;32m========================================\x1b[0m");
    writeLineToTerminal("");
    writeLineToTerminal("\x1b[90mYou can now explore the model or run more commands.\x1b[0m");
  } else {
    writeLineToTerminal("");
    writeLineToTerminal("\x1b[33mDemo stopped.\x1b[0m");
  }

  // Reset demo state
  useDemoStore.getState().stop();
}

/**
 * Stop the currently running demo
 */
export function stopDemo(): void {
  useDemoStore.getState().stop();
}

/**
 * Pause the currently running demo
 */
export function pauseDemo(): void {
  useDemoStore.getState().pause();
}

/**
 * Resume a paused demo
 */
export function resumeDemo(): void {
  useDemoStore.getState().resume();
}

/**
 * Toggle demo pause state
 */
export function toggleDemoPause(): void {
  const state = useDemoStore.getState();
  if (state.isPaused) {
    state.resume();
  } else {
    state.pause();
  }
}
