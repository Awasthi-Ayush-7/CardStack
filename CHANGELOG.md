# Changelog

## Production-Ready Updates

### Authentication
- ✅ JWT-based authentication middleware
- ✅ Support for Auth0, Clerk, Firebase Auth, and custom JWT providers
- ✅ User model with per-user data separation
- ✅ Protected API routes requiring authentication
- ✅ Frontend auth context and login flow

### Data Model Enhancements
- ✅ Added `User` model for authentication
- ✅ Added `CardIssuer` model for issuer hierarchy
- ✅ Updated `CreditCard` to use `issuer_id` instead of string issuer
- ✅ Updated `UserCard` to include `user_id` for per-user ownership
- ✅ All reward rules remain backend-driven

### API Enhancements
- ✅ `GET /auth/me` - Get current user profile
- ✅ `GET /issuers` - Get all card issuers
- ✅ `GET /issuers/{id}/cards` - Get cards for a specific issuer
- ✅ All user routes now require authentication
- ✅ Recommendations filtered by authenticated user's cards

### Frontend Updates
- ✅ Issuer → Card selection flow
- ✅ Authentication context and login component
- ✅ Protected routes requiring authentication
- ✅ Updated API service with JWT token support
- ✅ GitHub Pages deployment ready

### Deployment
- ✅ GitHub Pages deployment guide
- ✅ Environment variable configuration
- ✅ CORS configuration for production
- ✅ Build scripts for static deployment

## Migration Notes

### Database Migration
The database schema has changed. For existing databases:
1. Delete `credit_cards.db` to start fresh, OR
2. Run migration script (to be created) to migrate existing data

### Authentication Setup
1. Choose an auth provider (Auth0, Clerk, or Firebase)
2. Configure JWT validation in backend via environment variables
3. Update frontend Login component with provider SDK
4. Set `ALLOW_UNAUTHENTICATED=false` in production

### API Changes
- All `/user/cards` endpoints now require authentication
- `/recommendations` endpoint now requires authentication
- New `/issuers` endpoints available
- `/cards` endpoint still available but issuer flow is preferred
