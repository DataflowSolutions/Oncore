-- Migration: Enable RLS on all public tables and fix security issues
-- Created: 2025-11-04
-- Description: Enables RLS on organizations, org_members, and query_performance_log tables

-- ============================================================================
-- 1. Enable RLS on organizations table
-- ============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Enable RLS on org_members table
-- ============================================================================
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Enable RLS on query_performance_log table
-- ============================================================================
ALTER TABLE public.query_performance_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for query_performance_log (service role only)
DROP POLICY IF EXISTS query_performance_log_service_role ON public.query_performance_log;
CREATE POLICY query_performance_log_service_role
  ON public.query_performance_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. Fix Security Definer Views
-- ============================================================================

-- Drop and recreate shows_list_view WITHOUT security definer
DROP VIEW IF EXISTS public.shows_list_view CASCADE;
CREATE VIEW public.shows_list_view
WITH (security_invoker=true)
AS
SELECT 
  s.id,
  s.org_id,
  s.title,
  s.date,
  s.set_time,
  s.doors_at,
  s.status,
  v.id AS venue_id,
  v.name AS venue_name,
  v.city AS venue_city,
  a.id AS artist_id,
  a.name AS artist_name
FROM shows s
LEFT JOIN venues v ON v.id = s.venue_id
LEFT JOIN artists a ON a.id = s.artist_id;

-- Drop and recreate org_seat_usage WITHOUT security definer
DROP VIEW IF EXISTS public.org_seat_usage CASCADE;
CREATE VIEW public.org_seat_usage
WITH (security_invoker=true)
AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  -- members = org_members count
  (SELECT count(*) FROM org_members m WHERE m.org_id = o.id) AS members_used,
  -- collaborators = distinct accepted collaborators on org's shows
  (SELECT count(DISTINCT sc.user_id) 
     FROM shows sh 
     JOIN show_collaborators sc ON sc.show_id = sh.id AND sc.user_id IS NOT NULL
    WHERE sh.org_id = o.id) AS collaborators_used,
  -- artists count
  (SELECT count(*) FROM artists a WHERE a.org_id = o.id) AS artists_used
FROM organizations o;

-- ============================================================================
-- 5. Grant appropriate permissions on views
-- ============================================================================

-- Grant SELECT on shows_list_view to authenticated users
GRANT SELECT ON public.shows_list_view TO authenticated;

-- Grant SELECT on org_seat_usage to authenticated users
GRANT SELECT ON public.org_seat_usage TO authenticated;

-- ============================================================================
-- Verification queries (commented out - for manual testing)
-- ============================================================================

-- Check RLS is enabled:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('organizations', 'org_members', 'query_performance_log');

-- Check views are security invoker:
-- SELECT viewname, viewowner, 
--        CASE WHEN viewname IN (
--          SELECT relname FROM pg_class c 
--          JOIN pg_namespace n ON n.oid = c.relnamespace 
--          WHERE c.relkind = 'v' 
--          AND n.nspname = 'public'
--          AND NOT EXISTS (
--            SELECT 1 FROM pg_rewrite r 
--            WHERE r.ev_class = c.oid 
--            AND r.ev_action::text LIKE '%SECURITY_DEFINER%'
--          )
--        ) THEN 'INVOKER' ELSE 'DEFINER' END as security_type
-- FROM pg_views 
-- WHERE schemaname = 'public' 
-- AND viewname IN ('shows_list_view', 'org_seat_usage');
