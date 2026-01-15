# ADR-20260115-ifc-import-export

Date: 2026-01-15
Status: Accepted
Decision: Use IfcOpenShell for IFC 4.3 import/export in MVP; defer a native parser.

Context:
- IFC 4.3 support is required early for interoperability.
- Building a native parser is high effort and high risk for MVP timelines.

Decision:
- Implement IFC import/export via IfcOpenShell for MVP.
- Defer native IFC parser until after MVP validation.

Consequences:
- Faster delivery of IFC round-trip capability.
- External dependency for IFC correctness and version coverage.
- Later migration plan needed if a native parser becomes required.

Alternatives considered:
- Native IFC parser in Rust (higher control, slower delivery).
- No IFC support in MVP (unacceptable interoperability gap).
