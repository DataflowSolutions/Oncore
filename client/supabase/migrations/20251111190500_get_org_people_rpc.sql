-- RPC function to get all people in an organization
-- Bypasses RLS issues with PostgREST transaction pooler

DROP FUNCTION IF EXISTS get_org_people(uuid);

CREATE OR REPLACE FUNCTION get_org_people(p_org_id uuid)
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
    RAISE EXCEPTION 'Access denied to organization';
  END IF;

  -- Get all people in the org
  SELECT COALESCE(
    json_agg(
      row_to_json(p.*)
      ORDER BY p.name
    ),
    '[]'::json
  ) INTO v_result
  FROM public.people p
  WHERE p.org_id = p_org_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_people(uuid) TO authenticated;

COMMENT ON FUNCTION get_org_people IS 
'Gets all people in an organization. Bypasses RLS issues.';
