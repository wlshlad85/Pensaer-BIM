/**
 * DSL Parser Tests
 *
 * Tests for the Pensaer DSL recursive descent parser.
 */

import { describe, it, expect } from "vitest";
import { Parser, parse } from "./parser";
import {
  WallType,
  DoorType,
  WindowType,
  SwingDirection,
  VariableRef,
} from "./ast";

describe("Parser", () => {
  describe("wall commands", () => {
    it("parses simple wall command", () => {
      const result = parse("wall (0, 0) (5, 0)");
      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);

      const cmd = result.commands[0];
      expect(cmd.type).toBe("CreateWall");
      if (cmd.type === "CreateWall") {
        expect(cmd.start).toEqual({ x: 0, y: 0 });
        expect(cmd.end).toEqual({ x: 5, y: 0 });
        expect(cmd.height).toBe(3.0); // default
        expect(cmd.thickness).toBe(0.2); // default
      }
    });

    it("parses wall command with from/to keywords", () => {
      const result = parse("wall from (0, 0) to (5, 0)");
      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);

      const cmd = result.commands[0];
      if (cmd.type === "CreateWall") {
        expect(cmd.start).toEqual({ x: 0, y: 0 });
        expect(cmd.end).toEqual({ x: 5, y: 0 });
      }
    });

    it("parses wall command with height option", () => {
      const result = parse("wall (0, 0) (5, 0) height 4");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "CreateWall") {
        expect(cmd.height).toBe(4);
      }
    });

    it("parses wall command with long options", () => {
      const result = parse("wall (0, 0) (5, 0) --height 4 --thickness 0.3");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "CreateWall") {
        expect(cmd.height).toBe(4);
        expect(cmd.thickness).toBe(0.3);
      }
    });

    it("parses wall command with type option", () => {
      const result = parse("wall (0, 0) (5, 0) type structural");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "CreateWall") {
        expect(cmd.wallType).toBe(WallType.STRUCTURAL);
      }
    });

    it("parses wall command with float coordinates", () => {
      const result = parse("wall (0.5, 1.5) (5.5, 1.5)");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "CreateWall") {
        expect(cmd.start).toEqual({ x: 0.5, y: 1.5 });
        expect(cmd.end).toEqual({ x: 5.5, y: 1.5 });
      }
    });

    it("parses wall command without parentheses", () => {
      const result = parse("wall 0,0 5,0");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "CreateWall") {
        expect(cmd.start).toEqual({ x: 0, y: 0 });
        expect(cmd.end).toEqual({ x: 5, y: 0 });
      }
    });
  });

  describe("walls rect commands", () => {
    it("parses walls rect command", () => {
      const result = parse("walls rect (0, 0) (10, 8)");
      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);

      const cmd = result.commands[0];
      expect(cmd.type).toBe("CreateRectWalls");
      if (cmd.type === "CreateRectWalls") {
        expect(cmd.minPoint).toEqual({ x: 0, y: 0 });
        expect(cmd.maxPoint).toEqual({ x: 10, y: 8 });
      }
    });

    it("parses walls rect with options", () => {
      const result = parse("walls rect (0, 0) (10, 8) height 4 thickness 0.25");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "CreateRectWalls") {
        expect(cmd.height).toBe(4);
        expect(cmd.thickness).toBe(0.25);
      }
    });

    it("parses rect walls alternate syntax", () => {
      const result = parse("rect (0, 0) (10, 8)");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      expect(cmd.type).toBe("CreateRectWalls");
    });

    it("parses box command", () => {
      const result = parse("box (0, 0) (10, 8)");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      expect(cmd.type).toBe("CreateRectWalls");
    });
  });

  describe("door commands", () => {
    it("parses door command with variable reference", () => {
      const result = parse("door $last 2");
      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);

      const cmd = result.commands[0];
      expect(cmd.type).toBe("PlaceDoor");
      if (cmd.type === "PlaceDoor") {
        expect(cmd.wallRef.variable).toBe(VariableRef.LAST);
        expect(cmd.offset).toBe(2);
        expect(cmd.width).toBe(0.9); // default
        expect(cmd.height).toBe(2.1); // default
      }
    });

    it("parses door command with in keyword", () => {
      const result = parse("door in $last at 2.5");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "PlaceDoor") {
        expect(cmd.wallRef.variable).toBe(VariableRef.LAST);
        expect(cmd.offset).toBe(2.5);
      }
    });

    it("parses door command with UUID", () => {
      const result = parse("door a1b2c3d4-e5f6-7890-abcd-ef1234567890 1.5");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "PlaceDoor") {
        expect(cmd.wallRef.uuid).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
      }
    });

    it("parses door command with options", () => {
      const result = parse("door $last 2 width 1.0 height 2.2 type sliding");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "PlaceDoor") {
        expect(cmd.width).toBe(1.0);
        expect(cmd.height).toBe(2.2);
        expect(cmd.doorType).toBe(DoorType.SLIDING);
      }
    });

    it("parses door command with swing option", () => {
      const result = parse("door $last 2 swing left");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "PlaceDoor") {
        expect(cmd.swing).toBe(SwingDirection.LEFT);
      }
    });

    it("parses door command with @ sign", () => {
      const result = parse("door $wall @1.5");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "PlaceDoor") {
        expect(cmd.wallRef.variable).toBe(VariableRef.WALL);
        expect(cmd.offset).toBe(1.5);
      }
    });
  });

  describe("window commands", () => {
    it("parses window command", () => {
      const result = parse("window $last 1.5");
      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);

      const cmd = result.commands[0];
      expect(cmd.type).toBe("PlaceWindow");
      if (cmd.type === "PlaceWindow") {
        expect(cmd.wallRef.variable).toBe(VariableRef.LAST);
        expect(cmd.offset).toBe(1.5);
        expect(cmd.width).toBe(1.2); // default
        expect(cmd.height).toBe(1.0); // default
        expect(cmd.sillHeight).toBe(0.9); // default
      }
    });

    it("parses window command with options", () => {
      const result = parse("window $selected at 2 --width 1.5 --height 1.2 sill 1.0");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "PlaceWindow") {
        expect(cmd.width).toBe(1.5);
        expect(cmd.height).toBe(1.2);
        expect(cmd.sillHeight).toBe(1.0);
      }
    });

    it("parses window command with type", () => {
      const result = parse("window $last 1 type casement");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "PlaceWindow") {
        expect(cmd.windowType).toBe(WindowType.CASEMENT);
      }
    });
  });

  describe("opening commands", () => {
    it("parses opening command", () => {
      const result = parse("opening $last 2");
      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);

      const cmd = result.commands[0];
      expect(cmd.type).toBe("CreateOpening");
      if (cmd.type === "CreateOpening") {
        expect(cmd.wallRef.variable).toBe(VariableRef.LAST);
        expect(cmd.offset).toBe(2);
      }
    });

    it("parses opening command with dimensions", () => {
      const result = parse("opening $last 2 width 1.5 height 2.0");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "CreateOpening") {
        expect(cmd.width).toBe(1.5);
        expect(cmd.height).toBe(2.0);
      }
    });
  });

  describe("help command", () => {
    it("parses help command", () => {
      const result = parse("help");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      expect(cmd.type).toBe("Help");
      if (cmd.type === "Help") {
        expect(cmd.topic).toBeUndefined();
      }
    });

    it("parses help command with topic", () => {
      const result = parse("help wall");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      if (cmd.type === "Help") {
        expect(cmd.topic).toBe("wall");
      }
    });
  });

  describe("multiple commands", () => {
    it("parses multiple commands on separate lines", () => {
      const result = parse(`wall (0, 0) (5, 0)
door $last 2
window $last 1`);
      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(3);
      expect(result.commands[0].type).toBe("CreateWall");
      expect(result.commands[1].type).toBe("PlaceDoor");
      expect(result.commands[2].type).toBe("PlaceWindow");
    });

    it("handles empty lines between commands", () => {
      const result = parse(`wall (0, 0) (5, 0)

door $last 2`);
      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(2);
    });
  });

  describe("error handling", () => {
    it("reports error for missing start point", () => {
      const result = parse("wall");
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("reports error for missing end point", () => {
      const result = parse("wall (0, 0)");
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("reports error for unknown command", () => {
      const result = parse("unknowncommand");
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("reports error for missing wall reference in door", () => {
      const result = parse("door 2");
      expect(result.success).toBe(false);
    });

    it("includes line and column in errors", () => {
      const result = parse("wall (0, 0)");
      expect(result.errors[0].line).toBeDefined();
      expect(result.errors[0].column).toBeDefined();
    });
  });

  describe("position tracking", () => {
    it("tracks line and column for commands", () => {
      const result = parse("wall (0, 0) (5, 0)");
      expect(result.success).toBe(true);

      const cmd = result.commands[0];
      expect(cmd.line).toBe(1);
      expect(cmd.column).toBe(1);
    });

    it("tracks position for commands on different lines", () => {
      const result = parse(`wall (0, 0) (5, 0)
door $last 2`);
      expect(result.success).toBe(true);

      expect(result.commands[0].line).toBe(1);
      expect(result.commands[1].line).toBe(2);
    });
  });

  describe("Parser class", () => {
    it("can be instantiated directly", () => {
      const parser = new Parser("wall (0, 0) (5, 0)");
      const result = parser.parse();
      expect(result.success).toBe(true);
    });
  });
});
