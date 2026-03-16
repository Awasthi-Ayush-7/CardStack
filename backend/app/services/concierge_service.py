"""
Redemption Concierge service.

Finds the best transfer paths from a user's flexible points currency to
airline/hotel programs, calculates cents-per-point (CPP), calls Claude for
AI-powered reasoning, and generates step-by-step booking instruction cards.
"""
import asyncio
import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from ..models import UserCard, CreditCard, CardIssuer, TransferPartner, AwardCost
from ..config import settings
from .aviationstack_service import get_iata_code


# ---------------------------------------------------------------------------
# Regional award chart — used when no DB rows exist for the destination
# ---------------------------------------------------------------------------

# Programs that publish fixed award charts — rates are exact published values.
# Dynamic-pricing programs (Delta, Capital One) are flagged separately.
_DYNAMIC_PRICING_PROGRAMS = {"Delta SkyMiles", "Capital One Miles"}


@dataclass
class _AwardEstimate:
    airline_program: str
    points_required: int
    cash_price_usd: float
    taxes_fees_usd: float
    notes: str = ""

    @property
    def is_dynamic_pricing(self) -> bool:
        return self.airline_program in _DYNAMIC_PRICING_PROGRAMS


# Region keyword detection — first match wins
_REGION_KEYWORDS: list[tuple[str, list[str]]] = [
    ("domestic", [
        "hawaii", "caribbean", "cancun", "nassau", "san juan", "jamaica",
        "bahamas", "mexico city", "guadalajara", "monterrey", "tijuana",
        "puerto vallarta", "los cabos", "cabo",
    ]),
    ("europe", [
        "london", "paris", "rome", "amsterdam", "madrid", "barcelona",
        "frankfurt", "zurich", "vienna", "brussels", "prague", "athens",
        "lisbon", "berlin", "milan", "venice", "florence", "dublin",
        "edinburgh", "stockholm", "oslo", "copenhagen", "helsinki",
        "warsaw", "budapest", "bucharest", "istanbul", "buda",
    ]),
    ("middle_east", [
        "dubai", "abu dhabi", "doha", "riyadh", "kuwait", "muscat",
        "amman", "cairo", "tel aviv", "jeddah", "bahrain", "beirut",
    ]),
    ("south_asia", [
        "delhi", "mumbai", "bangalore", "bengaluru", "kolkata",
        "hyderabad", "chennai", "pune", "ahmedabad", "jaipur",
        "karachi", "lahore", "islamabad", "dhaka", "colombo", "kathmandu",
    ]),
    ("east_asia", [
        "tokyo", "osaka", "kyoto", "sapporo", "seoul", "busan",
        "beijing", "shanghai", "hong kong", "taipei", "guangzhou",
        "shenzhen", "chengdu", "xian",
    ]),
    ("southeast_asia", [
        "bangkok", "singapore", "bali", "jakarta", "kuala lumpur",
        "manila", "ho chi minh", "saigon", "hanoi", "phuket",
        "chiang mai", "yangon", "phnom penh", "vientiane",
    ]),
    ("south_pacific", [
        "sydney", "melbourne", "brisbane", "perth", "adelaide",
        "auckland", "christchurch", "wellington", "fiji", "tahiti",
        "bora bora", "rarotonga",
    ]),
    ("south_america", [
        "bogota", "lima", "santiago", "buenos aires", "sao paulo",
        "rio", "brasilia", "cartagena", "medellin", "quito",
        "caracas", "montevideo", "la paz", "asuncion",
    ]),
    ("africa", [
        "nairobi", "johannesburg", "cape town", "lagos", "accra",
        "addis ababa", "casablanca", "marrakech", "dar es salaam",
        "kampala", "kigali", "dakar", "tunis",
    ]),
]

