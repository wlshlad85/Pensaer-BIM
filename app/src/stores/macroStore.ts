/**
 * Macro Store
 *
 * Manages macro recording, storage, and playback for command sequences.
 * Persists macros to localStorage for cross-session availability.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Recorded command entry within a macro
 */
export interface MacroCommand {
  /** Raw command string as typed */
  command: string;
  /** Timestamp when command was recorded */
  timestamp: number;
}

/**
 * Macro definition
 */
export interface Macro {
  /** Unique macro name */
  name: string;
  /** Description (optional) */
  description?: string;
  /** Recorded commands */
  commands: MacroCommand[];
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  modifiedAt: number;
  /** Number of times played */
  playCount: number;
}

/**
 * Playback state for a running macro
 */
export interface PlaybackState {
  /** Name of the macro being played */
  macroName: string;
  /** Current command index */
  currentIndex: number;
  /** Total commands in macro */
  totalCommands: number;
  /** Whether playback is paused */
  isPaused: boolean;
  /** Start time of playback */
  startedAt: number;
}

/**
 * Macro store state interface
 */
interface MacroState {
  /** All saved macros */
  macros: Record<string, Macro>;

  /** Recording state */
  isRecording: boolean;
  recordingMacroName: string | null;
  recordingCommands: MacroCommand[];
  recordingStartedAt: number | null;

  /** Playback state */
  isPlaying: boolean;
  playbackState: PlaybackState | null;

  // Recording actions
  /** Start recording a new macro */
  startRecording: (name: string) => { success: boolean; message: string };
  /** Stop recording and save the macro */
  stopRecording: () => { success: boolean; message: string; macro?: Macro };
  /** Cancel recording without saving */
  cancelRecording: () => void;
  /** Add a command to the current recording */
  recordCommand: (command: string) => void;

  // Playback actions
  /** Get a macro by name */
  getMacro: (name: string) => Macro | undefined;
  /** Get all macro names */
  getMacroNames: () => string[];
  /** Delete a macro */
  deleteMacro: (name: string) => { success: boolean; message: string };
  /** Start playback of a macro (returns commands to execute) */
  startPlayback: (name: string) => {
    success: boolean;
    message: string;
    commands?: string[];
  };
  /** Update playback progress */
  updatePlaybackProgress: (index: number) => void;
  /** Stop/finish playback */
  stopPlayback: () => void;
  /** Pause playback */
  pausePlayback: () => void;
  /** Resume playback */
  resumePlayback: () => void;

  // Utility actions
  /** Check if a macro name is valid (unique and non-empty) */
  isValidMacroName: (name: string) => boolean;
  /** Get macro statistics */
  getStats: () => { totalMacros: number; totalCommands: number };
  /** Export macros as JSON */
  exportMacros: () => string;
  /** Import macros from JSON */
  importMacros: (json: string) => { success: boolean; imported: number };
}

/**
 * Sanitize macro name (alphanumeric, dashes, underscores only)
 */
