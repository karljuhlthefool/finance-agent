"""Agent SDK configuration for the FastAPI bridge."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Dict

from claude_agent_sdk import ClaudeAgentOptions

from .hooks import hook_config
from .tools_cli import build_sdk_server

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WORKSPACE = Path(os.getenv("WORKSPACE_ABS_PATH", PROJECT_ROOT / "runtime" / "workspace")).resolve()


def agent_options() -> ClaudeAgentOptions:
    system_prompt = (
        "You are a finance operations assistant. Prefer CLI tools when available and explain results clearly."
    )

    allowed_tools = [
        "Bash",
        "Read",
        "Write",
        "List",
        "Glob",
        "Grep",
        "mcp__finance-cli-tools__mf_calc_simple",
        "mcp__finance-cli-tools__mf_doc_diff",
        "mcp__finance-cli-tools__mf_documents_get",
        "mcp__finance-cli-tools__mf_estimates_get",
        "mcp__finance-cli-tools__mf_extract_json",
        "mcp__finance-cli-tools__mf_json_inspect",
        "mcp__finance-cli-tools__mf_market_get",
        "mcp__finance-cli-tools__mf_qa",
        "mcp__finance-cli-tools__mf_report_save",
        "mcp__finance-cli-tools__mf_valuation_basic_dcf",
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
        permission_mode="acceptEdits",
    )
