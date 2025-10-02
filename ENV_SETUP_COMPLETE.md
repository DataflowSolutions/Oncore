# Environment Setup - Complete! ✅

## What Was Added

### 1. **Backend `.env` File**

Created `backend/.env` with your actual Supabase credentials from `client/.env.local`:

- ✅ Production Supabase URL and keys
- ✅ Local Docker Supabase URL and keys
- ✅ Automatic environment switching
- ✅ Ready to use immediately

### 2. **Updated Environment Config**

Enhanced `backend/src/config/env.ts` to support:

- ✅ Automatic switching between production/local
- ✅ Reads `PROD_DB` flag
- ✅ Selects correct Supabase credentials
- ✅ Logs which environment is active

### 3. **Updated `.env.example`**

Updated template to match your project structure:

- ✅ Production variables (PROD\_\*)
- ✅ Local variables (LOCAL\_\*)
- ✅ Environment switcher
- ✅ All optional variables

### 4. **Environment Setup Guide**

Created `backend/ENV_SETUP.md` with:

- ✅ How to switch environments
- ✅ How it works internally
- ✅ Verification steps
- ✅ Troubleshooting tips
- ✅ CI/CD guidance

### 5. **Backend `.gitignore`**

Added to protect sensitive data:

- ✅ Excludes `.env` files
- ✅ Excludes `node_modules`
- ✅ Excludes build output
- ✅ Standard Node.js ignores

---

## Current Configuration

### Active Environment: **LOCAL** 🐳

```env
PROD_DB=false
```

This means the backend will connect to:

- **URL:** http://127.0.0.1:54321 (Docker)
- **Database:** postgresql://postgres:postgres@127.0.0.1:54322/postgres

### To Switch to Production:

```bash
# Edit backend/.env
PROD_DB=true
```

Then restart your development server.

---

## How It Works

```
┌─────────────────────────────────────────────┐
│  Backend starts                             │
│  Reads PROD_DB from .env                    │
└──────────────────┬──────────────────────────┘
                   │
          ┌────────┴────────┐
          │                 │
     false│                 │true
          │                 │
    ┌─────▼─────┐     ┌────▼─────┐
    │   LOCAL   │     │   PROD   │
    │  Docker   │     │ Supabase │
    └───────────┘     └──────────┘
          │                 │
          │                 │
    ┌─────▼─────────────────▼─────┐
    │  Backend connects to DB     │
    │  Logs: "Using X database"   │
    └─────────────────────────────┘
```

---

## Verification

When you start the backend, you'll see:

```bash
🔧 Backend using LOCAL database
📍 Supabase URL: http://127.0.0.1:54321
```

Or:

```bash
🔧 Backend using PRODUCTION database
📍 Supabase URL: https://tabcxfaqqkfbchbxgogl.supabase.co
```

---

## File Structure

```
backend/
├── .env                    ✅ YOUR CREDENTIALS (not in git)
├── .env.example            ✅ Template (safe to commit)
├── .gitignore              ✅ Protects .env
├── ENV_SETUP.md            ✅ Detailed guide
└── src/
    └── config/
        └── env.ts          ✅ Auto-switching logic
```

---

## Next Steps

1. **Start the backend:**

   ```bash
   cd client
   npm run dev
   ```

2. **Verify environment:**
   Look for the log message showing which database is active

3. **Test an endpoint:**

   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/shows?org_id=YOUR_ORG_ID"
   ```

4. **Switch environments:**
   - Edit `backend/.env`
   - Change `PROD_DB=true` or `false`
   - Restart server
   - Verify the log message

---

## Environment Variables Reference

### Required (Automatically Set)

- `PROD_DB` - Switch between prod/local
- `PROD_SUPABASE_URL` - Production Supabase URL
- `PROD_SUPABASE_ANON_KEY` - Production anon key
- `PROD_SUPABASE_SERVICE_ROLE_KEY` - Production service key
- `LOCAL_SUPABASE_URL` - Local Docker URL
- `LOCAL_SUPABASE_ANON_KEY` - Local anon key
- `LOCAL_SUPABASE_SERVICE_ROLE_KEY` - Local service key

### Optional

- `API_BASE_URL` - API base path (default: `/api`)
- `API_VERSION` - API version (default: `v1`)
- `CORS_ORIGIN` - CORS origin (default: `*`)
- `NODE_ENV` - Environment (default: `development`)
- `OPENAI_API_KEY` - OpenAI key (if needed)
- `SUPABASE_PROJECT_REF` - Project ref for CI/CD
- `SUPABASE_ACCESS_TOKEN` - Access token for CLI

---

## Security Notes

✅ **Safe:** `.env.example` (template with no real credentials)  
❌ **Never commit:** `.env` (contains real credentials)  
✅ **Protected:** `.gitignore` excludes `.env`

The actual `.env` file is already in your `.gitignore` and won't be committed to git.

---

## Troubleshooting

### Backend won't start

**Check:** Make sure all required env vars are set

```bash
cd backend
cat .env | grep SUPABASE_URL
```

### Connecting to wrong database

**Check:** Verify `PROD_DB` value

```bash
cd backend
cat .env | grep PROD_DB
```

### Can't find environment variables

**Check:** Make sure `.env` exists

```bash
cd backend
ls -la .env
```

---

## Summary

✅ Environment configuration complete  
✅ Backend can switch between local/production  
✅ All credentials configured  
✅ Protected from git commits  
✅ Documented and ready to use

**You're all set!** The backend will automatically use the correct database based on the `PROD_DB` flag.

---

**See also:**

- [backend/ENV_SETUP.md](./backend/ENV_SETUP.md) - Detailed environment guide
- [QUICK_START.md](./QUICK_START.md) - Get started guide
- [backend/README.md](./backend/README.md) - Backend documentation
