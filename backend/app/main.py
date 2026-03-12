"""
FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base
from .routes import cards, categories, recommendations, user_cards, auth, issuers, admin, suggestions
from .seed_data import seed_database

# Create database tables
Base.metadata.create_all(bind=engine)

# Seed database on startup
seed_database()

# Create FastAPI app
app = FastAPI(
    title="CardStack",
    description="MVP for recommending the best credit card based on spending categories",
    version="1.0.0"
)

# CORS middleware for frontend
origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers — all mounted under /api so Vercel can route them correctly
app.include_router(auth.router, prefix="/api")
app.include_router(issuers.router, prefix="/api")
app.include_router(cards.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(user_cards.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(suggestions.router, prefix="/api")


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "CardStack API",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "healthy"}
