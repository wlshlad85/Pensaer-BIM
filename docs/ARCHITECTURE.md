# Pensaer-BIM Architecture — AI Context Diagrams

> These Mermaid diagrams exist to give AI agents (and humans) instant system understanding.
> Preload this file in any AI session working on the codebase.

---

## 1. System Overview — The Three Pillars

```mermaid
graph TB
    subgraph "🖥️ React Client (app/)"
        UI[React + Vite + Three.js]
        Terminal[Terminal - xterm.js]
        Canvas2D[2D Plan View]
        Canvas3D[3D Viewport - Three.js]
        DSL[DSL Parser - lexer→parser→executor]
        CMD[Command Dispatcher]
        Stores[(Zustand Stores)]
    end

    subgraph "🐍 Python Server (server/)"
        API[FastAPI :8000]
        GeoSrv[Geometry Server - MCP]
        SpatSrv[Spatial Server - MCP]
        ValSrv[Validation Server - MCP]
        DocSrv[Documentation Server - MCP]
    end

    subgraph "🦀 Rust Kernel (kernel/)"
        Geom[pensaer-geometry]
        Math[pensaer-math]
        CRDT[pensaer-crdt]
        IFC[pensaer-ifc]
    end

    subgraph "🗄️ Infrastructure"
        PG[(PostgreSQL + PostGIS)]
        Redis[(Redis)]
        MinIO[(MinIO - S3)]
    end

    UI --> Terminal
    Terminal --> DSL
    DSL --> CMD
    CMD --> Stores
    CMD -->|MCP tools| API
    Stores --> Canvas2D
    Stores --> Canvas3D
    API --> GeoSrv
    API --> SpatSrv
    API --> ValSrv
    API --> DocSrv
    GeoSrv -.->|PyO3 - NOT YET WIRED| Geom
    API --> PG
    API --> Redis
    API --> MinIO
```

---

## 2. Command Flow — User Input to Model Update

```mermaid
sequenceDiagram
    actor User
    participant T as Terminal (xterm.js)
    participant L as Lexer
    participant P as Parser
    participant E as Executor
    participant D as Command Dispatcher
    participant S as modelStore (Zustand)
    participant H as historyStore
    participant C2 as Canvas2D
    participant C3 as Canvas3D

    User->>T: wall 0,0 10,0 --height 3
    T->>L: tokenize input
    L->>P: Token[]
    P->>E: CreateWallCommand AST
    E->>D: dispatchCommand("wall", args)
    D->>S: addElement(wallElement)
    S->>H: recordAction("add wall")
    S-->>C2: re-render (subscription)
    S-->>C3: re-render (subscription)
    D-->>T: CommandResult (success/error)
    T-->>User: "Wall created: wall-abc123"
```

---

## 3. Client Architecture — React App Structure

```mermaid
graph LR
    subgraph "Entry"
        App[App.tsx]
    end

    subgraph "Layout Components"
        Header[Header.tsx]
        Toolbar[Toolbar.tsx]
        StatusBar[StatusBar.tsx]
        CmdPalette[CommandPalette.tsx]
    end

    subgraph "Canvas"
        C2D[Canvas2D.tsx]
        C3D[Canvas3D.tsx]
        Grid[Grid.tsx]
        Snap[SnapIndicator.tsx]
        ViewCube[ViewCube.tsx]
        Elements[elements/ - Wall, Door, Window, Room...]
    end

    subgraph "Panels"
        LayerPanel[LayerPanel.tsx]
        LevelPanel[LevelPanel.tsx]
        PropsPanel[PropertiesPanel.tsx]
        HistPanel[HistoryPanel.tsx]
        TermComp[Terminal.tsx]
    end

    subgraph "Stores (Zustand)"
        MS[modelStore - elements, levels, materials]
        SS[selectionStore - selectedIds]
        US[uiStore - activeLevel, theme, panels]
        HS[historyStore - undo/redo stack]
        TS[tokenStore - MCP usage]
        MCS[macroStore - saved commands]
    end

    subgraph "Services"
        MCP[mcpClient.ts - server connection]
        IFCExp[ifc/IfcExporter.ts]
        IFCImp[ifcParser.ts]
        Persist[persistence/ - localStorage]
        ModelIO[modelIO.ts - save/load]
    end

    subgraph "DSL Pipeline"
        Lexer[lexer.ts → Token[]]
        Parser[parser.ts → AST]
        Executor[executor.ts → dispatch]
        Errors[errors.ts - suggestions]
    end

    App --> Header & Toolbar & C2D & C3D & TermComp & StatusBar
    TermComp --> Lexer --> Parser --> Executor
    Executor --> MS & SS
    C2D --> Elements
    Elements --> MS
    PropsPanel --> SS & MS
```

