"""
Card data sync service.
Reads card_data.json (or a remote URL) and upserts issuers, categories,
cards, and reward rules into the database idempotently.

To update card data:
  1. Edit backend/card_data.json
  2. Restart the server OR call POST /admin/sync-cards with a valid JWT
"""
import json
from datetime import date
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session
from ..models import CardIssuer, CreditCard, RewardCategory, RewardRule, CapPeriod

# Path to the bundled card data JSON file
DEFAULT_DATA_FILE = Path(__file__).parent.parent.parent / "card_data.json"


def sync_from_file(db: Session, file_path: Path = DEFAULT_DATA_FILE) -> dict:
    """
    Read card_data.json and upsert all data into the database.
    Safe to call on every startup — fully idempotent.

    Returns a summary dict with counts of processed entities.
    """
    with open(file_path, "r") as f:
        data = json.load(f)

    return _sync(db, data)


def sync_from_url(db: Session, url: str) -> dict:
    """
    Fetch card data from a remote URL (e.g. raw GitHub) and upsert into DB.
    Requires httpx to be installed.
    """
    import httpx
    response = httpx.get(url, timeout=15)
    response.raise_for_status()
    data = response.json()
    return _sync(db, data)


def _sync(db: Session, data: dict) -> dict:
    """Core upsert logic shared by sync_from_file and sync_from_url."""
    issuer_map = _upsert_issuers(db, data.get("issuers", []))
    category_map = _upsert_categories(db, data.get("categories", []))
    card_map = _upsert_cards(db, data.get("cards", []), issuer_map)
    rules_count = _upsert_rules(db, data.get("rules", []), card_map, category_map)

    db.commit()

    return {
        "issuers": len(issuer_map),
        "categories": len(category_map),
        "cards": len(card_map),
        "rules": rules_count,
    }


def _upsert_issuers(db: Session, issuers: list) -> dict:
    """Upsert issuers by name. Returns {name: id} map."""
    issuer_map = {}
    for item in issuers:
        name = item["name"]
        issuer = db.query(CardIssuer).filter(CardIssuer.name == name).first()
        if not issuer:
            issuer = CardIssuer(name=name)
            db.add(issuer)
            db.flush()
        issuer_map[name] = issuer.id
    return issuer_map


def _upsert_categories(db: Session, categories: list) -> dict:
    """Upsert reward categories by name. Returns {name: id} map."""
    category_map = {}
    for item in categories:
        name = item["name"]
        cat = db.query(RewardCategory).filter(RewardCategory.name == name).first()
        if not cat:
            cat = RewardCategory(name=name)
            db.add(cat)
            db.flush()
        category_map[name] = cat.id
    return category_map


def _upsert_cards(db: Session, cards: list, issuer_map: dict) -> dict:
    """Upsert credit cards by (issuer_name, card_name). Returns {(issuer, name): id} map."""
    card_map = {}
    for item in cards:
        issuer_name = item["issuer"]
        card_name = item["name"]
        network = item["network"]
        issuer_id = issuer_map.get(issuer_name)
        if issuer_id is None:
            continue

        card = db.query(CreditCard).filter(
            CreditCard.issuer_id == issuer_id,
            CreditCard.name == card_name,
        ).first()

        if not card:
            card = CreditCard(issuer_id=issuer_id, name=card_name, network=network)
            db.add(card)
            db.flush()
        else:
            # Update network in case it changed
            card.network = network
            db.flush()

        card_map[(issuer_name, card_name)] = card.id
    return card_map


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    return date.fromisoformat(value)


def _parse_cap_period(value: Optional[str]) -> Optional[CapPeriod]:
    if not value:
        return None
    return CapPeriod(value.lower())


def _upsert_rules(db: Session, rules: list, card_map: dict, category_map: dict) -> int:
    """
    Upsert reward rules.
    Unique key: (credit_card_id, category_id, start_date)
    Returns count of rules processed.
    """
    count = 0
    for item in rules:
        issuer_name = item["issuer"]
        card_name = item["card"]
        category_name = item["category"]

        card_id = card_map.get((issuer_name, card_name))
        category_id = category_map.get(category_name)
        if card_id is None or category_id is None:
            continue

        start_date = _parse_date(item["start_date"])
        end_date = _parse_date(item.get("end_date"))
        cap_period = _parse_cap_period(item.get("cap_period"))
        multiplier = float(item["multiplier"])
        cap_amount = item.get("cap_amount")
        is_rotating = bool(item.get("is_rotating", False))
        notes = item.get("notes")

        # Look up existing rule by unique key
        rule = db.query(RewardRule).filter(
            RewardRule.credit_card_id == card_id,
            RewardRule.category_id == category_id,
            RewardRule.start_date == start_date,
        ).first()

        if rule:
            # Update in place
            rule.multiplier = multiplier
            rule.cap_amount = cap_amount
            rule.cap_period = cap_period
            rule.end_date = end_date
            rule.is_rotating = is_rotating
            rule.notes = notes
        else:
            rule = RewardRule(
                credit_card_id=card_id,
                category_id=category_id,
                multiplier=multiplier,
                cap_amount=cap_amount,
                cap_period=cap_period,
                is_rotating=is_rotating,
                start_date=start_date,
                end_date=end_date,
                notes=notes,
            )
            db.add(rule)

        count += 1

    return count
