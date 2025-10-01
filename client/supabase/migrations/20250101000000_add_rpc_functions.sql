-- =====================================================
-- RPC Functions for Hybrid Architecture (Web + Mobile)
-- These functions work with both Next.js and Flutter apps
-- =====================================================

-- =====================================================
-- 1. CREATE ADVANCING SESSION
-- Creates a new advancing session with a random access code
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
  v_access_code text;
  v_result json;
BEGIN
  -- Verify user has permission (must be org editor)
  IF NOT is_org_editor(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied: must be org editor';
  END IF;

  -- Verify show belongs to org
  IF NOT EXISTS (SELECT 1 FROM shows WHERE id = p_show_id AND org_id = p_org_id) THEN
    RAISE EXCEPTION 'Show not found or does not belong to organization';
  END IF;

  -- Generate random 8-character access code (uppercase alphanumeric)
  v_access_code := upper(substr(md5(random()::text), 1, 8));
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM advancing_sessions WHERE access_code_hash = crypt(v_access_code, access_code_hash)) LOOP
    v_access_code := upper(substr(md5(random()::text), 1, 8));
  END LOOP;

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
    access_code_hash,
    expires_at,
    created_by
  ) VALUES (
    p_org_id,
    p_show_id,
    p_title,
    crypt(v_access_code, gen_salt('bf')),
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

  -- Return session details with plain access code
  SELECT json_build_object(
    'id', v_session_id,
    'access_code', v_access_code,
    'show_id', p_show_id,
    'org_id', p_org_id,
    'title', p_title,
    'expires_at', now() + interval '30 days',
    'created_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_advancing_session(uuid, uuid, text) TO authenticated;

-- =====================================================
-- 2. VERIFY ACCESS CODE
-- Verifies an access code and returns session details
-- Used by venues to access advancing forms
-- =====================================================

CREATE OR REPLACE FUNCTION verify_access_code(
  p_access_code text
)
RETURNS json
AS $$
DECLARE
  v_result json;
BEGIN
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

  -- Return null if not found or expired
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired access code';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_access_code(text) TO anon, authenticated;

-- =====================================================
-- 3. GET SHOW STATISTICS
-- Returns statistics for an organization's shows
-- =====================================================

CREATE OR REPLACE FUNCTION get_show_stats(
  p_org_id uuid
)
RETURNS json
AS $$
DECLARE
  v_result json;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_show_stats(uuid) TO authenticated;

-- =====================================================
-- 4. BULK UPDATE SHOW DATES
-- Updates multiple show dates in a single transaction
-- =====================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION bulk_update_show_dates(jsonb) TO authenticated;

-- =====================================================
-- 5. GET ADVANCING SESSION DETAILS
-- Gets full session details including all fields/comments
-- =====================================================

CREATE OR REPLACE FUNCTION get_advancing_session_details(
  p_session_id uuid
)
RETURNS json
AS $$
DECLARE
  v_result json;
  v_org_id uuid;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_advancing_session_details(uuid) TO authenticated;

-- =====================================================
-- Comments
-- =====================================================
-- All functions use SECURITY DEFINER to bypass RLS
-- Permission checks are done explicitly in each function
-- Functions are designed to work identically on web and mobile
-- =====================================================
