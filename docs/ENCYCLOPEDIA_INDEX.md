# Pensaer Engineering Encyclopedia

> **The complete reference for everything in Pensaer-BIM.**  
> CTO Office | 2 February 2026 | ~280KB total

---

## Parts

| Part | Title | Size | What It Covers |
|------|-------|------|----------------|
| [1](ENCYCLOPEDIA_PART1_PLATFORM.md) | Platform Overview & Architecture | 33KB | Three-layer architecture, data flow, state management, Docker, ADRs, glossary |
| [2](ENCYCLOPEDIA_PART2_ELEMENTS.md) | Every BIM Element | 71KB | All 14 element types: interfaces, DSL, handlers, MCP tools, 3D, validation, maturity scores |
| [3](ENCYCLOPEDIA_PART3_COMMANDS.md) | Every Command & Tool | ~40KB | DSL parser, 18 handlers, 61 MCP tools, executor bridge, macros, terminal flow |
| [4](ENCYCLOPEDIA_PART4_TESTING.md) | Testing & Fail-Proofing | 48KB | Test pyramid, quality gates, golden path, PR checklist, anti-patterns, coverage map, CI/CD |
| [5](ENCYCLOPEDIA_PART5_RUST_KERNEL.md) | Rust Kernel | 16KB | 4 crates, 14K lines: math, geometry, CRDT, IFC. Every module and public function |
| [6](ENCYCLOPEDIA_PART6_ROADMAP_FEATURES.md) | Every Feature We'll Build | 24KB | 25+ features with build spec, test plan, quality gate, and scrutiny checklist |
| [7](ENCYCLOPEDIA_PART7_PYTHON_SERVER.md) | Python Server & MCP | 79KB | FastAPI, 4 MCP servers, 61 tools, API endpoints, DB schema, testing |

## Quick Links

- **"How do I build X?"** → [Part 6: Roadmap Features](ENCYCLOPEDIA_PART6_ROADMAP_FEATURES.md)
- **"What element types exist?"** → [Part 2: Elements](ENCYCLOPEDIA_PART2_ELEMENTS.md)
- **"What commands are available?"** → [Part 3: Commands](ENCYCLOPEDIA_PART3_COMMANDS.md)
- **"How do I test this?"** → [Part 4: Testing](ENCYCLOPEDIA_PART4_TESTING.md)
- **"How does the kernel work?"** → [Part 5: Rust Kernel](ENCYCLOPEDIA_PART5_RUST_KERNEL.md)
- **"What's the architecture?"** → [Part 1: Platform](ENCYCLOPEDIA_PART1_PLATFORM.md)
- **"What MCP tools exist?"** → [Part 7: Python Server](ENCYCLOPEDIA_PART7_PYTHON_SERVER.md)

## Companion Documents

| Document | Purpose |
|----------|---------|
| [CONSTRUCTION_BIBLE.md](../CONSTRUCTION_BIBLE.md) | Canonical construction workflow (9 phases) |
| [BACKLOG.md](../BACKLOG.md) | 29 prioritized engineering tickets |
| [GAPS.md](../GAPS.md) | 13 gaps between bible and reality |
| [ROADMAP.md](ROADMAP.md) | 48-week strategic timeline |
| [TEST_REPORT.md](../TEST_REPORT.md) | House-building test results |
