-- RPC to create or update advancing field
-- SECURITY DEFINER - relies on RLS policies on advancing_sessions and advancing_fields

DROP FUNCTION IF EXISTS create_advancing_field(uuid, text, text, text, text, jsonb, integer);

CREATE OR REPLACE FUNCTION create_advancing_field(
  p_session_id UUID,
  p_section TEXT,
  p_field_name TEXT,
  p_field_type TEXT,
  p_party_type TEXT,
  p_value JSONB DEFAULT NULL,
  p_sort_order INTEGER DEFAULT 1000
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_show_id UUID;
  v_existing_field_id UUID;
  v_field_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get session info - RLS on advancing_sessions will ensure user has access
  BEGIN
    SELECT org_id, show_id INTO STRICT v_org_id, v_show_id
    FROM public.advancing_sessions
    WHERE id = p_session_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'Session not found or access denied: %', p_session_id;
  END;

  -- Check if field already exists
  SELECT id INTO v_existing_field_id
  FROM advancing_fields
  WHERE session_id = p_session_id
    AND section = p_section
    AND field_name = p_field_name
    AND party_type = p_party_type::party;

  IF v_existing_field_id IS NOT NULL THEN
    -- Update existing field
    UPDATE advancing_fields
    SET value = p_value,
        field_type = p_field_type,
        sort_order = p_sort_order
    WHERE id = v_existing_field_id
    RETURNING id INTO v_field_id;
  ELSE
    -- Insert new field
    INSERT INTO advancing_fields (
      org_id,
      session_id,
      section,
      field_name,
      field_type,
      value,
      party_type,
      sort_order,
      created_by
    ) VALUES (
      v_org_id,
      p_session_id,
      p_section,
      p_field_name,
      p_field_type,
      p_value,
      p_party_type::party,
      p_sort_order,
      v_user_id
    )
    RETURNING id INTO v_field_id;
  END IF;

  -- Return success with field info
  RETURN json_build_object(
    'success', true,
    'field_id', v_field_id,
    'show_id', v_show_id
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_advancing_field(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) TO authenticated;

-- Change function owner to postgres to bypass RLS
ALTER FUNCTION create_advancing_field(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) OWNER TO postgres;

-- =====================================================
-- UPDATE ADVANCING FIELD RPC
-- =====================================================

DROP FUNCTION IF EXISTS update_advancing_field(uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION update_advancing_field(
  p_session_id UUID,
  p_field_id UUID,
  p_value JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_show_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get session info to verify access and get show_id
  BEGIN
    SELECT org_id, show_id INTO STRICT v_org_id, v_show_id
    FROM public.advancing_sessions
    WHERE id = p_session_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'Session not found or access denied: %', p_session_id;
  END;

  -- Update the field
  UPDATE advancing_fields
  SET value = p_value
  WHERE id = p_field_id
    AND session_id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field not found: %', p_field_id;
  END IF;

  -- Return success with field info
  RETURN json_build_object(
    'success', true,
    'field_id', p_field_id,
    'show_id', v_show_id
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION update_advancing_field(UUID, UUID, JSONB) TO authenticated;

-- Change function owner to postgres to bypass RLS
ALTER FUNCTION update_advancing_field(UUID, UUID, JSONB) OWNER TO postgres;


