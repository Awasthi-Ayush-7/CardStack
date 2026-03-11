"""
Vercel Python serverless entry point.
Imports the FastAPI app so Vercel can serve it.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.app.main import app
