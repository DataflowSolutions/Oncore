-- RPC function to get promoters (contacts) with venue relationships
-- Bypasses RLS issues with PostgREST transaction pooler

DROP FUNCTION IF EXISTS get_org_promoters(uuid);

CREATE OR REPLACE FUNCTION get_org_promoters(p_org_id uuid)
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

  -- Return promoters with venue contacts as JSON array
  SELECT json_agg(
    json_build_object(
      'id', c.id,
      'org_id', c.org_id,
      'type', c.type,
      'name', c.name,
      'email', c.email,
      'phone', c.phone,
      'company', c.company,
      'notes', c.notes,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'venue_contacts', (
        SELECT json_agg(
          json_build_object(
            'venue_id', vc.venue_id,
            'is_primary', vc.is_primary,
            'venues', CASE 
              WHEN v.id IS NOT NULL THEN json_build_object(
                'id', v.id,
                'name', v.name,
                'city', v.city
              )
              ELSE NULL
            END
          )
        )
        FROM public.venue_contacts vc
        LEFT JOIN public.venues v ON vc.venue_id = v.id
        WHERE vc.contact_id = c.id
      )
    )
  ) INTO v_result
  FROM public.contacts c
  WHERE c.org_id = p_org_id
    AND c.type = 'promoter';

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_promoters(uuid) TO authenticated;

COMMENT ON FUNCTION get_org_promoters IS 
'Gets all promoter contacts for an organization with venue relationships. Bypasses RLS issues.';
