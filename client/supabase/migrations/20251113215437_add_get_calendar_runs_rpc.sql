-- Add RPC to get calendar sync runs with source details

CREATE OR REPLACE FUNCTION get_calendar_sync_runs(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  status TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  message TEXT,
  events_processed INTEGER,
  created_at TIMESTAMPTZ,
  source_url TEXT,
  source_status TEXT
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

  -- Return calendar sync runs with source details
  RETURN QUERY
  SELECT 
    csr.id,
    csr.source_id,
    csr.status,
    csr.started_at,
    csr.finished_at,
    csr.message,
    csr.events_processed,
    csr.created_at,
    css.source_url,
    css.status as source_status
  FROM public.calendar_sync_runs csr
  INNER JOIN public.calendar_sync_sources css ON css.id = csr.source_id
  WHERE css.org_id = p_org_id
  ORDER BY csr.started_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION get_calendar_sync_runs(UUID) TO authenticated;
ALTER FUNCTION get_calendar_sync_runs(UUID) OWNER TO postgres;

COMMENT ON FUNCTION get_calendar_sync_runs IS 'Get calendar sync run history for an organization. Owned by postgres to bypass RLS.';
