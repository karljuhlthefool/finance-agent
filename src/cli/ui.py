from __future__ import annotations

"""Rich-based UI primitives for the interactive CLI."""

from dataclasses import dataclass
import json
import time
from typing import Dict, Optional

from rich.console import Console, RenderableType
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.live import Live

from .formatters import format_tool_result, parse_bash_command, preview_json_line
from .state import SessionState


TIMELINE_LIMIT = 200


@dataclass
class AgentBanner:
    agent_name: str
    model: str
    allowed_tools: tuple[str, ...]
    clis: tuple[str, ...]
    workspace: str
    workspace_dirs: Dict[str, str]


class AgentCLI:
    """Render interactive chat timeline, startup banner, and footer."""

    def __init__(self, banner_info: AgentBanner):
        self.console = Console()
        self.state = SessionState()
        self.banner_info = banner_info
        self.timeline: list[RenderableType] = []
        self.footer_text = Text("")
        self._agent_blocks: Dict[str, Dict[str, object]] = {}
        self._streaming_mode = False
        self._current_stream_text: Optional[Text] = None
        self._stream_message_id: Optional[str] = None

    # ------------------------------------------------------------------
    # Banner + layout helpers
    # ------------------------------------------------------------------
    def show_startup_banner(self) -> None:
        """Render the one-time startup banner."""

        table = Table.grid(expand=True)
        table.add_row(
            Text.from_markup(
                f"[bold]Agent:[/bold] {self.banner_info.agent_name}"
            ),
            Text.from_markup(f"[bold]Model:[/bold] {self.banner_info.model}"),
        )
        table.add_row(
            Text.from_markup(
                "[bold]Allowed tools:[/bold] "
                + ", ".join(self.banner_info.allowed_tools)
            )
        )
        if self.banner_info.clis:
            table.add_row(
                Text.from_markup(
                    "[bold]CLIs:[/bold] " + ", ".join(self.banner_info.clis)
                )
            )
        table.add_row(
            Text.from_markup(
                f"[bold]Workspace:[/bold] {self.banner_info.workspace}"
            )
        )
        self.timeline.append(
            Panel(
                table,
                title="Session Started",
                border_style="green",
            )
        )

        if self.banner_info.workspace_dirs:
            summary_table = Table.grid(padding=(0, 1), expand=True)
            for name, info in self.banner_info.workspace_dirs.items():
                summary_table.add_row(
                    Text.from_markup(f"[bold]{name}[/bold]"), Text(info)
                )
            self.timeline.append(
                Panel(
                    summary_table,
                    title="Workspace Summary",
                    border_style="blue",
                )
            )

    # ------------------------------------------------------------------
    # Timeline manipulation
    # ------------------------------------------------------------------
    def _append_panel(self, renderable: RenderableType) -> None:
        self.timeline.append(renderable)
        if len(self.timeline) > TIMELINE_LIMIT:
            self.timeline = self.timeline[-TIMELINE_LIMIT:]

    def append_user(self, text: str) -> None:
        panel = Panel(Text(text), title="YOU", border_style="white")
        self._append_panel(panel)

    def _stream_text_char_by_char(self, text: str, delay_ms: float = 5.0) -> None:
        """Stream text character by character to simulate typing.
        
        Args:
            text: The text to stream
            delay_ms: Milliseconds between characters (0 for instant)
        """
        if delay_ms <= 0:
            # No delay - print all at once
            self.console.print(text, end="", markup=False, highlight=False)
            self.console.file.flush()
            return
        
        delay_s = delay_ms / 1000.0
        for char in text:
            self.console.print(char, end="", markup=False, highlight=False)
            self.console.file.flush()
            time.sleep(delay_s)
    
    def append_agent_text(self, text: str, message_id: Optional[str], streaming: bool = False, stream_delay_ms: float = 0) -> None:
        """Append or update agent text.
        
        Args:
            text: The text content to add
            message_id: Optional message ID for tracking
            streaming: If True, print text immediately without full re-render
            stream_delay_ms: Delay in ms between characters (0 for instant, default: 0)
        """
        key = message_id or f"anon-{len(self.timeline)}"
        text_obj = Text(text)

        if key in self._agent_blocks:
            # Accumulate text for existing message
            block = self._agent_blocks[key]
            existing_text: Text = block["text"]  # type: ignore[assignment]
            
            # Calculate what's new (for streaming)
            old_length = len(existing_text.plain)
            existing_text.append(text)
            
            index = block["index"]  # type: ignore[index]
            self.timeline[index] = Panel(
                existing_text, title="AGENT", border_style="cyan"
            )
            
            # Stream only the NEW text directly to console
            if streaming:
                self._stream_text_char_by_char(text, stream_delay_ms)
        else:
            # New agent message block
            panel = Panel(text_obj, title="AGENT", border_style="cyan")
            self._append_panel(panel)
            self._agent_blocks[key] = {"index": len(self.timeline) - 1, "text": text_obj}
            
            # For new blocks in streaming mode, print header + text
            if streaming:
                self.console.print("\n[cyan]━━━ AGENT ━━━[/cyan]")
                self._stream_text_char_by_char(text, stream_delay_ms)

    def append_tool_call(self, tool_name: str, tool_input: Dict[str, object]) -> None:
        body = Text()
        if tool_name == "Bash":
            command = str(tool_input.get("command", ""))
            parsed = parse_bash_command(command)
            body.append(f"$ {command}\n")
            if parsed.get("cli"):
                body.append(f"(classified: {parsed['cli']})\n")
            if parsed.get("args") is not None:
                body.append(f"[args]: {parsed['args']}")
        else:
            if tool_input:
                try:
                    serialized = json.dumps(tool_input)
                    pretty, is_json = preview_json_line(serialized)
                    body.append(pretty if is_json else str(tool_input))
                except TypeError:
                    body.append(str(tool_input))
            else:
                body.append("{}")

        panel = Panel(body, title=f"🔧 TOOL CALL: {tool_name}", border_style="yellow")
        self._append_panel(panel)
        self.state.add_tool(tool_name)

    def append_tool_result_preview(self, raw_text: str) -> None:
        renderable, is_json = format_tool_result(raw_text)
        title = "TOOL RESULT (JSON)" if is_json else "TOOL RESULT (preview)"
        panel = Panel(renderable, title=title, border_style="magenta")
        self._append_panel(panel)

    # ------------------------------------------------------------------
    # Footer + rendering
    # ------------------------------------------------------------------
    def update_footer(self) -> None:
        bash_calls = self.state.tool_calls_by_name.get("Bash", 0)
        stats = (
            f"Cost: ${self.state.cumulative_cost_usd:.4f} | "
            f"Steps: {self.state.steps} | "
            f"Tool calls: {self.state.tool_calls_total} (Bash: {bash_calls}) | "
            f"Tokens in/out = {self.state.tokens_in}/{self.state.tokens_out}"
        )
        self.footer_text = Text(stats)

    def render(self) -> None:
        self.console.clear()
        for block in self.timeline:
            self.console.print(block)
        self.console.rule()
        self.console.print(self.footer_text)

    def reset(self) -> None:
        self.timeline.clear()
        self._agent_blocks.clear()
        self.state.reset()
        self.console.clear()
