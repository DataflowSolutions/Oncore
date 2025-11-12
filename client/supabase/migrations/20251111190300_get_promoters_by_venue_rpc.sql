-- RPC function to get promoters for a venue
-- Bypasses RLS issues with PostgREST transaction pooler

DROP FUNCTION IF EXISTS get_promoters_by_venue(uuid);

CREATE OR REPLACE FUNCTION get_promoters_by_venue(p_venue_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_result json;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No authenticated user';
  END IF;

  -- Get venue's org and verify user has access
  SELECT v.org_id INTO v_org_id
  FROM public.venues v
  WHERE v.id = p_venue_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Venue not found';
  END IF;

  -- Verify user has access to this org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = v_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied to organization';
  END IF;

  -- Get promoters linked to this venue
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', c.id,
        'org_id', c.org_id,
        'type', c.type,
        'name', c.name,
        'email', c.email,
        'phone', c.phone,
        'company', c.company,
        'notes', c.notes,
        'status', c.status,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'is_primary', vc.is_primary
      )
      ORDER BY vc.is_primary DESC NULLS LAST
    ),
    '[]'::json
  ) INTO v_result
  FROM public.venue_contacts vc
  INNER JOIN public.contacts c ON vc.contact_id = c.id
  WHERE vc.venue_id = p_venue_id
    AND c.type = 'promoter';

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_promoters_by_venue(uuid) TO authenticated;

COMMENT ON FUNCTION get_promoters_by_venue IS 
'Gets promoters associated with a venue. Bypasses RLS issues.';
