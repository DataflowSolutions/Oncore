-- Fix SECURITY DEFINER functions to lock search_path
-- This prevents search_path injection attacks in SECURITY DEFINER functions
-- Reference: https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY

-- =====================================================
-- Fix RPC Functions (from 20250101000000_add_rpc_functions.sql)
-- =====================================================

CREATE OR REPLACE FUNCTION create_advancing_session(
  p_show_id uuid,
  p_org_id uuid,
  p_title text DEFAULT NULL
)
RETURNS json
AS $$
DECLARE
  v_session_id uuid;
  v_result json;
BEGIN
  -- Set search_path at the beginning of SECURITY DEFINER function
  SET search_path TO public, extensions;

  -- Verify user has permission (must be org editor)
  IF NOT is_org_editor(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied: must be org editor';
  END IF;

  -- Verify show belongs to org
  IF NOT EXISTS (SELECT 1 FROM shows WHERE id = p_show_id AND org_id = p_org_id) THEN
    RAISE EXCEPTION 'Show not found or does not belong to organization';
  END IF;

  -- Get show title if not provided
  IF p_title IS NULL THEN
    SELECT COALESCE(s.title, 'Show at ' || v.name)
    INTO p_title
    FROM shows s
    LEFT JOIN venues v ON v.id = s.venue_id
    WHERE s.id = p_show_id;
  END IF;

  -- Create advancing session
  INSERT INTO advancing_sessions (
    org_id,
    show_id,
    title,
    expires_at,
    created_by
  ) VALUES (
    p_org_id,
    p_show_id,
    p_title,
    now() + interval '30 days',
    auth.uid()
  )
  RETURNING id INTO v_session_id;

  -- Log activity
  INSERT INTO activity_log (
    org_id,
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_org_id,
    auth.uid(),
    'created',
    'advancing_session',
    v_session_id,
    json_build_object('show_id', p_show_id, 'title', p_title)
  );

  -- Return session details
  SELECT json_build_object(
    'id', v_session_id,
    'show_id', p_show_id,
    'org_id', p_org_id,
    'title', p_title,
    'expires_at', now() + interval '30 days',
    'created_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, extensions;

---

CREATE OR REPLACE FUNCTION verify_access_code(
  p_access_code text
)
RETURNS json
AS $$
DECLARE
  v_result json;
BEGIN
  SET search_path TO public, extensions;

  -- Verify access code and return session with show/venue details
  SELECT json_build_object(
    'id', ase.id,
    'title', ase.title,
    'org_id', ase.org_id,
    'show_id', ase.show_id,
    'expires_at', ase.expires_at,
    'show', json_build_object(
      'id', s.id,
      'title', s.title,
      'date', s.date,
      'doors_at', s.doors_at,
      'set_time', s.set_time,
      'status', s.status,
      'artist', json_build_object(
        'id', a.id,
        'name', a.name
      ),
      'venue', json_build_object(
        'id', v.id,
        'name', v.name,
        'city', v.city,
        'country', v.country,
        'capacity', v.capacity
      )
    )
  )
  INTO v_result
  FROM advancing_sessions ase
  JOIN shows s ON s.id = ase.show_id
  LEFT JOIN artists a ON a.id = s.artist_id
  LEFT JOIN venues v ON v.id = s.venue_id
  WHERE ase.access_code_hash = crypt(upper(p_access_code), ase.access_code_hash)
  AND (ase.expires_at IS NULL OR ase.expires_at > now());

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired access code';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, extensions;

---

CREATE OR REPLACE FUNCTION get_show_stats(
  p_org_id uuid
)
RETURNS json
AS $$
DECLARE
  v_result json;
BEGIN
  SET search_path TO public, extensions;

  -- Verify user has permission
  IF NOT is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied: must be org member';
  END IF;

  -- Calculate stats
  SELECT json_build_object(
    'org_id', p_org_id,
    'total_shows', (
      SELECT COUNT(*) 
      FROM shows 
      WHERE org_id = p_org_id
    ),
    'upcoming_shows', (
      SELECT COUNT(*) 
      FROM shows 
      WHERE org_id = p_org_id 
      AND date >= CURRENT_DATE
    ),
    'past_shows', (
      SELECT COUNT(*) 
      FROM shows 
      WHERE org_id = p_org_id 
      AND date < CURRENT_DATE
    ),
    'active_sessions', (
      SELECT COUNT(*) 
      FROM advancing_sessions 
      WHERE org_id = p_org_id
      AND (expires_at IS NULL OR expires_at > now())
    ),
    'total_venues', (
      SELECT COUNT(DISTINCT venue_id)
      FROM shows
      WHERE org_id = p_org_id
      AND venue_id IS NOT NULL
    ),
    'total_artists', (
      SELECT COUNT(DISTINCT artist_id)
      FROM shows
      WHERE org_id = p_org_id
      AND artist_id IS NOT NULL
    ),
    'team_members', (
      SELECT COUNT(*)
      FROM org_members
      WHERE org_id = p_org_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, extensions;

---

CREATE OR REPLACE FUNCTION bulk_update_show_dates(
  p_updates jsonb
)
RETURNS json
AS $$
DECLARE
  v_update jsonb;
  v_show_id uuid;
  v_org_id uuid;
  v_new_date date;
  v_updated_count int := 0;
  v_failed_count int := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  SET search_path TO public, extensions;

  -- Process each update
  FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    BEGIN
      v_show_id := (v_update->>'show_id')::uuid;
      v_new_date := (v_update->>'new_date')::date;
      
      -- Get org_id and verify permission
      SELECT org_id INTO v_org_id
      FROM shows
      WHERE id = v_show_id;
      
      IF v_org_id IS NULL THEN
        v_failed_count := v_failed_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'show_id', v_show_id,
          'error', 'Show not found'
        );
        CONTINUE;
      END IF;
      
      IF NOT is_org_editor(v_org_id) THEN
        v_failed_count := v_failed_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'show_id', v_show_id,
          'error', 'Permission denied'
        );
        CONTINUE;
      END IF;
      
      -- Update the show date
      UPDATE shows
      SET date = v_new_date
      WHERE id = v_show_id;
      
      v_updated_count := v_updated_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'show_id', v_show_id,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN json_build_object(
    'updated', v_updated_count,
    'failed', v_failed_count,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, extensions;

---

CREATE OR REPLACE FUNCTION get_advancing_session_details(
  p_session_id uuid
)
RETURNS json
AS $$
DECLARE
  v_result json;
  v_org_id uuid;
BEGIN
  SET search_path TO public, extensions;

  -- Get org_id for permission check
  SELECT org_id INTO v_org_id
  FROM advancing_sessions
  WHERE id = p_session_id;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  -- Verify user has permission
  IF NOT is_org_member(v_org_id) THEN
    RAISE EXCEPTION 'Permission denied: must be org member';
  END IF;

  -- Get full session details
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
        'field_name', af.field_name,
        'field_value', af.field_value,
        'field_type', af.field_type,
        'updated_at', af.updated_at
      ) ORDER BY af.field_name), '[]'::json)
      FROM advancing_fields af
      WHERE af.session_id = ase.id
    ),
    'comments', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', ac.id,
        'comment', ac.comment,
        'created_by', ac.created_by,
        'created_at', ac.created_at
      ) ORDER BY ac.created_at DESC), '[]'::json)
      FROM advancing_comments ac
      WHERE ac.session_id = ase.id
    ),
    'documents', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', ad.id,
        'title', ad.title,
        'file_path', ad.file_path,
        'uploaded_at', ad.uploaded_at
      ) ORDER BY ad.uploaded_at DESC), '[]'::json)
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

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, extensions;

