# Environment Configuration Guide

## Overview

The backend automatically switches between **production** (Supabase Cloud) and **local** (Docker) databases based on the `PROD_DB` environment variable.

## Quick Setup

The `.env` file has already been created for you with the values from `client/.env.local`.

### Switch Between Environments

**Use Local Database (Docker):**

```bash
# In backend/.env
PROD_DB=false
```

**Use Production Database (Supabase Cloud):**

```bash
# In backend/.env
PROD_DB=true
```

## How It Works

The backend automatically selects the correct Supabase credentials:

```typescript
// backend/src/config/env.ts
const isProd = process.env.PROD_DB === "true";

// If PROD_DB=true, uses:
// - PROD_SUPABASE_URL
// - PROD_SUPABASE_ANON_KEY
// - PROD_SUPABASE_SERVICE_ROLE_KEY

// If PROD_DB=false, uses:
// - LOCAL_SUPABASE_URL
// - LOCAL_SUPABASE_ANON_KEY
// - LOCAL_SUPABASE_SERVICE_ROLE_KEY
```

## Environment Variables

### Production (Supabase Cloud)

```env
PROD_SUPABASE_URL=https://tabcxfaqqkfbchbxgogl.supabase.co
PROD_SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
PROD_SUPABASE_ANON_KEY=eyJhbGci...
PROD_DATABASE_URL=postgresql://postgres:...
```

### Local (Docker)

```env
LOCAL_SUPABASE_URL=http://127.0.0.1:54321
LOCAL_SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
LOCAL_SUPABASE_ANON_KEY=eyJhbGci...
LOCAL_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## Verification

When you start the backend, you'll see a log message indicating which database is being used:

```bash
🔧 Backend using LOCAL database
📍 Supabase URL: http://127.0.0.1:54321
```

or

```bash
🔧 Backend using PRODUCTION database
📍 Supabase URL: https://tabcxfaqqkfbchbxgogl.supabase.co
```

## Testing

### Test with Local Database

```bash
# Set PROD_DB=false in .env
cd backend
npm run dev

# In another terminal
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/shows?org_id=YOUR_ORG_ID"
```

### Test with Production Database

```bash
# Set PROD_DB=true in .env
cd backend
npm run dev

# Use the same curl command
```

## Frontend Sync

The frontend (`client/.env.local`) uses the same environment switching mechanism with `NEXT_PUBLIC_PROD_DB`.

To keep them in sync:

- Set `PROD_DB=false` in `backend/.env`
- Set `NEXT_PUBLIC_PROD_DB=false` in `client/.env.local`

## Troubleshooting

### Issue: "Missing required environment variable: SUPABASE_URL"

**Solution:** Make sure you have either:

- `PROD_SUPABASE_URL` (if `PROD_DB=true`)
- `LOCAL_SUPABASE_URL` (if `PROD_DB=false`)

### Issue: Backend connects to wrong database

**Solution:** Check the `PROD_DB` value in `.env`:

```bash
cat backend/.env | grep PROD_DB
```

### Issue: CORS errors

**Solution:** If deploying backend separately, update `CORS_ORIGIN` in `.env`:

```env
CORS_ORIGIN=https://your-frontend-domain.com
```

## Security Notes

⚠️ **Never commit `.env` to version control!**

The `.env.example` file is safe to commit (has placeholder values).
The `.env` file contains real credentials and should be in `.gitignore`.

## CI/CD

For CI/CD pipelines, set environment variables in your deployment platform:

**Vercel/Netlify:**

- Add `PROD_DB=true`
- Add `PROD_SUPABASE_URL=...`
- Add `PROD_SUPABASE_SERVICE_ROLE_KEY=...`
- etc.

**Docker:**

```dockerfile
ENV PROD_DB=true
ENV PROD_SUPABASE_URL=https://...
```

## Additional Resources

- [Backend README](./README.md)
- [Quick Start Guide](../QUICK_START.md)
- [Migration Guide](../MIGRATION_GUIDE.md)
