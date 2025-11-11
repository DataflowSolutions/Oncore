-- Function to get organization by slug
-- Uses SECURITY DEFINER to bypass RLS issues with PostgREST

CREATE OR REPLACE FUNCTION get_org_by_slug(p_slug text)
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
  WHERE o.slug = p_slug
  AND EXISTS (
    SELECT 1 FROM org_members om 
    WHERE om.org_id = o.id 
    AND om.user_id = v_user_id
  );
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_by_slug(text) TO authenticated;

COMMENT ON FUNCTION get_org_by_slug(text) IS 'Get organization by slug if user is a member, bypassing RLS';
