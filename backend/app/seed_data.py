"""
Database seeding — delegates to card_sync_service which reads card_data.json.
To update card data, edit backend/card_data.json and restart the server
(or call POST /admin/sync-cards).
"""
from sqlalchemy import text, inspect
from .database import SessionLocal, engine, Base
from .services.card_sync_service import sync_from_file


def _run_migrations():
    """Apply lightweight schema migrations for SQLite (no Alembic)."""
    inspector = inspect(engine)
    with engine.connect() as conn:
        # Add 'role' column to users if it doesn't exist
        if "users" in inspector.get_table_names():
            existing_cols = [c["name"] for c in inspector.get_columns("users")]
            if "role" not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'user'"))
                conn.commit()
                print("Migration: added 'role' column to users table")

        # Add 'annual_fee' column to credit_cards if it doesn't exist
        if "credit_cards" in inspector.get_table_names():
            existing_cols = [c["name"] for c in inspector.get_columns("credit_cards")]
            if "annual_fee" not in existing_cols:
                conn.execute(text("ALTER TABLE credit_cards ADD COLUMN annual_fee FLOAT NOT NULL DEFAULT 0.0"))
                conn.commit()
                print("Migration: added 'annual_fee' column to credit_cards table")

        # Add 'point_balance' column to user_cards if it doesn't exist
        if "user_cards" in inspector.get_table_names():
            existing_cols = [c["name"] for c in inspector.get_columns("user_cards")]
            if "point_balance" not in existing_cols:
                conn.execute(text("ALTER TABLE user_cards ADD COLUMN point_balance INTEGER"))
                conn.commit()
                print("Migration: added 'point_balance' column to user_cards table")

        # Add 'award_search_url_template' column to transfer_partners if it doesn't exist
        if "transfer_partners" in inspector.get_table_names():
            existing_cols = [c["name"] for c in inspector.get_columns("transfer_partners")]
            if "award_search_url_template" not in existing_cols:
                conn.execute(text("ALTER TABLE transfer_partners ADD COLUMN award_search_url_template VARCHAR"))
                conn.commit()
                print("Migration: added 'award_search_url_template' column to transfer_partners table")

            # Idempotent URL updates — fix any stale/incorrect award search URLs
            url_updates = [
                ("United MileagePlus",        "https://www.united.com/en/us/book-flight"),
                ("British Airways Avios",     "https://www.britishairways.com/travel/redeem/execclub/_gf/en_us"),
                ("Air France/KLM Flying Blue","https://wwws.airfrance.us"),
                ("Singapore Airlines KrisFlyer","https://www.singaporeair.com/en_UK/us/plan-travel/miles/use-miles/book-with-miles/"),
                ("Delta SkyMiles",            "https://www.delta.com/us/en/award-travel/overview"),
                ("Air Canada Aeroplan",       "https://www.aircanada.com/us/en/aco/home.html"),
            ]
            for program, url in url_updates:
                conn.execute(
                    text("UPDATE transfer_partners SET award_search_url_template = :url WHERE partner_program = :prog"),
                    {"url": url, "prog": program},
                )
            conn.commit()


