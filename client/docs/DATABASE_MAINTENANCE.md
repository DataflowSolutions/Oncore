# Database Maintenance Guide

## Overview

This guide covers database maintenance operations (ANALYZE and VACUUM) that keep your query planner statistics up-to-date and ensure optimal performance.

## Why Maintenance Matters

### ANALYZE
- **What it does:** Updates table statistics that PostgreSQL's query planner uses
- **When to run:** After bulk data imports, schema changes, or deployments
- **Impact:** Better query plans = faster queries
- **Frequency:** After every deployment + daily

### VACUUM
- **What it does:** Reclaims storage from deleted/updated rows
- **When to run:** After large delete operations or during off-peak hours
- **Impact:** Reduces table bloat, improves performance
- **Frequency:** Weekly or as needed

## Automated Maintenance

### Post-Deployment (Automatic)

The GitHub Actions workflow automatically runs ANALYZE after each deployment:

```yaml
# .github/workflows/deploy.yml
- name: 📊 Update Database Statistics
  run: |
    supabase db execute "SELECT run_analyze_with_logging('github-actions');" --linked
```

This ensures query planner statistics are always current after schema changes.

### Scheduled Maintenance with pg_cron

If you have `pg_cron` extension enabled in Supabase:

```sql
-- Daily ANALYZE at 3 AM UTC
SELECT cron.schedule(
  'daily-analyze',
  '0 3 * * *',
  $$SELECT run_analyze_with_logging('cron')$$
);

-- Weekly VACUUM at 4 AM UTC on Sundays
SELECT cron.schedule(
  'weekly-vacuum',
  '0 4 * * 0',
  $$SELECT run_vacuum_with_logging('cron')$$
);
```

To enable pg_cron in Supabase:
1. Go to Database → Extensions
2. Enable `pg_cron`
3. Run the schedule commands above

### Alternative: Supabase Edge Function

Create a scheduled Edge Function that runs maintenance:

```typescript
// supabase/functions/database-maintenance/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Run ANALYZE
  const { data, error } = await supabase.rpc('run_analyze_with_logging', {
    triggered_by: 'edge-function'
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Then schedule it in Supabase Dashboard → Edge Functions → Cron Jobs.

## Manual Maintenance

### Run ANALYZE

```sql
-- With logging (recommended)
SELECT run_analyze_with_logging('manual');

-- Direct (no logging)
SELECT run_analyze_all_tables();
```

### Run VACUUM

```sql
-- With logging (recommended)
SELECT run_vacuum_with_logging('manual');

-- Direct (no logging)
SELECT run_vacuum_all_tables();
```

### Check if Maintenance is Needed

```sql
SELECT check_maintenance_needed();
```

Example response:
```json
{
  "needs_maintenance": true,
  "last_analyze": "2025-11-07T03:00:00Z",
  "last_vacuum": "2025-11-01T04:00:00Z",
  "hours_since_analyze": 48.5,
  "hours_since_vacuum": 168.5,
  "recommendations": [
    "Run ANALYZE - last run was 48.5 hours ago",
    "Run VACUUM ANALYZE - last run was 7.0 days ago"
  ]
}
```

## Monitoring

### View Maintenance History

```sql
-- Recent runs
SELECT 
  operation,
  started_at,
  duration_seconds,
  status,
  triggered_by
FROM database_maintenance_log
ORDER BY started_at DESC
LIMIT 20;
```

### Get Statistics

```sql
-- Service role only
SELECT get_maintenance_stats(30);  -- Last 30 days
```

Example response:
```json
{
  "period_days": 30,
  "analyze_runs": {
    "total": 35,
    "successful": 34,
    "failed": 1,
    "avg_duration_seconds": 0.15,
    "last_run": "2025-11-08T03:00:00Z"
  },
  "vacuum_runs": {
    "total": 4,
    "successful": 4,
    "failed": 0,
    "avg_duration_seconds": 2.5,
    "last_run": "2025-11-07T04:00:00Z"
  },
  "recent_runs": [...]
}
```

### View Failed Runs

```sql
SELECT 
  operation,
  started_at,
  error_message
