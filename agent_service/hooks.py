"""Hook configuration that reuses the existing guardrails for the FastAPI agent."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict

from claude_agent_sdk import HookMatcher

from src.hooks import AgentHooks

DEFAULT_WORKSPACE = Path(os.getenv("WORKSPACE_ABS_PATH", "./runtime/workspace")).resolve()
DEFAULT_WORKSPACE.mkdir(parents=True, exist_ok=True)
AGENT_HOOKS = AgentHooks(DEFAULT_WORKSPACE)


def _format_pre_tool_response(decision: Dict[str, Any]) -> Dict[str, Any]:
    if decision.get("decision") == "block":
        return {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": decision.get("reason", "Blocked by policy"),
            }
        }
    return {}


async def guard_pre_tool(input_data: Dict[str, Any], tool_use_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    decision = AGENT_HOOKS.pre_tool_guard(tool_name, tool_input)
    return _format_pre_tool_response(decision)


async def log_post_tool(input_data: Dict[str, Any], tool_use_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    tool_result = input_data.get("tool_result")
    AGENT_HOOKS.post_tool_logger(tool_name, tool_input, tool_result)

    if tool_result is None:
        return {}

    try:
        normalized = json.loads(tool_result) if isinstance(tool_result, str) else tool_result
    except json.JSONDecodeError:
        normalized = {"raw": str(tool_result)}

    return {
        "hookSpecificOutput": {
            "hookEventName": "PostToolResult",
            "normalized": {
                "ok": True,
                "tool": tool_name,
                "data": normalized,
            },
        }
    }


def hook_config() -> Dict[str, Any]:
    return {
        "PreToolUse": [HookMatcher(matcher="*", hooks=[guard_pre_tool])],
        "PostToolResult": [HookMatcher(matcher="*", hooks=[log_post_tool])],
    }
