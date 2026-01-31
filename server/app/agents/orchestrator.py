"""
LangGraph orchestration engine.
Implements the plan → execute → validate → commit state machine
with multi-agent coordination and governance enforcement.
"""
from __future__ import annotations

from typing import Any, Callable, Protocol
from uuid import uuid4

from .state import (
    ActionResult,
    AgentPhase,
    AgentState,
    PlannedAction,
    OperationType,
    classify_operation,
    route_tool,
)


class GovernanceMiddleware(Protocol):
    """Protocol for governance checks."""

    def check_permission(self, state: AgentState, action: PlannedAction) -> tuple[bool, str]: ...
    def check_approval_required(self, state: AgentState, action: PlannedAction) -> tuple[bool, str]: ...
    def check_rate_limit(self, state: AgentState) -> tuple[bool, str]: ...
    def log_action(self, state: AgentState, action: PlannedAction, result: ActionResult) -> None: ...


class ToolExecutor(Protocol):
    """Protocol for MCP tool execution."""

    def execute(self, server: str, tool_name: str, parameters: dict[str, Any], dry_run: bool) -> ActionResult: ...


class AgentOrchestrator:
    """
    State machine orchestrating the agent lifecycle:
    plan → execute (dry-run) → validate → [approval] → commit

    Each node in the graph is a phase handler.
    Edges are determined by governance checks.
    """

    def __init__(
        self,
        governance: GovernanceMiddleware,
        executor: ToolExecutor,
        planner: Callable[[AgentState], list[PlannedAction]] | None = None,
        validator: Callable[[AgentState], list[dict[str, Any]]] | None = None,
    ):
        self.governance = governance
        self.executor = executor
        self.planner = planner
        self.validator = validator

        # LangGraph-style node registry
        self._nodes: dict[AgentPhase, Callable[[AgentState], AgentState]] = {
            AgentPhase.PLAN: self._plan_node,
            AgentPhase.EXECUTE: self._execute_node,
            AgentPhase.VALIDATE: self._validate_node,
            AgentPhase.COMMIT: self._commit_node,
            AgentPhase.AWAITING_APPROVAL: self._approval_node,
        }

    async def run(self, state: AgentState) -> AgentState:
        """Run the full orchestration cycle."""
        while state.phase not in (AgentPhase.COMPLETED, AgentPhase.FAILED, AgentPhase.ESCALATED):
            handler = self._nodes.get(state.phase)
            if handler is None:
                state.transition(AgentPhase.FAILED)
                break
            state = handler(state)
        return state

    def _plan_node(self, state: AgentState) -> AgentState:
        """Plan phase: generate actions from user request."""
        if self.planner:
            state.planned_actions = self.planner(state)
        
        # Classify and route each action
        for action in state.planned_actions:
            action.operation_type = classify_operation(action.tool_name)
            action.server = route_tool(action.tool_name)
        
        # Check forbidden actions
        for action in state.planned_actions:
            if action.operation_type == OperationType.DELETE:
                ok, reason = self.governance.check_approval_required(state, action)
                if ok:
                    state.approval_required = True
                    state.approval_reason = reason

        state.transition(AgentPhase.EXECUTE)
        return state

    def _execute_node(self, state: AgentState) -> AgentState:
        """Execute phase: dry-run all planned actions."""
        # Rate limit check
        ok, reason = self.governance.check_rate_limit(state)
        if not ok:
            state.escalation_reason = reason
            state.transition(AgentPhase.ESCALATED)
            return state

        for action in state.planned_actions:
            # Permission check
            ok, reason = self.governance.check_permission(state, action)
            if not ok:
                state.dry_run_results.append(ActionResult(
                    action_id=action.action_id,
                    success=False,
                    error=f"Permission denied: {reason}",
                ))
                continue

            # Always dry-run first for agents
            result = self.executor.execute(
                server=action.server,
                tool_name=action.tool_name,
                parameters=action.parameters,
                dry_run=True,
            )
            state.dry_run_results.append(result)
            self.governance.log_action(state, action, result)

        state.transition(AgentPhase.VALIDATE)
        return state

    def _validate_node(self, state: AgentState) -> AgentState:
        """Validate phase: check dry-run results and run validation tools."""
        # Check all dry-runs succeeded
        all_ok = all(r.success for r in state.dry_run_results)
        if not all_ok:
            state.validation_passed = False
            state.transition(AgentPhase.FAILED)
            return state

        # Run custom validator if provided
        if self.validator:
            state.validation_results = self.validator(state)
            state.validation_passed = all(
                v.get("passed", False) for v in state.validation_results
            )
        else:
            state.validation_passed = True

        if not state.validation_passed:
            state.transition(AgentPhase.FAILED)
            return state

        # Check if approval needed
        if state.approval_required:
            state.transition(AgentPhase.AWAITING_APPROVAL)
        else:
            state.transition(AgentPhase.COMMIT)
        return state

    def _approval_node(self, state: AgentState) -> AgentState:
        """Approval gate: wait for human approval."""
        if state.approval_granted:
            state.transition(AgentPhase.COMMIT)
        else:
            # In real implementation, this would pause and wait
            # For now, mark as escalated
            state.escalation_reason = f"Awaiting approval: {state.approval_reason}"
            state.transition(AgentPhase.ESCALATED)
        return state

    def _commit_node(self, state: AgentState) -> AgentState:
        """Commit phase: execute for real (dry_run=False)."""
        for action in state.planned_actions:
            ok, _ = self.governance.check_permission(state, action)
            if not ok:
                continue

            result = self.executor.execute(
                server=action.server,
                tool_name=action.tool_name,
                parameters=action.parameters,
                dry_run=False,
            )
            state.execution_results.append(result)
            state.operation_count += 1
            self.governance.log_action(state, action, result)

            if not result.success:
                state.transition(AgentPhase.FAILED)
                return state

        state.transition(AgentPhase.COMPLETED)
        return state


# --- Multi-agent coordination ---

class AgentRole:
    """Named agent roles for multi-agent workflows."""
    ARCHITECT = "architect"
    VALIDATOR = "validator"
    REVIEWER = "reviewer"


class MultiAgentCoordinator:
    """
    Coordinates multiple specialized agents:
    - Architect: plans and executes design operations
    - Validator: runs validation checks after changes
    - Reviewer: reviews results and suggests improvements
    """

    def __init__(self, governance: GovernanceMiddleware, executor: ToolExecutor):
        self.governance = governance
        self.executor = executor

    def create_architect_agent(self, planner: Callable) -> AgentOrchestrator:
        return AgentOrchestrator(
            governance=self.governance,
            executor=self.executor,
            planner=planner,
        )

    def create_validator_agent(self) -> AgentOrchestrator:
        def validation_planner(state: AgentState) -> list[PlannedAction]:
            """Auto-plan validation based on what was changed."""
            actions = []
            modified_categories = set()
            for result in state.execution_results:
                if result.data.get("category"):
                    modified_categories.add(result.data["category"])
            
            # Always run clash detection after modifications
            if modified_categories:
                actions.append(PlannedAction(
                    tool_name="clash_detection",
                    parameters={"source_category": cat, "target_category": "all", "tolerance": 10}
                ) for cat in modified_categories)
                # Flatten
                actions = list(actions)
            
            return actions

        return AgentOrchestrator(
            governance=self.governance,
            executor=self.executor,
            planner=validation_planner,
        )

    def create_reviewer_agent(self, validator: Callable) -> AgentOrchestrator:
        return AgentOrchestrator(
            governance=self.governance,
            executor=self.executor,
            validator=validator,
        )
