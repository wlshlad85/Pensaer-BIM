/**
 * StatusBar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBar } from "./StatusBar";

// Mock all stores
vi.mock("../../stores", () => ({
  useUIStore: vi.fn((selector) => {
    const state = {
      activeLevel: "Level 1",
      activeTool: "select",
      zoom: 1,
      viewMode: "2d",
    };
    return selector(state);
  }),
  useModelStore: vi.fn((selector) => {
    const state = {
      elements: [
        { id: "wall-1", type: "wall" },
        { id: "wall-2", type: "wall" },
        { id: "door-1", type: "door" },
      ],
    };
    return selector(state);
  }),
  useSelectionStore: vi.fn((selector) => {
    const state = {
      selectedIds: ["wall-1"],
    };
    return selector(state);
  }),
  useHistoryStore: vi.fn((selector) => {
    const state = {
      entries: [{}, {}, {}],
    };
    return selector(state);
  }),
}));

vi.mock("../../stores/tokenStore", () => ({
  useTokenStore: vi.fn((selector) => {
    const state = {
      totalCalls: 5,
      inputTokens: 1000,
      outputTokens: 500,
      totalCostUsd: 0.02,
    };
    return selector(state);
  }),
}));

describe("StatusBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render level indicator", () => {
    render(<StatusBar />);
    expect(screen.getByText("Level 1")).toBeInTheDocument();
  });

  it("should render active tool", () => {
    render(<StatusBar />);
    expect(screen.getByText("select")).toBeInTheDocument();
  });

  it("should render element count", () => {
    render(<StatusBar />);
    expect(screen.getByText("3 elements")).toBeInTheDocument();
  });

  it("should render selection count", () => {
    render(<StatusBar />);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("should render history count", () => {
    render(<StatusBar />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should render token usage when available", () => {
    render(<StatusBar />);
    expect(screen.getByText("1,500 tokens")).toBeInTheDocument();
  });

  it("should render zoom level in 2D mode", () => {
    render(<StatusBar />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("should render grid spacing", () => {
    render(<StatusBar />);
    expect(screen.getByText("Grid: 50mm")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    render(<StatusBar isLoading={true} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should show saving state", () => {
    render(<StatusBar isSaving={true} />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("should show saved state", () => {
    render(<StatusBar dbAvailable={true} />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("should show no persistence warning", () => {
    render(<StatusBar dbAvailable={false} />);
    expect(screen.getByText("No persistence")).toBeInTheDocument();
  });

  it("should have accessible role", () => {
    render(<StatusBar />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
