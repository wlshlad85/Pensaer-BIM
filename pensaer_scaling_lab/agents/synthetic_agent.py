"""Synthetic agent policy for governance experiments."""

from __future__ import annotations

import random
from dataclasses import dataclass


@dataclass
class AgentOp:
    op_id: str
    template: str
    approvals_required: bool
    approvals_latency_ms: int
    rollback: bool
    rollback_reason: str | None
    constraint_violation: bool
    override: bool
    validation_issue_severity: int


class SyntheticAgent:
    templates = ["layout_house", "add_doors_windows", "fix_validation_issues"]

    def __init__(self, seed: int, permission_profile: str, error_mode: str | None = None):
        self.rng = random.Random(seed)
        self.permission_profile = permission_profile
        self.error_mode = error_mode or "none"

    def generate_op(self, op_index: int, bulk_threshold: int, approval_latency_ms: int) -> AgentOp:
        template = self.rng.choice(self.templates)
        approvals_required = op_index >= bulk_threshold

        rollback = False
        rollback_reason = None
        constraint_violation = False
        override = False
        validation_issue_severity = 0

        # Permission profile influences error rates
        base_error = {
            "narrow": 0.02,
            "medium": 0.05,
            "broad": 0.08,
        }.get(self.permission_profile, 0.05)

        if self.error_mode == "high":
            base_error *= 2

        if self.rng.random() < base_error:
            constraint_violation = True
            validation_issue_severity = self.rng.randint(1, 3)

        if self.rng.random() < base_error / 2:
            override = True

        if constraint_violation and self.rng.random() < 0.3:
            rollback = True
            rollback_reason = "constraint_violation"

        return AgentOp(
            op_id=f"agent_op_{op_index}",
            template=template,
            approvals_required=approvals_required,
            approvals_latency_ms=approval_latency_ms if approvals_required else 0,
            rollback=rollback,
            rollback_reason=rollback_reason,
            constraint_violation=constraint_violation,
            override=override,
            validation_issue_severity=validation_issue_severity,
        )
