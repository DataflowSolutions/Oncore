-- Add RPC to get calendar sync sources

CREATE OR REPLACE FUNCTION get_calendar_sync_sources(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  source_url TEXT,
  sync_interval_minutes INTEGER,
  status TEXT,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify access
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied to organization';
  END IF;

  -- Return calendar sync sources
  RETURN QUERY
  SELECT 
    css.id,
    css.org_id,
    css.source_url,
    css.sync_interval_minutes,
    css.status,
    css.last_synced_at,
    css.last_error,
    css.created_at,
    css.created_by,
    css.updated_at
  FROM public.calendar_sync_sources css
  WHERE css.org_id = p_org_id
  ORDER BY css.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_calendar_sync_sources(UUID) TO authenticated;
ALTER FUNCTION get_calendar_sync_sources(UUID) OWNER TO postgres;

COMMENT ON FUNCTION get_calendar_sync_sources IS 'Get calendar sync sources for an organization. Owned by postgres to bypass RLS.';
