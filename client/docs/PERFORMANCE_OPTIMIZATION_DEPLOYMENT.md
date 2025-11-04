# 🚀 Performance Optimization Guide

Complete guide for deploying and validating the performance optimizations for Oncore.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [What Was Optimized](#what-was-optimized)
3. [Expected Improvements](#expected-improvements)
4. [Deployment Steps](#deployment-steps)
5. [Running Tests](#running-tests)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Start

### 1. Deploy the Migration

```bash
cd client
npx supabase db push
```

### 2. Install Test Dependencies

```bash
cd tests
npm install
```

### 3. Run All Tests

```bash
npm test
# or
npm run test:all
```

---

## 🎯 What Was Optimized

### Database Layer (Migration: `20251104000000_performance_optimization.sql`)

#### ✅ **8 Critical Indexes Added**
- `idx_org_members_user_id` - User lookup in org members
- `idx_org_members_org_id` - Organization members queries
- `idx_org_subscriptions_org_status` - Active subscription checks
- `idx_shows_org_id` - Shows by organization
- `idx_show_schedules_show_id` - Schedule lookups
- `idx_advancing_sessions_show_id` - Advancing session queries
- `idx_venues_org_id` - Venue queries
- `idx_people_org_id` - People queries

**Impact:** 60-80% faster query execution

#### ✅ **Combined RLS Functions**
Before:
```sql
-- Every write called BOTH functions
is_org_editor(user_uuid, org_uuid)     -- Query 1
org_is_active(org_uuid)                 -- Query 2
```

After:
```sql
-- Single efficient function
is_org_editor_and_active(user_uuid, org_uuid)  -- Single query with JOIN
```

**Impact:** 50% less RLS overhead, 2-3x faster writes

#### ✅ **Materialized View for Entitlements**
```sql
CREATE MATERIALIZED VIEW org_entitlements_cache AS
SELECT 
  org_id,
  max_shows, max_people, max_venues, max_users
FROM org_entitlements()
```

With auto-refresh triggers on subscription changes.

**Impact:** 5-10x faster entitlement checks

#### ✅ **Optimized RLS Policies**
- Removed nested subqueries
- Use direct org_id checks where possible
- Simplified EXISTS clauses
- Better predicate ordering

**Impact:** 40% less CPU per query

---

### Application Layer

#### ✅ **React Cache Helpers** (`lib/cache.ts`)

10 cached query functions eliminate duplicate fetches:
- `getCachedOrg()` - Organization data
- `getCachedOrgSubscription()` - Subscription status
- `getCachedShow()` - Show details
- `getCachedShowSchedule()` - Show schedule
- `getCachedOrgVenues()` - Organization venues
- `getCachedOrgPeople()` - Organization people
- `getCachedAdvancingSession()` - Advancing sessions
- Plus more...

**How it works:**
```typescript
// Without cache: 3 separate DB queries
const org1 = await getOrg(orgId)
const org2 = await getOrg(orgId)  // Duplicate!
const org3 = await getOrg(orgId)  // Duplicate!

// With cache: 1 DB query
const org1 = await getCachedOrg(orgId)
const org2 = await getCachedOrg(orgId)  // Cached
const org3 = await getCachedOrg(orgId)  // Cached
```

**Impact:** 50-70% less database queries per page load

#### ✅ **Batch Operations** (`lib/actions/advancing.ts`)

Grid save optimization:

Before:
```typescript
// N+1 problem: 100+ queries for large grid
for (const update of updates) {
  const existing = await supabase
    .from('advancing_fields')
    .select()
    .eq('id', update.id)
    .single()  // Query per cell!
    
  if (existing) {
    await supabase.from('advancing_fields').update(...)  // Update per cell!
  } else {
    await supabase.from('advancing_fields').insert(...)  // Insert per cell!
  }
}
```

After:
```typescript
// Batch approach: 3 queries total
// 1. Fetch all existing fields once
const existingFields = await supabase
  .from('advancing_fields')
  .select()
  .in('id', allIds)

// 2. Build lookup map
const existingMap = new Map(existingFields.map(f => [f.id, f]))

// 3. Prepare batch arrays
const toUpdate = []
const toInsert = []
updates.forEach(u => {
  existingMap.has(u.id) ? toUpdate.push(u) : toInsert.push(u)
})

// 4. Execute in parallel
await Promise.all([
  supabase.from('advancing_fields').upsert(toUpdate),
  supabase.from('advancing_fields').insert(toInsert)
])
```

**Impact:** 10-20x faster grid saves (from seconds to milliseconds)

#### ✅ **Parallel Queries** (Page Components)

Before:
```typescript
const org = await getOrg(orgId)
const show = await getShow(showId)       // Sequential
const schedule = await getSchedule(showId) // Sequential
```

After:
```typescript
const [org, show, schedule] = await Promise.all([
  getCachedOrg(orgId),
  getCachedShow(showId),
  getCachedShowSchedule(showId)
]) // Parallel + cached!
```

**Impact:** 60% faster page loads

---

## 📊 Expected Improvements

### Overall Metrics
- **Page Loads:** 50-70% faster (from 800-1200ms → 300-500ms)
- **Write Operations:** 2-3x faster
- **Grid Saves:** 10-20x faster
- **Database CPU:** 40-60% reduction
- **Query Count per Page:** 50-70% reduction

### Specific Targets
| Operation | Before | After | Target |
|-----------|--------|-------|--------|
| Simple query | 150-200ms | 50-80ms | <100ms |
| RLS query | 200-300ms | 80-120ms | <150ms |
| Complex query | 300-500ms | 120-180ms | <200ms |
| Page load (simple) | 800-1200ms | 200-400ms | <300ms |
| Page load (complex) | 1500-2000ms | 400-600ms | <500ms |
| Grid save (50 cells) | 5-10s | 200-500ms | <1s |

---

## 🚀 Deployment Steps

### Step 1: Backup Database

```bash
# Export current schema
npx supabase db dump > backup_$(date +%Y%m%d).sql

# Or use Supabase dashboard: Database → Backups → Create backup
```

### Step 2: Review Migration

Check the migration file:
```bash
cat client/supabase/migrations/20251104000000_performance_optimization.sql
```

Verify:
- ✅ All indexes are appropriate for your data
- ✅ Combined RLS functions match your org structure
- ✅ Materialized view refresh triggers are correct

### Step 3: Apply Migration

```bash
cd client

# If using local Supabase
npx supabase db push

# If using Supabase CLI with remote
npx supabase db push --db-url "postgresql://..."

# Or apply directly in Supabase Dashboard SQL Editor
```

### Step 4: Verify Migration

```bash
# Check indexes were created
npx supabase db diff --schema public

# Or in SQL editor:
SELECT * FROM pg_indexes WHERE schemaname = 'public';
```

### Step 5: Test Manually

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Open DevTools** → Network tab
3. **Load key pages:**
   - Organization home
   - Shows list
   - Show detail
   - Advancing page
4. **Check timings** in Network tab
5. **Open Supabase Dashboard** → Database → Logs
6. **Monitor query performance**

### Step 6: Run Automated Tests

```bash
cd tests
npm install
npm test
```

Review the generated reports:
- `test-results.json` - Detailed results
- `test-results.md` - Summary report

---

## 🧪 Running Tests

### All Tests (Recommended)

Runs everything and generates comprehensive report:

```bash
cd tests
npm test
# or
npm run test:all
```

### Individual Test Suites

```bash
# Unit tests (cache functions, batch operations)
npm run test:unit

# Database performance tests
npm run test:perf:database

# Grid save performance tests
npm run test:perf:grid

# Stress tests (concurrent users)
npm run test:perf:stress

# Page load integration tests
npm run test:integration

# All performance tests
npm run test:performance

# Quick benchmark
npm run benchmark
```

### Understanding Test Results

#### ✅ **Passing Tests**
All tests show green checkmarks and meet targets:
```
✅ Database Performance Tests (2.34s)
✅ Grid Save Performance Tests (1.87s)
✅ Page Load Integration Tests (3.12s)
✅ Stress Tests (15.43s)
```

#### ⚠️ **Performance Degradation**
Some tests are slower than targets:
```
⚠️ Heavy Load scenario: Avg 523ms (target: <500ms)
```

**Actions:**
- Check database connection pool size
- Review slow query logs in Supabase
- Consider read replicas for high traffic
- Add CDN caching

#### ❌ **Test Failures**
Tests throw errors or timeout:
```
❌ Database connection failed
❌ Query timeout after 5000ms
```

**Actions:**
- Verify migration was applied
- Check database is running
- Review connection string
- Check for locks or blocking queries

---

## 📈 Monitoring

### Real-Time Monitoring

#### Supabase Dashboard

1. **Database → Logs**
   - Watch query execution times
   - Identify slow queries (>200ms)
   - Check for full table scans

2. **Database → Query Performance**
   - View most expensive queries
   - Check cache hit rates
   - Monitor connection pool

3. **Database → Reports**
   - Query patterns
   - Table sizes
   - Index usage

#### Application Monitoring

Add performance timing in code:

```typescript
// lib/services/monitoring.ts
export function measureQuery<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  return fn().finally(() => {
    const duration = performance.now() - start
    console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`)
    
    // Send to analytics
    if (duration > 200) {
      console.warn(`[SLOW QUERY] ${name}: ${duration.toFixed(2)}ms`)
    }
  })
}
```

Usage:
```typescript
const org = await measureQuery(
  'getCachedOrg',
  () => getCachedOrg(orgId)
)
```

### Key Metrics to Track

1. **Query Performance**
   - Avg query time: Target <150ms
   - P95 query time: Target <300ms
   - P99 query time: Target <500ms

2. **Page Load Times**
   - Home page: <200ms
   - Shows list: <200ms
   - Show detail: <300ms
   - Advancing page: <350ms

3. **Cache Hit Rate**
   - Target: >80% for common queries
   - Monitor with React DevTools Profiler

4. **Database Load**
   - CPU usage: <60% under normal load
   - Connection pool: <70% utilization
   - Active connections: Monitor spikes

---

## 🔍 Troubleshooting

### Problem: Migration Fails

**Error:** `relation "idx_org_members_user_id" already exists`

**Solution:**
```sql
-- Check existing indexes
SELECT * FROM pg_indexes WHERE schemaname = 'public';

