# Connection Pool Exhaustion Fix Guide

## 🔴 Problem Identified

Your production database is experiencing **connection pool exhaustion** caused by:

1. **Direct Database Connection** - NOT using pooler at all
2. **Recursive RLS Policies** - `is_org_member()` function queries `org_members` table, which has RLS policies that call `is_org_member()` → infinite recursion
3. **Multiple Concurrent Clients** - Next.js app, migrations, Supabase Studio, test scripts all holding connections
4. **Session Mode pooling** - Would hold connections for entire session duration if it were enabled (but you're not using pooler at all!)

## ✅ Solution Implementation

### Step 1: Update Production DATABASE_URL to Use Transaction Pooler

**Current (WRONG):**
```
PROD_DATABASE_URL=postgresql://postgres:S7SGLazdSv2Kjgor@db.alzfpysmlxinthfrbjll.supabase.co:5432/postgres
```

**Correct (TRANSACTION MODE POOLER):**
```
PROD_DATABASE_URL=postgresql://postgres.alzfpysmlxinthfrbjll:S7SGLazdSv2Kjgor@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Key differences:**
- Host: `aws-0-us-east-1.pooler.supabase.com` (pooler) instead of `db.alzfpysmlxinthfrbjll.supabase.co` (direct)
- Port: `6543` (transaction mode) instead of `5432` (direct) or `5432` (session mode)
- Protocol: Transaction mode automatically releases connections after each transaction

**To get your correct pooler URL:**
1. Go to Supabase Dashboard → Project Settings → Database
2. Look for "Connection Pooling" section
3. Select "Transaction Mode"
4. Copy the connection string
5. Update your `.env.local` and `.env.production` files

### Step 2: Apply Migration to Fix RLS Recursion

The migration `20251109000000_fix_connection_pool_exhaustion.sql` has been created with:

1. **Breaks recursion in org_members table** - No more `is_org_member()` calls in org_members policies
2. **Breaks recursion in organizations table** - Direct subqueries instead of function calls
3. **Service role bypass policies** - Explicit policies for all core tables
4. **Deprecates is_org_member() in RLS** - Function still exists for app code, but not for policies

**Apply the migration:**
```bash
# Test locally first
npx supabase db reset

# Then apply to production
npx supabase migration up --linked
```

### Step 3: Update Supabase Client Connection Limits

Add connection pool configuration to your Supabase clients:

**For admin client (`lib/supabase/admin.server.ts`):**
```typescript
adminClient = createClient<Database>(
  config.url,
  config.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'oncore-admin',
      },
    },
  }
)
```

**For server client (`lib/supabase/server.ts`):**
```typescript
export function getSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - cookies are read-only
          }
        },
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'oncore-server',
        },
      },
    }
  )
}
```

### Step 4: Reduce Connection Pool Size in Production

Your Supabase project likely has a connection limit based on your plan:

- **Free tier**: 5 connections max
- **Pro tier**: 15 connections max
- **Team/Enterprise**: Higher limits

**Check current usage:**
```sql
-- Run in Supabase Dashboard SQL Editor
SELECT 
  count(*) AS connection_count,
  usename,
  application_name,
  state
FROM pg_stat_activity
WHERE datname = 'postgres'
GROUP BY usename, application_name, state
ORDER BY connection_count DESC;
```

**Recommended limits per client type:**
- Next.js App: 3-5 connections (not configurable in Supabase client, handled by pooler)
- Migrations: 1 connection
- Supabase Studio: 1-2 connections
- Test Scripts: 1 connection

### Step 5: Monitor Connection Usage

**Add monitoring query:**
```sql
-- Check current connections
SELECT 
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active,
  COUNT(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity 
WHERE datname = 'postgres';

-- Check for blocked queries (indicates pool exhaustion)
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  wait_event_type,
  wait_event,
  query
FROM pg_stat_activity 
WHERE wait_event IS NOT NULL
  AND state != 'idle';
```

## 📊 Verification Steps

### 1. Test Locally First
```bash
cd client
npx supabase db reset
npm run dev
```

Try creating an organization - should work instantly.

### 2. Apply to Production
```bash
# Update .env files with Transaction Mode pooler URL first!
npx supabase migration up --linked
```

### 3. Test Production
- Create a new organization
- Should complete in < 2 seconds
- Check browser console - no RLS errors
- Check connection count (should stay low)

### 4. Monitor for 24 Hours
- No "permission denied" errors
- No hanging queries
- Stable connection count
- Fast response times

## 🎯 Expected Results

**Before Fix:**
```
✅ Works for 30 minutes
⏳ Then: queries hang for 60-90 minutes  
❌ Error: "permission denied for table organizations"
⏱ After waiting: works again
```

**After Fix:**
```
✅ Works consistently
✅ Fast response times (< 2s)
✅ No permission errors
✅ Stable connection pool
✅ No hanging queries
```

## 🔧 Rollback Plan

If something goes wrong:

```sql
-- Rollback the migration
-- Create file: supabase/migrations/20251109000001_rollback_pool_fix.sql

-- Restore original is_org_member-based policies
DROP POLICY IF EXISTS org_members_select ON org_members;
CREATE POLICY org_members_select ON org_members
FOR SELECT
USING (public.is_org_member(org_id));

-- Etc... (restore all original policies)
```

Or simply:
```bash
# Restore from backup
npx supabase db reset --linked
```

## 📚 Additional Resources

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Postgres Connection Limits](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [RLS Performance Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-tips)

## 🚨 Important Notes

1. **Always use Transaction Mode pooler** for web applications
2. **Never call is_org_member() in org_members policies** - causes infinite recursion
3. **Use direct subqueries in base table policies** - avoid function calls
4. **Service role should always bypass RLS** - but explicit policies help
5. **Monitor connection usage** - set up alerts if approaching limit

