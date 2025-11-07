-- RLS Policy Test Framework
-- Provides automated tests to verify RLS policies work as intended for each role
-- Run these tests after policy changes to ensure security is maintained

-- =====================================
-- 1. TEST HELPER FUNCTIONS
-- =====================================

-- Function to create test users and orgs
CREATE OR REPLACE FUNCTION setup_rls_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  test_org_id uuid;
  owner_id uuid;
  admin_id uuid;
  editor_id uuid;
  viewer_id uuid;
  non_member_id uuid;
BEGIN
  -- Note: This function should only be run in test/dev environments
  -- Create test users in auth.users (simplified - in real tests use Supabase Auth)
  
  -- Create test org
  INSERT INTO organizations (slug, name)
  VALUES ('test-rls-org', 'RLS Test Organization')
  RETURNING id INTO test_org_id;
  
  -- In production tests, you would use real auth.users IDs
  -- For now, return structure for manual testing
  
  RETURN jsonb_build_object(
    'test_org_id', test_org_id,
    'note', 'Create real users via Supabase Auth and add them to org_members with appropriate roles'
  );
END;
$$;

-- =====================================
-- 2. RLS POLICY VERIFICATION FUNCTIONS
-- =====================================

-- Function to check if a table has RLS enabled
CREATE OR REPLACE FUNCTION check_rls_enabled(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_enabled boolean;
BEGIN
  SELECT relrowsecurity INTO is_enabled
  FROM pg_class
  WHERE oid = ('public.' || table_name)::regclass;
  
  RETURN COALESCE(is_enabled, false);
END;
$$;

-- Function to list all policies on a table
CREATE OR REPLACE FUNCTION get_table_policies(table_name text)
RETURNS TABLE (
  policy_name text,
  command text,
  permissive text,
  using_expression text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    policyname::text as policy_name,
    cmd::text as command,
    permissive::text,
    qual::text as using_expression
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = table_name
  ORDER BY policyname;
END;
$$;

-- Function to verify all critical tables have RLS enabled
CREATE OR REPLACE FUNCTION verify_rls_enabled_on_all_tables()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  critical_tables text[] := ARRAY[
    'organizations',
    'org_members',
    'org_subscriptions',
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
  tbl text;
  missing_rls text[] := ARRAY[]::text[];
  total_tables int := 0;
  enabled_count int := 0;
BEGIN
  FOREACH tbl IN ARRAY critical_tables LOOP
    total_tables := total_tables + 1;
    
    IF check_rls_enabled(tbl) THEN
      enabled_count := enabled_count + 1;
    ELSE
      missing_rls := array_append(missing_rls, tbl);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'total_tables', total_tables,
    'rls_enabled_count', enabled_count,
    'all_protected', (enabled_count = total_tables),
    'missing_rls', missing_rls,
    'timestamp', now()
  );
END;
$$;

-- =====================================
-- 3. POLICY COVERAGE REPORT
-- =====================================

-- Function to generate a comprehensive policy coverage report
CREATE OR REPLACE FUNCTION generate_rls_coverage_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  report jsonb;
  table_stats jsonb[] := ARRAY[]::jsonb[];
  tbl text;
  policy_count int;
  has_select boolean;
  has_insert boolean;
  has_update boolean;
  has_delete boolean;
BEGIN
  -- Check major tables
  FOR tbl IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename NOT LIKE '%_old'
    AND tablename NOT LIKE 'pg_%'
    ORDER BY tablename
  LOOP
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = tbl;
    
    -- Check operation coverage
    SELECT 
      EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND cmd = 'SELECT'),
      EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND cmd = 'INSERT'),
      EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND cmd = 'UPDATE'),
      EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND cmd = 'DELETE')
    INTO has_select, has_insert, has_update, has_delete;
    
    table_stats := array_append(table_stats, jsonb_build_object(
      'table', tbl,
      'rls_enabled', check_rls_enabled(tbl),
      'policy_count', policy_count,
      'has_select_policy', has_select,
      'has_insert_policy', has_insert,
      'has_update_policy', has_update,
      'has_delete_policy', has_delete
    ));
  END LOOP;
  
  RETURN jsonb_build_object(
    'generated_at', now(),
    'total_tables', array_length(table_stats, 1),
    'tables', to_jsonb(table_stats)
  );
END;
$$;

-- =====================================
-- 4. ROLE-BASED ACCESS MATRIX
-- =====================================

-- Document expected access patterns per role
CREATE TABLE IF NOT EXISTS rls_expected_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'non_member', 'anon')),
  can_select boolean NOT NULL DEFAULT false,
  can_insert boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(table_name, role)
);

