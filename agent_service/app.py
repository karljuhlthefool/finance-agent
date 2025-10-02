"""FastAPI bridge that streams Claude agent messages and CLI tool activity."""
from __future__ import annotations

import json
import os
from typing import Any, AsyncIterator, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from claude_agent_sdk import AssistantMessage, ClaudeSDKClient, ResultMessage

from .settings import agent_options

app = FastAPI(title="Claude Finance Agent API")


def _workspace_bootstrap() -> None:
    workspace = agent_options().cwd
    os.environ.setdefault("WORKSPACE_ABS_PATH", workspace)


async def _event_stream(prompt: str, history: Any | None) -> AsyncIterator[str]:
    opts = agent_options()
    async with ClaudeSDKClient(options=opts) as client:
        if history:
            await client.load_history(history)
        if not prompt:
            raise HTTPException(status_code=400, detail="prompt is required")
        await client.query(prompt)

        async for message in client.receive_response():
            async for line in _convert_message_to_events(message):
                yield json.dumps(line, ensure_ascii=False) + "\n"


async def _convert_message_to_events(message: Any) -> AsyncIterator[Dict[str, Any]]:
    if isinstance(message, AssistantMessage):
        for block in getattr(message, "content", []) or []:
            block_type = getattr(block, "type", None)
            if block_type == "text" and hasattr(block, "text"):
                yield {
                    "type": "data",
                    "event": "agent.text",
                    "text": block.text,
                }
            elif block_type == "tool_use":
                yield {
                    "type": "data",
                    "event": "agent.tool-start",
                    "tool": getattr(block, "name", ""),
                    "args": getattr(block, "input", {}),
                }
            elif block_type == "tool_result":
                tool_name = getattr(block, "name", "")
                result_payload = getattr(block, "content", None)
                if isinstance(result_payload, list) and result_payload:
                    result_payload = result_payload[0]
                if isinstance(result_payload, dict) and "json" in result_payload:
                    result_payload = result_payload.get("json")
                event = {
                    "type": "data",
                    "event": "agent.tool-result",
                    "tool": tool_name,
                    "result": result_payload,
                }
                yield event
                if tool_name:
                    specialized = dict(event)
                    specialized["event"] = f"agent.tool-result.{tool_name}"
                    yield specialized
    elif isinstance(message, ResultMessage):
        yield {
            "type": "data",
            "event": "agent.completed",
            "runtime_ms": getattr(message, "runtime_ms", None),
            "summary": getattr(message, "result", None),
        }
    else:
        yield {
            "type": "data",
            "event": "agent.unknown",
            "payload": json.loads(json.dumps(message, default=str)),
        }


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
