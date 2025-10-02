"""Tests for SEC provider via DataHub."""
import os
import pytest
from pathlib import Path
from src.datahub import DataHub
from src.domain.models import FilingRef


@pytest.fixture
def datahub():
    """Create DataHub instance for testing."""
    return DataHub()


def test_sec_filing_smoke(datahub):
    """Smoke test: fetch AAPL 10-K and validate structure."""
    result = datahub.latest_filing("AAPL", form_type="10-K", exhibit_limit=5)
    
    assert isinstance(result, FilingRef)
    assert result.ticker == "AAPL"
    assert result.form == "10-K"
    assert result.filing_date is not None
    assert result.cik is not None
    assert result.accession is not None
    assert result.provenance.source == "SEC EDGAR"
    
    # Check files were created
    assert Path(result.main_text_path).exists()
    assert Path(result.exhibits_index_path).exists()
    
    # Check main text has content
    content = Path(result.main_text_path).read_text()
    assert len(content) > 1000  # SEC filings are long


def test_sec_filing_10q(datahub):
    """Test fetching 10-Q filing."""
    result = datahub.latest_filing("MSFT", form_type="10-Q", exhibit_limit=3)
    
    assert isinstance(result, FilingRef)
    assert result.ticker == "MSFT"
    assert result.form == "10-Q"
    assert Path(result.main_text_path).exists()


def test_sec_invalid_form_type(datahub):
    """Test error handling for invalid form type."""
    with pytest.raises(ValueError, match="Invalid form type"):
        datahub.latest_filing("AAPL", form_type="INVALID")