# (region, cabin) → published award chart rates.
# All values from official program award charts (fixed-chart programs only).
# Delta SkyMiles is flagged as dynamic pricing — rates vary per flight.
_REGIONAL_AWARD_CHART: dict[tuple[str, str], list[_AwardEstimate]] = {
    ("domestic", "economy"): [
        _AwardEstimate("United MileagePlus",           12500,  350,  25,
                       "Published Saver rate — North America/Caribbean zone"),
        _AwardEstimate("Delta SkyMiles",               15000,  350,  30,
                       "Dynamic pricing — actual miles vary per flight"),
        _AwardEstimate("Air France/KLM Flying Blue",   15000,  350,  30,
                       "Published Flying Blue rate — short-haul zone 1"),
    ],
    ("domestic", "business"): [
        _AwardEstimate("United MileagePlus",           25000,  600,  30,
                       "Published Saver rate — domestic first/business"),
        _AwardEstimate("Delta SkyMiles",               25000,  600,  30,
                       "Dynamic pricing — actual miles vary per flight"),
    ],
    ("europe", "economy"): [
        _AwardEstimate("Air France/KLM Flying Blue",   30000,  800, 150,
                       "Published rate — Promo Awards often drop to 20k, check monthly"),
        _AwardEstimate("British Airways Avios",        26000,  800, 300,
                       "Published Avios rate — note high BA carrier surcharges"),
        _AwardEstimate("Air Canada Aeroplan",          35000,  800,  90,
                       "Published Aeroplan rate — no fuel surcharges on most partners"),
        _AwardEstimate("United MileagePlus",           30000,  800,  60,
                       "Published MileagePlus Saver rate — Europe zone"),
    ],
    ("europe", "business"): [
        _AwardEstimate("Air France/KLM Flying Blue",   57500, 4500, 200,
                       "Published rate — Flying Blue business on AF/KLM metal"),
        _AwardEstimate("Air Canada Aeroplan",          65000, 4500, 120,
                       "Published Aeroplan rate — no fuel surcharges, great value"),
        _AwardEstimate("United MileagePlus",           70000, 4500,  90,
                       "Published MileagePlus Saver rate — Europe business"),
    ],
    ("middle_east", "economy"): [
        _AwardEstimate("Air France/KLM Flying Blue",   42000, 1100, 180,
                       "Published Flying Blue rate — Middle East zone"),
        _AwardEstimate("British Airways Avios",        40000, 1100, 350,
                       "Published Avios rate — high BA carrier surcharges apply"),
        _AwardEstimate("United MileagePlus",           45000, 1100,  90,
                       "Published MileagePlus Saver rate — Middle East zone"),
    ],
    ("middle_east", "business"): [
        _AwardEstimate("Air France/KLM Flying Blue",   80000, 6000, 250,
                       "Published Flying Blue rate — Middle East business"),
        _AwardEstimate("United MileagePlus",           88000, 6000, 100,
                       "Published MileagePlus Saver rate — Middle East business"),
    ],
    ("south_asia", "economy"): [
        _AwardEstimate("Air Canada Aeroplan",          45000, 1200,  90,
                       "Published Aeroplan rate — South Asia zone, no fuel surcharges"),
        _AwardEstimate("United MileagePlus",           44000, 1200,  85,
                       "Published MileagePlus Saver rate — South Asia zone"),
        _AwardEstimate("Air France/KLM Flying Blue",   47500, 1200, 180,
                       "Published Flying Blue rate — via Paris CDG"),
    ],
    ("south_asia", "business"): [
        _AwardEstimate("Air Canada Aeroplan",          75000, 5800, 100,
                       "Published Aeroplan rate — Air India business, excellent value"),
        _AwardEstimate("United MileagePlus",           88000, 5800,  90,
                       "Published MileagePlus Saver rate — South Asia business"),
    ],
    ("east_asia", "economy"): [
        _AwardEstimate("United MileagePlus",           35000, 1100,  60,
                       "Published MileagePlus Saver rate — East Asia zone"),
        _AwardEstimate("Air France/KLM Flying Blue",   40000, 1100, 150,
                       "Published Flying Blue rate — East Asia zone"),
        _AwardEstimate("Air Canada Aeroplan",          45000, 1100,  90,
                       "Published Aeroplan rate — East Asia zone"),
        _AwardEstimate("Singapore Airlines KrisFlyer", 37500, 1100,  75,
                       "Published KrisFlyer Saver rate — own metal or partner"),
    ],
    ("east_asia", "business"): [
        _AwardEstimate("United MileagePlus",           80000, 6500,  90,
                       "Published MileagePlus Saver rate — East Asia business"),
        _AwardEstimate("Air Canada Aeroplan",          75000, 6500, 110,
                       "Published Aeroplan rate — East Asia business"),
        _AwardEstimate("Singapore Airlines KrisFlyer", 75000, 6500, 100,
                       "Published KrisFlyer Saver rate — Singapore Business Class"),
    ],
    ("southeast_asia", "economy"): [
        _AwardEstimate("Singapore Airlines KrisFlyer", 37500, 1000,  75,
                       "Published KrisFlyer Saver rate — own metal economy"),
        _AwardEstimate("United MileagePlus",           35000, 1000,  65,
                       "Published MileagePlus Saver rate — Southeast Asia zone"),
        _AwardEstimate("Air France/KLM Flying Blue",   42000, 1000, 150,
                       "Published Flying Blue rate — Southeast Asia zone"),
    ],
    ("southeast_asia", "business"): [
        _AwardEstimate("Singapore Airlines KrisFlyer", 75000, 5500, 100,
                       "Published KrisFlyer Saver rate — Singapore Suites/Business"),
        _AwardEstimate("Air Canada Aeroplan",          90000, 5500, 120,
                       "Published Aeroplan rate — Southeast Asia business"),
    ],
    ("south_pacific", "economy"): [
        _AwardEstimate("United MileagePlus",           40000, 1300,  65,
                       "Published MileagePlus Saver rate — South Pacific zone"),
        _AwardEstimate("Air Canada Aeroplan",          45000, 1300, 120,
                       "Published Aeroplan rate — South Pacific zone"),
    ],
    ("south_pacific", "business"): [
        _AwardEstimate("Air Canada Aeroplan",          90000, 7000, 130,
                       "Published Aeroplan rate — Australia/NZ business sweet spot"),
        _AwardEstimate("United MileagePlus",          110000, 7000, 100,
                       "Published MileagePlus Saver rate — South Pacific business"),
    ],
    ("south_america", "economy"): [
        _AwardEstimate("United MileagePlus",           25000,  700,  50,
                       "Published MileagePlus Saver rate — South America zone"),
        _AwardEstimate("Air France/KLM Flying Blue",   25000,  700, 120,
                       "Published Flying Blue rate — South America zone"),
        _AwardEstimate("British Airways Avios",        18000,  700, 200,
                       "Published Avios rate — short-haul Avios pricing applies"),
    ],
    ("south_america", "business"): [
        _AwardEstimate("Air France/KLM Flying Blue",   50000, 4000, 200,
                       "Published Flying Blue rate — South America business"),
        _AwardEstimate("Air Canada Aeroplan",          55000, 4000, 100,
                       "Published Aeroplan rate — South America business"),
    ],
    ("africa", "economy"): [
        _AwardEstimate("Air France/KLM Flying Blue",   37500, 1200, 200,
                       "Published Flying Blue rate — Africa zone"),
        _AwardEstimate("Air Canada Aeroplan",          55000, 1200, 110,
                       "Published Aeroplan rate — Africa zone"),
    ],
    ("africa", "business"): [
        _AwardEstimate("Air France/KLM Flying Blue",   75000, 6500, 300,
                       "Published Flying Blue rate — Africa business"),
        _AwardEstimate("Air Canada Aeroplan",         105000, 6500, 130,
                       "Published Aeroplan rate — Africa business"),
    ],
}

