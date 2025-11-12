-- RPC function to get venue details with shows
-- Bypasses RLS issues with PostgREST transaction pooler

DROP FUNCTION IF EXISTS get_venue_details(uuid);

CREATE OR REPLACE FUNCTION get_venue_details(p_venue_id uuid)
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

  -- Get venue and verify user has access to its org
  SELECT v.org_id INTO v_org_id
  FROM public.venues v
  WHERE v.id = p_venue_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Venue not found';
  END IF;

  -- Verify user has access to this org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = v_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied to organization';
  END IF;

  -- Build result with venue and shows
  SELECT json_build_object(
    'venue', row_to_json(v.*),
    'shows', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', s.id,
            'title', s.title,
            'date', s.date,
            'status', s.status,
            'created_at', s.created_at
          )
          ORDER BY s.date DESC
        )
        FROM public.shows s
        WHERE s.venue_id = p_venue_id
      ),
      '[]'::json
    )
  ) INTO v_result
  FROM public.venues v
  WHERE v.id = p_venue_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_venue_details(uuid) TO authenticated;

COMMENT ON FUNCTION get_venue_details IS 
'Gets venue details with associated shows. Bypasses RLS issues.';
