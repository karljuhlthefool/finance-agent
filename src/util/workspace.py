"""Workspace utility functions."""
from pathlib import Path


def ensure_workspace(root: Path) -> None:
    """Create workspace directory structure."""
    dirs = [
        root,
        root / "data",
        root / "analysis",
        root / "outputs",
        root / "logs",
    ]
    
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