# Fallback for cities whose region isn't recognized — use conservative long-haul rates
_FALLBACK_AWARD_CHART: dict[str, list[_AwardEstimate]] = {
    "economy": [
        _AwardEstimate("United MileagePlus",          40000, 1100,  80,
                       "Long-haul Saver rate — exact zone TBD, verify on united.com"),
        _AwardEstimate("Air France/KLM Flying Blue",  40000, 1100, 150,
                       "Long-haul Flying Blue rate — verify at flyingblue.com"),
        _AwardEstimate("Air Canada Aeroplan",         45000, 1100, 100,
                       "Long-haul Aeroplan rate — verify at aeroplan.com"),
    ],
    "business": [
        _AwardEstimate("United MileagePlus",          80000, 5500, 100,
                       "Long-haul Saver rate — exact zone TBD, verify on united.com"),
        _AwardEstimate("Air Canada Aeroplan",         80000, 5500, 120,
                       "Long-haul Aeroplan rate — verify at aeroplan.com"),
    ],
    "first": [
        _AwardEstimate("United MileagePlus",         110000, 9000, 150,
                       "Long-haul first class Saver rate — verify on united.com"),
    ],
}


def _detect_region(city: str) -> str:
    """Return the award region for a city name using keyword matching."""
    city_lower = city.lower()
    for region, keywords in _REGION_KEYWORDS:
        if any(kw in city_lower for kw in keywords):
            return region
    return "unknown"