def seed_concierge_data(db):
    """Idempotently seed transfer partners and award costs (adds missing rows)."""
    from .models import TransferPartner, AwardCost
    from datetime import date

    _CHASE   = "https://creditcards.chase.com/travel-credit-cards/transfer-partners"
    _AMEX    = "https://global.americanexpress.com/rewards/transfer"
    _C1      = "https://travel.capitalone.com/transfer-partners"
    _CITI    = "https://www.thankyou.com/transfer"

    all_partners = [
        # ── Chase Ultimate Rewards ──────────────────────────────────────────
        TransferPartner(source_currency="Chase UR", partner_program="United MileagePlus",
                        transfer_ratio=1.0, portal_url=_CHASE,
                        award_search_url_template="https://www.united.com/en/us/book-flight"),
        TransferPartner(source_currency="Chase UR", partner_program="British Airways Avios",
                        transfer_ratio=1.0, portal_url=_CHASE,
                        award_search_url_template="https://www.britishairways.com/travel/redeem/execclub/_gf/en_us"),
        TransferPartner(source_currency="Chase UR", partner_program="Air France/KLM Flying Blue",
                        transfer_ratio=1.0, portal_url=_CHASE,
                        award_search_url_template="https://wwws.airfrance.us"),
        TransferPartner(source_currency="Chase UR", partner_program="Singapore Airlines KrisFlyer",
                        transfer_ratio=1.0, portal_url=_CHASE,
                        award_search_url_template="https://www.singaporeair.com/en_UK/us/plan-travel/miles/use-miles/book-with-miles/"),
        TransferPartner(source_currency="Chase UR", partner_program="Air Canada Aeroplan",
                        transfer_ratio=1.0, portal_url=_CHASE,
                        award_search_url_template="https://www.aircanada.com/us/en/aco/home.html"),
        TransferPartner(source_currency="Chase UR", partner_program="Virgin Atlantic Flying Club",
                        transfer_ratio=1.0, portal_url=_CHASE,
                        award_search_url_template="https://www.virginatlantic.com/us/en/flying-club/redeem-miles.html"),
        TransferPartner(source_currency="Chase UR", partner_program="Iberia Plus",
                        transfer_ratio=1.0, portal_url=_CHASE,
                        award_search_url_template="https://www.iberia.com/us/iberia-plus/avios/use-avios/"),
        TransferPartner(source_currency="Chase UR", partner_program="Hyatt World of Hyatt",
                        transfer_ratio=1.0, portal_url=_CHASE,
                        award_search_url_template="https://www.hyatt.com/explore-hotels"),
        # ── Amex Membership Rewards ─────────────────────────────────────────
        TransferPartner(source_currency="Amex MR", partner_program="Delta SkyMiles",
                        transfer_ratio=1.0, portal_url=_AMEX,
                        award_search_url_template="https://www.delta.com/us/en/award-travel/overview"),
        TransferPartner(source_currency="Amex MR", partner_program="Air France/KLM Flying Blue",
                        transfer_ratio=1.0, portal_url=_AMEX,
                        award_search_url_template="https://wwws.airfrance.us"),
        TransferPartner(source_currency="Amex MR", partner_program="British Airways Avios",
                        transfer_ratio=1.0, portal_url=_AMEX,
                        award_search_url_template="https://www.britishairways.com/travel/redeem/execclub/_gf/en_us"),
        TransferPartner(source_currency="Amex MR", partner_program="Singapore Airlines KrisFlyer",
                        transfer_ratio=1.0, portal_url=_AMEX,
                        award_search_url_template="https://www.singaporeair.com/en_UK/us/plan-travel/miles/use-miles/book-with-miles/"),
        TransferPartner(source_currency="Amex MR", partner_program="Emirates Skywards",
                        transfer_ratio=1.0, portal_url=_AMEX,
                        award_search_url_template="https://www.emirates.com/us/english/book/award-tickets/"),
        TransferPartner(source_currency="Amex MR", partner_program="Etihad Guest",
                        transfer_ratio=1.0, portal_url=_AMEX,
                        award_search_url_template="https://www.etihad.com/en-us/etihad-guest/use-your-miles/flights/"),
        TransferPartner(source_currency="Amex MR", partner_program="ANA Mileage Club",
                        transfer_ratio=1.0, portal_url=_AMEX,
                        award_search_url_template="https://www.ana.co.jp/en/us/amc/reference/mileage/award/"),
        TransferPartner(source_currency="Amex MR", partner_program="Cathay Pacific Asia Miles",
                        transfer_ratio=1.0, portal_url=_AMEX,
                        award_search_url_template="https://www.cathaypacific.com/cx/en_US/asia-miles/redeem.html"),
        TransferPartner(source_currency="Amex MR", partner_program="Virgin Atlantic Flying Club",
                        transfer_ratio=1.0, portal_url=_AMEX,
                        award_search_url_template="https://www.virginatlantic.com/us/en/flying-club/redeem-miles.html"),
        TransferPartner(source_currency="Amex MR", partner_program="Avianca LifeMiles",
                        transfer_ratio=1.0, portal_url=_AMEX,
                        award_search_url_template="https://www.avianca.com/us/en/lifemiles/"),
        TransferPartner(source_currency="Amex MR", partner_program="Air Canada Aeroplan",
                        transfer_ratio=1.0, portal_url=_AMEX,
                        award_search_url_template="https://www.aircanada.com/us/en/aco/home.html"),
        TransferPartner(source_currency="Amex MR", partner_program="Qantas Frequent Flyer",
                        transfer_ratio=1.0, portal_url=_AMEX,
                        award_search_url_template="https://www.qantas.com/us/en/frequent-flyer/use-points/flight-rewards.html"),
        TransferPartner(source_currency="Amex MR", partner_program="Hilton Honors",
                        transfer_ratio=2.0, portal_url=_AMEX,
                        award_search_url_template="https://www.hilton.com/en/hotels/"),
        # ── Capital One Miles ───────────────────────────────────────────────
        TransferPartner(source_currency="Capital One Miles", partner_program="Air Canada Aeroplan",
                        transfer_ratio=1.0, portal_url=_C1,
                        award_search_url_template="https://www.aircanada.com/us/en/aco/home.html"),
        TransferPartner(source_currency="Capital One Miles", partner_program="Air France/KLM Flying Blue",
                        transfer_ratio=1.0, portal_url=_C1,
                        award_search_url_template="https://wwws.airfrance.us"),
        TransferPartner(source_currency="Capital One Miles", partner_program="British Airways Avios",
                        transfer_ratio=1.0, portal_url=_C1,
                        award_search_url_template="https://www.britishairways.com/travel/redeem/execclub/_gf/en_us"),
        TransferPartner(source_currency="Capital One Miles", partner_program="Singapore Airlines KrisFlyer",
                        transfer_ratio=1.0, portal_url=_C1,
                        award_search_url_template="https://www.singaporeair.com/en_UK/us/plan-travel/miles/use-miles/book-with-miles/"),
        TransferPartner(source_currency="Capital One Miles", partner_program="Emirates Skywards",
                        transfer_ratio=1.0, portal_url=_C1,
                        award_search_url_template="https://www.emirates.com/us/english/book/award-tickets/"),
        TransferPartner(source_currency="Capital One Miles", partner_program="Etihad Guest",
                        transfer_ratio=1.0, portal_url=_C1,
                        award_search_url_template="https://www.etihad.com/en-us/etihad-guest/use-your-miles/flights/"),
        TransferPartner(source_currency="Capital One Miles", partner_program="Turkish Airlines Miles&Smiles",
                        transfer_ratio=1.0, portal_url=_C1,
                        award_search_url_template="https://www.turkishairlines.com/en-us/miles-smiles/use-miles/"),
        TransferPartner(source_currency="Capital One Miles", partner_program="Avianca LifeMiles",
                        transfer_ratio=1.0, portal_url=_C1,
                        award_search_url_template="https://www.avianca.com/us/en/lifemiles/"),
        TransferPartner(source_currency="Capital One Miles", partner_program="Wyndham Rewards",
                        transfer_ratio=1.0, bonus_ratio=0.30, bonus_expires=date(2026, 6, 30),
                        portal_url=_C1,
                        award_search_url_template="https://www.wyndhamhotels.com/wyndham-rewards/redeem"),
        # ── Citi ThankYou ───────────────────────────────────────────────────
        TransferPartner(source_currency="Citi ThankYou", partner_program="Singapore Airlines KrisFlyer",
                        transfer_ratio=1.0, portal_url=_CITI,
                        award_search_url_template="https://www.singaporeair.com/en_UK/us/plan-travel/miles/use-miles/book-with-miles/"),
        TransferPartner(source_currency="Citi ThankYou", partner_program="Air France/KLM Flying Blue",
                        transfer_ratio=1.0, portal_url=_CITI,
                        award_search_url_template="https://wwws.airfrance.us"),
        TransferPartner(source_currency="Citi ThankYou", partner_program="Qatar Airways Privilege Club",
                        transfer_ratio=1.0, portal_url=_CITI,
                        award_search_url_template="https://www.qatarairways.com/us/en/privilege-club/redeem/"),
        TransferPartner(source_currency="Citi ThankYou", partner_program="Etihad Guest",
                        transfer_ratio=1.0, portal_url=_CITI,
                        award_search_url_template="https://www.etihad.com/en-us/etihad-guest/use-your-miles/flights/"),
        TransferPartner(source_currency="Citi ThankYou", partner_program="Turkish Airlines Miles&Smiles",
                        transfer_ratio=1.0, portal_url=_CITI,
                        award_search_url_template="https://www.turkishairlines.com/en-us/miles-smiles/use-miles/"),
        TransferPartner(source_currency="Citi ThankYou", partner_program="Cathay Pacific Asia Miles",
                        transfer_ratio=1.0, portal_url=_CITI,
                        award_search_url_template="https://www.cathaypacific.com/cx/en_US/asia-miles/redeem.html"),
        TransferPartner(source_currency="Citi ThankYou", partner_program="Avianca LifeMiles",
                        transfer_ratio=1.0, portal_url=_CITI,
                        award_search_url_template="https://www.avianca.com/us/en/lifemiles/"),
        TransferPartner(source_currency="Citi ThankYou", partner_program="Wyndham Rewards",
                        transfer_ratio=1.0, portal_url=_CITI,
                        award_search_url_template="https://www.wyndhamhotels.com/wyndham-rewards/redeem"),
    ]

    existing_partners = {
        (p.source_currency, p.partner_program)
        for p in db.query(TransferPartner).all()
    }
    new_partners = [
        p for p in all_partners
        if (p.source_currency, p.partner_program) not in existing_partners
    ]
    if new_partners:
        db.add_all(new_partners)
        db.commit()
        print(f"Seeded {len(new_partners)} new transfer partners")

    all_awards = [
        # ── Tokyo ───────────────────────────────────────────────────────────
        AwardCost(destination="Tokyo", airline_program="United MileagePlus",
                  cabin="economy", points_required=35000, cash_price_usd=900, taxes_fees_usd=65,
                  notes="Saver economy on United or Star Alliance partners"),
        AwardCost(destination="Tokyo", airline_program="ANA Mileage Club",
                  cabin="economy", points_required=35000, cash_price_usd=900, taxes_fees_usd=110,
                  notes="ANA Saver economy — book via Amex MR transfer; great availability"),
        AwardCost(destination="Tokyo", airline_program="ANA Mileage Club",
                  cabin="business", points_required=75000, cash_price_usd=4500, taxes_fees_usd=120,
                  notes="ANA Business Class on own metal — one of the best products in the world"),
        AwardCost(destination="Tokyo", airline_program="Virgin Atlantic Flying Club",
                  cabin="business", points_required=47500, cash_price_usd=4500, taxes_fees_usd=85,
                  notes="ANA business via Virgin Atlantic — legendary sweet-spot (off-peak)"),
        AwardCost(destination="Tokyo", airline_program="Air France/KLM Flying Blue",
                  cabin="economy", points_required=40000, cash_price_usd=900, taxes_fees_usd=100),
        AwardCost(destination="Tokyo", airline_program="Avianca LifeMiles",
                  cabin="economy", points_required=35000, cash_price_usd=900, taxes_fees_usd=55,
                  notes="Star Alliance economy via LifeMiles — low fees, watch for surcharges"),
        AwardCost(destination="Tokyo", airline_program="Air Canada Aeroplan",
                  cabin="economy", points_required=35000, cash_price_usd=900, taxes_fees_usd=55,
                  notes="Aeroplan Star Alliance economy — no carrier surcharges on many partners"),
        # ── London ──────────────────────────────────────────────────────────
        AwardCost(destination="London", airline_program="United MileagePlus",
                  cabin="economy", points_required=30000, cash_price_usd=750, taxes_fees_usd=55),
        AwardCost(destination="London", airline_program="British Airways Avios",
                  cabin="economy", points_required=26000, cash_price_usd=750, taxes_fees_usd=350,
                  notes="Low miles but very high BA carrier surcharges — factor in before booking"),
        AwardCost(destination="London", airline_program="Air France/KLM Flying Blue",
                  cabin="economy", points_required=25000, cash_price_usd=750, taxes_fees_usd=120),
        AwardCost(destination="London", airline_program="Virgin Atlantic Flying Club",
                  cabin="economy", points_required=30000, cash_price_usd=750, taxes_fees_usd=45,
                  notes="Virgin Atlantic economy — low surcharges vs BA"),
        AwardCost(destination="London", airline_program="Virgin Atlantic Flying Club",
                  cabin="business", points_required=50000, cash_price_usd=3800, taxes_fees_usd=80,
                  notes="Virgin Atlantic Upper Class — excellent value business product"),
        AwardCost(destination="London", airline_program="Turkish Airlines Miles&Smiles",
                  cabin="economy", points_required=45000, cash_price_usd=750, taxes_fees_usd=40,
                  notes="Star Alliance economy via Turkish — very low fees, great sweet spot"),
        AwardCost(destination="London", airline_program="Turkish Airlines Miles&Smiles",
                  cabin="business", points_required=67500, cash_price_usd=3800, taxes_fees_usd=50,
                  notes="Business via Turkish Miles&Smiles — one of the best CPP sweet spots"),
        AwardCost(destination="London", airline_program="Air Canada Aeroplan",
                  cabin="economy", points_required=30000, cash_price_usd=750, taxes_fees_usd=55,
                  notes="Aeroplan — no surcharges on most Star Alliance partners"),
        AwardCost(destination="London", airline_program="Avianca LifeMiles",
                  cabin="economy", points_required=30000, cash_price_usd=750, taxes_fees_usd=55,
                  notes="LifeMiles Star Alliance economy — competitive rates, watch availability"),
        # ── Dubai ───────────────────────────────────────────────────────────
        AwardCost(destination="Dubai", airline_program="Emirates Skywards",
                  cabin="economy", points_required=57500, cash_price_usd=1000, taxes_fees_usd=40,
                  notes="Emirates Saver economy US→DXB — low fees, excellent product"),
        AwardCost(destination="Dubai", airline_program="Emirates Skywards",
                  cabin="business", points_required=105000, cash_price_usd=6500, taxes_fees_usd=60,
                  notes="Emirates Business Class — lay-flat + onboard bar, world-class product"),
        AwardCost(destination="Dubai", airline_program="Air France/KLM Flying Blue",
                  cabin="economy", points_required=42000, cash_price_usd=1000, taxes_fees_usd=180),
        AwardCost(destination="Dubai", airline_program="British Airways Avios",
                  cabin="economy", points_required=40000, cash_price_usd=1000, taxes_fees_usd=350,
                  notes="High BA carrier surcharges — factor in before booking"),
        AwardCost(destination="Dubai", airline_program="Etihad Guest",
                  cabin="economy", points_required=45000, cash_price_usd=1000, taxes_fees_usd=50,
                  notes="Etihad economy via DXB connection — low fees"),
        # ── Abu Dhabi ────────────────────────────────────────────────────────
        AwardCost(destination="Abu Dhabi", airline_program="Etihad Guest",
                  cabin="economy", points_required=45000, cash_price_usd=1000, taxes_fees_usd=50,
                  notes="Etihad Saver economy to AUH — their home hub, good availability"),
        AwardCost(destination="Abu Dhabi", airline_program="Etihad Guest",
                  cabin="business", points_required=90000, cash_price_usd=6200, taxes_fees_usd=70,
                  notes="Etihad Business Studio — lie-flat, strong product, good CPP"),
        AwardCost(destination="Abu Dhabi", airline_program="Emirates Skywards",
                  cabin="economy", points_required=57500, cash_price_usd=1000, taxes_fees_usd=40,
                  notes="Emirates to nearby DXB then short connection — check direct Etihad first"),
        # ── Doha ────────────────────────────────────────────────────────────
        AwardCost(destination="Doha", airline_program="Qatar Airways Privilege Club",
                  cabin="economy", points_required=50000, cash_price_usd=1050, taxes_fees_usd=80,
                  notes="Qatar Privilege Club economy — check qatarairways.com for Saver space"),
        AwardCost(destination="Doha", airline_program="Qatar Airways Privilege Club",
                  cabin="business", points_required=70000, cash_price_usd=6500, taxes_fees_usd=100,
                  notes="Qatar Qsuites — the world's best business class, limited Saver space"),
        AwardCost(destination="Doha", airline_program="Avianca LifeMiles",
                  cabin="economy", points_required=42000, cash_price_usd=1050, taxes_fees_usd=55,
                  notes="oneworld economy via LifeMiles to DOH — compare Qatar Privilege Club first"),
        # ── Istanbul ─────────────────────────────────────────────────────────
        AwardCost(destination="Istanbul", airline_program="Turkish Airlines Miles&Smiles",
                  cabin="economy", points_required=45000, cash_price_usd=800, taxes_fees_usd=40,
                  notes="Turkish Saver economy US→IST — extremely low fees, great sweet spot"),
        AwardCost(destination="Istanbul", airline_program="Turkish Airlines Miles&Smiles",
                  cabin="business", points_required=67500, cash_price_usd=4200, taxes_fees_usd=50,
                  notes="Turkish Business on own metal — lie-flat, exceptional CPP"),
        AwardCost(destination="Istanbul", airline_program="United MileagePlus",
                  cabin="economy", points_required=30000, cash_price_usd=800, taxes_fees_usd=55,
                  notes="Star Alliance economy via Turkish codeshare"),
        # ── Hong Kong ────────────────────────────────────────────────────────
        AwardCost(destination="Hong Kong", airline_program="Cathay Pacific Asia Miles",
                  cabin="economy", points_required=35000, cash_price_usd=900, taxes_fees_usd=80,
                  notes="Cathay Asia Miles economy US→HKG — own metal, good availability"),
        AwardCost(destination="Hong Kong", airline_program="Cathay Pacific Asia Miles",
                  cabin="business", points_required=70000, cash_price_usd=5500, taxes_fees_usd=100,
                  notes="Cathay Business Class — one of the best in Asia, Amex/Citi transfers"),
        AwardCost(destination="Hong Kong", airline_program="United MileagePlus",
                  cabin="economy", points_required=35000, cash_price_usd=900, taxes_fees_usd=55),
        AwardCost(destination="Hong Kong", airline_program="Air Canada Aeroplan",
                  cabin="economy", points_required=35000, cash_price_usd=900, taxes_fees_usd=55,
                  notes="Aeroplan Star Alliance — no surcharges on many partners"),
        # ── Paris ────────────────────────────────────────────────────────────
        AwardCost(destination="Paris", airline_program="Air France/KLM Flying Blue",
                  cabin="business", points_required=50000, cash_price_usd=3800, taxes_fees_usd=250,
                  notes="Flying Blue promo awards often 20-30% cheaper — check monthly"),
        AwardCost(destination="Paris", airline_program="Air France/KLM Flying Blue",
                  cabin="economy", points_required=30000, cash_price_usd=800, taxes_fees_usd=150),
        AwardCost(destination="Paris", airline_program="British Airways Avios",
                  cabin="economy", points_required=32500, cash_price_usd=800, taxes_fees_usd=300,
                  notes="High carrier surcharges on BA metal"),
        AwardCost(destination="Paris", airline_program="Turkish Airlines Miles&Smiles",
                  cabin="economy", points_required=45000, cash_price_usd=800, taxes_fees_usd=40,
                  notes="Star Alliance economy via Turkish — very low fees"),
        AwardCost(destination="Paris", airline_program="Virgin Atlantic Flying Club",
                  cabin="economy", points_required=30000, cash_price_usd=800, taxes_fees_usd=45),
        # ── Singapore ────────────────────────────────────────────────────────
        AwardCost(destination="Singapore", airline_program="Singapore Airlines KrisFlyer",
                  cabin="economy", points_required=37500, cash_price_usd=1100, taxes_fees_usd=75,
                  notes="KrisFlyer Saver economy — excellent sweet-spot on own metal"),
        AwardCost(destination="Singapore", airline_program="Singapore Airlines KrisFlyer",
                  cabin="business", points_required=75000, cash_price_usd=5500, taxes_fees_usd=100,
                  notes="Singapore Business/Suites — one of the best products in the world"),
        AwardCost(destination="Singapore", airline_program="United MileagePlus",
                  cabin="economy", points_required=35000, cash_price_usd=1100, taxes_fees_usd=55),
        AwardCost(destination="Singapore", airline_program="Air Canada Aeroplan",
                  cabin="economy", points_required=35000, cash_price_usd=1100, taxes_fees_usd=55,
                  notes="Aeroplan — no surcharges on Singapore Airlines"),
        # ── Sydney ────────────────────────────────────────────────────────────
        AwardCost(destination="Sydney", airline_program="United MileagePlus",
                  cabin="economy", points_required=40000, cash_price_usd=1300, taxes_fees_usd=65),
        AwardCost(destination="Sydney", airline_program="Air Canada Aeroplan",
                  cabin="business", points_required=90000, cash_price_usd=6500, taxes_fees_usd=120,
                  notes="Aeroplan business to Australia — excellent value via Air Canada or partner"),
        AwardCost(destination="Sydney", airline_program="Qantas Frequent Flyer",
                  cabin="economy", points_required=41500, cash_price_usd=1300, taxes_fees_usd=100,
                  notes="Qantas Classic Rewards — own metal, good availability on US routes"),
        AwardCost(destination="Sydney", airline_program="Cathay Pacific Asia Miles",
                  cabin="economy", points_required=40000, cash_price_usd=1300, taxes_fees_usd=80,
                  notes="Cathay Asia Miles via HKG connection"),
        # ── Bangkok ──────────────────────────────────────────────────────────
        AwardCost(destination="Bangkok", airline_program="Singapore Airlines KrisFlyer",
                  cabin="economy", points_required=32500, cash_price_usd=900, taxes_fees_usd=60),
        AwardCost(destination="Bangkok", airline_program="United MileagePlus",
                  cabin="economy", points_required=35000, cash_price_usd=900, taxes_fees_usd=65),
        AwardCost(destination="Bangkok", airline_program="Avianca LifeMiles",
                  cabin="economy", points_required=35000, cash_price_usd=900, taxes_fees_usd=55,
                  notes="Star Alliance economy via LifeMiles — low fees"),
        # ── Hawaii ────────────────────────────────────────────────────────────
        AwardCost(destination="Hawaii", airline_program="United MileagePlus",
                  cabin="economy", points_required=25000, cash_price_usd=550, taxes_fees_usd=11,
                  notes="Saver economy mainland to Hawaii"),
        AwardCost(destination="Hawaii", airline_program="Delta SkyMiles",
                  cabin="economy", points_required=28000, cash_price_usd=550, taxes_fees_usd=11),
        # ── Caribbean ─────────────────────────────────────────────────────────
        AwardCost(destination="Caribbean", airline_program="British Airways Avios",
                  cabin="economy", points_required=9000, cash_price_usd=350, taxes_fees_usd=40,
                  notes="Short-haul Avios sweet-spot under 1,151 miles (e.g. MIA-SJU)"),
        AwardCost(destination="Caribbean", airline_program="United MileagePlus",
                  cabin="economy", points_required=12500, cash_price_usd=350, taxes_fees_usd=11),
        # ── Cancun ────────────────────────────────────────────────────────────
        AwardCost(destination="Cancun", airline_program="United MileagePlus",
                  cabin="economy", points_required=15000, cash_price_usd=450, taxes_fees_usd=30,
                  notes="Short-haul to Mexico — great budget option"),
        AwardCost(destination="Cancun", airline_program="Delta SkyMiles",
                  cabin="economy", points_required=18000, cash_price_usd=450, taxes_fees_usd=30),
        AwardCost(destination="Cancun", airline_program="Avianca LifeMiles",
                  cabin="economy", points_required=12500, cash_price_usd=450, taxes_fees_usd=30,
                  notes="LifeMiles Star Alliance economy — often cheapest points option to Mexico"),
        # ── Rome ──────────────────────────────────────────────────────────────
        AwardCost(destination="Rome", airline_program="Air France/KLM Flying Blue",
                  cabin="economy", points_required=30000, cash_price_usd=800, taxes_fees_usd=150),
        AwardCost(destination="Rome", airline_program="British Airways Avios",
                  cabin="economy", points_required=30000, cash_price_usd=800, taxes_fees_usd=300,
                  notes="High BA carrier surcharges on European routes"),
        AwardCost(destination="Rome", airline_program="Turkish Airlines Miles&Smiles",
                  cabin="economy", points_required=45000, cash_price_usd=800, taxes_fees_usd=40,
                  notes="Star Alliance economy via IST — very low fees, great sweet spot"),
        AwardCost(destination="Rome", airline_program="Avianca LifeMiles",
                  cabin="economy", points_required=30000, cash_price_usd=800, taxes_fees_usd=55,
                  notes="LifeMiles Star Alliance economy to FCO"),
    ]

    existing_awards = {
        (a.destination, a.airline_program, a.cabin)
        for a in db.query(AwardCost).all()
    }
    new_awards = [
        a for a in all_awards
        if (a.destination, a.airline_program, a.cabin) not in existing_awards
    ]
    if new_awards:
        db.add_all(new_awards)
        db.commit()
        print(f"Seeded {len(new_awards)} new award costs")


def seed_database():
    """Sync card data from card_data.json into the database on startup."""
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    db = SessionLocal()
    try:
        result = sync_from_file(db)
        print(
            f"Card sync complete: {result['issuers']} issuers, "
            f"{result['cards']} cards, {result['rules']} rules"
        )
        seed_concierge_data(db)
    except Exception as e:
        db.rollback()
        print(f"Card sync error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
