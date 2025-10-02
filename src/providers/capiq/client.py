"""CapIQ provider client with typed responses."""
from __future__ import annotations
import os
import json
import time
import re
from typing import List, Optional, Sequence, Dict, Any, Mapping
from datetime import datetime, timedelta
import calendar
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

from .types import (
    CapIQAuthResponse,
    CapIQGDSResponse,
    CapIQDataPoint,
)
from src.domain.models import (
    FundamentalsQuarterly,
    QuarterFundamentals,
    Provenance,
)

# Period validation regex
_PERIOD_RE = re.compile(
    r"^IQ_(?:FY(?:[+-]\d+|\d{4})?|FQ(?:[+-]\d+|[1-4]\d{4})?|LTM|YTD|NTM)$"
)


def fq(year: int, quarter: int) -> str:
    """Format fiscal quarter period string."""
    if quarter not in (1, 2, 3, 4):
        raise ValueError("quarter must be 1..4")
    return f"IQ_FQ{quarter}{year}"


def fy(year: int) -> str:
    """Format fiscal year period string."""
    return f"IQ_FY{year}"


def last_weekday_of_december(year: int) -> str:
    """Get last weekday of December in MM/DD/YYYY format."""
    d = datetime(year, 12, calendar.monthrange(year, 12)[1])
    while d.weekday() >= 5:  # Sat=5, Sun=6
        d -= timedelta(days=1)
    return d.strftime("%m/%d/%Y")