---

## 4. Store Relationships — Data Flow

```mermaid
graph TD
    subgraph "User Actions"
        TermInput[Terminal Input]
        CanvasClick[Canvas Click/Drag]
        PanelEdit[Properties Panel Edit]
    end

    subgraph "Command Layer"
        DSL[DSL Pipeline]
        Dispatch[commandDispatcher.ts]
        Handlers[Command Handlers - element, level, select, move, etc.]
    end

    subgraph "State (Zustand Stores)"
        Model[modelStore]
        Selection[selectionStore]
        UI[uiStore]
        History[historyStore]
    end

    subgraph "Outputs"
        Canvas2D[Canvas2D Render]
        Canvas3D[Canvas3D Render]
        Panels[UI Panels]
        IFCFile[IFC Export File]
    end

    TermInput --> DSL --> Dispatch
    CanvasClick --> Selection
    PanelEdit --> Model
    Dispatch --> Handlers --> Model & Selection & UI
    Model -->|subscribe| History
    Model -->|subscribe| Canvas2D & Canvas3D & Panels
    Selection -->|subscribe| Canvas2D & Panels
    UI -->|subscribe| Panels
    Model --> IFCFile
```

---

## 5. Element Type Hierarchy

```mermaid
classDiagram
    class BaseElement {
        +string id
        +ElementType type
        +Record~string,any~ properties
        +object position
        +string level
        +Relationships relationships
        +SecurityClassification securityClassification
        +CDEState cdeState
        +string suitabilityCode
    }

    class WallElement {
        +number start_x, start_y
        +number end_x, end_y
        +string height, thickness
        +string material
    }

    class DoorElement {
        +string hostWallId
        +number positionOnWall
        +string width, height
    }

    class WindowElement {
        +string hostWallId
        +number positionOnWall
        +string width, height, sillHeight
    }

    class FloorElement {
        +number[][] boundary
        +string thickness
    }

    class RoofElement {
        +string roofType
        +number pitch
    }

    class ColumnElement {
        +string shape
        +string width, depth, height
    }

    class BeamElement {
        +number start_x, start_y
        +number end_x, end_y
        +string width, depth
    }

    class StairElement {
        +string stairType
        +number risers, riserHeight, treadDepth
    }

    class RoomElement {
        +number[][] boundary
        +string roomName, roomNumber
    }

    class GridLineElement {
        +string label
        +string axis
        +number gridPosition
    }

    class OpeningElement {
        +string hostWallId
        +number positionOnWall
        +string width, height
    }

    BaseElement <|-- WallElement
    BaseElement <|-- DoorElement
    BaseElement <|-- WindowElement
    BaseElement <|-- FloorElement
    BaseElement <|-- RoofElement
    BaseElement <|-- ColumnElement
    BaseElement <|-- BeamElement
    BaseElement <|-- StairElement
    BaseElement <|-- RoomElement
    BaseElement <|-- GridLineElement
    BaseElement <|-- OpeningElement

    WallElement "1" --> "*" DoorElement : hosts
    WallElement "1" --> "*" WindowElement : hosts
    WallElement "1" --> "*" OpeningElement : hosts
    WallElement "*" --> "*" WallElement : joins
```

---

## 6. DSL Pipeline — Lexer → Parser → Executor

```mermaid
graph LR
    Input["wall 0,0 10,0 --height 3.5 --material Brick"]

    subgraph "Lexer (lexer.ts)"
        T1[WALL]
        T2[NUMBER 0]
        T3[COMMA]
        T4[NUMBER 0]
        T5[NUMBER 10]
        T6[COMMA]
        T7[NUMBER 0]
        T8[LONG_HEIGHT]
        T9[NUMBER 3.5]
        T10[LONG_MATERIAL]
        T11[IDENTIFIER Brick]
    end

    subgraph "Parser (parser.ts)"
        AST["CreateWallCommand {
            from: {x:0, y:0}
            to: {x:10, y:0}
            height: 3.5
            material: 'Brick'
        }"]
    end

    subgraph "Executor (executor.ts)"
        MCPCall["dispatchCommand('wall', {
            from: '0,0',
            to: '10,0',
            height: '3500mm',
            material: 'Brick'
        })"]
    end

    Input --> T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9 & T10 & T11
    T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9 & T10 & T11 --> AST
    AST --> MCPCall
```

