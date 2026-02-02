/**
 * Tests for ISO 19650-5 Security Classification Commands
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  parseSecurityLevel,
  getSecurityLabel,
  isElevatedSecurity,
  type SecurityClassification,
} from "../../types/elements";

// ============================================
// UNIT TESTS — Type utilities
// ============================================

describe("parseSecurityLevel", () => {
  it("parses 'official' to Official", () => {
    expect(parseSecurityLevel("official")).toBe("Official");
  });

  it("parses 'official-sensitive' to OfficialSensitive", () => {
    expect(parseSecurityLevel("official-sensitive")).toBe("OfficialSensitive");
  });

  it("parses 'secret' to Secret", () => {
    expect(parseSecurityLevel("secret")).toBe("Secret");
  });

  it("parses 'top-secret' to TopSecret", () => {
    expect(parseSecurityLevel("top-secret")).toBe("TopSecret");
  });

  it("is case-insensitive", () => {
    expect(parseSecurityLevel("OFFICIAL")).toBe("Official");
    expect(parseSecurityLevel("Official-Sensitive")).toBe("OfficialSensitive");
  });

  it("returns null for invalid levels", () => {
    expect(parseSecurityLevel("classified")).toBeNull();
    expect(parseSecurityLevel("")).toBeNull();
  });
});

describe("getSecurityLabel", () => {
  it("returns correct labels", () => {
    expect(getSecurityLabel("Official")).toBe("OFFICIAL");
    expect(getSecurityLabel("OfficialSensitive")).toBe("OFFICIAL-SENSITIVE");
    expect(getSecurityLabel("Secret")).toBe("SECRET");
    expect(getSecurityLabel("TopSecret")).toBe("TOP SECRET");
  });
});

describe("isElevatedSecurity", () => {
  it("Official is not elevated", () => {
    expect(isElevatedSecurity("Official")).toBe(false);
  });

  it("OfficialSensitive is elevated", () => {
    expect(isElevatedSecurity("OfficialSensitive")).toBe(true);
  });

  it("Secret is elevated", () => {
    expect(isElevatedSecurity("Secret")).toBe(true);
  });

  it("TopSecret is elevated", () => {
    expect(isElevatedSecurity("TopSecret")).toBe(true);
  });
});

// ============================================
// INTEGRATION TESTS — Security commands
// ============================================

// Mock stores
vi.mock("../../stores/modelStore", () => {
  let elements: any[] = [];
  const store = {
    getState: () => ({
      elements,
      getElementById: (id: string) => elements.find((e) => e.id === id),
      updateElement: (id: string, updates: any) => {
        const idx = elements.findIndex((e) => e.id === id);
        if (idx >= 0) elements[idx] = { ...elements[idx], ...updates };
      },
    }),
    _setElements: (els: any[]) => {
      elements = els;
    },
    _getElements: () => elements,
  };
  return { useModelStore: store };
});

vi.mock("../../stores/historyStore", () => ({
  useHistoryStore: {
    getState: () => ({
      recordAction: vi.fn(),
    }),
  },
}));

vi.mock("../../services/commandDispatcher", () => {
  const commands: Record<string, any> = {};
  return {
    registerCommand: (def: any) => {
      commands[def.name] = def;
    },
    callMcpTool: vi.fn(),
    _getCommand: (name: string) => commands[name],
  };
});

import { registerSecurityCommands } from "../handlers/securityCommands";
import { useModelStore } from "../../stores/modelStore";

// Access internal mock helpers
const mockStore = useModelStore as any;
const { _getCommand } = await import("../../services/commandDispatcher") as any;

describe("security commands", () => {
  beforeEach(() => {
    // Reset elements
    mockStore._setElements([
      {
        id: "wall-001",
        type: "wall",
        name: "Exterior Wall",
        x: 0,
        y: 0,
        width: 500,
        height: 12,
        relationships: {},
        issues: [],
        aiSuggestions: [],
      },
      {
        id: "door-001",
        type: "door",
        name: "Main Door",
        x: 100,
        y: 0,
        width: 90,
        height: 12,
        relationships: {},
        issues: [],
        aiSuggestions: [],
      },
    ]);

    // Register commands
    registerSecurityCommands();
  });

  describe("security classify", () => {
    it("classifies an element as official-sensitive", async () => {
      const cmd = _getCommand("security");
      const result = await cmd.handler(
        { _positional: ["classify", "wall-001"], level: "official-sensitive" },
        { selectedIds: [] }
      );

      expect(result.success).toBe(true);
      expect(result.data.classification).toBe("OfficialSensitive");

      const el = mockStore.getState().getElementById("wall-001");
      expect(el.securityClassification).toBe("OfficialSensitive");
    });

    it("sets need-to-know for Secret and above", async () => {
      const cmd = _getCommand("security");
      const result = await cmd.handler(
        { _positional: ["classify", "wall-001"], level: "secret" },
        { selectedIds: [] }
      );

      expect(result.success).toBe(true);
      expect(result.data.accessControl.needToKnow).toBe(true);
    });

    it("rejects invalid security level", async () => {
      const cmd = _getCommand("security");
      const result = await cmd.handler(
        { _positional: ["classify", "wall-001"], level: "classified" },
        { selectedIds: [] }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid security level");
    });

    it("rejects missing element", async () => {
      const cmd = _getCommand("security");
      const result = await cmd.handler(
        { _positional: ["classify", "nonexistent"], level: "secret" },
        { selectedIds: [] }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("uses selected element when no ID given", async () => {
      const cmd = _getCommand("security");
      const result = await cmd.handler(
        { _positional: ["classify"], level: "official-sensitive" },
        { selectedIds: ["door-001"] }
      );

      expect(result.success).toBe(true);
      expect(result.data.id).toBe("door-001");
    });
  });

  describe("security audit", () => {
    it("returns empty when no elevated elements", async () => {
      const cmd = _getCommand("security");
      const result = await cmd.handler(
        { _positional: ["audit"] },
        { selectedIds: [] }
      );

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(0);
    });

    it("lists elevated elements after classification", async () => {
      // Classify first
      const cmd = _getCommand("security");
      await cmd.handler(
        { _positional: ["classify", "wall-001"], level: "secret" },
        { selectedIds: [] }
      );

      const result = await cmd.handler(
        { _positional: ["audit"] },
        { selectedIds: [] }
      );

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(1);
      expect(result.data.elements[0].classification).toBe("Secret");
    });
  });

  describe("security report", () => {
    it("generates a summary report", async () => {
      const cmd = _getCommand("security");
      const result = await cmd.handler(
        { _positional: ["report"] },
        { selectedIds: [] }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("ISO 19650-5");
      expect(result.data.total).toBe(2);
      expect(result.data.riskLevel).toBe("LOW");
    });

    it("reports HIGH risk when Secret elements exist", async () => {
      const cmd = _getCommand("security");
      await cmd.handler(
        { _positional: ["classify", "wall-001"], level: "secret" },
        { selectedIds: [] }
      );

      const result = await cmd.handler(
        { _positional: ["report"] },
        { selectedIds: [] }
      );

      expect(result.data.riskLevel).toBe("HIGH");
      expect(result.data.counts.Secret).toBe(1);
    });
  });

  describe("security (no subcommand)", () => {
    it("shows usage when no subcommand given", async () => {
      const cmd = _getCommand("security");
      const result = await cmd.handler(
        { _positional: [] },
        { selectedIds: [] }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Usage");
    });
  });
});