class CapIQProvider:
    """Typed wrapper around S&P Capital IQ API."""

    def __init__(
        self,
        username: Optional[str] = None,
        password: Optional[str] = None,
        auth_base_url: str = "https://api-ciq.marketintelligence.spglobal.com/gdsapi/rest/authenticate",
        data_base_url: str = "https://api-ciq.marketintelligence.spglobal.com/gdsapi/rest/v3/clientservice.json",
    ):
        self.username = username or os.getenv("CIQ_LOGIN")
        self.password = password or os.getenv("CIQ_PASSWORD")
        
        if not self.username or not self.password:
            raise ValueError("CIQ_LOGIN and CIQ_PASSWORD must be set")
        
        self.auth_base_url = auth_base_url.rstrip("/")
        self.data_base_url = data_base_url
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_type: str = "Bearer"
        self.token_expiry_epoch: float = 0.0

    def _http_post(self, url: str, data: Any, headers: Dict[str, str]) -> dict:
        """Make HTTP POST request and return JSON response."""
        if isinstance(data, dict):
            data = json.dumps(data).encode('utf-8')
        elif isinstance(data, str):
            data = data.encode('utf-8')
        
        req = Request(url, data=data, headers=headers)
        
        with urlopen(req) as response:
            if response.getcode() >= 400:
                raise HTTPError(
                    url, response.getcode(), f"HTTP {response.getcode()}", {}, None
                )
            return json.loads(response.read().decode('utf-8'))

    def _save_token_info(self, token_data: dict):
        """Save token response to instance variables."""
        auth_resp = CapIQAuthResponse.model_validate(token_data)
        self.token_type = auth_resp.token_type
        self.access_token = auth_resp.access_token
        self.refresh_token = auth_resp.refresh_token
        
        try:
            expires_in = int(auth_resp.expires_in_seconds)
        except ValueError:
            expires_in = 3600
        
        self.token_expiry_epoch = time.time() + expires_in

    def authenticate(self):
        """Authenticate and retrieve access token."""
        url = f"{self.auth_base_url}/api/v1/token"
        
        # Form-encoded data
        payload = f"username={self.username}&password={self.password}"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        token_data = self._http_post(url, payload, headers)
        self._save_token_info(token_data)

    def refresh_access_token(self):
        """Refresh access token using refresh token."""
        if not self.refresh_token:
            raise ValueError("No refresh token available. Call authenticate() first.")
        
        url = f"{self.auth_base_url}/api/v1/tokenRefresh"
        payload = f"refreshToken={self.refresh_token}"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        token_data = self._http_post(url, payload, headers)
        self._save_token_info(token_data)

    def _ensure_valid_token(self):
        """Ensure access token is valid, refresh or re-authenticate if needed."""
        current_time = time.time()
        
        if current_time >= self.token_expiry_epoch:
            try:
                self.refresh_access_token()
            except Exception:
                self.authenticate()
        
        if not self.access_token:
            self.authenticate()

    def call_gdsapi(self, payload: dict) -> List[CapIQDataPoint]:
        """
        Call GDS API with payload and return parsed data points.
        
        Args:
            payload: Request payload with inputRequests
            
        Returns:
            List of parsed CapIQDataPoint objects
        """
        self._ensure_valid_token()
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        
        response = self._http_post(self.data_base_url, payload, headers)
        
        # Parse and validate response
        gds_response = CapIQGDSResponse.model_validate(response)
        
        # Convert to data points
        return self._parse_gds_response(gds_response)

    def _parse_gds_response(self, response: CapIQGDSResponse) -> List[CapIQDataPoint]:
        """Parse GDS response into data points."""
        results: List[CapIQDataPoint] = []
        
        for item in response.GDSSDKResponse:
            # Skip items with errors (except InvalidIdentifier which we handle)
            if item.ErrMsg and item.ErrMsg != "InvalidIdentifier":
                if not results:  # Only raise on first item error
                    raise Exception(f"CapIQ API error: {item.ErrMsg}")
                continue
            
            if item.ErrMsg == "InvalidIdentifier":
                continue
            
            # Clean identifier (remove trailing colon)
            identifier = item.Identifier.rstrip(":")
            period = item.Properties.get("periodtype", "")
            asofdate = item.Properties.get("asofdate", "")
            mnemonic = item.Mnemonic or ""
            
            for row_obj in item.Rows:
                if not row_obj.Row:
                    continue
                
                raw_value = row_obj.Row[0]
                if raw_value == "Data Unavailable":
                    continue
                
                # Try to convert to float
                try:
                    value = float(raw_value)
                except (ValueError, TypeError):
                    value = raw_value
                
                dp = CapIQDataPoint(
                    identifier=identifier,
                    mnemonic=mnemonic,
                    value=value,
                    period=period if period else None,
                    asofdate=asofdate if asofdate else None,
                )
                results.append(dp)
        
        return results

    def bulk_query(
        self,
        identifiers: Sequence[str],
        mnemonics: Sequence[str],
        periods: Optional[Sequence[str]] = None,
        as_of_dates: Optional[Sequence[str]] = None,
        base_properties: Optional[Mapping[str, Any]] = None,
        per_mnemonic_properties: Optional[Mapping[str, Mapping[str, Any]]] = None,
        timing_variants: Optional[Sequence[Mapping[str, Any]]] = None,
        chunk_limit: int = 500,
    ) -> List[CapIQDataPoint]:
        """
        Build and execute bulk query as cartesian product of identifiers × mnemonics × timing.
        
        Args:
            identifiers: List of ticker symbols or ISINs
            mnemonics: List of CapIQ data mnemonics
            periods: Period strings like "IQ_FY-1", "IQ_FQ1"
            as_of_dates: As-of dates in MM/DD/YYYY format
            base_properties: Base properties for all requests
            per_mnemonic_properties: Per-mnemonic property overrides
            timing_variants: Custom timing variants (overrides periods/as_of_dates)
            chunk_limit: Max requests per API call
            
        Returns:
            List of CapIQDataPoint objects
        """
        if not identifiers or not mnemonics:
            raise ValueError("identifiers and mnemonics must be non-empty")
        
        base = dict(base_properties or {})
        per_mn = per_mnemonic_properties or {}
        
        # Build timing variants
        if timing_variants is not None:
            tv_list = [dict(tv) for tv in timing_variants]
        else:
            p_list = list(periods or [])
            d_list = list(as_of_dates or [])
            
            # Validate periods
            for p in p_list:
                if not _PERIOD_RE.match(p):
                    raise ValueError(f"Invalid PeriodType value: {p!r}")
            
            if p_list and d_list:
                tv_list = [{"PeriodType": p, "asOfDate": d} for p in p_list for d in d_list]
            elif p_list:
                tv_list = [{"PeriodType": p} for p in p_list]
            elif d_list:
                tv_list = [{"asOfDate": d} for d in d_list]
            else:
                tv_list = [{}]
        
        # Deduplicate timing variants
        seen = set()
        uniq_tv: List[Mapping[str, Any]] = []
        for tv_dict in tv_list:
            key = tuple(sorted(tv_dict.items()))
            if key not in seen:
                seen.add(key)
                uniq_tv.append(tv_dict)
        
        # Build flat request list
        flat: List[dict] = []
        for ident in identifiers:
            for mnem in mnemonics:
                props_common = dict(base)
                props_common.setdefault("restatementTypeId", "LC")
                if mnem in per_mn:
                    props_common.update(per_mn[mnem])
                
                for tv in uniq_tv:
                    props = dict(props_common)
                    props.update(tv)
                    flat.append({
                        "function": "GDSP",
                        "identifier": ident,
                        "mnemonic": mnem,
                        "properties": props,
                    })
        
        # Chunk and call
        out: List[CapIQDataPoint] = []
        for start in range(0, len(flat), chunk_limit):
            payload = {"inputRequests": flat[start : start + chunk_limit]}
            out.extend(self.call_gdsapi(payload))
        
        return out

    def get_estimates(
        self,
        identifiers: Sequence[str],
        estimate_type: str,
        years_future: int = 5,
        years_past: int = 0,
        include_curr_year: bool = False,
        currency: str = "original",
    ) -> List[CapIQDataPoint]:
        """
        Get analyst estimates for a specific metric.
        
        Args:
            identifiers: List of tickers/ISINs
            estimate_type: Type of estimate (revenue, eps, ebitda, etc.)
            years_future: Number of future years to fetch
            years_past: Number of past years to fetch
            include_curr_year: Include current year
            currency: Currency conversion ("original" or "usd")
            
        Returns:
            List of estimate data points
        """
        mnemonics_map = {
            "revenue": ["IQ_REVENUE_EST_CIQ", "IQ_REVENUE_NUM_EST_CIQ"],
            "eps": ["IQ_EPS_EST_CIQ", "IQ_EPS_NUM_EST_CIQ"],
            "ebitda": ["IQ_EBITDA_EST_CIQ", "IQ_EBITDA_NUM_EST_CIQ"],
            "ebit": ["IQ_EBIT_EST_CIQ", "IQ_EBIT_NUM_EST_CIQ"],
            "tev_ebitda": ["IQ_TEV_EBITDA_FWD"],
            "peg_ratio": ["IQ_PEG_FWD_CIQ"],
            "lt_growth": ["IQ_EST_EPS_GROWTH_5YR_CIQ"],
            "forward_pe": ["IQ_PE_EXCL_FWD_CIQ"],
            "free_cash_flow": ["IQ_FCF_EST_CIQ", "IQ_FCF_NUM_EST_CIQ"],
            "gross_margin": ["IQ_GROSS_MARGIN_EST_CIQ", "IQ_GROSS_MARGIN_NUM_EST_CIQ"],
            "roa": ["IQ_RETURN_ASSETS_EST_CIQ", "IQ_RETURN_ASSETS_NUM_EST_CIQ"],
            "net_income": ["IQ_NI_REPORTED_EST_CIQ", "IQ_NI_REPORTED_NUM_EST_CIQ"],
            "net_debt": ["IQ_NET_DEBT_EST_CIQ", "IQ_NET_DEBT_NUM_EST_CIQ"],
            "cash_from_oper": ["IQ_CASH_OPER_EST_CIQ", "IQ_CASH_OPER_NUM_EST_CIQ"],
        }
        
        if estimate_type not in mnemonics_map:
            raise ValueError(f"Unsupported estimate type: {estimate_type}")
        
        periods: List[str] = []
        for y in range(years_past, 0, -1):
            periods.append(f"IQ_FY-{y}")
        if include_curr_year:
            periods.append("IQ_FY")
        for y in range(1, years_future + 1):
            periods.append(f"IQ_FY+{y}")
        
        currency_props = {}
        if currency.lower() == "usd":
            currency_props = {
                "currencyId": "USD",
                "currencyConversionModeId": "HISTORICAL",
            }
        
        return self.bulk_query(
            identifiers=identifiers,
            mnemonics=mnemonics_map[estimate_type],
            periods=periods,
            base_properties={"restatementTypeId": "LC", **currency_props},
        )

    def get_past_values(
        self,
        identifiers: Sequence[str],
        metric_type: str,
        years: int = 5,
        frequency: str = "annual",
        currency: str = "original",
        include_current: bool = True,
        restatement_type: str = "LFR",
    ) -> List[CapIQDataPoint]:
        """
        Get historical actual values for a metric.
        
        Args:
            identifiers: List of tickers/ISINs
            metric_type: Type of metric (revenue, eps, ebitda, etc.)
            years: Number of years to fetch
            frequency: "annual" or "quarterly"
            currency: Currency conversion
            include_current: Include current period
            restatement_type: Restatement type (LFR = Latest Filing Reported)
            
        Returns:
            List of historical data points
        """
        metrics_map = {
            "eps": "IQ_BASIC_EPS_INCL",
            "ebitda": "IQ_EBITDA",
            "revenue_per_share": "IQ_TOTAL_REV_SHARE",
            "revenue": "IQ_REV",
            "gross_profit": "IQ_GP",
            "gross_margin": "IQ_GROSS_MARGIN",
            "net_debt": "IQ_NET_DEBT",
            "sbc": "IQ_STOCK_BASED_TOTAL",
            "free_cash_flow": "IQ_UNLEVERED_FCF",
            "roa": "IQ_RETURN_ASSETS",
            "total_revenue": "IQ_TOTAL_REV",
            "capex": "IQ_CAPEX_CM",
            "cash_flow_oper": "IQ_CASH_OPER",
            "depreciation": "IQ_DA_SUPPL_CF",
            "total_assets": "IQ_TOTAL_ASSETS",
        }
        
        if metric_type not in metrics_map:
            raise ValueError(f"Unsupported metric_type: {metric_type}")
        
        base = "IQ_FY" if frequency == "annual" else "IQ_FQ"
        periods = []
        if include_current:
            periods.append(base)
        for k in range(1, years + 1):
            periods.append(f"{base}-{k}")
        
        currency_props = {}
        if currency.lower() == "usd":
            currency_props = {
                "currencyId": "USD",
                "currencyConversionModeId": "HISTORICAL",
            }
        
        return self.bulk_query(
            identifiers=identifiers,
            mnemonics=[metrics_map[metric_type]],
            periods=periods,
            base_properties={"restatementTypeId": restatement_type, **currency_props},
        )

    def get_company_info(
        self, identifiers: Sequence[str], info_type: str
    ) -> List[CapIQDataPoint]:
        """
        Get company information.
        
        Args:
            identifiers: List of tickers/ISINs
            info_type: Type of info (status, description, etc.)
            
        Returns:
            List of company info data points
        """
        metrics_map = {
            "status": "IQ_COMPANY_STATUS",
            "description": "IQ_DESCRIPTION_LONG",
            "short_description": "IQ_SHORT_BUSINESS_DESCRIPTION",
            "medium_description": "IQ_BUSINESS_DESCRIPTION",
            "company_name_w_exchange": "IQ_COMPANY_NAME_LONG",
        }
        
        if info_type not in metrics_map:
            raise ValueError(f"Unsupported info_type: {info_type}")
        
        return self.bulk_query(
            identifiers=identifiers,
            mnemonics=[metrics_map[info_type]],
            periods=["IQ_FY"],
            base_properties={},
        )

