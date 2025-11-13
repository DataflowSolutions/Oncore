-- RPCs for calendar sync operations to bypass RLS issues with transaction pooler

-- =====================================
-- CREATE CALENDAR SYNC SOURCE
-- =====================================

CREATE OR REPLACE FUNCTION create_calendar_sync_source(
  p_org_id UUID,
  p_source_url TEXT,
  p_sync_interval_minutes INTEGER,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_source_id UUID;
BEGIN
  -- Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is a manager (owner, admin, or editor)
  SELECT role INTO v_role
  FROM public.org_members
  WHERE org_id = p_org_id
    AND user_id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin', 'editor') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Create the calendar sync source
  INSERT INTO public.calendar_sync_sources (
    org_id,
    source_url,
    sync_interval_minutes,
    created_by
  )
  VALUES (
    p_org_id,
    p_source_url,
    p_sync_interval_minutes,
    p_created_by
  )
  RETURNING id INTO v_source_id;

  RETURN v_source_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_calendar_sync_source(UUID, TEXT, INTEGER, UUID) TO authenticated;
ALTER FUNCTION create_calendar_sync_source(UUID, TEXT, INTEGER, UUID) OWNER TO postgres;

COMMENT ON FUNCTION create_calendar_sync_source IS 'Create a calendar sync source. Owned by postgres to bypass RLS.';

-- =====================================
-- UPDATE CALENDAR SYNC SOURCE
-- =====================================

CREATE OR REPLACE FUNCTION update_calendar_sync_source(
  p_source_id UUID,
  p_org_id UUID,
  p_source_url TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_sync_interval_minutes INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
BEGIN
  -- Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is a manager
  SELECT role INTO v_role
  FROM public.org_members
  WHERE org_id = p_org_id
    AND user_id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin', 'editor') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Update the calendar sync source
  UPDATE public.calendar_sync_sources
  SET
    source_url = COALESCE(p_source_url, source_url),
    status = COALESCE(p_status, status),
    sync_interval_minutes = COALESCE(p_sync_interval_minutes, sync_interval_minutes),
    updated_at = now()
  WHERE id = p_source_id
    AND org_id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_calendar_sync_source(UUID, UUID, TEXT, TEXT, INTEGER) TO authenticated;
ALTER FUNCTION update_calendar_sync_source(UUID, UUID, TEXT, TEXT, INTEGER) OWNER TO postgres;

COMMENT ON FUNCTION update_calendar_sync_source IS 'Update a calendar sync source. Owned by postgres to bypass RLS.';

-- =====================================
-- DELETE CALENDAR SYNC SOURCE
-- =====================================

CREATE OR REPLACE FUNCTION delete_calendar_sync_source(
  p_source_id UUID,
  p_org_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
BEGIN
  -- Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is a manager
  SELECT role INTO v_role
  FROM public.org_members
  WHERE org_id = p_org_id
    AND user_id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin', 'editor') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Delete the calendar sync source
  DELETE FROM public.calendar_sync_sources
  WHERE id = p_source_id
    AND org_id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_calendar_sync_source(UUID, UUID) TO authenticated;
ALTER FUNCTION delete_calendar_sync_source(UUID, UUID) OWNER TO postgres;

COMMENT ON FUNCTION delete_calendar_sync_source IS 'Delete a calendar sync source. Owned by postgres to bypass RLS.';
