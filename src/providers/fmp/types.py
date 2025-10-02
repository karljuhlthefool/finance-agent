"""FMP-specific DTOs and response models."""
from __future__ import annotations
from pydantic import BaseModel
from typing import List, Optional


class FmpIncomeRow(BaseModel):
    """Single row from FMP income statement."""
    date: Optional[str] = None
    calendarYear: Optional[str] = None
    period: Optional[str] = None
    revenue: Optional[float] = None
    netIncome: Optional[float] = None
    weightedAverageShsOutDil: Optional[float] = None
    eps: Optional[float] = None
    epsdiluted: Optional[float] = None


class FmpBalanceRow(BaseModel):
    """Single row from FMP balance sheet."""
    date: Optional[str] = None
    calendarYear: Optional[str] = None
    period: Optional[str] = None
    totalAssets: Optional[float] = None
    totalDebt: Optional[float] = None
    cashAndCashEquivalents: Optional[float] = None
    totalStockholdersEquity: Optional[float] = None


class FmpCashflowRow(BaseModel):
    """Single row from FMP cash flow statement."""
    date: Optional[str] = None
    calendarYear: Optional[str] = None
    period: Optional[str] = None
    operatingCashFlow: Optional[float] = None
    freeCashFlow: Optional[float] = None
    capitalExpenditure: Optional[float] = None


class FmpPriceRow(BaseModel):
    """Single row from FMP historical prices."""
    date: str
    close: float
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[int] = None


