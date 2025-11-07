# Activity Log Retention & Archival System

## Overview

The activity log retention system preserves audit history while keeping the main `activity_log` table performant. Instead of deleting old logs, they are moved to a `activity_log_archive` table for cold storage.

## Architecture

### Tables

1. **`activity_log`** - Active logs (default: last 90 days)
   - Optimized for frequent queries
   - Full indexes for performance
   
2. **`activity_log_archive`** - Archived logs (older than retention period)
   - Minimal indexes (optimized for occasional queries)
   - Preserves complete audit trail
   
3. **`activity_log_retention_config`** - Configuration (singleton)
   - `days_to_keep` - How many days to keep in active table (default: 90)
   - `archive_batch_size` - Batch size for archival operations (default: 10,000)
   - `auto_archive_enabled` - Enable/disable automatic archival
   - `last_archive_run` - Timestamp of last successful archive

## Functions

### `archive_old_activity_logs(days_to_keep, batch_size)`

Archives logs older than the specified number of days.

**Parameters:**
- `days_to_keep` (int, default: 90) - Keep logs newer than this in active table
- `batch_size` (int, default: 10,000) - Process this many records per batch

**Returns:** JSON object with statistics
```json
{
  "success": true,
  "archived_count": 1234,
  "cutoff_date": "2025-08-10T00:00:00Z",
  "days_retained": 90,
  "duration_seconds": 2.5,
  "timestamp": "2025-11-08T00:00:00Z"
}
```

**Example:**
```sql
-- Archive logs older than 90 days
SELECT archive_old_activity_logs(90);

-- Archive logs older than 30 days with smaller batch size
SELECT archive_old_activity_logs(30, 5000);
```

### `run_scheduled_log_archival()`

Runs archival using settings from `activity_log_retention_config`. Designed for scheduled jobs.

**Returns:** Same JSON as `archive_old_activity_logs`

**Example:**
```sql
-- Manual run
SELECT run_scheduled_log_archival();
```

### `get_activity_logs(org_id, limit, offset, include_archived)`

Queries activity logs with optional archive inclusion.

**Parameters:**
- `org_id` (uuid) - Organization ID
- `limit` (int, default: 100) - Maximum records to return
- `offset` (int, default: 0) - Offset for pagination
- `include_archived` (boolean, default: false) - Include archived logs

**Returns:** Table with log records + `is_archived` flag

**Example:**
```sql
-- Get recent logs for an org
SELECT * FROM get_activity_logs('org-uuid-here', 50, 0, false);

-- Search across both active and archived logs
SELECT * FROM get_activity_logs('org-uuid-here', 100, 0, true)
WHERE action = 'user.login';
```

### `get_activity_log_stats()`

Returns statistics about logs and archival system. **Service role only.**

**Returns:** JSON with comprehensive stats
```json
{
  "active_logs": {
    "count": 1500,
    "size": "256 KB",
    "oldest_entry": "2025-08-10T00:00:00Z"
  },
  "archived_logs": {
    "count": 5000,
    "size": "1.2 MB",
    "oldest_entry": "2024-01-01T00:00:00Z"
  },
  "retention_config": {
    "days_to_keep": 90,
    "auto_archive_enabled": true,
    "last_archive_run": "2025-11-08T02:00:00Z"
  },
  "total_logs": 6500,
  "timestamp": "2025-11-08T12:00:00Z"
}
```

## Setup Automated Archival

### Option 1: pg_cron (Recommended)

If you have `pg_cron` extension enabled:

```sql
-- Run archival daily at 2 AM
SELECT cron.schedule(
  'archive-activity-logs',
  '0 2 * * *',
  'SELECT run_scheduled_log_archival()'
);
```

### Option 2: Edge Function + Scheduled Invocation

Create a Supabase Edge Function that calls the archival function and schedule it to run daily.

### Option 3: Manual Cron Job

Set up a cron job on your server to call the Supabase API or directly connect to the database.

## Configuration

Update retention settings:

```sql
UPDATE activity_log_retention_config
SET 
  days_to_keep = 60,  -- Keep 60 days instead of 90
  auto_archive_enabled = true,
  updated_at = now()
WHERE id = 1;
```

## Monitoring

Check archival stats:

```sql
-- View current state (service role required)
SELECT get_activity_log_stats();

-- Check last run
SELECT last_archive_run, auto_archive_enabled 
FROM activity_log_retention_config;

-- Count active vs archived
SELECT 
  (SELECT COUNT(*) FROM activity_log) as active,
  (SELECT COUNT(*) FROM activity_log_archive) as archived;
```

## Performance Considerations

1. **Batch Processing** - Archives process in batches with small delays to avoid long locks
2. **Minimal Archive Indexes** - Archive table has fewer indexes since it's queried less frequently
3. **Configurable Batch Size** - Adjust `archive_batch_size` based on your database load
4. **Off-Peak Scheduling** - Run archival during low-traffic hours (e.g., 2 AM)

## Security

- Archive table has RLS enabled
- Only org owners/admins can view archived logs
- Service role can manage archive operations
- Stats function requires service role

## Migration Path

The migration automatically:
1. Creates the archive table with proper indexes
2. Sets up retention configuration (90 days default)
3. Replaces old delete-based archival with move-based archival
4. Enables RLS on archive table
5. Creates helper functions for querying and statistics

No manual intervention needed after migration.

## Restore from Archive

To restore specific logs from archive (if needed):

```sql
-- Move specific logs back to active table
WITH restored AS (
  DELETE FROM activity_log_archive
  WHERE id = ANY(ARRAY['log-id-1', 'log-id-2'])
  RETURNING *
)
INSERT INTO activity_log 
SELECT id, org_id, user_id, action, resource_type, 
       resource_id, details, ip_address, user_agent, created_at
FROM restored;
```

## Future Enhancements

Possible improvements for the future:

1. **Table Partitioning** - Partition by month for even better performance
2. **Compression** - Use PostgreSQL table compression for archive table
3. **External Storage** - Export very old archives to S3 or similar
4. **Analytics Integration** - Stream logs to analytics platform before archival
5. **Retention by Org** - Different retention periods per organization
