from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

from curl_cffi import requests as cffi_requests

from app.services.cache import _cache
from app.utils.http import BROWSER_USER_AGENT

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 60 * 60  # 1 hour

_NSE_HOME = "https://www.nseindia.com"
_NSE_IPO_URL = "https://www.nseindia.com/api/ipo?category=ipo"

_HEADERS = {
    "User-Agent": BROWSER_USER_AGENT,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/market-data/ipo",
}


def _parse_date(raw: str | None) -> date | None:
    if not raw:
        return None
    for fmt in ("%d-%b-%Y", "%Y-%m-%d", "%d/%m/%Y", "%b %d, %Y"):
        try:
            return datetime.strptime(raw.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _parse_float(raw: str | None) -> float | None:
    if not raw:
        return None
    try:
        return float(str(raw).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _fetch_all() -> list[dict]:
    try:
        session = cffi_requests.Session(impersonate="chrome124")
        # Prime cookies — NSE rejects direct API calls without a prior page hit
        session.get(_NSE_HOME, headers=_HEADERS, timeout=10)
        resp = session.get(_NSE_IPO_URL, headers=_HEADERS, timeout=10)
        resp.raise_for_status()
        return resp.json().get("data", [])
    except Exception:
        logger.exception("NSE IPO API fetch failed")
        return []


def get_upcoming_ipos() -> list[dict]:
    cache_key = "ipo:upcoming"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    today = date.today()
    result: list[dict] = []

    for ipo in _fetch_all():
        listing_date = _parse_date(ipo.get("listingDate"))
        # Include if not yet listed or listing is in the future
        if listing_date and listing_date <= today:
            continue
        close_date = _parse_date(ipo.get("closeDate"))
        # Skip if subscription closed and no listing date (stale record)
        if close_date and close_date < today - timedelta(days=7) and not listing_date:
            continue
        result.append({
            "company_name": ipo.get("companyName", ""),
            "symbol": ipo.get("symbol") or None,
            "open_date": ipo.get("openDate"),
            "close_date": ipo.get("closeDate"),
            "listing_date": ipo.get("listingDate"),
            "price_band": ipo.get("issuePrice"),
            "lot_size": ipo.get("minBidQuantity"),
            "category": ipo.get("ipoCategory", "Main Board"),
            "status": ipo.get("status", "Upcoming"),
        })

    result.sort(key=lambda x: _parse_date(x.get("open_date")) or date.max)
    _cache.set(cache_key, result, CACHE_TTL_SECONDS)
    return result


def get_recent_ipos() -> list[dict]:
    cache_key = "ipo:recent"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    today = date.today()
    cutoff = today - timedelta(days=180)
    result: list[dict] = []

    for ipo in _fetch_all():
        listing_date = _parse_date(ipo.get("listingDate"))
        if not listing_date or not (cutoff <= listing_date <= today):
            continue
        result.append({
            "company_name": ipo.get("companyName", ""),
            "symbol": ipo.get("symbol") or None,
            "listing_date": ipo.get("listingDate"),
            "issue_price": _parse_float(ipo.get("issuePrice")),
            "listing_price": _parse_float(ipo.get("listingPrice")),
            "current_price": _parse_float(ipo.get("currentMarketPrice")),
            "gain_pct": _parse_float(ipo.get("gain")),
            "category": ipo.get("ipoCategory", "Main Board"),
        })

    result.sort(key=lambda x: _parse_date(x.get("listing_date")) or date.min, reverse=True)
    _cache.set(cache_key, result, CACHE_TTL_SECONDS)
    return result
