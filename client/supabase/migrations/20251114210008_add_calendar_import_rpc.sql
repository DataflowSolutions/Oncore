-- RPC function to import calendar events into schedule_items
-- Uses SECURITY DEFINER to bypass RLS issues with foreign keys

CREATE OR REPLACE FUNCTION import_calendar_events(
  p_org_id UUID,
  p_events JSONB,
  p_sync_run_id UUID DEFAULT NULL
)
RETURNS TABLE (
  inserted INTEGER,
  updated INTEGER,
  total INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_event JSONB;
  v_external_id TEXT;
  v_existing_id UUID;
  v_insert_count INTEGER := 0;
  v_update_count INTEGER := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user has editor access to org
  IF NOT is_org_editor_and_active(p_org_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Process each event
  FOR v_event IN SELECT * FROM jsonb_array_elements(p_events)
  LOOP
    v_external_id := v_event->>'external_calendar_id';
    
    -- Check if event already exists
    SELECT id INTO v_existing_id
    FROM schedule_items
    WHERE org_id = p_org_id
      AND external_calendar_id = v_external_id;

    IF v_existing_id IS NOT NULL THEN
      -- Update existing
      UPDATE schedule_items
      SET
        title = v_event->>'title',
        starts_at = (v_event->>'starts_at')::TIMESTAMPTZ,
        ends_at = (v_event->>'ends_at')::TIMESTAMPTZ,
        location = v_event->>'location',
        notes = v_event->>'notes',
        sync_run_id = p_sync_run_id
      WHERE id = v_existing_id;
      
      v_update_count := v_update_count + 1;
    ELSE
      -- Insert new
      INSERT INTO schedule_items (
        org_id,
        title,
        starts_at,
        ends_at,
        location,
        notes,
        show_id,
        external_calendar_id,
        created_by,
        sync_run_id
      ) VALUES (
        p_org_id,
        v_event->>'title',
        (v_event->>'starts_at')::TIMESTAMPTZ,
        (v_event->>'ends_at')::TIMESTAMPTZ,
        v_event->>'location',
        v_event->>'notes',
        NULL, -- show_id is null for calendar imports
        v_external_id,
        v_user_id,
        p_sync_run_id
      );
      
      v_insert_count := v_insert_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_insert_count, v_update_count, (v_insert_count + v_update_count);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION import_calendar_events(UUID, JSONB, UUID) TO authenticated;

-- Set owner to postgres for RLS bypass
ALTER FUNCTION import_calendar_events(UUID, JSONB, UUID) OWNER TO postgres;

COMMENT ON FUNCTION import_calendar_events IS 
'Import calendar events into schedule_items. Uses SECURITY DEFINER to bypass RLS foreign key issues.';
