# Building a Simple House in Pensaer-BIM

A step-by-step tutorial for creating a 12m × 8m two-room house using the terminal.

> **Note:** All coordinates are in **metres**. Pensaer currently uses metres for all dimensions.

---

## Step 1: Create the Ground Floor Slab

```
floor --min 0,0 --max 12,8 --thickness 0.15
```

> ⚠️ The floor won't be visible in 2D view (known limitation). Switch to 3D view to confirm it was created. You can also run `list floor` to verify.

---

## Step 2: Build the Exterior Walls

Create four walls around the perimeter:

```
wall --start 0,0 --end 12,0 --height 3.0 --thickness 0.2
wall --start 12,0 --end 12,8 --height 3.0 --thickness 0.2
wall --start 12,8 --end 0,8 --height 3.0 --thickness 0.2
wall --start 0,8 --end 0,0 --height 3.0 --thickness 0.2
```

You should see all four walls appear in the 2D canvas immediately.

> **Tip:** You can also use the DSL shorthand (falls through to DSL parser):  
> `wall (0,0) (12,0) height 3 thickness 0.2`

---

## Step 3: Add an Interior Wall

Divide the house into two rooms with a partition wall:

```
wall --start 6,0 --end 6,8 --height 3.0 --thickness 0.1
```

This creates a 100mm partition wall running north-south at the 6m mark.

---

## Step 4: Find Your Wall IDs

Before placing doors and windows, you need the wall IDs:

```
list wall
```

This will show something like:
```
wall-a1b2c3d4  Wall a1b2  (wall)
wall-e5f6g7h8  Wall e5f6  (wall)
...
```

> **Tip:** Match walls to positions by checking `get wall-a1b2c3d4` — look at the `start_x`, `start_y`, `end_x`, `end_y` properties.

Note down:
- **South wall** (y=0): the wall from (0,0) to (12,0)
- **North wall** (y=8): the wall from (12,8) to (0,8)
- **East wall** (x=12): the wall from (12,0) to (12,8)
- **West wall** (x=0): the wall from (0,8) to (0,0)
- **Interior wall** (x=6): the wall from (6,0) to (6,8)

---

## Step 5: Place the Front Door

Place a door on the south wall, 2.5m from its start:

```
door --wall <south-wall-id> --offset 2.5 --width 0.9 --height 2.1
```

Replace `<south-wall-id>` with the actual ID from Step 4.

---

## Step 6: Place Windows

Add windows to each room:

```
window --wall <south-wall-id> --offset 8.0 --width 1.2 --height 1.0 --sill 0.9
window --wall <north-wall-id> --offset 3.0 --width 1.2 --height 1.0 --sill 0.9
window --wall <north-wall-id> --offset 9.0 --width 1.2 --height 1.0 --sill 0.9
window --wall <east-wall-id> --offset 4.0 --width 1.0 --height 1.0 --sill 0.9
```

---

## Step 7: Place a Door in the Interior Wall

```
door --wall <interior-wall-id> --offset 4.0 --width 0.8 --height 2.1
```

---

## Step 8: Define Rooms (Optional)

Label the two spaces:

```
room --min 0,0 --max 6,8 --name "Living Room" --type living
room --min 6,0 --max 12,8 --name "Bedroom" --type bedroom
```

Rooms appear as shaded areas in 2D view.

---

## Step 9: Add a Roof

```
roof --type gable --min 0,0 --max 12,8 --slope 30 --overhang 0.5
```

> ⚠️ The roof won't show in 2D view (known limitation). Switch to 3D to see it.

---

## Step 10: View Your House

- **2D view:** You'll see walls, doors, windows, and rooms.
- **3D view:** You'll see the full house with walls, floor slab, doors, windows, and roof.

### Useful commands:

| Command | What it does |
|---------|-------------|
| `status` | Shows element counts |
| `list` | Lists all elements |
| `list wall` | Lists walls only |
| `get <id>` | Shows element details |
| `delete <id>` | Removes an element |
| `analyze` | Analyzes wall topology |
| `detect-rooms` | Auto-detects rooms from walls |

---

## Saving as a Macro

To replay this workflow later, wrap it in a macro:

```
macro record my-house
wall --start 0,0 --end 12,0 --height 3.0 --thickness 0.2
wall --start 12,0 --end 12,8 --height 3.0 --thickness 0.2
wall --start 12,8 --end 0,8 --height 3.0 --thickness 0.2
wall --start 0,8 --end 0,0 --height 3.0 --thickness 0.2
wall --start 6,0 --end 6,8 --height 3.0 --thickness 0.1
floor --min 0,0 --max 12,8 --thickness 0.15
roof --type gable --min 0,0 --max 12,8 --slope 30
room --min 0,0 --max 6,8 --name "Living Room" --type living
room --min 6,0 --max 12,8 --name "Bedroom" --type bedroom
macro stop
```

Then replay with `macro play my-house`.

> **Note:** Doors and windows can't be included in the macro easily because they need wall IDs that are generated at runtime. Place them manually after running the macro.

---

## Known Limitations

1. **No grid command** — Grid spacing is fixed, not configurable from terminal.
2. **No level/storey command** — Can't create multi-storey buildings with proper elevations yet.
3. **No column command** — Structural columns not yet implemented.
4. **Floors & roofs invisible in 2D** — Use 3D view to see them.
5. **Wall IDs are random UUIDs** — Use `list wall` + `get <id>` to find which wall is which.
6. **No undo command** — Use Ctrl+Z keyboard shortcut instead.
7. **Units are metres only** — No mm or imperial support yet.
8. **Doors/windows need wall IDs** — No click-to-place or `$last` shortcut in flag syntax.