def _get_award_rates(destination: str, cabin: str) -> list[_AwardEstimate]:
    """Return published award chart rates for a destination+cabin by region."""
    region = _detect_region(destination)
    key = (region, cabin)
    rates = _REGIONAL_AWARD_CHART.get(key)
    if rates:
        return rates
    if cabin == "first":
        return _REGIONAL_AWARD_CHART.get((region, "business"), _FALLBACK_AWARD_CHART.get("first", []))
    return _FALLBACK_AWARD_CHART.get(cabin, [])


# ---------------------------------------------------------------------------
# Currency mapping — static, substring match on issuer name + card name
# ---------------------------------------------------------------------------

CARD_TO_CURRENCY: list[tuple[str, str, str]] = [
    # (issuer_fragment_lower, card_name_fragment_lower, currency)
    ("chase",            "sapphire",   "Chase UR"),
    ("chase",            "freedom",    "Chase UR"),
    ("chase",            "ink",        "Chase UR"),
    ("american express", "gold",       "Amex MR"),
    ("american express", "platinum",   "Amex MR"),
    ("american express", "green",      "Amex MR"),
    ("american express", "everyday",   "Amex MR"),
    ("capital one",      "venture",    "Capital One Miles"),
    ("capital one",      "spark",      "Capital One Miles"),
    ("citi",             "premier",    "Citi ThankYou"),
    ("citi",             "prestige",   "Citi ThankYou"),
    ("citi",             "rewards+",   "Citi ThankYou"),
]


def card_to_currency(issuer_name: str, card_name: str) -> Optional[str]:
    """Map a card's issuer + name to its flexible points currency bucket."""
    il = issuer_name.lower()
    cl = card_name.lower()
    for issuer_frag, card_frag, currency in CARD_TO_CURRENCY:
        if issuer_frag in il and card_frag in cl:
            return currency
    return None


# ---------------------------------------------------------------------------
# Step 1 — Build user's points inventory
# ---------------------------------------------------------------------------

def get_user_inventory(
    user_id: int,
    point_balances: dict[int, int],
    db: Session,
) -> dict[str, int]:
    """
    Return {currency: total_points} by aggregating submitted balances.

    point_balances is keyed on user_card.id; we look up each card's
    issuer and map it to a flexible currency bucket.
    """
    user_cards = (
        db.query(UserCard)
        .filter(UserCard.user_id == user_id)
        .all()
    )
    inventory: dict[str, int] = {}

    for uc in user_cards:
        balance = point_balances.get(uc.id, 0)
        if not balance or balance <= 0:
            continue
        card: CreditCard = uc.credit_card
        issuer: CardIssuer = card.issuer
        currency = card_to_currency(issuer.name, card.name)
        if currency:
            inventory[currency] = inventory.get(currency, 0) + balance

    return inventory


# ---------------------------------------------------------------------------
# Step 2 — Find transfer paths
# ---------------------------------------------------------------------------

def _is_bonus_active(partner: TransferPartner) -> bool:
    if not partner.bonus_ratio:
        return False
    if partner.bonus_expires and partner.bonus_expires < date.today():
        return False
    return True


