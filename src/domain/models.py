"""Core domain models - small, reusable, token-efficient."""
from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from .types import Ticker, ISODate, Currency, Money
from decimal import Decimal


class Provenance(BaseModel):
    """Track data source and metadata."""
    model_config = ConfigDict(extra='forbid')
    
    source: str = Field(..., description="Provider name: FMP|SEC|XIGNITE|CAPIQ")
    fetched_at: Optional[str] = None
    meta: dict = Field(default_factory=dict)


class QuarterFundamentals(BaseModel):
    """Single quarter of financial data."""
    model_config = ConfigDict(extra='forbid')
    
    period_end: ISODate
    revenue: Optional[Money] = None
    net_income: Optional[Money] = None
    ocf: Optional[Money] = None  # Operating cash flow
    fcf: Optional[Money] = None  # Free cash flow
    shares_diluted: Optional[Decimal] = None
    total_assets: Optional[Money] = None
    total_debt: Optional[Money] = None
    cash: Optional[Money] = None


class FundamentalsQuarterly(BaseModel):
    """Quarterly fundamentals for a ticker."""
    model_config = ConfigDict(extra='forbid')
    
    ticker: Ticker
    currency: Currency
    pit: bool = Field(default=True, description="Point-in-time data")
    quarters: List[QuarterFundamentals]
    provenance: Provenance


class FilingRef(BaseModel):
    """Reference to a downloaded SEC filing."""
    model_config = ConfigDict(extra='forbid')
    
    ticker: Ticker
    form: Literal["10-K", "10-Q", "8-K", "20-F", "40-F"]
    filing_date: ISODate
    accession: Optional[str] = None
    cik: Optional[str] = None
    main_text_path: str
    exhibits_index_path: Optional[str] = None
    provenance: Provenance


class PricePoint(BaseModel):
    """Single price observation."""
    model_config = ConfigDict(extra='forbid')
    
    date: ISODate
    close: Money
    open: Optional[Money] = None
    high: Optional[Money] = None
    low: Optional[Money] = None
    volume: Optional[int] = None


class PriceSeries(BaseModel):
    """Historical price series."""
    model_config = ConfigDict(extra='forbid')
    
    ticker: Ticker
    currency: Currency
    points: List[PricePoint]
    provenance: Provenance


class EstimatePoint(BaseModel):
    """Single estimate data point."""
    model_config = ConfigDict(extra='forbid')
    
    period: str  # e.g. "IQ_FY+1", "IQ_FQ12024"
    value: Optional[Money] = None
    num_estimates: Optional[int] = None  # Number of analyst estimates


class Estimates(BaseModel):
    """Analyst estimates for a ticker."""
    model_config = ConfigDict(extra='forbid')
    
    ticker: Ticker
    metric_type: str  # revenue, eps, ebitda, etc.
    currency: Currency
    points: List[EstimatePoint]
    provenance: Provenance


class CompanyInfo(BaseModel):
    """Company information."""
    model_config = ConfigDict(extra='forbid')
    
    ticker: Ticker
    info_type: str  # description, status, etc.
    value: str
    provenance: Provenance


