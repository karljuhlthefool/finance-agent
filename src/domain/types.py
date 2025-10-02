"""Shared type aliases and constraints for domain models."""
from __future__ import annotations
from typing import NewType, Literal
from pydantic import constr
from decimal import Decimal

Ticker = NewType("Ticker", str)
ISODate = constr(pattern=r"^\d{4}-\d{2}-\d{2}$")  # "YYYY-MM-DD"
Currency = Literal["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"]

# Represent money as Decimal for precision
Money = Decimal


