-- RPC functions for advancing sessions
-- Bypasses RLS issues with PostgREST transaction pooler

-- Get all advancing sessions for an org
DROP FUNCTION IF EXISTS get_org_advancing_sessions(uuid);

CREATE OR REPLACE FUNCTION get_org_advancing_sessions(p_org_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No authenticated user';
  END IF;

  -- Verify user has access to this org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You do not have permission to view sessions for this organization';
  END IF;

  -- Get all sessions with related show data
  SELECT json_agg(
    json_build_object(
      'id', s.id,
      'org_id', s.org_id,
      'show_id', s.show_id,
      'title', s.title,
      'expires_at', s.expires_at,
      'created_at', s.created_at,
      'shows', CASE 
        WHEN sh.id IS NOT NULL THEN json_build_object(
          'id', sh.id,
          'title', sh.title,
          'date', sh.date,
          'venues', CASE
            WHEN v.id IS NOT NULL THEN json_build_object(
              'name', v.name,
              'city', v.city
            )
            ELSE NULL
          END
        )
        ELSE NULL
      END
    )
    ORDER BY s.created_at DESC
  ) INTO v_result
  FROM public.advancing_sessions s
  LEFT JOIN public.shows sh ON sh.id = s.show_id
  LEFT JOIN public.venues v ON v.id = sh.venue_id
  WHERE s.org_id = p_org_id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_advancing_sessions(uuid) TO authenticated;

-- Get advancing session by ID
DROP FUNCTION IF EXISTS get_advancing_session(uuid);

CREATE OR REPLACE FUNCTION get_advancing_session(p_session_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_result json;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No authenticated user';
  END IF;

  -- Get the session's org_id
  SELECT org_id INTO v_org_id
  FROM public.advancing_sessions
  WHERE id = p_session_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Verify user has access to this org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = v_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You do not have permission to view this session';
  END IF;

  -- Get the session with related data
  SELECT row_to_json(result.*) INTO v_result
  FROM (
    SELECT 
      s.*,
      json_build_object(
        'id', sh.id,
        'title', sh.title,
        'date', sh.date,
        'venues', json_build_object(
          'name', v.name,
          'city', v.city,
          'address', v.address
        ),
        'artists', (
          SELECT json_agg(json_build_object('name', a.name))
          FROM public.artists a
          WHERE a.id = sh.artist_id
        )
      ) as shows
    FROM public.advancing_sessions s
    LEFT JOIN public.shows sh ON sh.id = s.show_id
    LEFT JOIN public.venues v ON v.id = sh.venue_id
    WHERE s.id = p_session_id
  ) result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_advancing_session(uuid) TO authenticated;

-- Get advancing fields for a session
DROP FUNCTION IF EXISTS get_advancing_fields(uuid);

CREATE OR REPLACE FUNCTION get_advancing_fields(p_session_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_result json;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No authenticated user';
  END IF;

  -- Get the session's org_id
  SELECT org_id INTO v_org_id
  FROM public.advancing_sessions
  WHERE id = p_session_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Verify user has access to this org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = v_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You do not have permission to view this session';
  END IF;

  -- Get all fields for this session
  SELECT json_agg(row_to_json(f.*) ORDER BY f.sort_order) INTO v_result
  FROM public.advancing_fields f
  WHERE f.session_id = p_session_id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_advancing_fields(uuid) TO authenticated;

-- Get advancing documents for a session
DROP FUNCTION IF EXISTS get_advancing_documents(uuid);

CREATE OR REPLACE FUNCTION get_advancing_documents(p_session_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_result json;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No authenticated user';
  END IF;

  -- Get the session's org_id
  SELECT org_id INTO v_org_id
  FROM public.advancing_sessions
  WHERE id = p_session_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Verify user has access to this org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = v_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You do not have permission to view this session';
  END IF;

  -- Get all documents for this session with their files
  SELECT json_agg(
    json_build_object(
      'id', d.id,
      'org_id', d.org_id,
      'session_id', d.session_id,
      'party_type', d.party_type,
      'label', d.label,
      'created_by', d.created_by,
      'created_at', d.created_at,
      'files', (
        SELECT json_agg(
          json_build_object(
            'id', f.id,
            'original_name', f.original_name,
            'content_type', f.content_type,
            'size_bytes', f.size_bytes,
            'storage_path', f.storage_path,
            'created_at', f.created_at
          )
        )
        FROM public.files f
        WHERE f.document_id = d.id
      )
    )
    ORDER BY d.created_at DESC
  ) INTO v_result
  FROM public.advancing_documents d
  WHERE d.session_id = p_session_id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_advancing_documents(uuid) TO authenticated;

COMMENT ON FUNCTION get_org_advancing_sessions IS 'Gets all advancing sessions for an organization. Bypasses RLS issues.';
COMMENT ON FUNCTION get_advancing_session IS 'Gets an advancing session with related show/venue/artist data. Bypasses RLS issues.';
COMMENT ON FUNCTION get_advancing_fields IS 'Gets all fields for an advancing session. Bypasses RLS issues.';
COMMENT ON FUNCTION get_advancing_documents IS 'Gets all documents with files for an advancing session. Bypasses RLS issues.';
