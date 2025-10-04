"""In-process MCP tools that wrap CLI scripts for the finance agent."""
from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable

from claude_agent_sdk import create_sdk_mcp_server, tool

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BIN_DIR = PROJECT_ROOT / "bin"
DEFAULT_WORKSPACE = PROJECT_ROOT / "runtime" / "workspace"


async def run_cli(command: str, payload: Dict[str, Any] | None = None,
                  *, timeout: float = 120.0, args: Iterable[str] | None = None) -> Dict[str, Any]:
    """Run a CLI command from bin/ and coerce stdout into JSON for UI rendering."""
    cli_path = BIN_DIR / command
    if not cli_path.exists():
        return {"ok": False, "error": f"CLI '{command}' not found", "stderr": None}

    env = os.environ.copy()
    workspace = Path(env.get("WORKSPACE_ABS_PATH", str(DEFAULT_WORKSPACE))).resolve()
    workspace.mkdir(parents=True, exist_ok=True)
    env["WORKSPACE_ABS_PATH"] = str(workspace)

    cmd = [str(cli_path)]
    if args:
        cmd.extend(list(args))

    stdin_bytes = None
    if payload is not None:
        stdin_bytes = json.dumps(payload).encode("utf-8")

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE if stdin_bytes else None,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env,
    )

    try:
        stdout_bytes, stderr_bytes = await asyncio.wait_for(
            process.communicate(stdin_bytes), timeout=timeout
        )
    except asyncio.TimeoutError:
        process.kill()
        return {
            "ok": False,
            "error": f"CLI '{command}' timed out after {int(timeout)}s",
            "stderr": None,
        }

    stdout = stdout_bytes.decode("utf-8", errors="replace")
    stderr = stderr_bytes.decode("utf-8", errors="replace")

    if process.returncode != 0:
        return {"ok": False, "error": stderr or stdout, "stderr": stderr or stdout}

    try:
        parsed = json.loads(stdout) if stdout.strip() else {}
    except json.JSONDecodeError:
        parsed = {"raw": stdout.strip()}

    return {"ok": True, "data": parsed, "stderr": stderr or None}


@tool(
    "mf_calc_simple",
    "Run deterministic finance calculations via mf-calc-simple",
    {
        "operation": str,
        "current": float,
        "previous": float,
        "mode": str,
    },
)
async def mf_calc_simple_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "op": args.get("operation", "delta"),
        "current": args.get("current"),
        "previous": args.get("previous"),
        "mode": args.get("mode", "percent"),
    }
    result = await run_cli("mf-calc-simple", payload)
    return {
        "content": [
            {
                "type": "json",
                "name": "mf_calc_simple.result",
                "json": result,
            }
        ]
    }


@tool(
    "mf_market_get",
    "Fetch market data files via mf-market-get",
    {
        "ticker": str,
        "fields": list,
        "range": str,
    },
)
async def mf_market_get_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "ticker": args.get("ticker"),
        "fields": args.get("fields", ["prices"]),
        "range": args.get("range", "1y"),
        "point_in_time": True,
    }
    result = await run_cli("mf-market-get", payload, timeout=180.0)
    return {
        "content": [
            {
                "type": "json",
                "name": "mf_market_get.result",
                "json": result,
            }
        ]
    }


@tool(
    "mf_report_save",
    "Persist agent analysis output via mf-report-save",
    {
        "title": str,
        "ticker": str,
        "content": str,
    },
)
async def mf_report_save_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "title": args.get("title"),
        "ticker": args.get("ticker"),
        "content": args.get("content"),
        "type": "analysis",
    }
    result = await run_cli("mf-report-save", payload)
    return {
        "content": [
            {
                "type": "json",
                "name": "mf_report_save.result",
                "json": result,
            }
        ]
    }


@tool(
    "mf_chart_data",
    "Create interactive financial charts (line, bar, area, pie, combo) for data visualization",
    {
        "chart_type": str,
        "series": list,
        "title": str,
        "x_label": str,
        "y_label": str,
        "series_name": str,
        "format_y": str,
        "ticker": str,
    },
)
async def mf_chart_data_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    # Parse series if it's a string
    series = args.get("series", [])
    if isinstance(series, str):
        try:
            series = json.loads(series)
        except json.JSONDecodeError:
            series = []
    
    # Parse secondary_series if it's a string
    secondary_series = args.get("secondary_series")
    if isinstance(secondary_series, str):
        try:
            secondary_series = json.loads(secondary_series)
        except json.JSONDecodeError:
            secondary_series = None
    
    payload = {
        "type": args.get("chart_type", "line"),
        "series": series,
        "title": args.get("title"),
        "x_label": args.get("x_label"),
        "y_label": args.get("y_label"),
        "series_name": args.get("series_name"),
        "format_y": args.get("format_y", "number"),
        "colors": args.get("colors"),
        "secondary_series": secondary_series,
        "ticker": args.get("ticker"),
        "save": args.get("save", True),
    }
    cli_result = await run_cli("mf-chart-data", payload)
    
    # run_cli returns {"ok": True, "data": {...}} or {"ok": False, "error": "..."}
    if not cli_result.get("ok"):
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"Chart generation failed: {cli_result.get('error', 'Unknown error')}",
                }
            ]
        }
    
    # Extract the actual chart data from the "data" field
    chart_data = cli_result.get("data", {})
    
    return {
        "content": [
            {
                "type": "json",
                "name": "mf_chart_data.result",
                "json": chart_data,
            }
        ]
    }


def build_sdk_server():
    """Create the in-process MCP server that exposes CLI tools to the agent."""
    return create_sdk_mcp_server(
        name="finance-cli-tools",
        version="1.0.0",
        tools=[mf_calc_simple_tool, mf_market_get_tool, mf_report_save_tool, mf_chart_data_tool],
    )
