"""Workspace utility functions."""
from pathlib import Path


def ensure_workspace(root: Path) -> None:
    """Create workspace directory structure.
    
    Structure:
      workspace/
        ├── raw/          # Automatic data fetches (market, filings)
        ├── artifacts/    # Intentional user outputs (reports, charts, Q&A)
        └── .cache/       # Hidden SDK internals
    """
    dirs = [
        root,
        root / "raw",
        root / "artifacts",
        root / ".cache",
    ]
    
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
