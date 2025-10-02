"""SEC-specific types and response models."""
from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


class SecFilingMeta(BaseModel):
    """Metadata for a SEC filing."""
    accession: str
    filing_date: str
    cik: str
    form_type: str


class SecExhibit(BaseModel):
    """Individual exhibit within a filing."""
    sequence: str
    type: str
    filename: str


