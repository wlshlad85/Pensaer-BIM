# 🏢 Large Building Model Strategies for Pensaer

**Document Version:** 1.0
**Created:** January 15, 2026
**Author:** Atlas (VP & CTO)
**Purpose:** Technical strategies for handling large-scale BIM models efficiently

---

## The Challenge

Large building projects generate BIM models with:
- **10,000 - 500,000+ elements** (walls, doors, MEP components)
- **100MB - 2GB+ file sizes** in IFC format
- **Complex relationship graphs** (hosts, bounds, connects)
- **Multi-level structures** (10-100+ floors in high-rises)

Traditional BIM software struggles with:
- Memory bloat from loading entire models
- Slow rendering of dense geometry
- UI freezes during operations
- Collaboration conflicts on large files

---

## Strategy 1: Spatial Partitioning (Level-of-Detail)

### Concept
Divide the model into spatial regions, loading only what's visible or relevant.

```
                    ┌─────────────────────────┐
                    │     CAMERA/VIEWPORT     │
                    │                         │
    ┌───┬───┬───┐   │   ┌───────────────┐     │
    │   │ * │   │   │   │ HIGH DETAIL   │     │
    ├───┼───┼───┤   │   │ (Full mesh,   │     │
    │   │FOV│ * │ ──┼── │  properties)  │     │
    ├───┼───┼───┤   │   └───────────────┘     │
    │   │ * │   │   │                         │
    └───┴───┴───┘   │   Surrounding: LOW LOD  │
     GRID CELLS     │   Far away: BBOX ONLY   │
                    └─────────────────────────┘
```

### Implementation
```typescript
interface SpatialIndex {
  // Octree for 3D, Quadtree for 2D
  tree: OctreeNode;

  // Query elements in view frustum
  queryVisible(camera: Camera): Element[];

  // Get elements at LOD based on distance
  getLOD(element: Element, cameraDistance: number): LODLevel;
}

type LODLevel =
  | 'full'      // All geometry + properties
  | 'simplified' // Reduced mesh
  | 'bbox'      // Bounding box only
  | 'hidden';   // Not rendered
```

### Benefits
- Only 1,000-5,000 elements rendered at once
- Smooth navigation even with 100K+ elements
- Memory usage stays bounded

---

## Strategy 2: Lazy Loading & Streaming

### Concept
Load element data on-demand rather than all at once.

```
┌──────────────────────────────────────────────────────────┐
│                    ELEMENT LIFECYCLE                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   [IndexedDB]  →  [Memory Cache]  →  [Render Queue]      │
│                                                          │
│   ┌─────────┐     ┌─────────────┐    ┌─────────────┐    │
│   │ Stored: │     │ Loaded:     │    │ Rendered:   │    │
│   │ 100,000 │ ──→ │ 5,000       │ ──→│ 500 visible │    │
│   │ elements│     │ (hot cache) │    │ elements    │    │
│   └─────────┘     └─────────────┘    └─────────────┘    │
│                                                          │
│   Load on: select, pan-to, property-read                 │
│   Unload: LRU eviction when cache > 10,000               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Implementation
```typescript
class LazyElementStore {
  private cache: LRUCache<string, Element>;
  private db: IDBDatabase;

  async getElement(id: string): Promise<Element> {
    // Check memory cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    // Load from IndexedDB
    const element = await this.loadFromDB(id);
    this.cache.set(id, element);
    return element;
  }

  // Preload elements likely to be needed
  async prefetch(ids: string[]): Promise<void> {
    const missing = ids.filter(id => !this.cache.has(id));
    const elements = await this.loadBatch(missing);
    elements.forEach(el => this.cache.set(el.id, el));
  }
}
```

### Benefits
- Initial load time < 2 seconds regardless of model size
- Memory footprint controlled via LRU cache
- Background prefetching for smooth UX

---

## Strategy 3: Web Workers for Heavy Computation

### Concept
Offload expensive operations to background threads.

```
┌─────────────────────────────────────────────────────────┐
│                    MAIN THREAD                           │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│   │   UI    │  │ Canvas  │  │  State  │                 │
│   │ Events  │  │ Render  │  │ Updates │   60 FPS        │
│   └─────────┘  └─────────┘  └─────────┘                 │
│        │            │            │                       │
│        └────────────┼────────────┘                       │
│                     ▼                                    │
│              postMessage()                               │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────┐
│              WORKER THREADS                              │
│                     ▼                                    │
│   ┌─────────────────────────────────────────┐           │
│   │           GEOMETRY WORKER               │           │
│   │  - IFC parsing                          │           │
│   │  - Mesh generation                      │           │
│   │  - Clash detection                      │           │
│   └─────────────────────────────────────────┘           │
│   ┌─────────────────────────────────────────┐           │
│   │           ANALYSIS WORKER               │           │
│   │  - Compliance checking                  │           │
│   │  - Area calculations                    │           │
│   │  - Relationship graph queries           │           │
│   └─────────────────────────────────────────┘           │
│   ┌─────────────────────────────────────────┐           │
│   │           SEARCH WORKER                 │           │
│   │  - Fuzzy search indexing                │           │
│   │  - Full-text property search            │           │
│   │  - Command palette matching             │           │
│   └─────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### Benefits
- UI never freezes during heavy operations
- Parallel processing of multi-core CPUs
- Progressive results for long-running queries

---

## Strategy 4: Virtual Scrolling & Windowing

### Concept
For lists (elements, properties, issues), only render visible rows.

```typescript
// Instead of rendering 10,000 elements in DOM:
function ElementList({ elements }) {
  return (
    <VirtualList
      height={600}
      itemCount={elements.length}  // 10,000
      itemSize={40}                 // Row height
      renderItem={({ index }) => (
        <ElementRow element={elements[index]} />
      )}
    />
  );
  // Only ~15 rows rendered at once!
}
```

