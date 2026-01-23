# Pensaer-BIM Data Flow Documentation

**Version:** 1.0
**Date:** January 20, 2026

---

## Overview

This document describes the data flow patterns in Pensaer-BIM, including how user actions translate to model changes and how data flows between system components.

---

## Core Data Flow Patterns

### 1. Terminal Command Flow

User commands entered in the terminal follow this flow:

```mermaid
sequenceDiagram
    participant U as User
    participant T as Terminal
    participant D as DSL Parser
    participant M as MCP Client
    participant S as Server
    participant G as Geometry Server
    participant K as Kernel
    participant St as Model Store

    U->>T: Enter command (e.g., "wall 0,0 5,0")
    T->>D: Parse command
    D->>D: Tokenize & validate
    D->>M: Call MCP tool
    M->>S: HTTP POST /mcp/tools/create_wall
    S->>G: Route to geometry handler
    G->>K: Call Rust geometry function
    K->>K: Calculate wall geometry
    K-->>G: Return wall data
    G-->>S: Return MCP result
    S-->>M: JSON response
    M->>St: Update model state
    St-->>T: Trigger re-render
    T-->>U: Display success message
```

### 2. Element Creation Flow

When a new BIM element is created:

```mermaid
flowchart LR
    subgraph Input
        A[User Command]
        B[UI Action]
        C[AI Agent]
    end

    subgraph Processing
        D[Command Parser]
        E[MCP Client]
        F[Tool Handler]
        G[Kernel Operation]
    end

    subgraph State
        H[Event Created]
        I[Model Store Updated]
        J[History Recorded]
    end

    subgraph Output
        K[2D Canvas Render]
        L[3D Canvas Render]
        M[Property Panel Update]
    end

    A --> D
    B --> E
    C --> E
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    I --> K
    I --> L
    I --> M
```

### 3. Selection Flow

When elements are selected:

```mermaid
sequenceDiagram
    participant U as User
    participant C as Canvas
    participant Sel as Selection Store
    participant UI as UI Store
    participant Prop as Property Panel

    U->>C: Click on element
    C->>C: Hit test (raycasting)
    C->>Sel: select(elementId)

    alt Shift key held
        Sel->>Sel: Add to selection (additive mode)
    else Ctrl key held
        Sel->>Sel: Toggle selection
    else Normal click
        Sel->>Sel: Replace selection
    end

    Sel->>UI: Notify selection changed
    UI->>Prop: Update property panel
    Prop->>Prop: Fetch element properties
    C->>C: Re-render with selection highlight
```

### 4. Undo/Redo Flow

History management and undo/redo:

```mermaid
sequenceDiagram
    participant U as User
    participant H as History Store
    participant M as Model Store
    participant C as Canvas

    Note over U,C: Recording an action
    U->>M: Modify element
    M->>H: recordAction(beforeState, afterState)
    H->>H: Push to undo stack
    H->>H: Clear redo stack
    M->>C: Re-render

    Note over U,C: Undo action
    U->>H: undo()
    H->>H: Pop from undo stack
    H->>H: Push to redo stack
    H->>M: Apply beforeState
    M->>C: Re-render

    Note over U,C: Redo action
    U->>H: redo()
    H->>H: Pop from redo stack
    H->>H: Push to undo stack
    H->>M: Apply afterState
    M->>C: Re-render
```

---

## MCP Tool Call Flow

### Request/Response Cycle

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        A[Terminal/UI] --> B[MCP Client]
        B --> C{Transport}
    end

    subgraph Transport
        C -->|HTTP| D[REST Endpoint]
        C -->|WebSocket| E[WS Handler]
    end

    subgraph Server["Server Layer"]
        D --> F[Tool Router]
        E --> F
        F --> G{Tool Category}
        G -->|geometry| H[Geometry Server]
        G -->|spatial| I[Spatial Server]
        G -->|validation| J[Validation Server]
        G -->|documentation| K[Documentation Server]
    end

    subgraph Response
        H --> L[JSON-RPC Response]
        I --> L
        J --> L
        K --> L
        L --> M[MCP Result]
    end

    M --> B
