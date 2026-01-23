/**
 * useTerminalInput - Hook for managing terminal input buffer with cursor support
 *
 * Provides readline-like input handling for xterm.js:
 * - Input buffer with cursor position tracking
 * - Left/right arrow key cursor movement
 * - Home/End for line start/end
 * - Backspace/Delete key handling
 * - Ctrl+U to clear line
 * - Character insertion at cursor position
 */

import { useState, useCallback, useRef } from "react";
import type { Terminal as XTerminal } from "@xterm/xterm";

export interface UseTerminalInputOptions {
  /** Maximum buffer length (default: 1000) */
  maxLength?: number;
  /** Prompt string for display */
  prompt?: string;
}

export interface TerminalInputState {
  /** Current input buffer content */
  buffer: string;
  /** Cursor position within buffer (0 = start) */
  cursorPosition: number;
}

export interface UseTerminalInputResult {
  /** Current buffer content */
  buffer: string;
  /** Current cursor position */
  cursorPosition: number;
  /** Handle a single character or control sequence */
  handleInput: (terminal: XTerminal, data: string) => boolean;
  /** Clear the buffer and reset cursor */
  clearBuffer: () => void;
  /** Set the buffer content (e.g., from history) */
  setBuffer: (value: string) => void;
  /** Get the current buffer and clear it (for submission) */
  submitBuffer: () => string;
  /** Redraw the current line (prompt + buffer + cursor) */
  redrawLine: (terminal: XTerminal, prompt: string) => void;
}

/**
 * Hook for managing terminal input with cursor support
 */
