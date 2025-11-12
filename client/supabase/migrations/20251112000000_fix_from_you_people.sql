-- Fix get_available_people and get_show_team to support from_you party type
-- Remove the FALSE condition that blocks promoter team people

-- Update get_available_people
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
  -- member_type enum has: Artist, Crew, Agent, Manager
  -- For from_us: filter by member types
  -- For from_you: return all people (promoter team doesn't have specific types yet)
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

-- Update get_show_team
CREATE OR REPLACE FUNCTION get_show_team(
  p_show_id uuid,
  p_party_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  member_type member_type,
  email citext,
  phone text,
  duty text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No authenticated user';
  END IF;

  -- Get the org_id for the show and verify membership
  SELECT s.org_id INTO v_org_id
  FROM public.shows s
  WHERE s.id = p_show_id
    AND EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = s.org_id
        AND om.user_id = v_user_id
    );

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Show not found or access denied';
  END IF;

  -- Return show team members
  -- member_type enum has: Artist, Crew, Agent, Manager
  -- For from_us: filter by member types
  -- For from_you: return all people (promoter team doesn't have specific types yet)
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.member_type,
    p.email,
    p.phone,
    sa.duty
  FROM public.show_assignments sa
  INNER JOIN public.people p ON sa.person_id = p.id
  WHERE sa.show_id = p_show_id
    AND (
      p_party_type IS NULL
      OR (p_party_type = 'from_us' AND p.member_type IN ('Artist', 'Crew', 'Manager', 'Agent'))
      OR p_party_type = 'from_you' -- Return all people for promoter team
    );
END;
$$;
