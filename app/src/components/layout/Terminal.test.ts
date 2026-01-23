/**
 * Terminal layout tests
 *
 * Ensures the xterm panel container is present in the layout markup.
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    loadAddon() {}
    open() {}
    write() {}
    writeln() {}
    clear() {}
    onData() {
      return { dispose() {} };
    }
    dispose() {}
  },
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class {
    fit() {}
  },
}));

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: class {},
}));

vi.mock("@xterm/xterm/css/xterm.css", () => ({}));

import { Terminal } from "./Terminal";

describe("Terminal layout", () => {
  it("renders the terminal container when collapsed", () => {
    const html = renderToStaticMarkup(
      React.createElement(Terminal, { isExpanded: false }),
    );

    expect(html).toContain('data-terminal-state="collapsed"');
  });

  it("marks the terminal container expanded when open", () => {
    const html = renderToStaticMarkup(
      React.createElement(Terminal, { isExpanded: true }),
    );

    expect(html).toContain('data-terminal-state="expanded"');
  });
});
