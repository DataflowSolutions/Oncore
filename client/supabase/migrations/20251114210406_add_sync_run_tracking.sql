-- Add tracking of which schedule items were created/updated by each calendar sync run
-- Also add source_name to calendar_sync_sources for better display

-- Add source_name column for user-friendly display
ALTER TABLE public.calendar_sync_sources 
ADD COLUMN IF NOT EXISTS source_name TEXT;

COMMENT ON COLUMN public.calendar_sync_sources.source_name IS 
'User-friendly name for the calendar source (e.g., "Production Calendar", "Tour Dates")';

-- Add sync_run_id to schedule_items to track which sync created/updated them
ALTER TABLE public.schedule_items 
ADD COLUMN IF NOT EXISTS sync_run_id UUID REFERENCES public.calendar_sync_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS schedule_items_sync_run_id_idx 
ON public.schedule_items (sync_run_id) 
WHERE sync_run_id IS NOT NULL;

COMMENT ON COLUMN public.schedule_items.sync_run_id IS 
'The calendar sync run that last created or updated this schedule item';

-- Add RPC to get schedule items for a specific sync run
CREATE OR REPLACE FUNCTION get_sync_run_items(
  p_sync_run_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  location TEXT,
  notes TEXT,
  external_calendar_id TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get org_id from sync run
  SELECT css.org_id INTO v_org_id
  FROM calendar_sync_runs csr
  JOIN calendar_sync_sources css ON css.id = csr.source_id
  WHERE csr.id = p_sync_run_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Sync run not found';
  END IF;

  -- Verify user has access to org
  IF NOT EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = v_org_id
      AND om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Return schedule items from this sync run
  RETURN QUERY
  SELECT 
    si.id,
    si.title,
    si.starts_at,
    si.ends_at,
    si.location,
    si.notes,
    si.external_calendar_id,
    si.created_at
  FROM schedule_items si
  WHERE si.sync_run_id = p_sync_run_id
  ORDER BY si.starts_at;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sync_run_items(UUID) TO authenticated;
ALTER FUNCTION get_sync_run_items(UUID) OWNER TO postgres;

COMMENT ON FUNCTION get_sync_run_items IS 
'Get all schedule items that were created or updated by a specific calendar sync run';

-- Add RPC to update sync run status
CREATE OR REPLACE FUNCTION update_calendar_sync_run_status(
  p_run_id UUID,
  p_status TEXT,
  p_message TEXT,
  p_events_processed INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE calendar_sync_runs
  SET
    status = p_status,
    finished_at = now(),
    message = p_message,
    events_processed = p_events_processed
  WHERE id = p_run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_calendar_sync_run_status(UUID, TEXT, TEXT, INTEGER) TO authenticated;
ALTER FUNCTION update_calendar_sync_run_status(UUID, TEXT, TEXT, INTEGER) OWNER TO postgres;

COMMENT ON FUNCTION update_calendar_sync_run_status IS 
'Update the status of a calendar sync run';