-- =====================================================
-- Fix Organization Creation Function
-- =====================================================

CREATE OR REPLACE FUNCTION app_create_organization_with_owner(
  org_name text,
  org_slug text
) 
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  org_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Create organization
  INSERT INTO organizations (name, slug, created_by)
  VALUES (org_name, org_slug, current_user_id)
  RETURNING id INTO org_id;

  -- Add creator as owner
  INSERT INTO org_members (org_id, user_id, role)
  VALUES (org_id, current_user_id, 'owner');

  -- Create default trial subscription (7-day trial on solo_artist plan)
  INSERT INTO org_subscriptions (
    org_id, 
    plan_id, 
    status, 
    current_period_start,
    current_period_end
  ) VALUES (
    org_id,
    'solo_artist',
    'trialing',
    now(),
    now() + interval '7 days'
  );

  -- Log organization creation
  PERFORM app_log_activity(
    org_id,
    'organization_created',
    'organization',
    org_id,
    jsonb_build_object(
      'org_name', org_name,
      'org_slug', org_slug,
      'created_by', current_user_id
    )
  );

  -- Log membership creation
  PERFORM app_log_activity(
    org_id,
    'member_added',
    'organization_member',
    NULL,
    jsonb_build_object(
      'user_id', current_user_id,
      'role', 'owner',
      'org_id', org_id
    )
  );

  RETURN org_id;
END;
$$;

-- =====================================================
-- Note: Other SECURITY DEFINER functions in the codebase
-- should also be updated following the same pattern:
-- 1. Add "SET search_path TO public, extensions;" to function definition
-- 
-- This prevents search_path injection attacks by ensuring
-- the function always uses the expected schema path.
-- =====================================================