function sanitizeMacroName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const useMacroStore = create<MacroState>()(
  persist(
    (set, get) => ({
      macros: {},
      isRecording: false,
      recordingMacroName: null,
      recordingCommands: [],
      recordingStartedAt: null,
      isPlaying: false,
      playbackState: null,

      startRecording: (name) => {
        const state = get();

        // Check if already recording
        if (state.isRecording) {
          return {
            success: false,
            message: `Already recording macro "${state.recordingMacroName}". Use "macro stop" first.`,
          };
        }

        // Check if playing
        if (state.isPlaying) {
          return {
            success: false,
            message: "Cannot record while a macro is playing.",
          };
        }

        // Validate and sanitize name
        const sanitizedName = sanitizeMacroName(name);
        if (!sanitizedName) {
          return {
            success: false,
            message: "Invalid macro name. Use alphanumeric characters, dashes, or underscores.",
          };
        }

        // Check if name already exists
        if (state.macros[sanitizedName]) {
          return {
            success: false,
            message: `Macro "${sanitizedName}" already exists. Delete it first or choose a different name.`,
          };
        }

        set({
          isRecording: true,
          recordingMacroName: sanitizedName,
          recordingCommands: [],
          recordingStartedAt: Date.now(),
        });

        return {
          success: true,
          message: `Recording macro "${sanitizedName}". Execute commands, then use "macro stop" to save.`,
        };
      },

      stopRecording: () => {
        const state = get();

        if (!state.isRecording || !state.recordingMacroName) {
          return {
            success: false,
            message: "Not currently recording. Use \"macro record <name>\" to start.",
          };
        }

        if (state.recordingCommands.length === 0) {
          set({
            isRecording: false,
            recordingMacroName: null,
            recordingCommands: [],
            recordingStartedAt: null,
          });
          return {
            success: false,
            message: "No commands recorded. Macro not saved.",
          };
        }

        const macro: Macro = {
          name: state.recordingMacroName,
          commands: state.recordingCommands,
          createdAt: state.recordingStartedAt || Date.now(),
          modifiedAt: Date.now(),
          playCount: 0,
        };

        set((s) => ({
          macros: { ...s.macros, [macro.name]: macro },
          isRecording: false,
          recordingMacroName: null,
          recordingCommands: [],
          recordingStartedAt: null,
        }));

        return {
          success: true,
          message: `Macro "${macro.name}" saved with ${macro.commands.length} command(s).`,
          macro,
        };
      },

      cancelRecording: () => {
        set({
          isRecording: false,
          recordingMacroName: null,
          recordingCommands: [],
          recordingStartedAt: null,
        });
      },

      recordCommand: (command) => {
        const state = get();
        if (!state.isRecording) return;

        // Don't record macro commands themselves
        if (command.startsWith("macro ")) return;

        set((s) => ({
          recordingCommands: [
            ...s.recordingCommands,
            { command, timestamp: Date.now() },
          ],
        }));
      },

      getMacro: (name) => {
        const sanitizedName = sanitizeMacroName(name);
        return get().macros[sanitizedName];
      },

      getMacroNames: () => {
        return Object.keys(get().macros).sort();
      },

      deleteMacro: (name) => {
        const sanitizedName = sanitizeMacroName(name);
        const state = get();

        if (!state.macros[sanitizedName]) {
          return {
            success: false,
            message: `Macro "${sanitizedName}" not found.`,
          };
        }

        // Check if currently playing this macro
        if (state.isPlaying && state.playbackState?.macroName === sanitizedName) {
          return {
            success: false,
            message: `Cannot delete macro "${sanitizedName}" while it is playing.`,
          };
        }

        const { [sanitizedName]: _, ...rest } = state.macros;
        set({ macros: rest });

        return {
          success: true,
          message: `Macro "${sanitizedName}" deleted.`,
        };
      },

      startPlayback: (name) => {
        const state = get();
        const sanitizedName = sanitizeMacroName(name);

        // Check if recording
        if (state.isRecording) {
          return {
            success: false,
            message: "Cannot play macro while recording. Use \"macro stop\" first.",
          };
        }

        // Check if already playing
        if (state.isPlaying) {
          return {
            success: false,
            message: `Macro "${state.playbackState?.macroName}" is already playing.`,
          };
        }

        const macro = state.macros[sanitizedName];
        if (!macro) {
          return {
            success: false,
            message: `Macro "${sanitizedName}" not found. Use "macro list" to see available macros.`,
          };
        }

        if (macro.commands.length === 0) {
          return {
            success: false,
            message: `Macro "${sanitizedName}" has no commands.`,
          };
        }

        // Increment play count
        const updatedMacro = { ...macro, playCount: macro.playCount + 1 };

        set((s) => ({
          macros: { ...s.macros, [sanitizedName]: updatedMacro },
          isPlaying: true,
          playbackState: {
            macroName: sanitizedName,
            currentIndex: 0,
            totalCommands: macro.commands.length,
            isPaused: false,
            startedAt: Date.now(),
          },
        }));

        return {
          success: true,
          message: `Playing macro "${sanitizedName}" (${macro.commands.length} commands)...`,
          commands: macro.commands.map((c) => c.command),
        };
      },

      updatePlaybackProgress: (index) => {
        const state = get();
        if (!state.isPlaying || !state.playbackState) return;

        set({
          playbackState: {
            ...state.playbackState,
            currentIndex: index,
          },
        });
      },

      stopPlayback: () => {
        set({
          isPlaying: false,
          playbackState: null,
        });
      },

      pausePlayback: () => {
        const state = get();
        if (!state.isPlaying || !state.playbackState) return;

        set({
          playbackState: {
            ...state.playbackState,
            isPaused: true,
          },
        });
      },

      resumePlayback: () => {
        const state = get();
        if (!state.isPlaying || !state.playbackState) return;

        set({
          playbackState: {
            ...state.playbackState,
            isPaused: false,
          },
        });
      },

      isValidMacroName: (name) => {
        const sanitizedName = sanitizeMacroName(name);
        return sanitizedName.length > 0 && !get().macros[sanitizedName];
      },

      getStats: () => {
        const macros = Object.values(get().macros);
        return {
          totalMacros: macros.length,
          totalCommands: macros.reduce((sum, m) => sum + m.commands.length, 0),
        };
      },

      exportMacros: () => {
        return JSON.stringify(get().macros, null, 2);
      },

      importMacros: (json) => {
        try {
          const imported = JSON.parse(json) as Record<string, Macro>;
          let count = 0;

          set((s) => {
            const newMacros = { ...s.macros };
            for (const [name, macro] of Object.entries(imported)) {
              if (macro.name && macro.commands && Array.isArray(macro.commands)) {
                newMacros[name] = macro;
                count++;
              }
            }
            return { macros: newMacros };
          });

          return { success: true, imported: count };
        } catch {
          return { success: false, imported: 0 };
        }
      },
    }),
    {
      name: "pensaer-macros",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        macros: state.macros,
      }),
    }
  )
);
