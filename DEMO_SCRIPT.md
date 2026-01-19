# Pensaer BIM - Investor Demo Script
**Duration:** 3-5 minutes
**Goal:** Show AI-powered BIM platform building a house from scratch

---

## INTRO (30 sec)
**[Start on app loaded - 3D view with empty/default scene]**

> "This is Pensaer - a developer-first BIM platform that combines traditional architectural tools with AI assistance. Let me show you how fast we can design a building."

---

## PART 1: BUILD THE HOUSE (2 min)
**[Click on Terminal to expand if needed]**

### Step 1: Create the outer walls
Type in terminal:
```
wall --start 0,0 --end 10,0 --height 3
wall --start 10,0 --end 10,8 --height 3
wall --start 10,8 --end 0,8 --height 3
wall --start 0,8 --end 0,0 --height 3
```

> "Using our command-line interface, I'm creating four walls - this is how developers and power users prefer to work. Each command creates a wall with precise coordinates."

### Step 2: Add an interior wall
```
wall --start 6,0 --end 6,8 --height 3
```

> "Now I'm adding an interior wall to divide the space into two rooms."

### Step 3: Add a door
```
door --wall wall-1 --position 2.5 --width 0.9
```

> "Adding a front door to the south wall."

### Step 4: Add windows
```
window --wall wall-1 --position 7 --width 1.2
window --wall wall-3 --position 4 --width 1.5
```

> "And some windows for natural light."

### Step 5: Add a floor
```
floor --min 0,0 --max 10,8
```

> "Creating the floor slab."

### Step 6: Add a roof
```
roof --min 0,0 --max 10,8 --type gable --slope 30
```

> "And finally a gable roof with 30-degree pitch."

---

## PART 2: 3D VISUALIZATION (1 min)
**[The 3D view should already show the building]**

> "The 3D view updates in real-time as we build. Let me show you some viewing options."

**Actions:**
1. Click "Top" view button
2. Click "Front" view button
3. Click "Perspective" view button
4. Click "Rotate" to enable auto-rotation
5. Use the ViewCube to rotate manually
6. Toggle Section plane ON, slide it through the building

> "We have orthographic views, perspective mode, auto-rotation, and section planes to cut through the model - essential for understanding internal spaces."

---

## PART 3: SPATIAL ANALYSIS (1 min)
**[In Terminal]**

```
detect-rooms
```

> "Our spatial analysis engine automatically detects enclosed rooms from wall topology."

```
analyze
```

> "We can analyze the wall connectivity and structure."

```
status
```

> "And get a summary of the entire model state."

```
adjacency
```

> "The system understands which rooms are adjacent - critical for circulation analysis."

---

## PART 4: VALIDATION (30 sec)
**[In Terminal]**

```
clash
```

> "Built-in clash detection finds conflicts between elements - doors too close to corners, overlapping geometry, clearance violations."

```
clearance --element door-1 --type wheelchair
```

> "We can check accessibility compliance - does this door have wheelchair clearance?"

---

## PART 5: AI FEATURES PREVIEW (30 sec)
**[Point to Properties Panel on the right]**

> "Every element shows AI-generated suggestions - acoustic insulation recommendations, furniture fitting analysis, solar panel placement. This is where our AI assistant guides architects toward better designs."

---

## CLOSING (30 sec)

> "What you've seen is:
> - Sub-minute building creation via command line
> - Real-time 3D visualization with professional viewing tools
> - Automatic spatial analysis and room detection
> - Built-in validation for clashes and compliance
> - AI suggestions throughout the design process
>
> Pensaer brings software engineering practices to architecture - version control, automation, and AI assistance. We're building the future of BIM."

---

## KEY TALKING POINTS FOR INVESTORS

1. **Speed**: Built a house in under 2 minutes
2. **Developer-First**: Command line interface = automation & scripting
3. **Real-Time 3D**: No separate render step, instant visualization
4. **Smart Analysis**: Automatic room detection, clash detection
5. **AI-Assisted**: Suggestions appear contextually throughout
6. **Modern Stack**: React + Rust + Python - maintainable, fast, extensible

---

## TERMINAL COMMANDS QUICK REFERENCE

| Command | Description |
|---------|-------------|
| `wall --start x,y --end x,y` | Create wall |
| `door --wall <id> --position p` | Add door to wall |
| `window --wall <id> --position p` | Add window to wall |
| `floor --min x,y --max x,y` | Create floor slab |
| `roof --min x,y --max x,y --type gable` | Create roof |
| `detect-rooms` | Find enclosed spaces |
| `analyze` | Analyze wall topology |
| `clash` | Detect element conflicts |
| `status` | Model summary |
| `help` | All commands |
