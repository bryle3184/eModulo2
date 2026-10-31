# Troubleshooting Guide

## If Registration/Login Still Fails After Deployment

### Step 1: Check Vercel Logs
```bash
# View deployment logs
npx vercel logs

# Or check specific deployment
npx vercel logs <deployment-url>
```

### Step 2: Test API Endpoints
```bash
# Test health endpoint
curl https://your-domain.vercel.app/api/health

# Test registration
curl -X POST https://your-domain.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","confirmPassword":"TestPass123"}' \
  -v
```

### Step 3: Common Issues and Fixes

#### Issue 1: Database Connection Failed
**Symptoms:** No response or timeout on API calls
**Fix:**
1. Verify Neon database is not suspended
2. Check that IP whitelist allows Vercel IPs
3. Test connection string locally: `psql DATABASE_URL`

#### Issue 2: Tables Don't Exist
**Symptoms:** "Something went wrong" but no database errors
**Fix:**
1. Check Vercel logs for migration errors
2. Manually run migrations via Vercel CLI:
   ```bash
   npx vercel env pull .env.production.local
   npx tsx server/index.ts
   ```

#### Issue 3: CORS or Network Errors
**Symptoms:** Network errors in browser console
**Fix:**
1. Check browser DevTools → Network tab
2. Verify API requests are going to correct domain
3. Check if requests are being blocked by browser

#### Issue 4: Session Cookie Issues
**Symptoms:** Login succeeds but user appears logged out
**Fix:**
1. Clear browser cookies
2. Ensure you're accessing site over HTTPS
3. Check cookie settings in browser

### Step 4: Enable Verbose Logging

Add this to your Vercel environment variables:
- `NODE_ENV=production`
- `DEBUG=emodulo*`

Then check logs after an error occurs.

### Step 5: Test Database Access Locally

```bash
# Pull environment variables
npx vercel env pull .env.local

# Test database connection
node -e "
import('dotenv/config');
import('./dist/server/db.js').then(({ db }) => {
  db.prepare('SELECT 1').get()
    .then(r => console.log('DB OK:', r))
    .catch(e => console.error('DB ERROR:', e));
});
"
```

## Quick Checklist

- [ ] All environment variables added to Vercel
- [ ] Redeployed after adding variables
- [ ] Checked Vercel logs for errors
- [ ] Tested API endpoints with curl
- [ ] Verified Neon database is active
- [ ] Checked browser console for errors
- [ ] Cleared browser cache/cookies
