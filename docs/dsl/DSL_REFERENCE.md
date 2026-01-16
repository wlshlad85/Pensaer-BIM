# Pensaer DSL Reference

> Terminal command syntax for BIM element creation and modification.

**Version:** 1.0.0
**Grammar File:** [GRAMMAR.bnf](./GRAMMAR.bnf)
**Base Unit:** meters (m) — use suffixes for other units

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Units and Coordinates](#units-and-coordinates)
3. [Wall Commands](#wall-commands)
4. [Door Commands](#door-commands)
5. [Window Commands](#window-commands)
6. [Opening Commands](#opening-commands)
7. [Variable References](#variable-references)
8. [Error Messages](#error-messages)

---

## Quick Start

```bash
# Create a 5-meter wall
wall (0, 0) (5, 0)

# Add a door at 2.5m from start
door in $last at 2.5

# Add a window at 1m with custom size
window $last @1 width 1.5 height 1.2
```

---

## Units and Coordinates

### Supported Units

| Suffix | Unit        | Conversion to meters |
|--------|-------------|----------------------|
| `m`    | meters      | 1.0                  |
| `mm`   | millimeters | 0.001                |
| `cm`   | centimeters | 0.01                 |
| `ft`   | feet        | 0.3048               |
| `in`   | inches      | 0.0254               |

### Coordinate Formats

```bash
# 2D Point Formats (all equivalent)
(0, 0)          # Parentheses with comma
0, 0            # Comma-separated
0 0             # Space-separated

# 3D Point Formats
(0, 0, 0)       # Parentheses with commas
0, 0, 0         # Comma-separated

# With units
(5m, 3m)        # Explicit meters
(5000mm, 3000mm)  # Millimeters
(16.4ft, 9.8ft)   # Feet
```

---

## Wall Commands

### Create Wall

Creates a single wall segment between two points.

**Syntax:**
```bnf
wall <start-point> <end-point> [options]
wall from <point> to <point> [options]
create wall <start-point> <end-point> [options]
```

**Parameters:**

| Parameter   | Required | Default | Description                  |
|-------------|----------|---------|------------------------------|
| start       | Yes      | —       | Start point (x, y)           |
| end         | Yes      | —       | End point (x, y)             |
| height      | No       | 3.0m    | Wall height                  |
| thickness   | No       | 0.2m    | Wall thickness               |
| type        | No       | basic   | Wall type                    |
| level       | No       | —       | Hosting level UUID           |

**Wall Types:** `basic`, `structural`, `curtain`, `retaining`

### Examples

```bash
# Basic wall from origin to (5, 0)
wall (0, 0) (5, 0)

# Wall with explicit keywords
wall from (0, 0) to (5, 0)

# Wall with height and thickness
wall (0, 0) (5, 0) height 2.8 thickness 0.15

# Wall with short options
wall (0, 0) (5, 0) -h 2.8 -t 0.15

# Wall with long options
wall (0, 0) (5, 0) --height=2.8 --thickness=0.15

# Structural wall with type
wall (0, 0) (5, 0) type structural --height 3.5

# Using millimeters
wall (0mm, 0mm) (5000mm, 0mm) height 3000mm thickness 200mm

# Wall on specific level
wall (0, 0) (5, 0) level a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Create Rectangular Walls

Creates 4 walls forming a closed rectangle.

**Syntax:**
```bnf
walls rect <min-corner> <max-corner> [options]
rect walls <min-corner> <max-corner> [options]
box <min-corner> <max-corner> [options]
```

### Examples

```bash
# 10m x 8m room
walls rect (0, 0) (10, 8)

# With height
walls rect (0, 0) (10, 8) height 2.7

# Short form
box (0, 0) (10, 8) -h 2.7 -t 0.2
```

### Modify Wall

**Syntax:**
```bnf
wall <uuid> set <property> <value>
modify wall <uuid> set <property> <value>
```

### Examples

```bash
# Change wall height
wall a1b2c3d4-... set height 3.5

# Change wall type
wall a1b2c3d4-... set type structural
```

---

## Door Commands

### Place Door

Places a door in an existing wall.

**Syntax:**
```bnf
door in <wall-ref> at <offset> [options]
door <wall-ref> @<offset> [options]
place door in <wall-ref> at <offset> [options]
add door <wall-ref> <offset> [options]
```

**Parameters:**

| Parameter | Required | Default | Description                     |
|-----------|----------|---------|---------------------------------|
| wall_ref  | Yes      | —       | Wall UUID or reference          |
| offset    | Yes      | —       | Distance from wall start        |
| width     | No       | 0.9m    | Door width                      |
| height    | No       | 2.1m    | Door height                     |
| type      | No       | single  | Door type                       |
| swing     | No       | left    | Swing direction                 |

**Door Types:** `single`, `double`, `sliding`, `folding`, `revolving`, `pocket`

**Swing Directions:** `left`, `right`, `both`, `none`

### Examples

```bash
# Door in wall at 2.5m offset
door in a1b2c3d4-... at 2.5

# Door in last created wall
door in $last at 2.5

# Door in selected wall
door in $selected at 2.5

# Using @ shorthand
door $last @2.5

# Door with custom dimensions
door in $last at 2.5 width 1.0 height 2.2

# Short options
door in $last at 2.5 -w 1.0 -h 2.2

# Double door with swing
door in $last at 5 type double swing both width 1.8

# Sliding door (no swing)
door in $last at 3 type sliding swing none width 2.0

# Pocket door
door in $last at 2.5 --type=pocket --width=0.9

# Using millimeters
door in $last at 2500mm width 900mm height 2100mm
```

### Modify Door

**Syntax:**
```bnf
door <uuid> set <property> <value>
```

### Examples

```bash
# Change door width
door a1b2c3d4-... set width 1.0

# Change door type
door a1b2c3d4-... set type sliding

# Change swing direction
door a1b2c3d4-... set swing right
```

---

## Window Commands

### Place Window

Places a window in an existing wall.

**Syntax:**
```bnf
window in <wall-ref> at <offset> [options]
window <wall-ref> @<offset> [options]
place window in <wall-ref> at <offset> [options]
add window <wall-ref> <offset> [options]
```

**Parameters:**

| Parameter   | Required | Default | Description                     |
|-------------|----------|---------|---------------------------------|
| wall_ref    | Yes      | —       | Wall UUID or reference          |
| offset      | Yes      | —       | Distance from wall start        |
| width       | No       | 1.2m    | Window width                    |
| height      | No       | 1.0m    | Window height                   |
| sill        | No       | 0.9m    | Sill height from floor          |
| type        | No       | fixed   | Window type                     |

**Window Types:** `fixed`, `casement`, `double_hung`, `sliding`, `awning`, `hopper`, `pivot`

### Examples

```bash
# Window in wall at 1m offset
window in a1b2c3d4-... at 1

# Window in last created wall
window in $last at 1

# Using @ shorthand
window $last @1

# Window with custom dimensions
window in $last at 1 width 1.5 height 1.2

# Short options
window in $last at 1 -w 1.5 -h 1.2

# Window with sill height
window in $last at 1 width 1.5 height 1.2 sill 0.8

# Long options
window in $last at 1 --width=1.5 --height=1.2 --sill=0.8

# Casement window
window in $last at 2 type casement width 0.6 height 1.0

# Sliding window
window in $last at 3 --type=sliding --width=2.0 --height=1.5 --sill=0.6

# Using millimeters
window in $last at 1000mm width 1200mm height 1000mm sill 900mm

# Multiple windows in same wall
window $last @1 width 1.2
window $last @3 width 1.2
window $last @5 width 1.2
```

### Modify Window

**Syntax:**
```bnf
window <uuid> set <property> <value>
```

### Examples

```bash
# Change window width
window a1b2c3d4-... set width 1.5

# Change window type
window a1b2c3d4-... set type casement

# Change sill height
window a1b2c3d4-... set sill 1.0
```

---

## Opening Commands

### Create Generic Opening

Creates a generic rectangular opening in a wall (not a door or window).

**Syntax:**
```bnf
opening <wall-ref> at <offset> <width> x <height>
opening <wall-ref> at <offset> width <w> height <h>
create opening <wall-ref> at <offset> <w> by <h>
```

### Examples

```bash
# Pass-through opening
opening $last at 2 1.5 x 2.0

# Service hatch
opening $last at 1 width 0.6 height 0.6

# With explicit dimensions
create opening $last at 3 0.8 by 1.0
```

---

## Variable References

Special variables that reference elements contextually:

| Reference    | Description                          |
|--------------|--------------------------------------|
| `$last`      | Last created element                 |
| `$selected`  | Currently selected element           |
| `$wall`      | Last created wall (alias for $last)  |

### Examples

```bash
# Create wall, then add door using $last
wall (0, 0) (10, 0)
door in $last at 5

# Use selected wall
select wall a1b2c3d4-...
door in $selected at 2.5
```

---

## Error Messages

| Error Code | Message                          | Resolution                       |
|------------|----------------------------------|----------------------------------|
| E001       | Invalid point format             | Use `(x, y)` or `x, y` format    |
| E002       | Missing required parameter       | Check command syntax             |
| E003       | Invalid wall type                | Use: basic, structural, curtain, retaining |
| E004       | Invalid door type                | Use: single, double, sliding, folding, revolving, pocket |
| E005       | Invalid window type              | Use: fixed, casement, double_hung, sliding, awning, hopper, pivot |
| E006       | Wall not found                   | Verify UUID or use $last         |
| E007       | Offset exceeds wall length       | Ensure offset < wall length      |
| E008       | Opening would exceed wall bounds | Reduce width or adjust offset    |
| E009       | Invalid unit suffix              | Use: m, mm, cm, ft, in           |
| E010       | Invalid swing direction          | Use: left, right, both, none     |

---

## Complete Workflow Example

```bash
# Step 1: Create exterior walls (10m x 8m building)
walls rect (0, 0) (10, 8) height 3 thickness 0.3 type structural

# Step 2: Create interior wall (dividing into two rooms)
wall from (5, 0) to (5, 8) height 3 thickness 0.15

# Step 3: Add front door
door in wall a1b2c3d4-... at 2.5 type double width 1.8 swing both

# Step 4: Add windows to front wall
window in wall a1b2c3d4-... at 1 width 1.5 type casement
window in wall a1b2c3d4-... at 7 width 1.5 type casement

# Step 5: Add interior door
door in $last at 4 type single width 0.9 swing left

# Step 6: Add back windows
window in wall b2c3d4e5-... at 2 width 2.0 type sliding
window in wall b2c3d4e5-... at 6 width 2.0 type sliding
```

---

## See Also

- [GRAMMAR.bnf](./GRAMMAR.bnf) — Formal BNF grammar specification
- [MCP Tool Surface](../mcp/TOOL_SURFACE.md) — Underlying MCP tools
- [Geometry Schemas](../../server/mcp-servers/geometry-server/geometry_server/schemas.py) — Pydantic models
