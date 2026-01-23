# Pensaer Phase 2 PRD: Collaboration

## Objective
Enable real-time, multi-user collaboration with CRDT synchronization while preserving the event-sourced model and the "single authoritative state" invariant.

## Goals
- Real-time multi-user editing with automatic conflict resolution.
- Offline-first editing with 24+ hours tolerance.
- <100ms sync latency under typical network conditions.
- Role-based sharing and permissions for projects.
- Clear change attribution and auditability.

## Non-Goals
- Production hardening, performance scaling, or security audits (Phase 4).
- Full agentic AI workflows (Phase 3).
- Advanced 3D rendering upgrades beyond Phase 1 scope.

## Success Metrics
- CRDT sync latency: <100ms.
- Concurrent users: 10+.
- Offline tolerance: 24+ hours.
- Conflict resolution: automatic with LWW + audit trail.

## Constraints and Decisions
- CRDT: Loro (Rust-native movable tree CRDT).
- Database: PostgreSQL 16 + PostGIS + pgvector.
- Transport: WebSocket + SSE.
- Auth: Supabase (email + Google OAuth).
- Keep all changes event-sourced and replayable.

## Milestones (Weeks 13-24)
1. Cloud infrastructure and auth.
2. Event store and snapshots.
3. CRDT integration and sync transport.
4. Real-time presence and attribution.
5. Collaboration UX (comments, branching, merge).
6. Thin read-only viewer and sharing.

## Tasks
- [ ] Add Supabase configuration loader and env template in server.
- [ ] Implement Supabase auth flows (email + Google OAuth) in server.
- [ ] Add project and document schema migrations (projects, documents, permissions).
- [ ] Implement permission checks for project access in server requests.
- [ ] Create append-only event_log table and server write API.
- [ ] Add snapshot table and snapshotting job (every 1000 events or 1 hour).
- [ ] Implement event replay API to rebuild model state from event_log.
- [ ] Add versioning tables and APIs for branches and tags.
- [ ] Implement base Loro document model in `kernel/pensaer-crdt`.
- [ ] Add server-side CRDT sync module for Loro updates.
- [ ] Create WebSocket gateway for CRDT updates and presence.
- [ ] Add `app/src/collaboration` scaffolding (provider, sync, presence).
- [ ] Implement client Loro provider with IndexedDB persistence.
- [ ] Add offline queue and conflict policy (LWW + audit) on client.
- [ ] Add presence indicators UI (avatars, active list).
- [ ] Add cursor sharing and selection broadcasting.
- [ ] Add change attribution to UI and event metadata.
- [ ] Implement comments/markup data model and panel UI.
- [ ] Add design option branching UI and server endpoints.
- [ ] Implement change history diff viewer.
- [ ] Implement merge UI for branches with conflict summary.
- [ ] Add read-only viewer route with share token support.
- [ ] Make viewer mobile responsive and add embed mode.
- [ ] Add share link creation flow with permission presets.
- [ ] Add tests for event store, CRDT merge, and WebSocket sync.
