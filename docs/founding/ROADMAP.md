# 🗺️ Pensaer Development Roadmap

**Document Version:** 1.0
**Initiated:** January 13, 2026
**Status:** Founding Document

---

## Overview

This roadmap outlines the 16-week initial development plan for Pensaer, taking us from prototype to a functional alpha release.

```
╔════════════════════════════════════════════════════════════════════════════╗
║                         PENSAER DEVELOPMENT TIMELINE                        ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   Week  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16      ║
║         ├───────────────┼───────────────┼───────────────┼──────────────┤   ║
║         │   PHASE 1     │   PHASE 2     │   PHASE 3     │   PHASE 4    │   ║
║         │ Core Engine   │ Developer     │ BIM           │ Collab       │   ║
║         │               │ Experience    │ Compliance    │              │   ║
║         └───────────────┴───────────────┴───────────────┴──────────────┘   ║
║                                                                              ║
║   Milestones:                                                               ║
║   ● Week 4:  v0.1.0-alpha (Core working)                                    ║
║   ● Week 8:  v0.2.0-alpha (Terminal + DSL)                                  ║
║   ● Week 12: v0.3.0-alpha (IFC support)                                     ║
║   ● Week 16: v0.4.0-beta  (Collaboration)                                   ║
║                                                                              ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## Phase 1: Core Engine (Weeks 1-4)

**Goal:** Establish the foundational architecture and basic BIM functionality.

### Week 1: Project Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Set up ESLint, Prettier, Husky
- [ ] Create component folder structure
- [ ] Migrate prototype components to proper React structure

### Week 2: Data Model & State
- [ ] Implement Element, Relationship TypeScript interfaces
- [ ] Set up Zustand stores (model, selection, ui, history)
- [ ] Implement basic CRUD operations for elements
- [ ] Create element factory functions

### Week 3: Canvas & Interaction
- [ ] Build 2D SVG canvas component
- [ ] Implement element rendering (wall, door, window, room)
- [ ] Add selection system (click, shift-click, box select)
- [ ] Implement drag-to-move functionality
- [ ] Add snap system (grid, element, endpoint)

### Week 4: Transactions & Persistence
- [ ] Build transaction manager for undo/redo
- [ ] Implement operation recording
- [ ] Add IndexedDB persistence layer
- [ ] Create auto-save functionality
- [ ] **Release: v0.1.0-alpha**

**Deliverables:**
- Working 2D canvas with element creation/editing
- Undo/redo system
- Local persistence
- Basic element types (wall, door, window, room)

---

## Phase 2: Developer Experience (Weeks 5-8)

**Goal:** Add terminal, command palette, and keyboard-first workflows.

### Week 5: Command Palette
- [ ] Build command palette component
- [ ] Implement fuzzy search algorithm
- [ ] Add command registration system
- [ ] Create keyboard shortcut manager
- [ ] Implement ⌘K trigger

### Week 6: Terminal Panel
- [ ] Integrate xterm.js
- [ ] Create terminal UI panel (resizable)
- [ ] Build basic command parser
- [ ] Implement history and autocomplete
- [ ] Add output formatting

### Week 7: DSL Implementation
- [ ] Design DSL grammar (BNF specification)
- [ ] Build lexer for tokenization
- [ ] Implement parser for command trees
- [ ] Create command executor
- [ ] Add error handling and suggestions

### Week 8: Natural Language Integration
- [ ] Add NL pattern matching for commands
- [ ] Implement "AI understands" preview system
- [ ] Create suggestion/completion system
- [ ] Build macro recording (record, playback)
- [ ] **Release: v0.2.0-alpha**

**Deliverables:**
- Fully functional command palette with fuzzy search
- Integrated terminal with Pensaer DSL
- Natural language command parsing
- Keyboard shortcut system
- Macro recording

---

## Phase 3: BIM Compliance (Weeks 9-12)

**Goal:** Add IFC support and professional BIM features.

### Week 9: 3D Visualization
- [ ] Upgrade Three.js integration
- [ ] Implement proper wall/door/window 3D geometry
- [ ] Add floor and roof 3D rendering
- [ ] Create orbit controls and viewcube
- [ ] Implement section cuts

### Week 10: IFC Integration
- [ ] Integrate web-ifc library
- [ ] Build IFC import pipeline
- [ ] Implement element mapping (IFC → Pensaer)
- [ ] Add IFC export functionality
- [ ] Handle IFC property sets

### Week 11: Multi-Level Support
- [ ] Add Level entity type
- [ ] Implement level switching
- [ ] Build level browser panel
- [ ] Add copy-to-levels functionality
- [ ] Implement floor-to-floor relationships

### Week 12: Compliance Checking
- [ ] Build rule engine for compliance
- [ ] Implement fire rating checks
- [ ] Add accessibility compliance rules
- [ ] Create clash detection system
- [ ] Build issue visualization
- [ ] **Release: v0.3.0-alpha**

**Deliverables:**
- IFC import/export
- Full 3D visualization
- Multi-level support
- Automated compliance checking
- Clash detection

---

## Phase 4: Collaboration (Weeks 13-16)

**Goal:** Enable real-time multi-user editing.

### Week 13: Cloud Infrastructure
- [ ] Set up Supabase project
- [ ] Implement authentication (email, Google)
- [ ] Create project/document storage
- [ ] Build API for project management
- [ ] Add project sharing/permissions

### Week 14: Real-Time Sync
- [ ] Integrate Yjs for CRDT
- [ ] Implement WebSocket provider
- [ ] Build conflict resolution logic
- [ ] Add presence indicators
- [ ] Create cursor sharing

### Week 15: Collaboration Features
- [ ] Build comments/markup system
- [ ] Implement design option branching
- [ ] Add change tracking/history
- [ ] Create merge functionality
- [ ] Build notification system

### Week 16: Polish & Beta Release
- [ ] Performance optimization
- [ ] Bug fixing and stabilization
- [ ] Documentation completion
- [ ] Demo project creation
- [ ] **Release: v0.4.0-beta**

**Deliverables:**
- Real-time multi-user editing
- Cloud storage and authentication
- Comments and markup
- Design branching/merging
- Production-ready beta

---

## Post-Beta Roadmap (Months 5-12)

### Q2 2026: Enterprise Features
- Single Sign-On (SSO) support
- Audit logging
- Role-based permissions
- On-premise deployment option

### Q3 2026: Advanced BIM
- MEP (Mechanical, Electrical, Plumbing) support
- Structural analysis integration
- Energy analysis
- Cost estimation

### Q4 2026: Ecosystem
- Plugin marketplace
- Public API
- Zapier/Integromat integrations
- Mobile companion app

---

## Success Metrics by Phase

| Phase | KPI | Target |
|-------|-----|--------|
| Phase 1 | Prototype feature parity | 100% |
| Phase 2 | Commands executable via terminal | 50+ |
| Phase 3 | IFC import success rate | > 95% |
| Phase 4 | Concurrent user editing | 10+ users |

---

## Resource Requirements

### Development Team
- **Phase 1-2:** 1 full-stack developer
- **Phase 3-4:** 2-3 developers recommended

### Infrastructure
- **Development:** Local + GitHub
- **Phase 3+:** Supabase (free tier → pro)
- **Beta:** CDN for static assets

### Budget Estimate
- Supabase Pro: $25/month
- Domain + hosting: $20/month
- Development tools: $50/month
- **Total Phase 1-4:** ~$400

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scope creep | Strict phase gates, feature freeze per phase |
| web-ifc complexity | Start integration early, have fallback plan |
| Performance issues | Profile early, set budgets, lazy loading |
| Yjs learning curve | Dedicate full week, use examples |

---

*Document authored: January 13, 2026*
*Pensaer Roadmap: v1.0*
