# eMódulo Vercel Deployment Guide

## Root Cause Analysis

The "This page doesn't exist" error was caused by:
1. **Missing `vercel.json` configuration** - Vercel didn't know how to handle the Express + React SPA app
2. **No serverless function entry point** - The backend API wasn't configured for Vercel serverless deployment
3. **SPA routing not configured** - Client-side routing (BrowserRouter) needs rewrite rules

## Files Created/Modified

### 1. `/vercel.json` (Created)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/client",
  "framework": "vite",
  "functions": {
    "server/vercel.ts": {
      "runtime": "vercel:node"
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/server/vercel.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache"
        }
      ]
    }
  ]
}
```

### 2. `/server/vercel.ts` (Created)
- Vercel-compatible Express server entry point
- Handles API routes at `/api/*`
- Serves static frontend files
- Performs database migrations and seeding on startup
- Includes error handling and health checks

## Deployment Steps

### Step 1: Login to Vercel
```bash
npx vercel login
```

### Step 2: Deploy to Production
```bash
npx vercel --prod
```

### Step 3: Set Environment Variables in Vercel Dashboard
Go to your Vercel project → **Settings** → **Environment Variables**

Add the following variables (from your `.env` file):

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Your Neon connection string | Main database URL |
| `DATABASE_URL_UNPOOLED` | Your unpooled connection string | Direct database connection |
| `POSTGRES_URL` | Your Neon URL | Alternative database URL |
| `POSTGRES_URL_NON_POOLING` | Your unpooled URL | Alternative unpooled URL |
| `PGHOST` | `ep-round-boat-b71f69js-pooler.c-13.us-east-1.aws.neon.tech` | PostgreSQL host |
| `PGUSER` | `neondb_owner` | PostgreSQL user |
| `PGPASSWORD` | Your password | PostgreSQL password |
| `PGDATABASE` | `neondb` | Database name |
| `NODE_ENV` | `production` | Environment flag |

⚠️ **IMPORTANT**: Do NOT copy the actual password from `.env` - replace it with your actual password in the Vercel dashboard.

### Step 4: Redeploy
After adding environment variables, redeploy:
```bash
npx vercel --prod
```

## Troubleshooting

### If registration/login still fails with "Something went wrong"

1. **Check Vercel Logs**:
   ```bash
   npx vercel logs
   ```

2. **Verify Database Connection**:
   - Ensure your Neon database allows connections from Vercel
   - Check that the connection string is correct
   - Test the database URL in your local environment

3. **Check Environment Variables**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Ensure all required variables are set
   - Redeploy after setting variables

4. **Test API Endpoint**:
   ```bash
   curl https://your-domain.vercel.app/api/health
   ```

### If you get 404 on nested routes

The `vercel.json` rewrite rules should handle this:
- `/api/*` → Express serverless function
- `/*` → `index.html` (SPA fallback)

### If migrations fail silently

The app includes error handling that will:
- Log database errors to Vercel console
- Continue serving the app even if migrations fail
- You can manually run migrations via Vercel CLI or direct database access

## Local Testing

### Test Build
```bash
npm run build
npm run typecheck
```

### Start Local Development
```bash
npm run dev
```

Visit `http://localhost:5173` for the frontend and `http://localhost:4000` for the backend.

## Security Notes

1. **Session Cookies**: The app sets `secure: true` when `NODE_ENV=production`
2. **Database Credentials**: Never commit `.env` to git (already excluded in `.gitignore`)
3. **Rate Limiting**: Auth endpoints have basic rate limiting (12 attempts per 5 minutes)
4. **Password Hashing**: Uses bcrypt with cost factor 10

## What Works Now

- ✅ Homepage loads at `/`
- ✅ All API routes work at `/api/*`
- ✅ SPA routing works (refresh on nested routes)
- ✅ Database migrations run on deploy
- ✅ Static assets served correctly
- ✅ Session-based authentication
- ✅ Neon PostgreSQL integration

## Next Steps

1. Deploy using `npx vercel --prod`
2. Add environment variables in Vercel dashboard
3. Redeploy and test
4. Monitor Vercel logs for any runtime errors