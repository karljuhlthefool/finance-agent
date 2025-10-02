"""DataHub - facade that composes all providers and returns typed domain objects."""
from __future__ import annotations
from typing import Optional, List, Dict
from decimal import Decimal

from src.providers.fmp import FmpProvider
from src.providers.sec import SecProvider
from src.providers.capiq import CapIQProvider
from src.domain.models import (
    FundamentalsQuarterly,
    FilingRef,
    PriceSeries,
    Estimates,
    EstimatePoint,
    CompanyInfo,
    Provenance,
)


class DataHub:
    """Single entry point for CLIs - returns typed domain objects."""

    def __init__(
        self,
        fmp: Optional[FmpProvider] = None,
        sec: Optional[SecProvider] = None,
        capiq: Optional[CapIQProvider] = None,
    ):
        """Initialize DataHub with provider instances or create defaults."""
        self.fmp = fmp or FmpProvider()
        self.sec = sec or SecProvider()
        
        # CapIQ is optional (requires credentials)
        try:
            self.capiq = capiq or CapIQProvider()
        except ValueError:
            self.capiq = None

    # ---- Fundamentals ----

    def fundamentals_quarterly(
        self, ticker: str, limit: int = 8
    ) -> FundamentalsQuarterly:
        """
        Fetch quarterly fundamentals from FMP.

        Args:
            ticker: Stock ticker symbol
            limit: Number of quarters to fetch (default 8 = 2 years)

        Returns:
            FundamentalsQuarterly domain object with validated data
        """
        return self.fmp.get_quarterly_fundamentals(ticker, limit=limit)

    # ---- Prices ----

    def price_series(
        self, ticker: str, from_date: Optional[str] = None, to_date: Optional[str] = None
    ) -> PriceSeries:
        """
        Fetch historical prices from FMP.

        Args:
            ticker: Stock ticker symbol
            from_date: Start date in YYYY-MM-DD format (optional)
            to_date: End date in YYYY-MM-DD format (optional)

        Returns:
            PriceSeries domain object with validated price data
        """
        return self.fmp.get_historical_prices(ticker, from_date=from_date, to_date=to_date)

    # ---- SEC Filings ----

    def latest_filing(
        self, ticker: str, form_type: str = "10-K", exhibit_limit: int = 25
    ) -> FilingRef:
        """
        Fetch latest SEC filing for a ticker.

        Args:
            ticker: Stock ticker symbol
            form_type: Filing type (10-K, 10-Q, 8-K, 20-F, 40-F)
            exhibit_limit: Maximum number of exhibits to extract

        Returns:
            FilingRef domain object with paths to downloaded files
        """
        return self.sec.get_latest_filing(
            ticker, form_type=form_type, exhibit_limit=exhibit_limit
        )

    def extract_filing_sections(
        self,
        filing_ref: FilingRef,
        sections: Optional[List[str]] = None,
    ) -> Dict[str, Optional[str]]:
        """
        Extract specific sections from a previously downloaded filing.

        Args:
            filing_ref: FilingRef from latest_filing()
            sections: Section names (mda, business, risk_factors, financial_statements, 
                     ai_content, rd_content). Defaults to [mda, business, risk_factors]

        Returns:
            Dict mapping section names to extracted text (with XML tags)
        """
        return self.sec.extract_sections(filing_ref, sections=sections)

    def search_filing_keywords(
        self,
        filing_ref: FilingRef,
        keywords: List[str],
        pre_window: int = 1000,
        post_window: int = 1000,
    ) -> str:
        """
        Search for exact keyword phrases in a filing and return context.

        Args:
            filing_ref: FilingRef from latest_filing()
            keywords: List of phrases to search (case-insensitive)
            pre_window: Words before each match
            post_window: Words after each match

        Returns:
            Merged snippets separated by '--- SNIPPET BREAK ---'
        """
        return self.sec.search_keywords(
            filing_ref, keywords, pre_window=pre_window, post_window=post_window
        )

    def search_filing_regex(
        self,
        filing_ref: FilingRef,
        pattern: str,
        pre_window: int = 500,
        post_window: int = 500,
        snippet_min_words: int = 15,
    ) -> List[str]:
        """
        Search filing with regex pattern and return context snippets.

        Args:
            filing_ref: FilingRef from latest_filing()
            pattern: Regex pattern
            pre_window: Words before match
            post_window: Words after match
            snippet_min_words: Minimum words per snippet

        Returns:
            List of context snippets
        """
        return self.sec.search_regex(
            filing_ref,
            pattern,
            pre_window=pre_window,
            post_window=post_window,
            snippet_min_words=snippet_min_words,
        )

    # ---- CapIQ Estimates ----

    def estimates(
        self,
        ticker: str,
        estimate_type: str,
        years_future: int = 5,
        years_past: int = 0,
        currency: str = "original",
    ) -> Estimates:
        """
        Fetch analyst estimates from CapIQ.

        Args:
            ticker: Stock ticker symbol
            estimate_type: Type (revenue, eps, ebitda, ebit, free_cash_flow, etc.)
            years_future: Number of future years
            years_past: Number of past years
            currency: "original" or "usd"

        Returns:
            Estimates domain object with analyst consensus estimates
        """
        if not self.capiq:
            raise ValueError(
                "CapIQ provider not available. Set CIQ_LOGIN and CIQ_PASSWORD in .env"
            )

        data_points = self.capiq.get_estimates(
            identifiers=[ticker],
            estimate_type=estimate_type,
            years_future=years_future,
            years_past=years_past,
            currency=currency,
        )

        # Group by period and mnemonic
        by_period: dict = {}
        for dp in data_points:
            if not dp.period:
                continue
            
            if dp.period not in by_period:
                by_period[dp.period] = {}
            
            # Check if this is the estimate value or num estimates
            if "NUM_EST" in dp.mnemonic:
                by_period[dp.period]["num_estimates"] = int(dp.value) if dp.value else None
            else:
                by_period[dp.period]["value"] = Decimal(str(dp.value)) if dp.value else None

        # Build estimate points
        points: List[EstimatePoint] = []
        for period in sorted(by_period.keys()):
            data = by_period[period]
            points.append(
                EstimatePoint(
                    period=period,
                    value=data.get("value"),
                    num_estimates=data.get("num_estimates"),
                )
            )

        return Estimates(
            ticker=ticker,
            metric_type=estimate_type,
            currency=currency.upper() if currency.lower() == "usd" else "USD",
            points=points,
            provenance=Provenance(
                source="CapIQ",
                fetched_at=None,
                meta={"estimate_type": estimate_type, "years_future": years_future},
            ),
        )

    def company_info(self, ticker: str, info_type: str = "medium_description") -> CompanyInfo:
        """
        Fetch company information from CapIQ.

        Args:
            ticker: Stock ticker symbol
            info_type: Type (description, short_description, medium_description, status)

        Returns:
            CompanyInfo domain object
        """
        if not self.capiq:
            raise ValueError(
                "CapIQ provider not available. Set CIQ_LOGIN and CIQ_PASSWORD in .env"
            )

        data_points = self.capiq.get_company_info(
            identifiers=[ticker], info_type=info_type
        )

        if not data_points:
            raise ValueError(f"No company info found for {ticker}")

        value = str(data_points[0].value)

        return CompanyInfo(
            ticker=ticker,
            info_type=info_type,
            value=value,
            provenance=Provenance(
                source="CapIQ", fetched_at=None, meta={"info_type": info_type}
            ),
        )


