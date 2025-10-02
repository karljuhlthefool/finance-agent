"""SEC EDGAR provider client with typed responses."""
from __future__ import annotations
import os
import re
import time
import json
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime
from urllib.request import urlopen, Request
from urllib.error import HTTPError

from .types import SecFilingMeta, SecExhibit
from src.domain.models import FilingRef, Provenance
from src.util.filings_processor import (
    clean_html_artifacts,
    extract_mda,
    extract_business,
    extract_risk_factors,
    extract_financial_statements,
    extract_ai_content,
    extract_rd_content,
    extract_keyword_context,
    extract_regex_context,
)


class SecProvider:
    """Typed wrapper around SEC EDGAR API."""

    def __init__(self, user_agent: Optional[str] = None):
        self.user_agent = user_agent or "claude-finance/1.0 (contact@example.com)"
        self.workspace = Path(
            os.getenv("WORKSPACE_ABS_PATH", "./runtime/workspace")
        ).resolve()

    def _https_get(self, url: str) -> str:
        """Fetch URL with proper headers and rate limiting."""
        req = Request(url, headers={"User-Agent": self.user_agent})

        # SEC rate limit: ~10 req/sec
        time.sleep(0.15)

        with urlopen(req) as response:
            if response.getcode() in (301, 302):
                return self._https_get(response.getheader("Location"))

            if response.getcode() >= 400:
                raise HTTPError(
                    url, response.getcode(), f"HTTP {response.getcode()}", {}, None
                )

            return response.read().decode("utf-8")

    def _get_cik(self, ticker: str) -> str:
        """Get CIK from ticker symbol."""
        url = f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={ticker}&type=&dateb=&owner=exclude&count=1&output=atom"
        data = self._https_get(url)

        match = re.search(r"CIK=(\d{10})", data)
        if not match:
            raise ValueError(f"Could not find CIK for ticker {ticker}")

        return match.group(1)

    def _get_latest_filing_meta(self, cik: str, form_type: str) -> SecFilingMeta:
        """Get metadata for latest filing."""
        url = f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={cik}&type={form_type}&dateb=&owner=exclude&count=1&output=atom"
        data = self._https_get(url)

        acc_match = re.search(r"accession-number>(\d{10}-\d{2}-\d{6})<", data)
        date_match = re.search(r"filing-date>(\d{4}-\d{2}-\d{2})<", data)

        if not acc_match or not date_match:
            raise ValueError(
                f"No {form_type} filing found for CIK {cik}. Try a different form type."
            )

        return SecFilingMeta(
            accession=acc_match.group(1),
            filing_date=date_match.group(1),
            cik=cik,
            form_type=form_type,
        )

    def _download_filing_content(self, cik: str, accession: str) -> str:
        """Download raw filing content."""
        acc_no_hyphens = accession.replace("-", "")
        txt_url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_no_hyphens}/{accession}.txt"

        return self._https_get(txt_url)

    def _extract_primary_document(self, raw_content: str, form_type: str) -> str:
        """Extract the primary document from raw filing, stripping HTML."""
        # Try to find the primary document section matching form type
        pattern = rf"<DOCUMENT>.*?<TYPE>{form_type}.*?</DOCUMENT>"
        document_match = re.search(pattern, raw_content, re.DOTALL)
        
        if not document_match:
            # Fall back to first document
            document_match = re.search(r"<DOCUMENT>.*?</DOCUMENT>", raw_content, re.DOTALL)
        
        if not document_match:
            return raw_content
        
        document_content = document_match.group(0)
        
        # Remove HTML tags for cleaner text
        text = re.sub(r"<[^>]+>", " ", document_content)
        
        # Clean up artifacts
        text = clean_html_artifacts(text)
        
        # Look for "UNITED STATES" header and start from there
        index = text.lower().find("united states")
        if index != -1:
            text = "UNITED STATES" + text[index + len("united states"):]
        
        return text

    def _extract_exhibits(self, content: str, limit: int = 25) -> list[SecExhibit]:
        """Extract exhibit metadata from filing content."""
        exhibits = []
        doc_matches = re.finditer(r"<DOCUMENT>([\s\S]*?)</DOCUMENT>", content)

        for i, match in enumerate(doc_matches):
            if i >= limit:
                break

            doc_content = match.group(1)
            type_match = re.search(r"<TYPE>([^\n]+)", doc_content)
            seq_match = re.search(r"<SEQUENCE>([^\n]+)", doc_content)
            filename_match = re.search(r"<FILENAME>([^\n]+)", doc_content)

            if type_match:
                exhibits.append(
                    SecExhibit(
                        sequence=seq_match.group(1).strip() if seq_match else str(i + 1),
                        type=type_match.group(1).strip(),
                        filename=filename_match.group(1).strip()
                        if filename_match
                        else f"doc_{i + 1}.txt",
                    )
                )

        return exhibits

    def get_latest_filing(
        self, ticker: str, form_type: str = "10-K", exhibit_limit: int = 25
    ) -> FilingRef:
        """Fetch latest filing and return typed reference with local paths."""
        # Normalize form type
        form_type = form_type.upper().replace("-", "")
        if form_type not in ["10K", "10Q", "8K", "20F", "40F"]:
            raise ValueError(
                f"Invalid form type: {form_type}. Use 10-K, 10-Q, 8-K, 20-F, or 40-F"
            )

        # Add hyphen back for display
        display_form = (
            form_type[:2] + "-" + form_type[2:] if len(form_type) > 2 else form_type
        )

        # Get CIK and filing metadata
        cik = self._get_cik(ticker)
        filing_meta = self._get_latest_filing_meta(cik, display_form)

        # Download content
        content = self._download_filing_content(cik, filing_meta.accession)

        # Extract exhibits
        exhibits = self._extract_exhibits(content, exhibit_limit)

        # Create directory structure
        normalized_form = form_type.lower()
        filing_dir = (
            self.workspace
            / "data"
            / "sec"
            / ticker
            / filing_meta.filing_date
            / normalized_form
        )
        exhibits_dir = filing_dir / "exhibits"
        exhibits_dir.mkdir(parents=True, exist_ok=True)

        # Save raw document
        raw_path = filing_dir / "raw.txt"
        raw_path.write_text(content, encoding="utf-8")

        # Extract and save cleaned primary document
        clean_text = self._extract_primary_document(content, display_form)
        clean_path = filing_dir / "clean.txt"
        clean_path.write_text(clean_text, encoding="utf-8")

        # Save exhibits index
        exhibits_index_path = exhibits_dir / "index.json"
        exhibits_data = [e.model_dump() for e in exhibits]
        exhibits_index_path.write_text(json.dumps(exhibits_data, indent=2))

        # Save metadata
        metadata = {
            "ticker": ticker,
            "cik": cik,
            "form": display_form,
            "filing_date": filing_meta.filing_date,
            "accession": filing_meta.accession,
            "downloaded_at": datetime.utcnow().isoformat(),
            "exhibit_count": len(exhibits),
        }
        meta_path = filing_dir / "metadata.json"
        meta_path.write_text(json.dumps(metadata, indent=2))

        return FilingRef(
            ticker=ticker,
            form=display_form,
            filing_date=filing_meta.filing_date,
            accession=filing_meta.accession,
            cik=cik,
            main_text_path=str(clean_path),  # Use cleaned text by default
            exhibits_index_path=str(exhibits_index_path),
            provenance=Provenance(
                source="SEC EDGAR",
                fetched_at=datetime.utcnow().isoformat(),
                meta={
                    "CIK": cik,
                    "accession": filing_meta.accession,
                    "rate_limited": True,
                    "raw_path": str(raw_path),
                    "clean_path": str(clean_path),
                },
            ),
        )

    def extract_sections(
        self,
        filing_ref: FilingRef,
        sections: Optional[List[str]] = None,
    ) -> Dict[str, Optional[str]]:
        """
        Extract specific sections from a filing.
        
        :param filing_ref: FilingRef object from get_latest_filing
        :param sections: List of section names to extract. Defaults to common 10-K sections.
                        Available: mda, business, risk_factors, financial_statements, ai_content, rd_content
        :return: Dict mapping section names to extracted text
        """
        if sections is None:
            sections = ["mda", "business", "risk_factors"]
        
        # Read the clean text
        text = Path(filing_ref.main_text_path).read_text(encoding="utf-8")
        
        result = {}
        section_extractors = {
            "mda": extract_mda,
            "business": extract_business,
            "risk_factors": extract_risk_factors,
            "financial_statements": extract_financial_statements,
            "ai_content": extract_ai_content,
            "rd_content": extract_rd_content,
        }
        
        for section in sections:
            if section in section_extractors:
                result[section] = section_extractors[section](text)
            else:
                result[section] = None
        
        return result

    def search_keywords(
        self,
        filing_ref: FilingRef,
        keywords: List[str],
        pre_window: int = 1000,
        post_window: int = 1000,
    ) -> str:
        """
        Search for exact keyword phrases and return surrounding context.
        
        :param filing_ref: FilingRef object from get_latest_filing
        :param keywords: List of phrases to search for (case-insensitive)
        :param pre_window: Words to include before each match
        :param post_window: Words to include after each match
        :return: Merged snippets of context around matches
        """
        text = Path(filing_ref.main_text_path).read_text(encoding="utf-8")
        return extract_keyword_context(text, keywords, pre_window, post_window)

    def search_regex(
        self,
        filing_ref: FilingRef,
        pattern: str,
        pre_window: int = 500,
        post_window: int = 500,
        snippet_min_words: int = 15,
    ) -> List[str]:
        """
        Search for regex pattern and return surrounding context.
        
        :param filing_ref: FilingRef object from get_latest_filing
        :param pattern: Regex pattern to search for
        :param pre_window: Words to include before each match
        :param post_window: Words to include after each match
        :param snippet_min_words: Minimum words in snippet
        :return: List of context snippets around matches
        """
        text = Path(filing_ref.main_text_path).read_text(encoding="utf-8")
        return extract_regex_context(
            text, pattern, pre_window, post_window, snippet_min_words=snippet_min_words
        )


