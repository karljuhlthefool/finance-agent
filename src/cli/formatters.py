from __future__ import annotations

"""Formatting helpers for rendering CLI timeline entries."""

from typing import Any, Iterable, List, Tuple
import json
import os
import re

from humanfriendly import format_size
from rich.console import Group
from rich.table import Table
from rich.text import Text


JSON_PREVIEW_LIMIT = 2000


def preview_json_line(line: str, max_chars: int = JSON_PREVIEW_LIMIT) -> Tuple[str, bool]:
    """Pretty-print JSON content if possible, otherwise truncate raw text."""

    text = line.strip()
    if not text:
        return "", False

    if text.startswith("{") or text.startswith("["):
        try:
            obj = json.loads(text)
        except Exception:
            truncated = text[:max_chars]
            suffix = "\n… (truncated)" if len(text) > max_chars else ""
            return truncated + suffix, False

        pretty = json.dumps(obj, indent=2)
        if len(pretty) > max_chars:
            pretty = pretty[:max_chars] + "\n… (truncated)"
        return pretty, True

    truncated = text[:max_chars]
    suffix = "… (truncated)" if len(text) > max_chars else ""
    return truncated + suffix, False


def summarize_paths(paths: Iterable[Any]) -> List[str]:
    """Summarize filesystem paths with friendly file sizes if possible."""

    results: List[str] = []
    for raw in paths or []:
        path = raw
        if isinstance(raw, dict):
            path = raw.get("path") or raw.get("filepath") or raw.get("file")
        if path is None:
            continue
        path_str = str(path)
        try:
            size = os.path.getsize(path_str)
            results.append(f"{path_str}  ({format_size(size, binary=False)})")
        except OSError:
            results.append(path_str)
    return results


def parse_bash_command(cmd: str) -> dict[str, Any]:
    """Best-effort parse of bash tool commands to surface CLI usage."""

    parsed: dict[str, Any] = {"cli": None, "args": None}
    if not cmd:
        return parsed

    # Detect echoed JSON piped into a CLI
    match = re.search(r"echo\s+(?:-e\s+)?(?P<quote>['\"]?)(?P<payload>{.*})(?P=quote)\s*\|\s*(?P<command>.+)$", cmd)
    if match:
        payload = match.group("payload")
        try:
            parsed["args"] = json.loads(payload)
        except Exception:
            parsed["args"] = payload
        parsed["cli"] = match.group("command").strip().split()[0]
        return parsed

    segments = cmd.strip().split()
    for segment in segments:
        if "/bin/mf-" in segment:
            parsed["cli"] = segment
            break

    return parsed


def format_tool_result(raw_text: str, max_chars: int = JSON_PREVIEW_LIMIT) -> Tuple[Group, bool]:
    """Create a rich renderable summarising a tool result payload."""

    pretty_text, is_json_like = preview_json_line(raw_text, max_chars=max_chars)

    try:
        parsed = json.loads(raw_text)
    except Exception:
        parsed = None

    table = Table.grid(padding=(0, 1))
    table.expand = True

    if isinstance(parsed, dict):
        if "ok" in parsed:
            status = "✅" if parsed.get("ok") else "❌"
            table.add_row(Text("Status", style="bold"), Text(status))
        if "result" in parsed:
            result_payload = parsed.get("result")
            if isinstance(result_payload, (dict, list)):
                result_text = json.dumps(result_payload, indent=2)
            else:
                result_text = str(result_payload)
            if len(result_text) > max_chars:
                result_text = result_text[:max_chars] + "\n… (truncated)"
            table.add_row(Text("Result", style="bold"), Text(result_text))
        else:
            table.add_row(Text("Preview", style="bold"), Text(pretty_text))

        paths = parsed.get("paths") or parsed.get("files")
        summarized_paths = summarize_paths(paths if isinstance(paths, list) else [])
        if summarized_paths:
            table.add_row(
                Text("Paths", style="bold"),
                Text("\n".join(f"- {item}" for item in summarized_paths)),
            )

        metrics = parsed.get("metrics")
        if isinstance(metrics, dict) and metrics:
            metrics_lines = [f"{key}: {value}" for key, value in metrics.items()]
            table.add_row(
                Text("Metrics", style="bold"), Text("\n".join(metrics_lines))
            )

        extras = parsed.get("extra") or parsed.get("metadata")
        if isinstance(extras, dict) and extras:
            lines = [f"{key}: {value}" for key, value in extras.items()]
            table.add_row(Text("Meta", style="bold"), Text("\n".join(lines)))

        renderable = Group(table)
        return renderable, True

    # Not JSON dict: provide raw preview with size info
    byte_count = len(raw_text.encode("utf-8"))
    fallback_table = Table.grid(padding=(0, 1))
    fallback_table.expand = True
    fallback_table.add_row(Text("Bytes", style="bold"), Text(str(byte_count)))
    fallback_table.add_row(Text("Preview", style="bold"), Text(pretty_text))
    return Group(fallback_table), is_json_like
