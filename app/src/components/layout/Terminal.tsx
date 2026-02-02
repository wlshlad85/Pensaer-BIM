/**
 * Terminal component using xterm.js
 *
 * Provides an embedded terminal for command execution and AI interactions.
 * Supports collapsing/expanding and resizing.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import clsx from "clsx";
import {
  mcpClient,
  type MCPToolResult,
  formatError,
  writeErrorToTerminal,
  type McpError,
  formatMcpResult as formatMcpResultService,
  writeResultToTerminal as writeResultToTerminalService,
  formatClashReport,
  type ResultFormatterOptions,
  dispatchCommand,
  type CommandResult,
  runDemo,
  stopDemo,
  toggleDemoPause,
  useDemoStore,
  type DemoCallbacks,
} from "../../services";
import { getAllCommands } from "../../commands";
import { useTokenStore, useUIStore, useSelectionStore } from "../../stores";
import { executeDsl, type ExecutionContext } from "../../lib/dsl";
import { useTerminalInput, useTabComplete } from "../Terminal";

interface TerminalProps {
  /** Whether the terminal panel is expanded */
  isExpanded?: boolean;
  /** Callback when terminal is toggled */
  onToggle?: () => void;
  /** Initial height in pixels */
  initialHeight?: number;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Compact mode for mobile - reduced font size and padding */
  compact?: boolean;
}


// Macro type definition
interface Macro {
  name: string;
  commands: string[];
  createdAt: number;
}

// Load macros from localStorage
const loadMacros = (): Map<string, Macro> => {
  try {
    const saved = localStorage.getItem("pensaer-terminal-macros");
    if (saved) {
      const arr = JSON.parse(saved) as Macro[];
      return new Map(arr.map((m) => [m.name, m]));
    }
  } catch {
    // Ignore parse errors
  }
  return new Map();
};

// Save macros to localStorage
const saveMacros = (macros: Map<string, Macro>) => {
  try {
    const arr = Array.from(macros.values());
    localStorage.setItem("pensaer-terminal-macros", JSON.stringify(arr));
  } catch {
    // Ignore storage errors
  }
};

// Maximum history size
const MAX_HISTORY_SIZE = 100;

