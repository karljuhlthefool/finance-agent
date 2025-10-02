"""FMP provider client with typed responses."""
from __future__ import annotations
import os
import json
from typing import List, Optional, Dict, Any
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

    # ---- Company Information ----

    def get_company_profile(self, ticker: str) -> Dict[str, Any]:
        """Fetch company profile/overview."""
        url = f"{self.base_url}/profile/{ticker}?apikey={self.api_key}"
        data = self._get_json(url)
        return data[0] if isinstance(data, list) and data else data

    def get_key_executives(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch key executives."""
        url = f"{self.base_url}/key-executives/{ticker}?apikey={self.api_key}"
        return self._get_json(url)

    def get_market_capitalization(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch current market cap."""
        url = f"{self.base_url}/market-capitalization/{ticker}?apikey={self.api_key}"
        return self._get_json(url)

    # ---- Financial Metrics ----

    def get_key_metrics(
        self, ticker: str, period: str = "annual", limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Fetch key financial metrics."""
        url = f"{self.base_url}/key-metrics/{ticker}?period={period}&limit={limit}&apikey={self.api_key}"
        return self._get_json(url)

    def get_key_metrics_ttm(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch trailing twelve month metrics."""
        url = f"{self.base_url}/key-metrics-ttm/{ticker}?apikey={self.api_key}"
        return self._get_json(url)

    def get_financial_ratios(
        self, ticker: str, period: str = "annual", limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Fetch financial ratios."""
        url = f"{self.base_url}/ratios/{ticker}?period={period}&limit={limit}&apikey={self.api_key}"
        return self._get_json(url)

    def get_enterprise_values(
        self, ticker: str, period: str = "annual", limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Fetch enterprise value data."""
        url = f"{self.base_url}/enterprise-values/{ticker}?period={period}&limit={limit}&apikey={self.api_key}"
        return self._get_json(url)

    def get_financial_growth(
        self, ticker: str, period: str = "annual", limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Fetch financial growth metrics (revenue growth, net income growth, etc)."""
        url = f"{self.base_url}/financial-growth/{ticker}?period={period}&limit={limit}&apikey={self.api_key}"
        return self._get_json(url)

    def get_income_statement_growth(
        self, ticker: str, period: str = "annual", limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Fetch detailed income statement growth rates."""
        url = f"{self.base_url}/income-statement-growth/{ticker}?period={period}&limit={limit}&apikey={self.api_key}"
        return self._get_json(url)

    def get_owner_earnings(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch owner earnings (Buffett-style metric)."""
        url = f"https://fmpcloud.io/api/v4/owner_earnings?symbol={ticker}&apikey={self.api_key}"
        return self._get_json(url)

    # ---- Analyst & Market Data ----

    def get_analyst_estimates(self, ticker: str, period: str = "annual", limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch analyst estimates for revenue, EPS, etc."""
        url = f"{self.base_url}/analyst-estimates/{ticker}?period={period}&limit={limit}&apikey={self.api_key}"
        return self._get_json(url)

    def get_analyst_recommendations(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch analyst buy/sell/hold recommendations."""
        url = f"{self.base_url}/analyst-stock-recommendations/{ticker}?apikey={self.api_key}"
        return self._get_json(url)

    def get_upgrades_downgrades(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch analyst upgrades and downgrades."""
        url = f"https://fmpcloud.io/api/v4/upgrades-downgrades?symbol={ticker}&apikey={self.api_key}"
        return self._get_json(url)

    def get_earnings_surprises(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch historical earnings surprises."""
        url = f"{self.base_url}/earnings-surprises/{ticker}?apikey={self.api_key}"
        return self._get_json(url)

    def get_price_target(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch analyst price targets."""
        url = f"https://fmpcloud.io/api/v4/price-target?symbol={ticker}&apikey={self.api_key}"
        return self._get_json(url)

    def get_stock_peers(self, ticker: str) -> List[str]:
        """Fetch peer companies."""
        url = f"https://fmpcloud.io/api/v4/stock_peers?symbol={ticker}&apikey={self.api_key}"
        data = self._get_json(url)
        return data[0].get("peersList", []) if isinstance(data, list) and data else []

    # ---- Ownership & Insider Data ----

    def get_institutional_ownership(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch institutional ownership."""
        url = f"https://fmpcloud.io/api/v4/institutional-ownership/symbol-ownership?symbol={ticker}&includeCurrentQuarter=false&apikey={self.api_key}"
        return self._get_json(url)

    def get_insider_trading(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch insider trading statistics."""
        url = f"https://fmpcloud.io/api/v4/insider-roaster-statistic?symbol={ticker}&apikey={self.api_key}"
        return self._get_json(url)

    # ---- Dividends & Stock Events ----

    def get_dividends(self, ticker: str) -> Dict[str, Any]:
        """Fetch dividend history."""
        url = f"{self.base_url}/historical-price-full/stock_dividend/{ticker}?apikey={self.api_key}"
        return self._get_json(url)

    def get_stock_splits(self, ticker: str) -> Dict[str, Any]:
        """Fetch stock split history."""
        url = f"{self.base_url}/historical-price-full/stock_split/{ticker}?apikey={self.api_key}"
        return self._get_json(url)

    # ---- Segment Data ----

    def get_revenue_segments_by_product(self, ticker: str, period: str = "annual") -> List[Dict[str, Any]]:
        """Fetch revenue segmentation by product/service."""
        url = f"https://fmpcloud.io/api/v4/revenue-product-segmentation?symbol={ticker}&structure=flat&period={period}&apikey={self.api_key}"
        return self._get_json(url)

    def get_revenue_segments_by_geography(self, ticker: str, period: str = "annual") -> List[Dict[str, Any]]:
        """Fetch revenue segmentation by geography."""
        url = f"https://fmpcloud.io/api/v4/revenue-geographic-segmentation?symbol={ticker}&structure=flat&period={period}&apikey={self.api_key}"
        return self._get_json(url)

    # ---- SEC Filings ----

    def get_sec_filings(self, ticker: str, filing_type: Optional[str] = None, page: int = 0) -> List[Dict[str, Any]]:
        """Fetch SEC filings list."""
        url = f"{self.base_url}/sec_filings/{ticker}?page={page}&apikey={self.api_key}"
        if filing_type:
            url += f"&type={filing_type}"
        return self._get_json(url)

    # ---- ESG & Governance ----

    def get_esg_ratings(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch ESG ratings."""
        url = f"https://fmpcloud.io/api/v4/esg-environmental-social-governance-data-ratings?symbol={ticker}&apikey={self.api_key}"
        return self._get_json(url)

    def get_executive_compensation(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch executive compensation data."""
        url = f"https://fmpcloud.io/api/v4/governance/executive_compensation?symbol={ticker}&apikey={self.api_key}"
        return self._get_json(url)

    # ---- Market Overview ----

    def get_quote(self, ticker: str) -> List[Dict[str, Any]]:
        """Fetch real-time quote data."""
        url = f"{self.base_url}/quote/{ticker}?apikey={self.api_key}"
        return self._get_json(url)

    def get_stock_screener(
        self,
        market_cap_min: Optional[int] = None,
        market_cap_max: Optional[int] = None,
        sector: Optional[str] = None,
        industry: Optional[str] = None,
        exchange: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Screen stocks by various criteria."""
        url = f"{self.base_url}/stock-screener?limit={limit}&apikey={self.api_key}"
        if market_cap_min:
            url += f"&marketCapMoreThan={market_cap_min}"
        if market_cap_max:
            url += f"&marketCapLowerThan={market_cap_max}"
        if sector:
            url += f"&sector={sector}"
        if industry:
            url += f"&industry={industry}"
        if exchange:
            url += f"&exchange={exchange}"
        return self._get_json(url)


