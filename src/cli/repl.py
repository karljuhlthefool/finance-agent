from __future__ import annotations

"""User input helpers for the interactive CLI."""

import anyio
from prompt_toolkit import PromptSession
from prompt_toolkit.history import InMemoryHistory


PROMPT = "> "


def create_prompt_session() -> PromptSession:
    """Create a PromptToolkit session with history enabled."""

    return PromptSession(history=InMemoryHistory())


async def iter_user_inputs(session: PromptSession):
    """Yield user inputs asynchronously using PromptToolkit."""

    while True:
        text = await anyio.to_thread.run_sync(session.prompt, PROMPT)
        yield text


def is_clear_cmd(text: str) -> bool:
    """Return True if the entered text is the /clear command."""

    return text.strip() == "/clear"
