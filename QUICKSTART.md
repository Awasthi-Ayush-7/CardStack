# Quick Start Guide

## Prerequisites

- **Python 3.8+** installed
- **Node.js 16+** and **npm** installed

> **Note:** If you had a previous version with JWT auth, delete `backend/credit_cards.db` before starting—the User schema has changed to email/password.

## Step 1: Backend Setup

### 1.1 Install Dependencies

```bash
cd backend

# Create virtual environment (recommended)
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install Python packages
pip install -r requirements.txt
```

### 1.2 Configure Authentication (Development Mode)

For **local development without auth setup**, set this environment variable:

```bash
# macOS/Linux:
export ALLOW_UNAUTHENTICATED=true

# Windows (PowerShell):
$env:ALLOW_UNAUTHENTICATED="true"

# Windows (CMD):
set ALLOW_UNAUTHENTICATED=true
```

**Note:** This allows the app to run without JWT tokens. For production, you'll need to configure a real auth provider.

### 1.3 Start Backend Server

```bash
# Make sure you're in the backend directory and venv is activated
uvicorn app.main:app --reload
```

The backend will start at `http://localhost:8000`
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

The database (`credit_cards.db`) will be created automatically with seed data on first run.

## Step 2: Frontend Setup

### 2.1 Install Dependencies

Open a **new terminal window** (keep backend running):

```bash
cd frontend
npm install
```

### 2.2 Configure API URL (Optional)

Create `.env` file in the `frontend` directory (optional - defaults to `http://localhost:8000`):

```bash
REACT_APP_API_URL=http://localhost:8000
```

### 2.3 Start Frontend

```bash
npm start
```

The frontend will open at `http://localhost:3000`

## Step 3: Using the Application

### Development Mode (No Auth Setup)

Since we set `ALLOW_UNAUTHENTICATED=true`, you can:

1. **Open the app** at `http://localhost:3000`
2. **Login screen will appear** - Enter any token (e.g., `dev_token`) or leave empty
3. The app will work with a default dev user

### With Real Authentication

If you want to use real JWT authentication:

1. **Set up an auth provider** (Auth0, Clerk, or Firebase)
2. **Configure backend environment variables:**
   ```bash
   export JWKS_URL=https://your-domain.auth0.com/.well-known/jwks.json
   export JWT_AUDIENCE=your-audience
   export JWT_ISSUER=https://your-domain.auth0.com/
   export ALLOW_UNAUTHENTICATED=false
   ```
3. **Integrate auth provider SDK** in frontend (replace `Login.tsx`)

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

**Database errors:**
- Delete `backend/credit_cards.db` and restart - it will be recreated

**Import errors:**
- Make sure virtual environment is activated
- Reinstall: `pip install -r requirements.txt`

### Frontend Issues

**Port 3000 already in use:**
- React will automatically try port 3001, 3002, etc.

**API connection errors:**
- Verify backend is running on `http://localhost:8000`
- Check browser console for CORS errors
- Verify `REACT_APP_API_URL` in `.env` file

**Authentication errors:**
- If using dev mode, make sure `ALLOW_UNAUTHENTICATED=true` is set
- Check browser console for token errors

## Quick Test

1. Backend running? → Visit http://localhost:8000/docs
2. Frontend running? → Visit http://localhost:3000
3. Can login? → Enter any token in dev mode
4. Can add cards? → Select issuer → Select card → Add
5. Can get recommendations? → Select category → Find Best Card

## Next Steps

- See `DEPLOYMENT.md` for production deployment
- See `README.md` for full documentation
- See `CHANGELOG.md` for what's new
