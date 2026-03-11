#!/bin/bash
# Simple script to run the backend server

echo "Starting Credit Card Rewards Optimizer Backend..."
echo "API will be available at http://localhost:8000"
echo "API docs: http://localhost:8000/docs"
echo ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
