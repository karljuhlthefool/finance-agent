"""FastAPI bridge that streams Claude agent messages and CLI tool activity."""
from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List
from collections import deque

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from claude_agent_sdk import (
    AssistantMessage,
    query as claude_query,
    ResultMessage,
    SystemMessage,
    UserMessage,
    TextBlock,
    ToolUseBlock,
    ToolResultBlock,
)

from .settings import agent_options

# Global log buffer for streaming to UI
log_buffer: deque = deque(maxlen=1000)  # Keep last 1000 logs

# Load environment variables from .env.local or .env
PROJECT_ROOT = Path(__file__).resolve().parent.parent
env_local = PROJECT_ROOT / ".env.local"
env_file = PROJECT_ROOT / ".env"

if env_local.exists():
    load_dotenv(env_local)
elif env_file.exists():
    load_dotenv(env_file)

app = FastAPI(title="Claude Finance Agent API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3031", "http://localhost:3033"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "claude-finance-agent"}


def log(level: str, message: str, data: Any = None) -> None:
    """Add log entry to buffer and print to console."""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    entry = {
        "timestamp": timestamp,
        "level": level,
        "message": message,
    }
    if data is not None:
        entry["data"] = data
    
    log_buffer.append(entry)
    
    # Also print to console for debugging
    print(f"[{timestamp}] [{level.upper()}] {message}")
    if data:
        print(f"  → {json.dumps(data, default=str, indent=2)}")


def _workspace_bootstrap() -> None:
    workspace = agent_options().cwd
    os.environ.setdefault("WORKSPACE_ABS_PATH", workspace)


async def _event_stream(prompt: str, history: Any | None) -> AsyncIterator[str]:
    opts = agent_options()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")
    
    log("info", f"🚀 Starting query", {"prompt": prompt[:100]})

    # Use the simple claude_query() function - all args are keyword-only
    try:
        async for message in claude_query(prompt=prompt, options=opts):
            log("debug", f"📨 Received message type: {type(message).__name__}")
            async for event_dict in _convert_message_to_events(message):
                # Log the exact dict being sent (for debugging)
                if event_dict.get("event") == "agent.tool-start":
                    log("info", f"🔍 Sending tool-start event", {
                        "keys": list(event_dict.keys()),
                        "has_tool": "tool" in event_dict,
                        "has_args": "args" in event_dict,
                        "tool": event_dict.get("tool"),
                        "args_preview": str(event_dict.get("args"))[:100] if "args" in event_dict else None
                    })
                
                # Format as NDJSON (newline-delimited JSON)
                json_str = json.dumps(event_dict, ensure_ascii=False)
                yield f"{json_str}\n"
        
        log("info", "✅ Query completed successfully")
    except Exception as e:
        log("error", f"❌ Query failed: {str(e)}", {"error_type": type(e).__name__})
        # Log error but yield it as a message so stream completes gracefully
        error_msg = {
            "type": "data",
            "event": "agent.error",
            "error": str(e),
            "error_type": type(e).__name__
        }
        yield f"{json.dumps(error_msg, ensure_ascii=False)}\n"


