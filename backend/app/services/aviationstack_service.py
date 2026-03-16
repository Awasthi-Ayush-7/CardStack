"""
Aviation Stack API integration for IATA airport code lookup.

Free tier: 500 requests/month, HTTP only.
Sign up at https://aviationstack.com to get an API key.

Without an API key, the service falls back to a hardcoded IATA map
covering the 5 destinations currently supported by the concierge.
"""
from typing import Optional

import httpx

from ..config import settings

# ---------------------------------------------------------------------------
# Fallback IATA map — used when API key is missing or the call fails
# ---------------------------------------------------------------------------
_FALLBACK_IATA: dict[str, str] = {
    "Tokyo":         "NRT",
    "Paris":         "CDG",
    "Hawaii":        "HNL",
    "Caribbean":     "SJU",
    "London":        "LHR",
    "Singapore":     "SIN",
    "Dubai":         "DXB",
    "Sydney":        "SYD",
    "Cancun":        "CUN",
    "Rome":          "FCO",
    "Bangkok":       "BKK",
    "Amsterdam":     "AMS",
    "Barcelona":     "BCN",
    "Bali":          "DPS",
    "New York":      "JFK",
    "Los Angeles":   "LAX",
    "Chicago":       "ORD",
    "San Francisco": "SFO",
    "Miami":         "MIA",
    "Seattle":       "SEA",
    "Boston":        "BOS",
    "Dallas":        "DFW",
    "Atlanta":       "ATL",
    "Washington":    "IAD",
    "Washington Dc": "IAD",
    "Houston":       "IAH",
    "Denver":        "DEN",
    "Las Vegas":     "LAS",
    "Orlando":       "MCO",
    "Philadelphia":  "PHL",
    "Phoenix":       "PHX",
    "Minneapolis":   "MSP",
    "Detroit":       "DTW",
    "Newark":        "EWR",
    "Delhi":         "DEL",
    "Mumbai":        "BOM",
    "Seoul":         "ICN",
    "Hong Kong":     "HKG",
    "Taipei":        "TPE",
    "Osaka":         "KIX",
    "Kuala Lumpur":  "KUL",
    "Manila":        "MNL",
    "Jakarta":       "CGK",
    "Ho Chi Minh":   "SGN",
    "Hanoi":         "HAN",
    "Phuket":        "HKT",
    "Melbourne":     "MEL",
    "Auckland":      "AKL",
    "Abu Dhabi":     "AUH",
    "Doha":          "DOH",
    "Istanbul":      "IST",
    "Cairo":         "CAI",
    "Nairobi":       "NBO",
    "Johannesburg":  "JNB",
    "Cape Town":     "CPT",
    "Lagos":         "LOS",
    "Buenos Aires":  "EZE",
    "Sao Paulo":     "GRU",
    "Lima":          "LIM",
    "Bogota":        "BOG",
    "Santiago":      "SCL",
    "Toronto":       "YYZ",
    "Vancouver":     "YVR",
    "Mexico City":   "MEX",
}

# ---------------------------------------------------------------------------
# In-memory cache — keyed on city name, preserves free-tier quota
# ---------------------------------------------------------------------------
_iata_cache: dict[str, Optional[str]] = {}


def get_iata_code(city_name: str) -> Optional[str]:
    """
    Return the primary IATA airport code for a city name.

    Resolution order:
    1. In-memory cache (already looked up this session)
    2. Aviation Stack API (if AVIATIONSTACK_API_KEY is set)
    3. Hardcoded fallback map
    4. None (callers should handle gracefully)
    """
    # 1. Cache hit
    if city_name in _iata_cache:
        return _iata_cache[city_name]

    code: Optional[str] = None

    # 2. Aviation Stack API
    if settings.aviationstack_api_key:
        code = _fetch_from_api(city_name)

    # 3. Fallback map
    if code is None:
        code = _FALLBACK_IATA.get(city_name)

    _iata_cache[city_name] = code
    return code


def _fetch_from_api(city_name: str) -> Optional[str]:
    """
    Call the Aviation Stack airports endpoint.
    Free tier uses HTTP (not HTTPS).
    Returns the first matching airport's IATA code, or None on any error.
    """
    try:
        url = "http://api.aviationstack.com/v1/airports"
        params = {
            "access_key": settings.aviationstack_api_key,
            "search": city_name,
            "limit": 5,
        }
        response = httpx.get(url, params=params, timeout=5.0)
        response.raise_for_status()
        data = response.json()

        airports = data.get("data", [])
        if not airports:
            return None

        # Prefer airports whose city_name matches (case-insensitive)
        city_lower = city_name.lower()
        for airport in airports:
            if city_lower in (airport.get("city_name") or "").lower():
                code = airport.get("iata_code")
                if code and len(code) == 3:
                    return code

        # Fall back to first result with a valid IATA code
        for airport in airports:
            code = airport.get("iata_code")
            if code and len(code) == 3:
                return code

        return None

    except Exception:
        # Degrade gracefully — log nothing, let fallback handle it
        return None