def find_transfer_paths(
    inventory: dict[str, int],
    destination: str,
    cabin: str,
    db: Session,
) -> list[dict]:
    """
    For each AwardCost matching destination+cabin, check if any currency in
    the user's inventory transfers to that program. Calculate CPP and affordability.
    Returns list sorted by CPP descending.
    """
    destination = destination.strip().title()
    # IATA code is used to build partner award-search deep-link URLs
    dest_iata = get_iata_code(destination)

    # Try exact DB rows first; fall back to published regional award chart rates
    db_costs = (
        db.query(AwardCost)
        .filter(
            func.lower(AwardCost.destination) == destination.lower(),
            AwardCost.cabin == cabin,
        )
        .all()
    )
    award_costs: list = db_costs if db_costs else _get_award_rates(destination, cabin)


    all_active_partners = (
        db.query(TransferPartner)
        .filter(TransferPartner.is_active == True)
        .all()
    )

    # Index partners by program for fast lookup
    partner_index: dict[str, list] = defaultdict(list)
    for p in all_active_partners:
        partner_index[p.partner_program].append(p)

    paths = []
    for award in award_costs:
        program = award.airline_program
        matching_partners = partner_index.get(program, [])
        for partner in matching_partners:
            user_balance = inventory.get(partner.source_currency, 0)
            if user_balance <= 0:
                continue

            bonus_ratio = partner.bonus_ratio if _is_bonus_active(partner) else 0.0
            # Points user needs to transfer (before bonus multiplies them)
            effective_needed = award.points_required / (1 + bonus_ratio)
            # Miles/points available after transfer including bonus
            points_available = user_balance * partner.transfer_ratio * (1 + bonus_ratio)

            # CPP = (cash_value - taxes) / effective_points * 100
            cpp = (award.cash_price_usd - award.taxes_fees_usd) / effective_needed * 100

            # Build award search deep-link using the partner's URL template
            award_search_url: Optional[str] = None
            if partner.award_search_url_template:
                award_search_url = partner.award_search_url_template
                if dest_iata:
                    award_search_url += f"?destination={dest_iata}"

            # is_dynamic_pricing = True only for Delta/Capital One (revenue-based pricing)
            is_dynamic_pricing = getattr(award, "is_dynamic_pricing", False)
            notes = award.notes or ""

            paths.append({
                "source_currency": partner.source_currency,
                "partner_program": program,
                "destination": destination,
                "cabin": cabin,
                "points_required": award.points_required,
                "effective_points_needed": round(effective_needed),
                "user_balance": user_balance,
                "points_available_after_transfer": round(points_available),
                "can_afford": points_available >= award.points_required,
                "cash_price_usd": award.cash_price_usd,
                "taxes_fees_usd": award.taxes_fees_usd,
                "cpp": round(cpp, 2),
                "is_great_deal": cpp > 2.0,
                "is_estimated": is_dynamic_pricing,   # schema compat — true only for dynamic programs
                "transfer_ratio": partner.transfer_ratio,
                "bonus_ratio": bonus_ratio if bonus_ratio > 0 else None,
                "bonus_expires": partner.bonus_expires.isoformat() if partner.bonus_expires else None,
                "portal_url": partner.portal_url,
                "award_search_url": award_search_url,
                "award_notes": notes,
            })

    paths.sort(key=lambda x: x["cpp"], reverse=True)
    return paths


# ---------------------------------------------------------------------------
# Step 3 — Build Claude prompt
# ---------------------------------------------------------------------------

CLAUDE_SYSTEM_PROMPT = (
    "You are a credit card rewards expert and travel hacking advisor. "
    "You specialize in helping users maximize the value of their points and miles. "
    "You understand transfer partners, award charts, dynamic pricing, and booking strategies. "
    "You have deep knowledge of award seat availability patterns from The Points Guy, One Mile at a Time, "
    "FlyerTalk, and similar sources. Always be honest about limitations.\n"
    "When a path has CPP > 2.0¢, note it is an excellent value. Below 1.0¢ is poor value.\n"
    "IMPORTANT: Points shown are published SAVER award rates — always refer to them as "
    "'starting from X pts (Saver rate)' not as a confirmed price, because availability varies.\n\n"
    "Format your response in clean markdown with these exact sections in this exact order:\n\n"
    "## Best Redemption Option\n"
    "1-2 sentences on the top pick and why (mention CPP value and that it's the published Saver rate).\n\n"
    "## Which Airlines Fly This Route?\n"
    "ALWAYS include this section. List the major airlines that operate this specific route (origin → destination). "
    "For each airline, state its alliance and which award program(s) the user can use to book it with points. "
    "Use this alliance mapping:\n"
    "  • Star Alliance (Lufthansa, Swiss, United, Air Canada, ANA, Turkish, etc.) → "
    "United MileagePlus, Avianca LifeMiles, Air Canada Aeroplan, Turkish Miles&Smiles\n"
    "  • oneworld (British Airways, Qatar, Cathay Pacific, Finnair, Iberia, etc.) → "
    "British Airways Avios, Qatar Privilege Club, Cathay Asia Miles\n"
    "  • SkyTeam (Air France, KLM, Delta, Korean Air, etc.) → Air France/KLM Flying Blue, Delta SkyMiles\n"
    "  • Etihad (non-alliance) → Etihad Guest\n"
    "  • Emirates (non-alliance) → Emirates Skywards\n"
    "  • Virgin Atlantic (non-alliance) → Virgin Atlantic Flying Club\n"
    "If real flight data was provided (REAL FLIGHTS section in the prompt), use those exact airlines. "
    "Otherwise use your training knowledge of which airlines serve this route.\n\n"
    "## Can You Afford It?\n"
    "State clearly whether the user has enough points. If not, say exactly how many more they need.\n\n"
    "## Step-by-Step Instructions\n"
    "Numbered steps (1. 2. 3. etc.) to complete the redemption — login, transfer, search, book.\n\n"
    "## Award Availability for This Route\n"
    "Based on your knowledge: Is Saver space typically plentiful or scarce on this specific route and program? "
    "How far in advance should the user search? Any known sweet spots, tricks, or seasons to avoid?\n\n"
    "## Things to Watch Out For\n"
    "Bullet points covering: transfer time (1-3 days), high fees if applicable, "
    "whether to preserve flexible currencies, and a reminder to verify availability before transferring.\n\n"
    "Keep it concise. Use **bold** for key numbers and program names."
)


