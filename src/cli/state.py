from __future__ import annotations

"""Session state tracking for the interactive CLI."""

from dataclasses import dataclass, field
from typing import Dict, Optional, Set


@dataclass
class SessionState:
    """Track aggregated usage and tool metrics for the CLI session."""

    session_id: Optional[str] = None
    steps: int = 0
    tool_calls_total: int = 0
    tool_calls_by_name: Dict[str, int] = field(default_factory=dict)
    cumulative_cost_usd: float = 0.0
    tokens_in: int = 0
    tokens_out: int = 0
    processed_message_ids: Set[str] = field(default_factory=set)

    def register_message(self, message_id: Optional[str]) -> bool:
        """Register a new assistant message, returning True if it is new."""

        if message_id and message_id in self.processed_message_ids:
            return False
        if message_id:
            self.processed_message_ids.add(message_id)
        self.steps += 1
        return True

    def add_usage(self, usage: object) -> None:
        """Accumulate token usage from the SDK payload."""

        if usage is None:
            return

        input_tokens = 0
        output_tokens = 0

        # usage may be a dict-like object or have attributes
        if isinstance(usage, dict):
            input_tokens = int(usage.get("input_tokens", 0) or 0)
            output_tokens = int(usage.get("output_tokens", 0) or 0)
        else:
            input_tokens = int(getattr(usage, "input_tokens", 0) or 0)
            output_tokens = int(getattr(usage, "output_tokens", 0) or 0)

        self.tokens_in += input_tokens
        self.tokens_out += output_tokens

    def add_tool(self, name: str) -> None:
        """Increment tool counters for a tool call."""

        self.tool_calls_total += 1
        if name not in self.tool_calls_by_name:
            self.tool_calls_by_name[name] = 0
        self.tool_calls_by_name[name] += 1

    def reset(self) -> None:
        """Reset state to defaults for a fresh session."""

        self.session_id = None
        self.steps = 0
        self.tool_calls_total = 0
        self.tool_calls_by_name.clear()
        self.cumulative_cost_usd = 0.0
        self.tokens_in = 0
        self.tokens_out = 0
        self.processed_message_ids.clear()
