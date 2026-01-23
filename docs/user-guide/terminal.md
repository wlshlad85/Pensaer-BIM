# Pensaer Terminal User Guide

> Command-line interface for building information modeling.

**Version:** 1.0.0
**Last Updated:** 2026-01-20

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Command Reference](#command-reference)
   - [Built-in Commands](#built-in-commands)
   - [Element Commands](#element-commands)
   - [Analysis Commands](#analysis-commands)
3. [Keyboard Shortcuts](#keyboard-shortcuts)
4. [Tab Completion](#tab-completion)
5. [Command History](#command-history)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

The Pensaer terminal is a powerful command-line interface for creating and managing BIM elements. It supports:

- **Natural language-like syntax** for element creation
- **Tab completion** for commands and parameters
- **Command history** with up/down arrow navigation
- **Macro recording** for repeatable workflows

### Accessing the Terminal

The terminal is located in the bottom panel of the application. Focus it by:
- Clicking anywhere in the terminal area
- Using `Ctrl+K` to open the command palette

### Basic Usage

Type a command and press `Enter` to execute:

```bash
# Create a 5-meter wall
wall --start 0,0 --end 5,0

# List all elements
list

# Get help
help
```

---

## Command Reference

### Built-in Commands

#### `help`

Show available commands and usage information.

| Parameter | Description |
|-----------|-------------|
| `[command]` | Optional command name for detailed help |

**Examples:**
```bash
help              # List all commands
help wall         # Detailed help for wall command
help door         # Detailed help for door command
```

---

#### `clear`

Clear the terminal screen.

**Usage:**
```bash
clear
```

---

#### `status`

Show model statistics and status including element counts, issues, and history.

**Usage:**
```bash
status
```

**Output includes:**
- Total elements and count by type
- Number of levels
- Selected element count
- Undo/redo availability
- Issues summary
- AI suggestions count

---

#### `version`

Show application version information.

**Usage:**
```bash
version
```

**Output includes:**
- App version and phase
- Kernel version
- Client technology stack
- MCP mode (mock/live)
- Build date and environment

---

#### `echo`

Print text to the terminal (useful for testing and macros).

| Parameter | Description |
|-----------|-------------|
| `<text>` | Text to print |

**Examples:**
```bash
echo Hello World
echo "This is a test message"
```

---

#### `macro`

Record, play, and manage command macros. See the [Macros Guide](./macros.md) for detailed documentation.

| Subcommand | Description |
|------------|-------------|
| `record <name>` | Start recording a new macro |
| `stop` | Stop recording and save |
| `cancel` | Cancel current recording |
| `play <name>` | Play a saved macro |
| `list` | List all saved macros |
| `delete <name>` | Delete a macro |
| `export` | Export macros as JSON |

**Examples:**
```bash
macro record my-building   # Start recording
# ... execute commands ...
macro stop                 # Stop and save

macro play my-building     # Play back the macro
macro list                 # See all saved macros
```

---

### Element Commands

#### `wall`

Create a wall element between two points.

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--start` | Yes | - | Start point (x,y) |
| `--end` | Yes | - | End point (x,y) |
| `--height` | No | 3.0m | Wall height |
| `--thickness` | No | 0.2m | Wall thickness |
| `--material` | No | Concrete | Material type |
| `--level` | No | Level 1 | Building level |
| `--type` | No | basic | Wall type: basic, structural, curtain, retaining |

**Examples:**
```bash
# Basic wall
wall --start 0,0 --end 5,0

# Positional syntax (shorter)
wall 0,0 5,0

# Wall with height and thickness
wall --start 0,0 --end 10,0 --height 3.0 --thickness 0.25

# Structural wall with material
wall --start 0,0 --end 5,0 --type structural --material "Reinforced Concrete"

# Wall on specific level
wall --start 0,0 --end 5,0 --level "Level 2"
```

---

#### `floor`

Create a floor slab with polygon or rectangular bounds.

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--points` | Yes* | - | Polygon vertices (x1,y1 x2,y2 ...) |
| `--min` | Yes* | - | Rectangle min corner |
| `--max` | Yes* | - | Rectangle max corner |
| `--thickness` | No | 0.15m | Slab thickness |
| `--level` | No | Level 1 | Building level |
| `--type` | No | slab | Floor type |

*Either `--points` or `--min`/`--max` is required.

**Examples:**
```bash
# Rectangular floor
floor --min 0,0 --max 10,10

# Polygon floor (L-shape)
floor --points 0,0 6,0 6,4 3,4 3,2 0,2

# Floor with thickness
floor --min 0,0 --max 5,5 --thickness 0.2 --level "Level 2"
```

---

#### `roof`

Create a roof element with polygon or rectangular bounds.

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--type` | No | gable | Roof type: gable, hip, flat, shed |
| `--points` | Yes* | - | Polygon vertices |
| `--min` | Yes* | - | Rectangle min corner |
| `--max` | Yes* | - | Rectangle max corner |
| `--slope` | No | 30 | Slope in degrees |
| `--overhang` | No | 0.5m | Roof overhang |
| `--ridge` | No | auto | Ridge direction: auto, x, y |
| `--material` | No | Metal Standing Seam | Roofing material |

*Either `--points` or `--min`/`--max` is required.

**Examples:**
```bash
# Gable roof
roof --type gable --min 0,0 --max 10,10 --slope 30

# Hip roof with overhang
roof --type hip --points 0,0 10,0 10,8 0,8 --overhang 0.5

# Flat roof
roof --type flat --min 0,0 --max 10,10
```

---

#### `room`

Create a room space with polygon boundary or rectangular bounds.

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--points` | Yes* | - | Polygon vertices |
| `--min` | Yes* | - | Rectangle min corner |
| `--max` | Yes* | - | Rectangle max corner |
| `--name` | No | Auto-generated | Room name |
| `--number` | No | - | Room number |
| `--type` | No | other | Room type |
| `--height` | No | 3.0m | Ceiling height |

*Either `--points` or `--min`/`--max` is required.

**Room Types:** bedroom, bathroom, kitchen, living, dining, office, storage, hallway, utility, garage, other

**Examples:**
```bash
# Named rectangular room
room --min 0,0 --max 5,5 --name "Living Room" --type living

# Bathroom with room number
room --points 0,0 3,0 3,2 0,2 --name "Bathroom" --number 101 --type bathroom

# L-shaped room
room --points 0,0 6,0 6,4 3,4 3,2 0,2 --name "L-Shaped Room"
```

---

#### `door`

Place a door in a wall with offset positioning.

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--wall` | Yes* | - | Wall ID to host the door |
| `--offset` | Yes | - | Distance from wall start (meters) |
| `--width` | No | 0.9m | Door width |
| `--height` | No | 2.1m | Door height |
| `--type` | No | single | Door type: single, double, sliding |
| `--swing` | No | left | Swing direction: left, right |

*If a wall is selected, `--wall` is optional.

**Examples:**
```bash
# Door at 2.5m from wall start
door --wall wall-001 --offset 2.5

# Double door
door --wall wall-001 --offset 5 --type double --width 1.8

# Sliding door
door --wall wall-001 --offset 3 --type sliding --width 2.0
```

---

#### `window`

Place a window in a wall with offset positioning.

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--wall` | Yes* | - | Wall ID to host the window |
| `--offset` | Yes | - | Distance from wall start (meters) |
| `--width` | No | 1.2m | Window width |
| `--height` | No | 1.0m | Window height |
| `--sill` | No | 0.9m | Sill height from floor |
| `--type` | No | fixed | Window type |

*If a wall is selected, `--wall` is optional.

**Window Types:** fixed, casement, awning, sliding, double_hung

**Examples:**
```bash
# Basic window
window --wall wall-001 --offset 2.0

# Casement window with sill height
window --wall wall-001 --offset 1.5 --sill 0.9 --type casement

# Large sliding window
window --wall wall-001 --offset 2.5 --width 2.0 --height 1.5 --type sliding
```

---

#### `delete`

Delete elements by ID or selection.

| Parameter | Description |
|-----------|-------------|
| `<id1> [<id2> ...]` | Element IDs to delete |

**Examples:**
```bash
# Delete specific elements
delete wall-001 wall-002

# Delete selected elements (select first, then run delete)
delete
```

---

#### `get`

Get detailed information about an element.

| Parameter | Description |
|-----------|-------------|
| `<element_id>` | Element ID (or select an element first) |

**Examples:**
```bash
get wall-001
```

---

#### `list`

List elements in the model, optionally filtered by type.

| Parameter | Description |
|-----------|-------------|
| `[category]` | Optional element type filter |

**Examples:**
```bash
list           # All elements
list wall      # Only walls
list room      # Only rooms
```

---

### Analysis Commands

#### `detect-rooms`

Automatically detect rooms from wall topology.

**Usage:**
```bash
detect-rooms
```

---

#### `analyze`

Analyze wall topology for connections and intersections.

**Usage:**
```bash
analyze
```

---

#### `clash`

Detect geometric clashes between elements.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--ids` | All | Comma-separated element IDs |
| `--clearance` | 0 | Minimum clearance distance |
| `--tolerance` | 0.001 | Collision tolerance |

**Examples:**
```bash
clash                                # Check all elements
clash --clearance 0.1               # With 10cm clearance
clash --ids wall-001,wall-002       # Specific elements
```

---

#### `clash-between`

Detect clashes between two sets of elements.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--a` | Yes | First set (comma-separated IDs) |
| `--b` | Yes | Second set (comma-separated IDs) |
| `--clearance` | No | Minimum clearance distance |

**Examples:**
```bash
clash-between --a wall-001,wall-002 --b door-001,door-002
```

---

## Keyboard Shortcuts

### Tools

| Shortcut | Action |
|----------|--------|
| `V` | Select tool |
| `W` | Wall tool |
| `D` | Door tool |
| `N` | Window tool |
| `M` | Room tool |
| `F` | Floor tool |
| `R` | Roof tool |

### View

| Shortcut | Action |
|----------|--------|
| `2` | 2D view |
| `3` | 3D view |
| `L` | Toggle layers panel |
| `Shift+L` | Show all layers |
| `Ctrl+=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Zoom to fit |
| `F3` | Toggle performance monitor |
| `F8` | Toggle FPS counter (3D view) |

### Selection

| Shortcut | Action |
|----------|--------|
| `Ctrl+A` | Select all (visible) |
| `Escape` | Clear selection |
| `Delete` | Delete selected |
| `Backspace` | Delete selected |

### Edit

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+Y` | Redo (alternate) |

### Snap

| Shortcut | Action |
|----------|--------|
| `S` | Toggle snap |
| `G` | Toggle grid snap |
| `O` | Toggle object snap |

### Commands

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `?` | Show keyboard shortcuts |

---

## Tab Completion

The terminal supports tab completion for:

- **Command names:** Type `wa` and press `Tab` to complete to `wall`
- **Parameters:** Type `--` and press `Tab` to see available options
- **Element IDs:** Type an element type prefix and press `Tab`

Press `Tab` multiple times to cycle through options.

---

## Command History

Navigate previous commands using:

- **Up Arrow:** Previous command
- **Down Arrow:** Next command

History persists across sessions.

---

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Unknown command" | Typo in command name | Use `help` to see available commands |
| "Missing required parameter" | Required argument not provided | Check command syntax with `help <command>` |
| "Wall not found" | Invalid wall ID | Use `list wall` to see valid IDs |
| "Offset exceeds wall length" | Door/window position invalid | Ensure offset < wall length |

### Getting Help

1. Run `help` for all commands
2. Run `help <command>` for detailed usage
3. Press `?` for keyboard shortcuts
4. Check the [DSL Reference](./dsl-reference.md) for syntax details

---

## See Also

- [DSL Reference](./dsl-reference.md) - Detailed syntax specification
- [Macros Guide](./macros.md) - Macro recording and playback
- [DSL Grammar (BNF)](../dsl/GRAMMAR.bnf) - Formal grammar specification
