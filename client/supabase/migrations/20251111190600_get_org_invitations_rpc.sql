-- RPC function to get pending invitations for an organization
-- Bypasses RLS issues with PostgREST transaction pooler

DROP FUNCTION IF EXISTS get_org_invitations(uuid);

CREATE OR REPLACE FUNCTION get_org_invitations(p_org_id uuid)
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

  -- Get pending invitations with people info
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', i.id,
        'org_id', i.org_id,
        'person_id', i.person_id,
        'email', i.email,
        'token', i.token,
        'created_by', i.created_by,
        'created_at', i.created_at,
        'accepted_at', i.accepted_at,
        'expires_at', i.expires_at,
        'updated_at', i.updated_at,
        'people', CASE 
          WHEN p.id IS NOT NULL THEN json_build_object(
            'id', p.id,
            'name', p.name,
            'email', p.email,
            'role_title', p.role_title,
            'member_type', p.member_type
          )
          ELSE NULL
        END
      )
      ORDER BY i.created_at DESC
    ),
    '[]'::json
  ) INTO v_result
  FROM public.invitations i
  LEFT JOIN public.people p ON i.person_id = p.id
  WHERE i.org_id = p_org_id
    AND i.accepted_at IS NULL;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_invitations(uuid) TO authenticated;

COMMENT ON FUNCTION get_org_invitations IS 
'Gets pending invitations for an organization with people info. Bypasses RLS issues.';
