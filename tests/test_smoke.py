#!/usr/bin/env python3
"""Quick smoke test to verify the typed client architecture."""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent to path for src imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.datahub import DataHub
from src.domain.models import FundamentalsQuarterly, FilingRef


def test_imports():
    """Test that all imports work."""
    print("✓ All imports successful")


def test_datahub_creation():
    """Test DataHub can be instantiated."""
    if not os.getenv("FMP_API_KEY"):
        print("⚠ Skipping DataHub test (FMP_API_KEY not set)")
        return
    
    hub = DataHub()
    assert hub.fmp is not None
    assert hub.sec is not None
    print("✓ DataHub instantiated successfully")


def test_domain_models():
    """Test domain model validation."""
    from src.domain.models import QuarterFundamentals, Provenance
    from decimal import Decimal
    
    q = QuarterFundamentals(
        period_end="2024-09-30",
        revenue=Decimal("100000000"),
        net_income=Decimal("25000000")
    )
    assert q.revenue == Decimal("100000000")
    print("✓ Domain models validate correctly")


def test_provider_types():
    """Test provider DTOs."""
    from src.providers.fmp.types import FmpIncomeRow
    
    row = FmpIncomeRow(
        date="2024-09-30",
        revenue=100000000.0,
        netIncome=25000000.0
    )
    assert row.date == "2024-09-30"
    print("✓ Provider DTOs validate correctly")


if __name__ == "__main__":
    print("Running smoke tests...\n")
    
    try:
        test_imports()
        test_datahub_creation()
        test_domain_models()
        test_provider_types()
        
        print("\n✅ All smoke tests passed!")
        print("\nNext steps:")
        print("1. Ensure FMP_API_KEY is in your .env file")
        print("2. Test CLI: echo '{\"ticker\":\"AAPL\",\"fields\":[\"fundamentals\"]}' | bin/mf-market-get")
        print("3. Run full test suite: pytest tests/")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

