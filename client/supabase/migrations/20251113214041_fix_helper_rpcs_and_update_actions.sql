-- Fix helper RPC functions to be owned by postgres
-- This is required for the transaction pooler to bypass RLS on org_members

ALTER FUNCTION get_org_membership(uuid) OWNER TO postgres;
ALTER FUNCTION get_user_orgs() OWNER TO postgres;

COMMENT ON FUNCTION get_org_membership(uuid) IS 'Get user membership in specific org. Owned by postgres to bypass RLS issues with transaction pooler.';
COMMENT ON FUNCTION get_user_orgs() IS 'Get all organizations for current user. Owned by postgres to bypass RLS issues with transaction pooler.';

-- =====================================
-- GET ORG BY ID
-- =====================================

CREATE OR REPLACE FUNCTION get_org_by_id(p_org_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result json;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Return null if not authenticated
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get organization if user is a member
  SELECT json_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug
  )
  INTO v_result
  FROM organizations o
  WHERE o.id = p_org_id
  AND EXISTS (
    SELECT 1 FROM org_members om 
    WHERE om.org_id = o.id 
    AND om.user_id = v_user_id
  );
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_by_id(UUID) TO authenticated;
ALTER FUNCTION get_org_by_id(UUID) OWNER TO postgres;

COMMENT ON FUNCTION get_org_by_id IS 'Get organization by ID if user is a member. Owned by postgres to bypass RLS issues with transaction pooler.';

