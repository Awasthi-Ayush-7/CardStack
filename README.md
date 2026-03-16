# CardStack

A full-stack credit card rewards optimizer that helps you maximize points, find the best card for any purchase, and intelligently redeem miles for award travel.

## Features

- **My Cards** — Manage your credit card portfolio with card art, point balances, and annual fees
- **Best Card Finder** — Get the highest-earning card recommendation for any spending category with real-time reward resolution
- **Portfolio Optimizer** — Analyze your full card stack for coverage gaps and ROI across all spending categories
- **Redemption Concierge** — AI-powered award travel advisor:
  - Enter departure city, destination, travel month, and cabin class
  - Fetches live cash fares from Google Flights (via SerpAPI) for accurate cents-per-point calculation
  - Finds all transfer paths from your flexible points (Chase UR, Amex MR, Capital One Miles, Citi TY) to airline programs
  - Gemini AI explains which airlines fly the route, which alliance each belongs to, and which award program to use for each carrier
  - Deep-links directly to each airline program's award search page
  - Step-by-step booking instructions with honest availability warnings

## Tech Stack

### Backend
- **Python 3.9+**
- **FastAPI** — async web framework
- **SQLAlchemy** — ORM (SQLite for dev, PostgreSQL for prod)
- **Pydantic v2** — data validation
- **Google Gemini** (`gemini-2.5-flash-lite`) — free-tier AI reasoning
- **SerpAPI** — Google Flights live fare data (250 free searches/month)
- **AviationStack** — IATA airport code lookup (500 free requests/month)

### Frontend
- **React 18** + **TypeScript**
- **React Router v6**
- **CRA / react-scripts 5**

## Project Structure

```
cardstack/
├── backend/
│   ├── app/
│   │   ├── main.py                       # FastAPI entry point, route registration
│   │   ├── config.py                     # All settings loaded from environment
│   │   ├── models.py                     # SQLAlchemy models
│   │   ├── schemas.py                    # Pydantic v2 schemas
│   │   ├── seed_data.py                  # DB seeding + lightweight migrations
│   │   ├── auth.py                       # JWT auth helpers
│   │   ├── routes/
│   │   │   ├── cards.py
│   │   │   ├── recommendations.py
│   │   │   ├── user_cards.py
│   │   │   └── concierge.py              # Redemption Concierge endpoints
│   │   └── services/
│   │       ├── reward_service.py         # Reward resolution engine
│   │       ├── concierge_service.py      # Transfer path finder + Gemini AI
│   │       ├── serpapi_service.py        # Live Google Flights prices
│   │       └── aviationstack_service.py  # IATA code lookup
│   ├── tests/
│   │   └── test_concierge.py
│   ├── .env.example                      # Copy to .env and fill in keys
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MyCards.tsx
│   │   │   ├── BestCardFinder.tsx
│   │   │   ├── PortfolioOptimizer.tsx
│   │   │   └── RedemptionConcierge.tsx
│   │   ├── services/api.ts
│   │   ├── types.ts
│   │   └── App.tsx
│   └── package.json
└── README.md
```

## Setup

### Prerequisites
- Python 3.9+
- Node.js 16+ and npm

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy the example env file and add your API keys:

```bash
cp .env.example .env
```

| Variable | Purpose | Free tier |
|---|---|---|
| `GEMINI_API_KEY` | AI analysis (required for full Concierge) | [aistudio.google.com](https://aistudio.google.com/app/apikey) — free |
| `SERPAPI_API_KEY` | Live Google Flights prices | [serpapi.com](https://serpapi.com) — 250/month free |
| `AVIATIONSTACK_API_KEY` | IATA airport code lookup | [aviationstack.com](https://aviationstack.com) — 500/month free |
| `JWT_SECRET` | Auth token signing | Set to any long random string |

Start the server:

```bash
uvicorn app.main:app --reload
```

API available at `http://localhost:8000` · Docs at `/docs`

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

App available at `http://localhost:3000`

## API Reference

### Concierge
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/concierge/search` | Find transfer paths + AI analysis |
| `GET` | `/api/concierge/partners` | List all active transfer partners |
| `PUT` | `/api/user/cards/{id}/balance` | Update stored point balance |

### Cards & Recommendations
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/cards` | All supported credit cards |
| `POST` | `/api/user/cards` | Add card to portfolio |
| `DELETE` | `/api/user/cards/{id}` | Remove card from portfolio |
| `GET` | `/api/recommendations?category=Dining` | Best card for a spending category |
| `POST` | `/api/recommendations/portfolio` | Full portfolio analysis |

## How the Concierge Works

1. **Inventory** — Aggregates your point balances by flexible currency (Chase UR, Amex MR, etc.)
2. **Transfer paths** — Matches each currency to airline programs via the transfer partner database (35 partners across 4 currencies)
3. **Live pricing** — Fetches the cheapest one-way cash fare from Google Flights via SerpAPI; falls back to seeded estimates if unavailable
4. **CPP calculation** — `(cash_fare − taxes) / points_needed × 100` — higher is better; > 2¢ is excellent
5. **AI analysis** — Gemini receives your balances, all paths, and live flight data; returns:
   - Which airlines operate the specific route and which award program books each one
   - Best redemption recommendation with honest Saver-rate caveats
   - Award seat availability patterns and advance booking tips
   - Step-by-step transfer and booking instructions

> **Note:** Points shown are published Saver award rates — the minimum if space is available. Always verify availability on the airline's site before transferring points, as transfers are irreversible.

## Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

## License

MIT
