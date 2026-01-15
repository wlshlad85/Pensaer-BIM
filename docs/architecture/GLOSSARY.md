# Pensaer: Canonical Glossary

**Version:** 1.0 | **Date:** January 15, 2026  
**Status:** Authoritative Reference  
**Source:** Merged from pensaer-a project documentation

---

## Core Concepts

| Term | Definition | ❌ Don't Use |
|------|------------|-------------|
| **regen engine** | The constraint solver that propagates changes through the element graph, maintaining model consistency | regeneration, change propagation, parametric engine |
| **event store** | Append-only PostgreSQL log of all model mutations | transaction log, event log, event sourcing database |
| **sync runtime** | Loro CRDT + WebSocket layer for real-time collaboration | CRDT sync, collaboration layer, real-time sync |
| **model server** | The Layer B service providing event store, snapshots, branches, and sync | BIM server, truth layer |
| **model kernel** | The Layer A Rust core with element graph, constraints, and regen | BIM kernel, core engine |
| **agent runtime** | The Layer C MCP servers + LangGraph orchestration + governance | AI layer, automation runtime |

---

## Architecture Terms

| Term | Definition |
|------|------------|
| **Layer A** | Model kernel (element graph, constraints, regen) |
| **Layer B** | Model server (events, snapshots, branches, sync) |
| **Layer C** | Agent runtime (MCP, orchestration, governance) |
| **sacred invariant** | "All outputs must remain consistent projections of a single authoritative model state" |
| **context-driven propagation** | Regen scales with change size, not model size |

---

## Technology References

| Term | Refers To | Notes |
|------|-----------|-------|
| **MCP** | Model Context Protocol (JSON-RPC 2.0 tool standard) | Primary AI integration |
| **Loro** | Canonical CRDT library (Rust-native, Movable Tree) | **NOT Yjs/Automerge** |
| **actix-rs** | Canonical Rust actor framework | **NOT Orleans** |
| **LangGraph** | Canonical agent orchestration framework | **NOT CrewAI** |
| **pgvector** | PostgreSQL vector extension for semantic search | **NOT separate vector DB** |

---

## Commands & Interfaces

| Term | Definition |
|------|------------|
| **NL mode** | Natural language command interpretation (triggered by `#` prefix) |
| **structured command** | Explicit CLI with flags: `pensaer select --category Walls` |
| **agent mode** | AI-driven workflow execution: `pensaer #create office layout` |

---

## Events & Operations

| Term | Definition |
|------|------------|
| **event** | Immutable record of a model mutation |
| **aggregate** | Entity that events apply to (e.g., a wall) |
| **snapshot** | Materialized state at a point in the event sequence |
| **branch** | Parallel development line (git-style semantics) |
| **merge** | Combining branches via CRDT conflict resolution |

---

## Governance

| Term | Definition |
|------|------------|
| **approval gate** | Human confirmation required before execution |
| **permission scope** | Categories/levels/regions an agent can modify |
| **audit trail** | Immutable log of all agent actions with reasoning |
| **dry-run** | Preview changes without committing |

---

## BIM Domain

| Term | Definition |
|------|------------|
| **host** | Element that contains another (wall hosts door) |
| **join** | Connection between elements (wall-to-wall corner) |
| **constraint** | Parametric rule (door centered in wall) |
| **level** | Horizontal reference plane (floor) |
| **category** | Element type classification (Walls, Doors, Floors) |

---

## Standards

| Abbreviation | Full Name |
|--------------|-----------|
| **IFC** | Industry Foundation Classes (ISO 16739-1:2024) |
| **BCF** | BIM Collaboration Format |
| **bSDD** | buildingSMART Data Dictionary |
| **IDS** | Information Delivery Specification |
| **ISO 19650** | Information management using BIM |

---

## Usage Guidelines

1. **Always use canonical terms** in code, docs, and conversation
2. **Capitalize** proper names: Loro, LangGraph, Claude
3. **Lowercase** generic terms: regen engine, event store, sync runtime
4. **Avoid** marketing language: "AI-powered", "next-gen", "revolutionary"
5. **Be precise**: "MCP tool" not "AI function", "event" not "change"

---

*When writing documentation, code comments, or discussing architecture, use these terms consistently.*
