# 🔭 Pensaer Vision Document

**Document Version:** 1.0
**Initiated:** January 13, 2026
**Status:** Founding Document

---

## Executive Summary

**Pensaer** (Welsh: *architect*) is a next-generation Building Information Modeling (BIM) platform designed for the emerging "developer architect" persona—professionals who think in code, automate workflows, and demand programmatic control over their design tools.

Our core hypothesis: **The architects and engineers who will define the next decade of the built environment are developers first.** They deserve BIM software built the way they build software.

---

## Why "Pensaer"?

**Pensaer** is the Welsh word for "architect."

We chose this name because:
- It's distinctive and memorable
- Welsh architecture has a proud heritage (from medieval castles to modern masters like Richard Rogers)
- It signals craft and tradition reimagined with modern tools
- The pronunciation (*pen-SAH-eer*) is approachable yet unique

Pensaer isn't just software. It's a statement: architecture and code are becoming one discipline.

---

## The Problem

### Traditional BIM Software Is Broken for Power Users

Autodesk Revit dominates the BIM market with ~70% market share. Yet it was designed in an era of mouse-centric computing and has failed to evolve for modern workflows.

**Pain Points:**

| Issue | Impact |
|-------|--------|
| **Click-heavy UI** | Simple operations require 5-10 clicks through ribbon menus |
| **No version control** | Teams resort to file naming conventions ("v2_final_FINAL") |
| **Hostile to scripting** | Requires C#/Revit SDK; Python via third-party tools only |
| **No keyboard shortcuts** | Nearly every action requires mouse navigation |
| **Closed ecosystem** | Proprietary file format creates vendor lock-in |
| **Expensive** | $2,545/year subscription; prohibitive for small firms |
| **No real-time collab** | Worksharing is clunky, conflict-prone, and slow |

### The Workaround Ecosystem

Power users have created workarounds that reveal what they truly want:

- **Dynamo** (500K+ users): Visual programming bolted onto Revit
- **pyRevit** (100K+ users): Python scripting via unofficial extension
- **Grasshopper** (200K+ users): Rhino's visual programming, often used alongside Revit
- **RevitPythonShell**: Command-line access via third-party plugin
- **BIM 360**: Clunky cloud collaboration added as SaaS layer

These tools exist because **Revit fails to serve developers natively**.

---

## The Hypothesis

### "Architects Are Becoming Developers"

The AEC (Architecture, Engineering, Construction) industry is undergoing a fundamental transformation:

**Evidence:**

1. **Computational Design Roles**
   - Every major firm now has dedicated computational design teams
   - Job postings for "Computational Designer" increased 340% since 2020
   - Salaries for BIM developers exceed traditional architects by 30-50%

2. **Visual Programming Adoption**
   - Dynamo: 500,000+ monthly active users
   - Grasshopper: 200,000+ monthly active users
   - Growing 25% year-over-year

3. **Educational Shift**
   - Top architecture programs now require programming courses
   - MIT, Harvard GSD, AA London have computational design tracks
   - Student portfolios increasingly include code, not just drawings

4. **Industry Drivers**
   - Mass customization demands parametric design
   - Sustainability analysis requires data-driven workflows
   - Prefabrication needs automated documentation
   - AI/ML integration impossible without programmatic access

**Conclusion:** The next generation of architects thinks in loops, conditionals, and functions. They need tools that respect this.

---

## The Solution: Developer-First BIM

### Design Principles

1. **Terminal-First, Not Terminal-Only**
   - Integrated terminal for power users
   - GUI remains for spatial operations
   - Everything accessible via keyboard

2. **Command Palette as Primary Navigation**
   - VS Code-style ⌘K interface
   - Natural language understanding
   - Fuzzy matching with context awareness

3. **Scriptable Everything**
   - JavaScript/TypeScript API for all operations
   - Python bindings for data science workflows
   - Macro recording for repetitive tasks

4. **Git-Native Version Control**
   - Branch, commit, merge design options
   - Diff visualization between model states
   - Blame/history for every element

5. **AI-Native, Not AI-Bolted**
   - Suggestions embedded in model, not chatbot sidebar
   - Context-aware recommendations per element
   - Compliance checking as continuous background process

6. **Open by Default**
   - IFC as primary format
   - JSON-based internal representation
   - Extensible plugin architecture

---

## Target Users

### Primary Persona: The Computational Designer

**Demographics:**
- Age: 25-40
- Background: Architecture + self-taught programming
- Tools: Revit, Dynamo, Python, Rhino/Grasshopper
- Frustrations: Click-heavy workflows, no version control, slow iteration

