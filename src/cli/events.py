from __future__ import annotations

"""Adapter layer translating SDK messages into UI events."""

from typing import Optional

from claude_agent_sdk import (
    AssistantMessage,
    ResultMessage,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
)

from .state import SessionState
from .ui import AgentCLI


def _extract_message_id(message: AssistantMessage) -> Optional[str]:
    for attr in ("id", "message_id", "uuid", "event_id"):
        value = getattr(message, attr, None)
        if value:
            return str(value)
    return None


def handle_sdk_message(ui: AgentCLI, message: object, streaming: bool = True) -> Optional[str]:
    """Handle messages emitted by the Claude Agent SDK.

    Args:
        ui: The UI instance to update
        message: The SDK message to process
        streaming: If True, stream text to console in real-time

    Returns the concatenated assistant text (if any) for conversation history.
    """

    state: SessionState = ui.state
    agent_text_parts: list[str] = []

    if isinstance(message, AssistantMessage):
        message_id = _extract_message_id(message)
        usage = getattr(message, "usage", None)
        is_new = state.register_message(message_id)
        if is_new and usage is not None:
            state.add_usage(usage)

        for block in message.content:
            if isinstance(block, TextBlock):
                text = block.text
                stripped = text.strip()
                if stripped.startswith("{") or stripped.startswith("["):
                    ui.append_tool_result_preview(stripped)
                    if not streaming:
                        ui.render()
                elif stripped:
                    # Stream with immediate output (0ms delay for responsiveness)
                    ui.append_agent_text(text, message_id, streaming=streaming, stream_delay_ms=0)
                    agent_text_parts.append(text)
            elif isinstance(block, ToolUseBlock):
                # Finish any streaming text before showing tool call
                if streaming and agent_text_parts:
                    ui.console.print()  # Newline after streamed text
                ui.append_tool_call(block.name, block.input)
                if not streaming:
                    ui.render()
                else:
                    # In streaming mode, just print the tool call directly
                    pass
            elif isinstance(block, ToolResultBlock):
                content = block.content
                if isinstance(content, str):
                    ui.append_tool_result_preview(content)
                    if not streaming:
                        ui.render()
                elif isinstance(content, list):
                    for item in content:
                        text = item.get("text") if isinstance(item, dict) else None
                        if text:
                            ui.append_tool_result_preview(text)
                            if not streaming:
                                ui.render()

        # Update footer after each message
        ui.update_footer()
        
        # In non-streaming mode, do full re-render
        if not streaming:
            ui.render()
        
        combined = "\n".join(agent_text_parts).strip()
        return combined or None

    elif isinstance(message, ResultMessage):
        # Ensure we finish streaming before showing final result
        if streaming:
            ui.console.print("\n")  # Extra newline after streaming
        
        state.session_id = message.session_id
        state.cumulative_cost_usd = message.total_cost_usd or state.cumulative_cost_usd
        if message.usage:
            state.add_usage(message.usage)
        ui.update_footer()
        
        # Always render footer at the end
        if streaming:
            ui.console.rule()
            ui.console.print(ui.footer_text)
        else:
            ui.render()
    return None