export function useTerminalInput(
  options: UseTerminalInputOptions = {}
): UseTerminalInputResult {
  const { maxLength = 1000 } = options;

  const [buffer, setBufferState] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  // Track escape sequence state
  const escapeBufferRef = useRef("");

  /**
   * Clear the buffer and reset cursor
   */
  const clearBuffer = useCallback(() => {
    setBufferState("");
    setCursorPosition(0);
  }, []);

  /**
   * Set the buffer content (e.g., from history navigation)
   */
  const setBuffer = useCallback((value: string) => {
    const truncated = value.slice(0, maxLength);
    setBufferState(truncated);
    setCursorPosition(truncated.length);
  }, [maxLength]);

  /**
   * Get the current buffer and clear it (for Enter key submission)
   */
  const submitBuffer = useCallback(() => {
    const current = buffer;
    setBufferState("");
    setCursorPosition(0);
    return current;
  }, [buffer]);

  /**
   * Redraw the current line with prompt, buffer, and cursor
   */
  const redrawLine = useCallback(
    (terminal: XTerminal, prompt: string) => {
      // Clear current line: move to start, clear to end
      terminal.write("\r\x1b[K");
      // Write prompt
      terminal.write(prompt);
      // Write buffer content
      terminal.write(buffer);
      // Move cursor to correct position (from end to cursorPosition)
      const moveBack = buffer.length - cursorPosition;
      if (moveBack > 0) {
        terminal.write(`\x1b[${moveBack}D`);
      }
    },
    [buffer, cursorPosition]
  );

  /**
   * Handle terminal input data
   * Returns true if input was handled, false if it should be processed externally (e.g., Enter)
   */
  const handleInput = useCallback(
    (terminal: XTerminal, data: string): boolean => {
      const code = data.charCodeAt(0);

      // Handle escape sequences for special keys
      if (code === 27) {
        // ESC
        escapeBufferRef.current = "\x1b";
        return true;
      }

      if (escapeBufferRef.current === "\x1b" && data === "[") {
        escapeBufferRef.current = "\x1b[";
        return true;
      }

      if (escapeBufferRef.current === "\x1b[") {
        escapeBufferRef.current = "";

        switch (data) {
          case "A": // Up arrow - handled externally for history
            return false;

          case "B": // Down arrow - handled externally for history
            return false;

          case "C": // Right arrow
            if (cursorPosition < buffer.length) {
              setCursorPosition((pos) => pos + 1);
              terminal.write("\x1b[C"); // Move cursor right
            }
            return true;

          case "D": // Left arrow
            if (cursorPosition > 0) {
              setCursorPosition((pos) => pos - 1);
              terminal.write("\x1b[D"); // Move cursor left
            }
            return true;

          case "H": // Home key (some terminals)
            if (cursorPosition > 0) {
              terminal.write(`\x1b[${cursorPosition}D`);
              setCursorPosition(0);
            }
            return true;

          case "F": // End key (some terminals)
            if (cursorPosition < buffer.length) {
              terminal.write(`\x1b[${buffer.length - cursorPosition}C`);
              setCursorPosition(buffer.length);
            }
            return true;

          case "3": // Potential Delete key sequence (needs ~)
            escapeBufferRef.current = "\x1b[3";
            return true;

          default:
            return true;
        }
      }

      // Handle Delete key sequence: ESC[3~
      if (escapeBufferRef.current === "\x1b[3" && data === "~") {
        escapeBufferRef.current = "";
        if (cursorPosition < buffer.length) {
          // Delete character at cursor
          const newBuffer =
            buffer.slice(0, cursorPosition) + buffer.slice(cursorPosition + 1);
          setBufferState(newBuffer);
          // Redraw from cursor to end, then clear trailing char
          terminal.write(buffer.slice(cursorPosition + 1) + " ");
          // Move back to cursor position
          const moveBack = buffer.length - cursorPosition;
          if (moveBack > 0) {
            terminal.write(`\x1b[${moveBack}D`);
          }
        }
        return true;
      }

      // Clear escape buffer for other inputs
      escapeBufferRef.current = "";

      // Enter key - signal external handling
      if (code === 13) {
        return false;
      }

      // Tab - signal external handling for autocomplete
      if (code === 9) {
        return false;
      }

      // Backspace (DEL character, code 127)
      if (code === 127) {
        if (cursorPosition > 0) {
          const newBuffer =
            buffer.slice(0, cursorPosition - 1) + buffer.slice(cursorPosition);
          setBufferState(newBuffer);
          setCursorPosition((pos) => pos - 1);
          // Move back, write rest of line, clear trailing char, move back
          terminal.write("\b");
          terminal.write(buffer.slice(cursorPosition) + " ");
          const moveBack = buffer.length - cursorPosition + 1;
          if (moveBack > 0) {
            terminal.write(`\x1b[${moveBack}D`);
          }
        }
        return true;
      }

      // Ctrl+C - signal external handling
      if (code === 3) {
        return false;
      }

      // Ctrl+L (clear screen) - signal external handling
      if (code === 12) {
        return false;
      }

      // Ctrl+U - clear line from cursor to start
      if (code === 21) {
        if (cursorPosition > 0) {
          const newBuffer = buffer.slice(cursorPosition);
          const clearedLength = cursorPosition;
          setBufferState(newBuffer);
          setCursorPosition(0);
          // Move to start of input, rewrite, clear rest
          terminal.write(`\x1b[${clearedLength}D`);
          terminal.write(newBuffer + " ".repeat(clearedLength));
          // Move back to start
          terminal.write(`\x1b[${newBuffer.length + clearedLength}D`);
          terminal.write(newBuffer);
          // Cursor is now at end of newBuffer, move to start
          if (newBuffer.length > 0) {
            terminal.write(`\x1b[${newBuffer.length}D`);
          }
        }
        return true;
      }

      // Ctrl+K - clear line from cursor to end (bonus feature)
      if (code === 11) {
        if (cursorPosition < buffer.length) {
          const clearedLength = buffer.length - cursorPosition;
          const newBuffer = buffer.slice(0, cursorPosition);
          setBufferState(newBuffer);
          // Clear to end of line
          terminal.write("\x1b[K");
        }
        return true;
      }

      // Ctrl+A - move to start of line (bonus feature)
      if (code === 1) {
        if (cursorPosition > 0) {
          terminal.write(`\x1b[${cursorPosition}D`);
          setCursorPosition(0);
        }
        return true;
      }

      // Ctrl+E - move to end of line (bonus feature)
      if (code === 5) {
        if (cursorPosition < buffer.length) {
          terminal.write(`\x1b[${buffer.length - cursorPosition}C`);
          setCursorPosition(buffer.length);
        }
        return true;
      }

      // Printable characters
      if (code >= 32 && buffer.length < maxLength) {
        // Insert character at cursor position
        const newBuffer =
          buffer.slice(0, cursorPosition) + data + buffer.slice(cursorPosition);
        setBufferState(newBuffer);
        setCursorPosition((pos) => pos + 1);

        if (cursorPosition === buffer.length) {
          // Appending to end - just write the character
          terminal.write(data);
        } else {
          // Inserting in middle - write char + rest of line, then move back
          terminal.write(data + buffer.slice(cursorPosition));
          const moveBack = buffer.length - cursorPosition;
          if (moveBack > 0) {
            terminal.write(`\x1b[${moveBack}D`);
          }
        }
        return true;
      }

      return true;
    },
    [buffer, cursorPosition, maxLength]
  );

  return {
    buffer,
    cursorPosition,
    handleInput,
    clearBuffer,
    setBuffer,
    submitBuffer,
    redrawLine,
  };
}

export default useTerminalInput;
