#!/usr/bin/env python3
from __future__ import annotations

"""Interactive CLI entry point powered by the Claude Agent SDK."""

import os
from pathlib import Path
from typing import Dict, List

import anyio
from dotenv import load_dotenv

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

from .cli.events import handle_sdk_message
from .cli.repl import create_prompt_session, iter_user_inputs, is_clear_cmd
from .cli.ui import AgentBanner, AgentCLI
from .prompts.agent_system import AGENT_SYSTEM

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
WORKSPACE = Path(os.getenv("WORKSPACE_ABS_PATH", "./runtime/workspace")).resolve()


def _list_available_clis() -> List[str]:
    tools_dir = PROJECT_ROOT / "bin"
    if not tools_dir.exists():
        return []
    return sorted(p.name for p in tools_dir.glob("mf-*") if p.is_file())


def _describe_directory(path: Path, limit: int = 2000) -> str:
    if not path.exists():
        return "(missing)"
    count = 0
    try:
        for _ in path.rglob("*"):
            if _.is_file():
                count += 1
                if count > limit:
                    return f"> {limit} files"
        return f"{count} files"
    except OSError:
        return "(unavailable)"


def _workspace_summary() -> Dict[str, str]:
    targets = [
        "data/market",
        "data/sec",
        "analysis/tables",
        "reports/analysis",
    ]
    summary: Dict[str, str] = {}
    for rel in targets:
        summary[rel] = _describe_directory(WORKSPACE / rel)
    return summary


def _build_banner() -> AgentBanner:
    allowed_tools = ("Bash", "Read", "Write", "Glob", "Grep")
    clis = tuple(_list_available_clis())
    workspace_dirs = _workspace_summary()
    return AgentBanner(
        agent_name=os.getenv("AGENT_NAME", "Motley Fool Finance Agent"),
        model=os.getenv("AGENT_MODEL", "sonnet"),
        allowed_tools=allowed_tools,
        clis=clis,
        workspace=str(WORKSPACE),
        workspace_dirs=workspace_dirs,
    )


def _make_options() -> ClaudeAgentOptions:
    # Inject dynamic paths into system prompt (critical for tool discovery)
    enhanced_system_prompt = f"""# ENVIRONMENT SETUP
Your current working directory (CWD) is: {WORKSPACE}
The CLI tools are located at: {PROJECT_ROOT}/bin/

IMPORTANT: To call any tool, use the FULL PATH from your CWD.
Example: `echo '{{"op":"delta","current":150,"previous":100}}' | {PROJECT_ROOT}/bin/mf-calc-simple`

DO NOT search for tool paths - they are always at {PROJECT_ROOT}/bin/mf-<tool-name>

{AGENT_SYSTEM}"""
    
    return ClaudeAgentOptions(
        cwd=str(WORKSPACE),
        model=os.getenv("AGENT_MODEL", "sonnet"),
        system_prompt=enhanced_system_prompt,
        allowed_tools=["Bash", "Read", "Write", "Glob", "Grep"],
        max_turns=int(os.getenv("MAX_TURNS", "100")),
        include_partial_messages=True,  # Enable incremental text streaming!
    )


def _conversation_to_prompt(history: List[Dict[str, str]]) -> str:
    lines: List[str] = []
    for entry in history:
        role = entry.get("role", "user")
        prefix = "User" if role == "user" else "Assistant"
        lines.append(f"{prefix}::\n{entry.get('content', '')}")
    lines.append("Assistant::")
    return "\n\n".join(lines)


async def run_cli() -> None:
    os.environ["WORKSPACE_ABS_PATH"] = str(WORKSPACE)

    ui = AgentCLI(_build_banner())
    ui.show_startup_banner()
    ui.update_footer()
    ui.render()

    prompt_session = create_prompt_session()
    options = _make_options()

    # Initialize the Claude SDK Client for streaming support
    async with ClaudeSDKClient(options=options) as client:
        # Connect to the agent
        await client.connect()
        
        async for user_input in iter_user_inputs(prompt_session):
            if is_clear_cmd(user_input):
                ui.reset()
                ui.show_startup_banner()
                ui.update_footer()
                ui.render()
                continue

            ui.append_user(user_input)
            ui.update_footer()
            ui.render()

            agent_response_chunks: List[str] = []
            try:
                # Send query and stream responses in real-time
                await client.query(user_input)
                
                # Receive streaming responses
                async for message in client.receive_response():
                    captured = handle_sdk_message(ui, message, streaming=True)
                    if captured:
                        agent_response_chunks.append(captured)
                        
            except KeyboardInterrupt:
                ui.console.print("\n[yellow]⚠️  Interrupted by user[/yellow]")
                break


async def main() -> None:
    await run_cli()


if __name__ == "__main__":
    anyio.run(main)
