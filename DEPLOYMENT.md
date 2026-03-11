# Deployment Guide

## Backend Deployment

The backend (FastAPI) should be deployed to a hosting service that supports Python applications:
- **Heroku**: Easy deployment with `Procfile`
- **Railway**: Simple Python app deployment
- **Render**: Free tier available
- **AWS/GCP/Azure**: For production scale

### Environment Variables

Set these environment variables in your hosting platform:

```bash
# JWT Configuration (choose one method)
# For Auth0:
JWKS_URL=https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json
JWT_AUDIENCE=your-api-identifier
JWT_ISSUER=https://YOUR_DOMAIN.auth0.com/

# For Clerk:
JWKS_URL=https://YOUR_DOMAIN.clerk.accounts.dev/.well-known/jwks.json
JWT_AUDIENCE=your-audience
JWT_ISSUER=https://YOUR_DOMAIN.clerk.accounts.dev

# For Firebase or custom (symmetric key):
JWT_SECRET=your-secret-key
JWT_AUDIENCE=your-audience
JWT_ISSUER=your-issuer

# Development mode (disable for production):
ALLOW_UNAUTHENTICATED=false
```

### Database

For production, upgrade from SQLite to PostgreSQL:
1. Update `backend/app/database.py`:
   ```python
   SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./credit_cards.db")
   ```
2. Set `DATABASE_URL` environment variable to your Postgres connection string

## Frontend Deployment (GitHub Pages)

### Prerequisites
- GitHub repository
- Node.js installed locally

### Steps

1. **Build the frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Install gh-pages package:**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Update package.json:**
   Add homepage and deploy script:
   ```json
   {
     "homepage": "https://YOUR_USERNAME.github.io/credit-card-rewards-optimizer",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d build"
     }
   }
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

5. **Configure GitHub Pages:**
   - Go to repository Settings → Pages
   - Select source: `gh-pages` branch
   - Save

### Environment Variables for GitHub Pages

Since GitHub Pages serves static files, you need to set environment variables at build time:

1. **Create `.env.production` file:**
   ```bash
   REACT_APP_API_URL=https://your-backend-api.com
   ```

2. **Build with production env:**
   ```bash
   npm run build
   ```

   Or use GitHub Actions to build automatically (see below).

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm install
      
      - name: Build
        run: |
          cd frontend
          npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
      
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend/build
```

## CORS Configuration

Update `backend/app/main.py` to allow your GitHub Pages domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://YOUR_USERNAME.github.io",  # Add your GitHub Pages URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Authentication Setup

### Option 1: Auth0

1. Create Auth0 account and application
2. Configure callback URLs:
   - Development: `http://localhost:3000`
   - Production: `https://YOUR_USERNAME.github.io/credit-card-rewards-optimizer`
3. Set environment variables in backend
4. Integrate Auth0 SDK in frontend (replace Login component)

### Option 2: Clerk

1. Create Clerk account and application
2. Configure allowed origins
3. Set environment variables in backend
4. Integrate Clerk SDK in frontend

### Option 3: Firebase Auth

1. Create Firebase project
2. Enable Authentication
3. Set JWT_SECRET in backend
4. Integrate Firebase SDK in frontend

## Testing Deployment

1. **Backend:**
   - Test API endpoints: `https://your-api.com/docs`
   - Verify CORS allows your frontend domain
   - Test authentication flow

2. **Frontend:**
   - Visit GitHub Pages URL
   - Verify API calls work
   - Test authentication
   - Test all features

## Troubleshooting

### CORS Errors
- Verify backend CORS includes your frontend domain
- Check that credentials are allowed

### Authentication Issues
- Verify JWT configuration matches your auth provider
- Check token is being sent in Authorization header
- Verify token format and claims

### Build Issues
- Ensure all environment variables are set
- Check that API URL is correct
- Verify build completes without errors
