# Pensaer Macros Guide

> Record, play, and manage command sequences for repeatable workflows.

**Version:** 1.0.0
**Last Updated:** 2026-01-20

---

## Table of Contents

1. [Overview](#overview)
2. [Recording Macros](#recording-macros)
3. [Playing Macros](#playing-macros)
4. [Managing Macros](#managing-macros)
5. [Best Practices](#best-practices)
6. [Examples](#examples)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Macros allow you to record sequences of terminal commands and replay them later. This is useful for:

- **Repetitive tasks** - Create similar building elements multiple times
- **Standard workflows** - Establish consistent procedures
- **Templates** - Build reusable building component templates
- **Testing** - Automate test scenarios

### Key Features

- Record any sequence of terminal commands
- Play back with visual feedback
- Pause/resume during playback
- Export/import macros as JSON
- Persistent storage across sessions

---

## Recording Macros

### Start Recording

```bash
macro record <name>
```

Start recording a new macro with the specified name. All subsequent commands will be captured.

**Example:**
```bash
macro record basic-room
```

### Execute Commands

While recording, execute the commands you want to capture:

```bash
# These commands are being recorded
wall --start 0,0 --end 5,0
wall --start 5,0 --end 5,4
wall --start 5,4 --end 0,4
wall --start 0,4 --end 0,0
door in $last at 2.5
```

### Stop Recording

```bash
macro stop
```

Stops recording and saves the macro. You'll see confirmation with the macro name and command count.

### Cancel Recording

```bash
macro cancel
```

Cancels the current recording without saving. Use this if you made mistakes and want to start over.

---

## Playing Macros

### Basic Playback

```bash
macro play <name>
```

Plays back all commands in the named macro sequentially.

**Example:**
```bash
macro play basic-room
```

### Playback Behavior

- Commands execute with a 200ms delay between them for visual feedback
- Each command shows in the terminal as it executes
- Progress is tracked and displayed
- Playback can be interrupted

### During Playback

While a macro is playing:
- The terminal shows which command is currently executing
- You can see progress through the command sequence
- The macro system tracks playback state

---

## Managing Macros

### List All Macros

```bash
macro list
```

Shows all saved macros with:
- Name
- Number of commands
- Play count (how many times played)
- Creation date

**Example output:**
```
3 macro(s) saved
┌─────────────┬──────────┬───────┬────────────┐
│ Name        │ Commands │ Plays │ Created    │
├─────────────┼──────────┼───────┼────────────┤
│ basic-room  │ 5        │ 3     │ 1/20/2026  │
│ add-windows │ 4        │ 1     │ 1/20/2026  │
│ apartment   │ 23       │ 7     │ 1/19/2026  │
└─────────────┴──────────┴───────┴────────────┘
```

### Delete a Macro

```bash
macro delete <name>
```

Permanently removes the specified macro.

**Example:**
```bash
macro delete old-template
```

### Export Macros

```bash
macro export
```

Exports all macros as JSON. Useful for:
- Backing up macros
- Sharing with team members
- Version control

---

## Best Practices

### Naming Conventions

Use descriptive, kebab-case names:

```bash
# Good names
macro record standard-office
macro record exterior-wall-template
macro record residential-bathroom

# Avoid
macro record x
macro record test123
macro record MyMacro
```

### Keep Macros Focused

Create small, reusable macros rather than large monolithic ones:

```bash
# Good: Focused macros
macro record create-exterior-walls
macro record add-standard-door
macro record add-window-row

# Then combine by playing in sequence
macro play create-exterior-walls
macro play add-standard-door
macro play add-window-row
```

### Use Variables

Take advantage of `$last` and `$selected` for flexible macros:

```bash
macro record add-door-and-windows
# Commands use $last to reference the most recently created wall
wall --start 0,0 --end 10,0
door in $last at 5
window $last @2 width 1.2
window $last @8 width 1.2
macro stop
```

### Test Before Relying

Always test a macro after recording:

```bash
# Record
macro record my-workflow

# ... commands ...

macro stop

# Clear and test
status
macro play my-workflow
status
```

---

## Examples

### Example 1: Basic Room Template

```bash
# Start recording
macro record basic-room-4x4

# Create 4 walls forming a square room
wall --start 0,0 --end 4,0
wall --start 4,0 --end 4,4
wall --start 4,4 --end 0,4
wall --start 0,4 --end 0,0

# Add a door on the south wall
door in wall-001 at 2

# Stop recording
macro stop
```

### Example 2: Window Row

```bash
# Start recording
macro record window-row-3

# Add 3 evenly spaced windows
window $selected @1.5 width 1.0
window $selected @4.0 width 1.0
window $selected @6.5 width 1.0

# Stop recording
macro stop

# Usage: Select a wall first, then run
# (click on wall-005 in canvas)
macro play window-row-3
```

### Example 3: Apartment Unit

```bash
# Start recording
macro record studio-apartment

# Exterior walls (6m x 8m)
walls rect (0, 0) (6, 8) height 2.8 thickness 0.2

# Interior wall for bathroom
wall from (0, 3) to (2.5, 3) height 2.8 thickness 0.1
wall from (2.5, 0) to (2.5, 3) height 2.8 thickness 0.1

# Front door
door in wall-001 at 3 width 0.9

# Bathroom door
door in wall-005 at 1.25 width 0.8

# Windows on exterior walls
window in wall-002 at 2.5 width 1.4 height 1.5 sill 0.9
window in wall-003 at 3 width 1.8 height 1.2 sill 0.8

# Define rooms
room --min 0,0 --max 2.5,3 --name "Bathroom" --type bathroom
room --min 2.5,0 --max 6,8 --name "Living/Bedroom" --type living

# Add floor
floor --min 0,0 --max 6,8

macro stop
```

### Example 4: Using Echo for Documentation

```bash
macro record documented-workflow

echo "=== Creating exterior walls ==="
walls rect (0, 0) (10, 8)

echo "=== Adding entry door ==="
door in wall-001 at 5 type double

echo "=== Adding windows ==="
window in wall-002 at 2 width 1.5
window in wall-002 at 6 width 1.5

echo "=== Done! ==="
status

macro stop
```

---

## Troubleshooting

### "Macro not found"

The macro name doesn't exist. Check available macros:

```bash
macro list
```

Macro names are case-sensitive.

### "Already recording"

You're already recording a macro. Stop or cancel first:

```bash
macro stop    # Save current recording
# or
macro cancel  # Discard current recording
```

### Commands failing during playback

If commands fail during playback:
1. The macro continues with remaining commands
2. Failed commands are logged but don't stop playback
3. Review the original commands for errors

### "Not currently recording"

You tried to stop/cancel but no recording is active:

```bash
# Check macro status
macro
```

### Macro plays but nothing happens

Ensure the commands in the macro are valid:
- Element IDs may have changed since recording
- Use `$last` and `$selected` for relative references
- Check that required elements exist

---

## Command Summary

| Command | Description |
|---------|-------------|
| `macro` | Show macro help and current status |
| `macro record <name>` | Start recording a new macro |
| `macro stop` | Stop recording and save |
| `macro cancel` | Cancel recording without saving |
| `macro play <name>` | Play back a saved macro |
| `macro list` | List all saved macros |
| `macro delete <name>` | Delete a macro |
| `macro export` | Export macros as JSON |

---

## See Also

- [Terminal User Guide](./terminal.md) - Full command reference
- [DSL Reference](./dsl-reference.md) - Command syntax
