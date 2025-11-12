-- RPC function to get available people from org
-- Bypasses RLS issues with PostgREST transaction pooler

-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS get_available_people(uuid, text);

CREATE OR REPLACE FUNCTION get_available_people(
  p_org_id uuid,
  p_party_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  member_type member_type,
  email citext,
  phone text
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

  -- Return available people, filtered by party type if specified
  -- member_type enum has: Artist, Crew, Agent, Manager (for from_us)
  -- For from_you, we return all people as promoter team doesn't have specific types yet
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.member_type,
    p.email,
    p.phone
  FROM public.people p
  WHERE p.org_id = p_org_id
    AND (
      p_party_type IS NULL
      OR (p_party_type = 'from_us' AND p.member_type IN ('Artist', 'Crew', 'Manager', 'Agent'))
      OR p_party_type = 'from_you' -- Return all people for promoter team
    )
  ORDER BY p.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_people(uuid, text) TO authenticated;

-- Change function owner to postgres to bypass RLS
ALTER FUNCTION get_available_people(uuid, text) OWNER TO postgres;

COMMENT ON FUNCTION get_available_people IS 
'Gets all available people from an organization, optionally filtered by party type. Bypasses RLS issues.';
