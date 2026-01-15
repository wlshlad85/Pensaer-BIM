# ADR-20260115-viewer-webgl-first

Date: 2026-01-15
Status: Accepted
Decision: Ship a WebGL viewer first; keep WebGPU as a migration path.

Context:
- Viewer is needed for early validation and demos.
- WebGL is widely supported and stable across browsers.
- WebGPU is newer and still stabilizing in tooling.

Decision:
- Build the MVP viewer on WebGL.
- Keep the rendering abstraction compatible with a later WebGPU upgrade.

Consequences:
- Faster cross-browser availability.
- Slightly lower performance ceiling until WebGPU migration.

Alternatives considered:
- WebGPU-only viewer in MVP (higher risk).
