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
      "\x1b[36m╔══════════════════════════════════════════╗\x1b[0m",
    );
    terminal.writeln(
      "\x1b[36m║\x1b[0m  \x1b[1;32mPensaer BIM Terminal\x1b[0m                    \x1b[36m║\x1b[0m",
    );
    terminal.writeln(
      "\x1b[36m║\x1b[0m  Type 'help' for available commands       \x1b[36m║\x1b[0m",
    );
    terminal.writeln(
      "\x1b[36m╚══════════════════════════════════════════╝\x1b[0m",
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

  const writePrompt = (terminal: XTerminal) => {
    terminal.write("\x1b[32mpensaer\x1b[0m:\x1b[34m~\x1b[0m$ ");
  };

  const handleInput = useCallback(
    (terminal: XTerminal, data: string) => {
      const code = data.charCodeAt(0);

      // Enter key
      if (code === 13) {
        terminal.writeln("");
        processCommand(terminal, commandBuffer);
        setCommandBuffer("");
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
    [commandBuffer],
  );

  const processCommand = (terminal: XTerminal, cmd: string) => {
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
          "  \x1b[32mhelp\x1b[0m          - Show this help message",
        );
        terminal.writeln("  \x1b[32mclear\x1b[0m         - Clear the terminal");
        terminal.writeln("  \x1b[32mstatus\x1b[0m        - Show model status");
        terminal.writeln("  \x1b[32mlist walls\x1b[0m    - List all walls");
        terminal.writeln("  \x1b[32mlist rooms\x1b[0m    - List all rooms");
        terminal.writeln("  \x1b[32mversion\x1b[0m       - Show version info");
        terminal.writeln("");
        terminal.writeln("\x1b[1;33mMCP Tool Commands:\x1b[0m");
        terminal.writeln(
          "  \x1b[32mcreate wall\x1b[0m   - Create a wall (interactive)",
        );
        terminal.writeln(
          "  \x1b[32mdetect rooms\x1b[0m  - Detect rooms from walls",
        );
        terminal.writeln(
          "  \x1b[32manalyze\x1b[0m       - Analyze wall topology",
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
        break;

      case "status":
        terminal.writeln("\x1b[1;33mModel Status:\x1b[0m");
        terminal.writeln("  Elements: (fetch from store)");
        terminal.writeln("  Selection: (fetch from store)");
        terminal.writeln("  Mode: 2D Plan View");
        break;

      case "list":
        if (args[0] === "walls") {
          terminal.writeln("\x1b[1;33mWalls:\x1b[0m");
          terminal.writeln("  (Connect to model store for wall data)");
        } else if (args[0] === "rooms") {
          terminal.writeln("\x1b[1;33mRooms:\x1b[0m");
          terminal.writeln("  (Connect to model store for room data)");
        } else {
          terminal.writeln(`\x1b[31mUnknown list type: ${args[0]}\x1b[0m`);
        }
        break;

      case "create":
        if (args[0] === "wall") {
          terminal.writeln("\x1b[33mInteractive wall creation:\x1b[0m");
          terminal.writeln("  Use the Toolbar > Wall tool for visual creation");
          terminal.writeln("  Or call: mcp create_wall --start 0,0 --end 5,0");
        } else {
          terminal.writeln(`\x1b[31mUnknown create type: ${args[0]}\x1b[0m`);
        }
        break;

      case "detect":
        if (args[0] === "rooms") {
          terminal.writeln(
            "\x1b[33mDetecting rooms from wall topology...\x1b[0m",
          );
          terminal.writeln("  (Call MCP detect_rooms tool)");
        } else {
          terminal.writeln(`\x1b[31mUnknown detect type: ${args[0]}\x1b[0m`);
        }
        break;

      case "analyze":
        terminal.writeln("\x1b[33mAnalyzing wall topology...\x1b[0m");
        terminal.writeln("  (Call MCP analyze_wall_topology tool)");
        break;

      default:
        terminal.writeln(`\x1b[31mCommand not found: ${command}\x1b[0m`);
        terminal.writeln("Type 'help' for available commands.");
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