def build_claude_prompt(
    inventory: dict[str, int],
    paths: list[dict],
    origin: str,
    destination: str,
    travel_month: str,
    cabin: str,
    real_airlines: Optional[list[tuple[str, float]]] = None,
) -> str:
    inv_lines = "\n".join(
        f"  - {cur}: {bal:,} points" for cur, bal in inventory.items()
    ) or "  (no balances entered)"

    path_lines = []
    for i, p in enumerate(paths[:6], 1):
        bonus_note = (
            f" (+{p['bonus_ratio'] * 100:.0f}% transfer bonus active)"
            if p["bonus_ratio"]
            else ""
        )
        afford_note = "AFFORDABLE" if p["can_afford"] else "INSUFFICIENT BALANCE"
        note_line = f"     Note: {p['award_notes']}\n" if p["award_notes"] else ""
        path_lines.append(
            f"  {i}. {p['source_currency']} → {p['partner_program']} → {destination} ({p['cabin']})\n"
            f"     Points needed: {p['effective_points_needed']:,}{bonus_note} | "
            f"CPP: {p['cpp']:.2f}¢ | {afford_note}\n"
            f"     Cash fare: ${p.get('live_cash_price') or p['cash_price_usd']}"
            + (" (live Google Flights price)" if p.get("live_cash_price") else " (published estimate)")
            + f" | Taxes/fees: ${p['taxes_fees_usd']}\n"
            + note_line
        )

    paths_text = "".join(path_lines) if path_lines else (
        "  No matching paths found for this destination/cabin combination.\n"
    )

    # Build real-airline context block — use live SerpAPI data if available,
    # otherwise Gemini will use its own training knowledge of the route.
    if real_airlines:
        airline_lines = "\n".join(
            f"  - {airline}: ${price:,.0f}" for airline, price in real_airlines[:8]
        )
        airline_block = (
            f"\nREAL FLIGHTS ON THIS ROUTE (from Google Flights, {origin} → {destination}):\n"
            f"{airline_lines}\n\n"
            "Use these exact airlines in the '## Which Airlines Fly This Route?' section.\n"
        )
    else:
        airline_block = (
            f"\nNote: No live flight data available. Use your training knowledge to list "
            f"the airlines that typically operate {origin} → {destination} in the "
            f"'## Which Airlines Fly This Route?' section.\n"
        )

    return (
        f"The user wants to travel from {origin} to {destination} in {travel_month} ({cabin} class).\n\n"
        f"USER'S POINT BALANCES:\n{inv_lines}\n\n"
        f"AVAILABLE REDEMPTION PATHS (ranked by cents-per-point):\n{paths_text}\n"
        + airline_block +
        "\nPlease analyze these options following the exact section order in the system prompt. "
        "The '## Which Airlines Fly This Route?' section is REQUIRED — always include it second. "
        "For '## Award Availability for This Route': is Saver space plentiful or scarce on this route? "
        "How far in advance should the user search? Any route-specific tips "
        f"(e.g. 'Air India space to {destination} releases 11 months out')? "
        "Be specific to this route, not generic advice."
    )