---

## 7. ISO 19650 Compliance Layer

```mermaid
graph TB
    subgraph "Information Requirements"
        OIR[OIR - Organisational]
        AIR[AIR - Asset]
        PIR[PIR - Project]
        EIR[EIR - Exchange]
    end

    subgraph "Pensaer Features (PRs #30-33)"
        Naming["ISO Naming (PR #30)
        PENS-S-ZZ-L1-M3-ST-0001"]
        CDE["CDE Workflow (PR #31)
        WIP → Shared → Published → Archived"]
        Security["Security (PR #32)
        Official → Secret → TopSecret"]
        EIRBEP["EIR/BEP (PR #33)
        Templates + Validation"]
    end

    subgraph "CDE States"
        WIP["🟡 WIP (S0)"]
        Shared["🔵 Shared (S1-S4)"]
        Published["🟢 Published"]
        Archived["⚫ Archived"]
    end

    subgraph "Suitability Codes"
        S0[S0 - WIP]
        S1[S1 - Coordination]
        S2[S2 - Information]
        S3[S3 - Review]
        S4[S4 - Stage Approval]
    end

    OIR --> AIR & PIR
    AIR & PIR --> EIR
    EIR --> EIRBEP
    EIRBEP --> Naming & CDE & Security
    CDE --> WIP --> Shared --> Published --> Archived
    Shared --> S0 & S1 & S2 & S3 & S4

    style WIP fill:#f59e0b,color:#000
    style Shared fill:#3b82f6,color:#fff
    style Published fill:#22c55e,color:#000
    style Archived fill:#666,color:#fff
```

---

## 8. Rust Kernel — Crate Dependency Map

```mermaid
graph BT
    subgraph "kernel/"
        Math["pensaer-math
        Vectors, matrices,
        transforms, NURBS"]

        Geom["pensaer-geometry
        Boolean ops, meshing,
        B-rep, spatial index"]

        CRDT["pensaer-crdt
        Conflict-free replicated
        data types for collab"]

        IFC["pensaer-ifc
        IFC STEP parser,
        IFC4 export, schema"]
    end

    subgraph "Python Bridge (NOT YET WIRED)"
        PyO3["PyO3 / Maturin
        maturin develop --features python"]
    end

    subgraph "Python MCP Servers"
        GeoSrv[geometry-server]
        SpatSrv[spatial-server]
    end

    Math --> Geom
    Math --> IFC
    Geom --> IFC
    CRDT --> Geom
    Geom -.-> PyO3
    PyO3 -.-> GeoSrv & SpatSrv

    style PyO3 stroke-dasharray: 5 5,fill:#f59e0b,color:#000
```

---

## 9. Infrastructure — Docker Compose Stack

```mermaid
graph TB
    subgraph "Docker Compose"
        App["pensaer-bim-app
        React + Vite
        :5173"]

        Server["pensaer-bim-server
        FastAPI + MCP
        :8000"]

        Kernel["pensaer-bim-kernel
        Rust + gRPC
        :50051"]

        PG["PostgreSQL + PostGIS
        :5432"]

        Redis["Redis
        :6379"]

        MinIO["MinIO (S3)
        :9000 / :9001"]
    end

    subgraph "Test Stack"
        Playwright["Playwright E2E
        pensaer-test"]
    end

    subgraph "Dev Tools"
        MC["Mission Control
        :8899"]
        ScalingLab["Scaling Lab
        Synthetic agents"]
    end

    App -->|API calls| Server
    Server -->|gRPC| Kernel
    Server --> PG & Redis & MinIO
    Playwright --> App
    MC -->|GitHub API| App

    style Kernel fill:#f59e0b,color:#000
```

---

## 10. Git Branch & PR Strategy

```mermaid
gitgraph
    commit id: "main (production)"
    branch ralphy
    commit id: "working branch"
    branch max/feature-x
    commit id: "Max builds feature"
    commit id: "Tests pass ✅"
    checkout ralphy
    merge max/feature-x id: "Rich reviews & merges"
    branch max/feature-y
    commit id: "Another feature"
    checkout ralphy
    merge max/feature-y id: "Reviewed & merged"
    checkout main
    merge ralphy id: "Release to main"
```

