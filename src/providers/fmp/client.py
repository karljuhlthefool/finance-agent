"""FMP provider client with typed responses."""
from __future__ import annotations
import os
import json
from typing import List, Optional
from datetime import datetime
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from decimal import Decimal
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from .types import FmpIncomeRow, FmpBalanceRow, FmpCashflowRow, FmpPriceRow
from src.domain.models import (
    FundamentalsQuarterly,
    QuarterFundamentals,
    PriceSeries,
    PricePoint,
    Provenance,
)
from src.domain.types import Ticker


class FmpProvider:
    """Typed wrapper around FMP API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("FMP_API_KEY")
        if not self.api_key:
            raise ValueError("FMP_API_KEY not set")
        self.base_url = "https://financialmodelingprep.com/api/v3"

    def _get_json(self, url: str) -> dict | list:
        """Fetch and parse JSON from FMP API."""
        req = Request(url)
        with urlopen(req) as response:
            if response.getcode() >= 400:
                raise HTTPError(
                    url, response.getcode(), f"HTTP {response.getcode()}", {}, None
                )
            data = response.read().decode("utf-8")
            return json.loads(data)

    def get_quarterly_fundamentals(
        self, ticker: str, limit: int = 8
    ) -> FundamentalsQuarterly:
        """Fetch quarterly fundamentals and map to domain model."""
        # Fetch all three statements
        income_url = f"{self.base_url}/income-statement/{ticker}?period=quarter&limit={limit}&apikey={self.api_key}"
        balance_url = f"{self.base_url}/balance-sheet-statement/{ticker}?period=quarter&limit={limit}&apikey={self.api_key}"
        cashflow_url = f"{self.base_url}/cash-flow-statement/{ticker}?period=quarter&limit={limit}&apikey={self.api_key}"

        income_data = self._get_json(income_url)
        balance_data = self._get_json(balance_url)
        cashflow_data = self._get_json(cashflow_url)

        # Validate and parse
        income_rows = [FmpIncomeRow.model_validate(r) for r in income_data]
        balance_rows = [FmpBalanceRow.model_validate(r) for r in balance_data]
        cashflow_rows = [FmpCashflowRow.model_validate(r) for r in cashflow_data]

        # Merge by date
        by_date = {}
        for r in income_rows:
            dt = r.date
            if not dt:
                continue
            by_date.setdefault(dt, {})["income"] = r

        for r in balance_rows:
            dt = r.date
            if not dt:
                continue
            by_date.setdefault(dt, {})["balance"] = r

        for r in cashflow_rows:
            dt = r.date
            if not dt:
                continue
            by_date.setdefault(dt, {})["cashflow"] = r

        # Build quarters (most recent first from FMP, reverse to oldest→newest)
        quarters: List[QuarterFundamentals] = []
        for dt in sorted(by_date.keys()):
            parts = by_date[dt]
            inc = parts.get("income")
            bal = parts.get("balance")
            cf = parts.get("cashflow")

            quarters.append(
                QuarterFundamentals(
                    period_end=dt,
                    revenue=Decimal(str(inc.revenue))
                    if (inc and inc.revenue is not None)
                    else None,
                    net_income=Decimal(str(inc.netIncome))
                    if (inc and inc.netIncome is not None)
                    else None,
                    ocf=Decimal(str(cf.operatingCashFlow))
                    if (cf and cf.operatingCashFlow is not None)
                    else None,
                    fcf=Decimal(str(cf.freeCashFlow))
                    if (cf and cf.freeCashFlow is not None)
                    else None,
                    shares_diluted=Decimal(str(inc.weightedAverageShsOutDil))
                    if (inc and inc.weightedAverageShsOutDil is not None)
                    else None,
                    total_assets=Decimal(str(bal.totalAssets))
                    if (bal and bal.totalAssets is not None)
                    else None,
                    total_debt=Decimal(str(bal.totalDebt))
                    if (bal and bal.totalDebt is not None)
                    else None,
                    cash=Decimal(str(bal.cashAndCashEquivalents))
                    if (bal and bal.cashAndCashEquivalents is not None)
                    else None,
                )
            )

        return FundamentalsQuarterly(
            ticker=ticker,
            currency="USD",
            pit=True,
            quarters=quarters,
            provenance=Provenance(
                source="FMP",
                fetched_at=datetime.utcnow().isoformat(),
                meta={"endpoint": "financial-statements", "period": "quarterly"},
            ),
        )

    def get_historical_prices(
        self, ticker: str, from_date: Optional[str] = None, to_date: Optional[str] = None
    ) -> PriceSeries:
        """Fetch historical prices and map to domain model."""
        url = f"{self.base_url}/historical-price-full/{ticker}?apikey={self.api_key}"
        if from_date:
            url += f"&from={from_date}"
        if to_date:
            url += f"&to={to_date}"

        data = self._get_json(url)
        historical = data.get("historical", [])

        price_rows = [FmpPriceRow.model_validate(r) for r in historical]

        points = [
            PricePoint(
                date=r.date,
                close=Decimal(str(r.close)),
                open=Decimal(str(r.open)) if r.open is not None else None,
                high=Decimal(str(r.high)) if r.high is not None else None,
                low=Decimal(str(r.low)) if r.low is not None else None,
                volume=r.volume,
            )
            for r in price_rows
        ]

        return PriceSeries(
            ticker=ticker,
            currency="USD",
            points=points,
            provenance=Provenance(
                source="FMP",
                fetched_at=datetime.utcnow().isoformat(),
                meta={"endpoint": "historical-price-full"},
            ),
        )


