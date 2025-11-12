-- RPC function to search promoters in an organization
-- Bypasses RLS issues with PostgREST transaction pooler

DROP FUNCTION IF EXISTS search_promoters(uuid, text);

CREATE OR REPLACE FUNCTION search_promoters(
  p_org_id uuid,
  p_query text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
  v_search_term text;
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

  -- Prepare search term
  v_search_term := '%' || LOWER(COALESCE(p_query, '')) || '%';

  -- Search promoters
  IF p_query IS NULL OR TRIM(p_query) = '' THEN
    -- No search query - return all active promoters
    SELECT COALESCE(
      json_agg(
        row_to_json(c.*)
        ORDER BY c.name
      ),
      '[]'::json
    ) INTO v_result
    FROM public.contacts c
    WHERE c.org_id = p_org_id
      AND c.type = 'promoter'
      AND c.status = 'active';
  ELSE
    -- Apply search filter
    SELECT COALESCE(
      json_agg(
        row_to_json(c.*)
        ORDER BY c.name
      ),
      '[]'::json
    ) INTO v_result
    FROM public.contacts c
    WHERE c.org_id = p_org_id
      AND c.type = 'promoter'
      AND c.status = 'active'
      AND (
        LOWER(c.name) LIKE v_search_term
        OR LOWER(c.company) LIKE v_search_term
        OR LOWER(c.city) LIKE v_search_term
        OR LOWER(c.email::text) LIKE v_search_term
      );
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION search_promoters(uuid, text) TO authenticated;

COMMENT ON FUNCTION search_promoters IS 
'Searches promoters in an organization with optional text filter. Bypasses RLS issues.';
