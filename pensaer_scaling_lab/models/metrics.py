"""Core metric models for Pensaer Scaling Lab.

This module defines the instrumentation schema for capturing operation-level
metrics during scaling experiments. All timing values are in milliseconds.

Key Metrics:
- TVC_ms: Time-to-Verified-Change = t_validation_done - t_intent_start
- regen_ms: Regeneration time = t_regen_done - t_kernel_commit
- validation_ms: Validation time = t_validation_done - t_regen_done
- VCSR: Verified Change Success Rate (no rollback and validation passes)
- RM100: Rework Minutes per 100 operations (weighted penalty score)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any
from uuid import uuid4


# =============================================================================
# Enums
# =============================================================================


class ActorType(str, Enum):
    """Type of actor performing an operation."""
    HUMAN = "human"
    AGENT = "agent"
    BOT = "bot"  # For collaboration scaling tests
    SYSTEM = "system"


class ChangeProfile(str, Enum):
    """Type of change being applied."""
    MODIFY_PARAMETER = "modify_parameter"
    MOVE_ELEMENT = "move_element"
    CREATE_ELEMENT = "create_element"
    DELETE_ELEMENT = "delete_element"
    BATCH_MODIFY = "batch_modify"


class SizeTier(str, Enum):
    """Model size tiers for synthetic generation."""
    SMALL = "small"      # ~1,000 elements
    MEDIUM = "medium"    # ~10,000 elements
    LARGE = "large"      # ~100,000 elements
    XLARGE = "xlarge"    # ~1,000,000 elements


class DependencyProfile(str, Enum):
    """Dependency complexity profile."""
    SHALLOW = "shallow"  # Minimal dependencies, mostly independent elements
    DEEP = "deep"        # Heavy constraint dependencies, cascading changes


class Distribution(str, Enum):
    """Spatial distribution of changes."""
    CLUSTERED = "clustered"    # Changes in a localized area
    DISPERSED = "dispersed"    # Changes spread across the model


class PermissionProfile(str, Enum):
    """Agent permission scope for governance experiments."""
    NARROW = "narrow"    # Limited element types, strict constraints
    MEDIUM = "medium"    # Moderate permissions
    BROAD = "broad"      # Wide permissions, minimal constraints


class CollaborationScenario(str, Enum):
    """Scenario types for collaboration experiments."""
    DISJOINT_EDITS = "disjoint_edits"    # Users edit different elements
    SAME_WALL_EDITS = "same_wall_edits"  # Multiple users edit same wall
    HOST_COLLISION = "host_collision"    # Hosted element conflicts


# =============================================================================
# Operation Metrics (per-operation instrumentation)
# =============================================================================


@dataclass
class OperationMetrics:
    """Metrics captured for a single operation.

    This is the core instrumentation record. Each operation in an experiment
    produces one OperationMetrics instance.

    Timing fields (all in milliseconds, Unix epoch):
    - t_intent_start: When user/agent expressed intent
    - t_kernel_commit: When kernel committed the change
    - t_regen_done: When regeneration completed
    - t_validation_done: When validation completed
    """

    # Identity
    op_id: str = field(default_factory=lambda: str(uuid4()))
    op_type: ChangeProfile = ChangeProfile.MODIFY_PARAMETER
    branch_id: str = ""
    model_id: str = ""

    # Actor
    actor_type: ActorType = ActorType.HUMAN
    actor_id: str = ""

    # Timing (milliseconds, Unix epoch * 1000)
    t_intent_start: float = 0.0
    t_kernel_commit: float = 0.0
    t_regen_done: float = 0.0
    t_validation_done: float = 0.0

    # Scope
    affected_element_count: int = 0
    affected_element_ids: list[str] = field(default_factory=list)
    dependency_depth: int = 0  # Max depth of dependency chain traversed

    # Conflicts
    conflicts_encountered: int = 0
    conflicts_resolved: int = 0

    # Outcome
    rollback: bool = False
    rollback_reason: str | None = None
    validation_passed: bool = True
    validation_issues: list[dict[str, Any]] = field(default_factory=list)

    # Governance
    approvals_required: bool = False
    approvals_latency_ms: float = 0.0
    permission_check_passed: bool = True

    # Collaboration
    sync_latency_ms: float = 0.0
    override_occurred: bool = False

    # Metadata
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = field(default_factory=dict)

    # Computed properties
    @property
    def TVC_ms(self) -> float:
        """Time-to-Verified-Change in milliseconds."""
        if self.t_validation_done and self.t_intent_start:
            return self.t_validation_done - self.t_intent_start
        return 0.0

    @property
    def regen_ms(self) -> float:
        """Regeneration time in milliseconds."""
        if self.t_regen_done and self.t_kernel_commit:
            return self.t_regen_done - self.t_kernel_commit
        return 0.0

    @property
    def validation_ms(self) -> float:
        """Validation time in milliseconds."""
        if self.t_validation_done and self.t_regen_done:
            return self.t_validation_done - self.t_regen_done
        return 0.0

    @property
    def is_success(self) -> bool:
        """Whether this operation succeeded (no rollback, validation passed)."""
        return not self.rollback and self.validation_passed

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "op_id": self.op_id,
            "op_type": self.op_type.value,
            "branch_id": self.branch_id,
            "model_id": self.model_id,
            "actor_type": self.actor_type.value,
            "actor_id": self.actor_id,
            "t_intent_start": self.t_intent_start,
            "t_kernel_commit": self.t_kernel_commit,
            "t_regen_done": self.t_regen_done,
            "t_validation_done": self.t_validation_done,
            "TVC_ms": self.TVC_ms,
            "regen_ms": self.regen_ms,
            "validation_ms": self.validation_ms,
            "affected_element_count": self.affected_element_count,
            "dependency_depth": self.dependency_depth,
            "conflicts_encountered": self.conflicts_encountered,
            "conflicts_resolved": self.conflicts_resolved,
            "rollback": self.rollback,
            "rollback_reason": self.rollback_reason,
            "validation_passed": self.validation_passed,
            "approvals_required": self.approvals_required,
            "approvals_latency_ms": self.approvals_latency_ms,
            "sync_latency_ms": self.sync_latency_ms,
            "override_occurred": self.override_occurred,
            "is_success": self.is_success,
            "timestamp": self.timestamp.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "OperationMetrics":
        """Create from dictionary."""
        return cls(
            op_id=data.get("op_id", str(uuid4())),
            op_type=ChangeProfile(data.get("op_type", "modify_parameter")),
            branch_id=data.get("branch_id", ""),
            model_id=data.get("model_id", ""),
            actor_type=ActorType(data.get("actor_type", "human")),
            actor_id=data.get("actor_id", ""),
            t_intent_start=data.get("t_intent_start", 0.0),
            t_kernel_commit=data.get("t_kernel_commit", 0.0),
            t_regen_done=data.get("t_regen_done", 0.0),
            t_validation_done=data.get("t_validation_done", 0.0),
            affected_element_count=data.get("affected_element_count", 0),
            dependency_depth=data.get("dependency_depth", 0),
            conflicts_encountered=data.get("conflicts_encountered", 0),
            conflicts_resolved=data.get("conflicts_resolved", 0),
            rollback=data.get("rollback", False),
            rollback_reason=data.get("rollback_reason"),
            validation_passed=data.get("validation_passed", True),
            approvals_required=data.get("approvals_required", False),
            approvals_latency_ms=data.get("approvals_latency_ms", 0.0),
            sync_latency_ms=data.get("sync_latency_ms", 0.0),
            override_occurred=data.get("override_occurred", False),
        )


# =============================================================================
# Computed Metrics (aggregated from operations)
# =============================================================================


@dataclass
class ComputedMetrics:
    """Aggregated metrics computed from a collection of operations.

    Metrics:
    - VCSR: Verified Change Success Rate (successful ops / total ops)
    - RM100: Rework Minutes per 100 operations (weighted penalty score)
    """

    total_operations: int = 0
    successful_operations: int = 0

    # Rollback stats
    rollback_count: int = 0
    rollback_rate: float = 0.0

    # Validation stats
    validation_failures: int = 0
    constraint_violations: int = 0

    # Override stats (for collaboration)
    override_count: int = 0
    override_rate: float = 0.0

    # Timing percentiles (ms)
    TVC_p50: float = 0.0
    TVC_p95: float = 0.0
    TVC_p99: float = 0.0
    regen_p50: float = 0.0
    regen_p95: float = 0.0
    validation_p50: float = 0.0
    validation_p95: float = 0.0

    # Sync latency (for collaboration)
    sync_latency_p50: float = 0.0
    sync_latency_p95: float = 0.0

    # Conflict stats
    conflicts_per_min: float = 0.0

    @property
    def VCSR(self) -> float:
        """Verified Change Success Rate (0-1)."""
        if self.total_operations == 0:
            return 0.0
        return self.successful_operations / self.total_operations

    @property
    def RM100(self) -> float:
        """Rework Minutes per 100 operations.

        Weighted penalty scoring:
        - rollback: +5 points
        - constraint_violation: +2 points
        - override: +1 point
        - validation_issue: weighted by severity (1-5)
        """
        if self.total_operations == 0:
            return 0.0

        penalty = (
            self.rollback_count * 5 +
            self.constraint_violations * 2 +
            self.override_count * 1 +
            self.validation_failures * 3
        )

        # Normalize to per-100 operations
        return (penalty / self.total_operations) * 100

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "total_operations": self.total_operations,
            "successful_operations": self.successful_operations,
            "VCSR": self.VCSR,
            "RM100": self.RM100,
            "rollback_count": self.rollback_count,
            "rollback_rate": self.rollback_rate,
            "validation_failures": self.validation_failures,
            "constraint_violations": self.constraint_violations,
            "override_count": self.override_count,
            "override_rate": self.override_rate,
            "TVC_p50": self.TVC_p50,
            "TVC_p95": self.TVC_p95,
            "TVC_p99": self.TVC_p99,
            "regen_p50": self.regen_p50,
            "regen_p95": self.regen_p95,
            "validation_p50": self.validation_p50,
            "validation_p95": self.validation_p95,
            "sync_latency_p50": self.sync_latency_p50,
            "sync_latency_p95": self.sync_latency_p95,
            "conflicts_per_min": self.conflicts_per_min,
        }


# =============================================================================
# Experiment Configuration
# =============================================================================


@dataclass
class ExperimentConfig:
    """Configuration for a scaling experiment."""

    experiment_id: str = ""
    experiment_type: str = ""  # B2.1, B2.2, B2.3

    # Model configuration
    size_tier: SizeTier = SizeTier.SMALL
    dependency_profile: DependencyProfile = DependencyProfile.SHALLOW
    seed: int = 42

    # Run parameters
    warmup_ops: int = 20
    repetitions: int = 3

    # Experiment-specific parameters stored as dict
    parameters: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "experiment_id": self.experiment_id,
            "experiment_type": self.experiment_type,
            "size_tier": self.size_tier.value,
            "dependency_profile": self.dependency_profile.value,
            "seed": self.seed,
            "warmup_ops": self.warmup_ops,
            "repetitions": self.repetitions,
            "parameters": self.parameters,
        }


# =============================================================================
# Verdict Gates
# =============================================================================


@dataclass
class VerdictGate:
    """A single pass/fail gate for experiment verdict."""

    name: str
    description: str
    threshold: float
    actual_value: float
    passed: bool
    comparison: str = "<="  # <=, >=, <, >, ==

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "description": self.description,
            "threshold": self.threshold,
            "actual_value": self.actual_value,
            "passed": self.passed,
            "comparison": self.comparison,
        }


@dataclass
class VerdictResult:
    """Overall verdict for an experiment run."""

    experiment_id: str
    experiment_type: str
    timestamp: datetime = field(default_factory=datetime.utcnow)

    gates: list[VerdictGate] = field(default_factory=list)

    overall_passed: bool = False
    summary: str = ""

    metrics: ComputedMetrics | None = None
    config: ExperimentConfig | None = None

    @property
    def gates_passed(self) -> int:
        """Number of gates that passed."""
        return sum(1 for g in self.gates if g.passed)

    @property
    def gates_total(self) -> int:
        """Total number of gates."""
        return len(self.gates)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "experiment_id": self.experiment_id,
            "experiment_type": self.experiment_type,
            "timestamp": self.timestamp.isoformat(),
            "gates": [g.to_dict() for g in self.gates],
            "gates_passed": self.gates_passed,
            "gates_total": self.gates_total,
            "overall_passed": self.overall_passed,
            "summary": self.summary,
            "metrics": self.metrics.to_dict() if self.metrics else None,
            "config": self.config.to_dict() if self.config else None,
        }


# =============================================================================
# Experiment Result
# =============================================================================


@dataclass
class ExperimentResult:
    """Complete result of an experiment run."""

    config: ExperimentConfig
    operations: list[OperationMetrics] = field(default_factory=list)
    computed_metrics: ComputedMetrics | None = None
    verdict: VerdictResult | None = None

    start_time: datetime = field(default_factory=datetime.utcnow)
    end_time: datetime | None = None

    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "config": self.config.to_dict(),
            "operations_count": len(self.operations),
            "computed_metrics": self.computed_metrics.to_dict() if self.computed_metrics else None,
            "verdict": self.verdict.to_dict() if self.verdict else None,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "errors": self.errors,
            "warnings": self.warnings,
        }
