-- Implement proper activity log retention and archival strategy
-- Instead of deleting old logs, we'll archive them to cold storage
-- This preserves audit history while keeping the main table performant

-- =====================================
-- 1. CREATE ARCHIVE TABLE
-- =====================================

-- Archive table with same structure as activity_log but for cold storage
CREATE TABLE IF NOT EXISTS activity_log_archive (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- Minimal indexes for archive table (optimized for occasional queries)
CREATE INDEX IF NOT EXISTS idx_activity_log_archive_org_time 
  ON activity_log_archive(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_archive_created 
  ON activity_log_archive(created_at DESC);

-- Add comment explaining the archive table
COMMENT ON TABLE activity_log_archive IS 'Cold storage for activity logs older than retention period. Preserves audit trail while keeping main activity_log table performant.';

-- =====================================
-- 2. REPLACE ARCHIVE FUNCTION
-- =====================================

-- Drop the old function that just deletes
DROP FUNCTION IF EXISTS archive_old_activity_logs(int);

-- New function that moves logs to archive instead of deleting
CREATE OR REPLACE FUNCTION archive_old_activity_logs(
  days_to_keep int DEFAULT 90,
  batch_size int DEFAULT 10000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cutoff_date timestamptz;
  archived_count int := 0;
  deleted_count int := 0;
  total_archived int := 0;
  start_time timestamptz;
  duration interval;
BEGIN
  start_time := clock_timestamp();
  cutoff_date := now() - interval '1 day' * days_to_keep;
  
  -- Archive in batches to avoid long locks
  LOOP
    -- Move a batch of old logs to archive
    WITH moved AS (
      DELETE FROM activity_log
      WHERE created_at < cutoff_date
      AND id IN (
        SELECT id FROM activity_log
        WHERE created_at < cutoff_date
        ORDER BY created_at
        LIMIT batch_size
      )
      RETURNING *
    )
    INSERT INTO activity_log_archive (
      id, org_id, user_id, action, resource_type, 
      resource_id, details, ip_address, user_agent, created_at
    )
    SELECT 
      id, org_id, user_id, action, resource_type,
      resource_id, details, ip_address, user_agent, created_at
    FROM moved;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    total_archived := total_archived + archived_count;
    
    -- Exit if we've processed all old logs
    EXIT WHEN archived_count = 0;
    
    -- Small delay between batches to reduce load
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  duration := clock_timestamp() - start_time;
  
  RETURN jsonb_build_object(
    'success', true,
    'archived_count', total_archived,
    'cutoff_date', cutoff_date,
    'days_retained', days_to_keep,
    'duration_seconds', EXTRACT(EPOCH FROM duration),
    'timestamp', now()
  );
END;
$$;

COMMENT ON FUNCTION archive_old_activity_logs(int, int) IS 'Archives activity logs older than specified days to activity_log_archive table. Processes in batches to avoid long locks. Returns statistics about the archival operation.';

-- =====================================
-- 3. FUNCTION TO QUERY ACROSS BOTH TABLES
-- =====================================

-- Helper function to query activity logs across both active and archive tables
CREATE OR REPLACE FUNCTION get_activity_logs(
  p_org_id uuid,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0,
  p_include_archived boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  user_id uuid,
  action text,
  resource_type text,
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz,
  is_archived boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Verify user has permission to view this org's logs
  IF NOT EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_members.org_id = p_org_id 
    AND org_members.user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be org owner or admin';
  END IF;

  IF p_include_archived THEN
    -- Query both active and archived logs
    RETURN QUERY
    (
      SELECT 
        al.id, al.org_id, al.user_id, al.action, al.resource_type,
        al.resource_id, al.details, al.ip_address, al.user_agent,
        al.created_at, false as is_archived
      FROM activity_log al
      WHERE al.org_id = p_org_id
      
      UNION ALL
      
      SELECT 
        ala.id, ala.org_id, ala.user_id, ala.action, ala.resource_type,
        ala.resource_id, ala.details, ala.ip_address, ala.user_agent,
        ala.created_at, true as is_archived
      FROM activity_log_archive ala
      WHERE ala.org_id = p_org_id
    )
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    -- Query only active logs
    RETURN QUERY
    SELECT 
      al.id, al.org_id, al.user_id, al.action, al.resource_type,
      al.resource_id, al.details, al.ip_address, al.user_agent,
      al.created_at, false as is_archived
    FROM activity_log al
    WHERE al.org_id = p_org_id
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_activity_logs(uuid, int, int, boolean) TO authenticated;

COMMENT ON FUNCTION get_activity_logs(uuid, int, int, boolean) IS 'Retrieves activity logs for an organization. Set include_archived=true to query both active and archived logs.';

-- =====================================
-- 4. RLS FOR ARCHIVE TABLE
-- =====================================

ALTER TABLE activity_log_archive ENABLE ROW LEVEL SECURITY;

-- Only org owners/admins can view archived logs
CREATE POLICY "org_admins_view_archived_logs"
ON activity_log_archive FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Service role can manage archive (for maintenance operations)
CREATE POLICY "service_role_manage_archive"
ON activity_log_archive FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================
-- 5. RETENTION POLICY CONFIGURATION
-- =====================================

-- Create a settings table for retention policies if needed
CREATE TABLE IF NOT EXISTS activity_log_retention_config (
  id int PRIMARY KEY DEFAULT 1,
  days_to_keep int NOT NULL DEFAULT 90,
  archive_batch_size int NOT NULL DEFAULT 10000,
  auto_archive_enabled boolean NOT NULL DEFAULT true,
  last_archive_run timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT only_one_config CHECK (id = 1)
);

INSERT INTO activity_log_retention_config (id, days_to_keep)
VALUES (1, 90)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE activity_log_retention_config IS 'Configuration for activity log retention and archival policies. Only one row allowed (singleton pattern).';

-- =====================================
-- 6. SCHEDULED JOB HELPER
-- =====================================

-- Function to run archival using configured settings
CREATE OR REPLACE FUNCTION run_scheduled_log_archival()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  config record;
  result jsonb;
BEGIN
  -- Get current configuration
  SELECT * INTO config FROM activity_log_retention_config WHERE id = 1;
  
  -- Only run if auto-archive is enabled
  IF NOT config.auto_archive_enabled THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Auto-archive is disabled',
      'timestamp', now()
    );
  END IF;
  
  -- Run the archival
  SELECT archive_old_activity_logs(config.days_to_keep, config.archive_batch_size)
  INTO result;
  
  -- Update last run timestamp
  UPDATE activity_log_retention_config
  SET last_archive_run = now(),
      updated_at = now()
  WHERE id = 1;
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION run_scheduled_log_archival() IS 'Runs activity log archival using configured retention settings. Designed to be called by pg_cron or similar scheduled job system.';

-- =====================================
-- 7. STATISTICS FUNCTION
-- =====================================

-- Function to get archival statistics
CREATE OR REPLACE FUNCTION get_activity_log_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  active_count bigint;
  archive_count bigint;
  active_size text;
  archive_size text;
  oldest_active timestamptz;
  oldest_archive timestamptz;
  config record;
BEGIN
  -- Only service role or superusers should call this
  IF auth.jwt() ->> 'role' != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: service role required';
  END IF;
  
  -- Get counts
  SELECT COUNT(*) INTO active_count FROM activity_log;
  SELECT COUNT(*) INTO archive_count FROM activity_log_archive;
  
  -- Get table sizes
  SELECT pg_size_pretty(pg_total_relation_size('activity_log')) INTO active_size;
  SELECT pg_size_pretty(pg_total_relation_size('activity_log_archive')) INTO archive_size;
  
  -- Get oldest records
  SELECT MIN(created_at) INTO oldest_active FROM activity_log;
  SELECT MIN(created_at) INTO oldest_archive FROM activity_log_archive;
  
  -- Get config
  SELECT * INTO config FROM activity_log_retention_config WHERE id = 1;
  
  RETURN jsonb_build_object(
    'active_logs', jsonb_build_object(
      'count', active_count,
      'size', active_size,
      'oldest_entry', oldest_active
    ),
    'archived_logs', jsonb_build_object(
      'count', archive_count,
      'size', archive_size,
      'oldest_entry', oldest_archive
    ),
    'retention_config', jsonb_build_object(
      'days_to_keep', config.days_to_keep,
      'auto_archive_enabled', config.auto_archive_enabled,
      'last_archive_run', config.last_archive_run
    ),
    'total_logs', active_count + archive_count,
    'timestamp', now()
  );
END;
$$;

COMMENT ON FUNCTION get_activity_log_stats() IS 'Returns statistics about activity logs including counts, sizes, and retention config. Service role only.';

-- =====================================
-- 8. GRANTS
-- =====================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION archive_old_activity_logs(int, int) TO service_role;
GRANT EXECUTE ON FUNCTION run_scheduled_log_archival() TO service_role;
GRANT EXECUTE ON FUNCTION get_activity_log_stats() TO service_role;

-- =====================================
-- MIGRATION NOTES
-- =====================================

-- To set up automated archival with pg_cron (if available):
-- SELECT cron.schedule('archive-activity-logs', '0 2 * * *', 'SELECT run_scheduled_log_archival()');

-- To manually archive old logs:
-- SELECT archive_old_activity_logs(90); -- Archive logs older than 90 days

-- To view archival statistics:
-- SELECT get_activity_log_stats();

-- To query logs including archived ones:
-- SELECT * FROM get_activity_logs('<org_id>', 100, 0, true);