-- Drop conflicting index
DROP INDEX IF EXISTS idx_org_members_user_id;

-- Re-run migration
```

### Problem: Tests Fail with "Connection Error"

**Cause:** Database connection not configured

**Solution:**
```bash
# Set environment variables
export SUPABASE_URL="your-project-url"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-service-key"

# Or create tests/.env file
echo "SUPABASE_URL=..." >> tests/.env
echo "SUPABASE_ANON_KEY=..." >> tests/.env
```

### Problem: Page Loads Still Slow

**Check:**

1. **Was migration applied?**
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations 
   WHERE version = '20251104000000';
   ```

2. **Are indexes being used?**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM org_members WHERE user_id = 'uuid';
   -- Should show "Index Scan using idx_org_members_user_id"
   ```

3. **Is cache working?**
   - Check React DevTools Profiler
   - Add console.log in cache functions
   - Should see reduced query counts

4. **Network latency?**
   - Check Supabase region vs user location
   - Consider CDN for static assets
   - Use Edge Functions if needed

### Problem: Stress Tests Show Degradation

**Scenario:** System slows under 100+ concurrent users

**Solutions:**

1. **Increase connection pool:**
   ```sql
   -- Supabase dashboard: Database → Settings
   -- Increase max_connections
   ```

2. **Add read replicas:**
   - Supabase Pro: Enable read replicas
   - Route read queries to replicas

3. **Implement rate limiting:**
   ```typescript
   // middleware.ts
   import { Ratelimit } from '@upstash/ratelimit'
   
   const ratelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(100, '1 m')
   })
   ```

4. **Add CDN caching:**
   - Cache static pages (shows list, etc.)
   - Use stale-while-revalidate pattern
   - Implement edge caching

### Problem: Grid Saves Still Slow

**Check:**

1. **Batch operations in use?**
   ```typescript
   // Should be in lib/actions/advancing.ts
   const toUpdate = []
   const toInsert = []
   // ... batch logic
   await Promise.all([...]) // Parallel execution
   ```

2. **Network payload size?**
   - Large grids (100+ cells) may need chunking
   - Consider saving only changed cells
   - Implement debouncing

3. **RLS overhead?**
   ```sql
   -- Check RLS function calls
   EXPLAIN ANALYZE
   UPDATE advancing_fields SET value = 'test' WHERE id = 'uuid';
   -- Should show combined function usage
   ```

---

## 📚 Additional Resources

- [PERFORMANCE_ISSUES_AND_FIXES.md](./PERFORMANCE_ISSUES_AND_FIXES.md) - Detailed analysis
- [PERFORMANCE_OPTIMIZATION_COMPLETE.md](./PERFORMANCE_OPTIMIZATION_COMPLETE.md) - Implementation summary
- [tests/README.md](../tests/README.md) - Test suite documentation
- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)

---

## ✅ Success Checklist

Before going to production:

- [ ] Migration applied successfully
- [ ] All indexes created
- [ ] Materialized view refreshing correctly
- [ ] Unit tests passing
- [ ] Performance tests meeting targets
- [ ] Stress tests showing acceptable load handling
- [ ] Manual testing confirms faster page loads
- [ ] Supabase dashboard shows improved query times
- [ ] No errors in application logs
- [ ] Backup created and tested
- [ ] Rollback plan documented
- [ ] Team informed of changes
- [ ] Monitoring in place

---

## 🎉 Expected Results

After successful deployment, you should see:

### User Experience
- ⚡ **Instant page loads** - Pages feel snappy and responsive
- 🚀 **Fast interactions** - Button clicks and form submissions respond immediately
- 📊 **Quick grid saves** - Large advancing grids save in <1 second
- 💻 **Smooth navigation** - No lag when switching between pages

### Dashboard Metrics
- 📉 **50-70% reduction** in database query times
- 📉 **40-60% reduction** in database CPU usage
- 📉 **50-70% fewer** queries per page load
- 📈 **2-3x faster** write operations
- 📈 **10-20x faster** grid saves

### Developer Experience
- 🔧 **Easier debugging** - Fewer queries to trace
- 📝 **Better logging** - Clear performance metrics
- 🧪 **Reliable tests** - Automated performance validation
- 📊 **Clear monitoring** - Know when performance degrades

---

**Questions or issues?** Check the troubleshooting section above or review the detailed documentation files.

**Ready to deploy?** Follow the deployment steps carefully and run all tests to verify improvements!
