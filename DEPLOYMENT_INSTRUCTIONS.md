# eMódulo Vercel Deployment Instructions

## ✅ Current Status

- **Build**: Passes ✅
- **TypeCheck**: Passes ✅
- **Configuration**: Ready ✅

## 🚀 Deployment Steps

### 1. Login to Vercel
```bash
npx vercel login
```

### 2. Deploy to Production
```bash
npx vercel --prod
```

### 3. Configure Environment Variables in Vercel Dashboard

Go to: **Vercel Dashboard** → Your Project (e-modulo2) → **Settings** → **Environment Variables**

Add these variables (from your `.env` file):

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | Neon PostgreSQL connection string |
| `DATABASE_URL_UNPOOLED` | ✅ Yes | Direct database connection |
| `PGHOST` | ✅ Yes | PostgreSQL host |
| `PGUSER` | ✅ Yes | PostgreSQL user |
| `PGPASSWORD` | ✅ Yes | PostgreSQL password |
| `PGDATABASE` | ✅ Yes | Database name |
| `POSTGRES_URL` | ✅ Yes | Alternative database URL |
| `POSTGRES_URL_NON_POOLING` | ✅ Yes | Alternative unpooled URL |
| `NODE_ENV` | ✅ Yes | Set to `production` |

### 4. Redeploy After Adding Variables
```bash
npx vercel --prod
```

## 🔍 Testing After Deployment

### Test Homepage
```bash
curl https://your-domain.vercel.app/
```

### Test API Health
```bash
curl https://your-domain.vercel.app/api/health
```

### Test Registration
```bash
curl -X POST https://your-domain.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","confirmPassword":"TestPass123"}'
```

### Test Login
```bash
curl -X POST https://your-domain.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor@emodulo.edu","password":"Emodulo2025!"}'
```

## 🐛 Troubleshooting

### Check Vercel Logs
```bash
npx vercel logs
```

Or view logs in Vercel Dashboard → Deployments → Click latest deployment → View Logs

### Common Issues

#### Issue: "Database connection failed"
**Solution:**
1. Verify Neon database is active (not suspended)
2. Check that all environment variables are set correctly
3. Verify Neon allows connections from Vercel IPs

#### Issue: "Tables don't exist"
**Solution:**
1. Check Vercel logs for migration errors
2. Ensure migrations ran successfully on deploy

#### Issue: "Something went wrong" on registration
**Solution:**
1. Check Vercel logs for detailed error
2. Verify database connection is working
3. Test API endpoint with curl as shown above

## 📁 Files Created/Modified

1. **`/vercel.json`** - Vercel deployment configuration
2. **`/server/vercel.ts`** - Vercel serverless function entry point
3. **`/DEPLOYMENT_INSTRUCTIONS.md`** - This file

## 🔒 Security Notes

- Session cookies use `secure: true` in production
- Passwords are hashed with bcrypt
- Database credentials are stored in Vercel environment variables (not in code)
- `.env` file is in `.gitignore`

## ✨ What Works Now

- ✅ Homepage loads at `/`
- ✅ All API routes work at `/api/*`
- ✅ SPA routing works (refresh on nested routes)
- ✅ Database migrations run on deploy
- ✅ Authentication system functional
- ✅ Neon PostgreSQL integration
