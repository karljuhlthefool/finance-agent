"""Tests for CapIQ provider via DataHub."""
import os
import pytest
from decimal import Decimal
from src.datahub import DataHub
from src.domain.models import Estimates, CompanyInfo


@pytest.fixture
def datahub():
    """Create DataHub instance for testing."""
    return DataHub()


def test_capiq_availability(datahub):
    """Test that CapIQ provider initializes correctly."""
    if not os.getenv("CIQ_LOGIN") or not os.getenv("CIQ_PASSWORD"):
        assert datahub.capiq is None
        pytest.skip("CIQ credentials not set")
    else:
        assert datahub.capiq is not None


def test_capiq_estimates_smoke(datahub):
    """Smoke test: fetch revenue estimates for AAPL."""
    if not datahub.capiq:
        pytest.skip("CapIQ not available (credentials not set)")
    
    result = datahub.estimates("AAPL", estimate_type="revenue", years_future=3)
    
    assert isinstance(result, Estimates)
    assert result.ticker == "AAPL"
    assert result.metric_type == "revenue"
    assert len(result.points) >= 1
    assert result.provenance.source == "CapIQ"
    
    # Check first estimate point
    point = result.points[0]
    assert point.period is not None
    assert "IQ_FY" in point.period
    if point.value:
        assert isinstance(point.value, Decimal)


def test_capiq_company_info_smoke(datahub):
    """Smoke test: fetch company description."""
    if not datahub.capiq:
        pytest.skip("CapIQ not available (credentials not set)")
    
    result = datahub.company_info("AAPL", info_type="medium_description")
    
    assert isinstance(result, CompanyInfo)
    assert result.ticker == "AAPL"
    assert result.info_type == "medium_description"
    assert len(result.value) > 50  # Should be a substantial description
    assert result.provenance.source == "CapIQ"


def test_capiq_estimates_types(datahub):
    """Test different estimate types."""
    if not datahub.capiq:
        pytest.skip("CapIQ not available (credentials not set)")
    
    for est_type in ["revenue", "eps", "ebitda"]:
        result = datahub.estimates("MSFT", estimate_type=est_type, years_future=2)
        assert result.metric_type == est_type
        assert len(result.points) >= 1


def test_capiq_error_without_credentials():
    """Test that appropriate error is raised without credentials."""
    # Force DataHub without CapIQ
    hub = DataHub()
    
    if hub.capiq is None:
        with pytest.raises(ValueError, match="CapIQ provider not available"):
            hub.estimates("AAPL", "revenue")
        
        with pytest.raises(ValueError, match="CapIQ provider not available"):
            hub.company_info("AAPL")