async def _convert_message_to_events(message: Any) -> AsyncIterator[Dict[str, Any]]:
    # Handle SystemMessage (initialization, MCP server status, etc.)
    if isinstance(message, SystemMessage):
        data = getattr(message, "data", {}) if hasattr(message, "data") else {}
        subtype = getattr(message, "subtype", "unknown")
        
        if subtype == "init":
            # Log initialization details
            tools = data.get("tools", [])
            mcp_servers = data.get("mcp_servers", [])
            model = data.get("model", "unknown")
            permission_mode = data.get("permissionMode", "unknown")
            
            mcp_status = []
            for server in mcp_servers:
                status = server.get("status", "unknown")
                name = server.get("name", "unknown")
                mcp_status.append(f"{name}:{status}")
            
            log("info", f"🎬 System initialized", {
                "model": model,
                "permission_mode": permission_mode,
                "tools_count": len(tools),
                "tools": tools[:10],  # Show first 10
                "mcp_servers": mcp_status
            })
        else:
            log("info", f"⚙️  System message: {subtype}", data)
        
        # Don't yield system messages to UI
        return
    
    # Handle UserMessage (tool results coming back)
    elif isinstance(message, UserMessage):
        content = getattr(message, "content", [])
        
        # UserMessages contain tool results
        for block in content:
            if isinstance(block, ToolResultBlock):
                tool_id = getattr(block, "tool_use_id", "unknown")
                result_content = getattr(block, "content", None)
                is_error = getattr(block, "is_error", False)
                
                # Try to parse the result - handle both string and list of content blocks
                result_data = result_content
                if isinstance(result_content, str):
                    try:
                        result_data = json.loads(result_content)
                    except:
                        result_data = result_content[:500]  # Truncate long text
                elif isinstance(result_content, list) and len(result_content) > 0:
                    # MCP tools return [{"type": "json", "json": {...}}]
                    first_block = result_content[0]
                    if isinstance(first_block, dict):
                        # If it's a JSON block, extract the json field
                        if first_block.get("type") == "json" and "json" in first_block:
                            result_data = first_block["json"]
                        elif "text" in first_block:
                            result_data = first_block["text"]
                    elif hasattr(first_block, 'json'):
                        # SDK ContentBlock objects
                        result_data = first_block.json
                    elif hasattr(first_block, 'text'):
                        result_data = first_block.text
                
                # Log the result
                if is_error:
                    log("error", f"❌ Tool result ERROR for {tool_id[:20]}", result_data if isinstance(result_data, dict) else {"error": str(result_data)[:200]})
                else:
                    # For successful results, log summary
                    if isinstance(result_data, dict):
                        log_summary = {
                            "tool_id": tool_id[:20],
                            "ok": result_data.get("ok"),
                        }
                        if "metrics" in result_data:
                            log_summary["metrics"] = result_data["metrics"]
                        if result_data.get("ok") == False:
                            log_summary["error"] = result_data.get("error", "Unknown error")[:200]
                        log("tool", f"✅ Tool result received", log_summary)
                    else:
                        log("tool", f"✅ Tool result received", {"tool_id": tool_id[:20], "data": str(result_data)[:200]})
                
                # Yield tool result event to frontend
                event_type = "agent.tool-error" if is_error or (isinstance(result_data, dict) and result_data.get("ok") == False) else "agent.tool-result"
                
                yield {
                    "type": "data",
                    "event": event_type,
                    "tool_id": tool_id,
                    "result": result_data,
                    "error": result_data.get("error") if isinstance(result_data, dict) and result_data.get("ok") == False else None
                }
    
    # Handle AssistantMessage (the main agent responses)
    elif isinstance(message, AssistantMessage):
        for block in getattr(message, "content", []) or []:
            # Use isinstance checks instead of getattr type checks
            if isinstance(block, TextBlock):
                text = block.text
                log("info", f"💬 Agent response: {text[:150]}{'...' if len(text) > 150 else ''}")
                yield {
                    "type": "data",
                    "event": "agent.text",
                    "text": text,
                }
            elif isinstance(block, ToolUseBlock):
                tool_name = block.name
                tool_args = block.input
                tool_id = getattr(block, "id", "unknown")
                
                log("debug", f"📋 Tool args RAW", {
                    "tool": tool_name,
                    "args_type": str(type(tool_args)),
                    "args": tool_args,
                    "args_keys": list(tool_args.keys()) if isinstance(tool_args, dict) else None
                })
                
                # Detect CLI tool if this is a Bash command
                cli_tool = None
                metadata = {}
                if tool_name == "Bash" and "command" in tool_args:
                    command = tool_args["command"]
                    # Detect CLI tool type
                    cli_tools = [
                        "mf-market-get", "mf-estimates-get", "mf-documents-get",
                        "mf-filing-extract", "mf-qa", "mf-calc-simple",
                        "mf-valuation-basic-dcf", "mf-report-save",
                        "mf-extract-json", "mf-json-inspect", "mf-doc-diff",
                        "mf-render-metrics", "mf-render-comparison",
                        "mf-render-insight", "mf-render-timeline",
                    ]
                    
                    # Check for tool names (with or without dashes/underscores)
                    for tool in cli_tools:
                        if tool in command or tool.replace('-', '_') in command:
                            cli_tool = tool
                            break
                    
                    # Extract JSON metadata from echo pattern
                    import re
                    match = re.search(r"echo\s+'(\{[^']+\})'", command)
                    if match:
                        try:
                            metadata = json.loads(match.group(1))
                        except:
                            pass
                
                log("tool", f"🔧 Tool CALLED: {tool_name}", {
                    "id": tool_id[:20], 
                    "args": tool_args,
                    "cli_tool": cli_tool,
                    "metadata": metadata
                })
                
                # For CLI tools, use metadata (which has parsed JSON args) as args
                # For other tools, use tool_args directly
                display_args = metadata if cli_tool else tool_args
                
                yield {
                    "type": "data",
                    "event": "agent.tool-start",
                    "tool": tool_name,
                    "tool_id": tool_id,
                    "cli_tool": cli_tool,
                    "metadata": metadata,
                    "args": display_args,
                }
    
    # Handle ResultMessage (final completion)
    elif isinstance(message, ResultMessage):
        summary = getattr(message, "result", None)
        usage = getattr(message, "usage", {})
        cost = getattr(message, "total_cost_usd", None)
        
        log("info", f"🏁 Agent completed", {
            "summary_length": len(summary) if summary else 0,
            "cost_usd": cost,
            "input_tokens": usage.get("input_tokens") if isinstance(usage, dict) else None,
            "output_tokens": usage.get("output_tokens") if isinstance(usage, dict) else None,
        })
        
        yield {
            "type": "data",
            "event": "agent.completed",
            "runtime_ms": None,
            "summary": summary,
        }
    
    # Catch-all for unknown types
    else:
        log("warning", f"⚠️  Unhandled message type: {type(message).__name__}", {
            "message_repr": str(message)[:200]
        })