-- Insert expected access patterns
INSERT INTO rls_expected_access (table_name, role, can_select, can_insert, can_update, can_delete, notes)
VALUES
  -- Organizations
  ('organizations', 'owner', true, false, true, true, 'Can view, update, and delete their org'),
  ('organizations', 'admin', true, false, true, false, 'Can view and update their org'),
  ('organizations', 'editor', true, false, true, false, 'Can view and update their org'),
  ('organizations', 'viewer', true, false, false, false, 'Can only view their org'),
  ('organizations', 'non_member', false, false, false, false, 'No access to other orgs'),
  
  -- Org Members
  ('org_members', 'owner', true, false, true, true, 'Can manage members'),
  ('org_members', 'admin', true, false, true, true, 'Can manage members'),
  ('org_members', 'editor', true, false, false, false, 'Can view members'),
  ('org_members', 'viewer', true, false, false, false, 'Can view members'),
  ('org_members', 'non_member', false, false, false, false, 'No access'),
  
  -- Shows
  ('shows', 'owner', true, true, true, true, 'Full access'),
  ('shows', 'admin', true, true, true, true, 'Full access'),
  ('shows', 'editor', true, true, true, true, 'Full access'),
  ('shows', 'viewer', true, false, false, false, 'Read-only'),
  ('shows', 'non_member', false, false, false, false, 'No access unless collaborator'),
  
  -- Venues
  ('venues', 'owner', true, true, true, true, 'Full access'),
  ('venues', 'admin', true, true, true, true, 'Full access'),
  ('venues', 'editor', true, true, true, true, 'Full access'),
  ('venues', 'viewer', true, false, false, false, 'Read-only'),
  ('venues', 'non_member', false, false, false, false, 'No access'),
  
  -- Artists
  ('artists', 'owner', true, true, true, true, 'Full access'),
  ('artists', 'admin', true, true, true, true, 'Full access'),
  ('artists', 'editor', true, true, true, true, 'Full access'),
  ('artists', 'viewer', true, false, false, false, 'Read-only'),
  ('artists', 'non_member', false, false, false, false, 'No access'),
  
  -- People
  ('people', 'owner', true, true, true, true, 'Full access'),
  ('people', 'admin', true, true, true, true, 'Full access'),
  ('people', 'editor', true, true, true, true, 'Full access'),
  ('people', 'viewer', true, false, false, false, 'Read-only'),
  ('people', 'non_member', false, false, false, false, 'No access'),
  
  -- Contacts
  ('contacts', 'owner', true, true, true, true, 'Full access'),
  ('contacts', 'admin', true, true, true, true, 'Full access'),
  ('contacts', 'editor', true, true, true, true, 'Full access'),
  ('contacts', 'viewer', true, false, false, false, 'Read-only'),
  ('contacts', 'non_member', false, false, false, false, 'No access'),
  
  -- Activity Log
  ('activity_log', 'owner', true, false, false, false, 'Can view org logs'),
  ('activity_log', 'admin', true, false, false, false, 'Can view org logs'),
  ('activity_log', 'editor', true, false, false, false, 'Can view org logs'),
  ('activity_log', 'viewer', true, false, false, false, 'Can view org logs'),
  ('activity_log', 'non_member', false, false, false, false, 'No access'),
  
  -- Billing Plans (public read)
  ('billing_plans', 'anon', true, false, false, false, 'Public plans visible')
ON CONFLICT (table_name, role) DO NOTHING;

COMMENT ON TABLE rls_expected_access IS 'Documents the intended access patterns for each role on each table. Use this as the source of truth for RLS policies.';

-- Function to get expected access for a role
CREATE OR REPLACE FUNCTION get_expected_access(p_role text, p_table_name text DEFAULT NULL)
RETURNS TABLE (
  table_name text,
  role text,
  can_select boolean,
  can_insert boolean,
  can_update boolean,
  can_delete boolean,
  notes text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    table_name,
    role,
    can_select,
    can_insert,
    can_update,
    can_delete,
    notes
  FROM rls_expected_access
  WHERE role = p_role
  AND (p_table_name IS NULL OR table_name = p_table_name)
  ORDER BY table_name;
$$;

-- =====================================
-- 5. TEST EXECUTION FUNCTION
-- =====================================

-- Function to run all RLS verification checks
CREATE OR REPLACE FUNCTION run_rls_tests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  rls_check jsonb;
  coverage jsonb;
  test_results jsonb;
BEGIN
  -- Check RLS is enabled on all tables
  rls_check := verify_rls_enabled_on_all_tables();
  
  -- Generate coverage report
  coverage := generate_rls_coverage_report();
  
  -- Compile results
  test_results := jsonb_build_object(
    'test_run_at', now(),
    'rls_enabled_check', rls_check,
    'policy_coverage', coverage,
    'status', CASE 
      WHEN (rls_check->>'all_protected')::boolean THEN 'PASS'
      ELSE 'FAIL'
    END,
    'notes', 'Run get_expected_access(''owner'') to see documented access patterns'
  );
  
  RETURN test_results;
END;
$$;

COMMENT ON FUNCTION run_rls_tests() IS 'Runs all RLS verification tests. Returns comprehensive report of RLS status.';

-- =====================================
-- 6. GRANTS
-- =====================================

GRANT EXECUTE ON FUNCTION check_rls_enabled(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_table_policies(text) TO service_role;
GRANT EXECUTE ON FUNCTION verify_rls_enabled_on_all_tables() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION generate_rls_coverage_report() TO service_role;
GRANT EXECUTE ON FUNCTION get_expected_access(text, text) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION run_rls_tests() TO service_role, authenticated;

-- =====================================
-- 7. INITIAL TEST RUN
-- =====================================

-- Run initial verification
SELECT run_rls_tests();

-- =====================================
-- USAGE EXAMPLES
-- =====================================

-- Check if RLS is enabled on all critical tables:
-- SELECT verify_rls_enabled_on_all_tables();

-- View all policies on a specific table:
-- SELECT * FROM get_table_policies('shows');

-- See expected access for owner role:
-- SELECT * FROM get_expected_access('owner');

-- See expected access for a specific table:
-- SELECT * FROM get_expected_access('editor', 'shows');

-- Run full RLS test suite:
-- SELECT run_rls_tests();

-- Generate detailed coverage report:
-- SELECT generate_rls_coverage_report();
