"""Tests for FMP provider via DataHub."""
import os
import pytest
from decimal import Decimal
from src.datahub import DataHub
from src.domain.models import FundamentalsQuarterly, PriceSeries


@pytest.fixture
def datahub():
    """Create DataHub instance for testing."""
    return DataHub()


def test_fmp_fundamentals_smoke(datahub):
    """Smoke test: fetch AAPL fundamentals and validate structure."""
    if not os.getenv("FMP_API_KEY"):
        pytest.skip("FMP_API_KEY not set")
    
    result = datahub.fundamentals_quarterly("AAPL", limit=2)
    
    assert isinstance(result, FundamentalsQuarterly)
    assert result.ticker == "AAPL"
    assert result.currency == "USD"
    assert result.pit is True
    assert len(result.quarters) >= 1
    assert result.provenance.source == "FMP"
    
    # Check first quarter has expected fields
    q = result.quarters[0]
    assert q.period_end is not None
    assert isinstance(q.revenue, (Decimal, type(None)))
    assert isinstance(q.net_income, (Decimal, type(None)))
    assert isinstance(q.fcf, (Decimal, type(None)))


def test_fmp_prices_smoke(datahub):
    """Smoke test: fetch AAPL prices and validate structure."""
    if not os.getenv("FMP_API_KEY"):
        pytest.skip("FMP_API_KEY not set")
    
    result = datahub.price_series("AAPL", from_date="2024-01-01", to_date="2024-01-31")
    
    assert isinstance(result, PriceSeries)
    assert result.ticker == "AAPL"
    assert result.currency == "USD"
    assert len(result.points) >= 1
    assert result.provenance.source == "FMP"
    
    # Check first price point
    p = result.points[0]
    assert p.date is not None
    assert isinstance(p.close, Decimal)
    assert p.close > 0


def test_fundamentals_data_types(datahub):
    """Verify all numeric fields are Decimal, not float."""
    if not os.getenv("FMP_API_KEY"):
        pytest.skip("FMP_API_KEY not set")
    
    result = datahub.fundamentals_quarterly("MSFT", limit=1)
    
    q = result.quarters[0]
    
    # All money fields should be Decimal or None
    if q.revenue is not None:
        assert isinstance(q.revenue, Decimal)
    if q.net_income is not None:
        assert isinstance(q.net_income, Decimal)
    if q.fcf is not None:
        assert isinstance(q.fcf, Decimal)
    if q.shares_diluted is not None:
        assert isinstance(q.shares_diluted, Decimal)


def test_invalid_ticker(datahub):
    """Test error handling for invalid ticker."""
    if not os.getenv("FMP_API_KEY"):
        pytest.skip("FMP_API_KEY not set")
    
    with pytest.raises(Exception):
        # This should fail or return empty data
        datahub.fundamentals_quarterly("INVALID_TICKER_XYZ", limit=1)

