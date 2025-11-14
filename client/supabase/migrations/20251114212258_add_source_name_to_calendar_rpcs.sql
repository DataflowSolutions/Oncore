-- Add source_name parameter to calendar sync RPCs

-- Drop old function versions to avoid overloading issues
DROP FUNCTION IF EXISTS create_calendar_sync_source(UUID, TEXT, INTEGER, UUID);
DROP FUNCTION IF EXISTS update_calendar_sync_source(UUID, TEXT, INTEGER, TEXT);

-- Update create_calendar_sync_source to accept source_name
CREATE OR REPLACE FUNCTION create_calendar_sync_source(
  p_org_id UUID,
  p_source_url TEXT,
  p_sync_interval_minutes INTEGER,
  p_created_by UUID,
  p_source_name TEXT DEFAULT NULL
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
    created_by,
    source_name
  )
  VALUES (
    p_org_id,
    p_source_url,
    p_sync_interval_minutes,
    p_created_by,
    p_source_name
  )
  RETURNING id INTO v_source_id;

  RETURN v_source_id;
END;
$$;

-- Update update_calendar_sync_source to accept source_name
CREATE OR REPLACE FUNCTION update_calendar_sync_source(
  p_source_id UUID,
  p_source_url TEXT,
  p_sync_interval_minutes INTEGER,
  p_status TEXT,
  p_source_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_role TEXT;
BEGIN
  -- Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get org_id from source
  SELECT org_id INTO v_org_id
  FROM public.calendar_sync_sources
  WHERE id = p_source_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Calendar source not found';
  END IF;

  -- Verify user is a manager (owner, admin, or editor)
  SELECT role INTO v_role
  FROM public.org_members
  WHERE org_id = v_org_id
    AND user_id = v_user_id;

  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin', 'editor') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Update the calendar sync source
  UPDATE public.calendar_sync_sources
  SET
    source_url = p_source_url,
    sync_interval_minutes = p_sync_interval_minutes,
    status = p_status,
    source_name = COALESCE(p_source_name, source_name),
    updated_at = now()
  WHERE id = p_source_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_calendar_sync_source(UUID, TEXT, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_calendar_sync_source(UUID, TEXT, INTEGER, TEXT, TEXT) TO authenticated;