---

## 11. File Map — Where Things Live

```
Pensaer-BIM/
├── app/                          # React client (51K LOC)
│   └── src/
│       ├── components/
│       │   ├── canvas/           # 2D + 3D views, elements, grid, snap
│       │   ├── layout/           # Header, Toolbar, Panels, Terminal
│       │   ├── ui/               # Reusable UI components
│       │   └── debug/            # FPS, performance dashboard
│       ├── stores/               # Zustand state management
│       │   ├── modelStore.ts     # THE source of truth (elements, levels)
│       │   ├── selectionStore.ts # What's selected
│       │   ├── historyStore.ts   # Undo/redo stack
│       │   ├── uiStore.ts        # Active level, theme, panel state
│       │   ├── macroStore.ts     # Saved command macros
│       │   └── tokenStore.ts     # MCP token usage tracking
│       ├── lib/dsl/              # DSL parser pipeline
│       │   ├── lexer.ts          # Input → Token[]
│       │   ├── parser.ts         # Token[] → AST
│       │   ├── executor.ts       # AST → Command dispatch
│       │   └── tokens.ts         # Token type definitions
│       ├── commands/             # Command handlers
│       │   └── handlers/         # element, level, select, move, etc.
│       ├── services/             # MCP client, IFC, persistence
│       └── types/                # TypeScript interfaces
├── server/                       # Python backend (19K LOC)
│       ├── mcp-servers/
│       │   ├── geometry-server/  # 3D geometry operations
│       │   ├── spatial-server/   # Spatial queries, collision
│       │   ├── validation-server/# Model validation, clash detect
│       │   └── documentation-server/ # Docs, specs
│       └── mcp-bridge/           # Server bridge layer
├── kernel/                       # Rust geometry kernel (18K LOC)
│   ├── pensaer-geometry/         # Boolean ops, meshing, B-rep
│   ├── pensaer-math/             # Vectors, matrices, NURBS
│   ├── pensaer-crdt/             # Collaborative data types
│   └── pensaer-ifc/              # IFC import/export
├── pensaer_scaling_lab/          # Scaling experiments
├── deploy/                       # Docker configs
├── docs/                         # Documentation
└── scripts/                      # Build/deploy scripts
```

---

## 12. BIM Maturity Roadmap

```mermaid
graph LR
    subgraph "Level 0 ❌"
        L0[Unmanaged 2D CAD]
    end

    subgraph "Level 1"
        L1[Managed CAD + Standards]
    end

    subgraph "Level 2 ✅ TABLE STAKES"
        L2A[3D BIM Models]
        L2B[CDE Workflow]
        L2C[IFC Interop]
        L2D[EIR/BEP]
        L2E[Clash Detection]
    end

    subgraph "Level 3 🎯 OUR EDGE"
        L3A[Digital Twin]
        L3B[Real-time Collab - CRDT]
        L3C[IoT Integration]
        L3D[AI-native Workflows]
        L3E[Multi-threaded Kernel]
    end

    L0 --> L1 --> L2A & L2B & L2C & L2D & L2E
    L2A & L2B & L2C & L2D & L2E --> L3A & L3B & L3C & L3D & L3E

    style L2A fill:#22c55e,color:#000
    style L2B fill:#22c55e,color:#000
    style L2C fill:#22c55e,color:#000
    style L2D fill:#22c55e,color:#000
    style L2E fill:#f59e0b,color:#000
    style L3A fill:#3b82f6,color:#fff
    style L3B fill:#3b82f6,color:#fff
    style L3C fill:#666,color:#fff
    style L3D fill:#3b82f6,color:#fff
    style L3E fill:#3b82f6,color:#fff
```

---

## How to use this file

**For AI agents:** Preload this file at the start of any coding session on Pensaer-BIM. It provides:
- System topology (what talks to what)
- Data flow (how user input becomes model changes)
- Type hierarchy (what elements exist)
- File locations (where to find things)
- Constraints (what's wired, what's not)

**For humans:** Use the diagrams to onboard new contributors or pitch the architecture.

**Render:** GitHub renders Mermaid natively. VS Code + Mermaid extension. Or paste into [mermaid.live](https://mermaid.live).
