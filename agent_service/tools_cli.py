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


# NOTE: keep tool registrations alphabetized for quick scanning.


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
    "mf_doc_diff",
    "Compare two documents or sections with mf-doc-diff",
    {
        "document1": str,
        "document2": str,
        "section": str,
        "type": str,
        "format": str,
    },
)
async def mf_doc_diff_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "document1": args.get("document1") or args.get("doc1"),
        "document2": args.get("document2") or args.get("doc2"),
        "section": args.get("section"),
        "type": args.get("type", "line"),
        "format": args.get("format", "concise"),
    }
    result = await run_cli("mf-doc-diff", payload, timeout=240.0)
    return {
        "content": [
            {
                "type": "json",
                "name": "mf_doc_diff.result",
                "json": result,
            }
        ]
    }


@tool(
    "mf_documents_get",
    "Fetch latest SEC filing via mf-documents-get",
    {
        "ticker": str,
        "type": str,
        "exhibit_limit": int,
        "format": str,
    },
)
async def mf_documents_get_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "ticker": args.get("ticker"),
        "type": args.get("type", "10-K"),
        "exhibit_limit": args.get("exhibit_limit", 25),
        "format": args.get("format", "concise"),
    }
    result = await run_cli("mf-documents-get", payload, timeout=240.0)
    return {
        "content": [
            {
                "type": "json",
                "name": "mf_documents_get.result",
                "json": result,
            }
        ]
    }


@tool(
    "mf_estimates_get",
    "Fetch analyst estimates via mf-estimates-get",
    {
        "ticker": str,
        "metric": str,
        "years_future": int,
        "years_past": int,
        "currency": str,
        "format": str,
    },
)
async def mf_estimates_get_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "ticker": args.get("ticker"),
        "metric": args.get("metric", "revenue"),
        "years_future": args.get("years_future", 5),
        "years_past": args.get("years_past", 0),
        "currency": args.get("currency", "original"),
        "format": args.get("format", "concise"),
    }
    result = await run_cli("mf-estimates-get", payload, timeout=180.0)
    return {
        "content": [
            {
                "type": "json",
                "name": "mf_estimates_get.result",
                "json": result,
            }
        ]
    }


@tool(
    "mf_extract_json",
    "Extract values from JSON via mf-extract-json",
    {
        "json_file": str,
        "json_data": dict,
        "path": str,
        "instruction": str,
        "format": str,
    },
)
async def mf_extract_json_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "json_file": args.get("json_file"),
        "json_data": args.get("json_data"),
        "path": args.get("path"),
        "instruction": args.get("instruction"),
        "format": args.get("format", "concise"),
    }
    result = await run_cli("mf-extract-json", payload, timeout=240.0)
    return {
        "content": [
            {
                "type": "json",
                "name": "mf_extract_json.result",
                "json": result,
            }
        ]
    }


@tool(
    "mf_filing_extract",
    "Extract sections or search filings via mf-filing-extract",
    {
        "filing_path": str,
        "mode": str,
        "sections": list,
        "keywords": list,
        "pattern": str,
        "pre_window": int,
        "post_window": int,
        "format": str,
    },
)
async def mf_filing_extract_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "filing_path": args.get("filing_path"),
        "mode": args.get("mode", "extract_sections"),
        "sections": args.get("sections"),
        "keywords": args.get("keywords"),
        "pattern": args.get("pattern"),
        "pre_window": args.get("pre_window"),
        "post_window": args.get("post_window"),
        "format": args.get("format", "concise"),
    }
    result = await run_cli("mf-filing-extract", payload, timeout=300.0)
    return {
        "content": [
            {
                "type": "json",
                "name": "mf_filing_extract.result",
                "json": result,
            }
        ]
    }


@tool(
    "mf_json_inspect",
    "Inspect JSON structure via mf-json-inspect",
    {
        "json_file": str,
        "max_depth": int,
        "show_hints": bool,
        "format": str,
    },
)
async def mf_json_inspect_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "json_file": args.get("json_file"),
        "max_depth": args.get("max_depth", 3),
        "show_hints": args.get("show_hints", True),
        "format": args.get("format", "concise"),
    }
    result = await run_cli("mf-json-inspect", payload, timeout=120.0)
    return {
        "content": [
            {
                "type": "json",
                "name": "mf_json_inspect.result",
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
    "mf_qa",
    "Run document Q&A via mf-qa",
    {
        "instruction": str,
        "model": str,
        "document_paths": list,
        "inline_text": str,
        "output_schema": dict,
        "format": str,
    },
)
async def mf_qa_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "instruction": args.get("instruction"),
        "model": args.get("model"),
        "document_paths": args.get("document_paths"),
        "inline_text": args.get("inline_text"),
        "output_schema": args.get("output_schema"),
        "format": args.get("format", "concise"),
    }
    result = await run_cli("mf-qa", payload, timeout=600.0)
    return {
        "content": [
            {
                "type": "json",
                "name": "mf_qa.result",
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
    "mf_valuation_basic_dcf",
    "Run DCF valuation via mf-valuation-basic-dcf",
    {
        "ticker": str,
        "years": int,
        "wacc": float,
        "terminal": dict,
        "shares_outstanding": float,
        "fcf_series": list,
        "format": str,
    },
)
async def mf_valuation_basic_dcf_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "ticker": args.get("ticker"),
        "years": args.get("years", 5),
        "wacc": args.get("wacc", 0.1),
        "terminal": args.get("terminal"),
        "shares_outstanding": args.get("shares_outstanding"),
        "fcf_series": args.get("fcf_series") or args.get("fcfe_series"),
        "format": args.get("format", "concise"),
    }
    result = await run_cli("mf-valuation-basic-dcf", payload, timeout=300.0)
    return {
        "content": [
            {
                "type": "json",
                "name": "mf_valuation_basic_dcf.result",
                "json": result,
            }
        ]
    }


def build_sdk_server():
    """Create the in-process MCP server that exposes CLI tools to the agent."""
    return create_sdk_mcp_server(
        name="finance-cli-tools",
        version="1.0.0",
        tools=[
            mf_calc_simple_tool,
            mf_doc_diff_tool,
            mf_documents_get_tool,
            mf_estimates_get_tool,
            mf_extract_json_tool,
            mf_filing_extract_tool,
            mf_json_inspect_tool,
            mf_market_get_tool,
            mf_qa_tool,
            mf_report_save_tool,
            mf_valuation_basic_dcf_tool,
        ],
    )