### Benefits
- Constant DOM size regardless of element count
- Smooth scrolling through massive lists
- Works for properties panels, issue lists, etc.

---

## Strategy 5: Incremental IFC Parsing

### Concept
Stream IFC file parsing rather than blocking on full load.

```
┌─────────────────────────────────────────────────────────┐
│                 IFC STREAMING PIPELINE                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   [File] → [Chunk Reader] → [Parser] → [Element Queue]  │
│                                                          │
│   ┌────────────────────────────────────────────────┐    │
│   │  Progress: ████████░░░░░░░░░░░░ 42%            │    │
│   │  Loaded:   4,200 / 10,000 elements             │    │
│   │  Memory:   127 MB (bounded)                    │    │
│   └────────────────────────────────────────────────┘    │
│                                                          │
│   User can START WORKING while import continues!         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Implementation with web-ifc
```typescript
import { IfcAPI } from 'web-ifc';

async function* streamIFC(file: File) {
  const ifcApi = new IfcAPI();
  await ifcApi.Init();

  const modelID = ifcApi.OpenModel(await file.arrayBuffer());
  const types = [IFCWALL, IFCDOOR, IFCWINDOW, IFCSPACE];

  for (const type of types) {
    const ids = ifcApi.GetLineIDsWithType(modelID, type);
    for (const id of ids) {
      const props = ifcApi.GetLine(modelID, id);
      yield convertToPensaerElement(props);
      // Allow UI to update between elements
      await new Promise(r => setTimeout(r, 0));
    }
  }
}
```

---

## Strategy 6: Model Federation

### Concept
Split large projects into federated sub-models that can be loaded independently.

```
┌─────────────────────────────────────────────────────────┐
│                 FEDERATED MODEL STRUCTURE                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌──────────────────────────────────────────┐          │
│   │           PROJECT MANIFEST               │          │
│   │   {                                      │          │
│   │     "name": "High-Rise Tower",          │          │
│   │     "submodels": [                       │          │
│   │       { "id": "arch", "loaded": true },  │          │
│   │       { "id": "struct", "loaded": false},│          │
│   │       { "id": "mep", "loaded": false },  │          │
│   │     ]                                    │          │
│   │   }                                      │          │
│   └──────────────────────────────────────────┘          │
│                        │                                 │
│          ┌─────────────┼─────────────┐                  │
│          ▼             ▼             ▼                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│   │   ARCH   │  │  STRUCT  │  │   MEP    │             │
│   │  Model   │  │  Model   │  │  Model   │             │
│   │ (50MB)   │  │ (30MB)   │  │ (80MB)   │             │
│   │          │  │          │  │          │             │
│   │ Walls    │  │ Columns  │  │ Ducts    │             │
│   │ Doors    │  │ Beams    │  │ Pipes    │             │
│   │ Windows  │  │ Slabs    │  │ Equip    │             │
│   └──────────┘  └──────────┘  └──────────┘             │
│                                                          │
│   Load/unload disciplines independently                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Benefits
- Architects can work without loading MEP
- Structural engineers load only what they need
- Reduces coordination overhead

---

## Strategy 7: GPU-Accelerated Rendering

### Concept
Leverage WebGL instancing for massive element counts.

```typescript
// Instead of one draw call per element:
// Use instanced rendering for similar elements

class InstancedWallRenderer {
  private instanceCount = 0;
  private instanceMatrices: Float32Array;
  private instanceColors: Float32Array;

  addWall(transform: Matrix4, color: Color) {
    // Add to instance buffer
    this.instanceMatrices.set(transform.toArray(), this.instanceCount * 16);
    this.instanceColors.set(color.toArray(), this.instanceCount * 3);
    this.instanceCount++;
  }

  render() {
    // Single draw call for ALL walls!
    gl.drawArraysInstanced(gl.TRIANGLES, 0, wallVertexCount, this.instanceCount);
  }
}
```

### Performance Gains
| Technique | Draw Calls | FPS (10K elements) |
|-----------|------------|-------------------|
| Naive | 10,000 | 5 FPS |
| Batched | 100 | 30 FPS |
| Instanced | 10 | 60 FPS |

---

## Recommended Implementation Order for Pensaer

### Phase 1 (MVP): Basic Performance
1. **Virtual scrolling** for element lists
2. **Lazy loading** from IndexedDB
3. **Simple spatial culling** (hide off-screen elements)

### Phase 2 (Scale): 10K+ Elements
4. **Web Workers** for IFC parsing and clash detection
5. **LRU cache** with configurable size
6. **Progressive IFC loading** with progress UI

### Phase 3 (Enterprise): 100K+ Elements
7. **Full spatial indexing** (Octree/R-tree)
8. **GPU instancing** for walls, columns, etc.
9. **Model federation** for multi-discipline projects

---

## Memory Budget Guidelines

| Model Size | Target Memory | Strategy |
|------------|---------------|----------|
| < 1,000 elements | 50 MB | Load all |
| 1,000 - 10,000 | 150 MB | Lazy load + LRU |
| 10,000 - 50,000 | 300 MB | Spatial partitioning |
| 50,000+ | 500 MB max | Federation + streaming |

---

## References

- [Three.js Performance Tips](https://threejs.org/docs/#manual/en/introduction/Performance-tips)
- [web-ifc Documentation](https://github.com/IFCjs/web-ifc)
- [Comlink for Web Workers](https://github.com/GoogleChromeLabs/comlink)
- [React Virtual](https://tanstack.com/virtual/latest)

---

*This document provides architectural guidance for scaling Pensaer to handle enterprise-grade BIM models.*
*Implementation details will evolve as we build and benchmark.*
