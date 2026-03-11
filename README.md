# Credit Card Rewards Optimizer

A production-ready MVP web application that recommends the best credit card for a spending category based on current reward structures.

## Features

- **Card Management**: Add and remove credit cards from your collection
- **Smart Recommendations**: Get the best card recommendation for any spending category (Dining, Travel, Groceries, Movies, General)
- **Reward Resolution Engine**: Automatically resolves conflicts and finds the highest multiplier based on active reward rules
- **Clean Architecture**: Well-separated backend (FastAPI) and frontend (React + TypeScript)

## Tech Stack

### Backend
- **Python 3.8+**
- **FastAPI** - Modern, fast web framework
- **SQLAlchemy** - ORM for database operations
- **SQLite** - Database (easily upgradeable to Postgres)
- **Pydantic** - Data validation

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **React Scripts** - Build tooling

## Project Structure

```
credit-card-rewards-optimizer/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── database.py          # Database configuration
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── seed_data.py         # Database seeding script
│   │   ├── routes/              # API route handlers
│   │   │   ├── cards.py
│   │   │   ├── categories.py
│   │   │   ├── recommendations.py
│   │   │   └── user_cards.py
│   │   └── services/            # Business logic
│   │       └── reward_service.py  # Reward resolution engine
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MyCards.tsx
│   │   │   └── BestCardFinder.tsx
│   │   ├── services/
│   │   │   └── api.ts           # API client
│   │   ├── types.ts             # TypeScript type definitions
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- Node.js 16+ and npm
- (Optional) Virtual environment tool (venv, virtualenv, etc.)

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the backend server:**
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at `http://localhost:8000`
   - API docs: `http://localhost:8000/docs`
   - Alternative docs: `http://localhost:8000/redoc`

   **Note:** The database (`credit_cards.db`) will be created automatically on first run, and seed data will be loaded.

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

   The frontend will be available at `http://localhost:3000`

   **Note:** The frontend is configured to connect to `http://localhost:8000` by default. To change this, set the `REACT_APP_API_URL` environment variable.

## API Endpoints

### Cards
- `GET /cards` - Get all supported credit cards
- `POST /user/cards` - Add a card to user's collection (body: `{"credit_card_id": 1}`)
- `DELETE /user/cards/{id}` - Remove a card from user's collection

### Categories
- `GET /categories` - Get all reward categories

### Recommendations
- `GET /recommendations?category=Dining` - Get best card recommendations for a category

## Database Schema

### CreditCard
- `id` (Integer, Primary Key)
- `name` (String, Unique)
- `issuer` (String)
- `network` (String)

### RewardCategory
- `id` (Integer, Primary Key)
- `name` (String, Unique)

### RewardRule
- `id` (Integer, Primary Key)
- `credit_card_id` (Integer, Foreign Key)
- `category_id` (Integer, Foreign Key)
- `multiplier` (Float) - e.g., 1.5, 3, 5
- `cap_amount` (Float, Nullable) - Optional spending cap
- `cap_period` (Enum, Nullable) - monthly, quarterly, yearly, or null
- `is_rotating` (Boolean) - True for rotating category cards
- `start_date` (Date) - When rule becomes active
- `end_date` (Date, Nullable) - When rule expires
- `notes` (String, Nullable) - Additional context

### UserCard
- `id` (Integer, Primary Key)
- `credit_card_id` (Integer, Foreign Key)

## Reward Resolution Logic

The reward resolution engine (`services/reward_service.py`) implements the following business logic:

1. **Fetches all user-added cards**
2. **Filters active reward rules** - Only includes rules where current date is within `start_date` and `end_date` (if specified)
3. **Resolves conflicts** - Highest multiplier wins for each card
4. **Returns sorted list** - Recommendations sorted by multiplier (descending)

## Seed Data

The application includes seed data for:
- **Chase Freedom Unlimited** - 1.5% general, 3% dining
- **Chase Freedom Flex** - 1% general, 3% dining, 5% rotating categories
- **Amex Gold** - 4x dining, 4x groceries (up to $25k/year)
- **Capital One Venture** - 2x on all purchases

Categories: Dining, Travel, Groceries, Movies, General

## Development Notes

- **No Authentication**: This is an MVP with single-user support (no auth required)
- **No Card Numbers**: Only card types/names are stored
- **Database**: SQLite for MVP, easily upgradeable to Postgres by changing the connection string in `database.py`
- **CORS**: Configured to allow requests from `http://localhost:3000`

## Future Enhancements

- User authentication and multi-user support
- Historical reward rule tracking
- Spending cap tracking and alerts
- More sophisticated recommendation algorithms
- Export/import functionality
- Mobile app

## License

This project is provided as-is for demonstration purposes.
