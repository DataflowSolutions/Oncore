-- RPC function to get venues with show counts
-- Bypasses RLS issues with PostgREST transaction pooler

DROP FUNCTION IF EXISTS get_org_venues_with_counts(uuid);

CREATE OR REPLACE FUNCTION get_org_venues_with_counts(p_org_id uuid)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  name text,
  address text,
  city text,
  country text,
  capacity int,
  created_at timestamptz,
  updated_at timestamptz,
  shows_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
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
    RAISE EXCEPTION 'Access denied to organization';
  END IF;

  -- Return venues with show counts
  RETURN QUERY
  SELECT 
    v.id,
    v.org_id,
    v.name,
    v.address,
    v.city,
    v.country,
    v.capacity,
    v.created_at,
    v.updated_at,
    COUNT(s.id)::bigint as shows_count
  FROM public.venues v
  LEFT JOIN public.shows s ON s.venue_id = v.id
  WHERE v.org_id = p_org_id
  GROUP BY v.id, v.org_id, v.name, v.address, v.city, v.country, v.capacity, v.created_at, v.updated_at
  ORDER BY v.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_venues_with_counts(uuid) TO authenticated;

COMMENT ON FUNCTION get_org_venues_with_counts IS 
'Gets all venues for an organization with show counts. Bypasses RLS issues.';
