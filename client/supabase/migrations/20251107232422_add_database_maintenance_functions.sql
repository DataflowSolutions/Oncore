-- Database Maintenance Functions for Query Planner Statistics
-- Ensures ANALYZE and VACUUM operations are available for post-deploy maintenance
-- These should be run after deployments and periodically to maintain optimal query performance

-- =====================================
-- 1. ANALYZE FUNCTION - UPDATE STATISTICS
-- =====================================

-- Function to update statistics for all important tables
-- This helps the query planner make better decisions
CREATE OR REPLACE FUNCTION run_analyze_all_tables()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  start_time timestamptz;
  duration interval;
  tables_analyzed text[];
BEGIN
  start_time := clock_timestamp();
  
  -- Core tables that need accurate statistics
  tables_analyzed := ARRAY[
    'organizations',
    'org_members',
    'org_subscriptions',
    'billing_plans',
    'shows',
    'venues',
    'artists',
    'contacts',
    'people',
    'show_collaborators',
    'advancing_sessions',
    'advancing_fields',
    'advancing_documents',
    'advancing_comments',
    'files',
    'schedule_items',
    'activity_log',
    'invitations'
  ];
  
  -- Run ANALYZE on each table
  ANALYZE organizations;
  ANALYZE org_members;
  ANALYZE org_subscriptions;
  ANALYZE billing_plans;
  ANALYZE shows;
  ANALYZE venues;
  ANALYZE artists;
  ANALYZE contacts;
  ANALYZE people;
  ANALYZE show_collaborators;
  ANALYZE advancing_sessions;
  ANALYZE advancing_fields;
  ANALYZE advancing_documents;
  ANALYZE advancing_comments;
  ANALYZE files;
  ANALYZE schedule_items;
  ANALYZE activity_log;
  ANALYZE invitations;
  
  duration := clock_timestamp() - start_time;
  
  RETURN jsonb_build_object(
    'success', true,
    'operation', 'ANALYZE',
    'tables_count', array_length(tables_analyzed, 1),
    'tables', tables_analyzed,
    'duration_seconds', EXTRACT(EPOCH FROM duration),
    'timestamp', now(),
    'message', 'Table statistics updated successfully'
  );
END;
$$;

COMMENT ON FUNCTION run_analyze_all_tables() IS 'Updates statistics for all important tables. Run after bulk data imports or schema changes to help query planner.';

-- =====================================
-- 2. VACUUM FUNCTION - RECLAIM SPACE
-- =====================================

-- Function to run VACUUM ANALYZE on all tables
-- This reclaims space from deleted rows and updates statistics
CREATE OR REPLACE FUNCTION run_vacuum_all_tables()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  start_time timestamptz;
  duration interval;
  result text;
BEGIN
  start_time := clock_timestamp();
  
  -- VACUUM ANALYZE combines both operations
  -- Note: VACUUM FULL requires exclusive locks and is not included here
  -- Use VACUUM FULL manually during maintenance windows if needed
  
  VACUUM ANALYZE organizations;
  VACUUM ANALYZE org_members;
  VACUUM ANALYZE org_subscriptions;
  VACUUM ANALYZE billing_plans;
  VACUUM ANALYZE shows;
  VACUUM ANALYZE venues;
  VACUUM ANALYZE artists;
  VACUUM ANALYZE contacts;
  VACUUM ANALYZE people;
  VACUUM ANALYZE show_collaborators;
  VACUUM ANALYZE advancing_sessions;
  VACUUM ANALYZE advancing_fields;
  VACUUM ANALYZE advancing_documents;
  VACUUM ANALYZE advancing_comments;
  VACUUM ANALYZE files;
  VACUUM ANALYZE schedule_items;
  VACUUM ANALYZE activity_log;
  VACUUM ANALYZE invitations;
  
  duration := clock_timestamp() - start_time;
  
  RETURN jsonb_build_object(
    'success', true,
    'operation', 'VACUUM ANALYZE',
    'duration_seconds', EXTRACT(EPOCH FROM duration),
    'timestamp', now(),
    'message', 'Vacuum and analyze completed successfully'
  );
END;
$$;

COMMENT ON FUNCTION run_vacuum_all_tables() IS 'Runs VACUUM ANALYZE on all tables. Reclaims space and updates statistics. Run during off-peak hours.';

