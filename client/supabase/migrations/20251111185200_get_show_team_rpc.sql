-- RPC function to get show team (assigned people)
-- Bypasses RLS issues with PostgREST transaction pooler

-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS get_show_team(uuid, text);

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
  -- Note: Currently only 'from_us' party type is supported
  -- member_type enum only has: Artist, Crew, Agent, Manager
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
      -- from_you party type not yet implemented - would need new enum values
      OR (p_party_type = 'from_you' AND FALSE) -- Return empty for promoter team
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_show_team(uuid, text) TO authenticated;

COMMENT ON FUNCTION get_show_team IS 
'Gets all people assigned to a show, optionally filtered by party type. Bypasses RLS issues.';