@app.on_event("startup")
async def on_startup() -> None:
    _workspace_bootstrap()


@app.get("/healthz")
async def healthcheck() -> Dict[str, Any]:
    return {"ok": True}


@app.post("/query")
async def query(request: Request) -> StreamingResponse:
    body = await request.json()
    prompt = body.get("prompt", "")
    history = body.get("messages")

    stream = _event_stream(prompt, history)
    return StreamingResponse(stream, media_type="application/x-ndjson")


def _scan_workspace_tree(root: Path, relative_to: Path, max_depth: int = 10, current_depth: int = 0) -> List[Dict[str, Any]]:
    """Recursively scan workspace directory and return tree structure."""
    if current_depth >= max_depth:
        return []
    
    items = []
    
    try:
        for item in sorted(root.iterdir()):
            # Skip hidden files and __pycache__
            if item.name.startswith('.') or item.name == '__pycache__':
                continue
            
            relative_path = str(item.relative_to(relative_to))
            
            # Prevent nested workspace duplication: skip 'runtime' directory at root level
            # This prevents runtime/workspace/runtime/workspace nesting
            if relative_path == 'runtime' and current_depth == 0:
                continue
            
            # Hide internal cache directory (SDK internals, binary files)
            if relative_path.startswith('.cache') or item.name == '.cache':
                continue
            
            # Hide old directory structure during transition
            if current_depth == 0 and item.name in ['data', 'analysis', 'outputs', 'reports', 'logs', 'charts']:
                continue
            
            # Filter out unnecessary files from workspace viewer
            # Skip binary cache files
            if item.is_file() and item.suffix == '.bin':
                continue
            
            # Skip base64-encoded URL cache files (long hashes)
            if item.is_file() and len(item.stem) > 50:
                continue
            
            # Skip internal SDK reports
            if item.name == 'claude_agent_sdk_report.json':
                continue
            
            try:
                stat = item.stat()
                
                node = {
                    'name': item.name,
                    'path': relative_path,
                    'type': 'directory' if item.is_dir() else 'file',
                    'size': stat.st_size if item.is_file() else None,
                    'modified': stat.st_mtime,
                }
                
                if item.is_dir():
                    node['children'] = _scan_workspace_tree(item, relative_to, max_depth, current_depth + 1)
                else:
                    # Add file extension for type detection
                    node['extension'] = item.suffix.lower()
                
                items.append(node)
            except (OSError, PermissionError):
                continue
    
    except Exception:
        pass
    
    return items