-- =====================================
-- 3. MAINTENANCE SCHEDULE CONFIGURATION
-- =====================================

-- Table to track maintenance runs
CREATE TABLE IF NOT EXISTS database_maintenance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL CHECK (operation IN ('ANALYZE', 'VACUUM', 'VACUUM ANALYZE')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_seconds numeric,
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  details jsonb,
  error_message text,
  triggered_by text DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS idx_maintenance_log_started 
  ON database_maintenance_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_log_operation 
  ON database_maintenance_log(operation, started_at DESC);

COMMENT ON TABLE database_maintenance_log IS 'Tracks database maintenance operations (ANALYZE, VACUUM) for monitoring and auditing.';

-- =====================================
-- 4. TRACKED MAINTENANCE FUNCTIONS
-- =====================================

-- Wrapper function that logs ANALYZE operations
CREATE OR REPLACE FUNCTION run_analyze_with_logging(triggered_by text DEFAULT 'manual')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  log_id uuid;
  result jsonb;
  start_time timestamptz;
  error_msg text;
BEGIN
  start_time := now();
  
  -- Create log entry
  INSERT INTO database_maintenance_log (operation, status, triggered_by, started_at)
  VALUES ('ANALYZE', 'running', triggered_by, start_time)
  RETURNING id INTO log_id;
  
  BEGIN
    -- Run the actual ANALYZE
    result := run_analyze_all_tables();
    
    -- Update log with success
    UPDATE database_maintenance_log
    SET status = 'completed',
        completed_at = now(),
        duration_seconds = EXTRACT(EPOCH FROM (now() - started_at)),
        details = result
    WHERE id = log_id;
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    
    -- Update log with failure
    UPDATE database_maintenance_log
    SET status = 'failed',
        completed_at = now(),
        duration_seconds = EXTRACT(EPOCH FROM (now() - started_at)),
        error_message = error_msg
    WHERE id = log_id;
    
    RAISE;
  END;
END;
$$;

COMMENT ON FUNCTION run_analyze_with_logging(text) IS 'Runs ANALYZE with logging. Use this for scheduled or monitored maintenance.';

-- Wrapper function that logs VACUUM operations
CREATE OR REPLACE FUNCTION run_vacuum_with_logging(triggered_by text DEFAULT 'manual')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  log_id uuid;
  result jsonb;
  start_time timestamptz;
  error_msg text;
BEGIN
  start_time := now();
  
  -- Create log entry
  INSERT INTO database_maintenance_log (operation, status, triggered_by, started_at)
  VALUES ('VACUUM ANALYZE', 'running', triggered_by, start_time)
  RETURNING id INTO log_id;
  
  BEGIN
    -- Run the actual VACUUM ANALYZE
    result := run_vacuum_all_tables();
    
    -- Update log with success
    UPDATE database_maintenance_log
    SET status = 'completed',
        completed_at = now(),
        duration_seconds = EXTRACT(EPOCH FROM (now() - started_at)),
        details = result
    WHERE id = log_id;
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    
    -- Update log with failure
    UPDATE database_maintenance_log
    SET status = 'failed',
        completed_at = now(),
        duration_seconds = EXTRACT(EPOCH FROM (now() - started_at)),
        error_message = error_msg
    WHERE id = log_id;
    
    RAISE;
  END;
END;
$$;

COMMENT ON FUNCTION run_vacuum_with_logging(text) IS 'Runs VACUUM ANALYZE with logging. Use this for scheduled or monitored maintenance.';

-- =====================================
-- 5. MONITORING FUNCTIONS
-- =====================================

-- Function to get maintenance statistics
CREATE OR REPLACE FUNCTION get_maintenance_stats(days_back int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  stats jsonb;
BEGIN
  -- Only service role should access this
  IF auth.jwt() ->> 'role' != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: service role required';
  END IF;
  
  SELECT jsonb_build_object(
    'period_days', days_back,
    'analyze_runs', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'successful', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'avg_duration_seconds', AVG(duration_seconds) FILTER (WHERE status = 'completed'),
        'last_run', MAX(started_at)
      )
      FROM database_maintenance_log
      WHERE operation = 'ANALYZE'
      AND started_at > now() - interval '1 day' * days_back
    ),
    'vacuum_runs', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'successful', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'avg_duration_seconds', AVG(duration_seconds) FILTER (WHERE status = 'completed'),
        'last_run', MAX(started_at)
      )
      FROM database_maintenance_log
      WHERE operation = 'VACUUM ANALYZE'
      AND started_at > now() - interval '1 day' * days_back
    ),
    'recent_runs', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'operation', operation,
          'started_at', started_at,
          'duration_seconds', duration_seconds,
          'status', status,
          'triggered_by', triggered_by
        )
        ORDER BY started_at DESC
      )
      FROM database_maintenance_log
      WHERE started_at > now() - interval '1 day' * 7
      LIMIT 10
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$;

