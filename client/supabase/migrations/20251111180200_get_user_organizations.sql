-- Function to get user's organizations
-- Uses SECURITY DEFINER to bypass RLS issues with PostgREST

CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Return empty array if not authenticated
  IF v_user_id IS NULL THEN
    RETURN '[]'::json;
  END IF;
  
  -- Get user's organizations with role
  SELECT COALESCE(json_agg(json_build_object(
    'role', om.role,
    'created_at', om.created_at,
    'organizations', json_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug,
      'created_at', o.created_at
    )
  )), '[]'::json)
  INTO v_result
  FROM org_members om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = v_user_id;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_organizations() TO authenticated;

COMMENT ON FUNCTION get_user_organizations() IS 'Get current user organizations bypassing RLS';