**Behaviors:**
- Uses keyboard shortcuts obsessively
- Writes scripts to automate repetitive tasks
- Prefers text configuration over GUI wizards
- Active on GitHub, Stack Overflow, BIM forums

**Goals:**
- Reduce time from concept to documentation
- Automate compliance checking
- Create reusable parametric components
- Collaborate without file management hell

### Secondary Persona: The BIM Manager

**Demographics:**
- Age: 30-50
- Background: Architecture or Engineering + BIM specialization
- Tools: Revit, Navisworks, BIM 360, Excel
- Frustrations: Training users, enforcing standards, coordination

**Goals:**
- Standardize workflows across teams
- Automate quality control
- Reduce coordination meeting time
- Integrate with PM and construction tools

### Tertiary Persona: The Tech-Forward Firm Owner

**Demographics:**
- Age: 35-55
- Background: Architecture practice owner
- Frustrations: Software costs, competitive pressure, talent retention

**Goals:**
- Reduce software licensing costs
- Attract computational design talent
- Differentiate from competitors
- Future-proof the practice

---

## Competitive Landscape

```
                    DEVELOPER-FRIENDLY
                          ↑
                          │
                          │         ★ Pensaer
                          │           (target)
                          │
     IFC.js  ●            │
                          │
     Speckle ●            │
                          │
  ─────────────────────────────────────────────→ FULL BIM
    GEOMETRY              │                    CAPABILITY
    ONLY                  │
                          │      ● Revit + Dynamo
                          │
              ● Rhino/GH  │      ● ArchiCAD
                          │
                          │      ● Vectorworks
                          │
                          ↓
                    TRADITIONAL UI
```

### Competitors Analysis

| Product | Strengths | Weaknesses | Pensaer Advantage |
|---------|-----------|------------|-------------------|
| **Revit** | Market leader, comprehensive | Click-heavy, expensive, closed | Developer-first UX |
| **ArchiCAD** | Mac support, cleaner UI | Smaller ecosystem, traditional | Terminal + scripting |
| **Rhino/GH** | Excellent for geometry | Not true BIM, weak documentation | Full BIM + developer UX |
| **Speckle** | Great API, open source | Platform, not authoring tool | Complete BIM authoring |
| **IFC.js** | Open source, web-based | Viewer only, no authoring | Full authoring + terminal |

---

## Market Opportunity

### Total Addressable Market (TAM)

- Global BIM software market: **$8.8B** (2024)
- Growing at **13.7% CAGR** through 2030
- Projected: **$18.5B** by 2030

### Serviceable Addressable Market (SAM)

- Computational designers + BIM managers: ~2M professionals globally
- At $50/month average: **$1.2B** annual opportunity

### Serviceable Obtainable Market (SOM)

- Early adopters (1-2% of SAM): 20,000-40,000 users
- Year 1-3 target: **$12-24M ARR**

### Business Model Options

1. **Open Core** - Free base + paid cloud/collaboration
2. **Usage-Based** - Pay per compute/storage
3. **Enterprise** - Self-hosted + support contracts
4. **Education** - Free for students, converts to paid

---

## Success Metrics

### Phase 1 (Months 1-3)
- [ ] Working prototype with terminal integration
- [ ] 100 alpha users from computational design community
- [ ] GitHub stars: 500+

### Phase 2 (Months 4-6)
- [ ] IFC import/export functional
- [ ] 1,000 registered users
- [ ] First paying pilot customers (3-5 firms)

### Phase 3 (Months 7-12)
- [ ] Real-time collaboration working
- [ ] 10,000 registered users
- [ ] $100K ARR

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Revit adds terminal/scripting | Low | High | Move fast, build community moat |
| Geometry kernel complexity | Medium | High | Use web-ifc, leverage Open CASCADE |
| Adoption resistance | Medium | Medium | Target computational designers first |
| Funding gap | Medium | High | Open source community, grants |
| IFC limitations | Low | Medium | Extend with proprietary layer if needed |

---

## Closing Statement

The AEC industry is at an inflection point. The tools of the past decade—built for mouse clicks and ribbon menus—cannot serve the developers who are reshaping how we design buildings.

Pensaer is not just another BIM tool. It's a statement about how professional software should work: **like the tools developers build for themselves.**

The command line isn't a step backward. It's the path forward.

---

*Document authored: January 13, 2026*
*Project: Pensaer*
*Status: Initiated*