FROM database_maintenance_log
WHERE status = 'failed'
ORDER BY started_at DESC;
```

## Available Functions

### Core Functions

| Function | Description | When to Use |
|----------|-------------|-------------|
| `run_analyze_all_tables()` | Updates statistics for all tables | After deployments, bulk imports |
| `run_vacuum_all_tables()` | Vacuums and analyzes all tables | Weekly maintenance, after large deletes |
| `run_analyze_with_logging(trigger)` | ANALYZE with logging | Scheduled/monitored maintenance |
| `run_vacuum_with_logging(trigger)` | VACUUM with logging | Scheduled/monitored maintenance |
| `check_maintenance_needed()` | Checks if maintenance is due | Monitoring scripts |
| `get_maintenance_stats(days)` | Returns maintenance statistics | Service role monitoring |

### Tables

| Table | Description |
|-------|-------------|
| `database_maintenance_log` | Logs all maintenance operations with timing and status |

## Best Practices

### ✅ Do

1. **Run ANALYZE after deployments** - Already automated in GitHub Actions
2. **Schedule regular ANALYZE** - Daily at low-traffic times (3 AM)
3. **Schedule weekly VACUUM** - Sundays at 4 AM
4. **Monitor maintenance logs** - Check for failures
5. **Use logging functions** - Track all maintenance for auditing

### ❌ Don't

1. **Don't run VACUUM during peak hours** - It can lock tables briefly
2. **Don't use VACUUM FULL** - Use the regular VACUUM (already configured)
3. **Don't skip ANALYZE** - Outdated statistics = slow queries
4. **Don't ignore failed runs** - Check error messages

## Troubleshooting

### ANALYZE Takes Too Long

```sql
-- Analyze specific tables only
ANALYZE organizations;
ANALYZE shows;
ANALYZE advancing_sessions;
```

### VACUUM Conflicts

If VACUUM fails due to locks:
- Check for long-running queries
- Retry during off-peak hours
- Consider using `VACUUM (ANALYZE, SKIP_LOCKED)` for specific tables

### Missing Statistics

```sql
-- Check when tables were last analyzed
SELECT 
  schemaname,
  tablename,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY last_analyze DESC NULLS LAST;
```

## Integration with Existing Scripts

### Add to Makefile

```makefile
# Makefile
.PHONY: db-analyze db-vacuum db-maintenance-check

db-analyze:
	@echo "Running ANALYZE on database..."
	@supabase db execute "SELECT run_analyze_with_logging('makefile');" --linked

db-vacuum:
	@echo "Running VACUUM ANALYZE on database..."
	@supabase db execute "SELECT run_vacuum_with_logging('makefile');" --linked

db-maintenance-check:
	@echo "Checking if maintenance is needed..."
	@supabase db execute "SELECT check_maintenance_needed();" --linked
```

Usage:
```bash
make db-analyze          # Run ANALYZE
make db-vacuum           # Run VACUUM
make db-maintenance-check # Check if needed
```

### Add to package.json

```json
{
  "scripts": {
    "db:analyze": "supabase db execute \"SELECT run_analyze_with_logging('npm');\" --linked",
    "db:vacuum": "supabase db execute \"SELECT run_vacuum_with_logging('npm');\" --linked",
    "db:check": "supabase db execute \"SELECT check_maintenance_needed();\" --linked"
  }
}
```

## Performance Impact

### ANALYZE
- **Duration:** < 1 second for most tables
- **Locks:** None (safe to run anytime)
- **Impact:** Minimal CPU, mostly I/O
- **Blocking:** Non-blocking

### VACUUM
- **Duration:** 2-10 seconds depending on table size
- **Locks:** Brief ShareUpdateExclusiveLock
- **Impact:** Moderate I/O
- **Blocking:** Generally non-blocking, but can queue behind other operations

## Monitoring Dashboard

Create a simple monitoring query:

```sql
SELECT 
  'Last ANALYZE' as metric,
  MAX(started_at) as value,
  EXTRACT(EPOCH FROM (now() - MAX(started_at))) / 3600 as hours_ago
FROM database_maintenance_log
WHERE operation = 'ANALYZE' AND status = 'completed'

UNION ALL

SELECT 
  'Last VACUUM' as metric,
  MAX(started_at) as value,
  EXTRACT(EPOCH FROM (now() - MAX(started_at))) / 3600 as hours_ago
FROM database_maintenance_log
WHERE operation = 'VACUUM ANALYZE' AND status = 'completed'

UNION ALL

SELECT 
  'Failed Runs (7d)' as metric,
  COUNT(*)::text::timestamptz as value,
  0 as hours_ago
FROM database_maintenance_log
WHERE status = 'failed' 
AND started_at > now() - interval '7 days';
```

## Summary

### Recommended Schedule

| Operation | Frequency | When | How |
|-----------|-----------|------|-----|
| ANALYZE | After every deployment | Automatic | GitHub Actions |
| ANALYZE | Daily | 3 AM UTC | pg_cron or Edge Function |
| VACUUM | Weekly | Sunday 4 AM UTC | pg_cron or Edge Function |
| Check | Daily | Monitor logs | Automated alerts |

### Quick Commands

```bash
# Check if maintenance needed
supabase db execute "SELECT check_maintenance_needed();" --linked

# Run ANALYZE now
supabase db execute "SELECT run_analyze_with_logging('manual');" --linked

# Run VACUUM now
supabase db execute "SELECT run_vacuum_with_logging('manual');" --linked

# View recent runs
supabase db execute "SELECT * FROM database_maintenance_log ORDER BY started_at DESC LIMIT 10;" --linked
```

---

**Remember:** Keeping statistics up-to-date is crucial for query performance. The automated post-deployment ANALYZE is already configured, but setting up scheduled maintenance ensures optimal performance long-term.
