/**
 * Pensaer BIM Services
 */

// MCP Client (main export)
export { mcpClient, isMockModeEnabled, getCurrentMode } from "./mcpClient";
export type { MCPToolResult, MCPToolCall } from "./mcpClient";

// MCP Client implementations and factory
export {
  MockMCPClient,
  HttpMCPClient,
  WebSocketMCPClient,
  createMCPClient,
  createMockClient,
  createHttpClient,
  createWebSocketClient,
} from "./mcp";
export type {
  IMCPClient,
  MCPClientMode,
  MCPClientConfig,
  MockConfig,
  HttpClientConfig,
  WebSocketClientConfig,
} from "./mcp";

// IFC Parser Service
export {
  IfcParser,
  getIfcParser,
  parseIfcFile,
  parseIfcString,
  exportToIfc,
  downloadIfcFile,
} from "./ifcParser";
export type {
  IfcImportResult,
  IfcImportStats,
  IfcExportResult,
  IfcExportStats,
  IfcExportOptions,
} from "./ifcParser";

// Command Dispatcher
export {
  // Core dispatch
  callMcpTool,
  dispatchCommand,
  dispatchCommandWithContext,

  // Registry
  registerCommand,
  getCommand,
  getAllCommands,

  // Context
  getCommandContext,

  // Parsing
  parseCommandString,
  parseArguments,
  parseValue,

  // Logging
  setLoggingEnabled,
  isLoggingEnabled,
  getCommandLog,
  clearCommandLog,
} from "./commandDispatcher";
export type {
  CommandContext,
  CommandResult,
  CommandHandler,
  CommandDefinition,
  DispatchOptions,
  CommandLogEntry,
} from "./commandDispatcher";

// MCP Error Formatter
export {
  formatError,
  formatValidationError,
  formatNetworkError,
  formatTimeoutError,
  formatServerError,
  formatMethodNotFoundError,
  formatResourceNotFoundError,
  writeErrorToTerminal,
  fromJsError,
  McpErrorCode,
} from "./mcp";
export type {
  McpError,
  FormattedError,
  ErrorSeverity,
} from "./mcp";

// MCP Result Formatter
export {
  formatMcpResult,
  formatSchedule,
  formatClashReport,
  formatValidationReport,
  writeResultToTerminal,
  exportResultToFile,
  detectFormat,
  paginate,
} from "./mcp";
export type {
  ResultFormatterOptions,
  PaginationState,
} from "./mcp";

// Demo Automation
export {
  useDemoStore,
  runDemo,
  stopDemo,
  pauseDemo,
  resumeDemo,
  toggleDemoPause,
  DEMO_COMMANDS,
} from "./demo";
export type { DemoCallbacks } from "./demo";

// MCP Logger (convenience wrapper)
export {
  mcpLogger,
  enableDebugLogging,
  enableInfoLogging,
  disableLogging,
  createJsonLogTarget,
  addLogTarget,
  getLogLevel,
  setLogLevel,
  exportLogs,
  getFilteredLogs,
  downloadLogs,
  getLoggingStats,
} from "./mcpLogger";
export type {
  MCPLoggerConfig as MCPLogConfig,
  MCPToolLogger,
  ToolCallLogEntry,
  LogOutputTarget,
} from "./mcpLogger";
export { LogLevel, ConsoleLogTarget, JsonLogTarget } from "./mcpLogger";

// Model Import/Export
export {
  exportModel,
  downloadModel,
  importModel,
  importModelFromFile,
  promptImportModel,
  validateModelExport,
  getModelStats,
} from "./modelIO";
export type {
  ModelExport,
  ImportOptions,
  ImportResult,
} from "./modelIO";
