"""Agent SDK configuration for the FastAPI bridge."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Dict

from claude_agent_sdk import ClaudeAgentOptions

from .hooks import hook_config
from .tools_cli import build_sdk_server
from src.prompts.agent_system import AGENT_SYSTEM

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WORKSPACE = Path(os.getenv("WORKSPACE_ABS_PATH", PROJECT_ROOT / "runtime" / "workspace")).resolve()


def agent_options() -> ClaudeAgentOptions:
    # Inject runtime paths into system prompt
    enhanced_system_prompt = AGENT_SYSTEM.replace(
        "{{injected at runtime}} (e.g., /absolute/path/to/runtime/workspace)",
        str(DEFAULT_WORKSPACE)
    ).replace(
        "{{PROJECT_ROOT}}/bin/ (absolute path is injected at runtime)",
        f"{PROJECT_ROOT}/bin/"
    )
    
    system_prompt = enhanced_system_prompt

    allowed_tools = [
        "Bash",
        "Read",
        "Write",
        "List",
        "Glob",
        "Grep",
        "mcp__finance-cli-tools__mf_calc_simple",
        "mcp__finance-cli-tools__mf_market_get",
        "mcp__finance-cli-tools__mf_report_save",
    ]

    mcp_servers: Dict[str, object] = {
        "finance_cli": build_sdk_server(),
    }

    return ClaudeAgentOptions(
        cwd=str(DEFAULT_WORKSPACE),
        system_prompt=system_prompt,
        allowed_tools=allowed_tools,
        mcp_servers=mcp_servers,
        hooks=hook_config(),
        max_turns=int(os.getenv("MAX_TURNS", "12")),
        permission_mode="bypassPermissions",  # Auto-approve all tool uses without asking
    )
