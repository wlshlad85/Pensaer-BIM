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
import { mcpClient, type MCPToolResult } from "../../services";

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
}

// Available commands for autocomplete
const AVAILABLE_COMMANDS = [
  "help",
  "clear",
  "status",
  "version",
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
];

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

export function Terminal({
  isExpanded = true,
  onToggle,
  initialHeight = 200,
  minHeight = 100,
  maxHeight = 500,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [height, setHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [commandBuffer, setCommandBuffer] = useState("");

  // Command history state
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedBuffer, setSavedBuffer] = useState("");

  // Escape sequence buffer for arrow keys
  const escapeBufferRef = useRef("");

  // Macro recording state
  const [macros, setMacros] = useState<Map<string, Macro>>(loadMacros);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMacroName, setRecordingMacroName] = useState<string | null>(
    null,
  );
  const [recordingCommands, setRecordingCommands] = useState<string[]>([]);
  const [isPlayingMacro, setIsPlayingMacro] = useState(false);

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
      fontSize: 13,
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

    // Handle input
    terminal.onData((data) => {
      handleInput(terminal, data);
    });

    return () => {
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

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

  // Find autocomplete matches
  const findAutocompleteMatches = useCallback((prefix: string): string[] => {
    if (!prefix) return [];
    const lowerPrefix = prefix.toLowerCase();
    return AVAILABLE_COMMANDS.filter((cmd) =>
      cmd.toLowerCase().startsWith(lowerPrefix),
    );
  }, []);

  const handleInput = useCallback(
    (terminal: XTerminal, data: string) => {
      const code = data.charCodeAt(0);

      // Handle escape sequences for arrow keys
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

        // Up arrow
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

        // Down arrow
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

        // Left/Right arrows - ignore for now
        if (data === "C" || data === "D") {
          return;
        }
      }

      // Clear escape buffer for other inputs
      escapeBufferRef.current = "";

      // Enter key
      if (code === 13) {
        terminal.writeln("");

        // Add to history if non-empty and different from last command
        const trimmedCmd = commandBuffer.trim();
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

        processCommand(terminal, commandBuffer);
        setCommandBuffer("");
        return;
      }

      // Tab - autocomplete
      if (code === 9) {
        const words = commandBuffer.split(/\s+/);
        const lastWord = words[words.length - 1];

        // Only autocomplete the first word (command name)
        if (words.length === 1) {
          const matches = findAutocompleteMatches(lastWord);

          if (matches.length === 1) {
            // Single match - complete it
            const completion = matches[0].slice(lastWord.length);
            terminal.write(completion + " ");
            setCommandBuffer(matches[0] + " ");
          } else if (matches.length > 1) {
            // Multiple matches - show options
            terminal.writeln("");
            terminal.writeln(
              `\x1b[33mMatches: ${matches.join(", ")}\x1b[0m`,
            );

            // Find common prefix
            let commonPrefix = matches[0];
            for (const match of matches) {
              while (!match.startsWith(commonPrefix)) {
                commonPrefix = commonPrefix.slice(0, -1);
              }
            }

            // Complete to common prefix if longer than current
            if (commonPrefix.length > lastWord.length) {
              const completion = commonPrefix.slice(lastWord.length);
              writePrompt(terminal);
              terminal.write(commonPrefix);
              setCommandBuffer(commonPrefix);
            } else {
              writePrompt(terminal);
              terminal.write(commandBuffer);
            }
          }
        }
        return;
      }

      // Backspace
      if (code === 127) {
        if (commandBuffer.length > 0) {
          terminal.write("\b \b");
          setCommandBuffer((prev) => prev.slice(0, -1));
        }
        return;
      }

      // Ctrl+C
      if (code === 3) {
        terminal.writeln("^C");
        setCommandBuffer("");
        setHistoryIndex(-1);
        setSavedBuffer("");
        writePrompt(terminal);
        return;
      }

      // Ctrl+L (clear)
      if (code === 12) {
        terminal.clear();
        writePrompt(terminal);
        return;
      }

      // Printable characters
      if (code >= 32) {
        terminal.write(data);
        setCommandBuffer((prev) => prev + data);
      }
    },
    [
      commandBuffer,
      commandHistory,
      historyIndex,
      savedBuffer,
      clearLineAndWrite,
      findAutocompleteMatches,
    ],
  );

  // Format MCP result for terminal display
  const formatMcpResult = (
    terminal: XTerminal,
    result: MCPToolResult,
    toolName: string,
  ) => {
    if (result.success) {
      terminal.writeln(`\x1b[32m✓ ${toolName} completed\x1b[0m`);
      if (result.data) {
        formatObject(terminal, result.data, "  ");
      }
      if (result.warnings && result.warnings.length > 0) {
        terminal.writeln("\x1b[33mWarnings:\x1b[0m");
        result.warnings.forEach((w) => terminal.writeln(`  ⚠ ${w}`));
      }
    } else {
      terminal.writeln(`\x1b[31m✗ ${toolName} failed\x1b[0m`);
      if (result.error) {
        terminal.writeln(
          `  Error ${result.error.code}: ${result.error.message}`,
        );
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

  const processCommand = async (terminal: XTerminal, cmd: string) => {
    const trimmed = cmd.trim();

    if (!trimmed) {
      writePrompt(terminal);
      return;
    }

    const [command, ...args] = trimmed.split(/\s+/);

    switch (command.toLowerCase()) {
      case "help":
        terminal.writeln("\x1b[1;33mAvailable commands:\x1b[0m");
        terminal.writeln(
          "  \x1b[32mhelp\x1b[0m              - Show this help message",
        );
        terminal.writeln(
          "  \x1b[32mclear\x1b[0m             - Clear the terminal",
        );
        terminal.writeln(
          "  \x1b[32mstatus\x1b[0m            - Show model status via MCP",
        );
        terminal.writeln(
          "  \x1b[32mversion\x1b[0m           - Show version info",
        );
        terminal.writeln("");
        terminal.writeln("\x1b[1;33mMCP Tool Commands:\x1b[0m");
        terminal.writeln(
          "  \x1b[32mlist [category]\x1b[0m   - List elements (walls, rooms, etc.)",
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
          "  \x1b[32mdoor\x1b[0m              - Place door: door --wall <id> --position 2.5",
        );
        terminal.writeln(
          "  \x1b[32mwindow\x1b[0m            - Place window: window --wall <id> --position 1.5",
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
        break;

      case "clear":
        terminal.clear();
        break;

      case "version":
        terminal.writeln("\x1b[1mPensaer BIM Platform\x1b[0m");
        terminal.writeln("  Version: 0.1.0 (Phase 1 Foundation)");
        terminal.writeln("  Kernel: pensaer-geometry 0.1.0");
        terminal.writeln("  Client: React 19 + TypeScript");
        terminal.writeln("  MCP Mode: mock (development)");
        break;

      case "status": {
        terminal.writeln("\x1b[33mFetching model status...\x1b[0m");
        const result = await mcpClient.callTool({
          tool: "get_state_summary",
          arguments: {},
        });
        formatMcpResult(terminal, result, "get_state_summary");
        break;
      }

      case "list": {
        const category = args[0] || undefined;
        terminal.writeln(
          `\x1b[33mListing elements${category ? ` (${category})` : ""}...\x1b[0m`,
        );
        const result = await mcpClient.callTool({
          tool: "list_elements",
          arguments: category ? { category } : {},
        });
        formatMcpResult(terminal, result, "list_elements");
        break;
      }

      case "wall": {
        const parsed = parseArgs(args);
        if (!parsed.start || !parsed.end) {
          terminal.writeln(
            "\x1b[31mUsage: wall --start x,y --end x,y [--height h] [--thickness t]\x1b[0m",
          );
          terminal.writeln(
            "  Example: wall --start 0,0 --end 5,0 --height 3.0",
          );
          break;
        }
        terminal.writeln("\x1b[33mCreating wall...\x1b[0m");
        const result = await mcpClient.callTool({
          tool: "create_wall",
          arguments: parsed,
        });
        formatMcpResult(terminal, result, "create_wall");
        break;
      }

      case "floor": {
        const parsed = parseArgs(args);
        if (!parsed.min || !parsed.max) {
          terminal.writeln(
            "\x1b[31mUsage: floor --min x,y --max x,y [--thickness t]\x1b[0m",
          );
          terminal.writeln("  Example: floor --min 0,0 --max 10,10");
          break;
        }
        terminal.writeln("\x1b[33mCreating floor...\x1b[0m");
        const result = await mcpClient.callTool({
          tool: "create_floor",
          arguments: {
            min_point: parsed.min,
            max_point: parsed.max,
            thickness: parsed.thickness,
          },
        });
        formatMcpResult(terminal, result, "create_floor");
        break;
      }

      case "room": {
        const parsed = parseArgs(args);
        if (!parsed.min || !parsed.max) {
          terminal.writeln(
            "\x1b[31mUsage: room --min x,y --max x,y [--name name] [--number num]\x1b[0m",
          );
          terminal.writeln(
            "  Example: room --min 0,0 --max 5,5 --name Kitchen",
          );
          break;
        }
        terminal.writeln("\x1b[33mCreating room...\x1b[0m");
        const result = await mcpClient.callTool({
          tool: "create_room",
          arguments: {
            min_point: parsed.min,
            max_point: parsed.max,
            name: parsed.name,
            number: parsed.number,
            height: parsed.height,
          },
        });
        formatMcpResult(terminal, result, "create_room");
        break;
      }

      case "roof": {
        const parsed = parseArgs(args);
        if (!parsed.min || !parsed.max) {
          terminal.writeln(
            "\x1b[31mUsage: roof --min x,y --max x,y [--type flat|gable|hip] [--slope deg]\x1b[0m",
          );
          terminal.writeln(
            "  Example: roof --min 0,0 --max 10,10 --type gable --slope 30",
          );
          break;
        }
        terminal.writeln("\x1b[33mCreating roof...\x1b[0m");
        const result = await mcpClient.callTool({
          tool: "create_roof",
          arguments: {
            min_point: parsed.min,
            max_point: parsed.max,
            roof_type: parsed.type,
            slope_degrees: parsed.slope,
          },
        });
        formatMcpResult(terminal, result, "create_roof");
        break;
      }

      case "door": {
        const parsed = parseArgs(args);
        if (!parsed.wall) {
          terminal.writeln(
            "\x1b[31mUsage: door --wall <wall_id> [--position p] [--width w] [--height h]\x1b[0m",
          );
          terminal.writeln(
            "  Example: door --wall wall-1 --position 2.5 --width 0.9",
          );
          break;
        }
        terminal.writeln("\x1b[33mPlacing door...\x1b[0m");
        const result = await mcpClient.callTool({
          tool: "place_door",
          arguments: {
            wall_id: parsed.wall,
            position: parsed.position,
            width: parsed.width,
            height: parsed.height,
            door_type: parsed.type,
            swing: parsed.swing,
          },
        });
        formatMcpResult(terminal, result, "place_door");
        break;
      }

      case "window": {
        const parsed = parseArgs(args);
        if (!parsed.wall) {
          terminal.writeln(
            "\x1b[31mUsage: window --wall <wall_id> [--position p] [--width w] [--height h]\x1b[0m",
          );
          terminal.writeln(
            "  Example: window --wall wall-1 --position 1.5 --sill 0.9",
          );
          break;
        }
        terminal.writeln("\x1b[33mPlacing window...\x1b[0m");
        const result = await mcpClient.callTool({
          tool: "place_window",
          arguments: {
            wall_id: parsed.wall,
            position: parsed.position,
            width: parsed.width,
            height: parsed.height,
            sill_height: parsed.sill,
            window_type: parsed.type,
          },
        });
        formatMcpResult(terminal, result, "place_window");
        break;
      }

      case "detect-rooms": {
        terminal.writeln(
          "\x1b[33mDetecting rooms from wall topology...\x1b[0m",
        );
        const result = await mcpClient.callTool({
          tool: "detect_rooms",
          arguments: {},
        });
        formatMcpResult(terminal, result, "detect_rooms");
        break;
      }

      case "analyze": {
        terminal.writeln("\x1b[33mAnalyzing wall topology...\x1b[0m");
        const result = await mcpClient.callTool({
          tool: "analyze_wall_topology",
          arguments: {},
        });
        formatMcpResult(terminal, result, "analyze_wall_topology");
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

        const result = await mcpClient.callTool({
          tool: "detect_clashes",
          arguments: {
            element_ids: elementIds,
            tolerance,
            clearance,
            ignore_same_type: ignoreSameType,
          },
        });
        formatMcpResult(terminal, result, "detect_clashes");
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

        const setAIds = String(parsed.a).split(",");
        const setBIds = String(parsed.b).split(",");
        const tolerance = (parsed.tolerance as number) || 0.001;
        const clearance = (parsed.clearance as number) || 0;

        terminal.writeln("\x1b[33mDetecting clashes between sets...\x1b[0m");
        terminal.writeln(`  Set A: ${setAIds.length} elements`);
        terminal.writeln(`  Set B: ${setBIds.length} elements`);

        const result = await mcpClient.callTool({
          tool: "detect_clashes_between_sets",
          arguments: {
            set_a_ids: setAIds,
            set_b_ids: setBIds,
            tolerance,
            clearance,
          },
        });
        formatMcpResult(terminal, result, "detect_clashes_between_sets");
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
        const result = await mcpClient.callTool({
          tool: "delete_element",
          arguments: { element_ids: args },
        });
        formatMcpResult(terminal, result, "delete_element");
        break;
      }

      case "get": {
        if (args.length === 0) {
          terminal.writeln("\x1b[31mUsage: get <element_id>\x1b[0m");
          terminal.writeln("  Example: get wall-1");
          break;
        }
        terminal.writeln(`\x1b[33mFetching element ${args[0]}...\x1b[0m`);
        const result = await mcpClient.callTool({
          tool: "get_element",
          arguments: { element_id: args[0] },
        });
        formatMcpResult(terminal, result, "get_element");
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

      default:
        terminal.writeln(`\x1b[31mCommand not found: ${command}\x1b[0m`);
        terminal.writeln("Type 'help' for available commands.");
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
    <div
      className={clsx(
        "flex flex-col border-t border-gray-700/50 bg-gray-900/95",
        !isExpanded && "h-8",
      )}
      style={{ height: isExpanded ? height : 32 }}
    >
      {/* Header */}
      <div
        className={clsx(
          "h-8 flex items-center justify-between px-3 bg-gray-800/50",
          "border-b border-gray-700/30 cursor-ns-resize select-none",
        )}
        onMouseDown={isExpanded ? handleMouseDown : undefined}
        onDoubleClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-terminal text-green-400 text-xs"></i>
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
          {isExpanded && (
            <button
              onClick={() => terminalRef.current?.clear()}
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
              title="Clear terminal"
            >
              <i className="fa-solid fa-trash-can text-xs"></i>
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <i
              className={clsx(
                "fa-solid text-xs",
                isExpanded ? "fa-chevron-down" : "fa-chevron-up",
              )}
            ></i>
          </button>
        </div>
      </div>

      {/* Terminal container */}
      {isExpanded && (
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden"
          style={{ padding: "4px 8px" }}
        />
      )}

      {/* Resize indicator */}
      {isResizing && <div className="fixed inset-0 z-50 cursor-ns-resize" />}
    </div>
  );
}

export default Terminal;
