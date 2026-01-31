# Soul: MCP Constitution (Layer C — Tool Surface)

**Scope:** MCP servers, tool contracts, governance gates, approval flows.

---

## Tool Surface Contract

### Protocol

- **Standard:** MCP (Model Context Protocol)
- **Transport:** JSON-RPC 2.0 over stdio or SSE
- **Servers:** 4 (geometry, spatial, validation, documentation)
- **Total tools:** 33+

### Response Envelope (Universal)

Every tool returns:
```json
{
  "success": true|false,
  "data": {},
  "event_id": "uuid|null",
  "timestamp": "ISO-8601",
  "warnings": [],
  "audit": {
    "user_id": "uuid",
    "agent_id": "uuid|null",
    "reasoning": "string|null"
  }
}
```

**Invariants:**
1. Every mutation produces a non-null `event_id`.
2. Every agent call includes non-null `audit.agent_id` and `audit.reasoning`.
3. Read-only tools (spatial queries, validation checks) may have null `event_id`.
4. `warnings` is always an array, even if empty.
5. Error responses have `success: false` with structured `error: {code, message, data}`.

### Tool Categories

**Geometry (12 tools) — Mutating:**
All create/modify/move/copy tools emit events. Parameters are in mm (API level) or meters (DSL level). The API normalizes.

**Spatial (8 tools) — Read-only:**
Query tools that derive answers from model state. They never mutate. They reflect current state — not cached state.

**Validation (8 tools) — Read-only with side effects:**
Validation runs produce results but also record the validation event (for audit trail). Compliance results reference a `validation_run_id`.

**Documentation (7 tools) — Mutating (views/exports):**
View creation and export produce artifacts and events. Exports must reflect current model state at time of export.

---

## Governance Gates

### Permission Model

```
AgentPermissions {
  agent_id: UUID
  permissions: { Permission → PermissionScope }
  requires_approval: [EventType]
  max_elements_per_operation: int (default 100)
  max_operations_per_session: int (default 1000)
}
```

**Permissions:** READ, CREATE, MODIFY, DELETE, APPROVE  
**Scopes:** categories (element types), levels (floors), regions (bounding boxes), branch_patterns (glob)

### Approval Flows

| Trigger | Condition | Flow |
|---------|-----------|------|
| **Destructive operation** | `element.deleted` or `branch.merged` | → Approval gate → Human confirms → Execute or reject |
| **Bulk operation** | > 50 elements affected | → Approval gate → Human reviews count + scope → Confirm |
| **Cross-scope access** | Agent requests outside permission scope | → Blocked. No escalation path — scope must be expanded by admin. |
| **Rate limit exceeded** | > max_elements_per_operation or > max_operations_per_session | → Blocked with error. Agent must wait or request limit increase. |

### Dry-Run Mode

All mutating tools support dry-run:
- Agent can preview the change without committing.
- Dry-run returns the same response envelope but with `event_id: null` and a `dry_run: true` flag.
- Default: dry-run ON for agents, OFF for direct human users. Operators can override.

---

## Tool-Specific Contracts

### Geometry Server

- `create_wall`: Must validate start ≠ end. Must assign element to active branch. Emits `element.created`.
- `place_door`/`place_window`: Must validate offset + width ≤ wall length. Must validate host wall exists. Emits `element.created` + `element.hosted`.
- `boolean_operation`: Must validate both elements exist and are on same branch. CSG operations are commutative for union, not for subtract.
- `modify_parameter`: Must validate parameter name exists for element type. Emits `element.modified`. Triggers regen for affected subgraph.
- `move_element`/`copy_element`: Must validate target location is within model bounds. Copy emits `element.created` for new element.

### Validation Server

- `code_compliance`: Must specify `standard` and `severity_threshold`. Returns `issues[]` with structured violations. **Never returns "compliant" without actually running checks.**
- `clash_detection`: Broad-phase + narrow-phase. Returns `clashes[]` with element pair, location, overlap volume, and clash type.
- All validation tools record `validation_run_id` in their response for traceability.

### Documentation Server

- `export_ifc`: Must specify schema version (IFC2x3, IFC4, IFC4.3). Export reflects model state at invocation time. Returns file path.
- `generate_schedule`: Derives from model state. Never caches schedule data independently.

---

## Error Codes

| Range | Category |
|-------|----------|
| 1000–1099 | Parameter validation errors |
| 1100–1199 | Constraint violations |
| 1200–1299 | Permission/governance errors |
| 1300–1399 | State consistency errors |
| 1400–1499 | External system errors |

---

*This constitution governs all code in `server/mcp-servers/`. Tools that violate these contracts are bugs.*
