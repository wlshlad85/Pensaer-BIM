/**
 * Pensaer BIM Platform - Macro Store Tests
 *
 * Comprehensive unit tests for the macro store (command recording and playback).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useMacroStore } from "../macroStore";

describe("macroStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useMacroStore.setState({
      macros: {},
      isRecording: false,
      recordingMacroName: null,
      recordingCommands: [],
      recordingStartedAt: null,
      isPlaying: false,
      playbackState: null,
    });
  });

  describe("Initial State", () => {
    it("should start with no macros", () => {
      const state = useMacroStore.getState();
      expect(Object.keys(state.macros)).toHaveLength(0);
    });

    it("should not be recording initially", () => {
      const state = useMacroStore.getState();
      expect(state.isRecording).toBe(false);
      expect(state.recordingMacroName).toBeNull();
    });

    it("should not be playing initially", () => {
      const state = useMacroStore.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.playbackState).toBeNull();
    });
  });

  describe("Recording", () => {
    describe("startRecording", () => {
      it("should start recording with valid name", () => {
        const result = useMacroStore.getState().startRecording("test-macro");

        expect(result.success).toBe(true);
        expect(result.message).toContain("Recording");
        expect(useMacroStore.getState().isRecording).toBe(true);
        expect(useMacroStore.getState().recordingMacroName).toBe("test-macro");
      });

      it("should sanitize macro name", () => {
        useMacroStore.getState().startRecording("My Test Macro!");

        const state = useMacroStore.getState();
        expect(state.recordingMacroName).toBe("my-test-macro");
      });

      it("should fail with empty name", () => {
        const result = useMacroStore.getState().startRecording("");

        expect(result.success).toBe(false);
        expect(result.message).toContain("Invalid");
        expect(useMacroStore.getState().isRecording).toBe(false);
      });

      it("should fail with invalid characters only", () => {
        const result = useMacroStore.getState().startRecording("!!!");

        expect(result.success).toBe(false);
        expect(useMacroStore.getState().isRecording).toBe(false);
      });

      it("should fail if already recording", () => {
        useMacroStore.getState().startRecording("first-macro");
        const result = useMacroStore.getState().startRecording("second-macro");

        expect(result.success).toBe(false);
        expect(result.message).toContain("Already recording");
        expect(useMacroStore.getState().recordingMacroName).toBe("first-macro");
      });

      it("should fail if macro name already exists", () => {
        // Create a macro first
        useMacroStore.getState().startRecording("existing-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().stopRecording();

        // Try to record with same name
        const result = useMacroStore.getState().startRecording("existing-macro");

        expect(result.success).toBe(false);
        expect(result.message).toContain("already exists");
      });

      it("should fail if currently playing", () => {
        // Create and start playing a macro
        useMacroStore.getState().startRecording("play-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().stopRecording();
        useMacroStore.getState().startPlayback("play-macro");

        const result = useMacroStore.getState().startRecording("new-macro");

        expect(result.success).toBe(false);
        expect(result.message).toContain("playing");
      });

      it("should set recording start timestamp", () => {
        const before = Date.now();
        useMacroStore.getState().startRecording("timed-macro");
        const after = Date.now();

        const state = useMacroStore.getState();
        expect(state.recordingStartedAt).toBeGreaterThanOrEqual(before);
        expect(state.recordingStartedAt).toBeLessThanOrEqual(after);
      });
    });

    describe("recordCommand", () => {
      it("should record commands when recording is active", () => {
        useMacroStore.getState().startRecording("test-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().recordCommand("floor --min 0,0 --max 5,5");

        const state = useMacroStore.getState();
        expect(state.recordingCommands).toHaveLength(2);
        expect(state.recordingCommands[0].command).toBe("wall --start 0,0 --end 5,0");
        expect(state.recordingCommands[1].command).toBe("floor --min 0,0 --max 5,5");
      });

      it("should not record when not recording", () => {
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");

        const state = useMacroStore.getState();
        expect(state.recordingCommands).toHaveLength(0);
      });

      it("should not record macro commands", () => {
        useMacroStore.getState().startRecording("test-macro");
        useMacroStore.getState().recordCommand("macro list");
        useMacroStore.getState().recordCommand("macro stop");

        const state = useMacroStore.getState();
        expect(state.recordingCommands).toHaveLength(0);
      });

      it("should add timestamp to recorded commands", () => {
        useMacroStore.getState().startRecording("test-macro");
        const before = Date.now();
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        const after = Date.now();

        const state = useMacroStore.getState();
        expect(state.recordingCommands[0].timestamp).toBeGreaterThanOrEqual(before);
        expect(state.recordingCommands[0].timestamp).toBeLessThanOrEqual(after);
      });
    });

    describe("stopRecording", () => {
      it("should save macro with recorded commands", () => {
        useMacroStore.getState().startRecording("saved-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().recordCommand("floor --min 0,0 --max 5,5");
        const result = useMacroStore.getState().stopRecording();

        expect(result.success).toBe(true);
        expect(result.macro).toBeDefined();
        expect(result.macro?.name).toBe("saved-macro");
        expect(result.macro?.commands).toHaveLength(2);

        const state = useMacroStore.getState();
        expect(state.isRecording).toBe(false);
        expect(state.macros["saved-macro"]).toBeDefined();
      });

      it("should fail with no commands recorded", () => {
        useMacroStore.getState().startRecording("empty-macro");
        const result = useMacroStore.getState().stopRecording();

        expect(result.success).toBe(false);
        expect(result.message).toContain("No commands recorded");
        expect(useMacroStore.getState().macros["empty-macro"]).toBeUndefined();
      });

      it("should fail if not recording", () => {
        const result = useMacroStore.getState().stopRecording();

        expect(result.success).toBe(false);
        expect(result.message).toContain("Not currently recording");
      });

      it("should reset recording state", () => {
        useMacroStore.getState().startRecording("test-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().stopRecording();

        const state = useMacroStore.getState();
        expect(state.isRecording).toBe(false);
        expect(state.recordingMacroName).toBeNull();
        expect(state.recordingCommands).toHaveLength(0);
        expect(state.recordingStartedAt).toBeNull();
      });

      it("should set macro timestamps correctly", () => {
        const before = Date.now();
        useMacroStore.getState().startRecording("timed-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().stopRecording();
        const after = Date.now();

        const macro = useMacroStore.getState().macros["timed-macro"];
        expect(macro.createdAt).toBeGreaterThanOrEqual(before);
        expect(macro.modifiedAt).toBeLessThanOrEqual(after);
        expect(macro.playCount).toBe(0);
      });
    });

    describe("cancelRecording", () => {
      it("should cancel without saving", () => {
        useMacroStore.getState().startRecording("cancelled-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().cancelRecording();

        const state = useMacroStore.getState();
        expect(state.isRecording).toBe(false);
        expect(state.macros["cancelled-macro"]).toBeUndefined();
      });

      it("should reset all recording state", () => {
        useMacroStore.getState().startRecording("test-macro");
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().cancelRecording();

        const state = useMacroStore.getState();
        expect(state.isRecording).toBe(false);
        expect(state.recordingMacroName).toBeNull();
        expect(state.recordingCommands).toHaveLength(0);
        expect(state.recordingStartedAt).toBeNull();
      });
    });
  });

  describe("Playback", () => {
    beforeEach(() => {
      // Create a test macro for playback tests
      useMacroStore.getState().startRecording("playback-test");
      useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
      useMacroStore.getState().recordCommand("floor --min 0,0 --max 5,5");
      useMacroStore.getState().stopRecording();
    });

    describe("startPlayback", () => {
      it("should start playback of existing macro", () => {
        const result = useMacroStore.getState().startPlayback("playback-test");

        expect(result.success).toBe(true);
        expect(result.commands).toBeDefined();
        expect(result.commands).toHaveLength(2);
        expect(useMacroStore.getState().isPlaying).toBe(true);
      });

      it("should fail for non-existent macro", () => {
        const result = useMacroStore.getState().startPlayback("non-existent");

        expect(result.success).toBe(false);
        expect(result.message).toContain("not found");
        expect(useMacroStore.getState().isPlaying).toBe(false);
      });

      it("should fail if already playing", () => {
        useMacroStore.getState().startPlayback("playback-test");
        const result = useMacroStore.getState().startPlayback("playback-test");

        expect(result.success).toBe(false);
        expect(result.message).toContain("already playing");
      });

      it("should fail if recording", () => {
        useMacroStore.getState().startRecording("new-macro");
        const result = useMacroStore.getState().startPlayback("playback-test");

        expect(result.success).toBe(false);
        expect(result.message).toContain("recording");
      });

      it("should set playback state correctly", () => {
        useMacroStore.getState().startPlayback("playback-test");

        const state = useMacroStore.getState();
        expect(state.playbackState).toBeDefined();
        expect(state.playbackState?.macroName).toBe("playback-test");
        expect(state.playbackState?.currentIndex).toBe(0);
        expect(state.playbackState?.totalCommands).toBe(2);
        expect(state.playbackState?.isPaused).toBe(false);
      });

      it("should increment play count", () => {
        const initialCount = useMacroStore.getState().macros["playback-test"].playCount;
        useMacroStore.getState().startPlayback("playback-test");

        const newCount = useMacroStore.getState().macros["playback-test"].playCount;
        expect(newCount).toBe(initialCount + 1);
      });

      it("should return commands for execution", () => {
        const result = useMacroStore.getState().startPlayback("playback-test");

        expect(result.commands).toEqual([
          "wall --start 0,0 --end 5,0",
          "floor --min 0,0 --max 5,5",
        ]);
      });
    });

    describe("updatePlaybackProgress", () => {
      it("should update current index", () => {
        useMacroStore.getState().startPlayback("playback-test");
        useMacroStore.getState().updatePlaybackProgress(1);

        const state = useMacroStore.getState();
        expect(state.playbackState?.currentIndex).toBe(1);
      });

      it("should not update when not playing", () => {
        useMacroStore.getState().updatePlaybackProgress(1);

        const state = useMacroStore.getState();
        expect(state.playbackState).toBeNull();
      });
    });

    describe("stopPlayback", () => {
      it("should stop playback", () => {
        useMacroStore.getState().startPlayback("playback-test");
        useMacroStore.getState().stopPlayback();

        const state = useMacroStore.getState();
        expect(state.isPlaying).toBe(false);
        expect(state.playbackState).toBeNull();
      });
    });

    describe("pausePlayback", () => {
      it("should pause playback", () => {
        useMacroStore.getState().startPlayback("playback-test");
        useMacroStore.getState().pausePlayback();

        const state = useMacroStore.getState();
        expect(state.playbackState?.isPaused).toBe(true);
      });

      it("should not pause when not playing", () => {
        useMacroStore.getState().pausePlayback();

        const state = useMacroStore.getState();
        expect(state.playbackState).toBeNull();
      });
    });

    describe("resumePlayback", () => {
      it("should resume paused playback", () => {
        useMacroStore.getState().startPlayback("playback-test");
        useMacroStore.getState().pausePlayback();
        useMacroStore.getState().resumePlayback();

        const state = useMacroStore.getState();
        expect(state.playbackState?.isPaused).toBe(false);
      });
    });
  });

  describe("Macro Management", () => {
    beforeEach(() => {
      // Create test macros
      useMacroStore.getState().startRecording("macro-a");
      useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
      useMacroStore.getState().stopRecording();

      useMacroStore.getState().startRecording("macro-b");
      useMacroStore.getState().recordCommand("floor --min 0,0 --max 5,5");
      useMacroStore.getState().recordCommand("roof --min 0,0 --max 5,5");
      useMacroStore.getState().stopRecording();
    });

    describe("getMacro", () => {
      it("should return existing macro", () => {
        const macro = useMacroStore.getState().getMacro("macro-a");

        expect(macro).toBeDefined();
        expect(macro?.name).toBe("macro-a");
        expect(macro?.commands).toHaveLength(1);
      });

      it("should return undefined for non-existent macro", () => {
        const macro = useMacroStore.getState().getMacro("non-existent");

        expect(macro).toBeUndefined();
      });

      it("should sanitize name when getting", () => {
        const macro = useMacroStore.getState().getMacro("MACRO-A");

        expect(macro).toBeDefined();
        expect(macro?.name).toBe("macro-a");
      });
    });

    describe("getMacroNames", () => {
      it("should return sorted list of macro names", () => {
        const names = useMacroStore.getState().getMacroNames();

        expect(names).toEqual(["macro-a", "macro-b"]);
      });

      it("should return empty array when no macros", () => {
        useMacroStore.setState({ macros: {} });
        const names = useMacroStore.getState().getMacroNames();

        expect(names).toEqual([]);
      });
    });

    describe("deleteMacro", () => {
      it("should delete existing macro", () => {
        const result = useMacroStore.getState().deleteMacro("macro-a");

        expect(result.success).toBe(true);
        expect(useMacroStore.getState().macros["macro-a"]).toBeUndefined();
        expect(useMacroStore.getState().macros["macro-b"]).toBeDefined();
      });

      it("should fail for non-existent macro", () => {
        const result = useMacroStore.getState().deleteMacro("non-existent");

        expect(result.success).toBe(false);
        expect(result.message).toContain("not found");
      });

      it("should fail if macro is currently playing", () => {
        useMacroStore.getState().startPlayback("macro-a");
        const result = useMacroStore.getState().deleteMacro("macro-a");

        expect(result.success).toBe(false);
        expect(result.message).toContain("playing");
      });
    });

    describe("isValidMacroName", () => {
      it("should return true for valid new name", () => {
        expect(useMacroStore.getState().isValidMacroName("new-macro")).toBe(true);
      });

      it("should return false for existing name", () => {
        expect(useMacroStore.getState().isValidMacroName("macro-a")).toBe(false);
      });

      it("should return false for empty name", () => {
        expect(useMacroStore.getState().isValidMacroName("")).toBe(false);
      });

      it("should return false for invalid characters only", () => {
        expect(useMacroStore.getState().isValidMacroName("!!!")).toBe(false);
      });
    });
  });

  describe("Statistics", () => {
    beforeEach(() => {
      useMacroStore.getState().startRecording("stat-macro-1");
      useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
      useMacroStore.getState().recordCommand("wall --start 5,0 --end 10,0");
      useMacroStore.getState().stopRecording();

      useMacroStore.getState().startRecording("stat-macro-2");
      useMacroStore.getState().recordCommand("floor --min 0,0 --max 5,5");
      useMacroStore.getState().stopRecording();
    });

    describe("getStats", () => {
      it("should return correct statistics", () => {
        const stats = useMacroStore.getState().getStats();

        expect(stats.totalMacros).toBe(2);
        expect(stats.totalCommands).toBe(3);
      });

      it("should return zeros when no macros", () => {
        useMacroStore.setState({ macros: {} });
        const stats = useMacroStore.getState().getStats();

        expect(stats.totalMacros).toBe(0);
        expect(stats.totalCommands).toBe(0);
      });
    });
  });

  describe("Import/Export", () => {
    beforeEach(() => {
      useMacroStore.getState().startRecording("export-macro");
      useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
      useMacroStore.getState().stopRecording();
    });

    describe("exportMacros", () => {
      it("should export macros as JSON string", () => {
        const json = useMacroStore.getState().exportMacros();

        expect(typeof json).toBe("string");
        const parsed = JSON.parse(json);
        expect(parsed["export-macro"]).toBeDefined();
        expect(parsed["export-macro"].name).toBe("export-macro");
      });
    });

    describe("importMacros", () => {
      it("should import valid macros", () => {
        const macroToImport = {
          "imported-macro": {
            name: "imported-macro",
            commands: [{ command: "floor --min 0,0 --max 5,5", timestamp: Date.now() }],
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            playCount: 0,
          },
        };

        const result = useMacroStore.getState().importMacros(JSON.stringify(macroToImport));

        expect(result.success).toBe(true);
        expect(result.imported).toBe(1);
        expect(useMacroStore.getState().macros["imported-macro"]).toBeDefined();
      });

      it("should fail with invalid JSON", () => {
        const result = useMacroStore.getState().importMacros("not valid json");

        expect(result.success).toBe(false);
        expect(result.imported).toBe(0);
      });

      it("should merge with existing macros", () => {
        const macroToImport = {
          "new-macro": {
            name: "new-macro",
            commands: [{ command: "wall --start 0,0 --end 5,0", timestamp: Date.now() }],
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            playCount: 0,
          },
        };

        useMacroStore.getState().importMacros(JSON.stringify(macroToImport));

        const state = useMacroStore.getState();
        expect(state.macros["export-macro"]).toBeDefined();
        expect(state.macros["new-macro"]).toBeDefined();
      });

      it("should skip invalid macro entries", () => {
        const macroToImport = {
          "valid-macro": {
            name: "valid-macro",
            commands: [{ command: "wall --start 0,0 --end 5,0", timestamp: Date.now() }],
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            playCount: 0,
          },
          "invalid-macro": {
            // Missing required fields
            description: "invalid",
          },
        };

        const result = useMacroStore.getState().importMacros(JSON.stringify(macroToImport));

        expect(result.success).toBe(true);
        expect(result.imported).toBe(1);
        expect(useMacroStore.getState().macros["valid-macro"]).toBeDefined();
        expect(useMacroStore.getState().macros["invalid-macro"]).toBeUndefined();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid recording start/stop cycles", () => {
      for (let i = 0; i < 10; i++) {
        useMacroStore.getState().startRecording(`rapid-macro-${i}`);
        useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
        useMacroStore.getState().stopRecording();
      }

      const names = useMacroStore.getState().getMacroNames();
      expect(names).toHaveLength(10);
    });

    it("should handle special characters in commands", () => {
      useMacroStore.getState().startRecording("special-chars");
      useMacroStore.getState().recordCommand('wall --name "My Wall" --start 0,0 --end 5,0');
      useMacroStore.getState().recordCommand("room --name 'Kitchen' --min 0,0 --max 5,5");
      useMacroStore.getState().stopRecording();

      const macro = useMacroStore.getState().getMacro("special-chars");
      expect(macro?.commands[0].command).toContain('"My Wall"');
      expect(macro?.commands[1].command).toContain("'Kitchen'");
    });

    it("should handle very long macro names", () => {
      const longName = "a".repeat(100);
      useMacroStore.getState().startRecording(longName);
      useMacroStore.getState().recordCommand("wall --start 0,0 --end 5,0");
      useMacroStore.getState().stopRecording();

      const macro = useMacroStore.getState().getMacro(longName);
      expect(macro).toBeDefined();
    });

    it("should handle many commands in a single macro", () => {
      useMacroStore.getState().startRecording("many-commands");
      for (let i = 0; i < 100; i++) {
        useMacroStore.getState().recordCommand(`wall --start ${i},0 --end ${i + 1},0`);
      }
      useMacroStore.getState().stopRecording();

      const macro = useMacroStore.getState().getMacro("many-commands");
      expect(macro?.commands).toHaveLength(100);
    });
  });
});
