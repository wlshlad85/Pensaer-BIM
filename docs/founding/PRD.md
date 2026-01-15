# 📋 Pensaer Product Requirements Document

**Document Version:** 1.0
**Initiated:** January 13, 2026
**Status:** Founding Document

---

## Product Overview

**Pensaer** is a developer-first Building Information Modeling (BIM) platform that combines the power of terminal-based workflows with intuitive 2D/3D visualization.

### One-Liner
> A VS Code-like experience for building design, with IFC compatibility and AI-powered assistance.

### Target Release
- **Alpha:** Week 8 (Terminal + DSL working)
- **Beta:** Week 16 (Full collaboration)
- **GA:** Month 6

---

## User Personas

### 1. Primary: Maya the Computational Designer

**Background:**
- 32 years old, M.Arch from SCI-Arc
- 6 years at mid-size architecture firm
- Self-taught Python, uses Dynamo daily
- Frustrated with Revit's limitations

**Quote:**
> "I spend more time clicking through Revit menus than actually designing. I just want to script my way through the boring stuff."

**Goals:**
- Automate repetitive modeling tasks
- Version control for design iterations
- Faster iteration on parametric designs

**Pain Points:**
- Revit's GUI is click-heavy
- No native scripting (needs Dynamo/pyRevit)
- No version control integration
- Expensive for personal use

### 2. Secondary: Ben the BIM Manager

**Background:**
- 45 years old, registered architect
- 15 years experience, 8 in BIM
- Manages 20-person team
- Responsible for standards and quality

**Quote:**
> "I spend half my day in coordination meetings and the other half fixing other people's models."

**Goals:**
- Automated quality checks
- Standardized workflows
- Faster clash resolution
- Better documentation

**Pain Points:**
- Manual clash detection is slow
- Inconsistent standards across team
- Hard to track who changed what

### 3. Tertiary: Sofia the Firm Owner

**Background:**
- 52 years old, runs 8-person firm
- Concerned about software costs
- Wants to attract young talent
- Open to new technology

**Quote:**
> "We're paying $20K/year for Revit licenses. If there's a better option, I'm listening."

**Goals:**
- Reduce software costs
- Competitive advantage
- Attract tech-savvy staff

---

## Feature Requirements

### Epic 1: Core Modeling (Phase 1)

#### US-1.1: Wall Creation
**As a** designer
**I want to** draw walls by clicking start and end points
**So that** I can quickly define room boundaries

**Acceptance Criteria:**
- [ ] Click-click wall creation
- [ ] Adjustable thickness (default 200mm)
- [ ] Wall-to-wall snapping
- [ ] Visual feedback during drawing
- [ ] Undo/redo support

#### US-1.2: Door and Window Placement
**As a** designer
**I want to** place doors and windows in walls
**So that** I can define openings

**Acceptance Criteria:**
- [ ] Doors/windows must be placed in walls
- [ ] Automatic wall cutting
- [ ] Adjustable width/height
- [ ] Flip functionality

#### US-1.3: Room Definition
**As a** designer
**I want to** define rooms bounded by walls
**So that** I can track spaces and areas

**Acceptance Criteria:**
- [ ] Rooms detect bounding walls
- [ ] Automatic area calculation
- [ ] Room naming
- [ ] Occupancy type

#### US-1.4: Selection and Modification
**As a** designer
**I want to** select and modify elements
**So that** I can edit my design

**Acceptance Criteria:**
- [ ] Click to select
- [ ] Shift-click for multi-select
- [ ] Box selection
- [ ] Move by drag
- [ ] Resize via handles
- [ ] Delete with keyboard

#### US-1.5: Undo/Redo
**As a** designer
**I want to** undo and redo my actions
**So that** I can recover from mistakes

**Acceptance Criteria:**
- [ ] ⌘Z to undo
- [ ] ⌘⇧Z to redo
- [ ] Unlimited undo stack (session)
- [ ] Transaction grouping

---

### Epic 2: Developer Experience (Phase 2)

#### US-2.1: Command Palette
**As a** power user
**I want to** access all commands via ⌘K
**So that** I never need to leave the keyboard

**Acceptance Criteria:**
- [ ] ⌘K opens palette
- [ ] Fuzzy search
- [ ] Keyboard navigation (↑↓↵)
- [ ] Recently used commands
- [ ] Shortcut hints

#### US-2.2: Terminal Panel
**As a** developer
**I want to** access a terminal within the app
**So that** I can script operations

**Acceptance Criteria:**
- [ ] Resizable terminal panel
- [ ] Command history
- [ ] Tab completion
- [ ] Syntax highlighting
- [ ] Error messages

#### US-2.3: DSL Commands
**As a** developer
**I want to** create and modify elements via commands
**So that** I can automate workflows

