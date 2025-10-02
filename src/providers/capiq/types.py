"""CapIQ-specific DTOs and response models."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict


class CapIQAuthResponse(BaseModel):
    """Token response from CapIQ authentication."""
    scope: Optional[str] = None
    expires_in_seconds: str = "3600"
    token_type: str = "Bearer"
    access_token: str
    refresh_token: str


class CapIQGDSRow(BaseModel):
    """Single row in GDS response."""
    Row: List[Any]


class CapIQGDSItem(BaseModel):
    """Single item in GDS response."""
    Function: str = "GDSP"
    Identifier: str
    Mnemonic: Optional[str] = None
    Properties: Dict[str, Any] = Field(default_factory=dict)
    Rows: List[CapIQGDSRow] = Field(default_factory=list)
    ErrMsg: str = ""


class CapIQGDSResponse(BaseModel):
    """Full GDS API response."""
    GDSSDKResponse: List[CapIQGDSItem]


class CapIQDataPoint(BaseModel):
    """Parsed data point from CapIQ."""
    identifier: str
    mnemonic: str
    value: Any  # Can be float, str, etc.
    period: Optional[str] = None
    asofdate: Optional[str] = None