# ---------------------------------------------------------------------------
# Step 3 — LLM reasoning (Gemini free → Claude paid → deterministic fallback)
# ---------------------------------------------------------------------------

async def call_gemini_reasoning(user_message: str) -> str:
    """Call Google Gemini (gemini-2.0-flash — free tier via new google-genai SDK)."""
    from google import genai
    from google.genai import types

    def _sync_call() -> str:
        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=CLAUDE_SYSTEM_PROMPT,
                max_output_tokens=1600,
            ),
        )
        return response.text

    return await asyncio.to_thread(_sync_call)


async def call_claude_reasoning(user_message: str) -> str:
    """Call Anthropic Claude (paid)."""
    from anthropic import Anthropic

    def _sync_call() -> str:
        client = Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            system=CLAUDE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text

    return await asyncio.to_thread(_sync_call)


def _build_fallback_analysis(
    inventory: dict[str, int],
    paths: list[dict],
    origin: str,
    destination: str,
    travel_month: str,
    cabin: str,
) -> str:
    """Rule-based analysis (markdown) used when no LLM key is configured."""
    if not paths:
        currencies = ", ".join(f"**{c}**" for c in inventory.keys()) if inventory else "no flexible currencies"
        return (
            f"## No Paths Found\n\n"
            f"No transfer paths were found for **{destination}** ({cabin}) with your current balances. "
            f"You have {currencies}.\n\n"
            "## What to Do\n\n"
            "Consider adding cards that earn **Chase Ultimate Rewards**, **Amex Membership Rewards**, "
            "**Capital One Miles**, or **Citi ThankYou Points** — these transfer to airline partners "
            "for award bookings."
        )

    affordable = [p for p in paths if p["can_afford"]]
    top = affordable[0] if affordable else paths[0]

    sections: list[str] = []

    # Which airlines fly this route (static guidance — Gemini gives route-specific answers)
    sections.append(
        f"## Which Airlines Fly This Route?\n\n"
        f"Common airlines on the **{origin} → {destination}** route include carriers such as "
        f"Air India (Star Alliance), Lufthansa (Star Alliance), Etihad (non-alliance), "
        f"Qatar Airways (oneworld), and Emirates (non-alliance). "
        f"Enable AI analysis (add a Gemini API key) to get route-specific airline details and "
        f"the exact award programs you can use to book each one."
    )

    # Best option
    value_label = "an excellent value (> 2¢/pt)" if top["cpp"] > 2.0 else "a reasonable value"
    cash_label = (
        f"Live fare: ~**${top['live_cash_price']:,.0f}**" if top.get("live_cash_price")
        else f"Benchmark fare: ~**${top['cash_price_usd']:,}**"
    )
    sections.append(
        f"## Best Redemption Option\n\n"
        f"Transfer **{top['source_currency']}** points to **{top['partner_program']}** "
        f"for a **{destination}** {cabin} award — starting from **{top['effective_points_needed']:,} pts (published Saver rate)**, "
        f"yielding **{top['cpp']:.2f}¢ per point**, which is {value_label}. "
        f"{cash_label}."
    )

    # Affordability
    if top["can_afford"]:
        leftover = top["user_balance"] - top["effective_points_needed"]
        sections.append(
            f"## Can You Afford It?\n\n"
            f"✅ Yes — you have **{top['user_balance']:,} {top['source_currency']} points** and need "
            f"**{top['effective_points_needed']:,}**. You'll have "
            f"**{leftover:,} points** remaining after the transfer."
        )
    else:
        gap = top["points_required"] - top["points_available_after_transfer"]
        sections.append(
            f"## Can You Afford It?\n\n"
            f"⚠️ Not quite — you need **{gap:,} more points** to cover this redemption. "
            f"Consider putting more spending on your **{top['source_currency']}** card to earn the difference."
        )

    # Step-by-step
    bonus_note = ""
    if top.get("bonus_ratio"):
        pct = int(top["bonus_ratio"] * 100)
        bonus_note = f" (a **{pct}% transfer bonus** is currently active — confirm before transferring)"
    steps = (
        f"## Step-by-Step Instructions\n\n"
        f"1. Log in to your **{top['source_currency']}** account portal.\n"
        f"2. Navigate to **Transfer Points** and select **{top['partner_program']}**{bonus_note}.\n"
        f"3. Transfer **{top['effective_points_needed']:,} points** "
        f"(allow **1–3 business days** to post to your airline account).\n"
        f"4. Once miles post, go to **{top['partner_program']}'s award search** and search "
        f"for availability to **{destination}** in **{travel_month}**.\n"
        f"5. Select a **{cabin} Saver award** and book — expect ~**${top['taxes_fees_usd']}** "
        f"in taxes and carrier fees at checkout."
    )
    sections.append(steps)

    # Award availability intelligence (generic — Gemini would give route-specific guidance)
    sections.append(
        f"## Award Availability for This Route\n\n"
        f"Saver award space is allocated by airlines and can be limited, especially for popular routes "
        f"and peak travel periods. For **{destination}** in **{travel_month}**:\n"
        f"- Search as early as possible — many programs release Saver space 11–12 months in advance.\n"
        f"- Use the **Search Award Space →** button in the table to check live availability on "
        f"**{top['partner_program']}'s** own site before transferring.\n"
        f"- Be flexible on dates within the month to find available Saver seats.\n"
        f"- If no Saver space is found, consider nearby dates or alternative programs in the table above."
    )

    # Caveats
    caveats = ["Points transfers are **irreversible** — always confirm award seats exist before transferring."]
    caveats.append("Allow **1–3 business days** for transferred points to appear in your airline account.")
    if top.get("taxes_fees_usd", 0) > 200:
        caveats.append(f"Taxes/fees of **${top['taxes_fees_usd']}** are high — factor this into your decision.")
    caveats.append(f"Preserve remaining **{top['source_currency']}** points for potentially higher-value redemptions.")

    sections.append(
        "## Things to Watch Out For\n\n" +
        "\n".join(f"- {c}" for c in caveats)
    )

    return "\n\n".join(sections)


