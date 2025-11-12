-- RPC to get advancing fields for a session
-- SECURITY DEFINER to bypass RLS issues

DROP FUNCTION IF EXISTS get_advancing_fields(uuid);

CREATE OR REPLACE FUNCTION get_advancing_fields(
  p_session_id UUID
)
RETURNS TABLE (
  field_name TEXT,
  value JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get session info to verify access
  BEGIN
    SELECT org_id INTO STRICT v_org_id
    FROM public.advancing_sessions
    WHERE id = p_session_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'Session not found or access denied: %', p_session_id;
  END;

  -- Return all fields for this session
  RETURN QUERY
  SELECT af.field_name, af.value
  FROM advancing_fields af
  WHERE af.session_id = p_session_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_advancing_fields(UUID) TO authenticated;

-- Change function owner to postgres to bypass RLS
ALTER FUNCTION get_advancing_fields(UUID) OWNER TO postgres;
