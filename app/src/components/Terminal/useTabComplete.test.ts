/**
 * @vitest-environment jsdom
 */

/**
 * Tests for useTabComplete hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTabComplete } from "./useTabComplete";

// Mock the model store
vi.mock("../../stores", () => ({
  useModelStore: vi.fn((selector) => {
    const state = {
      elements: [
        { id: "wall-123", type: "wall" },
        { id: "wall-456", type: "wall" },
        { id: "door-789", type: "door" },
        { id: "window-abc", type: "window" },
        { id: "room-def", type: "room" },
      ],
    };
    return selector(state);
  }),
}));

// Mock terminal
const createMockTerminal = () => ({
  write: vi.fn(),
  writeln: vi.fn(),
  cols: 80,
});

describe("useTabComplete", () => {
  let mockTerminal: ReturnType<typeof createMockTerminal>;

  beforeEach(() => {
    mockTerminal = createMockTerminal();
    vi.clearAllMocks();
  });

  describe("command completion", () => {
    it("completes partial command names", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        const completed = result.current.handleTab(
          mockTerminal as any,
          "wa"
        );
        expect(completed).toBe("wall ");
      });
    });

    it("returns null with no matches", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        const completed = result.current.handleTab(
          mockTerminal as any,
          "xyz"
        );
        expect(completed).toBeNull();
        // Should beep
        expect(mockTerminal.write).toHaveBeenCalledWith("\x07");
      });
    });

    it("cycles through multiple command matches", () => {
      const { result } = renderHook(() => useTabComplete());

      // First tab - should complete to first match (array order)
      let completed: string | null;
      act(() => {
        completed = result.current.handleTab(
          mockTerminal as any,
          "cl"
        );
      });
      expect(completed).toBe("clear");

      // Second tab - should cycle to next match
      act(() => {
        completed = result.current.handleTab(
          mockTerminal as any,
          "clear"
        );
      });
      expect(completed).toBe("clash");

      // Third tab - should cycle to next match
      act(() => {
        completed = result.current.handleTab(
          mockTerminal as any,
          "clash"
        );
      });
      expect(completed).toBe("clash-between");

      // Fourth tab - should wrap around
      act(() => {
        completed = result.current.handleTab(
          mockTerminal as any,
          "clash-between"
        );
      });
      expect(completed).toBe("clearance");
    });

    it("resets completion state", () => {
      const { result } = renderHook(() => useTabComplete());

      // Start completion
      act(() => {
        result.current.handleTab(mockTerminal as any, "cl");
      });
      expect(result.current.matches.length).toBeGreaterThan(0);

      // Reset
      act(() => {
        result.current.resetCompletion();
      });
      expect(result.current.matches).toEqual([]);
      expect(result.current.matchIndex).toBe(-1);
    });
  });

  describe("argument completion", () => {
    it("completes wall command arguments", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        const completed = result.current.handleTab(
          mockTerminal as any,
          "wall --st"
        );
        expect(completed).toBe("wall --start ");
      });
    });

    it("completes element IDs for --wall argument", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        const completed = result.current.handleTab(
          mockTerminal as any,
          "door --wall wall-1"
        );
        expect(completed).toBe("door --wall wall-123 ");
      });
    });
  });

  describe("subcommand completion", () => {
    it("completes macro subcommands", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        const completed = result.current.handleTab(
          mockTerminal as any,
          "macro rec"
        );
        expect(completed).toBe("macro record ");
      });
    });

    it("completes list categories", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        const completed = result.current.handleTab(
          mockTerminal as any,
          "list wa"
        );
        expect(completed).toBe("list walls ");
      });
    });

    it("completes help command names", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        const completed = result.current.handleTab(
          mockTerminal as any,
          "help wa"
        );
        expect(completed).toBe("help wall ");
      });
    });
  });

  describe("element ID completion", () => {
    it("completes element IDs for delete command", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        const completed = result.current.handleTab(
          mockTerminal as any,
          "delete wall-1"
        );
        // Should complete to single matching wall ID with trailing space
        expect(completed).toBe("delete wall-123 ");
      });
    });

    it("completes element IDs for get command", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        const completed = result.current.handleTab(
          mockTerminal as any,
          "get door"
        );
        expect(completed).toBe("get door-789 ");
      });
    });
  });

  describe("showAllMatches", () => {
    it("displays all matches in terminal", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        result.current.showAllMatches(
          mockTerminal as any,
          "pensaer:~$ ",
          "cl"
        );
      });

      // Should write newline and matches
      expect(mockTerminal.writeln).toHaveBeenCalled();
      // Should rewrite prompt
      expect(mockTerminal.write).toHaveBeenCalledWith("pensaer:~$ ");
      expect(mockTerminal.write).toHaveBeenCalledWith("cl");
    });

    it("does not display for single match", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        result.current.showAllMatches(
          mockTerminal as any,
          "pensaer:~$ ",
          "versio"
        );
      });

      // Should not write anything for single match
      expect(mockTerminal.writeln).not.toHaveBeenCalled();
    });
  });

  describe("type completion", () => {
    it("completes door types", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        const completed = result.current.handleTab(
          mockTerminal as any,
          "door --wall wall-123 --type sl"
        );
        expect(completed).toBe("door --wall wall-123 --type sliding ");
      });
    });

    it("completes roof types", () => {
      const { result } = renderHook(() => useTabComplete());

      act(() => {
        const completed = result.current.handleTab(
          mockTerminal as any,
          "roof --min 0,0 --max 10,10 --type ga"
        );
        expect(completed).toBe("roof --min 0,0 --max 10,10 --type gable ");
      });
    });
  });
});
