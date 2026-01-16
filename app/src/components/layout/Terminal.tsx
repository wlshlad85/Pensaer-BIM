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
          "  \x1b[32mdelete\x1b[0m            - Delete elements: delete <id1> <id2> ...",
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