async def call_llm_reasoning(
    user_message: str,
    inventory: dict[str, int],
    paths: list[dict],
    origin: str,
    destination: str,
    travel_month: str,
    cabin: str,
) -> str:
    """
    Dispatcher: Gemini (free) → Claude (paid) → deterministic fallback.
    Never raises — always returns a string.
    """
    if settings.gemini_api_key:
        try:
            return await call_gemini_reasoning(user_message)
        except Exception as e:
            logger.warning("Gemini reasoning failed: %s: %s", type(e).__name__, e)

    if settings.anthropic_api_key:
        try:
            return await call_claude_reasoning(user_message)
        except Exception as e:
            logger.warning("Claude reasoning failed: %s: %s", type(e).__name__, e)

    return _build_fallback_analysis(inventory, paths, origin, destination, travel_month, cabin)


# ---------------------------------------------------------------------------
# Step 4 — Build booking instruction cards
# ---------------------------------------------------------------------------

def build_booking_instructions(path: dict) -> dict:
    """
    Generate step-by-step booking instructions and a deep link for a path.
    """
    bonus_step = ""
    if path.get("bonus_ratio"):
        pct = int(path["bonus_ratio"] * 100)
        expires = path.get("bonus_expires") or "soon"
        bonus_step = (
            f"Confirm the {pct}% transfer bonus is still active (expires {expires}). "
        )

    miles_received = round(
        path["points_required"] * path["transfer_ratio"] * (1 + (path["bonus_ratio"] or 0))
    )

    steps = [
        f"Log in to your {path['source_currency']} account portal.",
        (
            f"{bonus_step}Navigate to the 'Transfer Points' section and select "
            f"{path['partner_program']}."
        ),
        (
            f"Transfer {path['effective_points_needed']:,} points. You will receive "
            f"{miles_received:,} {path['partner_program']} miles/points after transfer "
            f"(allow 1–3 business days to post)."
        ),
        (
            f"Once miles post, search for {path['destination']} award availability on "
            f"{path['partner_program']}'s website."
        ),
        (
            f"Book the {path['cabin']} award — expect to pay approximately "
            f"${path['taxes_fees_usd']} in taxes and carrier fees at checkout."
        ),
    ]

    return {
        "source_currency": path["source_currency"],
        "partner_program": path["partner_program"],
        "cabin": path["cabin"],
        "cpp": path["cpp"],
        "is_great_deal": path["is_great_deal"],
        "can_afford": path["can_afford"],
        "steps": steps,
        "portal_url": path["portal_url"],
    }