```

### Tool Categories

| Category | Tools | Data Flow |
|----------|-------|-----------|
| **Geometry** | create_wall, create_door, create_floor, etc. | Input → Kernel → Model Store |
| **Spatial** | compute_adjacency, find_nearest, compute_area | Model Store → Kernel → Result |
| **Validation** | validate_model, check_accessibility, detect_clashes | Model Store → Validation Logic → Issues |
| **Documentation** | generate_schedule, export_ifc, export_report | Model Store → Formatter → Output |

---

## State Synchronization

### Local State Updates

```mermaid
flowchart LR
    subgraph Action
        A[User Action]
        B[MCP Response]
        C[External Event]
    end

    subgraph Stores
        D[Model Store]
        E[Selection Store]
        F[UI Store]
        G[History Store]
    end

    subgraph Subscribers
        H[2D Canvas]
        I[3D Canvas]
        J[Property Panel]
        K[Element List]
        L[Terminal]
    end

    A --> D
    B --> D
    C --> D
    D --> G
    D -->|useModelStore| H
    D -->|useModelStore| I
    D -->|useModelStore| J
    D -->|useModelStore| K
    E -->|useSelectionStore| H
    E -->|useSelectionStore| I
    E -->|useSelectionStore| J
    F -->|useUIStore| H
    F -->|useUIStore| I
    F -->|useUIStore| L
```

### Persistence Flow

```mermaid
sequenceDiagram
    participant S as Store
    participant P as Persistence Middleware
    participant I as IndexedDB
    participant C as Cache

    Note over S,C: On state change
    S->>P: State updated
    P->>P: Serialize state
    P->>I: Store to IndexedDB
    P->>C: Update in-memory cache

    Note over S,C: On app load
    I->>P: Retrieve saved state
    P->>P: Deserialize & migrate
    P->>S: Hydrate store
```

---

## Event Sourcing Flow

### Event Creation

```mermaid
flowchart TB
    subgraph Command["Command Processing"]
        A[Create Wall Command] --> B[Validate Parameters]
        B --> C[Execute Operation]
    end

    subgraph Event["Event Generation"]
        C --> D[Create Event Object]
        D --> E[Assign Event ID]
        E --> F[Set Timestamp]
        F --> G[Add Metadata]
    end

    subgraph Storage["Event Storage"]
        G --> H{Local First?}
        H -->|Yes| I[Append to Local Log]
        H -->|No| J[Send to Server]
        I --> K[Sync Later]
        J --> L[Append to PostgreSQL]
    end

    subgraph Projection["State Projection"]
        I --> M[Apply to Model State]
        L --> M
        M --> N[Update Derived Views]
    end
```

### Event Types

| Event | Trigger | Affected State |
|-------|---------|----------------|
| `element.created` | Create command | Model Store elements |
| `element.modified` | Update command | Model Store elements |
| `element.deleted` | Delete command | Model Store elements |
| `elements.joined` | Join walls | Relationships |
| `selection.changed` | Click/select | Selection Store |
| `view.changed` | Pan/zoom/rotate | UI Store |

---

## Error Handling Flow

```mermaid
flowchart TB
    subgraph Operation
        A[User Action] --> B[MCP Call]
    end

    subgraph Server
        B --> C{Valid Request?}
        C -->|No| D[422 Validation Error]
        C -->|Yes| E{Tool Exists?}
        E -->|No| F[404 Not Found]
        E -->|Yes| G{Execute Tool}
        G -->|Error| H[Tool Error Response]
        G -->|Success| I[Success Response]
    end

    subgraph Client
        D --> J[Show Validation Errors]
        F --> K[Show Unknown Tool Error]
        H --> L[Show Tool-Specific Error]
        I --> M[Update State & UI]
    end
```

---

## Performance Considerations

### Rendering Pipeline

```mermaid
flowchart LR
    A[State Change] --> B{Changed Elements}
    B -->|Many| C[Batch Update]
    B -->|Few| D[Incremental Update]
    C --> E[Rebuild Scene Graph]
    D --> F[Update Affected Objects]
    E --> G[Request Animation Frame]
    F --> G
    G --> H[Render Frame]
```

### Optimization Strategies

1. **Selective Re-rendering**: Only update canvas when relevant state changes
2. **Level of Detail (LOD)**: Reduce geometry complexity at distance
3. **Frustum Culling**: Don't render off-screen elements
4. **Batched State Updates**: Group rapid changes into single render cycle
5. **Virtualized Lists**: Only render visible elements in lists

---

## Related Documents

- [Architecture Overview](./overview.md)
- [State Management](./state-management.md)
- [Event Sourcing](./event-sourcing.md)
- [MCP Tool Surface](../mcp/TOOL_SURFACE.md)