COMMENT ON FUNCTION get_maintenance_stats(int) IS 'Returns statistics about maintenance operations. Service role only.';

-- Function to check if maintenance is needed
CREATE OR REPLACE FUNCTION check_maintenance_needed()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  last_analyze timestamptz;
  last_vacuum timestamptz;
  hours_since_analyze numeric;
  hours_since_vacuum numeric;
  needs_maintenance boolean := false;
  recommendations text[];
BEGIN
  -- Get last successful maintenance runs
  SELECT MAX(started_at) INTO last_analyze
  FROM database_maintenance_log
  WHERE operation = 'ANALYZE' AND status = 'completed';
  
  SELECT MAX(started_at) INTO last_vacuum
  FROM database_maintenance_log
  WHERE operation = 'VACUUM ANALYZE' AND status = 'completed';
  
  -- Calculate hours since last run
  hours_since_analyze := EXTRACT(EPOCH FROM (now() - COALESCE(last_analyze, now() - interval '999 days'))) / 3600;
  hours_since_vacuum := EXTRACT(EPOCH FROM (now() - COALESCE(last_vacuum, now() - interval '999 days'))) / 3600;
  
  -- Generate recommendations
  recommendations := ARRAY[]::text[];
  
  IF hours_since_analyze > 24 THEN
    needs_maintenance := true;
    recommendations := array_append(recommendations, 'Run ANALYZE - last run was ' || ROUND(hours_since_analyze::numeric, 1) || ' hours ago');
  END IF;
  
  IF hours_since_vacuum > 168 THEN  -- 7 days
    needs_maintenance := true;
    recommendations := array_append(recommendations, 'Run VACUUM ANALYZE - last run was ' || ROUND(hours_since_vacuum::numeric / 24, 1) || ' days ago');
  END IF;
  
  RETURN jsonb_build_object(
    'needs_maintenance', needs_maintenance,
    'last_analyze', last_analyze,
    'last_vacuum', last_vacuum,
    'hours_since_analyze', ROUND(hours_since_analyze::numeric, 1),
    'hours_since_vacuum', ROUND(hours_since_vacuum::numeric, 1),
    'recommendations', recommendations,
    'timestamp', now()
  );
END;
$$;

COMMENT ON FUNCTION check_maintenance_needed() IS 'Checks if database maintenance is needed based on last run times.';

-- =====================================
-- 6. GRANTS
-- =====================================

GRANT EXECUTE ON FUNCTION run_analyze_all_tables() TO service_role;
GRANT EXECUTE ON FUNCTION run_vacuum_all_tables() TO service_role;
GRANT EXECUTE ON FUNCTION run_analyze_with_logging(text) TO service_role;
GRANT EXECUTE ON FUNCTION run_vacuum_with_logging(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_maintenance_stats(int) TO service_role;
GRANT EXECUTE ON FUNCTION check_maintenance_needed() TO service_role;

-- =====================================
-- 7. INITIAL ANALYZE
-- =====================================

-- Run initial ANALYZE to update statistics with this migration
SELECT run_analyze_with_logging('migration');

-- =====================================
-- USAGE NOTES
-- =====================================

-- To run after deployment (in GitHub Actions or deployment script):
-- SELECT run_analyze_with_logging('deploy');

-- To set up with pg_cron (if available):
-- SELECT cron.schedule('daily-analyze', '0 3 * * *', 'SELECT run_analyze_with_logging(''cron'')');
-- SELECT cron.schedule('weekly-vacuum', '0 4 * * 0', 'SELECT run_vacuum_with_logging(''cron'')');

-- To check if maintenance is needed:
-- SELECT check_maintenance_needed();

-- To view maintenance history:
-- SELECT * FROM database_maintenance_log ORDER BY started_at DESC LIMIT 10;

-- To get statistics:
-- SELECT get_maintenance_stats(30);
