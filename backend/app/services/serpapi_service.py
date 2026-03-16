"""
SerpAPI — Google Flights data fetcher.

Fetches the lowest one-way cash fare AND the operating airlines on the route
via the SerpAPI Google Flights engine. Results are cached in-process.

Usage:
    result = await get_flight_data("ATL", "DEL", "2026-10")
    result.lowest_price   # 497.0 or None
    result.airlines       # [("Lufthansa", 497), ("Etihad", 570), ("Qatar", 597)]
"""
import asyncio
import logging
from dataclasses import dataclass, field
from typing import Optional

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

SERPAPI_URL = "https://serpapi.com/search"


@dataclass
class FlightData:
    lowest_price: Optional[float] = None
    # List of (airline_name, price) sorted cheapest first, deduped by airline
    airlines: list[tuple[str, float]] = field(default_factory=list)


# In-process cache: (origin, dest, year_month) → FlightData
_cache: dict[tuple[str, str, str], FlightData] = {}


def _extract_airlines(flights_list: list) -> list[tuple[str, float]]:
    """Extract unique (airline, price) pairs from a best_flights list, sorted by price."""
    seen: dict[str, float] = {}
    for entry in flights_list:
        price = entry.get("price")
        if not isinstance(price, (int, float)) or price <= 0:
            continue
        # The first flight segment holds the main operating airline
        segments = entry.get("flights") or []
        if segments:
            airline = segments[0].get("airline", "").strip()
            if airline and airline not in seen:
                seen[airline] = float(price)
    return sorted(seen.items(), key=lambda x: x[1])


def _sync_fetch(origin: str, dest: str, year_month: str) -> FlightData:
    """Synchronous Google Flights fetch (runs in thread pool)."""
    if not settings.serpapi_api_key:
        return FlightData()

    try:
        year, month = year_month.split("-")
        departure_date = f"{year}-{month}-15"
    except ValueError:
        return FlightData()

    params = {
        "engine": "google_flights",
        "departure_id": origin,
        "arrival_id": dest,
        "outbound_date": departure_date,
        "type": "2",        # one-way
        "currency": "USD",
        "api_key": settings.serpapi_api_key,
    }

    try:
        resp = httpx.get(SERPAPI_URL, params=params, timeout=8.0)
        resp.raise_for_status()
        data = resp.json()

        best = data.get("best_flights") or []
        other = data.get("other_flights") or []
        all_flights = best + other

        airlines = _extract_airlines(all_flights)

        # Lowest price: price_insights first, then cheapest flight
        price_insights = data.get("price_insights") or {}
        lowest = price_insights.get("lowest_price")
        if not (isinstance(lowest, (int, float)) and lowest > 0):
            lowest = airlines[0][1] if airlines else None

        return FlightData(
            lowest_price=float(lowest) if lowest else None,
            airlines=airlines,
        )
    except Exception as exc:
        logger.warning("SerpAPI fetch failed (%s → %s %s): %s", origin, dest, year_month, exc)
        return FlightData()


async def get_flight_data(origin: str, dest: str, year_month: str) -> FlightData:
    """
    Return lowest cash fare and operating airlines from Google Flights via SerpAPI.

    Args:
        origin:     IATA departure code (e.g. "ATL")
        dest:       IATA arrival code (e.g. "DEL")
        year_month: "YYYY-MM" (e.g. "2026-10")

    Returns:
        FlightData with lowest_price (float|None) and airlines list.
        Both fields degrade gracefully to None/[] on any error.
    """
    cache_key = (origin.upper(), dest.upper(), year_month)
    if cache_key in _cache:
        return _cache[cache_key]

    result = await asyncio.to_thread(_sync_fetch, origin, dest, year_month)
    _cache[cache_key] = result
    return result