// Load command history from localStorage
const loadCommandHistory = (): string[] => {
  try {
    const saved = localStorage.getItem("pensaer-terminal-history");
    if (saved) {
      const arr = JSON.parse(saved) as string[];
      // Ensure we don't exceed MAX_HISTORY_SIZE
      return arr.slice(-MAX_HISTORY_SIZE);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
};

// Save command history to localStorage
const saveCommandHistory = (history: string[]) => {
  try {
    // Only keep the last MAX_HISTORY_SIZE commands
    const trimmed = history.slice(-MAX_HISTORY_SIZE);
    localStorage.setItem("pensaer-terminal-history", JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
};

/** Token counter display component */
function TokenCounter() {
  const inputTokens = useTokenStore((s) => s.inputTokens);
  const outputTokens = useTokenStore((s) => s.outputTokens);
  const total = inputTokens + outputTokens;

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/50 px-2 py-0.5 rounded"
      title={`Input: ${inputTokens.toLocaleString()} | Output: ${outputTokens.toLocaleString()}`}
    >
      <i className="fa-solid fa-microchip text-[10px] text-cyan-500"></i>
      <span className="font-mono">{formatNumber(total)}</span>
    </div>
  );
}

export function Terminal({
  isExpanded = true,
  onToggle,
  initialHeight = 200,
  minHeight = 100,
  maxHeight = 500,
  compact = false,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [height, setHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);

  // Use the terminal input hook for buffer management and cursor support
  const {
    buffer: commandBuffer,
    cursorPosition,
    handleInput: handleBufferInput,
    clearBuffer,
    setBuffer: setCommandBuffer,
    submitBuffer,
    redrawLine,
  } = useTerminalInput();

  // Command history state - persisted to localStorage
  const [commandHistory, setCommandHistory] = useState<string[]>(loadCommandHistory);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedBuffer, setSavedBuffer] = useState("");

  // Save command history to localStorage whenever it changes
  useEffect(() => {
    saveCommandHistory(commandHistory);
  }, [commandHistory]);

  // Tab completion hook
  const {
    matches: tabMatches,
    matchIndex: tabIndex,
    handleTab,
    resetCompletion,
    showAllMatches,
  } = useTabComplete();

  // Macro recording state
  const [macros, setMacros] = useState<Map<string, Macro>>(loadMacros);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMacroName, setRecordingMacroName] = useState<string | null>(
    null,
  );
  const [recordingCommands, setRecordingCommands] = useState<string[]>([]);
  const [isPlayingMacro, setIsPlayingMacro] = useState(false);

  // Demo trigger state from UI store
  const demoTrigger = useUIStore((s) => s.demoTrigger);
  const clearDemoTrigger = useUIStore((s) => s.clearDemoTrigger);
  const isDemoRunning = useDemoStore((s) => s.isRunning);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminal = new XTerminal({
      theme: {
        background: "#1a1a2e",
        foreground: "#e0e0e0",
        cursor: "#00ff88",
        cursorAccent: "#1a1a2e",
        selectionBackground: "#3d3d5c",
        black: "#1a1a2e",
        red: "#ff6b6b",
        green: "#00ff88",
        yellow: "#ffd93d",
        blue: "#6c5ce7",
        magenta: "#a29bfe",
        cyan: "#00d4ff",
        white: "#e0e0e0",
        brightBlack: "#4a4a6a",
        brightRed: "#ff8787",
        brightGreen: "#5cf5b0",
        brightYellow: "#ffe066",
        brightBlue: "#8c7ae6",
        brightMagenta: "#c4b8ff",
        brightCyan: "#33ddff",
        brightWhite: "#ffffff",
      },
      fontSize: compact ? 11 : 13,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 10000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    // Welcome message
    terminal.writeln(
      "\x1b[36m╔══════════════════════════════════════════════════╗\x1b[0m",
    );
    terminal.writeln(
      "\x1b[36m║\x1b[0m  \x1b[1;32mPensaer BIM Terminal\x1b[0m                          \x1b[36m║\x1b[0m",
    );
    terminal.writeln(
      "\x1b[36m║\x1b[0m  Type 'help' for available commands             \x1b[36m║\x1b[0m",
    );
    terminal.writeln(
      "\x1b[36m║\x1b[0m  \x1b[33m↑/↓\x1b[0m History  \x1b[33mTab\x1b[0m Autocomplete  \x1b[33mCtrl+L\x1b[0m Clear \x1b[36m║\x1b[0m",
    );
    terminal.writeln(
      "\x1b[36m╚══════════════════════════════════════════════════╝\x1b[0m",
    );
    terminal.writeln("");
    writePrompt(terminal);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle input via ref to avoid stale closure
    terminal.onData((data) => {
      handleInputRef.current?.(terminal, data);
    });

    return () => {
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact]);

  // Fit terminal on expand/collapse
  useEffect(() => {
    if (isExpanded && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 50);
    }
  }, [isExpanded]);

  // Fit on height change
  useEffect(() => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
    }
  }, [height]);

  // Fit on window resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Demo automation - triggered via Ctrl+Shift+D
  useEffect(() => {
    if (demoTrigger > 0 && terminalRef.current && !isDemoRunning) {
      clearDemoTrigger();
      const terminal = terminalRef.current;

      // Create demo callbacks
      const callbacks: DemoCallbacks = {
        writeToTerminal: (text: string) => terminal.write(text),
        writeLineToTerminal: (text: string) => terminal.writeln(text),
        executeCommand: async (command: string) => {
          // Use the command dispatcher
          const [cmd, ...args] = command.trim().split(/\s+/);
          const parsed = parseArgsForDemo(args);
          const result = await dispatchCommand(cmd, parsed);
          if (result.success) {
            terminal.writeln(`\x1b[32m✓ ${result.message}\x1b[0m`);
          } else {
            terminal.writeln(`\x1b[31m✗ ${result.message}\x1b[0m`);
          }
        },
        clearTerminal: () => terminal.clear(),
      };

      // Run the demo
      runDemo(callbacks);
    }
  }, [demoTrigger, isDemoRunning, clearDemoTrigger]);

  // Demo keyboard controls (Escape to stop, Space to pause/resume)
  useEffect(() => {
    const handleDemoKeyboard = (e: KeyboardEvent) => {
      if (!isDemoRunning) return;

      if (e.key === "Escape") {
        e.preventDefault();
        stopDemo();
      } else if (e.key === " ") {
        e.preventDefault();
        toggleDemoPause();
      }
    };

    window.addEventListener("keydown", handleDemoKeyboard);
    return () => window.removeEventListener("keydown", handleDemoKeyboard);
  }, [isDemoRunning]);

  const writePrompt = useCallback(
    (terminal: XTerminal) => {
      if (isRecording) {
        terminal.write(
          "\x1b[31m●\x1b[0m \x1b[32mpensaer\x1b[0m:\x1b[34m~\x1b[0m$ ",
        );
      } else {
        terminal.write("\x1b[32mpensaer\x1b[0m:\x1b[34m~\x1b[0m$ ");
      }
    },
    [isRecording],
  );

  // Clear current line and write new content
  const clearLineAndWrite = useCallback(
    (terminal: XTerminal, oldText: string, newText: string) => {
      // Clear existing text by moving back and overwriting
      for (let i = 0; i < oldText.length; i++) {
        terminal.write("\b \b");
      }
      // Write new text
      terminal.write(newText);
    },
    [],
  );

  // Get prompt string for redrawing
  const getPromptString = useCallback(() => {
    return isRecording
      ? "\x1b[31m●\x1b[0m \x1b[32mpensaer\x1b[0m:\x1b[34m~\x1b[0m$ "
      : "\x1b[32mpensaer\x1b[0m:\x1b[34m~\x1b[0m$ ";
  }, [isRecording]);

  // Track escape sequence state for history navigation (Up/Down arrows)
  const escapeBufferRef = useRef("");

  // Ref to always hold the latest handleInput, avoiding stale closure in onData
  const handleInputRef = useRef<(terminal: XTerminal, data: string) => void>();

  const handleInput = useCallback(
    (terminal: XTerminal, data: string) => {
      const code = data.charCodeAt(0);

      // First, let the input hook try to handle basic input (cursor movement, etc.)
      // It returns false for keys that need external handling
      const handled = handleBufferInput(terminal, data);

      if (handled) {
        // Input was handled by the hook (cursor movement, typing, backspace, etc.)
        // Reset tab completion state when user types or edits
        if (tabMatches.length > 0) {
          resetCompletion();
        }
        return;
      }

      // Handle keys that the hook delegates to us

      // Handle escape sequences for history navigation (Up/Down arrows)
      // The hook signals these by returning false after processing ESC[A or ESC[B
      if (code === 27) {
        // ESC
        escapeBufferRef.current = "\x1b";
        return;
      }

      if (escapeBufferRef.current === "\x1b" && data === "[") {
        escapeBufferRef.current = "\x1b[";
        return;
      }

      if (escapeBufferRef.current === "\x1b[") {
        escapeBufferRef.current = "";

        // Up arrow - navigate history
        if (data === "A") {
          if (commandHistory.length > 0) {
            // Save current buffer if we're starting history navigation
            if (historyIndex === -1) {
              setSavedBuffer(commandBuffer);
            }

            const newIndex =
              historyIndex === -1
                ? commandHistory.length - 1
                : Math.max(0, historyIndex - 1);

            if (newIndex !== historyIndex || historyIndex === -1) {
              const historyCmd = commandHistory[newIndex];
              clearLineAndWrite(terminal, commandBuffer, historyCmd);
              setCommandBuffer(historyCmd);
              setHistoryIndex(newIndex);
            }
          }
          return;
        }

        // Down arrow - navigate history
        if (data === "B") {
          if (historyIndex >= 0) {
            const newIndex = historyIndex + 1;

            if (newIndex >= commandHistory.length) {
              // Restore saved buffer
              clearLineAndWrite(terminal, commandBuffer, savedBuffer);
              setCommandBuffer(savedBuffer);
              setHistoryIndex(-1);
            } else {
              const historyCmd = commandHistory[newIndex];
              clearLineAndWrite(terminal, commandBuffer, historyCmd);
              setCommandBuffer(historyCmd);
              setHistoryIndex(newIndex);
            }
          }
          return;
        }
        return;
      }

      // Clear escape buffer for other inputs
      escapeBufferRef.current = "";

      // Enter key - submit command
      if (code === 13) {
        terminal.writeln("");

        // Get buffer content and clear it
        const currentCmd = submitBuffer();
        const trimmedCmd = currentCmd.trim();

        // Add to history if non-empty and different from last command
        if (
          trimmedCmd &&
          (commandHistory.length === 0 ||
            commandHistory[commandHistory.length - 1] !== trimmedCmd)
        ) {
          setCommandHistory((prev) => {
            const newHistory = [...prev, trimmedCmd];
            // Limit history size
            if (newHistory.length > MAX_HISTORY_SIZE) {
              return newHistory.slice(-MAX_HISTORY_SIZE);
            }
            return newHistory;
          });
        }

        // Reset history navigation
        setHistoryIndex(-1);
        setSavedBuffer("");

        processCommand(terminal, currentCmd);
        return;
      }

      // Tab - autocomplete with cycling and double-tab support
      if (code === 9) {
        // Use the tab completion hook
        const completedInput = handleTab(terminal, commandBuffer);

        if (completedInput !== null) {
          // Completion occurred - update the buffer
          clearLineAndWrite(terminal, commandBuffer, completedInput);
          setCommandBuffer(completedInput);
        } else if (tabMatches.length > 1) {
          // Double-tab detected with multiple matches - show all
          showAllMatches(terminal, getPromptString(), commandBuffer);
        }
        return;
      }

      // Ctrl+C - cancel current input
      if (code === 3) {
        terminal.writeln("^C");
        clearBuffer();
        setHistoryIndex(-1);
        setSavedBuffer("");
        writePrompt(terminal);
        return;
      }

      // Ctrl+L - clear screen
      if (code === 12) {
        terminal.clear();
        writePrompt(terminal);
        terminal.write(commandBuffer);
        // Move cursor back to correct position if not at end
        const moveBack = commandBuffer.length - cursorPosition;
        if (moveBack > 0) {
          terminal.write(`\x1b[${moveBack}D`);
        }
        return;
      }
    },
    [
      commandBuffer,
      cursorPosition,
      commandHistory,
      historyIndex,
      savedBuffer,
      handleBufferInput,
      submitBuffer,
      clearBuffer,
      clearLineAndWrite,
      handleTab,
      showAllMatches,
      resetCompletion,
      getPromptString,
      tabMatches,
    ],
  );

  // Keep ref in sync so onData always calls the latest handleInput
  handleInputRef.current = handleInput;

  // Format MCP result for terminal display
  const formatMcpResult = (
    terminal: XTerminal,
    result: MCPToolResult,
    toolName: string,
    options: ResultFormatterOptions = {},
  ) => {
    if (result.success) {
      // Use the new result formatter for improved display
      writeResultToTerminalService(terminal, result, toolName, {
        format: "auto",
        maxItems: 20,
        ...options,
      });
    } else {
      // Use the error formatter for improved error display
      const mcpError: McpError = {
        code: result.error?.code ?? -32603,
        message: result.error?.message ?? `${toolName} failed`,
        data: result.error?.data,
        timestamp: result.timestamp,
      };
      const formattedError = formatError(mcpError);
      writeErrorToTerminal(terminal, formattedError);
    }
  };

  // Format command result for terminal display (from command dispatcher)
  const formatCommandResult = (
    terminal: XTerminal,
    result: CommandResult,
    commandName: string,
  ) => {
    if (result.success) {
      terminal.writeln(`\x1b[32m✓ ${result.message}\x1b[0m`);
      if (result.data) {
        for (const [key, value] of Object.entries(result.data)) {
          if (value !== null && value !== undefined) {
            terminal.writeln(`  \x1b[36m${key}:\x1b[0m ${value}`);
          }
        }
      }
      if (result.elementCreated) {
        terminal.writeln(`  \x1b[33mCreated:\x1b[0m ${result.elementCreated.type} ${result.elementCreated.id}`);
      }
    } else {
      terminal.writeln(`\x1b[31m✗ ${result.message}\x1b[0m`);
      if (result.data) {
        for (const [key, value] of Object.entries(result.data)) {
          if (value !== null && value !== undefined) {
            terminal.writeln(`  \x1b[36m${key}:\x1b[0m ${value}`);
          }
        }
      }
    }
  };

  // Format object for terminal display
  const formatObject = (
    terminal: XTerminal,
    obj: Record<string, unknown>,
    indent: string = "",
  ) => {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        terminal.writeln(`${indent}\x1b[36m${key}:\x1b[0m null`);
      } else if (Array.isArray(value)) {
        terminal.writeln(
          `${indent}\x1b[36m${key}:\x1b[0m [${value.length} items]`,
        );
        value.slice(0, 5).forEach((item, i) => {
          if (typeof item === "object" && item !== null) {
            terminal.writeln(`${indent}  [${i}]:`);
            formatObject(
              terminal,
              item as Record<string, unknown>,
              indent + "    ",
            );
          } else {
            terminal.writeln(`${indent}  [${i}]: ${item}`);
          }
        });
        if (value.length > 5) {
          terminal.writeln(`${indent}  ... and ${value.length - 5} more`);
        }
      } else if (typeof value === "object") {
        terminal.writeln(`${indent}\x1b[36m${key}:\x1b[0m`);
        formatObject(terminal, value as Record<string, unknown>, indent + "  ");
      } else {
        terminal.writeln(`${indent}\x1b[36m${key}:\x1b[0m ${value}`);
      }
    }
  };

  // Parse command arguments like --key value or --key=value
  const parseArgs = (args: string[]): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      if (arg.startsWith("--")) {
        const key = arg.slice(2);
        if (key.includes("=")) {
          const [k, v] = key.split("=", 2);
          result[k] = parseValue(v);
        } else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
          result[key] = parseValue(args[i + 1]);
          i++;
        } else {
          result[key] = true;
        }
      }
      i++;
    }
    return result;
  };

  // Parse value to appropriate type
  const parseValue = (v: string): unknown => {
    // Check for coordinate pairs like "0,0" or "5,5,0"
    if (/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?)+$/.test(v)) {
      return v.split(",").map(Number);
    }
    // Check for numbers
    if (/^-?\d+(\.\d+)?$/.test(v)) {
      return Number(v);
    }
    // Check for booleans
    if (v === "true") return true;
    if (v === "false") return false;
    return v;
  };

  // Parse arguments for demo commands (simplified version)
  const parseArgsForDemo = (args: string[]): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      if (arg.startsWith("--")) {
        const key = arg.slice(2);
        if (key.includes("=")) {
          const [k, v] = key.split("=", 2);
          result[k] = parseValue(v);
        } else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
          result[key] = parseValue(args[i + 1]);
          i++;
        } else {
          result[key] = true;
        }
      }
      i++;
    }
    return result;
  };

  // Set of commands that should be routed through the DSL parser
  // for natural syntax support (e.g., `wall 0,0 10,0 3`)
  const DSL_COMMANDS = new Set([
    "wall", "walls", "floor", "roof", "room", "door", "window",
    "opening", "rect", "box",
  ]);

  const processCommand = async (terminal: XTerminal, cmd: string) => {
    const trimmed = cmd.trim();

    if (!trimmed) {
      writePrompt(terminal);
      return;
    }

    const [command, ...args] = trimmed.split(/\s+/);

    // Route DSL-recognized element commands through the DSL parser
    // This enables natural syntax like `wall 0,0 10,0 3` alongside `wall --start 0,0 --end 10,0`
    if (DSL_COMMANDS.has(command.toLowerCase())) {
      const selectedIds = useSelectionStore.getState().selectedIds;
      const context: ExecutionContext = { selectedIds };

      const dslResult = await executeDsl(trimmed, context);

      if (dslResult.success && dslResult.commandResults.length > 0) {
        dslResult.terminalOutput.forEach((line) => terminal.writeln(line));
        if (dslResult.createdElementIds.length > 1) {
          terminal.writeln(
            `\x1b[36mCreated ${dslResult.createdElementIds.length} element(s)\x1b[0m`
          );
        }
      } else {
        dslResult.terminalOutput.forEach((line) => terminal.writeln(line));
        if (dslResult.terminalOutput.length === 0) {
          terminal.writeln(`\x1b[31mFailed: ${dslResult.message}\x1b[0m`);
        }
      }

      // Record command if recording
      if (isRecording && command.toLowerCase() !== "macro" && trimmed.length > 0) {
        setRecordingCommands((prev) => [...prev, trimmed]);
      }
      writePrompt(terminal);
      return;
    }

    switch (command.toLowerCase()) {
      case "help": {
        // Check if specific command help is requested
        const specificCommand = args[0];
        const result = await dispatchCommand("help", specificCommand ? { command: specificCommand } : {});

        if (result.success && result.data) {
          if (specificCommand) {
            // Detailed help for specific command
            terminal.writeln(`\x1b[1;33m${result.data.name}\x1b[0m - ${result.data.description}`);
            terminal.writeln(`  \x1b[36mUsage:\x1b[0m ${result.data.usage}`);
            if (result.data.examples && Array.isArray(result.data.examples)) {
              terminal.writeln("  \x1b[36mExamples:\x1b[0m");
              for (const ex of result.data.examples as string[]) {
                terminal.writeln(`    ${ex}`);
              }
            }
          } else {
            // Full help listing
            const commands = getAllCommands();
            terminal.writeln("\x1b[1;33mAvailable commands:\x1b[0m");
            terminal.writeln(
              "  \x1b[32mhelp\x1b[0m              - Show this help message",
            );
            terminal.writeln(
              "  \x1b[32mclear\x1b[0m             - Clear the terminal",
            );
            terminal.writeln(
              "  \x1b[32mstatus\x1b[0m            - Show model statistics",
            );
            terminal.writeln(
              "  \x1b[32mversion\x1b[0m           - Show version info",
            );
            terminal.writeln(
              "  \x1b[32mecho\x1b[0m              - Print text (for testing)",
            );
            terminal.writeln("");
            terminal.writeln("\x1b[1;33mMCP Tool Commands:\x1b[0m");
            terminal.writeln(
              "  \x1b[32mlist [category]\x1b[0m   - List elements (walls, rooms, etc.)",
            );
            terminal.writeln(
              "                        Options: --json, --table, --all, --page N",
            );
            terminal.writeln(
              "  \x1b[32mwall\x1b[0m              - Create wall: wall --start 0,0 --end 5,0",
            );
            terminal.writeln(
              "  \x1b[32mfloor\x1b[0m             - Create floor: floor --min 0,0 --max 10,10",
            );
            terminal.writeln(
              "  \x1b[32mroom\x1b[0m              - Create room: room --min 0,0 --max 5,5 --name Kitchen",
            );
            terminal.writeln(
              "  \x1b[32mroof\x1b[0m              - Create roof: roof --min 0,0 --max 10,10 --type gable",
            );
            terminal.writeln(
              "  \x1b[32mdoor\x1b[0m              - Place door: door --wall <id> --offset 2.5",
            );
            terminal.writeln(
              "                        Types: --type single|double|sliding",
            );
            terminal.writeln(
              "  \x1b[32mwindow\x1b[0m            - Place window: window --wall <id> --offset 1.5",
            );
            terminal.writeln(
              "                        Options: --sill 0.9 --type fixed|casement|awning",
            );
            terminal.writeln(
              "  \x1b[32mdetect-rooms\x1b[0m      - Detect rooms from wall topology",
            );
            terminal.writeln(
              "  \x1b[32manalyze\x1b[0m           - Analyze wall topology",
            );
            terminal.writeln(
              "  \x1b[32mclash\x1b[0m             - Detect clashes: clash [--clearance 0.1] [--ids id1,id2]",
            );
            terminal.writeln(
              "  \x1b[32mclash-between\x1b[0m     - Clash between sets: clash-between --a id1,id2 --b id3,id4",
            );
            terminal.writeln(
              "  \x1b[32mdelete\x1b[0m            - Delete elements: delete <id1> <id2> ...",
            );
            terminal.writeln("");
            terminal.writeln("\x1b[1;33mSpatial Analysis Commands:\x1b[0m");
            terminal.writeln(
              "  \x1b[32madjacency\x1b[0m         - Find adjacent rooms (rooms sharing walls)",
            );
            terminal.writeln(
              "  \x1b[32mnearest\x1b[0m           - Find nearest elements: nearest --x 5 --y 5 --radius 10",
            );
            terminal.writeln(
              "  \x1b[32marea\x1b[0m              - Calculate room area: area --room <room_id>",
            );
            terminal.writeln(
              "  \x1b[32mclearance\x1b[0m         - Check clearance: clearance --element <id> --type door_swing",
            );
            terminal.writeln("");
            terminal.writeln("\x1b[1;33mMacro Commands:\x1b[0m");
            terminal.writeln(
              "  \x1b[32mmacro record <name>\x1b[0m - Start recording commands to a macro",
            );
            terminal.writeln(
              "  \x1b[32mmacro stop\x1b[0m          - Stop recording and save macro",
            );
            terminal.writeln(
              "  \x1b[32mmacro play <name>\x1b[0m   - Playback a recorded macro",
            );
            terminal.writeln(
              "  \x1b[32mmacro list\x1b[0m          - List all saved macros",
            );
            terminal.writeln(
              "  \x1b[32mmacro show <name>\x1b[0m   - Show macro commands",
            );
            terminal.writeln(
              "  \x1b[32mmacro delete <name>\x1b[0m - Delete a saved macro",
            );
            terminal.writeln("");
            terminal.writeln("\x1b[1;33mKeyboard Shortcuts:\x1b[0m");
            terminal.writeln(
              "  \x1b[32m↑ / ↓\x1b[0m             - Navigate command history",
            );
            terminal.writeln(
              "  \x1b[32mTab\x1b[0m               - Autocomplete command name",
            );
            terminal.writeln(
              "  \x1b[32mCtrl+C\x1b[0m            - Cancel current input",
            );
            terminal.writeln(
              "  \x1b[32mCtrl+L\x1b[0m            - Clear terminal screen",
            );
            terminal.writeln("");
            terminal.writeln(`\x1b[36mTip: Use 'help <command>' for detailed help on a specific command\x1b[0m`);
          }
        } else {
          formatCommandResult(terminal, result, "help");
        }
        break;
      }

      case "clear": {
        const result = await dispatchCommand("clear", {});
        if (result.success && result.message === "__CLEAR_TERMINAL__") {
          terminal.clear();
        } else {
          formatCommandResult(terminal, result, "clear");
        }
        break;
      }

      case "version": {
        const result = await dispatchCommand("version", {});
        if (result.success && result.data) {
          terminal.writeln("\x1b[1mPensaer BIM Platform\x1b[0m");
          terminal.writeln(`  Version: ${result.data.version} (${result.data.phase})`);
          terminal.writeln(`  Kernel: ${result.data.kernel}`);
          terminal.writeln(`  Client: ${result.data.client}`);
          terminal.writeln(`  MCP Mode: ${result.data.mcp_mode}`);
          terminal.writeln(`  Environment: ${result.data.environment}`);
        } else {
          formatCommandResult(terminal, result, "version");
        }
        break;
      }

      case "status": {
        terminal.writeln("\x1b[33mFetching model status...\x1b[0m");
        const result = await dispatchCommand("status", {});
        if (result.success && result.data) {
          terminal.writeln("\x1b[32m✓ Model Status\x1b[0m");
          terminal.writeln(`  \x1b[36mTotal Elements:\x1b[0m ${result.data.total_elements}`);

          // Show elements by type
          const byType = result.data.elements_by_type as Record<string, number>;
          if (byType && Object.keys(byType).length > 0) {
            terminal.writeln("  \x1b[36mBy Type:\x1b[0m");
            for (const [type, count] of Object.entries(byType)) {
              terminal.writeln(`    ${type}: ${count}`);
            }
          }

          terminal.writeln(`  \x1b[36mLevels:\x1b[0m ${result.data.levels}`);
          terminal.writeln(`  \x1b[36mSelected:\x1b[0m ${result.data.selected}`);

          // Show history info
          const history = result.data.history as Record<string, unknown>;
          if (history) {
            terminal.writeln(`  \x1b[36mUndo Available:\x1b[0m ${history.undo_available}`);
            terminal.writeln(`  \x1b[36mRedo Available:\x1b[0m ${history.redo_available}`);
            if (history.last_action) {
              terminal.writeln(`  \x1b[36mLast Action:\x1b[0m ${history.last_action}`);
            }
          }

          // Show issues if any
          const issues = result.data.issues as Record<string, unknown>;
          if (issues && (issues.total as number) > 0) {
            terminal.writeln(`  \x1b[33mIssues:\x1b[0m ${issues.total}`);
          }

          // Show AI suggestions if any
          if ((result.data.ai_suggestions as number) > 0) {
            terminal.writeln(`  \x1b[35mAI Suggestions:\x1b[0m ${result.data.ai_suggestions}`);
          }
        } else {
          formatCommandResult(terminal, result, "status");
        }
        break;
      }

      case "echo": {
        // Pass all arguments as raw text
        const text = args.join(" ");
        const result = await dispatchCommand("echo", { text, _raw: args });
        if (result.success) {
          terminal.writeln(result.message);
        } else {
          formatCommandResult(terminal, result, "echo");
        }
        break;
      }

      case "list": {
        const parsed = parseArgs(args);
        // Category can be first positional arg or --category flag
        const category = args.find(a => !a.startsWith("--")) || (parsed.category as string) || undefined;

        terminal.writeln(
          `\x1b[33mListing elements${category ? ` (${category})` : ""}...\x1b[0m`,
        );
        // Use command dispatcher to list elements from model store
        const result = await dispatchCommand("list", category ? { category } : {});
        formatCommandResult(terminal, result, "list");
        break;
      }

      // wall, floor, roof, room, door, window, rect, box, walls, opening
      // are now handled by the DSL parser above the switch statement

      case "detect-rooms": {
        terminal.writeln(
          "\x1b[33mDetecting rooms from wall topology...\x1b[0m",
        );
        // Use command dispatcher for detect-rooms
        const result = await dispatchCommand("detect-rooms", {});
        formatCommandResult(terminal, result, "detect-rooms");
        break;
      }

      case "analyze": {
        terminal.writeln("\x1b[33mAnalyzing wall topology...\x1b[0m");
        // Use command dispatcher for analyze
        const result = await dispatchCommand("analyze", {});
        formatCommandResult(terminal, result, "analyze");
        break;
      }

      case "clash": {
        const parsed = parseArgs(args);
        const tolerance = (parsed.tolerance as number) || 0.001;
        const clearance = (parsed.clearance as number) || 0;
        const elementIds = parsed.ids
          ? String(parsed.ids).split(",")
          : undefined;
        const ignoreSameType = parsed.ignore_same_type === true;

        terminal.writeln("\x1b[33mDetecting clashes...\x1b[0m");
        if (clearance > 0) {
          terminal.writeln(
            `  Clearance check: ${(clearance * 1000).toFixed(0)}mm`,
          );
        }
        if (elementIds) {
          terminal.writeln(`  Checking ${elementIds.length} elements`);
        }

        // Use command dispatcher for clash detection
        const result = await dispatchCommand("clash", {
          ids: parsed.ids,
          tolerance,
          clearance,
          ignore_same_type: ignoreSameType,
        });
        formatCommandResult(terminal, result, "clash");
        break;
      }

      case "clash-between": {
        const parsed = parseArgs(args);
        if (!parsed.a || !parsed.b) {
          terminal.writeln(
            "\x1b[31mUsage: clash-between --a id1,id2,... --b id3,id4,...\x1b[0m",
          );
          terminal.writeln(
            "  Example: clash-between --a wall-1,wall-2 --b door-1,door-2",
          );
          terminal.writeln("  Options: --tolerance 0.001 --clearance 0.1");
          break;
        }

        const tolerance = (parsed.tolerance as number) || 0.001;
        const clearance = (parsed.clearance as number) || 0;

        terminal.writeln("\x1b[33mDetecting clashes between sets...\x1b[0m");
        terminal.writeln(`  Set A: ${String(parsed.a).split(",").length} elements`);
        terminal.writeln(`  Set B: ${String(parsed.b).split(",").length} elements`);

        // Use command dispatcher for clash-between
        const result = await dispatchCommand("clash-between", {
          a: parsed.a,
          b: parsed.b,
          tolerance,
          clearance,
        });
        formatCommandResult(terminal, result, "clash-between");
        break;
      }

      case "delete": {
        if (args.length === 0) {
          terminal.writeln(
            "\x1b[31mUsage: delete <element_id> [<element_id2> ...]\x1b[0m",
          );
          terminal.writeln("  Example: delete wall-1 wall-2");
          break;
        }
        terminal.writeln(
          `\x1b[33mDeleting ${args.length} element(s)...\x1b[0m`,
        );
        // Use command dispatcher to delete elements from model store
        const result = await dispatchCommand("delete", { element_ids: args });
        formatCommandResult(terminal, result, "delete");
        break;
      }

      case "get": {
        if (args.length === 0) {
          terminal.writeln("\x1b[31mUsage: get <element_id>\x1b[0m");
          terminal.writeln("  Example: get wall-1");
          break;
        }
        terminal.writeln(`\x1b[33mFetching element ${args[0]}...\x1b[0m`);
        // Use command dispatcher to get element from model store
        const result = await dispatchCommand("get", { element_id: args[0] });
        formatCommandResult(terminal, result, "get");
        break;
      }

      case "adjacency": {
        terminal.writeln(
          "\x1b[33mAnalyzing room adjacencies from wall topology...\x1b[0m",
        );
        // First detect rooms, then analyze adjacencies
        const roomsResult = await mcpClient.callTool({
          tool: "detect_rooms",
          arguments: {},
        });
        if (roomsResult.success && roomsResult.data?.rooms) {
          const rooms = roomsResult.data.rooms;
          terminal.writeln(`\x1b[32m✓ Found ${rooms.length} rooms\x1b[0m`);

          // Build adjacency from shared boundary edges
          terminal.writeln("\x1b[36mRoom Adjacencies:\x1b[0m");
          if (rooms.length === 0) {
            terminal.writeln("  No rooms detected. Create walls first.");
          } else if (rooms.length === 1) {
            terminal.writeln("  Single room - no adjacencies possible.");
          } else {
            terminal.writeln(
              "  (Rooms sharing boundary edges are adjacent)",
            );
            for (const room of rooms) {
              terminal.writeln(
                `  Room ${room.id?.substring(0, 8)}: area=${room.area?.toFixed(2)}m²`,
              );
            }
          }
        } else {
          formatMcpResult(terminal, roomsResult, "detect_rooms");
        }
        break;
      }

      case "nearest": {
        const parsed = parseArgs(args);
        if (parsed.x === undefined || parsed.y === undefined) {
          terminal.writeln(
            "\x1b[31mUsage: nearest --x <x> --y <y> [--radius r] [--type wall|door|...]\x1b[0m",
          );
          terminal.writeln("  Example: nearest --x 5 --y 5 --radius 10");
          break;
        }
        const x = parsed.x as number;
        const y = parsed.y as number;
        const radius = (parsed.radius as number) || 10;
        const filterType = parsed.type as string | undefined;

        terminal.writeln(
          `\x1b[33mSearching for elements near (${x}, ${y}) within ${radius}m...\x1b[0m`,
        );

        // Get all elements and filter by distance
        const listResult = await mcpClient.callTool({
          tool: "list_elements",
          arguments: filterType ? { category: filterType } : {},
        });

        if (listResult.success && listResult.data?.elements) {
          const elements = listResult.data.elements;
          interface ElementWithDistance {
            id: string;
            type: string;
            distance: number;
            centroid?: [number, number];
          }
          const nearest: ElementWithDistance[] = [];

          for (const elem of elements) {
            // Calculate distance to element centroid or start point
            let ex = 0,
              ey = 0;
            if (elem.centroid) {
              [ex, ey] = elem.centroid;
            } else if (elem.start) {
              ex = (elem.start[0] + (elem.end?.[0] || elem.start[0])) / 2;
              ey = (elem.start[1] + (elem.end?.[1] || elem.start[1])) / 2;
            }
            const dist = Math.sqrt((ex - x) ** 2 + (ey - y) ** 2);
            if (dist <= radius) {
              nearest.push({
                id: elem.id,
                type: elem.type || elem.element_type,
                distance: dist,
                centroid: [ex, ey],
              });
            }
          }

          nearest.sort((a, b) => a.distance - b.distance);
          terminal.writeln(
            `\x1b[32m✓ Found ${nearest.length} element(s) within radius\x1b[0m`,
          );
          for (const n of nearest.slice(0, 10)) {
            terminal.writeln(
              `  ${n.type} ${n.id.substring(0, 8)}: ${n.distance.toFixed(2)}m away`,
            );
          }
          if (nearest.length > 10) {
            terminal.writeln(`  ... and ${nearest.length - 10} more`);
          }
        } else {
          formatMcpResult(terminal, listResult, "list_elements");
        }
        break;
      }

      case "area": {
        const parsed = parseArgs(args);
        if (!parsed.room) {
          terminal.writeln(
            "\x1b[31mUsage: area --room <room_id>\x1b[0m",
          );
          terminal.writeln("  Example: area --room room-abc123");
          terminal.writeln("  Tip: Use 'detect-rooms' first to find room IDs");
          break;
        }
        const roomId = String(parsed.room);
        terminal.writeln(`\x1b[33mCalculating area for room ${roomId}...\x1b[0m`);

        // Get room via detect_rooms and find the matching one
        const roomsResult = await mcpClient.callTool({
          tool: "detect_rooms",
          arguments: {},
        });

        if (roomsResult.success && roomsResult.data?.rooms) {
          const rooms = roomsResult.data.rooms;
          const room = rooms.find(
            (r: { id?: string }) =>
              r.id === roomId || r.id?.startsWith(roomId),
          );
          if (room) {
            terminal.writeln("\x1b[32m✓ Room found\x1b[0m");
            terminal.writeln(`  \x1b[36mArea:\x1b[0m ${room.area?.toFixed(2)} m²`);
            terminal.writeln(
              `  \x1b[36mCentroid:\x1b[0m (${room.centroid?.[0]?.toFixed(2)}, ${room.centroid?.[1]?.toFixed(2)})`,
            );
            terminal.writeln(
              `  \x1b[36mBoundary edges:\x1b[0m ${room.boundary_count || "N/A"}`,
            );
          } else {
            terminal.writeln(`\x1b[31mRoom ${roomId} not found\x1b[0m`);
            terminal.writeln("Available rooms:");
            for (const r of rooms) {
              terminal.writeln(
                `  ${r.id?.substring(0, 8)}: ${r.area?.toFixed(2)}m²`,
              );
            }
          }
        } else {
          formatMcpResult(terminal, roomsResult, "detect_rooms");
        }
        break;
      }

      case "clearance": {
        const parsed = parseArgs(args);
        if (!parsed.element) {
          terminal.writeln(
            "\x1b[31mUsage: clearance --element <id> [--type door_swing|wheelchair|furniture]\x1b[0m",
          );
          terminal.writeln("  Example: clearance --element door-1 --type door_swing");
          terminal.writeln("  Types: door_swing (0.9m), wheelchair (1.5m), furniture (0.6m)");
          break;
        }

        const elementId = String(parsed.element);
        const clearanceType = String(parsed.type || "door_swing");
        const clearanceValues: Record<string, number> = {
          door_swing: 0.9,
          wheelchair: 1.5,
          furniture: 0.6,
        };
        const requiredClearance = clearanceValues[clearanceType] || 0.9;

        terminal.writeln(
          `\x1b[33mChecking ${clearanceType} clearance for ${elementId}...\x1b[0m`,
        );
        terminal.writeln(`  Required clearance: ${requiredClearance}m`);

        // Use clash detection with clearance parameter as a proxy
        const result = await mcpClient.callTool({
          tool: "detect_clashes",
          arguments: {
            element_ids: [elementId],
            clearance: requiredClearance,
            tolerance: 0.001,
          },
        });

        if (result.success) {
          const clashes = result.data?.clashes || [];
          if (clashes.length === 0) {
            terminal.writeln(
              `\x1b[32m✓ Clearance OK - No obstructions within ${requiredClearance}m\x1b[0m`,
            );
          } else {
            terminal.writeln(
              `\x1b[31m✗ Clearance FAILED - ${clashes.length} obstruction(s) found\x1b[0m`,
            );
            for (const clash of clashes.slice(0, 5)) {
              terminal.writeln(
                `  Obstruction: ${clash.element_b_type} ${clash.element_b_id?.substring(0, 8)}`,
              );
            }
          }
        } else {
          formatMcpResult(terminal, result, "detect_clashes");
        }
        break;
      }

      case "macro": {
        const subcommand = args[0]?.toLowerCase();
        const macroName = args[1];

        switch (subcommand) {
          case "record": {
            if (!macroName) {
              terminal.writeln(
                "\x1b[31mUsage: macro record <name>\x1b[0m",
              );
              terminal.writeln("  Example: macro record setup-walls");
              break;
            }
            if (isRecording) {
              terminal.writeln(
                `\x1b[31mAlready recording macro '${recordingMacroName}'\x1b[0m`,
              );
              terminal.writeln("  Use 'macro stop' to finish recording");
              break;
            }
            setIsRecording(true);
            setRecordingMacroName(macroName);
            setRecordingCommands([]);
            terminal.writeln(
              `\x1b[32m● Recording macro '${macroName}'...\x1b[0m`,
            );
            terminal.writeln(
              "  Commands will be recorded. Type 'macro stop' when done.",
            );
            break;
          }

          case "stop": {
            if (!isRecording) {
              terminal.writeln("\x1b[31mNot currently recording\x1b[0m");
              break;
            }
            if (recordingCommands.length === 0) {
              terminal.writeln(
                `\x1b[33mNo commands recorded for '${recordingMacroName}'\x1b[0m`,
              );
              setIsRecording(false);
              setRecordingMacroName(null);
              setRecordingCommands([]);
              break;
            }

            const newMacro: Macro = {
              name: recordingMacroName!,
              commands: recordingCommands,
              createdAt: Date.now(),
            };
            setMacros((prev) => {
              const updated = new Map(prev);
              updated.set(recordingMacroName!, newMacro);
              saveMacros(updated);
              return updated;
            });

            terminal.writeln(
              `\x1b[32m✓ Saved macro '${recordingMacroName}' with ${recordingCommands.length} command(s)\x1b[0m`,
            );
            setIsRecording(false);
            setRecordingMacroName(null);
            setRecordingCommands([]);
            break;
          }

          case "play": {
            if (!macroName) {
              terminal.writeln("\x1b[31mUsage: macro play <name>\x1b[0m");
              terminal.writeln("  Example: macro play setup-walls");
              break;
            }
            const macro = macros.get(macroName);
            if (!macro) {
              terminal.writeln(
                `\x1b[31mMacro '${macroName}' not found\x1b[0m`,
              );
              terminal.writeln("  Use 'macro list' to see available macros");
              break;
            }
            if (isRecording) {
              terminal.writeln(
                "\x1b[31mCannot play macros while recording\x1b[0m",
              );
              break;
            }

            terminal.writeln(
              `\x1b[33m▶ Playing macro '${macroName}' (${macro.commands.length} commands)...\x1b[0m`,
            );
            setIsPlayingMacro(true);

            // Execute commands sequentially
            (async () => {
              for (const cmd of macro.commands) {
                terminal.writeln(`\x1b[36m→ ${cmd}\x1b[0m`);
                await processCommand(terminal, cmd);
              }
              terminal.writeln(
                `\x1b[32m✓ Macro '${macroName}' completed\x1b[0m`,
              );
              setIsPlayingMacro(false);
            })();
            return; // Don't write prompt, macro will handle it
          }

          case "list": {
            const macroList = Array.from(macros.values());
            if (macroList.length === 0) {
              terminal.writeln("\x1b[33mNo macros saved\x1b[0m");
              terminal.writeln(
                "  Use 'macro record <name>' to create a macro",
              );
            } else {
              terminal.writeln(
                `\x1b[1;33mSaved Macros (${macroList.length}):\x1b[0m`,
              );
              for (const m of macroList) {
                const date = new Date(m.createdAt).toLocaleDateString();
                terminal.writeln(
                  `  \x1b[32m${m.name}\x1b[0m - ${m.commands.length} command(s) - ${date}`,
                );
              }
            }
            break;
          }

          case "delete": {
            if (!macroName) {
              terminal.writeln("\x1b[31mUsage: macro delete <name>\x1b[0m");
              break;
            }
            if (!macros.has(macroName)) {
              terminal.writeln(
                `\x1b[31mMacro '${macroName}' not found\x1b[0m`,
              );
              break;
            }
            setMacros((prev) => {
              const updated = new Map(prev);
              updated.delete(macroName);
              saveMacros(updated);
              return updated;
            });
            terminal.writeln(
              `\x1b[32m✓ Deleted macro '${macroName}'\x1b[0m`,
            );
            break;
          }

          case "show": {
            if (!macroName) {
              terminal.writeln("\x1b[31mUsage: macro show <name>\x1b[0m");
              break;
            }
            const macro = macros.get(macroName);
            if (!macro) {
              terminal.writeln(
                `\x1b[31mMacro '${macroName}' not found\x1b[0m`,
              );
              break;
            }
            terminal.writeln(`\x1b[1;33mMacro: ${macro.name}\x1b[0m`);
            terminal.writeln(
              `  Created: ${new Date(macro.createdAt).toLocaleString()}`,
            );
            terminal.writeln(`  Commands (${macro.commands.length}):`);
            macro.commands.forEach((cmd, i) => {
              terminal.writeln(`    ${i + 1}. ${cmd}`);
            });
            break;
          }

          default:
            terminal.writeln("\x1b[1;33mMacro Commands:\x1b[0m");
            terminal.writeln(
              "  \x1b[32mmacro record <name>\x1b[0m   - Start recording a macro",
            );
            terminal.writeln(
              "  \x1b[32mmacro stop\x1b[0m            - Stop recording",
            );
            terminal.writeln(
              "  \x1b[32mmacro play <name>\x1b[0m     - Play a saved macro",
            );
            terminal.writeln(
              "  \x1b[32mmacro list\x1b[0m            - List saved macros",
            );
            terminal.writeln(
              "  \x1b[32mmacro show <name>\x1b[0m     - Show macro commands",
            );
            terminal.writeln(
              "  \x1b[32mmacro delete <name>\x1b[0m   - Delete a macro",
            );
        }
        break;
      }

      case "demo": {
        // Run a named demo script
        const { DEMO_SCRIPTS } = await import("../../demo/DemoRunner");
        const scriptId = args[0]?.toLowerCase();
        if (!scriptId) {
          terminal.writeln("\x1b[1;33mAvailable demos:\x1b[0m");
          for (const s of DEMO_SCRIPTS) {
            terminal.writeln(`  \x1b[32m${s.id}\x1b[0m - ${s.description}`);
          }
          terminal.writeln("");
          terminal.writeln("\x1b[90mUsage: demo <name>\x1b[0m");
          break;
        }
        const script = DEMO_SCRIPTS.find((s) => s.id === scriptId);
        if (!script) {
          terminal.writeln(`\x1b[31mUnknown demo: ${scriptId}\x1b[0m`);
          terminal.writeln("\x1b[90mRun 'demo' to see available demos.\x1b[0m");
          break;
        }
        terminal.writeln(`\x1b[1;36mStarting demo: ${script.name}\x1b[0m`);
        terminal.writeln("\x1b[90mPress Escape to stop\x1b[0m");
        terminal.writeln("");
        for (const demoCmd of script.commands) {
          if (demoCmd.startsWith("#")) {
            const isSection = demoCmd.includes("▸") || demoCmd.includes("═");
            terminal.writeln(`\x1b[36m${demoCmd}\x1b[0m`);
            await new Promise<void>((r) => setTimeout(r, isSection ? 1500 : 800));
            continue;
          }
          if (demoCmd === "clear") {
            terminal.clear();
            await new Promise<void>((r) => setTimeout(r, 200));
            continue;
          }
          // Type the command with typewriter effect
          terminal.write("\x1b[32mpensaer\x1b[0m:\x1b[34m~\x1b[0m$ ");
          for (const ch of demoCmd) {
            terminal.write(ch);
            await new Promise<void>((r) => setTimeout(r, 30));
          }
          terminal.writeln("");
          // Execute it
          await processCommand(terminal, demoCmd);
          await new Promise<void>((r) => setTimeout(r, 600));
        }
        terminal.writeln("");
        terminal.writeln("\x1b[1;32m✓ Demo complete!\x1b[0m");
        break;
      }

      default: {
        // Try DSL parser for natural command syntax (e.g., "wall (0, 0) (5, 0)")
        terminal.writeln("\x1b[33mParsing as DSL command...\x1b[0m");

        // Get execution context from selection store
        const selectedIds = useSelectionStore.getState().selectedIds;
        const context: ExecutionContext = {
          selectedIds,
          // lastElementId and wallId are tracked within executor during execution
        };

        const dslResult = await executeDsl(trimmed, context);

        if (dslResult.success && dslResult.commandResults.length > 0) {
          // Write terminal output from executor
          dslResult.terminalOutput.forEach((line) => terminal.writeln(line));

          // Show summary if multiple elements created
          if (dslResult.createdElementIds.length > 1) {
            terminal.writeln(
              `\x1b[36mCreated ${dslResult.createdElementIds.length} element(s)\x1b[0m`
            );
          }
        } else if (!dslResult.success) {
          // Show parse/execution errors
          dslResult.terminalOutput.forEach((line) => terminal.writeln(line));

          // If no specific errors, show generic help
          if (dslResult.terminalOutput.length === 0) {
            terminal.writeln(`\x1b[31mCommand not found: ${command}\x1b[0m`);
            terminal.writeln("Type 'help' for available commands.");
          }
        } else {
          // No commands parsed (empty result)
          terminal.writeln(`\x1b[31mCommand not found: ${command}\x1b[0m`);
          terminal.writeln("Type 'help' for available commands.");
        }
        break;
      }
    }

    // Record command if recording (but not macro commands or empty)
    if (
      isRecording &&
      command.toLowerCase() !== "macro" &&
      trimmed.length > 0
    ) {
      setRecordingCommands((prev) => [...prev, trimmed]);
    }

    writePrompt(terminal);
  };

  // Resize handling
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startY = e.clientY;
      const startHeight = height;

      const handleMouseMove = (e: MouseEvent) => {
        const delta = startY - e.clientY;
        const newHeight = Math.max(
          minHeight,
          Math.min(maxHeight, startHeight + delta),
        );
        setHeight(newHeight);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [height, minHeight, maxHeight],
  );

  return (
    <section
      id="terminal-area"
      className={clsx(
        "flex flex-col border-t border-gray-700/50 bg-gray-900/95",
        !isExpanded && "h-8",
      )}
      style={{ height: isExpanded ? height : 32 }}
      role="region"
      aria-label="Command terminal"
      aria-expanded={isExpanded}
    >
      {/* Header */}
      <div
        className={clsx(
          "h-8 flex items-center justify-between px-3 bg-gray-800/50",
          "border-b border-gray-700/30 cursor-ns-resize select-none",
        )}
        onMouseDown={isExpanded ? handleMouseDown : undefined}
        onDoubleClick={onToggle}
        role="toolbar"
        aria-label="Terminal controls"
      >
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-terminal text-green-400 text-xs" aria-hidden="true"></i>
          <span className="text-xs font-medium text-gray-300">Terminal</span>
          {isRecording && (
            <span className="flex items-center gap-1 text-xs bg-red-600/30 text-red-400 px-2 py-0.5 rounded-full animate-pulse">
              <i className="fa-solid fa-circle text-[8px]"></i>
              REC: {recordingMacroName}
            </span>
          )}
          {isPlayingMacro && (
            <span className="flex items-center gap-1 text-xs bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded-full">
              <i className="fa-solid fa-play text-[8px]"></i>
              PLAYING
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TokenCounter />
          {isExpanded && (
            <button
              onClick={() => terminalRef.current?.clear()}
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
              title="Clear terminal"
              aria-label="Clear terminal output"
            >
              <i className="fa-solid fa-trash-can text-xs" aria-hidden="true"></i>
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
            aria-label={isExpanded ? "Collapse terminal panel" : "Expand terminal panel"}
            aria-expanded={isExpanded}
            aria-controls="terminal-content"
          >
            <i
              className={clsx(
                "fa-solid text-xs",
                isExpanded ? "fa-chevron-down" : "fa-chevron-up",
              )}
              aria-hidden="true"
            ></i>
          </button>
        </div>
      </div>

      {/* Terminal container */}
      <div
        id="terminal-content"
        ref={containerRef}
        data-terminal-state={isExpanded ? "expanded" : "collapsed"}
        data-testid="terminal-output"
        className={clsx(
          "flex-1 overflow-hidden",
          !isExpanded && "hidden",
        )}
        style={isExpanded ? { padding: "4px 8px" } : undefined}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
      />

      {/* Resize indicator */}
      {isResizing && <div className="fixed inset-0 z-50 cursor-ns-resize" />}
    </section>
  );
}

export default Terminal;
