"""Tests for provider-to-domain mappers."""
import pytest
from decimal import Decimal
from src.providers.fmp.types import FmpIncomeRow, FmpCashflowRow, FmpPriceRow
from src.domain.models import QuarterFundamentals, PricePoint


def test_fmp_income_row_parsing():
    """Test FMP income row DTO validation."""
    data = {
        "date": "2024-09-30",
        "calendarYear": "2024",
        "revenue": 94930000000.0,
        "netIncome": 22956000000.0,
        "weightedAverageShsOutDil": 15204100000.0
    }
    
    row = FmpIncomeRow.model_validate(data)
    assert row.date == "2024-09-30"
    assert row.revenue == 94930000000.0
    assert row.netIncome == 22956000000.0


def test_fmp_cashflow_row_parsing():
    """Test FMP cashflow row DTO validation."""
    data = {
        "date": "2024-09-30",
        "operatingCashFlow": 31200000000.0,
        "freeCashFlow": 26190000000.0
    }
    
    row = FmpCashflowRow.model_validate(data)
    assert row.date == "2024-09-30"
    assert row.operatingCashFlow == 31200000000.0
    assert row.freeCashFlow == 26190000000.0


def test_fmp_price_row_parsing():
    """Test FMP price row DTO validation."""
    data = {
        "date": "2024-01-15",
        "close": 185.92,
        "open": 182.16,
        "high": 186.40,
        "low": 181.50,
        "volume": 58840300
    }
    
    row = FmpPriceRow.model_validate(data)
    assert row.date == "2024-01-15"
    assert row.close == 185.92
    assert row.volume == 58840300


def test_quarter_fundamentals_decimal_conversion():
    """Test that domain model uses Decimal for money values."""
    quarter = QuarterFundamentals(
        period_end="2024-09-30",
        revenue=Decimal("94930000000"),
        net_income=Decimal("22956000000"),
        fcf=Decimal("26190000000"),
        shares_diluted=Decimal("15204100000")
    )
    
    assert isinstance(quarter.revenue, Decimal)
    assert isinstance(quarter.net_income, Decimal)
    assert isinstance(quarter.fcf, Decimal)
    assert quarter.revenue == Decimal("94930000000")


def test_price_point_decimal_conversion():
    """Test that price point uses Decimal."""
    point = PricePoint(
        date="2024-01-15",
        close=Decimal("185.92"),
        open=Decimal("182.16"),
        high=Decimal("186.40"),
        low=Decimal("181.50"),
        volume=58840300
    )
    
    assert isinstance(point.close, Decimal)
    assert isinstance(point.open, Decimal)
    assert point.close == Decimal("185.92")


def test_optional_fields_allow_none():
    """Test that optional fields accept None."""
    quarter = QuarterFundamentals(
        period_end="2024-09-30",
        revenue=None,
        net_income=None,
        fcf=None
    )
    
    assert quarter.revenue is None
    assert quarter.net_income is None
    assert quarter.fcf is None