**Acceptance Criteria:**
- [ ] `wall create --from x,y --to x,y --thickness 200`
- [ ] `door place --in wall-id --offset 1000`
- [ ] `select where type=wall`
- [ ] `delete selection`
- [ ] `copy selection --to-levels 2,3,4`

#### US-2.4: Natural Language Commands
**As a** user
**I want to** type commands in plain English
**So that** I don't need to memorize syntax

**Acceptance Criteria:**
- [ ] "add 200mm concrete wall" works
- [ ] "fix all fire code issues" works
- [ ] Preview of interpreted action
- [ ] Confidence indicator

#### US-2.5: Keyboard Shortcuts
**As a** power user
**I want to** use keyboard shortcuts for common actions
**So that** I can work faster

**Acceptance Criteria:**
- [ ] V = Select tool
- [ ] W = Wall tool
- [ ] D = Door tool
- [ ] N = Window tool
- [ ] 3 = 3D view
- [ ] ⌘S = Save
- [ ] Customizable via settings

---

### Epic 3: BIM Compliance (Phase 3)

#### US-3.1: IFC Import
**As a** professional
**I want to** import IFC files
**So that** I can work with existing models

**Acceptance Criteria:**
- [ ] Support IFC2x3 and IFC4
- [ ] Import walls, doors, windows, slabs
- [ ] Preserve properties
- [ ] Progress indicator
- [ ] Error reporting

#### US-3.2: IFC Export
**As a** professional
**I want to** export to IFC
**So that** I can share with other software

**Acceptance Criteria:**
- [ ] Export to IFC4
- [ ] Include property sets
- [ ] Preserve relationships
- [ ] Valid IFC output

#### US-3.3: Multi-Level Support
**As a** designer
**I want to** work with multiple floors
**So that** I can design multi-story buildings

**Acceptance Criteria:**
- [ ] Level creation
- [ ] Level switching
- [ ] Copy to level
- [ ] Level browser panel
- [ ] 3D shows all levels

#### US-3.4: Compliance Checking
**As a** professional
**I want to** check my model for code compliance
**So that** I avoid errors in construction documents

**Acceptance Criteria:**
- [ ] Fire rating checks
- [ ] Accessibility checks
- [ ] Issue visualization
- [ ] One-click fix suggestions

#### US-3.5: Clash Detection
**As a** BIM manager
**I want to** detect element clashes
**So that** I can resolve coordination issues

**Acceptance Criteria:**
- [ ] Detect geometric overlaps
- [ ] Tolerance settings
- [ ] Clash report
- [ ] Navigate to clash

---

### Epic 4: Collaboration (Phase 4)

#### US-4.1: Cloud Save
**As a** user
**I want to** save my projects to the cloud
**So that** I can access them anywhere

**Acceptance Criteria:**
- [ ] Create account
- [ ] Save to cloud
- [ ] Project list
- [ ] Open from cloud

#### US-4.2: Real-Time Collaboration
**As a** team member
**I want to** edit with colleagues in real-time
**So that** we can work together efficiently

**Acceptance Criteria:**
- [ ] See others' cursors
- [ ] Live updates
- [ ] Presence indicators
- [ ] Conflict-free editing

#### US-4.3: Comments and Markup
**As a** team member
**I want to** leave comments on the model
**So that** I can communicate with my team

**Acceptance Criteria:**
- [ ] Add comment at location
- [ ] Reply to comments
- [ ] Resolve comments
- [ ] @mentions

#### US-4.4: Version History
**As a** project manager
**I want to** see the history of changes
**So that** I can track progress and revert if needed

**Acceptance Criteria:**
- [ ] View change history
- [ ] See who made changes
- [ ] Revert to previous version
- [ ] Compare versions

---

## Non-Functional Requirements

### Performance
| Metric | Requirement |
|--------|-------------|
| Initial load | < 3 seconds |
| Command palette | < 100ms |
| Element count | Support 10,000+ elements |
| IFC import (50MB) | < 30 seconds |

### Accessibility
- Keyboard navigable
- Screen reader support
- Color contrast compliance
- Zoom support

### Security
- HTTPS only
- Encrypted storage
- No password storage (OAuth preferred)
- GDPR compliant

### Browser Support
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

---

## Success Metrics

### Alpha (Week 8)
- [ ] 100 active alpha users
- [ ] 50+ terminal commands executed per user
- [ ] < 5 critical bugs

### Beta (Week 16)
- [ ] 1,000 registered users
- [ ] 3 architecture firms piloting
- [ ] NPS > 40

### GA (Month 6)
- [ ] 10,000 registered users
- [ ] $10K MRR
- [ ] NPS > 50

---

## Out of Scope (v1)

- MEP (Mechanical, Electrical, Plumbing)
- Structural analysis
- Rendering/visualization
- Mobile app
- Offline-first desktop app
- Revit plugin/integration

---

*Document authored: January 13, 2026*
*Pensaer PRD: v1.0*