@app.get("/workspace/tree")
async def workspace_tree() -> Dict[str, Any]:
    """Return workspace file tree structure."""
    try:
        workspace_path = Path(agent_options().cwd)
        
        if not workspace_path.exists():
            return {
                "ok": False,
                "error": "Workspace directory does not exist",
                "workspace": str(workspace_path),
            }
        
        tree = _scan_workspace_tree(workspace_path, workspace_path)
        
        return {
            "ok": True,
            "workspace": str(workspace_path),
            "tree": tree,
            "timestamp": json.dumps(None),  # Placeholder for timestamp
        }
    except Exception as e:
        return {
            "ok": False,
            "error": str(e),
        }


@app.get("/workspace/file")
async def workspace_file(path: str = Query(..., description="Relative path to file within workspace")) -> Dict[str, Any]:
    """Return file contents with metadata."""
    try:
        workspace_path = Path(agent_options().cwd).resolve()
        
        # Security: ensure path is within workspace
        file_path = (workspace_path / path).resolve()
        if not str(file_path).startswith(str(workspace_path)):
            raise HTTPException(status_code=403, detail="Access denied: path outside workspace")
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        stat = file_path.stat()
        
        # Detect file type
        extension = file_path.suffix.lower()
        mime_type = "text/plain"
        
        if extension == ".json":
            mime_type = "application/json"
        elif extension == ".md":
            mime_type = "text/markdown"
        elif extension in [".txt", ".log", ".jsonl"]:
            mime_type = "text/plain"
        elif extension in [".py", ".ts", ".js", ".tsx", ".jsx"]:
            mime_type = "text/x-code"
        
        # Read content (with size limit for safety)
        max_size = 10 * 1024 * 1024  # 10MB
        if stat.st_size > max_size:
            raise HTTPException(status_code=413, detail="File too large (>10MB)")
        
        try:
            content = file_path.read_text(encoding='utf-8', errors='replace')
            
            return {
                "ok": True,
                "path": str(file_path.relative_to(workspace_path)),
                "name": file_path.name,
                "extension": extension,
                "mime_type": mime_type,
                "size": stat.st_size,
                "modified": stat.st_mtime,
                "content": content,
            }
        
        except UnicodeDecodeError:
            # Handle binary files
            return {
                "ok": False,
                "error": "Binary file cannot be displayed as text",
                "path": str(file_path.relative_to(workspace_path)),
                "name": file_path.name,
                "size": stat.st_size,
                "extension": extension,
                "is_binary": True,
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/logs/stream")
async def logs_stream() -> StreamingResponse:
    """Stream logs to the UI in real-time using Server-Sent Events."""
    
    async def event_generator():
        # Send existing logs first
        for log_entry in list(log_buffer):
            yield f"data: {json.dumps(log_entry)}\n\n"
        
        # Then stream new logs
        last_size = len(log_buffer)
        while True:
            await asyncio.sleep(0.1)  # Check every 100ms
            
            current_size = len(log_buffer)
            if current_size > last_size:
                # New logs added
                new_logs = list(log_buffer)[last_size:]
                for log_entry in new_logs:
                    yield f"data: {json.dumps(log_entry)}\n\n"
                last_size = current_size
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
