# Pensaer AI-First Development Strategy

**Document Version:** 1.0
**Last Updated:** January 15, 2026
**Source:** Adapted from Maor Shlomo/Base44 Workflow Analysis ($80M Exit)

---

## Executive Summary

This document defines Pensaer's AI-first development approach, adapted from the Base44 playbook that achieved:
- 90%+ AI-generated code
- $80M acquisition in 6 months
- 6-8 person team, $0 external funding

**Core Insight:** Structure everything for LLM navigation, not human conventions.

---

## Part 1: Core Principles

### 1.1 Repository Structure for LLM Navigation

> "We structured the repository in a way that's going to be very easy for LLM to navigate through." — Maor Shlomo

| Principle | Implementation |
|-----------|---------------|
| Single monorepo | ✅ All code in `Pensaer-BIM/` |
| CLAUDE.md per module | Navigation guides for AI agents |
| Predictable naming | Consistent patterns across codebase |
| Flat where possible | Minimize deep nesting |

### 1.2 Infrastructure-as-Guardrails

> "Rather than fighting model behavior with complex prompts, Base44 aligned infrastructure with model priors."

**Pensaer Implementation:**
- MCP tools handle BIM complexity (geometry, validation, IFC)
- Agents call tools, not write raw algorithms
- Pre-defined element types with validated schemas
- Event sourcing prevents invalid states

### 1.3 Minimal Code Generation

> "The less code it writes, the fewer mistakes or confusion it can cause."

**Pensaer Approach:**
- MCP tools expose high-level operations
- Kernel handles geometry math internally
- Agents orchestrate, don't implement
- Templates for common patterns

---

## Part 2: Multi-Model Routing (January 2026)

### 2.1 Model Landscape

| Model | Strengths | Cost | Speed |
|-------|-----------|------|-------|
| **Claude Opus 4.5** | Complex reasoning, architecture, long context | $$$$ | Slower |
| **Claude Sonnet 4** | UI/frontend, balanced quality/speed | $$ | Fast |
| **Claude Haiku 4** | Simple tasks, MCP tool routing | $ | Fastest |
| GPT-4o | Instruction following, structured output | $$$ | Medium |
| Gemini 2.0 Pro | Code generation, debugging | $$$ | Medium |

### 2.2 Task-to-Model Routing

| Task Type | Primary Model | Rationale |
|-----------|---------------|-----------|
| **UI/Frontend (React)** | Sonnet 4 | "Sonnet's like the best designer" |
| **Geometry kernel (Rust)** | Opus 4.5 | Complex math, deep reasoning |
| **MCP tool implementation** | Opus 4.5 | Architectural decisions |
| **Python API routes** | Sonnet 4 | Standard patterns |
| **Quick fixes/refactors** | Haiku 4 | Speed over depth |
| **IFC parsing** | Opus 4.5 | Domain complexity |
| **Test generation** | Sonnet 4 | Pattern matching |
| **Documentation** | Sonnet 4 | Clear writing |
| **Debugging complex issues** | Gemini 2.0 | Strong at tracing |

### 2.3 Cost Optimization

> "More expensive models = lower total cost (fewer iterations, less error correction)."

**Pensaer Rule:** Default to Opus 4.5 for anything non-trivial. Use cheaper models only for:
- Repetitive tasks with established patterns
- Simple CRUD operations
- Quick UI iterations

---

## Part 3: Language Choice Trade-offs

### 3.1 Base44 Recommendation

> "Don't use TypeScript; use plain JavaScript and JSX. It's easier for models to write code this way."

**Base44 Rationale:**
- Reduced model cognitive load
- Fewer type annotation errors
- Faster iteration cycles

### 3.2 Pensaer Decision: Keep TypeScript

**We choose to keep TypeScript because:**

1. **Established codebase** - Converting would be disruptive
2. **BIM complexity** - Type safety critical for geometry and element schemas
3. **Modern model capability** - Claude Opus 4.5 handles TypeScript well
4. **Tooling benefits** - IDE autocomplete, refactoring, error detection

**Mitigation strategies:**
- Use simpler type patterns (avoid complex generics)
- Prefer `interface` over `type` for clarity
- Allow `any` in prototype code, tighten later
- Trust the model to infer types when obvious

### 3.3 Language Summary

| Component | Language | Rationale |
|-----------|----------|-----------|
| Kernel | Rust | Performance, safety critical |
| Server | Python | LLM proficiency, ecosystem |
| Client | TypeScript | Established, type safety for BIM |

---

## Part 4: Development Workflow

### 4.1 Visual-First Iteration Loop

Adapted from Base44's development cycle:

```
1. See app running (visual feedback)
2. Notice what's off
3. Describe changes in natural language
4. AI generates code
5. Errors surface in UI (not logs)
6. Iterate by prompting
```

### 4.2 Tool Separation

| Component | Development Tool | Rationale |
|-----------|-----------------|-----------|
| Rust kernel | Claude Code (Opus) | Fine-grained control |
| Python server | Claude Code (Opus/Sonnet) | Standard patterns |
| React client | Claude Code + visual iteration | UI needs feedback |
| MCP servers | Claude Code (Opus) | Critical infrastructure |

### 4.3 Deployment Velocity

> "People get attached when they see new features every few days."

**Pensaer Targets:**
- Local iteration: < 30 seconds feedback loop
- Preview deployments: On every significant change
- Feature releases: Multiple per week

---

## Part 5: Key Quotes to Remember

> "Design your SDK and infrastructure around what LLMs already do well."

> "The less code it writes, the fewer mistakes or confusion it can cause."

> "In a split second like you change one string in the code and you move like millions in spend to a different provider."

> "Spend at least 50% of your time doing what you're good at and love doing. That's your genius zone."

---

## Part 6: Success Metrics

| Metric | Target |
|--------|--------|
| AI-generated code | > 80% |
| Iteration feedback loop | < 60 seconds |
| Model routing coverage | All task types mapped |
| CLAUDE.md coverage | Every major directory |

---

## References

- [Maor Shlomo Workflow Analysis](../ai%20builder.pdf) - January 2026 deep research report
- Lenny's Podcast (July 2025)
- 20VC Podcast (November 2025)
- AI Native Dev Podcast (August 2025)

---

*Document created: January 15, 2026*
*Based on Base44 patterns adapted for Pensaer's Rust/Python/TypeScript stack*
