-- RPC function to get a single show by ID
-- Bypasses RLS issues with PostgREST transaction pooler

CREATE OR REPLACE FUNCTION get_show_by_id(p_show_id uuid)
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

  -- Get show with venue info, checking membership
  SELECT json_build_object(
    'id', s.id,
    'org_id', s.org_id,
    'title', s.title,
    'date', s.date,
    'venue_id', s.venue_id,
    'set_time', s.set_time,
    'doors_at', s.doors_at,
    'notes', s.notes,
    'status', s.status,
    'created_at', s.created_at,
    'updated_at', s.updated_at,
    'venues', CASE 
      WHEN v.id IS NOT NULL THEN json_build_object(
        'id', v.id,
        'name', v.name,
        'city', v.city,
        'address', v.address,
        'country', v.country,
        'capacity', v.capacity
      )
      ELSE NULL
    END,
    'artists', '[]'::json -- TODO: Add artists if needed
  ) INTO v_result
  FROM public.shows s
  LEFT JOIN public.venues v ON s.venue_id = v.id
  WHERE s.id = p_show_id
    AND EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = s.org_id
        AND om.user_id = v_user_id
    );

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Show not found or access denied';
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_show_by_id IS 
'Gets a single show by ID with venue info. Bypasses RLS issues with PostgREST.';
