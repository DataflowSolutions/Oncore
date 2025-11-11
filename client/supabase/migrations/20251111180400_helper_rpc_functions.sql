-- Helper RPC functions to bypass RLS issues with PostgREST
-- These functions use SECURITY DEFINER and are safe because they verify auth.uid()

-- Get user's membership in a specific org
CREATE OR REPLACE FUNCTION get_org_membership(p_org_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT json_build_object(
    'role', role,
    'created_at', created_at,
    'org_id', org_id,
    'user_id', user_id
  )
  INTO v_result
  FROM org_members
  WHERE org_id = p_org_id
  AND user_id = v_user_id;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_membership(uuid) TO authenticated;

-- Get user's organizations list (alternative to get_user_organizations)
CREATE OR REPLACE FUNCTION get_user_orgs()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN '[]'::json;
  END IF;
  
  SELECT COALESCE(json_agg(json_build_object(
    'role', om.role,
    'organizations', json_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug
    )
  )), '[]'::json)
  INTO v_result
  FROM org_members om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = v_user_id
  ORDER BY om.created_at ASC;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_orgs() TO authenticated;

COMMENT ON FUNCTION get_org_membership(uuid) IS 'Get user membership in specific org, bypassing RLS';
COMMENT ON FUNCTION get_user_orgs() IS 'Get all organizations for current user, bypassing RLS';
