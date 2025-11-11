-- RPC function to get shows for an organization
-- Bypasses RLS issues with PostgREST transaction pooler

CREATE OR REPLACE FUNCTION get_shows_by_org(p_org_id uuid)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  title text,
  date date,
  venue_id uuid,
  set_time timestamptz,
  doors_at timestamptz,
  notes text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  venue_name text,
  venue_city text,
  venue_address text
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

  -- Check if user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE public.org_members.org_id = p_org_id
      AND public.org_members.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this organization';
  END IF;

  -- Return shows with venue information
  RETURN QUERY
  SELECT 
    s.id::uuid,
    s.org_id::uuid,
    s.title::text,
    s.date::date,
    s.venue_id::uuid,
    s.set_time::timestamptz,
    s.doors_at::timestamptz,
    s.notes::text,
    s.status::text,
    s.created_at::timestamptz,
    s.updated_at::timestamptz,
    v.name::text as venue_name,
    v.city::text as venue_city,
    v.address::text as venue_address
  FROM public.shows s
  LEFT JOIN public.venues v ON s.venue_id = v.id
  WHERE s.org_id = p_org_id
  ORDER BY s.date ASC;
END;
$$;

COMMENT ON FUNCTION get_shows_by_org IS 
'Gets all shows for an organization. Bypasses RLS issues with PostgREST.';
