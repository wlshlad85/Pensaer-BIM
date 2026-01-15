# ADR-20260115-governance-audit-gates

Date: 2026-01-15
Status: Accepted
Decision: Govern agent actions with permissions, approval gates, and audit logs.

Context:
- Agents are first-class users and can execute destructive operations.
- Users need trust, traceability, and reversibility for automated changes.

Decision:
- Require tool-level permissions and approval gates for destructive actions.
- Provide dry-run previews and diffs before execution.
- Store immutable audit logs for all agent actions and tool calls.

Consequences:
- Safer automation and higher user trust.
- Additional implementation effort in tooling and UX.
- Clear compliance story for enterprise use.

Alternatives considered:
- Trust-by-default agent execution (unacceptable risk).
- Manual-only automation (defeats the agentic goal).
