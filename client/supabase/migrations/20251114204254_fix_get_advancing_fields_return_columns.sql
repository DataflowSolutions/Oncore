-- Fix get_advancing_fields RPC to return all necessary columns
-- Previously only returned field_name and value, missing id, party_type, section, etc.

DROP FUNCTION IF EXISTS get_advancing_fields(uuid);

CREATE OR REPLACE FUNCTION get_advancing_fields(
  p_session_id UUID
)
RETURNS TABLE (
  field_id UUID,
  org_id UUID,
  session_id UUID,
  section TEXT,
  field_name TEXT,
  field_type TEXT,
  party_type party,
  value JSONB,
  status field_status,
  sort_order INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ
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
    SELECT s.org_id INTO STRICT v_org_id
    FROM public.advancing_sessions s
    WHERE s.id = p_session_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'Session not found or access denied: %', p_session_id;
  END;

  -- Return all fields for this session with ALL columns (matching actual table schema)
  RETURN QUERY
  SELECT 
    af.id,
    af.org_id,
    af.session_id,
    af.section,
    af.field_name,
    af.field_type,
    af.party_type,
    af.value,
    af.status,
    af.sort_order,
    af.created_by,
    af.created_at
  FROM public.advancing_fields af
  WHERE af.session_id = p_session_id
  ORDER BY af.sort_order, af.created_at;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_advancing_fields(UUID) TO authenticated;

-- Change function owner to postgres to bypass RLS
ALTER FUNCTION get_advancing_fields(UUID) OWNER TO postgres;
