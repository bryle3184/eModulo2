# Deployment Fix: 405 Method Not Allowed Error

## Problem Identified
The error "405 Method Not Allowed" means:
- The request is reaching Vercel's infrastructure
- But it's NOT being routed to your Express app
- The rewrite rule isn't working correctly for POST requests

## Root Cause
The Vercel configuration was pointing to `/server/vercel.ts` which doesn't exist in the built output. We need to use a **Vercel function** instead.

## Files Created/Modified

### 1. `/api/server.ts` (Created) ✅
This is a Vercel serverless function that handles all API requests.

### 2. `/vercel.json` (Updated) ✅
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/client",
  "framework": "vite",
  "functions": {
    "api/server.ts": {
      "runtime": "vercel:node"
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/server" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## How It Works Now

1. **GET requests to any path** → Served from `dist/client/` (SPA)
2. **POST/PUT/DELETE requests to `/api/*`** → Handled by `api/server.ts` (Express)
3. **Database migrations** → Run in background (non-blocking)

## Deployment Steps

### Step 1: Login and Deploy
```bash
npx vercel login
npx vercel --prod
```

### Step 2: Verify Environment Variables
Make sure these are set in Vercel Dashboard:
- `DATABASE_URL`
- `PGHOST`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `NODE_ENV=production`

### Step 3: Test After Deployment
```bash
# Test health endpoint (should return 200)
curl https://your-domain.vercel.app/api/health

# Test registration (should return 201 or 409)
curl -X POST https://your-domain.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","confirmPassword":"TestPass123"}'

# Test login (should return 200 with user data)
curl -X POST https://your-domain.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor@emodulo.edu","password":"Emodulo2025!"}'
```

## If You Still Get Errors

### Check Vercel Logs
```bash
npx vercel logs
```

Look for:
- Database connection errors
- Missing environment variables
- Migration failures

### Common Fixes

1. **If database connection fails:**
   - Verify Neon database is active (not suspended)
   - Check that all PostgreSQL env vars are set correctly
   - Test connection locally with `psql DATABASE_URL`

2. **If you see CORS errors:**
   - Make sure you're accessing the site over HTTPS
   - Check browser console for detailed CORS message

3. **If migrations failed:**
   - Manually run migrations:
     ```bash
     npx vercel env pull .env.local
     npx tsx server/index.ts
     ```

## What Was Changed

✅ Created `api/server.ts` - Vercel serverless function
✅ Updated `vercel.json` - Proper function configuration
✅ Removed `server/vercel.ts` - No longer needed
✅ All TypeScript checks pass

## What Stays the Same

- ✅ Frontend React app unchanged
- ✅ Database schema unchanged
- ✅ All API endpoints work the same
- ✅ Session authentication preserved
- ✅ Neon PostgreSQL integration preserved
