-- RPCs for calendar sync logging

-- =====================================
-- CREATE SYNC RUN LOG
-- =====================================

CREATE OR REPLACE FUNCTION create_calendar_sync_run(
  p_source_id UUID,
  p_org_id UUID,
  p_status TEXT,
  p_message TEXT DEFAULT NULL,
  p_events_processed INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_run_id UUID;
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

  -- Create sync run log
  INSERT INTO public.calendar_sync_runs (
    source_id,
    status,
    message,
    events_processed,
    finished_at
  )
  VALUES (
    p_source_id,
    p_status,
    p_message,
    p_events_processed,
    now()
  )
  RETURNING id INTO v_run_id;

  RETURN v_run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_calendar_sync_run(UUID, UUID, TEXT, TEXT, INTEGER) TO authenticated;
ALTER FUNCTION create_calendar_sync_run(UUID, UUID, TEXT, TEXT, INTEGER) OWNER TO postgres;

COMMENT ON FUNCTION create_calendar_sync_run IS 'Create a calendar sync run log. Owned by postgres to bypass RLS.';

-- =====================================
-- UPDATE CALENDAR SOURCE SYNC METADATA
-- =====================================

CREATE OR REPLACE FUNCTION update_calendar_source_sync_metadata(
  p_source_id UUID,
  p_org_id UUID,
  p_last_synced_at TIMESTAMPTZ DEFAULT NULL,
  p_last_error TEXT DEFAULT NULL
)
RETURNS VOID
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

  -- Update calendar source metadata
  UPDATE public.calendar_sync_sources
  SET
    last_synced_at = COALESCE(p_last_synced_at, last_synced_at),
    last_error = p_last_error,
    updated_at = now()
  WHERE id = p_source_id
    AND org_id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_calendar_source_sync_metadata(UUID, UUID, TIMESTAMPTZ, TEXT) TO authenticated;
ALTER FUNCTION update_calendar_source_sync_metadata(UUID, UUID, TIMESTAMPTZ, TEXT) OWNER TO postgres;

COMMENT ON FUNCTION update_calendar_source_sync_metadata IS 'Update calendar source sync metadata. Owned by postgres to bypass RLS.';
