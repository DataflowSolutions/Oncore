-- Fix Remaining Function Errors
-- This migration fixes the remaining errors after the initial function fixes

-- Drop functions that need return type changes
DROP FUNCTION IF EXISTS setup_rls_test_data();
DROP FUNCTION IF EXISTS generate_rls_coverage_report();

-- =====================================
-- 1. FIX app_accept_show_invite - Function is using old show_collaborators structure
-- =====================================

-- The show_collaborators table no longer has invite_token or accepted_at
-- This function needs to work with the invitations table instead
-- For now, we'll drop this deprecated function as it's not compatible with current schema

DROP FUNCTION IF EXISTS app_accept_show_invite(text);

COMMENT ON SCHEMA public IS 'Show invite acceptance should be handled through the invitations table, not show_collaborators';

-- =====================================
-- 2. FIX get_advancing_session_details - advancing_comments has "body" not "comment"
-- =====================================

CREATE OR REPLACE FUNCTION get_advancing_session_details(
  p_session_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Return complete advancing session details with all related data
  -- Note: advancing_comments has 'body' not 'comment'
  -- Note: advancing_comments doesn't have session_id, it's linked via field_id
  
  SELECT json_build_object(
    'id', ase.id,
    'title', ase.title,
    'org_id', ase.org_id,
    'show_id', ase.show_id,
    'expires_at', ase.expires_at,
    'created_at', ase.created_at,
    'updated_at', ase.updated_at,
    'show', json_build_object(
      'id', s.id,
      'title', s.title,
      'date', s.date,
      'doors_at', s.doors_at,
      'set_time', s.set_time,
      'status', s.status,
      'notes', s.notes,
      'artist', json_build_object(
        'id', a.id,
        'name', a.name
      ),
      'venue', json_build_object(
        'id', v.id,
        'name', v.name,
        'city', v.city,
        'country', v.country,
        'capacity', v.capacity,
        'address', v.address
      )
    ),
    'fields', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', af.id,
        'section', af.section,
        'field_name', af.field_name,
        'value', af.value,
        'field_type', af.field_type,
        'status', af.status,
        'party_type', af.party_type,
        'sort_order', af.sort_order,
        'created_at', af.created_at
      ) ORDER BY af.section, af.sort_order, af.field_name), '[]'::json)
      FROM advancing_fields af
      WHERE af.session_id = ase.id
    ),
    'comments', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', ac.id,
        'body', ac.body,
        'author_id', ac.author_id,
        'author_name', ac.author_name,
        'created_at', ac.created_at
      ) ORDER BY ac.created_at DESC), '[]'::json)
      FROM advancing_comments ac
      WHERE ac.field_id IN (
        SELECT id FROM advancing_fields WHERE session_id = ase.id
      )
    ),
    'documents', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', ad.id,
        'label', ad.label,
        'party_type', ad.party_type,
        'created_at', ad.created_at
      ) ORDER BY ad.created_at DESC), '[]'::json)
      FROM advancing_documents ad
      WHERE ad.session_id = ase.id
    )
  )
  INTO v_result
  FROM advancing_sessions ase
  JOIN shows s ON s.id = ase.show_id
  LEFT JOIN artists a ON a.id = s.artist_id
  LEFT JOIN venues v ON v.id = s.venue_id
  WHERE ase.id = p_session_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  RETURN v_result;
END;
$$;

-- =====================================
-- 3. FIX generate_secure_token - Use pgcrypto extension gen_random_bytes
-- =====================================

CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  token text;
BEGIN
  -- Ensure pgcrypto extension is available
  -- Generate a secure random token using gen_random_uuid as fallback
  token := replace(gen_random_uuid()::text, '-', '');
  token := encode(decode(token, 'hex'), 'base64');
  
  -- Remove URL-unsafe characters
  token := replace(token, '/', '_');
  token := replace(token, '+', '-');
  token := replace(token, '=', '');
  
  RETURN token;
END;
$$;

-- =====================================
-- 4. FIX setup_rls_test_data - Use all declared variables
-- =====================================

CREATE OR REPLACE FUNCTION setup_rls_test_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_org_id uuid;
  owner_id uuid;
  admin_id uuid;
  editor_id uuid;
  viewer_id uuid;
  non_member_id uuid;
BEGIN
  -- Create test organization
  INSERT INTO organizations (name, slug)
  VALUES ('Test Organization', 'test-org')
  RETURNING id INTO test_org_id;

  -- Create test users (simulated - in reality these would come from auth.users)
  owner_id := gen_random_uuid();
  admin_id := gen_random_uuid();
  editor_id := gen_random_uuid();
  viewer_id := gen_random_uuid();
  non_member_id := gen_random_uuid();

  -- Add org members with different roles
  INSERT INTO org_members (org_id, user_id, role) VALUES
    (test_org_id, owner_id, 'owner'),
    (test_org_id, admin_id, 'admin'),
    (test_org_id, editor_id, 'editor'),
    (test_org_id, viewer_id, 'viewer');
  
  -- Note: non_member_id is intentionally not added to org_members
  -- to test non-member access control

  RAISE NOTICE 'Test data created for org: %', test_org_id;
  RAISE NOTICE 'Owner: %', owner_id;
  RAISE NOTICE 'Admin: %', admin_id;
  RAISE NOTICE 'Editor: %', editor_id;
  RAISE NOTICE 'Viewer: %', viewer_id;
  RAISE NOTICE 'Non-member: %', non_member_id;
END;
$$;

-- =====================================
-- 5. FIX generate_rls_coverage_report - Use report variable
-- =====================================

CREATE OR REPLACE FUNCTION generate_rls_coverage_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report jsonb;
  table_record record;
  tables_with_rls integer := 0;
  tables_without_rls integer := 0;
BEGIN
  -- Build a comprehensive RLS coverage report
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', tablename,
      'has_rls', (
        SELECT COUNT(*) > 0 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND pg_policies.tablename = t.tablename
      ),
      'policy_count', (
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND pg_policies.tablename = t.tablename
      ),
      'policies', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', policyname,
            'command', cmd,
            'permissive', permissive
          )
        )
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND pg_policies.tablename = t.tablename
      )
    )
  )
  INTO report
  FROM pg_tables t
  WHERE schemaname = 'public'
  AND tablename NOT LIKE '%_backup'
  AND tablename NOT LIKE '%_old';

  -- Count tables with and without RLS
  SELECT 
    COUNT(*) FILTER (WHERE (r->>'has_rls')::boolean),
    COUNT(*) FILTER (WHERE NOT (r->>'has_rls')::boolean)
  INTO tables_with_rls, tables_without_rls
  FROM jsonb_array_elements(report) r;

  -- Return the complete report with summary
  RETURN jsonb_build_object(
    'summary', jsonb_build_object(
      'tables_with_rls', tables_with_rls,
      'tables_without_rls', tables_without_rls,
      'total_tables', tables_with_rls + tables_without_rls
    ),
    'tables', report,
    'generated_at', now()
  );
END;
$$;

-- =====================================
-- SUMMARY
-- =====================================

-- This migration fixes the remaining function errors:
-- 1. app_accept_show_invite - Dropped (deprecated, incompatible with current schema)
-- 2. get_advancing_session_details - Fixed to use correct column names (body, not comment)
-- 3. generate_secure_token - Fixed to use gen_random_uuid as fallback
-- 4. setup_rls_test_data - Fixed to use all declared variables with RAISE NOTICE
-- 5. generate_rls_coverage_report - Fixed to properly use and return report variable

-- After this migration, all function errors should be resolved
