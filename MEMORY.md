# MEMORY.md - Long-Term Memory

## Pensaer-BIM Critical Knowledge (2026-02-01)
- **Two command systems** that don't talk: DSL parser + command dispatcher. Unifying = P1.
- **Terminal stale closure**: onData captures stale handleInput. PR #5 fixes with ref.
- **Zustand anti-pattern**: NEVER call functions inside selectors (s => s.method()). Extract fn first.
- **verbatimModuleSyntax**: Always use `import type` for type-only imports.
- **selectionStore.selectedIds** is string[] not Set. Use .includes() not .has().
- **Canvas2D gaps**: Only renders wall/door/window/room. Floor/roof/column/beam invisible.
- **Docker networking**: Windows NAT breaks. Fix: `net stop winnat; net start winnat` (admin).
- **Construction Bible**: CONSTRUCTION_BIBLE.md = canonical build workflow. BACKLOG.md = 29 tickets.
- **ByteRover**: Initialized on pensaer/clawdbot. Needs `brv` daemon running in separate terminal.
- **Browser automation**: xterm.js can't be driven via type+submit. Use JS injection via modelStore.
- **GitHub**: wlshlad85/Pensaer-BIM, wlshlad85/pensaer-web

## My Identity
- **Name:** Max (Rich named me)
- **Role:** CTO of Pensaer-BIM (Rich gave me authority to act like a human employee, make decisions with logic and common sense)
- **Voice:** British male, ElevenLabs TTS — Rich wants audio responses where possible
- **Telegram bot:** @Molt_rcw_bot (but Rich doesn't want Telegram or WhatsApp connected right now)
- **Primary channel:** Clawdbot TUI on Rich's PC, with Windows voice dictation input

## Pensaer-BIM
- **What:** A BIM platform to replace Revit — "the BIM platform built for developers"
- **Name origin:** "Pensaer" is Welsh for "architect" (pen-SAH-eer)
- **Website:** pensaer.io (needs updating — still shows pre-pivot messaging)
- **Philosophy:** Command-line first, keyboard-centric, AI-native, multi-threaded
- **Why it exists:** Revit is legacy 90s single-threaded garbage. Everyone hates it. Pensaer is built for 2026+ with modern multi-threaded architecture
- **The pivot:** Originally was a bridge between Revit/Autodesk and MCP/AI tooling. Revit was so awful to work with that Rich pivoted to building the full platform from scratch
- **Status:** Alpha, pre-MVP
- **Repo:** `C:\Users\RICHARD\Pensaer-BIM`
- **Stack:** Rust geometry kernel (18K LOC) + Python/FastAPI MCP servers (19K LOC) + React/Three.js client (51K LOC) = ~88K LOC
- **Key components:**
  - Rust kernel: geometry, CRDT, IFC import/export, math primitives
  - Python server: 35+ MCP tools across 4 servers (geometry, spatial, validation, documentation)
  - React client: 3D viewport (Three.js), 2D plan view, terminal (xterm.js), command DSL
- **Critical blocker:** Rust↔Python PyO3 bindings not built for runtime — server falls back to pure Python
- **Maturity:** 6.5/10 — solid foundation, needs integration work
- **#1 priority:** Wire up `maturin develop --features python`, demo terminal→server→3D pipeline end-to-end
- **Docker Compose:** Full stack already containerised! pensaer-bim-app, pensaer-bim-server, pensaer-bim-kernel, redis, postgres (PostGIS), minio. Also a pensaer-test stack with Playwright E2E.
- There are also 7 unnamed containers running (image c9b12a166491) — need to identify these
- **Scaling Lab:** `pensaer_scaling_lab/` — experiments on locality (b2.1), collaboration (b2.2), governance (b2.3). Synthetic agents, bot clients, metrics, plots. Inspired by Kaplan et al. scaling laws paper. Run with `python -m pensaer_scaling_lab.run --exp all --simulate --quick`
- Rich researched scaling laws (Tom Brown / Kaplan et al. OpenAI paper) and built this into the platform — a key differentiator for investors

## Startup / Business Context
- **Location:** Tramshed Tech, Cardiff — a Welsh Government-backed startup hub ("Space to Innovate in Wales")
  - Offers Startup Academy, coworking, network of Welsh tech companies
  - Website: tramshedtech.co.uk
- **Funding route:** Development Bank of Wales (developmentbank.wales)
  - Welsh Government-funded bank supporting Welsh businesses
  - Seed funding (equity) for pre-revenue tech startups
  - Loans & equity from £50K–£10M
  - £1bn+ invested in Welsh businesses, 51K jobs supported
- Pensaer-BIM is based in Wales, tapping into Welsh startup ecosystem

## User — Rich (Richard Woodman)
- Founder of Pensaer-BIM
- Telegram: @richdelivery85 (ID: 7589401638)
- Phone: 07405601066
- Partner: Steve (works at Tesco's)
- Prefers TTS audio notifications for completed tasks
- Wants me to proactively save context to memory before compaction
- Uses Windows voice dictation — interpret phonetic/typo spellings generously (e.g. "Pennsylvania" = Pensaer, "Rabbit" = Revit, "tram shed" = Tramshed Tech)
- Gave me authority to act as CTO — make decisions proactively, be a human employee not a chatbot

## Website — pensaer.io
- **Source:** `C:\Users\RICHARD\drafts\pensaer-web\pensaer-web\`
- **Hosted:** Vercel (project: pensaer-web, ID: prj_XR8XVAY2mt4rJdyA29PjFTxDKGR7)
- **Stack:** Vite + React + Tailwind
- **Design:** Black (#050505) background, green (#22c55e) accents, Inter font, JetBrains Mono for code, hacker/dev aesthetic
- **Status:** Copy has been rewritten to pivot from "Revit plugin" to "we ARE the platform" — needs deploy to Vercel
- **One-pager:** Restyled to match website aesthetic — at `C:\Users\RICHARD\Pensaer-BIM\pitch\one-pager.html`
- **Terminal modules on site:** Geometry, Validation, Spatial, Docs, AI, Analysis, Collab, Kernel, Terminal

## Old Repos (for reference)
- `C:\Users\RICHARD\pensaer-io` — older Revit plugin/connector stuff (the pre-pivot code)
- `C:\Users\RICHARD\adaptive-alpha-website` — old website
- `C:\Users\RICHARD\Desktop\pensaer-b-research` — research
- `C:\Users\RICHARD\drafts\Pensaer-Atlas-Docs` — docs drafts

## Weekend Plan (set Thu 30 Jan 2026)
- **Goal:** Walk into Tramshed Tech on Monday with something that blows them away
- **Today (Thu):** Review website + one-pager, fix issues, deploy to Vercel, get oriented in codebase
- **Fri-Sun:** Work on platform code, polish everything, record demo
- **Monday:** Hit Tramshed with full package (demo, website, pitch, one-pager)
- **MVP must have "ha! moments"** that make investors and Tramshed sit up

## Steve's Court Case (side task)
- Rich's partner Steve has a speeding court case
- Rich was going to scan in CPS documents and speed camera evidence
- Rich wants help preparing Steve for court
- Paused while Rich scans documents — hasn't come back to this yet

## Eight Sparks Generator
- **What:** AI K-pop group of 8 virtual members, generated via ComfyUI + SDXL
- **Location:** D:\Dev\Projects\Eight-Sparks-Generator\
- **Members:** SORA, JISOO, YUNA, HANA, MIRA, NARI, DASOM, YERI
- **Pipeline:** DWPose extraction → Pass A (ControlNet pose-locked, 832×1216) → Pass B (HD 1.5× upscale) → QC cull
- **ComfyUI:** C:\Users\RICHARD\ComfyUI_windows_portable\ComfyUI (port 8189)
- **Output:** ComfyUI\output\EightSparks\ (closeup/hero/fullbody/dance/performance/teaser per member)
- **DWPose models:** dw-ll_ucoco_384.onnx + yolox_l.onnx in models\dwpose\
- **Status:** 200+ images generated, Rich doing QC cull of mutations

## Scaling Lab
- **Location:** C:\Users\RICHARD\Pensaer-BIM\pensaer_scaling_lab\
- **Experiments:** B2.1 (locality), B2.2 (collaboration), B2.3 (governance)
- **Pitch docs:** Downloads\Pensaer_Scaling_Laws_Handoff.md (the "secret weapon" doc for Tramshed)
- **B2.2 fix:** Changed disjoint override_rate from 0.005*concurrency → flat 0.001 (branch max/scaling-lab-fixes-0131)
- **Live mode needs:** Benchmark API endpoints (/api/benchmark/*) not yet built on server — next priority
- **Server:** Docker stack running, FastAPI + 58 MCP tools + Rust bindings on port 8000

## Config Changes Made
- WhatsApp plugin: enabled, selfChatMode, dmPolicy allowlist
- Telegram: Configured with allowlist, Rich's ID approved (7589401638)
- Webchat: elevated tools enabled + auto-approve (elevatedDefault: "on", exec security: full, ask: off)
- Primary channel now: webchat (http://127.0.0.1:18789)

## The Senior Vibe-Coding Playbook
**Core principle:** A senior dev isn't faster because they type faster. They're faster because they reduce time-to-orientation, avoid bad edits (blast-radius control), run quality checks automatically, and create reusable workflows.

### Key Rules
1. **Treat context like infrastructure** — Every new AI session is amnesiac. Create a repo "memory" structure (`.ai/` or `docs/ai/`) with architecture overview, conventions, known gotchas, dependency map. Preload it, don't chat it.
2. **Compress system knowledge** — Don't describe the whole codebase every time. Create concise "system cards" per module: what it does, key files, constraints, how to test.
3. **Automate quality gates** — Never trust AI output without automated checks. CI, linting, type-checking, tests. The AI writes, the pipeline validates.
4. **Blast-radius control** — Scope AI edits to single files/functions. Small PRs > big PRs. The bigger the change, the more likely the AI breaks something adjacent.
5. **Reusable workflows > one-shot prompts** — Build prompt templates, task patterns, review checklists that any team member can use with AI. Team leverage, not individual heroics.
6. **Feed constraints, not just goals** — Tell AI what NOT to do (don't modify tests, don't change the API contract, don't touch the build config). Constraints prevent blast-radius disasters.
7. **Preload, don't re-explain** — If you're explaining the same thing to AI every session, it should be in a file. AGENTS.md, CONVENTIONS.md, ARCHITECTURE.md.

### Applied to Pensaer-BIM
- AGENTS.md = our preloaded context
- MEMORY.md = our persistent knowledge base
- memory/*.md = daily operational logs
- CONSTRUCTION_BIBLE.md = our system card for the build pipeline
- Sub-agent spawning = our reusable workflow pattern (task → isolated session → result)
- PR-per-feature = our blast-radius control
- `npx vitest run` in every agent = our automated quality gate

## Clawhatch Website
- **Product:** Security hardening service for OpenClaw AI agents
- **Site:** Next.js 15 + Tailwind v4 at `clawhatch/site/` → localhost:3000
- **⚠️ CRITICAL:** Edit `src/app/page.tsx` NOT `index.html` — Next.js serves page.tsx!
- **Logo:** Gemini-generated red claw from egg, transparent PNG at `public/logo-hero.png`
- **Background color:** #040b1d (sampled from logo)
- **Brand colors:** Coral #ff6b6b, Teal #00e5cc, Cyan #5ce1e6
- **Fonts:** Space Grotesk (headings), Plus Jakarta Sans (body), JetBrains Mono (code)
- **Skill:** `skills/clawhatch-web/SKILL.md` has full architecture + design rules
- **Payments:** Lemon Squeezy integration in page.tsx
- **Deploy:** Needs Vercel setup (CLA-124-127)

## Lessons Learned
- **NEVER skip tests, mock dependencies, or fake things for speed.** Always do it properly. If CI needs a Rust kernel built, build the Rust kernel. If tests need a native module, compile the native module. Rich explicitly called this out — no shortcuts, no faking, no "skip for now." Do it right or don't do it.
- **ALWAYS save important context to memory files before context gets tight** — lost an entire onboarding conversation to compaction on 2026-01-30
- User expects me to carry forward context across compactions
- Create memory directory and start writing from the FIRST conversation, not after losing everything
- Rich uses voice dictation — common mistranslations: Pennsylvania=Pensaer, Rabbit=Revit, tram shed=Tramshed, contact=context
- TTS works: generate with tts tool, play with `Start-Process` on Windows
- PowerShell on Windows hates `||`, `2>nul`, and complex string concatenation — use scripts or simple commands
- ComfyUI embedded python pip is finicky — use --only-binary=:all: for packages
- FLUX repos on HuggingFace are gated — need license acceptance + token
- WhatsApp connection can drop (status 428) — check before sending

## Rich's Hardware
- RTX 5070 (12GB VRAM), 32GB RAM
- C: drive (922GB SSD, ~181GB free), D: drive (846GB+ free)
- Docker data on D:\Docker via junctions
- ComfyUI on D:\Moved_from_C\ComfyUI_windows_portable\

## Eight Sparks Project
- AI K-pop group, 8 members: SORA, JISOO, YUNA, HANA, MIRA, NARI, DASOM, YERI
- Single recorded (8SPRX.wav, 2m05s)
- Goal: AI-generated music video with dance choreography
- Switching from SDXL to FLUX+DreamO for character consistency
- Track structure: intro→verse→chorus(0:48)→verse2→finale chorus

## ISO 19650 & BIM Knowledge (Completed Course 2026-02-02)
Completed BIM ISO 19650 Foundations course — 25/25 assessment. This knowledge is for applying to Pensaer-BIM.

### Core Concepts
- **BIM is a PROCESS not software** — technology + process + people
- **Information Model** = graphical data + non-graphical data + documentation
- **PIM** (Project Information Model) = design & construction phase → hands over to **AIM** (Asset Information Model) for operations
- **CDE** (Common Data Environment) = single source of truth. Workflow: WIP → Shared (S1-S4 suitability codes) → Published → Archived
- **Operating costs are 3-5x build costs** — whole-life information management is the entire business case

### ISO 19650 Series (5 Parts)
- **Part 1**: Concepts & principles (foundation for everything)
- **Part 2**: Delivery phase (8 activities: assessment → tender → appointment → mobilisation → production → delivery → close-out)
- **Part 3**: Operational phase (maintaining AIM, trigger events)
- **Part 4**: Information exchange (Technical Report — guidance, not normative)
- **Part 5**: Security-minded approach (triage: identify → assess → classify → apply controls → monitor)

### Information Requirements Hierarchy
OIR (organisational) → AIR (asset) / PIR (project) → EIR (exchange) — flows from strategic objectives down to specific deliverables

### Key Documents
- **EIR** = what info the client needs, when, how
- **BEP** = appointed party's plan to deliver (pre-appointment + post-appointment)
- **MIDP** = master delivery plan consolidating all TIDPs
- **TIDP** = each task team's delivery plan

### UK Context
- PAS 1192 series → internationalised as ISO 19650 (2018-2019)
- Published in UK as **BS EN ISO 19650** with UK National Annex
- **BIM Level 2 mandated** by UK Government 2016 for public-sector projects
- Uniclass 2015 = UK classification system
- **Level of Information Need** (BS EN 17412-1) replaces old LOD 100-500

### BIM Maturity Levels
- **Level 0**: Unmanaged 2D CAD
- **Level 1**: Managed CAD with standards, file-based sharing
- **Level 2**: Collaborative 3D BIM, federated models, CDE, EIR/BEP (THIS IS TABLE STAKES)
- **Level 3**: Integrated digital twin, real-time, IoT (aspirational — OUR DIFFERENTIATOR)

### BIM Dimensions
3D (geometry) → 4D (time/sequencing) → 5D (cost) → 6D (sustainability) → 7D (FM)

### Suitability Codes
S0=WIP, S1=coordination, S2=information, S3=review & comment, S4=stage approval

### Naming Convention
[Project]-[Originator]-[Volume]-[Level]-[Type]-[Discipline]-[Number]

### What This Means for Pensaer-BIM
1. We ARE building a CDE — position as ISO 19650-compliant platform
2. Must implement CDE workflow states (WIP/Shared/Published/Archived) as first-class features
3. Support EIR templates + validation against requirements
4. IFC export (PR #26) serves ISO 16739 interoperability mandate
5. Build security classification & access control per ISO 19650-5
6. PIM → AIM handover tooling is a differentiator (where most platforms fail)
7. BIM Level 2 is minimum (federated models, CDE, clash detection, IFC) — Level 3 (digital twin) is our edge
8. "Whole-life" story is THE pitch: operating costs 3-5x build costs
9. Information naming conventions should be ISO 19650 compliant
10. Level of Information Need (geometry + information + documentation) not old LOD

## Clawset (OpenClaw Setup Business)
- **What:** Automated setup wizard for OpenClaw/Clawdbot — undercutting ClawSet's $99 manual Zoom setups
- **Status:** Research phase COMPLETE (12 research docs), sprint plan written, execution starts Week 1 (Feb 3)
- **Pricing:** Free / Pro $39 one-time / Support $19/mo / Concierge $79
- **Stack:** Next.js + Tailwind + shadcn/ui on Vercel, Lemon Squeezy payments, no backend for MVP
- **Revenue target:** First dollar by end of Feb, $5K/mo by month 6-9
- **Key insight:** Wizard = acquisition funnel, subscriptions = real business
- **Files:** clawset/SPRINT-PLAN.md (execution), clawset/MISSION-CONTROL.md (status), clawset/research/ (12 docs)

## Mission Progress (as of 2026-02-02)
- 19 PRs shipped Feb 2 (#11-#29) — entire P0+P1 backlog cleared
- Sprint 1-3 all complete, now into ISO 19650 compliance features
- 4 ISO 19650 agents launched: CDE workflow, ISO naming, security classification, EIR/BEP validation
- Cockatiel v3 fix committed to main (da32158)
- CI pipeline being fixed (PR #29) — Rust kernel builds with maturin before pytest
- Demo tramshed fixed (dynamic wall IDs, clean model, room bounds, 50m grid, zoom-to-fit)
- BIM ISO 19650 course completed, knowledge in long-term memory
- pensaer.io ready for Vercel (needs push + DNS)
- Positioning shift: Pensaer-BIM is an ISO 19650-compliant CDE platform, not just a BIM tool
