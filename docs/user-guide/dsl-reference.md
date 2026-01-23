# Pensaer DSL Quick Reference

> Quick syntax reference for BIM element creation commands.

**Version:** 1.0.0
**Base Unit:** meters (m) - use suffixes for other units
**Full Grammar:** [GRAMMAR.bnf](../dsl/GRAMMAR.bnf)

---

## Units and Coordinates

### Supported Units

| Suffix | Unit | Conversion |
|--------|------|------------|
| `m` | meters | 1.0 |
| `mm` | millimeters | 0.001 |
| `cm` | centimeters | 0.01 |
| `ft` | feet | 0.3048 |
| `in` | inches | 0.0254 |

### Point Formats

```bash
# 2D Points (all equivalent)
(0, 0)           # Parentheses with comma
0, 0             # Comma-separated
0 0              # Space-separated

# With units
(5m, 3m)         # Explicit meters
(5000mm, 3000mm) # Millimeters
(16.4ft, 9.8ft)  # Feet
```

---

## Quick Syntax Reference

### Wall

```bash
# Create wall
wall <start> <end> [height H] [thickness T] [type TYPE]

# Examples
wall (0, 0) (5, 0)
wall 0,0 5,0 height 3 thickness 0.2
wall from (0, 0) to (5, 0) type structural
```

**Types:** `basic`, `structural`, `curtain`, `retaining`

---

### Rectangular Walls

```bash
# Create 4 walls forming rectangle
walls rect <min> <max> [options]
box <min> <max> [options]

# Examples
walls rect (0, 0) (10, 8)
box (0, 0) (10, 8) height 2.7
```

---

### Door

```bash
# Place door in wall
door in <wall-ref> at <offset> [width W] [height H] [type TYPE] [swing DIR]
door <wall-ref> @<offset> [options]

# Examples
door in $last at 2.5
door $selected @2.5 width 1.0 height 2.2
door in wall-001 at 5 type double swing both
```

**Types:** `single`, `double`, `sliding`, `folding`, `revolving`, `pocket`
**Swing:** `left`, `right`, `both`, `none`

---

### Window

```bash
# Place window in wall
window in <wall-ref> at <offset> [width W] [height H] [sill S] [type TYPE]
window <wall-ref> @<offset> [options]

# Examples
window in $last at 1
window $last @1 width 1.5 height 1.2
window in wall-001 at 2 type casement sill 0.9
```

**Types:** `fixed`, `casement`, `double_hung`, `sliding`, `awning`, `hopper`, `pivot`

---

### Floor

```bash
# Polygon floor
floor --points <p1> <p2> <p3> ... [thickness T] [level L]

# Rectangular floor
floor --min <corner1> --max <corner2> [options]

# Examples
floor --points 0,0 10,0 10,8 0,8
floor --min 0,0 --max 10,10 --thickness 0.2
```

---

### Roof

```bash
# Polygon roof
roof --type TYPE --points <p1> <p2> ... [slope DEG] [overhang M]

# Rectangular roof
roof --type TYPE --min <corner1> --max <corner2> [options]

# Examples
roof --type gable --min 0,0 --max 10,10 --slope 30
roof --type hip --points 0,0 10,0 10,8 0,8 --overhang 0.5
```

**Types:** `flat`, `gable`, `hip`, `shed`, `mansard`

---

### Room

```bash
# Polygon room
room --points <p1> <p2> <p3> ... [--name NAME] [--type TYPE]

# Rectangular room
room --min <corner1> --max <corner2> [options]

# Examples
room --min 0,0 --max 5,5 --name "Living Room" --type living
room --points 0,0 3,0 3,2 0,2 --name "Bathroom" --type bathroom
```

**Types:** `bedroom`, `bathroom`, `kitchen`, `living`, `dining`, `office`, `storage`, `hallway`, `utility`, `garage`, `other`

---

### Opening

```bash
# Generic opening in wall
opening <wall-ref> at <offset> <width> x <height>

# Examples
opening $last at 2 1.5 x 2.0
opening wall-001 at 1 width 0.6 height 0.6
```

---

## Variable References

| Reference | Description |
|-----------|-------------|
| `$last` | Last created element |
| `$selected` | Currently selected element |
| `$wall` | Last created wall (alias) |

```bash
# Create wall, then add door using $last
wall (0, 0) (10, 0)
door in $last at 5
window $last @2 width 1.5
```

---

## Option Formats

Commands support multiple option formats:

```bash
# Long form
wall (0,0) (5,0) height 3.0 thickness 0.2

# Short flags
wall (0,0) (5,0) -h 3.0 -t 0.2

# GNU-style
wall (0,0) (5,0) --height 3.0 --thickness 0.2

# Equals sign
wall (0,0) (5,0) --height=3.0 --thickness=0.2
```

---

## Complete Workflow Example

```bash
# Step 1: Create exterior walls (10m x 8m building)
walls rect (0, 0) (10, 8) height 3 thickness 0.3 type structural

# Step 2: Create interior wall
wall from (5, 0) to (5, 8) height 3 thickness 0.15

# Step 3: Add front door
door in wall-001 at 2.5 type double width 1.8 swing both

# Step 4: Add windows to front wall
window in wall-001 at 1 width 1.5 type casement
window in wall-001 at 7 width 1.5 type casement

# Step 5: Add interior door
door in $last at 4 type single width 0.9 swing left

# Step 6: Add back windows
window in wall-003 at 2 width 2.0 type sliding
window in wall-003 at 6 width 2.0 type sliding

# Step 7: Add floor
floor --min 0,0 --max 10,8 --thickness 0.15

# Step 8: Add roof
roof --type gable --min 0,0 --max 10,8 --slope 25 --overhang 0.5

# Step 9: Define rooms
room --min 0,0 --max 5,8 --name "Room A" --type living
room --min 5,0 --max 10,8 --name "Room B" --type bedroom
```

---

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| E001 | Invalid point format | Use `(x, y)` or `x, y` format |
| E002 | Missing required parameter | Check command syntax |
| E003 | Invalid wall type | Use: basic, structural, curtain, retaining |
| E004 | Invalid door type | Use: single, double, sliding, folding, revolving, pocket |
| E005 | Invalid window type | Use: fixed, casement, double_hung, sliding, awning, hopper, pivot |
| E006 | Wall not found | Verify UUID or use $last |
| E007 | Offset exceeds wall length | Ensure offset < wall length |
| E008 | Opening exceeds wall bounds | Reduce width or adjust offset |
| E009 | Invalid unit suffix | Use: m, mm, cm, ft, in |
| E010 | Invalid swing direction | Use: left, right, both, none |

---

## See Also

- [Terminal User Guide](./terminal.md) - Full command reference
- [Macros Guide](./macros.md) - Recording and playback
- [Full Grammar (BNF)](../dsl/GRAMMAR.bnf) - Formal specification
